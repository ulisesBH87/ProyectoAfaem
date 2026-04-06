import sys
import os

from app.db.sesion import SessionLocal
from app.modelos.usuario_modelo import Usuario
from app.modelos.documentos_entregados_modelo import DocumentosEntregados

db = SessionLocal()
usuarios = db.query(Usuario).all()
print("=== ESTADO DE USUARIOS Y DOCUMENTOS ===")
for u in usuarios:
    docs = db.query(DocumentosEntregados).filter(DocumentosEntregados.PersonaId == u.PersonaId).all()
    print(f"Usuario ID={u.UsuarioId}, Correo={u.Correo}, RolId={u.RolId}, PersonaId={u.PersonaId} -> Documentos={len(docs)}")
