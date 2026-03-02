from sqlalchemy.orm import Session
from app.modelos.usuario_modelo import Usuario

def crear_usuario(db: Session, usuario: Usuario):
    db.add(usuario)
    db.flush() #obtener el user.id

    db.commit()
    db.refresh(usuario)

    return usuario

def obtener_por_correo(db: Session, correo: str):
    return db.query(Usuario).filter (Usuario.Correo == correo).first()
