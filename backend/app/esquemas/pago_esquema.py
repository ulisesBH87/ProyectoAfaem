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
    TipoSolicitud: int
    EquipoId: int | None = None
    TipoAfiliacionId: int | None = None
    PresidenteId: int | None = None

class SubirComprobanteRespuesta(BaseModel):
    Mensaje: str
    OrdenPagoId: int

class VerComprobantes(BaseModel):
    Correo: str
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
    Correo: str | None = None
    FechaDePago: datetime | None = None
    FechaEnvio: datetime | None = None
    RutaVoucher: str | None = None
    EstatusPagoId: int
    TotalPagar: Decimal

    class Config:
        from_attributes = True

class OrdenPagoDetallesIndividual(BaseModel):
    OrdenPagoDetalleId: int
    TipoAfiliacionId: int | None
    TipoConceptoId: int
    SeguroId: int | None
    Cantidad: int
    PrecioUnitarioCobrado: Decimal
    Subtotal: Decimal

    class Config:
        from_attributes = True

class OrdenPagoIndividual(BaseModel):
    OrdenPagoId: int
    UsuarioId: int
    FechaDePago: datetime | None = None
    FechaEnvio: datetime | None = None
    RutaVoucher: str | None = None
    EstatusPagoId: int
    TotalPagar: Decimal

    OrdenPagoDetalleRelacion: list[OrdenPagoDetallesIndividual]
    class Config:
        from_attributes = True
