# ARQUITECTURA GENERAL DEL PROYECTO AFAEM

# Visión General

El proyecto AFAEM es una aplicación web de dos capas para gestionar solicitudes, usuarios y equipos deportivos. La arquitectura está dividida en un frontend independiente (React) y un backend API (FastAPI).

```
┌─────────────────────────────────────────────────────────────┐
│                 NAVEGADOR DEL USUARIO                       │
│               (localhost:8080 - Puerto Frontend)            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Peticiones HTTP / JSON
                       │
┌──────────────────────▼──────────────────────────────────────┐
│         FRONTEND - React + Vite (puerto 8080)               │
│                                                             │
│  ├─ Componentes React (SignUp, Login, Dashboard, etc.)      │
│  ├─ Paginas (Auth, Admin, Players, Teams, Trainer)          │
│  ├─ Servicios (api.js, auth.js, solicitud.js, etc.)         │
│  └─ Estilos CSS y Utilidades                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ REST API Calls
                       │ (localhost:8000)
                       │
┌──────────────────────▼──────────────────────────────────────┐
│        BACKEND API - FastAPI (puerto 8000)                  │
│                                                             │
│  ├─ Rutas (auth_ruta, solicitud_ruta, etc.)                 │
│  ├─ Servicios (autenticacion_servicio, etc.)                │
│  ├─ Modelos (Usuario, Solicitud, etc.)                      │
│  └─ Seguridad (JWT, manejo de contraseñas, etc.)            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ SQL Queries
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              BASE DE DATOS SQL SERVER                       │
│                                                             │
│  ├─ Tabla Usuarios                                          │
│  ├─ Tabla Solicitudes                                       │
│  ├─ Tabla CatalogoSexo                                      │
│  └─ Tabla CatalogoEstadosValidacion                         │
└──────────────────────────────────────────────────────────────┘
```

# Componentes Principales

# 1. Frontend (React + Vite)
- Ubicación: `Front_Feo/afaem-registro/`
- Puerto: 8080
- Framework: React 19.2.0
- Build Tool: Vite 7.2.4
- Responsabilidad: Interfaz de usuario, formularios, navegación

# 2. Backend Principal (FastAPI)
- Ubicación: `app/`
- Puerto: 8000
- Framework: FastAPI
- Responsabilidad: Lógica de negocio, autenticación, CRUD de datos

# 3. Backend Adicional (FastAPI)
- Ubicación: `Front_Feo/afaem-backend/`
- Responsabilidad: Servicios adicionales (subida de archivos, etc.)

# 4. Base de Datos (SQL Server)
- Conexión: ODBC via pyodbc
- Migraciones: Alembic
- Responsabilidad: Persistencia de datos

# Flujo de Comunicación

# Ejemplo: Solicitud de Login

```
1. Usuario ingresa credenciales en el Frontend (SignUp.jsx)
                           ↓
2. Frontend envia POST request a http://localhost:8000/auth/iniciar-sesion
                           ↓
3. Backend recibe en auth_ruta.py
                           ↓
4. Backend llama autenticacion_servicio.iniciar_sesion()
                           ↓
5. Servicio consulta la BD usando usuario_repositorio
                           ↓
6. Backend valida contraseña y genera JWT token
                           ↓
7. Frontend recibe token y lo guarda en localStorage
                           ↓
8. Todos los request futuros incluyen el token en el header Authorization
```

# Tecnologías Utilizadas

|     Componente |         Tecnología | Versión |
|----------------|--------------------|---------|
|       Frontend |              React |  19.2.0 |
| Build Frontend |               Vite |   7.2.4 |
|        Backend |            FastAPI |  Latest |
|  Base de Datos |         SQL Server |   2019+ |
|            ORM |         SQLAlchemy |  Latest |
|  Autenticación | JWT (JsonWebToken) |       - |
|    ASGI Server |            Uvicorn |  Latest |

# Estructura de Carpetas (Alto Nivel)

```
afaemtemporal/
│
├── app/                          # Backend Principal
│   ├── main.py                  # Punto de entrada FastAPI
│   ├── core/                    # Config y seguridad
│   ├── db/                      # Conexiones y sesiones
│   ├── esquemas/                # Validaciones (Pydantic)
│   ├── modelos/                 # Modelos SQLAlchemy
│   ├── repositorios/            # Acceso a datos
│   ├── rutas/                   # Endpoints de API
│   └── servicios/               # Lógica de negocio
│
├── Front_Feo/
│   ├── afaem-registro/          # Frontend Principal
│   │   ├── src/
│   │   │   ├── App.jsx         # Rutas principales
│   │   │   ├── components/     # Componentes React
│   │   │   ├── pages/          # Páginas (Auth, Admin, etc.)
│   │   │   ├── services/       # Servicios de API
│   │   │   └── config/         # Configuración (API_BASE)
│   │   └── backend/            # Backend adicional
│   │
│   └── afaem-backend/          # Backend alternativo
│
├── alembic/                     # Migraciones de base de datos
├── Documentacion/               # Esta carpeta - documentación
├── requirements.txt             # Dependencias Python
└── README.md                    # Información general
```

# Puertos Utilizados

- **Puerto 8000**: Backend FastAPI principal (API REST)
- **Puerto 8080**: Frontend React con Vite (Interfaz de usuario)
- **SQL Server**: Puerto configurado en BASE_DATOS_URL

# Autenticación

El sistema utiliza **JWT (JsonWebToken)** para autenticación:

1. Usuario se registra → Contraseña se hashea con salt → Se guarda en BD
2. Usuario inicia sesión → Credenciales se validan → JWT se genera con UsuarioId
3. Frontend guarda JWT en localStorage
4. Cada request al backend incluye: `Authorization: Bearer <token>`
5. Backend valida JWT antes de permitir operaciones protegidas

# Estados de Validación

Las solicitudes pueden tener estos estados:

- **1**: Pendiente por revisar
- **2**: Aprobado
- **3**: Rechazado
- **4**: En revisión

Para entender mejor cada componente, ver:

- [Backend - Estructura](20_BACKEND_ESTRUCTURA.md)
- [Frontend - Estructura](21_FRONTEND_ESTRUCTURA.md)
- [Flujo de Autenticación](22_FLUJO_AUTENTICACION.md)
- [Modelos de Datos](23_MODELOS_DATOS.md)
- [Endpoints disponibles](24_ENDPOINTS_API.md)
