from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.db.sesion import get_db
from typing import List
from app.core.seguridad import obtener_usuario_actual

from app.esquemas.equipo_esquema import JugadorPersona
from app.servicios.equipo_servicio import registrar_jugador_servicio

router = APIRouter(prefix="/equipo-temporal", tags=["Equipo Temporal"])

@router.post("/registrar-jugador")
async def registrar_jugador(
    equipo_temporal_id: int = Form(...),
    nombre: str = Form(...),
    primer_apellido: str = Form(...),
    segundo_apellido: str = Form(...),
    curp: str = Form(...),
    sexo_id: int = Form(...),
    fecha_nacimiento: str = Form(...),
    documento_afiliacion_ids: List[int] = Form(...),
    archivos: list[UploadFile] = File(...), 
    db: Session = Depends(get_db)
):
    persona = JugadorPersona(
        nombre=nombre,
        primer_apellido=primer_apellido,
        segundo_apellido=segundo_apellido,
        curp=curp,
        sexo_id=sexo_id,
        fecha_nacimiento=fecha_nacimiento
    )
    return await registrar_jugador_servicio(db, equipo_temporal_id, persona, documento_afiliacion_ids, archivos)