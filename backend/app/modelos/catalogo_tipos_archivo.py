from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.db.base import Base

class CatalogoTiposArchivo(Base):
    __tablename__ = "CatalogoTiposArchivo"

    TipoArchivoId = Column(Integer, primary_key=True)
    NombreTipoArchivo = Column(String(100), nullable=False)