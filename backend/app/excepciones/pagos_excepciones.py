from app.excepciones.base import AppError
class PagoInvalidoError(AppError):
    def __init__(self):
        super().__init__(
            code="PAGO_INVALIDO",
            message="La orden de pago no es válida",
            status_code=400
        )

class CantidadJugadoresError(AppError):
    def __init__(self):
        super().__init__(
            code="CANTIDAD_JUGADORES_INVALIDA",
            message="Debe haber al menos un jugador en la orden de pago",
            status_code=400
        )

class SeguroNoExisteError(AppError):
    def __init__(self):
        super().__init__(
            code="SEGURO_NO_EXISTE",
            message="El seguro no existe",
            status_code=404
        )

class OrdenNoEncontradaError(AppError):
    def __init__(self):
        super().__init__(
            code="ORDEN_NO_ENCONTRADA",
            message="La orden de pago no fue encontrada",
            status_code=404
        )

class OrdenError(AppError):
    def __init__(self):
        super().__init__(
            code="ORDEN_ERROR",
            message="Error al procesar la orden de pago",
            status_code=500
        )

class ComprobanteError(AppError):
    def __init__(self):
        super().__init__(
            code="COMPROBANTE_ERROR",
            message="Error al procesar el comprobante de pago",
            status_code=500
        )

class CantidadSegurosPersonasError(AppError):
    def __init__(self):
        super().__init__(
            code="CANTIDAD_SEGUROS_PERSONAS_INVALIDA",
            message="La cantidad de seguros debe ser igual a la cantidad de personas (jugadores + presidente)",
            status_code=400
        )

class UsuarioNoEncontradoError(AppError):
    def __init__(self):
        super().__init__(
            code="USUARIO_NO_ENCONTRADO",
            message="UsuarioNoEncontrado",
            status_code=404
        )