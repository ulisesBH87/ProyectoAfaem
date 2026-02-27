
from fastapi import FastAPI, UploadFile, File, HTTPException, Body, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import date
import os
import uuid
import shutil
import time

APP_DIR = os.path.dirname(__file__)
UPLOAD_DIR = os.path.join(APP_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="AFAEM Demo API")

# ENDPOINT RAÍZ PARA PING DEL FRONTEND
@app.get("/")
async def root():
    return {"status": "ok", "message": "API activa"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # AJUSTAR
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ALMACENAMIENTO DE DEMO EN MEMORIA (SIN DB) ---
_users = [
    {
        "email": "emilianosaaib@gmail.com",
        "telefono": "1234567890",
        "Nombre": "Emiliano",
        "PrimerApellido": "Saab",
        "SegundoApellido": "Ibrahim",
        "password": "123456"
    },
    {
        "email": "test@afaem.com",
        "telefono": "9876543210",
        "Nombre": "Test",
        "PrimerApellido": "Usuario",
        "SegundoApellido": "Demo",
        "password": "password123"
    }
]  # LISTA DE DICTS: {email, telefono, Nombre, PrimerApellido, SegundoApellido, password}
_verification_codes = {}  # EMAIL - CÓDIGO
_password_reset_tokens = {}  # EMAIL - {token, timestamp}

# --- ALMACENAMIENTO DE EQUIPOS EN MEMORIA ---
_teams = [
    {
        "id": 1,
        "name": "Real Huexca",
        "logo": "🐯",
        "owner_email": "emilianosaaib@gmail.com",
        "modality": "Fútbol 11",
        "players": {"current": 18, "max": 25},
        "trainers": 1,
        "status": "Activo",
        "status_color": "#28a745",
        "created_at": "2026-01-15"
    },
    {
        "id": 2,
        "name": "AJAX Altos de Morelos",
        "logo": "⚽",
        "owner_email": "emilianosaaib@gmail.com",
        "modality": "Fútbol 11",
        "players": {"current": 18, "max": 25},
        "trainers": 1,
        "status": "Documentación",
        "status_color": "#dc3545",
        "created_at": "2026-02-01"
    }
]

# --- ALMACENAMIENTO DE SOLICITUDES EN MEMORIA ---
_solicitudes = [
    {
        "id": 1,
        "UsuarioId": "user_001",
        "email": "entrenador@example.com",
        "CURP": "SAIB000505HDFMNN09",
        "RFC": "SAIB000505ABC",
        "SexoId": 1,
        "FechaNacimiento": "2000-05-05",
        "FechaSolicitud": "2026-02-20T10:30:00.000Z",
        "EstatusValidacion": 2,
        "tipo": "entrenador"
    }
]

# --- ESQUEMAS ---
class LoginRequest(BaseModel):
    Correo: str
    Contrasena: str

class ValidateUniqueRequest(BaseModel):
    Nombre: Optional[str] = None
    PrimerApellido: Optional[str] = None
    SegundoApellido: Optional[str] = None
    Correo: Optional[str] = None
    Telefono: Optional[str] = None
    tipoSolicitud: Optional[str] = None

class SendVerificationRequest(BaseModel):
    Correo: str
    code: str

class PresidentDataRequest(BaseModel):
    Nombre: str
    PrimerApellido: str
    SegundoApellido: Optional[str] = ""
    Correo: str
    Telefono: str

class ForgotPasswordRequest(BaseModel):
    Correo: str

class ResetPasswordRequest(BaseModel):
    Correo: str
    token: str
    nueva_contrasena: str

class UserProfileResponse(BaseModel):
    email: str
    Nombre: str
    PrimerApellido: str
    SegundoApellido: Optional[str] = ""
    telefono: str
    isCertified: bool = False

class SolicitudResponse(BaseModel):
    id: int
    UsuarioId: str
    email: str
    CURP: str
    RFC: str
    SexoId: int
    FechaNacimiento: str
    FechaSolicitud: str
    EstatusValidacion: int
    tipo: Optional[str] = None

class TeamResponse(BaseModel):
    id: int
    name: str
    logo: str
    modality: str
    players: dict
    trainers: int
    status: str
    status_color: str
    created_at: str

# --- FUNCIONES AUXILIARES ---
def find_user_by_email(email: str):
    email = (email or "").lower().strip()
    for u in _users:
        if u.get("correo", "").lower() == email:
            return u
    return None

def find_user_by_phone(phone: str):
    p = "".join([c for c in (phone or "") if c.isdigit()])[-10:]
    for u in _users:
        if "".join([c for c in (u.get("telefono") or "") if c.isdigit()])[-10:] == p:
            return u
    return None

# --- REGISTRO DE USUARIO ---
class SignupRequest(BaseModel):
    Nombre: str
    PrimerApellido: str
    SegundoApellido: str = ""
    Correo: str
    NumeroTelefono: str
    Contrasena: str
    

@app.post("/signup")
async def signup(req: SignupRequest = Body(...)):
    # VALIDAR SI YA EXISTE EL USUARIO POR CORREO 

    
    # CREAR USUARIO Y GUARDAR EN MEMORIA
    user = {
        "Nombre": req.Nombre,
        "PrimerApellido": req.PrimerApellido,
        "SegundoApellido": req.SegundoApellido,
        "Correo": req.Correo.lower(),
        "Contrasena": req.Contrasena,
        "NumeroTelefono": req.NumeroTelefono       
    }
    _users.append(user)
    print(f"[DEBUG] Usuario guardado: {user}")
    return {"ok": True, "user": {"Nombre": user["Nombre"], "PrimerApellido": user["PrimerApellido"], "SegundoApellido": user["SegundoApellido"], "Correo": user["Correo"], "Contrasena": user["Contrasena"], "NumeroTelefono": user["NumeroTelefono"]}}

# ALIAS PARA CONSISTENCIA CON RUTAS /auth/*
@app.post("/auth/registro")
async def auth_registro(req: SignupRequest = Body(...)):
    """Alias para /signup - Usa el mismo endpoint"""
    return await signup(req)

# --- ENDPOINTS / RUTAS ---
@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/auth/iniciar-sesion")
async def auth_login(req: LoginRequest):
    # DEMO: SI EL USUSARIO NO EXISTE LO CREAMOS (SOLO PARA PRUEBAS)
    u = find_user_by_email(req.Correo)
    if not u:
        # CREAR USUARIO DEMO
        u = {
            "email": req.Correo.lower(),
            "telefono": "",
            "Nombre": "",
            "PrimerApellido": "",
            "SegundoApellido": "",
            "password": req.Contrasena,  
        }
        _users.append(u)
    # COMPROBACIÓN BÁSICA (ACEPTA CUALQUIER CONTRASEÑA EN DEMO)
    # RETORNAR TOKEN SIMULADO E INFORMACIÓN DEL USUARIO
    token = f"devtoken-{uuid.uuid4().hex}"
    return {"token": token, "user": {"Correo": u["email"], "telefono": u["telefono"], "Nombre": u["Nombre"]}}

@app.post("/validate-unique/")
async def validate_unique(req: ValidateUniqueRequest):
    # COMPRUEBA CORREO Y TELÉFONO EN USUARIOS EN MEMORIA 
    out = {"correo": False, "telefono": False}
    if req.Correo:
        if find_user_by_email(req.Correo):
            out["correo"] = True
    if req.Telefono:
        if find_user_by_phone(req.Telefono):
            out["telefono"] = True
    return out

@app.post("/send-verification/")
async def send_verification(req: SendVerificationRequest):
    # GUARDAMOS EL CÓDIGO EN MEMORIA (SIMULACIÓN DE ENVÍO DE EMAIL)
    email = (req.Correo or "").lower().strip()
    code = str(req.code)
    _verification_codes[email] = code
    # EN DEMO IMPRIMIMOS EN CONSOLA PARA VER EL CÓDIGO
    print(f"[demo] Código de verificación para {email}: {code}")
    return {"ok": True, "Correo": email}

@app.post("/auth/recuperar-contrasena")
async def forgot_password(req: ForgotPasswordRequest):
    # BUSCAR USUARIO POR CORREO
    email = (req.Correo or "").lower().strip()
    user = find_user_by_email(email)
    if not user:
        # Por razones de seguridad, no decimos si el email existe o no
        # Pero para demostración, lo logueamos
        print(f"[forgot-pwd] Email no encontrado: {email}")
        return {"ok": True, "message": "Si el correo existe, recibirás un enlace de recuperación"}
    
    # GENERAR TOKEN ÚNICO
    reset_token = uuid.uuid4().hex
    timestamp = time.time()
    _password_reset_tokens[email] = {
        "token": reset_token,
        "timestamp": timestamp
    }
    
    # EN DEMO IMPRIMIMOS EL TOKEN PARA VER
    print(f"[demo] Token de recuperación para {email}: {reset_token}")
    
    # DEVOLVER EL TOKEN PARA TESTING LOCAL
    return {
        "ok": True,
        "message": "Si el correo existe, recibirás un enlace de recuperación",
        "token": reset_token  # SOLO PARA TESTING LOCAL - ELIMINAR EN PRODUCCIÓN
    }

@app.post("/auth/resetear-contrasena")
async def reset_password(req: ResetPasswordRequest):
    # VALIDAR PARÁMETROS
    email = (req.Correo or "").lower().strip()
    token = (req.token or "").strip()
    nueva_contrasena = req.nueva_contrasena
    
    if not email or not token or not nueva_contrasena:
        raise HTTPException(status_code=400, detail="Email, token y nueva contraseña son requeridos")
    
    # BUSCAR EL TOKEN
    if email not in _password_reset_tokens:
        raise HTTPException(status_code=400, detail="Token inválido o expirado")
    
    token_data = _password_reset_tokens[email]
    if token_data["token"] != token:
        raise HTTPException(status_code=400, detail="Token inválido")
    
    # VALIDAR QUE NO HAYA EXPIRADO (VÁLIDO POR 24 HORAS)
    elapsed = time.time() - token_data["timestamp"]
    if elapsed > 86400:  # 24 horas
        del _password_reset_tokens[email]
        raise HTTPException(status_code=400, detail="Token expirado")
    
    # BUSCAR Y ACTUALIZAR USUARIO
    user = find_user_by_email(email)
    if not user:
        raise HTTPException(status_code=400, detail="Usuario no encontrado")
    
    # ACTUALIZAR CONTRASEÑA
    user["password"] = nueva_contrasena
    
    # ELIMINAR EL TOKEN USADO
    del _password_reset_tokens[email]
    
    return {"ok": True, "message": "Contraseña actualizada correctamente"}

@app.post("/president-data")
async def save_president_data(req: PresidentDataRequest):
    # GUARDAR DATOS DEL PRESIDENTE EN MEMORIA
    email = (req.Correo or "").lower().strip()
    # BUSCAR SI YA EXISTE EL USUARIO
    user = find_user_by_email(email)
    if not user:
        # CREAR NUEVO USUARIO
        user = {
            "email": email,
            "telefono": req.Telefono,
            "Nombre": req.Nombre,
            "PrimerApellido": req.PrimerApellido,
            "SegundoApellido": req.SegundoApellido,
            "password": "",
            "presidentData": True
        }
        _users.append(user)
    else:
        # ACTUALIZAR DATOS EXISTENTES
        user["Nombre"] = req.Nombre
        user["PrimerApellido"] = req.PrimerApellido
        user["SegundoApellido"] = req.SegundoApellido
        user["telefono"] = req.Telefono
        user["presidentData"] = True
    
    return {
        "ok": True,
        "message": "Datos del presidente guardados correctamente",
        "user": {
            "email": user["email"],
            "Nombre": user["Nombre"],
            "PrimerApellido": user["PrimerApellido"],
            "SegundoApellido": user["SegundoApellido"],
            "telefono": user["telefono"]
        }
    }

@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    # VALIDAR EXTENSIÓN PERMITIDA
    filename = file.filename or "upload"
    ext = os.path.splitext(filename)[1].lower()
    allowed = [".pdf", ".png", ".jpg", ".jpeg", ".xlsx"]
    if ext not in allowed:
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido")
    saved_name = f"{uuid.uuid4().hex}{ext}"
    dest_path = os.path.join(UPLOAD_DIR, saved_name)
    # GUARDAR ARCHIVO DE FORMA EFICIENTE
    with open(dest_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"filename": filename, "saved_as": saved_name, "path": f"/uploads/{saved_name}"}

# SERVIR LISTANDO SIMPLE DE ARCHIVOS SUBIDOS (PARA RPUEBAS)
@app.get("/uploads")
async def list_uploads():
    files = []
    for fn in os.listdir(UPLOAD_DIR):
        files.append(fn)
    return {"files": files}

# --- NUEVOS ENDPOINTS PARA DASHBOARD DE PRESIDENTE ---

@app.get("/user/profile")
async def get_user_profile(email: str):
    """
    Obtiene el perfil del usuario logueado
    """
    user = find_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    return {
        "email": user.get("email"),
        "nombre": user.get("Nombre", ""),
        "PrimerApellido": user.get("PrimerApellido", ""),
        "SegundoApellido": user.get("SegundoApellido", ""),
        "telefono": user.get("telefono", ""),
        "isCertified": user.get("isCertified", False)
    }

@app.get("/teams")
async def get_user_teams(email: str):
    """
    Obtiene todos los equipos del usuario logueado
    """
    user = find_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    user_teams = [team for team in _teams if team["owner_email"].lower() == email.lower()]
    
    return {
        "teams": user_teams,
        "total": len(user_teams)
    }

@app.get("/teams/{team_id}")
async def get_team_detail(team_id: int, email: str):
    """
    Obtiene detalles de un equipo específico
    """
    team = next((t for t in _teams if t["id"] == team_id and t["owner_email"].lower() == email.lower()), None)
    
    if not team:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    
    return team

@app.post("/teams")
async def create_team(
    teamName: str,
    modality: str,
    category: str,
    season: str,
    email: str,
    paymentProof: UploadFile = File(...),
    teamLogo: UploadFile = File(...)
):
    """
    Crea un nuevo equipo para el usuario con archivo de comprobante y logo
    """
    user = find_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # GUARDAR COMPROBANTE DE PAGO
    proof_filename = paymentProof.filename or "payment_proof"
    proof_ext = os.path.splitext(proof_filename)[1].lower()
    proof_saved = f"{uuid.uuid4().hex}{proof_ext}"
    proof_path = os.path.join(UPLOAD_DIR, proof_saved)
    with open(proof_path, "wb") as f:
        shutil.copyfileobj(paymentProof.file, f)
    
    # GUARDAR LOGO
    logo_filename = teamLogo.filename or "team_logo"
    logo_ext = os.path.splitext(logo_filename)[1].lower()
    logo_saved = f"{uuid.uuid4().hex}{logo_ext}"
    logo_path = os.path.join(UPLOAD_DIR, logo_saved)
    with open(logo_path, "wb") as f:
        shutil.copyfileobj(teamLogo.file, f)
    
    # Generar ID único para el equipo
    new_id = max([t["id"] for t in _teams] or [0]) + 1
    
    new_team = {
        "id": new_id,
        "name": teamName,
        "logo": f"/uploads/{logo_saved}",
        "owner_email": email,
        "modality": modality,
        "category": category,
        "season": season,
        "paymentProof": f"/uploads/{proof_saved}",
        "players": {"current": 0, "max": 25},
        "trainers": 0,
        "status": "Pendiente de validación",
        "status_color": "#ffc107",
        "created_at": time.strftime("%Y-%m-%d")
    }
    
    _teams.append(new_team)
    print(f"[✓] Equipo creado: {teamName} por {email}")
    return {"ok": True, "team": new_team}

@app.put("/user/certify")
async def certify_user(email: str):
    """
    Marca un usuario como certificado
    """
    user = find_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    user["isCertified"] = True
    
    return {"ok": True, "message": "Usuario certificado correctamente", "user": user}

# --- ENDPOINT PARA VER SOLICITUDES (REQUIERE TOKEN) ---
@app.get("/solicitud/solicitudes-usuarios")
async def get_solicitudes_usuarios(request: Request):
    """
    Obtiene todas las solicitudes de usuarios.
    Requiere token en header: Authorization: Bearer TU_TOKEN_AQUI
    """
    # OBTENER EL HEADER AUTHORIZATION
    auth_header = request.headers.get("Authorization", "")
    
    # VALIDAR QUE EXISTA EL HEADER
    if not auth_header:
        raise HTTPException(status_code=401, detail="Token no proporcionado. Use: Authorization: Bearer TU_TOKEN_AQUI")
    
    # VERIFICAR QUE TENGA EL FORMATO CORRECTO
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Formato inválido. Use: Authorization: Bearer TU_TOKEN")
    
    # EXTRAER EL TOKEN
    token = auth_header.replace("Bearer ", "").strip()
    
    # VALIDAR QUE EL TOKEN NO ESTÉ VACÍO
    if not token:
        raise HTTPException(status_code=401, detail="Token vacío")
    
    # AQUÍ PUEDES AGREGAR LÓGICA PARA VALIDAR EL TOKEN SI TIENES JWT
    # POR AHORA, SOLO VERIFICAMOS QUE EXISTA
    print(f"📋 Solicitudes solicitadas con token: {token[:20]}...")
    
    # RETORNAR TODAS LAS SOLICITUDES
    return {
        "ok": True,
        "total": len(_solicitudes),
        "solicitudes": _solicitudes
    }

