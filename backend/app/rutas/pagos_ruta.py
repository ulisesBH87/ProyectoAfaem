from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from app.db.sesion import get_db

from app.esquemas.pago_esquema import CrearOrdenPago, SeguroBase, AfiliacionesBase, ListaPagos, OrdenPagoIndividual
from app.servicios.pagos_servicio import crear_orden_pago_servicio
from app.core.seguridad import obtener_usuario_actual
from app.servicios import pagos_servicio

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
    resultado = await pagos_servicio.subir_comprobante_servicio(db=db, orden_id=orden_id, archivo=archivo)

    return resultado

@router.get("/seguros", response_model=list[SeguroBase])
def obtener_seguros(db:Session=Depends(get_db)):
    seguros = pagos_servicio.obtener_seguros_servicio(db)

    return seguros

@router.get("/afiliaciones", response_model=list[AfiliacionesBase])
def obtener_afiliaciones(db:Session=Depends(get_db)):
    afiliaciones = pagos_servicio.obtener_afiliaciones_servicio

    return afiliaciones


@router.get("/generales", response_model=list[ListaPagos])
def obtener_pagos(db:Session=Depends(get_db)):
    pagos = pagos_servicio.obtener_pagos_servicio(db)

    return pagos

#Cambiar el estatus de pago
@router.post("/estatus-pago")
def estatus_pago(orden_pago_id: int, estatus: int, db:Session=Depends(get_db)):
    response = pagos_servicio.estatus_pago_servicio(db, orden_pago_id, estatus)

    return response

@router.get("/mi-estado")
def mi_estado_pago(db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    """Devuelve el estatus de pago más reciente del usuario autenticado."""
    from app.modelos.ordenes_pago_modelo import OrdenPago
    orden = db.query(OrdenPago).filter(
        OrdenPago.UsuarioId == usuario.UsuarioId
    ).order_by(OrdenPago.OrdenPagoId.desc()).first()
    if not orden:
        return {"tiene_orden": False, "estatus": None}
    # 1=EN ESPERA, 2=RECHAZADO, 3=APROBADO
    return {
        "tiene_orden": True,
        "orden_pago_id": orden.OrdenPagoId,
        "estatus": orden.EstatusPagoId,
        "total": float(orden.TotalPagar) if orden.TotalPagar else 0
    }

@router.get("/{orden_pago_id}", response_model=OrdenPagoIndividual)
def orden_pago_individual(orden_pago_id: int, db:Session=Depends(get_db)):

    return pagos_servicio.orden_pago_individual_servicio(db, orden_pago_id)
