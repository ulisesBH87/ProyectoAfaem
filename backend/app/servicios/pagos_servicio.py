from sqlalchemy.orm import Session
from fastapi import HTTPException
import os
from datetime import date

from app.repositorios.pagos_repositorio import (obtener_tipo_afiliacion_repo, obtener_seguro_repo, crear_orden_pago_repo, crear_detalle_pago_repo, obtener_orden_repo, actualizar_comprobante_repo)


TIPO_AFILIACION_PRESIDENTE = 2
TIPO_AFILIACION_JUGADOR = 4
UPLOAD_DIR = "uploads/vouchers"

def crear_orden_pago_servicio(db, usuario_id, orden):
    if orden.CantidadJugadores < 1:
        raise HTTPException(status_code=400, detail="Debe haber al menos un jugador")
    
    total_personas = orden.CantidadJugadores + 1
    
    total_seguros = sum(s.Cantidad for s in orden.Seguros)
    
    if total_seguros != total_personas:
        raise HTTPException(status_code=400, detail="La cantidad de seguros debe coincidir con jugadores + presidente")
    detalles = []
    total = 0
    
    #PRESIDENTE
    
    afiliacion_presidente = obtener_tipo_afiliacion_repo(db, TIPO_AFILIACION_PRESIDENTE)
    
    subtotal = afiliacion_presidente.CostoActual * 1
    
    detalles.append({
        "tipo_concepto": 1,
        "tipo_afiliacion_id": TIPO_AFILIACION_PRESIDENTE,
        "seguro_id": None,
        "cantidad": 1,
        "precio": afiliacion_presidente.CostoActual,
        "subtotal": subtotal
    })
    
    total += subtotal
    
    #JUGADORES
    afiliacion_jugador = obtener_tipo_afiliacion_repo(db, TIPO_AFILIACION_JUGADOR)
    
    subtotal = afiliacion_jugador.CostoActual * orden.cantidad_jugadores
    
    detalles.append({
        "tipo_concepto": 1,
        "tipo_afiliacion_id": TIPO_AFILIACION_JUGADOR,
        "seguro_id": None,
        "cantidad": orden.CantidadJugadores,
        "precio": afiliacion_jugador.CostoActual,
        "subtotal": subtotal
    })

    total += subtotal
    
    #seguros
    
    for s in orden.Seguros:
        seguro = obtener_seguro_repo(db, s.SeguroId)
        
        if not seguro:
            raise HTTPException(status_code=404, detail=f"Seguro {s.SeguroId} no existe")
        
        subtotal = seguro.Precio * s.Cantidad
        
        detalles.append({
            "tipo_concepto": 2,
            "tipo_afiliacion_id": None,
            "seguro_id": seguro.SeguroId,
            "cantidad": s.Cantidad,
            "precio": seguro.Precio,
            "subtotal": subtotal
        })
        
        total += subtotal
        
        orden_pago = crear_orden_pago_repo(db, usuario_id, total)
        
        for d in detalles:
            crear_detalle_pago_repo(db=db, orden_pago_id=orden_pago.OrdenPagoId, detalle=d)
            
        db.commit()
        
        return {
            "orden_pago_id": orden_pago.OrdenPagoId,
            "total": total
        }
        
    
async def subir_comprobante_servicio(db, orden_id, archivo):
    orden = obtener_orden_repo(db, orden_id)
    
    if not orden: 
        raise HTTPException(status_code=404, detail="Orden de pago no encontrada")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    extension = archivo.filename.split(".")[-1]
    
    nombre_archivo = f"orden_{orden_id}.{extension}"
    
    ruta = os.path.join(UPLOAD_DIR, nombre_archivo)
    
    with open(ruta, "wb") as buffer:
        buffer.write(await archivo.read())
        actualizar_comprobante_repo(db, orden_id, ruta)

        db.commit()

        return {
            "mensaje": "Comrpobante subido correctamente",
            "orden_pago_id": orden_id
        }