from enum import Enum

#ESTATUS
class PresidenteEquipoEstatus(str, Enum):
    PAGO_PENDIENTE = 1
    PAGO_EN_REVISION = 2
    DOCUMENTOS_PENDIENTES = 3
    DOCUMENTOS_EN_REVISION = 4
    PRE_APROBADO = 5
    REGISTRO_PENDIENTE = 6
    ACTIVO = 7