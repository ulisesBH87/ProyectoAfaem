from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.db.base import Base

class CatalogoTiposAfiliacion(Base):
    __tablename__ = "CatalogoTiposAfiliacion"

    TipoAfiliacionId = Column(Integer, primary_key=True)
    NombreAfiliacion = Column(String(100), nullable=False)

    SolicitudRelacion = relationship("Solicitud", back_populates="CatalogoTiposAfiliacionRelacion")