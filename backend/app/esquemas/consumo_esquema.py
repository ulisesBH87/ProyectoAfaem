from pydantic import BaseModel
from datetime import datetime, date
from uuid import UUID

class ConsumoBase(BaseModel):
    RequestId: str
    UsuarioId: int | None = None
    GuestId: str | None = None
    SessionId: str | None = None
    TenantId: int | None = None
    TarifaId: int | None = None
    TipoUsuario: str
    TipoConsumo: str
    Proveedor: str
    TipoRegistro: str
    EntityType: str | None = None
    EntityId: str | None = None
    EstadoTecnico: str
    ResultadoProveedor: str | None = None
    EsCobrable: bool
    CostoUnitario: float
    CostoTotal: float
    Divisa: str

class ConsumoResponse(ConsumoBase):
    ConsumoId: UUID
    CreadoEn: datetime
    Metadata: str | None = None

    class Config:
        orm_mode = True
        from_attributes = True

class ResumenConsumoResponse(BaseModel):
    Fecha: date
    UsuarioId: int | None = None
    GuestId: str | None = None
    TenantId: int | None = None
    TipoConsumo: str
    Proveedor: str
    TipoRegistro: str
    EsCobrable: bool
    CantidadOperaciones: int
    CostoAcumulado: float

    class Config:
        orm_mode = True
        from_attributes = True
