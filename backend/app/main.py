from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles # Importación necesaria
from app.rutas import auth_ruta, solicitud_ruta, pagos_ruta, foto_ruta, documentos_ruta, equipo_ruta, permisos_ruta, gestion_ruta, personas_ruta, auditoria_ruta
from app.utilidades.context import usuario_actual_id, ip_actual
from app.db.sesion import SessionLocal
from app.core.seguridad import obtener_usuario_desde_token
import os
from app.excepciones.base import AppError

app = FastAPI(
    title = "BackendAFAEM",
    version = "0.3.0"
)

# Servir archivos estáticos (Documentos, Vouchers) con ruta absoluta
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://192.168.0.172:3000",

        "http://localhost:5173",
        "http://192.168.0.172:5173",
        
        "http://localhost:5174",
        "http://192.168.0.172:5174",
    ],
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

# CAPTURADOR GLOBAL DE ERRORES (PARA DIAGNÓSTICO)
@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "code": exc.code,
            "message": exc.message
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