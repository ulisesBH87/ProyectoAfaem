from pydantic import BaseModel
from datetime import datetime

class AuditoriaResponse(BaseModel):
    AuditoriaId: int
    EntidadAfectada: str
    RegistroId: str
    Accion: str
    Usuario: str
    FechaAccion: datetime
    Descripcion: str