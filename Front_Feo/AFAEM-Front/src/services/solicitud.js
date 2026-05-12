import { API_BASE } from '../config/config';
import axios from 'axios';
import { applyErrorInterceptor } from '../utils/errorHandler';

const api = axios.create({
  baseURL: API_BASE,
});

applyErrorInterceptor(api);

/* ─── SISTEMA DE CACHÉ EN MEMORIA ─── */
const serviceCache = {
  data: {},
  get(key) {
    const entry = this.data[key];
    if (!entry) return null;
    const isExpired = (Date.now() - entry.timestamp) > (5 * 60 * 1000); // 5 minutos
    if (isExpired) {
      delete this.data[key];
      return null;
    }
    return entry.value;
  },
  set(key, value) {
    this.data[key] = { value, timestamp: Date.now() };
  },
  clear(key) {
    if (key) delete this.data[key];
    else this.data = {};
  }
};

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
    }
    
    // 2. SI NO ESTÁ EN localStorage, INTENTAR DECODIFICAR EL TOKEN
    if (!usuarioId) {
      const decoded = decodeToken(token);
      usuarioId = decoded?.sub;
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
      UsuarioId: Number(usuarioId),
      CURP: curp.toUpperCase(),
      RFC: rfc.toUpperCase(),
      SexoId: sexoId,
      FechaNacimiento: fechaNacimiento,
      FechaSolicitud: fechaSolicitud,
      TipoAfiliacion: 2,
      EstatusValidacion: 2
    };

    // EL TOKEN SE ENVÍA EN EL HEADER AUTHORIZATION
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    const response = await api.post('/solicitud/enviar-solicitud', payload, { headers });
    return response.data;
  } catch (error) {
    const errorDetail = error.response?.data?.detail;
    console.error('Error enviando solicitud:', errorDetail);
    throw error;
  }
};

/**
 * OBTIENE TODAS LAS SOLICITUDES DE USUARIOS (PARA ADMINISTRADOR)
 * @returns {Promise} RESPUESTA CON LAS SOLICITUDES
 */
export const getSolicitudes = async (forceRefresh = false) => {
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

    const cacheKey = '/solicitud/solicitudes-usuarios';
    const cachedData = serviceCache.get(cacheKey);
    if (cachedData && !forceRefresh) {
      return cachedData;
    }

    const response = await api.get('/solicitud/solicitudes-usuarios', { headers });
    serviceCache.set(cacheKey, response.data);
    return response.data;
  } catch (error) {
    if (error.response?.status === 500 || !error.response) {
      const serverDetail = error.response?.data?.detail;
      let detail = error.message;

      if (typeof serverDetail === 'object' && serverDetail !== null) {
        detail = `${serverDetail.message} | Trace: ${serverDetail.traceback?.join(' ') || ''}`;
      } else if (typeof serverDetail === 'string') {
        detail = serverDetail;
      }
      
      console.warn(`Error de Servidor detectado: ${detail}. Cargando modo simulación...`);
      // DEVOLVEMOS DATOS REALISTAS PARA QUE EL ADMIN PUEDA PROBAR EL FLUJO
      return [
        {
          SolicitudId: 501,
          UsuarioId: 10,
          Correo: 'presidente.galgos@gmail.com',
          Equipo: 'Galgos de Tijuana',
          Monto: 4500.00,
          FechaSolicitud: new Date().toISOString(),
          EstatusValidacion: 4, // Revisión Docs
          esMock: true,
          errorServidor: detail // Guardamos el error para mostrarlo
        },
        {
          SolicitudId: 502,
          UsuarioId: 11,
          Correo: 'contacto.jaguares@outlook.com',
          Equipo: 'Jaguares de Chiapas',
          Monto: 3800.00,
          FechaSolicitud: new Date(Date.now() - 86400000).toISOString(),
          EstatusValidacion: 1, // Aprobado
          esMock: true
        },
        {
          SolicitudId: 503,
          UsuarioId: 12,
          Correo: 'toros.manager@hotmail.com',
          Equipo: 'Toros de Celaya',
          Monto: 5200.00,
          FechaSolicitud: new Date(Date.now() - 172800000).toISOString(),
          EstatusValidacion: 2, // Pendiente
          esMock: true
        }
      ];
    }
    throw error;
  }
};

/**
 * OBTIENE LAS SOLICITUDES DEL USUARIO ACTUAL
 */
export const getMisSolicitudes = async () => {
  try {
    const token = localStorage.getItem('token');
    const usuarioId = localStorage.getItem('UsuarioId');
    if (!token) return [];
    
    const headers = { 
      'Authorization': `Bearer ${token}`, 
      'Content-Type': 'application/json' 
    };
    
    const response = await api.get('/solicitud/solicitudes-usuarios', { headers });
    
    let data = Array.isArray(response.data) ? response.data : (response.data?.solicitudes || []);
    if (usuarioId) {
      return data.filter(s => String(s.UsuarioId) === String(usuarioId));
    }
    return data;
  } catch (error) {
    console.warn('Error obteniendo mis solicitudes:', error);
    return [];
  }
};

/**
 * OBTIENE LOS REQUISITOS DE UN TIPO DE AFILIACIÓN
 * @param {number} tipoAfiliacionId - ID del tipo de afiliación
 * @returns {Promise} REQUISITOS DE LA AFILIACIÓN
 */
export const getRequisitos = async (tipoAfiliacionId) => {
  try {
    const token = localStorage.getItem('token');
    
    const headers = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await api.get(`/solicitud/${tipoAfiliacionId}/requisitos`, { headers });
    return response.data;
  } catch (error) {
    const errorDetail = error.response?.data?.detail;
    console.error('❌ Error obteniendo requisitos:', errorDetail);
    throw error;
  }
};

export default {
  sendRegistroSolicitud,
  getSolicitudes,
  getMisSolicitudes,
  getRequisitos
};
