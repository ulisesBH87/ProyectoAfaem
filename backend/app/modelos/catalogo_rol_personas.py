from sqlalchemy import Column, Integer, String, CHAR, Date, Boolean, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base

class CatalogoRolesPersonas(Base):
    __tablename__ = "CatalogoRolesPersonas"

    RolPersonaId = Column(Integer, primary_key=True)
    Nombre = Column(String(50),nullable=False)