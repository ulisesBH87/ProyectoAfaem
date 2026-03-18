from enum import Enum

#ROLES
class Rol(str, Enum):
    ADMINISTRADOR = 1
    PRESIDENTE_LIGA = 2
    PRESIDENTE_EQUIPO = 3
    ENTRENADOR = 4
    JUGADOR = 5
    TUTOR = 6
    INVITADO = 7