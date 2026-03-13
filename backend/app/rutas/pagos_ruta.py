from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from app.db.sesion import get_db

from app.esquemas.pago_esquema import CrearOrdenPago, SeguroBase, AfiliacionesBase
from app.servicios.pagos_servicio import crear_orden_pago_servicio, subir_comprobante_servicio, obtener_seguros_servicio, obtener_afiliaciones_servicio
from app.core.seguridad import obtener_usuario_actual

router = APIRouter(
    prefix="/ordenes-pago",
    tags=["Ordenes de pago"]
)

@router.post("/")
def crear_orden_pago(datos: CrearOrdenPago, db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):

    usuario_id = usuario.UsuarioId
    resultado = crear_orden_pago_servicio(db, usuario_id, datos)

    return resultado

@router.post("/ordenes-pago/{orden_id}/comprobante")
async def subir_comprobante(orden_id: int, archivo: UploadFile = File(...), db: Session = Depends(get_db)):
    resultado = await subir_comprobante_servicio(db=db, orden_id=orden_id, archivo=archivo)

    return resultado

@router.get("/seguros", response_model=list[SeguroBase])
def obtener_seguros(db:Session=Depends(get_db)):
    seguros = obtener_seguros_servicio(db)

    return seguros

@router.get("/afiliaciones", response_model=list[AfiliacionesBase])
def obtener_afiliaciones(db:Session=Depends(get_db)):
    afiliaciones = obtener_afiliaciones_servicio(db)

    return afiliaciones