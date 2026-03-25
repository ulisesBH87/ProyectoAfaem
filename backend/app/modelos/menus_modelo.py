from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class Menus(Base):
    __tablename__ = "Menus"

    MenuId = Column(Integer, primary_key=True)
    Nombre = Column(String(100), nullable=False)
    Ruta = Column(String(255))
    Icono = Column(String(100)) # Nombre del icono (e.g. 'FaHome')
    Orden = Column(Integer, default=0)
    Estatus = Column(Boolean, default=True)
    
    # Soporte para jerarquía (Padre/Hijo)
    MenuPadreId = Column(Integer, ForeignKey("Menus.MenuId"), nullable=True)
    
    SubMenus = relationship("Menus", backref="Padre", remote_side=[MenuId])
    
    # Relación con Roles a través de tabla intermedia
    RolesRelacion = relationship("RelMenuRoles", back_populates="MenuRelacion")
