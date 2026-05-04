from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from app.db.sesion import get_db
from app.db.sesion import get_pagos_servicio

from app.esquemas.pago_esquema import CrearOrdenPago, SeguroBase, AfiliacionesBase, ListaPagos, OrdenPagoIndividual
from app.esquemas.solicitud_esquema import SolicitudEquipo
from app.core.seguridad import obtener_usuario_actual
from app.servicios.pagos_servicio import PagosServicio
from app.servicios import solicitud_servicio
from app.excepciones import pagos_excepciones

router = APIRouter(
    prefix="/ordenes-pago",
    tags=["Ordenes de pago"]
)


# == CREACIÓN DE ORDEN DE PAGO ==
# NUEVO. Requiere el tipo de Solicitud (presidente/equipo/jugador)
@router.post("/")
def crear_orden_pago(datos: CrearOrdenPago, service: PagosServicio = Depends(get_pagos_servicio), db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):

    #Se crea primero la solicitud
    tipo_solicitud = datos.TipoSolicitud #La que viene del frontend. Se relaciona con tabla solicitudes

    tipo_afiliacion = SolicitudEquipo.TipoAfiliacionId = 2
    solicitud_nueva = solicitud_servicio.crear_solicitud_servicio(db, tipo_afiliacion, tipo_solicitud, usuario)

    solicitud_id = solicitud_nueva.SolicitudId

    #Se crea la orden de pago y se relaciona con el id de la solicitud (en proceso )
    usuario_id = usuario.UsuarioId
    resultado = service.crear_orden_pago(usuario_id, datos, solicitud_id)
    
    return resultado

@router.post("/{orden_id}/comprobante")
async def subir_comprobante(orden_id: int, archivo: UploadFile = File(...), service: PagosServicio = Depends(get_pagos_servicio)):
    resultado = await service.subir_comprobante(orden_id=orden_id, archivo=archivo)

    return resultado


# == CONSULTAS DE SEGUROS Y AFILIACIONES ==
@router.get("/seguros", response_model=list[SeguroBase])
def obtener_seguros(service: PagosServicio = Depends(get_pagos_servicio)):
    seguros = service.obtener_seguros()

    return seguros

@router.get("/afiliaciones", response_model=list[AfiliacionesBase])
def obtener_afiliaciones(service: PagosServicio =Depends(get_pagos_servicio)):
    afiliaciones = service.obtener_afiliaciones()

    return afiliaciones

# == OBTENER LAS ORDENES DE PAGO. TODAS E INDIVIDUALES ==
@router.get("/generales", response_model=list[ListaPagos])
def obtener_pagos(service: PagosServicio = Depends(get_pagos_servicio)):
    pagos = service.obtener_pagos_servicio()

    return pagos

#BORRAR ESTE
@router.get("/mi-estado")
def mi_estado_pago(service: PagosServicio = Depends(get_pagos_servicio), usuario = Depends(obtener_usuario_actual)):
    """Devuelve el estatus de pago más reciente del usuario autenticado."""
    orden = service.mi_estado_pago(usuario.UsuarioId)

    return orden

@router.get("/mi-estado-equipo")
def mi_estado_pago_equipo(service: PagosServicio = Depends(get_pagos_servicio), usuario = Depends(obtener_usuario_actual)):
    orden = service.mi_estado_pago_equipo(usuario.UsuarioId)

    return orden

#Cambiar el estatus de pago
#Se usa para que el administrador apruebe o rechace un pago
@router.post("/estatus-pago")
def estatus_pago(orden_pago_id: int, estatus: int, service: PagosServicio = Depends(get_pagos_servicio)):
    orden = service.estatus_pago(orden_pago_id, estatus)

    return orden

@router.get("/{orden_pago_id}", response_model=OrdenPagoIndividual)
def orden_pago_individual(orden_pago_id: int, service: PagosServicio=Depends(get_pagos_servicio)):

    return service.orden_pago_individual(orden_pago_id)
