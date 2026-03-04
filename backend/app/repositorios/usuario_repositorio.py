from sqlalchemy.orm import Session
from app.modelos.usuario_modelo import Usuario

# Métodos para obtener el usuario
def obtener_por_correo(db: Session, correo: str):
    return db.query(Usuario).filter(Usuario.Correo == correo).first()

def obtener_usuario_por_id(db:Session, usuario_id: int):
    return db.query(Usuario).filter(Usuario.UsuarioId == usuario_id).first()


# Registro
def crear_usuario(db: Session, usuario: Usuario):
    db.add(usuario)
    db.flush() #obtener el user.id

    db.commit()
    db.refresh(usuario)

    return usuario

def obtener_por_correo(db: Session, correo: str):
    return db.query(Usuario).filter (Usuario.Correo == correo).first()
