import asyncio
import json
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from app.db.sesion import SessionLocal
from app.modelos.consumo_modelos import ConsumoOutbox
from app.servicios.consumo_servicio import ConsumptionService

logger = logging.getLogger("consumo_worker")
logging.basicConfig(level=logging.INFO)

async def procesar_consumos_outbox_loop():
    logger.info("[WORKER] Iniciando loop de ConsumoOutbox...")
    while True:
        try:
            await procesar_outbox_pending()
        except Exception as e:
            logger.error(f"[WORKER ERROR] Error en ciclo de outbox: {e}")
        await asyncio.sleep(5) # Procesar cada 5 segundos

async def procesar_outbox_pending():
    db: Session = SessionLocal()
    try:
        # Consultar eventos pendientes (Estado = 'PENDIENTE')
        eventos = db.query(ConsumoOutbox).filter(
            ConsumoOutbox.Estado == "PENDIENTE"
        ).order_by(ConsumoOutbox.Id.asc()).limit(50).all()
        
        if not eventos:
            return

        logger.info(f"[WORKER] Procesando {len(eventos)} eventos de consumo...")
        
        for evento in eventos:
            try:
                payload = json.loads(evento.Payload)
                
                # Sub-transacción para registrar en el ledger
                try:
                    with db.begin_nested():
                        ConsumptionService.registrar_consumo_ledger(db, payload)
                except Exception as ledger_exc:
                    # En SQL Server/SQLAlchemy, si hay violación de índice único (idempotencia)
                    # lo marcamos como procesado (ya que ya existe el cobro)
                    ledger_exc_str = str(ledger_exc).lower()
                    if "unique" in ledger_exc_str or "duplicate" in ledger_exc_str or "conflicto" in ledger_exc_str or "violación" in ledger_exc_str:
                        logger.warning(f"[WORKER] Idempotencia detectada. Evento {evento.EventId} ya registrado en Ledger.")
                    else:
                        raise ledger_exc
                
                evento.Estado = "PROCESADO"
                evento.ProcesadoEn = datetime.now()
            except Exception as item_exc:
                logger.error(f"[WORKER] Error procesando evento {evento.Id}: {item_exc}")
                evento.Intentos += 1
                if evento.Intentos >= 5:
                    evento.Estado = "FALLIDO"
            
            # Commit por cada evento procesado para liberar la fila
            db.commit()
            
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
