from sqlalchemy import Column, Integer, String, CHAR, Date, Boolean, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base

class Personas(Base):
    __tablename__ = "Personas"
    
    PersonaId = Column(Integer, primary_key=True)
    Nombre = Column(String(50),nullable=False)
    PrimerApellido = Column(String(50), nullable=False)
    SegundoApellido = Column(String(50))

    CURP = Column(CHAR(18), nullable=True, index=True)
    RFC = Column(CHAR(13), nullable=True)
    __table_args__ = (
        CheckConstraint('LEN(CURP) = 18', name='check_curp_persona_longitud'),
        CheckConstraint('LEN(RFC) = 13', name='check_rfc_persona_longitud'),
    )

    NUI = Column(String(60), nullable=True, index=True)

    SexoId = Column(Integer, ForeignKey("CatalogoSexo.SexoId"), nullable=True)
    SexoRelacion = relationship("CatalogoSexo", back_populates="PersonaRelacion")

    FechaNacimiento = Column(Date, nullable=True)

    PresidenteEquipoRelacion = relationship("PresidenteEquipo", back_populates="PersonaRelacion")

    UsuarioRelacion = relationship("Usuario", back_populates="PersonaRelacion")
    
    EquipoTemporalJugadorRelacion = relationship("EquipoTemporalJugador", back_populates="PersonaRelacion")
    MiembrosRelacion = relationship("MiembrosEquipo", back_populates="PersonaRelacion")