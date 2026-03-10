from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Configuracion(BaseSettings):
    BASE_DATOS_URL: str
    ALGORITHM: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    model_config = SettingsConfigDict(
        env_file=".env"
    )

@lru_cache()
def obtener_configuracion():
    return Configuracion()