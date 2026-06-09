import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  FaArrowLeft,
  FaArrowRight,
  FaSave,
  FaUpload,
  FaFilePdf,
  FaSyncAlt,
  FaCheckCircle,
  FaSearchPlus,
  FaGlobeAmericas,
  FaExclamationTriangle
} from 'react-icons/fa';
import AfaemLogo from '../../assets/afaem-logo@4x.png';
import { PDFDocument } from 'pdf-lib';
import { validarFotografia } from '../../services/foto';
import teamsService from '../../services/teams';
import { API_BASE } from '../../config/config';
import {
  BotonPrimario,
  BotonSecundario,
  Tarjeta,
  EntradaFormulario,
  EntradaSeleccion,
  AreaTexto,
  Cargador,
  Modal
} from '../../components/partials';
import Loader from '../../components/Loader';
import '../../styles/dashboard.css';

const parsearTelefonoE164 = (telefonoCompleto) => {
  if (!telefonoCompleto) return { codigoPais: '+52', telefono: '' };
  const telClean = telefonoCompleto.trim();
  if (telClean.startsWith('+')) {
    if (telClean.length > 10) {
      const local = telClean.slice(-10);
      const codigo = telClean.slice(0, -10);
      return { codigoPais: codigo, telefono: local };
    }
    return { codigoPais: '+52', telefono: telClean.replace(/\D/g, '').slice(0, 10) };
  }
  if (telClean.length === 10 && /^\d+$/.test(telClean)) {
    return { codigoPais: '+52', telefono: telClean };
  }
  if (telClean.length > 10 && /^\d+$/.test(telClean)) {
    const local = telClean.slice(-10);
    const codigo = '+' + telClean.slice(0, -10);
    return { codigoPais: codigo, telefono: local };
  }
  return { codigoPais: '+52', telefono: telClean.replace(/\D/g, '').slice(0, 10) };
};

// Badge Estilizado para los pasos
const StepBadge = ({ number, isActive, isDone }) => (
  <div style={{
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: isDone ? '#10b981' : (isActive ? '#0b4ea6' : '#e2e8f0'),
    color: (isActive || isDone) ? 'white' : '#64748b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '800',
    flexShrink: 0,
    transition: 'all 0.3s'
  }}>
    {isDone ? <FaCheckCircle /> : number}
  </div>
);

export default function RegistroJugadores() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tokenIdentificador, tokenSecreto } = useParams();
  const isPublicFlow = !!(tokenIdentificador && tokenSecreto);
  const [teamId, setTeamId] = useState(location.state?.teamId || null);
  const [invitationTeams, setInvitationTeams] = useState([]);
  const [noPendingTeams, setNoPendingTeams] = useState(false);

  // Límites de fecha para el registro de jugadores
  const today = new Date().toISOString().split('T')[0];
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 100);
  const minDateStr = minDate.toISOString().split('T')[0];

  // ESTILO DINÁMICO PARA HOVER Y DISEÑO RESPONSIVO
  const hoverStyles = `
    .document-card:hover .overlay-actions {
      opacity: 1 !important;
    }
    .document-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }
    label, .form-label {
      text-transform: uppercase !important;
    }
    input[type="text"], textarea {
      text-transform: uppercase;
    }
    .toast-auto-save {
      position: fixed;
      top: 24px;
      right: 24px;
      background: rgba(255, 255, 255, 0.75);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.4);
      padding: 12px 20px;
      border-radius: 12px;
      box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
      z-index: 9999;
      font-family: inherit;
      font-size: 14px;
      font-weight: 700;
      color: #1e293b;
      display: flex;
      align-items: center;
      gap: 8px;
      pointer-events: none;
      opacity: 0;
      transform: translateY(-20px);
      transition: opacity 0.5s ease, transform 0.5s ease;
    }
    .toast-auto-save.show {
      opacity: 1;
      transform: translateY(0);
    }

    /* Clases responsivas */
    .form-grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 25px;
    }
    .form-grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-bottom: 25px;
    }
    .form-grid-2-align-end {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      align-items: end;
    }
    .form-grid-2-foraneo {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }
    .phone-input-row {
      display: flex;
      gap: 8px;
      width: 100%;
      min-width: 0;
    }
    .phone-input-row > * {
      min-width: 0;
    }
    .btn-container-responsive {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-top: 40px;
      --btn-min-width: 200px;
      --btn-width: auto;
    }
    .main-card-responsive {
      padding: 40px;
    }
    .form-wrapper-responsive {
      padding: 30px;
      margin-bottom: 30px;
    }
    
    input, select {
      min-height: 44px;
    }

    @media (max-width: 1024px) {
      .form-grid-3 {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 640px) {
      .form-grid-3, .form-grid-2, .form-grid-2-align-end, .form-grid-2-foraneo {
        grid-template-columns: 1fr;
        gap: 12px;
        margin-bottom: 15px;
      }
      .phone-input-row {
        flex-direction: column;
      }
      .btn-container-responsive {
        flex-direction: column;
        gap: 12px;
        align-items: stretch;
        --btn-min-width: 100%;
        --btn-width: 100%;
      }
      .main-card-responsive {
        padding: 16px;
        border-radius: 16px !important;
      }
      .form-wrapper-responsive {
        padding: 16px;
        border-radius: 12px !important;
        margin-bottom: 20px;
      }
      .premium-card {
        padding: 16px 20px !important;
        border-radius: 16px !important;
      }
      .premium-card h1 {
        font-size: 20px !important;
      }
      .premium-card div:last-child {
        text-align: left !important;
        width: 100%;
      }
    }

    /* Estilos del Wizard (Stepper) */
    .stepper-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 35px;
      position: relative;
      background: #f8fafc;
      padding: 24px;
      border-radius: 20px;
      border: 1px solid #e2e8f0;
      overflow-x: auto;
      gap: 10px;
    }
    .stepper-line {
      position: absolute;
      top: 50%;
      left: 40px;
      right: 40px;
      height: 4px;
      background: #e2e8f0;
      z-index: 1;
      transform: translateY(-50%);
    }
    .stepper-line-progress {
      height: 100%;
      background: linear-gradient(90deg, #0b4ea6, #10b981);
      transition: width 0.4s ease;
    }
    .stepper-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      z-index: 2;
      cursor: pointer;
      flex: 1;
      min-width: 70px;
    }
    .stepper-bubble {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: white;
      border: 3px solid #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      color: #64748b;
      transition: all 0.3s ease;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }
    .stepper-item.active .stepper-bubble {
      border-color: #0b4ea6;
      color: #0b4ea6;
      background: #eff6ff;
      transform: scale(1.1);
      box-shadow: 0 0 12px rgba(11, 78, 166, 0.3);
    }
    .stepper-item.completed .stepper-bubble {
      border-color: #10b981;
      color: white;
      background: #10b981;
    }
    .stepper-label {
      font-size: 11px;
      font-weight: 800;
      margin-top: 8px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      transition: color 0.3s;
      text-align: center;
    }
    .stepper-item.active .stepper-label {
      color: #0b4ea6;
    }
    .stepper-item.completed .stepper-label {
      color: #10b981;
    }
    
    .wizard-step-container {
      animation: fadeIn 0.4s ease;
    }
    
    .field-error-msg {
      color: #ef4444;
      font-size: 11px;
      font-weight: 700;
      margin-top: 4px;
      text-transform: uppercase;
    }
    .input-error {
      border-color: #ef4444 !important;
      background-color: #fef2f2 !important;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
    }
  `;

  // ESTADOS
  const [uploading, setUploading] = useState(false);
  const [slotsInfo, setSlotsInfo] = useState({ disponibles: 0, total: 0 });
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [slotsData, setSlotsData] = useState(null);
  const [jugadores, setJugadores] = useState([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [failedPhoto, setFailedPhoto] = useState(null);
  const [linkError, setLinkError] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [validationErrors, setValidationErrors] = useState({});

  // Estados y refs para autoguardado toast
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimeoutRef = useRef(null);

  // Función de validación por paso
  const validarPasoActual = (step) => {
    const errors = {};
    const player = jugadores[currentPlayerIndex];
    if (!player) return false;
    const datos = player.datos || {};

    if (step === 1) {
      if (!player.seguroId) {
        errors.seguroId = 'Debe seleccionar un seguro para continuar.';
      }
    } else if (step === 3) {
      if (!datos.nombreJugador?.trim()) errors.nombreJugador = 'El nombre es obligatorio.';
      if (!datos.apellidoPaterno?.trim()) errors.apellidoPaterno = 'El apellido paterno es obligatorio.';
      if (!datos.apellidoMaterno?.trim()) errors.apellidoMaterno = 'El apellido materno es obligatorio.';

      if (!datos.curp?.trim()) {
        errors.curp = 'El CURP es obligatorio.';
      } else if (datos.curp.trim().length !== 18) {
        errors.curp = 'El CURP debe tener exactamente 18 caracteres.';
      }

      if (!datos.fechaNacimiento) errors.fechaNacimiento = 'La fecha de nacimiento es obligatoria.';
      if (!datos.lugarNacimiento?.trim()) errors.lugarNacimiento = 'El lugar de nacimiento es obligatorio.';
      if (!datos.genero) errors.genero = 'El sexo es obligatorio.';

      if (!datos.correo?.trim()) {
        errors.correo = 'El correo electrónico es obligatorio.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo.trim())) {
        errors.correo = 'Ingrese un correo electrónico válido.';
      }

      if (!datos.telefono?.trim()) {
        errors.telefono = 'El teléfono es obligatorio.';
      } else if (datos.telefono.trim().length !== 10) {
        errors.telefono = 'El teléfono debe tener 10 dígitos.';
      }
    } else if (step === 4) {
      if (!datos.numCamiseta || String(datos.numCamiseta).trim() === '') errors.numCamiseta = 'El número de camiseta es obligatorio.';
      if (!datos.posicion) errors.posicion = 'La posición en el campo es obligatoria.';
      if (!datos.nui || String(datos.nui).trim() === '') errors.nui = 'El NUI es obligatorio.';
    } else if (step === 5) {
      if (datos.esForaneo) {
        if (!datos.nacionalidadJugador?.trim()) errors.nacionalidadJugador = 'La nacionalidad del jugador es obligatoria.';
        if (!datos.paisResidencia?.trim()) errors.paisResidencia = 'El país de residencia es obligatorio.';
        if (!datos.nacionalidadPadre?.trim()) errors.nacionalidadPadre = 'La nacionalidad del padre es obligatoria.';
        if (!datos.nacionalidadMadre?.trim()) errors.nacionalidadMadre = 'La nacionalidad de la madre es obligatoria.';
        if (!datos.registroAsociacionExtranjera?.trim()) errors.registroAsociacionExtranjera = 'Este campo es obligatorio.';
        if (!datos.nacAbueloPaterno?.trim()) errors.nacAbueloPaterno = 'La nacionalidad es obligatoria.';
        if (!datos.nacAbuelaPaterna?.trim()) errors.nacAbuelaPaterna = 'La nacionalidad es obligatoria.';
        if (!datos.nacAbueloMaterno?.trim()) errors.nacAbueloMaterno = 'La nacionalidad es obligatoria.';
        if (!datos.nacAbuelaMaterna?.trim()) errors.nacAbuelaMaterna = 'La nacionalidad es obligatoria.';
        if (!datos.juegoClubExtranjero?.trim()) errors.juegoClubExtranjero = 'Este campo es obligatorio.';
        if (datos.haVividoExtranjero && !datos.dondeVividoExtranjero?.trim()) {
          errors.dondeVividoExtranjero = 'Especifique en qué país ha vivido.';
        }
      }
    }

    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      Swal.fire({
        title: 'Campos requeridos',
        text: firstError,
        icon: 'warning',
        confirmButtonColor: '#0b4ea6'
      });
      return false;
    }

    return true;
  };

  const triggerToast = () => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastVisible(true);
    toastTimeoutRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 2500); // 2.5s visible, luego 0.5s fade out (total ~3s)
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const [previews, setPreviews] = useState({
    acta: null,
    ine: null,
    ineTutor: null,
    identificacionMenor: null,
    foto: null
  });

  const [catalogs, setCatalogs] = useState({
    ligas: [],
    categorias: [],
    modalidades: [],
    ramas: [],
    seguros: [],
    roles_equipo: [],
    combinaciones: []
  });

  const [showFinishModal, setShowFinishModal] = useState(false);
  const [signedForm, setSignedForm] = useState(null);
  const [previewDoc, setPreviewDoc] = useState({ open: false, url: '', type: '', title: '' });
  const selectedInvitationTeam = invitationTeams.find(
    (team) => String(team.equipo_temporal_id) === String(teamId)
  ) || null;

  const defaultPlayerDatos = {
    nombreJugador: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    curp: '',
    genero: '1', // Default MASCULINO (SexoId = 1)
    fechaNacimiento: '',
    lugarNacimiento: 'MÉXICO',
    correo: '',
    codigoPais: '+52',
    telefono: '',
    posicion: '',
    numCamiseta: '',
    esForaneo: false,
    nacionalidadJugador: 'MEXICANA',
    paisResidencia: 'MÉXICO',
    haVividoExtranjero: false,
    dondeVividoExtranjero: '',
    nacionalidadPadre: 'MEXICANA',
    nacionalidadMadre: 'MEXICANA',
    registroAsociacionExtranjera: 'NO',
    nacAbueloPaterno: 'MEXICANA',
    nacAbuelaPaterna: 'MEXICANA',
    nacAbueloMaterno: 'MEXICANA',
    nacAbuelaMaterna: 'MEXICANA',
    juegoClubExtranjero: 'NO',
    nui: ''
  };

  const emptyPlayer = (index = 0, seguroId = '', slotId = null) => ({
    numero: index + 1,
    slotId,
    estado: 'VACIO',
    datos: { ...defaultPlayerDatos },
    documentos: {
      acta: null,
      ine: null,
      ineTutor: null,
      identificacionMenor: null,
      foto: null
    },
    seguroId,
    fillManually: false,
    completo: false
  });

  const isPlayerMinor = (fechaNacimiento) => {
    if (!fechaNacimiento) return false;
    const hoy = new Date();
    const nac = new Date(fechaNacimiento);
    if (isNaN(nac.getTime())) return false;
    let edad = hoy.getFullYear() - nac.getFullYear();
    const mDiff = hoy.getMonth() - nac.getMonth();
    if (mDiff < 0 || (mDiff === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad < 18;
  };

  const getPlayerStatus = (player) => {
    if (!player) return 'VACIO';
    if (player.completo) return 'INSCRITO';
    const datos = player.datos || {};
    const docs = player.documentos || {};
    const hasRequiredFields = Boolean(
      datos.nombreJugador?.trim() &&
      datos.apellidoPaterno?.trim() &&
      datos.curp?.trim() &&
      datos.fechaNacimiento &&
      datos.lugarNacimiento?.trim() &&
      datos.genero &&
      datos.correo?.trim()
    );
    const hasAnyData = Object.values(datos).some(value => typeof value === 'string' ? value.trim() !== '' : Boolean(value)) || Object.values(docs).some(Boolean);
    if (hasRequiredFields) return 'LISTO'; // Note: documents are optional for president flow
    if (hasAnyData) return 'EN_CAPTURA';
    return 'VACIO';
  };

  const normalizePlayer = (player) => ({
    ...player,
    estado: getPlayerStatus(player)
  });

  const updatePlayer = (index, partial) => {
    setJugadores(prev => {
      const next = [...prev];
      next[index] = normalizePlayer({ ...next[index], ...partial });
      return next;
    });
  };

  const updatePlayerDatos = (index, datosPartial) => {
    setJugadores(prev => {
      const next = [...prev];
      next[index] = normalizePlayer({
        ...next[index],
        datos: {
          ...next[index].datos,
          ...datosPartial
        }
      });
      return next;
    });
  };

  const updatePlayerDocuments = (index, documentosPartial) => {
    setJugadores(prev => {
      const next = [...prev];
      next[index] = normalizePlayer({
        ...next[index],
        documentos: {
          ...next[index].documentos,
          ...documentosPartial
        }
      });
      return next;
    });
  };

  const updatePlayerSeguro = (index, seguroId) => {
    setJugadores(prev => {
      const next = [...prev];
      next[index] = normalizePlayer({
        ...next[index],
        seguroId
      });
      return next;
    });
  };

  const currentPlayer = jugadores[currentPlayerIndex] || emptyPlayer(currentPlayerIndex);
  const currentDatos = currentPlayer.datos || { ...defaultPlayerDatos };
  const currentDocuments = currentPlayer.documentos || {};
  const currentSeguroId = currentPlayer.seguroId || '';

  const esMenorDeEdad = React.useMemo(() => {
    return isPlayerMinor(currentDatos.fechaNacimiento);
  }, [currentDatos.fechaNacimiento]);

  // Documentos requeridos según minoría de edad
  const documentCards = [
    { key: 'acta', title: 'Acta de Nacimiento', subtitle: 'Requerido para validación y auto-llenado (Opcional)' },
    ...(esMenorDeEdad
      ? [
        { key: 'ineTutor', title: 'INE de Padre o Tutor', subtitle: 'Identificación oficial del tutor (Opcional)' },
        { key: 'identificacionMenor', title: 'Identificación de Menor', subtitle: 'Credencial escolar o certificado (Opcional)' }
      ]
      : [
        { key: 'ine', title: 'Identificación Oficial (INE)', subtitle: 'INE, Pasaporte o Cédula (Opcional)' }
      ]),
    { key: 'foto', title: 'Fotografía del Jugador', subtitle: 'Fotografía infantil formal (Opcional)' }
  ];

  // Guardar Borrador en la Base de Datos
  const guardarBorradorEnBD = async (slotId, newData) => {
    if (!slotId) return;
    try {
      const response = await fetch(`${API_BASE}/equipo-temporal/borrador-jugador`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          slot_id: slotId,
          datos: newData
        })
      });
      if (response.ok) {
        triggerToast();
      }
    } catch (err) {
      console.warn('No se pudo guardar el borrador en la BD:', err);
    }
  };

  const handleFieldChange = (field, value) => {
    let formattedValue = value;
    if (field === 'telefono') {
      formattedValue = value.replace(/\D/g, '').slice(0, 10);
    }
    updatePlayerDatos(currentPlayerIndex, { [field]: formattedValue });
  };

  const handleBlur = () => {
    const player = jugadores[currentPlayerIndex];
    if (player) {
      const datos = { ...player.datos };
      const fieldsToUppercase = [
        'nombreJugador', 'apellidoPaterno', 'apellidoMaterno', 'lugarNacimiento', 'curp', 'nui',
        'nacionalidadJugador', 'paisResidencia', 'dondeVividoExtranjero',
        'nacionalidadPadre', 'nacionalidadMadre', 'registroAsociacionExtranjera',
        'nacAbueloPaterno', 'nacAbuelaPaterna', 'nacAbueloMaterno', 'nacAbuelaMaterna',
        'juegoClubExtranjero'
      ];
      fieldsToUppercase.forEach(field => {
        if (datos[field]) {
          datos[field] = datos[field].toString().toUpperCase();
        }
      });
      if (datos.correo) {
        datos.correo = datos.correo.toString().toLowerCase();
      }

      updatePlayerDatos(currentPlayerIndex, datos);

      if (player.slotId) {
        guardarBorradorEnBD(player.slotId, datos);
      }
    }
  };

  // EFECTO 1: CARGAR INVITACIÓN (Solo corre al inicio si es flujo público)
  useEffect(() => {
    const fetchInvitation = async () => {
      if (!isPublicFlow) return;

      if (!tokenIdentificador || !tokenSecreto) {
        setLinkError(true);
        return;
      }

      try {
        setLoadingSlots(true);
        const inviteData = await teamsService.getInvitationInfo(tokenIdentificador, tokenSecreto);
        const equiposPendientes = Array.isArray(inviteData?.equipos_temporales) ? inviteData.equipos_temporales : [];
        setInvitationTeams(equiposPendientes);

        if (equiposPendientes.length === 0) {
          setNoPendingTeams(true);
          setJugadores([]);
          setSlotsData(null);
        } else if (!teamId) {
          if (equiposPendientes.length === 1) {
            setTeamId(equiposPendientes[0].equipo_temporal_id);
          } else {
            setTeamId(null);
            setLoadingSlots(false);
          }
        }
      } catch (err) {
        console.error('Error al obtener info de la invitación:', err);
        setLinkError(true);
      } finally {
        if (!teamId) setLoadingSlots(false);
      }
    };

    fetchInvitation();
  }, [isPublicFlow, tokenIdentificador, tokenSecreto]);

  // CARGAR SLOTS Y DATOS DEL EQUIPO (Callback reutilizable)
  const fetchTeamInfo = React.useCallback(async () => {
    const effectiveTeamId = teamId || location.state?.teamId;

    // Esperar a tener un teamId si estamos en flujo público y no ha habido error ni está vacío
    if (!effectiveTeamId) {
      if (isPublicFlow && !linkError && !noPendingTeams) {
        setLoadingSlots(false);
        return;
      }
      if (!isPublicFlow) {
        Swal.fire('Error', 'No se especificó un equipo para el registro.', 'error');
        navigate('/presidente-equipo/dashboard');
      } else {
        setLinkError(true);
      }
      return;
    }

    try {
      setLoadingSlots(true);

      // 1. Obtener catálogos
      const catalogsData = await teamsService.getCatalogs();
      setCatalogs(catalogsData);

      let inviteTeamInfo = {};
      if (selectedInvitationTeam) {
        inviteTeamInfo = {
          equipo: selectedInvitationTeam.nombre_equipo || '',
          liga: selectedInvitationTeam.nombre_liga || '',
          categoria: selectedInvitationTeam.nombre_categoria || 'LIBRE',
          presidente: selectedInvitationTeam.nombre_presidente || 'No disponible'
        };
      }

      // 2. Obtener slots y borradores
      const slotsResponse = await teamsService.getAvailableSlots(
        effectiveTeamId,
        isPublicFlow ? { tokenIdentificador, tokenSecreto } : null
      );
      setSlotsData(slotsResponse);

      const paidPlayers = parseInt(slotsResponse.cantidad_jugadores_pagados ?? slotsResponse.total_slots ?? 1, 10) || 1;
      setSlotsInfo({
        disponibles: slotsResponse.jugadores_restantes ?? slotsResponse.slots_disponibles ?? 0,
        total: paidPlayers
      });

      const firstSeguroId = String(slotsResponse.seguros?.[0]?.seguro_id || '');

      // Mapear los slots de la base de datos al estado jugadores
      const mappedJugadores = (slotsResponse.slots || []).map((slot, i) => {
        const datos = slot.datos_borrador || { ...defaultPlayerDatos };
        const parsedTel = parsearTelefonoE164(datos.telefono || '');
        const mergedDatos = {
          ...defaultPlayerDatos,
          ...datos,
          codigoPais: datos.codigoPais !== undefined ? datos.codigoPais : parsedTel.codigoPais,
          telefono: datos.codigoPais !== undefined ? datos.telefono : parsedTel.telefono,
          equipo: datos.equipo || inviteTeamInfo.equipo || slotsResponse.nombre_equipo || '',
          liga: datos.liga || inviteTeamInfo.liga || slotsResponse.nombre_liga || '',
          categoria: datos.categoria || inviteTeamInfo.categoria || slotsResponse.nombre_categoria || 'LIBRE',
          presidente: slotsResponse.nombre_presidente || inviteTeamInfo.presidente || 'No disponible'
        };

        return {
          numero: i + 1,
          slotId: slot.slot_id,
          estado: slot.completo ? 'INSCRITO' : (slot.datos_borrador ? 'EN_CAPTURA' : 'VACIO'),
          datos: mergedDatos,
          documentos: {
            acta: null,
            ine: null,
            ineTutor: null,
            identificacionMenor: null,
            foto: null
          },
          seguroId: String(slot.seguro_id || firstSeguroId),
          fillManually: !!slot.datos_borrador,
          completo: slot.completo
        };
      });

      setJugadores(mappedJugadores);

    } catch (err) {
      console.error('Error al obtener info del equipo:', err);
      if (isPublicFlow || !location.state?.teamId) {
        setLinkError(true);
      } else {
        Swal.fire('Error', err.response?.data?.detail || 'No se pudo cargar la información del equipo y espacios disponibles.', 'error');
      }
    } finally {
      setLoadingSlots(false);
    }
  }, [teamId, isPublicFlow, location.state?.teamId, tokenIdentificador, tokenSecreto, selectedInvitationTeam, linkError, noPendingTeams, navigate]);

  // EFECTO 2: CARGAR SLOTS Y DATOS DEL EQUIPO (Corre cuando cambia teamId o la info de invitación)
  useEffect(() => {
    fetchTeamInfo();
  }, [fetchTeamInfo]);

  // Manejar cambio de previsualización al cambiar de jugador
  useEffect(() => {
    // Revocar URLs viejas
    Object.values(previews).forEach(url => {
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });

    setPreviews({
      acta: null,
      ine: null,
      ineTutor: null,
      identificacionMenor: null,
      foto: null
    });

    setCurrentStep(1);
    setValidationErrors({});

    if (currentDocuments) {
      Object.keys(currentDocuments).forEach(key => {
        const file = currentDocuments[key];
        if (file) {
          if (file.type?.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
              setPreviews(prev => ({ ...prev, [key]: reader.result }));
            };
            reader.readAsDataURL(file);
          } else if (file.type === 'application/pdf') {
            const url = URL.createObjectURL(file);
            setPreviews(prev => ({ ...prev, [key]: url }));
          }
        }
      });
    }
  }, [currentPlayerIndex]);

  const playerStatusConfig = {
    VACIO: { icon: '⚪', label: 'VACÍO', bg: '#f8fafc', color: '#475569' },
    EN_CAPTURA: { icon: '🟡', label: 'EN CAPTURA', bg: '#fffbeb', color: '#92400e' },
    LISTO: { icon: '🔵', label: 'LISTO PARA REGISTRAR', bg: '#eff6ff', color: '#1e40af' },
    INSCRITO: { icon: '🟢', label: 'INSCRITO', bg: '#dcfce7', color: '#166534' }
  };

  // PROCESAR SUBIDA DE DOCUMENTOS Y OCR
  const handleFileUpload = async (documentKey, file) => {
    if (!file) return;

    updatePlayerDocuments(currentPlayerIndex, { [documentKey]: file });

    // Generar Previsualización
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => ({ ...prev, [documentKey]: reader.result }));
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      const url = URL.createObjectURL(file);
      setPreviews(prev => ({ ...prev, [documentKey]: url }));
    }

    // VALIDACIÓN DE FOTOGRAFÍA
    if (documentKey === 'foto') {
      Swal.fire({
        title: 'Validando Fotografía...',
        html: 'Verificando formato y calidad.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });
      try {
        const data = await validarFotografia(file);
        if (data.valido) {
          const imageUrl = `data:${data.tipo_imagen};base64,${data.imagen}`;
          const byteCharacters = atob(data.imagen);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const newFile = new File([byteArray], "foto_validada.jpg", {
            type: data.tipo_imagen
          });

          updatePlayerDocuments(currentPlayerIndex, { foto: newFile });
          setPreviews(prev => ({ ...prev, foto: imageUrl }));
          setFailedPhoto(null);

          Swal.fire({ title: '¡Fotografía Aceptada!', icon: 'success', timer: 1500, showConfirmButton: false });
        } else {
          setFailedPhoto(file);
          setPreviews(prev => ({ ...prev, foto: null }));
          updatePlayerDocuments(currentPlayerIndex, { foto: null });

          Swal.fire({
            title: 'Error en la fotografía',
            text: `${data.mensaje || 'La foto no cumple con los requisitos.'} ¿Deseas cargarla de todos modos?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, cargar igualmente',
            cancelButtonText: 'No, intentar de nuevo',
            confirmButtonColor: '#0b4ea6',
            cancelButtonColor: '#cbd5e1'
          }).then((result) => {
            if (result.isConfirmed) {
              const reader = new FileReader();
              reader.onloadend = () => {
                setPreviews(prev => ({ ...prev, foto: reader.result }));
              };
              reader.readAsDataURL(file);
              updatePlayerDocuments(currentPlayerIndex, { foto: file });
              setFailedPhoto(null);

              Swal.fire({
                title: 'Cargada',
                text: 'Se ha cargado la fotografía original.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
              });
            }
          });
        }
      } catch (err) {
        Swal.fire('Error de validación', err.message || 'No se pudo procesar la foto.', 'error');
      }
    }

    // PROCESAR OCR PARA ACTA O IDENTIFICACIÓN
    if (documentKey === 'acta' || documentKey === 'ine' || documentKey === 'ineTutor') {
      Swal.fire({
        title: 'Analizando Documento...',
        html: 'Extrayendo información vía OCR. Por favor espere.',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => { Swal.showLoading(); }
      });

      try {
        const formDataOcr = new FormData();
        formDataOcr.append('file_id', file);

        const response = await fetch('/ocr-api', { method: 'POST', body: formDataOcr });
        if (!response.ok) throw new Error('Error al conectar con el servidor OCR');

        const htmlText = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");

        let nombreEncontrado = '';
        let curpEncontrada = '';
        let fechaNacEncontrada = '';
        let lugarNacEncontrado = '';

        const rows = doc.querySelectorAll('.dato-fila');
        rows.forEach(row => {
          const label = row.querySelector('.etiqueta')?.textContent?.toLowerCase() || '';
          const value = row.querySelector('.valor')?.textContent?.trim() || '';

          if (label.includes('nombre')) nombreEncontrado = value;
          if (label.includes('curp')) curpEncontrada = value;
          if (label.includes('lugar de nacimiento') || label.includes('entidad')) lugarNacEncontrado = value;
          if (label.includes('nacimiento') || label.includes('fecha nac')) {
            let finalDate = value;
            if (value.includes('/')) {
              const p = value.split('/');
              if (p.length === 3) {
                if (p[2].length === 4) finalDate = `${p[2]}-${p[1]}-${p[0]}`;
                else if (p[0].length === 4) finalDate = `${p[0]}-${p[1]}-${p[2]}`;
              }
            }
            fechaNacEncontrada = finalDate;
          }
        });

        if (nombreEncontrado || curpEncontrada || fechaNacEncontrada) {
          const parts = nombreEncontrado ? nombreEncontrado.split(' ') : [];
          let firstName = '', lastNamePaterno = '', lastNameMaterno = '';

          if (parts.length >= 3) {
            lastNamePaterno = parts[0];
            lastNameMaterno = parts[1];
            firstName = parts.slice(2).join(' ');
          } else if (parts.length === 2) {
            lastNamePaterno = parts[0];
            firstName = parts[1];
          } else {
            firstName = nombreEncontrado;
          }

          // Auto-detectar género por CURP
          let detectedGenero = currentDatos.genero;
          if (curpEncontrada && curpEncontrada.length >= 11) {
            const char = curpEncontrada.charAt(10);
            if (char === 'M') detectedGenero = '2'; // Femenino
            else if (char === 'H') detectedGenero = '1'; // Masculino
          }

          const ocrResult = {
            nombreJugador: firstName || '',
            apellidoPaterno: lastNamePaterno || '',
            apellidoMaterno: lastNameMaterno || '',
            curp: curpEncontrada || '',
            fechaNacimiento: fechaNacEncontrada || '',
            lugarNacimiento: lugarNacEncontrado || 'MÉXICO',
            genero: detectedGenero
          };

          const merged = { ...currentDatos, ...ocrResult };
          updatePlayerDatos(currentPlayerIndex, ocrResult);

          if (currentPlayer?.slotId) {
            guardarBorradorEnBD(currentPlayer.slotId, merged);
          }

          Swal.fire({
            title: '¡Lectura Exitosa!',
            text: `Se detectó a: ${nombreEncontrado || 'el documento'}`,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
        } else {
          throw new Error('No se detectaron datos legibles en este documento.');
        }
      } catch (err) {
        console.error("Error OCR:", err);
        Swal.fire('Aviso', 'No se pudo extraer la información automáticamente. Por favor ingrésala de forma manual.', 'info');
      }
    }
  };

  const forceLoadFailedPhoto = () => {
    if (!failedPhoto) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviews(prev => ({ ...prev, foto: reader.result }));
    };
    reader.readAsDataURL(failedPhoto);

    updatePlayerDocuments(currentPlayerIndex, { foto: failedPhoto });
    setFailedPhoto(null);

    Swal.fire({
      title: 'Fotografía Cargada',
      text: 'La fotografía se cargó sin validación.',
      icon: 'success',
      timer: 1500,
      showConfirmButton: false
    });
  };

  // AUXILIAR PARA ESCRITURA EN PDF
  const safeSetField = (form, fieldName, value, fontSize) => {
    if (!value) return;
    try {
      const field = form.getTextField(fieldName);
      if (field) {
        field.setText(value.toString().toUpperCase());
        if (fontSize) field.setFontSize(fontSize);
      }
    } catch (e) {
      console.warn(`Campo PDF no encontrado: ${fieldName}`);
    }
  };

  // GENERAR PDF PRE-LLENADO
  const handleDownloadFormato = async () => {
    try {
      Swal.fire({
        title: 'Generando PDF...',
        text: 'Preparando el formato de afiliación pre-llenado.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });

      const templateUrl = '/formato_afiliacion_jugador.pdf';
      const existingPdfBytes = await fetch(templateUrl).then(res => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const form = pdfDoc.getForm();
      const firstPage = pdfDoc.getPages()[0];

      // Incrustar fotografía si existe
      if (currentDocuments.foto) {
        try {
          const photoBytes = await currentDocuments.foto.arrayBuffer();
          let photoImage;
          const nameLower = currentDocuments.foto.name.toLowerCase();
          if (nameLower.endsWith('.png')) photoImage = await pdfDoc.embedPng(photoBytes);
          else photoImage = await pdfDoc.embedJpg(photoBytes);

          firstPage.drawImage(photoImage, {
            x: 479, y: 676, width: 76, height: 90,
          });
        } catch (photoErr) {
          console.warn("Error al incrustar foto en PDF:", photoErr);
        }
      }

      // Rellenar campos básicos
      safeSetField(form, 'Nombres', currentDatos.nombreJugador);
      safeSetField(form, 'Apellido Paterno', currentDatos.apellidoPaterno);
      safeSetField(form, 'Apellido Materno', currentDatos.apellidoMaterno);
      safeSetField(form, 'CURP o Clave Única de Registro de Población', currentDatos.curp);
      safeSetField(form, 'Fecha de Nacimiento', currentDatos.fechaNacimiento);
      safeSetField(form, 'Sexo', currentDatos.genero === '1' ? 'MASCULINO' : 'FEMENINO');
      safeSetField(form, 'Lugar de Nacimiento', currentDatos.lugarNacimiento);

      // Datos de afiliado
      const correoCJE = currentDatos.correo || '';
      const correoCJEFs = correoCJE.length > 35 ? 6 : correoCJE.length > 25 ? 7 : correoCJE.length > 18 ? 8 : 10;
      safeSetField(form, 'Correo electrónico', correoCJE, correoCJEFs);
      safeSetField(form, 'Teléfono', (currentDatos.codigoPais || '+52') + (currentDatos.telefono || ''));
      safeSetField(form, 'Asociación', 'AFAEM');

      // Tipo de Afiliación (Tipo y fill_20) → nombre del seguro seleccionado
      const seguroSel = catalogs?.seguros?.find(s => String(s.id) === String(currentSeguroId));
      if (seguroSel?.nombre) {
        try { form.getTextField('Tipo')?.setText(seguroSel.nombre.toUpperCase()); } catch (_) { }
        try { form.getTextField('fill_24')?.setText(seguroSel.nombre.toUpperCase()); } catch (_) { }
      }

      safeSetField(form, 'Liga', (currentDatos.liga || '').split('(')[0].trim());
      safeSetField(form, 'Equipo', currentDatos.equipo || '');
      safeSetField(form, 'Categoría', currentDatos.categoria || '');

      // Traducir el ID de posición a su nombre en texto
      const posObj = catalogs?.roles_equipo?.find(r => String(r.id) === String(currentDatos.posicion));
      safeSetField(form, 'Posición', posObj ? posObj.nombre : 'JUGADOR');
      safeSetField(form, 'Camiseta', currentDatos.numCamiseta);

      // Antecedentes internacionales si es foráneo
      if (currentDatos.esForaneo) {
        safeSetField(form, 'Nacionalidades del jugador', currentDatos.nacionalidadJugador);
        safeSetField(form, 'País de residencia actual', currentDatos.paisResidencia);
        safeSetField(form, 'El jugador ha vivido en el extranjero En que país', currentDatos.haVividoExtranjero ? currentDatos.dondeVividoExtranjero : 'NO');
        safeSetField(form, 'Nacionalidades del padre', currentDatos.nacionalidadPadre);
        safeSetField(form, 'Nacionalidades de la madre', currentDatos.nacionalidadMadre);
        safeSetField(form, 'Nacionalidades del abuelo paterno', currentDatos.nacAbueloPaterno);
        safeSetField(form, 'Nacionalidades de la abuela paterna', currentDatos.nacAbuelaPaterna);
        safeSetField(form, 'Nacionalidades del abuelo materno', currentDatos.nacAbueloMaterno);
        safeSetField(form, 'Nacionalidades de la abuela materna', currentDatos.nacAbuelaMaterna);
        safeSetField(form, 'El jugador ha sido registrado por la Asociación Nacional de Fútbol', currentDatos.registroAsociacionExtranjera);
        safeSetField(form, 'El jugador ha jugado en un Club extranjero y participado en', currentDatos.juegoClubExtranjero);
      } else {
        // Jugador mexicano: rellenar todos los campos con valores nacionales por defecto
        safeSetField(form, 'Nacionalidades del jugador', 'MEXICANA');
        safeSetField(form, 'País de residencia actual', 'MÉXICO');
        safeSetField(form, 'El jugador ha vivido en el extranjero En que país', 'NO');
        safeSetField(form, 'Nacionalidades del padre', 'MEXICANA');
        safeSetField(form, 'Nacionalidades de la madre', 'MEXICANA');
        safeSetField(form, 'Nacionalidades del abuelo paterno', 'MEXICANA');
        safeSetField(form, 'Nacionalidades de la abuela paterna', 'MEXICANA');
        safeSetField(form, 'Nacionalidades del abuelo materno', 'MEXICANA');
        safeSetField(form, 'Nacionalidades de la abuela materna', 'MEXICANA');
        safeSetField(form, 'El jugador ha sido registrado por la Asociación Nacional de Fútbol', 'NO');
        safeSetField(form, 'El jugador ha jugado en un Club extranjero y participado en', 'NO');
      }

      // Fecha de descarga
      const hoy = new Date();
      const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
      const dia = String(hoy.getDate()).padStart(2, '0');
      const mes = meses[hoy.getMonth()];
      const anio = String(hoy.getFullYear()).slice(-2);

      safeSetField(form, 'A', dia);
      safeSetField(form, 'de', mes);
      safeSetField(form, 'del 20', anio);

      const fechaCompleta = `${dia} DE ${mes} DE 20${anio}`;
      safeSetField(form, 'Fecha de descarga', fechaCompleta);
      safeSetField(form, 'Fecha descarga', fechaCompleta);
      safeSetField(form, 'Fecha', fechaCompleta);

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `Formato_Afiliacion_${currentDatos.nombreJugador || 'Jugador'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      Swal.close();
      return true;
    } catch (err) {
      console.error("Error al generar PDF:", err);
      Swal.fire('Error', 'No se pudo generar el PDF prellenado: ' + err.message, 'error');
      return false;
    }
  };

  // VALIDACIÓN FINAL Y ENVÍO DE DATOS
  const handleInscribirClick = () => {
    // Validar paso por paso del 1 al 5 (omitiendo el paso 2 de documentos que es opcional)
    for (let s = 1; s <= 5; s++) {
      if (s === 2) continue;
      if (!validarPasoActual(s)) {
        setCurrentStep(s);
        return;
      }
    }
    // Si todo es válido, proceder con la inscripción final
    handleFinalizarInscripcion();
  };

  // ENVÍO FINAL A BACKEND
  const handleFinalizarInscripcion = async () => {
    setUploading(true);
    Swal.fire({
      title: 'Registrando Jugador',
      text: 'Consumiendo espacio y subiendo documentos al servidor...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const player = jugadores[currentPlayerIndex];
      const formData = new FormData();
      formData.append('equipo_temporal_id', parseInt(teamId, 10));
      if (isPublicFlow) {
        formData.append('token_identificador', tokenIdentificador);
        formData.append('token_secreto', tokenSecreto);
      }
      formData.append('nombre', (player.datos.nombreJugador || '').toString().trim());
      formData.append('primer_apellido', (player.datos.apellidoPaterno || '').toString().trim());
      formData.append('segundo_apellido', (player.datos.apellidoMaterno || '').toString().trim());
      formData.append('CURP', (player.datos.curp || '').toString().toUpperCase());
      formData.append('sexo_id', parseInt(player.datos.genero, 10));
      formData.append('fecha_nacimiento', player.datos.fechaNacimiento);
      formData.append('lugar_nacimiento', player.datos.lugarNacimiento || 'MÉXICO');
      formData.append('correo', player.datos.correo || '');
      formData.append('telefono', player.datos.telefono ? ((player.datos.codigoPais || '+52') + player.datos.telefono) : '');
      formData.append('posicion', player.datos.posicion || '3');
      formData.append('num_camiseta', player.datos.numCamiseta || '0');
      formData.append('seguro_id', parseInt(player.seguroId, 10));
      formData.append('nui', player.datos.nui || '');

      if (player.slotId) {
        formData.append('slot_id', parseInt(player.slotId, 10));
      }

      if (player.datos.esForaneo) {
        formData.append('es_foraneo', '1');
        formData.append('nacionalidad_jugador', player.datos.nacionalidadJugador);
        formData.append('pais_resid_actual', player.datos.paisResidencia);
        formData.append('nacionalidad_padre', player.datos.nacionalidadPadre);
        formData.append('nacionalidad_madre', player.datos.nacionalidadMadre);
        formData.append('nac_abuelo_paterno', player.datos.nacAbueloPaterno);
        formData.append('nac_abuela_paterna', player.datos.nacAbuelaPaterna);
        formData.append('nac_abuelo_materno', player.datos.nacAbueloMaterno);
        formData.append('nac_abuela_materna', player.datos.nacAbuelaMaterna);
        formData.append('registro_asociacion_extranjera', player.datos.registroAsociacionExtranjera);
        formData.append('juego_club_extranjero', player.datos.juegoClubExtranjero);
        formData.append('ha_vivido_extranjero', player.datos.haVividoExtranjero ? '1' : '0');
        formData.append('donde_vivido', player.datos.dondeVividoExtranjero || '');
      }

      // Archivos (Todos opcionales para el presidente de equipo)
      const docIds = [];
      const files = [];

      if (player.documentos.acta) { docIds.push(22); files.push(player.documentos.acta); }
      if (isPlayerMinor(player.datos.fechaNacimiento)) {
        if (player.documentos.ineTutor) { docIds.push(33); files.push(player.documentos.ineTutor); }
        if (player.documentos.identificacionMenor) { docIds.push(36); files.push(player.documentos.identificacionMenor); }
      } else {
        if (player.documentos.ine) { docIds.push(26); files.push(player.documentos.ine); }
      }
      if (player.documentos.foto) { docIds.push(25); files.push(player.documentos.foto); }
      if (signedForm) { docIds.push(28); files.push(signedForm); }

      docIds.forEach(id => formData.append('documento_afiliacion_ids', id));
      files.forEach(file => formData.append('archivos', file));

      await teamsService.registrarJugadorTemporal(formData);

      setShowFinishModal(false);
      Swal.fire({
        icon: 'success',
        title: 'Jugador Inscrito Correctamente',
        text: 'El espacio se ha completado y los documentos se guardaron en el servidor.'
      }).then(() => {
        setSignedForm(null);
        fetchTeamInfo();
      });
    } catch (err) {
      console.error("Error al registrar jugador:", err);
      Swal.fire('Error', err.response?.data?.detail || err.message || 'Error interno del servidor', 'error');
    } finally {
      setUploading(false);
    }
  };

  if (linkError) {
    return (
      <div
        className="fade-in-up"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
          padding: '20px',
        }}
      >
        <div
          className="card shadow"
          style={{
            padding: '56px 48px',
            borderRadius: '28px',
            textAlign: 'center',
            maxWidth: '520px',
            width: '100%',
            backgroundColor: '#ffffff',
            border: '1px solid #f1f5f9'
          }}
        >
          {/* Logo */}
          <div style={{
            width: '96px',
            height: '96px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.15), 0 4px 6px -2px rgba(15, 23, 42, 0.1)',
            border: '2px solid rgba(255, 255, 255, 0.05)'
          }}>
            <img
              src={AfaemLogo}
              alt="AFAEM"
              style={{
                width: '60px',
                height: 'auto',
                opacity: 0.95,
              }}
            />
          </div>

          {/* Ícono de Error 
          <div
            style={{
              width: '88px',
              height: '88px',
              borderRadius: '28px',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
              margin: '0 auto 28px',
              border: '2px solid rgba(239, 68, 68, 0.2)',
            }}
          >
            <FaExclamationTriangle />
          </div>
          */}

          {/* Badge */}
          <span
            style={{
              display: 'inline-block',
              padding: '6px 18px',
              background: 'rgba(239, 68, 68, 0.08)',
              color: '#ef4444',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '800',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: '20px',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}
          >
            Error de Acceso
          </span>

          <h1
            style={{
              fontSize: '28px',
              fontWeight: '800',
              color: '#1e293b',
              margin: '0 0 12px',
              letterSpacing: '-0.5px',
            }}
          >
            Enlace no válido o expirado
          </h1>

          <p
            style={{
              color: '#64748b',
              fontSize: '15px',
              lineHeight: '1.7',
              marginBottom: '36px',
              maxWidth: '380px',
              margin: '0 auto 36px',
            }}
          >
            El enlace que intentas utilizar ya no es válido, ha expirado o no existe.
          </p>

          <button
            onClick={() => navigate('/ingresar')}
            style={{
              padding: '14px 36px',
              fontSize: '15px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              cursor: 'pointer',
              borderRadius: '14px',
              border: 'none',
              backgroundColor: '#0b4ea6',
              color: '#ffffff',
              fontWeight: 'bold',
              width: '100%'
            }}
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  if (loadingSlots) {
    return (
      <div className="dashboard-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Loader text="Cargando información del equipo y espacios disponibles..." />
      </div>
    );
  }

  if (noPendingTeams) {
    return (
      <div className="dashboard-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh', padding: '24px' }}>
        <div style={{ background: '#fff', padding: '40px 32px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(15, 23, 42, 0.08)', border: '1px solid #e2e8f0', maxWidth: '520px', width: '100%', textAlign: 'center' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', marginBottom: '16px' }}>
            No hay equipos pendientes
          </h1>
          <p style={{ color: '#64748b', fontSize: '15px', lineHeight: '1.7', margin: 0 }}>
            Esta invitación es válida, pero por ahora no existen equipos con espacios disponibles para registrar jugadores.
          </p>
        </div>
      </div>
    );
  }

  const sinSlots = slotsInfo.disponibles === 0;

  // Si estamos en flujo público, no hay equipo seleccionado y hay múltiples equipos en la invitación,
  // mostrar la pantalla de selección de equipos.
  if (isPublicFlow && !teamId && invitationTeams.length > 1) {
    return (
      <div className="dashboard-content" style={{ padding: '30px 20px', minHeight: '80vh' }}>
        <style>{hoverStyles}</style>

        {/* HEADER SELECTOR */}
        <div style={{ marginBottom: '40px', textAlign: 'center' }}>
          <div style={{
            width: '96px',
            height: '96px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.15), 0 4px 6px -2px rgba(15, 23, 42, 0.1)',
            border: '2px solid rgba(255, 255, 255, 0.05)'
          }}>
            <img
              src={AfaemLogo}
              alt="AFAEM"
              style={{
                width: '60px',
                height: 'auto',
                opacity: 0.95,
              }}
            />
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#1e293b', margin: 0, letterSpacing: '-0.5px' }}>
            Selección de Equipo
          </h2>
          <p style={{ margin: '10px 0 0 0', fontSize: '15px', color: '#64748b', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto', lineHeight: '1.6' }}>
            Bienvenido {invitationTeams[0]?.nombre_presidente ? <strong>{invitationTeams[0].nombre_presidente} </strong> : ''}al portal de registro de jugadores de la AFAEM. A continuación, selecciona el equipo del cual deseas capturar los registros. Puedes regresar a esta pantalla en cualquier momento.
          </p>
          {invitationTeams[0]?.nombre_presidente && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 22px',
              background: '#f8fafc',
              borderRadius: '24px',
              border: '1px solid #e2e8f0',
              marginTop: '20px',
              fontSize: '14px',
              fontWeight: '700',
              color: '#334155',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <span>👤 PRESIDENTE:</span>
              <span style={{ color: '#0b4ea6', textTransform: 'uppercase' }}>{invitationTeams[0].nombre_presidente}</span>
            </div>
          )}
        </div>

        {/* CONTENEDOR DE TARJETAS DE EQUIPOS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '28px',
          maxWidth: '1040px',
          margin: '0 auto 40px auto',
        }}>
          {invitationTeams.map((team) => {
            const total = team.total_slots || 0;
            const libres = team.slots_disponibles || 0;
            const registrados = Math.max(0, total - libres);
            const porcentaje = total > 0 ? (registrados / total) * 100 : 0;
            const estaCompletado = libres === 0;

            return (
              <div
                key={team.equipo_temporal_id}
                onClick={() => {
                  setCurrentPlayerIndex(0);
                  setTeamId(team.equipo_temporal_id);
                }}
                style={{
                  background: 'white',
                  borderRadius: '24px',
                  border: estaCompletado ? '2px solid #10b981' : '1px solid #e2e8f0',
                  padding: '32px 28px',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.06), 0 10px 10px -5px rgba(0,0,0,0.04)';
                  e.currentTarget.style.borderColor = estaCompletado ? '#10b981' : '#0b4ea6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01)';
                  e.currentTarget.style.borderColor = estaCompletado ? '#10b981' : '#e2e8f0';
                }}
              >
                {estaCompletado && (
                  <div style={{
                    position: 'absolute',
                    top: '0',
                    right: '0',
                    background: '#10b981',
                    color: 'white',
                    padding: '6px 16px',
                    fontSize: '11px',
                    fontWeight: '800',
                    borderBottomLeftRadius: '16px',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase'
                  }}>
                    Completado
                  </div>
                )}

                <div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '900',
                    color: estaCompletado ? '#10b981' : '#0b4ea6',
                    letterSpacing: '1px',
                    textTransform: 'uppercase'
                  }}>
                    🛡️ {team.nombre_liga || 'Liga Sin Nombre'}
                  </span>

                  <h3 style={{
                    fontSize: '22px',
                    fontWeight: '900',
                    color: '#1e293b',
                    margin: '10px 0 4px 0',
                    lineHeight: '1.2'
                  }}>
                    {team.nombre_equipo}
                  </h3>

                  <p style={{
                    fontSize: '13px',
                    color: '#64748b',
                    margin: '0 0 24px 0',
                    fontWeight: '600'
                  }}>
                    Categoría: {team.nombre_categoria || 'Libre'}
                  </p>
                </div>

                <div style={{ marginTop: '20px' }}>
                  {/* Info de Slots */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: '8px'
                  }}>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '700' }}>Progreso de Registro</span>
                    <span style={{ fontSize: '16px', fontWeight: '900', color: estaCompletado ? '#10b981' : '#1e293b' }}>
                      {registrados} / {total} slots
                    </span>
                  </div>

                  {/* Barra de progreso */}
                  <div style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: '#f1f5f9',
                    borderRadius: '9999px',
                    overflow: 'hidden',
                    marginBottom: '24px'
                  }}>
                    <div style={{
                      width: `${porcentaje}%`,
                      height: '100%',
                      background: estaCompletado ? '#10b981' : 'linear-gradient(90deg, #0b4ea6, #3b82f6)',
                      borderRadius: '9999px',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>

                  {/* Botón de acción */}
                  <button
                    type="button"
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '12px',
                      border: 'none',
                      background: estaCompletado ? '#f0fdf4' : '#eff6ff',
                      color: estaCompletado ? '#166534' : '#0b4ea6',
                      fontWeight: '800',
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'center',
                      letterSpacing: '0.3px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = estaCompletado ? '#dcfce7' : '#dbeafe';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = estaCompletado ? '#f0fdf4' : '#eff6ff';
                    }}
                  >
                    {estaCompletado ? 'Ver Registro' : (registrados > 0 ? 'Continuar Captura' : 'Comenzar Registro')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      <style>{hoverStyles}</style>

      {/* HEADER */}
      <div style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
        {(!isPublicFlow || (isPublicFlow && invitationTeams.length > 1 && teamId !== null)) && (
          <button
            onClick={() => {
              const tieneDatos = Object.values(currentDocuments).some(d => d !== null) || currentDatos.nombreJugador;
              if (tieneDatos) {
                Swal.fire({
                  title: isPublicFlow && invitationTeams.length > 1 ? '¿Regresar a selección de equipos?' : '¿Abandonar registro?',
                  text: isPublicFlow && invitationTeams.length > 1
                    ? 'Se perderán los documentos subidos no guardados y el progreso actual (excepto campos autoguardados en la BD).'
                    : 'Se perderán los documentos subidos y el progreso actual (excepto los campos guardados en la BD).',
                  icon: 'warning',
                  showCancelButton: true,
                  confirmButtonColor: '#ef4444',
                  cancelButtonColor: '#64748b',
                  confirmButtonText: isPublicFlow && invitationTeams.length > 1 ? 'Sí, regresar' : 'Sí, salir',
                  cancelButtonText: 'Continuar registro'
                }).then((result) => {
                  if (result.isConfirmed) {
                    if (isPublicFlow && invitationTeams.length > 1) {
                      setTeamId(null);
                    } else {
                      navigate(-1);
                    }
                  }
                });
              } else {
                if (isPublicFlow && invitationTeams.length > 1) {
                  setTeamId(null);
                } else {
                  navigate(-1);
                }
              }
            }}
            className="btn btn-outline-secondary"
            style={{ padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', background: 'none', border: '1px solid #cbd5e1', cursor: 'pointer' }}
          >
            <FaArrowLeft />
          </button>
        )}
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Panel de Registro de Jugadores</h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Registra y guarda los borradores de tus jugadores libremente.</p>
        </div>
      </div>

      {/* SLOT NAVIGATION BAR */}
      {jugadores.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '12px',
          overflowX: 'auto',
          padding: '10px 16px 15px 16px',
          background: '#f8fafc',
          borderRadius: '16px',
          marginBottom: '25px',
          border: '1px solid #e2e8f0',
          scrollbarWidth: 'thin'
        }}>
          {jugadores.map((player, idx) => {
            const status = getPlayerStatus(player);
            const config = playerStatusConfig[status] || playerStatusConfig.VACIO;
            const isSelected = idx === currentPlayerIndex;
            return (
              <button
                key={`slot-nav-${idx}`}
                type="button"
                onClick={() => setCurrentPlayerIndex(idx)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 18px',
                  borderRadius: '14px',
                  border: isSelected ? '2.5px solid #0b4ea6' : '1px solid #cbd5e1',
                  backgroundColor: isSelected ? '#eff6ff' : 'white',
                  color: '#1e293b',
                  cursor: 'pointer',
                  minWidth: '200px',
                  textAlign: 'left',
                  flexShrink: 0,
                  boxShadow: isSelected ? '0 4px 6px -1px rgba(11, 78, 166, 0.1)' : '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'all 0.2s'
                }}
              >
                <span style={{ fontSize: '15px' }}>{config.icon}</span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: '800', fontSize: '13px' }}>Jugador {idx + 1} de {jugadores.length}</span>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>
                    {config.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* DETALLES DEL EQUIPO */}
      <div className="premium-card fade-in" style={{
        maxWidth: '1000px',
        margin: '0 auto 30px auto',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        color: 'white',
        borderRadius: '20px',
        padding: '25px 35px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: '900', color: '#38bdf8', letterSpacing: '1px', textTransform: 'uppercase' }}>Equipo</span>
          <h1 style={{ fontSize: '26px', fontWeight: '900', margin: '4px 0 8px 0', letterSpacing: '-0.5px' }}>🛡️ {(currentDatos.equipo || 'Cargando...').toUpperCase()}</h1>
          <div style={{ display: 'flex', gap: '15px', fontSize: '13px', color: '#94a3b8', flexWrap: 'wrap' }}>
            <span><strong>Liga:</strong> {(currentDatos.liga || 'N/A').toUpperCase()}</span>
            <span>•</span>
            <span><strong>Categoría:</strong> {(currentDatos.categoria || 'LIBRE').toUpperCase()}</span>
            <span>•</span>
            <span><strong>Presidente:</strong> {(currentDatos.presidente || 'No disponible').toUpperCase()}</span>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px 20px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', fontWeight: '600' }}>Espacios Disponibles</span>
          <span style={{ fontSize: '24px', fontWeight: '950', color: sinSlots ? '#ef4444' : '#10b981' }}>
            {slotsInfo.disponibles} / {slotsInfo.total} Cupos
          </span>
        </div>
      </div>

      {/* BLOQUEO SI NO HAY SLOTS */}
      {sinSlots && currentPlayer.completo ? (
        <div className="premium-card fade-in" style={{
          maxWidth: '1000px',
          margin: '0 auto',
          background: 'white',
          borderRadius: '24px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
          border: '1px solid #fee2e2'
        }}>
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>🎉</div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#10b981', marginBottom: '10px' }}>Inscripción Completada</h2>
          <p style={{ color: '#64748b', maxWidth: '600px', margin: '0 auto 25px auto', lineHeight: '1.6' }}>
            Todos los espacios contratados se han registrado de manera correcta.
          </p>
          {!isPublicFlow && (
            <BotonSecundario
              etiqueta="Volver al Panel"
              alHacerClick={() => navigate(-1)}
            />
          )}
        </div>
      ) : (
        <div className="premium-card fade-in main-card-responsive" style={{
          maxWidth: '1000px',
          margin: '0 auto',
          background: 'white',
          borderRadius: '24px',
          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
          border: '1px solid #e2e8f0'
        }}>

          {currentPlayer.completo ? (
            <div style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center',
              color: '#065f46',
              marginBottom: '30px'
            }}>
              <FaCheckCircle style={{ fontSize: '42px', marginBottom: '10px' }} />
              <h3 style={{ fontWeight: '800', fontSize: '18px', margin: 0 }}>Este espacio ya está completamente registrado</h3>
              <p style={{ fontSize: '13px', margin: '6px 0 0 0', color: '#047857' }}>
                Los datos de este jugador ya fueron enviados y guardados en el sistema oficial. Selecciona otro espacio de arriba para registrar otro jugador.
              </p>
            </div>
          ) : (
            <>
              {/* INDICADOR DE PROGRESO (STEPPER WIZARD) */}
              <div className="stepper-container">
                <div className="stepper-line">
                  <div
                    className="stepper-line-progress"
                    style={{ width: `${((currentStep - 1) / 5) * 100}%` }}
                  />
                </div>
                {[
                  { step: 1, label: 'Seguro' },
                  { step: 2, label: 'Documentos' },
                  { step: 3, label: 'Personales' },
                  { step: 4, label: 'Deportivos' },
                  { step: 5, label: 'Procedencia' },
                  { step: 6, label: 'Resumen' }
                ].map((s) => {
                  const isActive = currentStep === s.step;
                  const isCompleted = currentStep > s.step;
                  return (
                    <div
                      key={`step-indicator-${s.step}`}
                      className={`stepper-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                      onClick={() => {
                        if (s.step < currentStep) {
                          setCurrentStep(s.step);
                        } else if (s.step > currentStep) {
                          let canAdvance = true;
                          for (let checkStep = currentStep; checkStep < s.step; checkStep++) {
                            if (checkStep === 2) continue; // Omitir paso opcional de documentos
                            if (!validarPasoActual(checkStep)) {
                              canAdvance = false;
                              break;
                            }
                          }
                          if (canAdvance) {
                            setCurrentStep(s.step);
                          }
                        }
                      }}
                    >
                      <div className="stepper-bubble">
                        {isCompleted ? <FaCheckCircle /> : s.step}
                      </div>
                      <span className="stepper-label">{s.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* PASO 1: SELECCION DE SEGURO / SLOT A CONSUMIR */}
              {currentStep === 1 && (
                <section className="wizard-step-container">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '24px' }}>
                    <StepBadge number="1" isActive={true} isDone={!!currentSeguroId} />
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Seguro pagado por asignar</h3>
                  </div>

                  <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <div className="card" style={{ padding: '25px', borderRadius: '16px', border: `1.5px solid ${validationErrors.seguroId ? '#ef4444' : '#e2e8f0'}`, background: '#f8fafc' }}>
                      <label className="form-label" style={{ fontWeight: '700', fontSize: '14px', marginBottom: '12px', display: 'block' }}>
                        Seleccione el seguro comprado que desea para esta inscripción: <span className="required-star">*</span>
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                        {slotsData?.seguros?.map((seg) => {
                          const isSelected = String(currentSeguroId) === String(seg.seguro_id);
                          const noDisponible = seg.disponibles <= 0 && !isSelected;
                          return (
                            <div
                              key={`seguro-card-${seg.seguro_id}`}
                              onClick={() => {
                                if (noDisponible) {
                                  Swal.fire('Atención', 'No hay espacios disponibles para este tipo de seguro.', 'warning');
                                  return;
                                }
                                updatePlayerSeguro(currentPlayerIndex, String(seg.seguro_id));
                                setValidationErrors(prev => ({ ...prev, seguroId: null }));
                                const updated = { ...currentDatos };
                                if (currentPlayer?.slotId) {
                                  guardarBorradorEnBD(currentPlayer.slotId, updated);
                                }
                              }}
                              style={{
                                padding: '16px',
                                borderRadius: '12px',
                                border: isSelected
                                  ? '2.5px solid #0b4ea6'
                                  : noDisponible
                                    ? '1px solid #e2e8f0'
                                    : '1px solid #cbd5e1',
                                backgroundColor: isSelected
                                  ? '#eff6ff'
                                  : noDisponible
                                    ? '#f1f5f9'
                                    : 'white',
                                cursor: noDisponible ? 'not-allowed' : 'pointer',
                                opacity: noDisponible ? 0.6 : 1,
                                transition: 'all 0.2s',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px'
                              }}
                            >
                              <span style={{ fontSize: '14px', fontWeight: '800', color: isSelected ? '#0b4ea6' : noDisponible ? '#94a3b8' : '#1e293b' }}>
                                🛡️ {seg.nombre}
                              </span>
                              <div style={{
                                marginTop: '5px',
                                display: 'inline-flex',
                                alignSelf: 'start',
                                padding: '2px 8px',
                                borderRadius: '20px',
                                background: noDisponible ? '#e2e8f0' : '#dcfce7',
                                color: noDisponible ? '#64748b' : '#15803d',
                                fontSize: '11px',
                                fontWeight: '800'
                              }}>
                                {seg.disponibles} disponibles
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {validationErrors.seguroId && (
                        <span style={{ display: 'block', color: '#ef4444', fontSize: '12px', fontWeight: '800', marginTop: '10px' }}>
                          ❌ {validationErrors.seguroId}
                        </span>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* PASO 2: CARGA DE DOCUMENTOS */}
              {currentStep === 2 && (
                <section className="wizard-step-container">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                    <StepBadge number="2" isActive={true} isDone={Object.values(currentDocuments).some(d => d !== null)} />
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Carga de Documentación (Opcional)</h3>
                  </div>

                  <div style={{
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: '12px',
                    padding: '12px 18px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '13px',
                    color: '#0369a1',
                    fontWeight: '600'
                  }}>
                    <span style={{ fontSize: '18px' }}>📋</span>
                    Opcional: puedes subir los documentos ahora para auto-llenar los campos vía OCR, o continuar sin archivos y cargarlos después.
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '20px'
                  }}>
                    {documentCards.map((doc) => (
                      <div
                        key={doc.key}
                        className="document-card"
                        style={{
                          backgroundColor: 'white',
                          borderRadius: '20px',
                          border: currentDocuments[doc.key] ? '2px solid #10b981' : '2px dashed #cbd5e1',
                          padding: '15px',
                          textAlign: 'center',
                          transition: 'all 0.3s',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        {/* Indicador de Menor para tutor/credencial */}
                        {esMenorDeEdad && (doc.key === 'ineTutor' || doc.key === 'identificacionMenor') && (
                          <div style={{ position: 'absolute', top: 10, right: 10, background: 'linear-gradient(90deg,#f59e0b,#fbbf24)', borderRadius: '12px', padding: '3px 9px', fontSize: '9px', fontWeight: '950', color: 'white', letterSpacing: '0.5px', zIndex: 1 }}>🧒 MENOR</div>
                        )}

                        <div style={{
                          height: '140px',
                          width: '100%',
                          backgroundColor: '#f8fafc',
                          borderRadius: '12px',
                          marginBottom: '10px',
                          position: 'relative',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid #f1f5f9'
                        }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            handleFileUpload(doc.key, e.dataTransfer.files[0]);
                          }}
                        >
                          {previews[doc.key] ? (
                            <div className="preview-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
                              {currentDocuments[doc.key]?.type === 'application/pdf' ? (
                                <div style={{ color: '#ef4444', fontSize: '45px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                                  <FaFilePdf />
                                  <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '800' }}>PDF</span>
                                </div>
                              ) : (
                                <img
                                  src={previews[doc.key]}
                                  alt="Preview"
                                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                />
                              )}

                              {/* OVERLAY ACTIONS */}
                              <div className="overlay-actions" style={{
                                position: 'absolute',
                                top: 0, left: 0, right: 0, bottom: 0,
                                backgroundColor: 'rgba(30, 41, 59, 0.7)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '12px',
                                opacity: 0,
                                transition: 'opacity 0.2s ease',
                                backdropFilter: 'blur(2px)'
                              }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const isPdf = currentDocuments[doc.key]?.type === 'application/pdf';
                                    setPreviewDoc({
                                      open: true,
                                      url: previews[doc.key],
                                      type: isPdf ? 'pdf' : 'image',
                                      title: doc.title
                                    });
                                  }}
                                  className="btn-zoom"
                                  style={{
                                    width: '36px', height: '36px', borderRadius: '50%',
                                    backgroundColor: '#fff', color: '#1e293b', border: 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', cursor: 'pointer'
                                  }}
                                >
                                  <FaSearchPlus />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    document.getElementById(`file-${doc.key}`).click();
                                  }}
                                  className="btn-change"
                                  style={{
                                    width: '36px', height: '36px', borderRadius: '50%',
                                    backgroundColor: '#0ea5e9', color: '#fff', border: 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', cursor: 'pointer'
                                  }}
                                >
                                  <FaSyncAlt />
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* ESTADO VACÍO */
                            <div
                              onClick={() => document.getElementById(`file-${doc.key}`).click()}
                              style={{ textAlign: 'center', color: '#94a3b8', cursor: 'pointer' }}
                            >
                              <FaUpload style={{ fontSize: '28px', marginBottom: '6px' }} />
                              <p style={{ margin: 0, fontSize: '10px', fontWeight: '800' }}>SUBIR ARCHIVO</p>
                            </div>
                          )}
                        </div>

                        <h4 style={{ fontSize: '13px', fontWeight: '800', margin: '8px 0 5px 0', color: '#1e293b' }}>{doc.title}</h4>
                        <p style={{ margin: '0 0 6px', fontSize: '10px', color: '#64748b', lineHeight: 1.4 }}>{doc.subtitle}</p>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          backgroundColor: currentDocuments[doc.key] ? '#dcfce7' : '#f1f5f9',
                          color: currentDocuments[doc.key] ? '#166534' : '#64748b',
                          fontSize: '10px',
                          fontWeight: '800'
                        }}>
                          {currentDocuments[doc.key] ? <><FaCheckCircle /> Listo</> : 'Pendiente'}
                        </div>

                        {/* Botón de validación fallida y bypass para fotografía */}
                        {doc.key === 'foto' && !currentDocuments.foto && failedPhoto && (
                          <div style={{ marginTop: '8px' }}>
                            <button
                              type="button"
                              onClick={forceLoadFailedPhoto}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                backgroundColor: '#f59e0b',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '11px',
                                fontWeight: '800',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={e => e.target.style.backgroundColor = '#d97706'}
                              onMouseLeave={e => e.target.style.backgroundColor = '#f59e0b'}
                            >
                              ⚠️ Cargar igualmente
                            </button>
                          </div>
                        )}

                        <input
                          type="file"
                          id={`file-${doc.key}`}
                          style={{ display: 'none' }}
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileUpload(doc.key, e.target.files[0])}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Loader temporal OCR */}
                  {currentDocuments.acta && !currentDatos.fechaNacimiento && (
                    <div className="fade-in" style={{ marginTop: '16px', padding: '12px 18px', background: '#fffbeb', border: '1px dashed #fbbf24', borderRadius: '10px', fontSize: '12px', color: '#92400e', fontWeight: '600' }}>
                      ⏳ Analizando el Acta de Nacimiento vía OCR... Los campos del formulario se auto-completarán en breve.
                    </div>
                  )}
                </section>
              )}

              {/* PASO 3: INFORMACIÓN PERSONAL */}
              {currentStep === 3 && (
                <section className="wizard-step-container">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                    <StepBadge number="3" isActive={true} isDone={false} />
                    <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', margin: 0 }}>Información Personal</h3>
                  </div>

                  <div className="form-wrapper-responsive" style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', padding: '24px' }}>
                    <div className="form-grid-3">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Nombre(s) <span className="required-star">*</span></label>
                        <input
                          type="text"
                          value={currentDatos.nombreJugador}
                          onChange={e => {
                            handleFieldChange('nombreJugador', e.target.value);
                            setValidationErrors(prev => ({ ...prev, nombreJugador: null }));
                          }}
                          onBlur={handleBlur}
                          placeholder="Ej. Juan"
                          style={{
                            padding: '10px',
                            borderRadius: '8px',
                            border: `1.5px solid ${validationErrors.nombreJugador ? '#ef4444' : '#cbd5e1'}`,
                            fontSize: '14px',
                            outline: 'none',
                            boxShadow: validationErrors.nombreJugador ? '0 0 0 3px rgba(239, 68, 68, 0.1)' : 'none'
                          }}
                        />
                        {validationErrors.nombreJugador && <span className="field-error-msg">❌ {validationErrors.nombreJugador}</span>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Ap. Paterno <span className="required-star">*</span></label>
                        <input
                          type="text"
                          value={currentDatos.apellidoPaterno}
                          onChange={e => {
                            handleFieldChange('apellidoPaterno', e.target.value);
                            setValidationErrors(prev => ({ ...prev, apellidoPaterno: null }));
                          }}
                          onBlur={handleBlur}
                          placeholder="Ej. Pérez"
                          style={{
                            padding: '10px',
                            borderRadius: '8px',
                            border: `1.5px solid ${validationErrors.apellidoPaterno ? '#ef4444' : '#cbd5e1'}`,
                            fontSize: '14px',
                            outline: 'none',
                            boxShadow: validationErrors.apellidoPaterno ? '0 0 0 3px rgba(239, 68, 68, 0.1)' : 'none'
                          }}
                        />
                        {validationErrors.apellidoPaterno && <span className="field-error-msg">❌ {validationErrors.apellidoPaterno}</span>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Ap. Materno <span className="required-star">*</span></label>
                        <input
                          type="text"
                          value={currentDatos.apellidoMaterno}
                          onChange={e => {
                            handleFieldChange('apellidoMaterno', e.target.value);
                            setValidationErrors(prev => ({ ...prev, apellidoMaterno: null }));
                          }}
                          onBlur={handleBlur}
                          placeholder="Ej. Gómez"
                          style={{
                            padding: '10px',
                            borderRadius: '8px',
                            border: `1.5px solid ${validationErrors.apellidoMaterno ? '#ef4444' : '#cbd5e1'}`,
                            fontSize: '14px',
                            outline: 'none',
                            boxShadow: validationErrors.apellidoMaterno ? '0 0 0 3px rgba(239, 68, 68, 0.1)' : 'none'
                          }}
                        />
                        {validationErrors.apellidoMaterno && <span className="field-error-msg">❌ {validationErrors.apellidoMaterno}</span>}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '15px', marginBottom: '25px', marginTop: '15px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>CURP <span className="required-star">*</span></label>
                        <input
                          type="text"
                          value={currentDatos.curp || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            let sId = currentDatos.genero;
                            if (val.length >= 11) {
                              const char = val.charAt(10).toUpperCase();
                              if (char === 'M') sId = '2'; // Femenino
                              else if (char === 'H') sId = '1'; // Masculino
                            }
                            updatePlayerDatos(currentPlayerIndex, { curp: val, genero: sId });
                            setValidationErrors(prev => ({ ...prev, curp: null }));
                          }}
                          onBlur={handleBlur}
                          placeholder="ABCD..."
                          maxLength="18"
                          style={{
                            padding: '10px',
                            borderRadius: '8px',
                            border: `1.5px solid ${validationErrors.curp ? '#ef4444' : '#cbd5e1'}`,
                            fontSize: '14px',
                            outline: 'none',
                            boxShadow: validationErrors.curp ? '0 0 0 3px rgba(239, 68, 68, 0.1)' : 'none'
                          }}
                        />
                        {validationErrors.curp && <span className="field-error-msg">❌ {validationErrors.curp}</span>}
                      </div>
                    </div>

                    <div className="form-grid-3">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Fecha Nac. <span className="required-star">*</span></label>
                        <input
                          type="date"
                          value={currentDatos.fechaNacimiento || ''}
                          min={minDateStr}
                          max={today}
                          onChange={e => {
                            handleFieldChange('fechaNacimiento', e.target.value);
                            setValidationErrors(prev => ({ ...prev, fechaNacimiento: null }));
                          }}
                          onBlur={handleBlur}
                          style={{
                            padding: '10px',
                            borderRadius: '8px',
                            border: `1.5px solid ${validationErrors.fechaNacimiento ? '#ef4444' : '#cbd5e1'}`,
                            fontSize: '14px',
                            outline: 'none'
                          }}
                        />
                        {validationErrors.fechaNacimiento && <span className="field-error-msg">❌ {validationErrors.fechaNacimiento}</span>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Lugar de Nacimiento <span className="required-star">*</span></label>
                        <input
                          type="text"
                          value={currentDatos.lugarNacimiento || ''}
                          onChange={e => {
                            handleFieldChange('lugarNacimiento', e.target.value);
                            setValidationErrors(prev => ({ ...prev, lugarNacimiento: null }));
                          }}
                          onBlur={handleBlur}
                          placeholder="Ej. Monterrey, NL"
                          style={{
                            padding: '10px',
                            borderRadius: '8px',
                            border: `1.5px solid ${validationErrors.lugarNacimiento ? '#ef4444' : '#cbd5e1'}`,
                            fontSize: '14px',
                            outline: 'none'
                          }}
                        />
                        {validationErrors.lugarNacimiento && <span className="field-error-msg">❌ {validationErrors.lugarNacimiento}</span>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Sexo <span className="required-star">*</span></label>
                        <select
                          value={currentDatos.genero || ""}
                          onChange={e => {
                            handleFieldChange('genero', e.target.value);
                            setValidationErrors(prev => ({ ...prev, genero: null }));
                            if (currentPlayer?.slotId) {
                              guardarBorradorEnBD(currentPlayer.slotId, { ...currentDatos, genero: e.target.value });
                            }
                          }}
                          style={{
                            padding: '10px',
                            borderRadius: '8px',
                            border: `1.5px solid ${validationErrors.genero ? '#ef4444' : '#cbd5e1'}`,
                            fontSize: '14px',
                            backgroundColor: 'white',
                            outline: 'none'
                          }}
                        >
                          <option value="">Seleccione...</option>
                          <option value="1">MASCULINO</option>
                          <option value="2">FEMENINO</option>
                        </select>
                        {validationErrors.genero && <span className="field-error-msg">❌ {validationErrors.genero}</span>}
                      </div>
                    </div>

                    <div className="form-grid-2" style={{ marginTop: '15px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Correo electrónico <span className="required-star">*</span></label>
                        <input
                          type="email"
                          value={currentDatos.correo}
                          onChange={e => {
                            handleFieldChange('correo', e.target.value);
                            setValidationErrors(prev => ({ ...prev, correo: null }));
                          }}
                          onBlur={handleBlur}
                          placeholder="correo@ejemplo.com"
                          style={{
                            padding: '10px',
                            borderRadius: '8px',
                            border: `1.5px solid ${validationErrors.correo ? '#ef4444' : '#cbd5e1'}`,
                            fontSize: '14px',
                            outline: 'none'
                          }}
                        />
                        {validationErrors.correo && <span className="field-error-msg">❌ {validationErrors.correo}</span>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}># de Teléfono <span className="required-star">*</span></label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <select
                            value={currentDatos.codigoPais || '+52'}
                            onChange={e => handleFieldChange('codigoPais', e.target.value)}
                            onBlur={handleBlur}
                            style={{
                              padding: '10px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '14px',
                              backgroundColor: 'white',
                              width: '110px',
                              flexShrink: 0
                            }}
                          >
                            <option value="+52">México +52</option>
                            <option value="+1">EE.UU./Canadá +1</option>
                            <option value="+34">España +34</option>
                            <option value="+54">Argentina +54</option>
                            <option value="+55">Brasil +55</option>
                            <option value="+56">Chile +56</option>
                            <option value="+57">Colombia +57</option>
                            <option value="+506">Costa Rica +506</option>
                            <option value="+593">Ecuador +593</option>
                            <option value="+503">El Salvador +503</option>
                            <option value="+502">Guatemala +502</option>
                            <option value="+504">Honduras +504</option>
                            <option value="+505">Nicaragua +505</option>
                            <option value="+507">Panamá +507</option>
                            <option value="+595">Paraguay +595</option>
                            <option value="+51">Perú +51</option>
                            <option value="+598">Uruguay +598</option>
                            <option value="+58">Venezuela +58</option>
                          </select>
                          <input
                            type="tel"
                            value={currentDatos.telefono}
                            onChange={e => {
                              handleFieldChange('telefono', e.target.value.replace(/\D/g, '').slice(0, 10));
                              setValidationErrors(prev => ({ ...prev, telefono: null }));
                            }}
                            onBlur={handleBlur}
                            placeholder="10 dígitos numéricos"
                            style={{
                              padding: '10px',
                              borderRadius: '8px',
                              border: `1.5px solid ${validationErrors.telefono ? '#ef4444' : '#cbd5e1'}`,
                              fontSize: '14px',
                              flexGrow: 1,
                              outline: 'none'
                            }}
                          />
                        </div>
                        {validationErrors.telefono && <span className="field-error-msg">❌ {validationErrors.telefono}</span>}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* PASO 4: INFORMACIÓN DEPORTIVA */}
              {currentStep === 4 && (
                <section className="wizard-step-container">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                    <StepBadge number="4" isActive={true} isDone={false} />
                    <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', margin: 0 }}>Información Deportiva</h3>
                  </div>

                  <div className="form-wrapper-responsive" style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', padding: '24px' }}>
                    <div className="form-grid-3">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}># Camiseta <span className="required-star">*</span></label>
                        <input
                          type="number"
                          value={currentDatos.numCamiseta}
                          onChange={e => {
                            handleFieldChange('numCamiseta', e.target.value);
                            setValidationErrors(prev => ({ ...prev, numCamiseta: null }));
                          }}
                          onBlur={handleBlur}
                          placeholder="Ej. 10"
                          style={{
                            padding: '10px',
                            borderRadius: '8px',
                            border: `1.5px solid ${validationErrors.numCamiseta ? '#ef4444' : '#cbd5e1'}`,
                            fontSize: '14px',
                            outline: 'none'
                          }}
                        />
                        {validationErrors.numCamiseta && <span className="field-error-msg">❌ {validationErrors.numCamiseta}</span>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Posición en el campo <span className="required-star">*</span></label>
                        <select
                          value={currentDatos.posicion}
                          onChange={e => {
                            const val = parseInt(e.target.value) || '';
                            handleFieldChange('posicion', val);
                            setValidationErrors(prev => ({ ...prev, posicion: null }));
                            if (currentPlayer?.slotId) {
                              guardarBorradorEnBD(currentPlayer.slotId, { ...currentDatos, posicion: val });
                            }
                          }}
                          style={{
                            padding: '10px',
                            borderRadius: '8px',
                            border: `1.5px solid ${validationErrors.posicion ? '#ef4444' : '#cbd5e1'}`,
                            fontSize: '14px',
                            backgroundColor: 'white',
                            outline: 'none'
                          }}
                        >
                          <option value="">Posición...</option>
                          {(catalogs?.roles_equipo || []).map(r => (
                            <option key={r.id} value={r.id}>{r.nombre}</option>
                          ))}
                        </select>
                        {validationErrors.posicion && <span className="field-error-msg">❌ {validationErrors.posicion}</span>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>NUI <span className="required-star">*</span></label>
                        <input
                          type="text"
                          value={currentDatos.nui || ''}
                          onChange={e => {
                            handleFieldChange('nui', e.target.value);
                            setValidationErrors(prev => ({ ...prev, nui: null }));
                          }}
                          onBlur={handleBlur}
                          placeholder="Ej. 123"
                          style={{
                            padding: '10px',
                            borderRadius: '8px',
                            border: `1.5px solid ${validationErrors.nui ? '#ef4444' : '#cbd5e1'}`,
                            fontSize: '14px',
                            outline: 'none'
                          }}
                        />
                        {validationErrors.nui && <span className="field-error-msg">❌ {validationErrors.nui}</span>}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* PASO 5: PROCEDENCIA Y ANTECEDENTES */}
              {currentStep === 5 && (
                <section className="wizard-step-container">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                    <StepBadge number="5" isActive={true} isDone={false} />
                    <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', margin: 0 }}>Nacionalidad y Antecedentes</h3>
                  </div>

                  <div className="form-wrapper-responsive" style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                      <FaGlobeAmericas style={{ color: '#0b4ea6', fontSize: '20px' }} />
                      <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', margin: 0 }}>Procedencia del jugador</h4>
                    </div>

                    <div style={{
                      display: 'flex',
                      background: '#f1f5f9',
                      padding: '4px',
                      borderRadius: '12px',
                      width: 'fit-content',
                      marginBottom: '25px'
                    }}>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...currentDatos, esForaneo: false };
                          updatePlayerDatos(currentPlayerIndex, { esForaneo: false });
                          setValidationErrors({}); // Limpiar errores de foráneo si cambia a mexicano
                          if (currentPlayer?.slotId) {
                            guardarBorradorEnBD(currentPlayer.slotId, updated);
                          }
                        }}
                        style={{
                          padding: '10px 24px',
                          borderRadius: '10px',
                          border: 'none',
                          background: !currentDatos.esForaneo ? 'white' : 'transparent',
                          color: !currentDatos.esForaneo ? '#0b4ea6' : '#64748b',
                          fontWeight: '800',
                          fontSize: '13px',
                          boxShadow: !currentDatos.esForaneo ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        🇲🇽 Mexicano
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...currentDatos, esForaneo: true };
                          updatePlayerDatos(currentPlayerIndex, { esForaneo: true });
                          if (currentPlayer?.slotId) {
                            guardarBorradorEnBD(currentPlayer.slotId, updated);
                          }
                        }}
                        style={{
                          padding: '10px 24px',
                          borderRadius: '10px',
                          border: 'none',
                          background: currentDatos.esForaneo ? 'white' : 'transparent',
                          color: currentDatos.esForaneo ? '#0b4ea6' : '#64748b',
                          fontWeight: '800',
                          fontSize: '13px',
                          boxShadow: currentDatos.esForaneo ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        🌎 Extranjero
                      </button>
                    </div>

                    {/* ANTECEDENTES INTERNACIONALES (FORÁNEO) */}
                    <div style={{ backgroundColor: '#fff7ed', border: '1px solid #ffedd5', padding: '30px', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px', borderBottom: '1px solid #ffedd5', paddingBottom: '20px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                          <FaGlobeAmericas />
                        </div>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#9a3412' }}>Antecedentes internacionales</h4>
                      </div>

                      {currentDatos.esForaneo ? (
                        <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '20px' }}>
                          <div className="form-grid-2-foraneo">
                            <EntradaFormulario
                              etiqueta="Nacionalidad del jugador"
                              valor={currentDatos.nacionalidadJugador}
                              alCambiar={val => {
                                handleFieldChange('nacionalidadJugador', val);
                                setValidationErrors(prev => ({ ...prev, nacionalidadJugador: null }));
                              }}
                              alPerderEnfoque={handleBlur}
                              error={validationErrors.nacionalidadJugador}
                            />
                            <EntradaFormulario
                              etiqueta="País de residencia actual"
                              valor={currentDatos.paisResidencia}
                              alCambiar={val => {
                                handleFieldChange('paisResidencia', val);
                                setValidationErrors(prev => ({ ...prev, paisResidencia: null }));
                              }}
                              alPerderEnfoque={handleBlur}
                              error={validationErrors.paisResidencia}
                            />
                          </div>

                          <div className="form-grid-2-align-end">
                            <EntradaSeleccion
                              etiqueta="¿El jugador ha vivido en el extranjero?"
                              valor={currentDatos.haVividoExtranjero ? '1' : '0'}
                              alCambiar={val => {
                                const boolVal = val === '1';
                                handleFieldChange('haVividoExtranjero', boolVal);
                                setValidationErrors(prev => ({ ...prev, haVividoExtranjero: null }));
                                if (currentPlayer?.slotId) {
                                  guardarBorradorEnBD(currentPlayer.slotId, { ...currentDatos, haVividoExtranjero: boolVal });
                                }
                              }}
                              opciones={[{ valor: '0', etiqueta: 'No' }, { valor: '1', etiqueta: 'Sí' }]}
                              requerido={true}
                            />
                            {currentDatos.haVividoExtranjero && (
                              <EntradaFormulario
                                etiqueta="¿En qué país?"
                                valor={currentDatos.dondeVividoExtranjero}
                                alCambiar={val => {
                                  handleFieldChange('dondeVividoExtranjero', val);
                                  setValidationErrors(prev => ({ ...prev, dondeVividoExtranjero: null }));
                                }}
                                alPerderEnfoque={handleBlur}
                                error={validationErrors.dondeVividoExtranjero}
                                requerido={true}
                              />
                            )}
                          </div>

                          <div className="form-grid-2-foraneo">
                            <EntradaFormulario
                              etiqueta="Nacionalidad del padre"
                              valor={currentDatos.nacionalidadPadre}
                              alCambiar={val => {
                                handleFieldChange('nacionalidadPadre', val);
                                setValidationErrors(prev => ({ ...prev, nacionalidadPadre: null }));
                              }}
                              alPerderEnfoque={handleBlur}
                              error={validationErrors.nacionalidadPadre}
                            />
                            <EntradaFormulario
                              etiqueta="Nacionalidad de la madre"
                              valor={currentDatos.nacionalidadMadre}
                              alCambiar={val => {
                                handleFieldChange('nacionalidadMadre', val);
                                setValidationErrors(prev => ({ ...prev, nacionalidadMadre: null }));
                              }}
                              alPerderEnfoque={handleBlur}
                              error={validationErrors.nacionalidadMadre}
                            />
                          </div>

                          <EntradaFormulario
                            etiqueta="El jugador ha sido registrado por la Asociación Nacional de Fútbol (en el extranjero) como jugador amateur o profesional, previo a su solitud de registro en la FMF (Si - No)"
                            valor={currentDatos.registroAsociacionExtranjera}
                            alCambiar={val => {
                              handleFieldChange('registroAsociacionExtranjera', val);
                              setValidationErrors(prev => ({ ...prev, registroAsociacionExtranjera: null }));
                            }}
                            alPerderEnfoque={handleBlur}
                            filas={2}
                            requerido={true}
                            error={validationErrors.registroAsociacionExtranjera}
                          />

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                            <EntradaFormulario etiqueta="Nac. Abuelo Paterno" valor={currentDatos.nacAbueloPaterno} alCambiar={val => { handleFieldChange('nacAbueloPaterno', val); setValidationErrors(prev => ({ ...prev, nacAbueloPaterno: null })); }} alPerderEnfoque={handleBlur} error={validationErrors.nacAbueloPaterno} />
                            <EntradaFormulario etiqueta="Nac. Abuela Paterna" valor={currentDatos.nacAbuelaPaterna} alCambiar={val => { handleFieldChange('nacAbuelaPaterna', val); setValidationErrors(prev => ({ ...prev, nacAbuelaPaterna: null })); }} alPerderEnfoque={handleBlur} error={validationErrors.nacAbuelaPaterna} />
                            <EntradaFormulario etiqueta="Nac. Abuelo Materno" valor={currentDatos.nacAbueloMaterno} alCambiar={val => { handleFieldChange('nacAbueloMaterno', val); setValidationErrors(prev => ({ ...prev, nacAbueloMaterno: null })); }} alPerderEnfoque={handleBlur} error={validationErrors.nacAbueloMaterno} />
                            <EntradaFormulario etiqueta="Nac. Abuela Materna" valor={currentDatos.nacAbuelaMaterna} alCambiar={val => { handleFieldChange('nacAbuelaMaterna', val); setValidationErrors(prev => ({ ...prev, nacAbuelaMaterna: null })); }} alPerderEnfoque={handleBlur} error={validationErrors.nacAbuelaMaterna} />
                          </div>

                          <EntradaFormulario
                            etiqueta="El jugador ha jugado en un Club extranjero y participado en Torneos y/o competencias internacionales, escolares o de recreo como campamentos estacionales, cursos, etc"
                            valor={currentDatos.juegoClubExtranjero}
                            alCambiar={val => {
                              handleFieldChange('juegoClubExtranjero', val);
                              setValidationErrors(prev => ({ ...prev, juegoClubExtranjero: null }));
                            }}
                            alPerderEnfoque={handleBlur}
                            filas={3}
                            requerido={true}
                            error={validationErrors.juegoClubExtranjero}
                          />
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                          <p style={{ margin: 0, fontSize: '13px', color: '#9a3412', fontStyle: 'italic' }}>
                            El jugador es mexicano. Si desea registrar antecedentes internacionales, cambie el toggle a "Extranjero" arriba.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* PASO 6: RESUMEN Y FINALIZACIÓN */}
              {currentStep === 6 && (
                <section className="wizard-step-container">
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', marginBottom: '20px' }}>Resumen del Registro</h3>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '20px',
                    marginBottom: '30px'
                  }}>
                    {/* Tarjeta de Datos Personales */}
                    <div style={{ padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0b4ea6', margin: '0 0 12px 0', textTransform: 'uppercase' }}>Datos Personales</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                        <div><strong>Nombre:</strong> {currentDatos.nombreJugador} {currentDatos.apellidoPaterno} {currentDatos.apellidoMaterno}</div>
                        <div><strong>CURP:</strong> {currentDatos.curp}</div>
                        <div><strong>Fecha de Nacimiento:</strong> {currentDatos.fechaNacimiento}</div>
                        <div><strong>Sexo:</strong> {currentDatos.genero === '1' ? 'MASCULINO' : 'FEMENINO'}</div>
                        <div><strong>Correo:</strong> {currentDatos.correo}</div>
                        <div><strong>Teléfono:</strong> {currentDatos.codigoPais} {currentDatos.telefono}</div>
                      </div>
                    </div>

                    {/* Tarjeta de Datos Deportivos */}
                    <div style={{ padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0b4ea6', margin: '0 0 12px 0', textTransform: 'uppercase' }}>Información Deportiva</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                        <div><strong>NUI:</strong> {currentDatos.nui}</div>
                        <div><strong>Camiseta:</strong> #{currentDatos.numCamiseta}</div>
                        <div>
                          <strong>Posición:</strong> {
                            catalogs?.roles_equipo?.find(r => String(r.id) === String(currentDatos.posicion))?.nombre || 'No asignada'
                          }
                        </div>
                        <div>
                          <strong>Seguro Seleccionado:</strong> {
                            slotsData?.seguros?.find(s => String(s.seguro_id) === String(currentSeguroId))?.nombre || 'No asignado'
                          }
                        </div>
                        <div><strong>Procedencia:</strong> {currentDatos.esForaneo ? '🌎 Extranjero' : '🇲🇽 Mexicano'}</div>
                      </div>
                    </div>

                    {/* Tarjeta de Documentación */}
                    <div style={{ padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0b4ea6', margin: '0 0 12px 0', textTransform: 'uppercase' }}>Documentos Cargados</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                        {documentCards.map(doc => (
                          <div key={`summary-doc-${doc.key}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{doc.title}:</span>
                            <span style={{
                              fontWeight: '800',
                              color: currentDocuments[doc.key] ? '#166534' : '#64748b',
                              background: currentDocuments[doc.key] ? '#dcfce7' : '#f1f5f9',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '11px'
                            }}>
                              {currentDocuments[doc.key] ? '✓ Listo' : 'Pendiente'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Descarga de formato prellenado y carga del formato firmado */}
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '25px', marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b', marginBottom: '12px', textAlign: 'center' }}>Formato de Afiliación Oficial</h4>
                    <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', maxWidth: '600px', margin: '0 auto 20px auto', lineHeight: '1.5' }}>
                      Descarga el formato prellenado con los datos del jugador, fírmalo y súbelo escaneado.
                      <strong> Si aún no tienes la firma, puedes inscribir al jugador y subir el formato firmado después.</strong>
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                      <button
                        type="button"
                        onClick={handleDownloadFormato}
                        style={{
                          padding: '12px 28px',
                          borderRadius: '12px',
                          border: 'none',
                          background: 'linear-gradient(135deg, #0b4ea6, #063f82)',
                          color: 'white',
                          fontWeight: '800',
                          fontSize: '14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 6px -1px rgba(11, 78, 166, 0.2)'
                        }}
                      >
                        📥 Descargar Formato Prellenado
                      </button>
                    </div>

                    <div
                      onClick={() => document.getElementById('final-signed-form').click()}
                      style={{
                        border: signedForm ? '2px solid #10b981' : '2px dashed #0ea5e9',
                        borderRadius: '20px',
                        padding: '35px 20px',
                        backgroundColor: signedForm ? '#f0fdf4' : '#f8fafc',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        textAlign: 'center',
                        maxWidth: '600px',
                        margin: '0 auto'
                      }}
                    >
                      {signedForm ? (
                        <div style={{ color: '#10b981' }}>
                          <FaFilePdf style={{ fontSize: '45px', marginBottom: '12px' }} />
                          <p style={{ margin: 0, fontWeight: '700', fontSize: '14px' }}>{signedForm.name}</p>
                          <p style={{ margin: '4px 0 0 0', fontSize: '11px' }}>Documento firmado cargado y listo</p>
                        </div>
                      ) : (
                        <div style={{ color: '#0ea5e9' }}>
                          <FaUpload style={{ fontSize: '45px', marginBottom: '12px' }} />
                          <p style={{ margin: 0, fontWeight: '700', fontSize: '14px' }}>Subir formato firmado (Opcional)</p>
                          <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b' }}>Solo se permiten archivos PDF</p>
                        </div>
                      )}
                      <input
                        type="file"
                        id="final-signed-form"
                        style={{ display: 'none' }}
                        accept=".pdf"
                        onChange={(e) => {
                          if (e.target.files[0]) {
                            setSignedForm(e.target.files[0]);
                          }
                        }}
                      />
                    </div>
                  </div>
                </section>
              )}

              {/* BOTONES DE NAVEGACION INFERIOR */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '40px',
                borderTop: '1px solid #f1f5f9',
                paddingTop: '25px',
                gap: '20px'
              }}>
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    style={{
                      padding: '12px 28px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      background: 'white',
                      color: '#64748b',
                      fontWeight: '800',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <FaArrowLeft /> Atrás
                  </button>
                ) : (
                  <div />
                )}

                {currentStep < 6 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (validarPasoActual(currentStep)) {
                        setCurrentStep(prev => prev + 1);
                      }
                    }}
                    style={{
                      padding: '12px 32px',
                      borderRadius: '12px',
                      border: 'none',
                      background: '#0b4ea6',
                      color: 'white',
                      fontWeight: '800',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 6px -1px rgba(11, 78, 166, 0.2)',
                      transition: 'all 0.2s'
                    }}
                  >
                    Siguiente <FaArrowRight />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleInscribirClick}
                    disabled={uploading}
                    style={{
                      padding: '12px 32px',
                      borderRadius: '12px',
                      border: 'none',
                      background: '#10b981',
                      color: 'white',
                      fontWeight: '800',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)',
                      transition: 'all 0.2s',
                      opacity: uploading ? 0.7 : 1
                    }}
                  >
                    {uploading ? "Procesando..." : "Finalizar e Inscribir"} <FaSave />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* MODAL DE PREVISUALIZACIÓN DE DOCUMENTOS (ZOOM) */}
      <Modal
        estaAbierto={previewDoc.open}
        titulo={previewDoc.title}
        alCerrar={() => setPreviewDoc({ ...previewDoc, open: false })}
        tamanio={previewDoc.type === 'pdf' ? 'grande' : 'medio'}
        pie={<BotonSecundario etiqueta="Cerrar" alHacerClick={() => setPreviewDoc({ ...previewDoc, open: false })} />}
      >
        <div style={{ width: '100%', height: previewDoc.type === 'pdf' ? '70vh' : 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {previewDoc.type === 'pdf' ? (
            <iframe src={previewDoc.url} title="Document Preview" style={{ width: '100%', height: '100%', border: 'none', borderRadius: '12px' }} />
          ) : (
            <img src={previewDoc.url} alt="Document Preview" style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '12px' }} />
          )}
        </div>
      </Modal>

      {/* Notificación de autoguardado */}
      <div className={`toast-auto-save ${toastVisible ? 'show' : ''}`}>
        <FaCheckCircle style={{ color: '#10b981', fontSize: '16px' }} />
        <span>Borrador guardado</span>
      </div>
    </div>
  );
}
