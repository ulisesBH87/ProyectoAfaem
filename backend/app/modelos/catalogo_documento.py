from sqlalchemy import Column, Integer, String, CHAR, Date, Boolean, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base

class CatalogoDocumentos(Base):
    __tablename__ = "CatalogoDocumentos"
    DocumentoId = Column(Integer, primary_key=True)
    NombreDocumento = Column(String(100), nullable=False, unique=True)
    Descripcion = Column(String(200), nullable=True)

    TipoArchivoId = Column(Integer, ForeignKey("CatalogoTiposArchivo.TipoArchivoId"), nullable=True)
