from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from app.db.base import Base

class Permisos(Base):
    __tablename__ = "Permisos"

    PermisoId = Column(Integer, primary_key=True)
    Nombre = Column(String(100), nullable=False, unique=True)
    Slug = Column(String(100), nullable=False, unique=True) # e.g. 'usuarios.crear'
    Descripcion = Column(String(255))
    Estatus = Column(Boolean, default=True)

    # Relación con Roles a través de tabla intermedia
    RolesRelacion = relationship("RelRolPermisos", back_populates="PermisoRelacion")
