from sqlalchemy import Column, Integer, String, CHAR, Date, Boolean, ForeignKey, CheckConstraint, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class PresidenteEquipo(Base):
    __tablename__ = "PresidentesDeEquipo"

    PresidenteEquipoId = Column(Integer, primary_key=True)

    PersonaId = Column(ForeignKey("Personas.PersonaId"), nullable=False)
    PersonaRelacion = relationship("Personas", back_populates="PresidenteEquipoRelacion")

    EstatusId = Column(ForeignKey("CatalogoEstatusPresidenteEquipo.EstatusPresidenteId"), nullable=False)
    EstatusPresidenteRelacion = relationship("EstatusPresidente", back_populates="PresidenteEquipoRelacion")

    FechaCreacion = Column(DateTime, server_default=func.now())
    EquiposJugandoRelacion = relationship("EquiposJugando", back_populates="PresidenteRelacion")