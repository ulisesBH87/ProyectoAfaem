import COLORS from '../../styles/colors';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  FaFutbol,
  FaMoneyBillWave,
  FaClock,
  FaTimesCircle,
  FaInfoCircle,
  FaTrash
} from 'react-icons/fa';
import { PDFDocument } from 'pdf-lib';
import { validarFotografia } from '../../services/foto';
import { verificarCurp } from '../../services/auth';
import CameraCaptureModal from '../../components/Common/CameraCaptureModal';
import adminService from '../../services/admin';
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
import { useRBAC } from '../../hooks/useRBAC';
import { DEFAULT_BANK_INFO, generarPDFCuota } from '../../utils/paymentPdf';

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

const ESTATUS_PAGO = {
  NO_ENVIADO: 1,
  EN_ESPERA: 2,
  APROBADO: 3,
  RECHAZADO: 4
};

const ESTADO_EQUIPO = {
  SIN_ORDEN: 'SIN_ORDEN',
  ORDEN_SIN_COMPROBANTE: 'ORDEN_SIN_COMPROBANTE',
  COMPROBANTE_EN_REVISION: 'COMPROBANTE_EN_REVISION',
  LISTO_PARA_CREAR_EQUIPO: 'LISTO_PARA_CREAR_EQUIPO'
};

const TIPO_SOLICITUD = {
  PRESIDENTE_EQUIPO: 1,
  EQUIPO: 2,
  JUGADOR: 3
};

export default function ConfigurarEquipo() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { hasRole } = useRBAC();
  const isAdmin = hasRole && (hasRole('ADMINISTRADOR') || hasRole('ADMIN'));

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

  const equipoId = searchParams.get('equipoId');
  const equipoTemporalId = searchParams.get('equipoTemporalId');
  const modoAgregarJugadorUrl = searchParams.get('agregarJugador') === 'true';

  const [activeStep, setActiveStep] = useState(() => {
    if (equipoId && equipoTemporalId) {
      return 2; // Paso 2: Registro de jugadores
    }
    return 0; // Paso 0: Selección de Presidente
  });

  const [selectedPresidentId, setSelectedPresidentId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activePresidents, setActivePresidents] = useState([]);

  const [teamFormData, setTeamFormData] = useState({
    teamName: '',
    teamLogo: null,
    season: '',
    modality: '',
    category: '',
    rama: '',
    agreedToTerms: false
  });

  const [pagoEquipo, setPagoEquipo] = useState({
    loading: true,
    aprobado: false,
    estadoEquipo: ESTADO_EQUIPO.SIN_ORDEN,
    equipoTemporalId: null,
    estado: null,
    ordenId: null,
    total: 0,
    cantidadJugadores: 0,
    tieneComprobante: false,
    referenciaPago: null
  });
  const [pagoError, setPagoError] = useState(null);
  const [numJugadoresPago, setNumJugadoresPago] = useState(25);
  const [asignacionSeguros, setAsignacionSeguros] = useState({});
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [comprobantePagoEquipo, setComprobantePagoEquipo] = useState(null);
  const [catalogoAfiliacionesPago, setCatalogoAfiliacionesPago] = useState([]);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const bankInfo = DEFAULT_BANK_INFO;
  const preRegistro = JSON.parse(localStorage.getItem('afaem_pre_registro') || '{}');

  const getSeguroTipoPersonaId = (seguro) => Number(seguro?.TipoPersonaId ?? seguro?.tipoPersonaId ?? 0);
  const segurosPresidente = (catalogs.seguros || []).filter(seguro => {
    const nombreUpper = seguro?.nombre?.toUpperCase()?.trim() || '';
    const tipoPersonaId = getSeguroTipoPersonaId(seguro);
    return ['TIPO G', 'SIN SEGURO'].includes(nombreUpper) || tipoPersonaId === 2;
  });
  const segurosJugador = (catalogs.seguros || []).filter(seguro => {
    const nombreUpper = seguro?.nombre?.toUpperCase()?.trim() || '';
    const tipoPersonaId = getSeguroTipoPersonaId(seguro);
    return (!['TIPO G', 'SIN SEGURO'].includes(nombreUpper) && tipoPersonaId !== 2) || tipoPersonaId === 4;
  });
  const seguroJugadorIds = new Set(segurosJugador.map(seguro => String(seguro.id)));
  const segurosPresidenteIds = new Set(segurosPresidente.map(seguro => String(seguro.id)));

  const segurosRequeridosPago = Number(numJugadoresPago || 0);
  const segurosRequeridosPagoJugador = Number(numJugadoresPago || 0) > 0 ? Number(numJugadoresPago || 0) : 0;
  const totalAsignadosPagoJugador = segurosJugador.reduce((sum, seguro) => {
    const cantidad = Number(asignacionSeguros[String(seguro.id)] || 0);
    return sum + cantidad;
  }, 0);
  const totalAsignadosPago = totalAsignadosPagoJugador;
  const segurosPendientesPago = segurosRequeridosPago - totalAsignadosPago;
  const tieneSegurosJugadorValidos = totalAsignadosPagoJugador === segurosRequeridosPagoJugador;
  const canGeneratePagoEquipo = Number(numJugadoresPago) >= 1 && tieneSegurosJugadorValidos;
  const costoAfiliacionPresidente = Number(catalogoAfiliacionesPago.find(a => a.TipoAfiliacionId === 2)?.CostoActual || 0);
  const totalPagoEstimado = (
    (catalogs.seguros || []).reduce((sum, seguro) => {
      const cantidad = Number(asignacionSeguros[String(seguro.id)] || 0);
      return sum + (Number(seguro.precio || 0) * cantidad);
    }, 0)
  );
  const totalPagoMostrado = pagoEquipo.total || totalPagoEstimado;

  // Límites de fecha para el registro de jugadores
  const today = new Date().toISOString().split('T')[0];
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 100);
  const minDateStr = minDate.toISOString().split('T')[0];

  // ESTILO DINÁMICO PARA HOVER
  const hoverStyles = `
    .document-card:hover .overlay-actions {
      opacity: 1 !important;
    }
    .document-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 15px -3px ${COLORS.shadow10};
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
      .form-inputs-grid-2 {
        grid-template-columns: 1fr !important;
        gap: 15px !important;
      }
      .form-inputs-grid-2 input,
      .form-inputs-grid-2 select {
        width: 100% !important;
        box-sizing: border-box !important;
      }
      .phone-input-flex-container {
        flex-direction: column !important;
        gap: 8px !important;
      }
      .phone-input-flex-container select,
      .phone-input-flex-container input {
        width: 100% !important;
      }
      .abuelos-grid {
        grid-template-columns: 1fr !important;
        gap: 12px !important;
      }
      .seguro-modal-container {
        border-radius: 16px;
        max-height: 95vh;
      }
      .premium-card {
        padding: 20px 15px !important;
        border-radius: 16px !important;
      }
      .dashboard-card {
        padding: 20px 15px !important;
      }
    }
  `;

  // ESTADOS
  const [equipo, setEquipo] = useState(null);
  const [slotsData, setSlotsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSeguroId, setSelectedSeguroId] = useState('');
  const [seguroDetalle, setSeguroDetalle] = useState(null);
  const [registeredPlayers, setRegisteredPlayers] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});

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

  const [curpExistente, setCurpExistente] = useState(false);
  const [isCheckingCurp, setIsCheckingCurp] = useState(false);

  // RESPALDO DE DATOS OCR (PARA COMPARACIÓN)
  const [ocrDataOriginal, setOcrDataOriginal] = useState(null);
  const [failedPhoto, setFailedPhoto] = useState(null);

  const [showFinishModal, setShowFinishModal] = useState(false);
  const [signedForm, setSignedForm] = useState(null);
  const [previewDoc, setPreviewDoc] = useState({ open: false, url: '', type: '', title: '' });
  const [isCameraOpen, setIsCameraOpen] = useState(false);

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

  // DETERMINACIÓN DE PASOS
  const isStep1Done = !!selectedSeguroId;
  const isStep2Done = Object.values(documents).some(d => d !== null);
  const showStep2 = isStep1Done;
  const showStep3 = isStep2Done || true; // El paso 3 siempre se muestra una vez seleccionado el seguro (los documentos son opcionales)

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
    } else if (field === 'lugarNacimiento') {
      cleanValue = value.replace(/[^A-ZÁÉÍÓÚÜÑ0-9\s]/gi, '').slice(0, 30);
    } else if (field === 'correo') {
      cleanValue = value.replace(/[^a-zA-Z0-9@._-]/g, '').slice(0, 30);
    } else if (field === 'telefono' || field === 'numCamiseta') {
      cleanValue = value.replace(/\D/g, '');
    }

    setExtractedData(prev => {
      const updated = { ...prev, [field]: cleanValue };
      return updated;
    });
  };

  const handleBlur = () => {
    guardarBorradorEnBD(extractedData);
  };

  // Cargar catálogos, detalles de equipo y disponibilidad de slots
  useEffect(() => {
    const initData = async () => {
      if (!equipoId || !equipoTemporalId) {
        if (isAdmin) {
          try {
            setLoading(true);
            const catalogsData = await teamsService.getCatalogs();
            setCatalogs(catalogsData);

            const resAfiliaciones = await fetch(`${API_BASE}/ordenes-pago/afiliaciones`);
            if (resAfiliaciones.ok) {
              const afiliaciones = await resAfiliaciones.json();
              setCatalogoAfiliacionesPago(Array.isArray(afiliaciones) ? afiliaciones : []);
            }

            const presidents = await teamsService.getPresidentesActivos();
            const soloActivos = Array.isArray(presidents)
              ? presidents.filter(p => p.estatus === 7 || p.estatusNombre === 'ACTIVO')
              : [];
            setActivePresidents(soloActivos);
          } catch (error) {
            console.error("Error al iniciar catálogos de administrador:", error);
          } finally {
            setLoading(false);
            setLoadingCatalogs(false);
          }
          return;
        }

        Swal.fire('Error', 'Parámetros del equipo no provistos.', 'error');
        navigate(ROUTES.PRESIDENTE.EQUIPOS);
        return;
      }

      try {
        setLoading(true);

        // 1. Obtener catálogos
        const catalogsData = await teamsService.getCatalogs();
        setCatalogs(catalogsData);

        // 2. Obtener datos del equipo real del presidente
        const equiposList = await teamsService.getUserTeamsReal();
        const targetTeam = equiposList.find(e => String(e.EquipoId) === String(equipoId));
        if (!targetTeam) {
          throw new Error('No se encontró el equipo ligado al presidente.');
        }
        setEquipo(targetTeam);

        // 3. Verificar slots disponibles y borradores
        const slotsResponse = await teamsService.getAvailableSlots(equipoTemporalId);

        const segurosPresidenteIds = new Set(
          (catalogsData.seguros || [])
            .filter(seguro => {
              const nombreUpper = seguro?.nombre?.toUpperCase()?.trim() || '';
              const tipoPersonaId = Number(seguro?.TipoPersonaId ?? seguro?.tipoPersonaId ?? 0);
              return ['TIPO G', 'SIN SEGURO'].includes(nombreUpper) || tipoPersonaId === 2;
            })
            .map(seguro => String(seguro.id))
        );

        // Mapear los slotsResponse al formato esperado por el frontend
        const mappedSlotsData = {
          hay_slots: slotsResponse.jugadores_restantes > 0,
          slots_disponibles: slotsResponse.jugadores_restantes,
          seguros_disponibles: slotsResponse.seguros
            .filter(s => s.disponibles > 0 && !segurosPresidenteIds.has(String(s.seguro_id)))
            .map(s => ({
              SeguroId: s.seguro_id,
              Cantidad: s.disponibles
            })),
          rawSlots: slotsResponse.slots
        };

        setSlotsData(mappedSlotsData);

        // Preseleccionar primer seguro disponible si existe
        if (mappedSlotsData.seguros_disponibles?.length > 0) {
          setSelectedSeguroId(String(mappedSlotsData.seguros_disponibles[0].SeguroId));
        }

        try {
          const allPlayers = await teamsService.getUserPlayersReal();
          const targetTeamName = targetTeam?.NombreEquipo || targetTeam?.Nombre || '';
          const jugList = (allPlayers || []).filter(
            p => p.Equipo && p.Equipo.toUpperCase().trim() === targetTeamName.toUpperCase().trim()
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
  }, [equipoId, equipoTemporalId]);

  // Validar si la CURP ya existe en tiempo real
  useEffect(() => {
    const curp = (extractedData.curp || '').trim().toUpperCase();
    if (curp.length === 18) {
      setIsCheckingCurp(true);
      const timer = setTimeout(async () => {
        try {
          const res = await verificarCurp(curp);
          setCurpExistente(res.existe);
        } catch (error) {
          console.error("Error al verificar CURP:", error);
          setCurpExistente(false);
        } finally {
          setIsCheckingCurp(false);
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setCurpExistente(false);
    }
  }, [extractedData.curp]);

  // Validar si el número de camiseta ya existe en tiempo real
  useEffect(() => {
    const camiseta = (extractedData.numCamiseta || '').trim();
    if (camiseta) {
      const duplicate = obtenerDuplicadoCamiseta(camiseta);
      if (duplicate) {
        setValidationErrors(prev => ({
          ...prev,
          numCamiseta: `El número de camiseta #${camiseta} ya está asignado al Jugador ${duplicate.NombreCompleto}.`
        }));
      } else {
        setValidationErrors(prev => ({ ...prev, numCamiseta: null }));
      }
    } else {
      setValidationErrors(prev => ({ ...prev, numCamiseta: null }));
    }
  }, [extractedData.numCamiseta, registeredPlayers]);

  // Validar si la posición en el campo ya está ocupada en tiempo real
  useEffect(() => {
    const posicion = extractedData.posicion;
    if (posicion && Number(posicion) !== 11) {
      const duplicate = obtenerDuplicadoPosicion(posicion);
      if (duplicate) {
        const posNombre = catalogs?.roles_equipo?.find(r => String(r.id) === String(posicion))?.nombre || 'esta posición';
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
  }, [extractedData.posicion, registeredPlayers, catalogs]);

  const cargarDetalleOrdenPagoEquipo = async (ordenId, token) => {
    if (!ordenId) return;

    try {
      const resOrden = await fetch(`${API_BASE}/ordenes-pago/${ordenId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });

      if (!resOrden.ok) return;

      const orden = await resOrden.json();
      const detalles = Array.isArray(orden.OrdenPagoDetalleRelacion) ? orden.OrdenPagoDetalleRelacion : [];
      const estatusOrden = Number(orden.EstatusPagoId || orden.estatus || 0);
      const referenciaPago = orden.ReferenciaPago || orden.referencia_pago || null;
      if (estatusOrden) {
        setPagoEquipo(prev => ({ ...prev, estado: estatusOrden, referenciaPago }));
      } else {
        setPagoEquipo(prev => ({ ...prev, referenciaPago }));
      }

      let cantidadJugadores = 0;
      const seguros = {};

      detalles.forEach(detalle => {
        if (detalle.SeguroId) {
          const id = String(detalle.SeguroId);
          seguros[id] = Number(detalle.Cantidad || 0);
          cantidadJugadores += Number(detalle.Cantidad || 0);
        }
      });

      if (cantidadJugadores > 0) {
        setNumJugadoresPago(cantidadJugadores);
        setPagoEquipo(prev => ({ ...prev, cantidadJugadores }));
      }

      if (Object.keys(seguros).length > 0) {
        setAsignacionSeguros(prev => ({ ...prev, ...seguros }));
      }

      const totalOrden = Number(orden.TotalPagar || orden.total || 0);
      if (!Number.isNaN(totalOrden) && totalOrden > 0) {
        setPagoEquipo(prev => ({ ...prev, total: totalOrden }));
      }
    } catch (error) {
      console.warn('No se pudo cargar el detalle de la orden de pago:');
    }
  };

  const aprobarOrdenPagoEquipoAdmin = async (ordenId) => {
    if (!ordenId) throw new Error('No se encontro la orden de pago a aprobar');

    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/ordenes-pago/estatus-pago?orden_pago_id=${ordenId}&estatus=3`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'No se pudo aprobar la orden de pago');
    }

    return res.json();
  };

  const cargarEstadoPagoEquipo = async ({ presidenteId = null } = {}) => {
    const esConsultaAdmin = Boolean(isAdmin && presidenteId);
    if (isAdmin && !esConsultaAdmin) return false;

    try {
      setPagoEquipo(prev => ({ ...prev, loading: true }));
      setPagoError(null);

      const token = localStorage.getItem('token');
      const query = esConsultaAdmin ? `?presidente_id=${presidenteId}` : '';
      const res = await fetch(`${API_BASE}/ordenes-pago/mi-estado-equipo${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('No se pudo consultar el estado del pago');

      const data = await res.json();

      const estadoEquipo = data.estado;
      const ordenId = data.orden_pago_id || data.OrdenPagoId || null;
      const total = Number(data.total || 0);

      if (estadoEquipo === ESTADO_EQUIPO.SIN_ORDEN || !estadoEquipo) {
        try {
          const nextPreRegistro = { ...(preRegistro || {}) };
          delete nextPreRegistro.equipo_temporal_id;
          localStorage.setItem('afaem_pre_registro', JSON.stringify(nextPreRegistro));
        } catch { }

        setPagoEquipo({
          loading: false,
          aprobado: false,
          estadoEquipo: ESTADO_EQUIPO.SIN_ORDEN,
          equipoTemporalId: null,
          estado: null,
          ordenId: null,
          total: 0,
          cantidadJugadores: 0,
          tieneComprobante: false
        });

        if (esConsultaAdmin) {
          await Swal.fire({
            title: 'Pago pendiente',
            text: 'El presidente seleccionado no tiene una orden aprobada disponible para crear el equipo.',
            icon: 'info',
            confirmButtonColor: COLORS.primary
          });
        }
        return false;
      }

      if (estadoEquipo === ESTADO_EQUIPO.LISTO_PARA_CREAR_EQUIPO) {
        const equipoTemporalId = data.equipo_temporal_id || data.equipoTemporalId || null;
        if (equipoTemporalId) {
          try {
            const nextPreRegistro = { ...(preRegistro || {}), equipo_temporal_id: equipoTemporalId };
            localStorage.setItem('afaem_pre_registro', JSON.stringify(nextPreRegistro));
          } catch { }
        }

        const seguros = {};
        (data.seguros || []).forEach(seguro => {
          const id = String(seguro.SeguroId || seguro.seguro_id);
          seguros[id] = Number(seguro.Cantidad || seguro.cantidad || 0);
        });

        if (Object.keys(seguros).length > 0) {
          setAsignacionSeguros(seguros);
        }

        if (data.cantidad_jugadores) {
          setNumJugadoresPago(data.cantidad_jugadores);
        }

        setPagoEquipo({
          loading: false,
          aprobado: true,
          estadoEquipo: ESTADO_EQUIPO.LISTO_PARA_CREAR_EQUIPO,
          equipoTemporalId,
          estado: ESTATUS_PAGO.APROBADO,
          ordenId,
          total: Number(data.total || 0),
          cantidadJugadores: Number(data.cantidad_jugadores || 0),
          tieneComprobante: true
        });

        if (esConsultaAdmin) {
          setActiveStep(1);
        }
        return true;
      }

      if (estadoEquipo === ESTADO_EQUIPO.ORDEN_SIN_COMPROBANTE) {
        setPagoEquipo(prev => ({
          ...prev,
          loading: false,
          aprobado: false,
          estadoEquipo: ESTADO_EQUIPO.ORDEN_SIN_COMPROBANTE,
          equipoTemporalId: prev.equipoTemporalId || null,
          estado: ESTATUS_PAGO.NO_ENVIADO,
          ordenId,
          total,
          tieneComprobante: false
        }));
        if (ordenId) await cargarDetalleOrdenPagoEquipo(ordenId, token);
        // Para el admin: en lugar de un Swal de decisión que puede perder la orden si elige "No",
        // dejamos el estado activo con la orden visible y el admin decide desde la UI.
        // No reseteamos el estado aquí — la orden se mostrará con un botón "Aprobar" inline.
        return false;
      }

      if (estadoEquipo === ESTADO_EQUIPO.COMPROBANTE_EN_REVISION) {
        setPagoEquipo(prev => ({
          ...prev,
          loading: false,
          aprobado: false,
          estadoEquipo: ESTADO_EQUIPO.COMPROBANTE_EN_REVISION,
          equipoTemporalId: prev.equipoTemporalId || null,
          estado: ESTATUS_PAGO.EN_ESPERA,
          ordenId,
          total,
          tieneComprobante: true
        }));
        if (ordenId) await cargarDetalleOrdenPagoEquipo(ordenId, token);
        if (esConsultaAdmin) {
          await Swal.fire({
            title: 'Pago en revisión',
            text: `El comprobante${ordenId ? ` de la orden #${ordenId}` : ''} del presidente seleccionado sigue en revisión.`,
            icon: 'info',
            confirmButtonColor: COLORS.primary
          });
        }
        return false;
      }

      setPagoEquipo({
        loading: false,
        aprobado: false,
        estadoEquipo: ESTADO_EQUIPO.SIN_ORDEN,
        equipoTemporalId: null,
        estado: null,
        ordenId: null,
        total: 0,
        cantidadJugadores: 0,
        tieneComprobante: false
      });
      return false;
    } catch (error) {
      console.error('Error al cargar pago de equipo:', error);
      setPagoEquipo(prev => ({ ...prev, loading: false }));
      setPagoError(error.message);

      if (esConsultaAdmin) {
        await Swal.fire('Error', error.message, 'error');
      }
      return false;
    }
  };

  const handleCrearOrdenPagoEquipo = async () => {
    setPagoError(null);

    if (Number(numJugadoresPago) < 1) {
      setPagoError('Debes ingresar el número de jugadores.');
      return;
    }

    if (totalAsignadosPagoJugador !== segurosRequeridosPagoJugador) {
      setPagoError(`Debes asignar un seguro por jugador. Faltan ${segurosRequeridosPagoJugador - totalAsignadosPagoJugador}.`);
      return;
    }

    try {
      setProcesandoPago(true);
      const token = localStorage.getItem('token');
      const segurosPayload = Object.entries(asignacionSeguros)
        .filter(([seguroId, cantidad]) => seguroJugadorIds.has(seguroId) && Number(cantidad) > 0)
        .map(([seguroId, cantidad]) => ({
          SeguroId: Number(seguroId),
          Cantidad: Number(cantidad)
        }));

      const res = await fetch(`${API_BASE}/ordenes-pago/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          CantidadJugadores: Number(numJugadoresPago),
          Seguros: segurosPayload,
          TipoSolicitud: TIPO_SOLICITUD.EQUIPO,
          PresidenteId: isAdmin ? Number(selectedPresidentId) : null
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const backendMsg = errData.detail || errData.message || 'No se pudo crear la orden de pago';
        setPagoError(backendMsg);
        Swal.fire('Error', backendMsg, 'error');
        return;
      }

      const data = await res.json();
      const ordenId = data.orden_pago_id || data.OrdenPagoId || data.id;
      const totalOrden = Number(data.total || totalPagoEstimado || 0);
      const referenciaPago = data.ReferenciaPago || data.referencia_pago || null;
      setPagoEquipo({
        loading: false,
        aprobado: false,
        estadoEquipo: ESTADO_EQUIPO.ORDEN_SIN_COMPROBANTE,
        estado: ESTATUS_PAGO.NO_ENVIADO,
        ordenId,
        total: totalOrden,
        cantidadJugadores: Number(numJugadoresPago),
        tieneComprobante: false,
        referenciaPago
      });

      generarPDFCuota({
        ordenId,
        user,
        bankInfo,
        catalogoAfiliaciones: catalogoAfiliacionesPago,
        catalogoSeguros: catalogs.seguros,
        asignacionSeguros,
        total: totalOrden,
        cantidadJugadores: Number(numJugadoresPago || 0),
        incluirPresidente: false,
        referenciaPago
      });

      Swal.fire({
        title: 'Orden generada',
        text: isAdmin
          ? 'Se descargó la ficha de pago en PDF. Puedes aprobar la orden inmediatamente o enviarsela al presidente para que realice el pago.'
          : 'Se descargó tu ficha de pago en PDF. Realiza el pago y sube el comprobante.',
        icon: 'success',
        confirmButtonColor: COLORS.primary
      });
    } catch (error) {
      setPagoError(error.message);
      Swal.fire('Error', error.message, 'error');
    } finally {
      setProcesandoPago(false);
    }
  };

  const handleDescargarOrdenPagoEquipo = () => {
    if (!pagoEquipo.ordenId) return;
    generarPDFCuota({
      ordenId: pagoEquipo.ordenId,
      user,
      bankInfo,
      catalogoAfiliaciones: catalogoAfiliacionesPago,
      catalogoSeguros: catalogs.seguros,
      asignacionSeguros,
      total: pagoEquipo.total || 0,
      cantidadJugadores: Number(pagoEquipo.cantidadJugadores || 0),
      incluirPresidente: false,
      referenciaPago: pagoEquipo.referenciaPago
    });
  };

  const handleSubirComprobanteEquipo = async () => {
    setPagoError(null);

    if (!comprobantePagoEquipo) {
      setPagoError('Debes subir tu comprobante de pago.');
      return;
    }

    try {
      setProcesandoPago(true);
      const token = localStorage.getItem('token');
      const formDataPago = new FormData();
      formDataPago.append('archivo', comprobantePagoEquipo);

      const res = await fetch(`${API_BASE}/ordenes-pago/${pagoEquipo.ordenId}/comprobante`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formDataPago
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'No se pudo subir el comprobante');
      }

      setPagoEquipo(prev => ({
        ...prev,
        estadoEquipo: ESTADO_EQUIPO.COMPROBANTE_EN_REVISION,
        estado: ESTATUS_PAGO.EN_ESPERA,
        tieneComprobante: true
      }));
      setComprobantePagoEquipo(null);

      Swal.fire({
        title: 'Comprobante guardado',
        text: 'Dirigete al panel de  "Validación de Pagos" para aprobar el pago y guardarlo.',
        icon: 'success',
        confirmButtonColor: COLORS.primary
      });
    } catch (error) {
      setPagoError(error.message);
      Swal.fire('Error', error.message, 'error');
    } finally {
      setProcesandoPago(false);
    }
  };

  const handleOptionChange = (field, value) => {
    const intVal = parseInt(value, 10);
    setTeamFormData(prev => {
      let extra = {};
      if (field === 'season') {
        const selectedLiga = catalogs.ligas.find(l => Number(l.id) === intVal);
        if (selectedLiga) {
          extra = {
            modality: selectedLiga.modalidad_id || selectedLiga.modalidadId || '',
            category: selectedLiga.categoria_id || selectedLiga.categoriaId || '',
            rama: selectedLiga.rama_id || selectedLiga.ramaId || ''
          };
        }
      }
      return {
        ...prev,
        [field]: intVal,
        ...extra
      };
    });
  };

  const handleSaveTeamAdmin = async () => {
    if (!teamFormData.teamName.trim()) {
      Swal.fire('Atención', 'Debe escribir el nombre del equipo.', 'warning');
      return;
    }
    if (!teamFormData.season) {
      Swal.fire('Atención', 'Debe seleccionar una liga.', 'warning');
      return;
    }
    if (!pagoEquipo.equipoTemporalId) {
      Swal.fire({
        title: 'Orden de pago sin aprobar',
        html: 'La orden de pago del presidente aún no ha sido aprobada.<br/><br/>Regresa al paso anterior y aprueba la orden directamente antes de crear el equipo.',
        icon: 'warning',
        confirmButtonText: 'Volver al paso anterior',
        confirmButtonColor: COLORS.primary
      }).then(() => setActiveStep(0));
      return;
    }

    try {
      Swal.fire({
        title: 'Creando Equipo...',
        text: 'Por favor espere mientras registramos el club en el servidor.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });

      await teamsService.createTeamCompleto({
        teamName: teamFormData.teamName,
        presidente_id: selectedPresidentId ? Number(selectedPresidentId) : null,
        equipo_temporal_id: pagoEquipo.equipoTemporalId || null,
        liga_id: teamFormData.season,
        modalidad_id: teamFormData.modality,
        categoria_id: teamFormData.category,
        rama_id: teamFormData.rama,
        players: [],
        teamLogo: teamFormData.teamLogo
      });

      Swal.fire({
        icon: 'success',
        title: 'Equipo Creado',
        text: `El equipo "${teamFormData.teamName}" ha sido registrado exitosamente.`
      }).then(() => {
        navigate(ROUTES.ADMIN.EQUIPOS);
      });
    } catch (err) {
      console.error("Error al guardar equipo:", err);
      Swal.fire('Error', 'No se pudo completar el registro: ' + (err.response?.data?.detail || err.message), 'error');
    }
  };

  const renderPagoPrevioEquipo = () => {
    const ordenCreada = Boolean(pagoEquipo.ordenId);
    const pagoEnRevision = pagoEquipo.estadoEquipo === ESTADO_EQUIPO.COMPROBANTE_EN_REVISION;
    const pagoRechazado = pagoEquipo.estado === ESTATUS_PAGO.RECHAZADO;

    if (pagoEquipo.loading || loadingCatalogs) {
      return (
        <div style={{ maxWidth: '760px', margin: '0 auto', textAlign: 'center', padding: '60px 20px' }}>
          <FaClock style={{ fontSize: '42px', color: COLORS.primary, marginBottom: '18px' }} />
          <h2 style={{ fontWeight: '900', color: COLORS.slate800 }}>Revisando estado de pago</h2>
          <p style={{ color: COLORS.slate500, margin: 0 }}>Un momento mientras validamos si tienes una orden aprobada disponible.</p>
        </div>
      );
    }

    if (pagoEnRevision) {
      return (
        <div style={{ maxWidth: '760px', margin: '0 auto', textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: '82px', height: '82px', borderRadius: '50%', background: COLORS.warningBg, color: COLORS.warningDark, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px', fontSize: '36px' }}>
            <FaClock />
          </div>
          <h2 style={{ fontWeight: '900', color: COLORS.slate800 }}>Pago en revisión</h2>
          <p style={{ color: COLORS.slate500, lineHeight: 1.6, margin: '10px auto 28px', maxWidth: '520px' }}>
            Favor de aprobar la orden #{pagoEquipo.ordenId}. directamente desde el panel de Validación de Pagos.
          </p>
          <button onClick={() => navigate(isAdmin ? ROUTES.ADMIN.PAGOS : ROUTES.PRESIDENTE.DASHBOARD)} style={{ padding: '12px 28px', borderRadius: '12px', border: `1px solid ${COLORS.slate300}`, background: 'white', color: COLORS.slate500, fontWeight: '800', cursor: 'pointer' }}>
            Dirigete al panel de "Validación de Pagos"
          </button>
        </div>
      );
    }

    if (pagoEquipo.estadoEquipo === ESTADO_EQUIPO.LISTO_PARA_CREAR_EQUIPO) {
      return null;
    }

    return (
      <div style={{ maxWidth: '980px', margin: '0 auto', animation: 'slideUp 0.4s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '70px', height: '70px', borderRadius: '18px', background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryActive} 100%)`, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: '30px', boxShadow: `0 12px 24px ${COLORS.primaryBgTranslucent20}` }}>
            <FaMoneyBillWave />
          </div>
          <h2 style={{ fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: '900', color: COLORS.slate800, marginBottom: '8px' }}>Generar un pago previo para nuevo equipo</h2>
          <p style={{ color: COLORS.slate500, margin: 0, fontSize: 'clamp(13px, 3.5vw, 15px)' }}>
            {isAdmin
              ? 'Genera la orden de pago con el número de jugadores y tipos de seguros'
              : 'Genera tu orden, sube el comprobante y espera la aprobacion administrativa para continuar.'
            }
          </p>
          <p style={{ color: COLORS.dangerDark, margin: 0, fontSize: 'clamp(11px, 3vw, 13px)' }}>
            {isAdmin
              ? '*Registro de equipo como administrador*'
              : '*Si ya tienes una orden de pago y subiste el comprobante, contáctate con un administrador*'}
          </p>
        </div>

        {pagoRechazado && (
          <div style={{ background: COLORS.dangerBgLight, border: `1px solid ${COLORS.dangerBgMedium}`, color: COLORS.dangerDeep, borderRadius: '14px', padding: '16px 18px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <FaTimesCircle />
            <span style={{ fontWeight: '700' }}>El comprobante fue rechazado. Sube un nuevo archivo para enviarlo otra vez a revision.</span>
          </div>
        )}

        {pagoError && (
          <div style={{ background: COLORS.dangerBgLight, border: `1px solid ${COLORS.dangerBgMedium}`, color: COLORS.dangerDeep, borderRadius: '14px', padding: '14px 18px', marginBottom: '20px', fontWeight: '700' }}>
            {pagoError}
          </div>
        )}

        <div className="responsive-pago-grid">
          <div className="pago-card">
            {!ordenCreada ? (
              <>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '900', color: COLORS.slate700, marginBottom: '8px', textTransform: 'uppercase' }}>Numero de jugadores</label>
                <input
                  type="number"
                  min="1"
                  value={numJugadoresPago}
                  onChange={(e) => setNumJugadoresPago(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                  style={{ width: '100%', padding: '14px 16px', border: `2px solid ${COLORS.secondaryBg100}`, borderRadius: '12px', fontSize: '18px', fontWeight: '800', color: COLORS.slate800, marginBottom: '18px' }}
                />

                <div style={{ border: `1px solid ${COLORS.slate200}`, borderRadius: '16px', padding: '16px', background: 'white' }}>
                  <div style={{ marginBottom: '12px', fontSize: '13px', fontWeight: '900', color: COLORS.slate800, textTransform: 'uppercase' }}>Seguros para jugador</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                    {segurosJugador.map(seguro => {
                      const id = String(seguro.id);
                      return (
                        <div key={id} style={{ display: 'grid', gridTemplateColumns: '1fr 92px', gap: '12px', alignItems: 'center', border: `1px solid ${COLORS.slate200}`, borderRadius: '14px', padding: '14px', background: COLORS.slate50 }}>
                          <div>
                            <div style={{ fontWeight: '900', color: COLORS.slate800, fontSize: '14px' }}>{seguro.nombre}</div>
                            <div style={{ color: COLORS.slate500, fontSize: '12px', marginTop: '3px' }}>${Number(seguro.precio || 0).toFixed(2)} c/u</div>
                          </div>
                          <input
                            type="number"
                            min="0"
                            value={asignacionSeguros[id] ?? ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0);
                              setAsignacionSeguros(prev => ({ ...prev, [id]: value }));
                            }}
                            style={{ width: '100%', padding: '10px', border: `1px solid ${COLORS.slate300}`, borderRadius: '10px', fontWeight: '800', textAlign: 'center', backgroundColor: 'white' }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginTop: '16px', padding: '12px 14px', borderRadius: '12px', background: canGeneratePagoEquipo && segurosRequeridosPago > 0 ? COLORS.successBg : COLORS.orange50, color: canGeneratePagoEquipo && segurosRequeridosPago > 0 ? COLORS.successDarker : COLORS.orangeDarker, fontWeight: '800', fontSize: '13px' }}>
                  Seguros asignados: jugadores {totalAsignadosPagoJugador}/{segurosRequeridosPagoJugador || 0}
                </div>
                {!tieneSegurosJugadorValidos && Number(numJugadoresPago || 0) > 0 && (
                  <div style={{ marginTop: '10px', fontSize: '12px', color: COLORS.warningBrown, fontWeight: '700' }}>
                    La suma de seguros para jugador debe ser igual al numero de jugadores seleccionado.
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '999px', background: COLORS.successBg, color: COLORS.successDarker, fontWeight: '900', fontSize: '12px', marginBottom: '18px' }}>
                  <FaCheckCircle /> Orden activa #{pagoEquipo.ordenId}
                </div>

                {/* Botón de aprobación directa para admin cuando la orden no tiene comprobante */}
                {isAdmin && pagoEquipo.estadoEquipo === ESTADO_EQUIPO.ORDEN_SIN_COMPROBANTE && (
                  <div style={{ background: COLORS.warningBgLight, border: `1px solid ${COLORS.warningBgDark}`, borderRadius: '14px', padding: '18px', marginBottom: '18px' }}>
                    <p style={{ color: COLORS.orangeDeep, fontWeight: '800', fontSize: '14px', margin: '0 0 12px' }}>
                      Puedes aprobar la orden directamente o esperar a que se ponga en contacto contigo el presidente.
                    </p>
                    <button
                      disabled={procesandoPago}
                      onClick={async () => {
                        try {
                          setPagoEquipo(prev => ({ ...prev, loading: true }));
                          await aprobarOrdenPagoEquipoAdmin(pagoEquipo.ordenId);
                          await Swal.fire({
                            title: 'Orden aprobada',
                            text: `La orden #${pagoEquipo.ordenId} se aprobó correctamente.`,
                            icon: 'success',
                            confirmButtonColor: COLORS.primary
                          });
                          await cargarEstadoPagoEquipo({ presidenteId: selectedPresidentId });
                        } catch (error) {
                          setPagoEquipo(prev => ({ ...prev, loading: false }));
                          setPagoError(error.message);
                          Swal.fire('Error', error.message, 'error');
                        }
                      }}
                      style={{ padding: '11px 22px', borderRadius: '10px', border: 'none', background: COLORS.success, color: 'white', fontWeight: '900', cursor: procesandoPago ? 'wait' : 'pointer', opacity: procesandoPago ? 0.6 : 1 }}
                    >
                      {procesandoPago ? 'Aprobando...' : '✓ Aprobar orden directamente'}
                    </button>
                  </div>
                )}

                <h3 style={{ color: COLORS.slate800, fontWeight: '900', marginBottom: '8px' }}>Sube el comprobante de pago</h3>
                <p style={{ color: COLORS.slate500, lineHeight: 1.6, marginBottom: '22px' }}>
                  Se recomienda adjuntar un PDF o imagen del comprobante para tener mas control sobre el pago.
                </p>
                <div style={{ border: `2px dashed ${COLORS.secondaryBgDark}`, borderRadius: '16px', padding: '26px', textAlign: 'center', background: COLORS.slate50 }}>
                  <FaUpload style={{ fontSize: '34px', color: COLORS.primary, marginBottom: '12px' }} />
                  <input
                    id="comprobante-equipo"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const ext = '.' + file.name.split('.').pop().toLowerCase();
                      const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
                      const allowedExt = ['.pdf', '.jpg', '.jpeg', '.png'];
                      if (!allowed.includes(file.type) || !allowedExt.includes(ext)) {
                        Swal.fire({ title: 'Tipo de archivo no permitido', text: 'Solo se aceptan archivos PDF, JPG, JPEG o PNG.', icon: 'error', confirmButtonColor: COLORS.primary });
                        return;
                      }
                      setComprobantePagoEquipo(file);
                    }}
                  />
                  <div style={{ fontWeight: '800', color: COLORS.slate800, marginBottom: '12px' }}>
                    {comprobantePagoEquipo ? comprobantePagoEquipo.name : 'No se ha seleccionado archivo'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <button onClick={() => document.getElementById('comprobante-equipo').click()} style={{ padding: '11px 22px', borderRadius: '10px', border: `1px solid ${COLORS.primary}`, background: 'white', color: COLORS.primary, fontWeight: '900', cursor: 'pointer' }}>
                      {comprobantePagoEquipo ? 'Cambiar archivo' : 'Seleccionar archivo'}
                    </button>
                    <button type="button" onClick={handleDescargarOrdenPagoEquipo} style={{ padding: '11px 22px', borderRadius: '10px', border: `1px solid ${COLORS.brandBlueLight50}`, background: 'white', color: COLORS.secondaryLight, fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FaFilePdf /> Descargar Ficha de Pago
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="pago-card">
            <h3 style={{ fontSize: '16px', fontWeight: '900', color: COLORS.slate800, marginBottom: '18px' }}>Resumen de pago</h3>

            {catalogs.seguros ? catalogs.seguros.filter(seguro => Number(asignacionSeguros[String(seguro.id)] || 0) > 0).map(seguro => {
              const cantidad = Number(asignacionSeguros[String(seguro.id)] || 0);
              return (
                <div key={seguro.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${COLORS.slate100}`, color: COLORS.slate500, fontSize: '13px' }}>
                  <span>{seguro.nombre} x{cantidad}</span>
                  <strong style={{ color: COLORS.slate800 }}>${(Number(seguro.precio || 0) * cantidad).toFixed(2)}</strong>
                </div>
              );
            }) : null}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', paddingTop: '18px', borderTop: `2px solid ${COLORS.slate200}` }}>
              <span style={{ fontWeight: '900', color: COLORS.slate800 }}>Total</span>
              <span style={{ fontSize: '24px', fontWeight: '900', color: COLORS.primary }}>${Number(totalPagoMostrado || 0).toFixed(2)}</span>
            </div>

            <button
              disabled={procesandoPago || (!ordenCreada && !canGeneratePagoEquipo) || (ordenCreada && !comprobantePagoEquipo)}
              onClick={ordenCreada ? handleSubirComprobanteEquipo : handleCrearOrdenPagoEquipo}
              style={{ width: '100%', marginTop: '24px', padding: '14px 18px', borderRadius: '12px', border: 'none', background: procesandoPago ? COLORS.slate400 : COLORS.primary, color: 'white', fontWeight: '900', cursor: procesandoPago ? 'wait' : 'pointer', opacity: (!ordenCreada && !canGeneratePagoEquipo) || (ordenCreada && !comprobantePagoEquipo) ? 0.55 : 1 }}
            >
              {procesandoPago ? 'Procesando...' : ordenCreada ? 'Enviar comprobante' : 'Generar orden de pago'}
            </button>
          </div>
        </div>
      </div>
    );
  };

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
      });
    }
  }, [selectedSeguroId, slotsData]);

  // PROCESAR SUBIDA DE DOCUMENTOS Y OCR
  const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

  const handleFileUpload = async (documentKey, file) => {
    if (!file) return;

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (documentKey === 'foto') {
      const allowedFotoTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      const allowedFotoExts = ['.jpg', '.jpeg', '.png'];
      if (!allowedFotoTypes.includes(file.type) || !allowedFotoExts.includes(ext)) {
        Swal.fire({
          title: 'Tipo de archivo no permitido',
          text: 'Solo se aceptan imágenes JPG, JPEG o PNG para la fotografía.',
          icon: 'error',
          confirmButtonColor: COLORS.primary
        });
        return;
      }
    }

    if (!ALLOWED_TYPES.includes(file.type) || !ALLOWED_EXTENSIONS.includes(ext)) {
      Swal.fire({
        title: 'Tipo de archivo no permitido',
        text: 'Solo se aceptan archivos PDF, JPG, JPEG o PNG.',
        icon: 'error',
        confirmButtonColor: COLORS.primary
      });
      return;
    }

    const prevDoc = documents[documentKey] || null;
    const prevPreview = previews[documentKey] || null;

    setDocuments(prev => ({ ...prev, [documentKey]: file }));

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
          text: 'Por favor, carga primero el Acta de Nacimiento del jugador para identificar si es menor de edad.',
          icon: 'info',
          confirmButtonColor: COLORS.primary
        });
        setDocuments(prev => ({ ...prev, [documentKey]: null }));
        setPreviews(prev => ({ ...prev, [documentKey]: null }));
        return;
      }
    }

    // PROCESAR OCR PARA ACTA O IDENTIFICACIÓN
    if (documentKey === 'acta' || documentKey === 'ine' || documentKey === 'identificacionMenor') {
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
        if (!response.ok) throw new Error('Error al analizar el documento');

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
          curpEncontrada = ''; // Clear out CURP to block registration completion
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

          const merged = { ...extractedData, ...ocrResult };
          setOcrDataOriginal(ocrResult);
          setExtractedData(merged);
          guardarBorradorEnBD(merged);

          if (curpNoValida) {
            Swal.fire({
              title: 'CURP no validada',
              text: `La CURP ${curpOriginalCapturada} ingresada no fue validada. Por favor, sube un documento válido.`,
              icon: 'warning',
              confirmButtonColor: COLORS.primary || '#1a3b5c'
            });
          } else {
            Swal.fire({
              title: '¡Lectura Exitosa!',
              text: nombreEncontrado ? `Se detectó a: ${nombreEncontrado}` : 'Algunos campos no pudieron ser detectados, ingrésalos manualmente',
              icon: nombreEncontrado ? 'success' : 'warning',
              timer: nombreEncontrado ? 2000 : 3500,
              showConfirmButton: !nombreEncontrado
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
      safeSetField(form, 'Asociación', 'AFAEM');

      // Tipo de Afiliación (Tipo y fill_20) → nombre del seguro seleccionado
      const seguroSel = catalogs?.seguros?.find(s => String(s.id) === String(selectedSeguroId));
      if (seguroSel?.nombre) {
        try { form.getTextField('Tipo')?.setText(seguroSel.nombre.toUpperCase()); } catch (_) { }
        try { form.getTextField('fill_24')?.setText(seguroSel.nombre.toUpperCase()); } catch (_) { }
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

    if (validationErrors.numCamiseta || validationErrors.posicion) {
      return true;
    }

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

    if (!extractedData.curp || extractedData.curp.length !== 18 || curpExistente) {
      return true;
    }

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

    if (validationErrors.numCamiseta) {
      Swal.fire('Atención', validationErrors.numCamiseta, 'warning');
      return;
    }

    if (validationErrors.posicion) {
      Swal.fire('Atención', validationErrors.posicion, 'warning');
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
      { name: 'posicion', label: 'Posición' }
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

    if (curpExistente) {
      Swal.fire('Atención', 'Esta CURP ya se encuentra registrada.', 'warning');
      return;
    }

    // Nota: A diferencia del administrador, para el presidente los archivos (Acta, INE, Foto) son OPCIONALES.
    // Por lo tanto, no se valida su presencia obligatoria en este panel.
    // Validar documentos obligatorios
    const missingDocs = [];
    if (!documents.acta) missingDocs.push('Acta de Nacimiento');
    if (!documents.foto) missingDocs.push('Fotografía del Jugador');
    if (esMenorDeEdad) {
      if (!documents.ineTutor) missingDocs.push('INE de Padre o Tutor');
      if (!documents.identificacionMenor) missingDocs.push('Identificación de Menor');
    } else {
      if (!documents.ine) missingDocs.push('Identificación Oficial (INE)');
    }

    if (missingDocs.length > 0) {
      Swal.fire('Atención', `Es necesario cargar los siguientes documentos obligatorios: ${missingDocs.join(', ')}.`, 'warning');
      return;
    }

    if (extractedData.fechaNacimiento) {
      const fechaDate = new Date(extractedData.fechaNacimiento);
      const hoy = new Date();
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
      formData.append('nui', (extractedData.nui || '').toString().trim());

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

      // Archivos (Todos opcionales para el presidente de equipo)
      if (documents.acta) formData.append('acta', documents.acta);
      if (documents.foto) formData.append('foto', documents.foto);

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
        navigate(ROUTES.PRESIDENTE.EQUIPOS);
      });
    } catch (err) {
      console.error("Error al registrar jugador en equipo existente:", err);
      Swal.fire('Error', err.response?.data?.detail || err.message || 'Error interno del servidor', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Documentos requeridos para renderizar dinámicamente
  const documentCards = [
    { key: 'acta', title: 'Acta de Nacimiento', subtitle: 'Requerido para validación' },
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
        <Loader text="Cargando información del equipo y cupos disponibles..." />
      </div>
    );
  }

  // Si no hay slots en absoluto
  const sinSlots = (slotsData?.slots_disponibles === 0 || slotsData?.hay_slots === false) && equipoId;

  const steps = [
    { label: 'Seleccionar Presidente', step: 0 },
    { label: 'Configurar Equipo', step: 1 },
    { label: 'Registrar Jugadores', step: 2 }
  ];

  return (
    <div className="dashboard-content">
      <style>{hoverStyles}</style>

      {/* HEADER */}
      <div className="config-page-header">
        <button
          onClick={() => {
            const tieneDatos = Object.values(documents).some(d => d !== null) || extractedData.nombreJugador;
            if (tieneDatos) {
              Swal.fire({
                title: '¿Abandonar registro?',
                text: "Se perderán los documentos subidos y el progreso actual (excepto los campos guardados en la BD).",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: COLORS.danger,
                cancelButtonColor: COLORS.slate500,
                confirmButtonText: 'Sí, salir',
                cancelButtonText: 'Continuar registro'
              }).then((result) => {
                if (result.isConfirmed) navigate(isAdmin ? ROUTES.ADMIN.EQUIPOS : ROUTES.PRESIDENTE.EQUIPOS);
              });
            } else {
              navigate(isAdmin ? ROUTES.ADMIN.EQUIPOS : ROUTES.PRESIDENTE.EQUIPOS);
            }
          }}
          className="btn btn-outline-secondary"
          style={{ padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', background: 'none', border: `1px solid ${COLORS.slate300}`, cursor: 'pointer' }}
        >
          <FaArrowLeft />
        </button>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: COLORS.slate800, margin: 0 }}>
            {(!equipoId || !equipoTemporalId) && isAdmin ? 'Crear Nuevo Equipo' : 'Registrar Jugadores de Equipo'}
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: COLORS.slate500, marginTop: '4px' }}>
            {(!equipoId || !equipoTemporalId) && isAdmin ? 'Asistente de configuración de equipo para presidente' : 'Registrar jugadores en espacios pagados restantes.'}
          </p>
        </div>
      </div>

      {/* WIZARD STEPS */}
      {(!equipoId || !equipoTemporalId) && isAdmin && (
        <>
          <div className="wizard-steps-container">
            {steps.map((s, idx) => {
              const isActive = activeStep === s.step;
              const isDone = activeStep > s.step;
              return (
                <React.Fragment key={s.step}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: isActive || isDone ? 1 : 0.5 }}>
                    <StepBadge number={idx + 1} isActive={isActive} isDone={isDone} />
                    <span style={{
                      fontWeight: isActive ? '800' : '600',
                      color: isActive ? COLORS.primary : COLORS.slate500,
                      fontSize: '14px'
                    }}>
                      {s.label}
                    </span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div style={{
                      height: '2px',
                      width: '40px',
                      backgroundColor: isDone ? COLORS.success : COLORS.slate200,
                      transition: 'all 0.3s'
                    }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <div className="mobile-step-indicator">
            Paso {activeStep + 1} de {steps.length}: {steps[activeStep]?.label}
          </div>
        </>
      )}

      {/* PASO 0: SELECTOR DE PRESIDENTE */}
      {(!equipoId || !equipoTemporalId) && isAdmin && activeStep === 0 && (
        <div style={{ maxWidth: '1000px', margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>
          <div className="premium-card" style={{
            background: 'white',
            borderRadius: '24px',
            padding: '35px',
            boxShadow: `0 10px 25px -5px ${COLORS.shadow05}`,
            border: `1px solid ${COLORS.slate200}`
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: '800', color: COLORS.slate800, marginBottom: '8px' }}>
              Seleccionar Presidente del Club
            </h3>
            <p style={{ color: COLORS.slate500, fontSize: '14px', marginBottom: '25px' }}>
              Busca y selecciona al presidente al que se le asignará el nuevo equipo. Si el presidente no cuenta con un pago de cupos aprobado, podrás generarlo y aprobarlo aquí mismo.
            </p>

            {/* Buscador */}
            <div style={{ position: 'relative', marginBottom: '25px' }}>
              <input
                type="text"
                placeholder="Buscar por nombre o correo electrónico del presidente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 44px',
                  border: `2px solid ${COLORS.slate200}`,
                  borderRadius: '14px',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: COLORS.slate800,
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = COLORS.primary}
                onBlur={(e) => e.target.style.borderColor = COLORS.slate200}
              />
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: COLORS.slate400 }}>
                🔍
              </span>
            </div>

            {/* Listado de Presidentes */}
            {selectedPresidentId ? (
              <div>
                {(() => {
                  const pres = activePresidents.find(p => String(p.id || p.PresidenteId) === String(selectedPresidentId));
                  const nombreCompleto = pres ? pres.nombre || pres.NombrePresidente || pres.correo : 'Presidente seleccionado';
                  return (
                    <div style={{
                      background: COLORS.secondaryBg,
                      border: `1.5px solid ${COLORS.primary}`,
                      borderRadius: '16px',
                      padding: '20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '25px'
                    }}>
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: COLORS.primary, textTransform: 'uppercase' }}>Presidente Seleccionado</span>
                        <h4 style={{ fontSize: '18px', fontWeight: '800', color: COLORS.slate800, margin: '4px 0 2px 0' }}>👤 {nombreCompleto}</h4>
                        <p style={{ margin: 0, fontSize: '13px', color: COLORS.slate500 }}>{pres?.correo || 'Sin correo registrado'}</p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedPresidentId('');
                          setPagoEquipo(prev => ({
                            ...prev,
                            estadoEquipo: null,
                            equipoTemporalId: null,
                            estado: null,
                            ordenId: null,
                            total: 0,
                            cantidadJugadores: 0
                          }));
                        }}
                        style={{
                          background: 'none',
                          border: `1px solid ${COLORS.slate300}`,
                          padding: '8px 14px',
                          borderRadius: '10px',
                          color: COLORS.slate500,
                          fontSize: '12px',
                          fontWeight: '800',
                          cursor: 'pointer'
                        }}
                      >
                        Cambiar presidente
                      </button>
                    </div>
                  );
                })()}

                {/* Si no está aprobado, renderiza el pago previo */}
                {pagoEquipo.estadoEquipo !== ESTADO_EQUIPO.LISTO_PARA_CREAR_EQUIPO ? (
                  renderPagoPrevioEquipo()
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px' }}>
                    <div style={{ color: COLORS.success, fontSize: '48px', marginBottom: '15px' }}>
                      <FaCheckCircle />
                    </div>
                    <h4 style={{ fontWeight: '800', color: COLORS.slate800, marginBottom: '6px' }}>Pago verificado y aprobado</h4>
                    <p style={{ color: COLORS.slate500, fontSize: '14px', marginBottom: '20px' }}>
                      Este presidente tiene cupos disponibles. Haz clic en continuar para configurar el equipo.
                    </p>
                    <button
                      onClick={() => setActiveStep(1)}
                      style={{
                        padding: '12px 30px',
                        borderRadius: '12px',
                        border: 'none',
                        background: COLORS.primary,
                        color: 'white',
                        fontWeight: '800',
                        cursor: 'pointer',
                        boxShadow: `0 4px 12px ${COLORS.primaryBgTranslucent20}`
                      }}
                    >
                      Configurar Equipo →
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '15px',
                maxHeight: '400px',
                overflowY: 'auto',
                paddingRight: '5px'
              }}>
                {activePresidents.filter(pres => {
                  const term = searchTerm.toLowerCase();
                  const nombreCompleto = (pres.nombre || '').toLowerCase();
                  const email = (pres.correo || '').toLowerCase();
                  return nombreCompleto.includes(term) || email.includes(term);
                }).length > 0 ? (
                  activePresidents.filter(pres => {
                    const term = searchTerm.toLowerCase();
                    const nombreCompleto = (pres.nombre || '').toLowerCase();
                    const email = (pres.correo || '').toLowerCase();
                    return nombreCompleto.includes(term) || email.includes(term);
                  }).map(pres => {
                    const id = String(pres.id || pres.PresidenteId);
                    const nombreCompleto = pres.nombre || pres.NombrePresidente || pres.correo;
                    return (
                      <div
                        key={`pres-${id}`}
                        onClick={async () => {
                          setSelectedPresidentId(id);
                          await cargarEstadoPagoEquipo({ presidenteId: id });
                        }}
                        style={{
                          border: `1px solid ${COLORS.slate200}`,
                          borderRadius: '16px',
                          padding: '16px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          backgroundColor: 'white'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = COLORS.primary;
                          e.currentTarget.style.boxShadow = `0 4px 12px ${COLORS.shadow05}`;
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = COLORS.slate200;
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ fontWeight: '800', color: COLORS.slate800, marginBottom: '4px' }}>👤 {nombreCompleto}</div>
                        <div style={{ fontSize: '12px', color: COLORS.slate500, marginBottom: '8px' }}>{pres.correo || 'Sin correo'}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                          <span style={{ fontSize: '11px', color: COLORS.primary, fontWeight: '800' }}>SELECCIONAR →</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '30px', color: COLORS.slate500 }}>
                    No se encontraron presidentes activos.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PASO 1: CONFIGURAR EQUIPO */}
      {(!equipoId || !equipoTemporalId) && isAdmin && activeStep === 1 && (
        <div style={{ maxWidth: '800px', margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>
          <div className="premium-card" style={{
            background: 'white',
            borderRadius: '24px',
            padding: '35px',
            boxShadow: `0 10px 25px -5px ${COLORS.shadow05}`,
            border: `1px solid ${COLORS.slate200}`
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: '800', color: COLORS.slate800, marginBottom: '8px' }}>
              Configuración del Nuevo Equipo
            </h3>
            <p style={{ color: COLORS.slate500, fontSize: '14px', marginBottom: '25px' }}>
              Ingresa los detalles básicos para registrar el equipo en el sistema. Los campos de categoría, modalidad y rama se auto-completarán según la liga seleccionada.
            </p>
            {/* Advertencia si la orden aún no fue aprobada */}
            {!pagoEquipo.equipoTemporalId && (
              <div style={{ background: COLORS.warningBg, border: `1px solid ${COLORS.warningLight}`, borderRadius: '14px', padding: '16px 20px', marginBottom: '22px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ fontSize: '22px' }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: '900', color: COLORS.orangeDeep, marginBottom: '4px' }}>Orden de pago pendiente de aprobación</div>
                  <div style={{ color: COLORS.warningDeep, fontSize: '13px', lineHeight: 1.5 }}>
                    Para crear el equipo primero debes aprobar la orden de pago del presidente. Regresa al paso anterior y usa el botón <strong>"Aprobar orden directamente"</strong>.
                  </div>
                  <button onClick={() => setActiveStep(0)} style={{ marginTop: '10px', padding: '8px 16px', borderRadius: '8px', border: 'none', background: COLORS.warningDark, color: 'white', fontWeight: '800', cursor: 'pointer', fontSize: '13px' }}>
                    ← Aprobar orden
                  </button>
                </div>
              </div>
            )}

            {/* Nombre del Equipo */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: COLORS.slate600, marginBottom: '8px' }}>
                Nombre del Equipo <span className="required-star">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej. REAL MADRID FC"
                value={teamFormData.teamName}
                onChange={(e) => {
                  // 1. Convertimos todo a mayúsculas
                  let cleanValue = e.target.value.toUpperCase();

                  // 2. Removemos caracteres especiales, permitiendo: Letras (incluyendo Ñ y tildes), Números y Espacios
                  cleanValue = cleanValue.replace(/[^A-ZÁÉÍÓÚÑ0-9\s]/g, '');

                  setTeamFormData(prev => ({ ...prev, teamName: cleanValue }));
                }}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: `1px solid ${COLORS.slate300}`,
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              />
            </div>

            {/* Logotipo del Equipo (Opcional) */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: COLORS.slate600, marginBottom: '8px' }}>
                Logotipo del Equipo (Opcional)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '16px',
                  border: `2px dashed ${COLORS.slate300}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: COLORS.slate50,
                  overflow: 'hidden'
                }}>
                  {teamFormData.teamLogo ? (
                    <img
                      src={URL.createObjectURL(teamFormData.teamLogo)}
                      alt="Preview logo"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <span style={{ fontSize: '24px', color: COLORS.slate400 }}>🛡️</span>
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    id="team-logo-upload"
                    accept=".jpg,.jpeg,.png"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const ext = '.' + file.name.split('.').pop().toLowerCase();
                      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type) || !['.jpg', '.jpeg', '.png'].includes(ext)) {
                        Swal.fire({ title: 'Tipo de archivo no permitido', text: 'Solo se aceptan imágenes JPG, JPEG o PNG para el logo.', icon: 'error', confirmButtonColor: COLORS.primary });
                        return;
                      }
                      setTeamFormData(prev => ({ ...prev, teamLogo: file }));
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('team-logo-upload').click()}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '10px',
                      border: `1px solid ${COLORS.slate300}`,
                      background: 'white',
                      color: COLORS.slate600,
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    Seleccionar Imagen
                  </button>
                  {teamFormData.teamLogo && (
                    <button
                      type="button"
                      onClick={() => setTeamFormData(prev => ({ ...prev, teamLogo: null }))}
                      style={{
                        padding: '10px 18px',
                        borderRadius: '10px',
                        border: 'none',
                        background: COLORS.dangerBg,
                        color: COLORS.danger,
                        fontWeight: '700',
                        cursor: 'pointer',
                        fontSize: '13px',
                        marginLeft: '10px'
                      }}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Seleccionar Liga */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: COLORS.slate600, marginBottom: '8px' }}>
                Seleccionar Liga <span className="required-star">*</span>
              </label>
              <select
                value={teamFormData.season}
                onChange={(e) => handleOptionChange('season', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: `1px solid ${COLORS.slate300}`,
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Selecciona una liga...</option>
                {catalogs.ligas.map(liga => (
                  <option key={liga.id} value={liga.id}>
                    {liga.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Parámetros de Liga Enlazados */}
            {teamFormData.season && (
              <div style={{
                background: COLORS.slate50,
                border: `1px solid ${COLORS.slate200}`,
                borderRadius: '14px',
                padding: '20px',
                marginBottom: '30px'
              }}>
                <h4 style={{ fontSize: '13px', fontWeight: '800', color: COLORS.slate700, marginBottom: '12px', textTransform: 'uppercase' }}>
                  Parámetros de Liga Enlazados
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: COLORS.slate500, display: 'block', fontWeight: '600' }}>Modalidad</span>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: COLORS.slate800 }}>
                      {catalogs.modalidades.find(m => Number(m.id) === Number(teamFormData.modality))?.nombre || 'Cargando...'}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: COLORS.slate500, display: 'block', fontWeight: '600' }}>Categoría</span>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: COLORS.slate800 }}>
                      {catalogs.categorias.find(c => Number(c.id) === Number(teamFormData.category))?.nombre || 'Cargando...'}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: COLORS.slate500, display: 'block', fontWeight: '600' }}>Rama</span>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: COLORS.slate800 }}>
                      {catalogs.ramas.find(r => Number(r.id) === Number(teamFormData.rama))?.nombre || 'Cargando...'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Acciones */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
              <button
                type="button"
                onClick={() => setActiveStep(0)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  border: `1px solid ${COLORS.slate300}`,
                  background: 'white',
                  color: COLORS.slate500,
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                ← Volver
              </button>
              <button
                type="button"
                onClick={handleSaveTeamAdmin}
                style={{
                  padding: '12px 28px',
                  borderRadius: '12px',
                  border: 'none',
                  background: COLORS.success,
                  color: 'white',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: `0 4px 12px ${COLORS.successBgTranslucent18}`
                }}
              >
                🛡️ Autorizar y crear equipo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: REGISTRO DE JUGADORES (LAYOUT ORIGINAL) */}
      {activeStep === 2 && (
        <>
          {/* DETALLES DEL EQUIPO */}
          {equipo && (
            <div className="team-selected-header-card">
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

              <div className="slots-counter-badge">
                <span style={{ fontSize: '11px', color: COLORS.slate400, display: 'block', fontWeight: '600' }}>Cupos Disponibles</span>
                <span style={{ fontSize: '24px', fontWeight: '950', color: sinSlots ? COLORS.danger : COLORS.success }}>
                  {slotsData?.slots_disponibles || 0} cupo(s)
                </span>
              </div>
            </div>
          )}

          {/* BLOQUEO SI NO HAY SLOTS */}
          {sinSlots ? (
            <div className="premium-card fade-in" style={{
              maxWidth: '1000px',
              margin: '0 auto',
              background: 'white',
              borderRadius: '24px',
              padding: '40px',
              textAlign: 'center',
              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
              border: `1px solid ${COLORS.dangerBg}`
            }}>
              <div style={{ fontSize: '60px', marginBottom: '20px' }}>⚠️</div>
              <h2 style={{ fontSize: '22px', fontWeight: '800', color: COLORS.danger, marginBottom: '10px' }}>Sin Slots / Seguros Disponibles</h2>
              <p style={{ color: COLORS.slate500, maxWidth: '600px', margin: '0 auto 25px auto', lineHeight: '1.6' }}>
                Este equipo ya ha completado todos los seguros y slots contratados.
                No es posible agregar más jugadores hasta adquirir nuevos slots de registro.
              </p>
              <BotonSecundario
                etiqueta="Volver a mis equipos"
                alHacerClick={() => navigate(isAdmin ? ROUTES.ADMIN.EQUIPOS : ROUTES.PRESIDENTE.EQUIPOS)}
              />
            </div>
          ) : (
            <div className="premium-card fade-in" style={{
              maxWidth: '1000px',
              margin: '0 auto',
              background: 'white',
              borderRadius: '24px',
              padding: '40px',
              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
              border: `1px solid ${COLORS.slate200}`
            }}>

              <div style={{ marginBottom: '30px', borderBottom: `1px solid ${COLORS.slate100}`, paddingBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p className="required-legend" style={{ margin: 0 }}>
                  <span className="required-star">*</span> Indica que el campo es obligatorio.
                </p>
              </div>

              {/* PASO 1: SELECCION DE SEGURO / SLOT A CONSUMIR */}
              <section style={{ marginBottom: '45px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '24px' }}>
                  <StepBadge number="1" isActive={!isStep1Done} isDone={isStep1Done} />
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: COLORS.slate800, margin: 0 }}>Seguro pagado por asignar</h3>
                </div>

                <div style={{ animation: 'slideUp 0.4s ease', maxWidth: '800px', margin: '0 auto' }}>
                  <div className="card" style={{ padding: '25px', borderRadius: '16px', border: `1px solid ${COLORS.slate200}`, background: COLORS.slate50 }}>
                    <label className="form-label" style={{ fontWeight: '700', fontSize: '14px', marginBottom: '12px', display: 'block' }}>
                      Seleccione el seguro comprado que desea para esta inscripción: <span className="required-star">*</span>
                    </label>
                    <div className="insurance-grid">
                      {slotsData?.seguros_disponibles?.map((seg) => {
                        const matchedSeguro = catalogs?.seguros?.find(s => s.id === seg.SeguroId);
                        const isSelected = String(selectedSeguroId) === String(seg.SeguroId);
                        return (
                          <div
                            key={`seguro-card-${seg.SeguroId}`}
                            onClick={() => setSelectedSeguroId(String(seg.SeguroId))}
                            className="insurance-card-custom"
                            style={{
                              border: isSelected ? `2.5px solid ${COLORS.primary}` : `1px solid ${COLORS.slate300}`,
                              backgroundColor: isSelected ? COLORS.secondaryBg : 'white',
                              padding: '16px',
                              borderRadius: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}
                          >
                            <div className="insurance-info-wrapper">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '14px', fontWeight: '800', color: isSelected ? COLORS.primary : COLORS.slate800 }}>
                                  🛡️ {matchedSeguro ? matchedSeguro.nombre : `Seguro ID ${seg.SeguroId}`}
                                </span>
                                {matchedSeguro && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSeguroDetalle(matchedSeguro);
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
                            </div>
                            <div className="insurance-badge-wrapper" style={{ marginTop: '5px', display: 'inline-flex', alignSelf: 'start', padding: '2px 8px', borderRadius: '20px', background: COLORS.greenBg, color: COLORS.greenDarker, fontSize: '11px', fontWeight: '800' }}>
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

                  <div style={{
                    background: COLORS.secondaryBg100,
                    border: `1px solid ${COLORS.sky100}`,
                    borderRadius: '12px',
                    padding: '12px 18px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '13px',
                    color: COLORS.skyDarker,
                    fontWeight: '600'
                  }}>
                    <span style={{ fontSize: '18px' }}>📋</span>
                    Puedes subir los documentos ahora para auto-llenar los campos del formulario
                  </div>

                  <div className="document-upload-grid">
                    {documentCards.map((doc) => (
                      <div
                        key={doc.key}
                        className="document-card-custom"
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
                          border: dragActive[doc.key] ? `2px solid ${COLORS.primary}` : (documents[doc.key] ? `2px solid ${COLORS.success}` : `2px dashed ${COLORS.slate300}`),
                          backgroundImage: (documents[doc.key] && documents[doc.key].type !== 'application/pdf' && previews[doc.key]) ? `linear-gradient(${COLORS.overlaySlateDark}, ${COLORS.overlaySlateDeep}), url(${previews[doc.key]})` : 'none',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          cursor: 'pointer',
                          position: 'relative',
                          color: documents[doc.key] ? COLORS.white : 'inherit'
                        }}
                        onClick={() => {
                          if (!documents[doc.key]) {
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
                          }
                        }}
                      >
                        {/* Indicador de Menor para tutor/credencial */}
                        {esMenorDeEdad && (doc.key === 'acta' || doc.key === 'identificacionMenor' || doc.key === 'foto') && (
                          <div style={{ position: 'absolute', top: 10, right: 10, background: `linear-gradient(90deg,${COLORS.warning},${COLORS.warningLight})`, borderRadius: '12px', padding: '3px 9px', fontSize: '9px', fontWeight: '950', color: 'white', letterSpacing: '0.5px', zIndex: 1 }}>Menor de edad</div>
                        )}

                        <div className="doc-card-body-wrapper" style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                          <div className="doc-info-wrapper" style={{ width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                              {!documents[doc.key] ? (
                                <FaUpload style={{ color: COLORS.brandBlueLight, flexShrink: 0 }} />
                              ) : documents[doc.key].type === 'application/pdf' ? (
                                <FaFilePdf style={{ color: COLORS.danger, flexShrink: 0 }} />
                              ) : (
                                <span style={{ color: COLORS.success, flexShrink: 0 }}>📷</span>
                              )}
                              <h4 className="doc-title-text" style={{ fontSize: '13px', fontWeight: '800', margin: 0, color: documents[doc.key] ? COLORS.white : COLORS.slate800 }}>
                                {doc.title}
                              </h4>
                            </div>
                            <p className="doc-subtitle-text" style={{ margin: '0 0 6px', fontSize: '10px', color: documents[doc.key] ? COLORS.slate300 : COLORS.slate500, lineHeight: 1.4 }}>
                              {doc.subtitle}
                            </p>
                            {doc.key === 'foto' && (
                              <p style={{ margin: '0 0 8px', fontSize: '10px', color: documents[doc.key] ? COLORS.dangerBgDark : COLORS.danger, fontStyle: 'italic', fontWeight: '500', lineHeight: 1.4 }}>
                                Mantén una postura recta, visibilidad de hombros, sin sonrisa, ni accesorios como lentes, aretes o gorras.
                              </p>
                            )}
                          </div>

                          <div className="doc-status-wrapper" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                            {documents[doc.key] ? (
                              <>
                                <div style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '4px 10px',
                                  borderRadius: '20px',
                                  backgroundColor: COLORS.successBgTranslucent18,
                                  color: COLORS.successLight,
                                  fontSize: '10px',
                                  fontWeight: '800'
                                }}>
                                  <FaCheckCircle /> Listo
                                </div>
                                <div className="doc-actions-overlay" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const isPdf = documents[doc.key]?.type === 'application/pdf';
                                      setPreviewDoc({
                                        open: true,
                                        url: previews[doc.key],
                                        type: isPdf ? 'pdf' : 'image',
                                        title: doc.title
                                      });
                                    }}
                                    className="doc-action-btn zoom"
                                    title="Ver previsualización"
                                  >
                                    <FaSearchPlus />
                                  </button>
                                  <button
                                    type="button"
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
                                    className="doc-action-btn change"
                                    title="Cambiar archivo"
                                  >
                                    <FaSyncAlt />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveDocument(doc.key)}
                                    className="doc-action-btn delete"
                                    title="Quitar archivo"
                                    style={{ backgroundColor: COLORS.danger }}
                                  >
                                    <FaTrash />
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 12px',
                                borderRadius: '20px',
                                backgroundColor: COLORS.slate100,
                                color: COLORS.slate500,
                                fontSize: '10px',
                                fontWeight: '800'
                              }}>
                                Pendiente
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Botón de validación fallida y bypass para fotografía */}
                        {doc.key === 'foto' && !documents.foto && failedPhoto && (
                          <div style={{ marginTop: '8px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
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
                          accept=".pdf,.jpg,.jpeg,.png"
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
                      Analizando el Acta de Nacimiento... Los campos del formulario se auto-completarán en breve.
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
                  <div className="dashboard-card" style={{ border: `1px solid ${COLORS.slate200}`, marginBottom: '30px' }}>

                    <div className="form-inputs-grid-4">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: COLORS.slate600 }}>Nombre(s) <span className="required-star">*</span></label>
                        <input type="text" maxLength={30} value={extractedData.nombreJugador} onChange={e => handleFieldChange('nombreJugador', e.target.value)} onBlur={handleBlur} placeholder="Ej. Juan" style={{ padding: '10px', borderRadius: '8px', border: `1px solid ${COLORS.slate300}`, fontSize: '14px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: COLORS.slate600 }}>Ap. Paterno <span className="required-star">*</span></label>
                        <input type="text" maxLength={30} value={extractedData.apellidoPaterno} onChange={e => handleFieldChange('apellidoPaterno', e.target.value)} onBlur={handleBlur} placeholder="Ej. Pérez" style={{ padding: '10px', borderRadius: '8px', border: `1px solid ${COLORS.slate300}`, fontSize: '14px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: COLORS.slate600 }}>Ap. Materno <span className="required-star">*</span></label>
                        <input type="text" maxLength={30} value={extractedData.apellidoMaterno} onChange={e => handleFieldChange('apellidoMaterno', e.target.value)} onBlur={handleBlur} placeholder="Ej. Gómez" style={{ padding: '10px', borderRadius: '8px', border: `1px solid ${COLORS.slate300}`, fontSize: '14px' }} />
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
                          onBlur={handleBlur}
                          placeholder="Se auto-completará con el documento de identidad"
                          maxLength="18"
                          style={{
                            padding: '10px',
                            borderRadius: '8px',
                            border: `1.5px solid ${curpExistente ? COLORS.danger : COLORS.slate300}`,
                            boxShadow: curpExistente ? `0 0 0 3px ${COLORS.dangerBgTranslucent10}` : 'none',
                            fontSize: '14px',
                            backgroundColor: '#f1f5f9',
                            cursor: 'not-allowed'
                          }}
                        />
                        {curpExistente && (
                          <div style={{ color: COLORS.danger, fontSize: '11px', marginTop: '6px', fontWeight: '700' }}>
                            Esta CURP ya se encuentra registrada.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="form-inputs-grid-3">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: COLORS.slate600 }}>Fecha Nac. <span className="required-star">*</span></label>
                        <input
                          type="date"
                          value={extractedData.fechaNacimiento || ''}
                          onChange={e => handleFieldChange('fechaNacimiento', e.target.value)}
                          onBlur={handleBlur}
                          style={{ padding: '10px', borderRadius: '8px', border: `1px solid ${COLORS.slate300}`, fontSize: '14px' }}
                        />
                        {(() => {
                          const val = extractedData.fechaNacimiento;
                          if (!val) return null;
                          const fechaDate = new Date(val);
                          const hoy = new Date();

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
                        <input type="text" maxLength={30} value={extractedData.lugarNacimiento || ''} onChange={e => handleFieldChange('lugarNacimiento', e.target.value)} onBlur={handleBlur} placeholder="Ej. Monterrey, NL" style={{ padding: '10px', borderRadius: '8px', border: `1px solid ${COLORS.slate300}`, fontSize: '14px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: COLORS.slate600 }}>Sexo <span className="required-star">*</span></label>
                        <select
                          value={extractedData.genero || ""}
                          onChange={e => {
                            handleFieldChange('genero', e.target.value);
                            guardarBorradorEnBD({ ...extractedData, genero: e.target.value });
                          }}
                          style={{ padding: '10px', borderRadius: '8px', border: `1px solid ${COLORS.slate300}`, fontSize: '14px', backgroundColor: 'white' }}
                        >
                          <option value="">Seleccione...</option>
                          <option value="1">MASCULINO</option>
                          <option value="2">FEMENINO</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-inputs-grid-2">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: COLORS.slate600 }}># Camiseta <span className="required-star">*</span></label>
                        <input
                          type="text"
                          maxLength={3}
                          value={extractedData.numCamiseta}
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 3);
                            handleFieldChange('numCamiseta', val);
                          }}
                          onBlur={handleBlur}
                          placeholder="Ej. 10"
                          style={{
                            padding: '10px',
                            borderRadius: '8px',
                            border: `1.5px solid ${validationErrors.numCamiseta ? COLORS.danger : COLORS.slate300}`,
                            boxShadow: validationErrors.numCamiseta ? `0 0 0 3px ${COLORS.dangerBgTranslucent10}` : 'none',
                            fontSize: '14px',
                            width: '100%',
                            boxSizing: 'border-box'
                          }}
                        />
                        {validationErrors.numCamiseta && (
                          <div style={{ color: COLORS.danger, fontSize: '11px', marginTop: '6px', fontWeight: '700' }}>
                            {validationErrors.numCamiseta}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: COLORS.slate600 }}>Posición en el campo <span className="required-star">*</span></label>
                        <select
                          value={extractedData.posicion}
                          onChange={e => {
                            const val = parseInt(e.target.value) || '';
                            handleFieldChange('posicion', val);
                            guardarBorradorEnBD({ ...extractedData, posicion: val });
                          }}
                          style={{
                            padding: '10px',
                            borderRadius: '8px',
                            border: `1.5px solid ${validationErrors.posicion ? COLORS.danger : COLORS.slate300}`,
                            boxShadow: validationErrors.posicion ? `0 0 0 3px ${COLORS.dangerBgTranslucent10}` : 'none',
                            fontSize: '14px',
                            backgroundColor: 'white',
                            width: '100%',
                            boxSizing: 'border-box'
                          }}
                        >
                          <option value="">Posición...</option>
                          {(catalogs?.roles_equipo || []).map(r => (
                            <option key={r.id} value={r.id}>{r.nombre}</option>
                          ))}
                        </select>
                        {validationErrors.posicion && (
                          <div style={{ color: COLORS.danger, fontSize: '11px', marginTop: '6px', fontWeight: '700' }}>
                            {validationErrors.posicion}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="form-inputs-grid-2" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: COLORS.slate600 }}>Correo electrónico <span className="required-star">*</span></label>
                        <input type="email" maxLength={60} value={extractedData.correo} onChange={e => handleFieldChange('correo', e.target.value)} onBlur={handleBlur} placeholder="correo@ejemplo.com" style={{ padding: '10px', borderRadius: '8px', border: `1px solid ${COLORS.slate300}`, fontSize: '14px', width: '100%', boxSizing: 'border-box', minWidth: 0 }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: COLORS.slate600 }}># de Teléfono <span className="required-star">*</span></label>
                        <div className="phone-input-flex-container" style={{ display: 'flex', gap: '8px' }}>
                          <select
                            value={extractedData.codigoPais || '+52'}
                            onChange={e => handleFieldChange('codigoPais', e.target.value)}
                            onBlur={handleBlur}
                            style={{
                              padding: '10px',
                              borderRadius: '8px',
                              border: `1px solid ${COLORS.slate300}`,
                              fontSize: '14px',
                              backgroundColor: 'white',
                              width: '35%',
                              minWidth: '80px',
                              flexShrink: 0,
                              boxSizing: 'border-box'
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
                            onChange={e => handleFieldChange('telefono', e.target.value.replace(/\D/g, '').slice(0, 10))}
                            onBlur={handleBlur}
                            placeholder="10 dígitos numéricos"
                            style={{
                              padding: '10px',
                              borderRadius: '8px',
                              border: `1px solid ${COLORS.slate300}`,
                              fontSize: '14px',
                              flexGrow: 1,
                              width: '65%',
                              minWidth: 0,
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Selector de Nacionalidad */}
                    <div style={{ marginBottom: '25px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                        <FaGlobeAmericas style={{ color: COLORS.primary, fontSize: '20px' }} />
                        <h3 style={{ fontSize: '17px', fontWeight: '700', color: COLORS.slate800, margin: 0 }}>Nacionalidad del jugador</h3>
                      </div>

                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '10px',
                        background: COLORS.slate100,
                        padding: '4px',
                        borderRadius: '12px',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = { ...extractedData, esForaneo: false };
                            setExtractedData(updated);
                            guardarBorradorEnBD(updated);
                          }}
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
                            cursor: 'pointer',
                            flex: '1 1 auto',
                            justifyContent: 'center'
                          }}
                        >
                          🇲🇽 Mexicano
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = { ...extractedData, esForaneo: true };
                            setExtractedData(updated);
                            guardarBorradorEnBD(updated);
                          }}
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
                            cursor: 'pointer',
                            flex: '1 1 auto',
                            justifyContent: 'center'
                          }}
                        >
                          🌎 Extranjero
                        </button>
                      </div>
                    </div>

                    {/* ANTECEDENTES INTERNACIONALES (FORÁNEO) */}
                    <div className="international-info-card">
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
                              alPerderEnfoque={handleBlur}
                            />
                            <EntradaFormulario
                              etiqueta="País de residencia actual"
                              valor={extractedData.paisResidencia}
                              alCambiar={e => handleFieldChange('paisResidencia', e.target.value)}
                              alPerderEnfoque={handleBlur}
                            />
                          </div>

                          <div className="form-inputs-grid-2" style={{ alignItems: 'end', width: '100%' }}>
                            <EntradaSeleccion
                              etiqueta="¿El jugador ha vivido en el extranjero?"
                              valor={extractedData.haVividoExtranjero ? '1' : '0'}
                              alCambiar={e => {
                                const boolVal = e.target.value === '1';
                                handleFieldChange('haVividoExtranjero', boolVal);
                                guardarBorradorEnBD({ ...extractedData, haVividoExtranjero: boolVal });
                              }}
                              opciones={[{ valor: '0', etiqueta: 'No' }, { valor: '1', etiqueta: 'Sí' }]}
                              obligatorio={true}
                            />
                            {extractedData.haVividoExtranjero && (
                              <EntradaFormulario
                                etiqueta="¿En qué país?"
                                valor={extractedData.dondeVividoExtranjero}
                                alCambiar={e => handleFieldChange('dondeVividoExtranjero', e.target.value)}
                                alPerderEnfoque={handleBlur}
                                obligatorio={true}
                              />
                            )}
                          </div>

                          <div className="form-inputs-grid-2" style={{ width: '100%' }}>
                            <EntradaFormulario
                              etiqueta="Nacionalidad del padre"
                              valor={extractedData.nacionalidadPadre}
                              alCambiar={e => handleFieldChange('nacionalidadPadre', e.target.value)}
                              alPerderEnfoque={handleBlur}
                            />
                            <EntradaFormulario
                              etiqueta="Nacionalidad de la madre"
                              valor={extractedData.nacionalidadMadre}
                              alCambiar={e => handleFieldChange('nacionalidadMadre', e.target.value)}
                              alPerderEnfoque={handleBlur}
                            />
                          </div>

                          <EntradaFormulario
                            etiqueta="El jugador ha sido registrado por la Asociación Nacional de Fútbol (en el extranjero) como jugador amateur o profesional, previo a su solitud de registro en la FMF (Si - No)"
                            valor={extractedData.registroAsociacionExtranjera}
                            alCambiar={e => handleFieldChange('registroAsociacionExtranjera', e.target.value)}
                            alPerderEnfoque={handleBlur}
                            filas={2}
                            obligatorio={true}
                          />

                          <div className="abuelos-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', width: '100%' }}>
                            <EntradaFormulario etiqueta="Nac. Abuelo Paterno" valor={extractedData.nacAbueloPaterno} alCambiar={e => handleFieldChange('nacAbueloPaterno', e.target.value)} alPerderEnfoque={handleBlur} />
                            <EntradaFormulario etiqueta="Nac. Abuela Paterna" valor={extractedData.nacAbuelaPaterna} alCambiar={e => handleFieldChange('nacAbuelaPaterna', e.target.value)} alPerderEnfoque={handleBlur} />
                            <EntradaFormulario etiqueta="Nac. Abuelo Materno" valor={extractedData.nacAbueloMaterno} alCambiar={e => handleFieldChange('nacAbueloMaterno', e.target.value)} alPerderEnfoque={handleBlur} />
                            <EntradaFormulario etiqueta="Nac. Abuela Materna" valor={extractedData.nacAbuelaMaterna} alCambiar={e => handleFieldChange('nacAbuelaMaterna', e.target.value)} alPerderEnfoque={handleBlur} />
                          </div>

                          <EntradaFormulario
                            etiqueta="El jugador ha jugado en un Club extranjero y participado en Torneos y/o competencias internacionales, escolares o de recreo como campamentos estacionales, cursos, etc"
                            valor={extractedData.juegoClubExtranjero}
                            alCambiar={e => handleFieldChange('juegoClubExtranjero', e.target.value)}
                            alPerderEnfoque={handleBlur}
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
                  <div className="form-actions-wrapper">
                    <BotonSecundario
                      etiqueta="Cancelar y volver"
                      alHacerClick={() => navigate(isAdmin ? ROUTES.ADMIN.EQUIPOS : ROUTES.PRESIDENTE.EQUIPOS)}
                      clasesPersonalizadas="w-100-mobile"
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
        </>
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
              <strong> Si aún no tienes el formato firmado, puedes continuar sin subirlo ahora</strong> y cargarlo después.
            </p>
          </div>

          <div
            onClick={() => document.getElementById('final-signed-form').click()}
            style={{
              border: signedForm ? `2px solid ${COLORS.success}` : `2px dashed ${COLORS.sky}`,
              borderRadius: '20px',
              padding: '40px 20px',
              backgroundColor: signedForm ? COLORS.greenBg50 : COLORS.slate50,
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            {signedForm ? (
              <div style={{ color: COLORS.success }}>
                <FaFilePdf style={{ fontSize: '50px', marginBottom: '15px' }} />
                <p style={{ margin: 0, fontWeight: '700' }}>{signedForm.name}</p>
                <p style={{ margin: '5px 0 0 0', fontSize: '12px' }}>Archivo listo para enviar</p>
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
                    <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', fontWeight: '800', color: COLORS.secondaryLight, display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      ✨ Beneficios Incluidos
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: COLORS.slate300, lineHeight: '1.5' }}>
                      {info.beneficios.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Right Column - Coverage Table */}
                  <div>
                    <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', fontWeight: '800', color: COLORS.secondaryLight, display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      📊 Coberturas y Límites
                    </h4>
                    {info.coberturas.length > 0 ? (
                      <div style={{ border: `1px solid ${COLORS.overlayWhite08}`, borderRadius: '12px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ background: COLORS.overlayWhite02, borderBottom: `1px solid ${COLORS.overlayWhite08}` }}>
                              <th style={{ padding: '12px 15px', color: COLORS.overlayWhite60, fontWeight: '700' }}>Concepto</th>
                              <th style={{ padding: '12px 15px', color: COLORS.overlayWhite60, fontWeight: '700', textAlign: 'right' }}>Límite</th>
                            </tr>
                          </thead>
                          <tbody>
                            {info.coberturas.map((c, i) => (
                              <tr key={i} style={{ borderBottom: i === info.coberturas.length - 1 ? 'none' : `1px solid ${COLORS.overlayWhite05}` }}>
                                <td style={{ padding: '12px 15px', color: COLORS.slate200, fontWeight: '600' }}>{c.cobertura}</td>
                                <td style={{ padding: '12px 15px', color: COLORS.successLight, fontWeight: '800', textAlign: 'right' }}>{c.monto}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: '13px', color: COLORS.slate400, fontStyle: 'italic' }}>
                        No ampara gastos médicos por accidente.
                      </p>
                    )}
                  </div>
                </div>

                {/* Scope / Terms */}
                <div style={{ background: COLORS.overlayWhite02, border: `1px solid ${COLORS.overlayWhite06}`, borderRadius: '16px', padding: '20px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: '800', color: COLORS.secondaryLight, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    🔍 Alcance y Conditions de la Póliza
                  </h4>
                  <div style={{ fontSize: '12.5px', color: COLORS.slate300, lineHeight: '1.6', marginBottom: '15px' }}>
                    {info.alcance}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', borderTop: `1px solid ${COLORS.overlayWhite06}`, paddingTop: '15px', fontSize: '12px' }}>
                    <div>
                      <span style={{ color: COLORS.overlayWhite50, fontWeight: '600' }}>Póliza:</span>{' '}
                      <span style={{ color: COLORS.white, fontWeight: '700' }}>{info.poliza}</span>
                    </div>
                    <div>
                      <span style={{ color: COLORS.overlayWhite50, fontWeight: '600' }}>Vigencia:</span>{' '}
                      <span style={{ color: COLORS.white, fontWeight: '700' }}>{info.vigencia}</span>
                    </div>
                  </div>
                </div>

                {/* Close Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: `1px solid ${COLORS.overlayWhite08}`, paddingTop: '20px' }}>
                  <button
                    type="button"
                    onClick={() => setSeguroDetalle(null)}
                    style={{
                      padding: '10px 24px',
                      borderRadius: '10px',
                      border: 'none',
                      background: COLORS.brandBlueLight,
                      color: 'white',
                      fontWeight: '800',
                      cursor: 'pointer',
                      fontSize: '13px',
                      boxShadow: `0 4px 10px ${COLORS.brandBlueLight30}`
                    }}
                  >
                    Cerrar Detalles
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}
    </div>
  );

}
