from sqlalchemy import Column, Integer, String, CHAR, Date, DateTime, Boolean, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base

class EquipoTemporal(Base):
    __tablename__ = "EquipoTemporal"

    EquipoTemporalId = Column(Integer, primary_key=True)

    Activo = Column(Boolean)
    CantidadJugadoresPagados = Column(Integer)

    UsuarioId = Column(ForeignKey("Usuarios.UsuarioId"), nullable=False)
    UsuarioRelacion = relationship("Usuario", back_populates="EquipoTemporalRelacion")

    SolicitudId = Column(ForeignKey("Solicitudes.SolicitudId"))
    SolicitudRelacion = relationship("Solicitud", back_populates="EquipoTemporalRelacion")

    OrdenPagoId = Column(ForeignKey("OrdenDePago.OrdenPagoId"), nullable=False)
    OrdenPagoRelacion = relationship("OrdenPago", back_populates="EquipoTemporalRelacion")
    
    TipoProcesoId = Column(ForeignKey("CatalogoTipoProceso.TipoProcesoId"), nullable=False)
    TipoProcesoRelacion = relationship("CatalogoTipoProceso", back_populates="EquipoTemporalRelacion")

    EquipoTemporalJugadorRelacion = relationship("EquipoTemporalJugador", back_populates="EquipoTemporalRelacion")

    EquipoId = Column(ForeignKey("Equipos.EquipoId"), nullable=True)