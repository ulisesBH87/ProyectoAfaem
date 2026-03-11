from sqlalchemy.orm import Session
from app.modelos import Solicitud, Usuario, CatalogoTiposAfiliacion, CatalogoEstadosValidacion, Personas, DocumentoAfiliacion, CatalogoDocumentos, CatalogoRolesPersonas
from app.modelos import CatalogoDocumentosPersonas, DocumentosEntregados

def crear_solicitud_repos(db: Session, solicitud: Solicitud, usuario: Usuario, persona: Personas):
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

def obtener_por_tipo_afiliacion(db: Session, tipo_afiliacion_id: int):
    return db.query(DocumentoAfiliacion).filter(DocumentoAfiliacion.TipoAfiliacionId == tipo_afiliacion_id).all()

def crear_requisito_repo(db: Session, tipo_afiliacion_id: int, documento_persona_id: int):
    nuevo = DocumentoAfiliacion(TipoAfiliacionId=tipo_afiliacion_id, DocumentoPersonaId=documento_persona_id)

    db.add(nuevo)
    return nuevo


def ver_requisitos_afiliacion_repo(db: Session, tipo_afiliacion_id: int):

    requisitos = (
        db.query(
            DocumentoAfiliacion.DocumentoAfiliacionId,
            CatalogoDocumentos.NombreDocumento,
            CatalogoRolesPersonas.Nombre
        )
        .join(
            CatalogoDocumentosPersonas,
            CatalogoDocumentosPersonas.DocumentosPersonasId
            == DocumentoAfiliacion.DocumentoPersonaId
        )
        .join(
            CatalogoDocumentos,
            CatalogoDocumentos.DocumentoId
            == CatalogoDocumentosPersonas.DocumentoId
        )
        .join(
            CatalogoRolesPersonas,
            CatalogoRolesPersonas.RolPersonaId
            == CatalogoDocumentosPersonas.RolPersonaId
        )
        .filter(DocumentoAfiliacion.TipoAfiliacionId == tipo_afiliacion_id)
        .all()
    )

    resultado = []

    for r in requisitos:
        resultado.append({
            "documento_afiliacion_id": r.DocumentoAfiliacionId,
            "documento": r.NombreDocumento,
            "rol": r.Nombre
        })

    return resultado

def crear_solicitud_repo(db, tipo_afiliacion_id):

    nueva = Solicitud(TipoAfiliacionId = tipo_afiliacion_id)
    
    db.add(nueva)
    db.flush()

    return nueva

def crear_documento_solicitud_repo(db, solicitud_id, persona_id, documento_afiliacion_id, ruta_archivo):
    
    documento = DocumentosEntregados(
        SolicitudId = solicitud_id,
        PersonaId = persona_id,
        DocumentoAfiliacionId = documento_afiliacion_id,
        RutaArchivo = ruta_archivo
    )
    
    db.add(documento)
    
    return documento