from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from app.db.base import Base

class RolesDeEquipo(Base):
    __tablename__ = "RolesDeEquipo"

    RolId = Column(Integer, primary_key=True, index=True)
    NombreRol = Column(String(50), nullable=False)
    Estatus = Column(Boolean, default=True)
    Eliminado = Column(Boolean, default=False)

    MiembrosRelacion = relationship("MiembrosEquipo", back_populates="RolRelacion")
