from sqlalchemy.orm import Session
from app.modelos.usuario_modelo import Usuario
from app.modelos.persona_modelo import Personas
from app.repositorios.usuario_repositorio import registrar_usuario_repo, obtener_por_correo, obtener_usuario_por_id, cambiar_contrasena_repo, registrar_admin_repo
from app.core.seguridad import generar_hash, verificar_contrasena, generar_salt

class CorreoYaRegistradoError(Exception):
    pass

def registrar_usuario_servicio(data, db: Session):
    
    correo_existente = obtener_por_correo(db, data.Correo)
    if correo_existente:
        raise CorreoYaRegistradoError()
    
    salt = generar_salt()
    hashed_password = generar_hash(salt, data.Contrasena)

    datos_persona = Personas(
        Nombre=data.Nombre,
        PrimerApellido=data.PrimerApellido,
        SegundoApellido=data.SegundoApellido
    )

    datos_usuario = Usuario(
        Correo=data.Correo,
        Contrasena=hashed_password,
        Salt=salt
    )

    return registrar_usuario_repo(db, datos_persona, datos_usuario)


def registrar_admin_servicio(data, db: Session):
    salt = generar_salt()
    hashed_password = generar_hash(salt, data.Contrasena)

    datos_persona = Personas(
        Nombre=data.Nombre,
        PrimerApellido=data.PrimerApellido,
        SegundoApellido=data.SegundoApellido
    )

    datos_usuario = Usuario(
        Correo=data.Correo,
        Contrasena=hashed_password,
        Salt=salt,
        RolId = data.RolId
    )

    return registrar_admin_repo(db, datos_persona, datos_usuario)


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