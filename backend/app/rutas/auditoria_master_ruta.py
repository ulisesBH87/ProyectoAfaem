from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.seguridad import get_db, requerir_permiso
from app.core.auditoria.auditoria_master_servicio import (
    obtener_auditorias_master,
    obtener_metricas_master,
    obtener_reporte_mensual,
    obtener_actividad_por_usuario,
    obtener_actividad_por_entidad,
    obtener_actividad_diaria
)

router = APIRouter(prefix="/auditoria/master", tags=["Auditoria Master"])

@router.get("/listar", dependencies=[Depends(requerir_permiso("auditorias.ver"))])
def listar_auditorias_master(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    fecha_inicio: str = Query(None),
    fecha_fin: str = Query(None),
    usuario: str = Query(None),
    accion: str = Query(None),
    entidad: str = Query(None),
    ip: str = Query(None),
    db: Session = Depends(get_db)
):
    return obtener_auditorias_master(
        db=db,
        page=page,
        size=size,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        usuario=usuario,
        accion=accion,
        entidad=entidad,
        ip=ip
    )

@router.get("/metricas", dependencies=[Depends(requerir_permiso("auditorias.ver"))])
def metricas_master(
    anio: int = Query(None),
    mes: int = Query(None, ge=1, le=12),
    db: Session = Depends(get_db)
):
    return obtener_metricas_master(db, anio=anio, mes=mes)

@router.get("/reporte-mensual", dependencies=[Depends(requerir_permiso("auditorias.ver"))])
def reporte_mensual_master(db: Session = Depends(get_db)):
    return obtener_reporte_mensual(db)

@router.get("/reporte-usuario", dependencies=[Depends(requerir_permiso("auditorias.ver"))])
def reporte_usuario_master(limite: int = Query(15, ge=1), db: Session = Depends(get_db)):
    return obtener_actividad_por_usuario(db, limite)

@router.get("/reporte-entidad", dependencies=[Depends(requerir_permiso("auditorias.ver"))])
def reporte_entidad_master(db: Session = Depends(get_db)):
    return obtener_actividad_por_entidad(db)

@router.get("/reporte-diario", dependencies=[Depends(requerir_permiso("auditorias.ver"))])
def reporte_diario_master(limite_dias: int = Query(30, ge=1), db: Session = Depends(get_db)):
    return obtener_actividad_diaria(db, limite_dias)
