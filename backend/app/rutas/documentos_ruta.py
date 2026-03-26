from fastapi import APIRouter, UploadFile, File, Form, Depends
from sqlalchemy.orm import Session
from typing import Optional, List
from app.db.sesion import get_db
from app.servicios.documentos_servicio import subir_documento_servicio, subir_documento_servicio2, proceso_presidente, presidente_solicitud

router = APIRouter(prefix="/documentos", tags=["Documentos"])

@router.post("/")
async def subir_documento(persona_id: Optional[int] = Form(...), documento_afiliacion_ids: List[int]=Form(...), archivo: List[UploadFile] = File(...), solicitud_id: int = Form(...), db: Session = Depends(get_db)):

    if not persona_id:
        persona_id = proceso_presidente(db)
    
    if not solicitud_id:
        solicitud_id = presidente_solicitud(db)
    

    return await subir_documento_servicio2(db, persona_id, documento_afiliacion_ids, archivo, solicitud_id)
