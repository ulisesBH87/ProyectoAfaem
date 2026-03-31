from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.db.sesion import get_db
from typing import List
from app.core.seguridad import obtener_usuario_actual

from app.esquemas.equipo_esquema import JugadorPersona
from app.servicios.equipo_servicio import registrar_jugador_servicio, obtener_equipo_temporal_servicio, obtener_equipos_temporales_por_usuario_servicio

router = APIRouter(prefix="/equipo-temporal", tags=["Equipo Temporal"])

@router.get("/equipos-temporales")
def obtener_equipos_temporales_por_usuario(db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    usuario_id = usuario.UsuarioId
    equipos = obtener_equipos_temporales_por_usuario_servicio(db, usuario_id)
    return equipos

@router.get("/slots")
async def obtener_slots(equipo_temporal_id: int,db: Session = Depends(get_db)):
    slots = obtener_equipo_temporal_servicio(db, equipo_temporal_id)
    return slots

@router.post("/registrar-jugador")
async def registrar_jugador(
    equipo_temporal_id: int = Form(...),
    nombre: str = Form(...),
    primer_apellido: str = Form(...),
    segundo_apellido: str = Form(...),
    CURP: str = Form(...),
    sexo_id: int = Form(...),
    fecha_nacimiento: str = Form(...),
    documento_afiliacion_ids: List[int] = Form(...),
    archivos: list[UploadFile] = File(...),
    seguro_id: int = Form(...),
    db: Session = Depends(get_db)
):
    persona = JugadorPersona(
        nombre=nombre,
        primer_apellido=primer_apellido,
        segundo_apellido=segundo_apellido,
        curp=CURP,
        sexo_id=sexo_id,
        fecha_nacimiento=fecha_nacimiento
    )
    return await registrar_jugador_servicio(db, equipo_temporal_id, persona, documento_afiliacion_ids, archivos, seguro_id)


