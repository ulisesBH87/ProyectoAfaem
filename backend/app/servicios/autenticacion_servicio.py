from sqlalchemy.orm import Session
from app.modelos.usuario_modelo import Usuario
from app.repositorios.usuario_repositorio import crear_usuario
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
    usuarioIntentoSesion = db.query(Usuario).filter(Usuario.Correo == correo).first()
    if usuarioIntentoSesion and verificar_contrasena(contrasena, usuarioIntentoSesion.Contrasena, usuarioIntentoSesion.Salt):
        return usuarioIntentoSesion
    return None