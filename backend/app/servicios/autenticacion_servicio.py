from sqlalchemy.orm import Session
from app.core import seguridad

from app.modelos.usuario_modelo import Usuario
from app.modelos.persona_modelo import Personas

from app.repositorios import autenticacion_repositorio
from app.repositorios import usuario_repositorio

from app.excepciones import usuario_excepciones
from sqlalchemy.exc import IntegrityError
class AutenticacionServicio:

    def __init__(self, db:Session):
        self.db = db

    # == REGISTRO ==
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
        try:
            persona, usuario = autenticacion_repositorio.registrar_admin_repo(self.db, datos_persona, datos_usuario)
            return persona, usuario
        
        except IntegrityError:
            self.db.rollback()
            raise usuario_excepciones.CorreoYaRegistradoError()
        except Exception:
            self.db.rollback()
            raise usuario_excepciones.ErrorRegistroUsuario()

    def registrar_usuario(self, data):

        usuario_existe = usuario_repositorio.obtener_por_correo(self.db, data.Correo)
        if usuario_existe:
            raise usuario_excepciones.CorreoYaRegistradoError()
        
        salt = seguridad.generar_salt()
        hashed_password = seguridad.generar_hash(salt, data.Contrasena)

        datos_persona = Personas(
            Nombre=data.Nombre,
            PrimerApellido=data.PrimerApellido,
            SegundoApellido=data.SegundoApellido,
            NumeroTelefono=data.NumeroTelefono
        )

        datos_usuario = Usuario(
            Correo=data.Correo,
            Contrasena=hashed_password,
            Salt=salt,
            Estatus=1,
            Eliminado=0
        )

        try:
            usuario = autenticacion_repositorio.registrar_usuario_repo(self.db, datos_persona, datos_usuario)
            return usuario
        
        except IntegrityError:
            self.db.rollback()
            raise usuario_excepciones.CorreoYaRegistradoError()
        except Exception:
            self.db.rollback()
            raise usuario_excepciones.ErrorRegistroUsuario()


    # == INICIAR SESIÓN ==
    def iniciar_sesion(self, correo: str, contrasena: str):

        usuarioIntentoSesion = usuario_repositorio.obtener_por_correo(self.db, correo)

        if not usuarioIntentoSesion:
            raise usuario_excepciones.CredencialesInvalidasError()

        if not seguridad.verificar_contrasena(contrasena, usuarioIntentoSesion.Contrasena, usuarioIntentoSesion.Salt):
            raise usuario_excepciones.CredencialesInvalidasError()

        # Obtener EstatusId (solo para Presidentes de Equipo)
        estatus_id = None

        if usuarioIntentoSesion.PersonaRelacion:
            presidente = autenticacion_repositorio.obtener_estatus_presidente(self.db, usuarioIntentoSesion.PersonaRelacion.PersonaId)
            
            if presidente:
                estatus_id = presidente.EstatusId

        return usuarioIntentoSesion, estatus_id


    # == CAMBIAR CONTRASEÑA ==
    def cambiar_contrasena(self, usuario_id, contrasena_actual, nueva_contrasena):

        usuario = autenticacion_repositorio.obtener_usuario_por_id(self.db, usuario_id)
        if not usuario:
            raise usuario_excepciones.UsuarioNoEncontradoError()

        if not seguridad.verificar_contrasena(contrasena_actual, usuario.Contrasena, usuario.Salt):
            raise usuario_excepciones.CredencialesInvalidasError()

        try:

            nuevo_salt = seguridad.generar_salt()
            nuevo_hash = seguridad.generar_hash(nuevo_salt, nueva_contrasena)

            autenticacion_repositorio.cambiar_contrasena_repo(self.db, usuario, nuevo_hash, nuevo_salt)

        except Exception:
            raise usuario_excepciones.ErrorCambioContrasena()
        
        return True