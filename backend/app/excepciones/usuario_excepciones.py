class UsuarioError(Exception):
    pass

class CurpInvalidaError(UsuarioError):
    pass

class ErrorRegistroUsuario(UsuarioError):
    pass

class ContraseñaError(UsuarioError):
    pass