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
  const { token } = useParams();
  const isPublicFlow = !!token;
  const [teamId, setTeamId] = useState(location.state?.teamId || null);

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

  // Estados y refs para autoguardado toast
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimeoutRef = useRef(null);

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

  const defaultPlayerDatos = {
    nombreJugador: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    curp: '',
    genero: '1', // Default MASCULINO (SexoId = 1)
    fechaNacimiento: '',
    lugarNacimiento: 'MÉXICO',
    correo: '',
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
    if (player.completo) return 'COMPLETO';
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
    if (hasRequiredFields) return 'COMPLETO'; // Note: documents are optional for president flow
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
    } else if (field === 'correo') {
      formattedValue = value.toLowerCase();
    } else {
      const fieldsToUppercase = [
        'nombreJugador', 'apellidoPaterno', 'apellidoMaterno', 'lugarNacimiento', 'curp', 'nui',
        'nacionalidadJugador', 'paisResidencia', 'dondeVividoExtranjero',
        'nacionalidadPadre', 'nacionalidadMadre', 'registroAsociacionExtranjera',
        'nacAbueloPaterno', 'nacAbuelaPaterna', 'nacAbueloMaterno', 'nacAbuelaMaterna',
        'juegoClubExtranjero'
      ];
      if (fieldsToUppercase.includes(field)) {
        formattedValue = value.toUpperCase();
      }
    }
    updatePlayerDatos(currentPlayerIndex, { [field]: formattedValue });
  };

  const handleBlur = () => {
    const player = jugadores[currentPlayerIndex];
    if (player?.slotId) {
      guardarBorradorEnBD(player.slotId, player.datos);
    }
  };

  // CARGAR SLOTS Y DATOS DEL EQUIPO
  const fetchTeamInfo = async () => {
    let effectiveTeamId = teamId;
    let inviteData = null;
    let inviteTeamInfo = {};

    try {
      setLoadingSlots(true);

      // 1. Obtener catálogos
      const catalogsData = await teamsService.getCatalogs();
      setCatalogs(catalogsData);

      if (isPublicFlow && !teamId) {
        if (!token) {
          setLinkError(true);
          setLoadingSlots(false);
          return;
        }
        inviteData = await teamsService.getInvitationInfo(token);
        effectiveTeamId = inviteData.equipo_temporal_id;
        setTeamId(effectiveTeamId);
        inviteTeamInfo = {
          equipo: inviteData.nombre_equipo || '',
          liga: inviteData.nombre_liga || '',
          categoria: inviteData.nombre_categoria || 'LIBRE',
          presidente: inviteData.nombre_presidente || 'No disponible'
        };
      }

      if (!effectiveTeamId) {
        if (!isPublicFlow && !location.state?.teamId) {
          setLinkError(true);
        } else if (!isPublicFlow) {
          Swal.fire('Error', 'No se especificó un equipo para el registro.', 'error');
          navigate('/presidente-equipo/dashboard');
        } else {
          setLinkError(true);
        }
        return;
      }

      // 2. Obtener slots y borradores
      const slotsResponse = await teamsService.getAvailableSlots(effectiveTeamId);
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
        const mergedDatos = {
          ...defaultPlayerDatos,
          ...datos,
          equipo: datos.equipo || inviteTeamInfo.equipo || slotsResponse.nombre_equipo || '',
          liga: datos.liga || inviteTeamInfo.liga || slotsResponse.nombre_liga || '',
          categoria: datos.categoria || inviteTeamInfo.categoria || slotsResponse.nombre_categoria || 'LIBRE',
          presidente: slotsResponse.nombre_presidente || inviteTeamInfo.presidente || 'No disponible'
        };

        return {
          numero: i + 1,
          slotId: slot.slot_id,
          estado: slot.completo ? 'COMPLETO' : (slot.datos_borrador ? 'EN_CAPTURA' : 'VACIO'),
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
        Swal.fire('Error', err.response?.data?.detail || 'No se pudo cargar la información del equipo y slots.', 'error');
      }
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    fetchTeamInfo();
  }, [teamId, token, isPublicFlow]);

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
  }, [currentPlayerIndex, jugadores]);

  const playerStatusConfig = {
    VACIO: { icon: '⚪', label: 'VACÍO', bg: '#f8fafc', color: '#475569' },
    EN_CAPTURA: { icon: '🟡', label: 'EN CAPTURA', bg: '#fffbeb', color: '#92400e' },
    COMPLETO: { icon: '🟢', label: 'COMPLETO', bg: '#dcfce7', color: '#166534' }
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
      safeSetField(form, 'Teléfono', currentDatos.telefono);
      safeSetField(form, 'Asociación', 'AFAEM');
      safeSetField(form, 'fill_24', 'AFAEM');

      // Tipo de Afiliación (Tipo y fill_20) → nombre del seguro seleccionado
      const seguroSel = catalogs?.seguros?.find(s => String(s.id) === String(currentSeguroId));
      if (seguroSel?.nombre) {
        try { form.getTextField('Tipo')?.setText(seguroSel.nombre.toUpperCase()); } catch (_) { }
        try { form.getTextField('fill_20')?.setText(seguroSel.nombre.toUpperCase()); } catch (_) { }
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

  // PRE-GUARDAR Y DESCARGAR FORMATO
  const handleGuardar = async (e) => {
    if (e) e.preventDefault();

    if (!currentSeguroId) {
      Swal.fire('Atención', 'Debe seleccionar un tipo de seguro/slot disponible.', 'warning');
      return;
    }

    const requiredFields = [
      { name: 'nombreJugador', label: 'Nombres' },
      { name: 'apellidoPaterno', label: 'Apellido Paterno' },
      { name: 'apellidoMaterno', label: 'Apellido Materno' },
      { name: 'curp', label: 'CURP' },
      { name: 'fechaNacimiento', label: 'Fecha de Nacimiento' },
      { name: 'lugarNacimiento', label: 'Lugar de Nacimiento' },
      { name: 'genero', label: 'Sexo' },
      { name: 'correo', label: 'Correo electrónico' },
      { name: 'telefono', label: 'Teléfono' },
      { name: 'numCamiseta', label: '# Camiseta' },
      { name: 'posicion', label: 'Posición en el campo' },
      { name: 'nui', label: 'NUI' }
    ];

    const missingFields = requiredFields.filter(f => {
      const val = currentDatos[f.name];
      return val === undefined || val === null || String(val).trim() === '';
    });

    if (missingFields.length > 0) {
      const labels = missingFields.map(f => f.label).join(', ');
      Swal.fire('Atención', `Los siguientes campos son obligatorios: ${labels}.`, 'warning');
      return;
    }

    if (currentDatos.curp.length !== 18) {
      Swal.fire('Atención', 'El campo CURP debe tener exactamente 18 caracteres.', 'warning');
      return;
    }

    // Validar campos de extranjero si aplica
    if (currentDatos.esForaneo) {
      const {
        nacionalidadJugador, paisResidencia, dondeVividoExtranjero, haVividoExtranjero,
        nacionalidadPadre, nacionalidadMadre, registroAsociacionExtranjera,
        nacAbueloPaterno, nacAbuelaPaterna, nacAbueloMaterno, nacAbuelaMaterna,
        juegoClubExtranjero
      } = currentDatos;

      const basicosForaneo = [
        nacionalidadJugador, paisResidencia, nacionalidadPadre, nacionalidadMadre,
        registroAsociacionExtranjera, nacAbueloPaterno, nacAbuelaPaterna,
        nacAbueloMaterno, nacAbuelaMaterna, juegoClubExtranjero
      ];

      const completado = basicosForaneo.every(campo => String(campo || '').trim() !== '');
      const vivoValid = !haVividoExtranjero || (haVividoExtranjero && String(dondeVividoExtranjero || '').trim() !== '');

      if (!completado || !vivoValid) {
        Swal.fire('Atención', 'Al seleccionar que el jugador es extranjero, TODOS los campos de antecedentes internacionales deben ser llenados.', 'warning');
        return;
      }
    }

    // Abrir modal para subir el formato
    setShowFinishModal(true);
  };

  // ENVÍO FINAL A BACKEND
  const handleFinalizarInscripcion = async () => {
    setUploading(true);
    Swal.fire({
      title: 'Registrando Jugador',
      text: 'Consumiendo slot y subiendo documentos al servidor...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const player = jugadores[currentPlayerIndex];
      const formData = new FormData();
      formData.append('equipo_temporal_id', parseInt(teamId, 10));
      formData.append('nombre', (player.datos.nombreJugador || '').toString().trim());
      formData.append('primer_apellido', (player.datos.apellidoPaterno || '').toString().trim());
      formData.append('segundo_apellido', (player.datos.apellidoMaterno || '').toString().trim());
      formData.append('CURP', (player.datos.curp || '').toString().toUpperCase());
      formData.append('sexo_id', parseInt(player.datos.genero, 10));
      formData.append('fecha_nacimiento', player.datos.fechaNacimiento);
      formData.append('lugar_nacimiento', player.datos.lugarNacimiento || 'MÉXICO');
      formData.append('correo', player.datos.correo || '');
      formData.append('telefono', player.datos.telefono || '');
      formData.append('posicion', player.datos.posicion || '3');
      formData.append('num_camiseta', player.datos.numCamiseta || '0');
      formData.append('seguro_id', parseInt(player.seguroId, 10));

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
      if (esPlayerMinor(player.datos.fechaNacimiento)) {
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
        text: 'El slot se ha completado y los documentos se guardaron en el servidor.'
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
          <img
            src={AfaemLogo}
            alt="AFAEM"
            style={{
              width: '80px',
              height: 'auto',
              margin: '0 auto 24px',
              display: 'block',
              opacity: 0.85,
            }}
          />

          {/* Ícono de Error */}
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
        <Loader text="Cargando información del equipo y slots disponibles..." />
      </div>
    );
  }

  const sinSlots = slotsInfo.disponibles === 0;

  return (
    <div className="dashboard-content">
      <style>{hoverStyles}</style>

      {/* HEADER */}
      <div style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
        {!isPublicFlow && (
          <button
            onClick={() => {
              const tieneDatos = Object.values(currentDocuments).some(d => d !== null) || currentDatos.nombreJugador;
              if (tieneDatos) {
                Swal.fire({
                  title: '¿Abandonar registro?',
                  text: "Se perderán los documentos subidos y el progreso actual (excepto los campos guardados en la BD).",
                  icon: 'warning',
                  showCancelButton: true,
                  confirmButtonColor: '#ef4444',
                  cancelButtonColor: '#64748b',
                  confirmButtonText: 'Sí, salir',
                  cancelButtonText: 'Continuar registro'
                }).then((result) => {
                  if (result.isConfirmed) navigate(-1);
                });
              } else {
                navigate(-1);
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
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Registrar y guardar borradores de tus jugadores libremente.</p>
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
                  <span style={{ fontWeight: '800', fontSize: '13px' }}>Slot {idx + 1} de {jugadores.length}</span>
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
          <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', fontWeight: '600' }}>Slots Disponibles</span>
          <span style={{ fontSize: '24px', fontWeight: '950', color: sinSlots ? '#ef4444' : '#10b981' }}>
            {slotsInfo.disponibles} / {slotsInfo.total} slots
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
            Todos los slots contratados se han registrado de manera correcta.
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
              <h3 style={{ fontWeight: '800', fontSize: '18px', margin: 0 }}>Este slot ya está completamente registrado</h3>
              <p style={{ fontSize: '13px', margin: '6px 0 0 0', color: '#047857' }}>
                Los datos de este jugador ya fueron enviados y guardados en el sistema oficial. Selecciona otro slot de arriba para editar.
              </p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '30px', borderBottom: '1px solid #f1f5f9', paddingBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p className="required-legend" style={{ margin: 0 }}>
                  <span className="required-star">*</span> Indica que el campo es obligatorio.
                </p>
              </div>

              {/* PASO 1: SELECCION DE SEGURO / SLOT A CONSUMIR */}
              <section style={{ marginBottom: '45px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '24px' }}>
                  <StepBadge number="1" isActive={!currentSeguroId} isDone={!!currentSeguroId} />
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Seguro pagado por asignar</h3>
                </div>

                <div style={{ animation: 'slideUp 0.4s ease', maxWidth: '800px', margin: '0 auto' }}>
                  <div className="card" style={{ padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <label className="form-label" style={{ fontWeight: '700', fontSize: '14px', marginBottom: '12px', display: 'block' }}>
                      Seleccione el seguro comprado que desea para esta inscripción: <span className="required-star">*</span>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                      {slotsData?.seguros?.map((seg) => {
                        const isSelected = String(currentSeguroId) === String(seg.seguro_id);
                        return (
                          <div
                            key={`seguro-card-${seg.seguro_id}`}
                            onClick={() => {
                              updatePlayerSeguro(currentPlayerIndex, String(seg.seguro_id));
                              const updated = { ...currentDatos };
                              if (currentPlayer?.slotId) {
                                guardarBorradorEnBD(currentPlayer.slotId, updated);
                              }
                            }}
                            style={{
                              padding: '16px',
                              borderRadius: '12px',
                              border: isSelected ? '2.5px solid #0b4ea6' : '1px solid #cbd5e1',
                              backgroundColor: isSelected ? '#eff6ff' : 'white',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}
                          >
                            <span style={{ fontSize: '14px', fontWeight: '800', color: isSelected ? '#0b4ea6' : '#1e293b' }}>
                              🛡️ {seg.nombre}
                            </span>
                            <div style={{ marginTop: '5px', display: 'inline-flex', alignSelf: 'start', padding: '2px 8px', borderRadius: '20px', background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: '800' }}>
                              {seg.disponibles} disponibles
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>

              {/* PASO 2: CARGA DE DOCUMENTOS */}
              <section className="fade-in" style={{ marginBottom: '45px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                  <StepBadge number="2" isActive={!Object.values(currentDocuments).some(d => d !== null)} isDone={Object.values(currentDocuments).some(d => d !== null)} />
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

              {/* PASO 3: FORMULARIO DE INFORMACIÓN DEL JUGADOR */}
              <section className="fade-in" style={{ marginBottom: '40px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <StepBadge number="3" isActive={true} isDone={false} />
                    <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', margin: 0 }}>Formulario de afiliación completo</h3>
                  </div>
                </div>

                {/* CAMPOS DEL FORMULARIO */}
                <div className="form-wrapper-responsive" style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>

                  <div className="form-grid-3">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Nombre(s) <span className="required-star">*</span></label>
                      <input type="text" value={currentDatos.nombreJugador} onChange={e => handleFieldChange('nombreJugador', e.target.value)} onBlur={handleBlur} placeholder="Ej. Juan" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Ap. Paterno <span className="required-star">*</span></label>
                      <input type="text" value={currentDatos.apellidoPaterno} onChange={e => handleFieldChange('apellidoPaterno', e.target.value)} onBlur={handleBlur} placeholder="Ej. Pérez" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Ap. Materno <span className="required-star">*</span></label>
                      <input type="text" value={currentDatos.apellidoMaterno} onChange={e => handleFieldChange('apellidoMaterno', e.target.value)} onBlur={handleBlur} placeholder="Ej. Gómez" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                    </div>
                  </div>

                  <div className="form-grid-3">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}># Camiseta <span className="required-star">*</span></label>
                      <input type="number" value={currentDatos.numCamiseta} onChange={e => handleFieldChange('numCamiseta', e.target.value)} onBlur={handleBlur} placeholder="Ej. 10" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Posición en el campo <span className="required-star">*</span></label>
                      <select
                        value={currentDatos.posicion}
                        onChange={e => {
                          const val = parseInt(e.target.value) || '';
                          handleFieldChange('posicion', val);
                          if (currentPlayer?.slotId) {
                            guardarBorradorEnBD(currentPlayer.slotId, { ...currentDatos, posicion: val });
                          }
                        }}
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: 'white' }}
                      >
                        <option value="">Posición...</option>
                        {(catalogs?.roles_equipo || []).map(r => (
                          <option key={r.id} value={r.id}>{r.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>NUI <span className="required-star">*</span></label>
                      <input type="text" value={currentDatos.nui || ''} onChange={e => handleFieldChange('nui', e.target.value)} onBlur={handleBlur} placeholder="Ej. 123" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '15px', marginBottom: '25px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>CURP<span className="required-star">*</span></label>
                      <input
                        type="text"
                        value={currentDatos.curp || ''}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          let sId = currentDatos.genero;
                          if (val.length >= 11) {
                            const char = val.charAt(10);
                            if (char === 'M') sId = '2'; // Femenino
                            else if (char === 'H') sId = '1'; // Masculino
                          }
                          updatePlayerDatos(currentPlayerIndex, { curp: val, genero: sId });
                        }}
                        onBlur={handleBlur}
                        placeholder="ABCD..."
                        maxLength="18"
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                      />
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
                        onChange={e => handleFieldChange('fechaNacimiento', e.target.value)}
                        onBlur={handleBlur}
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Lugar de Nacimiento <span className="required-star">*</span></label>
                      <input type="text" value={currentDatos.lugarNacimiento || ''} onChange={e => handleFieldChange('lugarNacimiento', e.target.value)} onBlur={handleBlur} placeholder="Ej. Monterrey, NL" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Sexo <span className="required-star">*</span></label>
                      <select
                        value={currentDatos.genero || ""}
                        onChange={e => {
                          handleFieldChange('genero', e.target.value);
                          if (currentPlayer?.slotId) {
                            guardarBorradorEnBD(currentPlayer.slotId, { ...currentDatos, genero: e.target.value });
                          }
                        }}
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: 'white' }}
                      >
                        <option value="">Seleccione...</option>
                        <option value="1">MASCULINO</option>
                        <option value="2">FEMENINO</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Correo electrónico <span className="required-star">*</span></label>
                      <input type="email" value={currentDatos.correo} onChange={e => handleFieldChange('correo', e.target.value)} onBlur={handleBlur} placeholder="correo@ejemplo.com" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}># de Teléfono <span className="required-star">*</span></label>
                      <input type="tel" value={currentDatos.telefono} onChange={e => handleFieldChange('telefono', e.target.value)} onBlur={handleBlur} placeholder="10 dígitos numéricos" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                    </div>
                  </div>

                  {/* Selector de Nacionalidad */}
                  <section className="fade-in" style={{ marginBottom: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                      <FaGlobeAmericas style={{ color: '#0b4ea6', fontSize: '20px' }} />
                      <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', margin: 0 }}>Nacionalidad del jugador</h3>
                    </div>

                    <div style={{
                      display: 'flex',
                      background: '#f1f5f9',
                      padding: '4px',
                      borderRadius: '12px',
                      width: 'fit-content'
                    }}>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...currentDatos, esForaneo: false };
                          updatePlayerDatos(currentPlayerIndex, { esForaneo: false });
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
                  </section>

                  {/* ANTECEDENTES INTERNACIONALES (FORÁNEO) */}
                  <div style={{ backgroundColor: '#fff7ed', border: '1px solid #ffedd5', padding: '30px', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', marginTop: '20px' }}>
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
                            alCambiar={val => handleFieldChange('nacionalidadJugador', val)}
                            alPerderEnfoque={handleBlur}
                          />
                          <EntradaFormulario
                            etiqueta="País de residencia actual"
                            valor={currentDatos.paisResidencia}
                            alCambiar={val => handleFieldChange('paisResidencia', val)}
                            alPerderEnfoque={handleBlur}
                          />
                        </div>

                        <div className="form-grid-2-align-end">
                          <EntradaSeleccion
                            etiqueta="¿El jugador ha vivido en el extranjero?"
                            valor={currentDatos.haVividoExtranjero ? '1' : '0'}
                            alCambiar={val => {
                              const boolVal = val === '1';
                              handleFieldChange('haVividoExtranjero', boolVal);
                              if (currentPlayer?.slotId) {
                                guardarBorradorEnBD(currentPlayer.slotId, { ...currentDatos, haVividoExtranjero: boolVal });
                              }
                            }}
                            opciones={[{ valor: '0', etiqueta: 'No' }, { valor: '1', etiqueta: 'Sí' }]}
                            obligatorio={true}
                          />
                          {currentDatos.haVividoExtranjero && (
                            <EntradaFormulario
                              etiqueta="¿En qué país?"
                              valor={currentDatos.dondeVividoExtranjero}
                              alCambiar={val => handleFieldChange('dondeVividoExtranjero', val)}
                              alPerderEnfoque={handleBlur}
                              obligatorio={true}
                            />
                          )}
                        </div>

                        <div className="form-grid-2-foraneo">
                          <EntradaFormulario
                            etiqueta="Nacionalidad del padre"
                            valor={currentDatos.nacionalidadPadre}
                            alCambiar={val => handleFieldChange('nacionalidadPadre', val)}
                            alPerderEnfoque={handleBlur}
                          />
                          <EntradaFormulario
                            etiqueta="Nacionalidad de la madre"
                            valor={currentDatos.nacionalidadMadre}
                            alCambiar={val => handleFieldChange('nacionalidadMadre', val)}
                            alPerderEnfoque={handleBlur}
                          />
                        </div>

                        <EntradaFormulario
                          etiqueta="El jugador ha sido registrado por la Asociación Nacional de Fútbol (en el extranjero) como jugador amateur o profesional, previo a su solitud de registro en la FMF (Si - No)"
                          valor={currentDatos.registroAsociacionExtranjera}
                          alCambiar={val => handleFieldChange('registroAsociacionExtranjera', val)}
                          alPerderEnfoque={handleBlur}
                          filas={2}
                          obligatorio={true}
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                          <EntradaFormulario etiqueta="Nac. Abuelo Paterno" valor={currentDatos.nacAbueloPaterno} alCambiar={val => handleFieldChange('nacAbueloPaterno', val)} alPerderEnfoque={handleBlur} />
                          <EntradaFormulario etiqueta="Nac. Abuela Paterna" valor={currentDatos.nacAbuelaPaterna} alCambiar={val => handleFieldChange('nacAbuelaPaterna', val)} alPerderEnfoque={handleBlur} />
                          <EntradaFormulario etiqueta="Nac. Abuelo Materno" valor={currentDatos.nacAbueloMaterno} alCambiar={val => handleFieldChange('nacAbueloMaterno', val)} alPerderEnfoque={handleBlur} />
                          <EntradaFormulario etiqueta="Nac. Abuela Materna" valor={currentDatos.nacAbuelaMaterna} alCambiar={val => handleFieldChange('nacAbuelaMaterna', val)} alPerderEnfoque={handleBlur} />
                        </div>

                        <EntradaFormulario
                          etiqueta="El jugador ha jugado en un Club extranjero y participado en Torneos y/o competencias internacionales, escolares o de recreo como campamentos estacionales, cursos, etc"
                          valor={currentDatos.juegoClubExtranjero}
                          alCambiar={val => handleFieldChange('juegoClubExtranjero', val)}
                          alPerderEnfoque={handleBlur}
                          filas={3}
                          obligatorio={true}
                        />
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '20px' }}>
                        <p style={{ margin: 0, fontSize: '13px', color: '#9a3412', fontStyle: 'italic' }}>
                          Si el jugador es extranjero, habilite esta opción para completar los antecedentes internacionales.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ACCIONES FINALES */}
                <div className="btn-container-responsive">
                  {!isPublicFlow && (
                    <BotonSecundario
                      etiqueta="Cancelar y volver"
                      alHacerClick={() => navigate(-1)}
                      estilo={{ minWidth: 'var(--btn-min-width, 200px)', width: 'var(--btn-width, auto)' }}
                    />
                  )}
                  <BotonPrimario
                    etiqueta={uploading ? "Procesando..." : "Descargar formato y continuar"}
                    icono={<FaSave />}
                    alHacerClick={handleGuardar}
                    deshabilitado={uploading}
                    estilo={{ minWidth: 'var(--btn-min-width, 300px)', width: 'var(--btn-width, auto)' }}
                  />
                </div>
              </section>
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

      {/* MODAL DE FINALIZACIÓN DE REGISTRO */}
      <Modal
        estaAbierto={showFinishModal}
        titulo="Finalizar Inscripción del Jugador"
        alCerrar={() => setShowFinishModal(false)}
        pie={
          <>
            <BotonSecundario
              etiqueta="Atrás"
              alHacerClick={() => setShowFinishModal(false)}
            />
            <BotonPrimario
              etiqueta={uploading ? "Procesando..." : "Finalizar Registro"}
              alHacerClick={handleFinalizarInscripcion}
              deshabilitado={uploading}
            />
          </>
        }
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', justifyContent: 'center' }}>
            <button
              onClick={() => handleDownloadFormato()}
              style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #0b4ea6, #063f82)', color: 'white', fontWeight: '800', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              📥 Descargar Formato
            </button>
          </div>
          <div style={{
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '25px',
            color: '#0369a1',
            fontSize: '14px',
            lineHeight: '1.6'
          }}>
            <p style={{ margin: 0, fontWeight: '700', marginBottom: '10px' }}>
              Formato de Afiliación — Subida Opcional
            </p>
            <p style={{ margin: 0 }}>
              Descarga el formato pre-llenado con el botón de arriba, imprímelo, fírmalo y escanéalo para subirlo.
              <strong> Si aún no tienes el formato firmado, puedes continuar sin subirlo ahora</strong> y cargarlo después.
            </p>
          </div>

          <div
            onClick={() => document.getElementById('final-signed-form').click()}
            style={{
              border: signedForm ? '2px solid #10b981' : '2px dashed #0ea5e9',
              borderRadius: '20px',
              padding: '40px 20px',
              backgroundColor: signedForm ? '#f0fdf4' : '#f8fafc',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            {signedForm ? (
              <div style={{ color: '#10b981' }}>
                <FaFilePdf style={{ fontSize: '50px', marginBottom: '15px' }} />
                <p style={{ margin: 0, fontWeight: '700' }}>{signedForm.name}</p>
                <p style={{ margin: '5px 0 0 0', fontSize: '12px' }}>Archivo listo para enviar</p>
              </div>
            ) : (
              <div style={{ color: '#0ea5e9' }}>
                <FaUpload style={{ fontSize: '50px', marginBottom: '15px' }} />
                <p style={{ margin: 0, fontWeight: '700' }}>Haga clic para subir el formato firmado (Opcional)</p>
                <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#64748b' }}>Solo se aceptan archivos PDF</p>
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
      </Modal>

      {/* Notificación de autoguardado */}
      <div className={`toast-auto-save ${toastVisible ? 'show' : ''}`}>
        <FaCheckCircle style={{ color: '#10b981', fontSize: '16px' }} />
        <span>Borrador guardado</span>
      </div>
    </div>
  );
}
