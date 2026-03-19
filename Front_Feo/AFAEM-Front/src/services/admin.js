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
  // estatus: 1 = Aprobado, 0 = Rechazado (depende del backend)
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

export default {
  getSolicitudDetalle,
  getPagosGenerales,
  updateEstatusPago,
  getSeguros,
  getAfiliaciones,
  getRequisitosPorTipo
};
