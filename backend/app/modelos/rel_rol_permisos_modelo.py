from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class RelRolPermisos(Base):
    __tablename__ = "RelRolPermisos"

    RolPermisoId = Column(Integer, primary_key=True)
    RolId = Column(Integer, ForeignKey("Roles.RolId"), nullable=False)
    PermisoId = Column(Integer, ForeignKey("Permisos.PermisoId"), nullable=False)

    RolRelacion = relationship("Roles", back_populates="PermisosRelacion")
    PermisoRelacion = relationship("Permisos", back_populates="RolesRelacion")
