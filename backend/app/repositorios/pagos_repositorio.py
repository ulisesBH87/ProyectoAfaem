from app.modelos.catalogo_tipo_afiliacion import CatalogoTiposAfiliacion
from app.modelos.catalogo_seguros import Seguro
from app.modelos.ordenes_pago_modelo import OrdenPago
from app.modelos.orden_pago_detalle_modelo import OrdenPagoDetalle


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