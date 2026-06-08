import time
from threading import Lock
from fastapi import Request, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from app.db.sesion import get_db
from app.modelos.auditoria import Auditoria

class RequestTracker:
    def __init__(self):
        self.requests = []
        self.violation_timestamps = []
        self.blocked_until = 0.0
        self.last_active = time.time()
        self.last_blocked_audit = 0.0
        self.lock = Lock()

    def clean_old(self, current_time: float, window_seconds: int):
        cutoff = current_time - window_seconds
        while self.requests and self.requests[0] < cutoff:
            self.requests.pop(0)

    def clean_violations(self, current_time: float, window_seconds: int):
        # Mantener solo violaciones dentro de la ventana de observación
        cutoff = current_time - window_seconds
        while self.violation_timestamps and self.violation_timestamps[0] < cutoff:
            self.violation_timestamps.pop(0)

class InMemoryRateLimiter:
    def __init__(self, limit: int = 20, window_seconds: int = 60):
        self.limit = limit
        self.window_seconds = window_seconds
        self.trackers = {}
        self.lock = Lock()
        self.last_cleanup = time.time()

    def get_tracker(self, ip: str) -> RequestTracker:
        now = time.time()
        self._cleanup_expired_trackers(now)
        
        with self.lock:
            if ip not in self.trackers:
                self.trackers[ip] = RequestTracker()
            tracker = self.trackers[ip]
            tracker.last_active = now
        return tracker

    def _cleanup_expired_trackers(self, now: float):
        # Limpieza de IPs inactivas hace más de 24 horas (86400 segundos)
        if now - self.last_cleanup < 300:
            return
            
        with self.lock:
            self.last_cleanup = now
            cutoff = now - 86400
            expired_ips = [ip for ip, tracker in self.trackers.items() if tracker.last_active < cutoff]
            for ip in expired_ips:
                del self.trackers[ip]

# Instancia global para limitar invitaciones
invitacion_limiter = InMemoryRateLimiter(limit=20, window_seconds=60)

def rate_limit_invitacion(request: Request, db: Session = Depends(get_db)):
    ip = "Unknown"
    if request.client:
        ip = request.headers.get("X-Forwarded-For", request.client.host).split(",")[0].strip()

    tracker = invitacion_limiter.get_tracker(ip)
    now = time.time()

    # Determinar si estamos en modo prueba para ajustar ventanas y duraciones
    is_test = request.headers.get("X-Test-Mode") == "True"

    # Ventanas de observación de violaciones (cuánto tiempo hacia atrás contamos violaciones)
    violation_window_15m = 2 if is_test else 900
    violation_window_24h = 4 if is_test else 86400

    # Duraciones de los bloqueos (cuánto dura el castigo)
    block_duration_15m = 2 if is_test else 900
    block_duration_24h = 4 if is_test else 86400

    # Cooldown para auditorías de IPs bloqueadas (para evitar inundaciones en DB)
    audit_cooldown = 1.0 if is_test else 60.0

    with tracker.lock:
        # Nivel 2 y 3: Verificar si ya hay un bloqueo activo
        if now < tracker.blocked_until:
            # Requerimiento 2: Auditar intentos provenientes de IPs ya bloqueadas antes de lanzar la excepción
            # Requerimiento 3: Evitar duplicación excesiva usando cooldown
            if now - tracker.last_blocked_audit >= audit_cooldown:
                tracker.last_blocked_audit = now
                auditoria = Auditoria(
                    EntidadAfectada="PresidenteInvitacion",
                    RegistroId="N/A",
                    AccionId=4,
                    UsuarioId=0,
                    FechaAccion=datetime.now(),
                    Ip=ip,
                    ObservacionesAuditoria="Intento de acceso desde IP bloqueada",
                    UsuarioNombre="Sistema/Invitado"
                )
                db.add(auditoria)
                try:
                    db.commit()
                except Exception:
                    db.rollback()

            remaining = int(tracker.blocked_until - now)
            raise HTTPException(
                status_code=429,
                detail=f"IP bloqueada. Por favor, intente de nuevo en {remaining} segundos."
            )

        # Nivel 1: Verificar el límite regular (20 peticiones por minuto)
        tracker.clean_old(now, invitacion_limiter.window_seconds)

        if len(tracker.requests) >= invitacion_limiter.limit:
            # Registrar nueva violación
            tracker.violation_timestamps.append(now)
            tracker.clean_violations(now, violation_window_24h)

            violations_15m = sum(1 for t in tracker.violation_timestamps if now - t <= violation_window_15m)
            violations_24h = len(tracker.violation_timestamps)

            print(f"DEBUG RATE LIMIT: IP={ip}, now={now}, violation_timestamps={tracker.violation_timestamps}, violation_window_15m={violation_window_15m}, violations_15m={violations_15m}, violations_24h={violations_24h}")

            obs = "Límite de peticiones excedido"
            block_msg = "Límite de peticiones excedido. Por favor, intente de nuevo más tarde."

            # Evaluar niveles de bloqueo progresivo
            if violations_24h >= 5:
                tracker.blocked_until = now + block_duration_24h  # Bloqueo extendido
                obs = "IP bloqueada por reincidencia"
                block_msg = "IP bloqueada por 24 horas debido a reincidencia."
            elif violations_15m >= 3:
                tracker.blocked_until = now + block_duration_15m  # Bloqueo temporal
                obs = "IP bloqueada temporalmente por múltiples violaciones"
                block_msg = "IP bloqueada por 15 minutos debido a múltiples violaciones."

            # Registrar auditoría
            auditoria = Auditoria(
                EntidadAfectada="PresidenteInvitacion",
                RegistroId="N/A",
                AccionId=4,
                UsuarioId=0,
                FechaAccion=datetime.now(),
                Ip=ip,
                ObservacionesAuditoria=obs,
                UsuarioNombre="Sistema/Invitado"
            )
            db.add(auditoria)
            try:
                db.commit()
            except Exception:
                db.rollback()

            raise HTTPException(
                status_code=429,
                detail=block_msg
            )

        # Registrar la solicitud permitida
        tracker.requests.append(now)
