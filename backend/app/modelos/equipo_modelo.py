from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class Equipos(Base):
    __tablename__ = "Equipos"

    EquipoId = Column(Integer, primary_key=True, index=True)
    NombreEquipo = Column(String(150), nullable=False, unique=True)
    FechaCreacion = Column(DateTime, server_default=func.now())
    Estatus = Column(Boolean, default=True)
    RutaLogo = Column(String(500), nullable=True)

    
    EquiposJugandoRelacion = relationship("EquiposJugando", back_populates="EquipoRelacion")
    MiembrosRelacion = relationship("MiembrosEquipo", back_populates="EquipoRelacion")

    SolicitudRelacion = relationship("Solicitud", back_populates="EquipoRelacion")

class EquiposJugando(Base):
    __tablename__ = "EquiposJugando"

    EquiposJugandoId = Column(Integer, primary_key=True, index=True)
    LigaId = Column(Integer, ForeignKey("Ligas.LigaId"), nullable=False)
    EquipoId = Column(Integer, ForeignKey("Equipos.EquipoId"), nullable=True)
    PresidenteEquipoId = Column(Integer, ForeignKey("PresidentesDeEquipo.PresidenteEquipoId"), nullable=True)
    EntrenadorEquipoId = Column(Integer, ForeignKey("PresidentesDeEquipo.PresidenteEquipoId"), nullable=True)
    CantidadJugadores = Column(Integer, nullable=True)

    LigaRelacion = relationship("Ligas", back_populates="EquiposJugandoRelacion")
    EquipoRelacion = relationship("Equipos", back_populates="EquiposJugandoRelacion")
    PresidenteRelacion = relationship("PresidenteEquipo", foreign_keys=[PresidenteEquipoId], back_populates="EquiposJugandoRelacion")
    EntrenadorRelacion = relationship("PresidenteEquipo", foreign_keys=[EntrenadorEquipoId], back_populates="EquiposEntrenadosRelacion")
