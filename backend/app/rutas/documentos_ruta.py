from fastapi import APIRouter, UploadFile, File, Form, Depends
from sqlalchemy.orm import Session
from typing import Optional, List
from app.db.sesion import get_db
from app.servicios.documentos_servicio import subir_documento_servicio2, proceso_presidente, presidente_solicitud
from app.core.seguridad import obtener_usuario_actual

router = APIRouter(prefix="/documentos", tags=["Documentos"])

@router.post("/")
async def subir_documento(persona_id: Optional[int] = Form(None), documento_afiliacion_ids: List[int]=Form(...), archivo: List[UploadFile] = File(...), solicitud_id: Optional[int] = Form(None), db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):

    if not persona_id:
        persona_id = proceso_presidente(db, usuario)
    
    if not solicitud_id:
        solicitud_id = presidente_solicitud(db, usuario)
    

    return await subir_documento_servicio2(db, persona_id, documento_afiliacion_ids, archivo, solicitud_id)
