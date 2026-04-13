from sqlalchemy.orm import Session
from app.modelos.solicitud_modelo import Solicitud
from app.modelos.usuario_modelo import Usuario
from app.modelos.persona_modelo import Personas
from app.repositorios import solicitud_repositorio
from app.core.seguridad import obtener_usuario_actual
from app.enums.estados_validacion_enum import EstatusValidacionSolicitud
from fastapi import HTTPException
from app.modelos.equipo_temporal_modelo import EquipoTemporal

#Se crea la solicitud parcialmente, aún no se envía a administrador
def crear_solicitud(db: Session, data, usuario):
    # 1. Obtener la persona vinculada al usuario
    persona = usuario.PersonaRelacion
    if not persona:
        raise Exception("El usuario no tiene una persona vinculada")

    # 2. Actualizar los datos de la persona con lo recibido
    persona.CURP = data.CURP.upper()
    persona.RFC = data.RFC.upper()
    persona.SexoId = data.SexoId
    persona.FechaNacimiento = data.FechaNacimiento

    # 3. Crear el objeto Solicitud
    estatusDefecto = 2
    solicitud = Solicitud(
        UsuarioId=usuario.UsuarioId,
        FechaSolicitud=data.FechaSolicitud,
        EstatusValidacion=estatusDefecto,
        TipoAfiliacionId=data.TipoAfiliacion
    )

    # 4. Guardar todo
    db.add(solicitud)
    db.commit()
    db.refresh(solicitud)
    
    return solicitud

#Todas las solicitudes
def obtener_solicitudes_usuarios_servicio(db: Session):
    return solicitud_repositorio.obtener_solicitudes_usuarios_repo(db)

def obtener_solicitudes_servicio(db: Session):

    solicitudes = solicitud_repositorio.obtener_solicitudes_repo(db)

    resultado = []

    for s in solicitudes:

        equipo = db.query(EquipoTemporal).filter(
            EquipoTemporal.SolicitudId == s.SolicitudId
        ).first()

        jugadores = 0
        if equipo:
            jugadores = equipo.CantidadJugadoresPagados

        resultado.append({
            "solicitud_id": s.SolicitudId,
            "usuario": s.UsuarioRelacion.Correo,
            "tipo_afiliacion": s.TipoAfiliacionRelacion.NombreAfiliacion,
            "estatus": s.EstatusValidacionId,
            "fecha": s.FechaSolicitud,
            "jugadores": jugadores
        })

    return resultado

#Solicitud individual
def obtener_solicitud_detalle_servicio(db, solicitud_id):

    data = solicitud_repositorio.obtener_solicitud_detalle_repo(db, solicitud_id)

    if not data:
        raise HTTPException(404, "Solicitud no encontrada")

    return data

def obtener_solicitud_individual_servicio(db: Session, solicitud_id: int):
    return solicitud_repositorio.obtener_solicitud_individual_repo(db, solicitud_id)

def agregar_requisitos_servicio(db: Session, tipo_afiliacion_id: int, documentos_persona_ids: list[int]):
    existentes = solicitud_repositorio.obtener_por_tipo_afiliacion(db, tipo_afiliacion_id)

    existentes_ids = {doc.DocumentoPersonaId for doc in existentes}

    nuevos_registros = []

    for doc_persona_id in documentos_persona_ids:
        if doc_persona_id in existentes_ids:
            continue

        registro = solicitud_repositorio.crear_requisito_repo(db, tipo_afiliacion_id, doc_persona_id)

        nuevos_registros.append(registro)

    db.commit()

    return nuevos_registros

def ver_requisitos_afiliacion_servicio(db, tipo_afiliacion_id: int):

    requisitos = solicitud_repositorio.ver_requisitos_afiliacion_repo(db, tipo_afiliacion_id)

    return requisitos

def crear_solicitud_servicio(db, solicitud, usuarioid):
    solicitud.UsuarioId = usuarioid
    nueva_solicitud = solicitud_repositorio.crear_solicitud_repo(db, solicitud.TipoAfiliacionId, solicitud.UsuarioId)

    for persona in solicitud.Persona:

        for doc in persona.Documentos:

            solicitud_repositorio.crear_documento_solicitud_repo(
                db=db,
                SolicitudId = nueva_solicitud.SolicitudId,
                PersonaId = persona.persona_id,
                DocumentoAfiliacionId = doc.documento_afiliacion_id,
                RutaArchivo = doc.ruta_archivo
            )
    db.commit()

    return {"solicitud_id": nueva_solicitud.SolicitudId, "mensaje": "Solicitud enviada correctamente"}

def enviar_solicitud_completa_servicio(db, solicitud_id, usuario_id):

    solicitud = solicitud_repositorio.obtener_solicitud_por_id(db, solicitud_id)

    if not solicitud:
        raise HTTPException(404, "No se encontró la solicitud")

    if solicitud.UsuarioId != usuario_id:
        raise HTTPException(403, "No tienes permiso para enviar esta solicitud")

    if solicitud.EstatusValidacion == EstatusValidacionSolicitud.ESPERA:
        raise HTTPException(400, "La solicitud ya ha sido enviada")

    #enviio
    solicitud_completa = solicitud_repositorio.enviar_solicitud_completa_repo(db, solicitud_id)
    if not solicitud_completa:
        raise HTTPException(400, "Error al enviar la solicitud")
    
    return {"mensaje": "Solicitud enviada correctamente"}

# --- SECCIÓN ADMINISTRADORA: VALIDACIÓN DE SOLICITUDES ---

def obtener_documentos_para_revision_servicio(db: Session, solicitud_id: int):
    resultado = solicitud_repositorio.obtener_personas_con_documentos_repo(db, solicitud_id)
    if not resultado:
         raise HTTPException(status_code=404, detail="No se encontró la solicitud o no tiene documentos asociados")
    return resultado

def validar_solicitud_servicio(db: Session, solicitud_id: int, payload):
    """
    Lógica para aprobar o rechazar una solicitud.
    """
    try:
        # Iniciamos transaccion explícita
        with db.begin_nested(): # Usamos nested para asegurar que si falla algo, todo regrese
            
            # Mapeo de Estatus desde el Payload (Sincronizado: 2: Aprobado, 3: Rechazado)
            estatus_db = payload.Estatus
            
            # 1. Actualizar estatus de la solicitud
            solicitud = solicitud_repositorio.actualizar_validacion_solicitud_repo(
                db, solicitud_id, estatus_db, payload.Observaciones
            )
            
            if not solicitud:
                raise HTTPException(status_code=404, detail="Solicitud no encontrada")
            
            # 2. Si es aprobado (ID 2), activar al presidente
            if payload.Estatus == 2:
                activado = solicitud_repositorio.activar_presidente_solicitud_repo(db, solicitud_id)
                if not activado:
                    # Si no pudimos activar al presidente, lanzamos error para hacer rollback
                    raise Exception("No se pudo activar el registro de Presidente de Equipo. Verifique que el usuario esté vinculado correctamente.")
            
        db.commit()
        mensaje = "Solicitud aprobada y presidente activado" if payload.Estatus == 2 else "Solicitud rechazada correctamente"
        return {"mensaje": mensaje, "solicitud_id": solicitud_id}

    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error en la validación: {str(e)}")

