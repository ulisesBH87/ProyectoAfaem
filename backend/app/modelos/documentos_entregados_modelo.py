from sqlalchemy import Column, Integer, String, CHAR, Date, DateTime, Boolean, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base


class DocumentosEntregados(Base):
    __tablename__ = "DocumentosEntregadosSolicitud"

    DocumentosSolicitudId = Column(Integer, primary_key=True)

    PersonaId = Column(Integer, ForeignKey("Personas.PersonaId"), nullable=True)

    SolicitudId = Column(Integer, ForeignKey("Solicitudes.SolicitudId"), nullable=True)
    Solicitud = relationship("Solicitud")

    DocumentoAfiliacionId = Column(Integer, ForeignKey("DocumentoAfiliacion.DocumentoAfiliacionId"), nullable=False)

    RutaArchivo = Column(String(512), nullable=False)

    FechaEntrega = Column(DateTime, nullable=False)
    FechaValidacion = Column(DateTime, nullable=True)

    ObservacionesDocumento = Column(String(500), nullable=True)

    EstadoValidacionId = Column(Integer, ForeignKey("CatalogoEstadosValidacion.EstadoValidacionId"), nullable=False)