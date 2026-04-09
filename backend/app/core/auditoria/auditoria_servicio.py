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
    db,
    entidad,
    registro_id,
    accion_id,
    valores_antes,
    valores_despues
):
    
    user_id = usuario_actual_id.get()
    if not user_id:
        user_id = SYSTEM_USER_ID

    usuario_nombre = obtener_nombre_usuario(db, user_id)
    ip = ip_actual.get()

    return {
        "EntidadAfectada": entidad,
        "RegistroId": str(registro_id),
        "AccionId": accion_id,
        "UsuarioId": user_id,
        "UsuarioNombre": usuario_nombre,
        "FechaAccion": datetime.utcnow(),
        "ValoresAntes": json.dumps(valores_antes) if valores_antes else None,
        "ValoresDespues": json.dumps(valores_despues) if valores_despues else None,
        "Ip": ip
    }

#Obtener nombre de usuario al momento de realizar la acción
def obtener_nombre_usuario(db, user_id):
    if not user_id:
        return "SYSTEM"

    usuario = db.query(Usuario).get(user_id)
    if not usuario:
        return "SYSTEM"

    persona = db.query(Personas).get(usuario.PersonaId)
    if not persona:
        return "SYSTEM"

    return f"{persona.Nombre} {persona.PrimerApellido} {persona.SegundoApellido}".strip()

#Visualización de registros
def construir_descripcion(auditoria, usuario_nombre, antes, despues):

    accion = auditoria.CatalogoAccion.Accion
    entidad = auditoria.EntidadAfectada

    fuente = despues if accion == "CREATE" else antes

    nombre = ""

    if entidad == "Personas":
        nombre = f"{fuente.get('Nombre', '')} {fuente.get('PrimerApellido', '')}".strip()

        if not nombre:
            nombre = f"{despues.get('Nombre', '')} {despues.get('PrimerApellido', '')}".strip()

    elif entidad == "Equipos":
        nombre = fuente.get("NombreEquipo", "") or despues.get("NombreEquipo", "")

    if accion == "CREATE":
        return f"{usuario_nombre} creó {entidad} {nombre}".strip()

    elif accion == "UPDATE":

        cambios = []

        for campo in despues:
            valor_antes = antes.get(campo)
            valor_despues = despues.get(campo)

            cambios.append(f"{campo}: '{valor_antes}' → '{valor_despues}'")

        detalle = ", ".join(cambios)

        return f"{usuario_nombre} editó {entidad} {nombre} ({detalle})".strip()

    elif accion == "DELETE":
        return f"{usuario_nombre} eliminó {entidad} {nombre}".strip()

    return "Acción desconocida"


def obtener_auditorias(db: Session):

    auditorias = (
        db.query(Auditoria)
        .join(CatalogoAccion)
        .all()
    )

    resultado = []

    for a in auditorias:

        nombre_completo = a.UsuarioNombre or "SYSTEM"

        antes = json.loads(a.ValoresAntes) if a.ValoresAntes else {}
        despues = json.loads(a.ValoresDespues) if a.ValoresDespues else {}

        if despues:
            despues.pop("PersonaId", None)

        descripcion = construir_descripcion(a, nombre_completo, antes, despues)

        resultado.append({
            "AuditoriaId": a.AuditoriaId,
            "EntidadAfectada": a.EntidadAfectada,
            "RegistroId": a.RegistroId,
            "Accion": a.CatalogoAccion.Accion,
            "Usuario": nombre_completo,
            "FechaAccion": a.FechaAccion,
            "Descripcion": descripcion,
            "ValoresAntes": antes,
            "ValoresDespues": despues
        })

    return resultado