from sqlalchemy import Column, Integer, String, CHAR, Date, Boolean, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base

class DocumentoAfiliacion(Base):
    __tablename__ = "DocumentoAfiliacion"

    DocumentoAfiliacionId = Column(Integer, primary_key=True)
    TipoAfiliacionId = Column(Integer, ForeignKey("CatalogoTiposAfiliacion.TipoAfiliacionId"), nullable=False)
    DocumentoPersonaId = Column(Integer, ForeignKey("CatalogoDocumentosPersonas.DocumentosPersonasId"), nullable=False)
