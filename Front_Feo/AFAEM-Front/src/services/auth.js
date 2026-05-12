import axios from 'axios';
import { API_BASE } from '../config/config';
import { applyErrorInterceptor } from '../utils/errorHandler';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// APLICAR INTERCEPTOR CENTRALIZADO DE ERRORES
applyErrorInterceptor(api);

// INTERCEPTOR PARA MANEJAR 401 Unauthorized (Log adicional)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('⚠️ Acceso denegado (401). Error presentado al usuario.');
    }
    return Promise.reject(error);
  }
);

// RECUPERAR CONTRASEÑA
export async function forgotPassword(email) {
  const res = await api.post('/auth/recuperar-contrasena', { Correo: email });
  return res.data;
}

// RESETEAR CONTRASEÑA
export async function resetPassword(email, token, nueva_contrasena) {
  const res = await api.post('/auth/resetear-contrasena', { 
    Correo: email, 
    token, 
    nueva_contrasena 
  });
  return res.data;
}

// REGISTRAR ADMIN
export async function registrarAdmin(datos) {
  const res = await api.post('/auth/registrar_admin', datos);
  return res.data;
}

// LOGIN
export async function login(email, password) {
  const payload = {
    Correo: email,
    Contrasena: password,
  };
  
  try {
    const res = await api.post('/auth/iniciar-sesion', payload);
    return res.data;
  } catch (error) {
    const errorDetail = error.response?.data?.detail;
    console.error('Error en login:', errorDetail);
    throw error;
  }
}

// HELPER PARA FIJAR TOKEN EN HEADERS SI SE NECESITA
export function setAuthToken(token) {
  if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  else delete api.defaults.headers.common['Authorization'];
}

// PING SENCILLO PARA DIAGNÓSTICO
export async function pingBackend() {
  try {
    // Volvemos a pedir '/' porque ahora el proxy de Vite lo maneja correctamente para JSON
    const res = await api.get('/');
    return { ok: true, url: '/', res: res.data };
  } catch {
     return { ok: false, tried: '/' };
  }
}

export function parseJwt(token) {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Error parsing JWT:", e);
    return null;
  }
}

export default api;
