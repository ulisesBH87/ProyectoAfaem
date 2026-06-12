from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.core import seguridad
from sqlalchemy.orm import Session

from app.db.sesion import get_autenticacion_servicio, get_db

from app.modelos.presidente_equipo_modelo import PresidenteEquipo

from app.esquemas.auth_esquema import TokenResponse
from app.esquemas.usuario_esquema import RegistroUsuario, InicioSesion, CambiarContrasena, RegistroAdmin

from app.servicios.autenticacion_servicio import AutenticacionServicio
from app.repositorios.equipo_repositorio import existe_persona_repo

router = APIRouter(prefix="/auth",tags=["Auth"])

# == REGISTRO ==
@router.post("/registro")
def register(data: RegistroUsuario, service: AutenticacionServicio = Depends(get_autenticacion_servicio)):
    usuario = service.registrar_usuario(data)
    
    return {
        "success": True,
        "message": "Usuario registrado correctamente",
        "usuario_id": usuario.UsuarioId
    }

@router.post("/registrar_admin")
def registrar_administrador(data: RegistroAdmin, service: AutenticacionServicio = Depends(get_autenticacion_servicio)):
    usuario = service.registrar_admin(data)
    
    return {
        "success": True,
        "message": "Admin registrado correctamente",
        "usuario_id": usuario.UsuarioId
    }


# == INICIAR SESIÓN ==
@router.post("/iniciar-sesion", response_model=TokenResponse)
def login(data: InicioSesion, service: AutenticacionServicio = Depends(get_autenticacion_servicio)) -> TokenResponse:
    
    usuarioIntentoSesion, estatus_id = service.iniciar_sesion(data.Correo, data.Contrasena)

    datos_token = {
        "sub": str(usuarioIntentoSesion.UsuarioId),
        "correo": usuarioIntentoSesion.Correo,
        "rol": usuarioIntentoSesion.RolRelacion.Nombre
    }

    token_generado = seguridad.crear_token(datos_token)

    persona = usuarioIntentoSesion.PersonaRelacion

    return {
        "access_token": token_generado,
        "token_type": "bearer",
        "usuario": {
            "id": usuarioIntentoSesion.UsuarioId,
            "correo": usuarioIntentoSesion.Correo,
            "rol": usuarioIntentoSesion.RolRelacion.Nombre,
            "nombre": f"{persona.Nombre or ''} {persona.PrimerApellido or ''} {persona.SegundoApellido or ''}".strip() if persona else None,
            "nombreSolo": getattr(persona, "Nombre", None),
            "primerApellido": getattr(persona, "PrimerApellido", None),
            "segundoApellido": getattr(persona, "SegundoApellido", None),
            "telefono": getattr(persona, "NumeroTelefono", None),
            "curp": getattr(persona, "CURP", None),
            "sexoId": getattr(persona, "SexoId", None),
            "fechaNacimiento": str(persona.FechaNacimiento) if persona and persona.FechaNacimiento else None,
            "lugarNacimiento": getattr(persona, "LugarNacimiento", None),
            "estatusId": estatus_id
        }
    }

# == CAMBIAR CONTRASEÑA ==
@router.post("/cambiar-contrasena")
def cambiar_contrasena(data: CambiarContrasena, service: AutenticacionServicio = Depends(get_autenticacion_servicio), usuario = Depends(seguridad.obtener_usuario_actual)):
    
    service.cambiar_contrasena(usuario.UsuarioId, data.ContrasenaActual, data.NuevaContrasena)
    
    return {"message": "Contraseña cambiada correctamente"}


#oauth2. para fastapi
@router.post("/iniciar-sesion-oauth", response_model=TokenResponse)
def login_oauth(form_data: OAuth2PasswordRequestForm = Depends(), service: AutenticacionServicio = Depends(get_autenticacion_servicio)) -> TokenResponse:
    usuarioIntentoSesion, estatus_id = service.iniciar_sesion(form_data.username, form_data.password)

    if not usuarioIntentoSesion:
        raise HTTPException(
            status_code = status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas"
        )

    datos_token = {
        "sub": str(usuarioIntentoSesion.UsuarioId),
        "correo": usuarioIntentoSesion.Correo,
        "rol": usuarioIntentoSesion.RolRelacion.Nombre
    }

    token_generado = seguridad.crear_token(datos_token)

    persona = usuarioIntentoSesion.PersonaRelacion

    return {
        "access_token": token_generado,
        "token_type": "bearer",
        "usuario": {
            "id": usuarioIntentoSesion.UsuarioId,
            "correo": usuarioIntentoSesion.Correo,
            "rol": usuarioIntentoSesion.RolRelacion.Nombre,
            "nombre": f"{persona.Nombre or ''} {persona.PrimerApellido or ''} {persona.SegundoApellido or ''}".strip() if persona else None,
            "nombreSolo": getattr(persona, "Nombre", None),
            "primerApellido": getattr(persona, "PrimerApellido", None),
            "segundoApellido": getattr(persona, "SegundoApellido", None),
            "telefono": getattr(persona, "NumeroTelefono", None),
            "curp": getattr(persona, "CURP", None),
            "sexoId": getattr(persona, "SexoId", None),
            "fechaNacimiento": str(persona.FechaNacimiento) if persona and persona.FechaNacimiento else None,
            "lugarNacimiento": getattr(persona, "LugarNacimiento", None),
            "estatusId": estatus_id
        }
    }

# == VERIFICAR CURP ==
@router.get("/verificar-curp")
def verificar_curp(curp: str, db: Session = Depends(get_db)):
    if not curp or len(curp) != 18:
        return {"existe": False}
    existe = existe_persona_repo(db, curp.strip().upper())
    return {"existe": existe}