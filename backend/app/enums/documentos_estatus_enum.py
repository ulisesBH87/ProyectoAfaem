from enum import Enum

#Estatus de documentos
class DocumentoEstatus(str, Enum):
    ESPERA = 1
    ACEPTADO = 2
    RECHAZADO = 3
    BORRADOR = 4
