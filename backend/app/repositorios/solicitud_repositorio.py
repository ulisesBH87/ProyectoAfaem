from sqlalchemy.orm import Session
from app.modelos import Solicitud, Usuario

def crear_solicitudrepo(db: Session, solicitud: Solicitud, usuario: Usuario):
    db.add(solicitud)
    
    usuariosolicitud = db.query(Usuario).filter(Usuario.UsuarioId == solicitud.UsuarioId).first()
    
    usuariosolicitud.CURP = usuario.CURP
    usuariosolicitud.RFC = usuario.RFC
    usuariosolicitud.SexoId = usuario.SexoId
    usuariosolicitud.FechaNacimiento = usuario.FechaNacimiento

    db.commit()
    db.refresh(solicitud)
    return solicitud

def obtener_solicitudes_repo(db: Session):
    return db.query(Solicitud).all()

def obtener_solicitud_individual_repo(db:Session, solicitud_id: int):
    SolicitudUsuario = db.query(Solicitud).filter(Solicitud.SolicitudId == solicitud_id).first()
    
    usuario = SolicitudUsuario.UsuarioRelacion
    
    return {
        "Nombre": usuario.Nombre,
        "PrimerApellido": usuario.PrimerApellido,
        "SegundoApellido": usuario.SegundoApellido,
        "CURP": usuario.CURP,
        "SexoId": usuario.SexoId,
        "FechaNacimiento": usuario.FechaNacimiento
    }