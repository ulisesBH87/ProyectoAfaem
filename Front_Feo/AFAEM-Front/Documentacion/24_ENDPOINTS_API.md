# ENDPOINTS DE API - REFERENCIA COMPLETA

# Base URL

```
Desarrollo Local:  http://localhost:8000
Producción:        http://192.168.1.120:8000 (ejemplo)
```

# Estructura de Respuestas

# Respuesta Exitosa (201, 200)
```json
{
    "message": "Operación completada",
    "data": {}
}
```

# Respuesta de Error (4xx, 5xx)
```json
{
    "detail": "Descripción del error"
}
```

---

# AUTENTICACIÓN (prefix: /auth)

# 1. REGISTRO DE USUARIO

**POST** `/auth/registro`

Crea una nueva cuenta de usuario.

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
    "Nombre": "Juan",
    "PrimerApellido": "Pérez",
    "SegundoApellido": "García",
    "Correo": "juan@example.com",
    "Contrasena": "MiPassword123"
}
```

**Response 201 - Éxito:**
```json
{
    "message": "Usuario registrado correctamente"
}
```

**Response 400 - Error:**
```json
{
    "detail": "El correo ya existe"
}
```

**Validaciones:**
- Nombre: No vacío
- PrimerApellido: No vacío
- Correo: Formato válido, único en BD
- Contrasena: No vacío (se recomienda minimo 8 caracteres)

---

# 2. INICIAR SESIÓN

**POST** `/auth/iniciar-sesion`

Autentica un usuario y devuelve un JWT token.

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
    "Correo": "juan@example.com",
    "Contrasena": "MiPassword123"
}
```

**Response 200 - Éxito:**
```json
{
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJleHAiOjE3MDMwMTIzNDUsInR5cGUiOiJhY2Nlc3MifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
    "token_type": "bearer"
}
```

**Response 401 - Credenciales inválidas:**
```json
{
    "detail": "Credenciales inválidas"
}
```

**Notas:**
- El token expira en 30 minutos
- Usarlo en el header Authorization: "Bearer <token>" para peticiones protegidas
- La contraseña se valida contra el hash guardado en BD

---

# SOLICITUDES (prefix: /solicitud)

# 3. CREAR SOLICITUD

**POST** `/solicitud/enviar-solicitud`

Crea una nueva solicitud de inscripción.

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
    "UsuarioId": 123,
    "FechaSolicitud": "2026-02-20T10:30:00",
    "EstatusValidacion": 2,
    "CURP": "SAIB000505HDFMNN09",
    "RFC": "SAIB000505ABC",
    "SexoId": 1,
    "FechaNacimiento": "2000-05-05"
}
```

**Response 200 - Éxito:**
```json
{
    "message": "Solicitud enviada correctamente"
}
```

**Response 400 - Datos inválidos:**
```json
{
    "detail": [
        {
            "loc": ["body", "CURP"],
            "msg": "ensure this value has at least 18 characters",
            "type": "value_error.any_str.min_length"
        }
    ]
}
```

**Response 401 - No autenticado:**
```json
{
    "detail": "Not authenticated"
}
```

**Validaciones:**
- CURP: Exactamente 18 caracteres
- RFC: Exactamente 13 caracteres
- SexoId: Debe existir en CatalogoSexo (1, 2, 3)
- EstatusValidacion: Debe existir en CatalogoEstadosValidacion (1, 2, 3, 4)
- FechaSolicitud: Formato ISO 8601 (YYYY-MM-DDTHH:MM:SS)
- FechaNacimiento: Formato ISO 8601 (YYYY-MM-DD)

**Estados de Validación:**
```
1 = Pendiente
2 = Aprobado
3 = Rechazado
4 = En Revisión
```

---

# 4. OBTENER TODAS LAS SOLICITUDES

**GET** `/solicitud/solicitudes-usuarios`

Obtiene el listado de todas las solicitudes.

**Request Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- Ninguno (posible mejora: agregar paginación)

**Response 200 - Éxito:**
```json
[
    {
        "SolicitudId": 1,
        "UsuarioId": 123,
        "FechaSolicitud": "2026-02-20T10:30:00",
        "EstatusValidacion": 2
    },
    {
        "SolicitudId": 2,
        "UsuarioId": 124,
        "FechaSolicitud": "2026-02-21T14:15:00",
        "EstatusValidacion": 1
    }
]
```

**Response 401 - No autenticado:**
```json
{
    "detail": "Not authenticated"
}
```

**Notas:**
- Retorna TODAS las solicitudes (sin filtrar por usuario)
- Posible mejora: Agregar filtros, paginación, ordenamiento

---

# SALUD DE LA API

# 5. HEALTH CHECK

**GET** `/`

Verifica que el backend está funcionando.

**Request Headers:**
- Ninguno requerido

**Response 200:**
```json
{
    "status": "ok"
}
```

---

## Códigos de Error HTTP

| Código |                                Significado |                  Ejemplo |
|--------|--------------------------------------------|--------------------------|
|    200 |                     OK - Solicitud exitosa |        Solicitud enviada |
|    201 |                   Created - Recurso creado |       Usuario registrado |
|    400 |              Bad Request - Datos inválidos |    CURP con 5 caracteres |
|    401 |              Unauthorized - No autenticado | Token ausente o inválido |
|    403 |                   Forbidden - Sin permisos |     Usuario no tiene rol |
|    404 |              Not Found - Recurso no existe |       Usuario con ID 999 |
|    422 | Unprocessable Entity - Validación Pydantic |       Correo no es email |
|    500 | Internal Server Error - Error del servidor |              Error en BD |

---

# Autenticación en Peticiones Protegidas

# Frontend (JavaScript)

```javascript
// Obtener token del localStorage
const token = localStorage.getItem('token');

// Hacer petición con token
const response = await fetch(
    'http://localhost:8000/solicitud/enviar-solicitud',
    {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`  // ← Token en header
        },
        body: JSON.stringify({
            UsuarioId: 123,
            CURP: "SAIB000505HDFMNN09",
            // ... otros datos
        })
    }
);
```

# Usar servicios del proyecto

```javascript
// Usar el servicio auth.js existente
import { loginUser } from './services/auth.js';

const response = await loginUser('juan@example.com', 'password123');
// response.access_token se obtiene automáticamente

// El token se guarda en localStorage
localStorage.setItem('token', response.access_token);
```

---

# Flujo Típico

```
1. Usuario no autenticado
   ├─ POST /auth/registro
   │  └─ response: { message: "Usuario registrado" }
   │
   └─ POST /auth/iniciar-sesion
      └─ response: { access_token: "...", token_type: "bearer" }

2. Usuario autenticado (token guardado en localStorage)
   ├─ GET /solicitud/solicitudes-usuarios
   │  Headers: Authorization: Bearer <token>
   │  └─ response: [ {...}, {...} ]
   │
   └─ POST /solicitud/enviar-solicitud
      Headers: Authorization: Bearer <token>
      └─ response: { message: "Solicitud enviada correctamente" }

3. Token expira (después de 30 minutos)
   ├─ Intenta cualquier petición con token expirado
   │  └─ response: 401 Unauthorized
   │
   └─ Frontend limpia localStorage y redirige a login
```

---

# CORS (Cross-Origin Resource Sharing)

El backend permite peticiones desde:
```
- http://localhost:3000
- http://192.168.0.172:3000
- http://localhost:5173 (Vite)
- http://192.168.0.172:5173
```

Si accedes desde otro origen, obtendrás error CORS.

---

# Rate Limiting

Actualmente NO hay rate limiting implementado. Considera agregar para producción.

---

# Versioning

La API está en versión 1.0.0 pero sin prefijo de versión en URLs.

Si necesitas múltiples versiones:
```javascript
// Ejemplo (no implementado aún)
/api/v1/auth/registro
/api/v2/auth/registro  // Nueva versión
```

---

# Testing de Endpoints

# Con cURL

```bash
# Registro
curl -X POST http://localhost:8000/auth/registro \
  -H "Content-Type: application/json" \
  -d '{
    "Nombre": "Juan",
    "PrimerApellido": "Pérez",
    "Correo": "juan@example.com",
    "Contrasena": "password123"
  }'

# Login
curl -X POST http://localhost:8000/auth/iniciar-sesion \
  -H "Content-Type: application/json" \
  -d '{
    "Correo": "juan@example.com",
    "Contrasena": "password123"
  }'

# Con token
TOKEN="eyJ0eXAi..."
curl -X GET http://localhost:8000/solicitud/solicitudes-usuarios \
  -H "Authorization: Bearer $TOKEN"
```

# Con Postman

1. POST /auth/registro → token
2. Copiar token en Authorization header
3. GET /solicitud/solicitudes-usuarios con token

---

Para entender cómo se implementan:

- [Backend - Estructura](20_BACKEND_ESTRUCTURA.md)
- [Flujo de Autenticación](22_FLUJO_AUTENTICACION.md)
- [Modelos de Datos](23_MODELOS_DATOS.md)
