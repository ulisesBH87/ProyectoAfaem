import COLORS from '../../styles/colors';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '../../routes/paths';
import Swal from 'sweetalert2';
import {
  FaArrowLeft,
  FaSave,
  FaUpload,
  FaFilePdf,
  FaSyncAlt,
  FaCheckCircle,
  FaSearchPlus,
  FaGlobeAmericas,
  FaTrash
} from 'react-icons/fa';
import { PDFDocument } from 'pdf-lib';
import { validarFotografia } from '../../services/foto';
import CameraCaptureModal from '../../components/Common/CameraCaptureModal';
import adminService from '../../services/admin';
import teamsService from '../../services/teams';
import { verificarCurp } from '../../services/auth';
import { API_BASE } from '../../config/config';
import { openSecurePath } from '../../utils/secureFetch';
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

const normalizarNombreSeguro = (nombre) => {
  if (!nombre) return '';
  return nombre.toUpperCase().replace(/[\u0022\u0027]/g, '').trim();
};

const DETALLES_SEGUROS = {
  'TIPO A': {
    nombre: 'TIPO "A"',
    precio: 240,
    poliza: '2922500000281',
    vigencia: 'ENERO 2026 – DICIEMBRE 2026',
    alcance: 'Se ampara un juego por semana (máximo 2), traslados directos e ininterrumpidos de la casa al partido de fútbol (supervisado y autorizado para la realización del evento en ese día de la semana) y viceversa. Ampara exclusivamente traslados dentro del mismo estado.',
    beneficios: [
      'Participación en Torneos Estatales',
      'Participación en Torneos Regionales',
      'Participación en Torneos Nacionales',
      'Participación en Campeonatos Nacionales',
      'Participación en Torneos Federados',
      'Participación en Capacitaciones',
      'Descuentos en Material Deportivo',
      'Expediente deportivo Oficial en la FMF',
      'Activaciones y Experiencias con Patrocinadores',
      'Descuentos en la Compra de Balones Oficiales del Sector Amateur',
      'Seguro de Gastos Médicos por Accidente'
    ],
    coberturas: [
      { cobertura: 'Indemnización por fallecimiento accidental', monto: '$50,000.00' },
      { cobertura: 'Reembolso de Gastos Médicos por Accidente', monto: '$25,000.00' },
      { cobertura: 'Tope de Rodilla', monto: '$25,000.00' },
      { cobertura: 'Deducible', monto: '$1,500.00' }
    ]
  },
  'TIPO B': {
    nombre: 'TIPO "B"',
    precio: 350,
    poliza: '2922500000283',
    vigencia: 'ENERO 2026 – DICIEMBRE 2026',
    alcance: 'Se ampara un juego por semana (máximo 2), traslados directos e ininterrumpidos de la casa al partido de fútbol (supervisado y autorizado para la realización del evento en ese día de la semana) y viceversa. Ampara exclusivamente traslados dentro del mismo estado.',
    beneficios: [
      'Participación en Torneos Estatales',
      'Participación en Torneos Regionales',
      'Participación en Torneos Nacionales',
      'Participación en Campeonatos Nacionales',
      'Participación en Torneos Federados',
      'Participación en Capacitaciones',
      'Descuentos en Material Deportivo',
      'Expediente deportivo Oficial en la FMF',
      'Activaciones y Experiencias con Patrocinadores',
      'Descuentos en la Compra de Balones Oficiales del Sector Amateur',
      'Seguro de Gastos Médicos por Accidente'
    ],
    coberturas: [
      { cobertura: 'Indemnización por fallecimiento accidental', monto: '$100,000.00' },
      { cobertura: 'Reembolso de Gastos Médicos por Accidente', monto: '$50,000.00' },
      { cobertura: 'Tope de Rodilla', monto: '$30,000.00' },
      { cobertura: 'Deducible', monto: '$1,500.00' }
    ]
  },
  'TIPO F': {
    nombre: 'TIPO "F"',
    precio: 670,
    poliza: '2922500000282',
    vigencia: 'ENERO 2026 – DICIEMBRE 2026',
    alcance: 'Se ampara los entrenamientos, partidos y torneos de futbol organizados y supervisados por la FEMEXFUT, adicionalmente se amparan los traslados desde el domicilio al campo de juego y viceversa. Se amparan los traslados entre estados.',
    beneficios: [
      'Participación en Torneos Estatales',
      'Participación en Torneos Regionales',
      'Participación en Torneos Nacionales',
      'Participación en Campeonatos Nacionales',
      'Participación en Torneos Federados',
      'Participación en Capacitaciones',
      'Descuentos en Material Deportivo',
      'Expediente deportivo Oficial en la FMF',
      'Activaciones y Experiencias con Patrocinadores',
      'Descuentos en la Compra de Balones Oficiales del Sector Amateur',
      'Seguro de Gastos Médicos por Accidente'
    ],
    coberturas: [
      { cobertura: 'Indemnización por fallecimiento accidental', monto: '$200,000.00' },
      { cobertura: 'Reembolso de Gastos Médicos por Accidente', monto: '$100,000.00' },
      { cobertura: 'Tope de Rodilla', monto: '$30,000.00' },
      { cobertura: 'Deducible', monto: '$1,500.00' }
    ]
  },
  'TIPO H': {
    nombre: 'TIPO "H"',
    precio: 475,
    poliza: '2922500000286',
    vigencia: 'ENERO 2026 – DICIEMBRE 2026',
    alcance: 'Se ampara los entrenamientos, partidos y torneos de futbol organizados y supervisados por la FEMEXFUT, adicionalmente se amparan los traslados desde el domicilio al campo de juego y viceversa. Se amparan los traslados entre estados.',
    beneficios: [
      'Participación en Torneos Estatales',
      'Participación en Torneos Regionales',
      'Participación en Torneos Nacionales',
      'Participación en Campeonatos Nacionales',
      'Participación en Torneos Federados',
      'Participación en Capacitaciones',
      'Descuentos en Material Deportivo',
      'Expediente deportivo Oficial en la FMF',
      'Activaciones y Experiencias con Patrocinadores',
      'Descuentos en la Compra de Balones Oficiales del Sector Amateur',
      'Seguro de Gastos Médicos por Accidente'
    ],
    coberturas: [
      { cobertura: 'Indemnización por fallecimiento accidental', monto: '$100,000.00' },
      { cobertura: 'Reembolso de Gastos Médicos por Accidente', monto: '$50,000.00' },
      { cobertura: 'Tope de Rodilla', monto: '$30,000.00' },
      { cobertura: 'Deducible', monto: '$1,500.00' }
    ]
  },
  'TIPO G': {
    nombre: 'TIPO "G"',
    precio: 350,
    poliza: '2922500000280',
    vigencia: 'ENERO 2026 – DICIEMBRE 2026',
    alcance: 'Se amparan los traslados de su casa a las ligas, asociaciones y viceversa, y traslados a otras ligas, se cubre dentro de las instalaciones de sus ligas y asociaciones. Se amparan traslados de estado a estado.',
    beneficios: [
      'Participación en Torneos Estatales',
      'Participación en Torneos Regionales',
      'Participación en Torneos Nacionales',
      'Participación en Campeonatos Nacionales',
      'Participación en Torneos Federados',
      'Participación en Capacitaciones',
      'Descuentos en Material Deportivo',
      'Expediente deportivo Oficial en la FMF',
      'Activaciones y Experiencias con Patrocinadores',
      'Descuentos en la Compra de Balones Oficiales del Sector Amateur',
      'Seguro de Gastos Médicos por Accidente'
    ],
    coberturas: [
      { cobertura: 'Indemnización por fallecimiento accidental', monto: '$200,000.00' },
      { cobertura: 'Reembolso de Gastos Médicos por Accidente', monto: '$100,000.00' },
      { cobertura: 'Tope de Rodilla', monto: '$25,000.00' },
      { cobertura: 'Deducible', monto: '$1,500.00' }
    ]
  },
  'BASICA': {
    nombre: 'TIPO "BASICA"',
    precio: 155,
    poliza: 'N/A',
    vigencia: 'ENERO 2026 – DICIEMBRE 2026',
    alcance: 'Esta afiliación no incluye póliza de seguro de gastos médicos por accidente. Solo cubre derechos de participación básica.',
    beneficios: [
      'Participación en Torneos Estatales (Es necesario Afiliación con cobertura de Seguro)',
      'Participación en Torneos Regionales (Es necesario Afiliación con cobertura de Seguro)',
      'Participación en Torneos Nacionales (Es necesario Afiliación con cobertura de Seguro)',
      'Participación en Campeonatos Nacionales (Es necesario Afiliación con cobertura de Seguro)',
      'Participación en Torneos Federados (Es necesario Afiliación con cobertura de Seguro)',
      'Participación en Capacitaciones',
      'Descuentos en Material Deportivo',
      'Expediente deportivo Oficial en la FMF',
      'Activaciones y Experiencias con Patrocinadores',
      'Descuentos en la Compra de Balones Oficiales del Sector Amateur'
    ],
    coberturas: []
  },
  'SIN SEGURO': {
    nombre: 'SIN SEGURO',
    precio: 0,
    poliza: 'N/A',
    vigencia: 'N/A',
    alcance: 'El presidente no cuenta con cobertura médica federada.',
    beneficios: [
      'Sin costo adicional',
      'Registro básico en la plataforma',
      'No incluye seguro de gastos médicos',
      'No incluye derechos de participación deportiva federada activa'
    ],
    coberturas: []
  }
};

// Badge Estilizado para los pasos
const StepBadge = ({ number, isActive, isDone }) => (
  <div style={{
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: isDone ? COLORS.success : (isActive ? COLORS.primary : COLORS.slate200),
    color: (isActive || isDone) ? 'white' : COLORS.slate500,
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

export default function CompletarJugadoresEquipo() {
  const { equipoId } = useParams();
  const navigate = useNavigate();

  // Límites de fecha para el registro de jugadores
  const today = new Date().toISOString().split('T')[0];
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 100);
  const minDateStr = minDate.toISOString().split('T')[0];

  // ESTILO DINÁMICO PARA HOVER Y RESPONSIVIDAD
  const hoverStyles = `
    .document-card:hover .overlay-actions {
      opacity: 1 !important;
    }
    .document-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 15px -3px ${COLORS.shadow10};
    }
    
    .premium-details-card {
      max-width: 1000px;
      margin: 0 auto 30px auto;
      background: linear-gradient(135deg, ${COLORS.slate800} 0%, ${COLORS.slate900} 100%);
      color: white;
      border-radius: 20px;
      padding: 25px 35px;
      box-shadow: 0 10px 15px -3px ${COLORS.shadow28};
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
    }
    
    .main-form-card {
      max-width: 1000px;
      margin: 0 auto;
      background: white;
      border-radius: 24px;
      padding: 40px;
      box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);
      border: 1px solid ${COLORS.slate200};
    }
    
    .no-slots-card {
      max-width: 1000px;
      margin: 0 auto;
      background: white;
      border-radius: 24px;
      padding: 40px;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);
      border: 1px solid ${COLORS.dangerBg};
    }
    
    .form-grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 25px;
    }
    
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
    
    .nacionalidad-toggle {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      background: ${COLORS.slate100};
      padding: 4px;
      border-radius: 12px;
      width: 100%;
      box-sizing: border-box;
    }
    
    .nacionalidad-toggle button {
      flex: 1;
      text-align: center;
      justify-content: center;
    }
    
    .action-buttons-container {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-top: 40px;
    }
    
    .inner-form-card {
      background-color: white;
      padding: 30px;
      border-radius: 16px;
      border: 1px solid ${COLORS.slate200};
      box-shadow: 0 4px 6px -1px ${COLORS.shadow05};
      margin-bottom: 30px;
    }
    
    .info-alert-box {
      background: ${COLORS.skyBgLight};
      border: 1px solid ${COLORS.sky100};
      border-radius: 12px;
      padding: 12px 18px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      color: ${COLORS.skyDarker};
      font-weight: 600;
    }
    
    .doc-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 20px;
    }

    .seguro-modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: ${COLORS.overlaySlateDeep};
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 20px;
      animation: fadeIn 0.2s ease-out;
    }
    
    .seguro-modal-container {
      background-color: ${COLORS.slate800};
      border: 1px solid ${COLORS.overlayWhite10};
      border-radius: 24px;
      width: 100%;
      max-width: 850px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px -12px ${COLORS.overlayBlack};
      display: flex;
      flex-direction: column;
      color: ${COLORS.slate50};
    }

    @media (max-width: 768px) {
      .premium-details-card {
        padding: 16px 20px;
        flex-direction: column;
        align-items: stretch;
        text-align: center;
      }
      
      .premium-details-card > div {
        text-align: center !important;
      }
      
      .premium-details-card > div:last-child {
        text-align: center !important;
        margin-top: 10px;
      }
      
      .main-form-card, .no-slots-card {
        padding: 20px 15px;
        border-radius: 16px;
      }
      
      .form-grid-4, .form-grid-3, .form-grid-2 {
        grid-template-columns: 1fr;
        gap: 12px;
        margin-bottom: 15px;
      }
      
      .action-buttons-container {
        flex-direction: column-reverse;
        gap: 12px;
      }
      
      .action-buttons-container button,
      .action-buttons-container a {
        width: 100% !important;
        min-width: 0 !important;
      }
      
      .inner-form-card {
        padding: 16px 12px;
      }
      
      .info-alert-box {
        flex-direction: column;
        align-items: flex-start;
        padding: 12px;
        font-size: 12px;
      }
      
      .doc-cards-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }
      
      .seguro-modal-container {
        border-radius: 16px;
        max-height: 95vh;
      }
    }

    .phone-input-row {
      display: flex;
      gap: 8px;
      width: 100%;
    }
    
    @media (max-width: 768px) {
      .phone-input-row {
        flex-direction: column;
      }
      .phone-input-row select {
        width: 100% !important;
      }
    }
    
    @media (max-width: 480px) {
      .nacionalidad-toggle {
        flex-direction: column;
      }
    }
    
    @media (max-width: 768px) {
      .abuelos-grid {
        grid-template-columns: 1fr !important;
        gap: 12px !important;
      }
    }
    
    .form-inputs-grid-2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      width: 100%;
    }

    @media (max-width: 768px) {
      .form-inputs-grid-2 {
        grid-template-columns: 1fr !important;
        gap: 15px !important;
      }
      .form-inputs-grid-2 input,
      .form-inputs-grid-2 select {
        width: 100% !important;
        box-sizing: border-box !important;
      }
      .international-info-card {
        padding: 15px !important;
      }
    }
    
    .field-error-msg {
      color: ${COLORS.danger};
      font-size: 11px;
      margin-top: 6px;
      font-weight: 700;
      display: block;
    }
  `;

  // ESTADOS
  const [equipo, setEquipo] = useState(null);
  const [slotsData, setSlotsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSeguroId, setSelectedSeguroId] = useState('');
  const [fillManually, setFillManually] = useState(false);
  const [seguroDetalle, setSeguroDetalle] = useState(null);
  const [registeredPlayers, setRegisteredPlayers] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [isCheckingCurp, setIsCheckingCurp] = useState(false);

  // Obtener el slot actual según el seguro seleccionado
  const currentSlot = React.useMemo(() => {
    if (!slotsData?.rawSlots || !selectedSeguroId) return null;
    return slotsData.rawSlots.find(
      s => String(s.seguro_id) === String(selectedSeguroId) && !s.completo
    );
  }, [selectedSeguroId, slotsData]);

  // Guardar Borrador en la Base de Datos
  const guardarBorradorEnBD = async (newData) => {
    if (!currentSlot?.slot_id) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/equipo-temporal/borrador-jugador`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          slot_id: currentSlot.slot_id,
          datos: newData
        })
      });
    } catch (err) {
      console.warn('No se pudo guardar el borrador:', err);
    }
  };

  useEffect(() => {
    if (seguroDetalle) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [seguroDetalle]);

  const [documents, setDocuments] = useState({
    acta: null,
    ine: null,
    ineTutor: null,
    identificacionMenor: null,
    foto: null
  });

  // Previsualizaciones (URLs locales o base64)
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
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [dragActive, setDragActive] = useState({});

  // Datos extraídos o capturados del jugador
  const [extractedData, setExtractedData] = useState({
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
    nacionalidadJugador: '',
    paisResidencia: '',
    haVividoExtranjero: false,
    dondeVividoExtranjero: '',
    nacionalidadPadre: '',
    nacionalidadMadre: '',
    registroAsociacionExtranjera: '',
    nacAbueloPaterno: '',
    nacAbuelaPaterna: '',
    nacAbueloMaterno: '',
    nacAbuelaMaterna: '',
    juegoClubExtranjero: ''
  });

  // Detección de minoría de edad
  const esMenorDeEdad = React.useMemo(() => {
    if (!extractedData.fechaNacimiento) return false;
    const hoy = new Date();
    const nac = new Date(extractedData.fechaNacimiento);
    if (isNaN(nac.getTime())) return false;
    let edad = hoy.getFullYear() - nac.getFullYear();
    const mDiff = hoy.getMonth() - nac.getMonth();
    if (mDiff < 0 || (mDiff === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad < 18;
  }, [extractedData.fechaNacimiento]);

  // RESPALDO DE DATOS OCR (PARA COMPARACIÓN)
  const [ocrDataOriginal, setOcrDataOriginal] = useState(null);
  const [failedPhoto, setFailedPhoto] = useState(null);

  const [showFinishModal, setShowFinishModal] = useState(false);
  const [signedForm, setSignedForm] = useState(null);
  const [previewDoc, setPreviewDoc] = useState({ open: false, url: '', type: '', title: '' });
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [missingOcrFields, setMissingOcrFields] = useState([]);
  const [isDraggingSignedForm, setIsDraggingSignedForm] = useState(false);

  const handleResetForm = async () => {
    const result = await Swal.fire({
      title: '¿Limpiar formulario?',
      text: 'Se borrarán todos los datos capturados de este jugador. Los documentos subidos no se eliminarán con esta opción, pero sí toda la información del formulario.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, limpiar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: COLORS.danger,
      cancelButtonColor: COLORS.slate400
    });

    if (result.isConfirmed) {
      const resetDatos = {
        nombreJugador: '',
        apellidoPaterno: '',
        apellidoMaterno: '',
        curp: '',
        genero: '1',
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
      setExtractedData(resetDatos);
      setValidationErrors({});

      // Guardar borrador vacío en BD si existe slot de borrador
      const slotConBorrador = slotsData?.rawSlots?.find(
        s => String(s.seguro_id) === String(selectedSeguroId) && !s.completo
      );
      if (slotConBorrador?.slot_id) {
        guardarBorradorEnBD(resetDatos);
      }

      Swal.fire({
        title: 'Formulario Limpiado',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    }
  };

  const handleRemoveDocument = async (docKey) => {
    const result = await Swal.fire({
      title: '¿Quitar documento?',
      text: 'Se eliminará el documento cargado actualmente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: COLORS.danger,
      cancelButtonColor: COLORS.slate400
    });
    if (result.isConfirmed) {
      setDocuments(prev => ({ ...prev, [docKey]: null }));
      setPreviews(prev => ({ ...prev, [docKey]: null }));
    }
  };

  const [ordenAmpliacion, setOrdenAmpliacion] = useState(null);
  const [cargandoOrdenAmpliacion, setCargandoOrdenAmpliacion] = useState(false);

  // Estados para creación de ampliación administrativa
  const [numJugadoresAmpliacion, setNumJugadoresAmpliacion] = useState(1);
  const [asignacionSegurosAmpliacion, setAsignacionSegurosAmpliacion] = useState({});
  const [aprobarAutomaticamente, setAprobarAutomaticamente] = useState(true);
  const [procesandoAmpliacionAdmin, setProcesandoAmpliacionAdmin] = useState(false);
  const [afiliacionesCatalogo, setAfiliacionesCatalogo] = useState([]);

  const getSeguroTipoPersonaId = (seguro) => Number(seguro?.TipoPersonaId ?? seguro?.tipoPersonaId ?? 0);
  const segurosJugador = (catalogs?.seguros || []).filter(seguro => {
    const nombreUpper = seguro?.nombre?.toUpperCase()?.trim() || '';
    const tipoPersonaId = getSeguroTipoPersonaId(seguro);
    return (!['TIPO G', 'SIN SEGURO'].includes(nombreUpper) && tipoPersonaId !== 2) || tipoPersonaId === 4;
  });

  const abrirModalDetalle = (seguro) => {
    setSeguroDetalle(seguro);
  };

  const validarFechaNacimiento = (fechaStr) => {
    if (!fechaStr) {
      return 'La fecha de nacimiento es obligatoria.';
    }

    const regexISO = /^\d{4}-\d{2}-\d{2}$/;
    const regexSlash = /^\d{2}\/\d{2}\/\d{4}$/;

    let dateObj = null;
    let year = null;
    let month = null;
    let day = null;

    if (regexISO.test(fechaStr)) {
      const parts = fechaStr.split('-');
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1; // 0-indexed
      day = parseInt(parts[2], 10);
      dateObj = new Date(year, month, day);
    } else if (regexSlash.test(fechaStr)) {
      const parts = fechaStr.split('/');
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
      dateObj = new Date(year, month, day);
    } else {
      return 'Ingresa una fecha válida.';
    }

    if (
      !dateObj ||
      isNaN(dateObj.getTime()) ||
      dateObj.getFullYear() !== year ||
      dateObj.getMonth() !== month ||
      dateObj.getDate() !== day
    ) {
      return 'Ingresa una fecha válida.';
    }

    if (year < 1900) {
      return 'El año debe ser igual o mayor a 1900.';
    }

    const hoy = new Date();
    const hoyDateOnly = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const birthDateOnly = new Date(year, month, day);
    if (birthDateOnly > hoyDateOnly) {
      return 'La fecha de nacimiento no puede ser futura.';
    }

    let edad = hoy.getFullYear() - year;
    const mDiff = hoy.getMonth() - month;
    if (mDiff < 0 || (mDiff === 0 && hoy.getDate() < day)) {
      edad--;
    }

    if (edad < 2) {
      return 'El jugador debe tener al menos 2 años de edad.';
    }

    if (edad > 125) {
      return 'Ingresa una fecha válida.';
    }

    return null;
  };

  const obtenerDuplicadoCamiseta = (numeroCamiseta) => {
    if (!numeroCamiseta || String(numeroCamiseta).trim() === '') return null;
    const camisetaVal = parseInt(numeroCamiseta, 10);
    return registeredPlayers.find(p =>
      p.NumeroCamiseta !== undefined && p.NumeroCamiseta !== null &&
      parseInt(p.NumeroCamiseta, 10) === camisetaVal
    );
  };

  const obtenerDuplicadoPosicion = (posicionId) => {
    return null;
  };

  const obtenerDuplicadoCURP = (curpVal) => {
    if (!curpVal || String(curpVal).trim() === '') return null;
    const curpUpper = curpVal.trim().toUpperCase();
    return registeredPlayers.find(p =>
      p.CURP && p.CURP.toUpperCase() === curpUpper
    );
  };

  const handleBlur = (field) => {
    const datos = { ...extractedData };

    if (field === 'fechaNacimiento' || !field) {
      const dateError = validarFechaNacimiento(datos.fechaNacimiento);
      setValidationErrors(prev => ({
        ...prev,
        fechaNacimiento: dateError
      }));
      if (dateError && field === 'fechaNacimiento') {
        Swal.fire({
          title: 'Fecha de nacimiento inválida',
          text: dateError,
          icon: 'warning',
          confirmButtonColor: COLORS.primary
        });
        setExtractedData(prev => ({ ...prev, fechaNacimiento: '' }));
      }
    }

    if (field === 'curp' || !field) {
      if (datos.curp) {
        if (datos.curp.length !== 18) {
          setValidationErrors(prev => ({ ...prev, curp: 'El CURP debe tener exactamente 18 caracteres.' }));
        } else {
          const duplicate = obtenerDuplicadoCURP(datos.curp);
          if (duplicate) {
            Swal.fire({
              title: 'CURP duplicado',
              text: `La CURP ya está asignada al Jugador ${duplicate.NombreCompleto || 'del equipo'}. Por favor, ingresa una diferente.`,
              icon: 'warning',
              confirmButtonColor: COLORS.primary
            });
            setExtractedData(prev => ({ ...prev, curp: '' }));
            setValidationErrors(prev => ({ ...prev, curp: null }));
          } else {
            setValidationErrors(prev => ({ ...prev, curp: null }));
          }
        }
      }
    }
  };

  // DETERMINACIÓN DE PASOS
  const isStep1Done = !!selectedSeguroId;
  const isStep2Done = Object.values(documents).some(d => d !== null);
  const showStep2 = isStep1Done;
  const showStep3 = isStep2Done || true; // El paso 3 siempre se muestra una vez seleccionado el seguro

  // Cargar catálogos, detalles de equipo y disponibilidad de slots
  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);

        // 1. Obtener catálogos y afiliaciones
        const catalogsData = await teamsService.getCatalogs();
        setCatalogs(catalogsData);
        try {
          const afData = await adminService.getAfiliaciones();
          setAfiliacionesCatalogo(afData);
        } catch (e) {
          console.error("No se pudo cargar afiliaciones", e);
        }

        // 2. Obtener datos del equipo del directorio
        const equiposList = await adminService.getEquiposDirectorio();
        const targetTeam = equiposList.find(e => String(e.EquipoId) === String(equipoId));
        if (!targetTeam) {
          throw new Error('No se encontró el equipo en el directorio.');
        }
        setEquipo(targetTeam);

        // 3. Verificar slots disponibles
        const slotsResponse = await teamsService.checkTeamSlots(equipoId);
        if (slotsResponse?.equipo_temporal_id) {
          try {
            const detailSlots = await teamsService.getAvailableSlots(slotsResponse.equipo_temporal_id);
            setSlotsData({
              ...slotsResponse,
              rawSlots: detailSlots.slots || []
            });
          } catch (errSlots) {
            console.error("Error al obtener detalle de slots:", errSlots);
            setSlotsData(slotsResponse);
          }
        } else {
          setSlotsData(slotsResponse);
        }

        // Preseleccionar primer seguro disponible si existe
        if (slotsResponse?.seguros_disponibles?.length > 0) {
          setSelectedSeguroId(String(slotsResponse.seguros_disponibles[0].SeguroId));
        }

        // 4. Si no hay slots, verificamos si existe orden de ampliación
        if (slotsResponse?.slots_disponibles === 0 || slotsResponse?.hay_slots === false) {
          setCargandoOrdenAmpliacion(true);
          try {
            const ampliacionData = await adminService.checkOrdenAmpliacionAdmin(equipoId);
            setOrdenAmpliacion(ampliacionData);
          } catch (error) {
            console.error("Error al cargar orden de ampliación:", error);
          } finally {
            setCargandoOrdenAmpliacion(false);
          }
        }

        // 5. Cargar jugadores registrados del equipo para validaciones
        try {
          const allPlayers = await teamsService.getUserPlayersReal();
          const jugList = (allPlayers || []).filter(
            p => String(p.EquipoId) === String(equipoId)
          );
          setRegisteredPlayers(jugList);
        } catch (e) {
          console.error("Error al cargar jugadores del equipo:", e);
        }

      } catch (error) {
        console.error("Error al iniciar datos:", error);
        Swal.fire('Error', error.message || 'No se pudo cargar la información del equipo.', 'error');
      } finally {
        setLoading(false);
        setLoadingCatalogs(false);
      }
    };
    initData();
  }, [equipoId]);

  // Autovalidación de CURP con base de datos en tiempo real
  useEffect(() => {
    const curp = (extractedData.curp || '').trim().toUpperCase();
    if (curp.length === 18) {
      setIsCheckingCurp(true);
      const timer = setTimeout(async () => {
        try {
          const localDup = obtenerDuplicadoCURP(curp);
          if (localDup) {
            setValidationErrors(prev => ({ ...prev, curp: 'Esta CURP ya se encuentra registrada.' }));
            setIsCheckingCurp(false);
            return;
          }
          const res = await verificarCurp(curp);
          if (res.existe) {
            setValidationErrors(prev => ({ ...prev, curp: 'Esta CURP ya se encuentra registrada.' }));
          } else {
            setValidationErrors(prev => ({ ...prev, curp: null }));
          }
        } catch (error) {
          console.error("Error al verificar CURP:", error);
        } finally {
          setIsCheckingCurp(false);
        }
      }, 500);

      return () => clearTimeout(timer);
    } else if (curp.length > 0) {
      setValidationErrors(prev => ({ ...prev, curp: 'El CURP debe tener exactamente 18 caracteres.' }));
    } else {
      setValidationErrors(prev => ({ ...prev, curp: null }));
    }
  }, [extractedData.curp]);

  // Cargar borrador del slot seleccionado al cambiar de seguro
  useEffect(() => {
    if (!slotsData?.rawSlots || !selectedSeguroId) return;

    const slotConBorrador = slotsData.rawSlots.find(
      s => String(s.seguro_id) === String(selectedSeguroId) && !s.completo
    );

    if (slotConBorrador?.datos_borrador) {
      const dbTel = slotConBorrador.datos_borrador.telefono || '';
      const codPais = slotConBorrador.datos_borrador.codigoPais;
      if (codPais === undefined) {
        const parsed = parsearTelefonoE164(dbTel);
        setExtractedData({
          ...slotConBorrador.datos_borrador,
          codigoPais: parsed.codigoPais,
          telefono: parsed.telefono
        });
      } else {
        setExtractedData(slotConBorrador.datos_borrador);
      }
    } else {
      // Limpiar a valores por defecto
      setExtractedData({
        nombreJugador: '',
        apellidoPaterno: '',
        apellidoMaterno: '',
        curp: '',
        genero: '1',
        fechaNacimiento: '',
        lugarNacimiento: 'MÉXICO',
        correo: '',
        codigoPais: '+52',
        telefono: '',
        posicion: '',
        numCamiseta: '',
        esForaneo: false,
        nacionalidadJugador: '',
        paisResidencia: '',
        haVividoExtranjero: false,
        dondeVividoExtranjero: '',
        nacionalidadPadre: '',
        nacionalidadMadre: '',
        registroAsociacionExtranjera: '',
        nacAbueloPaterno: '',
        nacAbuelaPaterna: '',
        nacAbueloMaterno: '',
        nacAbuelaMaterna: '',
        juegoClubExtranjero: ''
      });
    }
  }, [selectedSeguroId, slotsData]);

  // Auto-guardado de borrador (debounced)
  useEffect(() => {
    if (!currentSlot?.slot_id) return;

    const timer = setTimeout(() => {
      guardarBorradorEnBD(extractedData);
    }, 1000);

    return () => clearTimeout(timer);
  }, [extractedData, currentSlot?.slot_id]);

  // Autovalidación de número de camiseta en tiempo real
  useEffect(() => {
    const num = (extractedData.numCamiseta || '').trim();
    if (num) {
      const duplicate = obtenerDuplicadoCamiseta(num);
      if (duplicate) {
        setValidationErrors(prev => ({
          ...prev,
          numCamiseta: `El número de camiseta #${num} ya está asignado al Jugador ${duplicate.NombreCompleto}.`
        }));
      } else {
        setValidationErrors(prev => ({ ...prev, numCamiseta: null }));
      }
    } else {
      setValidationErrors(prev => ({ ...prev, numCamiseta: null }));
    }
  }, [extractedData.numCamiseta, registeredPlayers]);

  // Autovalidación de posición en tiempo real
  useEffect(() => {
    const pos = extractedData.posicion;
    if (pos) {
      const duplicate = obtenerDuplicadoPosicion(pos);
      if (duplicate) {
        const posNombre = catalogs?.roles_equipo?.find(r => String(r.id) === String(pos))?.nombre || 'esta posición';
        setValidationErrors(prev => ({
          ...prev,
          posicion: `La posición de ${posNombre} ya está asignada al Jugador ${duplicate.NombreCompleto}.`
        }));
      } else {
        setValidationErrors(prev => ({ ...prev, posicion: null }));
      }
    } else {
      setValidationErrors(prev => ({ ...prev, posicion: null }));
    }
  }, [extractedData.posicion, registeredPlayers, catalogs?.roles_equipo]);

  const handleFieldChange = (field, value) => {
    let cleanValue = value;
    const nameAndGeoFields = [
      'nombreJugador', 'apellidoPaterno', 'apellidoMaterno',
      'nacionalidadJugador', 'paisResidencia', 'dondeVividoExtranjero',
      'nacionalidadPadre', 'nacionalidadMadre',
      'nacAbueloPaterno', 'nacAbuelaPaterna', 'nacAbueloMaterno', 'nacAbuelaMaterna',
      'registroAsociacionExtranjera', 'juegoClubExtranjero'
    ];

    if (nameAndGeoFields.includes(field)) {
      cleanValue = value.replace(/[^A-ZÁÉÍÓÚÜÑ\s]/gi, '');
      if (['nombreJugador', 'apellidoPaterno', 'apellidoMaterno'].includes(field)) {
        cleanValue = cleanValue.slice(0, 30);
      }
    } else if (field === 'lugarNacimiento' || field === 'nui') {
      cleanValue = value.replace(/[^A-ZÁÉÍÓÚÜÑ0-9\s]/gi, '');
      if (field === 'lugarNacimiento') {
        cleanValue = cleanValue.slice(0, 30);
      }
    } else if (field === 'correo') {
      cleanValue = value.replace(/[^a-zA-Z0-9@._-]/g, '').slice(0, 30);
    } else if (field === 'telefono') {
      cleanValue = value.replace(/\D/g, '').slice(0, 10);
    } else if (field === 'numCamiseta') {
      cleanValue = value.replace(/\D/g, '').slice(0, 3);
      if (cleanValue !== '') {
        const duplicate = obtenerDuplicadoCamiseta(cleanValue);
        if (duplicate) {
          setValidationErrors(prev => ({
            ...prev,
            numCamiseta: `El número de camiseta #${cleanValue} ya está asignado al Jugador ${duplicate.NombreCompleto}.`
          }));
        } else {
          setValidationErrors(prev => ({ ...prev, numCamiseta: null }));
        }
      } else {
        setValidationErrors(prev => ({ ...prev, numCamiseta: null }));
      }
    }

    setExtractedData(prev => ({ ...prev, [field]: cleanValue }));
  };

  // PROCESAR SUBIDA DE DOCUMENTOS Y OCR
  const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

  const handleFileUpload = async (documentKey, file) => {
    if (!file) return;

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (documentKey === 'foto') {
      const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      const allowedImageExts = ['.jpg', '.jpeg', '.png'];
      if (!allowedImageTypes.includes(file.type) || !allowedImageExts.includes(ext)) {
        Swal.fire({
          title: 'Tipo de archivo no permitido',
          text: 'Solo se permiten fotografías en formato JPG, JPEG o PNG.',
          icon: 'error',
          confirmButtonColor: COLORS.primary
        });
        return;
      }
    } else {
      if (!ALLOWED_TYPES.includes(file.type) || !ALLOWED_EXTENSIONS.includes(ext)) {
        Swal.fire({
          title: 'Tipo de archivo no permitido',
          text: 'Solo se aceptan archivos PDF, JPG, JPEG o PNG.',
          icon: 'error',
          confirmButtonColor: COLORS.primary
        });
        return;
      }
    }

    const prevDoc = documents[documentKey] || null;
    const prevPreview = previews[documentKey] || null;

    if (documentKey !== 'foto') {
      setDocuments(prev => ({ ...prev, [documentKey]: file }));
    }

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
          // Convertir base64 a URL y a File
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

          setDocuments(prev => ({ ...prev, foto: newFile }));
          setPreviews(prev => ({ ...prev, foto: imageUrl }));
          setFailedPhoto(null);

          Swal.fire({ title: '¡Fotografía Aceptada!', icon: 'success', timer: 1500, showConfirmButton: false });
        } else {
          setFailedPhoto(file);
          setPreviews(prev => ({ ...prev, foto: null }));
          setDocuments(prev => ({ ...prev, foto: null }));

          Swal.fire({
            title: 'Error en la fotografía',
            text: `${data.mensaje || 'La foto no cumple con los requisitos.'}. Podría ser rechazada más adelante ¿Deseas cargarla de todos modos?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, cargar igualmente',
            cancelButtonText: 'No, intentar de nuevo',
            confirmButtonColor: COLORS.primary,
            cancelButtonColor: COLORS.slate300
          }).then((result) => {
            if (result.isConfirmed) {
              const reader = new FileReader();
              reader.onloadend = () => {
                setPreviews(prev => ({ ...prev, foto: reader.result }));
              };
              reader.readAsDataURL(file);
              setDocuments(prev => ({ ...prev, foto: file }));
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

    if (documentKey === 'ine' && !extractedData?.fechaNacimiento) {
      const result = await Swal.fire({
        title: '¿De quién es esta identificación?',
        text: 'Si este registro es para un menor de edad, debes subir primero el Acta de Nacimiento para que el sistema configure el formulario correctamente. ¿Esta identificación pertenece al jugador (mayor de edad)?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, es del jugador',
        cancelButtonText: 'No, es del tutor / menor de edad',
        confirmButtonColor: COLORS.primary,
        cancelButtonColor: COLORS.slate500
      });
      if (!result.isConfirmed) {
        Swal.fire({
          title: 'Carga cancelada',
          text: 'Por favor, carga primero el Acta de Nacimiento del jugador para actualizar el formulario.',
          icon: 'info',
          confirmButtonColor: COLORS.primary
        });
        setDocuments(prev => ({ ...prev, [documentKey]: null }));
        setPreviews(prev => ({ ...prev, [documentKey]: null }));
        return;
      }
    }

    // PROCESAR OCR PARA ACTA O IDENTIFICACIÓN
    if (documentKey === 'acta' || documentKey === 'ine') {
      Swal.fire({
        title: 'Analizando Documento...',
        html: 'Extrayendo información. Por favor espere.',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => { Swal.showLoading(); }
      });

      try {
        const formDataOcr = new FormData();
        formDataOcr.append('file_id', file);
        const token = localStorage.getItem('token') || sessionStorage.getItem('temp_token');
        const response = await fetch(`${API_BASE}/documentos/ocr`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formDataOcr
        });
        if (!response.ok) throw new Error('Error al obtener la información.');

        const htmlText = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");

        const cleanVal = (val) => {
          if (!val) return '';
          const cleaned = val.trim();
          const lower = cleaned.toLowerCase();
          if (lower === 'no detectado' || lower === 'no detectada' || lower === 'sin anotaciones' || lower === 'vacio') {
            return '';
          }
          return cleaned;
        };

        let nombreEncontrado = '';
        let nombresEncontrados = '';
        let apellidoPaternoEncontrado = '';
        let apellidoMaternoEncontrado = '';
        let curpEncontrada = '';
        let fechaNacEncontrada = '';
        let lugarNacEncontrado = '';
        let documentoEncontrado = '';
        let verificacionRenapo = '';

        const rows = doc.querySelectorAll('.dato-fila');
        rows.forEach(row => {
          const label = row.querySelector('.etiqueta')?.textContent?.toLowerCase() || '';
          const value = cleanVal(row.querySelector('.valor')?.textContent);

          if (!value) return;

          if (label.includes('nombres')) {
            nombresEncontrados = value;
          } else if (label.includes('nombre completo') || label === 'nombre') {
            nombreEncontrado = value;
          } else if (label.includes('nombre')) {
            if (!nombresEncontrados) nombresEncontrados = value;
          }

          if (label.includes('apellido paterno') || label.includes('paterno')) {
            apellidoPaternoEncontrado = value;
          }
          if (label.includes('apellido materno') || label.includes('materno')) {
            apellidoMaternoEncontrado = value;
          }

          if (label.includes('curp')) curpEncontrada = value;
          if (label.includes('documento')) documentoEncontrado = value;
          if (label.includes('verificación renapo') || label.includes('renapo')) {
            verificacionRenapo = value;
          }

          if (label.includes('lugar de nacimiento') || label.includes('lugar nacimiento') || (label.includes('entidad') && !label.includes('identidad') && !label.includes('curp'))) {
            lugarNacEncontrado = value;
          }

          if ((label.includes('nacimiento') && !label.includes('lugar')) || label.includes('fecha nac')) {
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

        // VALIDACIÓN DE COINCIDENCIA DE TIPO DE DOCUMENTO
        const isActaField = ['acta', 'actaNacimiento'].includes(documentKey);
        const isIneField = ['ine', 'ineTutor', 'identificacion', 'identificacionMenor'].includes(documentKey);
        const isOcrActa = (documentoEncontrado || '').toUpperCase() === 'ACTA DE NACIMIENTO';
        const isOcrIne = (documentoEncontrado || '').toUpperCase() === 'INE';

        if ((isActaField && isOcrIne) || (isIneField && isOcrActa)) {
          Swal.close();
          const result = await Swal.fire({
            title: 'Este documento no parece ser el que se solicita. ¿Deseas cargarlo de todos modos?',
            text: 'Si el documento no es el correcto, podría ser rechazado durante la validación.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Cargar de todos modos',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: COLORS.primary || '#1a3b5c',
            cancelButtonColor: COLORS.slate300 || '#cbd5e1'
          });

          if (!result.isConfirmed) {
            setDocuments(prev => ({ ...prev, [documentKey]: prevDoc }));
            setPreviews(prev => ({ ...prev, [documentKey]: prevPreview }));
            return;
          }
        }

        const curpOriginalCapturada = curpEncontrada;
        const curpNoValida = (verificacionRenapo === 'RECHAZADO');
        if (curpNoValida) {
          curpEncontrada = ''; // Clear out CURP to block step completion
        }

        if (nombresEncontrados || apellidoPaternoEncontrado || apellidoMaternoEncontrado || nombreEncontrado || curpEncontrada || fechaNacEncontrada) {
          let firstName = '', lastNamePaterno = '', lastNameMaterno = '';

          if (nombresEncontrados || apellidoPaternoEncontrado || apellidoMaternoEncontrado) {
            firstName = nombresEncontrados;
            lastNamePaterno = apellidoPaternoEncontrado;
            lastNameMaterno = apellidoMaternoEncontrado;
          } else if (nombreEncontrado) {
            const parts = nombreEncontrado.split(' ');
            if (parts.length === 4) {
              firstName = parts.slice(0, 2).join(' ');
              lastNamePaterno = parts[2];
              lastNameMaterno = parts[3];
            } else if (parts.length === 3) {
              firstName = parts[0];
              lastNamePaterno = parts[1];
              lastNameMaterno = parts[2];
            } else if (parts.length === 2) {
              firstName = parts[0];
              lastNamePaterno = parts[1];
            } else {
              firstName = nombreEncontrado;
            }
          }

          // Auto-detectar género por CURP
          let detectedGenero = extractedData.genero;
          if (curpEncontrada && curpEncontrada.length >= 11) {
            const char = curpEncontrada.charAt(10).toUpperCase();
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

          setOcrDataOriginal(ocrResult);
          setExtractedData(prev => ({ ...prev, ...ocrResult }));

          const missing = [];
          if (!ocrResult.nombreJugador) missing.push('nombreJugador');
          if (!ocrResult.apellidoPaterno) missing.push('apellidoPaterno');
          if (!ocrResult.apellidoMaterno) missing.push('apellidoMaterno');
          if (!ocrResult.curp) missing.push('curp');
          if (!ocrResult.fechaNacimiento) missing.push('fechaNacimiento');
          if (!ocrResult.lugarNacimiento) missing.push('lugarNacimiento');
          if (!extractedData.correo) missing.push('correo');
          if (!extractedData.telefono) missing.push('telefono');
          setMissingOcrFields(missing);

          if (curpNoValida) {
            Swal.fire({
              title: 'CURP no validada',
              text: `La CURP ${curpOriginalCapturada} ingresada no fue validada. Por favor, sube un documento válido.`,
              icon: 'warning',
              confirmButtonColor: COLORS.primary || '#1a3b5c'
            });
          } else {
            const labels = {
              nombreJugador: 'Nombre(s)',
              apellidoPaterno: 'Apellido Paterno',
              apellidoMaterno: 'Apellido Materno',
              curp: 'CURP',
              fechaNacimiento: 'Fecha de Nacimiento',
              lugarNacimiento: 'Lugar de Nacimiento',
              correo: 'Correo electrónico',
              telefono: 'Número de teléfono'
            };
            const missingLabels = missing.map(m => labels[m]).filter(Boolean);

            let text = nombreEncontrado ? `Se detectó a: ${nombreEncontrado}.` : 'Lectura del documento completada.';
            if (missingLabels.length > 0) {
              text += `\n\nPor favor, completa manualmente los campos resaltados en amarillo: ${missingLabels.join(', ')}.`;
            }

            Swal.fire({
              title: '¡Lectura Exitosa!',
              text: text,
              icon: 'success',
              confirmButtonText: 'Aceptar',
              confirmButtonColor: COLORS.primary
            });
          }
        } else {
          throw new Error('No se detectaron datos legibles en este documento.');
        }
      } catch (err) {
        Swal.fire('Aviso', 'No se pudo extraer la información automáticamente. Por favor ingrésala de forma manual.', 'info');
      }
    }
  };

  const handleGenerarAmpliacionAdmin = async () => {
    try {
      setProcesandoAmpliacionAdmin(true);
      const token = localStorage.getItem('token');

      const segurosPayload = Object.entries(asignacionSegurosAmpliacion)
        .filter(([, cantidad]) => Number(cantidad) > 0)
        .map(([seguroId, cantidad]) => ({
          SeguroId: Number(seguroId),
          Cantidad: Number(cantidad)
        }));

      // 1. Crear Orden
      const res = await fetch(`${API_BASE}/ordenes-pago/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          CantidadJugadores: Number(numJugadoresAmpliacion),
          Seguros: segurosPayload,
          TipoSolicitud: 3, // JUGADOR
          EquipoId: Number(equipoId)
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'No se pudo crear la orden de ampliación.');
      }

      const data = await res.json();
      const ordenId = data.orden_pago_id || data.OrdenPagoId || data.id;

      if (aprobarAutomaticamente) {
        // 2. Aprobar inmediatamente
        await adminService.updateEstatusPago(ordenId, 3);
        Swal.fire({
          title: '¡Ampliación generada y aprobada!',
          text: `Se crearon los espacios para ${numJugadoresAmpliacion} jugador(es).`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });

        // Recargar slots
        const slotsResponse = await teamsService.checkTeamSlots(equipoId);
        setSlotsData(slotsResponse);
      } else {
        Swal.fire('Orden Creada', `La orden #${ordenId} se generó exitosamente, pero queda pendiente de comprobante.`, 'success');
        // Recargar orden
        const ampliacionData = await adminService.checkOrdenAmpliacionAdmin(equipoId);
        setOrdenAmpliacion(ampliacionData);
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', err.message || 'Error al generar la ampliación.', 'error');
    } finally {
      setProcesandoAmpliacionAdmin(false);
    }
  };

  // BYPASS DE FOTOGRAFÍA MANUAL
  const forceLoadFailedPhoto = () => {
    if (!failedPhoto) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviews(prev => ({ ...prev, foto: reader.result }));
    };
    reader.readAsDataURL(failedPhoto);

    setDocuments(prev => ({ ...prev, foto: failedPhoto }));
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
      if (documents.foto) {
        try {
          const photoBytes = await documents.foto.arrayBuffer();
          let photoImage;
          const nameLower = documents.foto.name.toLowerCase();
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
      const nombreVal = extractedData.nombreJugador || '';
      const nombreFs = nombreVal.length > 35 ? 6 : nombreVal.length > 25 ? 7 : nombreVal.length > 18 ? 8 : 10;
      safeSetField(form, 'Nombres', nombreVal, nombreFs);

      const apPaternoVal = extractedData.apellidoPaterno || '';
      const apPaternoFs = apPaternoVal.length > 35 ? 6 : apPaternoVal.length > 25 ? 7 : apPaternoVal.length > 18 ? 8 : 10;
      safeSetField(form, 'Apellido Paterno', apPaternoVal, apPaternoFs);

      const apMaternoVal = extractedData.apellidoMaterno || '';
      const apMaternoFs = apMaternoVal.length > 35 ? 6 : apMaternoVal.length > 25 ? 7 : apMaternoVal.length > 18 ? 8 : 10;
      safeSetField(form, 'Apellido Materno', apMaternoVal, apMaternoFs);
      safeSetField(form, 'CURP o Clave Única de Registro de Población', extractedData.curp);
      safeSetField(form, 'Fecha de Nacimiento', extractedData.fechaNacimiento);
      safeSetField(form, 'Sexo', extractedData.genero === '1' ? 'MASCULINO' : 'FEMENINO');
      safeSetField(form, 'Lugar de Nacimiento', extractedData.lugarNacimiento);

      // Datos de afiliado
      const correoCJE = extractedData.correo || '';
      const correoCJEFs = correoCJE.length > 35 ? 6 : correoCJE.length > 25 ? 7 : correoCJE.length > 18 ? 8 : 10;
      safeSetField(form, 'Correo electrónico', correoCJE, correoCJEFs);
      safeSetField(form, 'Teléfono', (extractedData.codigoPais || '+52') + (extractedData.telefono || ''));
      safeSetField(form, 'Asociación', 'Asociación de Morelos');
      safeSetField(form, 'fill_24', 'Asociación de Morelos');

      // Tipo de Afiliación (Tipo y fill_20) → nombre del seguro seleccionado
      const seguroSel = catalogs?.seguros?.find(s => String(s.id) === String(selectedSeguroId));
      if (seguroSel?.nombre) {
        try { form.getTextField('Tipo')?.setText(seguroSel.nombre.toUpperCase()); } catch (_) { }
        try { form.getTextField('fill_20')?.setText(seguroSel.nombre.toUpperCase()); } catch (_) { }
      }

      const ligaVal = (equipo?.Liga || '').split('(')[0].trim();
      const ligaFs = ligaVal.length > 35 ? 6 : ligaVal.length > 25 ? 7 : ligaVal.length > 18 ? 8 : 10;
      safeSetField(form, 'Liga', ligaVal, ligaFs);

      const equipoVal = equipo?.NombreEquipo || '';
      const equipoFs = equipoVal.length > 35 ? 6 : equipoVal.length > 25 ? 7 : equipoVal.length > 18 ? 8 : 10;
      safeSetField(form, 'Equipo', equipoVal, equipoFs);
      safeSetField(form, 'Categoría', equipo?.Categoria || '');

      // Traducir el ID de posición a su nombre en texto
      const posObj = catalogs?.roles_equipo?.find(r => String(r.id) === String(extractedData.posicion));
      safeSetField(form, 'Posición', posObj ? posObj.nombre : 'JUGADOR');
      safeSetField(form, 'Camiseta', extractedData.numCamiseta);

      // Antecedentes internacionales si es foráneo
      if (extractedData.esForaneo) {
        safeSetField(form, 'Nacionalidades del jugador', extractedData.nacionalidadJugador);
        safeSetField(form, 'País de residencia actual', extractedData.paisResidencia);
        safeSetField(form, 'El jugador ha vivido en el extranjero En que país', extractedData.haVividoExtranjero ? extractedData.dondeVividoExtranjero : 'NO');
        safeSetField(form, 'Nacionalidades del padre', extractedData.nacionalidadPadre);
        safeSetField(form, 'Nacionalidades de la madre', extractedData.nacionalidadMadre);
        safeSetField(form, 'Nacionalidades del abuelo paterno', extractedData.nacAbueloPaterno);
        safeSetField(form, 'Nacionalidades de la abuela paterna', extractedData.nacAbuelaPaterna);
        safeSetField(form, 'Nacionalidades del abuelo materno', extractedData.nacAbueloMaterno);
        safeSetField(form, 'Nacionalidades de la abuela materna', extractedData.nacAbuelaMaterna);
        safeSetField(form, 'El jugador ha sido registrado por la Asociación Nacional de Fútbol', extractedData.registroAsociacionExtranjera);
        safeSetField(form, 'El jugador ha jugado en un Club extranjero y participado en', extractedData.juegoClubExtranjero);
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
      link.download = `Formato_Afiliacion_${extractedData.nombreJugador || 'Jugador'}.pdf`;
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

  const esFormularioIncompleto = () => {
    if (!selectedSeguroId) return true;

    const camposRequeridos = [
      'nombreJugador',
      'apellidoPaterno',
      'apellidoMaterno',
      'curp',
      'fechaNacimiento',
      'lugarNacimiento',
      'genero',
      'correo',
      'telefono',
      'numCamiseta',
      'posicion'
    ];

    const faltaCampo = camposRequeridos.some(f => {
      const val = extractedData[f];
      return val === undefined || val === null || String(val).trim() === '';
    });

    if (faltaCampo) return true;

    if (!extractedData.curp || extractedData.curp.length !== 18) {
      return true;
    }

    // Validar documentos cargados
    if (!documents.acta) return true;
    if (esMenorDeEdad) {
      if (!documents.ineTutor || !documents.identificacionMenor) return true;
    } else {
      if (!documents.ine) return true;
    }
    if (!documents.foto) return true;

    if (extractedData.esForaneo) {
      const {
        nacionalidadJugador, paisResidencia, dondeVividoExtranjero, haVividoExtranjero,
        nacionalidadPadre, nacionalidadMadre, registroAsociacionExtranjera,
        nacAbueloPaterno, nacAbuelaPaterna, nacAbueloMaterno, nacAbuelaMaterna,
        juegoClubExtranjero
      } = extractedData;

      const basicosForaneo = [
        nacionalidadJugador, paisResidencia, nacionalidadPadre, nacionalidadMadre,
        registroAsociacionExtranjera, nacAbueloPaterno, nacAbuelaPaterna,
        nacAbueloMaterno, nacAbuelaMaterna, juegoClubExtranjero
      ];

      const foraneoIncompleto = basicosForaneo.some(campo => String(campo || '').trim() === '');
      if (foraneoIncompleto) return true;

      if (haVividoExtranjero && String(dondeVividoExtranjero || '').trim() === '') {
        return true;
      }
    }

    return false;
  };

  // PRE-GUARDAR Y DESCARGAR FORMATO
  const handleGuardar = async (e) => {
    if (e) e.preventDefault();

    if (!selectedSeguroId) {
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
      { name: 'posicion', label: 'Posición en el campo' }
    ];

    const missingFields = requiredFields.filter(f => {
      const val = extractedData[f.name];
      return val === undefined || val === null || String(val).trim() === '';
    });

    if (missingFields.length > 0) {
      const labels = missingFields.map(f => f.label).join(', ');
      Swal.fire('Atención', `Los siguientes campos son obligatorios: ${labels}.`, 'warning');
      return;
    }

    if (extractedData.curp.length !== 18) {
      Swal.fire('Atención', 'El campo CURP debe tener exactamente 18 caracteres.', 'warning');
      return;
    }

    if (validationErrors.curp) {
      Swal.fire('Atención', validationErrors.curp, 'warning');
      return;
    }
    if (validationErrors.numCamiseta) {
      Swal.fire('Atención', validationErrors.numCamiseta, 'warning');
      return;
    }
    if (validationErrors.posicion) {
      Swal.fire('Atención', validationErrors.posicion, 'warning');
      return;
    }
    if (validationErrors.fechaNacimiento) {
      Swal.fire('Atención', validationErrors.fechaNacimiento, 'warning');
      return;
    }

    const dupCurp = obtenerDuplicadoCURP(extractedData.curp);
    if (dupCurp) {
      Swal.fire('Atención', `La CURP ya está asignada al Jugador ${dupCurp.NombreCompleto || 'del equipo'}.`, 'warning');
      return;
    }

    const dupCamiseta = obtenerDuplicadoCamiseta(extractedData.numCamiseta);
    if (dupCamiseta) {
      Swal.fire('Atención', `El número de camiseta #${extractedData.numCamiseta} ya está asignado al Jugador ${dupCamiseta.NombreCompleto || 'del equipo'}.`, 'warning');
      return;
    }

    const dupPos = obtenerDuplicadoPosicion(extractedData.posicion);
    if (dupPos) {
      const posNombre = catalogs?.roles_equipo?.find(r => String(r.id) === String(extractedData.posicion))?.nombre || 'esta posición';
      Swal.fire('Atención', `La posición de ${posNombre} ya está asignada al Jugador ${dupPos.NombreCompleto || 'del equipo'}.`, 'warning');
      return;
    }

    if (extractedData.fechaNacimiento) {
      const parts = extractedData.fechaNacimiento.split('-');
      const fechaDate = new Date(extractedData.fechaNacimiento);
      const hoy = new Date();

      // Validación estricta para evitar salto de meses (ej. 30 de febrero)
      if (
        isNaN(fechaDate.getTime()) ||
        (parts.length === 3 && (fechaDate.getUTCFullYear() !== parseInt(parts[0], 10) || fechaDate.getUTCMonth() + 1 !== parseInt(parts[1], 10) || fechaDate.getUTCDate() !== parseInt(parts[2], 10)))
      ) {
        Swal.fire('Atención', 'La fecha ingresada no es válida (revisa el mes o día).', 'warning');
        return;
      }

      if (fechaDate.getFullYear() < 1900 || fechaDate.getFullYear() > hoy.getFullYear()) {
        Swal.fire('Atención', 'El año de nacimiento no es válido.', 'warning');
        return;
      }

      const minAgeDate = new Date(hoy.getFullYear() - 2, hoy.getMonth(), hoy.getDate());
      if (fechaDate > minAgeDate) {
        Swal.fire('Atención', 'El jugador debe tener al menos 2 años de edad.', 'warning');
        return;
      }
    }

    // Validar documentos requeridos cargados
    if (!documents.acta) {
      Swal.fire('Atención', 'El Acta de Nacimiento es obligatoria.', 'warning');
      return;
    }
    if (esMenorDeEdad) {
      if (!documents.ineTutor) {
        Swal.fire('Atención', 'El INE del Padre o Tutor es obligatorio para menores de edad.', 'warning');
        return;
      }
      if (!documents.identificacionMenor) {
        Swal.fire('Atención', 'La Identificación del Menor es obligatoria para menores de edad.', 'warning');
        return;
      }
    } else {
      if (!documents.ine) {
        Swal.fire('Atención', 'La Identificación Oficial (INE) es obligatoria.', 'warning');
        return;
      }
    }
    if (!documents.foto) {
      Swal.fire('Atención', 'La Fotografía del Jugador es obligatoria.', 'warning');
      return;
    }

    // Validar campos de extranjero si aplica
    if (extractedData.esForaneo) {
      const {
        nacionalidadJugador, paisResidencia, dondeVividoExtranjero, haVividoExtranjero,
        nacionalidadPadre, nacionalidadMadre, registroAsociacionExtranjera,
        nacAbueloPaterno, nacAbuelaPaterna, nacAbueloMaterno, nacAbuelaMaterna,
        juegoClubExtranjero
      } = extractedData;

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

    // Abrir modal para subir el formato (opcionalmente)
    setShowFinishModal(true);
  };

  // ENVÍO FINAL A BACKEND
  const handleFinalizarInscripcion = async () => {

    setSubmitting(true);
    Swal.fire({
      title: 'Registrando Jugador',
      text: 'Consumiendo espacio y subiendo documentos...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const formData = new FormData();
      formData.append('equipo_id', parseInt(equipoId, 10));
      formData.append('nombre', (extractedData.nombreJugador || '').toString().trim());
      formData.append('primer_apellido', (extractedData.apellidoPaterno || '').toString().trim());
      formData.append('segundo_apellido', (extractedData.apellidoMaterno || '').toString().trim());
      formData.append('curp', (extractedData.curp || '').toString().toUpperCase());
      formData.append('sexo_id', parseInt(extractedData.genero, 10));
      formData.append('fecha_nacimiento', extractedData.fechaNacimiento);
      formData.append('lugar_nacimiento', extractedData.lugarNacimiento || 'MÉXICO');
      formData.append('correo', extractedData.correo || '');
      formData.append('telefono', extractedData.telefono ? ((extractedData.codigoPais || '+52') + extractedData.telefono) : '');
      formData.append('rol_en_equipo', extractedData.posicion || '3');
      formData.append('numero_camiseta', extractedData.numCamiseta || '0');
      formData.append('seguro_id', parseInt(selectedSeguroId, 10));

      if (extractedData.esForaneo) {
        formData.append('extranjero', '1');
        formData.append('nacionalidad', extractedData.nacionalidadJugador);
        formData.append('pais_residencia', extractedData.paisResidencia);
        formData.append('nacionalidad_padre', extractedData.nacionalidadPadre);
        formData.append('nacionalidad_madre', extractedData.nacionalidadMadre);
        formData.append('nac_abuelo_paterno', extractedData.nacAbueloPaterno);
        formData.append('nac_abuela_paterna', extractedData.nacAbuelaPaterna);
        formData.append('nac_abuelo_materno', extractedData.nacAbueloMaterno);
        formData.append('nac_abuela_materna', extractedData.nacAbuelaMaterna);
        formData.append('registro_asociacion_extranjera', extractedData.registroAsociacionExtranjera);
        formData.append('juego_club_extranjero', extractedData.juegoClubExtranjero);
        formData.append('ha_vivido_extranjero', extractedData.haVividoExtranjero ? '1' : '0');
        formData.append('donde_vivido', extractedData.dondeVividoExtranjero || '');
      }

      // Archivos obligatorios
      if (documents.acta) formData.append('acta', documents.acta);
      if (documents.foto) formData.append('foto', documents.foto);

      // Archivos condicionales por edad
      if (esMenorDeEdad) {
        if (documents.ineTutor) formData.append('ineTutor', documents.ineTutor);
        if (documents.identificacionMenor) formData.append('identificacionMenor', documents.identificacionMenor);
      } else {
        if (documents.ine) formData.append('ine', documents.ine);
      }

      // El formato de afiliación firmado (opcional)
      if (signedForm) formData.append('formato_firmado', signedForm);

      await adminService.agregarJugadorEquipoExistente(formData);

      setShowFinishModal(false);
      Swal.fire({
        icon: 'success',
        title: 'Jugador Inscrito Correctamente',
        text: 'El espacio se ha completado y los documentos se guardaron correctamente.'
      }).then(() => {
        navigate(ROUTES.ADMIN.EQUIPOS);
      });
    } catch (err) {
      console.error("Error al registrar jugador en equipo existente:", err);
      Swal.fire('Error', err.response?.data?.detail || err.message || 'Error interno del servidor', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // MANEJO DE APROBACIÓN DE AMPLIACIÓN POR EL ADMIN
  const handleAprobarOrdenAmpliacion = async (ordenId, label) => {
    const result = await Swal.fire({
      title: `¿${label}?`,
      text: `Estás a punto de aprobar la orden de pago. Se generarán y habilitarán los espacios contratados en el equipo.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Sí, aprobar`,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--secondary)',
      cancelButtonColor: 'var(--text-muted)'
    });

    if (!result.isConfirmed) return;

    try {
      Swal.fire({
        title: 'Aprobando ampliación...',
        text: 'Generando cupos...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });
      await adminService.updateEstatusPago(ordenId, 3);

      Swal.fire({
        title: '¡Ampliación aprobada!',
        text: `Los espacios han sido habilitados correctamente.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });

      // Recargamos la vista para que tome los nuevos slots
      window.location.reload();
    } catch (err) {
      Swal.fire('Error', 'No se pudo aprobar la orden de ampliación.', 'error');
    }
  };

  // Documentos requeridos para renderizar dinámicamente
  const documentCards = [
    { key: 'acta', title: 'Acta de Nacimiento', subtitle: 'Requerido para validación y auto-llenado' },
    ...(esMenorDeEdad
      ? [
        { key: 'ineTutor', title: 'INE de Padre o Tutor', subtitle: 'Identificación oficial del tutor' },
        { key: 'identificacionMenor', title: 'Identificación de Menor', subtitle: 'Credencial escolar o certificado' }
      ]
      : [
        { key: 'ine', title: 'Identificación Oficial (INE)', subtitle: 'INE, Pasaporte o Cédula' }
      ]),
    { key: 'foto', title: 'Fotografía del Jugador', subtitle: 'Fotografía infantil formal' }
  ];

  if (loading) {
    return (
      <div className="dashboard-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Loader text="Cargando información del equipo y espacios disponibles..." />
      </div>
    );
  }

  // Si no hay slots en absoluto
  const sinSlots = slotsData?.slots_disponibles === 0 || slotsData?.hay_slots === false;

  return (
    <div className="dashboard-content">
      <style>{hoverStyles}</style>

      {/* HEADER */}
      <div style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button
          onClick={() => {
            const tieneDatos = Object.values(documents).some(d => d !== null) || extractedData.nombreJugador;
            if (tieneDatos) {
              Swal.fire({
                title: '¿Abandonar registro?',
                text: "Se perderán los documentos subidos y el progreso actual.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: COLORS.danger,
                cancelButtonColor: COLORS.slate500,
                confirmButtonText: 'Sí, salir',
                cancelButtonText: 'Continuar registro'
              }).then((result) => {
                if (result.isConfirmed) navigate(ROUTES.ADMIN.EQUIPOS);
              });
            } else {
              navigate(ROUTES.ADMIN.EQUIPOS);
            }
          }}
          className="btn btn-outline-secondary"
          style={{ padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', background: 'none', border: `1px solid ${COLORS.slate300}`, cursor: 'pointer' }}
        >
          <FaArrowLeft />
        </button>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: COLORS.slate800, margin: 0 }}>Completar Jugadores de Equipo</h2>
          <p style={{ margin: 0, fontSize: '13px', color: COLORS.slate500, marginTop: '4px' }}>Registrar jugadores en espacios pagados restantes.</p>
        </div>
      </div>

      {/* DETALLES DEL EQUIPO */}
      {equipo && (
        <div className="premium-card premium-details-card fade-in">
          <div>
            <span style={{ fontSize: '11px', fontWeight: '900', color: COLORS.infoBootstrap, letterSpacing: '1px', textTransform: 'uppercase' }}>Equipo Seleccionado</span>
            <h1 style={{ fontSize: '26px', fontWeight: '900', margin: '4px 0 8px 0', letterSpacing: '-0.5px' }}>🛡️ {equipo.NombreEquipo}</h1>
            <div style={{ display: 'flex', gap: '15px', fontSize: '13px', color: COLORS.slate400, flexWrap: 'wrap' }}>
              <span><strong>Liga:</strong> {equipo.Liga || 'N/A'}</span>
              <span>•</span>
              <span><strong>Categoría:</strong> {equipo.Categoria || 'LIBRE'} ({equipo.Rama || 'N/A'})</span>
              <span>•</span>
              <span><strong>Presidente:</strong> {equipo.PresidenteNombreCompleto || 'Sin Presidente'}</span>
            </div>
          </div>

          <div style={{ background: COLORS.overlayWhite05, padding: '12px 20px', borderRadius: '14px', border: `1px solid ${COLORS.overlayWhite10}`, textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: COLORS.slate400, display: 'block', fontWeight: '600' }}>Espacios disponibles</span>
            <span style={{ fontSize: '24px', fontWeight: '950', color: sinSlots ? COLORS.danger : COLORS.success }}>
              {slotsData?.slots_disponibles || 0} espacios
            </span>
          </div>
        </div>
      )}

      {/* BLOQUEO SI NO HAY SLOTS */}
      {sinSlots ? (
        <div className="premium-card no-slots-card fade-in">
          {cargandoOrdenAmpliacion ? (
            <div style={{ padding: '40px' }}>
              <Loader text="Verificando si existen ampliaciones solicitadas por el presidente..." />
            </div>
          ) : (
            <>
              <div style={{ fontSize: '60px', marginBottom: '20px' }}>⚠️</div>
              <h2 style={{ fontSize: '22px', fontWeight: '800', color: COLORS.danger, marginBottom: '10px' }}>Sin espacios disponibles</h2>

              {!ordenAmpliacion?.tiene_orden ? (
                // CASO 1: No existe ninguna orden de ampliación
                <div style={{ textAlign: 'left', marginTop: '10px' }}>
                  <p style={{ color: COLORS.slate500, marginBottom: '20px', lineHeight: '1.6', textAlign: 'center' }}>
                    El presidente no ha solicitado espacios adicionales. Puedes generar una orden de ampliación administrativa para este equipo.
                  </p>

                  <div style={{ background: COLORS.slate50, padding: '25px', borderRadius: '16px', border: `1px solid ${COLORS.slate200}`, marginBottom: '25px' }}>
                    {/* Cantidad de Jugadores */}
                    <div style={{ marginBottom: '25px' }}>
                      <label style={{ display: 'block', fontWeight: '800', color: COLORS.slate800, marginBottom: '10px' }}>
                        Cantidad de espacios a generar (Jugadores)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={numJugadoresAmpliacion}
                        onChange={(e) => setNumJugadoresAmpliacion(Math.max(1, parseInt(e.target.value) || 1))}
                        style={{ width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${COLORS.slate300}`, fontSize: '15px' }}
                      />
                    </div>

                    {/* Seguros */}
                    <div style={{ marginBottom: '25px' }}>
                      <label style={{ display: 'block', fontWeight: '800', color: COLORS.slate800, marginBottom: '10px' }}>
                        Selección de Seguros
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                        {segurosJugador.map(seg => (
                          <div key={seg.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '12px 15px', borderRadius: '10px', border: `1px solid ${COLORS.slate200}` }}>
                            <div>
                              <div style={{ fontWeight: '700', color: COLORS.slate800, fontSize: '14px' }}>{seg.nombre}</div>
                              <div style={{ fontSize: '12px', color: COLORS.slate500 }}>${Number(seg.precio || 0).toFixed(2)} c/u</div>
                            </div>
                            <input
                              type="number"
                              min="0"
                              value={asignacionSegurosAmpliacion[seg.id] || ''}
                              placeholder="0"
                              onChange={(e) => setAsignacionSegurosAmpliacion(prev => ({ ...prev, [seg.id]: Math.max(0, parseInt(e.target.value) || 0) }))}
                              style={{ width: '60px', padding: '8px', textAlign: 'center', borderRadius: '8px', border: `1px solid ${COLORS.slate300}` }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Resumen */}
                    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: `1px solid ${COLORS.slate200}` }}>
                      <h4 style={{ margin: '0 0 15px 0', fontSize: '15px', fontWeight: '800', color: COLORS.slate800 }}>Resumen de Costos</h4>

                      {segurosJugador.map(seg => {
                        const cant = asignacionSegurosAmpliacion[seg.id] || 0;
                        if (cant === 0) return null;
                        return (
                          <div key={`res-seg-${seg.id}`} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', color: COLORS.slate500 }}>
                            <span>Seguro {seg.nombre} x{cant}</span>
                            <span style={{ fontWeight: '700', color: COLORS.slate800 }}>${(Number(seg.precio || 0) * cant).toFixed(2)}</span>
                          </div>
                        );
                      })}

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', paddingTop: '15px', borderTop: `2px solid ${COLORS.slate100}` }}>
                        <span style={{ fontWeight: '800', color: COLORS.slate800 }}>TOTAL A PAGAR</span>
                        <span style={{ fontWeight: '900', color: COLORS.primary, fontSize: '18px' }}>
                          ${(
                            Object.entries(asignacionSegurosAmpliacion).reduce((acc, [id, cant]) => {
                              const s = segurosJugador.find(x => String(x.id) === String(id));
                              if (s) {
                                return acc + (cant * Number(s.precio || 0));
                              }
                              return acc;
                            }, 0)
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Checkbox de aprobación */}
                    <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '10px', background: COLORS.successBg, padding: '15px', borderRadius: '10px', border: `1px solid ${COLORS.successBgDark}` }}>
                      <input
                        type="checkbox"
                        id="checkAprobarAuto"
                        checked={aprobarAutomaticamente}
                        onChange={(e) => setAprobarAutomaticamente(e.target.checked)}
                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                      />
                      <label htmlFor="checkAprobarAuto" style={{ fontWeight: '700', color: COLORS.successDarker, cursor: 'pointer', margin: 0 }}>
                        Aprobar orden automáticamente y generar espacios
                      </label>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                    <BotonSecundario
                      etiqueta="Cancelar"
                      alHacerClick={() => navigate(ROUTES.ADMIN.EQUIPOS)}
                    />
                    <BotonPrimario
                      etiqueta={procesandoAmpliacionAdmin ? "Procesando..." : "Generar Ampliación"}
                      alHacerClick={handleGenerarAmpliacionAdmin}
                      deshabilitado={procesandoAmpliacionAdmin}
                      estilo={{ padding: '12px 24px', fontSize: '15px', minWidth: '200px' }}
                    />
                  </div>
                </div>
              ) : ordenAmpliacion.accion === 'SUBIR_COMPROBANTE' ? (
                // CASO 2: Existe orden con estatus NO_ENVIADA
                <>
                  <p style={{ color: COLORS.slate500, maxWidth: '600px', margin: '0 auto 25px auto', lineHeight: '1.6' }}>
                    Se generó una orden de ampliación (Orden #{ordenAmpliacion.orden_id}) pero aún no se ha subido comprobante de pago.
                  </p>
                  <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                    <BotonSecundario
                      etiqueta="Volver al Directorio"
                      alHacerClick={() => navigate(ROUTES.ADMIN.EQUIPOS)}
                    />
                    <button
                      className="btn-premium"
                      onClick={() => handleAprobarOrdenAmpliacion(ordenAmpliacion.orden_id, 'Autorizar pago sin comprobante')}
                      style={{ padding: '12px 24px', borderRadius: '12px', fontSize: '15px' }}
                    >
                      Autorizar pago sin comprobante
                    </button>
                  </div>
                </>
              ) : ordenAmpliacion.accion === 'EN_REVISION' ? (
                // CASO 3: Existe orden con estatus ESPERA
                <>
                  <p style={{ color: COLORS.slate500, maxWidth: '600px', margin: '0 auto 25px auto', lineHeight: '1.6' }}>
                    El presidente ya subió el comprobante de pago de la Orden #{ordenAmpliacion.orden_id}. ¿Deseas aprobar la ampliación?
                  </p>
                  <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                    <BotonSecundario
                      etiqueta="Volver al Directorio"
                      alHacerClick={() => navigate(ROUTES.ADMIN.EQUIPOS)}
                    />
                    <button
                      onClick={() => openSecurePath(ordenAmpliacion.ruta_voucher)}
                      style={{
                        padding: '12px 24px',
                        background: 'white',
                        border: '2px solid var(--primary)',
                        color: 'var(--primary)',
                        borderRadius: '12px',
                        fontWeight: '800',
                        cursor: 'pointer'
                      }}
                    >
                      Ver comprobante
                    </button>
                    <button
                      className="btn-premium"
                      onClick={() => handleAprobarOrdenAmpliacion(ordenAmpliacion.orden_id, 'Aprobar pago')}
                      style={{ padding: '12px 24px', borderRadius: '12px', fontSize: '15px' }}
                    >
                      Aprobar pago
                    </button>
                  </div>
                </>
              ) : ordenAmpliacion.accion === 'REENVIAR_COMPROBANTE' ? (
                // CASO 4: Existe orden con estatus RECHAZADA
                <>
                  <p style={{ color: COLORS.slate500, maxWidth: '600px', margin: '0 auto 25px auto', lineHeight: '1.6' }}>
                    La orden de ampliación fue rechazada. Se requiere un nuevo comprobante del presidente.
                  </p>
                  <BotonSecundario
                    etiqueta="Volver al Directorio de Equipos"
                    alHacerClick={() => navigate(ROUTES.ADMIN.EQUIPOS)}
                  />
                </>
              ) : null}
            </>
          )}
        </div>
      ) : (
        <div className="premium-card main-form-card fade-in">

          <div style={{ marginBottom: '30px', borderBottom: `1px solid ${COLORS.slate100}`, paddingBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p className="required-legend" style={{ margin: 0 }}>
              <span className="required-star">*</span> Indica que el campo es obligatorio.
            </p>
          </div>

          {/* PASO 1: SELECCION DE SEGURO / SLOT A CONSUMIR */}
          <section style={{ marginBottom: '45px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '24px' }}>
              <StepBadge number="1" isActive={!isStep1Done} isDone={isStep1Done} />
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: COLORS.slate800, margin: 0 }}>Seguro pagado por asignar.</h3>
            </div>

            <div style={{ animation: 'slideUp 0.4s ease', maxWidth: '800px', margin: '0 auto' }}>
              <div className="card" style={{ padding: '25px', borderRadius: '16px', border: `1px solid ${COLORS.slate200}`, background: COLORS.slate50 }}>
                <label className="form-label" style={{ fontWeight: '700', fontSize: '14px', marginBottom: '12px', display: 'block' }}>
                  Seleccione el seguro comprado que desea para esta inscripción: <span className="required-star">*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                  {slotsData?.seguros_disponibles?.map((seg) => {
                    const matchedSeguro = catalogs?.seguros?.find(s => s.id === seg.SeguroId);
                    const isSelected = String(selectedSeguroId) === String(seg.SeguroId);
                    return (
                      <div
                        key={`seguro-card-${seg.SeguroId}`}
                        onClick={() => setSelectedSeguroId(prev => prev === String(seg.SeguroId) ? '' : String(seg.SeguroId))}
                        style={{
                          padding: '16px',
                          borderRadius: '12px',
                          border: isSelected ? `2.5px solid ${COLORS.primary}` : `1px solid ${COLORS.slate300}`,
                          backgroundColor: isSelected ? COLORS.secondaryBg : 'white',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '14px', fontWeight: '800', color: isSelected ? COLORS.primary : COLORS.slate800 }}>
                            🛡️ {matchedSeguro ? matchedSeguro.nombre : `Seguro ID ${seg.SeguroId}`}
                          </span>
                          {matchedSeguro && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                abrirModalDetalle(matchedSeguro);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: COLORS.brandBlueLight,
                                cursor: 'pointer',
                                fontSize: '16px',
                                padding: '2px 6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title="Ver información del seguro"
                            >
                              ℹ️
                            </button>
                          )}
                        </div>
                        {matchedSeguro?.precio !== undefined && (
                          <span style={{ fontSize: '12px', color: COLORS.slate500, fontWeight: '600' }}>
                            Precio: ${matchedSeguro.precio} MXN
                          </span>
                        )}
                        <div style={{ marginTop: '5px', display: 'inline-flex', alignSelf: 'start', padding: '2px 8px', borderRadius: '20px', background: COLORS.greenBg, color: COLORS.greenDarker, fontSize: '11px', fontWeight: '800' }}>
                          {seg.Cantidad} disponibles
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* PASO 2: CARGA DE DOCUMENTOS */}
          {showStep2 && (
            <section className="fade-in" style={{ marginBottom: '45px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                <StepBadge number="2" isActive={!isStep2Done} isDone={isStep2Done} />
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: COLORS.slate800, margin: 0 }}>Carga de Documentación</h3>
              </div>

              <div className="info-alert-box">
                <span style={{ fontSize: '18px' }}>📋</span>
                Recomendamos subir primero el<strong style={{ marginLeft: 4 }}>Acta de Nacimiento / INE</strong>el sistema detectará la minoría de edad y ajustará los requisitos.
              </div>

              <div className="doc-cards-grid">
                {documentCards.map((doc) => (
                  <div
                    key={doc.key}
                    className="document-card"
                    onClick={() => document.getElementById(`file-${doc.key}`).click()}
                    onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(prev => ({ ...prev, [doc.key]: true })); }}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(prev => ({ ...prev, [doc.key]: false })); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragActive(prev => ({ ...prev, [doc.key]: false }));
                      const file = e.dataTransfer.files[0];
                      if (file) handleFileUpload(doc.key, file);
                    }}
                    style={{
                      backgroundColor: dragActive[doc.key] ? 'rgba(26, 59, 92, 0.05)' : 'white',
                      borderRadius: '20px',
                      border: dragActive[doc.key] ? `2px solid ${COLORS.primary}` : (documents[doc.key] ? `2px solid ${COLORS.success}` : `2px dashed ${COLORS.slate300}`),
                      padding: '15px',
                      textAlign: 'center',
                      transition: 'all 0.3s',
                      position: 'relative',
                      overflow: 'hidden',
                      cursor: 'pointer'
                    }}
                  >
                    {/* Indicador de Menor para tutor/credencial */}
                    {esMenorDeEdad && (doc.key === 'ineTutor' || doc.key === 'identificacionMenor') && (
                      <div style={{ position: 'absolute', top: 10, right: 10, background: `linear-gradient(90deg,${COLORS.warning},${COLORS.warningLight})`, borderRadius: '12px', padding: '3px 9px', fontSize: '9px', fontWeight: '950', color: 'white', letterSpacing: '0.5px', zIndex: 1 }}>Menor de edad</div>
                    )}

                    <div style={{
                      height: '140px',
                      width: '100%',
                      backgroundColor: COLORS.slate50,
                      borderRadius: '12px',
                      marginBottom: '10px',
                      position: 'relative',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `1px solid ${COLORS.slate100}`
                    }}
                    >
                      {previews[doc.key] ? (
                        <div className="preview-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
                          {documents[doc.key]?.type === 'application/pdf' ? (
                            <div style={{ color: COLORS.danger, fontSize: '45px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                              <FaFilePdf />
                              <span style={{ fontSize: '10px', color: COLORS.slate500, fontWeight: '800' }}>PDF</span>
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
                            backgroundColor: COLORS.overlaySlateGray,
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
                                const isPdf = documents[doc.key]?.type === 'application/pdf';
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
                                backgroundColor: COLORS.white, color: COLORS.slate800, border: 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: `0 4px 6px -1px ${COLORS.shadow10}`, cursor: 'pointer'
                              }}
                            >
                              <FaSearchPlus />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (doc.key === 'foto') {
                                  Swal.fire({
                                    title: 'Selecciona una opción',
                                    text: '¿Cómo deseas cargar la fotografía?',
                                    icon: 'question',
                                    showCancelButton: true,
                                    confirmButtonText: '📷 Tomar con cámara',
                                    cancelButtonText: '📁 Subir archivo',
                                    confirmButtonColor: COLORS.primary,
                                    cancelButtonColor: COLORS.slate500
                                  }).then((result) => {
                                    if (result.isConfirmed) {
                                      setIsCameraOpen(true);
                                    } else if (result.dismiss === Swal.DismissReason.cancel) {
                                      document.getElementById(`file-${doc.key}`).click();
                                    }
                                  });
                                } else {
                                  document.getElementById(`file-${doc.key}`).click();
                                }
                              }}
                              className="btn-change"
                              style={{
                                width: '36px', height: '36px', borderRadius: '50%',
                                backgroundColor: COLORS.sky, color: COLORS.white, border: 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: `0 4px 6px -1px ${COLORS.shadow10}`, cursor: 'pointer'
                              }}
                            >
                              <FaSyncAlt />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveDocument(doc.key)}
                              className="btn-delete"
                              style={{
                                width: '36px', height: '36px', borderRadius: '50%',
                                backgroundColor: COLORS.danger, color: COLORS.white, border: 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: `0 4px 6px -1px ${COLORS.shadow10}`, cursor: 'pointer',
                                marginLeft: '6px'
                              }}
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* ESTADO VACÍO */
                        <div
                          onClick={() => {
                            if (doc.key === 'foto') {
                              Swal.fire({
                                title: 'Selecciona una opción',
                                text: '¿Cómo deseas cargar la fotografía?',
                                icon: 'question',
                                showCancelButton: true,
                                confirmButtonText: '📷 Tomar con cámara',
                                cancelButtonText: '📁 Subir archivo',
                                confirmButtonColor: COLORS.primary,
                                cancelButtonColor: COLORS.slate500
                              }).then((result) => {
                                if (result.isConfirmed) {
                                  setIsCameraOpen(true);
                                } else if (result.dismiss === Swal.DismissReason.cancel) {
                                  document.getElementById(`file-${doc.key}`).click();
                                }
                              });
                            } else {
                              document.getElementById(`file-${doc.key}`).click();
                            }
                          }}
                          style={{ textAlign: 'center', color: COLORS.slate400, cursor: 'pointer' }}
                        >
                          <FaUpload style={{ fontSize: '28px', marginBottom: '6px' }} />
                          <p style={{ margin: 0, fontSize: '10px', fontWeight: '800' }}>SUBIR ARCHIVO</p>
                        </div>
                      )}
                    </div>

                    <h4 style={{ fontSize: '13px', fontWeight: '800', margin: '8px 0 5px 0', color: COLORS.slate800 }}>{doc.title}</h4>
                    <p style={{ margin: '0 0 6px', fontSize: '10px', color: COLORS.slate500, lineHeight: 1.4 }}>{doc.subtitle}</p>
                    {doc.key === 'foto' && (
                      <p style={{ margin: '0 0 8px', fontSize: '10px', color: COLORS.danger, fontStyle: 'italic', fontWeight: '500', lineHeight: 1.4 }}>
                        Mantén una postura recta, visibilidad de hombros, sin sonrisa, ni accesorios como lentes, aretes o gorras.
                      </p>
                    )}
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      backgroundColor: documents[doc.key] ? COLORS.greenBg : COLORS.slate100,
                      color: documents[doc.key] ? COLORS.greenDeep : COLORS.slate500,
                      fontSize: '10px',
                      fontWeight: '800'
                    }}>
                      {documents[doc.key] ? <><FaCheckCircle /> Listo</> : 'Pendiente'}
                    </div>

                    {/* Botón de validación fallida y bypass para fotografía */}
                    {doc.key === 'foto' && !documents.foto && failedPhoto && (
                      <div style={{ marginTop: '8px' }}>
                        <button
                          type="button"
                          onClick={forceLoadFailedPhoto}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            backgroundColor: COLORS.warning,
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
                            boxShadow: `0 2px 4px ${COLORS.warningBgTranslucent30}`,
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={e => e.target.style.backgroundColor = COLORS.warningDark}
                          onMouseLeave={e => e.target.style.backgroundColor = COLORS.warning}
                        >
                          ⚠️ Cargar igualmente
                        </button>
                      </div>
                    )}

                    <input
                      type="file"
                      id={`file-${doc.key}`}
                      style={{ display: 'none' }}
                      accept={doc.key === 'foto' ? ".jpg,.jpeg,.png" : ".pdf,.jpg,.jpeg,.png"}
                      onChange={(e) => handleFileUpload(doc.key, e.target.files[0])}
                    />
                  </div>
                ))}
              </div>

              <CameraCaptureModal
                isOpen={isCameraOpen}
                onClose={() => setIsCameraOpen(false)}
                onCapture={(file) => handleFileUpload('foto', file)}
              />

              {/* Loader temporal OCR */}
              {documents.acta && !extractedData.fechaNacimiento && (
                <div className="fade-in" style={{ marginTop: '16px', padding: '12px 18px', background: COLORS.warningBgLight, border: `1px dashed ${COLORS.warningLight}`, borderRadius: '10px', fontSize: '12px', color: COLORS.orangeDeep, fontWeight: '600' }}>
                  Analizando el Acta de Nacimiento... Los campos se rellenarán automáticamente en breve. Si no es así, puedes completarlos manualmente.
                </div>
              )}


            </section>
          )}

          {/* PASO 3: FORMULARIO DE INFORMACIÓN DEL JUGADOR */}
          {showStep3 && (
            <section className="fade-in" style={{ marginBottom: '40px' }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <StepBadge number="3" isActive={true} isDone={false} />
                    <h3 style={{ fontSize: '17px', fontWeight: '700', color: COLORS.slate800, margin: 0 }}>Formulario de afiliación completo</h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetForm}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${COLORS.danger}`,
                      background: 'white',
                      color: COLORS.danger,
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.target.style.background = COLORS.dangerBgLight; }}
                    onMouseLeave={e => { e.target.style.background = 'white'; }}
                  >
                    <FaTrash /> Limpiar formulario
                  </button>
                </div>
              </div>

              {/* AVISO DE DISCREPANCIA OCR */}
              {ocrDataOriginal && (
                extractedData.nombreJugador?.toUpperCase() !== ocrDataOriginal.nombreJugador?.toUpperCase() ||
                extractedData.curp?.toUpperCase() !== ocrDataOriginal.curp?.toUpperCase()
              ) && (
                  <div className="fade-in" style={{
                    marginBottom: '20px',
                    padding: '16px',
                    borderRadius: '12px',
                    background: COLORS.orange50,
                    border: `1px solid ${COLORS.orange100}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{ fontSize: '20px' }}>⚠️</div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: COLORS.orangeDeep }}>
                        Discrepancia detectada
                      </h4>
                      <p style={{ margin: 0, fontSize: '12px', color: COLORS.orangeDarker }}>
                        La información ingresada difiere de la detectada en el documento subido. Por favor, verifica tu captura.
                      </p>
                    </div>
                  </div>
                )}

              {/* CAMPOS DEL FORMULARIO */}
              <div className="inner-form-card">

                <div className="form-grid-4">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: COLORS.slate600 }}>Nombre(s) <span className="required-star">*</span></label>
                    <input
                      type="text"
                      maxLength={30}
                      value={extractedData.nombreJugador}
                      onChange={e => handleFieldChange('nombreJugador', e.target.value)}
                      placeholder="Ej. Juan"
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: validationErrors.nombreJugador
                          ? `1.5px solid ${COLORS.danger}`
                          : (missingOcrFields.includes('nombreJugador') && !extractedData.nombreJugador
                            ? `1.5px dashed ${COLORS.warning || '#f59e0b'}`
                            : `1px solid ${COLORS.slate300}`),
                        backgroundColor: missingOcrFields.includes('nombreJugador') && !extractedData.nombreJugador
                          ? '#fef3c7'
                          : 'white',
                        fontSize: '14px',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}
                    />
                    {missingOcrFields.includes('nombreJugador') && !extractedData.nombreJugador && (
                      <span style={{ color: '#d97706', fontSize: '11px', fontWeight: 'bold' }}>
                        No se pudo completar automáticamente
                      </span>
                    )}
                    {validationErrors.nombreJugador && <span style={{ color: COLORS.danger, fontSize: '11px', fontWeight: 'bold' }}>❌ {validationErrors.nombreJugador}</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: COLORS.slate600 }}>Ap. Paterno <span className="required-star">*</span></label>
                    <input
                      type="text"
                      maxLength={30}
                      value={extractedData.apellidoPaterno}
                      onChange={e => handleFieldChange('apellidoPaterno', e.target.value)}
                      placeholder="Ej. Pérez"
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: validationErrors.apellidoPaterno
                          ? `1.5px solid ${COLORS.danger}`
                          : (missingOcrFields.includes('apellidoPaterno') && !extractedData.apellidoPaterno
                            ? `1.5px dashed ${COLORS.warning || '#f59e0b'}`
                            : `1px solid ${COLORS.slate300}`),
                        backgroundColor: missingOcrFields.includes('apellidoPaterno') && !extractedData.apellidoPaterno
                          ? '#fef3c7'
                          : 'white',
                        fontSize: '14px',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}
                    />
                    {missingOcrFields.includes('apellidoPaterno') && !extractedData.apellidoPaterno && (
                      <span style={{ color: '#d97706', fontSize: '11px', fontWeight: 'bold' }}>
                        No se pudo completar automáticamente
                      </span>
                    )}
                    {validationErrors.apellidoPaterno && <span style={{ color: COLORS.danger, fontSize: '11px', fontWeight: 'bold' }}>❌ {validationErrors.apellidoPaterno}</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: COLORS.slate600 }}>Ap. Materno <span className="required-star">*</span></label>
                    <input
                      type="text"
                      maxLength={30}
                      value={extractedData.apellidoMaterno}
                      onChange={e => handleFieldChange('apellidoMaterno', e.target.value)}
                      placeholder="Ej. Gómez"
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: validationErrors.apellidoMaterno
                          ? `1.5px solid ${COLORS.danger}`
                          : (missingOcrFields.includes('apellidoMaterno') && !extractedData.apellidoMaterno
                            ? `1.5px dashed ${COLORS.warning || '#f59e0b'}`
                            : `1px solid ${COLORS.slate300}`),
                        backgroundColor: missingOcrFields.includes('apellidoMaterno') && !extractedData.apellidoMaterno
                          ? '#fef3c7'
                          : 'white',
                        fontSize: '14px',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}
                    />
                    {missingOcrFields.includes('apellidoMaterno') && !extractedData.apellidoMaterno && (
                      <span style={{ color: '#d97706', fontSize: '11px', fontWeight: 'bold' }}>
                        No se pudo completar automáticamente
                      </span>
                    )}
                    {validationErrors.apellidoMaterno && <span style={{ color: COLORS.danger, fontSize: '11px', fontWeight: 'bold' }}>❌ {validationErrors.apellidoMaterno}</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: COLORS.slate600 }}>
                      CURP<span className="required-star">*</span>
                      {isCheckingCurp && <span style={{ marginLeft: '10px', color: COLORS.success, fontSize: '11px', fontWeight: 'bold' }}>Validando...</span>}
                    </label>
                    <input
                      type="text"
                      value={extractedData.curp || ''}
                      readOnly
                      onBlur={() => handleBlur('curp')}
                      placeholder="Se auto-completará con el documento de identidad"
                      maxLength="18"
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: validationErrors.curp
                          ? `1.5px solid ${COLORS.danger}`
                          : (missingOcrFields.includes('curp') && !extractedData.curp
                            ? `1.5px dashed ${COLORS.warning || '#f59e0b'}`
                            : `1px solid ${COLORS.slate300}`),
                        fontSize: '14px',
                        width: '100%',
                        boxSizing: 'border-box',
                        backgroundColor: missingOcrFields.includes('curp') && !extractedData.curp ? '#fef3c7' : '#f1f5f9',
                        cursor: missingOcrFields.includes('curp') && !extractedData.curp ? 'text' : 'not-allowed'
                      }}
                    />
                    {missingOcrFields.includes('curp') && !extractedData.curp && (
                      <span style={{ color: '#d97706', fontSize: '11px', fontWeight: 'bold' }}>
                        No se pudo completar automáticamente
                      </span>
                    )}
                    {validationErrors.curp && <span className="field-error-msg">❌ {validationErrors.curp}</span>}
                  </div>
                </div>

                <div className="form-grid-3">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: COLORS.slate600 }}>Fecha Nac. <span className="required-star">*</span></label>
                    <input
                      type="date"
                      value={extractedData.fechaNacimiento || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setExtractedData({ ...extractedData, fechaNacimiento: val });
                        const dateError = validarFechaNacimiento(val);
                        setValidationErrors(prev => ({ ...prev, fechaNacimiento: dateError }));
                      }}
                      onBlur={() => handleBlur('fechaNacimiento')}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: validationErrors.fechaNacimiento
                          ? `1.5px solid ${COLORS.danger}`
                          : (missingOcrFields.includes('fechaNacimiento') && !extractedData.fechaNacimiento
                            ? `1.5px dashed ${COLORS.warning || '#f59e0b'}`
                            : `1px solid ${COLORS.slate300}`),
                        backgroundColor: missingOcrFields.includes('fechaNacimiento') && !extractedData.fechaNacimiento
                          ? '#fef3c7'
                          : 'white',
                        fontSize: '14px',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}
                    />
                    {missingOcrFields.includes('fechaNacimiento') && !extractedData.fechaNacimiento && (
                      <span style={{ color: '#d97706', fontSize: '11px', fontWeight: 'bold' }}>
                        No se pudo completar automáticamente
                      </span>
                    )}
                    {(() => {
                      const val = extractedData.fechaNacimiento;
                      if (!val) return null;
                      const parts = val.split('-');
                      const fechaDate = new Date(val);
                      const hoy = new Date();

                      if (
                        isNaN(fechaDate.getTime()) ||
                        (parts.length === 3 && (fechaDate.getUTCFullYear() !== parseInt(parts[0], 10) || fechaDate.getUTCMonth() + 1 !== parseInt(parts[1], 10) || fechaDate.getUTCDate() !== parseInt(parts[2], 10)))
                      ) {
                        return <div style={{ color: COLORS.danger, fontSize: '11px', marginTop: '6px', fontWeight: '700' }}>La fecha ingresada no existe en el calendario</div>;
                      }

                      if (fechaDate.getFullYear() < 1900) {
                        return <div style={{ color: COLORS.danger, fontSize: '11px', marginTop: '6px', fontWeight: '700' }}>El año de nacimiento no puede ser menor a 1900</div>;
                      }
                      if (fechaDate.getFullYear() > hoy.getFullYear()) {
                        return <div style={{ color: COLORS.danger, fontSize: '11px', marginTop: '6px', fontWeight: '700' }}>El año de nacimiento es inválido</div>;
                      }

                      const minAgeDate = new Date(hoy.getFullYear() - 2, hoy.getMonth(), hoy.getDate());
                      if (fechaDate > minAgeDate) {
                        return <div style={{ color: COLORS.danger, fontSize: '11px', marginTop: '6px', fontWeight: '700' }}>El jugador debe tener al menos 2 años</div>;
                      }

                      return null;
                    })()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: COLORS.slate600 }}>Lugar de Nacimiento <span className="required-star">*</span></label>
                    <input
                      type="text"
                      maxLength={30}
                      value={extractedData.lugarNacimiento || ''}
                      onChange={e => handleFieldChange('lugarNacimiento', e.target.value)}
                      placeholder="Ej. Monterrey, NL"
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: missingOcrFields.includes('lugarNacimiento') && !extractedData.lugarNacimiento
                          ? `1.5px dashed ${COLORS.warning || '#f59e0b'}`
                          : `1px solid ${COLORS.slate300}`,
                        backgroundColor: missingOcrFields.includes('lugarNacimiento') && !extractedData.lugarNacimiento
                          ? '#fef3c7'
                          : 'white',
                        fontSize: '14px',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}
                    />
                    {missingOcrFields.includes('lugarNacimiento') && !extractedData.lugarNacimiento && (
                      <span style={{ color: '#d97706', fontSize: '11px', fontWeight: 'bold' }}>
                        No se pudo completar automáticamente
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: COLORS.slate600 }}>Sexo <span className="required-star">*</span></label>
                    <select value={extractedData.genero || ""} onChange={e => setExtractedData({ ...extractedData, genero: e.target.value })} style={{ padding: '10px', borderRadius: '8px', border: `1px solid ${COLORS.slate300}`, fontSize: '14px', backgroundColor: 'white', width: '100%', boxSizing: 'border-box' }}>
                      <option value="">Seleccione...</option>
                      <option value="1">MASCULINO</option>
                      <option value="2">FEMENINO</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: COLORS.slate600 }}># Camiseta <span className="required-star">*</span></label>
                    <input
                      type="text"
                      maxLength={3}
                      value={extractedData.numCamiseta}
                      onChange={e => handleFieldChange('numCamiseta', e.target.value)}
                      onBlur={() => handleBlur('numCamiseta')}
                      placeholder="Ej. 10"
                      style={{ padding: '10px', borderRadius: '8px', border: `1px solid ${validationErrors.numCamiseta ? COLORS.danger : COLORS.slate300}`, fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
                    />
                    {validationErrors.numCamiseta && <span className="field-error-msg">❌ {validationErrors.numCamiseta}</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: COLORS.slate600 }}>Posición en el campo <span className="required-star">*</span></label>
                    <select
                      value={extractedData.posicion}
                      onChange={e => {
                        const val = parseInt(e.target.value) || '';
                        setExtractedData(prev => ({ ...prev, posicion: val }));
                        if (val) {
                          const duplicate = obtenerDuplicadoPosicion(val);
                          if (duplicate) {
                            const posNombre = catalogs?.roles_equipo?.find(r => String(r.id) === String(val))?.nombre || 'esta posición';
                            setValidationErrors(prev => ({
                              ...prev,
                              posicion: `La posición de ${posNombre} ya está asignada al Jugador ${duplicate.NombreCompleto}.`
                            }));
                          } else {
                            setValidationErrors(prev => ({ ...prev, posicion: null }));
                          }
                        } else {
                          setValidationErrors(prev => ({ ...prev, posicion: null }));
                        }
                      }}
                      onBlur={() => handleBlur('posicion')}
                      style={{ padding: '10px', borderRadius: '8px', border: `1px solid ${validationErrors.posicion ? COLORS.danger : COLORS.slate300}`, fontSize: '14px', backgroundColor: 'white', width: '100%', boxSizing: 'border-box' }}
                    >
                      <option value="">Posición...</option>
                      {(catalogs?.roles_equipo || []).map(r => (
                        <option key={r.id} value={r.id}>{r.nombre}</option>
                      ))}
                    </select>
                    {validationErrors.posicion && <span className="field-error-msg">❌ {validationErrors.posicion}</span>}
                  </div>
                </div>

                <div className="form-grid-2">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: COLORS.slate600 }}>Correo electrónico <span className="required-star">*</span></label>
                    <input
                      type="email"
                      maxLength={60}
                      value={extractedData.correo}
                      onChange={e => handleFieldChange('correo', e.target.value)}
                      placeholder="correo@ejemplo.com"
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: missingOcrFields.includes('correo') && !extractedData.correo
                          ? `1.5px dashed ${COLORS.warning || '#f59e0b'}`
                          : `1px solid ${COLORS.slate300}`,
                        backgroundColor: missingOcrFields.includes('correo') && !extractedData.correo
                          ? '#fef3c7'
                          : 'white',
                        fontSize: '14px',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}
                    />
                    {missingOcrFields.includes('correo') && !extractedData.correo && (
                      <span style={{ color: '#d97706', fontSize: '11px', fontWeight: 'bold' }}>
                        Completa manualmente.
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: COLORS.slate600 }}># de Teléfono <span className="required-star">*</span></label>
                    <div className="phone-input-row">
                      <select
                        value={extractedData.codigoPais || '+52'}
                        onChange={e => setExtractedData({ ...extractedData, codigoPais: e.target.value })}
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: `1px solid ${COLORS.slate300}`,
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
                        value={extractedData.telefono}
                        onChange={e => handleFieldChange('telefono', e.target.value)}
                        placeholder="10 dígitos numéricos"
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: missingOcrFields.includes('telefono') && !extractedData.telefono
                            ? `1.5px dashed ${COLORS.warning || '#f59e0b'}`
                            : `1px solid ${COLORS.slate300}`,
                          backgroundColor: missingOcrFields.includes('telefono') && !extractedData.telefono
                            ? '#fef3c7'
                            : 'white',
                          fontSize: '14px',
                          flexGrow: 1
                        }}
                      />
                    </div>
                    {missingOcrFields.includes('telefono') && !extractedData.telefono && (
                      <span style={{ color: '#d97706', fontSize: '11px', fontWeight: 'bold' }}>
                        Completa manualmente.
                      </span>
                    )}
                  </div>
                </div>

                {/* Selector de Nacionalidad */}
                <section className="fade-in" style={{ marginBottom: '40px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                    <FaGlobeAmericas style={{ color: COLORS.primary, fontSize: '20px' }} />
                    <h3 style={{ fontSize: '17px', fontWeight: '700', color: COLORS.slate800, margin: 0 }}>Nacionalidad del jugador</h3>
                  </div>

                  <div className="nacionalidad-toggle">
                    <button
                      type="button"
                      onClick={() => setExtractedData(prev => ({ ...prev, esForaneo: false }))}
                      style={{
                        padding: '10px 24px',
                        borderRadius: '10px',
                        border: 'none',
                        background: !extractedData.esForaneo ? 'white' : 'transparent',
                        color: !extractedData.esForaneo ? COLORS.primary : COLORS.slate500,
                        fontWeight: '800',
                        fontSize: '13px',
                        boxShadow: !extractedData.esForaneo ? `0 4px 6px -1px ${COLORS.shadow10}` : 'none',
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
                      onClick={() => setExtractedData(prev => ({ ...prev, esForaneo: true }))}
                      style={{
                        padding: '10px 24px',
                        borderRadius: '10px',
                        border: 'none',
                        background: extractedData.esForaneo ? 'white' : 'transparent',
                        color: extractedData.esForaneo ? COLORS.primary : COLORS.slate500,
                        fontWeight: '800',
                        fontSize: '13px',
                        boxShadow: extractedData.esForaneo ? `0 4px 6px -1px ${COLORS.shadow10}` : 'none',
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
                <div className="international-info-card" style={{ backgroundColor: COLORS.orange50, border: `1px solid ${COLORS.orange100}`, padding: '15px', borderRadius: '24px', boxShadow: `0 10px 15px -3px ${COLORS.shadow05}`, marginTop: '20px', width: '100%', boxSizing: 'border-box' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px', borderBottom: `1px solid ${COLORS.orange100}`, paddingBottom: '20px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: COLORS.warningBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.warningDark }}>
                      <FaGlobeAmericas />
                    </div>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: COLORS.orangeDeep }}>Antecedentes internacionales</h4>
                  </div>

                  {extractedData.esForaneo ? (
                    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '20px', width: '100%' }}>
                      <div className="form-inputs-grid-2" style={{ width: '100%' }}>
                        <EntradaFormulario
                          etiqueta="Nacionalidad del jugador"
                          valor={extractedData.nacionalidadJugador}
                          alCambiar={e => handleFieldChange('nacionalidadJugador', e.target.value)}
                        />
                        <EntradaFormulario
                          etiqueta="País de residencia actual"
                          valor={extractedData.paisResidencia}
                          alCambiar={e => handleFieldChange('paisResidencia', e.target.value)}
                        />
                      </div>

                      <div className="form-inputs-grid-2" style={{ alignItems: 'end', width: '100%' }}>
                        <EntradaSeleccion
                          etiqueta="¿El jugador ha vivido en el extranjero?"
                          valor={extractedData.haVividoExtranjero ? '1' : '0'}
                          alCambiar={e => setExtractedData({ ...extractedData, haVividoExtranjero: e.target.value === '1' })}
                          opciones={[{ valor: '0', etiqueta: 'No' }, { valor: '1', etiqueta: 'Sí' }]}
                          obligatorio={true}
                        />
                        {extractedData.haVividoExtranjero && (
                          <EntradaFormulario
                            etiqueta="¿En qué país?"
                            valor={extractedData.dondeVividoExtranjero}
                            alCambiar={e => handleFieldChange('dondeVividoExtranjero', e.target.value)}
                            obligatorio={true}
                          />
                        )}
                      </div>

                      <div className="form-inputs-grid-2" style={{ width: '100%' }}>
                        <EntradaFormulario
                          etiqueta="Nacionalidad del padre"
                          valor={extractedData.nacionalidadPadre}
                          alCambiar={e => handleFieldChange('nacionalidadPadre', e.target.value)}
                        />
                        <EntradaFormulario
                          etiqueta="Nacionalidad de la madre"
                          valor={extractedData.nacionalidadMadre}
                          alCambiar={e => handleFieldChange('nacionalidadMadre', e.target.value)}
                        />
                      </div>

                      <EntradaFormulario
                        etiqueta="El jugador ha sido registrado por la Asociación Nacional de Fútbol (en el extranjero) como jugador amateur o profesional, previo a su solitud de registro en la FMF (Si - No)"
                        valor={extractedData.registroAsociacionExtranjera}
                        alCambiar={e => handleFieldChange('registroAsociacionExtranjera', e.target.value)}
                        filas={2}
                        obligatorio={true}
                      />

                      <div className="abuelos-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', width: '100%' }}>
                        <EntradaFormulario etiqueta="Nac. Abuelo Paterno" valor={extractedData.nacAbueloPaterno} alCambiar={e => handleFieldChange('nacAbueloPaterno', e.target.value)} />
                        <EntradaFormulario etiqueta="Nac. Abuela Paterna" valor={extractedData.nacAbuelaPaterna} alCambiar={e => handleFieldChange('nacAbuelaPaterna', e.target.value)} />
                        <EntradaFormulario etiqueta="Nac. Abuelo Materno" valor={extractedData.nacAbueloMaterno} alCambiar={e => handleFieldChange('nacAbueloMaterno', e.target.value)} />
                        <EntradaFormulario etiqueta="Nac. Abuela Materna" valor={extractedData.nacAbuelaMaterna} alCambiar={e => handleFieldChange('nacAbuelaMaterna', e.target.value)} />
                      </div>

                      <EntradaFormulario
                        etiqueta="El jugador ha jugado en un Club extranjero y participado en Torneos y/o competencias internacionales, escolares o de recreo como campamentos estacionales, cursos, etc"
                        valor={extractedData.juegoClubExtranjero}
                        alCambiar={e => handleFieldChange('juegoClubExtranjero', e.target.value)}
                        filas={3}
                        obligatorio={true}
                      />
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <p style={{ margin: 0, fontSize: '13px', color: COLORS.orangeDeep, fontStyle: 'italic' }}>
                        Si el jugador es extranjero, habilite esta opción para completar los antecedentes internacionales.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ACCIONES FINALES */}
              <div className="action-buttons-container">
                <BotonSecundario
                  etiqueta="Cancelar y volver"
                  alHacerClick={() => navigate(ROUTES.ADMIN.EQUIPOS)}
                  estilo={{ minWidth: '200px' }}
                />
                <BotonPrimario
                  etiqueta={submitting ? "Procesando..." : "Descargar formato y continuar"}
                  icono={<FaSave />}
                  alHacerClick={handleGuardar}
                  deshabilitado={submitting || esFormularioIncompleto()}
                  estilo={{ minWidth: '300px' }}
                />
              </div>
            </section>
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
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '300px',
          backgroundColor: COLORS.slate100,
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          {previewDoc.type === 'pdf' ? (
            <iframe
              src={`${previewDoc.url}#toolbar=0&navpanes=0`}
              style={{ width: '100%', height: '70vh', border: 'none' }}
              title="Visor de PDF"
            />
          ) : (
            <img
              src={previewDoc.url}
              alt="Preview Grande"
              style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
            />
          )}
        </div>
      </Modal>

      {/* MODAL DE FINALIZACIÓN Y CARGA DE FORMATO FIRMADO */}
      <Modal
        estaAbierto={showFinishModal}
        titulo="Finalizar Inscripción de Jugador"
        alCerrar={() => setShowFinishModal(false)}
        tamanio="medio"
        pie={
          <>
            <BotonSecundario etiqueta="Cancelar" alHacerClick={() => setShowFinishModal(false)} />
            <BotonPrimario
              etiqueta={submitting ? "Enviando..." : "Finalizar Inscripción"}
              icono={<FaCheckCircle />}
              alHacerClick={handleFinalizarInscripcion}
              deshabilitado={submitting}
            />
          </>
        }
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', justifyContent: 'center' }}>
            <button
              onClick={() => handleDownloadFormato()}
              style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryActive})`, color: 'white', fontWeight: '800', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              📥 Descargar Formato
            </button>
          </div>
          <div style={{
            backgroundColor: COLORS.skyBgLight,
            border: `1px solid ${COLORS.sky100}`,
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '25px',
            color: COLORS.skyDarker,
            fontSize: '14px',
            lineHeight: '1.6'
          }}>
            <p style={{ margin: 0, fontWeight: '700', marginBottom: '10px' }}>
              Formato de Afiliación — Subida Opcional
            </p>
            <p style={{ margin: 0 }}>
              Descarga el formato pre-llenado con el botón de arriba, imprímelo, fírmalo y escanéalo para subirlo.
              <strong> Si aún no tienes el formato firmado, puedes continuar sin subirlo ahora</strong> y cargarlo después desde
              la sección <em>AdminJugadores → Docs</em>.
            </p>
          </div>

          <div
            onClick={() => { if (!signedForm) document.getElementById('final-signed-form').click(); }}
            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingSignedForm(true); }}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingSignedForm(false); }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingSignedForm(false);
              const file = e.dataTransfer.files[0];
              if (file) {
                const ext = '.' + file.name.split('.').pop().toLowerCase();
                const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
                const allowedExt = ['.pdf', '.jpg', '.jpeg', '.png'];
                if (!allowed.includes(file.type) || !allowedExt.includes(ext)) {
                  Swal.fire({ title: 'Tipo de archivo no permitido', text: 'Solo se aceptan archivos PDF, JPG, JPEG o PNG.', icon: 'error', confirmButtonColor: COLORS.primary });
                  return;
                }
                setSignedForm(file);
              }
            }}
            className={signedForm ? "document-card" : ""}
            style={{
              border: signedForm
                ? `2px solid ${COLORS.success}`
                : (isDraggingSignedForm
                  ? `2px solid ${COLORS.primary}`
                  : `2px dashed ${COLORS.sky}`),
              borderRadius: '20px',
              padding: '40px 20px',
              backgroundColor: signedForm
                ? COLORS.greenBg50
                : (isDraggingSignedForm
                  ? 'rgba(26, 59, 92, 0.05)'
                  : COLORS.slate50),
              cursor: !signedForm ? 'pointer' : 'default',
              transition: 'all 0.3s',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {signedForm ? (
              <div style={{ color: COLORS.success }}>
                <FaFilePdf style={{ fontSize: '50px', marginBottom: '15px' }} />
                <p style={{ margin: 0, fontWeight: '700' }}>{signedForm.name}</p>
                <p style={{ margin: '5px 0 0 0', fontSize: '12px' }}>Archivo listo para enviar</p>

                {/* Overlay actions when hover */}
                <div className="overlay-actions" style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: COLORS.overlaySlateGray,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  opacity: 0,
                  transition: 'opacity 0.2s ease',
                  backdropFilter: 'blur(2px)',
                  zIndex: 2
                }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const url = typeof signedForm === 'string' ? signedForm : URL.createObjectURL(signedForm);
                      setPreviewDoc({
                        open: true,
                        url: url,
                        type: 'pdf',
                        title: 'Formato de Afiliación Oficial'
                      });
                    }}
                    className="btn-zoom"
                    style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      backgroundColor: COLORS.white, color: COLORS.slate800, border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 4px 6px -1px ${COLORS.shadow10}`, cursor: 'pointer'
                    }}
                  >
                    <FaSearchPlus />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      document.getElementById('final-signed-form').click();
                    }}
                    className="btn-change"
                    style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      backgroundColor: COLORS.sky, color: COLORS.white, border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 4px 6px -1px ${COLORS.shadow10}`, cursor: 'pointer'
                    }}
                  >
                    <FaSyncAlt />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSignedForm(null);
                    }}
                    className="btn-delete"
                    style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      backgroundColor: COLORS.danger, color: COLORS.white, border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 4px 6px -1px ${COLORS.shadow10}`, cursor: 'pointer'
                    }}
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ color: COLORS.sky }}>
                <FaUpload style={{ fontSize: '50px', marginBottom: '15px' }} />
                <p style={{ margin: 0, fontWeight: '700' }}>Haga clic para subir el formato firmado</p>
                <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: COLORS.slate500 }}>Solo se aceptan archivos PDF</p>
              </div>
            )}
            <input
              type="file"
              id="final-signed-form"
              style={{ display: 'none' }}
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => {
                const file = e.target.files[0];
                if (!file) return;
                const ext = '.' + file.name.split('.').pop().toLowerCase();
                const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
                const allowedExt = ['.pdf', '.jpg', '.jpeg', '.png'];
                if (!allowed.includes(file.type) || !allowedExt.includes(ext)) {
                  Swal.fire({ title: 'Tipo de archivo no permitido', text: 'Solo se aceptan archivos PDF, JPG, JPEG o PNG.', icon: 'error', confirmButtonColor: COLORS.primary });
                  return;
                }
                setSignedForm(file);
              }}
            />
          </div>
        </div>
      </Modal>

      {seguroDetalle && (() => {
        const segNombreNormalizado = normalizarNombreSeguro(seguroDetalle.nombre);
        const info = DETALLES_SEGUROS[segNombreNormalizado] || {
          nombre: seguroDetalle.nombre,
          precio: seguroDetalle.precio,
          poliza: 'N/A',
          vigencia: 'N/A',
          alcance: seguroDetalle.descripcion || 'Información general de cobertura y beneficios.',
          beneficios: [seguroDetalle.descripcion || 'Sin descripción adicional.'],
          coberturas: []
        };

        return createPortal(
          <div className="seguro-modal-backdrop">
            <div className="seguro-modal-container">
              {/* Header */}
              <div style={{
                padding: '25px 30px',
                borderBottom: `1px solid ${COLORS.overlayWhite08}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '15px',
                background: `linear-gradient(90deg, ${COLORS.slate800}, ${COLORS.slate900})`
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '12px', fontWeight: '950', color: COLORS.secondaryLight, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Información de Seguro
                  </h3>
                  <h2 style={{ margin: '5px 0 0', fontSize: '22px', fontWeight: '900', color: COLORS.white }}>
                    {info.nombre}
                  </h2>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10px', color: COLORS.overlayWhite50, fontWeight: '700', textTransform: 'uppercase' }}>Costo Unitario</div>
                  <div style={{ fontSize: '26px', fontWeight: '900', color: COLORS.successLight }}>
                    ${Number(info.precio).toFixed(2)} <span style={{ fontSize: '12px', fontWeight: '700', color: COLORS.overlayWhite60 }}>M.N.</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '25px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px' }}>
                  {/* Left Column - Benefits */}
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '900', color: COLORS.slate400, marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${COLORS.overlayWhite06}`, paddingBottom: '6px' }}>
                      Beneficios Incluidos
                    </h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {info.beneficios.map((ben, idx) => (
                        <li key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '13px', lineHeight: '1.5', color: COLORS.overlayWhite85 }}>
                          <span style={{ color: COLORS.successLight, fontWeight: '900', fontSize: '15px' }}>✓</span>
                          <span>{ben}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Right Column - Policy & Scope */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: '900', color: COLORS.slate400, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${COLORS.overlayWhite06}`, paddingBottom: '6px' }}>
                        Detalles de la Póliza
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                        <div style={{ background: COLORS.overlayWhite03, border: `1px solid ${COLORS.overlayWhite06}`, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: COLORS.overlayWhite40, fontWeight: '700', textTransform: 'uppercase' }}>No. de Póliza</div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: COLORS.white, marginTop: '4px' }}>{info.poliza}</div>
                        </div>
                        <div style={{ background: COLORS.overlayWhite03, border: `1px solid ${COLORS.overlayWhite06}`, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: COLORS.overlayWhite40, fontWeight: '700', textTransform: 'uppercase' }}>Vigencia</div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: COLORS.white, marginTop: '4px' }}>{info.vigencia}</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: '900', color: COLORS.slate400, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${COLORS.overlayWhite06}`, paddingBottom: '6px' }}>
                        Alcance y Cobertura
                      </h4>
                      <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.6', color: COLORS.overlayWhite70, background: COLORS.dangerBgTranslucent05, border: `1px solid ${COLORS.dangerBgTranslucent}`, borderRadius: '12px', padding: '14px' }}>
                        {info.alcance.includes('traslados dentro del mismo estado') ? (
                          <>
                            {info.alcance.replace('traslados dentro del mismo estado.', '')}
                            <strong style={{ color: COLORS.danger }}>traslados dentro del mismo estado.</strong>
                          </>
                        ) : info.alcance.includes('traslados de estado a estado') ? (
                          <>
                            {info.alcance.replace('traslados de estado a estado.', '')}
                            <strong style={{ color: COLORS.danger }}>traslados de estado a estado.</strong>
                          </>
                        ) : info.alcance.includes('traslados entre estados') ? (
                          <>
                            {info.alcance.replace('traslados entre estados.', '')}
                            <strong style={{ color: COLORS.danger }}>traslados entre estados.</strong>
                          </>
                        ) : (
                          info.alcance
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Coverages Table (if applicable) */}
                {info.coberturas.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '900', color: COLORS.slate400, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${COLORS.overlayWhite06}`, paddingBottom: '6px' }}>
                      Montos de Cobertura
                    </h4>
                    <div style={{ borderRadius: '16px', border: `1px solid ${COLORS.overlayWhite08}`, overflowX: 'auto' }}>
                      <table style={{ width: '100%', minWidth: '300px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ backgroundColor: COLORS.overlayWhite04, borderBottom: `1px solid ${COLORS.overlayWhite08}` }}>
                            <th style={{ padding: '12px 20px', fontWeight: '800', color: COLORS.overlayWhite60 }}>Cobertura / Concepto</th>
                            <th style={{ padding: '12px 20px', fontWeight: '800', color: COLORS.overlayWhite60, textAlign: 'right' }}>Monto Máximo Amparado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {info.coberturas.map((cob, idx) => (
                            <tr key={idx} style={{ borderBottom: idx === info.coberturas.length - 1 ? 'none' : `1px solid ${COLORS.overlayWhite05}`, backgroundColor: idx % 2 === 0 ? COLORS.overlayWhite01 : 'transparent' }}>
                              <td style={{ padding: '12px 20px', fontWeight: '700', color: COLORS.white }}>{cob.cobertura}</td>
                              <td style={{ padding: '12px 20px', fontWeight: '900', color: cob.cobertura.toLowerCase().includes('deducible') ? COLORS.danger : COLORS.successLight, textAlign: 'right' }}>{cob.monto}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div style={{
                padding: '20px 30px',
                borderTop: `1px solid ${COLORS.overlayWhite08}`,
                backgroundColor: COLORS.overlaySlateLight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                borderBottomLeftRadius: '24px',
                borderBottomRightRadius: '24px'
              }}>
                <button
                  type="button"
                  onClick={() => setSeguroDetalle(null)}
                  style={{
                    background: `linear-gradient(135deg, ${COLORS.brandBlueLight} 0%, ${COLORS.secondaryDark} 100%)`,
                    border: 'none',
                    color: COLORS.white,
                    padding: '10px 28px',
                    borderRadius: '12px',
                    fontWeight: '900',
                    cursor: 'pointer',
                    fontSize: '14px',
                    boxShadow: `0 4px 12px ${COLORS.brandBlueLight30}`,
                    transition: 'all 0.2s'
                  }}
                >
                  Entendido / Cerrar
                </button>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}
    </div>
  );
}
