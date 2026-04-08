import json
from datetime import datetime
from app.utilidades.context import usuario_actual_id, ip_actual

from sqlalchemy.orm import Session
from app.modelos.auditoria import Auditoria
from app.modelos.usuario_modelo import Usuario
from app.modelos.persona_modelo import Personas
from app.modelos.catalogo_accion import CatalogoAccion

SYSTEM_USER_ID = 0

#CREACIÓN DE REGISTRO
def build_audit_entry(
    entidad,
    registro_id,
    accion_id,
    valores_antes,
    valores_despues
):
    usuario_id = usuario_actual_id.get() or SYSTEM_USER_ID
    ip = ip_actual.get()

    return {
        "EntidadAfectada": entidad,
        "RegistroId": str(registro_id),
        "AccionId": accion_id,
        "UsuarioId": usuario_id,
        "FechaAccion": datetime.utcnow(),
        "ValoresAntes": json.dumps(valores_antes) if valores_antes else None,
        "ValoresDespues": json.dumps(valores_despues) if valores_despues else None,
        "Ip": ip
    }

#Visualización de registros
def construir_descripcion(auditoria, usuario_nombre):

    accion = auditoria.CatalogoAccion.Accion

    antes = json.loads(auditoria.ValoresAntes) if auditoria.ValoresAntes else {}
    despues = json.loads(auditoria.ValoresDespues) if auditoria.ValoresDespues else {}

    entidad = auditoria.EntidadAfectada

    nombre = ""

    
    fuente = despues if accion == "CREATE" else antes

    if entidad == "Personas":
        nombre = f"{fuente.get('Nombre', '')} {fuente.get('PrimerApellido', '')}".strip()

    elif entidad == "Equipos":
        nombre = fuente.get("NombreEquipo", "")

    if accion == "CREATE":
        return f"{usuario_nombre} creó {entidad} {nombre}"

    elif accion == "UPDATE":
        campos = ", ".join(despues.keys())
        return f"{usuario_nombre} editó {entidad} {nombre} ({campos})"

    elif accion == "DELETE":
        return f"{usuario_nombre} eliminó {entidad} {nombre}"

    return "Acción desconocida"


def obtener_auditorias(db: Session):

    auditorias = (
        db.query(Auditoria)
        .join(CatalogoAccion)
        .all()
    )

    resultado = []

    for a in auditorias:

        usuario = db.query(Usuario).get(a.UsuarioId)

        if usuario:
            persona = db.query(Personas).get(usuario.PersonaId)
            usuario_nombre = persona.Nombre if persona else "SYSTEM"
        else:
            usuario_nombre = "SYSTEM"

        descripcion = construir_descripcion(a, usuario_nombre)

        antes = json.loads(a.ValoresAntes) if a.ValoresAntes else None
        despues = json.loads(a.ValoresDespues) if a.ValoresDespues else None

        resultado.append({
            "AuditoriaId": a.AuditoriaId,
            "EntidadAfectada": a.EntidadAfectada,
            "RegistroId": a.RegistroId,
            "Accion": a.CatalogoAccion.Accion,
            "Usuario": usuario_nombre,
            "FechaAccion": a.FechaAccion,
            "Descripcion": descripcion,
            "ValoresAntes": antes,
            "ValoresDespues": despues
        })

    return resultado