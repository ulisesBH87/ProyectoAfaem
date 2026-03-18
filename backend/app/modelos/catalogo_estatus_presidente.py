from sqlalchemy import Column, Integer, String, CHAR, Date, Boolean, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base

class EstatusPresidente(Base):
    __tablename__ = "CatalogoEstatusPresidenteEquipo"

    EstatusPresidenteId = Column(Integer, primary_key=True)

    Nombre = Column(String)

    PresidenteEquipoRelacion = relationship("PresidenteEquipo", back_populates="EstatusPresidenteRelacion")