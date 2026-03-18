from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.db.base import Base

class Roles(Base):
    __tablename__ = "Roles"

    RolId = Column(Integer, primary_key=True)
    Nombre = Column(String(40), nullable=False, unique=True)

    UsuarioRelacion = relationship("Usuario", back_populates="RolRelacion")