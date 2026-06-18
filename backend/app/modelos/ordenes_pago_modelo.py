from sqlalchemy import Column, Integer, String, DECIMAL, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.db.base import Base

class OrdenPago(Base):
    __tablename__ = "OrdenDePago"
    OrdenPagoId = Column(Integer, primary_key=True)
    UsuarioId = Column(Integer, ForeignKey("Usuarios.UsuarioId"), nullable=False)
    UsuarioPagoRelacion = relationship("Usuario", back_populates="OrdenPagoRelacion")

    FechaDePago = Column(DateTime)
    FechaEnvio = Column(DateTime)
    RutaVoucher = Column(String)

    EstatusPagoId = Column(Integer, ForeignKey("CatalogoEstatusPago.EstatusPagoId"), nullable=False)
    EstatusPagoRelacion = relationship("EstatusPago", back_populates="OrdenPagoRelacion")

    TotalPagar = Column(DECIMAL(7,2), nullable=False)

    OrdenPagoDetalleRelacion = relationship("OrdenPagoDetalle", back_populates="OrdenPagoRelacion", lazy="selectin")

    EquipoTemporalRelacion = relationship("EquipoTemporal", back_populates="OrdenPagoRelacion")

    SolicitudId = Column(Integer, ForeignKey("Solicitudes.SolicitudId"), nullable=False)
    ReferenciaPago = Column(String(8), unique=True, nullable=True)