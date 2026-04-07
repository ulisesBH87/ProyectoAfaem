import hmac
import hashlib
import secrets

from jose import JWTError, jwt
from app.db.sesion import get_db
from sqlalchemy.orm import Session
from app.modelos.usuario_modelo import Usuario
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException, status
from datetime import datetime, timedelta, timezone
from app.repositorios.usuario_repositorio import obtener_usuario_por_id

from app.core.config import obtener_configuracion

config = obtener_configuracion()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/iniciar-sesion")


#Contraseñas
def generar_salt():
    return secrets.token_hex(16)

def generar_hash(salt: str, contrasena: str):
    hash_generado = hashlib.sha256(
        (salt+contrasena).encode()
    ).hexdigest()

    return hash_generado

def verificar_contrasena(contrasena_plana: str, hash_guardado: str, salt) -> bool:
    hash_nuevo = hashlib.sha256(
        (salt+contrasena_plana).encode()
        ).hexdigest()

    return hmac.compare_digest(hash_nuevo, hash_guardado)


#JWT
def crear_token(data: dict) -> str:
    datos = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES
    )

    datos.update(
        {
            "sub": str(data["sub"]),
            "exp": expire,      #fecha de expiración agregada al payload del token
            "type": "access"
        }
    )

    token = jwt.encode(
        datos,
        config.SECRET_KEY,
        algorithm=config.ALGORITHM
    )

    return token

def verificar_token(token: str):
    try:
        payload = jwt.decode(
            token,
            config.SECRET_KEY,
            algorithms=[config.ALGORITHM]
        )

        return payload

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado"
        )


#Usuarios

#Obtener desde token
def obtener_usuario_actual(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = verificar_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado"
        )

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tipo de token inválido"
        )
    
    usuario_id = payload.get("sub")
    if usuario_id is None:
        raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido"
        )

    usuario_id = int(usuario_id)
    if usuario_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido"
        )

    usuario = obtener_usuario_por_id(db, usuario_id)

    if usuario is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado"
        )

    return usuario


def requerir_roles(*roles_permitidos):

    def verificador(usuario = Depends(obtener_usuario_actual)):

        if usuario.Rol.Nombre not in roles_permitidos:
            raise HTTPException(
                status_code = status.HTTP_403_FORBIDDEN,
                detail = "No tienes permiso para acceder"
            )

        return usuario

    return verificador