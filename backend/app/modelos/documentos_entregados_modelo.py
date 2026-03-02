"""
from sqlalchemy import Column, Integer, String, CHAR, Date, DateTime, Boolean, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base


class DocumentosEntregados(Base):
    __tablename__ = "DocumentosEntregados"

    DocumentosEntregadosId = Column(Integer, primary_key=True)
    
    SolicitudId = Column(Integer, ForeignKey("Solicitud.SolicitudId"), nullable=False)
    Solicitud = relationship("Solicitud")

    DocumentoId = Column(Integer, ForeignKey("CatalogoDocumentos.DocumentoId"), nullable=False)
    CatalogoDocumentos = relationship("CatalogoDocumentos")
    
    ArchivoPath = Column(String(512), nullable=False)

    FechaEntrega = Column(DateTime, nullable=False)

    ObservacionesDocumento = Column(String(500), nullable=True)
    
    """