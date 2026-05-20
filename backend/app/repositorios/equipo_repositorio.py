from sqlite3 import IntegrityError

from sqlalchemy import func
from datetime import datetime
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

from app.servicios.documentos_servicio import subir_documento_servicio2
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

    #obtener cantidad de slots pagados
    for d in detalles:
        #print("detalle:", d.TipoConceptoId, d.TipoAfiliacionId, d.Cantidad) DEBUG SOLAMENTE
        if d.TipoConceptoId == ConceptoPagoEnum.INSCRIPCION.value:   #INSCRIPCION
            # Excluimos la afiliación de presidente de equipo (ID 2) ya que no cuenta como slot de jugador
            if d.TipoAfiliacionId != 2:
                cantidad_jugadores += d.Cantidad

    solicitud = db.query(Solicitud).filter(Solicitud.SolicitudId == solicitud_id).first()
    usuario = db.query(Usuario).filter(Usuario.UsuarioId == orden.UsuarioId).first()
    presidente_persona_id = usuario.PersonaId if usuario else None

    #SI ES PROCESO DE REGISTRO DE PRESIDENTE, SE CAMBIA EL ROL DEL USUARIO
    if solicitud.TipoSolicitudId == TiposSolicitudEnum.PRESIDENTE_EQUIPO:
        pagos_repositorio.crear_presidente_equipo_repo(db, usuario.PersonaId)

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
    slot_presidente_asignado = False

    for d in detalles:
        if (
            d.TipoConceptoId == 1 and  # SEGURO
            d.SeguroId is not None
        ):
            seguro = db.query(Seguro).filter(Seguro.SeguroId == d.SeguroId).first()
            es_seguro_presidente = bool(seguro and int(seguro.TipoPersonaId or 0) == 2)
            for _ in range(d.Cantidad):
                asignar_presidente = es_seguro_presidente and not slot_presidente_asignado and presidente_persona_id is not None
                slot = EquipoTemporalJugador(
                    EquipoTemporalId=equipo.EquipoTemporalId,
                    Completo=asignar_presidente,
                    PersonaId=presidente_persona_id if asignar_presidente else None,
                    SeguroId=d.SeguroId  #Asignar seguro desde el inicio
                )
                db.add(slot)
                if asignar_presidente:
                    slot_presidente_asignado = True
                total_slots_creados += 1

    # validación
    if total_slots_creados != cantidad_jugadores:
        raise ValueError(
            f"Inconsistencia: personas={cantidad_jugadores}, slots={total_slots_creados}"
        )

    return equipo



# =============================
# == DISPONIBLIDAD DE SLOTS ==
# =============================

def obtener_disponibilidad_equipo(db, equipo_id):

    equipo_temporal = (
        db.query(EquipoTemporal)
        .options(selectinload(EquipoTemporal.EquipoTemporalJugadorRelacion))
        .filter(
            EquipoTemporal.EquipoId == equipo_id,
            EquipoTemporal.Activo == True
        )
        .first()
    )

    if not equipo_temporal:
        return None

    #Si hay slots
    slots = equipo_temporal.EquipoTemporalJugadorRelacion

    # total disponibles
    disponibles = sum(1 for s in slots if s.Completo == 0)

    # seguros disponibles (solo slots libres)
    seguros = {}
    for s in slots:
        if s.Completo == 0 and s.SeguroId:
            seguros[s.SeguroId] = seguros.get(s.SeguroId, 0) + 1

    return {
        "equipo_temporal_activo": True,
        "equipo_temporal_id": equipo_temporal.EquipoTemporalId,
        "slots_disponibles": disponibles,
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
        .filter(OrdenPago.EstatusPagoId == int(EstatusValidacionPago.ACTIVO.value))
        .order_by(EquipoTemporal.EquipoTemporalId.desc())
        .first()
    )


#DOCUMENTOS
def obtener_documentos_jugador_repo(db, persona_id: int):

    docs = db.query(
        DocumentosEntregados.DocumentosSolicitudId,
        DocumentosEntregados.DocumentoAfiliacionId,
        DocumentosEntregados.RutaArchivo,
        DocumentosEntregados.FechaEntrega,
        DocumentosEntregados.EstadoValidacionId,
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
            "DocumentoAfiliacionId": d.DocumentoAfiliacionId,
            "DocumentoId": d.DocumentoId,
            "nombre": d.NombreDocumento,
            "rol": d.RolNombre,
            "obligatorio": d.Obligatorio,
            "RutaArchivo": d.RutaArchivo,
            "FechaEntrega": d.FechaEntrega,
            "EstadoValidacionId": d.EstadoValidacionId
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

    return slot

def actualizar_orden(db, solicitud_id: int):
    orden = db.query(OrdenPago).filter(OrdenPago.SolicitudId == solicitud_id).first()
    
    if not orden:
        raise ValueError("Orden de pago no encontrada")

    orden.EstatusPagoId = int(EstatusValidacionPago.CADUCADO)

def parse_fecha(fecha: str):
    for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(fecha, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Formato de fecha inválido: {fecha}")

async def procesar_jugador(db, equipo, p_data, form_data, index, solicitud_id):
    try:
        #Validar fecha de nacimiento
        if p_data.get("fecha_nacimiento"):
            fecha_nacimiento = parse_fecha(p_data["fecha_nacimiento"])

            try:
                validaciones.validacion_fecha(fecha_nacimiento)
            except ValueError:
                raise HTTPException(status_code=400)
            
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
            FechaNacimiento=parse_fecha(p_data["fecha_nacimiento"])
            if p_data.get("fecha_nacimiento") else None,
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

    #ID HARDCODEADOS POR AHORA. MEJORAR EN EL FUTURO. BORRAR LÍNEA CUANDO SE HAGA LA MEJORA
    DOC_TYPE_TO_ID = {
        "acta": 22,     # jugador mayor
        "ine": 26,
        "foto": 25,
        "formato": 28
    }

    for doc_type, doc_id in DOC_TYPE_TO_ID.items():
        file_key = f"player_{index}_{doc_type}"
        archivo = form_data.get(file_key)

        if archivo:
            archivos.append(archivo)
            documento_ids.append(doc_id)

    if archivos:
        if not solicitud_id:
            raise HTTPException(400, "No hay solicitud_id para guardar documentos")

        await subir_documento_servicio2(
            db=db,
            persona_id=nueva_persona.PersonaId,
            documento_afiliacion_ids=documento_ids,
            archivos=archivos,
            solicitud_id=solicitud_id
        )

def crear_equipo_jugando(db, equipo, team_info, presidente_id, cantidad):
    nuevo = EquiposJugando(
        EquipoId=equipo.EquipoId,
        RamaId=team_info["rama_id"],
        CategoriaId=team_info["categoria_id"],
        LigaId=team_info["liga_id"],
        ModalidadId=team_info["modalidad_id"],
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
        presidente_equipo_id, liga_id, modalidad_id, categoria_id, rama_id
    ])
    if hay_cambios_jugando:
        eq_jugando = db.query(EquiposJugando).filter(EquiposJugando.EquipoId == equipo_id).first()
        if eq_jugando:
            if presidente_equipo_id is not None:
                eq_jugando.PresidenteEquipoId = presidente_equipo_id
            if liga_id is not None:
                eq_jugando.LigaId = liga_id
            if modalidad_id is not None:
                eq_jugando.ModalidadId = modalidad_id
            if categoria_id is not None:
                eq_jugando.CategoriaId = categoria_id
            if rama_id is not None:
                eq_jugando.RamaId = rama_id

    db.commit()
    db.refresh(equipo)
    return equipo

def actualizar_jugador_repo(db, miembro_equipo_id: int, nombre: str, primer_apellido: str,
                            segundo_apellido: str, curp: str, estatus: bool,
                            email: str = None, sexo_id: int = None, fecha_nacimiento=None, nui: str = None):
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

    resultados = db.query(
        EquiposJugando, Equipos.NombreEquipo, Ligas.Nombreliga, CatalogoCategorias.NombreCategoria,
        CatalogoModalidad.NombreModalidad, CatalogoRamas.Nombre,
        Personas.Nombre, Personas.PrimerApellido, Usuario.Correo
    ).join(
        Equipos, EquiposJugando.EquipoId == Equipos.EquipoId
    ).join(
        Ligas, EquiposJugando.LigaId == Ligas.LigaId
    ).join(
        CatalogoCategorias, EquiposJugando.CategoriaId == CatalogoCategorias.CategoriaId
    ).join(
        CatalogoModalidad, EquiposJugando.ModalidadId == CatalogoModalidad.ModalidadId
    ).join(
        CatalogoRamas, EquiposJugando.RamaId == CatalogoRamas.RamaId
    ).join(
        PresidenteEquipo, EquiposJugando.PresidenteEquipoId == PresidenteEquipo.PresidenteEquipoId
    ).join(
        Personas, PresidenteEquipo.PersonaId == Personas.PersonaId
    ).outerjoin(
        Usuario, Personas.PersonaId == Usuario.PersonaId
    ).all()

    equipos_response = []
    for (ej, eq_nombre, liga, categoria, modalidad, rama, p_nombre, p_apellido, email) in resultados:
        equipos_response.append({
            "EquipoId": ej.EquipoId,
            "NombreEquipo": eq_nombre,
            "Liga": liga,
            "LigaId": ej.LigaId,
            "Categoria": categoria,
            "CategoriaId": ej.CategoriaId,
            "Modalidad": modalidad,
            "ModalidadId": ej.ModalidadId,
            "Rama": rama,
            "RamaId": ej.RamaId,
            "PresidenteEquipoId": ej.PresidenteEquipoId,
            "PresidenteNombreCompleto": f"{p_nombre} {p_apellido}",
            "PresidenteEmail": email or "Sin correo",
            "NumeroJugadoresRegistrados": ej.CantidadJugadores,
            "FechaCreacion": ej.EquipoRelacion.FechaCreacion,
            "Estatus": ej.EquipoRelacion.Estatus
        })

    return equipos_response

def obtener_directorio_jugadores_repo(db):
    from app.modelos.miembro_equipo_modelo import MiembrosEquipo
    from app.modelos.persona_modelo import Personas
    from app.modelos.equipo_modelo import Equipos, EquiposJugando
    from app.modelos.catalogos_liga_modelo import Ligas
    from app.modelos.sexo_c_modelo import CatalogoSexo

    resultados = db.query(
        MiembrosEquipo, Personas, Equipos.NombreEquipo, Ligas.Nombreliga, CatalogoSexo.Nombre
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
    for (miembro, persona, equipo_nombre, liga, sexo_nombre) in resultados:
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
            "Liga": liga,
            "FechaIngreso": miembro.FechaIngreso,
            "Estatus": miembro.Estatus,
            "Email": persona.CorreoElectronico or "N/A",
            "FechaNacimiento": persona.FechaNacimiento,
            "NUI": persona.NUI or "N/A"
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
        Personas.SegundoApellido
    ).join(
        Personas, MiembrosEquipo.PersonaId == Personas.PersonaId
    ).filter(
        MiembrosEquipo.EquipoID == equipo_id,
        MiembrosEquipo.Eliminado == False
    ).all()

    miembros = []
    for miembro in resultados:
        nombre_completo = f"{miembro.Nombre} {miembro.PrimerApellido} {miembro.SegundoApellido or ''}".strip()
        miembros.append({
            "MiembroEquipoId": miembro.MiembroEquipoId,
            "PersonaId": miembro.PersonaId,
            "NombreCompleto": nombre_completo
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
