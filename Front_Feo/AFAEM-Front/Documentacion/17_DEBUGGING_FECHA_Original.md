# DEBUGGING: Fecha de Nacimiento No Se Envía

# Pasos para Debuggear

# 1. Verificar en el Frontend

Abre la consola del navegador (F12) y busca:
- "DATOS A ENVIAR AL BACKEND:" - Busca si FechaNacimiento tiene un valor
- "RESPUESTA DEL BACKEND:" - Verifica si la respuesta es 200 OK

Si ves:

```
DATOS A ENVIAR AL BACKEND:
{
  "FechaNacimiento": ""  <- VACIO = Problema en frontend
}
```

# 2. Verificar en el Backend

Mira la consola donde corre `python backend/main.py`:

Debería imprimirse algo como:

```
================================================================================
[ /auth/registro LLAMADO ]
================================================================================
Correo: juan@example.com
FechaNacimiento: 2000-05-15 (tipo: date)
================================================================================
```

Si ves:

```
FechaNacimiento: None <- No se recibió
FechaNacimiento: 2000-05-15 <- Se recibió correctamente
```

# Problemas Comunes

# Problema 1: El input date está vacío

Síntoma: En la consola aparece "FechaNacimiento": ""

Solución:
1. Asegúrate de que el usuario REALMENTE está llenando el input date
2. El input tiene type="date"
3. Verifica que el nombre sea exactamente "FechaNacimiento" (con mayúscula F)

# Problema 2: No llega al backend

Síntoma:
- Console del frontend NO muestra "DATOS A ENVIAR"
- Console del frontend muestra error de red

Solución:
1. ¿El backend está corriendo? (http://localhost:8000)
2. ¿El API_BASE está correcto en config.js?
3. ¿Hay error de CORS?

# Problema 3: El backend recibe None

Síntoma:
- Console del backend muestra "FechaNacimiento: None"

Solución:
1. Verifica que el JSON enviado tiene el formato correcto: "FechaNacimiento": "2000-05-15"
2. La fecha debe estar en formato YYYY-MM-DD
3. No puede estar vacía

# Test Rápido

Ejecuta esto en la carpeta del proyecto:

```bash
python test_endpoint.py
```

Debería retornar algo como:

```
Status Code: 200
Respuesta: {
  "ok": true,
  "user": {
    "email": "juan.test@example.com",
    ...
    "FechaNacimiento": "2000-05-15"
  }
}
```
