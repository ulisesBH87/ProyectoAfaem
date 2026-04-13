from app.excepciones.base import AppError

class PersonaNoEncontradaError(AppError):
    def __init__(self):
        super().__init__(
            code="PERSONA_NO_ENCONTRADA",
            message="La persona no existe",
            status_code=404
        )


class ArchivosInvalidosError(AppError):
    def __init__(self):
        super().__init__(
            code="ARCHIVOS_INVALIDOS",
            message="Cantidad de archivos y tipos no coincide",
            status_code=400
        )


class ErrorSubidaDocumento(AppError):
    def __init__(self):
        super().__init__(
            code="ERROR_SUBIDA_DOCUMENTO",
            message="No se pudo subir el documento",
            status_code=500
        )