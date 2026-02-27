# React + Vite - Configuración del Frontend

Este documento describe la configuración del template de React con Vite para el proyecto AFAEM.

# Template de React + Vite

Este template proporciona una configuración mínima para trabajar con React en Vite con Hot Module Replacement (HMR) y algunas reglas de ESLint.

# Plugins Oficiales Disponibles

Actualmente hay dos plugins oficiales disponibles:

# 1. vitejs/plugin-react

Usa Babel (u oxc cuando se usa en rolldown-vite) para Fast Refresh.

- Repositorio: https://github.com/vitejs/vite-plugin-react

# 2. vitejs/plugin-react-swc

Usa SWC para Fast Refresh.

- Repositorio: https://github.com/vitejs/vite-plugin-react-swc

# React Compiler

El React Compiler no está habilitado en este template debido a su impacto en el rendimiento del desarrollo y compilación. Para agregarlo, consulta la documentación oficial de React.

# Comandos Disponibles

```bash
# Servidor de desarrollo
npm run dev

# Build para producción
npm run build

# Vista previa de build
npm run preview
```

# Estructura del Proyecto

```
afaem-registro/
├── src/
│   ├── components/          # Componentes React
│   ├── pages/              # Páginas principales
│   ├── services/           # Servicios de API
│   ├── styles/             # Estilos globales
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── public/                 # Archivos estáticos
├── index.html
├── vite.config.js
├── package.json
└── eslint.config.js
```

# Versiones

- React: 19.2.0
- Vite: 7.2.4
- Bootstrap: 5.3.8