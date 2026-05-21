from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List, Union
from app.db.sesion import get_db
from app.servicios.documentos_servicio import subir_documento_servicio2, proceso_presidente, presidente_solicitud
from app.core.seguridad import obtener_usuario_actual

router = APIRouter(prefix="/documentos", tags=["Documentos"])


def _parse_solicitud_id_form(valor: Optional[Union[int, str]]) -> Optional[int]:
    if valor is None:
        return None
    texto = str(valor).strip()
    if texto in ("", "null", "undefined"):
        return None
    try:
        return int(texto)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="solicitud_id inválido")


@router.post("/")
async def subir_documento(
    persona_id: Optional[int] = Form(None),
    documento_afiliacion_ids: List[int] = Form(...),
    archivo: List[UploadFile] = File(...),
    solicitud_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    usuario=Depends(obtener_usuario_actual),
):
    if not persona_id:
        persona_id = proceso_presidente(db, usuario)

    sid = _parse_solicitud_id_form(solicitud_id)

    if not sid:
        if persona_id:
            from app.repositorios.equipo_repositorio import obtener_solicitud_id_para_persona
            sid = obtener_solicitud_id_para_persona(db, persona_id, usuario.UsuarioId)
        else:
            sid = presidente_solicitud(db, usuario)

    return await subir_documento_servicio2(db, persona_id, documento_afiliacion_ids, archivo, sid)
