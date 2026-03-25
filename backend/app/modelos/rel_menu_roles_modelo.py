from sqlalchemy import Column, Integer, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.db.base import Base

class RelMenuRoles(Base):
    __tablename__ = "RelMenuRoles"

    MenuRolId = Column(Integer, primary_key=True)
    MenuId = Column(Integer, ForeignKey("Menus.MenuId"), nullable=False)
    RolId = Column(Integer, ForeignKey("Roles.RolId"), nullable=False)
    Estatus = Column(Boolean, default=True)

    MenuRelacion = relationship("Menus", back_populates="RolesRelacion")
    RolRelacion = relationship("Roles", back_populates="MenusRelacion")
