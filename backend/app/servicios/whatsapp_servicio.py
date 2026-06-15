import json
import logging
from datetime import datetime

import requests
from fastapi import HTTPException

from app.core.config import obtener_configuracion


logger = logging.getLogger(__name__)


class WhatsAppService:
    BASE_URL = "https://graph.facebook.com"

    def __init__(self):
        self.config = obtener_configuracion()

    def _validar_configuracion(self):
        if not self.config.WHATSAPP_ENABLED:
            raise HTTPException(status_code=503, detail="Ocurrió un error al enviar el enlace.") #El envío por WhatsApp está deshabilitado.

        if not self.config.WHATSAPP_PHONE_NUMBER_ID:
            raise HTTPException(status_code=500, detail="Ocurrió un error al enviar el enlace.") #Falta configurar WHATSAPP_PHONE_NUMBER_ID

        if not self.config.WHATSAPP_ACCESS_TOKEN:
            raise HTTPException(status_code=500, detail="Ocurrió un error al enviar el enlace.") #Falta configurar WHATSAPP_ACCESS_TOKEN.

    def _construir_url(self) -> str:
        version = self.config.WHATSAPP_API_VERSION.strip()
        phone_number_id = self.config.WHATSAPP_PHONE_NUMBER_ID.strip()
        return f"{self.BASE_URL}/{version}/{phone_number_id}/messages"

    @staticmethod
    def _construir_mensaje(nombre_presidente: str, link_invitacion: str) -> str:
        nombre = (nombre_presidente or "").strip()
        link = (link_invitacion or "").strip()
        return (
            f"Hola {nombre}\n\n"
            "Somos AFAEM. Ya puedes registrar a los jugadores de tu equipo.\n\n"
            "Accede aqui:\n\n"
            f"{link}\n\n"
            "Este enlace expirara en 1 mes o cuando registres a todos tus jugadores."
        )

    def enviar_link_registro(
        self,
        telefono: str,
        nombre_presidente: str,
        link_invitacion: str,
        usuario_id: int | None = None,
    ):
        self._validar_configuracion()

        if not telefono:
            raise HTTPException(status_code=400, detail="No se encontró un teléfono válido para el presidente.")

        if not link_invitacion:
            raise HTTPException(status_code=400, detail="No se pudo construir el link de invitación.")

        if self.config.WHATSAPP_SEND_AS_TEMPLATE:
            # Construir el payload usando la plantilla configurada en Meta Business
            # con las dos variables nombradas: {{nombre}} y {{url}}
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": telefono,
                "type": "template",
                "template": {
                    "name": self.config.WHATSAPP_TEMPLATE_NAME,
                    "language": {
                        "code": self.config.WHATSAPP_TEMPLATE_LANGUAGE,
                    },
                    "components": [
                        {
                            "type": "body",
                            "parameters": [
                                {
                                    "type": "text",
                                    "parameter_name": "nombre",
                                    "text": nombre_presidente,
                                },
                                {
                                    "type": "text",
                                    "parameter_name": "url",
                                    "text": link_invitacion,
                                },
                            ],
                        }
                    ],
                },
            }
        else:
            # Envío como mensaje de texto plano tradicional
            mensaje = self._construir_mensaje(nombre_presidente, link_invitacion)
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": telefono,
                "type": "text",
                "text": {
                    "preview_url": True,
                    "body": mensaje,
                },
            }

        headers = {
            "Authorization": f"Bearer {self.config.WHATSAPP_ACCESS_TOKEN}",
            "Content-Type": "application/json",
        }
        url = self._construir_url()
        intento_at = datetime.now().isoformat()

        logger.info(
            "WhatsApp envío iniciado usuario_id=%s telefono=%s fecha_hora=%s",
            usuario_id,
            telefono,
            intento_at,
        )

        try:
            response = requests.post(url, headers=headers, json=payload, timeout=15)
        except requests.RequestException as exc:
            logger.exception(
                "WhatsApp envío falló por excepción usuario_id=%s telefono=%s fecha_hora=%s error=%s",
                usuario_id,
                telefono,
                intento_at,
                str(exc),
            )
            raise HTTPException(
                status_code=502,
                detail=f"Error de conexión al enviar WhatsApp: {str(exc)}",
            ) from exc

        try:
            meta_response = response.json()
        except ValueError:
            meta_response = {"raw": response.text}

        if response.ok:
            logger.info(
                "WhatsApp envío exitoso usuario_id=%s telefono=%s fecha_hora=%s status_code=%s resultado=%s",
                usuario_id,
                telefono,
                intento_at,
                response.status_code,
                json.dumps(meta_response, ensure_ascii=True),
            )
            return {
                "ok": True,
                "status_code": response.status_code,
                "meta_response": meta_response,
            }

        logger.error(
            "WhatsApp envío fallido usuario_id=%s telefono=%s fecha_hora=%s status_code=%s respuesta_meta=%s",
            usuario_id,
            telefono,
            intento_at,
            response.status_code,
            json.dumps(meta_response, ensure_ascii=True),
        )
        raise HTTPException(
            status_code=502,
            detail={
                "mensaje": "Meta rechazó el envío de WhatsApp.",
                "status_code": response.status_code,
                "meta_response": meta_response,
            },
        )
