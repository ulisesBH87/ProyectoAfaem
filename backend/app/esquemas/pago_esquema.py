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

class VerComprobantes(BaseModel):
    Correo: EmailStr
    FechaEnvio: datetime
    Estatus: str
    Ruta: str
    
class SeguroBase(BaseModel):
    SeguroId: int
    Nombre: str
    Precio: float

    class Config:
        from_attributes = True

class AfiliacionesBase(BaseModel):
    TipoAfiliacionId: int
    NombreAfiliacion: str
    CostoActual: float

    class Config:
        from_attributes = True

class ListaPagos(BaseModel):
    OrdenPagoId: int
    UsuarioId: int
    #Correo = EmailStr
    FechaEnvio: datetime
    RutaVoucher: str
    EstatusPagoId: int

    class Config:
        from_attributes = True