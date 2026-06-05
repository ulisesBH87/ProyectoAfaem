import secrets
import uuid
from datetime import datetime, timedelta

from fastapi import HTTPException

from app.core.seguridad import generar_hash_con_salt, verificar_hash_con_salt
from app.modelos.presidente_invitacion_modelo import PresidenteInvitacion


INVITACION_VIGENCIA_DIAS = 30


def crear_invitacion_presidente_repo(db, usuario_id: int):
    db.query(PresidenteInvitacion).filter(
        PresidenteInvitacion.UsuarioId == usuario_id,
        PresidenteInvitacion.Activo == True
    ).update(
        {PresidenteInvitacion.Activo: False},
        synchronize_session=False
    )

    token_identificador = uuid.uuid4().hex
    token_secreto = secrets.token_urlsafe(32)
    ahora = datetime.now()

    invitacion = PresidenteInvitacion(
        UsuarioId=usuario_id,
        TokenIdentificador=token_identificador,
        TokenHash=generar_hash_con_salt(token_identificador, token_secreto),
        FechaCreacion=ahora,
        FechaExpiracion=ahora + timedelta(days=INVITACION_VIGENCIA_DIAS),
        FechaUltimoAcceso=None,
        Activo=True
    )
    db.add(invitacion)
    db.flush()

    return {
        "invitacion": invitacion,
        "token_identificador": token_identificador,
        "token_secreto": token_secreto,
    }


def validar_invitacion_presidente_repo(db, token_identificador: str, token_secreto: str):
    invitacion = db.query(PresidenteInvitacion).filter(
        PresidenteInvitacion.TokenIdentificador == token_identificador
    ).first()

    if not invitacion:
        raise HTTPException(status_code=404, detail="Enlace de invitación no válido o expirado.")

    ahora = datetime.now()

    if not invitacion.Activo:
        raise HTTPException(status_code=404, detail="Enlace de invitación no válido o expirado.")

    if invitacion.FechaExpiracion <= ahora:
        raise HTTPException(status_code=404, detail="Enlace de invitación no válido o expirado.")

    if not verificar_hash_con_salt(token_secreto, invitacion.TokenHash, invitacion.TokenIdentificador):
        raise HTTPException(status_code=404, detail="Enlace de invitación no válido o expirado.")

    invitacion.FechaUltimoAcceso = ahora
    db.flush()

    return invitacion
