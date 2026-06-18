from sqlite3 import IntegrityError

from sqlalchemy import func
from datetime import datetime, date
from fastapi import HTTPException

from app.modelos.usuario_modelo import Usuario
from app.modelos.persona_modelo import Personas
from app.modelos.solicitud_modelo import Solicitud
from app.modelos.miembro_equipo_modelo import MiembrosEquipo
from app.modelos.catalogo_documento import CatalogoDocumentos
from app.modelos.equipo_modelo import EquiposJugando, Equipos
from app.modelos.equipo_temporal_modelo import EquipoTemporal
from app.modelos.presidente_equipo_modelo import PresidenteEquipo
from app.modelos.orden_pago_detalle_modelo import OrdenPagoDetalle
from app.modelos.ordenes_pago_modelo import OrdenPago
from app.modelos.catalogo_rol_personas import CatalogoRolesPersonas
from app.modelos.catalogo_seguros import Seguro
from app.modelos.documento_afiliacion_modelo import DocumentoAfiliacion
from app.modelos.documentos_entregados_modelo import DocumentosEntregados
from app.modelos.equipo_temporal_jugador_modelo import EquipoTemporalJugador
from app.modelos.antecedentes_internacionales_modelo import AntecedentesInternacionales

from app.repositorios import pagos_repositorio

from app.utilidades import validaciones
from sqlalchemy.orm import joinedload, selectinload

# from app.servicios.documentos_servicio import subir_documento_servicio2
from app.enums.estados_validacion_enum import EstatusValidacionSolicitud
from app.enums.estatus_pago_enum import EstatusValidacionPago
from app.enums.conceptos_pago import ConceptoPagoEnum
from app.enums.procesos_equipo_temporal import ProcesosEquipoTemporalEnum
from app.enums.tipos_solicitud_enum import TiposSolicitudEnum
from app.enums.roles_enum import Rol

def crear_equipo_temporal_repo(db, orden, solicitud_id, tipo_proceso, equipo_id=None):

    existe = db.query(EquipoTemporal).filter(
        EquipoTemporal.OrdenPagoId == orden.OrdenPagoId
    ).first()

    if existe:
        return existe
    
    cantidad_jugadores = 0

    #detalles de la orden de pago (seguros e inscripciones)
    detalles = db.query(OrdenPagoDetalle).filter(OrdenPagoDetalle.OrdenPagoId == orden.OrdenPagoId).all()

    #obtener cantidad de slots pagados a traves de los seguros
    for d in detalles:
        if d.TipoConceptoId == 1 and d.SeguroId is not None:   #SEGURO
            seguro = db.query(Seguro).filter(Seguro.SeguroId == d.SeguroId).first()
            if seguro and int(seguro.TipoPersonaId or 0) != 2:
                cantidad_jugadores += d.Cantidad

    solicitud = db.query(Solicitud).filter(Solicitud.SolicitudId == solicitud_id).first()
    usuario = db.query(Usuario).filter(Usuario.UsuarioId == orden.UsuarioId).first()
    presidente_persona_id = usuario.PersonaId if usuario else None

    #SI ES PROCESO DE REGISTRO DE PRESIDENTE, SE CAMBIA EL ROL DEL USUARIO
    if solicitud.TipoSolicitudId == TiposSolicitudEnum.PRESIDENTE_EQUIPO:
        pagos_repositorio.crear_presidente_equipo_repo(db, usuario.UsuarioId, afiliacion=solicitud.Afiliacion)

    # crear equipo temporal        
    if tipo_proceso == ProcesosEquipoTemporalEnum.REGISTRO_INICIAL.value:
        equipo = EquipoTemporal(
            UsuarioId=orden.UsuarioId,
            SolicitudId=solicitud_id,
            OrdenPagoId=orden.OrdenPagoId,
            Activo=True,
            CantidadJugadoresPagados=cantidad_jugadores,
            TipoProcesoId=tipo_proceso
        )
    
    elif tipo_proceso == ProcesosEquipoTemporalEnum.AMPLIACION.value:
        equipo = EquipoTemporal(
            UsuarioId=orden.UsuarioId,
            SolicitudId=solicitud_id,
            OrdenPagoId=orden.OrdenPagoId,
            Activo=True,
            CantidadJugadoresPagados=cantidad_jugadores,
            TipoProcesoId=tipo_proceso,
            EquipoId=equipo_id
        )

    db.add(equipo)
    db.flush()

    #creación de slots
    total_slots_creados = 0

    for d in detalles:
        if (
            d.TipoConceptoId == 1 and  # SEGURO
            d.SeguroId is not None
        ):
            seguro = db.query(Seguro).filter(Seguro.SeguroId == d.SeguroId).first()
            es_seguro_presidente = bool(seguro and int(seguro.TipoPersonaId or 0) == 2)
            if es_seguro_presidente:
                continue

            for _ in range(d.Cantidad):
                slot = EquipoTemporalJugador(
                    EquipoTemporalId=equipo.EquipoTemporalId,
                    Completo=False,
                    PersonaId=None,
                    SeguroId=d.SeguroId  #Asignar seguro desde el inicio
                )
                db.add(slot)
                total_slots_creados += 1

    # validación
    if total_slots_creados != cantidad_jugadores:
        raise ValueError(
            #f"Inconsistencia: personas={cantidad_jugadores}, slots={total_slots_creados}"
            "Ocurrió un error. Inténtalo de nuevo más tarde"
        )

    return equipo



# =============================
# == DISPONIBLIDAD DE SLOTS ==
# =============================

def obtener_disponibilidad_equipo(db, equipo_id):

    equipos_temporales = (
        db.query(EquipoTemporal)
        .options(selectinload(EquipoTemporal.EquipoTemporalJugadorRelacion))
        .filter(
            EquipoTemporal.EquipoId == equipo_id,
            EquipoTemporal.Activo == True
        )
        .order_by(EquipoTemporal.EquipoTemporalId.desc())
        .all()
    )

    if not equipos_temporales:
        return None
        
    equipo_temporal = None
    slots_disponibles = 0
    cantidad_slots = 0
    ocupados = 0
    
    # Buscar el primer equipo temporal que tenga slots disponibles
    for eq in equipos_temporales:
        slots = eq.EquipoTemporalJugadorRelacion
        cant = len(slots)
        ocup = sum(1 for s in slots if s.Completo)
        disp = cant - ocup
        
        if disp > 0:
            equipo_temporal = eq
            slots_disponibles = disp
            cantidad_slots = cant
            ocupados = ocup
            break
            
    # Si todos están llenos, retornar el más reciente
    if not equipo_temporal:
        equipo_temporal = equipos_temporales[0]
        slots = equipo_temporal.EquipoTemporalJugadorRelacion
        cantidad_slots = len(slots)
        ocupados = sum(1 for s in slots if s.Completo)
        slots_disponibles = cantidad_slots - ocupados

    # Seguros disponibles (solo slots libres)
    seguros = {}
    for s in equipo_temporal.EquipoTemporalJugadorRelacion:
        if not s.Completo and s.SeguroId:
            seguros[s.SeguroId] = seguros.get(s.SeguroId, 0) + 1

    return {
        "equipo_temporal_activo": True,
        "equipo_temporal_id": equipo_temporal.EquipoTemporalId,
        "slots_disponibles": slots_disponibles,
        "seguros_disponibles": [
            {"SeguroId": k, "Cantidad": v}
            for k, v in seguros.items()
        ]
    }

def obtener_equipos_temporales_por_usuario_repo(db, usuario_id):
    return db.query(EquipoTemporal).filter(
        EquipoTemporal.UsuarioId == usuario_id
    ).all()

def obtener_equipo_temporal(db, equipo_temporal_id):
    
    equipo_temporal = db.query(EquipoTemporal).filter(
        EquipoTemporal.EquipoTemporalId == equipo_temporal_id
    ).first()
    
    return equipo_temporal

def obtener_seguros_pagados(db, orden_pago_id):
    detalles = db.query(OrdenPagoDetalle).filter(OrdenPagoDetalle.OrdenPagoId == orden_pago_id, OrdenPagoDetalle.SeguroId != None).all()
    
    seguros = {}

    for d in detalles:
        if d.SeguroId not in seguros:
            seguros[d.SeguroId] = 0
        seguros[d.SeguroId] += d.Cantidad

    return seguros


def existe_persona_repo(db, curp):
    persona = db.query(Personas).filter(Personas.CURP == curp).first()
    if persona:
        return True
    
    return False

def obtener_presidente(db, usuario, team_info):
    rol_id = getattr(usuario, 'RolId', None)
    presidente_id = None
    presidente = None

    #Si usuario es administrador, busca al presidente
    if rol_id == 1:
        #debug
        #print("SOY ADMINISTRADOR")
        presidente_id = team_info.get("presidente_id")
    else:
        #debug
        #print("SOY PRESIDENTE DE EQUIPO")
        
        presidente = db.query(PresidenteEquipo).filter(
            PresidenteEquipo.PersonaId == usuario.PersonaId
        ).first()

        if not presidente:
            raise HTTPException(
                status_code=403,
                detail="El usuario no es un presidente de equipo registrado"
            )

        presidente_id = presidente.PresidenteEquipoId

    return presidente_id, presidente, rol_id

def obtener_equipo_temporal_pagado_activo(db, usuario_id):
    return (
        db.query(EquipoTemporal)
        .join(OrdenPago, EquipoTemporal.OrdenPagoId == OrdenPago.OrdenPagoId)
        .filter(EquipoTemporal.UsuarioId == usuario_id)
        .filter(EquipoTemporal.Activo == True)
        .filter(OrdenPago.EstatusPagoId.in_([
            int(EstatusValidacionPago.ACTIVO.value),
            int(EstatusValidacionPago.ESPERA.value)
        ]))
        .order_by(EquipoTemporal.EquipoTemporalId.desc())
        .first()
    )


def construir_resumen_equipo_temporal(db, equipo_temporal):
    slots = obtener_slots_con_persona(db, equipo_temporal.EquipoTemporalId)
    slots_disponibles = sum(1 for s in slots if not s.Completo)

    nombre_equipo = equipo_temporal.NombreEquipo
    nombre_liga = None
    nombre_categoria = "LIBRE"

    # Fallback si tiene un EquipoId real
    if equipo_temporal.EquipoId:
        real_equipo = db.query(Equipos).filter(Equipos.EquipoId == equipo_temporal.EquipoId).first()
        if real_equipo and not nombre_equipo:
            nombre_equipo = real_equipo.NombreEquipo

        eq_jugando = db.query(EquiposJugando).filter(EquiposJugando.EquipoId == equipo_temporal.EquipoId).first()
        if eq_jugando:
            liga_id = equipo_temporal.LigaId or eq_jugando.LigaId
            if liga_id:
                from app.modelos.catalogos_liga_modelo import Ligas
                liga_obj = db.query(Ligas).filter(Ligas.LigaId == liga_id).first()
                if liga_obj:
                    nombre_liga = liga_obj.Nombreliga
                    if liga_obj.CategoriaRelacion:
                        nombre_categoria = liga_obj.CategoriaRelacion.NombreCategoria

    # Si aún no tenemos liga y el equipo temporal tiene liga directa
    if not nombre_liga and equipo_temporal.LigaRelacion:
        nombre_liga = equipo_temporal.LigaRelacion.Nombreliga
        if equipo_temporal.LigaRelacion.CategoriaRelacion:
            nombre_categoria = equipo_temporal.LigaRelacion.CategoriaRelacion.NombreCategoria

    # Valores por defecto finales
    if not nombre_equipo:
        nombre_equipo = "Equipo sin nombre"
    if not nombre_liga:
        nombre_liga = "Liga no especificada"

    nombre_presidente = "No disponible"
    if equipo_temporal.UsuarioRelacion:
        persona = db.query(Personas).filter(Personas.PersonaId == equipo_temporal.UsuarioRelacion.PersonaId).first()
        if persona:
            nombre_presidente = f"{persona.Nombre} {persona.PrimerApellido} {persona.SegundoApellido or ''}".strip().upper()
    
    if nombre_presidente == "No disponible" and equipo_temporal.EquipoId:
        eq_jugando = db.query(EquiposJugando).filter(EquiposJugando.EquipoId == equipo_temporal.EquipoId).first()
        if eq_jugando and eq_jugando.PresidenteEquipoId:
            from app.modelos.presidente_equipo_modelo import PresidenteEquipo
            pres = db.query(PresidenteEquipo).filter(PresidenteEquipo.PresidenteEquipoId == eq_jugando.PresidenteEquipoId).first()
            if pres:
                pers = db.query(Personas).filter(Personas.PersonaId == pres.PersonaId).first()
                if pers:
                    nombre_presidente = f"{pers.Nombre} {pers.PrimerApellido} {pers.SegundoApellido or ''}".strip().upper()

    return {
        "equipo_temporal_id": equipo_temporal.EquipoTemporalId,
        "nombre_equipo": nombre_equipo,
        "nombre_liga": nombre_liga,
        "nombre_categoria": nombre_categoria,
        "slots_disponibles": slots_disponibles,
        "total_slots": equipo_temporal.CantidadJugadoresPagados,
        "nombre_presidente": nombre_presidente
    }


def obtener_equipos_temporales_pendientes_por_usuario_repo(db, usuario_id):
    equipos = (
        db.query(EquipoTemporal)
        .join(OrdenPago, EquipoTemporal.OrdenPagoId == OrdenPago.OrdenPagoId)
        .filter(EquipoTemporal.UsuarioId == usuario_id)
        .filter(EquipoTemporal.Activo == True)
        .filter(OrdenPago.EstatusPagoId.in_([
            int(EstatusValidacionPago.ACTIVO.value),
            int(EstatusValidacionPago.ESPERA.value)
        ]))
        .order_by(EquipoTemporal.EquipoTemporalId.desc())
        .all()
    )

    equipos_pendientes = []
    for equipo in equipos:
        resumen = construir_resumen_equipo_temporal(db, equipo)
        if resumen["slots_disponibles"] > 0:
            equipos_pendientes.append(resumen)

    return equipos_pendientes


#DOCUMENTOS
def obtener_documentos_jugador_repo(db, persona_id: int):

    docs = db.query(
        DocumentosEntregados.DocumentosSolicitudId,
        DocumentosEntregados.SolicitudId,
        DocumentosEntregados.DocumentoAfiliacionId,
        DocumentosEntregados.RutaArchivo,
        DocumentosEntregados.FechaEntrega,
        DocumentosEntregados.EstadoValidacionId,
        DocumentosEntregados.ObservacionesDocumento,
        CatalogoDocumentos.DocumentoId,
        CatalogoDocumentos.NombreDocumento,
        CatalogoRolesPersonas.Nombre.label("RolNombre"),
        DocumentoAfiliacion.Obligatorio
    ).join(
        DocumentoAfiliacion,
        DocumentosEntregados.DocumentoAfiliacionId == DocumentoAfiliacion.DocumentoAfiliacionId
    ).join(
        CatalogoDocumentos,
        DocumentoAfiliacion.DocumentoId == CatalogoDocumentos.DocumentoId
    ).outerjoin(
        CatalogoRolesPersonas,
        DocumentoAfiliacion.RolPersonaId == CatalogoRolesPersonas.RolPersonaId
    ).filter(
        DocumentosEntregados.PersonaId == persona_id
    ).all()
    #print("DOCS RAW:", docs)
    return [
        {
            "DocumentosSolicitudId": d.DocumentosSolicitudId,
            "SolicitudId": d.SolicitudId,
            "DocumentoAfiliacionId": d.DocumentoAfiliacionId,
            "DocumentoId": d.DocumentoId,
            "nombre": d.NombreDocumento,
            "rol": d.RolNombre,
            "obligatorio": d.Obligatorio,
            "RutaArchivo": d.RutaArchivo,
            "FechaEntrega": d.FechaEntrega,
            "EstadoValidacionId": d.EstadoValidacionId,
            "ObservacionesDocumento": d.ObservacionesDocumento
        }
        for d in docs
    ]


#SOLICITUDES
def obtener_solicitud_id(db, equipo_temporal_id):
    equipo = db.query(EquipoTemporal).filter(
        EquipoTemporal.EquipoTemporalId == equipo_temporal_id
    ).first()

    return equipo.SolicitudId

def crear_solicitud_administrativa(db, usuario_id):
    """
    Crea una solicitud administrativa cuando un admin registra un equipo.
    Usado para auditar y registrar documentos de jugadores en BD.
    """
    solicitud = Solicitud(
        UsuarioId=usuario_id,
        FechaSolicitud=datetime.now(),
        EstatusValidacion=int(EstatusValidacionSolicitud.ACEPTADO),
        ObservacionesSolicitud="Registro administrativo de equipo y jugadores",
        TipoSolicitudId=2
    )
    db.add(solicitud)
    db.flush()
    return solicitud.SolicitudId


def obtener_solicitud_id_para_persona(db, persona_id: int, usuario_id: int) -> int:
    """
    Resuelve la SolicitudId real del jugador (proceso de alta en equipo temporal),
    no el valor erróneo que pudo quedar en DocumentosEntregados (p. ej. id 1).
    """
    # 1) Slot del jugador en EquipoTemporal (solicitud del registro original)
    fila_slot = (
        db.query(EquipoTemporal.SolicitudId)
        .join(
            EquipoTemporalJugador,
            EquipoTemporalJugador.EquipoTemporalId == EquipoTemporal.EquipoTemporalId,
        )
        .filter(
            EquipoTemporalJugador.PersonaId == persona_id,
            EquipoTemporal.SolicitudId.isnot(None),
        )
        .order_by(EquipoTemporal.EquipoTemporalId.desc())
        .first()
    )
    if fila_slot and fila_slot.SolicitudId:
        return fila_slot.SolicitudId

    # 2) Equipo actual del jugador → EquipoTemporal vinculado al mismo EquipoId
    miembro = (
        db.query(MiembrosEquipo)
        .filter(
            MiembrosEquipo.PersonaId == persona_id,
            MiembrosEquipo.Eliminado == False,
        )
        .order_by(MiembrosEquipo.MiembroEquipoId.desc())
        .first()
    )
    if miembro and miembro.EquipoID:
        fila_equipo = (
            db.query(EquipoTemporal.SolicitudId)
            .filter(
                EquipoTemporal.EquipoId == miembro.EquipoID,
                EquipoTemporal.SolicitudId.isnot(None),
            )
            .order_by(EquipoTemporal.EquipoTemporalId.desc())
            .first()
        )
        if fila_equipo and fila_equipo.SolicitudId:
            return fila_equipo.SolicitudId

    # 3) Documentos entregados: solicitud más repetida (no el primer registro aislado)
    filas_docs = (
        db.query(
            DocumentosEntregados.SolicitudId,
            func.count(DocumentosEntregados.DocumentosSolicitudId).label("total"),
        )
        .filter(
            DocumentosEntregados.PersonaId == persona_id,
            DocumentosEntregados.SolicitudId.isnot(None),
        )
        .group_by(DocumentosEntregados.SolicitudId)
        .order_by(func.count(DocumentosEntregados.DocumentosSolicitudId).desc())
        .all()
    )
    if filas_docs:
        return filas_docs[0].SolicitudId

    return crear_solicitud_administrativa(db, usuario_id)


def crear_solicitud_presidente(db, usuario_id):
    solicitud = Solicitud(
        UsuarioId=usuario_id,
        FechaSolicitud=datetime.now(),
        EstatusValidacion=int(EstatusValidacionSolicitud.ACEPTADO),
        ObservacionesSolicitud="Solicitud de registro de equipo por presidente",
        TipoSolicitudId=2 #Equipo
    )
    db.add(solicitud)
    db.flush()
    return solicitud.SolicitudId



# =============================
#CREACIÓN DE EQUIPO
# =============================
def actualizar_slot_repo(db, equipo_id: int, persona_id: int, seguro_id: int):
    
    equipo_temporal = db.query(EquipoTemporal).filter(EquipoTemporal.EquipoId == equipo_id, EquipoTemporal.Activo == True).with_for_update().first()
    
    if not equipo_temporal:
        raise HTTPException(status_code=404, detail="Equipo temporal no encontrado o no activo")

    # Buscar slots disponibles con el seguro correcto
    slot = (
        db.query(EquipoTemporalJugador)
        .filter(
            EquipoTemporalJugador.EquipoTemporalId == equipo_temporal.EquipoTemporalId,
            EquipoTemporalJugador.Completo == False,
            EquipoTemporalJugador.SeguroId == seguro_id
        )
        .with_for_update()
        .first()
    )

    if not slot:
        raise HTTPException(
            400,
            "No hay disponibilidad para el seguro seleccionado"
        )

    # Asignar persona al slot (NO tocar SeguroId)
    slot.PersonaId = persona_id
    slot.Completo = True
    slot.DatosBorrador = None

    return slot

def actualizar_orden(db, solicitud_id: int):
    # Si no hay solicitud asociada (ej. equipo creado directamente por admin), no hay orden que marcar.
    if not solicitud_id:
        return

    orden = db.query(OrdenPago).filter(OrdenPago.SolicitudId == solicitud_id).first()
    
    if not orden:
        # Si la orden no se encuentra, no es un error crítico: puede que el admin haya aprobado directamente.
        return

    orden.EstatusPagoId = int(EstatusValidacionPago.CADUCADO)

def parse_fecha(fecha: str):
    for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(fecha, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Formato de fecha inválido: {fecha}")


def es_menor_de_edad(fecha_nacimiento) -> bool:
    if not fecha_nacimiento:
        return False
    if isinstance(fecha_nacimiento, datetime):
        fecha = fecha_nacimiento.date()
    elif isinstance(fecha_nacimiento, date):
        fecha = fecha_nacimiento
    else:
        return False
    hoy = date.today()
    edad = hoy.year - fecha.year
    if (hoy.month, hoy.day) < (fecha.month, fecha.day):
        edad -= 1
    return edad < 18


def doc_type_to_id_jugador(es_menor: bool) -> dict:
    """Mapeo de claves de archivo (FormData) a DocumentoAfiliacionId."""
    if es_menor:
        return {
            "acta": 22,
            "ineTutor": 33,              # INE de tutor
            "identificacionMenor": 36,   # Identificación de menor
            "foto": 25,
            "formato": 28,
        }
    return {
        "acta": 22,
        "ine": 26,
        "foto": 25,
        "formato": 28,
    }

async def procesar_jugador(db, equipo, p_data, form_data, index, solicitud_id):
    try:
        #Validar fecha de nacimiento
        fecha_nacimiento = None
        if p_data.get("fecha_nacimiento"):
            try:
                fecha_nacimiento = validaciones.validacion_fecha(p_data["fecha_nacimiento"])
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))
            
        #si nacional
        #Verificar curp
        if not p_data.get("extranjero"):
            validaciones.validacion_curp(p_data["curp"])
        
        nueva_persona = Personas(
            Nombre=p_data["nombre"],
            PrimerApellido=p_data["primer_apellido"],
            SegundoApellido=p_data.get("segundo_apellido"),
            CURP=p_data["curp"],
            NUI=p_data.get("nui"),
            SexoId=p_data["sexo_id"],
            FechaNacimiento=fecha_nacimiento,
            LugarNacimiento=p_data.get("lugar_nacimiento"),
            CorreoElectronico=p_data.get("correo"),
            NumeroTelefono=p_data.get("telefono")
        )
        #print("PERSONA CREADA:", nueva_persona.PersonaId)
        db.add(nueva_persona)
        db.flush()

    except IntegrityError as e:

        if "check_curp_persona_longitud" in str(e):
            raise HTTPException(
                400,
                f"La CURP '{p_data['curp']}' debe tener 18 caracteres"
            )
        else:
            raise HTTPException(
                400,
                f"Error al registrar jugador: {str(e)}"
            )

    antecedentes_id = None

    if p_data.get("extranjero"):
        antecedentes = AntecedentesInternacionales(
            Extranjero=True,
            Nacionalidades=p_data.get("nacionalidad"),
            PaisResidenciaActual=p_data.get("pais_residencia"),
            NacionalidadPadre=p_data.get("nacionalidad_padre"),
            NacionalidadMadre=p_data.get("nacionalidad_madre"),
            NacionalidadAbueloP=p_data.get("nac_abuelo_paterno"),
            NacionalidadAbuelaP=p_data.get("nac_abuela_paterna"),
            NacionalidadAbueloM=p_data.get("nac_abuelo_materno"),
            NacionalidadAbuelaM=p_data.get("nac_abuela_materna"),
            RegistroAsociacionExtranjera=p_data.get("registro_asociacion_extranjera"),
            ParticipacionExtranjera=p_data.get("juego_club_extranjero")
        )

        db.add(antecedentes)
        db.flush()
        antecedentes_id = antecedentes.AntecedentesId

    miembro = MiembrosEquipo(
        PersonaId=nueva_persona.PersonaId,
        RolEnEquipo=p_data.get("rol_en_equipo", 3),
        EquipoID=equipo.EquipoId,
        Estatus=True,
        Eliminado=False,
        NumeroCamiseta=p_data.get("numero_camiseta"),
        Extranjero=p_data.get("extranjero", False),
        AntecedentesId=antecedentes_id
    )

    try:
        seguro_id = int(p_data.get("seguro_id"))
    except (TypeError, ValueError):
        raise HTTPException(400, "Seguro inválido")
    
    if not seguro_id:
        raise HTTPException(400, "Debe seleccionar un seguro")
    
    slot_jugador = actualizar_slot_repo(db, equipo.EquipoId, nueva_persona.PersonaId, seguro_id)

    db.add(miembro)

    archivos = []
    documento_ids = []

    fecha_nac = None
    if p_data.get("fecha_nacimiento"):
        try:
            fecha_nac = parse_fecha(p_data["fecha_nacimiento"])
        except ValueError:
            pass

    DOC_TYPE_TO_ID = doc_type_to_id_jugador(es_menor_de_edad(fecha_nac))

    for doc_type, doc_id in DOC_TYPE_TO_ID.items():
        file_key = f"player_{index}_{doc_type}"
        archivo = form_data.get(file_key)

        if archivo:
            archivos.append(archivo)
            documento_ids.append(doc_id)

    if archivos:
        if not solicitud_id:
            raise HTTPException(400, "No hay solicitud_id para guardar documentos")

        from app.servicios.documentos_servicio import subir_documentos_jugador_equipo

        nombre_jugador = " ".join(filter(None, [
            nueva_persona.Nombre,
            nueva_persona.PrimerApellido,
            nueva_persona.SegundoApellido
        ])).strip() or f"persona_{nueva_persona.PersonaId}"

        await subir_documentos_jugador_equipo(
            db=db,
            persona_id=nueva_persona.PersonaId,
            documento_afiliacion_ids=documento_ids,
            archivos=archivos,
            solicitud_id=solicitud_id,
            nombre_equipo=equipo.NombreEquipo or f"equipo_{equipo.EquipoId}",
            nombre_jugador=nombre_jugador
        )


def crear_equipo_jugando(db, equipo, team_info, presidente_id, cantidad):
    nuevo = EquiposJugando(
        EquipoId=equipo.EquipoId,
        LigaId=team_info["liga_id"],
        PresidenteEquipoId=presidente_id,
        CantidadJugadores=cantidad
    )
    db.add(nuevo)
    db.flush()
    return nuevo



# =============================
# ACTUALIZACIÓN DE EQUIPO
# =============================
def actualizar_equipo_repo(db, equipo_id: int, nombre: str, estatus: bool,
                          presidente_equipo_id: int = None, liga_id: int = None,
                          modalidad_id: int = None, categoria_id: int = None,
                          rama_id: int = None):
    from app.modelos.equipo_modelo import Equipos, EquiposJugando
    equipo = db.query(Equipos).filter(Equipos.EquipoId == equipo_id).first()
    if not equipo:
        return None

    if nombre is not None:
        equipo.NombreEquipo = nombre
    if estatus is not None:
        equipo.Estatus = estatus

    # Actualizar EquiposJugando si se enviaron campos de categoría o presidente
    hay_cambios_jugando = any(v is not None for v in [
        presidente_equipo_id, liga_id
    ])
    if hay_cambios_jugando:
        eq_jugando = db.query(EquiposJugando).filter(EquiposJugando.EquipoId == equipo_id).first()
        if eq_jugando:
            if presidente_equipo_id is not None:
                eq_jugando.PresidenteEquipoId = presidente_equipo_id
            if liga_id is not None:
                eq_jugando.LigaId = liga_id

    db.commit()
    db.refresh(equipo)
    return equipo

def actualizar_jugador_repo(db, miembro_equipo_id: int, nombre: str, primer_apellido: str,
                            segundo_apellido: str, curp: str, estatus: bool,
                            email: str = None, sexo_id: int = None, fecha_nacimiento=None, nui: str = None,
                            numero_camiseta: int = None, rol_en_equipo: int = None):
    from app.modelos.miembro_equipo_modelo import MiembrosEquipo
    from app.modelos.persona_modelo import Personas
    
    miembro = db.query(MiembrosEquipo).filter(MiembrosEquipo.MiembroEquipoId == miembro_equipo_id).first()
    if not miembro:
        return None
    
    persona = db.query(Personas).filter(Personas.PersonaId == miembro.PersonaId).first()
    if not persona:
        return None
    
    if nombre is not None:
        persona.Nombre = nombre
    if primer_apellido is not None:
        persona.PrimerApellido = primer_apellido
    if segundo_apellido is not None:
        persona.SegundoApellido = segundo_apellido
    if curp is not None:
        persona.CURP = curp
    if email is not None:
        persona.CorreoElectronico = email if email.strip() else None
    if sexo_id is not None:
        persona.SexoId = sexo_id
    if fecha_nacimiento is not None:
        persona.FechaNacimiento = fecha_nacimiento
    if nui is not None:
        persona.NUI = nui.strip() if nui.strip() else None
        
    if estatus is not None:
        miembro.Estatus = estatus
    if numero_camiseta is not None:
        miembro.NumeroCamiseta = numero_camiseta
    if rol_en_equipo is not None:
        miembro.RolEnEquipo = rol_en_equipo
        
    db.commit()
    db.refresh(persona)
    db.refresh(miembro)
    return miembro




# =============================
# VER EQUIPOS Y JUDAORES
# =============================
def obtener_directorio_equipos_repo(db):
    from app.modelos.equipo_modelo import Equipos, EquiposJugando
    from app.modelos.catalogos_liga_modelo import Ligas, CatalogoCategorias, CatalogoModalidad, CatalogoRamas
    from app.modelos.presidente_equipo_modelo import PresidenteEquipo
    from app.modelos.usuario_modelo import Usuario

    slots_subquery = db.query(
        EquipoTemporal.EquipoId.label("EquipoId"),
        func.count(EquipoTemporalJugador.EquipoTemporalJugadorId).label("SlotsComprados")
    ).join(EquipoTemporalJugador, EquipoTemporal.EquipoTemporalId == EquipoTemporalJugador.EquipoTemporalId).group_by(EquipoTemporal.EquipoId).subquery()

    resultados = db.query(
        EquiposJugando, Equipos.NombreEquipo, Ligas.Nombreliga, CatalogoCategorias.NombreCategoria,
        CatalogoModalidad.NombreModalidad, CatalogoRamas.Nombre,
        Personas.Nombre, Personas.PrimerApellido, Usuario.Correo,
        func.coalesce(slots_subquery.c.SlotsComprados, 0).label("SlotsComprados")
    ).join(
        Equipos, EquiposJugando.EquipoId == Equipos.EquipoId
    ).join(
        Ligas, EquiposJugando.LigaId == Ligas.LigaId
    ).join(
        CatalogoCategorias, Ligas.CategoriaId == CatalogoCategorias.CategoriaId
    ).join(
        CatalogoModalidad, Ligas.ModalidadId == CatalogoModalidad.ModalidadId
    ).join(
        CatalogoRamas, Ligas.RamaId == CatalogoRamas.RamaId
    ).join(
        PresidenteEquipo, EquiposJugando.PresidenteEquipoId == PresidenteEquipo.PresidenteEquipoId
    ).join(
        Personas, PresidenteEquipo.PersonaId == Personas.PersonaId
    ).outerjoin(
        Usuario, Personas.PersonaId == Usuario.PersonaId
    ).outerjoin(
        slots_subquery, Equipos.EquipoId == slots_subquery.c.EquipoId
    ).all()

    equipos_response = []
    for (ej, eq_nombre, liga, categoria, modalidad, rama, p_nombre, p_apellido, email, slots_comprados) in resultados:
        equipos_response.append({
            "EquipoId": ej.EquipoId,
            "NombreEquipo": eq_nombre,
            "Liga": liga,
            "LigaId": ej.LigaId,
            "Categoria": categoria,
            "CategoriaId": ej.LigaRelacion.CategoriaId if ej.LigaRelacion else None,
            "Modalidad": modalidad,
            "ModalidadId": ej.LigaRelacion.ModalidadId if ej.LigaRelacion else None,
            "Rama": rama,
            "RamaId": ej.LigaRelacion.RamaId if ej.LigaRelacion else None,
            "PresidenteEquipoId": ej.PresidenteEquipoId,
            "PresidenteNombreCompleto": f"{p_nombre} {p_apellido}",
            "PresidenteEmail": email or "Sin correo",
            "NumeroJugadoresRegistrados": ej.CantidadJugadores,
            "FechaCreacion": ej.EquipoRelacion.FechaCreacion,
            "Estatus": ej.EquipoRelacion.Estatus,
            "SlotsComprados": int(slots_comprados or 0)
        })

    return equipos_response

def verificar_documentos_aprobados_repo(db, persona_id: int, fecha_nacimiento) -> bool:
    from app.modelos.documentos_entregados_modelo import DocumentosEntregados
    es_menor = es_menor_de_edad(fecha_nacimiento)
    required_docs_ids = [22, 33, 36, 25, 28] if es_menor else [22, 26, 25, 28]

    approved_count = db.query(DocumentosEntregados.DocumentoAfiliacionId).filter(
        DocumentosEntregados.PersonaId == persona_id,
        DocumentosEntregados.DocumentoAfiliacionId.in_(required_docs_ids),
        DocumentosEntregados.EstadoValidacionId == 1  # 1 es Aprobado/Aceptado en BD
    ).distinct().count()

    return approved_count >= len(required_docs_ids)

def obtener_directorio_jugadores_repo(db):
    from app.modelos.miembro_equipo_modelo import MiembrosEquipo
    from app.modelos.persona_modelo import Personas
    from app.modelos.equipo_modelo import Equipos, EquiposJugando
    from app.modelos.catalogos_liga_modelo import Ligas
    from app.modelos.sexo_c_modelo import CatalogoSexo
    from app.modelos.equipo_temporal_jugador_modelo import EquipoTemporalJugador
    from app.modelos.catalogo_seguros import Seguro

    seguro_subquery = db.query(
        Seguro.Nombre
    ).join(
        EquipoTemporalJugador, Seguro.SeguroId == EquipoTemporalJugador.SeguroId
    ).filter(
        EquipoTemporalJugador.PersonaId == Personas.PersonaId
    ).limit(1).scalar_subquery()

    resultados = db.query(
        MiembrosEquipo, Personas, Equipos.NombreEquipo, Ligas.Nombreliga, CatalogoSexo.Nombre, seguro_subquery.label("SeguroNombre")
    ).join(
        Personas, MiembrosEquipo.PersonaId == Personas.PersonaId
    ).join(
        Equipos, MiembrosEquipo.EquipoID == Equipos.EquipoId
    ).outerjoin(
        EquiposJugando, Equipos.EquipoId == EquiposJugando.EquipoId
    ).outerjoin(
        Ligas, EquiposJugando.LigaId == Ligas.LigaId
    ).outerjoin(
        CatalogoSexo, Personas.SexoId == CatalogoSexo.SexoId
    ).filter(
        MiembrosEquipo.Eliminado == False
    ).all()

    jugadores_response = []
    for (miembro, persona, equipo_nombre, liga, sexo_nombre, seguro_nombre) in resultados:
        docs_aprobados = verificar_documentos_aprobados_repo(db, persona.PersonaId, persona.FechaNacimiento)
        # El rol del jugador debería de ser algo que identifique que es jugador, pero asumimos todos por ahora
        jugadores_response.append({
            "MiembroEquipoId": miembro.MiembroEquipoId,
            "PersonaId": persona.PersonaId,
            "NombreCompleto": f"{persona.Nombre} {persona.PrimerApellido} {persona.SegundoApellido or ''}".strip(),
            "Nombre": persona.Nombre,
            "PrimerApellido": persona.PrimerApellido,
            "SegundoApellido": persona.SegundoApellido,
            "CURP": persona.CURP or "N/A",
            "Sexo": sexo_nombre or "N/A",
            "EquipoNombre": equipo_nombre,
            "EquipoId": miembro.EquipoID,
            "Liga": liga,
            "FechaIngreso": miembro.FechaIngreso,
            "Estatus": miembro.Estatus,
            "Email": persona.CorreoElectronico or "N/A",
            "FechaNacimiento": persona.FechaNacimiento,
            "NUI": persona.NUI or "N/A",
            "DocumentosAprobados": docs_aprobados,
            "NumeroCamiseta": miembro.NumeroCamiseta,
            "RolEnEquipo": miembro.RolEnEquipo,
            "SeguroNombre": seguro_nombre or "Sin seguro asignado"
        })

    return jugadores_response

def obtener_miembros_equipo_por_id_repo(db, equipo_id):
    """
    Obtiene todos los miembros (PersonaId) de un equipo específico.
    Usado para exportar documentos de todos los jugadores del equipo.
    """
    from app.modelos.miembro_equipo_modelo import MiembrosEquipo
    from app.modelos.persona_modelo import Personas
    
    resultados = db.query(
        MiembrosEquipo.MiembroEquipoId,
        MiembrosEquipo.PersonaId,
        Personas.Nombre,
        Personas.PrimerApellido,
        Personas.SegundoApellido,
        Personas.FechaNacimiento
    ).join(
        Personas, MiembrosEquipo.PersonaId == Personas.PersonaId
    ).filter(
        MiembrosEquipo.EquipoID == equipo_id,
        MiembrosEquipo.Eliminado == False
    ).all()

    miembros = []
    for miembro in resultados:
        nombre_completo = f"{miembro.Nombre} {miembro.PrimerApellido} {miembro.SegundoApellido or ''}".strip()
        docs_aprobados = verificar_documentos_aprobados_repo(db, miembro.PersonaId, miembro.FechaNacimiento)
        miembros.append({
            "MiembroEquipoId": miembro.MiembroEquipoId,
            "PersonaId": miembro.PersonaId,
            "NombreCompleto": nombre_completo,
            "DocumentosAprobados": docs_aprobados
        })
    
    return miembros

def obtener_equipo_por_id(db, equipo_id):
    return db.query(Equipos).filter(Equipos.EquipoId == equipo_id).first()

def obtener_o_crear_equipo(db, nombre_equipo):
    equipo = db.query(Equipos).filter(
        func.lower(Equipos.NombreEquipo) == func.lower(nombre_equipo)
    ).first()

    if equipo:
        return equipo

    nuevo = Equipos(NombreEquipo=nombre_equipo, Estatus=True)
    db.add(nuevo)
    db.flush()
    return nuevo


















#LEGACY
#número de seguros ocupados en los slots
def contar_seguros_usados(slots):
    usados = {}

    for slot in slots:
        if slot.SeguroId and slot.Completo and slot.PersonaId:
            usados[slot.SeguroId] = usados.get(slot.SeguroId, 0) + 1

    return usados

def obtener_cantidad_slots(db, equipo_temporal_id):
    slots = db.query(EquipoTemporalJugador).filter(
        EquipoTemporalJugador.EquipoTemporalId == equipo_temporal_id
    ).all()
    return slots

def obtener_slots_con_persona(db, equipo_temporal_id):

    slots = db.query(EquipoTemporalJugador).options(joinedload(EquipoTemporalJugador.PersonaRelacion)).filter(
        EquipoTemporalJugador.EquipoTemporalId == equipo_temporal_id).all()

    return slots
