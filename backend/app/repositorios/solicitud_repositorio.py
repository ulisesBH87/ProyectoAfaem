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