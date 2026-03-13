from sqlalchemy import Column, Integer, String, DECIMAL, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.db.base import Base

class OrdenPagoDetalle(Base):
    __tablename__ = "OrdenPagoDetalle"
    
    OrdenPagoDetalleId = Column(Integer, primary_key=True)
    
    OrdenPagoId = Column(Integer, ForeignKey("OrdenDePago.OrdenPagoId"), nullable=False)
    OrdenPagoRelacion = relationship("OrdenPago", back_populates="OrdenPagoDetalleRelacion")
    
    TipoAfiliacionId = Column(Integer, ForeignKey("CatalogoTiposAfiliacion.TipoAfiliacionId"))
    AfiliacionRelacion = relationship("CatalogoTiposAfiliacion", back_populates="OrdenPagoDetalleRelacion")
    
    TipoConceptoId = Column(Integer, ForeignKey("CatalogoConceptos.ConceptoId"))
    ConceptoRelacion = relationship("Conceptos", back_populates="OrdenPagoDetalleRelacion")
    
    SeguroId = Column(Integer, ForeignKey("CatalogoSeguros.SeguroId"))
    SeguroRelacion = relationship("Seguro", back_populates="OrdenPagoDetalleRelacion")
    
    Cantidad = Column(Integer)
    PrecioUnitarioCobrado = Column(DECIMAL(7,2))
    Subtotal = Column(DECIMAL(7,2))