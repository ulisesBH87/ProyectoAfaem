from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from core.seguridad import get_db

from app.db.sesion import SessionLocal
from app.core.auditoria.auditoria_servicio import obtener_auditorias

router = APIRouter(prefix="/auditoria", tags=["Auditoria"])

@router.get("/")
def listar_auditoria(db: Session = Depends(get_db)):
    return obtener_auditorias(db)