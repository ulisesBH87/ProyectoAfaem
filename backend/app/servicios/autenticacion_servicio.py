from sqlalchemy.orm import Session
from app.core import seguridad

from app.modelos.usuario_modelo import Usuario
from app.modelos.persona_modelo import Personas

from app.repositorios import usuario_repositorio
class CorreoYaRegistradoError(Exception):
    pass

class AutenticacionServicio:

    def __init__(self, db:Session):
        self.db = db

    def registrar_admin(self, data):
        salt = seguridad.generar_salt()
        hashed_password = seguridad.generar_hash(salt, data.Contrasena)

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

        return usuario_repositorio.registrar_admin_repo(self.db, datos_persona, datos_usuario)

    def registrar_usuario(self, data):

        correo_existente = usuario_repositorio.obtener_por_correo(self.db, data.Correo)
        if correo_existente:
            raise CorreoYaRegistradoError()
        
        salt = seguridad.generar_salt()
        hashed_password = seguridad.generar_hash(salt, data.Contrasena)

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

        return usuario_repositorio.registrar_usuario_repo(self.db, datos_persona, datos_usuario)


    def iniciar_sesion(self, correo: str, contrasena: str):

        usuarioIntentoSesion = usuario_repositorio.obtener_por_correo(self.db, correo)

        if not usuarioIntentoSesion:
            return None

        if not seguridad.verificar_contrasena(contrasena, usuarioIntentoSesion.Contrasena, usuarioIntentoSesion.Salt):
            return None

        return usuarioIntentoSesion


    def cambiar_contrasena(self, usuario_id, contrasena_actual, nueva_contrasena):

        usuario = usuario_repositorio.obtener_usuario_por_id(self.db, usuario_id)
        if not usuario:
            return False

        if not seguridad.verificar_contrasena(contrasena_actual, usuario.Contrasena, usuario.Salt):
            return False

        nuevo_salt = seguridad.generar_salt()
        nuevo_hash = seguridad.generar_hash(nuevo_salt, nueva_contrasena)

        usuario_repositorio.cambiar_contrasena_repo(self.db, usuario_id, nuevo_hash, nuevo_salt)

        return True