from sqlalchemy import Column, Integer, String, CHAR, Date, Boolean, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base

class DocumentoAfiliacion(Base):
    __tablename__ = "DocumentoAfiliacion"

    DocumentoAfiliacionId = Column(Integer, primary_key=True)

    DocumentoId = Column(Integer, ForeignKey("CatalogoDocumentos.DocumentoId"), nullable=False) #id del documento en el catálogo
    RolPersonaId = Column(Integer, ForeignKey("CatalogoRolesPersonas.RolPersonaId"), nullable=False)
    TipoAfiliacionId = Column(Integer, ForeignKey("CatalogoTiposAfiliacion.TipoAfiliacionId"), nullable=False)
    Obligatorio = Column(Boolean, nullable=False, default=True)

    Documento = relationship("CatalogoDocumentos")
    Rol = relationship("CatalogoRolesPersonas")
    TipoAfiliacion = relationship("CatalogoTiposAfiliacion")