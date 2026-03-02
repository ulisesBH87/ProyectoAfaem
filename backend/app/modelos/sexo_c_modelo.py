from sqlalchemy import Column, Integer, String
from app.db.base import Base

class CatalogoSexo(Base):
    __tablename__ = "CatalogoSexo"

    SexoId = Column(Integer, primary_key=True)
    Nombre = Column(String(40), nullable=False, unique=True)