from app.modelos.persona_modelo import Personas
from app.modelos.usuario_modelo import Usuario
from app.esquemas.equipo_esquema import JugadorPersona
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

def crear_persona(db, persona: JugadorPersona):

    existe = db.query(Personas).filter(Personas.CURP == persona.curp).first()

    if existe:
        return existe.PersonaId

    from app.core.telefono_utils import validar_y_normalizar_telefono
    telefono_normalizado = validar_y_normalizar_telefono(persona.telefono) if persona.telefono else None

    nueva_persona = Personas(
        Nombre=persona.nombre,
        PrimerApellido=persona.primer_apellido,
        SegundoApellido=persona.segundo_apellido,
        CURP=persona.curp,
        SexoId=persona.sexo_id,
        FechaNacimiento=persona.fecha_nacimiento,
        NUI=persona.nui,
        LugarNacimiento=persona.lugar_nacimiento,
        CorreoElectronico=persona.correo,
        NumeroTelefono=telefono_normalizado
    )
    
    try:
        db.add(nueva_persona)
        db.commit()
        db.flush()
    except IntegrityError as e:
        db.rollback()
        if "check_curp_persona_longitud" in str(e):
            raise HTTPException(
                status_code=400,
                detail=f"El CURP '{persona.curp}' no tiene el formato correcto. Debe tener exactamente 18 caracteres alfanuméricos."
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Error al registrar la persona: {str(e)}"
            )

    return nueva_persona.PersonaId

def obtener_persona(db, usuario_id):
    
    usuario = db.query(Usuario).filter(Usuario.UsuarioId == usuario_id).first()
    
    if not usuario:
        return None
    
    return usuario.PersonaId

def obtener_persona_por_id(db, persona_id: int):
    return db.get(Personas, persona_id)

def guardar(db):
    db.commit()