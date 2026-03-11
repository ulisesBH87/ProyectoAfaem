from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.rutas import auth_ruta, solicitud_ruta

app = FastAPI(
    title = "BackendAFAEM",
    version = "1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://192.168.0.172:3000",
        "http://localhost:5173",
        "http://192.168.0.172:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],

)

app.include_router(auth_ruta.router)
app.include_router(solicitud_ruta.router)

@app.get("/")
def health_check():
    return {"status":"ok"}