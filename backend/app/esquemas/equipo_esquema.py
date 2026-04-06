from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List

class JugadorPersona(BaseModel):
    nombre: str
    primer_apellido: str
    segundo_apellido: Optional[str] = None
    curp: str
    sexo_id: int
    fecha_nacimiento: date

# --- SCHEMAS FOR PERSISTENT TABLES ---

class EquipoResponse(BaseModel):
    EquipoId: int
    NombreEquipo: str
    FechaCreacion: datetime
    Categoria: str
    Liga: str
    Modalidad: str
    Rama: str
    NumeroJugadores: int
    Estatus: bool
    SolicitudId: Optional[int] = None

    class Config:
        from_attributes = True

class MiembroResponse(BaseModel):
    MiembroEquipoId: int
    NombreCompleto: str
    Rol: str
    Equipo: str
    FechaIngreso: datetime
    Estatus: bool

    class Config:
        from_attributes = True

# --- NEW SCHEMAS FOR CREATION ---

class CatalogoItem(BaseModel):
    id: int
    nombre: str

class CatalogosRegistroResponse(BaseModel):
    ligas: List[CatalogoItem]
    categorias: List[CatalogoItem]
    modalidades: List[CatalogoItem]
    ramas: List[CatalogoItem]
    seguros: List[dict]
    combinaciones: List[dict] # To hold valid [LigaId, ModalidadId, CategoriaId, RamaId]

class JugadorCreate(BaseModel):
    nombre: str
    primer_apellido: str
    segundo_apellido: Optional[str] = None
    curp: str
    sexo_id: int
    fecha_nacimiento: str
    seguro_tipo_id: int

class EquipoCreate(BaseModel):
    nombre_equipo: str
    liga_mod_cat_ram_id: int
    jugadores: List[JugadorCreate]

# --- NUEVOS ESQUEMAS PARA DIRECTORIO GLOBAL ADMIN ---

class DirectorioEquipoResponse(BaseModel):
    EquipoId: int
    NombreEquipo: str
    Liga: str
    Categoria: str
    Modalidad: str
    Rama: str
    PresidenteNombreCompleto: str
    PresidenteEmail: str
    NumeroJugadoresRegistrados: int
    FechaCreacion: datetime
    Estatus: bool

    class Config:
        from_attributes = True

class DirectorioJugadorResponse(BaseModel):
    MiembroEquipoId: int
    NombreCompleto: str
    CURP: str
    Sexo: str
    EquipoNombre: str
    Liga: str
    FechaIngreso: datetime
    Estatus: bool

    class Config:
        from_attributes = True