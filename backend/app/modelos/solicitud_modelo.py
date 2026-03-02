from sqlalchemy import Column, Integer, String, CHAR, Date, DateTime, Boolean, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base

class Solicitud(Base):
    __tablename__ = "Solicitudes"
    SolicitudId = Column(Integer, primary_key=True)

    UsuarioId = Column(Integer, ForeignKey("Usuarios.UsuarioId"), nullable=False)
    Usuario = relationship("Usuario")

    FechaSolicitud = Column(DateTime, nullable=False)
    ObservacionesSolicitud = Column(String(500), nullable=True)

    EstatusValidacion = Column(Integer, ForeignKey("CatalogoEstadosValidacion.EstadoValidacionId"), nullable=False)
    CatalogoEstadosValidacion = relationship("CatalogoEstadosValidacion")