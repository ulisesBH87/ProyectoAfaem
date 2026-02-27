# ESTRUCTURA DEL FRONTEND (React + Vite)

# Ubicación y Configuración

```
Front_Feo/afaem-registro/
├── src/                          # Código fuente
│   ├── App.jsx                   # Punto de entrada
│   ├── Main.jsx                  # Layout principal
│   ├── api.js                    # Cliente API
│   ├── components/               # Componentes reutilizables
│   ├── pages/                    # Páginas/vistas
│   ├── services/                 # Servicios
│   ├── config/                   # Configuración
│   ├── hooks/                    # Hooks personalizados
│   ├── styles/                   # Estilos CSS
│   └── utils/                    # Utilidades
├── vite.config.js                # Configuración de Vite
├── package.json                  # Dependencias
└── index.html                    # HTML principal
```

# Configuración Inicial

# config/config.js
```javascript
// Define la URL base del backend
export const API_BASE = 'http://localhost:8000'; // DESARROLLO LOCAL

// O para servidor remoto:
// export const API_BASE = 'http://192.168.1.120:8000';
```

# Arquitectura de Capas

```
┌─────────────────────────────────────┐
│      PÁGINAS (pages/)               │  ← Vistas completas
│ Auth, Admin, Players, Teams, etc.   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   COMPONENTES (components/)         │  ← Elementos reutilizables
│ SignUp, Login, Forms, etc.          │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   SERVICIOS (services/)             │  ← Lógica de comunicación
│ auth.js, solicitud.js, api.js       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│    API.JS                           │  ← Cliente HTTP
│ Wrapper del API backend             │
└──────────────────────────────────────┘
```

# 1. PUNTO DE ENTRADA (App.jsx)

Contiene todas las rutas principales de la aplicación.

```javascript
<Router>
  <Routes>
    <Route path="/" element={<Login />} />
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<SignUp />} />
    <Route path="/register" element={<Register />} />
    <Route path="/registro-jugadores" element={<RegistroJugadores />} />
    <Route path="/trainer" element={<Trainer />} />
    <Route path="/admin-equipo/:teamId" element={<AdminEquipo />} />
    <Route path="/solicitudes-admin" element={<SolicitudesAdmin />} />
    {/* Más rutas... */}
  </Routes>
</Router>
```

# 2. PÁGINAS (pages/)

Las páginas son vistas completas. Cada carpeta puede contener varios componentes.

# pages/Auth/
```
Auth/
├── Login.jsx              # Página de login
├── Register.jsx           # Página de registro
├── SignUp.jsx             # Registro detallado
├── PreRegistroEntrenador.jsx
├── ForgotPassword.jsx
└── ResetPassword.jsx
```

# pages/Admin/
```
Admin/
├── AdminEquipo.jsx
├── SolicitudesAdmin.jsx
└── Otros...
```

# pages/Trainer/
```
Trainer/
├── Trainer.jsx           # Dashboard del entrenador
├── TrainerTeams.jsx      # Gestión de equipos
└── TrainerPlayers.jsx    # Gestión de jugadores
```

# 3. COMPONENTES (components/)

# components/partials/
Componentes reutilizables parecidos a componentes visuales de librería:

```
partials/
├── Alerts/
│   └── Alert.jsx          # Componente de alerta
├── Buttons/
│   ├── PrimaryButton.jsx
│   └── SecondaryButton.jsx
├── Cards/
│   └── Card.jsx
├── Forms/
│   └── FormInput.jsx
├── Tables/
│   └── Table.jsx
├── Inputs/
│   └── Varios inputs
├── Modals/
│   └── Modal.jsx
├── Spinners/
│   └── Loader.jsx
└── index.js              # Exporta todos los componentes
```

# Otros Componentes
```
components/
├── SignUp.jsx            # Componente de registro
├── DashboardHeader.jsx
├── DashboardSidebar.jsx
├── DashboardTable.jsx
└── PartialsExample.jsx   # Para ver todos los partials
```

# 4. SERVICIOS (services/)

Los servicios manejan la comunicación con el backend.

# api.js
```javascript
// Cliente HTTP genérico

export const fetchAPI = async (method, endpoint, body = null) => {
    const token = localStorage.getItem('token');
    
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    // Agregar token si existe
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    return response.json();
};
```

# auth.js
```javascript
// Servicios de autenticación

export const loginUser = async (correo, contrasena) => {
    return fetchAPI('POST', '/auth/iniciar-sesion', {
        Correo: correo,
        Contrasena: contrasena
    });
};

export const registerUser = async (userData) => {
    return fetchAPI('POST', '/auth/registro', userData);
};
```

# solicitud.js
```javascript
// Servicios de solicitudes

export const crearSolicitud = async (solicitudData) => {
    return fetchAPI('POST', '/solicitud/enviar-solicitud', solicitudData);
};

export const obtenerSolicitudes = async () => {
    return fetchAPI('GET', '/solicitud/solicitudes-usuarios');
};
```

# 5. HOOKS (hooks/)

Hooks personalizados para lógica reutilizable.

# useForm.js
```javascript
// Hook para manejar formularios

const useForm = (initialValues) => {
    const [values, setValues] = useState(initialValues);
    
    const handleChange = (e) => {
        setValues({
            ...values,
            [e.target.name]: e.target.value
        });
    };
    
    return { values, handleChange, setValues };
};
```

# 6. UTILIDADES (utils/)

Funciones auxiliares reutilizables.

# hash.js
```javascript
// Utilidades de hash/encriptación

export const hashPassword = (password) => {
    // Implementación
};
```

# 7. ESTILOS (styles/)

CSS modular por página/componente.

```
styles/
├── dashboard.css
├── create-team.css
├── trainer.css
└── index.css               # Estilos globales
```

# Flujo de una Acción de Usuario

Ejemplo: Usuario hace login

```
1. Usuario llena el formulario en Login.jsx
   - Nombre de usuario
   - Contraseña

2. Usuario hace click en "Iniciar sesión"
   onClick={handleLogin}

3. Login.jsx llama: auth.loginUser(email, password)

4. auth.js llama: fetchAPI('POST', '/auth/iniciar-sesion', {...})

5. api.js
   - Prepara el request HTTP
   - Agrega token si existe
   - Envia POST a http://localhost:8000/auth/iniciar-sesion

6. Login.jsx recibe respuesta:
   {
       access_token: "eyJ0eXAi...",
       token_type: "bearer"
   }

7. Login.jsx guarda el token: localStorage.setItem('token', response.access_token)

8. Login.jsx redirige a: navigate('/trainer')

9. Drawer del Sidebar aparece porque usuario está autenticado
```

# Estado Global VS Local

El proyecto utiliza **estado local** en componentes:

```javascript
// Estado local en componentes
const [user, setUser] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
```

Alternativas para mejorar (futuro):
- Context API
- Redux (más pesado)
- Zustand (más ligero)

# Dependencias Principales

```json
{
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-router-dom": "^6.x.x",
    "vite": "^7.2.4"
  }
}
```

# Cómo Ejecutar el Frontend

```bash
# Desde Front_Feo/afaem-registro/

npm install              # Instalar dependencias
npm run dev             # Ejecutar en desarrollo (puerto 8080)
npm run build           # Build para producción
npm run preview         # Preview del build
```

# Componentes Reutilizables Disponibles

Para ver todos los componentes reutilizables, ve a:
- Ruta: `/ejemplo-partials`

O consulta: [Componentes Reutilizables](25_COMPONENTES_REUTILIZABLES.md)

# Estructura de Props en Componentes

Ejemplo de un componente reutilizable:

```javascript
/**
 * Componente FormInput
 * @param {string} label - Etiqueta del input
 * @param {string} type - Tipo (text, email, password, etc.)
 * @param {string} name - Nombre del campo
 * @param {string} value - Valor actual
 * @param {function} onChange - Función al cambiar
 * @param {boolean} required - Si es requerido
 */
export function FormInput({
    label,
    type = 'text',
    name,
    value,
    onChange,
    required = false
}) {
    return (
        <div className="form-group">
            <label htmlFor={name}>{label}</label>
            <input
                id={name}
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                required={required}
            />
        </div>
    );
}
```

Para entender mejor:

- [Backend - Estructura](20_BACKEND_ESTRUCTURA.md)
- [Componentes Reutilizables Disponibles](25_COMPONENTES_REUTILIZABLES.md)
- [Flujo de Autenticación Completo](22_FLUJO_AUTENTICACION.md)
- [API Endpoints](24_ENDPOINTS_API.md)
