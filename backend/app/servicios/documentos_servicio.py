import os
from datetime import datetime

from app.modelos.persona_modelo import Personas
from app.repositorios import documentos_repositorio, personas_repositorio
from app.core.seguridad import obtener_usuario_actual
from app.repositorios.documentos_repositorio import obtener_solicitud_borrador

from app.excepciones import documentos_excepciones
from app.modelos.documento_afiliacion_modelo import DocumentoAfiliacion

UPLOAD_DIR = "uploads/documentos"

async def subir_documento_servicio(db, persona_id, documento_afiliacion_id, archivo):
    
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    extension = archivo.filename.split(".")[-1]
    nombre = f"{persona_id}_{documento_afiliacion_id}.{extension}"

    ruta = os.path.join(UPLOAD_DIR, nombre)

    with open(ruta, "wb") as buffer:
        buffer.write(await archivo.read())

    documentos_repositorio.subir_documento_repo(db, persona_id, documento_afiliacion_id, ruta)

    db.commit()
    return {"mensaje": "Documento subido"}

async def subir_documento_servicio2(db, persona_id, documento_afiliacion_ids, archivos, solicitud_id):

    if len(documento_afiliacion_ids) != len(archivos):
        raise ValueError("Cantidad de archivos y tipos no coincide")

    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # Obtener persona
    persona = db.query(Personas).filter(Personas.PersonaId == persona_id).first()
    if not persona:
        raise documentos_excepciones.PersonaNoEncontradaError()
    
    #Obtener CURP y año para nombrar archivos
    curp = persona.CURP
    año = datetime.now().year

    #Obtener los documentos
    doc_afiliaciones = db.query(DocumentoAfiliacion).filter(
        DocumentoAfiliacion.DocumentoAfiliacionId.in_(documento_afiliacion_ids)
    ).all()

    doc_map = {d.DocumentoAfiliacionId: d for d in doc_afiliaciones}

    documentos_creados = []

    for archivo, doc_id in zip(archivos, documento_afiliacion_ids):

        d = doc_map.get(doc_id)

        if not d:
            raise Exception(f"No se encontró DocumentoAfiliacionId {doc_id}")
    
        nombre_doc = d.Documento.NombreDocumento.upper()
        
        extension = archivo.filename.split(".")[-1]
        nombre = f"{nombre_doc}_{curp}_{año}.{extension}"
        ruta = os.path.join(UPLOAD_DIR, nombre)

        with open(ruta, "wb") as buffer:
            buffer.write(await archivo.read())

        doc = documentos_repositorio.subir_documento_repo2(
            db,
            persona_id,
            doc_id,
            ruta,
            solicitud_id
        )

        documentos_creados.append(doc)
    
    db.commit()

    # Actualizar Estatus Presidente a DOCUMENTOS_EN_REVISION
    try:
        from app.modelos.presidente_equipo_modelo import PresidenteEquipo
        from app.enums.estatus_presidente_enum import PresidenteEquipoEstatus
        
        presidente = db.query(PresidenteEquipo).filter(PresidenteEquipo.PersonaId == persona_id).first()
        if presidente:
            presidente.EstatusId = PresidenteEquipoEstatus.PRE_APROBADO
    except Exception as e:
        pass # Si falla actualización del estatus, que no rompa la subida.

    db.commit()

    return {
        "mensaje": "Documentos subidos",
        "total": len(documentos_creados)
    }

def proceso_presidente(db, usuario):
    usuario_id = usuario.UsuarioId
    persona_id = personas_repositorio.obtener_persona(db, usuario_id)
    
    return persona_id

def presidente_solicitud(db, usuario):
    usuario_id = usuario.UsuarioId
    solicitud_id = obtener_solicitud_borrador(db, usuario_id)
    return solicitud_id