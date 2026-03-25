from enum import Enum

#ESTATUS
class EstatusValidacionSolicitud(str, Enum):
    APROBADO = 1
    PENDIENTE = 2
    RECHAZADO = 3
    BORRADOR = 4