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
                if request:
                    query_tipo_registro = request.query_params.get("tipo_registro")
                    if query_tipo_registro:
                        tipo_registro = query_tipo_registro
                    else:
                        referer = request.headers.get("referer", "").lower()
                        referer_path = referer.split('?')[0].split('#')[0]
                        is_president = (
                            "pre-registro-presidente" in referer_path or
                            "/ad/rp" in referer_path or
                            (("/ad/p" in referer_path or "/ad/p/" in referer_path) and "/ad/pg" not in referer_path and "/ad/pago" not in referer_path)
                        )
                        if is_president:
                            tipo_registro = "PRESIDENTE"

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

                # ── Resolución y Auditoría de Contexto (Jugador, Equipo, Liga) ──
                equipo_id = None
                liga_id = None
                target_persona_id = None
                target_nombre = None
                target_curp = None
                
                if request:
                    try:
                        eq_val = request.query_params.get("equipo_id")
                        if eq_val:
                            equipo_id = int(eq_val)
                    except ValueError:
                        pass
                    
                    try:
                        lg_val = request.query_params.get("liga_id")
                        if lg_val:
                            liga_id = int(lg_val)
                    except ValueError:
                        pass

                    try:
                        p_val = request.query_params.get("target_persona_id")
                        if p_val:
                            target_persona_id = int(p_val)
                    except ValueError:
                        pass

                    target_nombre = request.query_params.get("target_nombre")
                    target_curp = request.query_params.get("target_curp")

                # Resolver automáticamente si el ejecutor es Presidente de Equipo
                if usuario_id and not equipo_id:
                    try:
                        from app.modelos.usuario_modelo import Usuario
                        from app.modelos.presidente_equipo_modelo import PresidenteEquipo
                        from app.modelos.equipo_modelo import EquiposJugando
                        
                        db_user = db.query(Usuario).filter(Usuario.UsuarioId == usuario_id).first()
                        if db_user and db_user.RolId == 3:  # Presidente de Equipo
                            pres = db.query(PresidenteEquipo).filter(PresidenteEquipo.PersonaId == db_user.PersonaId).first()
                            if pres:
                                eq_jug = db.query(EquiposJugando).filter(EquiposJugando.PresidenteEquipoId == pres.PresidenteEquipoId).first()
                                if eq_jug:
                                    equipo_id = eq_jug.EquipoId
                                    liga_id = eq_jug.LigaId
                    except Exception as res_exc:
                        logger.error(f"[CONSUMO RESOLVER ERROR] Falló auto-resolución de presidente: {res_exc}")

                # Resolver jugador o directivo si se tiene el ID
                if target_persona_id:
                    try:
                        from app.modelos.persona_modelo import Personas
                        pers = db.query(Personas).filter(Personas.PersonaId == target_persona_id).first()
                        if pers:
                            target_nombre = f"{pers.Nombre} {pers.PrimerApellido} {pers.SegundoApellido or ''}".strip().upper()
                            target_curp = pers.CURP
                                    
                        if not equipo_id:
                            from app.modelos.miembro_equipo_modelo import MiembrosEquipo
                            from app.modelos.equipo_modelo import EquiposJugando
                            miembro = db.query(MiembrosEquipo).filter(MiembrosEquipo.PersonaId == target_persona_id, MiembrosEquipo.Estatus == True).first()
                            if miembro:
                                eq_jug = db.query(EquiposJugando).filter(EquiposJugando.EquiposJugandoId == miembro.EquipoID).first()
                                if eq_jug:
                                    equipo_id = eq_jug.EquipoId
                                    liga_id = eq_jug.LigaId
                    except Exception as player_exc:
                        logger.error(f"[CONSUMO RESOLVER ERROR] Falló auto-resolución de persona registrada: {player_exc}")
                else:
                    # Si no hay ID de Persona registrado en el sistema, preservamos el nombre/CURP
                    # solo si hay un slot_id o borrador_id que ancle el consumo a una entidad conocida.
                    # Sin ese ancla, descartamos para evitar datos sucios de OCR no corregido.
                    slot_id_req = request.query_params.get("slot_id") if request else None
                    borrador_id_req = request.query_params.get("borrador_id") if request else None
                    if not slot_id_req and not borrador_id_req:
                        target_nombre = None
                        target_curp = None

                entity_type = None
                entity_id = None
                if request:
                    if request.query_params.get("slot_id"):
                        entity_type = "SLOT_JUGADOR"
                        entity_id = request.query_params.get("slot_id")
                    elif request.query_params.get("borrador_id"):
                        entity_type = "BORRADOR_PRESIDENTE"
                        entity_id = request.query_params.get("borrador_id")

                metadata = {}

                # Si la respuesta es un dict, podemos extraer entity_type y entity_id si los hay
                if response_data and isinstance(response_data, dict):
                    entity_type = response_data.get("entity_type") or entity_type
                    entity_id = response_data.get("entity_id") or entity_id
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
                    "Metadata": metadata,
                    # Datos de contexto agregados
                    "JugadorPersonaId": target_persona_id,
                    "JugadorNombre": target_nombre,
                    "JugadorCURP": target_curp,
                    "EquipoId": equipo_id,
                    "LigaId": liga_id
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
