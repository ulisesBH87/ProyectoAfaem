from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.seguridad import get_db, requerir_permiso

from app.db.sesion import SessionLocal
from app.core.auditoria.auditoria_servicio import obtener_auditorias

router = APIRouter(prefix="/auditoria", tags=["Auditoria"])

@router.get("/", dependencies=[Depends(requerir_permiso("auditorias.ver"))])
def listar_auditoria(page: int = Query(1, ge=1), size: int = Query(10, ge=1, le=100), db: Session = Depends(get_db)):
    return obtener_auditorias(db, page, size)