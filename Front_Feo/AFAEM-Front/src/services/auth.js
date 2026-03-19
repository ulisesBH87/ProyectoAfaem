import axios from 'axios';
import { API_BASE } from '../config/config';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// INTERCEPTOR PARA MANEJAR 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // SOLO REDIRIGIR A LOGIN SI ES UN 401 Y NO ESTAMOS EN UNA PÁGINA QUE LO MANEJA
    if (error.response && error.response.status === 401) {
      console.warn('⚠️ Acceso denegado (401). Error presentado al usuario.');
      // NO limpiar el token automáticamente, dejar que el componente lo maneje
      // localStorage.removeItem('token');
      // localStorage.removeItem('user');
      // localStorage.removeItem('UsuarioId');
      // NO redirigir automáticamente, dejar que el componente lo maneje
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
  // EL SERVIDOR ESPERA { Nombre, PrimerApellido, SegundoApellido, Correo, Contrasena, RolId }
  const res = await api.post('/auth/registrar_admin', datos);
  return res.data;
}

// LOGIN
export async function login(email, password) {
  // El backend usa OAuth2PasswordRequestForm: espera username/password en form-urlencoded.
  const payload = new URLSearchParams({
    username: email,
    password,
  });
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  
  try {
    const res = await api.post('/auth/iniciar-sesion', payload.toString(), { headers });
    console.log('✅ Login exitoso:', res.data); // DEBUG
    return res.data;
  } catch (error) {
    const errorDetail = error.response?.data?.detail;
    console.error('❌ Error en login:', errorDetail); // DEBUG
    console.log('📋 Error completo:', JSON.stringify(error.response?.data, null, 2)); // DEBUG COMPLETO
    throw error;
  }
}

// HELPER PARA FIJAR TOKEN EN HEADERS SI SE NECESITA
export function setAuthToken(token) {
  if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  else delete api.defaults.headers.common['Authorization'];
}

// PING SENCILLO PARA DIAGNÓSTICO (COMPATIBLE CON Login.jsx)
export async function pingBackend() {
  try {
    const res = await api.get('/');
    return { ok: true, url: api.defaults.baseURL + '/', res: res.data };
  } catch {
    return { ok: false, tried: api.defaults.baseURL || API_BASE };
  }
}

export default api;
