import hashlib
import hmac
import secrets

from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from app.db.sesion import get_db
from app.modelos.usuario_modelo import Usuario
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import obtener_configuracion

config = obtener_configuracion()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/iniciar-sesion")

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

    #fecha de expiración agregada al payload del token
    datos.update(
        {
            "sub": str(data["UsuarioId"]),
            "exp": expire,
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
    
    usuario = db.query(Usuario).filter(Usuario.UsuarioId == usuario_id).first()

    if usuario is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )

    return usuario

#desde el front se manda el #bearer #header