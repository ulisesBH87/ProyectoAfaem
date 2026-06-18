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

    TipoDirectivoId = Column(ForeignKey("RolesDirectivos.IdDirectivo"), nullable=False, default=1)
    RolesDirectivosRelacion = relationship("RolesDirectivos")

    FechaCreacion = Column(DateTime, server_default=func.now())
    
    EquiposJugandoRelacion = relationship("EquiposJugando", foreign_keys="[EquiposJugando.PresidenteEquipoId]", back_populates="PresidenteRelacion")
    EquiposEntrenadosRelacion = relationship("EquiposJugando", foreign_keys="[EquiposJugando.EntrenadorEquipoId]", back_populates="EntrenadorRelacion")
    
    Afiliacion = Column(String(100), nullable=True)
    DatosBorrador = Column(String, nullable=True)
