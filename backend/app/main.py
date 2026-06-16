from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles # Importación necesaria
from app.rutas import auth_ruta, solicitud_ruta, pagos_ruta, foto_ruta, documentos_ruta, equipo_ruta, permisos_ruta, gestion_ruta, personas_ruta, auditoria_ruta, catalogos_ruta
from app.utilidades.context import usuario_actual_id, ip_actual
from app.db.sesion import SessionLocal
from app.core.seguridad import obtener_usuario_desde_token
import os
from app.excepciones.base import AppError

app = FastAPI(
    docs_url=None,
    title = "BackendAFAEM",
    version = "0.3.0"
)

# Servir archivos estáticos (Documentos, Vouchers) con ruta absoluta
from app.core.config import obtener_uploads_dir
UPLOADS_DIR = obtener_uploads_dir()
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

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
    # Esto evita el TypeError y fuerza el modo oscuro aunque el CDN falle
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
from app.core.config import obtener_configuracion
config_cors = obtener_configuracion()
cors_origins = [
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
]
if config_cors.CORS_ALLOWED_ORIGINS:
    env_origins = [o.strip() for o in config_cors.CORS_ALLOWED_ORIGINS.split(",") if o.strip()]
    cors_origins.extend(env_origins)
    cors_origins = list(set(cors_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#middleware para auditoría
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

    except Exception as e:
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

#importación de rutas


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

#Errores no controlados
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