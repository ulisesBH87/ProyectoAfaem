from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.modelos.persona_modelo import Personas
from app.excepciones import gestion_excepciones

def asignar_nui_repo(db: Session, persona_id: int, nui: str):
    try:
        persona = db.query(Personas).filter(Personas.PersonaId == persona_id).first()
        if not persona:
            raise ValueError("Persona no encontrada")

        persona.NUI = nui
        db.commit()
        db.refresh(persona)
        
        return persona

    except IntegrityError as e:
        db.rollback()    
        raise gestion_excepciones.NUIExcepcion("Error al asignar NUI.")
    
    except Exception as e:
        db.rollback()
        raise gestion_excepciones.NUIExcepcion("Error interno del servidor: " + str(e))
    