import logging
from fastapi import APIRouter, Depends, Query, Response, Request
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.db.sesion import get_db
from app.core.config import obtener_configuracion
from app.modelos.presidente_invitacion_modelo import PresidenteInvitacion

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp Webhook"])

@router.get("/webhook")
def verificar_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
    hub_verify_token: str = Query(None, alias="hub.verify_token")
):
    """
    Endpoint de verificación de Webhook requerido por Meta Developers.
    """
    config = obtener_configuracion()
    logger.info(f"Webhook verificación recibida. Modo: {hub_mode}, Token: {hub_verify_token}")
    
    if hub_mode == "subscribe" and hub_verify_token == config.WHATSAPP_VERIFY_TOKEN:
        logger.info("Verificación exitosa del Webhook.")
        return PlainTextResponse(content=hub_challenge, status_code=200)
    
    logger.warning("Verificación fallida del Webhook: tokens no coinciden o modo incorrecto.")
    return Response(content="Verificación fallida", status_code=403)

@router.post("/webhook")
async def recibir_eventos(request: Request, db: Session = Depends(get_db)):
    """
    Endpoint para recibir notificaciones de eventos desde Meta (estado de entrega de mensajes).
    """
    try:
        body = await request.json()
        logger.info(f"Evento de WhatsApp recibido: {body}")
    except Exception as e:
        logger.error(f"Error parseando JSON del webhook: {str(e)}")
        return Response(content="Invalid JSON", status_code=400)
    
    # Procesar actualizaciones de estados
    try:
        entries = body.get("entry", [])
        for entry in entries:
            changes = entry.get("changes", [])
            for change in changes:
                value = change.get("value", {})
                statuses = value.get("statuses", [])
                for status_info in statuses:
                    wamid = status_info.get("id")
                    status = status_info.get("status") # sent, delivered, read, failed, etc.
                    
                    if wamid and status:
                        # Buscar el registro de la invitación en la base de datos
                        invitacion = db.query(PresidenteInvitacion).filter(
                            PresidenteInvitacion.WhatsAppMessageId == wamid
                        ).first()
                        
                        if invitacion:
                            invitacion.WhatsAppStatus = status
                            db.commit()
                            logger.info(f"Estado de invitación de WhatsApp {wamid} actualizado a '{status}'")
    except Exception as e:
        logger.exception(f"Error procesando evento del webhook de WhatsApp: {str(e)}")
        # Siempre retornamos 200 a Meta para indicar recepción del evento, incluso si hay un error en base de datos.
        return Response(content="Error interno pero recibido", status_code=200)

    return Response(content="EVENT_RECEIVED", status_code=200)
