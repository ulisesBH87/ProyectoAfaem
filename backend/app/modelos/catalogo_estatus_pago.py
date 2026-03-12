from sqlalchemy import Column, Integer, String, DECIMAL
from sqlalchemy.orm import relationship
from app.db.base import Base

class EstatusPago(Base):
    __tablename__ = "CatalogoEstatusPago"
    EstatusPagoId = Column(Integer, primary_key=True)
    Nombre = Column(String)