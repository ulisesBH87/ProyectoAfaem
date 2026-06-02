from pydantic import BaseModel
from typing import Optional

class CatalogoBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None

class CatalogoCreate(CatalogoBase):
    modalidadId: Optional[int] = None
    categoriaId: Optional[int] = None
    ramaId: Optional[int] = None

class CatalogoUpdate(CatalogoBase):
    modalidadId: Optional[int] = None
    categoriaId: Optional[int] = None
    ramaId: Optional[int] = None

class CatalogoResponse(CatalogoBase):
    id: int
    modalidadId: Optional[int] = None
    categoriaId: Optional[int] = None
    ramaId: Optional[int] = None
    nombreModalidad: Optional[str] = None
    nombreCategoria: Optional[str] = None
    nombreRama: Optional[str] = None

    class Config:
        from_attributes = True
