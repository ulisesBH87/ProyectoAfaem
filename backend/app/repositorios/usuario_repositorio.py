from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.modelos.usuario_modelo import Usuario
from app.modelos.persona_modelo import Personas

from app.excepciones import usuario_excepciones
from app.enums.roles_enum import Rol

# Métodos para obtener el usuario   
def obtener_por_correo(db: Session, correo: str):
    return db.query(Usuario).filter(Usuario.Correo == correo).first()

def obtener_usuario_por_id(db:Session, usuario_id: int):
    return db.query(Usuario).filter(Usuario.UsuarioId == usuario_id).first()


# Registro
def registrar_usuario_repo(db: Session, persona: Personas, usuario: Usuario):
    try:
        db.add(persona)
        db.flush() #generar id de la persona sin hacer commit

        usuario.PersonaId = persona.PersonaId
        usuario.RolId = Rol.INVITADO

        db.add(usuario)

        db.commit()

        db.refresh(persona)
        db.refresh(usuario)

        return persona, usuario

    except IntegrityError as e:
        db.rollback()
        if "check_curp_persona_longitud" in str(e):
            raise usuario_excepciones.CurpInvalidaError()
        else:
            raise usuario_excepciones.ErrorRegistroUsuario(str(e))

# Registro
def registrar_admin_repo(db: Session, persona: Personas, usuario: Usuario):
    try:
        db.add(persona)
        db.flush() #generar id de la persona sin hacer commit

        usuario.PersonaId = persona.PersonaId

        db.add(usuario)

        db.commit()

        db.refresh(persona)
        db.refresh(usuario)

        return persona, usuario

    except IntegrityError as e:
        db.rollback()
        if "check_curp_persona_longitud" in str(e):
            raise usuario_excepciones.CurpInvalidaError()
        else:
            raise usuario_excepciones.ErrorRegistroUsuario(str(e))

# Contraseña
def cambiar_contrasena_repo(db: Session, usuario_id: int, hash: str, salt: str):
    try:
        usuario = obtener_usuario_por_id(db, usuario_id)

        if not usuario:
            return False

        usuario.Contrasena = hash
        usuario.Salt = salt

        db.commit()

    except Exception as e:
        db.rollback()
        raise usuario_excepciones.ContraseñaError(str(e))
    
    return True