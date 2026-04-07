from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from app.db.sesion import get_pagos_servicio

from app.esquemas.pago_esquema import CrearOrdenPago, SeguroBase, AfiliacionesBase, ListaPagos, OrdenPagoIndividual
from app.core.seguridad import obtener_usuario_actual
from app.servicios.pagos_servicio import PagosServicio
from app.excepciones import pagos_excepciones

router = APIRouter(
    prefix="/ordenes-pago",
    tags=["Ordenes de pago"]
)

@router.post("/")
def crear_orden_pago(datos: CrearOrdenPago, service: PagosServicio = Depends(get_pagos_servicio), usuario = Depends(obtener_usuario_actual)):

    try:
        usuario_id = usuario.UsuarioId
        resultado = service.crear_orden_pago(usuario_id, datos)
    except pagos_excepciones.OrdenError:
        raise HTTPException(status_code=400, detail="Error al crear la orden de pago")

    return resultado

@router.post("/{orden_id}/comprobante")
async def subir_comprobante(orden_id: int, archivo: UploadFile = File(...), service: PagosServicio = Depends(get_pagos_servicio)):
    try:
        resultado = await service.subir_comprobante(orden_id=orden_id, archivo=archivo)
    except pagos_excepciones.ComprobanteError:
        raise HTTPException(status_code=400, detail="Error al subir el comprobante")

    return resultado

@router.get("/seguros", response_model=list[SeguroBase])
def obtener_seguros(service: PagosServicio = Depends(get_pagos_servicio)):
    seguros = service.obtener_seguros()

    return seguros

@router.get("/afiliaciones", response_model=list[AfiliacionesBase])
def obtener_afiliaciones(service: PagosServicio =Depends(get_pagos_servicio)):
    afiliaciones = service.obtener_afiliaciones()

    return afiliaciones


@router.get("/generales", response_model=list[ListaPagos])
def obtener_pagos(service: PagosServicio = Depends(get_pagos_servicio)):
    pagos = service.obtener_pagos_servicio()

    return pagos

#Cambiar el estatus de pago
@router.post("/estatus-pago")
def estatus_pago(orden_pago_id: int, estatus: int, service: PagosServicio = Depends(get_pagos_servicio)):
    response = service.estatus_pago(orden_pago_id, estatus)

    return response

@router.get("/mi-estado")
def mi_estado_pago(service: PagosServicio = Depends(get_pagos_servicio), usuario = Depends(obtener_usuario_actual)):
    """Devuelve el estatus de pago más reciente del usuario autenticado."""
    orden = service.mi_estado_pago(usuario.UsuarioId)

    return orden

@router.get("/{orden_pago_id}", response_model=OrdenPagoIndividual)
def orden_pago_individual(orden_pago_id: int, service: PagosServicio=Depends(get_pagos_servicio)):

    return service.orden_pago_individual(orden_pago_id)
