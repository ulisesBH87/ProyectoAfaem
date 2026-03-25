from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.db.base import Base

class Roles(Base):
    __tablename__ = "Roles"

    RolId = Column(Integer, primary_key=True)
    Nombre = Column(String(40), nullable=False, unique=True)
    Descripcion = Column(String(255), nullable=True)

    # Relaciones RBAC
    UsuariosAsignados = relationship("RelUsuarioRoles", back_populates="RolRelacion")
    PermisosRelacion = relationship("RelRolPermisos", back_populates="RolRelacion")
    MenusRelacion = relationship("RelMenuRoles", back_populates="RolRelacion")
    
    # Mantener para compatibilidad por ahora
    UsuarioRelacion = relationship("Usuario", back_populates="RolRelacion")