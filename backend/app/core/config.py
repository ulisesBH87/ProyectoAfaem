from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
import os

class Configuracion(BaseSettings):
    BASE_DATOS_URL: str
    ALGORITHM: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    DEBUG: bool = False
    model_config = SettingsConfigDict(
        env_file=".env"
    )

@lru_cache()
def obtener_configuracion():
    return Configuracion()

def obtener_uploads_dir():
    target_dir = r"C:\inetpub\wwwroot\AFAEM\Servidor\uploads"
    try:
        os.makedirs(target_dir, exist_ok=True)
        return target_dir
    except PermissionError:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        local_dir = os.path.join(base_dir, "uploads")
        os.makedirs(local_dir, exist_ok=True)
        return local_dir