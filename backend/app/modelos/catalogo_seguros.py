from sqlalchemy import Column, Integer, String, DECIMAL, Boolean, ForeignKey, Date
from sqlalchemy.orm import relationship
from app.db.base import Base

class Seguro(Base):
    __tablename__ = "CatalogoSeguros"
    SeguroId = Column(Integer, primary_key=True)
    Nombre = Column(String(100))
    Activo = Column(Boolean)
    Precio = Column(DECIMAL(7,2), nullable=False)
    TipoVigencia = Column(Integer, nullable=True, default=1)
    VigenciaTemporal = Column(Integer, nullable=True)
    FechaVigencia = Column(Date, nullable=True)

    OrdenPagoDetalleRelacion = relationship("OrdenPagoDetalle", back_populates="SeguroRelacion")
    EquipoTemporalJugadorRelacion= relationship("EquipoTemporalJugador", back_populates="SeguroRelacion")

    TipoPersonaId = Column(Integer, ForeignKey("CatalogoRolesPersonas.RolPersonaId"), nullable=True)