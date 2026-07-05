from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
import os

class Configuracion(BaseSettings):
    BASE_DATOS_URL: str
    ALGORITHM: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    DEBUG: bool = False
    WHATSAPP_API_VERSION: str = "v25.0"
    WHATSAPP_PHONE_NUMBER_ID: str = ""
    WHATSAPP_ACCESS_TOKEN: str = ""
    WHATSAPP_ENABLED: bool = True
    WHATSAPP_SEND_AS_TEMPLATE: bool = False
    WHATSAPP_TEMPLATE_NAME: str = ""
    WHATSAPP_TEMPLATE_LANGUAGE: str = "es"
    WHATSAPP_VERIFY_TOKEN: str = ""
    UPLOADS_DIR: str = r"C:\inetpub\wwwroot\AFAEM\Servidor\uploads"
    AUTO_CROP_DOCUMENTS: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )

@lru_cache()
def obtener_configuracion():
    return Configuracion()

def obtener_uploads_dir():
    config = obtener_configuracion()
    target_dir = config.UPLOADS_DIR
    try:
        os.makedirs(target_dir, exist_ok=True)
        return target_dir
    except PermissionError:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        local_dir = os.path.join(base_dir, "uploads")
        os.makedirs(local_dir, exist_ok=True)
        return local_dir