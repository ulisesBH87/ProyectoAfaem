from sqlalchemy.orm import Session
from app.modelos import (
    Solicitud, Usuario, CatalogoTiposAfiliacion, CatalogoEstadosValidacion, 
    Personas, DocumentoAfiliacion, CatalogoDocumentos, CatalogoRolesPersonas,
    CatalogoDocumentosPersonas, DocumentosEntregados, EquipoTemporal, 
    OrdenPago, Equipos, PresidenteEquipo
)


#REQUISITOS
def crear_requisito_repo(db: Session, tipo_afiliacion_id: int, documento_persona_id: int):
    nuevo = DocumentoAfiliacion(TipoAfiliacionId=tipo_afiliacion_id, DocumentoPersonaId=documento_persona_id)

    db.add(nuevo)
    return nuevo

def obtener_por_tipo_afiliacion(db: Session, tipo_afiliacion_id: int):
    return db.query(DocumentoAfiliacion).filter(DocumentoAfiliacion.TipoAfiliacionId == tipo_afiliacion_id).all()

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

#SOLICITUDES
#CREAR SOLICITUD (NO ENVIAR)
def crear_solicitud_repo(db, usuario_id, estatus_validacion_id, tipo_afiliacion_id):

    nueva = Solicitud(
        UsuarioId = usuario_id,
        EstatusValidacion = estatus_validacion_id,
        TipoAfiliacionId = tipo_afiliacion_id
    )
    
    db.add(nueva)
    db.flush()

    return nueva

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


#DOCUMENTOS
def crear_documento_solicitud_repo(db, solicitud_id, persona_id, documento_afiliacion_id, ruta_archivo):
    
    documento = DocumentosEntregados(
        SolicitudId = solicitud_id,
        PersonaId = persona_id,
        DocumentoAfiliacionId = documento_afiliacion_id,
        RutaArchivo = ruta_archivo
    )
    
    db.add(documento)
    
    return documento


#OBTENER SOLICITUDES

def obtener_solicitudes_usuarios_repo(db: Session):
    return (
        db.query(
            Solicitud.SolicitudId,
            Solicitud.FechaSolicitud,
            Solicitud.EstatusValidacion,
            Personas.Nombre,
            Personas.PrimerApellido,
            Usuario.Correo,
            Equipos.NombreEquipo.label("Equipo"),
            OrdenPago.TotalPagar.label("Monto")
        )
        .join(Usuario, Solicitud.UsuarioId == Usuario.UsuarioId)
        .join(Personas, Usuario.PersonaId == Personas.PersonaId)
        .outerjoin(EquipoTemporal, Solicitud.SolicitudId == EquipoTemporal.SolicitudId)
        .outerjoin(OrdenPago, EquipoTemporal.OrdenPagoId == OrdenPago.OrdenPagoId)
        .outerjoin(PresidenteEquipo, Personas.PersonaId == PresidenteEquipo.PersonaId)
        .outerjoin(Equipos, PresidenteEquipo.PresidenteEquipoId == Equipos.PresidenteEquipoId)
        .all()
    )

def obtener_solicitudes_repo(db: Session):
    return db.query(Solicitud).all()

def obtener_solicitud_individual_repo(db: Session, solicitud_id: int):
    SolicitudUsuario = db.query(Solicitud).filter(Solicitud.SolicitudId == solicitud_id).first()
    if not SolicitudUsuario:
        return None
    
    usuario = SolicitudUsuario.UsuarioRelacion
    persona = usuario.PersonaRelacion
    sexo = persona.SexoRelacion  # Sexo está en Personas, no en Usuario
    tipoSolicitud = SolicitudUsuario.CatalogoTiposAfiliacionRelacion
    estatus = SolicitudUsuario.CatalogoEstadosValidacion
    
    return {
        "Nombre": persona.Nombre if persona else "",
        "PrimerApellido": persona.PrimerApellido if persona else "",
        "SegundoApellido": persona.SegundoApellido if persona else "",
        "CURP": persona.CURP if persona else "",
        "RFC": persona.RFC if persona else "",
        "Sexo": sexo.Nombre if sexo else "",
        "FechaNacimiento": persona.FechaNacimiento if persona else None,
        "Email": usuario.Correo,
        "FechaSolicitud": SolicitudUsuario.FechaSolicitud,
        "EstatusSolicitud": estatus.Nombre if estatus else "",
        "TipoSolicitud": tipoSolicitud.NombreAfiliacion if tipoSolicitud else "",
        "SolicitudId": SolicitudUsuario.SolicitudId
    }