from fastapi import APIRouter, UploadFile, File, Form, Depends
from sqlalchemy.orm import Session

from app.db.sesion import get_db
from app.servicios.documentos_servicio import subir_documento_servicio

router = APIRouter(prefix="/documentos", tags=["Documentos"])

@router.post("/")
async def subir_documento(persona_id: int=Form(...), documento_afiliacion_id: int=Form(...), archivo: UploadFile = File(...), db: Session = Depends(get_db)):

    return await subir_documento_servicio(db, persona_id, documento_afiliacion_id, archivo)
