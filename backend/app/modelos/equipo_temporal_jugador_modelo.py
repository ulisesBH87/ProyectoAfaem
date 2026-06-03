from sqlalchemy import Column, Integer, String, CHAR, Date, DateTime, Boolean, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base

class EquipoTemporalJugador(Base):
    __tablename__ = "EquipoTemporalJugador"

    EquipoTemporalJugadorId = Column(Integer, primary_key=True)

    Completo = Column(Boolean, nullable=False)

    EquipoTemporalId = Column(ForeignKey("EquipoTemporal.EquipoTemporalId"), nullable=False)
    EquipoTemporalRelacion = relationship("EquipoTemporal", back_populates="EquipoTemporalJugadorRelacion")

    PersonaId = Column(ForeignKey("Personas.PersonaId"))
    PersonaRelacion = relationship("Personas", back_populates="EquipoTemporalJugadorRelacion")

    SeguroId = Column(Integer, ForeignKey("CatalogoSeguros.SeguroId"))
    SeguroRelacion = relationship("Seguro", back_populates="EquipoTemporalJugadorRelacion")

    DatosBorrador = Column(String, nullable=True)