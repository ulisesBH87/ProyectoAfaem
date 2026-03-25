from pydantic import BaseModel
from datetime import date

class RegistrarJugadorPeticion(BaseModel):
    equipo_temporal_id: int
    solicitud_id: int

class JugadorPersona(BaseModel):
    nombre: str
    primer_apellido: str
    segundo_apellido: str
    curp: str
    sexo_id: int
    fecha_nacimiento: date
    #tipo_seguro_id: int