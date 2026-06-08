import time
from threading import Lock
from collections import defaultdict
from fastapi import Request, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from app.db.sesion import get_db
from app.modelos.auditoria import Auditoria

class RequestTracker:
    def __init__(self):
        self.requests = []
        self.last_active = time.time()
        self.lock = Lock()

    def clean_old(self, current_time: float, window_seconds: int):
        cutoff = current_time - window_seconds
        while self.requests and self.requests[0] < cutoff:
            self.requests.pop(0)

    def add_request(self, current_time: float, limit: int, window_seconds: int) -> bool:
        with self.lock:
            self.last_active = current_time
            self.clean_old(current_time, window_seconds)
            if len(self.requests) >= limit:
                return False
            self.requests.append(current_time)
            return True

class InMemoryRateLimiter:
    def __init__(self, limit: int = 20, window_seconds: int = 60):
        self.limit = limit
        self.window_seconds = window_seconds
        self.trackers = {}
        self.lock = Lock()
        self.last_cleanup = time.time()

    def is_allowed(self, ip: str) -> bool:
        now = time.time()
        self._cleanup_expired_trackers(now)
        
        with self.lock:
            if ip not in self.trackers:
                self.trackers[ip] = RequestTracker()
            tracker = self.trackers[ip]
            
        return tracker.add_request(now, self.limit, self.window_seconds)

    def _cleanup_expired_trackers(self, now: float):
        # Limpieza periódica para evitar fugas de memoria (cada 5 minutos / 300 segundos)
        if now - self.last_cleanup < 300:
            return
            
        with self.lock:
            self.last_cleanup = now
            cutoff = now - self.window_seconds
            expired_ips = [ip for ip, tracker in self.trackers.items() if tracker.last_active < cutoff]
            for ip in expired_ips:
                del self.trackers[ip]

# Instancia global del limitador para invitaciones
# Máximo 20 peticiones por minuto por IP
invitacion_limiter = InMemoryRateLimiter(limit=20, window_seconds=60)

def rate_limit_invitacion(request: Request, db: Session = Depends(get_db)):
    ip = "Unknown"
    if request.client:
        ip = request.headers.get("X-Forwarded-For", request.client.host).split(",")[0].strip()

    if not invitacion_limiter.is_allowed(ip):
        # Registrar en la tabla de auditoría el exceso de solicitudes
        auditoria = Auditoria(
            EntidadAfectada="PresidenteInvitacion",
            RegistroId="N/A",
            AccionId=4,  # Acción 4 representa un intento o acceso
            UsuarioId=0,  # 0 indica usuario no autenticado (público)
            FechaAccion=datetime.now(),
            Ip=ip,
            ObservacionesAuditoria="Límite de peticiones excedido",
            UsuarioNombre="Sistema/Invitado"
        )
        db.add(auditoria)
        db.commit()

        raise HTTPException(
            status_code=429,
            detail="Límite de peticiones excedido. Por favor, intente de nuevo más tarde."
        )
