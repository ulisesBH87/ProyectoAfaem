from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse, HTMLResponse
import requests
from sqlalchemy.orm import Session
from typing import Optional, List, Union
import os
from app.db.sesion import get_db
from app.servicios.documentos_servicio import subir_documento_servicio2, proceso_presidente, presidente_solicitud
from app.core.seguridad import obtener_usuario_actual
from app.core.decoradores_consumo import track_consumption

router = APIRouter(prefix="/documentos", tags=["Documentos"])


def _parse_solicitud_id_form(valor: Optional[Union[int, str]]) -> Optional[int]:
    if valor is None:
        return None
    texto = str(valor).strip()
    if texto in ("", "null", "undefined"):
        return None
    try:
        return int(texto)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="solicitud_id inválido")


@router.post("/")
async def subir_documento(
    persona_id: Optional[int] = Form(None),
    documento_afiliacion_ids: List[int] = Form(...),
    archivo: List[UploadFile] = File(...),
    solicitud_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    usuario=Depends(obtener_usuario_actual),
):
    if not persona_id:
        persona_id = proceso_presidente(db, usuario)

    sid = _parse_solicitud_id_form(solicitud_id)

    if not sid:
        if persona_id:
            from app.repositorios.equipo_repositorio import obtener_solicitud_id_para_persona
            sid = obtener_solicitud_id_para_persona(db, persona_id, usuario.UsuarioId)
        else:
            sid = presidente_solicitud(db, usuario)

    return await subir_documento_servicio2(db, persona_id, documento_afiliacion_ids, archivo, sid)


@router.get("/{documento_id}")
def obtener_documento(
    documento_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    # 1. Obtener token (cabecera únicamente)
    token_a_usar = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token_a_usar = auth_header.split(" ")[1]

    if not token_a_usar:
        raise HTTPException(status_code=401, detail="No autenticado")

    # 2. Decodificar y validar token
    from jose import jwt, JWTError
    from app.core.seguridad import config as sec_config, obtener_usuario_por_id
    
    try:
        payload = jwt.decode(token_a_usar, sec_config.SECRET_KEY, algorithms=[sec_config.ALGORITHM])
        token_type = payload.get("type")
        if token_type == "access":
            usuario_id = payload.get("sub")
            usuario = obtener_usuario_por_id(db, int(usuario_id))
            if not usuario:
                raise HTTPException(status_code=401, detail="Usuario no encontrado")
            auth_info = {"type": "access", "usuario": usuario}
        elif token_type == "temp_invitation_session":
            usuario_id = payload.get("sub")
            auth_info = {
                "type": "temp_invitation_session",
                "usuario_id": int(usuario_id),
                "invitacion_id": payload.get("invitacion_id")
            }
        else:
            raise HTTPException(status_code=401, detail="Tipo de token inválido")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

    # 3. Buscar documento en la BD
    from app.modelos.documentos_entregados_modelo import DocumentosEntregados
    documento = db.query(DocumentosEntregados).filter(
        DocumentosEntregados.DocumentosSolicitudId == documento_id
    ).first()
    
    if not documento:
        raise HTTPException(status_code=404, detail="Documento no encontrado en BD")

    # 4. Validar permisos
    permitido = False
    if auth_info["type"] == "access":
        usuario_db = auth_info["usuario"]
        rol_id = getattr(usuario_db, "RolId", None)
        
        # Admin puede todo
        if rol_id == 1:
            permitido = True
        # Propietario del documento
        elif documento.PersonaId == usuario_db.PersonaId:
            permitido = True
        # Presidente de equipo o Entrenador
        elif rol_id in (3, 4):
            from app.modelos.presidente_equipo_modelo import PresidenteEquipo
            from app.modelos.miembro_equipo_modelo import MiembrosEquipo
            from app.modelos.equipo_modelo import EquiposJugando
            from app.modelos.equipo_temporal_jugador_modelo import EquipoTemporalJugador
            from app.modelos.equipo_temporal_modelo import EquipoTemporal

            presidente = db.query(PresidenteEquipo).filter(
                PresidenteEquipo.PersonaId == usuario_db.PersonaId
            ).first()
            
            if presidente:
                filter_cond = EquiposJugando.EntrenadorEquipoId == presidente.PresidenteEquipoId if presidente.TipoDirectivoId == 2 else EquiposJugando.PresidenteEquipoId == presidente.PresidenteEquipoId
                
                is_member = db.query(MiembrosEquipo).join(
                    EquiposJugando, MiembrosEquipo.EquipoID == EquiposJugando.EquiposJugandoId
                ).filter(
                    MiembrosEquipo.PersonaId == documento.PersonaId,
                    MiembrosEquipo.Eliminado == False,
                    filter_cond
                ).first() is not None

                is_temp_member = db.query(EquipoTemporalJugador).join(
                    EquipoTemporal, EquipoTemporalJugador.EquipoTemporalId == EquipoTemporal.EquipoTemporalId
                ).filter(
                    EquipoTemporal.UsuarioId == usuario_db.UsuarioId,
                    EquipoTemporalJugador.PersonaId == documento.PersonaId
                ).first() is not None

                permitido = is_member or is_temp_member
        else:
            permitido = (documento.PersonaId == usuario_db.PersonaId)

    elif auth_info["type"] == "temp_invitation_session":
        usuario_id = auth_info["usuario_id"]
        from app.modelos.equipo_temporal_jugador_modelo import EquipoTemporalJugador
        from app.modelos.equipo_temporal_modelo import EquipoTemporal
        from app.modelos.usuario_modelo import Usuario

        candidate_user = db.query(Usuario).filter(Usuario.UsuarioId == usuario_id).first()
        if candidate_user and documento.PersonaId == candidate_user.PersonaId:
            permitido = True
        else:
            is_temp_member = db.query(EquipoTemporalJugador).join(
                EquipoTemporal, EquipoTemporalJugador.EquipoTemporalId == EquipoTemporal.EquipoTemporalId
            ).filter(
                EquipoTemporal.UsuarioId == usuario_id,
                EquipoTemporalJugador.PersonaId == documento.PersonaId
            ).first() is not None
            permitido = is_temp_member

    if not permitido:
        raise HTTPException(status_code=403, detail="No tienes autorización para ver este documento")

    # 5. Resolver la ruta física del archivo
    from app.servicios.documentos_servicio import resolver_ruta_absoluta
    ruta_absoluta = resolver_ruta_absoluta(documento.RutaArchivo)
    
    if not os.path.exists(ruta_absoluta):
        raise HTTPException(status_code=404, detail="El archivo físico no existe en el servidor")

    return FileResponse(ruta_absoluta)


from app.core.seguridad import obtener_usuario_o_sesion_temporal
from datetime import datetime


def obtener_usuario_o_sesion_temporal_con_log(request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization")
    try:
        with open("ocr_proxy.log", "a", encoding="utf-8") as f:
            f.write(f"[{datetime.now().isoformat()}] --- OCR Request ---\n")
            f.write(f"Path: {request.url.path}\n")
            f.write(f"Authorization Header: {auth_header}\n")
    except Exception as e:
        print(f"[OCR PROXY] Error writing to ocr_proxy.log: {e}")
        
    try:
        payload = obtener_usuario_o_sesion_temporal(request, db)
        try:
            # Si es usuario, sacamos el id. Si es temp_session, sacamos el usuario_id.
            sub_id = payload.get("usuario_id") or (payload.get("usuario").UsuarioId if payload.get("usuario") else None)
            with open("ocr_proxy.log", "a", encoding="utf-8") as f:
                f.write(f"Auth Success: type={payload.get('type')}, sub={sub_id}\n")
        except Exception as e:
            print(f"[OCR PROXY] Log success write error: {e}")
        return payload
    except HTTPException as exc:
        try:
            with open("ocr_proxy.log", "a", encoding="utf-8") as f:
                f.write(f"Auth Failure: status_code={exc.status_code}, detail={exc.detail}\n")
        except Exception:
            pass
        raise exc
    except Exception as exc:
        try:
            with open("ocr_proxy.log", "a", encoding="utf-8") as f:
                f.write(f"Auth Failure: unexpected error={str(exc)}\n")
        except Exception:
            pass
        raise exc


@router.post("/ocr")
@track_consumption(tipo_consumo="OCR", proveedor="DEFAULT", tipo_registro_default="JUGADOR")
def procesar_ocr_seguro(
    request: Request,
    file_id: UploadFile = File(...),
    file_formato: Optional[UploadFile] = File(None),
    token_payload = Depends(obtener_usuario_o_sesion_temporal_con_log),
    db: Session = Depends(get_db),
    tipo_registro: Optional[str] = Query("JUGADOR")
):
    """
    Recibe un documento de identidad y opcionalmente un formato de afiliación,
    valida la sesión (usuario o invitado) y los reenvía internamente al servicio OCR local.
    """
    print(f"[OCR PROXY] Recibida petición OCR. Archivo: {file_id.filename}. Token type: {token_payload.get('type')}")
    
    # 1. Leer los archivos subidos para reenviarlos
    files = {
        "file_id": (file_id.filename, file_id.file.read(), file_id.content_type)
    }
    if file_formato:
        files["file_formato"] = (file_formato.filename, file_formato.file.read(), file_formato.content_type)

    # 2. Reenviar al microservicio OCR en el puerto 8001 (o el asignado en el servidor)
    #5001 para pruebas locales
    ocr_url = "http://127.0.0.1:8001/"
    try:
        #print(f"[OCR PROXY] Reenviando a servicio local Flask en {ocr_url}...")
        try:
            with open("ocr_proxy.log", "a", encoding="utf-8") as f:
                f.write(f"Reenviando a Flask en {ocr_url}\n")
        except Exception:
            pass
            
        respuesta = requests.post(ocr_url, files=files, timeout=300.0)
        print(f"[OCR PROXY] Servicio Flask retornó status_code: {respuesta.status_code}")
        
        try:
            with open("ocr_proxy.log", "a", encoding="utf-8") as f:
                f.write(f"Flask response status: {respuesta.status_code}\n")
        except Exception:
            pass
            
        if respuesta.status_code != 200:
            print(f"[OCR PROXY] Error del servicio Flask: {respuesta.text[:500]}")
            try:
                with open("ocr_proxy.log", "a", encoding="utf-8") as f:
                    f.write(f"Flask returned error: {respuesta.text[:500]}\n")
            except Exception:
                pass
            raise HTTPException(
                status_code=respuesta.status_code,
                detail=f"Error interno OCR (Status {respuesta.status_code}): {respuesta.text[:200]}"
            )
            
        # Devolver el HTML tal cual para que el frontend lo parsee
        return HTMLResponse(content=respuesta.text, status_code=200)
        
    except requests.RequestException as exc:
        print(f"[OCR PROXY] Error de conexión: {str(exc)}")
        try:
            with open("ocr_proxy.log", "a", encoding="utf-8") as f:
                f.write(f"Flask connection failed: {str(exc)}\n")
        except Exception:
            pass
        raise HTTPException(
            status_code=503,
            detail=f"Ocurrió un error interno (RequestException): {str(exc)}"
        )

