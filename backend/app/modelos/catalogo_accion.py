from sqlalchemy import Column, Integer, String
from app.db.base import Base

class CatalogoAccion(Base):
    __tablename__ = "CatalogoAccion"

    AccionId = Column(Integer, primary_key=True, autoincrement=True)
    Accion = Column(String(50), nullable=False, unique=True)