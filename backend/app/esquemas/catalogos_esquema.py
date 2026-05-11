from pydantic import BaseModel
from typing import Optional

class CatalogoBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None

class CatalogoCreate(CatalogoBase):
    pass

class CatalogoUpdate(CatalogoBase):
    pass

class CatalogoResponse(CatalogoBase):
    id: int

    class Config:
        from_attributes = True
