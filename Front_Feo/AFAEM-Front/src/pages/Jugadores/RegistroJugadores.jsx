import COLORS from '../../styles/colors';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ROUTES } from '../../routes/paths';
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
  FaExclamationTriangle,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';
import AfaemLogo from '../../assets/afaem-logo@4x.png';
import { PDFDocument } from 'pdf-lib';
import { validarFotografia } from '../../services/foto';
import CameraCaptureModal from '../../components/Common/CameraCaptureModal';
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

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = error => reject(error);
});

const base64ToFile = async (dataurl, filename) => {
  try {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  } catch (err) {
    try {
      const res = await fetch(dataurl);
      const blob = await res.blob();
      return new File([blob], filename, { type: blob.type });
    } catch (fetchErr) {
      throw fetchErr;
    }
  }
};

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
  const maxBirthDate = new Date();
  maxBirthDate.setFullYear(maxBirthDate.getFullYear() - 3);
  const maxBirthDateStr = maxBirthDate.toISOString().split('T')[0];
  const minDateStr = '1900-01-01';

  // ESTILO DINÁMICO PARA HOVER Y DISEÑO RESPONSIVO
  const hoverStyles = `
    .document-card:hover .overlay-actions {
      opacity: 1 !important;
    }
    .document-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 15px -3px ${COLORS.shadow10};
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
      background: ${COLORS.overlayWhite75};
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid ${COLORS.overlayWhite40};
      padding: 12px 20px;
      border-radius: 12px;
      box-shadow: 0 8px 32px 0 ${COLORS.glassShadowBorder};
      z-index: 9999;
      font-family: inherit;
      font-size: 14px;
      font-weight: 700;
      color: ${COLORS.slate800};
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
    .phone-input-row select {
      width: 110px;
      flex-shrink: 0;
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
      box-sizing: border-box;
    }

    .slot-nav-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 0 auto 25px auto;
      max-width: 1000px;
      width: 100%;
      padding: 16px 35px;
      background: white;
      border-radius: 24px;
      border: 1px solid ${COLORS.slate200};
      box-shadow: 0 4px 6px -1px ${COLORS.shadow05}, 0 2px 4px -1px ${COLORS.shadow05};
      transition: all 0.3s ease;
      box-sizing: border-box;
    }

    @media (max-width: 1024px) {
      .form-grid-3 {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 900px) {
      .stepper-container {
        grid-template-columns: repeat(3, 1fr) !important;
        gap: 16px 12px;
      }
      .stepper-line {
        display: none !important;
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
      .phone-input-row select {
        width: 100%;
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
      .espacios-disponibles-card {
        text-align: left !important;
        width: 100% !important;
      }
      .stepper-container {
        grid-template-columns: repeat(3, 1fr) !important;
        padding: 16px 12px;
        margin-bottom: 20px;
        border-radius: 12px;
        gap: 16px 12px;
      }
      .stepper-label {
        display: block !important;
      }
      .stepper-item {
        min-width: auto;
      }
      .stepper-bubble {
        width: 32px;
        height: 32px;
        font-size: 13px;
        border-width: 2px;
      }
      .stepper-line {
        display: none !important;
      }
      .slot-nav-container {
        padding: 12px 16px;
        border-radius: 16px;
      }
      .mobile-step-indicator {
        display: block;
        text-align: center;
        font-weight: 800;
        font-size: 12px;
        color: ${COLORS.primary};
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 25px;
        background: ${COLORS.secondaryBg};
        padding: 10px;
        border-radius: 10px;
        border: 1px dashed ${COLORS.primaryBgTranslucent25};
      }
    }

    @media (max-width: 480px) {
      .stepper-container {
        grid-template-columns: repeat(3, 1fr) !important;
        gap: 12px 8px;
        padding: 12px 8px;
      }
      .stepper-bubble {
        width: 28px !important;
        height: 28px !important;
        font-size: 11px !important;
      }
      .stepper-label {
        font-size: 10px !important;
        margin-top: 6px !important;
      }
    }

    .mobile-step-indicator {
      display: none;
    }

    /* Estilos del Wizard (Stepper) */
    .stepper-container {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      align-items: start;
      margin-bottom: 35px;
      position: relative;
      background: ${COLORS.slate50};
      padding: 24px;
      border-radius: 20px;
      border: 1px solid ${COLORS.slate200};
      gap: 16px 10px;
      overflow-x: hidden;
    }
    .stepper-line {
      position: absolute;
      top: 44px;
      left: 8.33%;
      right: 8.33%;
      height: 4px;
      background: ${COLORS.slate200};
      z-index: 1;
    }
    .stepper-line-progress {
      height: 100%;
      background: linear-gradient(90deg, ${COLORS.primary}, ${COLORS.success});
      transition: width 0.4s ease;
    }
    .stepper-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      z-index: 2;
      cursor: pointer;
      text-align: center;
    }
    .stepper-bubble {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: white;
      border: 3px solid ${COLORS.slate300};
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      color: ${COLORS.slate500};
      transition: all 0.3s ease;
      box-shadow: 0 4px 6px -1px ${COLORS.shadow05};
    }
    .stepper-item.active .stepper-bubble {
      border-color: ${COLORS.primary};
      color: ${COLORS.primary};
      background: ${COLORS.secondaryBg};
      transform: scale(1.1);
      box-shadow: 0 0 12px ${COLORS.primaryBgTranslucent25};
    }
    .stepper-item.completed .stepper-bubble {
      border-color: ${COLORS.success};
      color: white;
      background: ${COLORS.success};
    }
    .stepper-label {
      font-size: 11px;
      font-weight: 800;
      margin-top: 8px;
      color: ${COLORS.slate500};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      transition: color 0.3s;
      text-align: center;
      display: block;
    }
    .stepper-item.active .stepper-label {
      color: ${COLORS.primary};
    }
    .stepper-item.completed .stepper-label {
      color: ${COLORS.success};
    }
    
    .wizard-step-container {
      animation: fadeIn 0.4s ease;
    }
    
    .field-error-msg {
      color: ${COLORS.danger};
      font-size: 11px;
      font-weight: 700;
      margin-top: 4px;
      text-transform: uppercase;
    }
    .input-error {
      border-color: ${COLORS.danger} !important;
      background-color: ${COLORS.dangerBgLight} !important;
      box-shadow: 0 0 0 3px ${COLORS.dangerBgTranslucent10} !important;
    }

    /* Paso 5 Seguros */
    .seguro-wizard-card {
      background: ${COLORS.slate50};
      border-radius: 16px;
      padding: 25px;
    }
    .seguro-wizard-label {
      font-size: 14px;
      margin-bottom: 8px;
    }
    .seguro-wizard-sublabel {
      font-size: 10px;
      margin-bottom: 12px;
    }
    .seguro-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 15px;
    }
    .seguro-card-item {
      padding: 16px;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      gap: 6px;
      position: relative;
    }
    .seguro-card-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.08);
    }
    .seguro-card-title {
      font-size: 14px;
      line-height: 1.4;
    }
    .seguro-card-badge {
      margin-top: 5px;
      display: inline-flex;
      align-self: start;
      padding: 2px 8px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 800;
    }
    .seguro-modal-container {
      background-color: ${COLORS.slate800};
      border: 1px solid ${COLORS.overlayWhite10};
      border-radius: 24px;
      width: 100%;
      max-width: 750px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px -12px ${COLORS.overlayBlack};
      display: flex;
      flex-direction: column;
      color: white;
    }
    .seguro-modal-header {
      padding: 24px 30px;
      border-bottom: 1px solid ${COLORS.overlayWhite08};
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 15px;
      background: linear-gradient(90deg, ${COLORS.slate800}, ${COLORS.slate900});
    }
    .seguro-modal-content {
      padding: 30px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .seguro-modal-footer {
      padding: 20px 30px;
      border-top: 1px solid ${COLORS.overlayWhite08};
      background-color: ${COLORS.overlaySlateLight};
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      border-bottom-left-radius: 24px;
      border-bottom-right-radius: 24px;
    }

    @media (max-width: 640px) {
      .seguro-wizard-card {
        padding: 15px !important;
        border-radius: 12px !important;
      }
      .seguro-wizard-label {
        font-size: 12px !important;
        margin-bottom: 6px !important;
      }
      .seguro-wizard-sublabel {
        font-size: 9px !important;
        margin-bottom: 8px !important;
      }
      .seguro-cards-grid {
        grid-template-columns: 1fr;
      }
      .seguro-card-item {
        padding: 12px !important;
      }
      .seguro-card-title {
        font-size: 12.5px !important;
      }
      .seguro-card-badge {
        font-size: 10px !important;
        padding: 2px 6px !important;
      }
      .seguro-modal-container {
        border-radius: 18px;
        max-height: 95vh;
      }
      .seguro-modal-header {
        padding: 18px 20px;
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }
      .seguro-modal-header > div:last-child {
        text-align: left !important;
        align-self: flex-start;
      }
      .seguro-modal-content {
        padding: 18px 20px;
        gap: 18px;
      }
      .seguro-modal-content > div:first-child {
        grid-template-columns: 1fr !important;
        gap: 20px !important;
      }
      .seguro-modal-footer {
        padding: 15px 20px;
        flex-direction: column-reverse;
        align-items: stretch;
        border-bottom-left-radius: 18px;
        border-bottom-right-radius: 18px;
      }
      .seguro-modal-footer button {
        width: 100%;
        justify-content: center;
        text-align: center;
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
  const [currentStep, setCurrentStep] = useState(1);
  const [isCheckingCurp, setIsCheckingCurp] = useState(false);
  const [seguroDetalle, setSeguroDetalle] = useState(null);

  useEffect(() => {
    if (seguroDetalle) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [seguroDetalle]);
  const changeStep = (stepOrUpdater) => {
    document.activeElement?.blur();
    setCurrentStep(prev => {
      const newStep = typeof stepOrUpdater === 'function' ? stepOrUpdater(prev) : stepOrUpdater;

      setJugadores(jPrev => {
        const next = [...jPrev];
        const currentPlayerState = next[currentPlayerIndex];
        if (currentPlayerState && currentPlayerState.slotId) {
          const datos = { ...currentPlayerState.datos };
          if (datos.numCamiseta) {
            const duplicate = next.find(p =>
              p.numero !== currentPlayerState.numero &&
              p.datos?.numCamiseta &&
              parseInt(p.datos.numCamiseta, 10) === parseInt(datos.numCamiseta, 10)
            );
            if (duplicate) {
              datos.numCamiseta = '';
            }
          }
          const newDatos = { ...datos, currentStep: newStep };
          next[currentPlayerIndex] = {
            ...currentPlayerState,
            datos: newDatos
          };
          guardarBorradorEnBD(currentPlayerState.slotId, newDatos);
        }
        return next;
      });

      return newStep;
    });
  };
  const [validationErrors, setValidationErrors] = useState({});

  // Estados y refs para autoguardado toast
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimeoutRef = useRef(null);

  const obtenerDuplicadoCamiseta = (numeroCamiseta, playerNumero) => {
    if (!numeroCamiseta || String(numeroCamiseta).trim() === '') return null;
    const camisetaVal = parseInt(numeroCamiseta, 10);
    return jugadores.find(p =>
      p.numero !== playerNumero &&
      p.datos?.numCamiseta &&
      parseInt(p.datos.numCamiseta, 10) === camisetaVal
    );
  };

  const obtenerDuplicadoPosicion = (posicionId, playerNumero) => {
    if (!posicionId) return null;
    const posVal = parseInt(posicionId, 10);
    if (posVal === 11) return null; // Permite duplicados para RolId = 11 (Cambio / Banca)
    return jugadores.find(p =>
      p.numero !== playerNumero &&
      p.datos?.posicion &&
      parseInt(p.datos.posicion, 10) === posVal
    );
  };

  // Función que verifica requisitos sin lanzar alertas ni modificar estado
  const verificarRequisitosPaso = (step, targetPlayer = null) => {
    const errors = {};
    const player = targetPlayer || jugadores[currentPlayerIndex];
    if (!player) return errors;
    const datos = player.datos || {};

    if (step === 5) {
      if (!player.seguroId) {
        errors.seguroId = 'Debe seleccionar un seguro para continuar.';
      }
    } else if (step === 2) {
      if (!datos.nombreJugador?.trim()) errors.nombreJugador = 'El nombre es obligatorio.';
      if (!datos.apellidoPaterno?.trim()) errors.apellidoPaterno = 'El apellido paterno es obligatorio.';
      if (!datos.apellidoMaterno?.trim()) errors.apellidoMaterno = 'El apellido materno es obligatorio.';

      if (!datos.curp?.trim()) {
        errors.curp = 'El CURP es obligatorio.';
      } else if (datos.curp.trim().length !== 18) {
        errors.curp = 'El CURP debe tener exactamente 18 caracteres.';
      } else if (datos.isCurpDuplicated) {
        errors.curp = 'Esta CURP ya se encuentra registrada.';
      }

      const dateError = validarFechaNacimiento(datos.fechaNacimiento);
      if (dateError) {
        errors.fechaNacimiento = dateError;
      }
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
    } else if (step === 3) {
      if (!datos.numCamiseta || String(datos.numCamiseta).trim() === '') {
        errors.numCamiseta = 'El número de camiseta es obligatorio.';
      } else {
        const duplicate = obtenerDuplicadoCamiseta(datos.numCamiseta, player.numero);
        if (duplicate) {
          errors.numCamiseta = `El número de camiseta #${datos.numCamiseta} ya está asignado al Jugador ${duplicate.numero}.`;
        }
      }
      if (!datos.posicion) {
        errors.posicion = 'La posición es obligatoria.';
      } else {
        const duplicate = obtenerDuplicadoPosicion(datos.posicion, player.numero);
        if (duplicate) {
          const posNombre = catalogs?.roles_equipo?.find(r => String(r.id) === String(datos.posicion))?.nombre || 'esta posición';
          errors.posicion = `La posición de ${posNombre} ya está asignada al Jugador ${duplicate.numero}.`;
        }
      }
    } else if (step === 4) {
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

    return errors;
  };

  // Función que determina si un paso está 100% completo y válido (estado visual)
  const esPasoCompleto = (step, targetPlayer = null) => {
    const player = targetPlayer || jugadores[currentPlayerIndex];
    if (!player) return false;

    if (step === 1) {
      // Documentos
      const docs = player.documentos || {};
      const esMenor = isPlayerMinor(player.datos?.fechaNacimiento);
      const docsRequeridos = ['acta', 'foto'];
      if (esMenor) {
        docsRequeridos.push('ineTutor', 'identificacionMenor');
      } else {
        docsRequeridos.push('ine');
      }
      return docsRequeridos.every(key => !!docs[key]);
    } else if (step === 6) {
      // Resumen completo si todos los anteriores están completos y se subió el formato firmado
      return [1, 2, 3, 4, 5].every(s => esPasoCompleto(s, player)) && !!player.signedForm;
    } else {
      const errores = verificarRequisitosPaso(step, player);
      return Object.keys(errores).length === 0;
    }
  };

  // Función de validación activa (muestra error y bloquea envíos)
  const validarPasoActual = (step) => {
    const errors = verificarRequisitosPaso(step);
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      Swal.fire({
        title: 'Campos requeridos',
        text: firstError,
        icon: 'warning',
        confirmButtonColor: COLORS.primary
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

  const [previewDoc, setPreviewDoc] = useState({ open: false, url: '', type: '', title: '' });
  const [isCameraOpen, setIsCameraOpen] = useState(false);
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

    if (edad < 3) {
      return 'El jugador debe tener al menos 3 años de edad.';
    }

    if (edad > 125) {
      return 'Ingresa una fecha válida.';
    }

    return null;
  };

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

    const isReady = [1, 2, 3, 4, 5, 6].every(s => esPasoCompleto(s, player));

    const datos = player.datos || {};
    const docs = player.documentos || {};
    const hasAnyData = Object.values(datos).some(value => typeof value === 'string' ? value.trim() !== '' : Boolean(value)) || Object.values(docs).some(Boolean) || player.seguroId;

    if (isReady) return 'LISTO';
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

  const updatePlayerDocuments = async (index, documentosPartial) => {
    // 1. Convertir a Base64 asincronamente primero
    const base64Docs = {};
    for (const key of Object.keys(documentosPartial)) {
      if (documentosPartial[key]) {
        try {
          base64Docs[key] = {
            name: documentosPartial[key].name,
            data: await fileToBase64(documentosPartial[key])
          };
        } catch (e) {
          console.warn(`Error procesando documento ${key} a Base64:`, e);
        }
      }
    }

    // 2. Actualizar estado y guardar usando el estado más reciente
    setJugadores(prev => {
      const next = [...prev];
      const currentPlayerState = next[index];
      if (!currentPlayerState) return next;

      let docsBorradorActual = { ...(currentPlayerState.datos.documentosBorrador || {}) };

      for (const key of Object.keys(documentosPartial)) {
        if (base64Docs[key]) {
          docsBorradorActual[key] = base64Docs[key];
        } else if (documentosPartial[key] === null) {
          delete docsBorradorActual[key];
        }
      }

      const newDatos = { ...currentPlayerState.datos, documentosBorrador: docsBorradorActual };

      next[index] = normalizePlayer({
        ...currentPlayerState,
        datos: newDatos,
        documentos: {
          ...currentPlayerState.documentos,
          ...documentosPartial
        }
      });

      // Guardar en BD usando el JSON más reciente (se evita sobreescribir con estado viejo)
      if (currentPlayerState.slotId) {
        guardarBorradorEnBD(currentPlayerState.slotId, newDatos);
      }

      return next;
    });
  };

  const updatePlayerSignedForm = async (index, file) => {
    let base64File = null;
    if (file) {
      try {
        base64File = {
          name: file.name,
          data: await fileToBase64(file)
        };
      } catch (e) {
        console.warn(`Error procesando formatoFirmado a Base64:`, e);
      }
    }

    setJugadores(prev => {
      const next = [...prev];
      const currentPlayerState = next[index];
      if (!currentPlayerState) return next;

      let docsBorradorActual = { ...(currentPlayerState.datos.documentosBorrador || {}) };
      if (base64File) {
        docsBorradorActual.formatoFirmado = base64File;
      } else if (file === null) {
        delete docsBorradorActual.formatoFirmado;
      }

      const newDatos = { ...currentPlayerState.datos, documentosBorrador: docsBorradorActual };

      next[index] = {
        ...currentPlayerState,
        signedForm: file,
        datos: newDatos
      };

      if (currentPlayerState.slotId) {
        guardarBorradorEnBD(currentPlayerState.slotId, newDatos);
      }

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

  const pasos1a5Completos = React.useMemo(() => {
    return [1, 2, 3, 4, 5].every(s => esPasoCompleto(s, currentPlayer));
  }, [currentPlayer, jugadores]);

  // Documentos requeridos según minoría de edad
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

  // Guardar Borrador en la Base de Datos
  const guardarBorradorEnBD = async (slotId, newData) => {
    if (!slotId) return;
    try {
      const token = isPublicFlow
        ? sessionStorage.getItem('temp_token')
        : (localStorage.getItem('token') || sessionStorage.getItem('temp_token'));
      const headers = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`${API_BASE}/equipo-temporal/borrador-jugador`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          slot_id: slotId,
          datos: newData
        })
      });
      if (response.ok) {
        const result = await response.json();

        setJugadores(prev => {
          const next = [...prev];
          const playerIdx = next.findIndex(p => p.slotId === slotId);
          if (playerIdx !== -1) {
            next[playerIdx] = {
              ...next[playerIdx],
              datos: {
                ...next[playerIdx].datos,
                isCurpDuplicated: !!result.curp_duplicada
              }
            };
          }
          return next;
        });

        if (result.curp_duplicada) {
          setValidationErrors(prev => ({ ...prev, curp: 'Esta CURP ya se encuentra registrada.' }));
        } else if (newData.curp && newData.curp.length === 18) {
          setValidationErrors(prev => {
            if (prev.curp === 'Esta CURP ya se encuentra registrada.') {
              return { ...prev, curp: null };
            }
            return prev;
          });
        }
        triggerToast();
      }
    } catch (err) {
      console.warn('No se pudo guardar el borrador en la BD:', err);
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
    } else if (field === 'telefono') {
      cleanValue = value.replace(/\D/g, '').slice(0, 10);
    } else if (field === 'numCamiseta') {
      cleanValue = value.replace(/\D/g, '').slice(0, 3);
      if (cleanValue !== '') {
        const duplicate = obtenerDuplicadoCamiseta(cleanValue, jugadores[currentPlayerIndex]?.numero);
        if (duplicate) {
          setValidationErrors(prev => ({
            ...prev,
            numCamiseta: `El número de camiseta #${cleanValue} ya está asignado al Jugador ${duplicate.numero}.`
          }));
        } else {
          setValidationErrors(prev => ({ ...prev, numCamiseta: null }));
        }
      } else {
        setValidationErrors(prev => ({ ...prev, numCamiseta: null }));
      }
    } else if (field === 'posicion') {
      if (cleanValue) {
        const duplicate = obtenerDuplicadoPosicion(cleanValue, jugadores[currentPlayerIndex]?.numero);
        if (duplicate) {
          const posNombre = catalogs?.roles_equipo?.find(r => String(r.id) === String(cleanValue))?.nombre || 'esta posición';
          setValidationErrors(prev => ({
            ...prev,
            posicion: `La posición de ${posNombre} ya está asignada al Jugador ${duplicate.numero}.`
          }));
        } else {
          setValidationErrors(prev => ({ ...prev, posicion: null }));
        }
      } else {
        setValidationErrors(prev => ({ ...prev, posicion: null }));
      }
    }

    updatePlayerDatos(currentPlayerIndex, { [field]: cleanValue });
  };

  const handleBlur = () => {
    const player = jugadores[currentPlayerIndex];
    if (player) {
      const datos = { ...player.datos };

      const dateError = validarFechaNacimiento(datos.fechaNacimiento);
      setValidationErrors(prev => ({
        ...prev,
        fechaNacimiento: dateError
      }));

      if (datos.numCamiseta) {
        const duplicate = obtenerDuplicadoCamiseta(datos.numCamiseta, player.numero);
        if (duplicate) {
          Swal.fire({
            title: 'Número de camiseta duplicado',
            text: `El número #${datos.numCamiseta} ya está asignado al Jugador ${duplicate.numero}. Por favor, elige otro número.`,
            icon: 'warning',
            confirmButtonColor: COLORS.primary
          });
          datos.numCamiseta = '';
          setValidationErrors(prev => ({ ...prev, numCamiseta: null }));
        }
      }

      if (datos.posicion) {
        const duplicate = obtenerDuplicadoPosicion(datos.posicion, player.numero);
        if (duplicate) {
          const posNombre = catalogs?.roles_equipo?.find(r => String(r.id) === String(datos.posicion))?.nombre || 'esta posición';
          Swal.fire({
            title: 'Posición duplicada',
            text: `La posición de ${posNombre} ya está asignada al Jugador ${duplicate.numero}. Por favor, elige otra posición.`,
            icon: 'warning',
            confirmButtonColor: COLORS.primary
          });
          datos.posicion = '';
          setValidationErrors(prev => ({ ...prev, posicion: null }));
        }
      }

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

      let nextTeamId = teamId;

      try {
        setLoadingSlots(true);
        const inviteData = await teamsService.getInvitationInfo(tokenIdentificador, tokenSecreto);
        if (inviteData?.token_temporal) {
          sessionStorage.setItem('temp_token', inviteData.token_temporal);
        }
        const equiposPendientes = Array.isArray(inviteData?.equipos_temporales) ? inviteData.equipos_temporales : [];
        setInvitationTeams(equiposPendientes);

        if (equiposPendientes.length === 0) {
          setNoPendingTeams(true);
          setJugadores([]);
          setSlotsData(null);
        } else if (!teamId) {
          if (equiposPendientes.length === 1) {
            nextTeamId = equiposPendientes[0].equipo_temporal_id;
            setTeamId(nextTeamId);
          } else {
            setTeamId(null);
            setLoadingSlots(false);
          }
        }
      } catch (err) {
        console.error('Error al obtener info de la invitación:', err);
        setLinkError(true);
      } finally {
        if (!nextTeamId) setLoadingSlots(false);
      }
    };

    fetchInvitation();
  }, [isPublicFlow, tokenIdentificador, tokenSecreto]);

  // CARGAR SLOTS Y DATOS DEL EQUIPO (Callback reutilizable)
  const fetchTeamInfo = React.useCallback(async () => {
    const effectiveTeamId = teamId || location.state?.teamId;

    // Esperar a tener un teamId si estamos en flujo público y no ha habido error ni está vacío
    if (!effectiveTeamId) {
      if (isPublicFlow) {
        if (linkError || noPendingTeams) {
          setLoadingSlots(false);
          return;
        }
        // Solo quitar el loader si ya cargamos la invitación y tenemos múltiples equipos
        if (invitationTeams.length > 1) {
          setLoadingSlots(false);
        }
        return;
      }
      if (!isPublicFlow) {
        Swal.fire('Error', 'No se especificó un equipo para el registro.', 'error');
        navigate(ROUTES.PRESIDENTE.DASHBOARD);
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

      const getSeguroTipoPersonaId = (seguro) => Number(seguro?.TipoPersonaId ?? seguro?.tipoPersonaId ?? 0);
      const segurosPresidenteIds = new Set(
        (catalogsData.seguros || [])
          .filter(seguro => {
            const nombreUpper = seguro?.nombre?.toUpperCase()?.trim() || '';
            const tipoPersonaId = getSeguroTipoPersonaId(seguro);
            return ['TIPO G', 'SIN SEGURO'].includes(nombreUpper) || tipoPersonaId === 2;
          })
          .map(seguro => String(seguro.id))
      );

      if (slotsResponse && slotsResponse.seguros) {
        slotsResponse.seguros = slotsResponse.seguros.filter(
          s => !segurosPresidenteIds.has(String(s.seguro_id))
        );
      }

      setSlotsData(slotsResponse);

      const paidPlayers = parseInt(slotsResponse.cantidad_jugadores_pagados ?? slotsResponse.total_slots ?? 1, 10) || 1;
      setSlotsInfo({
        disponibles: slotsResponse.jugadores_restantes ?? slotsResponse.slots_disponibles ?? 0,
        total: paidPlayers
      });

      // Mapear los slots de la base de datos al estado jugadores
      const mappedJugadores = await Promise.all((slotsResponse.slots || []).map(async (slot, i) => {
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

        const restoredDocs = { acta: null, ine: null, ineTutor: null, identificacionMenor: null, foto: null };
        let restoredSignedForm = null;

        if (datos.documentosBorrador) {
          for (const key of Object.keys(datos.documentosBorrador)) {
            const docData = datos.documentosBorrador[key];
            if (docData && docData.data && docData.name) {
              try {
                const file = await base64ToFile(docData.data, docData.name);
                if (key === 'formatoFirmado') restoredSignedForm = file;
                else restoredDocs[key] = file;
              } catch (e) {
                console.warn(`Error restaurando documento ${key}:`, e);
              }
            }
          }
        }

        return {
          numero: i + 1,
          slotId: slot.slot_id,
          estado: slot.completo ? 'INSCRITO' : (slot.datos_borrador ? 'EN_CAPTURA' : 'VACIO'),
          datos: mergedDatos,
          documentos: restoredDocs,
          signedForm: restoredSignedForm,
          seguroId: (slot.datos_borrador || slot.completo) ? String(slot.seguro_id || '') : '',
          fillManually: !!slot.datos_borrador,
          completo: slot.completo
        };
      }));

      setJugadores(mappedJugadores);

      if (mappedJugadores[currentPlayerIndex]?.datos?.currentStep) {
        setCurrentStep(mappedJugadores[currentPlayerIndex].datos.currentStep);
      }

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
  }, [teamId, isPublicFlow, location.state?.teamId, tokenIdentificador, tokenSecreto, selectedInvitationTeam, linkError, noPendingTeams, navigate, invitationTeams]);

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

    const player = jugadores[currentPlayerIndex];
    const savedStep = player?.datos?.currentStep || 1;
    setCurrentStep(savedStep);
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
  }, [
    currentPlayerIndex,
    currentDocuments.acta,
    currentDocuments.ine,
    currentDocuments.ineTutor,
    currentDocuments.identificacionMenor,
    currentDocuments.foto
  ]);

  // Efecto para autovalidación de CURP con debounce
  useEffect(() => {
    const player = jugadores[currentPlayerIndex];
    if (!player) return;

    const curp = player.datos?.curp;

    if (curp && curp.length === 18) {
      const timer = setTimeout(() => {
        setIsCheckingCurp(true);
        guardarBorradorEnBD(player.slotId, player.datos).finally(() => {
          setIsCheckingCurp(false);
        });
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [jugadores[currentPlayerIndex]?.datos?.curp, currentPlayerIndex]);

  // Efecto para autovalidación de fecha de nacimiento en tiempo real
  useEffect(() => {
    const val = currentDatos?.fechaNacimiento;
    if (val) {
      const errorMsg = validarFechaNacimiento(val);
      setValidationErrors(prev => ({ ...prev, fechaNacimiento: errorMsg }));
    } else {
      setValidationErrors(prev => ({ ...prev, fechaNacimiento: null }));
    }
  }, [currentDatos?.fechaNacimiento, currentPlayerIndex]);

  const playerStatusConfig = {
    VACIO: { label: 'VACÍO', bg: COLORS.slate50, color: COLORS.slate600 },
    EN_CAPTURA: { label: 'EN CAPTURA', bg: COLORS.warningBgLight, color: COLORS.orangeDeep },
    LISTO: { label: 'LISTO PARA REGISTRAR', bg: COLORS.secondaryBg, color: COLORS.secondaryHover },
    INSCRITO: { label: 'INSCRITO', bg: COLORS.greenBg, color: COLORS.greenDeep }
  };

  // PROCESAR SUBIDA DE DOCUMENTOS Y OCR
  const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

  const handleFileUpload = async (documentKey, file) => {
    if (!file) return;

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_TYPES.includes(file.type) || !ALLOWED_EXTENSIONS.includes(ext)) {
      Swal.fire({
        title: 'Tipo de archivo no permitido',
        text: 'Solo se aceptan archivos PDF, JPG, JPEG o PNG.',
        icon: 'error',
        confirmButtonColor: COLORS.primary
      });
      return;
    }

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
        html: 'Extrayendo información. Por favor espere.',
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
        const isIneField = ['ine', 'ineTutor', 'identificacion'].includes(documentKey);
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
            updatePlayerDocuments(currentPlayerIndex, { [documentKey]: null });
            setPreviews(prev => ({ ...prev, [documentKey]: null }));
            return;
          }
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
          let detectedGenero = currentDatos.genero;
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
    const dateError = validarFechaNacimiento(currentDatos.fechaNacimiento);
    if (dateError) {
      Swal.fire({
        title: 'Error de validación',
        text: dateError,
        icon: 'error',
        confirmButtonColor: COLORS.primary
      });
      return false;
    }

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
    // Validar paso por paso del 1 al 5 (omitiendo el paso 1 de documentos que es opcional)
    for (let s = 1; s <= 5; s++) {
      if (s === 1) continue;
      if (!validarPasoActual(s)) {
        changeStep(s);
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
      text: 'Consumiendo espacio y subiendo documentos...',
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
      if (player.signedForm) { docIds.push(28); files.push(player.signedForm); }

      docIds.forEach(id => formData.append('documento_afiliacion_ids', id));
      files.forEach(file => formData.append('archivos', file));

      await teamsService.registrarJugadorTemporal(formData);

      setShowFinishModal(false);
      Swal.fire({
        icon: 'success',
        title: 'Jugador Inscrito Correctamente',
        text: 'El espacio se ha completado y los documentos se guardaron en el servidor.'
      }).then(() => {
        fetchTeamInfo();
        fetchTeamInfo();
      });
    } catch (err) {
      console.error("Error al registrar jugador:", err);
      Swal.fire('Error', err.response?.data?.detail || err.message || 'Error interno del servidor', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleRegistrarGrupoClick = () => {
    Swal.fire({
      title: '¿Confirmar registro grupal?',
      text: 'Se registrarán todos los jugadores de la invitación al mismo tiempo. Esta acción no se puede deshacer.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: COLORS.success,
      cancelButtonColor: COLORS.slate500,
      confirmButtonText: 'Sí, registrar todos',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        ejecutarRegistroGrupal();
      }
    });
  };

  const ejecutarRegistroGrupal = async () => {
    setUploading(true);
    Swal.fire({
      title: 'Registrando Jugadores',
      text: 'Procesando expedientes y confirmando registros...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      await teamsService.registrarGrupoJugadores(parseInt(teamId, 10));

      Swal.fire({
        icon: 'success',
        title: 'Registro Completado',
        text: 'Todos los jugadores han sido registrados con éxito. Espera indicaciones de la administración de AFAEM.',
        confirmButtonColor: COLORS.success
      }).then(() => {
        fetchTeamInfo();
      });
    } catch (err) {
      console.error("Error al registrar grupo:", err);
      Swal.fire(
        'Error de Registro',
        err.response?.data?.detail || err.message || 'Ocurrió un error al procesar el registro grupal. No se ha registrado ningún jugador.',
        'error'
      );
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
          background: COLORS.white,
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
            backgroundColor: COLORS.white,
            border: `1px solid ${COLORS.slate100}`
          }}
        >
          {/* Logo */}
          <div style={{
            width: '96px',
            height: '96px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${COLORS.slate900} 0%, ${COLORS.slate800} 100%)`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: `0 10px 15px -3px ${COLORS.overlaySlateSuperLight}, 0 4px 6px -2px ${COLORS.overlaySlateSuperLight}`,
            border: `2px solid ${COLORS.overlayWhite05}`
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
              background: COLORS.dangerBgTranslucent10,
              color: COLORS.danger,
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '800',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: '20px',
              border: `1px solid ${COLORS.dangerBgTranslucent}`,
            }}
          >
            Error de Acceso
          </span>

          <h1
            style={{
              fontSize: '28px',
              fontWeight: '800',
              color: COLORS.slate800,
              margin: '0 0 12px',
              letterSpacing: '-0.5px',
            }}
          >
            Enlace no válido o expirado
          </h1>

          <p
            style={{
              color: COLORS.slate500,
              fontSize: '15px',
              lineHeight: '1.7',
              marginBottom: '36px',
              maxWidth: '380px',
              margin: '0 auto 36px',
            }}
          >
            Has registrado a todos tus jugadores. Este link ya no es válido.
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
              backgroundColor: COLORS.primary,
              color: COLORS.white,
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
        <div style={{ background: COLORS.white, padding: '40px 32px', borderRadius: '24px', boxShadow: `0 20px 40px ${COLORS.overlaySlateSuperLight}`, border: `1px solid ${COLORS.slate200}`, maxWidth: '520px', width: '100%', textAlign: 'center' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: COLORS.slate800, marginBottom: '16px' }}>
            No hay equipos pendientes
          </h1>
          <p style={{ color: COLORS.slate500, fontSize: '15px', lineHeight: '1.7', margin: 0 }}>
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
            background: `linear-gradient(135deg, ${COLORS.slate900} 0%, ${COLORS.slate800} 100%)`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: `0 10px 15px -3px ${COLORS.overlaySlateSuperLight}, 0 4px 6px -2px ${COLORS.overlaySlateSuperLight}`,
            border: `2px solid ${COLORS.overlayWhite05}`
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
          <h2 style={{ fontSize: '28px', fontWeight: '900', color: COLORS.slate800, margin: 0, letterSpacing: '-0.5px' }}>
            Selección de Equipo
          </h2>
          <p style={{ margin: '10px 0 0 0', fontSize: '15px', color: COLORS.slate500, maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto', lineHeight: '1.6' }}>
            Bienvenido {invitationTeams[0]?.nombre_presidente ? <strong>{invitationTeams[0].nombre_presidente} </strong> : ''}al portal de registro de jugadores de la AFAEM. A continuación, selecciona el equipo del cual deseas capturar los registros. Puedes regresar a esta pantalla en cualquier momento.
          </p>
          {invitationTeams[0]?.nombre_presidente && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 22px',
              background: COLORS.slate50,
              borderRadius: '24px',
              border: `1px solid ${COLORS.slate200}`,
              marginTop: '20px',
              fontSize: '14px',
              fontWeight: '700',
              color: COLORS.slate700,
              boxShadow: `0 2px 4px ${COLORS.shadow03}`
            }}>
              <span>👤 PRESIDENTE:</span>
              <span style={{ color: COLORS.primary, textTransform: 'uppercase' }}>{invitationTeams[0].nombre_presidente}</span>
            </div>
          )}
        </div>

        {/* CONTENEDOR DE TARJETAS DE EQUIPOS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
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
                  setLoadingSlots(true);
                  setTeamId(team.equipo_temporal_id);
                }}
                style={{
                  background: 'white',
                  borderRadius: '24px',
                  border: estaCompletado ? `2px solid ${COLORS.success}` : `1px solid ${COLORS.slate200}`,
                  padding: '32px 28px',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: `0 4px 6px -1px ${COLORS.shadow03}, 0 2px 4px -1px ${COLORS.shadow03}`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.boxShadow = `0 20px 25px -5px ${COLORS.shadow05}, 0 10px 10px -5px ${COLORS.shadow03}`;
                  e.currentTarget.style.borderColor = estaCompletado ? COLORS.success : COLORS.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = `0 4px 6px -1px ${COLORS.shadow03}, 0 2px 4px -1px ${COLORS.shadow03}`;
                  e.currentTarget.style.borderColor = estaCompletado ? COLORS.success : COLORS.slate200;
                }}
              >
                {estaCompletado && (
                  <div style={{
                    position: 'absolute',
                    top: '0',
                    right: '0',
                    background: COLORS.success,
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
                    color: estaCompletado ? COLORS.success : COLORS.primary,
                    letterSpacing: '1px',
                    textTransform: 'uppercase'
                  }}>
                    🛡️ {team.nombre_liga || 'Liga Sin Nombre'}
                  </span>

                  <h3 style={{
                    fontSize: '22px',
                    fontWeight: '900',
                    color: COLORS.slate800,
                    margin: '10px 0 4px 0',
                    lineHeight: '1.2'
                  }}>
                    {team.nombre_equipo}
                  </h3>

                  <p style={{
                    fontSize: '13px',
                    color: COLORS.slate500,
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
                    <span style={{ fontSize: '13px', color: COLORS.slate500, fontWeight: '700' }}>Progreso de Registro</span>
                    <span style={{ fontSize: '16px', fontWeight: '900', color: estaCompletado ? COLORS.success : COLORS.slate800 }}>
                      {registrados} / {total} cupos
                    </span>
                  </div>

                  {/* Barra de progreso */}
                  <div style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: COLORS.slate100,
                    borderRadius: '9999px',
                    overflow: 'hidden',
                    marginBottom: '24px'
                  }}>
                    <div style={{
                      width: `${porcentaje}%`,
                      height: '100%',
                      background: estaCompletado ? COLORS.success : `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.brandBlueLight})`,
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
                      background: estaCompletado ? COLORS.greenBg50 : COLORS.secondaryBg,
                      color: estaCompletado ? COLORS.greenDeep : COLORS.primary,
                      fontWeight: '800',
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'center',
                      letterSpacing: '0.3px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = estaCompletado ? COLORS.greenBg : COLORS.secondaryBg100;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = estaCompletado ? COLORS.greenBg50 : COLORS.secondaryBg;
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
                    ? 'Se perderán los documentos subidos no guardados y el progreso actual (excepto campos autoguardados).'
                    : 'Se perderán los documentos subidos y el progreso actual (excepto los campos autoguardados en borrador).',
                  icon: 'warning',
                  showCancelButton: true,
                  confirmButtonColor: COLORS.danger,
                  cancelButtonColor: COLORS.slate500,
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
            style={{ padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', background: 'none', border: `1px solid ${COLORS.slate300}`, cursor: 'pointer' }}
          >
            <FaArrowLeft />
          </button>
        )}
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: COLORS.slate800, margin: 0 }}>Registro de Jugadores</h2>
          <p style={{ margin: 0, fontSize: '13px', color: COLORS.slate500, marginTop: '4px' }}>Registra y guarda los borradores de tus jugadores libremente.</p>
        </div>
      </div>

      {/* SLOT NAVIGATION CONTROL */}
      {jugadores.length > 0 && (() => {
        const activePlayer = jugadores[currentPlayerIndex];
        const status = activePlayer ? getPlayerStatus(activePlayer) : 'VACIO';
        const config = playerStatusConfig[status] || playerStatusConfig.VACIO;
        return (
          <div className="slot-nav-container">
            {/* Left Arrow Button */}
            <button
              type="button"
              disabled={currentPlayerIndex === 0}
              onClick={() => {
                document.activeElement?.blur();
                setCurrentPlayerIndex(currentPlayerIndex - 1);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                border: `1px solid ${COLORS.slate300}`,
                backgroundColor: currentPlayerIndex === 0 ? COLORS.slate100 : 'white',
                color: currentPlayerIndex === 0 ? COLORS.slate400 : COLORS.primary,
                cursor: currentPlayerIndex === 0 ? 'not-allowed' : 'pointer',
                opacity: currentPlayerIndex === 0 ? 0.4 : 1,
                transition: 'all 0.2s',
                boxShadow: currentPlayerIndex === 0 ? 'none' : `0 2px 4px ${COLORS.shadow05}`
              }}
              onMouseEnter={(e) => {
                if (currentPlayerIndex !== 0) {
                  e.currentTarget.style.backgroundColor = COLORS.slate100;
                  e.currentTarget.style.borderColor = COLORS.slate400;
                }
              }}
              onMouseLeave={(e) => {
                if (currentPlayerIndex !== 0) {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = COLORS.slate300;
                }
              }}
            >
              <FaChevronLeft style={{ fontSize: '14px' }} />
            </button>

            {/* Center Area: Number & Status */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{
                fontSize: '28px',
                fontWeight: '900',
                color: COLORS.slate800,
                userSelect: 'none',
                lineHeight: '1.2'
              }}>
                Jugador {currentPlayerIndex + 1}
              </span>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '20px',
                backgroundColor: config.bg,
                color: config.color,
                fontSize: '11px',
                fontWeight: '800',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                border: `1px solid ${config.color}30`,
                marginTop: '8px',
                boxShadow: `0 1px 2px ${COLORS.shadow03}`
              }}>
                <span>{config.label}</span>
              </div>
              <div style={{
                marginTop: '8px',
                fontSize: '12px',
                color: COLORS.slate500,
                fontWeight: '600'
              }}>
                Seguro seleccionado: {slotsData?.seguros?.find(s => String(s.seguro_id) === String(jugadores[currentPlayerIndex]?.seguroId))?.nombre || 'No asignado'}
              </div>
            </div>

            {/* Right Arrow Button */}
            <button
              type="button"
              disabled={currentPlayerIndex === jugadores.length - 1}
              onClick={() => {
                document.activeElement?.blur();
                setCurrentPlayerIndex(currentPlayerIndex + 1);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                border: `1px solid ${COLORS.slate300}`,
                backgroundColor: currentPlayerIndex === jugadores.length - 1 ? COLORS.slate100 : 'white',
                color: currentPlayerIndex === jugadores.length - 1 ? COLORS.slate400 : COLORS.primary,
                cursor: currentPlayerIndex === jugadores.length - 1 ? 'not-allowed' : 'pointer',
                opacity: currentPlayerIndex === jugadores.length - 1 ? 0.4 : 1,
                transition: 'all 0.2s',
                boxShadow: currentPlayerIndex === jugadores.length - 1 ? 'none' : `0 2px 4px ${COLORS.shadow05}`
              }}
              onMouseEnter={(e) => {
                if (currentPlayerIndex !== jugadores.length - 1) {
                  e.currentTarget.style.backgroundColor = COLORS.slate100;
                  e.currentTarget.style.borderColor = COLORS.slate400;
                }
              }}
              onMouseLeave={(e) => {
                if (currentPlayerIndex !== jugadores.length - 1) {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = COLORS.slate300;
                }
              }}
            >
              <FaChevronRight style={{ fontSize: '14px' }} />
            </button>
          </div>
        );
      })()}

      {/* DETALLES DEL EQUIPO */}
      <div className="premium-card fade-in" style={{
        maxWidth: '1000px',
        margin: '0 auto 30px auto',
        background: `linear-gradient(135deg, ${COLORS.slate800} 0%, ${COLORS.slate900} 100%)`,
        color: 'white',
        borderRadius: '20px',
        padding: '25px 35px',
        boxShadow: `0 10px 15px -3px ${COLORS.shadow28}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: '900', color: COLORS.infoBootstrap, letterSpacing: '1px', textTransform: 'uppercase' }}>Equipo</span>
          <h1 style={{ fontSize: '26px', fontWeight: '900', margin: '4px 0 8px 0', letterSpacing: '-0.5px' }}>🛡️ {(currentDatos.equipo || 'Cargando...').toUpperCase()}</h1>
          <div style={{ display: 'flex', gap: '15px', fontSize: '13px', color: COLORS.slate400, flexWrap: 'wrap' }}>
            <span><strong>Liga:</strong> {(currentDatos.liga || 'N/A').toUpperCase()}</span>
            <span>•</span>
            <span><strong>Categoría:</strong> {(currentDatos.categoria || 'LIBRE').toUpperCase()}</span>
            <span>•</span>
            <span><strong>Presidente:</strong> {(currentDatos.presidente || 'No disponible').toUpperCase()}</span>
          </div>
        </div>

        <div className="espacios-disponibles-card" style={{ background: COLORS.overlayWhite05, padding: '12px 20px', borderRadius: '14px', border: `1px solid ${COLORS.overlayWhite10}`, textAlign: 'right' }}>
          <span style={{ fontSize: '11px', color: COLORS.slate400, display: 'block', fontWeight: '600' }}>Espacios Disponibles</span>
          <span style={{ fontSize: '24px', fontWeight: '950', color: sinSlots ? COLORS.danger : COLORS.success }}>
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
          border: `1px solid ${COLORS.dangerBg}`
        }}>
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>🎉</div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: COLORS.success, marginBottom: '10px' }}>Inscripción Completada</h2>
          <p style={{ color: COLORS.slate500, maxWidth: '600px', margin: '0 auto 25px auto', lineHeight: '1.6' }}>
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
        <>
          <div className="premium-card fade-in main-card-responsive" style={{
            maxWidth: '1000px',
            margin: '0 auto',
            background: 'white',
            borderRadius: '24px',
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
            border: `1px solid ${COLORS.slate200}`
          }}>

            {currentPlayer.completo ? (
              <div style={{
                background: COLORS.successBg,
                border: `1px solid ${COLORS.successBgDark}`,
                borderRadius: '16px',
                padding: '24px',
                textAlign: 'center',
                color: COLORS.successDeep,
                marginBottom: '30px'
              }}>
                <FaCheckCircle style={{ fontSize: '42px', marginBottom: '10px' }} />
                <h3 style={{ fontWeight: '800', fontSize: '18px', margin: 0 }}>Este espacio ya está completamente registrado</h3>
                <p style={{ fontSize: '13px', margin: '6px 0 0 0', color: COLORS.successDarker }}>
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
                    { step: 1, label: 'Documentos' },
                    { step: 2, label: 'Personales' },
                    { step: 3, label: 'Deportivos' },
                    { step: 4, label: 'Procedencia' },
                    { step: 5, label: 'Seguro' },
                    { step: 6, label: 'Resumen' }
                  ].map((s) => {
                    const isActive = currentStep === s.step;
                    const isCompleted = esPasoCompleto(s.step);
                    return (
                      <div
                        key={`step-indicator-${s.step}`}
                        className={`stepper-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                        onClick={() => {
                          changeStep(s.step);
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

                <div className="mobile-step-indicator">
                  Paso {currentStep} de 6: {
                    currentStep === 1 ? 'Documentos' :
                      currentStep === 2 ? 'Personales' :
                        currentStep === 3 ? 'Deportivos' :
                          currentStep === 4 ? 'Procedencia' :
                            currentStep === 5 ? 'Seguro' :
                              'Resumen'
                  }
                </div>

                {/* PASO 5: SELECCION DE SEGURO / SLOT A CONSUMIR */}
                {currentStep === 5 && (
                  <section className="wizard-step-container">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '24px' }}>
                      <StepBadge number="5" isActive={true} isDone={esPasoCompleto(5)} />
                      <h3 style={{ fontSize: '18px', fontWeight: '800', color: COLORS.slate800, margin: 0 }}>Seguro pagado por asignar</h3>
                    </div>

                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                      <div className="card seguro-wizard-card" style={{ border: `1.5px solid ${validationErrors.seguroId ? COLORS.danger : COLORS.slate200}` }}>
                        <label className="form-label seguro-wizard-label" style={{ fontWeight: '700', display: 'block' }}>
                          Estos son tus seguros comprados. Selecciona el seguro deseado para este jugador: <span className="required-star">*</span>
                        </label>
                        <label className="form-label seguro-wizard-sublabel" style={{ fontWeight: '700', display: 'block' }}>
                          Vuelve a tocar para deseleccionar el seguro
                        </label>
                        <div className="seguro-cards-grid">
                          {slotsData?.seguros?.map((seg) => {
                            const isSelected = String(currentSeguroId) === String(seg.seguro_id);

                            // Calcular disponibilidad dinámicamente en el frontend
                            const totalComprados = Number(seg.pagados ?? seg.total_slots ?? 0);
                            const usadosPorOtros = jugadores.reduce((acc, player, idx) => {
                              if (idx === currentPlayerIndex) return acc;
                              if (String(player.seguroId) === String(seg.seguro_id)) {
                                return acc + 1;
                              }
                              return acc;
                            }, 0);

                            const disponiblesLocales = Math.max(0, totalComprados - usadosPorOtros);
                            const noDisponible = disponiblesLocales <= 0 && !isSelected;

                            return (
                              <div
                                key={`seguro-card-${seg.seguro_id}`}
                                onClick={() => {
                                  if (noDisponible) {
                                    Swal.fire('Atención', 'No hay espacios disponibles para este tipo de seguro.', 'warning');
                                    return;
                                  }
                                  setSeguroDetalle(seg);
                                }}
                                className="seguro-card-item"
                                style={{
                                  border: isSelected
                                    ? `2.5px solid ${COLORS.primary}`
                                    : noDisponible
                                      ? `1.5px dashed ${COLORS.slate300}`
                                      : `1px solid ${COLORS.slate300}`,
                                  backgroundColor: isSelected
                                    ? COLORS.secondaryBg
                                    : noDisponible
                                      ? COLORS.slate100
                                      : 'white',
                                  cursor: noDisponible ? 'not-allowed' : 'pointer',
                                  opacity: noDisponible ? 0.6 : 1,
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', width: '100%' }}>
                                  <span className="seguro-card-title" style={{ fontWeight: '800', color: isSelected ? COLORS.primary : noDisponible ? COLORS.slate400 : COLORS.slate800 }}>
                                    🛡️ {seg.nombre}
                                  </span>
                                  {isSelected && (
                                    <FaCheckCircle style={{ color: COLORS.primary, fontSize: '16px', flexShrink: 0, marginTop: '2px' }} />
                                  )}
                                </div>
                                <div className="seguro-card-badge" style={{
                                  background: noDisponible ? COLORS.dangerBg : COLORS.greenBg,
                                  color: noDisponible ? COLORS.danger : COLORS.greenDarker,
                                }}>
                                  {noDisponible ? '🚫 SIN ESPACIOS' : `${disponiblesLocales} disponibles`}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {validationErrors.seguroId && (
                          <span style={{ display: 'block', color: COLORS.danger, fontSize: '12px', fontWeight: '800', marginTop: '10px' }}>
                            ❌ {validationErrors.seguroId}
                          </span>
                        )}
                      </div>
                    </div>
                  </section>
                )}

                {/* PASO 1: CARGA DE DOCUMENTOS */}
                {currentStep === 1 && (
                  <section className="wizard-step-container">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                      <StepBadge number="1" isActive={true} isDone={esPasoCompleto(1)} />
                      <h3 style={{ fontSize: '18px', fontWeight: '800', color: COLORS.slate800, margin: 0 }}>Carga de Documentación</h3>
                    </div>

                    <div style={{
                      background: COLORS.skyBgLight,
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
                      Puedes subir los documentos ahora para llenar los campos automáticamente, o continuar a los pasos siguientes y cargarlos después.
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
                            border: currentDocuments[doc.key] ? `2px solid ${COLORS.success}` : `2px dashed ${COLORS.slate300}`,
                            padding: '15px',
                            textAlign: 'center',
                            transition: 'all 0.3s',
                            position: 'relative',
                            overflow: 'hidden'
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
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              handleFileUpload(doc.key, e.dataTransfer.files[0]);
                            }}
                          >
                            {previews[doc.key] ? (
                              <div className="preview-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
                                {currentDocuments[doc.key]?.type === 'application/pdf' ? (
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
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '100%',
                                  textAlign: 'center',
                                  color: COLORS.slate400,
                                  cursor: 'pointer'
                                }}
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
                            backgroundColor: currentDocuments[doc.key] ? COLORS.greenBg : COLORS.slate100,
                            color: currentDocuments[doc.key] ? COLORS.greenDeep : COLORS.slate500,
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
                    {currentDocuments.acta && !currentDatos.fechaNacimiento && (
                      <div className="fade-in" style={{ marginTop: '16px', padding: '12px 18px', background: COLORS.warningBgLight, border: `1px dashed ${COLORS.warningLight}`, borderRadius: '10px', fontSize: '12px', color: COLORS.orangeDeep, fontWeight: '600' }}>
                        Analizando el Acta de Nacimiento... Los campos se rellenarán automáticamente en breve. Si no es así, puedes completarlos manualmente.
                      </div>
                    )}
                  </section>
                )}

                {/* PASO 2: INFORMACIÓN PERSONAL */}
                {currentStep === 2 && (
                  <section className="wizard-step-container">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                      <StepBadge number="2" isActive={true} isDone={esPasoCompleto(2)} />
                      <h3 style={{ fontSize: '17px', fontWeight: '700', color: COLORS.slate800, margin: 0 }}>Información Personal</h3>
                    </div>

                    <div className="form-wrapper-responsive" style={{ backgroundColor: 'white', borderRadius: '16px', border: `1px solid ${COLORS.slate200}`, boxShadow: `0 4px 6px -1px ${COLORS.shadow05}`, padding: '24px' }}>
                      <div className="form-grid-3">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '700', color: COLORS.slate600 }}>Nombre(s) <span className="required-star">*</span></label>
                          <input
                            type="text"
                            maxLength={30}
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
                              border: `1.5px solid ${validationErrors.nombreJugador ? COLORS.danger : COLORS.slate300}`,
                              fontSize: '14px',
                              outline: 'none',
                              boxShadow: validationErrors.nombreJugador ? `0 0 0 3px ${COLORS.dangerBgTranslucent10}` : 'none'
                            }}
                          />
                          {validationErrors.nombreJugador && <span className="field-error-msg">❌ {validationErrors.nombreJugador}</span>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '700', color: COLORS.slate600 }}>Ap. Paterno <span className="required-star">*</span></label>
                          <input
                            type="text"
                            maxLength={30}
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
                              border: `1.5px solid ${validationErrors.apellidoPaterno ? COLORS.danger : COLORS.slate300}`,
                              fontSize: '14px',
                              outline: 'none',
                              boxShadow: validationErrors.apellidoPaterno ? `0 0 0 3px ${COLORS.dangerBgTranslucent10}` : 'none'
                            }}
                          />
                          {validationErrors.apellidoPaterno && <span className="field-error-msg">❌ {validationErrors.apellidoPaterno}</span>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '700', color: COLORS.slate600 }}>Ap. Materno <span className="required-star">*</span></label>
                          <input
                            type="text"
                            maxLength={30}
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
                              border: `1.5px solid ${validationErrors.apellidoMaterno ? COLORS.danger : COLORS.slate300}`,
                              fontSize: '14px',
                              outline: 'none',
                              boxShadow: validationErrors.apellidoMaterno ? `0 0 0 3px ${COLORS.dangerBgTranslucent10}` : 'none'
                            }}
                          />
                          {validationErrors.apellidoMaterno && <span className="field-error-msg">❌ {validationErrors.apellidoMaterno}</span>}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '15px', marginBottom: '25px', marginTop: '15px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '700', color: COLORS.slate600 }}>
                            CURP <span className="required-star">*</span>
                            {isCheckingCurp && <span style={{ marginLeft: '10px', color: COLORS.success, fontSize: '10px' }}>Validando...</span>}
                          </label>
                          <input
                            type="text"
                            value={currentDatos.curp || ''}
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                              let sId = currentDatos.genero;
                              if (val.length >= 11) {
                                const char = val.charAt(10);
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
                              border: `1.5px solid ${validationErrors.curp ? COLORS.danger : COLORS.slate300}`,
                              fontSize: '14px',
                              outline: 'none',
                              boxShadow: validationErrors.curp ? `0 0 0 3px ${COLORS.dangerBgTranslucent10}` : 'none'
                            }}
                          />
                          {validationErrors.curp && <span className="field-error-msg">❌ {validationErrors.curp}</span>}
                        </div>
                      </div>

                      <div className="form-grid-3">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '700', color: COLORS.slate600 }}>Fecha Nac. <span className="required-star">*</span></label>
                          <input
                            type="date"
                            value={currentDatos.fechaNacimiento || ''}
                            min={minDateStr}
                            max={maxBirthDateStr}
                            onChange={e => {
                              const val = e.target.value;
                              handleFieldChange('fechaNacimiento', val);
                              const errorMsg = validarFechaNacimiento(val);
                              setValidationErrors(prev => ({ ...prev, fechaNacimiento: errorMsg }));
                            }}
                            onBlur={handleBlur}
                            style={{
                              padding: '10px',
                              borderRadius: '8px',
                              border: `1.5px solid ${validationErrors.fechaNacimiento ? COLORS.danger : COLORS.slate300}`,
                              fontSize: '14px',
                              outline: 'none'
                            }}
                          />
                          {validationErrors.fechaNacimiento && <span className="field-error-msg">❌ {validationErrors.fechaNacimiento}</span>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '700', color: COLORS.slate600 }}>Lugar de Nacimiento <span className="required-star">*</span></label>
                          <input
                            type="text"
                            maxLength={30}
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
                              border: `1.5px solid ${validationErrors.lugarNacimiento ? COLORS.danger : COLORS.slate300}`,
                              fontSize: '14px',
                              outline: 'none'
                            }}
                          />
                          {validationErrors.lugarNacimiento && <span className="field-error-msg">❌ {validationErrors.lugarNacimiento}</span>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '700', color: COLORS.slate600 }}>Sexo <span className="required-star">*</span></label>
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
                              border: `1.5px solid ${validationErrors.genero ? COLORS.danger : COLORS.slate300}`,
                              fontSize: '14px',
                              backgroundColor: 'white',
                              outline: 'none'
                            }}
                          >
                            <option value="">Seleccione...</option>
                            <option value="1">MASCULINO</option>
                            <option value="2">FEMENINO</option>
                            <option value="3">OTRO</option>
                          </select>
                          {validationErrors.genero && <span className="field-error-msg">❌ {validationErrors.genero}</span>}
                        </div>
                      </div>

                      <div className="form-grid-2" style={{ marginTop: '15px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '700', color: COLORS.slate600 }}>Correo electrónico <span className="required-star">*</span></label>
                          <input
                            type="email"
                            maxLength={60}
                            value={currentDatos.correo}
                            onChange={e => {
                              handleFieldChange('correo', e.target.value);
                              setValidationErrors(prev => ({ ...prev, correo: null }));
                            }}
                            onBlur={handleBlur}
                            placeholder="correo@ejemplo.com"
                            style={{
                              width: '100%',
                              boxSizing: 'border-box',
                              padding: '10px',
                              borderRadius: '8px',
                              border: `1.5px solid ${validationErrors.correo ? COLORS.danger : COLORS.slate300}`,
                              fontSize: '14px',
                              outline: 'none'
                            }}
                          />
                          {validationErrors.correo && <span className="field-error-msg">❌ {validationErrors.correo}</span>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '700', color: COLORS.slate600 }}># de Teléfono <span className="required-star">*</span></label>
                          <div className="phone-input-row">
                            <select
                              value={currentDatos.codigoPais || '+52'}
                              onChange={e => handleFieldChange('codigoPais', e.target.value)}
                              onBlur={handleBlur}
                              style={{
                                padding: '10px',
                                borderRadius: '8px',
                                border: `1px solid ${COLORS.slate300}`,
                                fontSize: '14px',
                                backgroundColor: 'white',
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
                                border: `1.5px solid ${validationErrors.telefono ? COLORS.danger : COLORS.slate300}`,
                                fontSize: '14px',
                                flexGrow: 1,
                                outline: 'none',
                                boxSizing: 'border-box'
                              }}
                            />
                          </div>
                          {validationErrors.telefono && <span className="field-error-msg">❌ {validationErrors.telefono}</span>}
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* PASO 3: INFORMACIÓN DEPORTIVA */}
                {currentStep === 3 && (
                  <section className="wizard-step-container">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                      <StepBadge number="3" isActive={true} isDone={esPasoCompleto(3)} />
                      <h3 style={{ fontSize: '17px', fontWeight: '700', color: COLORS.slate800, margin: 0 }}>Información Deportiva</h3>
                    </div>

                    <div className="form-wrapper-responsive" style={{ backgroundColor: 'white', borderRadius: '16px', border: `1px solid ${COLORS.slate200}`, boxShadow: `0 4px 6px -1px ${COLORS.shadow05}`, padding: '24px' }}>
                      <div className="form-grid-3">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '700', color: COLORS.slate600 }}>No. Camiseta <span className="required-star">*</span></label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
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
                              border: `1.5px solid ${validationErrors.numCamiseta ? COLORS.danger : COLORS.slate300}`,
                              fontSize: '14px',
                              outline: 'none'
                            }}
                          />
                          {validationErrors.numCamiseta && <span className="field-error-msg">❌ {validationErrors.numCamiseta}</span>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '700', color: COLORS.slate600 }}>Posición  <span className="required-star">*</span></label>
                          <select
                            value={currentDatos.posicion}
                            onChange={e => {
                              const val = parseInt(e.target.value) || '';
                              handleFieldChange('posicion', val);
                              if (currentPlayer?.slotId) {
                                guardarBorradorEnBD(currentPlayer.slotId, { ...currentDatos, posicion: val });
                              }
                            }}
                            style={{
                              padding: '10px',
                              borderRadius: '8px',
                              border: `1.5px solid ${validationErrors.posicion ? COLORS.danger : COLORS.slate300}`,
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
                      </div>
                    </div>
                  </section>
                )}

                {/* PASO 4: PROCEDENCIA Y ANTECEDENTES */}
                {currentStep === 4 && (
                  <section className="wizard-step-container">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                      <StepBadge number="4" isActive={true} isDone={esPasoCompleto(4)} />
                      <h3 style={{ fontSize: '17px', fontWeight: '700', color: COLORS.slate800, margin: 0 }}>Nacionalidad y Antecedentes</h3>
                    </div>

                    <div className="form-wrapper-responsive" style={{ backgroundColor: 'white', borderRadius: '16px', border: `1px solid ${COLORS.slate200}`, boxShadow: `0 4px 6px -1px ${COLORS.shadow05}`, padding: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                        <FaGlobeAmericas style={{ color: COLORS.primary, fontSize: '20px' }} />
                        <h4 style={{ fontSize: '15px', fontWeight: '700', color: COLORS.slate800, margin: 0 }}>Procedencia del jugador</h4>
                      </div>

                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '10px',
                        background: COLORS.slate100,
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
                            color: !currentDatos.esForaneo ? COLORS.primary : COLORS.slate500,
                            fontWeight: '800',
                            fontSize: '13px',
                            boxShadow: !currentDatos.esForaneo ? `0 4px 6px -1px ${COLORS.shadow10}` : 'none',
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
                            color: currentDatos.esForaneo ? COLORS.primary : COLORS.slate500,
                            fontWeight: '800',
                            fontSize: '13px',
                            boxShadow: currentDatos.esForaneo ? `0 4px 6px -1px ${COLORS.shadow10}` : 'none',
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
                      <div style={{ backgroundColor: COLORS.orange50, border: `1px solid ${COLORS.orange100}`, padding: '15px', borderRadius: '24px', boxShadow: `0 10px 15px -3px ${COLORS.shadow05}`, width: '100%', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px', borderBottom: `1px solid ${COLORS.orange100}`, paddingBottom: '20px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: COLORS.warningBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.warningDark }}>
                            <FaGlobeAmericas />
                          </div>
                          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: COLORS.orangeDeep }}>Antecedentes internacionales</h4>
                        </div>

                        {currentDatos.esForaneo ? (
                          <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '20px', width: '100%' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', width: '100%' }}>
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

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', alignItems: 'end', width: '100%' }}>
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

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', width: '100%' }}>
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

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', width: '100%' }}>
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
                            <p style={{ margin: 0, fontSize: '13px', color: COLORS.orangeDeep, fontStyle: 'italic' }}>
                              El jugador es mexicano. Si desea registrar antecedentes internacionales, cambie el boton a "Extranjero" arriba.
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
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: COLORS.slate800, marginBottom: '20px' }}>Resumen del Registro</h3>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                      gap: '20px',
                      marginBottom: '30px'
                    }}>
                      {/* Tarjeta de Datos Personales */}
                      <div style={{ padding: '20px', borderRadius: '16px', border: `1px solid ${COLORS.slate200}`, background: COLORS.slate50 }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '800', color: COLORS.primary, margin: '0 0 12px 0', textTransform: 'uppercase' }}>Datos Personales</h4>
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
                      <div style={{ padding: '20px', borderRadius: '16px', border: `1px solid ${COLORS.slate200}`, background: COLORS.slate50 }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '800', color: COLORS.primary, margin: '0 0 12px 0', textTransform: 'uppercase' }}>Información Deportiva</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
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
                      <div style={{ padding: '20px', borderRadius: '16px', border: `1px solid ${COLORS.slate200}`, background: COLORS.slate50 }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '800', color: COLORS.primary, margin: '0 0 12px 0', textTransform: 'uppercase' }}>Documentos Cargados</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                          {documentCards.map(doc => (
                            <div key={`summary-doc-${doc.key}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>{doc.title}:</span>
                              <span style={{
                                fontWeight: '800',
                                color: currentDocuments[doc.key] ? COLORS.greenDeep : COLORS.slate500,
                                background: currentDocuments[doc.key] ? COLORS.greenBg : COLORS.slate100,
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
                    <div style={{ borderTop: `1px solid ${COLORS.slate200}`, paddingTop: '25px', marginBottom: '20px' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: '800', color: COLORS.slate800, marginBottom: '12px', textAlign: 'center' }}>Formato de Afiliación Oficial</h4>
                      <p style={{ fontSize: '13px', color: COLORS.slate500, textAlign: 'center', maxWidth: '600px', margin: '0 auto 20px auto', lineHeight: '1.5' }}>
                        Descarga el formato prellenado con los datos del jugador, fírmalo y súbelo escaneado.
                        <strong> Si aún no tienes la firma, puedes inscribir al jugador y subir el formato firmado después.</strong>
                      </p>

                      {!pasos1a5Completos && (
                        <div style={{ backgroundColor: COLORS.dangerBgLight, border: `1px solid ${COLORS.dangerBgMedium}`, borderRadius: '12px', padding: '12px', marginBottom: '20px', maxWidth: '600px', margin: '0 auto 20px auto', textAlign: 'center' }}>
                          <span style={{ color: COLORS.danger, fontSize: '13px', fontWeight: '700' }}>
                            Debe completar todos los campos obligatorios de los pasos anteriores para descargar y subir el formato.
                          </span>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (pasos1a5Completos) {
                              handleDownloadFormato();
                            }
                          }}
                          disabled={!pasos1a5Completos}
                          style={{
                            padding: '12px 28px',
                            borderRadius: '12px',
                            border: 'none',
                            background: pasos1a5Completos ? `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryActive})` : COLORS.slate300,
                            color: 'white',
                            fontWeight: '800',
                            fontSize: '14px',
                            cursor: pasos1a5Completos ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: pasos1a5Completos ? `0 4px 6px -1px ${COLORS.primaryBgTranslucent20}` : 'none'
                          }}
                        >
                          📥 Descargar Formato Prellenado
                        </button>
                      </div>

                      <div
                        onClick={() => {
                          if (pasos1a5Completos) {
                            document.getElementById('final-signed-form').click();
                          }
                        }}
                        style={{
                          border: currentPlayer?.signedForm ? `2px solid ${COLORS.success}` : (pasos1a5Completos ? `2px dashed ${COLORS.sky}` : `2px dashed ${COLORS.slate300}`),
                          borderRadius: '20px',
                          padding: '35px 20px',
                          backgroundColor: currentPlayer?.signedForm ? COLORS.greenBg50 : (pasos1a5Completos ? COLORS.slate50 : COLORS.slate100),
                          cursor: pasos1a5Completos ? 'pointer' : 'not-allowed',
                          transition: 'all 0.3s',
                          textAlign: 'center',
                          maxWidth: '600px',
                          margin: '0 auto',
                          opacity: pasos1a5Completos ? 1 : 0.6
                        }}
                      >
                        {currentPlayer?.signedForm ? (
                          <div style={{ color: COLORS.success }}>
                            <FaFilePdf style={{ fontSize: '45px', marginBottom: '12px' }} />
                            <p style={{ margin: 0, fontWeight: '700', fontSize: '14px' }}>{currentPlayer.signedForm.name}</p>
                            <p style={{ margin: '4px 0 0 0', fontSize: '11px' }}>Documento firmado cargado y listo</p>
                          </div>
                        ) : (
                          <div style={{ color: pasos1a5Completos ? COLORS.sky : COLORS.slate400 }}>
                            <FaUpload style={{ fontSize: '45px', marginBottom: '12px' }} />
                            <p style={{ margin: 0, fontWeight: '700', fontSize: '14px' }}>Subir formato firmado</p>
                            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: COLORS.slate500 }}>Solo se permiten archivos PDF</p>
                          </div>
                        )}
                        <input
                          type="file"
                          id="final-signed-form"
                          style={{ display: 'none' }}
                          accept=".pdf"
                          onChange={(e) => {
                            if (pasos1a5Completos && e.target.files[0]) {
                              updatePlayerSignedForm(currentPlayerIndex, e.target.files[0]);
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
                  borderTop: `1px solid ${COLORS.slate100}`,
                  paddingTop: '25px',
                  gap: '20px'
                }}>
                  {currentStep > 1 ? (
                    <button
                      type="button"
                      onClick={() => changeStep(prev => prev - 1)}
                      style={{
                        padding: '12px 28px',
                        borderRadius: '12px',
                        border: `1px solid ${COLORS.slate300}`,
                        background: 'white',
                        color: COLORS.slate500,
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
                        changeStep(prev => prev + 1);
                      }}
                      style={{
                        padding: '12px 32px',
                        borderRadius: '12px',
                        border: 'none',
                        background: COLORS.primary,
                        color: 'white',
                        fontWeight: '800',
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: `0 4px 6px -1px ${COLORS.primaryBgTranslucent20}`,
                        transition: 'all 0.2s'
                      }}
                    >
                      Siguiente <FaArrowRight />
                    </button>
                  ) : (
                    <span style={{ fontSize: '13px', color: COLORS.slate500, fontWeight: '600', fontStyle: 'italic' }}>
                      * Envío grupal al final de la página
                    </span>
                  )}
                </div>

              </>
            )}
          </div>

          {/* REGISTRO GRUPAL BANNER */}
          {(() => {
            const pendingPlayers = jugadores.filter(p => !p.completo);
            const mostrarBotonGrupal = pendingPlayers.length > 0 && pendingPlayers.every(p => getPlayerStatus(p) === 'LISTO');
            if (!mostrarBotonGrupal) return null;
            return (
              <div
                className="fade-in"
                style={{
                  background: `linear-gradient(135deg, ${COLORS.greenBg50} 0%, ${COLORS.greenBg} 100%)`,
                  border: `2px solid ${COLORS.success}`,
                  borderRadius: '24px',
                  padding: '30px',
                  textAlign: 'center',
                  marginTop: '30px',
                  boxShadow: `0 10px 25px -5px ${COLORS.successBgTranslucent}`,
                  maxWidth: '1000px',
                  margin: '30px auto 0 auto'
                }}
              >
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: COLORS.greenDeep, margin: '0 0 10px 0' }}>
                  Todos los datos de tus jugadores están listos
                </h3>
                <p style={{ fontSize: '14px', color: COLORS.greenDarker, margin: '0 0 20px 0', fontWeight: '600' }}>
                  ¿Deseas realizar el registro o modificar alguno?
                </p>
                <button
                  type="button"
                  onClick={handleRegistrarGrupoClick}
                  disabled={uploading}
                  style={{
                    padding: '14px 40px',
                    borderRadius: '14px',
                    border: 'none',
                    background: `linear-gradient(135deg, ${COLORS.success}, ${COLORS.successDark})`,
                    color: 'white',
                    fontWeight: '900',
                    fontSize: '15px',
                    cursor: 'pointer',
                    boxShadow: `0 4px 6px -1px ${COLORS.successBgTranslucent30}`,
                    transition: 'all 0.2s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 6px 12px -2px ${COLORS.successBgTranslucent40}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = `0 4px 6px -1px ${COLORS.successBgTranslucent30}`;
                  }}
                >
                  {uploading ? 'Registrando grupo...' : 'Registrar todos los jugadores'} <FaSave />
                </button>
              </div>
            );
          })()}

          {/* DUP SLOT NAVIGATION CONTROL AT BOTTOM */}
          {jugadores.length > 0 && (() => {
            const activePlayer = jugadores[currentPlayerIndex];
            const status = activePlayer ? getPlayerStatus(activePlayer) : 'VACIO';
            const config = playerStatusConfig[status] || playerStatusConfig.VACIO;
            return (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                margin: '25px auto 0 auto',
                maxWidth: '1000px',
                width: '100%',
                padding: '16px 35px',
                background: 'white',
                borderRadius: '24px',
                border: `1px solid ${COLORS.slate200}`,
                boxShadow: `0 4px 6px -1px ${COLORS.shadow05}, 0 2px 4px -1px ${COLORS.shadow05}`,
                transition: 'all 0.3s ease'
              }}>
                {/* Left Arrow Button */}
                <button
                  type="button"
                  disabled={currentPlayerIndex === 0}
                  onClick={() => {
                    document.activeElement?.blur();
                    setCurrentPlayerIndex(currentPlayerIndex - 1);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    border: `1px solid ${COLORS.slate300}`,
                    backgroundColor: currentPlayerIndex === 0 ? COLORS.slate100 : 'white',
                    color: currentPlayerIndex === 0 ? COLORS.slate400 : COLORS.primary,
                    cursor: currentPlayerIndex === 0 ? 'not-allowed' : 'pointer',
                    opacity: currentPlayerIndex === 0 ? 0.4 : 1,
                    transition: 'all 0.2s',
                    boxShadow: currentPlayerIndex === 0 ? 'none' : `0 2px 4px ${COLORS.shadow05}`
                  }}
                  onMouseEnter={(e) => {
                    if (currentPlayerIndex !== 0) {
                      e.currentTarget.style.backgroundColor = COLORS.slate100;
                      e.currentTarget.style.borderColor = COLORS.slate400;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentPlayerIndex !== 0) {
                      e.currentTarget.style.backgroundColor = 'white';
                      e.currentTarget.style.borderColor = COLORS.slate300;
                    }
                  }}
                >
                  <FaChevronLeft style={{ fontSize: '14px' }} />
                </button>

                {/* Center Area: Number & Status */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span style={{
                    fontSize: '28px',
                    fontWeight: '900',
                    color: COLORS.slate800,
                    userSelect: 'none',
                    lineHeight: '1.2'
                  }}>
                    {currentPlayerIndex + 1}
                  </span>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    backgroundColor: config.bg,
                    color: config.color,
                    fontSize: '11px',
                    fontWeight: '800',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    border: `1px solid ${config.color}30`,
                    marginTop: '8px',
                    boxShadow: `0 1px 2px ${COLORS.shadow03}`
                  }}>
                    <span>{config.label}</span>
                  </div>
                </div>

                {/* Right Arrow Button */}
                <button
                  type="button"
                  disabled={currentPlayerIndex === jugadores.length - 1}
                  onClick={() => {
                    document.activeElement?.blur();
                    setCurrentPlayerIndex(currentPlayerIndex + 1);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    border: `1px solid ${COLORS.slate300}`,
                    backgroundColor: currentPlayerIndex === jugadores.length - 1 ? COLORS.slate100 : 'white',
                    color: currentPlayerIndex === jugadores.length - 1 ? COLORS.slate400 : COLORS.primary,
                    cursor: currentPlayerIndex === jugadores.length - 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPlayerIndex === jugadores.length - 1 ? 0.4 : 1,
                    transition: 'all 0.2s',
                    boxShadow: currentPlayerIndex === jugadores.length - 1 ? 'none' : `0 2px 4px ${COLORS.shadow05}`
                  }}
                  onMouseEnter={(e) => {
                    if (currentPlayerIndex !== jugadores.length - 1) {
                      e.currentTarget.style.backgroundColor = COLORS.slate100;
                      e.currentTarget.style.borderColor = COLORS.slate400;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentPlayerIndex !== jugadores.length - 1) {
                      e.currentTarget.style.backgroundColor = 'white';
                      e.currentTarget.style.borderColor = COLORS.slate300;
                    }
                  }}
                >
                  <FaChevronRight style={{ fontSize: '14px' }} />
                </button>
              </div>
            );
          })()}
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
        <div style={{ width: '100%', height: previewDoc.type === 'pdf' ? '70vh' : 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {previewDoc.type === 'pdf' ? (
            /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '30px 20px',
                textAlign: 'center',
                background: COLORS.slate900,
                borderRadius: '16px',
                border: `1px dashed ${COLORS.slate600}`,
                color: 'white',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                <div style={{ fontSize: '48px', color: COLORS.danger, marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FaFilePdf />
                </div>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: '800' }}>Vista previa no disponible</h3>
                <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: COLORS.slate300, lineHeight: '1.5' }}>
                  Los navegadores móviles no permiten ver archivos PDF integrados en la pantalla. Haz clic abajo para abrirlo directamente en tu dispositivo.
                </p>
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: COLORS.primary,
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    fontWeight: '700',
                    fontSize: '14px',
                    textDecoration: 'none',
                    boxShadow: `0 4px 12px ${COLORS.primaryBgTranslucent25}`,
                    transition: 'all 0.2s'
                  }}
                >
                  📥 Abrir PDF Completo
                </a>
              </div>
            ) : (
              <iframe src={previewDoc.url} title="Document Preview" style={{ width: '100%', height: '100%', border: 'none', borderRadius: '12px' }} />
            )
          ) : (
            <img src={previewDoc.url} alt="Document Preview" style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '12px' }} />
          )}
        </div>
      </Modal>

      {/* MODAL DE DETALLE DE SEGUROS */}
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
        const isSelected = String(currentSeguroId) === String(seguroDetalle.seguro_id);

        return createPortal(
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: COLORS.overlaySlateDeep,
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: /Mobi|Android/i.test(navigator.userAgent) ? '10px' : '20px',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div className="seguro-modal-container">
              {/* Header */}
              <div className="seguro-modal-header">
                <div>
                  <h3 style={{ margin: 0, fontSize: '12px', fontWeight: '900', color: COLORS.secondaryLight, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Seguro de Jugador
                  </h3>
                  <h2 style={{ margin: '5px 0 0', fontSize: '22px', fontWeight: '900', color: COLORS.white }}>
                    {info.nombre}
                  </h2>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10px', color: COLORS.overlayWhite50, fontWeight: '700', textTransform: 'uppercase' }}>Costo</div>
                  <div style={{ fontSize: '26px', fontWeight: '900', color: COLORS.successLight }}>
                    ${Number(info.precio).toFixed(2)} <span style={{ fontSize: '12px', fontWeight: '700', color: COLORS.overlayWhite60 }}>M.N.</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="seguro-modal-content">
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
                {info.coberturas && info.coberturas.length > 0 && (
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
              <div className="seguro-modal-footer">
                <button
                  type="button"
                  onClick={() => setSeguroDetalle(null)}
                  style={{
                    background: COLORS.overlayWhite05,
                    border: `1px solid ${COLORS.overlayWhite10}`,
                    color: COLORS.overlayWhite70,
                    padding: '10px 24px',
                    borderRadius: '12px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s'
                  }}
                >
                  Cancelar
                </button>
                {isSelected ? (
                  <button
                    type="button"
                    onClick={() => {
                      updatePlayerSeguro(currentPlayerIndex, '');
                      const updated = { ...currentDatos };
                      if (currentPlayer?.slotId) {
                        guardarBorradorEnBD(currentPlayer.slotId, updated);
                      }
                      setSeguroDetalle(null);
                    }}
                    style={{
                      background: `linear-gradient(135deg, ${COLORS.danger} 0%, ${COLORS.dangerDark} 100%)`,
                      border: 'none',
                      color: COLORS.white,
                      padding: '10px 28px',
                      borderRadius: '12px',
                      fontWeight: '900',
                      cursor: 'pointer',
                      fontSize: '14px',
                      boxShadow: `0 4px 12px ${COLORS.dangerBgTranslucent30}`,
                      transition: 'all 0.2s'
                    }}
                  >
                    Deseleccionar Seguro
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      updatePlayerSeguro(currentPlayerIndex, String(seguroDetalle.seguro_id));
                      setValidationErrors(prev => ({ ...prev, seguroId: null }));
                      const updated = { ...currentDatos };
                      if (currentPlayer?.slotId) {
                        guardarBorradorEnBD(currentPlayer.slotId, updated);
                      }
                      setSeguroDetalle(null);
                    }}
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
                    Asignar Seguro
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body
        );
      })()}

      {/* Notificación de autoguardado */}
      <div className={`toast-auto-save ${toastVisible ? 'show' : ''}`}>
        <FaCheckCircle style={{ color: COLORS.success, fontSize: '16px' }} />
        <span>Borrador guardado</span>
      </div>
    </div>
  );
}
