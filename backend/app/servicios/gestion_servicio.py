from sqlalchemy.orm import Session
from app.repositorios import gestion_repositorio

class GestionServicio:

    def __init__(self, db:Session):
        self.db = db

    def asignar_nui(self, persona_id: int, nui: str):
        persona = gestion_repositorio.asignar_nui_repo(self.db, persona_id, nui)
        return persona
