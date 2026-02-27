# PARTIAL VIEWS - GUIA DE USO

Este directorio contiene componentes reutilizables (partial views) que puedes usar en toda tu aplicación.

# Estructura

```
src/components/partials/
├── Buttons/          # Botones reutilizables
│   ├── PrimaryButton.jsx
│   └── SecondaryButton.jsx
├── Inputs/           # Inputs con validación
│   └── FormInput.jsx
├── Cards/            # Tarjetas y etiquetas
│   ├── Card.jsx
│   └── Badge.jsx
├── Alerts/           # Alertas y notificaciones
│   └── Alert.jsx
├── Forms/            # Formularios, modals y loaders
│   ├── Modal.jsx
│   └── Spinner.jsx
├── Headers/          # Headers reutilizables
├── Tables/           # Tablas reutilizables
└── index.js          # Exporta todos los partials
```

# Uso Rápido

# Opción 1: Importar desde el index (RECOMENDADO)

```jsx
import { PrimaryButton, FormInput, Card, Alert } from '@/components/partials';

export default function MyComponent() {
  return (
    <>
      <FormInput 
        label="Email" 
        type="email"
        placeholder="usuario@example.com"
        required
      />
      <PrimaryButton label="Enviar" onClick={() => console.log('Click!')} />
    </>
  );
}
```

# Opción 2: Importar directamente

```jsx
import PrimaryButton from '@/components/partials/Buttons/PrimaryButton';
import FormInput from '@/components/partials/Inputs/FormInput';
```

# Componentes Disponibles

# 1. PrimaryButton

Botón principal con tema azul

```jsx
<PrimaryButton 
  label="Enviar"
  onClick={handleSubmit}
  disabled={false}
  loading={isLoading}
  size="medium"  // 'small' | 'medium' | 'large'
  type="button"
/>
```

Props:
- label (string) - Texto del botón
- onClick (function) - Click handler
- disabled (boolean) - Deshabilitado
- loading (boolean) - Mostrar estado de carga
- size (string) - Tamaño del botón
- type (string) - Tipo HTML (button, submit, reset)

# 2. SecondaryButton

Botón secundario con borde azul

```jsx
<SecondaryButton 
  label="Cancelar"
  onClick={handleCancel}
  size="medium"
/>
```

Props:
- label (string) - Texto
- onClick (function) - Click handler
- disabled (boolean) - Deshabilitado
- size (string) - Tamaño

# 3. FormInput

Input con validación y estilos

```jsx
<FormInput
  label="Nombre Completo"
  type="text"
  value={name}
  onChange={(e) => setName(e.target.value)}
  placeholder="Escribe tu nombre"
  error={errors.name}  // Muestra error si existe
  required={true}
  icon="Nombre"
  disabled={false}
/>
```

Props:
- label (string) - Etiqueta
- type (string) - Tipo de input (text, email, password, etc)
- value (string) - Valor actual
- onChange (function) - Change handler
- error (string) - Mensaje de error
- required (boolean) - Requerido
- icon (string) - Icono o símbolo
- placeholder (string) - Placeholder text
- disabled (boolean) - Deshabilitado

# 4. Card

Tarjeta para agrupar contenido

```jsx
<Card 
  title="Mi Tarjeta"
  subtitle="Esta es una descripción"
  hoverable={true}
  onClick={() => console.log('Card clicked')}
>
  <p>Contenido de la tarjeta</p>
</Card>
```

Props:
- title (string) - Título
- subtitle (string) - Subtítulo
- children (ReactNode) - Contenido
- onClick (function) - Click handler
- hoverable (boolean) - Efecto hover
- style (object) - Estilos adicionales

# 5. Badge

Etiquetas pequeñas para estados

```jsx
<Badge 
  label="Aprobado"
  type="success"  // 'success' | 'error' | 'warning' | 'info' | 'primary' | 'gray'
  size="medium"   // 'small' | 'medium'
  icon="Aprobado"
/>
```

Props:
- label (string) - Texto de la etiqueta
- type (string) - Tipo de badge
- size (string) - Tamaño
- icon (string) - Icono o símbolo

# 6. Alert

Notificaciones y mensajes

```jsx
const [showAlert, setShowAlert] = useState(true);

<Alert
  type="success"  // 'success' | 'error' | 'warning' | 'info'
  title="Exito"
  message="La operación se completó correctamente"
  dismissible={true}
  onClose={() => setShowAlert(false)}
/>
```

Props:
- type (string) - Tipo de alerta
- message (string) - Mensaje principal
- title (string) - Título
- dismissible (boolean) - Se puede cerrar
- onClose (function) - Close handler
- icon (string) - Icono personalizado

# 7. Modal

Diálogos y modales

```jsx
const [isOpen, setIsOpen] = useState(false);

<Modal
  isOpen={isOpen}
  title="Confirmar acción"
  size="medium"  // 'small' | 'medium' | 'large'
  onClose={() => setIsOpen(false)}
  footer={
    <>
      <SecondaryButton label="Cancelar" onClick={() => setIsOpen(false)} />
      <PrimaryButton label="Confirmar" onClick={handleConfirm} />
    </>
  }
>
  <p>¿Estás seguro de continuar?</p>
</Modal>
```

Props:
- isOpen (boolean) - Si está abierto
- title (string) - Título
- children (ReactNode) - Contenido
- onClose (function) - Close handler
- footer (ReactNode) - Buttons de pie
- size (string) - Tamaño del modal

# 8. Spinner

Indicador de carga

```jsx
// Inline
<Spinner size="medium" message="Cargando..." />

// Full screen
<Spinner fullScreen={true} message="Por favor espera..." />
```

Props:
- size (string) - 'small' | 'medium' | 'large'
- fullScreen (boolean) - Ocupar pantalla completa
- message (string) - Mensaje de carga
- color (string) - Color del spinner

# Temas de Color

- Primary Blue: #0b4ea6 (Azul principal)
- Dark Blue: #063f82 (Azul oscuro para hover)
- Gray: #64748b (Gris)
- Success: #28a745 (Verde)
- Error: #dc3545 (Rojo)
- Warning: #ffc107 (Amarillo)
- Info: #0284c7 (Azul claro)

# Crear Nuevos Partials

Para crear un nuevo partial view:

1. Crea el archivo en la carpeta correspondiente
2. Exporta desde index.js en la raíz de partials
3. Documenta props en el comentario JSDoc
4. Mantén consistencia con los estilos existentes