from sqlalchemy import Column, Integer, String, Boolean
from app.db.base import Base

class AntecedentesInternacionales(Base):
    __tablename__ = "AntecedentesInternacionales"

    AntecedentesId = Column(Integer, primary_key=True, index=True)
    Nacionalidades = Column(String(50), nullable=True)
    PaisResidenciaActual = Column(String(50), nullable=True)
    Extranjero = Column(Boolean, nullable=True)
    NacionalidadPadre = Column(String(50), nullable=True)
    NacionalidadMadre = Column(String(50), nullable=True)
    NacionalidadAbueloP = Column(String(50), nullable=True)
    NacionalidadAbuelaP = Column(String(50), nullable=True)
    NacionalidadAbueloM = Column(String(50), nullable=True)
    NacionalidadAbuelaM = Column(String(50), nullable=True)
    RegistroAsociacionExtranjera = Column(String(100), nullable=True)
    ParticipacionExtranjera = Column(String(100), nullable=True)
