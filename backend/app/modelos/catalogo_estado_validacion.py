from sqlalchemy import Column, Integer, String, CHAR, Date, Boolean, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base


class CatalogoEstadosValidacion(Base):
    __tablename__ = "CatalogoEstadosValidacion"

    EstadoValidacionId = Column(Integer, primary_key=True)
    Nombre = Column(String(100), nullable=False, unique=True)