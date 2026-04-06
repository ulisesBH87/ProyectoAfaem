import axios from 'axios';
import { API_BASE } from '../config/config';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para agregar el token dinámicamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * OBTIENE EL DETALLE INDIVIDUAL DE UNA SOLICITUD
 */
export const getSolicitudDetalle = async (solicitudId) => {
  const response = await api.get(`/solicitud/solicitud-usuario/${solicitudId}`);
  return response.data;
};

/**
 * OBTIENE TODAS LAS ÓRDENES DE PAGO (GENERALES)
 */
export const getPagosGenerales = async () => {
  const response = await api.get('/ordenes-pago/generales');
  return response.data;
};

/**
 * ACTUALIZA EL ESTATUS DE UNA ORDEN DE PAGO
 */
export const updateEstatusPago = async (ordenPagoId, estatus) => {
  // estatus: 1 = Pendiente, 2 = Rechazado, 3 = Aprobado
  const response = await api.post('/ordenes-pago/estatus-pago', null, {
    params: { orden_pago_id: ordenPagoId, estatus: estatus }
  });
  return response.data;
};

/**
 * OBTIENE CATÁLOGO DE SEGUROS
 */
export const getSeguros = async () => {
  const response = await api.get('/ordenes-pago/seguros');
  return response.data;
};

/**
 * OBTIENE CATÁLOGO DE AFILIACIONES
 */
export const getAfiliaciones = async () => {
  const response = await api.get('/ordenes-pago/afiliaciones');
  return response.data;
};

/**
 * OBTIENE REQUISITOS POR TIPO DE AFILIACIÓN
 */
export const getRequisitosPorTipo = async (tipoId) => {
  const response = await api.get(`/solicitud/${tipoId}/requisitos`);
  return response.data;
};

/**
 * OBTIENE LOS DOCUMENTOS DE UNA SOLICITUD (MOCK)
 */
export const getSolicitudDocumentosMock = async (solicitudId) => {
  // SIMULAMOS UNA RESPUESTA DEL SERVIDOR
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        equipo: "Galgos de Tijuana",
        solicitudId: solicitudId,
        jugadores: [
          {
            id: 101,
            nombre: "Juan Pérez",
            curp: "PERJ880101HDFRRN01",
            documentos: [
              { tipo: "Acta de Nacimiento", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", estado: "entregado" },
              { tipo: "INE", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", estado: "entregado" },
              { tipo: "CURP", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", estado: "entregado" }
            ]
          },
          {
            id: 102,
            nombre: "Carlos Sánchez",
            curp: "SANC901231HDFRRN05",
            documentos: [
              { tipo: "Acta de Nacimiento", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", estado: "entregado" },
              { tipo: "Identificación Oficial", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", estado: "entregado" },
              { tipo: "Foto", url: "https://via.placeholder.com/150", estado: "entregado" }
            ]
          },
          {
            id: 103,
            nombre: "Luis Ramírez",
            curp: "RAML920515HDFRRN09",
            documentos: [
              { tipo: "Acta de Nacimiento", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", estado: "entregado" },
              { tipo: "INE", url: "https://via.placeholder.com/300x200", estado: "entregado" },
              { tipo: "Formato Afiliación", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", estado: "entregado" }
            ]
          }
        ]
      });
    }, 800);
  });
};

/**
 * ACTUALIZA EL ESTATUS DE UNA SOLICITUD (SIMULADO)
 */
export const updateSolicitudEstatus = async (solicitudId, estatus) => {
  // estatus: 1 = Aprobado, 0 = Rechazado
  // Simulación para el frontend
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`✅ [SIMULACIÓN] Solicitud #${solicitudId} cambiada a estatus: ${estatus}`);
      resolve({ mensaje: "Estatus actualizado correctamente (Simulado)", solicitud_id: solicitudId });
    }, 1000);
  });
};

// ==============================================================
//           DIRECTORIO GLOBAL (NUEVO REQUERIMIENTO)
// ==============================================================

export const getEquiposDirectorio = async () => {
  const response = await api.get('/equipo-temporal/directorio-equipos');
  return response.data;
};

export const getJugadoresDirectorio = async () => {
  const response = await api.get('/equipo-temporal/directorio-jugadores');
  return response.data;
};

export const getJugadorDocumentos = async (personaId) => {
  const response = await api.get(`/equipo-temporal/jugador/${personaId}/documentos`);
  return response.data;
};

export default {
  getSolicitudDetalle,
  getPagosGenerales,
  updateEstatusPago,
  getSeguros,
  getAfiliaciones,
  getRequisitosPorTipo,
  getSolicitudDocumentosMock,
  updateSolicitudEstatus,
  getEquiposDirectorio,
  getJugadoresDirectorio,
  getJugadorDocumentos
};
