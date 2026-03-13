# PARTIAL VIEWS - GUÍA DE USO

Este directorio contiene **componentes reutilizables** (partial views) que puedes usar en toda tu aplicación.

## 📁 Estructura

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

## 🚀 Uso Rápido

### Opción 1: Importar desde el index (RECOMENDADO)
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

### Opción 2: Importar directamente
```jsx
import PrimaryButton from '@/components/partials/Buttons/PrimaryButton';
import FormInput from '@/components/partials/Inputs/FormInput';
```

## 📚 Componentes Disponibles

### 1️⃣ **PrimaryButton**
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

**Props:**
- `label` (string) - Texto del botón
- `onClick` (function) - Click handler
- `disabled` (boolean) - Deshabilitado
- `loading` (boolean) - Mostrar estado de carga
- `size` (string) - Tamaño del botón
- `type` (string) - Tipo HTML (button, submit, reset)

---

### 2️⃣ **SecondaryButton**
Botón secundario con borde azul

```jsx
<SecondaryButton 
  label="Cancelar"
  onClick={handleCancel}
  size="medium"
/>
```

**Props:**
- `label` (string) - Texto
- `onClick` (function) - Click handler
- `disabled` (boolean) - Deshabilitado
- `size` (string) - Tamaño

---

### 3️⃣ **FormInput**
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
  icon="👤"
  disabled={false}
/>
```

**Props:**
- `label` (string) - Etiqueta
- `type` (string) - Tipo de input (text, email, password, etc)
- `value` (string) - Valor actual
- `onChange` (function) - Change handler
- `error` (string) - Mensaje de error
- `required` (boolean) - Requerido
- `icon` (string) - Emoji o símbolo
- `placeholder` (string) - Placeholder text
- `disabled` (boolean) - Deshabilitado

---

### 4️⃣ **Card**
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

**Props:**
- `title` (string) - Título
- `subtitle` (string) - Subtítulo
- `children` (ReactNode) - Contenido
- `onClick` (function) - Click handler
- `hoverable` (boolean) - Efecto hover
- `style` (object) - Estilos adicionales

---

### 5️⃣ **Badge**
Etiquetas pequeñas para estados

```jsx
<Badge 
  label="Aprobado"
  type="success"  // 'success' | 'error' | 'warning' | 'info' | 'primary' | 'gray'
  size="medium"   // 'small' | 'medium'
  icon="✓"
/>
```

**Props:**
- `label` (string) - Texto de la etiqueta
- `type` (string) - Tipo de badge
- `size` (string) - Tamaño
- `icon` (string) - Emoji o símbolo

---

### 6️⃣ **Alert**
Notificaciones y mensajes

```jsx
const [showAlert, setShowAlert] = useState(true);

<Alert
  type="success"  // 'success' | 'error' | 'warning' | 'info'
  title="¡Éxito!"
  message="La operación se completó correctamente"
  dismissible={true}
  onClose={() => setShowAlert(false)}
/>
```

**Props:**
- `type` (string) - Tipo de alerta
- `message` (string) - Mensaje principal
- `title` (string) - Título
- `dismissible` (boolean) - Se puede cerrar
- `onClose` (function) - Close handler
- `icon` (string) - Emoji personalizado

---

### 7️⃣ **Modal**
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

**Props:**
- `isOpen` (boolean) - Si está abierto
- `title` (string) - Título
- `children` (ReactNode) - Contenido
- `onClose` (function) - Close handler
- `footer` (ReactNode) - Buttons de pie
- `size` (string) - Tamaño del modal

---

### 8️⃣ **Spinner**
Indicador de carga

```jsx
// Inline
<Spinner size="medium" message="Cargando..." />

// Full screen
<Spinner fullScreen={true} message="Por favor espera..." />
```

**Props:**
- `size` (string) - 'small' | 'medium' | 'large'
- `fullScreen` (boolean) - Ocupar pantalla completa
- `message` (string) - Mensaje de carga
- `color` (string) - Color del spinner

---

## 📝 Ejemplo Completo

```jsx
import React, { useState } from 'react';
import {
  PrimaryButton,
  SecondaryButton,
  FormInput,
  Card,
  Alert,
  Badge,
  Modal,
  Spinner
} from '@/components/partials';

export default function ExamplePage() {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: 'info', message: '' });
  const [errors, setErrors] = useState({});

  const handleSubmit = async () => {
    setLoading(true);
    // Simular envío
    setTimeout(() => {
      setLoading(false);
      setAlert({ 
        show: true, 
        type: 'success', 
        message: 'Datos guardados correctamente!' 
      });
      setFormData({ name: '', email: '' });
    }, 2000);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '600px' }}>
      {/* ALERTAS */}
      {alert.show && (
        <Alert
          type={alert.type}
          message={alert.message}
          dismissible
          onClose={() => setAlert({ ...alert, show: false })}
        />
      )}

      {/* CARD CON FORMULARIO */}
      <Card title="Registro de Usuario">
        <FormInput
          label="Nombre Completo"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          error={errors.name}
          required
          icon="👤"
        />

        <FormInput
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          error={errors.email}
          required
          icon="📧"
        />

        <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
          <PrimaryButton 
            label="Enviar"
            onClick={() => setShowModal(true)}
            loading={loading}
          />
          <SecondaryButton 
            label="Limpiar"
            onClick={() => setFormData({ name: '', email: '' })}
          />
        </div>
      </Card>

      {/* ESTADO BADGE */}
      <div style={{ marginTop: '24px' }}>
        <Badge label="Pendiente" type="warning" size="medium" />
      </div>

      {/* MODAL */}
      <Modal
        isOpen={showModal}
        title="Confirmar datos"
        onClose={() => setShowModal(false)}
        footer={
          <>
            <SecondaryButton 
              label="Cancelar" 
              onClick={() => setShowModal(false)} 
            />
            <PrimaryButton 
              label="Confirmar" 
              onClick={handleSubmit}
              loading={loading}
            />
          </>
        }
      >
        <p>¿Confirmas los datos?</p>
        <p><strong>Nombre:</strong> {formData.name}</p>
        <p><strong>Email:</strong> {formData.email}</p>
      </Modal>

      {/* SPINNER */}
      {loading && <Spinner message="Guardando..." />}
    </div>
  );
}
```

---

## ✅ Mejores Prácticas

1. **Siempre importa desde el index** para hacer el código más limpio
2. **Reutiliza estos componentes** en lugar de crear nuevos
3. **Mantén estilos consistentes** usando los temas predefinidos
4. **Documenta props personalizadas** si creas nuevos partials
5. **Sigue el naming convention** de la carpeta correspondiente

---

## 🎨 Temas de Color

- **Primary Blue**: `#0b4ea6` (Azul principal)
- **Dark Blue**: `#063f82` (Azul oscuro para hover)
- **Gray**: `#64748b` (Gris)
- **Success**: `#28a745` (Verde)
- **Error**: `#dc3545` (Rojo)
- **Warning**: `#ffc107` (Amarillo)
- **Info**: `#0284c7` (Azul claro)

---

## 📌 Crear Nuevos Partials

Para crear un nuevo partial view:

1. **Crea el archivo** en la carpeta correspondiente
2. **Exporta desde index.js** en la raíz de partials
3. **Documenta props** en el comentario JSDoc
4. **Mantén consistencia** con los estilos existentes

Ejemplo:

```jsx
// src/components/partials/Cards/StatCard.jsx
import React from 'react';

/**
 * TARJETA DE ESTADÍSTICA
 * @param {string} label - Etiqueta
 * @param {number} value - Valor
 * @param {string} icon - Emoji
 */
export default function StatCard({ label, value, icon = '📊' }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '32px' }}>{icon}</span>
        <div>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{label}</p>
          <h3 style={{ margin: 0, fontSize: '24px', color: '#0b4ea6' }}>{value}</h3>
        </div>
      </div>
    </Card>
  );
}
```

Luego añade a `index.js`:

```js
export { default as StatCard } from './Cards/StatCard';
```

---

¡Listo! Ahora puedes usar partial views en toda tu aplicación. 🎉
