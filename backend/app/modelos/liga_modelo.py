from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class LigaModalidadCategoriaRama(Base):
    __tablename__ = "LigaModalidadCategoriaRama"

    LigaModalidadCategoriaRamaId = Column(Integer, primary_key=True, index=True)
    
    RamaId = Column(Integer, ForeignKey("CatalogoRamas.RamaId"), nullable=False)
    CategoriaId = Column(Integer, ForeignKey("CatalogoCategorias.CategoriaId"), nullable=False)
    LigaId = Column(Integer, ForeignKey("Ligas.LigaId"), nullable=False)
    ModalidadId = Column(Integer, ForeignKey("CatalogoModalidad.ModalidadId"), nullable=False)

    RamaRelacion = relationship("CatalogoRamas", back_populates="LigaModRelacion")
    CategoriaRelacion = relationship("CatalogoCategorias", back_populates="LigaModRelacion")
    LigaRelacion = relationship("Ligas", back_populates="LigaModRelacion")
    ModalidadRelacion = relationship("CatalogoModalidad", back_populates="LigaModRelacion")

    # EquiposRelacion = relationship("Equipos", back_populates="LigaModRelacion")  # Removido por cambio de esquema
