from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.sesion import get_db

from app.esquemas.pago_esquema import CrearOrdenPago
from app.servicios.pagos_servicio import crear_orden_pago_servicio
from app.core.seguridad import obtener_usuario_actual

router = APIRouter(
    prefix="/ordenes-pago",
    tags=["Ordenes de pago"]
)

@router.post("/")
def crear_orden_pago(datos: CrearOrdenPago, db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):

    usuario_id = usuario.UsuarioId
    resultado = crear_orden_pago_servicio(db, usuario_id = usuario_id, datos=datos)

    return resultado