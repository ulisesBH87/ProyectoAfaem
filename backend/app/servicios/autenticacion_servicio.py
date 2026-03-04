from sqlalchemy.orm import Session
from app.modelos.usuario_modelo import Usuario
from app.repositorios.usuario_repositorio import crear_usuario, obtener_por_correo, obtener_usuario_por_id, cambiar_contrasena_repo
from app.core.seguridad import generar_hash, verificar_contrasena, generar_salt

salt = generar_salt()

def registrar_usuario(db: Session, data):
    hashed_password = generar_hash(salt, data.Contrasena)

    user = Usuario(
        Nombre=data.Nombre,
        PrimerApellido=data.PrimerApellido,
        SegundoApellido=data.SegundoApellido,
        Correo=data.Correo,
        Contrasena=hashed_password,
        Salt=salt
    )

    return crear_usuario(db, user)


def iniciar_sesion(db: Session, correo: str, contrasena: str):

    usuarioIntentoSesion = obtener_por_correo(db, correo)

    if not usuarioIntentoSesion:
        return None

    if not verificar_contrasena(contrasena, usuarioIntentoSesion.Contrasena, usuarioIntentoSesion.Salt):
        return None

    return usuarioIntentoSesion


def cambiar_contrasena_servicio(db, usuario_id, contrasena_actual, nueva_contrasena):

    usuario = obtener_usuario_por_id(db, usuario_id)
    if not usuario:
        return False

    if not verificar_contrasena(contrasena_actual, usuario.Contrasena, usuario.Salt):
        return False

    nuevo_salt = generar_salt()
    nuevo_hash = generar_hash(nuevo_salt, nueva_contrasena)

    cambiar_contrasena_repo(db, usuario_id, nuevo_hash, nuevo_salt)

    return True