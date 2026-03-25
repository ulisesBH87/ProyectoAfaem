import os
from datetime import datetime

from fastapi import HTTPException

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