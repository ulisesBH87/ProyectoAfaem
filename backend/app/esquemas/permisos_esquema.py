from pydantic import BaseModel, ConfigDict
from typing import List, Optional

class MenuEsquema(BaseModel):
    MenuId: int
    Nombre: str
    Ruta: Optional[str] = None
    Icono: Optional[str] = None
    Orden: int
    MenuPadreId: Optional[int] = None
    SubMenus: List["MenuEsquema"] = []
    
    model_config = ConfigDict(from_attributes=True)

class PermisoEsquema(BaseModel):
    PermisoId: int
    Nombre: str
    Slug: str
    model_config = ConfigDict(from_attributes=True)

class UserAccessEsquema(BaseModel):
    Roles: List[str]
    Permisos: List[str]
    Menus: List[MenuEsquema]
    EstatusId: Optional[int] = None
