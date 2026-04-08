from sqlalchemy.orm import Session, sessionmaker
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


#Autenticación
def get_autenticacion_servicio(db: Session = Depends(get_db)):
    from app.servicios.autenticacion_servicio import AutenticacionServicio
    return AutenticacionServicio(db)

#Pagos
def get_pagos_servicio(db: Session = Depends(get_db)):
    from app.servicios.pagos_servicio import PagosServicio
    return PagosServicio(db)

#Gestion
def get_gestion_servicio(db: Session = Depends(get_db)):
    from app.servicios.gestion_servicio import GestionServicio
    return GestionServicio(db)