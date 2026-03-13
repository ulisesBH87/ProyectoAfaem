# FLUJO DE AUTENTICACIÓN COMPLETO

# Visión General

El sistema utiliza **JWT (JsonWebToken)** para autenticación stateless. Un usuario se registra, recibe un token, y usa ese token para acceder a recursos protegidos.

# Componentes de Seguridad

```
┌─────────────────────────────────────────────┐
│          USUARIO                            │
│  (accede desde el navegador)                │
└─────────────────┬───────────────────────────┘
                  │
                  │ 1. Credenciales
                  │ 2. Recibe JWT
                  │ 3. Envia JWT en headers
                  │
┌─────────────────▼───────────────────────────┐
│       FRONTEND (React)                      │
│  ├─ Guarda JWT en localStorage              │
│  ├─ Lo envía en cada request                │
│  ├─ Redirige si token es inválido           │
└─────────────────┬───────────────────────────┘
                  │
                  │ Authorization: Bearer <JWT>
                  │
┌─────────────────▼───────────────────────────┐
│    BACKEND (FastAPI)                        │
│  ├─ Valida JWT en cada petición             │
│  ├─ Extrae UsuarioId del JWT                │
│  ├─ Verifica que usuario existe en BD       │
│  └─ Permite u deniega la operación          │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│    CONTRASEÑA SEGURA (Hash + Salt)          │
│  ├─ Se genera salt único para cada usuario  │
│  ├─ Se hashea: SHA256(salt + password)      │
│  ├─ Se compara de forma segura (hmac)       │
└─────────────────────────────────────────────┘
```

# Paso 1: REGISTRO DE USUARIO

# Flujo Técnico

```
FRONTEND (SignUp.jsx):
────────────────────

usuario ingresa:
├─ Nombre
├─ Primer Apellido
├─ Segundo Apellido
├─ Correo
└─ Contraseña

Click "Registrar"
      ↓
registerUser({datos})
      ↓
POST /auth/registro
      ↓

BACKEND (auth_ruta.py):
──────────────────────

@router.post("/registro")
def register(data: RegistroUsuario, db: Session):
    ├─ Recibe datos validados por Pydantic
    └─ Llama: autenticacion_servicio.registrar_usuario(db, data)
         ↓

BACKEND (autenticacion_servicio.py):
────────────────────────────────────

def registrar_usuario(db, data):
    │
    ├─ 1. Generar SALT
    │     salt = generar_salt()  # String aleatorio
    │
    ├─ 2. Hashear contraseña
    │     hash_password = SHA256(salt + password)
    │     Resultado: "a1b2c3d4e5f6..."
    │
    ├─ 3. Crear objeto Usuario
    │     user = Usuario(
    │         Nombre = data.Nombre,
    │         Correo = data.Correo,
    │         Contrasena = hash_password,  # NO la contraseña original
    │         Salt = salt
    │     )
    │
    └─ 4. Guardar en BD
         return usuario_repositorio.crear_usuario(db, user)
         ↓

BASE DE DATOS:
──────────────

INSERT INTO Usuarios 
(Nombre, PrimerApellido, Correo, Contrasena, Salt)
VALUES
('Juan', 'Pérez', 'juan@example.com', 'a1b2c3d4...hash', 'x7y8z9...')

FRONTEND recibe:
───────────────

{ "message": "Usuario registrado correctamente" }
```

# Lo Importante

No se guarda la contraseña original, solo el hash. Nunca se puede recuperar la contraseña original.

```
Contraseña original: "MiPassword123"
       +
Salt: "x7y8z9a0b1c2d3..."
       ↓
SHA256 (hash criptográfico)
       ↓
Hash guardado en BD: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0..."
```

# Paso 2: INICIO DE SESIÓN

# Flujo Técnico

```
FRONTEND (Login.jsx):
─────────────────────

usuario ingresa:
├─ Correo: juan@example.com
└─ Contraseña: MiPassword123

Click "Iniciar sesión"
      ↓
loginUser(correo, password)
      ↓
POST /auth/iniciar-sesion
{
    "Correo": "juan@example.com",
    "Contrasena": "MiPassword123"
}
      ↓

BACKEND (auth_ruta.py):
──────────────────────

@router.post("/iniciar-sesion")
def login(data: InicioSesion, db: Session):
    │
    ├─ Llama: autenticacion_servicio.iniciar_sesion(db, correo, password)
    │
    └─ Si retorna usuario → crear JWT
           elif no → lanzar HTTPException(401, "Credenciales inválidas")


BACKEND (autenticacion_servicio.py):
────────────────────────────────────

def iniciar_sesion(db, correo, password):
    │
    ├─ 1. Buscar usuario por correo
    │     usuario = db.query(Usuario).filter(Usuario.Correo == correo).first()
    │     Si no existe → return None
    │
    ├─ 2. Extraer datos almacenados
    │     hash_guardado = usuario.Contrasena
    │     salt_guardado = usuario.Salt
    │
    ├─ 3. Verificar contraseña
    │     hash_nuevo = SHA256(salt_guardado + password)
    │     
    │     Si hash_nuevo == hash_guardado:
    │         → Contraseña correcta, return usuario
    │     Sino:
    │         → Contraseña incorrecta, return None
    │
    └─ Comparación segura: hmac.compare_digest()
         Previene ataques de timing


BACKEND (auth_ruta.py - continuación):
──────────────────────────────────────

Si autenticacion_servicio.iniciar_sesion() retorna usuario:
    │
    ├─ Crear datos para el JWT
    │     datos_token = {
    │         "UsuarioId": "123",
    │         "correo": "juan@example.com"
    │     }
    │
    └─ Llamar: crear_token(datos_token)
           ↓

BACKEND (core/seguridad.py):
────────────────────────────

def crear_token(data):
    │
    ├─ 1. Copiar datos
    │     datos = data.copy()
    │
    ├─ 2. Calcular expiración
    │     expire = ahora + 30 minutos
    │
    ├─ 3. Agregar datos especiales al JWT
    │     datos.update({
    │         "sub": "123",              # Subject (usuario ID)
    │         "exp": expire,             # Expiration time
    │         "type": "access"           # Tipo de token
    │     })
    │
    ├─ 4. Firmar el JWT
    │     token = jwt.encode(
    │         datos,
    │         SECRET_KEY,                # Clave privada del servidor
    │         algorithm="HS256"
    │     )
    │
    └─ Retorna: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWI..."
           ↓

FRONTEND recibe:
───────────────

{
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer"
}

      ↓

FRONTEND guarda token:
─────────────────────

localStorage.setItem('token', response.access_token)

localStorage ahora contiene:
{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

      ↓

FRONTEND redirige:
──────────────────

navigate('/trainer')  # O la página después del login
```

# Paso 3: USO DEL TOKEN EN PETICIONES PROTEGIDAS

# Flujo Técnico

```
FRONTEND (cualquier página después del login):
──────────────────────────────────────────────

Usuario hace una acción que necesita datos protegidos
(ej: obtener solicitudes)

crearSolicitud({datos})
      ↓
api.js - fetchAPI():
│
├─ 1. Obtener token del localStorage
│     token = localStorage.getItem('token')
│
├─ 2. Preparar headers
│     headers = {
│         'Content-Type': 'application/json',
│         'Authorization': 'Bearer eyJhbGc...'  ← Token aquí
│     }
│
└─ 3. Enviar petición con headers
     POST /solicitud/enviar-solicitud
     Headers: Authorization: Bearer <token>
     Body: {...}
           ↓

BACKEND (solicitud_ruta.py):
───────────────────────────

@router.post("/enviar-solicitud")
def solicitud(
    data: SolicitudCrear,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)  ← Valida JWT
):
    │
    ├─ FastAPI ejecuta: obtener_usuario_actual(token, db)
    │  (Esta es una dependencia de FastAPI)
    │


BACKEND (core/seguridad.py):
────────────────────────────

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/iniciar-sesion")

def obtener_usuario_actual(
    token: str = Depends(oauth2_scheme),  # FastAPI extrae el token del header
    db: Session = Depends(get_db)
):
    │
    ├─ 1. Extraer token del header Authorization
    │     (FastAPI lo hace automáticamente)
    │
    ├─ 2. Verificar integridad del JWT
    │     payload = ver ificador_token(token)  # Descodifica y verifica firma
    │
    ├─ 3. Extraer UsuarioId del payload
    │     usuario_id = payload.get("sub")  # "123"
    │
    ├─ 4. Verificar que el usuario existe en BD
    │     usuario = db.query(Usuario).filter(Usuario.UsuarioId == usuario_id).first()
    │     Si no existe → raise HTTPException(401, "Token inválido")
    │
    └─ 5. Retornar usuario
         return usuario  # ✓ Usuario validado


BACKEND (solicitud_ruta.py - continuación):
────────────────────────────────────────────

def solicitud(data, db, usuario):  ← usuario está disponible ahora
    │
    ├─ Llamar: crear_solicitud(db, data, usuario)
    │  (usuario viene garantizado como válido)
    │
    └─ return {"message": "Solicitud enviada correctamente"}
           ↓

FRONTEND recibe:
────────────────

{ "message": "Solicitud enviada correctamente" }
```

# Paso 4: EXPIRACIÓN DEL TOKEN

```
Si el token expira (después de 30 minutos):

FRONTEND intenta hacer una petición:
    ├─ Envía: Authorization: Bearer <token_expirado>
    └─ ↓

BACKEND en obtener_usuario_actual():
    ├─ JWT.decode() verifica que exp > ahora
    ├─ exp < ahora → JWTError
    └─ Lanza: HTTPException(401, "Token inválido o expirado")
             ↓

FRONTEND recibe error 401:
    ├─ Detecta error de autenticación
    ├─ Limpia localStorage.removeItem('token')
    ├─ Redirige a: navigate('/login')
    └─ Usuario debe iniciar sesión nuevamente
```

# Comparación: Antes vs Después del Login

```
ANTES DEL LOGIN (No autenticado):
────────────────────────────────

GET /solicitud/solicitudes-usuarios
Headers: {}

BACKEND:
├─ obtener_usuario_actual() intenta extraer el token
├─ No hay Authorization header
├─ Lanza: HTTPException(401, "No credentials provided")
└─ ACCESO DENEGADO


DESPUÉS DEL LOGIN (Autenticado):
─────────────────────────────────

GET /solicitud/solicitudes-usuarios
Headers: {
    Authorization: "Bearer eyJ..."
}

BACKEND:
├─ obtener_usuario_actual() extrae y verifica JWT
├─ JWT es válido y UsuarioId existe
├─ Pasa usuario a la ruta
└─ ACCESO PERMITIDO, devuelve solicitudes
```

# Formado del JWT (para referencia)

```
JWT = <header>.<payload>.<signature>

HEADER (Base64):
{
    "alg": "HS256",    # Algoritmo
    "typ": "JWT"       # Tipo
}

PAYLOAD (Base64):
{
    "UsuarioId": "123",             # Usuario
    "correo": "juan@example.com",   # Correo
    "sub": "123",                   # Subject (estándar)
    "exp": 1703012345,              # Expiration (timestamp)
    "type": "access"                # Tipo de token
}

SIGNATURE:
HMAC(
    HS256,
    <header>.<payload>,
    "tu-clave-secreta"  # SECRET_KEY del servidor
)
```

Si alguien intenta modificar el payload, la firma no coincide y el token se rechaza.

# Seguridad

# En el Frontend

```javascript
// ✓ CORRECTO: Guardar en localStorage
localStorage.setItem('token', response.access_token);

// ✗ EVITAR: Guardar en variables globales
window.token = response.access_token;  // Visible en devtools

// ✓ MEJOR: Usar cookie con HttpOnly (servidor envía la cookie)
// El navegador la agrega automáticamente, JavaScript no puede acceder
```

# En el Backend

```python
# ✓ No guardar el token en BD
# ✓ Usar SECRET_KEY fuerte y única

# ✗ NO hacer
SECRET_KEY = "12345"  # Muy débil
SECRET_KEY = "secret"  # Muy débil

# ✓ SÍ hacer
SECRET_KEY = "aB3_kL9$mN2@pQ8-xY5&hT1!zW4..."  # Fuerte y aleatoria
```

# Flujo Completo en Diagrama

```
REGISTRO:
paso 1      paso 2             paso 3
usuario  →  contrasena       →  BD (hash + salt)
            + salt
            + hashing


LOGIN:
paso 1       paso 2          paso 3                 paso 4
usuario  →  contrasena    →  verificar          →  JWT token
            ingresada        (hash + salt)         (firmado)


REQUEST PROTEGIDO:
paso 1      paso 2           paso 3              paso 4
usuario  →  JWT en        →  verificar         →  operación
            Authorization     (firma válida)       permitida
            header
```
Para entender más:

- [Modelos de Datos](23_MODELOS_DATOS.md)
- [APIs Endpoints](24_ENDPOINTS_API.md)
- [Backend - Estructura](20_BACKEND_ESTRUCTURA.md)
