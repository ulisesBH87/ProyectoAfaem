# Partial Views Completo - Documentación Técnica

Este es el documento completo de la guía de Partial Views con toda la información técnica detallada.

## ¿Qué son los Partial Views?

Los Partial Views son componentes React reutilizables que encapsulan funcionalidad y estilos específicos. Son como bloques de construcción modulares que puedes combinar para crear interfaces complejas.

# Características Principales

- **Reutilizables**: Usa el mismo componente en múltiples lugares
- **Personalizables**: Props para adaptarse a diferentes casos de uso
- **Documentados**: Cada componente tiene ejemplos de uso
- **Accesibles**: Cumplen con estándares de accesibilidad web
- **Responsivos**: Se adaptan a cualquier tamaño de pantalla

# Componentes Disponibles

# 1. PrimaryButton

Botón para acciones principales.

Propiedades:
- label: Texto del botón
- onClick: Función al hacer clic
- disabled: Deshabilitar botón
- loading: Mostrar estado de carga
- size: Tamaño (small, medium, large)
- type: Tipo HTML (button, submit, reset)

Ejemplo:

```jsx
<PrimaryButton 
  label="Guardar"
  onClick={handleSave}
  loading={isSaving}
/>
```

# 2. SecondaryButton

Botón para acciones secundarias con borde.

Propiedades:
- label: Texto del botón
- onClick: Función al hacer clic
- disabled: Deshabilitar botón
- size: Tamaño

Ejemplo:

```jsx
<SecondaryButton 
  label="Cancelar"
  onClick={handleCancel}
/>
```

# 3. FormInput

Input para formularios con validación.

Propiedades:
- label: Etiqueta del input
- type: Tipo de input (text, email, password, date, etc)
- value: Valor actual
- onChange: Función al cambiar
- error: Mensaje de error
- required: Campo requerido
- icon: Icono o símbolo
- placeholder: Texto de ayuda
- disabled: Deshabilitar input

Ejemplo:

```jsx
<FormInput
  label="Email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={errors.email}
  required
/>
```

# 4. Card

Tarjeta contenedora de contenido.

Propiedades:
- title: Título de la tarjeta
- subtitle: Subtítulo
- children: Contenido
- onClick: Función al hacer clic
- hoverable: Efecto al pasar el mouse
- style: Estilos adicionales

Ejemplo:

```jsx
<Card title="Mi Tarjeta" subtitle="Descripción">
  <p>Contenido aquí</p>
</Card>
```

# 5. Badge

Etiqueta pequeña para estados.

Propiedades:
- label: Texto de la etiqueta
- type: Tipo (success, error, warning, info, primary, gray)
- size: Tamaño (small, medium)
- icon: Icono o símbolo

Ejemplo:

```jsx
<Badge label="Activo" type="success" />
```

# 6. Alert

Notificación o alerta.

Propiedades:
- type: Tipo (success, error, warning, info)
- title: Título
- message: Mensaje
- dismissible: Se puede cerrar
- onClose: Función al cerrar
- icon: Icono personalizado

Ejemplo:

```jsx
<Alert
  type="success"
  title="Exito"
  message="Operación completada"
  dismissible
/>
```

# 7. Modal

Diálogo modal.

Propiedades:
- isOpen: Si está abierto
- title: Título
- children: Contenido
- onClose: Función al cerrar
- footer: Botones de pie
- size: Tamaño (small, medium, large)

Ejemplo:

```jsx
<Modal
  isOpen={showModal}
  title="Confirmar"
  onClose={() => setShowModal(false)}
>
  <p>¿Continuar?</p>
</Modal>
```

# 8. Spinner

Indicador de carga.

Propiedades:
- size: Tamaño (small, medium, large)
- fullScreen: Ocupar pantalla completa
- message: Texto de carga
- color: Color del spinner

Ejemplo:

```jsx
<Spinner size="medium" message="Cargando..." />
```

# Cómo Importar

```jsx
// Importar varios componentes
import { PrimaryButton, FormInput, Card } from '@/components/partials';

// Importar todos con alias
import * as UI from '@/components/partials';

// Usar
<PrimaryButton label="Click" />
<UI.FormInput label="Email" />
```

# Tema de Colores

- Azul Primario: #0b4ea6
- Azul Oscuro: #063f82
- Gris: #64748b
- Verde (Success): #28a745
- Rojo (Error): #dc3545
- Amarillo (Warning): #ffc107
- Azul Claro (Info): #0284c7

# Crear Nuevos Partials

Para extender el sistema:

1. Crea un archivo en la carpeta correspondiente
2. Exporta desde src/components/partials/index.js
3. Sigue el mismo patrón de estilo
4. Documenta las propiedades

Ejemplo:

```jsx
// src/components/partials/Inputs/SelectInput.jsx
export default function SelectInput({ label, options, value, onChange }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <select value={value} onChange={onChange}>
        <option value="">Selecciona...</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
```

Luego agrégalo al index.js:

```js
export { default as SelectInput } from './Inputs/SelectInput';
```

# Página de Ejemplo

Accede a http://localhost:5173/ejemplo-partials para ver todos los componentes en acción.
