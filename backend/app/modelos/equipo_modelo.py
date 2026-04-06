from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class Equipos(Base):
    __tablename__ = "Equipos"

    EquipoId = Column(Integer, primary_key=True, index=True)
    NombreEquipo = Column(String(150), nullable=False)
    FechaCreacion = Column(DateTime, server_default=func.now())
    
    LigaModalidadCategoriaRamaId = Column(Integer, ForeignKey("LigaModalidadCategoriaRama.LigaModalidadCategoriaRamaId"), nullable=False)
    NumeroJugadores = Column(Integer, default=0)
    Estatus = Column(Boolean, default=True)
    PresidenteEquipoId = Column(Integer, ForeignKey("PresidentesDeEquipo.PresidenteEquipoId"), nullable=False)

    LigaModRelacion = relationship("LigaModalidadCategoriaRama", back_populates="EquiposRelacion")
    PresidenteRelacion = relationship("PresidenteEquipo", back_populates="EquiposRelacion")
    MiembrosRelacion = relationship("MiembrosEquipo", back_populates="EquipoRelacion")
