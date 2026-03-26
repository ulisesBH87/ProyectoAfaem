from pydantic import BaseModel
from datetime import date

class JugadorPersona(BaseModel):
    nombre: str
    primer_apellido: str
    segundo_apellido: str
    curp: str
    sexo_id: int
    fecha_nacimiento: date
    #tipo_seguro_id: int #aún no está en bdd, lo implementamos después