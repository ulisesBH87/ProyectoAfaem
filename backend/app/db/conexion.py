from sqlalchemy import create_engine
import pyodbc
from app.core.config import obtener_configuracion

config = obtener_configuracion()

engine = create_engine(
    config.BASE_DATOS_URL,
    echo=True,
    future=True,
    pool_pre_ping=True
)



