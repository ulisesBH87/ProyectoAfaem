from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.core import seguridad
from sqlalchemy.orm import Session

from app.db.sesion import get_autenticacion_servicio

from app.modelos.presidente_equipo_modelo import PresidenteEquipo

from app.esquemas.auth_esquema import TokenResponse
from app.esquemas.usuario_esquema import RegistroUsuario, InicioSesion, CambiarContrasena, RegistroAdmin

from app.servicios.autenticacion_servicio import AutenticacionServicio, CorreoYaRegistradoError
from app.excepciones import usuario_excepciones

router = APIRouter(prefix="/auth",tags=["Auth"])

@router.post("/registro")
def register(data: RegistroUsuario, service: AutenticacionServicio = Depends(get_autenticacion_servicio)):
    try:
        persona, usuario = service.registrar_usuario(data)
    
    except CorreoYaRegistradoError:
        raise HTTPException(
            status_code=409,
            detail="Correo ya registrado"
        )

    except usuario_excepciones.CurpInvalidaError:
        raise HTTPException(
            status_code=400,
            detail="CURP inválida: Debe tener exactamente 18 caracteres"
        )
    
    except usuario_excepciones.ErrorRegistroUsuario:
        raise HTTPException(
            status_code=400,
            detail="Error al registrar el usuario"
        )

    return {
        "message": "Usuario registrado correctamente",
        "usuario_id": usuario.UsuarioId
    }

@router.post("/registrar_admin")
def registrar_administrador(data: RegistroAdmin, service: AutenticacionServicio = Depends(get_autenticacion_servicio)):
    try:    
        usuario = service.registrar_admin(data)

    except usuario_excepciones.ErrorRegistroUsuario as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error al registrar el administrador: {str(e)}"
        )
        
    return {
        "message": "Usuario registrado correctamente",
        "usuario_id": usuario.UsuarioId
    }

@router.post("/iniciar-sesion", response_model=TokenResponse)
def login(data: InicioSesion, service: AutenticacionServicio = Depends(get_autenticacion_servicio)) -> TokenResponse:
    
    usuarioIntentoSesion = service.iniciar_sesion(data.Correo, data.Contrasena)

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

    """    
    # Obtener EstatusId (solo para Presidentes de Equipo)
    estatus_id = None
    if persona:
        presidente = db.query(PresidenteEquipo).filter(PresidenteEquipo.PersonaId == persona.PersonaId).first()
        if presidente:
            estatus_id = presidente.EstatusId
    """
    return {
        "access_token": token_generado,
        "token_type": "bearer",
        "usuario": {
            "id": usuarioIntentoSesion.UsuarioId,
            "correo": usuarioIntentoSesion.Correo,
            "rol": usuarioIntentoSesion.RolRelacion.Nombre,
            "nombre": persona.Nombre if persona else None,
            "telefono": getattr(persona, "NumeroTelefono", None),
            #"estatusId": estatus_id
        }
    }

@router.post("/cambiar-contrasena")
def cambiar_contrasena(data: CambiarContrasena, service: AutenticacionServicio = Depends(get_autenticacion_servicio), usuario = Depends(seguridad.obtener_usuario_actual)):
    try:
        cambio = service.cambiar_contrasena(usuario.UsuarioId, data.ContrasenaActual, data.NuevaContrasena)

        if not cambio:
            raise HTTPException(
                status_code = status.HTTP_400_BAD_REQUEST,
                detail="Contraseña actual incorrecta"
            )
        
    except usuario_excepciones.ContraseñaError as e:
        raise HTTPException(
            status_code = status.HTTP_400_BAD_REQUEST,
            detail="Error al cambiar la contraseña"
        )
    
    return {"message": "Contraseña cambiada correctamente"}


#oauth2
@router.post("/iniciar-sesion-oauth", response_model=TokenResponse)
def login_oauth(form_data: OAuth2PasswordRequestForm = Depends(), service: AutenticacionServicio = Depends(get_autenticacion_servicio)) -> TokenResponse:
    usuarioIntentoSesion = service.iniciar_sesion(form_data.username, form_data.password)

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
    """
    # Obtener EstatusId (solo para Presidentes de Equipo)
    estatus_id = None
    if persona:
        presidente = db.query(PresidenteEquipo).filter(PresidenteEquipo.PersonaId == persona.PersonaId).first()
        if presidente:
            estatus_id = presidente.EstatusId
    """
    return {
        "access_token": token_generado,
        "token_type": "bearer",
        "usuario": {
            "id": usuarioIntentoSesion.UsuarioId,
            "correo": usuarioIntentoSesion.Correo,
            "rol": usuarioIntentoSesion.RolRelacion.Nombre,
            "nombre": persona.Nombre if persona else None,
            "telefono": getattr(persona, "NumeroTelefono", None),
           # "estatusId": estatus_id
        }
    }