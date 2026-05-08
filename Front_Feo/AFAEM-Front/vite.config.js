import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Evita reinicios automáticos por cambios en archivos del backend o subidas
    watch: {
      ignored: ['**/backend/**', '**/uploads/**', '**/.git/**'],
    },
    proxy: {
      '/ocr-api': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/ocr-api/, ''),
      },
      // Backend Proxies (Usando 127.0.0.1 para mayor estabilidad)
      '/auth': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false
      },
      '/solicitud': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false
      },
      '/permisos': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false
      },
      '/ordenes-pago': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false
      },
      '/equipo-temporal': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false
      },
      '/documentos': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false
      },
      '/foto': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false
      },
      '/auditoria': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false
      },
      '/catalogos': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false
      },
      '/validar': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false
      },
      // Proxy para la raíz '/' solo para peticiones JSON (evita el 404 del pingBackend)
      '^/$': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        bypass: (req) => {
          // Si es una petición de navegador (HTML), NO proxiar (Vite maneja el frontend)
          if (req.headers.accept?.includes('text/html')) {
            return req.url;
          }
          return null; // Proxiar al backend
        }
      }
    },
  },
})
