import uuid
import functools
import logging
import inspect
from fastapi import Request, HTTPException
from sqlalchemy.orm import Session
from app.servicios.consumo_servicio import ConsumptionService

logger = logging.getLogger("consumo")

def track_consumption(tipo_consumo: str, proveedor: str, tipo_registro_default: str = "OTRO"):
    def decorator(func):
        
        def registrar_outbox(db, kwargs, args, request_id, estado_tecnico, resultado_proveedor, es_cobrable, response_data=None):
            try:
                request: Request = kwargs.get("request")
                idempotency_key = None
                guest_id = None
                session_id = None
                tenant_id = None
                
                if request:
                    idempotency_key = request.headers.get("Idempotency-Key") or request.headers.get("X-Idempotency-Key")
                    guest_id = request.headers.get("X-Guest-Id")
                    session_id = request.headers.get("X-Session-Id")
                    try:
                        tenant_val = request.headers.get("X-Tenant-Id")
                        if tenant_val:
                            tenant_id = int(tenant_val)
                    except ValueError:
                        pass

                if not idempotency_key:
                    idempotency_key = f"rand_{uuid.uuid4()}"

                tipo_registro = kwargs.get("tipo_registro") or tipo_registro_default
                if tipo_registro:
                    tipo_registro = tipo_registro.strip().upper()

                usuario_id = None
                tipo_usuario = "INVITADO"
                
                token_payload = kwargs.get("token_payload")
                if token_payload and isinstance(token_payload, dict):
                    token_type = token_payload.get("type")
                    if token_type == "access":
                        usuario = token_payload.get("usuario")
                        if usuario:
                            usuario_id = getattr(usuario, "UsuarioId", None)
                            tipo_usuario = "REGISTRADO"
                    elif token_type == "temp_invitation_session":
                        usuario_id = token_payload.get("usuario_id")
                        tipo_usuario = "INVITADO"

                entity_type = None
                entity_id = None
                metadata = {}

                # Si la respuesta es un dict, podemos extraer entity_type y entity_id si los hay
                if response_data and isinstance(response_data, dict):
                    entity_type = response_data.get("entity_type")
                    entity_id = response_data.get("entity_id")
                    metadata = response_data.get("metadata", {})

                payload = {
                    "RequestId": request_id,
                    "UsuarioId": usuario_id,
                    "GuestId": guest_id,
                    "SessionId": session_id,
                    "TenantId": tenant_id,
                    "TipoUsuario": tipo_usuario,
                    "TipoConsumo": tipo_consumo,
                    "Proveedor": proveedor,
                    "TipoRegistro": tipo_registro,
                    "EntityType": entity_type,
                    "EntityId": entity_id,
                    "EstadoTecnico": estado_tecnico,
                    "ResultadoProveedor": resultado_proveedor,
                    "EsCobrable": es_cobrable,
                    "LlaveIdempotencia": idempotency_key,
                    "Metadata": metadata
                }
                
                ConsumptionService.publicar_outbox(db, payload)
                db.commit()
            except Exception as outbox_exc:
                logger.error(f"[CONSUMO ERROR] No se pudo guardar outbox: {outbox_exc}")

        def obtener_db(args, kwargs):
            db = kwargs.get("db")
            if not db:
                for arg in args:
                    if isinstance(arg, Session):
                        db = arg
                        break
            return db

        if inspect.iscoroutinefunction(func):
            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs):
                db = obtener_db(args, kwargs)
                if not db:
                    return await func(*args, **kwargs)

                request_id = str(uuid.uuid4())
                request: Request = kwargs.get("request")
                if request:
                    request.state.request_id = request_id

                estado_tecnico = "EXITOSO"
                resultado_proveedor = "OK"
                es_cobrable = True
                response_data = None

                try:
                    response = await func(*args, **kwargs)
                    response_data = response
                    
                    if isinstance(response, dict):
                        if response.get("valido") is False:
                            resultado_proveedor = response.get("mensaje", "RECHAZADO")
                            mensaje = str(response.get("mensaje", ""))
                            if "supera el peso máximo" in mensaje:
                                es_cobrable = False
                                estado_tecnico = "ERROR_INTERNO"
                        else:
                            resultado_proveedor = "APROBADO"
                    return response

                except HTTPException as http_exc:
                    estado_tecnico = "ERROR_PROVEEDOR" if http_exc.status_code >= 500 else "EXITOSO"
                    resultado_proveedor = f"HTTP_{http_exc.status_code}_{http_exc.detail}"
                    es_cobrable = False if http_exc.status_code >= 500 else True
                    raise http_exc
                except Exception as exc:
                    exc_str = str(exc).lower()
                    if "timeout" in exc_str or "time out" in exc_str:
                        estado_tecnico = "TIMEOUT"
                    else:
                        estado_tecnico = "ERROR_INTERNO"
                    resultado_proveedor = f"EXCEPTION: {type(exc).__name__}"
                    es_cobrable = False
                    raise exc
                finally:
                    registrar_outbox(db, kwargs, args, request_id, estado_tecnico, resultado_proveedor, es_cobrable, response_data)

            return async_wrapper
        else:
            @functools.wraps(func)
            def sync_wrapper(*args, **kwargs):
                db = obtener_db(args, kwargs)
                if not db:
                    return func(*args, **kwargs)

                request_id = str(uuid.uuid4())
                request: Request = kwargs.get("request")
                if request:
                    request.state.request_id = request_id

                estado_tecnico = "EXITOSO"
                resultado_proveedor = "OK"
                es_cobrable = True
                response_data = None

                try:
                    response = func(*args, **kwargs)
                    response_data = response
                    
                    if isinstance(response, dict):
                        if response.get("valido") is False:
                            resultado_proveedor = response.get("mensaje", "RECHAZADO")
                            mensaje = str(response.get("mensaje", ""))
                            if "supera el peso máximo" in mensaje:
                                es_cobrable = False
                                estado_tecnico = "ERROR_INTERNO"
                        else:
                            resultado_proveedor = "APROBADO"
                    return response

                except HTTPException as http_exc:
                    estado_tecnico = "ERROR_PROVEEDOR" if http_exc.status_code >= 500 else "EXITOSO"
                    resultado_proveedor = f"HTTP_{http_exc.status_code}_{http_exc.detail}"
                    es_cobrable = False if http_exc.status_code >= 500 else True
                    raise http_exc
                except Exception as exc:
                    exc_str = str(exc).lower()
                    if "timeout" in exc_str or "time out" in exc_str:
                        estado_tecnico = "TIMEOUT"
                    else:
                        estado_tecnico = "ERROR_INTERNO"
                    resultado_proveedor = f"EXCEPTION: {type(exc).__name__}"
                    es_cobrable = False
                    raise exc
                finally:
                    registrar_outbox(db, kwargs, args, request_id, estado_tecnico, resultado_proveedor, es_cobrable, response_data)

            return sync_wrapper

    return decorator
