from sqlalchemy.orm import Session
from app.modelos import Solicitud, Usuario, CatalogoTiposAfiliacion, CatalogoEstadosValidacion, Personas

def crear_solicitud_repo(db: Session, solicitud: Solicitud, usuario: Usuario, persona: Personas):
    db.add(solicitud)

    usuariosolicitud = db.query(Usuario).filter(Usuario.UsuarioId == solicitud.UsuarioId).first()
    
    persona.CURP = usuariosolicitud.CURP
    persona.RFC = usuariosolicitud.RFC
    persona.SexoId = usuariosolicitud.SexoId
    persona.FechaNacimiento = usuariosolicitud.FechaNacimiento

    db.commit()
    db.refresh(solicitud)
    return solicitud

def obtener_solicitudes_repo(db: Session):
    return db.query(Solicitud).all()

def obtener_solicitud_individual_repo(db:Session, solicitud_id: int):
    SolicitudUsuario = db.query(Solicitud).filter(Solicitud.SolicitudId == solicitud_id).first()
    
    usuario = SolicitudUsuario.UsuarioRelacion
    sexo = SolicitudUsuario.UsuarioRelacion.SexoFk
    tipoSolicitud = SolicitudUsuario.CatalogoTiposAfiliacionRelacion
    estatus = SolicitudUsuario.CatalogoEstadosValidacion
    
    return {
        #"Nombre": usuario.Nombre,
        #"PrimerApellido": usuario.PrimerApellido,
        #"SegundoApellido": usuario.SegundoApellido,
        #"CURP": usuario.CURP,
        #"Sexo": sexo.Nombre,
        #"FechaNacimiento": usuario.FechaNacimiento,
        "FechaSolicitud": SolicitudUsuario.FechaSolicitud,
        "EstatusSolicitud": estatus.Nombre,
        "TipoSolicitud": tipoSolicitud.NombreAfiliacion
    }