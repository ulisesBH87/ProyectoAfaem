from sqlalchemy import Column, Integer, String, CHAR, Date, Boolean, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base

class Usuario(Base):
    __tablename__ = "Usuarios"

    UsuarioId = Column(Integer, primary_key=True)
    Nombre = Column(String(50),nullable=False)
    PrimerApellido = Column(String(50), nullable=False)
    SegundoApellido = Column(String(50))

    CURP = Column(CHAR(18), nullable=True, index=True)
    RFC = Column(CHAR(13), nullable=True)
    __table_args__ = (
        CheckConstraint('LEN(CURP) = 18', name='check_curp_longitud'),
        CheckConstraint('LEN(RFC) = 13', name='check_rfc_longitud'),
    )


    NUI = Column(String(60), nullable=True, index=True)

    SexoId = Column(Integer, ForeignKey("CatalogoSexo.SexoId"), nullable=True)
    Sexo = relationship("CatalogoSexo")

    FechaNacimiento = Column(Date, nullable=True)

    Correo = Column(String(100), unique=True, nullable=False, index=True)
    Contrasena = Column(String(256), nullable=False)

    Estatus = Column(Boolean, default=True, nullable=False)
    Eliminado = Column(Boolean, default=False, nullable=False)

    Salt = Column(String(32), nullable=False)