from contextvars import ContextVar

usuario_actual_id = ContextVar("usuario_actual_id", default=None)
ip_actual = ContextVar("ip_actual", default=None)