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
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
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