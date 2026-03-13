# ESTRUCTURA DEL BACKEND (FastAPI)

# Ubicación y Entrada

```
app/
├── main.py           ← Punto de entrada principal
├── core/
├── db/
├── esquemas/
├── modelos/
├── repositorios/
├── rutas/
└── servicios/
```

El archivo `app/main.py` es donde inicia toda la aplicación FastAPI.

# Capas de Arquitectura

El backend está organizado en capas que separan responsabilidades:

```
┌─────────────────────────────────────┐
│      RUTAS (app/rutas/)             │  ← Recibe peticiones HTTP
│  auth_ruta.py, solicitud_ruta.py    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   SERVICIOS (app/servicios/)        │  ← Lógica de negocio
│ autenticacion_servicio.py           │
│ solicitud_servicio.py               │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  REPOSITORIOS (app/repositorios/)   │  ← Acceso a datos
│ usuario_repositorio.py              │
│ solicitud_repositorio.py            │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  MODELOS (app/modelos/)             │  ← Estructura de datos (BD)
│ usuario_modelo.py                   │
│ solicitud_modelo.py                 │
└─────────────────────────────────────┘
```

# 1. RUTAS (app/rutas/)

Las rutas definen los endpoints REST que el frontend puede llamar.

# auth_ruta.py
```python
# Maneja autenticación de usuarios

POST /auth/registro
Descripción: Registra un nuevo usuario
Body: { Nombre, PrimerApellido, SegundoApellido, Correo, Contrasena }
Respuesta: { message: "Usuario registrado correctamente" }

POST /auth/iniciar-sesion
Descripción: Inicia sesión y devuelve JWT token
Body: { Correo, Contrasena }
Respuesta: { access_token, token_type: "bearer" }
```

# solicitud_ruta.py
```python
# Maneja solicitudes de usuarios

POST /solicitud/enviar-solicitud
Descripción: Crea una nueva solicitud
Headers: { Authorization: "Bearer <token>" }
Body: { UsuarioId, FechaSolicitud, EstatusValidacion, CURP, RFC, SexoId, FechaNacimiento }
Respuesta: { message: "Solicitud enviada correctamente" }

GET /solicitud/solicitudes-usuarios
Descripción: Obtiene todas las solicitudes
Respuesta: [ { SolicitudId, UsuarioId, FechaSolicitud, ... } ]
```

# 2. SERVICIOS (app/servicios/)

Los servicios contienen la lógica de negocio. Orquestan operaciones complejas.

# autenticacion_servicio.py
```python
def registrar_usuario(db, data):
    # 1. Genera salt aleatorio
    # 2. Hashea la contraseña con el salt
    # 3. Crea el usuario en la BD
    # 4. Retorna el usuario creado
    
def iniciar_sesion(db, correo, contrasena):
    # 1. Busca usuario por correo
    # 2. Verifica que la contraseña sea correcta
    # 3. Retorna el usuario si es válido, None si no
```

# solicitud_servicio.py
```python
def crear_solicitud(db, data, usuario):
    # 1. Crea objeto Solicitud con estado por defecto (2 = Aprobado)
    # 2. Actualiza datos del usuario con CURP, RFC, etc.
    # 3. Guarda en BD usando repositorio
    
def obtener_solicitudes_servicio(db):
    # 1. Consulta todas las solicitudes de la BD
    # 2. Retorna la lista
```

# 3. REPOSITORIOS (app/repositorios/)

Los repositorios manejan directamente la base de datos. Son la capa más baja de acceso a datos.

# usuario_repositorio.py
```python
def crear_usuario(db, usuario):
    # Agrega objeto usuario a la sesión
    # Hace commit a la BD
    # Retorna el usuario creado
```

# solicitud_repositorio.py
```python
def crear_solicitudrepo(db, solicitud, usuario):
    # Agrega la solicitud a la BD
    # Actualiza usuarios con los datos de CURP, RFC, etc.
    # Retorna la solicitud creada
```

# 4. MODELOS (app/modelos/)

Los modelos son la representación de las tablas de la base de datos usando SQLAlchemy ORM.

# usuario_modelo.py
```python
class Usuario(Base):
    __tablename__ = "Usuarios"
    
    UsuarioId: int (PRIMARY KEY)
    Nombre: str
    PrimerApellido: str
    SegundoApellido: str (nullable)
    CURP: str (nullable)
    RFC: str (nullable)
    NUI: str (nullable)
    SexoId: int (FOREIGN KEY -> CatalogoSexo)
    FechaNacimiento: date (nullable)
    Correo: str (UNIQUE)
    Contrasena: str
    Salt: str
```

# solicitud_modelo.py
```python
class Solicitud(Base):
    __tablename__ = "Solicitudes"
    
    SolicitudId: int (PRIMARY KEY)
    UsuarioId: int (FOREIGN KEY -> Usuarios)
    FechaSolicitud: datetime
    ObservacionesSolicitud: str (nullable)
    EstatusValidacion: int (FOREIGN KEY -> CatalogoEstadosValidacion)
```

# 5. ESQUEMAS (app/esquemas/)

Los esquemas validan los datos antes de procesarlos. Utilizan Pydantic.

# usuario_esquema.py
```python
class RegistroUsuario(BaseModel):
    Nombre: str
    PrimerApellido: str
    SegundoApellido: str
    Correo: EmailStr
    Contrasena: str
    # Pydantic valida automáticamente

class InicioSesion(BaseModel):
    Correo: EmailStr
    Contrasena: str
```

# solicitud_esquema.py
```python
class SolicitudCrear(BaseModel):
    UsuarioId: int
    FechaSolicitud: datetime
    EstatusValidacion: int
    CURP: str
    RFC: str
    SexoId: int
    FechaNacimiento: date
```

# 6. SEGURIDAD (app/core/seguridad.py)

Gestiona todo relacionado con seguridad y autenticación.

# Funciones principales:
```python
def generar_salt():
    # Crea un string aleatorio para hashear contraseñas
    # Previene ataques rainbow table

def generar_hash(salt, contrasena):
    # Combina salt + contraseña
    # Aplica SHA256
    # Retorna el hash

def verificar_contrasena(contrasena_plana, hash_guardado, salt):
    # Compara la contraseña ingresada con el hash
    # Usa hmac.compare_digest para evitar timing attacks

def crear_token(data):
    # Crea JWT token con datos del usuario
    # Token expira en ACCESS_TOKEN_EXPIRE_MINUTES
    # Firmado con SECRET_KEY

def verificar_token(token):
    # Decodifica el JWT
    # Valida la firma
    # Retorna los datos del payload

def obtener_usuario_actual(token, db):
    # Extrae UsuarioId del token
    # Consulta el usuario en BD
    # Retorna el usuario si existe
```

# 7. CONFIGURACIÓN (app/core/config.py)

```python
# Variables de configuración

BASE_DATOS_URL = "mssql+pyodbc://..."  # Conexión a SQL Server
SECRET_KEY = "tu-clave-secreta"         # Para firmar JWT
ALGORITHM = "HS256"                     # Algoritmo de JWT
ACCESS_TOKEN_EXPIRE_MINUTES = 30        # Tiempo de expiración del token
```

# 8. BASE DE DATOS (app/db/)

# conexion.py
```python
# Crea el engine de SQLAlchemy
engine = create_engine(BASE_DATOS_URL)
```

# sesion.py
```python
# Crea sesiones de BD para usar en endpoints
SessionLocal = sessionmaker(bind=engine)

def get_db():
    # Generator que proporciona una sesión a FastAPI
    # Cierra automáticamente la sesión después
```

# base.py
```python
# Base para todos los modelos
Base = declarative_base()
```

# Flujo de una Solicitud HTTP

Ejemplo: POST /auth/iniciar-sesion

```
1. Frontend envía: POST http://localhost:8000/auth/iniciar-sesion
   Body: { "Correo": "user@example.com", "Contrasena": "123456" }

2. FastAPI recibe en auth_ruta.py @router.post("/iniciar-sesion")

3. Pydantic valida el Body contra InicioSesion schema
   Si no es válido → Error 422

4. Ruta llama: autenticacion_servicio.iniciar_sesion(db, correo, password)

5. Servicio llama: usuario_repositorio.buscar_por_correo(db, correo)

6. Repositorio consulta: SELECT * FROM Usuarios WHERE Correo = ?
   
7. Servicio recibe usuario de BD

8. Servicio valida contraseña:
   hash_nuevo = SHA256(salt + password_ingresada)
   if hash_nuevo == usuario.Contrasena → OK

9. Si es válido, ruta llamaBACK: core/seguridad.crear_token()

10. Token se devuelve: { "access_token": "eyJ0eXAi...", "token_type": "bearer" }

11. Frontend recibe token y lo guarda en localStorage
```

# Dependencias Principales

```
FastAPI         - Framework web
SQLAlchemy      - ORM para base de datos
Pydantic        - Validación de datos
python-jose     - Manejo de JWT
pyodbc          - Conexión a SQL Server
Uvicorn         - ASGI server
```

# Cómo Ejecutar el Backend

```bash
# Desde la carpeta app o Front_Feo/afaem-registro/backend

python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Para entender la comunicación completa:

- [Frontend - Estructura](21_FRONTEND_ESTRUCTURA.md)
- [Flujo de Autenticación](22_FLUJO_AUTENTICACION.md)
- [API Endpoints Detallado](24_ENDPOINTS_API.md)
