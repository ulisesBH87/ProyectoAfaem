from sqlalchemy.orm import Session
from app.modelos.solicitud_modelo import Solicitud
from app.modelos.usuario_modelo import Usuario
from app.repositorios import solicitud_repositorio
from app.core.seguridad import obtener_usuario_actual

def crear_solicitud(db: Session, data, usuario):
    estatusDefecto =  2

    solicitud = Solicitud(
        UsuarioId=usuario.UsuarioId,
        FechaSolicitud=data.FechaSolicitud,
        EstatusValidacion=estatusDefecto
        
    )

    usuario = Usuario(
        CURP=data.CURP,
        RFC=data.RFC,
        SexoId=data.SexoId,
        FechaNacimiento=data.FechaNacimiento
    )

    return solicitud_repositorio.crear_solicitudrepo(db, solicitud, usuario)

def obtener_solicitudes_servicio(db: Session):
    return solicitud_repositorio.obtener_solicitudes_repo(db)