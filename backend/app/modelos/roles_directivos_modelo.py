from sqlalchemy import Column, Integer, String
from app.db.base import Base

class RolesDirectivos(Base):
    __tablename__ = "RolesDirectivos"

    IdDirectivo = Column(Integer, primary_key=True)
    Directivo = Column(String(50), nullable=False)
