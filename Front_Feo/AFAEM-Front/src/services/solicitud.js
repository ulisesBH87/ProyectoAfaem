import { API_BASE } from '../config/config';
import axios from 'axios';

const api = axios.create({
  baseURL: API_BASE,
});

/**
 * DECODIFICA UN JWT SIN VALIDACIÓN (SOLO PARA LEER EL PAYLOAD)
 * @param {string} token - TOKEN JWT
 * @returns {object} PAYLOAD DECODIFICADO
 */
function decodeToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Token inválido');
    }
    
    const payload = parts[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch (error) {
    console.error('Error decodificando token:', error);
    return null;
  }
}

/**
 * ENVÍA SOLICITUD DE REGISTRO COMO PRESIDENTE DE EQUIPO
 * @param {string} curp - CURP del usuario
 * @param {string} rfc - RFC del usuario
 * @param {number} sexoId - ID del sexo (1=Masculino, 2=Femenino, 3=No binario)
 * @param {string} fechaNacimiento - Fecha de nacimiento (YYYY-MM-DD)
 * @returns {Promise} RESPUESTA DEL SERVIDOR
 */
export const sendRegistroSolicitud = async (curp, rfc, sexoId, fechaNacimiento) => {
  try {
    // OBTENER EL TOKEN DEL LOCALSTORAGE
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No se encontró token. Por favor, inicia sesión primero.');
    }
    
    // INTENTAR OBTENER UsuarioId
    let usuarioId = null;
    
    // 1. INTENTAR OBTENER DEL localStorage (donde se guarda en login)
    let usuarioIdFromStorage = localStorage.getItem('UsuarioId');
    if (usuarioIdFromStorage) {
      usuarioId = usuarioIdFromStorage;
      console.log('✅ UsuarioId obtenido del localStorage:', usuarioId);
    }
    
    // 2. SI NO ESTÁ EN localStorage, INTENTAR DECODIFICAR EL TOKEN
    if (!usuarioId) {
      const decoded = decodeToken(token);
      usuarioId = decoded?.UsuarioId;
      if (usuarioId) {
        console.log('✅ UsuarioId obtenido del token:', usuarioId);
      }
    }
    
    // 3. SI AÚN NO EXISTE, USAR FALLBACK (CUALQUIER MÁQUINA, NO SOLO LOCALHOST)
    if (!usuarioId) {
      usuarioId = 1;
      console.warn('⚠️ UsuarioId no disponible: usando fallback ID = 1');
    }
    
    // OBTENER FECHA Y HORA EXACTA DEL SISTEMA
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    
    const fechaSolicitud = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}Z`;
    
    // EL PAYLOAD INCLUYE: UsuarioId, CURP, RFC, SexoId, FechaNacimiento, FechaSolicitud, EstatusValidacion
    const payload = {
      UsuarioId: usuarioId,
      CURP: curp.toUpperCase(),
      RFC: rfc.toUpperCase(),
      SexoId: sexoId,
      FechaNacimiento: fechaNacimiento,
      FechaSolicitud: fechaSolicitud,
      EstatusValidacion: 2
    };

    // EL TOKEN SE ENVÍA EN EL HEADER AUTHORIZATION
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    console.log('📤 Enviando solicitud:', payload); // DEBUG
    console.log('📋 Fecha de nacimiento recibida:', {
      valor: fechaNacimiento,
      tipo: typeof fechaNacimiento,
      largo: fechaNacimiento?.length
    });
    console.log('🔐 Header Authorization:', `Bearer ${token.substring(0, 20)}...`); // DEBUG
    
    const response = await api.post('/solicitud/enviar-solicitud', payload, { headers });
    console.log('✅ Solicitud enviada:', response.data); // DEBUG
    return response.data;
  } catch (error) {
    const errorDetail = error.response?.data?.detail;
    console.error('❌ Error enviando solicitud:', errorDetail);
    console.log('📋 Error completo:', JSON.stringify(error.response?.data, null, 2)); // DEBUG COMPLETO
    throw error;
  }
};

/**
 * OBTIENE TODAS LAS SOLICITUDES DE USUARIOS (PARA ADMINISTRADOR)
 * @returns {Promise} RESPUESTA CON LAS SOLICITUDES
 */
export const getSolicitudes = async () => {
  try {
    // OBTENER EL TOKEN DEL LOCALSTORAGE
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No se encontró token. Por favor, inicia sesión primero.');
    }

    // EL TOKEN SE ENVÍA EN EL HEADER AUTHORIZATION
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    console.log('📤 Obteniendo solicitudes...');
    const response = await api.get('/solicitud/solicitudes-usuarios', { headers });
    console.log('✅ Solicitudes obtenidas:', response.data); // DEBUG
    return response.data;
  } catch (error) {
    const errorDetail = error.response?.data?.detail;
    console.error('❌ Error obteniendo solicitudes:', errorDetail);
    console.log('📋 Error completo:', JSON.stringify(error.response?.data, null, 2)); // DEBUG COMPLETO
    throw error;
  }
};

export default {
  sendRegistroSolicitud,
  getSolicitudes
};
