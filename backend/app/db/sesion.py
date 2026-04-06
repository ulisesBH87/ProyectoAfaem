from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.db.conexion import engine
from fastapi import Depends, HTTPException
import traceback

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

def get_db():
    db = SessionLocal()
    try:
        # Prueba de conexión inicial (opcional, pero útil para detectar caídas de red)
        db.execute(text("SELECT 1"))
    except Exception as e:
        print(f"FALLO INICIAL DB: {str(e)}")
        raise HTTPException(status_code=500, detail=f"No se pudo conectar a la base de datos: {str(e)}")
    
    try:
        yield db
    finally:
        db.close()