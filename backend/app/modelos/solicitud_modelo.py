from sqlalchemy import Column, Integer, String, CHAR, Date, DateTime, Boolean, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base

class Solicitud(Base):
    __tablename__ = "Solicitudes"
    SolicitudId = Column(Integer, primary_key=True)

    UsuarioId = Column(Integer, ForeignKey("Usuarios.UsuarioId"), nullable=False)
    UsuarioRelacion = relationship("Usuario", back_populates="SolicitudRelacion")

    FechaSolicitud = Column(DateTime, nullable=False)
    ObservacionesSolicitud = Column(String(500), nullable=True)

    EstatusValidacion = Column(Integer, ForeignKey("CatalogoEstadosValidacion.EstadoValidacionId"), nullable=False)
    CatalogoEstadosValidacion = relationship("CatalogoEstadosValidacion")

    TipoAfiliacionId = Column(Integer, ForeignKey("CatalogoTiposAfiliacion.TipoAfiliacionId"), nullable=True)
    CatalogoTiposAfiliacionRelacion = relationship("CatalogoTiposAfiliacion", back_populates="SolicitudRelacion")

    EquipoTemporalRelacion = relationship("EquipoTemporal", back_populates="SolicitudRelacion")
    