import json
from datetime import datetime
from app.utilidades.context import usuario_actual_id, ip_actual

from sqlalchemy.orm import Session
from app.modelos.auditoria import Auditoria
from app.modelos.usuario_modelo import Usuario
from app.modelos.persona_modelo import Personas
from app.modelos.catalogo_accion import CatalogoAccion
from app.excepciones import auditoria_excepciones

SYSTEM_USER_ID = 0

#Traducciones para frontend
MAPEO_ENTIDADES = {
    "Personas": "Persona",
    "Usuarios": "Usuario",
    "Equipos": "Equipo"
}

MAPEO_ACCIONES = {
    "CREATE": "creado",
    "UPDATE": "actualizado",
    "DELETE": "eliminado"
}

# PROTECCIÓN DE JSON
def safe_json_load(value):
    try:
        return json.loads(value) if value else {}
    except Exception:
        return {}

#Traducción de acciones
def construir_cambios(antes, despues):
    cambios = []

    for campo in despues:
        cambios.append({
            "campo": campo,
            "antes": antes.get(campo),
            "despues": despues.get(campo)
        })

    return cambios

def construir_resumen(entidad, antes, despues, accion):

    fuente = despues if accion == "CREATE" else antes

    if entidad == "Personas":
        nombre_antes = f"{antes.get('Nombre', '')} {antes.get('PrimerApellido', '')}".strip()
        nombre_despues = f"{despues.get('Nombre', '')} {despues.get('PrimerApellido', '')}".strip()

        if accion == "UPDATE":
            return f"{nombre_antes} → {nombre_despues}"

        return nombre_despues

    elif entidad == "Equipos":
        return despues.get("NombreEquipo") or antes.get("NombreEquipo")

    elif entidad == "Usuarios":
        return despues.get("Correo") or antes.get("Correo")

    return ""

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
    
    try:
        if not user_id:
            return "SYSTEM"

        usuario = db.query(Usuario).get(user_id)
        if not usuario:
            return "SYSTEM"

        persona = db.query(Personas).get(usuario.PersonaId)
        if not persona:
            return "SYSTEM"

        return f"{persona.Nombre} {persona.PrimerApellido} {persona.SegundoApellido}".strip()
    
    except Exception:
        return "SYSTEM"
    
#Visualización de registros
def construir_descripcion(auditoria, usuario_nombre, antes, despues):

    accion = auditoria.CatalogoAccion.Accion
    entidad = auditoria.EntidadAfectada

    fuente = despues if accion == "CREATE" else antes

    nombre = ""

    # === PERSONAS ===
    if entidad == "Personas":
        nombre = f"{fuente.get('Nombre', '')} {fuente.get('PrimerApellido', '')}".strip()

        if not nombre:
            nombre = f"{despues.get('Nombre', '')} {despues.get('PrimerApellido', '')}".strip()


    # === EQUIPOS ===
    elif entidad == "Equipos":
        nombre = fuente.get("NombreEquipo", "") or despues.get("NombreEquipo", "")

    # === USUARIOS ===
    elif entidad == "Usuarios":
        fuente = despues if accion == "CREATE" else antes
        correo = fuente.get("Correo", "")

        if not correo:
            correo = despues.get("Correo", "")

        nombre = correo

    # === ACCIONES ===
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


def obtener_auditorias(db: Session, page: int, size: int):
    try:
        offset = (page - 1) * size
        total = db.query(Auditoria).count()

        auditorias = (
            db.query(Auditoria)
            .join(CatalogoAccion)
            .order_by(Auditoria.FechaAccion.desc())
            .offset(offset)
            .limit(size)
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

            entidad_legible = MAPEO_ENTIDADES.get(a.EntidadAfectada, a.EntidadAfectada)

            cambios = construir_cambios(antes, despues) if a.CatalogoAccion.Accion == "UPDATE" else []

            resumen = construir_resumen(
                a.EntidadAfectada,
                antes,
                despues,
                a.CatalogoAccion.Accion
            )

            resultado.append({
                "AuditoriaId": a.AuditoriaId,
                "titulo": f"{entidad_legible} {MAPEO_ACCIONES.get(a.CatalogoAccion.Accion)}",
                "usuario_que_realizo_la_accion": nombre_completo,
                "fecha": a.FechaAccion,
                "entidad": entidad_legible,
                "accion": a.CatalogoAccion.Accion,
                "resumen": resumen,
                "cambios": cambios
            })

        return {
            "page": page,
            "size": size,
            "total": total,
            "total_pages": (total + size - 1) // size,
            "data": resultado
        }
    
    except Exception:
        raise auditoria_excepciones.ErrorObtenerAuditoria()