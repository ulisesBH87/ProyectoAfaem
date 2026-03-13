# COMPONENTES REUTILIZABLES (PARTIAL VIEWS)

# ¿Qué son los Componentes Reutilizables?

Son componentes React predefinidos que pueden usarse en múltiples páginas. Facilitan mantener un estilo consistente y reducen duplicación de código.

**Ubicación:** `src/components/partials/`

**Componentes disponibles:** 8 componentes principales

```
partials/
├─ Alerts/
├─ Buttons/
├─ Cards/
├─ Forms/
├─ Headers/
├─ Inputs/
├─ Tables/
├─ Modals/
└─ index.js
```

# Cómo Usar los Componentes

# 1. Importar

```javascript
import { 
    Alert, 
    PrimaryButton, 
    Card,
    FormInput
} from '../components/partials';
```

O importar todos:
```javascript
import * as Partials from '../components/partials';
```

# 2. Usarlos en JSX

```javascript
<Partials.Alert 
    type="success" 
    message="Operación completada"
/>

<Partials.PrimaryButton 
    text="Registrar"
    onClick={handleRegister}
/>
```

---

# COMPONENTES DETALLADOS

# 1. ALERT

**Ubicación:** `Alerts/Alert.jsx`

Muestra mensajes de alerta, éxito, error, etc.

# Props

```javascript
{
    type: 'success' | 'error' | 'warning' | 'info',  // Tipo de alerta (requerido)
    message: string,                                  // Mensaje a mostrar (requerido)
    dismissible: boolean,                             // Se puede cerrar (default: true)
    onClose: function,                                // Callback al cerrar
    icon: string,                                     // Ícono personalizado
    title: string,                                    // Título de la alerta
    style: object                                     // Estilos adicionales CSS
}
```

# Ejemplo

```javascript
<Alert
    type="success"
    title="Registro exitoso"
    message="El usuario fue registrado correctamente"
    dismissible={true}
    onClose={() => console.log('Cerrado')}
/>
```

# Estilos por Tipo

```javascript
{
    success: {
        backgroundColor: '#d4edda',
        borderColor: '#28a745',
        color: '#155724'
    },
    error: {
        backgroundColor: '#f8d7da',
        borderColor: '#dc3545',
        color: '#721c24'
    },
    warning: {
        backgroundColor: '#fff3cd',
        borderColor: '#ffc107',
        color: '#856404'
    },
    info: {
        backgroundColor: '#d1ecf1',
        borderColor: '#0c5460',
        color: '#0c5460'
    }
}
```

---

# 2. BUTTONS

**Ubicación:** `Buttons/`

# Primary Button

```javascript
<PrimaryButton
    text="Enviar"
    onClick={handleSubmit}
    disabled={isLoading}
    style={{ marginRight: '10px' }}
/>
```

**Props:**
```javascript
{
    text: string,           // Texto del botón (requerido)
    onClick: function,      // Callback al hacer click
    disabled: boolean,      // Deshabilitado
    style: object          // Estilos adicionales
}
```

**Estilos:**
```css
background-color: #007bff;  /* Azul */
color: white;
padding: 8px 16px;
border: none;
border-radius: 4px;
cursor: pointer;
```

# Secondary Button

```javascript
<SecondaryButton
    text="Cancelar"
    onClick={handleCancel}
/>
```

**Similar a PrimaryButton pero con estilos diferentes:**
```css
background-color: #6c757d;  /* Gris */
color: white;
```

---

# 3. CARD

**Ubicación:** `Cards/Card.jsx`

Contenedor con estilo para agrupar contenido.

# Ejemplo

```javascript
<Card title="Información del Usuario" style={{ marginBottom: '20px' }}>
    <p>Nombre: Juan Pérez</p>
    <p>Correo: juan@example.com</p>
</Card>
```

**Props:**
```javascript
{
    title: string,          // Título de la tarjeta
    children: ReactNode,    // Contenido dentro
    style: object          // Estilos adicionales
}
```

**Estilos:**
```css
border: 1px solid #ddd;
border-radius: 8px;
padding: 16px;
box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
```

---

# 4. FORM INPUT

**Ubicación:** `Forms/FormInput.jsx`

Input para formularios con validación.

# Ejemplo

```javascript
const [formData, setFormData] = useState({
    nombre: '',
    correo: ''
});

<FormInput
    label="Nombre Completo"
    type="text"
    name="nombre"
    value={formData.nombre}
    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
    required={true}
/>

<FormInput
    label="Correo"
    type="email"
    name="correo"
    value={formData.correo}
    onChange={(e) => setFormData({...formData, correo: e.target.value})}
    required={true}
/>
```

**Props:**
```javascript
{
    label: string,          // Etiqueta del input (requerido)
    type: string,           // text | email | password | date (default: text)
    name: string,           // Nombre del campo (requerido)
    value: string,          // Valor actual
    onChange: function,     // Callback al cambiar (requerido)
    required: boolean,      // Requerido (default: false)
    placeholder: string,    // Placeholder
    style: object          // Estilos adicionales
}
```

**Tipos soportados:**
```javascript
'text'          // Texto normal
'email'         // Email con validación
'password'      // Contraseña (oculta)
'number'        // Solo números
'date'          // Selector de fecha
'tel'           // Teléfono
'textarea'      // Área de texto multilínea
```

---

# 5. BADGE

**Ubicación:** `Buttons/Badge.jsx`

Etiqueta pequeña para estados o categorías.

# Ejemplo

```javascript
<Badge 
    text="Aprobado"
    type="success"
/>

<Badge
    text="Pendiente"
    type="warning"
/>

<Badge
    text="Rechazado"
    type="error"
/>
```

**Props:**
```javascript
{
    text: string,                                    // Texto (requerido)
    type: 'success' | 'error' | 'warning' | 'info', // Tipo (default: info)
    style: object                                    // Estilos adicionales
}
```

**Colores:**
- success: Verde
- error: Rojo
- warning: Amarillo
- info: Azul

---

# 6. MODAL

**Ubicación:** `Modals/Modal.jsx`

Ventana modal para diálogos.

# Ejemplo

```javascript
const [isOpen, setIsOpen] = useState(false);

<button onClick={() => setIsOpen(true)}>Abrir Modal</button>

{isOpen && (
    <Modal
        title="Confirmar eliminación"
        onClose={() => setIsOpen(false)}
    >
        <p>¿Estás seguro de que deseas eliminar?</p>
        <button onClick={handleDelete}>Eliminar</button>
        <button onClick={() => setIsOpen(false)}>Cancelar</button>
    </Modal>
)}
```

**Props:**
```javascript
{
    title: string,          // Título del modal (requerido)
    onClose: function,      // Callback al cerrar (requerido)
    children: ReactNode,    // Contenido del modal
    size: 'small' | 'medium' | 'large' // Tamaño (default: medium)
}
```

---

# 7. TABLE

**Ubicación:** `Tables/Table.jsx`

Tabla para mostrar datos estructurados.

# Ejemplo

```javascript
const columns = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'correo', label: 'Correo' },
    { key: 'estado', label: 'Estado' }
];

const data = [
    { nombre: 'Juan', correo: 'juan@example.com', estado: 'Activo' },
    { nombre: 'María', correo: 'maria@example.com', estado: 'Activo' }
];

<Table 
    columns={columns}
    data={data}
    onRowClick={(row) => console.log(row)}
/>
```

**Props:**
```javascript
{
    columns: array,         // Definición de columnas (requerido)
    data: array,            // Datos de filas (requerido)
    onRowClick: function,   // Callback al hacer click en fila
    striped: boolean,       // Filas alternadas (default: true)
    hover: boolean          // Efecto hover (default: true)
}
```

**Estructura de columns:**
```javascript
[
    { key: 'nombreCampo', label: 'Titulo Columna' },
    { key: 'otro', label: 'Otro' }
]
```

---

# 8. SPINNER

**Ubicación:** `Spinners/Loader.jsx`

Indicador de carga.

# Ejemplo

```javascript
{isLoading && <Spinner />}

{isLoading && (
    <Spinner 
        size="large"
        message="Cargando datos..."
    />
)}
```

**Props:**
```javascript
{
    size: 'small' | 'medium' | 'large',  // Tamaño
    message: string,                      // Mensaje de carga
    color: string                         // Color personalizado
}
```

---

# Ejemplo Completo: Formulario de Registro

```javascript
import React, { useState } from 'react';
import {
    Card,
    FormInput,
    PrimaryButton,
    Alert,
    Spinner
} from '../components/partials';
import { registerUser } from '../services/auth';

export function RegistroCompleto() {
    const [formData, setFormData] = useState({
        nombre: '',
        primerApellido: '',
        segundoApellido: '',
        correo: '',
        contrasena: ''
    });
    
    const [isLoading, setIsLoading] = useState(false);
    const [alert, setAlert] = useState(null);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        
        try {
            const response = await registerUser(formData);
            setAlert({
                type: 'success',
                message: 'Usuario registrado correctamente',
                title: 'Éxito'
            });
            // Limpiar formulario
            setFormData({
                nombre: '',
                primerApellido: '',
                segundoApellido: '',
                correo: '',
                contrasena: ''
            });
        } catch (error) {
            setAlert({
                type: 'error',
                message: error.message,
                title: 'Error'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card title="Formulario de Registro">
            {isLoading && <Spinner message="Registrando usuario..." />}
            
            {alert && (
                <Alert
                    type={alert.type}
                    title={alert.title}
                    message={alert.message}
                    dismissible={true}
                    onClose={() => setAlert(null)}
                />
            )}
            
            <form onSubmit={handleSubmit}>
                <FormInput
                    label="Nombre"
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    required={true}
                />
                
                <FormInput
                    label="Primer Apellido"
                    type="text"
                    name="primerApellido"
                    value={formData.primerApellido}
                    onChange={handleChange}
                    required={true}
                />
                
                <FormInput
                    label="Segundo Apellido"
                    type="text"
                    name="segundoApellido"
                    value={formData.segundoApellido}
                    onChange={handleChange}
                />
                
                <FormInput
                    label="Correo"
                    type="email"
                    name="correo"
                    value={formData.correo}
                    onChange={handleChange}
                    required={true}
                />
                
                <FormInput
                    label="Contraseña"
                    type="password"
                    name="contrasena"
                    value={formData.contrasena}
                    onChange={handleChange}
                    required={true}
                />
                
                <PrimaryButton
                    text="Registrar"
                    onClick={handleSubmit}
                    disabled={isLoading}
                />
            </form>
        </Card>
    );
}
```

---

# Ver Todos los Componentes

Hay una página de ejemplo para ver todos los componentes:

**URL:** `http://localhost:8080/ejemplo-partials`

**Archivo:** `src/components/PartialsExample.jsx`

---
Consult:
- [Frontend - Estructura](21_FRONTEND_ESTRUCTURA.md)
- [Endpoint de API](24_ENDPOINTS_API.md)
