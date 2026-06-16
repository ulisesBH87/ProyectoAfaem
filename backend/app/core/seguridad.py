import hmac
import hashlib
import secrets

from jose import JWTError, jwt
from app.db.sesion import get_db
from sqlalchemy.orm import Session
from app.modelos.usuario_modelo import Usuario
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException, status, Request
from datetime import datetime, timedelta, timezone
from app.repositorios.usuario_repositorio import obtener_usuario_por_id

from app.core.config import obtener_configuracion

config = obtener_configuracion()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/iniciar-sesion")


#Contraseñas
def generar_salt():
    return secrets.token_hex(16)

def generar_hash_con_salt(salt: str, texto_plano: str):
    hash_generado = hashlib.sha256(
        (salt + texto_plano).encode()
    ).hexdigest()

    return hash_generado

def verificar_hash_con_salt(texto_plano: str, hash_guardado: str, salt: str) -> bool:
    hash_nuevo = hashlib.sha256(
        (salt + texto_plano).encode()
        ).hexdigest()

    return hmac.compare_digest(hash_nuevo, hash_guardado)

def generar_hash(salt: str, contrasena: str):
    return generar_hash_con_salt(salt, contrasena)

def verificar_contrasena(contrasena_plana: str, hash_guardado: str, salt) -> bool:
    return verificar_hash_con_salt(contrasena_plana, hash_guardado, salt)


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

def obtener_usuario_desde_token(token: str, db: Session):
    payload = verificar_token(token)

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

    usuario = obtener_usuario_por_id(db, usuario_id)

    if usuario is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado"
        )

    return usuario


def crear_token_sesion_temporal(usuario_id: int, invitacion_id: int = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    payload = {
        "sub": str(usuario_id),
        "invitacion_id": invitacion_id,
        "type": "temp_invitation_session",
        "exp": expire
    }
    token = jwt.encode(
        payload,
        config.SECRET_KEY,
        algorithm=config.ALGORITHM
    )
    return token


async def obtener_usuario_o_sesion_temporal(request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales de autenticación ausentes"
        )
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(
            token,
            config.SECRET_KEY,
            algorithms=[config.ALGORITHM]
        )
        token_type = payload.get("type")
        
        if token_type == "access":
            usuario_id = payload.get("sub")
            if not usuario_id:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token de acceso inválido")
            usuario = obtener_usuario_por_id(db, int(usuario_id))
            if not usuario:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")
            return {"type": "access", "usuario": usuario}
            
        elif token_type == "temp_invitation_session":
            usuario_id = payload.get("sub")
            if not usuario_id:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token temporal inválido")
            return {
                "type": "temp_invitation_session",
                "usuario_id": int(usuario_id),
                "invitacion_id": payload.get("invitacion_id")
            }
        else:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Tipo de token no soportado")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido o expirado")
