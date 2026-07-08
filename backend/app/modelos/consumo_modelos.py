import uuid
from sqlalchemy import Column, Integer, String, Boolean, Numeric, DateTime, ForeignKey, Date
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class CatalogoTipoOperacion(Base):
    __tablename__ = "CatalogoTipoOperacion"

    TipoOperacionId = Column(Integer, primary_key=True, autoincrement=True)
    Nombre = Column(String(100), nullable=False, unique=True)
    Descripcion = Column(String(500), nullable=True)

class CatalogoTipoRegistro(Base):
    __tablename__ = "CatalogoTipoRegistro"

    TipoRegistroId = Column(Integer, primary_key=True, autoincrement=True)
    Nombre = Column(String(100), nullable=False, unique=True)
    Descripcion = Column(String(500), nullable=True)

class BitacoraConsumo(Base):
    __tablename__ = "BitacoraConsumo"

    ConsumoId = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    RequestId = Column(String(100), nullable=False, index=True)
    UsuarioId = Column(Integer, ForeignKey("Usuarios.UsuarioId"), nullable=True)
    GuestId = Column(String(100), nullable=True)
    SessionId = Column(String(100), nullable=True)
    TenantId = Column(Integer, nullable=True)
    TarifaId = Column(Integer, nullable=True)
    TipoUsuario = Column(String(50), nullable=False) # 'REGISTRADO', 'INVITADO'
    TipoConsumo = Column(String(50), nullable=False) # 'OCR', 'PHOTO_SCAN', 'VERIFICAMEX'
    Proveedor = Column(String(100), nullable=False)
    TipoRegistro = Column(String(50), nullable=False)
    EntityType = Column(String(100), nullable=True)
    EntityId = Column(String(100), nullable=True)
    EstadoTecnico = Column(String(50), nullable=False) # 'EXITOSO', 'TIMEOUT', 'ERROR_PROVEEDOR', 'ERROR_INTERNO'
    ResultadoProveedor = Column(String(100), nullable=True)
    EsCobrable = Column(Boolean, nullable=False)
    CostoUnitario = Column(Numeric(18, 6), nullable=False)
    CostoTotal = Column(Numeric(18, 6), nullable=False)
    Divisa = Column(String(3), nullable=False, default="MXN")
    LlaveIdempotencia = Column(String(256), nullable=False, unique=True)
    CreadoEn = Column(DateTime(timezone=True), nullable=False, default=func.now(), index=True)
    Metadata = Column(String, nullable=True) # NVARCHAR(MAX)

    UsuarioRelacion = relationship("Usuario", foreign_keys=[UsuarioId])

class ConsumoOutbox(Base):
    __tablename__ = "ConsumoOutbox"

    Id = Column(Integer, primary_key=True, autoincrement=True)
    EventId = Column(UNIQUEIDENTIFIER, nullable=False, default=uuid.uuid4)
    Payload = Column(String, nullable=False) # NVARCHAR(MAX)
    Estado = Column(String(50), nullable=False, default="PENDIENTE") # 'PENDIENTE', 'PROCESADO', 'FALLIDO'
    Intentos = Column(Integer, nullable=False, default=0)
    CreadoEn = Column(DateTime(timezone=True), nullable=False, default=func.now())
    ProcesadoEn = Column(DateTime(timezone=True), nullable=True)

class ResumenConsumoDiario(Base):
    __tablename__ = "ResumenConsumoDiario"

    ResumenId = Column(Integer, primary_key=True, autoincrement=True)
    Fecha = Column(Date, nullable=False)
    UsuarioId = Column(Integer, ForeignKey("Usuarios.UsuarioId"), nullable=True)
    GuestId = Column(String(100), nullable=True)
    TenantId = Column(Integer, nullable=True)
    TipoConsumo = Column(String(50), nullable=False)
    Proveedor = Column(String(100), nullable=False)
    TipoRegistro = Column(String(50), nullable=False)
    EsCobrable = Column(Boolean, nullable=False)
    CantidadOperaciones = Column(Integer, nullable=False, default=0)
    CostoAcumulado = Column(Numeric(18, 6), nullable=False, default=0.00)

    UsuarioRelacion = relationship("Usuario", foreign_keys=[UsuarioId])

class CatalogoTarifas(Base):
    __tablename__ = "CatalogoTarifas"

    TarifaId = Column(Integer, primary_key=True, autoincrement=True)
    TipoConsumo = Column(String(50), nullable=False)
    Proveedor = Column(String(100), nullable=False)
    CostoUnitario = Column(Numeric(18, 6), nullable=False)
    Divisa = Column(String(3), nullable=False, default="MXN")
    Descripcion = Column(String(500), nullable=True)
    Estatus = Column(Boolean, nullable=False, default=True)
