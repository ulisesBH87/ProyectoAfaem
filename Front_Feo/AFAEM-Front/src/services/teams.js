import { API_BASE } from '../config/config';
import axios from 'axios';

const api = axios.create({
  baseURL: API_BASE,
});

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
      players: { current: 0, max: 25 },
      trainers: 0,
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

export default {
  getUserProfile,
  getUserTeams,
  getTeamDetail,
  createTeam,
  certifyUser
};
