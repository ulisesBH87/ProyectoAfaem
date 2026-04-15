from enum import IntEnum

#ROLES
class Rol(IntEnum):
    ADMINISTRADOR = 1
    PRESIDENTE_LIGA = 2
    PRESIDENTE_EQUIPO = 3
    ENTRENADOR = 4
    JUGADOR = 5
    TUTOR = 6
    INVITADO = 7