from sqlalchemy import Column, Integer, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.db.base import Base

class RelUsuarioRoles(Base):
    __tablename__ = "RelUsuarioRoles"

    UsuarioRolId = Column(Integer, primary_key=True)
    UsuarioId = Column(Integer, ForeignKey("Usuarios.UsuarioId"), nullable=False)
    RolId = Column(Integer, ForeignKey("Roles.RolId"), nullable=False)
    Estatus = Column(Boolean, default=True)

    UsuarioRelacion = relationship("Usuario", back_populates="RolesAsignados")
    RolRelacion = relationship("Roles", back_populates="UsuariosAsignados")
