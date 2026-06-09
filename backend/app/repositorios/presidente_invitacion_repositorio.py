import secrets
import uuid
from datetime import datetime, timedelta

from fastapi import HTTPException

from app.core.seguridad import generar_hash_con_salt, verificar_hash_con_salt
from app.modelos.presidente_invitacion_modelo import PresidenteInvitacion
from app.modelos.auditoria import Auditoria


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
        TokenSecreto=token_secreto,
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


def validar_invitacion_presidente_repo(db, token_identificador: str, token_secreto: str, ip: str = None):
    invitacion = db.query(PresidenteInvitacion).filter(
        PresidenteInvitacion.TokenIdentificador == token_identificador
    ).first()

    def registrar_auditoria(obs):
        registro_id = str(invitacion.PresidenteInvitacionId) if invitacion else "N/A"
        usuario_id = invitacion.UsuarioId if invitacion else 0
        auditoria = Auditoria(
            EntidadAfectada="PresidenteInvitacion",
            RegistroId=registro_id,
            AccionId=4,
            UsuarioId=usuario_id,
            FechaAccion=datetime.now(),
            Ip=ip,
            ObservacionesAuditoria=obs,
            UsuarioNombre="Sistema/Invitado"
        )
        db.add(auditoria)
        db.commit()

    if not invitacion:
        registrar_auditoria("Intento de acceso con token inválido")
        raise HTTPException(status_code=404, detail="Enlace de invitación no válido o expirado.")

    ahora = datetime.now()

    if not invitacion.Activo:
        registrar_auditoria("Intento de acceso a invitación inactiva")
        raise HTTPException(status_code=404, detail="Enlace de invitación no válido o expirado.")

    if invitacion.FechaExpiracion <= ahora:
        registrar_auditoria("Intento de acceso a invitación expirada")
        raise HTTPException(status_code=404, detail="Enlace de invitación no válido o expirado.")

    if not verificar_hash_con_salt(token_secreto, invitacion.TokenHash, invitacion.TokenIdentificador):
        registrar_auditoria("Intento de acceso con token inválido")
        raise HTTPException(status_code=404, detail="Enlace de invitación no válido o expirado.")

    invitacion.FechaUltimoAcceso = ahora
    db.flush()
    registrar_auditoria("Acceso exitoso al enlace de registro de jugadores")

    return invitacion
