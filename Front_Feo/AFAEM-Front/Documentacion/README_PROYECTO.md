# AFAEM - Proyecto Principal

Este es el proyecto AFAEM temporal para gestión de solicitudes y usuarios.

# Estructura del Proyecto

```
afaemtemporal/
├── app/                          # Backend Python con FastAPI
│   ├── main.py
│   ├── core/                     # Configuración y seguridad
│   ├── db/                       # Conexiones a base de datos
│   ├── esquemas/                 # Esquemas de validación
│   ├── modelos/                  # Modelos de datos
│   ├── repositorios/             # Acceso a datos
│   ├── rutas/                    # Endpoints de API
│   └── servicios/                # Lógica de negocio
│
├── Front_Feo/
│   ├── afaem-backend/           # Backend adicional
│   └── afaem-registro/          # Frontend principal (React + Vite)
│       ├── src/
│       │   ├── components/       # Componentes React
│       │   ├── pages/           # Páginas principales
│       │   ├── services/        # Servicios de API
│       │   └── styles/          # Estilos CSS
│       └── backend/             # Backend de soporte
│
├── alembic/                      # Migraciones de base de datos
├── migrations/                   # Migraciones alternativas
├── Documentacion/                # Documentación centralizada
├── requirements.txt              # Dependencias principales
└── README.md                     # Este archivo

```

# Cómo Empezar

# Backend

1. Crea un entorno virtual:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   ```

2. Instala las dependencias:
   ```bash
   pip install -r requirements.txt
   ```

3. Inicia el servidor:
   ```bash
   python app/main.py
   ```

# Frontend

1. Navega a la carpeta del frontend:
   ```bash
   cd Front_Feo/afaem-registro
   ```

2. Instala dependencias:
   ```bash
   npm install
   ```

3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

# Documentación

Toda la documentación está centralizada en la carpeta `Documentacion/`:

- **01_README_Principal.md** - Descripción general
- **02_Integracion_Dashboard.md** - Información del dashboard
- **03_Solucion_Fecha_Nacimiento.md** - Solución técnica
- **04_Cambios_Realizados.md** - Cambios al sistema
- **05_Debugging_Fecha.md** - Guía de depuración
- **06_Debugging_Avanzado.md** - Debugging avanzado
- **07_Endpoint_Solicitudes.md** - Documentación de API
- **08_Partial_Views_Guia.md** - Componentes reutilizables
- **09_Quick_Start_Partials.md** - Inicio rápido
- **10_Status_Sistema.md** - Estado actual

# Características

- Backend con FastAPI y SQLAlchemy
- Frontend con React y Vite
- Sistema de autenticación
- Gestión de solicitudes de usuarios
- Dashboard administrativo
- Componentes reutilizables (Partial Views)

# Tecnologías

- **Backend**: Python, FastAPI, SQLAlchemy
- **Frontend**: React 19.2.0, Vite 7.2.4
- **Base de datos**: SQL Server (ODBC)
- **Migraciones**: Alembic

# Requisitos

- Python 3.8+
- Node.js 18+
- SQL Server o compatible