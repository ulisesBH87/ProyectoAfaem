from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class CatalogoDocumentosPersonas(Base):
    __tablename__ = "CatalogoDocumentosPersonas"

    DocumentosPersonasId = Column(Integer, primary_key=True)

    DocumentoId = Column(Integer, ForeignKey("CatalogoDocumentos.DocumentoId"), nullable=False)
    RolPersonaId = Column(Integer, ForeignKey("CatalogoRolesPersonas.RolPersonaId"), nullable=False)

    Documento = relationship("CatalogoDocumentos")