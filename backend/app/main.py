from fastapi import FastAPI, Request, HTTPException, Query
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.middleware.cors import CORSMiddleware
from app.rutas import (
    auth_ruta,
    solicitud_ruta,
    pagos_ruta,
    foto_ruta,
    documentos_ruta,
    equipo_ruta,
    permisos_ruta,
    gestion_ruta,
    personas_ruta,
    auditoria_ruta,
    catalogos_ruta,
    whatsapp_webhook_ruta,
)
from app.utilidades.context import usuario_actual_id, ip_actual
from app.db.sesion import SessionLocal
from app.core.seguridad import obtener_usuario_desde_token
import os
from typing import Optional
from app.excepciones.base import AppError

app = FastAPI(
    docs_url=None,
    title="BackendAFAEM",
    version="0.3.0"
)

# Servir archivos estáticos (Documentos, Vouchers) de manera protegida
from app.core.config import obtener_uploads_dir
UPLOADS_DIR = obtener_uploads_dir()

@app.get("/uploads/{path:path}")
async def servir_archivo_uploads(
    path: str,
    request: Request
):
    # 1. Normalizar ruta y validar que exista
    filepath = os.path.normpath(os.path.join(UPLOADS_DIR, path))
    
    # Prevenir Directory Traversal
    if not filepath.startswith(os.path.normpath(UPLOADS_DIR)):
        raise HTTPException(status_code=403, detail="Acceso denegado")
        
    if not os.path.exists(filepath) or os.path.isdir(filepath):
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
        
    # 2. Permitir logos de equipo públicamente sin autenticación
    parts = path.replace("\\", "/").strip("/").split("/")
    if len(parts) == 3 and parts[0] == "equipos" and parts[2].startswith("logo."):
        return FileResponse(filepath)
        
    # 3. Para archivos sensibles (INE, actas, fotos, vouchers) requerir autenticación
    db = SessionLocal()
    try:
        token_a_usar = None
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token_a_usar = auth_header.split(" ")[1]
                
        if not token_a_usar:
            raise HTTPException(status_code=401, detail="No autenticado")
            
        from jose import jwt, JWTError
        from app.core.seguridad import config as sec_config, obtener_usuario_por_id
        
        try:
            payload = jwt.decode(token_a_usar, sec_config.SECRET_KEY, algorithms=[sec_config.ALGORITHM])
            token_type = payload.get("type")
            if token_type == "access":
                usuario_id = payload.get("sub")
                usuario_db = obtener_usuario_por_id(db, int(usuario_id))
                if not usuario_db:
                    raise HTTPException(status_code=401, detail="Usuario no encontrado")
                auth_info = {"type": "access", "usuario": usuario_db}
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
            
        # 4. Validar permisos para la ruta del archivo
        clean_path = path.replace("\\", "/")
        
        from app.modelos.documentos_entregados_modelo import DocumentosEntregados
        from app.modelos.ordenes_pago_modelo import OrdenPago
        from app.modelos.presidente_equipo_modelo import PresidenteEquipo
        from app.modelos.miembro_equipo_modelo import MiembrosEquipo
        from app.modelos.equipo_modelo import EquiposJugando
        from app.modelos.equipo_temporal_jugador_modelo import EquipoTemporalJugador
        from app.modelos.equipo_temporal_modelo import EquipoTemporal
        from app.modelos.usuario_modelo import Usuario
        
        # Buscar en DocumentosEntregados
        doc = db.query(DocumentosEntregados).filter(
            (DocumentosEntregados.RutaArchivo == clean_path) |
            (DocumentosEntregados.RutaArchivo == f"uploads/{clean_path}") |
            (DocumentosEntregados.RutaArchivo == f"/uploads/{clean_path}")
        ).first()
        
        permitido = False
        if doc:
            if auth_info["type"] == "access":
                usuario_act = auth_info["usuario"]
                rol_id = getattr(usuario_act, "RolId", None)
                if rol_id == 1:
                    permitido = True
                elif doc.PersonaId == usuario_act.PersonaId:
                    permitido = True
                elif rol_id in (3, 4):
                    presidente = db.query(PresidenteEquipo).filter(
                        PresidenteEquipo.PersonaId == usuario_act.PersonaId
                    ).first()
                    if presidente:
                        filter_cond = EquiposJugando.EntrenadorEquipoId == presidente.PresidenteEquipoId if presidente.TipoDirectivoId == 2 else EquiposJugando.PresidenteEquipoId == presidente.PresidenteEquipoId
                        
                        is_member = db.query(MiembrosEquipo).join(
                            EquiposJugando, MiembrosEquipo.EquipoID == EquiposJugando.EquipoId
                        ).filter(
                            MiembrosEquipo.PersonaId == doc.PersonaId,
                            MiembrosEquipo.Eliminado == False,
                            filter_cond
                        ).first() is not None
                        
                        is_temp_member = db.query(EquipoTemporalJugador).join(
                            EquipoTemporal, EquipoTemporalJugador.EquipoTemporalId == EquipoTemporal.EquipoTemporalId
                        ).filter(
                            EquipoTemporal.UsuarioId == usuario_act.UsuarioId,
                            EquipoTemporalJugador.PersonaId == doc.PersonaId
                        ).first() is not None
                        
                        permitido = is_member or is_temp_member
                else:
                    permitido = (doc.PersonaId == usuario_act.PersonaId)
            elif auth_info["type"] == "temp_invitation_session":
                usuario_id = auth_info["usuario_id"]
                candidate_user = db.query(Usuario).filter(Usuario.UsuarioId == usuario_id).first()
                if candidate_user and doc.PersonaId == candidate_user.PersonaId:
                    permitido = True
                else:
                    is_temp_member = db.query(EquipoTemporalJugador).join(
                        EquipoTemporal, EquipoTemporalJugador.EquipoTemporalId == EquipoTemporal.EquipoTemporalId
                    ).filter(
                        EquipoTemporal.UsuarioId == usuario_id,
                        EquipoTemporalJugador.PersonaId == doc.PersonaId
                    ).first() is not None
                    permitido = is_temp_member
        else:
            # Buscar en OrdenPago (vouchers)
            orden = db.query(OrdenPago).filter(
                (OrdenPago.RutaVoucher == clean_path) |
                (OrdenPago.RutaVoucher == f"uploads/{clean_path}") |
                (OrdenPago.RutaVoucher == f"/uploads/{clean_path}")
            ).first()
            
            if orden:
                if auth_info["type"] == "access":
                    usuario_act = auth_info["usuario"]
                    rol_id = getattr(usuario_act, "RolId", None)
                    if rol_id == 1:
                        permitido = True
                    else:
                        permitido = (orden.UsuarioId == usuario_act.UsuarioId)
                elif auth_info["type"] == "temp_invitation_session":
                    usuario_id = auth_info["usuario_id"]
                    permitido = (orden.UsuarioId == usuario_id)
                    
        if not permitido:
            raise HTTPException(status_code=403, detail="No tienes autorización para acceder a este archivo")
            
        return FileResponse(filepath)
    finally:
        db.close()


@app.get("/docs", include_in_schema=False)
async def custom_docs():
    # 1. Obtenemos el HTML base estándar
    response = get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=app.title + " - Dark Mode",
        oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css",
    )
    
    # 2. "Hackeamos" el contenido para meterle el estilo oscuro manualmente
    dark_css = """
    <style>
        /* Fondo general y textos principales */
        body, .swagger-ui { 
            background-color: #1b1b1b !important; 
            color: #d1d1d1 !important; 
        }
        
        /* Títulos e información superior */
        .swagger-ui .info .title, .swagger-ui .info p, .swagger-ui .info li, .swagger-ui .opblock-tag { 
            color: #ffffff !important; 
        }

        /* Secciones de los Endpoints (Acordeones) */
        .swagger-ui .opblock { 
            background: #2a2a2a !important; 
            border-color: #333 !important; 
        }
        .swagger-ui .opblock .opblock-summary { 
            border-bottom: 1px solid #3d3d3d; 
        }
        
        /* Secciones internas (Parámetros y Responses) */
        .swagger-ui .opblock-section-header, .swagger-ui .responses-inner { 
            background: #252525 !important; 
        }

        /* Esquemas y JSON (lo que se veía gris claro) */
        .swagger-ui section.models { 
            background-color: #252525 !important; 
            border: 1px solid #333;
        }
        .swagger-ui .model-box, .swagger-ui section.models .model-container { 
            background-color: #252525 !important; 
        }

        /* Inputs y cuadros de texto */
        .swagger-ui input, .swagger-ui textarea, .swagger-ui select { 
            background-color: #333 !important; 
            color: white !important; 
            border: 1px solid #444 !important;
        }

        /* Botón de Authorize */
        .swagger-ui .btn.authorize { 
            color: #49cc90 !important; 
            border-color: #49cc90 !important; 
            background-color: transparent !important;
        }

        /* Bloques de código (JSON) */
        .swagger-ui .microlight { 
            background-color: #2d2d2d !important; 
            color: #e6db74 !important; 
        }

        /* Color de la ruta (p. ej. /auth/registro) */
        .swagger-ui .opblock .opblock-summary-path {
            color: #e4e4e4 !important;
        }

        /* Color de la descripción corta (p. ej. Register) */
        .swagger-ui .opblock .opblock-summary-description {
            color: #afafaf !important;
        }

        /* Color de los métodos cuando están expandidos */
        .swagger-ui .opblock .opblock-summary-path__deprecated {
            color: #999 !important;
        }

        /* Por si acaso: color del candado de seguridad */
        .swagger-ui .authorization__btn svg {
            fill: #49cc90 !important;
        }

        /* Encabezados internos: Parameters, Request body, Responses */
        .swagger-ui .opblock-section-header h4, 
        .swagger-ui .opblock-title_normal,
        .swagger-ui .tabli button { 
            color: #ffffff !important; 
        }

        /* Texto de 'No parameters', 'Description', 'Code' en las tablas */
        .swagger-ui table thead tr td, 
        .swagger-ui table thead tr th,
        .swagger-ui .response-col_status,
        .swagger-ui .response-col_links,
        .swagger-ui .parameter__name,
        .swagger-ui .parameter__type,
        .swagger-ui .parameter__in { 
            color: #e0e0e0 !important; 
        }

        /* El texto "required" en rojo (para que resalte mejor) */
        .swagger-ui .parameter__name.required::after,
        .swagger-ui .opblock-description-wrapper p,
        .swagger-ui .opblock-external-docs-wrapper p,
        .swagger-ui .opblock-title_normal p {
            color: #d1d1d1 !important;
        }

        /* Texto de los mensajes cuando no hay parámetros */
        .swagger-ui .opblock-section-header .opblock-section-header__label {
            color: #ffffff !important;
        }
    </style>
    """
    
    # Insertamos nuestro estilo antes de cerrar el </head>
    content = response.body.decode("utf-8").replace("</head>", f"{dark_css}</head>")
    
    return HTMLResponse(content=content)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # Desarrollo local
        "http://localhost:3000",
        "http://192.168.0.172:3000",
        "http://localhost:5173",
        "http://192.168.0.172:5173",
        "http://localhost:5174",
        "http://192.168.0.172:5174",
        # Producción
        "http://201.131.21.213",
        "http://201.131.21.213:80",
        "http://afaem.scholatek.com",
        "https://afaem.scholatek.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# middleware para auditoría
@app.middleware("http")
async def auditoria_contexto_middleware(request: Request, call_next):
    ip = request.client.host if request.client else None
    ip_actual.set(ip)

    user_id = None
    db = SessionLocal() 

    try:
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            user = obtener_usuario_desde_token(token, db)
            if user:
                user_id = user.UsuarioId
    except Exception:
        user_id = None
    finally:
        db.close()

    usuario_actual_id.set(user_id)

    response = await call_next(request)
    return response

@app.middleware("http")
async def agregar_cabeceras_seguridad(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Content-Security-Policy"] = "frame-ancestors 'none';"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response

# importación de rutas
app.include_router(auth_ruta.router)
app.include_router(solicitud_ruta.router)
app.include_router(documentos_ruta.router)
app.include_router(pagos_ruta.router)
app.include_router(foto_ruta.router)
app.include_router(equipo_ruta.router)
app.include_router(permisos_ruta.router)
app.include_router(gestion_ruta.router)
app.include_router(personas_ruta.router)
app.include_router(auditoria_ruta.router)
app.include_router(catalogos_ruta.router)
app.include_router(whatsapp_webhook_ruta.router)

# CAPTURADOR GLOBAL DE ERRORES (PARA DIAGNÓSTICO)
@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "code": exc.code,
            "message": exc.message,
            "detail": exc.detail
        }
    )

# Errores no controlados
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "code": "INTERNAL_SERVER_ERROR",
            "message": "Ocurrió un error inesperado. Por favor, inténtalo de nuevo más tarde."
        }
    )

@app.get("/")
def health_check():
    return {"status":"ok"}