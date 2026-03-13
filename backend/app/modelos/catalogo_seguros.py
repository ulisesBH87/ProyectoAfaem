from sqlalchemy import Column, Integer, String, DECIMAL, Boolean
from sqlalchemy.orm import relationship
from app.db.base import Base

class Seguro(Base):
    __tablename__ = "CatalogoSeguros"
    SeguroId = Column(Integer, primary_key=True)
    Nombre = Column(String(100))
    Activo = Column(Boolean)
    Precio = Column(DECIMAL(7,2), nullable=False)

    OrdenPagoDetalleRelacion = relationship("OrdenPagoDetalle", back_populates="SeguroRelacion")