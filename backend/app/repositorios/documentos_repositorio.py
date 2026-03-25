from datetime import datetime
from app.modelos.documentos_entregados_modelo import DocumentosEntregados
from app.enums.documentos_estatus_enum import DocumentoEstatus

def subir_documento_repo(db, persona_id, documento_afiliacion_id, ruta):
    
    doc = DocumentosEntregados(
        PersonaId=persona_id,
        DocumentoAfiliacionId=documento_afiliacion_id,
        RutaArchivo=ruta,
        FechaEntrega=datetime.now(),
        EstadoValidacionId=DocumentoEstatus.PENDIENTE   
    )

    db.add(doc)

    return doc

