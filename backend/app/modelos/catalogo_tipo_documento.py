from sqlalchemy import Column, Integer, String, CHAR, Date, Boolean, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base

class CatalogoTipoDocumentos(Base):
    __tablename__ = "CatalogoTiposDocumento"

    TipoDocumentoId = Column(Integer, primary_key=True)
    Nombre = Column(String(50),nullable=False)