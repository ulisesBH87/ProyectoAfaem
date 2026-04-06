from pydantic import BaseModel

class UsuarioToken(BaseModel):
    id: int
    correo: str
    rol: str
    estatusId: int | None = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    usuario: UsuarioToken