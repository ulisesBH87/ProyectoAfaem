from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.seguridad import crear_token, verificar_token, obtener_usuario_actual
from app.db.sesion import get_db
from app.esquemas.usuario_esquema import RegistroUsuario, InicioSesion, CambiarContrasena
from app.esquemas.auth_esquema import TokenResponse
from app.servicios.autenticacion_servicio import registrar_usuario, iniciar_sesion, cambiar_contrasena_servicio

router = APIRouter(prefix="/auth",tags=["Auth"])

@router.post("/registro")
def register(data: RegistroUsuario, db:Session = Depends(get_db)):
    registrar_usuario(db, data)
    return {"message": "Usuario registrado correctamente"}

@router.post("/iniciar-sesion", response_model=TokenResponse)
def login(data: InicioSesion, db:Session = Depends(get_db)) -> TokenResponse:
    usuarioIntentoSesion = iniciar_sesion(db, data.Correo, data.Contrasena)

    if not usuarioIntentoSesion:
        raise HTTPException(
            status_code = status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas"
        )

    datos_token = {
        "sub": str(usuarioIntentoSesion.UsuarioId),
        "correo": usuarioIntentoSesion.Correo
    }

    token_generado = crear_token(datos_token)

    return {
        "access_token": token_generado,
        "token_type": "bearer"
    }

@router.post("/cambiar-contrasena")
def cambiar_contrasena(data: CambiarContrasena, db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):

    cambio = cambiar_contrasena_servicio(db, usuario.UsuarioId, data.ContrasenaActual, data.NuevaContrasena)

    if not cambio:
        raise HTTPException(
            status_code = status.HTTP_400_BAD_REQUEST,
            detail="Contraseña actual incorrecta"
        )

    return {"message": "Contraseña cambiada correctamente"}