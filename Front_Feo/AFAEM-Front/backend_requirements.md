# Guía de Integración: Validación de Solicitudes (Backend)

Para completar la funcionalidad de validación de presidentes desde el panel de administración, el equipo de Backend debe implementar los siguientes endpoints. La interfaz ya está preparada para consumirlos.

---

## 1. Obtener Documentos para Revisión
**Ruta:** `GET /solicitud/{solicitud_id}/documentos`

### Descripción
Debe devolver la lista de documentos (Acta, INE, etc.) vinculados a la solicitud, organizados por persona (normalmente el presidente o solicitante).

### Estructura de Respuesta Esperada (JSON)
```json
{
  "equipo": "Nombre del equipo / Solicitante",
  "solicitudId": 123,
  "jugadores": [
    {
      "id": 1,
      "nombre": "Nombre Completo",
      "curp": "CURP12345",
      "documentos": [
        { 
          "tipo": "Acta de Nacimiento", 
          "url": "http://api.afaem.com/uploads/archivo.pdf", 
          "estado": "entregado" 
        }
      ]
    }
  ]
}
```

---

## 2. Validar Solicitud (Aprobar/Rechazar)
**Ruta:** `POST /solicitud/{solicitud_id}/validar`

### Descripción
Actualiza el estatus de la solicitud y, en caso de aprobación, otorga acceso al presidente.

### Payload Esperado (JSON)
```json
{
  "estatus": 1, 
  "observaciones": "Opcional: Motivo del rechazo"
}
```
*   `estatus`: `1` para Aprobado, `0` para Rechazado.

### Lógica Sugerida
1.  Actualizar `Solicitudes.EstatusValidacion` con el valor recibido.
2.  **Si `estatus == 1` (Aprobado):**
    *   Localizar el registro en `PresidentesDeEquipo` vinculado al `UsuarioId` de la solicitud.
    *   Actualizar `PresidentesDeEquipo.EstatusId` a **2 (ACTIVO)** para que el sistema le permita entrar al dashboard.
3.  **Si `estatus == 0` (Rechazado):**
    *   Guardar las `observaciones` en `Solicitudes.ObservacionesSolicitud`.

---

## Notas Técnicas
*   Las URLs de los documentos deben ser accesibles desde el navegador.
*   Se recomienda manejar este proceso mediante una transacción de base de datos para asegurar consistencia.
