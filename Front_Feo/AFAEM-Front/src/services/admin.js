import axios from 'axios';
import { API_BASE } from '../config/config';
import { applyErrorInterceptor } from '../utils/errorHandler';

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

// Aplicar interceptor centralizado para manejo de errores (códigos del servidor)
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

const fetchWithCache = async (url, options = {}) => {
  const cacheKey = typeof url === 'string' ? url : url.url;
  const cachedData = serviceCache.get(cacheKey);
  if (cachedData && !options.forceRefresh) {
    return cachedData;
  }

  const response = await api.get(url, options);
  serviceCache.set(cacheKey, response.data);
  return response.data;
};

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
export const getPagosGenerales = async (forceRefresh = false) => {
  return fetchWithCache('/ordenes-pago/generales', { forceRefresh });
};

/**
 * ACTUALIZA EL ESTATUS DE UNA ORDEN DE PAGO
 */
export const updateEstatusPago = async (ordenPagoId, estatus) => {
  
  // 3 = APROBADO. 4 = RECHAZADO
  const response = await api.post('/ordenes-pago/estatus-pago', null, {
    params: { orden_pago_id: ordenPagoId, estatus: estatus }
  });
  serviceCache.clear('/ordenes-pago/generales'); // Invalida caché de pagos
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

export const getEquiposDirectorio = async (forceRefresh = false) => {
  return fetchWithCache('/equipo-temporal/directorio-equipos', { forceRefresh });
};

export const getJugadoresDirectorio = async (forceRefresh = false) => {
  return fetchWithCache('/equipo-temporal/directorio-jugadores', { forceRefresh });
};

export const getJugadorDocumentos = async (personaId) => {
  const response = await api.get(`/equipo-temporal/jugador/${personaId}/documentos`);
  return response.data;
};

export const exportarJugadorDocumentos = async (miembroEquipoId) => {
  return api.get(`/equipo-temporal/jugador/${miembroEquipoId}/exportar`, {
    responseType: 'blob',
  });
};

export const exportarEquipoDocumentos = async (equipoId) => {
  return api.get(`/equipo-temporal/equipo/${equipoId}/exportar`, {
    responseType: 'blob',
  });
};

/**
 * ACTUALIZA UN EQUIPO (NOMBRE, ESTATUS, PRESIDENTE Y CATEGORÍAS)
 */
export const updateEquipo = async (equipoId, nombre, estatus, extras = {}) => {
  const payload = {
    NombreEquipo: nombre,
    Estatus: estatus === "1" || estatus === 1 || estatus === true
  };

  // Añadir campos opcionales si vienen
  if (extras.presidenteEquipoId != null) payload.PresidenteEquipoId = extras.presidenteEquipoId;
  if (extras.ligaId != null) payload.LigaId = extras.ligaId;
  if (extras.modalidadId != null) payload.ModalidadId = extras.modalidadId;
  if (extras.categoriaId != null) payload.CategoriaId = extras.categoriaId;
  if (extras.ramaId != null) payload.RamaId = extras.ramaId;

  const response = await api.patch(`/equipo-temporal/update-equipo/${equipoId}`, payload);
  // Invalida catálogos relacionados
  serviceCache.clear('/equipo-temporal/directorio-equipos');
  serviceCache.clear('/equipo-temporal/directorio-jugadores');
  return response.data;
};

/**
 * OBTIENE CATÁLOGOS DE REGISTRO (LIGAS, MODALIDADES, CATEGORÍAS, RAMAS)
 */
export const getCatalogosRegistro = async () => {
  return fetchWithCache('/equipo-temporal/catalogos-registro');
};

/**
 * ACTUALIZA UN JUGADOR (NOMBRE, APELLIDOS, CURP Y ESTATUS)
 */
export const updateJugador = async (miembroEquipoId, data) => {
  // Mapear string de sexo a SexoId numérico
  const sexoMap = { 'Masculino': 1, 'Femenino': 2, 'No Binario': 3 };
  const sexoId = data.sexo ? (sexoMap[data.sexo] ?? null) : null;

  const response = await api.patch(`/equipo-temporal/update-jugador/${miembroEquipoId}`, {
    Nombre: data.nombre || null,
    PrimerApellido: data.primerApellido || null,
    SegundoApellido: data.segundoApellido || null,
    CURP: data.curp || null,
    Estatus: data.estatus === "1" || data.estatus === 1 || data.estatus === true,
    Email: data.email || null,
    SexoId: sexoId,
    FechaNacimiento: data.fechaNacimiento || null,
  });
  serviceCache.clear('/equipo-temporal/directorio-jugadores');
  return response.data;
};

/**
 * OBTIENE EL DIRECTORIO DE PRESIDENTES
 */
export const getPresidentesDirectorio = async (forceRefresh = false) => {
  return fetchWithCache('/equipo-temporal/directorio-presidentes-activos', { forceRefresh });
};

/**
 * ACTUALIZA LOS DATOS DE UN PRESIDENTE
 */
export const updatePresidente = async (presidenteId, data) => {
  const response = await api.patch(`/equipo-temporal/update-presidente/${presidenteId}`, {
    primerNombre:    data.primerNombre,
    primerApellido:  data.primerApellido,
    segundoApellido: data.segundoApellido,
    correo:          data.correo,
    telefono:        data.telefono,
    curp:            data.curp,
    estatusId:       Number(data.estatusId)
  });
  serviceCache.clear('/equipo-temporal/directorio-presidentes');
  serviceCache.clear('/equipo-temporal/directorio-presidentes-activos');
  return response.data;
};

/**
 * ELIMINA PERMANENTEMENTE A UN PRESIDENTE
 */
export const deletePresidente = async (presidenteId) => {
  const response = await api.delete(`/equipo-temporal/delete-presidente/${presidenteId}`);
  serviceCache.clear('/equipo-temporal/directorio-presidentes');
  return response.data;
};

/**
 * OBTIENE PRESIDENTES DISPONIBLES (SIN EQUIPO) PARA REASIGNACIÓN
 */
export const getPresidentesDisponibles = async () => {
  const response = await api.get('/equipo-temporal/presidentes-disponibles');
  return response.data;
};

/**
 * VINCULA UN PRESIDENTE A UN EQUIPO ESPECÍFICO
 */
export const vincularPresidenteEquipo = async (presidenteId, equipoId) => {
  const response = await api.post(`/equipo-temporal/vincular-presidente-equipo`, {
    PresidenteId: presidenteId,
    EquipoId: equipoId
  });
  serviceCache.clear('/equipo-temporal/directorio-presidentes');
  serviceCache.clear('/equipo-temporal/directorio-equipos');
  return response.data;
};

/**
 * OBTIENE EL LISTADO DE AUDITORIAS (PAGINADO)
 */
export const getAuditorias = async (page = 1, size = 10) => {
  const response = await api.get(`/auditoria/?page=${page}&size=${size}`);
  return response.data;
};

/**
 * REGISTRA UN JUGADOR DIRECTAMENTE EN UN EQUIPO EXISTENTE (USO DEL ADMIN)
 * POST /equipo-temporal/agregar-jugador-equipo-existente
 */
export const agregarJugadorEquipoExistente = async (formData) => {
  const response = await api.post('/equipo-temporal/agregar-jugador-equipo-existente', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const registrarPresidenteAdmin = async (data) => {
  try {
    const response = await api.post('/equipo-temporal/registrar-presidente-admin', data);
    // Invalidar caché del directorio
    serviceCache.clear('/equipo-temporal/directorio-presidentes-activos');
    return response.data;
  } catch (error) {
    //console.error('Error registrando presidente (admin):', error);
    throw error;
  }
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
  exportarJugadorDocumentos,
  exportarEquipoDocumentos,
  updateEquipo,
  updateJugador,
  getPresidentesDirectorio,
  updatePresidente,
  deletePresidente,
  getPresidentesDisponibles,
  vincularPresidenteEquipo,
  getAuditorias,
  agregarJugadorEquipoExistente,
  registrarPresidenteAdmin,
  getCatalogosRegistro
};
