from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.rutas import auth_ruta, solicitud_ruta, pagos_ruta, foto_ruta, documentos_ruta, equipo_ruta, permisos_ruta
import traceback

app = FastAPI(
    title = "BackendAFAEM",
    version = "0.3.0"
)

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

app.include_router(auth_ruta.router)
app.include_router(solicitud_ruta.router)
app.include_router(documentos_ruta.router)
app.include_router(pagos_ruta.router)
app.include_router(foto_ruta.router)
app.include_router(equipo_ruta.router)
app.include_router(permisos_ruta.router)

# CAPTURADOR GLOBAL DE ERRORES (PARA DIAGNÓSTICO)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Si es una excepción HTTP intencional (401, 403, 404, etc.), dejar que FastAPI la maneje
    if isinstance(exc, HTTPException):
        raise exc
    
    error_detail = traceback.format_exc()
    print(f"--- ERROR GLOBAL CAPTURADO ---\n{error_detail}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": {
                "message": str(exc),
                "traceback": error_detail.split("\n")[-6:-1]
            }
        }
    )

@app.get("/")
def health_check():
    return {"status":"ok"}