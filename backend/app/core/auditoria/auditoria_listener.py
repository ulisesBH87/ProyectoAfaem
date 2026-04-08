from sqlalchemy import event, inspect
from sqlalchemy.orm import Session

from app.core.auditoria.auditoria_servicio import build_audit_entry
from app.core.auditoria.serializadores import model_to_dict
from app.enums.entidades import EntidadAuditable
from app.modelos.auditoria import Auditoria

ACCION_CREATE = 1
ACCION_UPDATE = 2
ACCION_DELETE = 3

ENTIDADES_AUDITABLES = {item.value for item in EntidadAuditable}

BUFFER_AUDITORIA_KEY = "buffer_auditoria"

def es_registro_auditoria(obj):
    return obj.__class__.__name__ == "Auditoria"


def es_auditable(obj):
    return hasattr(obj, "__tablename__") and obj.__tablename__ in ENTIDADES_AUDITABLES

def obtener_registro_id(obj):
    identity = inspect(obj).identity
    if identity:
        return identity[0]

    primary_keys = inspect(obj.__class__).primary_key
    if primary_keys:
        return getattr(obj, primary_keys[0].key, None)

    return None


@event.listens_for(Session, "before_flush")
def audit_before_flush(session, flush_context, instances):
    buffer = session.info.setdefault(BUFFER_AUDITORIA_KEY, [])
    
    for obj in session.new:
        if es_registro_auditoria(obj) or not es_auditable(obj):
            continue

        buffer.append({
            "tipo": "CREATE",
            "obj": obj,
            "antes": None,
            "despues": model_to_dict(obj)
        })

    for obj in session.dirty:
        if es_registro_auditoria(obj) or not es_auditable(obj):
            continue

        state = inspect(obj)
        cambios = {}
        anteriores = {}

        for attr in state.attrs:
            hist = attr.history
            if not hist.has_changes():
                continue

            anteriores[attr.key] = hist.deleted[0] if hist.deleted else None
            cambios[attr.key] = hist.added[0] if hist.added else None

        if not cambios:
            continue

        buffer.append({
            "tipo": "UPDATE",
            "obj": obj,
            "antes": anteriores,
            "despues": cambios
        })

    for obj in session.deleted:
    
        if es_registro_auditoria(obj) or not es_auditable(obj):
            continue

        buffer.append({
            "tipo": "DELETE",
            "obj": obj,
            "antes": model_to_dict(obj),
            "despues": None
        })

@event.listens_for(Session, "after_flush_postexec")
def audit_after_flush(session, flush_context):

    buffer = session.info.get(BUFFER_AUDITORIA_KEY, [])

    if not buffer:
        return

    for item in buffer:

        obj = item["obj"]

        registro_id = obtener_registro_id(obj)

        audit_data = build_audit_entry(
            entidad=obj.__tablename__,
            registro_id=registro_id,
            accion_id=mapear_accion(item["tipo"]),
            valores_antes=item["antes"],
            valores_despues=item["despues"]
        )

        session.add(Auditoria(**audit_data))

    session.info[BUFFER_AUDITORIA_KEY] = []


def obtener_pk(obj):
    for key in obj.__table__.primary_key.columns.keys():
        return getattr(obj, key)
    
def mapear_accion(tipo):
    if tipo == "CREATE":
        return 1
    elif tipo == "UPDATE":
        return 2
    elif tipo == "DELETE":
        return 3