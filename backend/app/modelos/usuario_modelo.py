from sqlalchemy import Column, Integer, String, CHAR, Date, Boolean, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base

class Usuario(Base):
    __tablename__ = "Usuarios"

    UsuarioId = Column(Integer, primary_key=True)

    PersonaId = Column(Integer, ForeignKey("Personas.PersonaId"), nullable=False)
    PersonaRelacion = relationship("Personas", back_populates="UsuarioRelacion")

    Correo = Column(String(100), unique=True, nullable=False, index=True)
    Contrasena = Column(String(256), nullable=False)
    Salt = Column(String(32), nullable=False)

    Estatus = Column(Boolean, default=True, nullable=False)
    Eliminado = Column(Boolean, default=False, nullable=False)

    SolicitudRelacion = relationship("Solicitud", back_populates="UsuarioRelacion")

    RolId = Column(Integer, ForeignKey("Roles.RolId"), nullable=False)
    RolRelacion = relationship("Roles", back_populates="UsuarioRelacion")

    # Nueva relación para múltiples roles
    RolesAsignados = relationship("RelUsuarioRoles", back_populates="UsuarioRelacion")

    OrdenPagoRelacion = relationship("OrdenPago", back_populates="UsuarioPagoRelacion")

    EquipoTemporalRelacion = relationship("EquipoTemporal", back_populates="UsuarioRelacion")


    PresidenteInvitacionRelacion = relationship("PresidenteInvitacion",back_populates="UsuarioRelacion")