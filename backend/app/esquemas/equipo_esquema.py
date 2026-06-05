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
    nui: Optional[str] = None
    lugar_nacimiento: Optional[str] = None
    correo: Optional[str] = None
    telefono: Optional[str] = None

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
    RutaLogo: Optional[str] = None
    SolicitudId: Optional[int] = None
    SlotsComprados: Optional[int] = 0

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

class LigaCatalogoItem(BaseModel):
    id: int
    nombre: str
    modalidadId: Optional[int] = None
    categoriaId: Optional[int] = None
    ramaId: Optional[int] = None

class CatalogosRegistroResponse(BaseModel):
    ligas: List[LigaCatalogoItem]
    categorias: List[CatalogoItem]
    modalidades: List[CatalogoItem]
    ramas: List[CatalogoItem]
    seguros: List[dict]
    roles_equipo: List[CatalogoItem]
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
    LigaId: int
    Categoria: str
    CategoriaId: int
    Modalidad: str
    ModalidadId: int
    Rama: str
    RamaId: int
    PresidenteEquipoId: int
    PresidenteNombreCompleto: str
    PresidenteEmail: str
    NumeroJugadoresRegistrados: int
    FechaCreacion: datetime
    Estatus: bool

    class Config:
        from_attributes = True

class DirectorioJugadorResponse(BaseModel):
    MiembroEquipoId: int
    PersonaId: int
    NombreCompleto: str
    Nombre: str
    PrimerApellido: str
    SegundoApellido: Optional[str] = None
    CURP: str
    Sexo: str
    EquipoNombre: str
    Liga: str
    FechaIngreso: datetime
    Estatus: bool
    Email: Optional[str] = None
    FechaNacimiento: Optional[date] = None
    NUI: Optional[str] = None

    class Config:
        from_attributes = True

class EquipoUpdate(BaseModel):
    NombreEquipo: Optional[str] = None
    Estatus: Optional[bool] = None

class EquipoUpdateCompleto(BaseModel):
    NombreEquipo: Optional[str] = None
    Estatus: Optional[bool] = None
    PresidenteEquipoId: Optional[int] = None  # ID del nuevo presidente responsable
    LigaId: Optional[int] = None
    ModalidadId: Optional[int] = None
    CategoriaId: Optional[int] = None
    RamaId: Optional[int] = None

class JugadorUpdate(BaseModel):
    Nombre: Optional[str] = None
    PrimerApellido: Optional[str] = None
    SegundoApellido: Optional[str] = None
    CURP: Optional[str] = None
    Estatus: Optional[bool] = None
    # Campos adicionales editables
    Email: Optional[str] = None
    SexoId: Optional[int] = None        # 1=Masculino, 2=Femenino, 3=No Binario
    FechaNacimiento: Optional[date] = None
    NUI: Optional[str] = None

class PresidenteAdminCreate(BaseModel):
    nombre: str
    correo: str
    telefono: Optional[str] = None
    curp: str
    numPersonas: int
