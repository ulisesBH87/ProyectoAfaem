from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.modelos.usuario_modelo import Usuario
from app.modelos.persona_modelo import Personas

from app.enums.roles_enum import Rol

# Métodos para obtener el usuario   
def obtener_por_correo(db: Session, correo: str):
    return db.query(Usuario).filter(Usuario.Correo == correo).first()

def obtener_usuario_por_id(db:Session, usuario_id: int):
    return db.query(Usuario).filter(Usuario.UsuarioId == usuario_id).first()