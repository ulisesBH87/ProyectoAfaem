from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class Auditoria(Base):
    __tablename__ = "Auditoria"

    AuditoriaId = Column(Integer, primary_key=True, autoincrement=True)

    EntidadAfectada = Column(String(100), nullable=False)
    RegistroId = Column(String(50), nullable=False)

    AccionId = Column(Integer, ForeignKey("CatalogoAccion.AccionId"), nullable=False)
    UsuarioId = Column(Integer, nullable=False)

    FechaAccion = Column(DateTime(timezone=True), nullable=False)

    ValoresAntes = Column(String)
    ValoresDespues = Column(String)

    Ip = Column(String(45))
    ObservacionesAuditoria = Column(String(500))

    UsuarioNombre = Column(String(200))

    CatalogoAccion = relationship("CatalogoAccion")