import { API_BASE } from '../config/config';
import axios from 'axios';
import { applyErrorInterceptor } from '../utils/errorHandler';

const api = axios.create({
  baseURL: API_BASE,
});

applyErrorInterceptor(api);

/**
 * OBTIENE EL PERFIL DEL USUARIO
 */
export const getUserProfile = async (email) => {
  try {
    const response = await api.get(`/user/profile`, {
      params: { email }
    });
    return response.data;
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    throw error;
  }
};

/**
 * OBTIENE LOS EQUIPOS DEL USUARIO
 */
export const getUserTeams = async (email) => {
  try {
    const response = await api.get(`/teams`, {
      params: { email }
    });
    return response.data;
  } catch (error) {
    console.warn('⚠️ Backend no disponible, buscando equipos en localStorage...', error.message);
    // FALLBACK: BUSCAR EN LOCALSTORAGE
    return getTeamsLocally(email);
  }
};

/**
 * OBTIENE EQUIPOS DESDE LOCALSTORAGE (FALLBACK)
 */
const getTeamsLocally = (email) => {
  try {
    const allTeams = JSON.parse(localStorage.getItem('teams') || '[]');
    const userTeams = allTeams.filter(team => team.owner_email.toLowerCase() === email.toLowerCase());

    console.log('📋 Equipos obtenidos desde localStorage:', userTeams);

    return {
      teams: userTeams,
      total: userTeams.length,
      local: true,
      message: 'Datos cargados localmente (backend no disponible)'
    };
  } catch (error) {
    console.error('❌ Error obtiendo equipos de localStorage:', error);
    return { teams: [], total: 0, error: true };
  }
};

/**
 * OBTIENE DETALLES DE UN EQUIPO ESPECÍFICO
 */
export const getTeamDetail = async (teamId, email) => {
  try {
    const response = await api.get(`/teams/${teamId}`, {
      params: { email }
    });
    return response.data;
  } catch (error) {
    console.error('Error obteniendo detalles del equipo:', error);
    throw error;
  }
};

/**
 * CREA UN NUEVO EQUIPO
 */
export const createTeam = async (teamData) => {
  try {
    // teamData debe contener:
    // {
    //   teamName: string,
    //   modality: string,
    //   category: string,
    //   season: string,
    //   email: string,
    //   paymentProof: File,
    //   teamLogo: File
    // }

    const formData = new FormData();
    formData.append('teamName', teamData.teamName);
    formData.append('modality', teamData.modality);
    formData.append('category', teamData.category);
    formData.append('season', teamData.season);
    formData.append('email', teamData.email);
    formData.append('paymentProof', teamData.paymentProof);
    formData.append('teamLogo', teamData.teamLogo);
    formData.append('players', JSON.stringify(teamData.players || []));

    const response = await api.post('/teams', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  } catch (error) {
    console.warn('⚠️ Backend no disponible, guardando equipo en localStorage...', error.message);

    // FALLBACK: GUARDAR EN LOCALSTORAGE SI EL BACKEND NO ESTÁ DISPONIBLE
    return saveTeamLocally(teamData);
  }
};

/**
 * GUARDA UN EQUIPO EN LOCALSTORAGE (FALLBACK)
 */
const saveTeamLocally = (teamData) => {
  try {
    // OBTENER EQUIPOS EXISTENTES
    const existingTeams = JSON.parse(localStorage.getItem('teams') || '[]');

    // GENERAR ID
    const newId = existingTeams.length > 0
      ? Math.max(...existingTeams.map(t => t.id)) + 1
      : 1;

    // CREAR EQUIPO (SIN ARCHIVOS, SOLO REFERENCIAS)
    const newTeam = {
      id: newId,
      name: teamData.teamName,
      logo: '⚽', // EMOJI TEMPORAL
      owner_email: teamData.email,
      modality: teamData.modality,
      category: teamData.category,
      season: teamData.season,
      paymentProof: teamData.paymentProof?.name || 'payment_proof',
      paymentProofFile: teamData.paymentProof ? 'stored_locally' : null,
      teamLogo: teamData.teamLogo?.name || 'team_logo',
      teamLogoFile: teamData.teamLogo ? 'stored_locally' : null,
      players: Array.isArray(teamData.players) ? teamData.players.map(p => ({
        id: p.id || Date.now() + Math.random(),
        nombre: `${p.firstName} ${p.lastNamePaterno} ${p.lastNameMaterno}`.trim(),
        genero: 'M', // mock default
        edad: p.birthDate ? new Date().getFullYear() - new Date(p.birthDate).getFullYear() : 20,
        estatus: 'pendiente',
        foto: p.firstName?.charAt(0) || '👤'
      })) : [],
      trainers: [],
      status: "Pendiente de validación",
      status_color: "#ffc107",
      created_at: new Date().toISOString().split('T')[0]
    };

    // AGREGAR A LA LISTA
    existingTeams.push(newTeam);
    localStorage.setItem('teams', JSON.stringify(existingTeams));

    console.log('✅ Equipo guardado localmente:', newTeam);

    return {
      ok: true,
      team: newTeam,
      local: true,
      message: 'Equipo guardado localmente (backend no disponible)'
    };
  } catch (error) {
    console.error('❌ Error guardando en localStorage:', error);
    throw error;
  }
};

/**
 * CERTIFICA UN USUARIO
 */
export const certifyUser = async (email) => {
  try {
    const response = await api.put(`/user/certify`, null, {
      params: { email }
    });
    return response.data;
  } catch (error) {
    console.error('Error certificando usuario:', error);
    throw error;
  }
};

/**
 * REGISTRAR JUGADOR TEMPORAL (FormData)
 */
export const registrarJugadorTemporal = async (data) => {
  try {
    const token = localStorage.getItem('token');
    const response = await api.post('/equipo-temporal/registrar-jugador', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error guardando jugador temporal:', error);
    throw error;
  }
};

/**
 * OBTIENE LOS SLOTS DISPONIBLES PARA UN EQUIPO TEMPORAL
 */
export const getAvailableSlots = async (equipoTemporalId) => {
  try {
    const token = localStorage.getItem('token');
    const response = await api.get(`/equipo-temporal/slots`, {
      params: { equipo_temporal_id: equipoTemporalId },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error obteniendo slots:', error);
    throw error;
  }
};

/**
 * OBTIENE LA INFORMACIÓN DEL EQUIPO TEMPORAL DEL USUARIO
 */
export const getEquipoTemporalInfo = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await api.get(`/equipo-temporal/equipos-temporales/`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error obteniendo equipo temporal info:', error);
    throw error;
  }
};

/**
 * OBTIENE LOS EQUIPOS REALES DEL USUARIO (DESDE LA BD)
 */
export const getUserTeamsReal = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await api.get(`/equipo-temporal/user-real-teams`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const raw = response.data;
    const teams = Array.isArray(raw) ? raw : (raw?.teams || []);

    // Algunos endpoints pueden regresar equipos duplicados (por ejemplo, por joins).
    // Normalizamos a una lista única por id para evitar filas repetidas en tablas.
    const seen = new Set();
    const uniqueTeams = [];
    for (const team of teams) {
      const teamId = team?.EquipoId ?? team?.id ?? team?.equipo_id ?? team?.equipoId;
      const key = teamId != null ? String(teamId) : null;

      if (!key) {
        uniqueTeams.push(team);
        continue;
      }

      if (seen.has(key)) continue;
      seen.add(key);
      uniqueTeams.push(team);
    }

    return uniqueTeams;
  } catch (error) {
    console.error('Error obteniendo equipos reales:', error);
    throw error;
  }
};

/**
 * OBTIENE TODOS LOS JUGADORES DE LOS EQUIPOS DEL USUARIO (DESDE LA BD)
 */
export const getUserPlayersReal = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await api.get(`/equipo-temporal/mis-jugadores-reales`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error obteniendo jugadores reales:', error);
    throw error;
  }
};

/**
 * OBTIENE LOS CATÁLOGOS REALES DE LA BD PARA EL REGISTRO
 */
export const getCatalogs = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await api.get(`/equipo-temporal/catalogos-registro`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error obteniendo catálogos:', error);
    throw error;
  }
};

/**
 * OBTIENE EL DIRECTORIO DE PRESIDENTES ACTIVOS (PARA ADMIN)
 */
export const getPresidentesActivos = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await api.get(`/equipo-temporal/directorio-presidentes-activos`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error obteniendo directorio de presidentes:', error);
    throw error;
  }
};

/**
 * CREA UN EQUIPO COMPLETO CON JUGADORES Y DOCUMENTOS (EN LA BD REAL)
 */
export const createTeamCompleto = async (data) => {
  try {
    const token = localStorage.getItem('token');
    const formData = new FormData();

    // Separamos metadatos de archivos
    const teamMetadata = {
      nombre_equipo: data.teamName,
      equipo_temporal_id: data.equipo_temporal_id || data.equipoTemporalId || null,
      liga_id: data.liga_id,
      modalidad_id: data.modalidad_id,
      categoria_id: data.categoria_id,
      rama_id: data.rama_id,
      presidente_id: data.presidente_id
    };

    const playersMetadata = data.players.map((p, index) => ({
      nombre: p.firstName,
      primer_apellido: p.lastNamePaterno,
      segundo_apellido: p.lastNameMaterno,
      curp: p.curp,
      nui: p.nui,
      lugar_nacimiento: p.lugarNacimiento,
      correo: p.email,
      telefono: p.telefono,
      sexo_id: p.sexo_id,
      fecha_nacimiento: p.birthDate,
      seguro_id: p.insuranceType,
      numero_camiseta: p.shirtNumber,
      extranjero: p.esForaneo,
      nacionalidad: p.nacionalidadJugador,
      pais_residencia: p.paisResidencia,
      nacionalidad_padre: p.nacionalidadPadre,
      nacionalidad_madre: p.nacionalidadMadre,
      nac_abuelo_paterno: p.nacAbueloPaterno,
      nac_abuela_paterna: p.nacAbuelaPaterna,
      nac_abuelo_materno: p.nacAbueloMaterno,
      nac_abuela_materna: p.nacAbuelaMaterna,
      registro_asociacion_extranjera: p.registroAsociacionExtranjera,
      juego_club_extranjero: p.juegoClubExtranjero,
      rol_en_equipo: p.positionId
    }));

    formData.append('team_data', JSON.stringify(teamMetadata));
    formData.append('players_data', JSON.stringify(playersMetadata));

    // Adjuntar archivo de logo del equipo si existe
    if (data.teamLogo) {
      formData.append('team_logo', data.teamLogo);
    }

    // Adjuntar archivos de cada jugador
    data.players.forEach((p, index) => {
      if (p.documents.acta) formData.append(`player_${index}_acta`, p.documents.acta);
      if (p.documents.ine) formData.append(`player_${index}_ine`, p.documents.ine);
      if (p.documents.foto) formData.append(`player_${index}_foto`, p.documents.foto);
      if (p.documents.formato) formData.append(`player_${index}_formato`, p.documents.formato);
    });

    const response = await api.post('/equipo-temporal/crear-equipo-completo', formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;

  } catch (error) {
    console.error('Error creando equipo completo:', error);
    throw error;
  }
};

/**
 * FINALIZA LA SOLICITUD COMPLETA (ENVÍA AL ADMIN)
 */
export const finalizarSolicitudCompleta = async (solicitudId) => {
  try {
    const token = localStorage.getItem('token');
    const response = await api.post(`/solicitud/solicitud-completa?solicitud_id=${solicitudId}`, null, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error finalizando solicitud:', error);
    throw error;
  }
};

/**
 * VERIFICA SI UN EQUIPO TIENE SLOTS DISPONIBLES Y REDIRIGE SEGÚN CORRESPONDA
 * Si hay slots → redirige a formulario de jugador
 * Si NO hay slots → redirige a vista de pago para agregar jugador
 * @param {number} equipoId - ID del equipo
 * @param {function} navigate - Función navigate de React Router
 */
export const checkTeamSlots = async (equipoId, navigate) => {
  try {
    const response = await api.get(`/equipo-temporal/hay-slots`, {
      params: { equipo_id: equipoId }
    });
    
    // Si la respuesta indica que hay slots disponibles
    if(response.data.haySlots) {
      // Hay slots disponibles, ir directamente al formulario de jugador
      navigate(`/presidente-equipo/configurar-equipo?equipoId=${equipoId}&agregarJugador=true`);
    } else {
      // No hay slots, redirige a vista de pago para agregar jugador
      navigate(`/presidente-equipo/configurar-equipo?equipoId=${equipoId}&agregarJugador=true&requirePago=true`);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error verificando slots del equipo:', error);
    throw error;
  }
};

export default {
  getUserProfile,
  getUserTeams,
  getUserTeamsReal,
  getUserPlayersReal,
  getTeamDetail,
  createTeam,
  createTeamCompleto,
  getCatalogs,
  certifyUser,
  registrarJugadorTemporal,
  getAvailableSlots,
  getEquipoTemporalInfo,
  getPresidentesActivos,
  finalizarSolicitudCompleta,
  checkTeamSlots
};
