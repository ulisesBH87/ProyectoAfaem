from fastapi import APIRouter, HTTPException, Depends
from app.db.sesion import get_gestion_servicio

from app.excepciones import gestion_excepciones

router = APIRouter(
    prefix="/gestion",
    tags=["Gestionar jugadores"]
)

@router.post("/nui")
def asignar_nui(persona_id: int, nui: str, service = Depends(get_gestion_servicio)):
    try:
        persona = service.asignar_nui(persona_id, nui)
        
    except gestion_excepciones.NUIExcepcion:
        raise HTTPException(status_code=400, detail="Error al asignar NUI")

    return {"message": "NUI asignado correctamente"}