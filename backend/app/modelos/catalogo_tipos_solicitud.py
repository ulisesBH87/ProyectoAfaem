from sqlalchemy import Column, Integer, String
from app.db.base import Base

class CatalogoTiposSolicitud(Base):
    __tablename__ = "CatalogoTiposSolicitud"

    TipoSolicitudId = Column(Integer, primary_key=True, autoincrement=True)
    Nombre = Column(String(256), nullable=False, unique=True)