from sqlalchemy import create_engine
from app.core.config import obtener_configuracion
from app.core.auditoria import auditoria_listener
import os

config = obtener_configuracion()

engine = create_engine(
    config.BASE_DATOS_URL,
    echo=config.DEBUG, #hace que sqlalchemy imprima las consultas SQL en la consola para depuración
    future=True,
    pool_pre_ping=True # Verifica la conexión antes de usarla, útil para detectar caídas de red
)