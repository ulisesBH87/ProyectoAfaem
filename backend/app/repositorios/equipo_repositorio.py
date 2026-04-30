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
from app.modelos.documento_afiliacion_modelo import DocumentoAfiliacion
from app.modelos.documentos_entregados_modelo import DocumentosEntregados
from app.modelos.equipo_temporal_jugador_modelo import EquipoTemporalJugador
from app.modelos.antecedentes_internacionales_modelo import AntecedentesInternacionales

from sqlalchemy.orm import joinedload, selectinload

from app.servicios.documentos_servicio import subir_documento_servicio2
from app.enums.estados_validacion_enum import EstatusValidacionSolicitud
from app.enums.estatus_pago_enum import EstatusValidacionPago


def crear_equipo_temporal_repo(db, orden, solicitud_id, tipo_proceso):
    #obtener cantidad de jugadores pagados
    detalles = db.query(OrdenPagoDetalle).filter(OrdenPagoDetalle.OrdenPagoId == orden.OrdenPagoId).all()
    existe = db.query(EquipoTemporal).filter(
        EquipoTemporal.OrdenPagoId == orden.OrdenPagoId
    ).first()

    if existe:
        return existe
    
    cantidad_jugadores = 0
    cantidad_seguros = 0


    for d in detalles:
        #print("detalle:", d.TipoConceptoId, d.TipoAfiliacionId, d.Cantidad) DEBUG SOLAMENTE
        if d.TipoConceptoId == 2:   #INSCRIPCION DE JUGADOR
            if d.TipoAfiliacionId == 4: #JUGADOR MAYOR
                cantidad_jugadores = d.Cantidad

    # crear equipo temporal        
    equipo = EquipoTemporal(
        UsuarioId=orden.UsuarioId,
        SolicitudId=solicitud_id,
        OrdenPagoId=orden.OrdenPagoId,
        Activo=True,
        CantidadJugadoresPagados=cantidad_jugadores,
        TipoProcesoId=tipo_proceso
    )

    db.add(equipo)
    db.flush()

    #creación de slots
    for i in range(cantidad_jugadores):
        slot = EquipoTemporalJugador(
            EquipoTemporalId = equipo.EquipoTemporalId,
            Completo=False
        )
        db.add(slot)

    return equipo

def hay_slots(db, equipo_id):

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

    slots = equipo_temporal.EquipoTemporalJugadorRelacion

    # slots disponibles
    disponibles = sum(1 for s in slots if s.Completo == 0)

    # seguros disponibles (solo slots NO completos)
    seguros = {}
    for s in slots:
        if s.Completo == 0 and s.SeguroId:
            seguros[s.SeguroId] = seguros.get(s.SeguroId, 0) + 1

    return {
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
    return db.query(EquipoTemporal).filter(
        EquipoTemporal.EquipoTemporalId == equipo_temporal_id
    ).first()

def obtener_seguros_pagados(db, orden_pago_id):
    detalles = db.query(OrdenPagoDetalle).filter(OrdenPagoDetalle.OrdenPagoId == orden_pago_id, OrdenPagoDetalle.SeguroId != None).all()
    
    seguros = {}

    for d in detalles:
        if d.SeguroId not in seguros:
            seguros[d.SeguroId] = 0
        seguros[d.SeguroId] += d.Cantidad

    return seguros

#número de seguros ocupados en los slots
def contar_seguros_usados(slots):
    usados = {}

    for slot in slots:
        if slot.SeguroId:
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

def existe_persona_repo(db, curp):
    persona = db.query(Personas).filter(Personas.CURP == curp).first()
    if persona:
        return True
    
    return False



def obtener_presidente(db, usuario, team_info):
    rol_id = getattr(usuario, 'RolId', None)
    presidente_id = None
    presidente = None

    if rol_id == 1:
        presidente_id = team_info.get("presidente_id")
    else:
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
        DocumentosEntregados.RutaArchivo,
        DocumentosEntregados.FechaEntrega,
        DocumentosEntregados.EstadoValidacionId,
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
    print("DOCS RAW:", docs)
    return [
        {
            "DocumentosSolicitudId": d.DocumentosSolicitudId,
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


#CREACIÓN DE EQUIPO
def actualizar_slot_repo(db, equipo_id: int, persona_id: int, seguro_id: int):

    #añadir filter completo = false
    equipo_temporal = db.query(EquipoTemporal).filter(EquipoTemporal.EquipoId == equipo_id).first()
    equipo_temporal_id = equipo_temporal.EquipoTemporalId

    slots = db.query(EquipoTemporalJugador).filter(EquipoTemporalJugador.EquipoTemporalId == equipo_temporal_id).all()
    for slot in slots:
        if slot.Completo == True:
            continue
        
        if slot.Completo == False:
            slot.PersonaId = persona_id
            slot.SeguroId = seguro_id
            slot.Completo = True
            break;

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
        print("PERSONA CREADA:", nueva_persona.PersonaId)
        db.add(nueva_persona)
        db.flush()

    except IntegrityError as e:
        db.rollback()

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

    seguro_id = p_data.get("seguro_id")
    slot_jugador = actualizar_slot_repo(db, equipo.EquipoId, nueva_persona.PersonaId, seguro_id)

    db.add(miembro)
    db.add(slot_jugador)

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


#ACTUALIZACIÓN DE EQUIPO
def actualizar_usuario_y_presidente(db, usuario, presidente, rol_id):
    if rol_id != 1:
        if presidente:
            presidente.EstatusId = 4

        usuario_db = db.query(Usuario).filter(
            Usuario.UsuarioId == usuario.UsuarioId
        ).first()

        if usuario_db:
            usuario_db.RolId = 3

def actualizar_equipo_repo(db, equipo_id: int, nombre: str, estatus: bool):
    from app.modelos.equipo_modelo import Equipos
    equipo = db.query(Equipos).filter(Equipos.EquipoId == equipo_id).first()
    if not equipo:
        return None
    
    if nombre is not None:
        equipo.NombreEquipo = nombre
    if estatus is not None:
        equipo.Estatus = estatus
        
    db.commit()
    db.refresh(equipo)
    return equipo

def actualizar_jugador_repo(db, miembro_equipo_id: int, nombre: str, primer_apellido: str, segundo_apellido: str, curp: str, estatus: bool):
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
        
    if estatus is not None:
        miembro.Estatus = estatus
        
    db.commit()
    db.refresh(persona)
    db.refresh(miembro)
    return miembro



#VER EQUIPOS
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
            "Categoria": categoria,
            "Modalidad": modalidad,
            "Rama": rama,
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


