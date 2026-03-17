from app.modelos.catalogo_tipo_afiliacion import CatalogoTiposAfiliacion
from app.modelos.catalogo_seguros import Seguro
from app.modelos.ordenes_pago_modelo import OrdenPago
from app.modelos.orden_pago_detalle_modelo import OrdenPagoDetalle
from app.esquemas.pago_esquema import VerComprobantes
from datetime import datetime
from app.esquemas.pago_esquema import SeguroBase
from sqlalchemy.orm import selectinload

def obtener_tipo_afiliacion_repo(db, tipo_afiliacion_id):

    return (
        db.query(CatalogoTiposAfiliacion)
        .filter(CatalogoTiposAfiliacion.TipoAfiliacionId == tipo_afiliacion_id)
        .first()
    )
    
def obtener_seguro_repo(db, seguro_id):

    return (
        db.query(Seguro)
        .filter(Seguro.SeguroId == seguro_id)
        .filter(Seguro.Activo == True)
        .first()
    )
    
def crear_orden_pago_repo(db, usuario_id, total):

    orden = OrdenPago(
        UsuarioId=usuario_id,
        TotalPagar=total,
        EstatusPagoId=1  # PENDIENTE
    )

    db.add(orden)
    db.flush()  # obtiene OrdenPagoId sin commit

    return orden

def crear_detalle_pago_repo(db, orden_pago_id, detalle):

    registro = OrdenPagoDetalle(
        OrdenPagoId=orden_pago_id,
        TipoConceptoId=detalle["tipo_concepto"],
        TipoAfiliacionId=detalle["tipo_afiliacion_id"],
        SeguroId=detalle["seguro_id"],
        Cantidad=detalle["cantidad"],
        PrecioUnitarioCobrado=detalle["precio"],
        Subtotal=detalle["subtotal"]
    )

    db.add(registro)

    return registro


def obtener_orden_repo(db, orden_id):
    return (db.query(OrdenPago).filter(OrdenPago.OrdenPagoId == orden_id).first())

def actualizar_comprobante_repo(db, orden_id, ruta):
    
    orden = (db.query(OrdenPago).filter(OrdenPago.OrdenPagoId == orden_id).first())
    
    orden.RutaVoucher = ruta
    orden.FechaEnvio = datetime.now()
    orden.EstatusPagoId = 1 #comprobante subido

    return orden

def obtener_seguros_repo(db):
    return db.query(Seguro).all()

def obtener_afiliaciones_repo(db):
    return db.query(CatalogoTiposAfiliacion).all()

def obtener_pagos_repo(db):
    return db.query(OrdenPago).all()

def estatus_pago_repo(db, orden_pago_id, estatus):

    orden = (db.query(OrdenPago).filter(OrdenPago.OrdenPagoId == orden_pago_id).first())

    orden.EstatusPagoId = estatus

    db.commit()

    return orden

def orden_pago_individual_repo(db, orden_pago_id):
    orden = (db.query(OrdenPago).options(selectinload(OrdenPago.OrdenPagoDetalleRelacion)).filter(OrdenPago.OrdenPagoId == orden_pago_id).first())

    return orden