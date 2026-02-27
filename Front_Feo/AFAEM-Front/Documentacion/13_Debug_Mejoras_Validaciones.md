# Debugging: Mejoras y Validaciones de Fechas

# Mejoras Realizadas

# 1. Validaciones en PreRegistroEntrenador.jsx

Se agregaron validaciones robustas:
- Validar que la fecha está en formato YYYY-MM-DD
- Validar que la fecha es válida (no es una fecha inexistente)
- Validar que el usuario tiene 18+ años
- Logging detallado en consola de qué se está enviando

# 2. Logging Mejorado en solicitud.js

Ahora muestra información detallada:

```javascript
Fecha de nacimiento recibida: {
  valor: "2000-05-15",        // Valor actual
  tipo: "string",              // Tipo de dato
  largo: 10                     // Longitud de la cadena
}
```

# Cómo Debuggear

# Paso 1: Abre la Consola del Navegador

- Presiona F12 => Consola
- Ve a /pre-registro-entrenador
- Llena el formulario y haz clic en enviar

# Paso 2: Revisa los Logs

Busca estos mensajes en la consola:

```
Datos del formulario: {...}
Enviando solicitud: {...}
Fecha de nacimiento recibida: {...}
Solicitud enviada: {...}
Error al enviar solicitud: {...}
```

# Paso 3: Identifica el Problema

Si ves error 400/422:
- Copia el mensaje de error exacto
- Verifica en el backend qué campo está fallando

Si ves error de conexión:
- Verifica que el backend está corriendo en 192.168.1.120:8000
- Comprueba que CORS está habilitado

Si se envía pero no funciona:
- El formato podría estar bien pero el backend espera algo diferente

# Formatos de Fecha Comunes

# Formato HTML Input (ACTUAL)

```
Entrada: 2000-05-15
Tipo: YYYY-MM-DD (ISO 8601)
```

# Formatos que el Backend podría esperar

Opción 1: ISO 8601 (Similar al actual)

```javascript
"2000-05-15"           // Lo que ya estamos enviando
```

Opción 2: Timestamp

```javascript
"2000-05-15T00:00:00Z" // Con hora
```

Opción 3: Unix Timestamp

```javascript
957931200000           // Milisegundos desde 1970
```

Opción 4: Separado

```javascript
{
  year: 2000,
  month: 5,
  day: 15
}
```