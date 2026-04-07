from enum import Enum

#Estatus de documentos
class DocumentoEstatus(str, Enum):
    
    #BUENOS, PONER DESPUÉS
    #ESPERA = 1
    #ACEPTADO = 2
    #RECHAZADO = 3
    #BORRADOR = 4
    APROBADO = 1
    PENDIENTE = 2
    RECHAZADO = 3
    BORRADOR = 4
