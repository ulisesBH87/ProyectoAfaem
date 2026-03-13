from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from decimal import Decimal
from typing import List

class SeguroSeleccionado(BaseModel):
    SeguroId: int
    Cantidad: int

class CrearOrdenPago(BaseModel):
    CantidadJugadores: int
    Seguros: List[SeguroSeleccionado]

class SubirComprobanteRespuesta(BaseModel):
    Mensaje: str
    OrdenPagoId: int