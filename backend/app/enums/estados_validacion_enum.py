from enum import Enum

#ESTATUS
class EstatusValidacionSolicitud(str, Enum):
    ESPERA = 1
    ACEPTADO = 2
    RECHAZADO = 3
    BORRADOR = 4