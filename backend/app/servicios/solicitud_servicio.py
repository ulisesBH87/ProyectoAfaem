from sqlalchemy.orm import Session
from app.modelos.solicitud_modelo import Solicitud
from app.modelos.usuario_modelo import Usuario
from app.modelos.persona_modelo import Personas
from app.repositorios import solicitud_repositorio
from app.core.seguridad import obtener_usuario_actual

def crear_solicitud(db: Session, data, usuario):
    estatusDefecto =  2

    solicitud = Solicitud(
        UsuarioId=usuario.UsuarioId,
        FechaSolicitud=data.FechaSolicitud,
        EstatusValidacion=estatusDefecto,
        TipoAfiliacionId=data.TipoAfiliacion
    )

    persona = Personas(
        CURP=data.CURP,
        RFC=data.RFC,
        SexoId=data.SexoId,
        FechaNacimiento=data.FechaNacimiento
    )

    return solicitud_repositorio.crear_solicitud_repo(db, solicitud, persona)

def obtener_solicitudes_servicio(db: Session):
    return solicitud_repositorio.obtener_solicitudes_repo(db)

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