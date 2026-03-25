from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.sesion import get_db
from app.core.seguridad import obtener_usuario_actual

router = APIRouter(prefix="/equipo", tags=["Equipo"])

@router.get("/mi-equipo")
def obtener_mi_equipo(db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    # Por ahora solo un placeholder para que no truene el main.py
    return {"mensaje": "Ruta de equipo activa"}
