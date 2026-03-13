# Guia de Inicio Rápido - Partial Views

# ¿Qué son los Partial Views?

Los Partial Views son componentes reutilizables pequeños y bien definidos que puedes usar en cualquier parte de tu aplicación. Son como bloques LEGO que construyen interfaces complejas.

# Ubicación de los Componentes

```
src/components/partials/
├── Buttons/
│   ├── PrimaryButton.jsx
│   └── SecondaryButton.jsx
├── Inputs/
│   └── FormInput.jsx
├── Cards/
│   ├── Card.jsx
│   └── Badge.jsx
├── Alerts/
│   └── Alert.jsx
├── Forms/
│   ├── Modal.jsx
│   └── Spinner.jsx
├── index.js          <= IMPORTA AQUI
└── README.md         <= DOCUMENTACION COMPLETA
```

# Cómo Importar

Opción 1: Importar específicos

```jsx
import { PrimaryButton, FormInput } from '@/components/partials';
```

Opción 2: Importar todos

```jsx
import * as PartialViews from '@/components/partials';
```

Opción 3: Importar de forma relativa

```jsx
import { PrimaryButton } from '../../partials';
```

# Ejemplos de Uso

# Botón Primario

```jsx
<PrimaryButton 
  label="Guardar"
  onClick={handleSave}
  loading={isLoading}
  size="large"
/>
```

# Input con Validación

```jsx
<FormInput
  label="Email"
  name="email"
  type="email"
  value={email}
  onChange={handleChange}
  error={errors.email}
  required
  icon="Correo"
/>
```

# Tarjeta con Contenido

```jsx
<Card 
  title="Información del Equipo"
  subtitle="Detalles principales"
  hoverable
>
  <p>Contenido aquí...</p>
</Card>
```

# Badge / Etiqueta

```jsx
<Badge 
  label="Activo"
  type="success"
  icon="Aprobado"
  size="medium"
/>
```

# Alerta

```jsx
<Alert
  type="success"
  title="Exito"
  message="Los datos se guardaron correctamente"
  dismissible
  icon="Aprobado"
/>
```

# Modal

```jsx
<Modal
  isOpen={showModal}
  title="Confirmar Acción"
  size="medium"
  onClose={() => setShowModal(false)}
  footer={
    <>
      <SecondaryButton label="Cancelar" onClick={() => setShowModal(false)} />
      <PrimaryButton label="Confirmar" onClick={handleConfirm} />
    </>
  }
>
  <p>¿Estás seguro de continuar?</p>
</Modal>
```

# Spinner

```jsx
<Spinner 
  size="large"
  fullScreen
  message="Cargando..."
/>
```

# Componentes Disponibles

| Componente      |                 Props Principales |         Casos de Uso |
|-----------------|-----------------------------------|----------------------|
|   PrimaryButton |  size, loading, disabled, onClick | Acciones principales |
| SecondaryButton |           size, disabled, onClick | Acciones secundarias |
|       FormInput |label, error, icon, required, type |          Formularios |
|            Card |        title, subtitle, hoverable |    Agrupar contenido |
|           Badge |                 label, type, size |    Estados/etiquetas |
|           Alert | type, title, message, dismissible |       Notificaciones |
|           Modal |      isOpen, title, size, onClose |             Diálogos |
|         Spinner |         size, fullScreen, message |                Carga |

# Ver el Ejemplo Completo

La aplicación tiene una página de ejemplo interactiva con todos los componentes:

```
http://localhost:5173/ejemplo-partials
```

Accede a esta URL para ver todos los componentes en acción.

# Mejores Prácticas

1. Reutiliza componentes - No repitas código, usa los partials
2. Personaliza con Props - Modifica comportamiento mediante propiedades
3. Combina componentes - Usa múltiples partials juntos para crear interfaces
4. Mantén la documentación - Lee documentos para propiedades completas
5. Importa todos a la vez - Es más limpio que importar uno por uno

# Ayuda?

- Documentación completa: /src/components/partials/README.md
- Página de ejemplo: /ejemplo-partials
- Código fuente: Mira cada archivo en /src/components/partials/