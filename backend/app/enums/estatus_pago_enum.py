from enum import IntEnum

#ESTATUS
class EstatusValidacionPago(IntEnum):
    NOENVIADO = 1
    ESPERA = 2
    ACTIVO = 3
    RECHAZADO = 4
    CADUCADO = 5