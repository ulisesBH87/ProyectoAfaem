from enum import Enum

#Estatus de documentos
class DocumentoEstatus(str, Enum):
    #BUENOS, PONER DESPUÉS
    ESPERA = "1"
    PENDIENTE = "1"
    ACEPTADO = "2"
    APROBADO = "2"
    RECHAZADO = "3"
    BORRADOR = "4"
