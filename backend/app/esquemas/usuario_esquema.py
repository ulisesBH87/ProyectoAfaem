from pydantic import BaseModel, EmailStr, Field

class RegistroUsuario(BaseModel):
    Nombre: str
    PrimerApellido: str
    SegundoApellido: str | None
    Correo: EmailStr
    Contrasena: str = Field(min_length=8, max_length=50)
    NumeroTelefono: str = Field(min_length=7, max_length=20)


class InicioSesion(BaseModel):
    Correo: EmailStr
    Contrasena: str