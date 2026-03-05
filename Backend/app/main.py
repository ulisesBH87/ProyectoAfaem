# Importaciones de FastAPI y el enrutador de validación de rutas
from fastapi import FastAPI

# Importar el enrutador de validación de rutas
from app.router.validacion_rutas import router

from fastapi.middleware.cors import CORSMiddleware


app = FastAPI() # Crear un enrutador para manejar las rutas de la API

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Permite la URL del frontend 
    allow_credentials=True,
    allow_methods=["*"],  # Permite todos los métodos HTTP
    allow_headers=["*"],  # Permite todos los encabezados
)

app.include_router(router) # Incluir el enrutador de validación de rutas en la aplicación FastAPI


@app.get("/")
def root():
    return {"mensaje": "API funcionando"}
