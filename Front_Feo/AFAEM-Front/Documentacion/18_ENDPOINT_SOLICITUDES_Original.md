# Endpoint: GET /solicitud/solicitudes-usuarios

# Descripción

Endpoint para que el admin vea todas las solicitudes de los usuarios.

# Especificación

|        Propiedad |                               Valor |
|------------------|-------------------------------------|
|           Método |                                 GET |
|             Ruta |     /solicitud/solicitudes-usuarios |
|   Requiere Token |                                  Si |
| Header Requerido | Authorization: Bearer TU_TOKEN_AQUI |

# Ejemplo de Uso

# cURL

```bash
curl -X GET "http://localhost:8000/solicitud/solicitudes-usuarios" \
  -H "Authorization: Bearer tu_token_abc123" \
  -H "Content-Type: application/json"
```

# JavaScript / Fetch

```javascript
const response = await fetch('http://localhost:8000/solicitud/solicitudes-usuarios', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer tu_token_abc123',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data);
```

# Python / Requests

```python
import requests

url = "http://localhost:8000/solicitud/solicitudes-usuarios"
headers = {
    "Authorization": "Bearer tu_token_abc123",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
print(response.json())
```

# Respuesta Exitosa (200 OK)

```json
{
  "ok": true,
  "total": 1,
  "solicitudes": [
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
}
```

# Errores Posibles

# 401 - Unauthorized (Token no proporcionado)

```json
{
  "detail": "Token no proporcionado. Use: Authorization: Bearer TU_TOKEN_AQUI"
}
```

Solución: Agrega el header Authorization: Bearer TU_TOKEN

# 401 - Unauthorized (Formato inválido)

```json
{
  "detail": "Formato inválido. Use: Authorization: Bearer TU_TOKEN"
}
```

Solución: Asegúrate que el header sea: Authorization: Bearer TU_TOKEN

# 401 - Unauthorized (Token vacío)

```json
{
  "detail": "Token vacío"
}
```

Solución: El token no puede estar vacío

# Estructura de Datos de una Solicitud

|             Campo |   Tipo |                                Descripción |
|-------------------|--------|--------------------------------------------|
|                id |    int |                   ID único de la solicitud |
|         UsuarioId | string |       ID del usuario que hizo la solicitud |
|             email | string |                          Email del usuario |
|              CURP | string |                           CURP del usuario |
|               RFC | string |                            RFC del usuario |
|            SexoId |    int |      1=Masculino, 2=Femenino, 3=No binario |
|   FechaNacimiento | string |                Fecha en formato YYYY-MM-DD |
|    FechaSolicitud | string |          Fecha/hora de creación (ISO 8601) |
| EstatusValidacion |    int |      1=Pendiente, 2=En proceso, 3=Validado |
|              tipo | string | Tipo de usuario (entrenador, jugador, etc) |

# Prueba Rápida

Ejecuta el script incluido:

```bash
python test_solicitudes.py
```