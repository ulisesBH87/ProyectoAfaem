from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from app.db.base import Base


class PresidenteInvitacion(Base):
    __tablename__ = "PresidenteInvitacion"

    PresidenteInvitacionId = Column(Integer, primary_key=True)

    UsuarioId = Column(
        ForeignKey("Usuarios.UsuarioId"),
        nullable=False
    )

    UsuarioRelacion = relationship(
        "Usuario",
        back_populates="PresidenteInvitacionRelacion"
    )

    TokenIdentificador = Column(
        String(64),
        unique=True,
        nullable=False
    )

    TokenHash = Column(
        String(255),
        nullable=False
    )

    FechaCreacion = Column(
        DateTime,
        nullable=False
    )

    FechaExpiracion = Column(
        DateTime,
        nullable=False
    )

    FechaUltimoAcceso = Column(
        DateTime,
        nullable=True
    )

    Activo = Column(
        Boolean,
        nullable=False,
        default=True
    )

    TokenSecreto = Column(
        String(255),
        nullable=True
    )