# INICIO RÁPIDO - GUÍA 

# Requisitos Previos

Necesitas:

- **Python 3.8+** instalado
- **Node.js 18+** instalado
- **Git** instalado
- **VS Code** como editor
- Acceso a la BD SQL Server
- **pip** (gestor de paquetes Python)
- **npm** (gestor de paquetes Node.js)

---

# Paso 1: Clonar el Proyecto

```bash
# Desde terminal PowerShell o Command Prompt
git clone <URL_DEL_REPOSITORIO ULI >
cd afaemtemporal
```

---

# Paso 2: Configurar el Backend

# 2.1 Instalar Dependencias Python

```bash
# Entrar en la carpeta del proyecto
cd afaemtemporal

# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
# Windows (PowerShell):
.\venv\Scripts\Activate

# Windows (CMD):
venv\Scripts\activate.bat

```

# 2.2 Instalar Paquetes

```bash
# Con el entorno virtual activado
pip install -r requirements.txt
```

# 2.3 Configurar Conexión a BD

**Archivo:** `app/core/config.py`

Edita las variables de conexión a SQL Server:

```python
BASE_DATOS_URL = "mssql+pyodbc://usuario:password@servidor/basedatos?driver=ODBC+Driver+17+for+SQL+Server"
SECRET_KEY = "tu-clave-secreta-muy-fuerte-aqui"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
```

Reemplaza:
- `usuario`: Tu usuario de SQL Server
- `password`: Tu contraseña
- `servidor`: IP o nombre del servidor SQL
- `basedatos`: Nombre de la base de datos
- `tu-clave-secreta-muy-fuerte-aqui`: Una clave fuerte únicamente para desarrollo

# 2.4 Ejecutar Migraciones de BD

```bash
# Ejecutar migraciones de Alembic
alembic upgrade head
```

# 2.5 Iniciar Backend

```bash
# Desde la carpeta app/ o Front_Feo/afaem-registro/backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Resultado esperado:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

Backend está corriendo en: **http://localhost:8000**

---

# Paso 3: Configurar el Frontend

# 3.1 Entrar en la Carpeta Frontend

```bash
# Desde terminal nueva (sin cerrar el backend)
cd Front_Feo/afaem-registro
```

# 3.2 Instalar Dependencias Node

```bash
npm install
```

# 3.3 Verificar Configuración de API

**Archivo:** `src/config/config.js`

Asegúrase que apunta al backend local:

```javascript
export const API_BASE = 'http://localhost:8000';
// export const API_BASE = 'http://192.168.1.120:8000'; // Comentado
```

# 3.4 Iniciar Frontend

```bash
npm run dev
```

**Resultado esperado:**
```
  VITE v7.2.4  ready in 234 ms

  Local:    http://localhost:8080/
```

Frontend está corriendo en: **http://localhost:8080**

---

# Paso 4: Verificar que Funciona Todo

# 4.1 Abrir el Navegador

Ve a: `http://localhost:8080`

Deberías ver la página de login.

# 4.2 Prueba: Crear Cuenta

1. Haz click en "Registrarse" o "SignUp"
2. Completa el formulario:
   - Nombre: `Juan`
   - Primer Apellido: `Pérez`
   - Segundo Apellido: `García`
   - Correo: `juan@example.com`
   - Contraseña: `MiPassword123`
3. Haz click en "Registrar"

Si ves un mensaje de éxito, el backend funciona correctamente.

# 4.3 Prueba: Iniciar Sesión

1. Entra el correo: `juan@example.com`
2. Entra la contraseña: `MiPassword123`
3. Haz click en "Iniciar sesión"

Si te redirige a la siguiente página, ¡todo funciona!

---

# Estructura Básica para Empezar

# Agregar una Nueva Ruta en Backend

**Archivo:** `app/rutas/nueva_ruta.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.sesion import get_db
from app.core.seguridad import obtener_usuario_actual
from app.modelos.usuario_modelo import Usuario

router = APIRouter(prefix="/nueva", tags=["Nueva"])

@router.get("/endpoint")
def mi_funcion(db: Session = Depends(get_db)):
    # db es la sesión de BD automáticamente
    return {"message": "Funciona!"}

@router.get("/protegido")
def mi_funcion_protegida(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    # Aquí usuario es el usuario autenticado
    return {"message": f"Hola {usuario.Nombre}"}
```

Luego, registra en `app/main.py`:

```python
from app.rutas import nueva_ruta

app.include_router(nueva_ruta.router)
```

# Agregar una Nueva Página en Frontend

**Archivo:** `src/pages/MiPagina.jsx`

```javascript
import React, { useState, useEffect } from 'react';
import { Card, Alert, PrimaryButton } from '../components/partials';
import { fetchAPI } from '../services/api';

export function MiPagina() {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        setIsLoading(true);
        try {
            const resultado = await fetchAPI('GET', '/nueva/endpoint');
            setData(resultado);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card title="Mi Página">
            {error && (
                <Alert type="error" message={error} dismissible={true} />
            )}
            {isLoading && <p>Cargando...</p>}
            {data && <p>{data.message}</p>}
            <PrimaryButton 
                text="Recargar"
                onClick={cargarDatos}
            />
        </Card>
    );
}
```

Luego, registra en `src/App.jsx`:

```javascript
import { MiPagina } from './pages/MiPagina';

function App() {
    return (
        <Router>
            <Routes>
                {/* Rutas existentes */}
                <Route path="/mi-pagina" element={<MiPagina />} />
            </Routes>
        </Router>
    );
}
```

---

# Solución de Problemas Comunes

# Error: "Connection refused" en Backend

**Problema:** No se puede conectarse a SQL Server

**Solución:**
1. Verifica que SQL Server está corriendo
2. Revisa las credenciales en `app/core/config.py`
3. Revisa el nombre del servidor y base de datos
4. Prueba: `sqlcmd -S NOMBRE_SERVIDOR -U usuario -P password`

# Error: "CORS error" en Frontend

**Problema:** "Access to XMLHttpRequest from origin blocked by CORS policy"

**Solución:**
El backend ya tiene CORS configurado. Si persiste:
1. Verifica `app/main.py` - sección CORS
2. Agrega tu origen: `"http://localhost:3000"` o `"http://localhost:8080"`
3. Reinicia el backend

# Error: "Module not found"

**Problema:** "ModuleNotFoundError: No module named 'app'"

**Solución:**
1. Verifica que estás en la carpeta correcta
2. Verifica que el entorno virtual está activado
3. Reinstala: `pip install -r requirements.txt`

# Error: "Port already in use"

**Problema:** "Address already in use 8000" o "8080"

**Solución:**
```bash
# Encuentra el proceso usando el puerto
netstat -ano | findstr :8000  # Windows
lsof -i :8000                  # Mac/Linux

# Mata el proceso (Windows)
taskkill /PID <PID> /F
```

---

# Flujo de Desarrollo

```
1. CREAR RAMA
   git checkout -b feature/mi-caracteristica

2. MODIFICAR CÓDIGO
   ├─ Backend (cambios en app/)
   └─ Frontend (cambios en src/)

3. PROBAR LOCALMENTE
   ├─ Backend: http://localhost:8000 (auto-reload)
   └─ Frontend: http://localhost:8080 (auto-reload)

4. HACER COMMIT
   git add .
   git commit -m "feat: agregar nueva funcionalidad"

5. PUSH AL REPOSITORIO
   git push origin feature/mi-caracteristica

6. CREAR PULL REQUEST
   En GitHub/GitLab, crear PR para revisión
```

---

# Comandos Útiles

# Backend

```bash
# Ver logs en tiempo real
tail -f logs/app.log

# Reiniciar backend (presiona Ctrl+C y ejecuta de nuevo)
python -m uvicorn main:app --reload --port 8000

# Ejecutar migraciones
alembic upgrade head

# Ver estado de migraciones
alembic current

# Crear usuario de prueba
python -c "from app.db.sesion import SessionLocal; from app.servicios.autenticacion_servicio import registrar_usuario"
```

# Frontend

```bash
# Limpiar node_modules
rm -r node_modules
npm install

# Build para producción
npm run build

# Preview del build
npm run preview

# Limpiar cache
npm cache clean --force
```

# Git

```bash
# Ver rama actual
git branch

# Ver cambios pendientes
git status

# Ver commits recientes
git log --oneline -5

# Deshacer cambios locales
git checkout .

# Deshacer último commit
git reset --soft HEAD~1
```

---

# Recursos Útiles

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Vite Documentation](https://vitejs.dev/)
- [JWT.io](https://jwt.io/) - Para debugar tokens

---


Después de configurar todo:

1. Leer [Arquitectura General](19_ARQUITECTURA_GENERAL.md)
2. Familiarizarse con [Backend - Estructura](20_BACKEND_ESTRUCTURA.md)
3. Familiarizarse con [Frontend - Estructura](21_FRONTEND_ESTRUCTURA.md)
4. Revisar [Endpoints disponibles](24_ENDPOINTS_API.md)
5. Empezar a hacer cambios pequeños

Si tienes problemas, consulta la documentación correspondiente:

- Problemas de BD: [Modelos de Datos](23_MODELOS_DATOS.md)
- Problemas de API: [Endpoints](24_ENDPOINTS_API.md)
- Problemas de Autenticación: [Flujo de Autenticación](22_FLUJO_AUTENTICACION.md)
- Problemas de Frontend: [Frontend - Estructura](21_FRONTEND_ESTRUCTURA.md)
