from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.rutas import auth_ruta, solicitud_ruta, pagos_ruta, foto_ruta, documentos_ruta, equipo_ruta

app = FastAPI(
    title = "BackendAFAEM",
    version = "0.3.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://192.168.0.172:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://192.168.0.172:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
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
app.include_router(equipo_ruta.router)

#RUTA DE FOTOGRAFIA
app.include_router(foto_ruta.router)

@app.get("/")
def health_check():
    return {"status":"ok"}