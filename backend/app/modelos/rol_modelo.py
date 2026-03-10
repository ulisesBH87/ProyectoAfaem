from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.db.base import Base

class Rol(Base):
    __tablename__ = "Roles"

    IdRol = Column(Integer, primary_key=True)
    Nombre = Column(String(50), nullable=False, unique=True)