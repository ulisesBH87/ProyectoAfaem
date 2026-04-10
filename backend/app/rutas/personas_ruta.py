from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from app.esquemas.persona_esquema import PersonaEditar
from app.servicios import personas_servicio
from app.db.sesion import get_db

router = APIRouter(
    prefix="/personas",
    tags=["Personas"]
)

@router.put("/{persona_id}")
def editar_persona(persona_id: int, datos: PersonaEditar, db: Session = Depends(get_db)):
    persona = personas_servicio.editar_persona_servicio(db, persona_id, datos)

    return {
        "mensaje": "Persona actualizada",
        "persona_id": persona.PersonaId
    }