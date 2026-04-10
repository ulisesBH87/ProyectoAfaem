from app.excepciones.base import AppError

class ErrorObtenerAuditoria(AppError):
    def __init__(self):
        super().__init__(
            code="ERROR_OBTENER_AUDITORIA",
            message="No se pudo obtener el historial de auditoría",
            status_code=500
        )