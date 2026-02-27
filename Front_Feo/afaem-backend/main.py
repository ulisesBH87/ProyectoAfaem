# ARCHIVO PRINCIPAL DEL BACKEND 
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
from pydantic import BaseModel

# VARIABLE QUE UVICORN BUSCA: app = FastAPI()
app = FastAPI()

# PERMITE QUE REACT PUEDA CONECTARSE DESDE LOCALHOST
app.add_middleware(
    CORSMiddleware,
    # EN DESARROLLO PERMITIR LOS ORIGNENES QUE USE. SE PODRÁN AÑADIR OTROS O USAR ["*"] TEMPORALMENTE.
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# CARPETA TEMPORAL PARA GUARDAR LOS ARCHIVOS SUBIDOS
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# RUTA PARA SUBIR ARCHIVOS
@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    # COMENTARIO EN MAYÚSCULAS: GUARDA EL ARCHIVO EN LA CARPETA uploads
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    
    # EVITA SOBREESCRIBIR SI YA EXISTE (AGREGA NÚMERO)
    base, ext = os.path.splitext(file.filename)
    counter = 1
    while os.path.exists(file_path):
        file_path = os.path.join(UPLOAD_FOLDER, f"{base}_{counter}{ext}")
        counter += 1
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {
        "filename": file.filename,
        "saved_as": os.path.basename(file_path),
        "status": "guardado temporalmente en la carpeta uploads"
    }

#  MENSAJE DE BIENVENIDA
@app.get("/")
def read_root():
    return {"message": "Backend AFAEM corriendo - Usa /upload/ para subir archivos"}

class Verification(BaseModel):
    email: str
    code: str

@app.post("/send-verification/")
async def send_verification(payload: Verification):
    # AQUÍ SOLO SIMULAMOS EL ENVÍO: EN PRODUCCIÓN REEMPLAZA POR SMTP O SERVICIO DE CORREO
    print(f"[VERIFICACIÓN] Enviar código {payload.code} a {payload.email}")
    # OPCIONAL: GUARDAR EN ARCHIVO DE LOGS
    try:
        with open("sent_verifications.log", "a", encoding="utf-8") as f:
            f.write(f"{payload.email} | {payload.code} | {str(__import__('datetime').datetime.utcnow())}\n")
    except Exception:
        pass
    return {"status": "ok", "message": "Código enviado (simulado)"}