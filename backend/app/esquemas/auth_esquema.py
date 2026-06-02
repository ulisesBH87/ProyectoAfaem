from pydantic import BaseModel

class UsuarioToken(BaseModel):
    id: int
    correo: str
    rol: str
    estatusId: int | None = None
    nombre: str | None = None
    nombreSolo: str | None = None
    primerApellido: str | None = None
    segundoApellido: str | None = None
    telefono: str | None = None
    curp: str | None = None
    sexoId: int | None = None
    fechaNacimiento: str | None = None
    lugarNacimiento: str | None = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    usuario: UsuarioToken