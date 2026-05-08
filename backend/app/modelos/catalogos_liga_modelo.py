from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from app.db.base import Base

class CatalogoCategorias(Base):
    __tablename__ = "CatalogoCategorias"
    CategoriaId = Column(Integer, primary_key=True, index=True)
    NombreCategoria = Column(String(100), nullable=False)
    EquiposJugandoRelacion = relationship("EquiposJugando", back_populates="CategoriaRelacion")

class Ligas(Base):
    __tablename__ = "Ligas"
    LigaId = Column(Integer, primary_key=True, index=True)
    Nombreliga = Column(String(100), nullable=False)
    Descripcionliga = Column(String(200), nullable=False)
    EquiposJugandoRelacion = relationship("EquiposJugando", back_populates="LigaRelacion")

class CatalogoModalidad(Base):
    __tablename__ = "CatalogoModalidad"
    ModalidadId = Column(Integer, primary_key=True, index=True)
    NombreModalidad = Column(String(100), nullable=False)
    EquiposJugandoRelacion = relationship("EquiposJugando", back_populates="ModalidadRelacion")

class CatalogoRamas(Base):
    __tablename__ = "CatalogoRamas"
    RamaId = Column(Integer, primary_key=True, index=True)
    Nombre = Column(String(100), nullable=False)
    EquiposJugandoRelacion = relationship("EquiposJugando", back_populates="RamaRelacion")
