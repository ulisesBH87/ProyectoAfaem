from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.seguridad import crear_token, verificar_token, obtener_usuario_actual
from app.db.sesion import get_db
from app.esquemas.solicitud_esquema import SolicitudesTodas, SolicitudCrear
from app.servicios.solicitud_servicio import crear_solicitud, obtener_solicitudes_servicio
from app.modelos.usuario_modelo import Usuario
from app.modelos.solicitud_modelo import Solicitud
from typing import List


router = APIRouter(prefix="/solicitud",tags=["Solicitud"])

@router.post("/enviar-solicitud")
def solicitud(data: SolicitudCrear, db:Session = Depends(get_db),usuario: Usuario = Depends(obtener_usuario_actual)):

    crear_solicitud(db, data, usuario)
    
    if not data:
        raise HTTPException(status_code=400, detail="Datos de solicitud inválidos")

    return {"message": "Solicitud enviada correctamente"}


@router.get("/solicitudes-usuarios", response_model=List[SolicitudesTodas])
def obtener_solicitudes(db:Session = Depends(get_db)):
    return obtener_solicitudes_servicio(db)

