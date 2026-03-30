from sqlalchemy import Column, Integer, String, CHAR, Date, DateTime, Boolean, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base

class CatalogoTipoProceso(Base):
    __tablename__ = "CatalogoTipoProceso"

    TipoProcesoId = Column(Integer, primary_key="True")
    Nombre = Column(String)

    EquipoTemporalRelacion = relationship("EquipoTemporal", back_populates="TipoProcesoRelacion")
    