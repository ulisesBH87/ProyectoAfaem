from sqlalchemy.orm import Session
from app.modelos.usuario_modelo import Usuario
from app.modelos.persona_modelo import Personas

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
        usuario.RolId = 3

        db.add(usuario)

        db.commit()

        db.refresh(persona)
        db.refresh(usuario)

        return persona, usuario

    except Exception as e:
        db.rollback()
        raise e

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

    except Exception as e:
        db.rollback()
        raise e

# Contraseña
def cambiar_contrasena_repo(db: Session, usuario_id: int, hash: str, salt: str):

    usuario = obtener_usuario_por_id(db, usuario_id)

    if not usuario:
        return False

    usuario.Contrasena = hash
    usuario.Salt = salt

    db.commit()
    return True