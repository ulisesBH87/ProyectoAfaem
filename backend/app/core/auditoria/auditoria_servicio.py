import json
from datetime import datetime
from app.utilidades.context import usuario_actual_id, ip_actual

SYSTEM_USER_ID = 0

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