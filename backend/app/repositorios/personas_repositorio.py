from app.modelos.persona_modelo import Personas
from app.esquemas.equipo_esquema import JugadorPersona

def crear_persona(db, persona: JugadorPersona):

    existe = db.query(Personas).filter(Personas.CURP == persona.curp).first()

    if existe:
        return existe.PersonaId

    nueva_persona = Personas(
        Nombre=persona.nombre,
        PrimerApellido=persona.primer_apellido,
        SegundoApellido=persona.segundo_apellido,
        CURP=persona.curp,
        SexoId=persona.sexo_id,
        FechaNacimiento=persona.fecha_nacimiento
    )
    
    db.add(nueva_persona)
    db.commit()
    db.flush()

    return nueva_persona.PersonaId
    
    