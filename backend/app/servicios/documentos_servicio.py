import os
from datetime import datetime

from fastapi import HTTPException
from app.modelos.persona_modelo import Personas
from app.repositorios import documentos_repositorio

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

    # Obtener CURP de la persona
    persona = db.query(Personas).filter(Personas.PersonaId == persona_id).first()
    if not persona:
        raise HTTPException(404, "Persona no encontrada")
    
    curp = persona.CURP
    año = datetime.now().year

    documentos_creados = []

    for archivo, doc_id in zip(archivos, documento_afiliacion_ids):

        extension = archivo.filename.split(".")[-1]
        nombre = f"{curp}_{doc_id}_{año}.{extension}"
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


    return {
        "mensaje": "Documentos subidos",
        "total": len(documentos_creados)
    }