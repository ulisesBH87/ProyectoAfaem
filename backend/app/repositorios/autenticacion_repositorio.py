from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.modelos.usuario_modelo import Usuario
from app.modelos.persona_modelo import Personas

from app.excepciones import usuario_excepciones
from app.enums.roles_enum import Rol

from app.repositorios.usuario_repositorio import obtener_usuario_por_id


# Registro
def registrar_usuario_repo(db: Session, persona: Personas, usuario: Usuario):
    
    db.add(persona)
    db.flush() #generar id de la persona sin hacer commit

    usuario.PersonaId = persona.PersonaId
    usuario.RolId = Rol.INVITADO

    db.add(usuario)

    db.refresh(persona)
    db.refresh(usuario)

    return persona, usuario

# Registro
def registrar_admin_repo(db: Session, persona: Personas, usuario: Usuario):
    
    db.add(persona)
    db.flush() #generar id de la persona sin hacer commit

    usuario.PersonaId = persona.PersonaId

    db.add(usuario)

    db.commit()

    db.refresh(persona)
    db.refresh(usuario)

    return persona, usuario

# Contraseña
def cambiar_contrasena_repo(db: Session, usuario_id: int, hash: str, salt: str):

    usuario = obtener_usuario_por_id(db, usuario_id)

    if not usuario:
        return None

    usuario.Contrasena = hash
    usuario.Salt = salt

    db.flush()

    return usuario