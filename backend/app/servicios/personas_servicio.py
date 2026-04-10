from sqlalchemy.orm import Session
from app.repositorios.personas_repositorio import obtener_persona_por_id, guardar

def editar_persona_servicio(db: Session, persona_id: int, datos):

    persona = obtener_persona_por_id(db, persona_id)

    if not persona:
        return None

    for campo, valor in datos.dict(exclude_unset=True).items():
        setattr(persona, campo, valor)

    guardar(db)

    return persona