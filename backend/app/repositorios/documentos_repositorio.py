from datetime import datetime
from app.modelos.documentos_entregados_modelo import DocumentosEntregados
from app.enums.documentos_estatus_enum import DocumentoEstatus
from app.modelos.solicitud_modelo import Solicitud
from app.enums.estados_validacion_enum import EstatusValidacionSolicitud

def subir_documento_repo(db, persona_id, documento_afiliacion_id, ruta):
    
    if not solicitud:
        solicitud = db.query(Solicitud).filter(Solicitud.EstatusValidacion == EstatusValidacionSolicitud.BORRADOR).first()

    doc = DocumentosEntregados(
        PersonaId=persona_id,
        SolicitudId=solicitud.SolicitudId,
        DocumentoAfiliacionId=documento_afiliacion_id,
        RutaArchivo=ruta,
        FechaEntrega=datetime.now(),
        EstadoValidacionId=DocumentoEstatus.ESPERA   
    )
    #print("PERSONA USADA PARA DOCS REPO 1:", persona_id)
    db.add(doc)
    
    return doc

def subir_documento_repo2(db, persona_id, documento_afiliacion_id, ruta, solicitud_id):

    if not solicitud_id:
        raise ValueError("solicitud_id es obligatorio para registrar el documento")

    doc = DocumentosEntregados(
        PersonaId=persona_id,
        SolicitudId=solicitud_id,
        DocumentoAfiliacionId=documento_afiliacion_id,
        RutaArchivo=ruta,
        FechaEntrega=datetime.now(),
        EstadoValidacionId=DocumentoEstatus.ESPERA
    )
    #print("🚀🚀🚀🚀VPERSONA USADA PARA DOCS🚀🚀🚀🚀:", persona_id)
    db.add(doc)
    return doc

def obtener_solicitud_borrador(db, usuario_id):
    solicitud = db.query(Solicitud).filter(
        Solicitud.UsuarioId == usuario_id,
        Solicitud.EstatusValidacion == EstatusValidacionSolicitud.BORRADOR
    ).first()
    
    solicitud_id = solicitud.SolicitudId
    return solicitud_id