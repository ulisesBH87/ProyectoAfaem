from enum import Enum

#Estatus de documentos
class DocumentoEstatus(str, Enum):
    APROBADO = 1
    PENDIENTE = 2
    RECHAZADO = 3
