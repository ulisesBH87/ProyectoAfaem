from enum import Enum

#ESTATUS
class EstatusValidacionPago(str, Enum):
    NO_ENVIADO = 1
    ESPERA = 2
    ACTIVO = 3
    RECHAZADO = 4
    CADUCADO = 5