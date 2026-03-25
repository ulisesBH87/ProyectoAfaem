from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.sesion import get_db
from app.core.seguridad import obtener_usuario_actual
from app.esquemas.permisos_esquema import UserAccessEsquema
from app.servicios.permisos_servicio import obtener_acceso_usuario_servicio

router = APIRouter(prefix="/permisos", tags=["Permisos"])

@router.get("/mi-acceso", response_model=UserAccessEsquema)
def obtener_mi_acceso(db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    """
    Retorna los roles, permisos y estructura de menús personalizada para el usuario actual.
    """
    if not usuario:
        raise HTTPException(status_code=401, detail="Usuario no autenticado")
    
    acceso = obtener_acceso_usuario_servicio(db, usuario.UsuarioId)
    return acceso
