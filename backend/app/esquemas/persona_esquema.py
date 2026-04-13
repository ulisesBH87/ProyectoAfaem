from pydantic import BaseModel
from typing import Optional

class PersonaEditar(BaseModel):
    Nombre: Optional[str]
    PrimerApellido: Optional[str]
    SegundoApellido: Optional[str]