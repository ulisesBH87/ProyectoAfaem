from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.seguridad import crear_token, verificar_token
from app.db.sesion import get_db
from app.esquemas.usuario_esquema import RegistroUsuario, InicioSesion
from app.servicios.autenticacion_servicio import registrar_usuario, iniciar_sesion

router = APIRouter(prefix="/auth",tags=["Auth"])

@router.post("/registro")
def register(data: RegistroUsuario, db:Session = Depends(get_db)):
    registrar_usuario(db, data)
    return {"message": "Usuario registrado correctamente"}

@router.post("/iniciar-sesion")
def login(data: InicioSesion, db:Session = Depends(get_db)):
    usuarioIntentoSesion = iniciar_sesion(db, data.Correo, data.Contrasena)

    if not usuarioIntentoSesion:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    datos_token = {
        "UsuarioId": str(usuarioIntentoSesion.UsuarioId),
        "correo": usuarioIntentoSesion.Correo
    }

    token_generado = crear_token(datos_token)

    return {
        "access_token": token_generado,
        "token_type": "bearer"
    }
