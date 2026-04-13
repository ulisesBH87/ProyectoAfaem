from app.excepciones.base import AppError

class UsuarioError(AppError):
    pass

class CredencialesInvalidasError(AppError):
    def __init__(self):
        super().__init__(
            code="CREDENCIALES_INVALIDAS", 
            message="Correo o contraseña incorrectos", 
            status_code=401
        )

class CurpInvalidaError(UsuarioError):
    def __init__(self):
        super().__init__(
            code="CURP_INVALIDA",
            message="La CURP proporcionada no es válida",
            status_code=400
        )

class UsuarioYaExisteError(UsuarioError):
    def __init__(self):
        super().__init__(
            code="USUARIO_YA_EXISTE",
            message="El usuario ya está registrado",
            status_code=409
        )

class ErrorRegistroUsuario(UsuarioError):
    def __init__(self):
        super().__init__(
            code="ERROR_REGISTRO_USUARIO",
            message="Error al registrar el usuario",
            status_code=500
        )


class CorreoYaRegistradoError(AppError):
    def __init__(self):
        super().__init__(
            code="CORREO_YA_REGISTRADO",
            message="El correo ya está registrado",
            status_code=409
        )

class UsuarioNoEncontradoError(AppError):
    def __init__(self):
        super().__init__(
            code="USUARIO_NO_ENCONTRADO",
            message="El usuario no fue encontrado",
            status_code=404
        )

class ErrorCambioContrasena(AppError):
    def __init__(self):
        super().__init__(
            code="ERROR_CAMBIO_CONTRASENA",
            message="No se pudo cambiar la contraseña",
            status_code=500
        )