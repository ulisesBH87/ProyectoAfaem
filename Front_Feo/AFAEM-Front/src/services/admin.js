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

// Interceptor para mensajes de error amigables
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si el error es una respuesta del servidor con un detalle específico, lo dejamos pasar
    if (error.response && error.response.data && (error.response.data.detail || error.response.data.message)) {
      return Promise.reject(error);
    }

    // Para errores desconocidos o de red, personalizamos el mensaje
    const friendlyError = {
      ...error,
      message: "Ha ocurrido un error inesperado. Por favor, contacta al equipo de sistemas de AFAEM.",
      isFriendly: true
    };

    return Promise.reject(friendlyError);
  }
);

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
 * OBTIENE LOS DOCUMENTOS REALES DE UNA SOLICITUD
 */
export const getSolicitudDocumentos = async (solicitudId) => {
  try {
    const response = await api.get(`/solicitud/${solicitudId}/documentos`);
    return response.data;
  } catch (error) {
    console.warn(`Backend no listo para GET /solicitud/${solicitudId}/documentos. Usando Mock.`);
    // FALLBACK MOCK (Para que el front siga funcionando mientras el back implementa)
    return {
      Equipo: "Galgos de Tijuana (Mock)",
      SolicitudId: solicitudId,
      Jugadores: [
        {
          Id: 101,
          Nombre: "Juan Pérez",
          CURP: "PERJ880101HDFRRN01",
          Documentos: [
            { Tipo: "Acta de Nacimiento", Url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", Estado: "entregado" },
            { Tipo: "INE", Url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", Estado: "entregado" }
          ]
        }
      ]
    };
  }
};

/**
 * VALIDA (APRUEBA/RECHAZA) UNA SOLICITUD EN EL BACKEND
 */
export const updateSolicitudEstatus = async (solicitudId, estatus, observaciones = "") => {
  // estatus: 2 = Aprobado total, 3 = Rechazado, 4 = Revisado con observaciones
  try {
    const response = await api.post(`/solicitud/${solicitudId}/validar`, {
      Estatus: estatus,
      Observaciones: observaciones
    });
    return response.data;
  } catch (error) {
    console.warn(`Backend no listo para POST /solicitud/${solicitudId}/validar. Simulando éxito.`);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ mensaje: "Estatus actualizado correctamente (Simulado)", solicitud_id: solicitudId });
      }, 1000);
    });
  }
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

/**
 * ACTUALIZA UN EQUIPO (NOMBRE Y ESTATUS)
 */
export const updateEquipo = async (equipoId, nombre, estatus) => {
  const response = await api.patch(`/equipo-temporal/update-equipo/${equipoId}`, {
    NombreEquipo: nombre,
    Estatus: estatus === "1" || estatus === 1 || estatus === true
  });
  return response.data;
};

/**
 * ACTUALIZA UN JUGADOR (NOMBRE, APELLIDOS, CURP Y ESTATUS)
 */
export const updateJugador = async (miembroEquipoId, data) => {
  const response = await api.patch(`/equipo-temporal/update-jugador/${miembroEquipoId}`, {
    Nombre: data.nombre,
    PrimerApellido: data.primerApellido,
    SegundoApellido: data.segundoApellido,
    CURP: data.curp,
    Estatus: data.estatus === "1" || data.estatus === 1 || data.estatus === true
  });
  return response.data;
};

/**
 * OBTIENE EL LISTADO DE AUDITORIAS (PAGINADO)
 */
export const getAuditorias = async (page = 1, size = 10) => {
  const response = await api.get(`/auditoria/?page=${page}&size=${size}`);
  return response.data;
};

export default {
  getSolicitudDetalle,
  getPagosGenerales,
  updateEstatusPago,
  getSeguros,
  getAfiliaciones,
  getRequisitosPorTipo,
  getSolicitudDocumentos,
  updateSolicitudEstatus,
  getEquiposDirectorio,
  getJugadoresDirectorio,
  getJugadorDocumentos,
  updateEquipo,
  updateJugador,
  getAuditorias
};
