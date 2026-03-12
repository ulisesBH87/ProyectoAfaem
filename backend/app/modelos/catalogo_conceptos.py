from sqlalchemy import Column, Integer, String, DECIMAL
from sqlalchemy.orm import relationship
from app.db.base import Base

class Conceptos(Base):
    __tablename__ = "CatalogoConceptos"
    ConceptoId = Column(Integer, primary_key=True)
    Nombre = Column(String)

    OrdenPagoDetalleRelacion = relationship("OrdenPagoDetalles", back_populates="ConceptoRelacion")
