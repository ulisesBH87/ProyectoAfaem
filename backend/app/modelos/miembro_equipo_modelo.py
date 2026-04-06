from sqlalchemy import Column, Integer, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class MiembrosEquipo(Base):
    __tablename__ = "MiembrosEquipo"

    MiembroEquipoId = Column(Integer, primary_key=True, index=True)
    PersonaId = Column(Integer, ForeignKey("Personas.PersonaId"), nullable=False)
    RolEnEquipo = Column(Integer, ForeignKey("RolesDeEquipo.RolId"), nullable=False)
    FechaIngreso = Column(DateTime, server_default=func.now())
    FechaSalida = Column(DateTime, nullable=True)
    EquipoID = Column(Integer, ForeignKey("Equipos.EquipoId"), nullable=False)
    Estatus = Column(Boolean, default=True)
    Eliminado = Column(Boolean, default=False)

    PersonaRelacion = relationship("Personas", back_populates="MiembrosRelacion")
    RolRelacion = relationship("RolesDeEquipo", back_populates="MiembrosRelacion")
    EquipoRelacion = relationship("Equipos", back_populates="MiembrosRelacion")
