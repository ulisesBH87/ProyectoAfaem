import COLORS from '../../styles/colors';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../routes/paths';
import { FaUpload, FaCheckCircle, FaTimesCircle, FaChevronRight, FaChevronLeft, FaFileAlt, FaClock, FaCamera, FaTrash } from 'react-icons/fa';
import CameraCaptureModal from '../../components/Common/CameraCaptureModal';
import AfaemLogo from '../../assets/afaem-logo@4x.png';
import FmfLogo from '../../assets/fmf-logo.png';
import AmateurLogo from '../../assets/amateur-logo.png';
import { validarFotografia } from "../../services/foto";
import Swal from 'sweetalert2';
import { PDFDocument } from 'pdf-lib';
import { jsPDF } from 'jspdf';
import { API_BASE } from '../../config/config';
import { parseJwt, verificarCurp } from '../../services/auth';
import { DEFAULT_BANK_INFO } from '../../utils/paymentPdf';
import Modal from '../../components/partials/Forms/Modal';
import { useRBAC } from '../../hooks/useRBAC';
import { openSecurePath } from '../../utils/secureFetch';
import { buildCaptureSourceDialog, getCameraCaptureKind } from '../../utils/cameraCapture';

const convertToDDMMYYYY = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const convertToYYYYMMDD = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
};

const normalizarNombreSeguro = (nombre) => {
  if (!nombre) return '';
  return nombre.toUpperCase().replace(/[\u0022\u0027]/g, '').trim();
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

function PreRegistroPresidente() {
  const navigate = useNavigate();
  const { estatusId, refreshAccess } = useRBAC();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Estados Generales
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pasoActual, setPasoActual] = useState(0); // 0 = Bienvenida, 1 = Pago/Seguro, 2 = Revisión de orden, 3 = Documentos, 4 = Revisión de solicitud
  const [estadoPago, setEstadoPago] = useState(null); // null, 1=NO ENVIADO, 2=ESPERA, 3=ACTIVO, 4=RECHAZADO
  const [ordenPendienteId, setOrdenPendienteId] = useState(null); // ID si se guardó la orden a la mitad
  const [estadoSolicitud, setEstadoSolicitud] = useState(null); // 1=ESPERA, 2/3=RECHAZADA, 4=BORRADOR
  const [solicitudActualId, setSolicitudActualId] = useState(null);
  const [mensajeRechazoPago, setMensajeRechazoPago] = useState('');
  const [mensajeRechazoSolicitud, setMensajeRechazoSolicitud] = useState('');
  const [curpExistente, setCurpExistente] = useState(false);
  const [tieneEstadoBackend, setTieneEstadoBackend] = useState(false);
  const [referenciaPago, setReferenciaPago] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null); // { file: File, title: string }
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (previewDoc?.file) {
      const url = URL.createObjectURL(previewDoc.file);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPreviewUrl('');
    }
  }, [previewDoc]);

  // PASO 1: Pago y Seguros
  const [numPersonas, setNumPersonas] = useState('');
  const [catalogoSeguros, setCatalogoSeguros] = useState([]);
  const [catalogoAfiliaciones, setCatalogoAfiliaciones] = useState([]);
  const [cargandoSeguros, setCargandoSeguros] = useState(false);
  const [asignacionSeguros, setAsignacionSeguros] = useState({});
  const [detalleInscripciones, setDetalleInscripciones] = useState([]);

  // Estados para modal de beneficios de seguros
  const [seguroDetalle, setSeguroDetalle] = useState(null);
  const [cantidadModal, setCantidadModal] = useState(0);
  const [comprobanteDragActive, setComprobanteDragActive] = useState(false);

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

  const abrirModalDetalle = (seguro) => {
    setSeguroDetalle(seguro);
    const normalizedName = normalizarNombreSeguro(seguro.nombre);
    const esPres = ['TIPO G', 'SIN SEGURO'].includes(normalizedName);
    if (!esPres) {
      setCantidadModal(Number(asignacionSeguros[seguro.id] || 0));
    }
  };
  const [totalOrdenPendiente, setTotalOrdenPendiente] = useState(0);
  const [comprobantePago, setComprobantePago] = useState(null);

  // PASO 2: Documentos
  const [documents, setDocuments] = useState({});
  const [dragActive, setDragActive] = useState({});
  const [documentosGuardados, setDocumentosGuardados] = useState([]);
  const [ocrResults, setOcrResults] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      const uInfo = u.usuario || {};
      let sStr = '';
      if (uInfo.sexoId === 1) sStr = 'MASCULINO';
      else if (uInfo.sexoId === 2) sStr = 'FEMENINO';
      else if (uInfo.sexoId === 3) sStr = 'NO BINARIO';

      let initialFechaNac = '';
      if (uInfo.fechaNacimiento) {
        const dateStr = uInfo.fechaNacimiento;
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          initialFechaNac = `${parts[2]}/${parts[1]}/${parts[0]}`;
        } else {
          initialFechaNac = dateStr;
        }
      }

      const regTelefono = uInfo.telefono || u.telefono || u.NumeroTelefono || '';
      const { telefono: parsedLocal } = parsearTelefonoE164(regTelefono);

      return {
        nombre: (uInfo.nombre || u.Nombre || u.NombreUsuario || '').toUpperCase(),
        nombreSolo: uInfo.nombreSolo || '',
        primerApellido: uInfo.primerApellido || '',
        segundoApellido: uInfo.segundoApellido || '',
        telefono: parsedLocal,
        curp: uInfo.curp || '',
        sexo: sStr,
        fecha_nac: initialFechaNac,
        nacionalidad: uInfo.lugarNacimiento || ''
      };
    } catch (e) {
      console.error("Error initializing ocrResults:", e);
      return {};
    }
  });
  const [codigoPais, setCodigoPais] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      const uInfo = u.usuario || {};
      const regTelefono = uInfo.telefono || u.telefono || u.NumeroTelefono || '';
      const { codigoPais: parsedCodigo } = parsearTelefonoE164(regTelefono);
      return parsedCodigo || '+52';
    } catch (e) {
      return '+52';
    }
  });
  const [, setFotoPreview] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState({});
  const [tipoAfiliacion, setTipoAfiliacion] = useState('');
  const [asociacion, setAsociacion] = useState('Asociación de Morelos');
  const [liga, setLiga] = useState('');
  const [cargoSeleccionado, setCargoSeleccionado] = useState('Presidente Equipo');
  const [ligasCatalogo, setLigasCatalogo] = useState([]);

  // Estados para validación de nombre de equipo en tiempo real
  const [nombreEquipoValido, setNombreEquipoValido] = useState(true);
  const [nombreEquipoMensaje, setNombreEquipoMensaje] = useState('');
  const [verificandoNombre, setVerificandoNombre] = useState(false);

  // Estados para validación fallida de fotografía y captura manual de OCR
  const [fotoValidacionFallida, setFotoValidacionFallida] = useState(false);
  const [fotoArchivoPendiente, setFotoArchivoPendiente] = useState(null);


  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraTargetKey, setCameraTargetKey] = useState(null);
  const DOC_AFILIACION_IDS = {
    actaNacimiento: 8,
    identificacion: 38,
    fotografia: 37,
    formatoAfiliacion: 10,
  };

  const handleCameraPhotoCaptured = (file) => {
    if (!cameraTargetKey) return;

    const targetKey = cameraTargetKey.replace(/^file-val-/, '').replace(/^file-/, '');
    const isValidationFlow = cameraTargetKey.startsWith('file-val-');
    const docAfiliacionId = DOC_AFILIACION_IDS[targetKey];

    if (isValidationFlow && docAfiliacionId) {
      const docGuardado = documentosGuardados.find(
        (d) => Number(d.DocumentoAfiliacionId || d.documentoAfiliacionId) === Number(docAfiliacionId)
      );

      if (docGuardado) {
        handleReemplazarDocumento(docAfiliacionId, file);
        setDocuments((prev) => ({ ...prev, [targetKey]: file }));
        return;
      }
    }

    handleFileUpload(targetKey, file);
  };

  const segurosPresidente = catalogoSeguros.filter((seg) =>
    ['TIPO G', 'SIN SEGURO'].includes(seg.nombre.toUpperCase().trim())
  );
  const segurosJugadores = catalogoSeguros.filter((seg) =>
    !['TIPO G', 'SIN SEGURO'].includes(seg.nombre.toUpperCase().trim())
  );


  // Verificar estado de pago al cargar
  useEffect(() => {

    const verificarEstadoPago = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Restaurar progreso guardado si existe
        const saved = localStorage.getItem('afaem_pre_registro');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.numPersonas) setNumPersonas(parsed.numPersonas);
            if (parsed.asignacionSeguros) setAsignacionSeguros(parsed.asignacionSeguros);
            if (parsed.tipoAfiliacion) setTipoAfiliacion(parsed.tipoAfiliacion);
            if (parsed.pasoActual === 1) setPasoActual(1);
          } catch (e) {
            console.error("Error al restaurar progreso", e);
          }
        }
        const res = await fetch(`${API_BASE}/ordenes-pago/mi-estado`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          await resolverFlujoBackend(data, token);
        }
      } catch (err) {
        console.warn('No se pudo verificar estado de pago:', err);
      }
    };
    verificarEstadoPago();

    const fetchLigas = async () => {
      try {
        const res = await fetch(`${API_BASE}/equipo-temporal/catalogos-registro`);
        if (res.ok) {
          const data = await res.json();
          if (data.ligas) {
            setLigasCatalogo(data.ligas);
          }
        }
      } catch (err) {
        console.warn('No se pudo cargar catálogos:', err);
      }
    };

    const fetchSeguros = async () => {
      setCargandoSeguros(true);
      try {
        const res = await fetch(`${API_BASE}/ordenes-pago/seguros`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error('Error al cargar seguros');
        const data = await res.json();
        const arrSeguros = Array.isArray(data) ? data :
          Array.isArray(data.data) ? data.data :
            Array.isArray(data.seguros) ? data.seguros :
              Array.isArray(data.results) ? data.results : [];

        const segurosMapeados = arrSeguros.map((seg, idx) => ({
          id: String(seg.id || seg.SeguroId || idx + 1),
          nombre: seg.nombre || seg.Nombre || seg.name || seg.nombre_seguro || 'Seguro sin nombre',
          descripcion: seg.descripcion || seg.Descripcion || seg.description || '',
          precio: Number(seg.costo || seg.Costo || seg.precio || seg.Precio || seg.price || 0),
        }));

        setCatalogoSeguros(segurosMapeados);
        const initAsignacion = {};
        segurosMapeados.forEach(seg => {
          if (seg.nombre.toUpperCase().trim() === 'SIN SEGURO') {
            initAsignacion[seg.id] = 1;
          } else {
            initAsignacion[seg.id] = 0;
          }
        });
        setAsignacionSeguros(prev => {
          const hasLoadedData = Object.values(prev).some(val => Number(val) > 0);
          if (hasLoadedData) {
            return { ...initAsignacion, ...prev };
          }
          return initAsignacion;
        });
      } catch (err) {
        console.warn('No se pudo cargar seguros:', err);
        setCatalogoSeguros([]);
      } finally {
        setCargandoSeguros(false);
      }
    };

    const fetchAfiliaciones = async () => {
      try {
        const res = await fetch(`${API_BASE}/ordenes-pago/afiliaciones`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error('Error al cargar afiliaciones');
        const data = await res.json();
        setCatalogoAfiliaciones(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn('No se pudo cargar afiliaciones:', err);
        setCatalogoAfiliaciones([]);
      }
    };

    fetchLigas();
    fetchSeguros();
    fetchAfiliaciones();
  }, []);

  // NUEVO: Validación de nombre de equipo en tiempo real
  useEffect(() => {
    const verificarNombreEquipo = async () => {
      const nombre = ocrResults.equipo?.trim();
      const ligaIdVal = liga;

      if (!nombre || !ligaIdVal) {
        setNombreEquipoValido(true);
        setNombreEquipoMensaje('');
        return;
      }

      setVerificandoNombre(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(
          `${API_BASE}/equipo-temporal/validar-nombre?nombre_equipo=${encodeURIComponent(nombre)}&liga_id=${ligaIdVal}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.disponible) {
            setNombreEquipoValido(true);
            setNombreEquipoMensaje('✓ Nombre de equipo disponible en esta liga');
          } else {
            setNombreEquipoValido(false);
            setNombreEquipoMensaje('✗ Ya existe un equipo con este nombre registrado en la misma liga');
          }
        }
      } catch (err) {
        console.error("Error al verificar disponibilidad de nombre de equipo:", err);
      } finally {
        setVerificandoNombre(false);
      }
    };

    // Debounce de 500ms
    const timer = setTimeout(() => {
      verificarNombreEquipo();
    }, 500);

    return () => clearTimeout(timer);
  }, [ocrResults.equipo, liga]);

  // SINCRONIZAR PASO ACTUAL CON EL ESTATUS REAL DEL BACKEND
  useEffect(() => {
    if (tieneEstadoBackend) return;

    if (estatusId) {
      if (estatusId >= 5) {
        // Ya está aprobado completamente
        navigate(ROUTES.PRESIDENTE.DASHBOARD);
      } else if (estatusId === 4) {
        // Documentos personales en revisión por el admin
        setEstadoPago(3); // Para que sepa que el pago ya fue validado
        setPasoActual(5); // Nuevo paso: Validación de documentos
      } else if (estatusId === 3) {
        // Ya pagó, falta subir los documentos personales (INE, Acta, etc)
        setEstadoPago(3); // Asegurar estado aprobado en UI local
        setPasoActual(3);
      } else if (estatusId === 2) {
        // Pago en revisión por el admin (PAGO_EN_REVISION)
        setEstadoPago(2); // 2 = En espera
        setPasoActual(2);
      } else if (estatusId === 1) {
        // Pago pendiente
        setPasoActual(1);
      }
    }
  }, [estatusId, navigate, tieneEstadoBackend]);

  // Sincronizar nombre y teléfono desde localStorage, y rellenar Tipo de Afiliación
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      const uInfo = u.usuario || {};
      const regNombre = (uInfo.nombre || u.Nombre || u.NombreUsuario || '').toUpperCase();
      const regTelefono = uInfo.telefono || u.telefono || u.NumeroTelefono || '';

      const { codigoPais: parsedCodigo, telefono: parsedLocal } = parsearTelefonoE164(regTelefono);
      setCodigoPais(parsedCodigo);

      setOcrResults(prev => ({
        ...prev,
        nombre: regNombre || prev.nombre || '',
        nombreSolo: uInfo.nombreSolo || prev.nombreSolo || '',
        primerApellido: uInfo.primerApellido || prev.primerApellido || '',
        segundoApellido: uInfo.segundoApellido || prev.segundoApellido || '',
        telefono: parsedLocal || prev.telefono || ''
      }));
    } catch (e) { }
  }, []);

  useEffect(() => {
    if (ordenPendienteId) return;
    if (catalogoSeguros && catalogoSeguros.length > 0 && segurosPresidente.length > 0) {
      const selectedPresSeguro = segurosPresidente.find(seg => Number(asignacionSeguros[seg.id] || 0) > 0);
      if (selectedPresSeguro) {
        setTipoAfiliacion(selectedPresSeguro.nombre.toUpperCase().trim());
      }
    }
  }, [asignacionSeguros, catalogoSeguros, segurosPresidente, ordenPendienteId]);

  /* ─── Catálogos para Selectores ─── */
  const CATALOGO_ROLES = [
    { valor: 'TIPO G', etiqueta: 'TIPO G' },
    { valor: 'SIN SEGURO', etiqueta: 'SIN SEGURO' }
  ];

  const bankInfo = DEFAULT_BANK_INFO;

  const obtenerMensajeObservaciones = (valor, fallback) => {
    if (typeof valor === 'string' && valor.trim()) return valor.trim();
    return fallback;
  };

  const formatearMensajeRechazo = (observaciones) => {
    if (!observaciones) return 'Tu solicitud fue rechazada.';
    if (typeof observaciones !== 'string') return observaciones;
    const obsTrimmed = observaciones.trim();
    if (!obsTrimmed.startsWith('{')) return observaciones;
    try {
      const parsed = JSON.parse(obsTrimmed);
      if (parsed && typeof parsed === 'object') {
        const keysMap = {
          'ACTA_NACIMIENTO': 'Acta de nacimiento',
          'INE': 'Identificación oficial',
          'FOTOGRAFIA': 'Fotografía',
          'FORMATO_DIRECTIVO': 'Formato de afiliación'
        };

        const lines = [];
        Object.entries(parsed).forEach(([key, val]) => {
          if (val && (val.estado === 'rechazado' || val.estado === 'Rechazado')) {
            const docKey = key.replace(/^\d+-/, '');
            const docLabel = keysMap[docKey] || docKey.replace(/_/g, ' ');
            const motivo = val.motivo || '';
            const detalle = val.detalle ? `: ${val.detalle}` : '';

            if (motivo || detalle) {
              lines.push(`• ${docLabel}: ${motivo}${detalle}`);
            } else {
              lines.push(`• ${docLabel}: Documento rechazado`);
            }
          }
        });
        if (lines.length > 0) {
          return lines.join('\n');
        }
      }
    } catch (e) {
      console.warn("Error parsing observations JSON:", e);
    }
    return observaciones;
  };

  const validarArchivoPermitido = (file) => {
    if (!file) return false;
    const extensionesPermitidas = ['pdf', 'png', 'jpg', 'jpeg'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!extensionesPermitidas.includes(ext)) {
      Swal.fire({
        title: 'Formato de archivo no válido',
        text: 'Solo se permiten documentos en formato PDF o imágenes (PNG, JPG, JPEG).',
        icon: 'error',
        confirmButtonColor: COLORS.primary
      });
      return false;
    }
    return true;
  };

  const manejarArchivoComprobante = (file) => {
    if (file && validarArchivoPermitido(file)) {
      setComprobantePago(file);
      return true;
    }
    return false;
  };

  const resolverFlujoBackend = async (data, token) => {
    setTieneEstadoBackend(true);

    if (!data?.tiene_orden) {
      setEstadoPago(null);
      setEstadoSolicitud(null);
      setSolicitudActualId(null);
      setOrdenPendienteId(null);
      setPasoActual(1);
      return;
    }

    const ordenId = data.orden_pago_id || data.OrdenPagoId || null;
    const estatusOrden = Number(data.estatus);
    const solicitud = data.solicitud || null;
    const estatusSolicitud = Number(solicitud?.estatus ?? solicitud ?? 0) || null;
    const solicitudId = solicitud?.solicitud_id || solicitud?.SolicitudId || null;
    const observacionesPago = obtenerMensajeObservaciones(
      data.observaciones || localStorage.getItem(`motivo_rechazo_${ordenId}`) || solicitud?.observaciones,
      'El comprobante de pago no fue aceptado.'
    );
    const observacionesSolicitud = formatearMensajeRechazo(
      obtenerMensajeObservaciones(
        solicitud?.observaciones,
        'Tu solicitud fue rechazada.'
      )
    );

    setOrdenPendienteId(ordenId);
    setEstadoPago(estatusOrden);
    setEstadoSolicitud(estatusSolicitud);
    setSolicitudActualId(solicitudId);
    if (solicitudId) {
      await cargarDocumentosSolicitud(solicitudId);
    }
    setMensajeRechazoPago(observacionesPago);
    setMensajeRechazoSolicitud(observacionesSolicitud);
    setTotalOrdenPendiente(Number(data.total || data.TotalPagar || 0));
    setReferenciaPago(data.referencia_pago || data.ReferenciaPago || '');

    if (data.afiliacion) {
      setTipoAfiliacion(data.afiliacion);
    }

    if (ordenId) {
      await cargarDetalleOrdenDirecto(ordenId, token);
    }

    if (estatusOrden === 1) {
      setPasoActual(1);
      return;
    }

    if (estatusOrden === 2) {
      setPasoActual(2);
      return;
    }

    if (estatusOrden === 4) {
      setPasoActual(1);
      await Swal.fire({
        title: 'Tu orden fue rechazada',
        text: `${observacionesPago} Vuelve a subir tu comprobante de pago.`,
        icon: 'warning',
        confirmButtonColor: COLORS.primary
      });
      return;
    }

    if (estatusOrden === 3) {
      if (!estatusSolicitud || estatusSolicitud === 4) {
        setPasoActual(3);
        return;
      }

      if (estatusSolicitud === 1) {
        setPasoActual(5); // PASO 3: VALIDACIÓN
        return;
      }

      if (estatusSolicitud === 3) {
        setPasoActual(5); // PASO 3: VALIDACIÓN
        await Swal.fire({
          title: 'Tu solicitud tiene observaciones',
          //text: `Motivo general: ${observacionesSolicitud}. Por favor, revisa el estado de tus documentos y reemplaza los que fueron rechazados.`,
          text: `Por favor, revisa el estado de tus documentos y reemplaza los que fueron rechazados.`,
          icon: 'warning',
          confirmButtonColor: COLORS.primary
        });
      }
    }
  };

  // ================== FUNCIÓN PARA CARGAR DETALLES DE ORDEN ==================
  const cargarDetalleOrdenDirecto = async (ordenId, token) => {
    try {
      const res = await fetch(`${API_BASE}/ordenes-pago/${ordenId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al cargar detalle de orden');
      const data = await res.json();

      setTotalOrdenPendiente(Number(data.TotalPagar || data.total || 0));
      setReferenciaPago(data.ReferenciaPago || data.referencia_pago || '');

      const detalles = data.OrdenPagoDetalleRelacion || data.detalles || [];
      const segurosOrden = {};
      const inscripcionesOrden = [];
      detalles.forEach(detalle => {
        const seguroId = detalle.SeguroId || detalle.seguro_id;
        if (seguroId) {
          segurosOrden[String(seguroId)] = detalle.Cantidad || detalle.cantidad || 0;
        } else {
          inscripcionesOrden.push(detalle);
        }
      });
      setAsignacionSeguros(segurosOrden);
      setDetalleInscripciones(inscripcionesOrden);
    } catch (err) {
      console.warn('No se pudo cargar detalle de la orden:', err);
    }
  };

  const cargarDocumentosSolicitud = async (solId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !solId) return;

      const res = await fetch(`${API_BASE}/solicitud/${solId}/documentos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const docs = data.Jugadores?.[0]?.Documentos || [];
        setDocumentosGuardados(docs);
      }
    } catch (err) {
      console.warn("No se pudieron cargar los documentos guardados:", err);
    }
  };

  const handleReemplazarDocumento = async (docAfiliacionId, archivo) => {
    if (!solicitudActualId) {
      Swal.fire('Error', 'No se pudo asociar la solicitud para subir el documento.', 'error');
      return;
    }

    try {
      Swal.fire({
        title: 'Subiendo documento...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('documento_afiliacion_ids', docAfiliacionId);
      formData.append('archivo', archivo);
      formData.append('solicitud_id', solicitudActualId);

      const res = await fetch(`${API_BASE}/documentos/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Error al subir el documento.');
      }

      Swal.close();
      await Swal.fire('¡Éxito!', 'El documento ha sido subido y enviado a revisión.', 'success');
      await cargarDocumentosSolicitud(solicitudActualId);
    } catch (err) {
      console.error(err);
      Swal.fire('Error', err.message || 'No se pudo subir el documento.', 'error');
    }
  };



  const totalAsignados = segurosJugadores.reduce((acc, seg) => acc + Number(asignacionSeguros[seg.id] || 0), 0);
  const totalPagar = catalogoSeguros.reduce((acc, seg) => acc + (Number(asignacionSeguros[seg.id] || 0)) * seg.precio, 0);
  const totalMostrado = ordenPendienteId ? totalOrdenPendiente : totalPagar;
  const nombreAfiliacion = (tipoAfiliacionId) => {
    const afiliacion = catalogoAfiliaciones.find(a => String(a.TipoAfiliacionId) === String(tipoAfiliacionId));
    return afiliacion?.NombreAfiliacion || 'Inscripción';
  };
  const segurosRequeridos = Number(numPersonas || 0);
  const jugadoresRestantes = segurosRequeridos - totalAsignados;

  // PASO 2: Documentos

  const requisitos = [
    { documento: 'actaNacimiento', nombre: 'Acta de nacimiento' },
    { documento: 'identificacion', nombre: 'Identificación oficial' },
    { documento: 'fotografia', nombre: 'Fotografía' },
    { documento: 'formatoAfiliacion', nombre: 'Formato de afiliación firmado', hasDownload: true }
  ];

  // ================== FUNCIÓN PARA GENERAR PDF DE CUOTA ==================
  const generarPDFCuota = (ordenId, refDirecta = null) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 15;
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;

      // Encabezado
      doc.setFontSize(16);
      doc.setTextColor(11, 78, 166);
      doc.text('FICHA DE PAGO - AFAEM', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Número de Orden: ${ordenId}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;
      const today = new Date().toLocaleDateString('es-MX');
      doc.text(`Fecha: ${today}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 12;

      // Datos del Usuario
      doc.setFontSize(12);
      doc.setTextColor(11, 78, 166);
      doc.text('DATOS DEL SOLICITANTE', margin, yPosition);
      yPosition += 8;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const userName = (user.usuario?.nombre || user.usuario?.Nombre || user.Nombre || user.NombreUsuario || 'N/A').toUpperCase();
      doc.text(`Nombre: ${userName}`, margin, yPosition);
      yPosition += 6;
      doc.text(`Correo: ${user.Correo || user.email || 'N/A'}`, margin, yPosition);
      yPosition += 10;

      // Datos Bancarios
      doc.setFontSize(12);
      doc.setTextColor(11, 78, 166);
      doc.text('INSTRUCCIONES DE PAGO', margin, yPosition);
      yPosition += 8;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Banco: ${bankInfo.banco}`, margin, yPosition);
      yPosition += 6;
      doc.text(`Titular: ${bankInfo.titular}`, margin, yPosition);
      yPosition += 6;
      doc.text(`Cuenta: ${bankInfo.cuenta}`, margin, yPosition);
      yPosition += 6;
      doc.text(`CLABE: ${bankInfo.clabe}`, margin, yPosition);
      yPosition += 6;
      const refFinal = refDirecta || referenciaPago || 'N/A';
      doc.text(`Referencia Obligatoria: ${refFinal}`, margin, yPosition);
      yPosition += 12;

      // Desglose de Cuota
      doc.setFontSize(12);
      doc.setTextColor(11, 78, 166);
      doc.text('DESGLOSE DE CUOTA', margin, yPosition);
      yPosition += 8;
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);

      // Afiliaciones (Omitidas del PDF según requerimiento)

      // Seguros
      let tieneSeguros = false;
      catalogoSeguros.forEach(seg => {
        if (asignacionSeguros[seg.id] > 0) {
          tieneSeguros = true;
          const subtotal = seg.precio * asignacionSeguros[seg.id];
          doc.text(`${seg.nombre} (x${asignacionSeguros[seg.id]})`, margin, yPosition);
          doc.text(`$${subtotal.toFixed(2)}`, pageWidth - margin - 30, yPosition);
          yPosition += 6;
        }
      });

      // Línea divisoria
      yPosition += 2;
      doc.setDrawColor(11, 78, 166);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 6;

      // Total
      doc.setFontSize(12);
      doc.setTextColor(11, 78, 166);
      doc.setFont(undefined, 'bold');
      doc.text('TOTAL A PAGAR:', margin, yPosition);
      doc.text(`$${totalMostrado.toFixed(2)}`, pageWidth - margin - 30, yPosition);
      yPosition += 10;

      // Nota final
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.setFont(undefined, 'normal');
      doc.text('Por favor, incluye la referencia obligatoria en tu transferencia bancaria.', margin, yPosition, { maxWidth: contentWidth });
      yPosition += 6;
      doc.text('Una vez realizado el pago, sube el comprobante en la plataforma para procesar tu registro. Recuerda que el comprobante de pago debe tener la referencia obligatoria impresa para que sea aceptado.', margin, yPosition, { maxWidth: contentWidth });

      // Descargar PDF
      const nombreArchivo = `Cuota_AFAEM_${ordenId}_${today.split('/').join('-')}.pdf`;
      doc.save(nombreArchivo);
    } catch (err) {
      console.error('Error al generar PDF:', err);
      Swal.fire({ title: 'Error', text: 'No se pudo generar el PDF de la cuota', icon: 'error' });
    }
  };

  // ================== METODOS DE NAVEGACIÓN ==================
  const handleGuardarYSalir = async () => {
    if (numPersonas <= 0) {
      setError('Debes ingresar el número de jugadores para guardar datos.');
      return;
    }
    if (totalAsignados !== segurosRequeridos) {
      if (totalAsignados > segurosRequeridos) {
        setError(`Has asignado más seguros de los permitidos. El límite es de ${segurosRequeridos} seguros (uno por jugador) y tienes ${totalAsignados} asignados.`);
      } else {
        setError(`Debes asignar un seguro a cada jugador. Faltan ${jugadoresRestantes} por asignar.`);
      }
      return;
    }

    try {
      Swal.fire({
        title: 'Guardando Progreso...',
        text: 'Generando tu orden de pago y actualizando tu perfil. Por favor espera.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });

      const token = localStorage.getItem('token');
      if (!token) throw new Error('No se encontró autenticación. Por favor inicia sesión.');

      // 1. Crear Orden si no existe
      let ordenId = ordenPendienteId;
      if (!ordenId) {
        const segurosPayload = [];
        for (const [idStr, cant] of Object.entries(asignacionSeguros)) {
          if (cant > 0) {
            segurosPayload.push({
              SeguroId: parseInt(idStr, 10),
              Cantidad: cant
            });
          }
        }

        const ordenPayload = {
          CantidadJugadores: parseInt(numPersonas, 10) || 0,
          Seguros: segurosPayload,
          TipoSolicitud: 1
        };

        const resOrden = await fetch(`${API_BASE}/ordenes-pago/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(ordenPayload)
        });

        if (!resOrden.ok) {
          const errData = await resOrden.json().catch(() => ({}));
          throw new Error(errData.detail || 'Fallo al crear la orden de pago');
        }

        const ordenData = await resOrden.json();
        ordenId = ordenData.orden_pago_id || ordenData.OrdenPagoId || ordenData.id;
      }

      // 2. Actualizar Rol Locamente
      localStorage.setItem('rol', 'PRESIDENTE_EQUIPO');
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      currentUser.Rol = 'PRESIDENTE_EQUIPO';
      localStorage.setItem('user', JSON.stringify(currentUser));

      Swal.fire({
        title: '¡Progreso Guardado!',
        text: 'Tu orden ha sido generada y tu rol se ha actualizado a Presidente de Equipo. Podrás subir el comprobante cuando inicies sesión de nuevo.',
        icon: 'success',
        confirmButtonColor: COLORS.primary
      }).then(() => {
        handleLogout();
      });
    } catch (err) {
      console.error('Error al guardar datos:', err);
      Swal.fire({ title: 'Error', text: err.message, icon: 'error' });
    }
  };

  const irSiguientePaso = async () => {
    setError(null);
    if (pasoActual === 0) {
      setPasoActual(1);
    } else if (pasoActual === 1) {
      // 1. Validar que los seguros estén bien asignados antes de nada
      if (!ordenPendienteId) {
        if (numPersonas <= 0) {
          setError('Debes ingresar el número de jugadores.');
          return;
        }
        if (totalAsignados !== segurosRequeridos) {
          if (totalAsignados > segurosRequeridos) {
            setError(`Has asignado más seguros de los permitidos. El límite es de ${segurosRequeridos} seguros (uno por jugador) y tienes ${totalAsignados} asignados.`);
          } else {
            setError(`Debes asignar un seguro a cada jugador. Faltan ${jugadoresRestantes} por asignar.`);
          }
          return;
        }
      }

      // SI YA TENEMOS ORDEN, necesitamos el comprobante para avanzar a validación
      if (ordenPendienteId) {
        if (!comprobantePago) {
          setError('Debes subir el comprobante de pago para continuar.');
          return;
        }

        try {
          Swal.fire({
            title: 'Subiendo comprobante...',
            html: 'Subiendo tu comprobante de pago. <b>Por favor espere.</b>',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
          });

          const token = localStorage.getItem('token');
          const formData = new FormData();
          formData.append('archivo', comprobantePago);

          const resComprobante = await fetch(`${API_BASE}/ordenes-pago/${ordenPendienteId}/comprobante`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
          });

          if (!resComprobante.ok) {
            const errData = await resComprobante.json().catch(() => ({}));
            throw new Error('Falló al subir el comprobante: ' + (errData.detail || ''));
          }

          Swal.fire({
            title: '¡Evidencia Recibida!',
            text: 'Tu comprobante de pago ha sido enviado a revisión.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });

          setEstadoPago(2); // En espera
          setPasoActual(2);
        } catch (err) {
          Swal.fire({ title: 'Error', text: err.message, icon: 'error' });
        }
      }
      // SI NO TENEMOS ORDEN, la creamos y nos quedamos aquí para que suba el comprobante
      else {
        try {
          Swal.fire({
            title: 'Generando Orden...',
            text: 'Estamos creando tu ficha de pago con la referencia necesaria.',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
          });

          const token = localStorage.getItem('token');
          const segurosPayload = [];
          for (const [idStr, cant] of Object.entries(asignacionSeguros)) {
            if (cant > 0) {
              segurosPayload.push({
                SeguroId: parseInt(idStr, 10),
                Cantidad: cant
              });
            }
          }

          const resOrden = await fetch(`${API_BASE}/ordenes-pago/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              CantidadJugadores: parseInt(numPersonas, 10) || 0,
              Seguros: segurosPayload,
              TipoSolicitud: 1,
              Afiliacion: tipoAfiliacion
            })
          });

          if (!resOrden.ok) {
            const errData = await resOrden.json().catch(() => ({}));
            throw new Error(errData.detail || 'Fallo al crear la orden de pago');
          }

          const ordenData = await resOrden.json();
          const newOrdenId = ordenData.orden_pago_id || ordenData.OrdenPagoId || ordenData.id;
          setOrdenPendienteId(newOrdenId);

          // Cargar detalles de la orden inmediatamente
          await cargarDetalleOrdenDirecto(newOrdenId, token);

          // Generar PDF de cuota
          setTimeout(() => {
            generarPDFCuota(newOrdenId, ordenData.ReferenciaPago || ordenData.referencia_pago);
          }, 500);

          Swal.fire({
            title: '¡Orden Generada!',
            text: 'Se ha descargado tu ficha de pago en PDF. Ahora utiliza los datos bancarios para realizar tu transferencia y sube el comprobante aquí mismo.',
            icon: 'success',
            confirmButtonColor: COLORS.primary
          });
        } catch (err) {
          Swal.fire({ title: 'Error', text: err.message, icon: 'error' });
        }
      }
    }
  };

  const irPasoAnterior = () => {
    setError(null);
    if (pasoActual > 0) {
      setPasoActual(pasoActual - 1);
    }
  };

  // ================== MANEJADORES PASO 2 (OCR Y FOTO) ==================
  const handleFileUpload = (documentKey, file) => {
    if (!file) return;
    setError(null); // Clear previous errors

    try {
      const metadata = JSON.parse(localStorage.getItem('afaem_doc_metadata') || '{}');
      metadata[documentKey] = {
        name: file.name,
        size: file.size
      };
      localStorage.setItem('afaem_doc_metadata', JSON.stringify(metadata));
    } catch (e) {
      console.warn("Error storing file metadata:", e);
    }

    if (documentKey === "fotografia") {
      setFotoPreview(null);
      setDocuments(prev => {
        const updated = { ...prev };
        delete updated.fotografia;
        return updated;
      });
      procesarFotografia(file);
    } else {
      const prevDoc = documents[documentKey] || null;
      setDocuments(prev => ({ ...prev, [documentKey]: file }));
      // Invocar OCR real al subir
      if (['actaNacimiento', 'identificacion'].includes(documentKey)) {
        procesarOCRReal(documentKey, file, prevDoc);
      }
    }
  };

  const mejorarExtraccionActa = (rawText, currentData) => {
    if (!rawText) return currentData;
    const data = { ...currentData };

    // Intentar emparejar layout cruzado/macho en una sola línea
    const cleanText = rawText.replace(/\s+/g, ' ').toUpperCase();
    const mashedMatch = cleanText.match(/DATOS\s+DEL\s+REGISTRADO\s+([A-Z0-9\s]+?)\s+NOMBRE\s+([A-Z0-9\s]+?)\s+PRIMER\s+APELLIDO\s+([A-Z0-9\s]+?)\s+SEGUNDO\s+APELLIDO\s+([A-Z0-9\s]+?)(?:$|\s+(?:CURP|FECHA|SEXO|NACIONALIDAD|ENTIDAD|MUNICIPIO|LUGAR|CRIP|REGISTRADO))/i);
    if (mashedMatch) {
      const nombresVal = mashedMatch[1].trim();
      const ap1Val = mashedMatch[2].trim();
      const ap2Val = mashedMatch[3].trim();

      data.nombre = `${nombresVal} ${ap1Val} ${ap2Val}`.replace(/\s+/g, ' ').toUpperCase();
      data.nombres = nombresVal.toUpperCase();
      data.apellido_paterno = ap1Val.toUpperCase();
      data.apellido_materno = ap2Val.toUpperCase();
      data.nombreSolo = nombresVal.toUpperCase();
      data.primerApellido = ap1Val.toUpperCase();
      data.segundoApellido = ap2Val.toUpperCase();

      const rest = mashedMatch[4].trim();
      if (rest && !rest.includes('NACIONALIDAD') && rest.length > 2) {
        data.nacionalidad = rest.toUpperCase();
      } else if (cleanText.includes('NACIONALIDAD')) {
        const nacMatch = cleanText.match(/(?:NACIONALIDAD|PAIS)\s+([A-Z\s]+)/i);
        if (nacMatch) data.nacionalidad = nacMatch[1].trim().toUpperCase();
      }
      return data;
    }

    // 1. RESCATE DE NOMBRE (Especialmente para actas digitales mexicanas)
    // Buscamos patrones de etiquetas seguidas de valores en líneas subsecuentes
    const firstWord = data.nombre ? data.nombre.split(' ')[0] : '';
    if (!data.nombre || data.nombre === 'No detectado' || data.nombre.split(' ').length < 2 || firstWord.length <= 1) {
      // Intento 1: Formato "Nombre(s) \n VALOR \n Primer Apellido \n VALOR ..."
      const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
      let nombres = '', ap1 = '', ap2 = '';

      for (let i = 0; i < lines.length; i++) {
        const l = lines[i].toUpperCase();
        if (l.includes('NOMBRE(S)') && i + 1 < lines.length) {
          const nextVal = lines[i + 1].toUpperCase();
          if ((nextVal === 'S' || nextVal === '(S)' || nextVal.length <= 1) && i + 2 < lines.length) {
            nombres = lines[i + 2];
          } else {
            nombres = lines[i + 1];
          }
        }
        if (l.includes('PRIMER APELLIDO') && i + 1 < lines.length) {
          const val = lines[i + 1];
          if (!val.toUpperCase().includes('APELLIDO') && !val.toUpperCase().includes('NOMBRE')) {
            ap1 = val;
          }
        }
        if (l.includes('SEGUNDO APELLIDO') && i + 1 < lines.length) {
          const val = lines[i + 1];
          if (!val.toUpperCase().includes('APELLIDO') && !val.toUpperCase().includes('NOMBRE')) {
            ap2 = val;
          }
        }
      }

      if (nombres && ap1) {
        data.nombre = `${nombres} ${ap1} ${ap2}`.replace(/\s+/g, ' ').toUpperCase();
        data.nombres = nombres.toUpperCase();
        data.apellido_paterno = ap1.toUpperCase();
        data.apellido_materno = ap2.toUpperCase();
        data.nombreSolo = nombres.toUpperCase();
        data.primerApellido = ap1.toUpperCase();
        data.segundoApellido = ap2.toUpperCase();
      }
    }

    // 2. RESCATE DE FECHA DE NACIMIENTO (Soporte para formatos de texto: "15 de Mayo de 1990")
    if (!data.fecha_nac || data.fecha_nac === 'No detectada') {
      const meses = {
        'ENERO': '01', 'FEBRERO': '02', 'MARZO': '03', 'ABRIL': '04', 'MAYO': '05', 'JUNIO': '06',
        'JULIO': '07', 'AGOSTO': '08', 'SEPTIEMBRE': '09', 'OCTUBRE': '10', 'NOVIEMBRE': '11', 'DICIEMBRE': '12'
      };

      const regexFechaTexto = /(\d{1,2})\s*DE\s*([A-Z]+)\s*DE\s*(\d{4})/i;
      const matchFecha = rawText.match(regexFechaTexto);

      if (matchFecha) {
        const dia = matchFecha[1].padStart(2, '0');
        const mesNombre = matchFecha[2].toUpperCase();
        const anio = matchFecha[3];

        if (meses[mesNombre]) {
          data.fecha_nac = `${dia}/${meses[mesNombre]}/${anio}`;

          // Intentar recalcular edad
          try {
            const hoy = new Date();
            const d = parseInt(dia), m = parseInt(meses[mesNombre]), a = parseInt(anio);
            let edad = hoy.getFullYear() - a;
            if (hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d)) edad--;
            data.edad = `${edad} años`;
          } catch (e) { }
        }
      }
    }

    return data;
  };

  const procesarOCRReal = async (docKey, file, prevDoc) => {
    Swal.fire({
      title: 'Analizando Documento...',
      html: 'Extrayendo información. <b>Por favor espere.</b>',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const formData = new FormData();
      formData.append('file_id', file);
      const token = localStorage.getItem('token') || sessionStorage.getItem('temp_token');
      const response = await fetch(`${API_BASE}/documentos/ocr`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) throw new Error('Ocurrió un error al cargar el documento');

      // Parsea el HTML del OCR para extraer los datos
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
      let nacionalidadEncontrada = '';
      let edadEncontrada = '';
      let sexoEncontrado = '';
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
        if (label.includes('nacionalidad')) nacionalidadEncontrada = value;

        if (label.includes('fecha de nacimiento') || label.includes('fecha nac') || (label.includes('nacimiento') && !label.includes('lugar'))) {
          let dateVal = value;
          if (dateVal.includes('-')) {
            const p = dateVal.split('-');
            if (p.length === 3 && p[0].length === 4) {
              dateVal = `${p[2]}/${p[1]}/${p[0]}`;
            }
          }
          fechaNacEncontrada = dateVal;
        }

        if (label.includes('edad')) edadEncontrada = value;
        if (label.includes('sexo')) sexoEncontrado = value;
        if (label.includes('documento')) documentoEncontrado = value;
      });

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

      const fullNombre = [firstName, lastNamePaterno, lastNameMaterno].filter(Boolean).join(' ') || nombreEncontrado;

      let detectedSexo = sexoEncontrado;
      if (curpEncontrada && curpEncontrada.length >= 11) {
        const char = curpEncontrada.charAt(10).toUpperCase();
        if (char === 'M') detectedSexo = 'FEMENINO';
        else if (char === 'H') detectedSexo = 'MASCULINO';
      }

      let extractedData = {
        curp: curpEncontrada || '',
        nombre: fullNombre || '',
        nombres: firstName || '',
        apellido_paterno: lastNamePaterno || '',
        apellido_materno: lastNameMaterno || '',
        nombreSolo: firstName || '',
        primerApellido: lastNamePaterno || '',
        segundoApellido: lastNameMaterno || '',
        nacionalidad: nacionalidadEncontrada || '',
        fecha_nac: fechaNacEncontrada || '',
        edad: edadEncontrada || '',
        sexo: detectedSexo || '',
        documento: documentoEncontrado || ''
      };

      // --- REFUERZO DESDE EL FRONTEND (RESCATE DE TEXTO CRUDO) ---
      const rawText = doc.querySelector('pre')?.textContent;
      if (rawText && (docKey === 'actaNacimiento' || extractedData.documento?.includes('ACTA'))) {
        extractedData = mejorarExtraccionActa(rawText, extractedData);
      }

      // VALIDACIÓN DE COINCIDENCIA DE TIPO DE DOCUMENTO
      const isActaField = ['acta', 'actaNacimiento'].includes(docKey);
      const isIneField = ['ine', 'ineTutor', 'identificacion'].includes(docKey);
      const isOcrActa = (extractedData.documento || '').toUpperCase() === 'ACTA DE NACIMIENTO';
      const isOcrIne = (extractedData.documento || '').toUpperCase() === 'INE';

      if ((isActaField && isOcrIne) || (isIneField && isOcrActa)) {
        Swal.close();
        const result = await Swal.fire({
          title: 'Este documento no parece ser el que se solicita. ¿Deseas cargarlo de todos modos?',
          text: 'Si el documento no es el correcto, podría ser rechazado durante la validación.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Cargar de todos modos',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#1a3b5c',
          cancelButtonColor: '#cbd5e1'
        });

        if (!result.isConfirmed) {
          setDocuments(prev => {
            const updated = { ...prev };
            if (prevDoc) {
              updated[docKey] = prevDoc;
            } else {
              delete updated[docKey];
            }
            return updated;
          });
          return;
        }
      }

      setOcrResults(prev => {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        const uInfo = u.usuario || {};
        const regNombre = (uInfo.nombre || u.Nombre || u.NombreUsuario || '').toUpperCase();
        const regTelefono = uInfo.telefono || u.telefono || u.NumeroTelefono || '';
        const { codigoPais: parsedCodigo, telefono: parsedLocal } = parsearTelefonoE164(regTelefono || extractedData.telefono);

        if (parsedCodigo && parsedCodigo !== '+52') {
          setCodigoPais(parsedCodigo);
        }

        return {
          ...prev,
          ...extractedData,
          nombre: regNombre || prev.nombre || (extractedData.nombre || '').toUpperCase(),
          telefono: parsedLocal || prev.telefono || '',
          [docKey]: `OCR Procesado: ${extractedData.nombre}`
        };
      });

      if (extractedData.nombre) {
        Swal.fire({
          title: '¡Lectura Exitosa!',
          text: `Se detectó a: ${extractedData.nombre}`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        Swal.fire({
          title: '¡Lectura Exitosa!',
          text: 'Algunos campos no pudieron ser detectados, ingrésalos manualmente',
          icon: 'warning',
          timer: 3500,
          showConfirmButton: true
        });
      }

    } catch (err) {
      Swal.fire({
        title: 'Error',
        text: 'No se pudo leer el documento de forma automática pero podrás continuar de forma manual.',
        icon: 'warning'
      });
    }
  };

  const safeSetField = (form, fieldName, value, fontSize) => {
    if (value === null || value === undefined || value === '') return;
    try {
      const field = form.getTextField(fieldName);
      if (field) {
        field.setText(String(value));
        if (fontSize) {
          field.setFontSize(fontSize);
        }
      }
    } catch (e) {
      console.warn(`[PDF] Campo no encontrado: "${fieldName}" → omitido.`);
    }
  };

  const handleDownloadFormato = async () => {
    try {
      Swal.fire({
        title: 'Generando PDF...',
        text: 'Preparando tu formato de afiliación pre-llenado.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });

      // Cargar la plantilla real con campos de formulario
      const templateUrl = '/formato_afiliacion_directivo.pdf';
      const existingPdfBytes = await fetch(templateUrl).then(res => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const form = pdfDoc.getForm();
      const firstPage = pdfDoc.getPages()[0];

      // INCRUSTAR FOTOGRAFÍA SI EXISTE
      if (documents.fotografia) {
        try {
          const photoBytes = await documents.fotografia.arrayBuffer();
          let photoImage;
          const nameLower = documents.fotografia.name.toLowerCase();

          if (nameLower.endsWith('.png')) {
            photoImage = await pdfDoc.embedPng(photoBytes);
          } else {
            photoImage = await pdfDoc.embedJpg(photoBytes);
          }

          firstPage.drawImage(photoImage, {
            x: 479,
            y: 676,
            width: 76,
            height: 90,
          });
        } catch (photoErr) {
          console.warn("Error al incrustar foto:", photoErr);
        }
      }

      const { nombreSolo, primerApellido, segundoApellido, nombre, curp, fecha_nac, nacionalidad } = ocrResults;

      let nombresVal = '';
      let apPaternoVal = '';
      let apMaternoVal = '';

      if (nombreSolo || primerApellido || segundoApellido) {
        if (nombreSolo) nombresVal = nombreSolo.toUpperCase();
        if (primerApellido) apPaternoVal = primerApellido.toUpperCase();
        if (segundoApellido) apMaternoVal = segundoApellido.toUpperCase();
      } else if (nombre && nombre !== "No detectado") {
        const parts = nombre.split(' ');
        if (parts.length === 4) {
          nombresVal = parts.slice(0, 2).join(' ').toUpperCase();
          apPaternoVal = parts[2].toUpperCase();
          apMaternoVal = parts[3].toUpperCase();
        } else if (parts.length === 3) {
          nombresVal = parts[0].toUpperCase();
          apPaternoVal = parts[1].toUpperCase();
          apMaternoVal = parts[2].toUpperCase();
        } else if (parts.length === 2) {
          nombresVal = parts[0].toUpperCase();
          apPaternoVal = parts[1].toUpperCase();
        } else {
          nombresVal = nombre.toUpperCase();
        }
      }

      const getFs = (val) => val.length > 35 ? 6 : val.length > 25 ? 7 : val.length > 18 ? 8 : 10;

      if (nombresVal) safeSetField(form, 'Nombres', nombresVal, getFs(nombresVal));
      if (apPaternoVal) safeSetField(form, 'Apellido Paterno', apPaternoVal, getFs(apPaternoVal));
      if (apMaternoVal) safeSetField(form, 'Apellido Materno', apMaternoVal, getFs(apMaternoVal));

      // CURP
      if (curp && curp !== "No detectado") {
        safeSetField(form, 'CURP o Clave Única de Registro de Población', curp);
      }

      // Fecha de Nacimiento
      if (fecha_nac && fecha_nac !== "No detectada") {
        safeSetField(form, 'Fecha de Nacimiento', fecha_nac);
      }

      // Correo electrónico
      const email = user.Correo || user.correo || user.email;
      const emailVal = email || '';
      const emailFontSize = emailVal.length > 35 ? 6 : emailVal.length > 25 ? 7 : emailVal.length > 18 ? 8 : 10;
      safeSetField(form, 'Correo electrónico', emailVal, emailFontSize);

      // Sexo
      let sexoTexto = ocrResults.sexo || '';
      if (!sexoTexto && curp && curp.length >= 11) {
        const sexoChar = curp.charAt(10).toUpperCase();
        sexoTexto = sexoChar === 'H' ? 'MASCULINO' : sexoChar === 'M' ? 'FEMENINO' : '';
      }
      if (sexoTexto) {
        safeSetField(form, 'Sexo', sexoTexto);
      }

      // Nacionalidad / Lugar de Nacimiento
      safeSetField(form, 'Lugar de Nacimiento', nacionalidad);

      // Teléfono (fill_24 en la plantilla directivo — puede no existir)
      safeSetField(form, 'fill_24', asociacion.toUpperCase());
      const telLocalPdf = (ocrResults.telefono || '').replace(/\D/g, '');
      safeSetField(form, 'Teléfono', telLocalPdf ? (codigoPais + telLocalPdf) : '');

      // Tipo de afiliación
      safeSetField(form, 'fill_20', tipoAfiliacion);
      safeSetField(form, 'Tipo', tipoAfiliacion);

      // Asociación, Liga, Equipo
      if (asociacion) safeSetField(form, 'Asociación', asociacion.toUpperCase());
      if (liga) {
        const selectedLigaObj = ligasCatalogo.find(l => String(l.id) === String(liga));
        if (selectedLigaObj) {
          const nameStr = selectedLigaObj.nombre.split('(')[0].trim().toUpperCase();
          const fontSize = nameStr.length > 35 ? 6 : nameStr.length > 25 ? 7 : nameStr.length > 18 ? 8 : 10;
          safeSetField(form, 'Liga', nameStr, fontSize);
        }
      }
      const equipoVal = (ocrResults.equipo || '').toUpperCase();
      const equipoFs = equipoVal.length > 35 ? 6 : equipoVal.length > 25 ? 7 : equipoVal.length > 18 ? 8 : 10;
      safeSetField(form, 'Equipo', equipoVal, equipoFs);

      // Fecha automática (A __ de __ del 20__)
      const hoy = new Date();
      const dia = String(hoy.getDate()).padStart(2, '0');
      const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
      const mes = meses[hoy.getMonth()];
      const anio = String(hoy.getFullYear()).slice(-2);

      safeSetField(form, 'A', dia);
      safeSetField(form, 'de', mes);
      safeSetField(form, 'del 20', anio);

      // Cargo: dinámico de acuerdo a la selección y tamaño de letra ajustado
      const cargoValor = (cargoSeleccionado || 'Presidente Equipo').toUpperCase();
      const cargoFontSize = cargoValor.length > 10 ? 8 : 10;
      safeSetField(form, 'Cargo', cargoValor, cargoFontSize);

      // Generar bytes del PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const safeNombre = (nombre || 'Presidente').toString().replace(/[^a-zA-Z0-9_\s]/g, '').trim();
      const link = document.createElement('a');
      link.href = url;
      link.download = `Formato_Afiliacion_${safeNombre}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      Swal.fire('¡Listo!', 'El formato se ha descargado correctamente.', 'success');
    } catch (err) {
      console.error("Error generando PDF:", err);
      Swal.fire('Error', 'No se pudo generar el PDF. ' + err.message, 'error');
    }
  };


  const procesarFotografia = async (archivo) => {
    Swal.fire({
      title: 'Validando Fotografía...',
      html: 'Verificando formato, rostros y calidad. <b>Por favor espere.</b>',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const data = await validarFotografia(archivo);
      if (data.valido) {
        setFotoPreview(`data:${data.tipo_imagen};base64,${data.imagen}`);
        setDocuments(prev => ({ ...prev, fotografia: archivo }));
        setFotoValidacionFallida(false);
        setFotoArchivoPendiente(null);
        Swal.fire({
          title: '¡Fotografía Aceptada!',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      } else {
        setFotoPreview(null);
        setError(data.mensaje);
        setFotoValidacionFallida(true);
        setFotoArchivoPendiente(archivo);
        Swal.fire({
          title: 'Error de validación',
          text: data.mensaje,
          icon: 'error',
          confirmButtonText: 'Intentar de nuevo',
          confirmButtonColor: COLORS.danger
        });
      }
    } catch (err) {
      setFotoPreview(null);
      setError(err.message || 'No se pudo procesar la foto.');
      setFotoValidacionFallida(true);
      setFotoArchivoPendiente(archivo);
      console.error("Error validando foto:", err);
      Swal.fire({
        title: 'Error de validación',
        text: err.message || 'No se pudo procesar la foto.',
        icon: 'error',
        confirmButtonText: 'Reintentar subir foto',
        confirmButtonColor: COLORS.dangerAccent
      });
    }
  };

  const handleForzarSubidaFoto = () => {
    if (!fotoArchivoPendiente) return;
    setDocuments(prev => ({ ...prev, fotografia: fotoArchivoPendiente }));
    setFotoPreview(URL.createObjectURL(fotoArchivoPendiente));
    setFotoValidacionFallida(false);
    setError(null);
    Swal.fire({
      title: 'Fotografía Cargada',
      text: 'Se ha subido la fotografía omitiendo la validación automática.',
      icon: 'warning',
      confirmButtonColor: COLORS.primary
    });
  };



  const handleManualOcrChange = async (field, value) => {
    if (field === 'nombre') {
      return;
    }

    if (field === 'curp') {
      let extra = {};
      if (value.length >= 11) {
        const char = value.charAt(10).toUpperCase();
        if (char === 'M') extra.sexo = 'FEMENINO';
        else if (char === 'H') extra.sexo = 'MASCULINO';
      }

      setOcrResults(prev => ({
        ...prev,
        [field]: value,
        ...extra,
        actaNacimiento: prev.actaNacimiento || 'Manual',
        identificacion: prev.identificacion || 'Manual'
      }));

      if (value.length === 18) {
        try {
          const res = await verificarCurp(value);
          setCurpExistente(res.existe);
        } catch (error) {
          console.error("Error al verificar CURP", error);
        }
      } else {
        setCurpExistente(false);
      }
    } else {
      setOcrResults(prev => ({
        ...prev,
        [field]: value,
        actaNacimiento: prev.actaNacimiento || 'Manual',
        identificacion: prev.identificacion || 'Manual'
      }));
    }
  };

  const handleLogout = () => {
    // Solo borramos las llaves de sesión (no borramos afaem_pre_registro_guardado)
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('UsuarioId');
    localStorage.removeItem('email');
    localStorage.removeItem('nombre_usuario');
    navigate(ROUTES.HOME);
  };

  const handleSolicitarRegistro = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!nombreEquipoValido) {
        throw new Error('Ya existe un equipo con este nombre registrado en la misma liga. Por favor elige otro.');
      }

      // Validar teléfono obligatorio de 10 dígitos locales
      const telLimpio = (ocrResults.telefono || '').replace(/\D/g, '');
      if (!telLimpio) {
        throw new Error('El teléfono es obligatorio.');
      }
      if (telLimpio.length !== 10) {
        throw new Error('El teléfono debe tener exactamente 10 dígitos locales.');
      }

      // Verify user/persona ID
      let personaId = localStorage.getItem('UsuarioId') || user.id || user.usuario_id || user.UsuarioId;

      // Fallback: Si no está en storage, intentar extraerlo del token
      if (!personaId) {
        const token = localStorage.getItem('token');
        const decoded = parseJwt(token);
        if (decoded && decoded.sub) {
          personaId = decoded.sub;
        }
      }

      if (!personaId) {
        throw new Error('No se encontró el ID del usuario en la sesión.');
      }

      // Verify all 4 documents are present either locally or on the server
      const requiredDocs = ['actaNacimiento', 'identificacion', 'fotografia', 'formatoAfiliacion'];
      const docIdMap = {
        actaNacimiento: 8,
        identificacion: 38,
        fotografia: 37,
        formatoAfiliacion: 10
      };
      for (const docKey of requiredDocs) {
        const docAfiliacionId = docIdMap[docKey];
        const docGuardado = documentosGuardados.find(d => Number(d.DocumentoAfiliacionId || d.documentoAfiliacionId) === Number(docAfiliacionId));

        if (!documents[docKey] && !docGuardado) {
          throw new Error(`Falta subir el documento: ${requisitos.find(r => r.documento === docKey)?.nombre}`);
        }

        if (docGuardado && Number(docGuardado.EstadoValidacionId || docGuardado.estadoValidacionId) === 3 && !documents[docKey]) {
          throw new Error(`Debes reemplazar el documento rechazado: ${requisitos.find(r => r.documento === docKey)?.nombre}`);
        }
      }

      Swal.fire({
        title: 'Subiendo Documentos...',
        html: 'Enviando archivos. <b>Por favor espere.</b>',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });

      const token = localStorage.getItem('token');
      if (!solicitudActualId) {
        throw new Error('No se encontró la solicitud relacionada con tu orden de pago.');
      }

      // ── SUBIDA REAL DE LOS DOCUMENTOS NUEVOS O MODIFICADOS DEL PRESIDENTE ──────────────
      const docMapping = [
        { key: 'actaNacimiento', docAfiliacionId: 8 },
        { key: 'identificacion', docAfiliacionId: 38 },
        { key: 'fotografia', docAfiliacionId: 37 },
        { key: 'formatoAfiliacion', docAfiliacionId: 10 },
      ];

      const formDataDocs = new FormData();
      let filesToUploadCount = 0;
      for (const { key, docAfiliacionId } of docMapping) {
        if (documents[key]) {
          formDataDocs.append('documento_afiliacion_ids', docAfiliacionId);
          formDataDocs.append('archivo', documents[key]);
          filesToUploadCount++;
        }
      }
      if (solicitudActualId) {
        formDataDocs.append('solicitud_id', solicitudActualId);
      }

      if (filesToUploadCount > 0) {
        const resUpload = await fetch(`${API_BASE}/documentos/`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formDataDocs
        });

        if (!resUpload.ok) {
          const errData = await resUpload.json().catch(() => ({}));
          throw new Error(`Error al subir documentos: ${errData.detail || resUpload.statusText}`);
        }
      }

      // ── MARCAR SOLICITUD COMO ENVIADA (Status 1 = ESPERA) ─────────
      if (solicitudActualId) {
        let sexoIdVal = null;
        if (ocrResults.sexo === 'MASCULINO') sexoIdVal = 1;
        else if (ocrResults.sexo === 'FEMENINO') sexoIdVal = 2;
        else if (ocrResults.sexo === 'NO BINARIO') sexoIdVal = 3;

        const queryParams = new URLSearchParams({
          solicitud_id: solicitudActualId
        });
        if (ocrResults.curp) queryParams.append('curp', ocrResults.curp);
        if (sexoIdVal) queryParams.append('sexo_id', sexoIdVal);
        if (ocrResults.fecha_nac) {
          queryParams.append('fecha_nacimiento', convertToYYYYMMDD(ocrResults.fecha_nac));
        }
        if (liga) {
          queryParams.append('liga_id', liga);
        }
        if (ocrResults.equipo) {
          queryParams.append('nombre_equipo', ocrResults.equipo.trim());
        }
        if (tipoAfiliacion) {
          queryParams.append('afiliacion', tipoAfiliacion);
        }
        const telLimpio = (ocrResults.telefono || '').replace(/\D/g, '');
        if (telLimpio) {
          queryParams.append('telefono', codigoPais + telLimpio);
        }
        if (ocrResults.nacionalidad) {
          queryParams.append('lugar_nacimiento', ocrResults.nacionalidad.trim());
        }

        const resCompleta = await fetch(`${API_BASE}/solicitud/solicitud-completa?${queryParams.toString()}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!resCompleta.ok) {
          const errData = await resCompleta.json().catch(() => ({}));
          throw new Error(errData.detail || 'No se pudo cambiar el estado de la solicitud a ESPERA.');
        }
      }

      // Save pre-registro data strictly for frontend state tracking
      const preRegistroData = {
        numPersonas,
        asignacionSeguros,
        tipoAfiliacion,
        totalPagar,
        fechaRegistro: new Date().toISOString()
      };
      localStorage.setItem('afaem_pre_registro', JSON.stringify(preRegistroData));

      // Refresh RBAC permissions before navigating
      if (refreshAccess) await refreshAccess();

      Swal.fire({
        title: '¡Registro Exitoso!',
        text: 'Tus documentos han sido subidos correctamente. El administrador procederá a validarlos.',
        icon: 'success',
        confirmButtonColor: COLORS.primary
      }).then(() => {
        setEstadoSolicitud(1);
        setPasoActual(4); // Ir a la pantalla de revisión
      });

    } catch (err) {
      console.error("Error en upload:", err);
      setError(err.message || 'Error al enviar los documentos.');
      Swal.fire({
        title: 'Error',
        text: err.message || 'No se pudieron subir los documentos.',
        icon: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizarCorreccion = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!nombreEquipoValido) {
        throw new Error('Ya existe un equipo con este nombre registrado en la misma liga. Por favor elige otro.');
      }

      // Verify all 4 documents are approved (2) or en espera (1), none rejected (3)
      const docIdMap = {
        actaNacimiento: 8,
        identificacion: 38,
        fotografia: 37,
        formatoAfiliacion: 10
      };
      const requiredDocs = ['actaNacimiento', 'identificacion', 'fotografia', 'formatoAfiliacion'];
      for (const docKey of requiredDocs) {
        const docAfiliacionId = docIdMap[docKey];
        const docGuardado = documentosGuardados.find(d => Number(d.DocumentoAfiliacionId || d.documentoAfiliacionId) === Number(docAfiliacionId));
        if (!docGuardado) {
          throw new Error(`Falta subir el documento: ${requisitos.find(r => r.documento === docKey)?.nombre}`);
        }
        if (Number(docGuardado.EstadoValidacionId || docGuardado.estadoValidacionId) === 3) {
          throw new Error(`Debes reemplazar el documento rechazado: ${requisitos.find(r => r.documento === docKey)?.nombre}`);
        }
      }

      Swal.fire({
        title: 'Finalizando corrección...',
        html: 'Enviando a revisión. <b>Por favor espere.</b>',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });

      const token = localStorage.getItem('token');
      if (!solicitudActualId) {
        throw new Error('No se encontró la solicitud.');
      }

      // We call the complete registration endpoint so that the status is updated back to 1 (ESPERA)
      let sexoIdVal = null;
      if (ocrResults.sexo === 'MASCULINO') sexoIdVal = 1;
      else if (ocrResults.sexo === 'FEMENINO') sexoIdVal = 2;
      else if (ocrResults.sexo === 'NO BINARIO') sexoIdVal = 3;

      const queryParams = new URLSearchParams({
        solicitud_id: solicitudActualId
      });
      if (ocrResults.curp) queryParams.append('curp', ocrResults.curp);
      if (sexoIdVal) queryParams.append('sexo_id', sexoIdVal);
      if (ocrResults.fecha_nac) {
        queryParams.append('fecha_nacimiento', convertToYYYYMMDD(ocrResults.fecha_nac));
      }
      if (liga) {
        queryParams.append('liga_id', liga);
      }
      if (ocrResults.equipo) {
        queryParams.append('nombre_equipo', ocrResults.equipo.trim());
      }
      if (tipoAfiliacion) {
        queryParams.append('afiliacion', tipoAfiliacion);
      }
      const telLimpio = (ocrResults.telefono || '').replace(/\D/g, '');
      if (telLimpio) {
        queryParams.append('telefono', codigoPais + telLimpio);
      }
      if (ocrResults.nacionalidad) {
        queryParams.append('lugar_nacimiento', ocrResults.nacionalidad.trim());
      }

      const resCompleta = await fetch(`${API_BASE}/solicitud/solicitud-completa?${queryParams.toString()}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!resCompleta.ok) {
        const errData = await resCompleta.json().catch(() => ({}));
        throw new Error(errData.detail || 'No se pudo cambiar el estado de la solicitud a ESPERA.');
      }

      // Refresh RBAC
      if (refreshAccess) await refreshAccess();

      Swal.fire({
        title: '¡Corrección Enviada!',
        text: 'Tus documentos corregidos han sido enviados al administrador para su revisión.',
        icon: 'success',
        confirmButtonColor: COLORS.primary
      }).then(() => {
        setEstadoSolicitud(1);
        setPasoActual(4); // Pantalla de revisión
      });

    } catch (err) {
      console.error("Error en finalizar corrección:", err);
      setError(err.message || 'Error al finalizar la corrección.');
      Swal.fire({
        title: 'Error',
        text: err.message || 'No se pudo finalizar la corrección.',
        icon: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in prereg-dark-page" style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px 20px',
      position: 'relative',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');

        .prereg-dark-page {
          font-family: 'Outfit', 'Inter', -apple-system, sans-serif !important;
          background: radial-gradient(circle at 50% 0%, #0d1425 0%, #030712 100%) !important;

          /* DESIGN SYSTEM COLOR TOKENS */
          --color-bg: #030712;
          --color-surface: #090d16;
          --color-card: #0f1524;
          --color-card-hover: #161e30;
          --color-card-selected: #111c38;

          --color-border: rgba(255, 255, 255, 0.04);
          --color-border-hover: rgba(56, 189, 248, 0.2);
          --color-border-active: rgba(56, 189, 248, 0.6);

          --color-text: #f9fafb;
          --color-text-secondary: #9ca3af;
          --color-text-muted: #6b7280;

          --color-primary: #38bdf8;
          --color-primary-hover: #0ea5e9;
          --color-primary-active: #0284c7;
          --color-success: #10b981;
          --color-danger: #ef4444;

          /* DEPRECATED COMPATIBILITY WRAPPERS */
          --text-main: var(--color-text);
          --text-muted: var(--color-text-secondary);
          --border-light: var(--color-border);
          --card-bg: var(--color-card);
          --bg-main: var(--color-bg);
          --bg-surface: var(--color-surface);
          --bg-glass: var(--color-surface);
        }

        .cuotas-layout {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(240px, 0.5fr);
          gap: 32px;
          align-items: start;
        }

        .insurance-layout-left,
        .insurance-layout-right {
          display: flex;
          flex-direction: column;
          gap: 24px;
          min-width: 0;
        }

        .insurance-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 24px;
        }

        .insurance-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 0;
        }

        .insurance-card-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 20px;
          min-width: 0;
        }

        .insurance-card-list-responsive {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          min-width: 0;
        }

        @media (max-width: 580px) {
          .insurance-card-list-responsive {
            grid-template-columns: 1fr;
          }
        }

        .insurance-player-card {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: nowrap;
          min-width: 0;
        }

        .insurance-player-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
          min-width: 0;
        }

        .insurance-player-name {
          font-size: 15px;
          font-weight: 800;
          color: var(--color-text);
          line-height: 1.25;
          margin: 0;
        }

        .insurance-player-price {
          font-size: 13px;
          color: var(--color-text);
          font-weight: 700;
          white-space: nowrap;
          line-height: 1.2;
        }

        .insurance-player-description {
          font-size: 11.5px;
          color: var(--color-text-secondary);
          margin: 0;
          line-height: 1.35;
        }

        .insurance-player-card .insurance-input {
          flex: 0 0 76px;
          width: 76px;
          min-width: 76px;
          max-width: 100%;
        }

        .insurance-col-title {
          font-size: 14px;
          font-weight: 800;
          color: var(--color-text);
          text-transform: uppercase;
          letter-spacing: 0.75px;
          border-bottom: 2px solid var(--color-border);
          padding-bottom: 8px;
          margin-bottom: 8px;
        }

        .summary-stack {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }

        @media (max-width: 768px) {
          .cuotas-layout {
            grid-template-columns: 1fr;
          }
          .insurance-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (min-width: 769px) and (max-width: 1100px) {
          .cuotas-layout {
            grid-template-columns: minmax(0, 2fr) minmax(240px, 0.5fr);
          }
        }

        /* Force main container cards to look dark/glass-elevated */
        .prereg-dark-page .card {
          background: var(--color-surface) !important;
          border: 1px solid var(--color-border) !important;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.03) !important;
          border-radius: 28px !important;
        }

        .prereg-dark-page .glass {
          background: var(--color-surface) !important;
          border: 1px solid var(--color-border) !important;
          backdrop-filter: blur(24px) !important;
          -webkit-backdrop-filter: blur(24px) !important;
        }

        /* Stepper header styling */
        .prereg-dark-page .card > div:first-child {
          background: rgba(255, 255, 255, 0.005) !important;
          border-bottom: 1px solid var(--color-border) !important;
        }

        /* Summary/bank cards dark system overrides */
        .prereg-dark-page .summary-card {
          background: var(--color-card) !important;
          border: 1px solid var(--color-border) !important;
          border-radius: 20px !important;
          padding: 20px !important;
        }

        .prereg-dark-page .summary-card h5 { 
          color: var(--color-text); 
          font-weight: 800; 
          font-size: 15px; 
        }

        .prereg-dark-page .summary-stack > div {
          background: var(--color-card) !important;
          border: 1px solid var(--color-border) !important;
          border-radius: 16px !important;
        }

        .prereg-dark-page .summary-row { 
          color: var(--color-text-secondary); 
          border-color: var(--color-border) !important; 
          font-size: 13.5px;
        }

        .prereg-dark-page .total-row { 
          color: var(--color-text); 
          border-color: rgba(255, 255, 255, 0.08) !important; 
          font-size: 16px;
          font-weight: 800;
        }

        .prereg-dark-page .bank-info-label { color: var(--color-text-muted); font-weight: 600; }
        .prereg-dark-page .bank-info-value { color: var(--color-text); font-weight: 700; }
        .prereg-dark-page .referencia-badge { 
          background: rgba(56, 189, 248, 0.08) !important; 
          color: var(--color-primary); 
          border: 1px solid rgba(56, 189, 248, 0.15) !important; 
          border-radius: 12px;
          padding: 6px 14px;
          font-weight: 800;
        }

        .prereg-dark-page .assigned-bar {
          background: var(--color-card) !important;
          border: 1px solid var(--color-border) !important;
          color: var(--color-text);
          padding: 10px 16px;
          margin-top: 10px;
          font-size: 13px;
          font-weight: 700;
          border-radius: 12px;
        }

        .prereg-dark-page .pago-card {
          background: var(--color-card) !important;
          border: 1px solid var(--color-border) !important;
          border-radius: 24px !important;
          padding: 30px !important;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45) !important;
        }

        @media (max-width: 768px) {
          .prereg-dark-page .pago-card {
            padding: 20px !important;
          }
        }

        .prereg-dark-page .input-label { 
          color: var(--color-text-secondary); 
          font-weight: 700;
        }

        .prereg-dark-page .section-title-small { 
          color: var(--color-text); 
          font-weight: 800;
        }

        .prereg-dark-page .input-number {
          background: #030712 !important;
          border: 1.5px solid rgba(255, 255, 255, 0.25) !important;
          color: var(--color-text) !important;
          border-radius: 12px;
          padding: 12px 16px;
          transition: all 0.25s ease !important;
          font-weight: 800;
        }

        .prereg-dark-page .input-number:focus {
          background: #000000 !important;
          border-color: var(--color-primary) !important;
          box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2) !important;
          outline: none;
        }

        .prereg-dark-page .insurance-input {
          background: #030712 !important;
          border: 1.5px solid rgba(255, 255, 255, 0.25) !important;
          color: var(--color-text) !important;
          border-radius: 10px;
          width: 76px;
          height: 38px;
          text-align: center;
          font-weight: 800;
          font-size: 15px;
          outline: none;
          box-sizing: border-box;
          transition: all 0.25s ease !important;
        }

        .prereg-dark-page .insurance-input:focus {
          background: #000000 !important;
          border-color: var(--color-primary) !important;
          box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2) !important;
        }

        .prereg-dark-page .insurance-input.error-state {
          border-color: var(--color-danger) !important;
          background: rgba(239, 68, 68, 0.08) !important;
          color: #fca5a5 !important;
        }

        .prereg-dark-page .btn-nav-gray {
          background: rgba(255, 255, 255, 0.03) !important;
          border: 1px solid var(--color-border) !important;
          color: var(--color-text-secondary) !important;
          border-radius: 14px; 
          padding: 12px 30px; 
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s !important;
        }

        .prereg-dark-page .btn-nav-gray:hover {
          background: rgba(255, 255, 255, 0.06) !important;
          color: var(--color-text) !important;
        }

        .prereg-dark-page .btn-nav-blue {
          background: linear-gradient(135deg, var(--color-primary), var(--color-primary-active)) !important;
          color: white !important; 
          border: none !important;
          border-radius: 14px; 
          padding: 12px 30px; 
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(56, 189, 248, 0.15) !important;
          transition: all 0.2s !important;
        }

        .prereg-dark-page .btn-nav-blue:hover {
          transform: translateY(-1.5px) !important;
          box-shadow: 0 8px 24px rgba(56, 189, 248, 0.3) !important;
        }

        .prereg-dark-page .btn-nav-blue:disabled { 
          opacity: 0.3 !important; 
          cursor: not-allowed !important;
          transform: none !important;
          box-shadow: none !important;
        }

        .prereg-dark-page .btn-premium {
          background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%) !important;
          border: none !important;
          color: white !important;
          font-weight: 800;
          font-size: 14.5px;
          text-transform: uppercase;
          letter-spacing: 0.75px;
          border-radius: 14px;
          padding: 14px 44px;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(56, 189, 248, 0.2) !important;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }

        .prereg-dark-page .btn-premium:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 12px 32px rgba(56, 189, 248, 0.35) !important;
          filter: brightness(1.08) !important;
        }

        .prereg-dark-page .footer-nav {
          display: flex; 
          justify-content: space-between;
          padding-top: 24px; 
          margin-top: 16px;
          border-top: 1px solid var(--color-border) !important;
        }

        .insurance-card {
          background: var(--color-card) !important;
          border: 1px solid var(--color-border) !important;
          border-radius: 16px; 
          padding: 16px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }

        .insurance-card:hover {
          background: var(--color-card-hover) !important;
          border-color: var(--color-border-hover) !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.25) !important;
        }

        .insurance-card.active-insurance {
          border-color: var(--color-border-active) !important;
          background: var(--color-card-selected) !important;
          box-shadow: 0 0 20px rgba(56, 189, 248, 0.12) !important;
        }

        .insurance-radio {
          appearance: none;
          -webkit-appearance: none;
          width: 22px;
          height: 22px;
          border: 2px solid rgba(255, 255, 255, 0.15) !important;
          border-radius: 50%;
          outline: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.25s ease !important;
          position: relative;
          background: rgba(0, 0, 0, 0.2) !important;
        }

        .insurance-radio:checked {
          border-color: var(--color-primary) !important;
          box-shadow: 0 0 8px rgba(56, 189, 248, 0.2) !important;
        }

        .insurance-radio:checked::after {
          content: '';
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--color-primary) !important;
          display: block;
        }

        .insurance-info h4 { font-size: 14.5px; font-weight: 800; color: var(--color-text); margin: 0 0 4px; }
        .insurance-info p { font-size: 11.5px; color: var(--color-text-secondary); margin: 0; }

        /* GLASS DOC CARDS */
        .doc-glass-card {
          background: var(--color-card) !important;
          border: 1.5px dashed var(--color-border) !important;
          border-radius: 24px; 
          padding: 24px 16px;
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          text-align: center;
          position: relative; 
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
          backdrop-filter: blur(10px) !important;
        }

        .doc-glass-card:hover {
          transform: translateY(-6px) !important;
          background: var(--color-card-hover) !important;
          border-color: var(--color-border-active) !important; 
          border-style: solid !important;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4) !important;
        }

        .doc-glass-card.uploaded {
          background: rgba(16, 185, 129, 0.02) !important;
          border: 1.5px solid rgba(16, 185, 129, 0.15) !important;
          box-shadow: 0 10px 20px rgba(16, 185, 129, 0.05) !important;
        }

        .doc-glass-card.uploaded:hover { 
          border-color: rgba(16, 185, 129, 0.3) !important; 
          box-shadow: 0 20px 40px rgba(16, 185, 129, 0.1) !important; 
        }

        .doc-glass-icon {
          width: 92px; 
          height: 74px; 
          border-radius: 18px;
          display: flex; 
          align-items: center; 
          justify-content: center;
          font-size: 26px; 
          margin-bottom: 12px;
          background: rgba(255, 255, 255, 0.02) !important;
          border: 1px solid var(--color-border) !important;
          color: var(--color-text-secondary) !important;
          transition: all 0.3s ease !important;
        }

        .doc-glass-card:hover .doc-glass-icon { 
          transform: scale(1.08) rotate(2deg) !important; 
          background: rgba(255, 255, 255, 0.05) !important;
        }

        .doc-status-pill {
          position: absolute; 
          top: 12px; 
          right: 12px;
          padding: 4px 10px; 
          border-radius: 20px;
          font-size: 9px; 
          font-weight: 800; 
          text-transform: uppercase; 
          letter-spacing: 0.8px;
          display: flex; 
          align-items: center; 
          gap: 5px;
        }

        .doc-status-dot { width: 5px; height: 5px; border-radius: 50%; }

        .doc-action-btn {
          flex: 1; 
          padding: 10px 14px; 
          border-radius: 12px;
          font-size: 12px; 
          font-weight: 800; 
          cursor: pointer;
          transition: all 0.2s ease !important;
          display: flex; 
          align-items: center; 
          justify-content: center; 
          gap: 6px;
        }

        .doc-action-btn:hover { transform: translateY(-1.5px) !important; }

        .doc-download-btn {
          flex: 1; 
          padding: 10px 14px; 
          border-radius: 12px;
          font-size: 12px; 
          font-weight: 800; 
          cursor: pointer;
          background: rgba(56, 189, 248, 0.05) !important; 
          border: 1px solid rgba(56, 189, 248, 0.15) !important;
          color: var(--color-primary) !important; 
          transition: all 0.2s ease !important;
          display: flex; 
          align-items: center; 
          justify-content: center; 
          gap: 6px;
        }

        .doc-download-btn:hover {
          background: rgba(56, 189, 248, 0.1) !important; 
          border-color: rgba(56, 189, 248, 0.3) !important;
          transform: translateY(-1.5px) !important; 
          box-shadow: 0 4px 12px rgba(56, 189, 248, 0.15) !important;
        }

        .ocr-panel {
          width: 100%; 
          margin-top: 14px;
          background: rgba(0, 0, 0, 0.2) !important; 
          border: 1px solid rgba(56, 189, 248, 0.1) !important;
          border-radius: 16px; 
          padding: 16px;
        }

        /* PREMIUM INPUTS */
        .premium-input-group { display: flex; flex-direction: column; gap: 6px; }
        
        .premium-label {
          font-size: 10px; 
          font-weight: 800; 
          color: var(--color-text-muted) !important;
          text-transform: uppercase; 
          letter-spacing: 1.2px;
        }

        .premium-input {
          width: 100%; 
          box-sizing: border-box;
          padding: 14px 18px;
          background: var(--color-card) !important;
          border: 1px solid var(--color-border) !important;
          border-radius: 14px; 
          font-size: 14.5px; 
          font-weight: 600;
          color: var(--color-text); 
          outline: none;
          transition: all 0.25s ease !important;
        }

        .premium-input:focus {
          background: rgba(0, 0, 0, 0.25) !important;
          border-color: var(--color-primary) !important;
          box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15) !important;
        }

        .premium-input::placeholder { color: var(--color-text-muted) !important; }
        .premium-input option { background: #0b0f19; color: white; }

        .progress-pill {
          height: 8px; 
          border-radius: 4px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }

        .afaem-logo {
          height: 75px;
          width: auto;
          object-fit: contain;
          filter: drop-shadow(0 0 12px rgba(255, 255, 255, 0.2));
        }

        .fmf-logos {
          display: flex;
          gap: 15px;
          align-items: center;
        }

        .fmf-logos img {
          height: 48px;
          width: auto;
          object-fit: contain;
          opacity: 0.85;
          transition: opacity 0.3s !important;
        }

        .fmf-logos img:hover {
          opacity: 1;
        }

        .doc-cards-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 35px;
        }

        @media (max-width: 900px) {
          .doc-cards-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 480px) {
          .doc-cards-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
        }
      `}</style>

      {/* HEADER LOGOS */}
      <div style={{ width: '95%', maxWidth: '1400px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <img
          src={AfaemLogo}
          alt="AFAEM"
          style={{ height: '70px', width: 'auto', objectFit: 'contain', filter: `drop-shadow(0 0 10px ${COLORS.overlayWhite25})` }}
        />
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <img src={FmfLogo} alt="FMF" style={{ height: '45px', width: 'auto', objectFit: 'contain', opacity: 0.9 }} />
          <img src={AmateurLogo} alt="Amateur" style={{ height: '45px', width: 'auto', objectFit: 'contain', opacity: 0.9 }} />
        </div>
      </div>

      <div className="card glass" style={{ width: '95%', maxWidth: '1400px', padding: 0, overflow: 'hidden' }}>
        {/* PASO 0: BIENVENIDA */}
        {pasoActual === 0 && (
          <div style={{ padding: '60px 40px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '10px' }}>Bienvenido, {user.Nombre || user.NombreUsuario || user.Correo || user.email || 'Usuario'}</h1>
            <p style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '30px' }}>Comencemos con tu registro inicial</p>
            <p style={{ fontSize: '16px', color: 'var(--text-muted)', lineHeight: '1.6', margin: '30px 0', borderTop: '1px solid var(--border-light)', paddingTop: '30px' }}>
              Para activar tu cuenta y comenzar a gestionar tu equipo, necesitamos completar dos pasos.
            </p>
            <button className="btn-premium" onClick={irSiguientePaso} style={{ padding: '14px 60px' }}>Continuar</button>
            <br />
            <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '14px', marginTop: '20px', display: 'inline-block' }} onClick={(e) => { e.preventDefault(); handleLogout(); }}>Cerrar sesión</a>
          </div>
        )}

        {/* ===== GLASS STEPPER HEADER (PASO 1, 2 Y 3) ===== */}
        {(pasoActual === 1 || pasoActual === 3 || pasoActual === 5) && (
          <div style={{
            padding: '12px 24px 10px',
            borderBottom: `1px solid ${COLORS.overlayWhite08}`,
            background: COLORS.overlayWhite03,
            backdropFilter: 'blur(10px)',
          }}>
            <p style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: COLORS.overlayWhite90, letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 12px' }}>
              PROCESO DE ACTIVACIÓN
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* STEP 1 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '18px', height: '18px', borderRadius: '999px',
                  background: pasoActual === 1 ? `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondaryHover})` : COLORS.successBgTranslucent10,
                  border: pasoActual === 1 ? `1px solid ${COLORS.brandBlueLight50}` : `1px solid ${COLORS.successBgTranslucent30}`,
                  boxShadow: pasoActual === 1 ? `0 8px 20px ${COLORS.primaryBgTranslucent40},inset 0 1px 0 ${COLORS.overlayWhite15}` : 'none',
                  transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
                }} />
                <span style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', color: pasoActual === 1 ? COLORS.brandBlueLight : COLORS.successLightTranslucent80 }}>
                  PASO 1: CUOTAS
                </span>
              </div>

              {/* Connector 1 */}
              <div style={{ position: 'relative', width: '80px', height: '2px', margin: '0 10px', marginBottom: '20px' }}>
                <div style={{ position: 'absolute', inset: 0, background: COLORS.overlayWhite08, borderRadius: '2px' }} />
                <div style={{
                  position: 'absolute', top: 0, left: 0, height: '100%',
                  width: pasoActual > 1 ? '100%' : '0%',
                  background: `linear-gradient(90deg, ${COLORS.success}, ${COLORS.successLight})`,
                  borderRadius: '2px', transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                  boxShadow: `0 0 8px ${COLORS.successBgTranslucent40}`,
                }} />
              </div>

              {/* STEP 2 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '18px', height: '18px', borderRadius: '999px',
                  background: pasoActual === 3 ? `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondaryHover})` : (pasoActual > 3 ? COLORS.successBgTranslucent10 : COLORS.overlayWhite04),
                  border: pasoActual === 3 ? `1px solid ${COLORS.brandBlueLight50}` : (pasoActual > 3 ? `1px solid ${COLORS.successBgTranslucent30}` : `1px solid ${COLORS.overlayWhite10}`),
                  boxShadow: pasoActual === 3 ? `0 8px 20px ${COLORS.primaryBgTranslucent40},inset 0 1px 0 ${COLORS.overlayWhite15}` : 'none',
                  transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
                }} />
                <span style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', color: pasoActual === 3 ? COLORS.brandBlueLight : (pasoActual > 3 ? COLORS.successLightTranslucent80 : COLORS.overlayWhite25) }}>
                  PASO 2: DOCUMENTOS
                </span>
              </div>

              {/* Connector 2 */}
              <div style={{ position: 'relative', width: '80px', height: '2px', margin: '0 10px', marginBottom: '20px' }}>
                <div style={{ position: 'absolute', inset: 0, background: COLORS.overlayWhite08, borderRadius: '2px' }} />
                <div style={{
                  position: 'absolute', top: 0, left: 0, height: '100%',
                  width: pasoActual > 3 ? '100%' : '0%',
                  background: `linear-gradient(90deg, ${COLORS.success}, ${COLORS.successLight})`,
                  borderRadius: '2px', transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                  boxShadow: `0 0 8px ${COLORS.successBgTranslucent40}`,
                }} />
              </div>

              {/* STEP 3 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '18px', height: '18px', borderRadius: '999px',
                  background: pasoActual === 5 ? `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondaryHover})` : COLORS.overlayWhite04,
                  border: pasoActual === 5 ? `1px solid ${COLORS.brandBlueLight50}` : `1px solid ${COLORS.overlayWhite10}`,
                  boxShadow: pasoActual === 5 ? `0 8px 20px ${COLORS.primaryBgTranslucent40},inset 0 1px 0 ${COLORS.overlayWhite15}` : 'none',
                  transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
                }} />
                <span style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', color: pasoActual === 5 ? COLORS.brandBlueLight : COLORS.overlayWhite25 }}>
                  PASO 3: VALIDACIÓN
                </span>
              </div>
            </div>
          </div>
        )}

        {/* PASO 1: CUOTAS */}
        {pasoActual === 1 && (
          <div className="content-body" style={{ padding: '16px 24px' }}>
            {error && (
              <div style={{
                marginBottom: '20px',
                background: COLORS.dangerBgTranslucent10,
                border: `1px solid ${COLORS.dangerBgTranslucent30}`,
                borderRadius: '12px',
                padding: '12px 16px',
                color: 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span style={{ fontSize: '16px' }}>⚠️</span>
                <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', fontWeight: '700' }}>{error}</p>
              </div>
            )}

            {estadoPago === 4 && (
              <div style={{
                marginBottom: '20px',
                background: COLORS.dangerBgTranslucent10,
                border: `1px solid ${COLORS.dangerBgTranslucent30}`,
                borderRadius: '12px',
                padding: '12px 16px',
                color: 'var(--text-main)'
              }}>
                <h4 style={{ margin: '0 0 4px', color: 'var(--danger)', fontSize: '14px', fontWeight: '800' }}>
                  Tu orden fue rechazada
                </h4>
                <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5' }}>
                  {mensajeRechazoPago || 'Vuelve a subir tu comprobante de pago para continuar con tu registro.'}
                </p>
              </div>
            )}
            <h3 className="section-title-small" style={{ textAlign: 'center', marginBottom: '28px', fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px' }}>Distribución de seguros</h3>

            <div className="cuotas-layout">
              <div className="insurance-layout-left">
                {ordenPendienteId ? (
                  <div style={{
                    background: `linear-gradient(135deg, ${COLORS.successBgTranslucent05} 0%, ${COLORS.greenMediumTranslucent} 100%)`,
                    padding: '20px',
                    borderRadius: '16px',
                    border: `1px solid ${COLORS.successBgTranslucent30}`,
                    marginBottom: '20px',
                    textAlign: 'center',
                    backdropFilter: 'blur(8px)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${COLORS.greenBgTranslucent40}, transparent)` }} />
                    <div style={{
                      display: 'inline-flex', padding: '4px 12px',
                      background: `linear-gradient(135deg, ${COLORS.successBgTranslucent18}, ${COLORS.successBgTranslucent30})`,
                      color: COLORS.successLight, borderRadius: '20px', fontSize: '9px', fontWeight: '800', marginBottom: '10px',
                      border: `1px solid ${COLORS.successBgTranslucent30}`, letterSpacing: '1px', textTransform: 'uppercase',
                      boxShadow: `0 4px 12px ${COLORS.successBgTranslucent}`,
                    }}>
                      ● ORDEN ACTIVA #{ordenPendienteId}
                    </div>
                    <h4 style={{ color: 'var(--text-main)', fontWeight: '800', margin: '0 0 6px 0', fontSize: '16px' }}>Validación en curso</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0, lineHeight: '1.4' }}>
                      Ya tienes una orden activa en el sistema. Para continuar, adjunta tu comprobante de pago.
                    </p>
                  </div>
                ) : (
                  <div className="pago-card">
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.015)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '16px',
                      padding: '24px',
                      marginBottom: '24px'
                    }}>
                      <div className="input-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '20px', width: '100%', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1', minWidth: '240px', textAlign: 'left' }}>
                          <label className="input-label" style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-text)', lineHeight: '1.4' }}>Ingresa la cantidad total de seguros que deseas pagar para tus jugadores</label>
                        </div>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength="2"
                          className="input-number"
                          value={numPersonas}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setNumPersonas(val === '' ? '' : parseInt(val, 10));
                            setError(null);
                          }}
                          style={{ marginTop: '0', width: '100px', height: '48px', fontSize: '20px', textAlign: 'center', borderRadius: '12px' }}
                        />
                      </div>
                    </div>
                    {cargandoSeguros ? (
                      <div className="insurance-card">
                        <div className="insurance-info">
                          <h4>Cargando seguros...</h4>
                          <p>Obteniendo costos actualizados.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="insurance-grid">
                        <div className="insurance-section">
                          <div className="insurance-col-title">Seguros Jugadores.</div>
                          <div className="insurance-card-list-responsive">
                            {segurosJugadores.map(seg => {
                              const cantAsignada = Number(asignacionSeguros[seg.id] || 0);
                              return (
                                <div
                                  key={seg.id}
                                  className={`insurance-card insurance-player-card ${cantAsignada > 0 ? 'active-insurance' : ''}`}
                                  style={{ margin: 0, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '15px', cursor: 'pointer' }}
                                  onClick={() => abrirModalDetalle(seg)}
                                >
                                  {cantAsignada > 0 && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '-8px',
                                      right: '-8px',
                                      background: `linear-gradient(135deg, ${COLORS.success}, ${COLORS.successDark})`,
                                      color: 'white',
                                      fontSize: '11px',
                                      fontWeight: '900',
                                      borderRadius: '50%',
                                      width: '24px',
                                      height: '24px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      boxShadow: `0 4px 10px ${COLORS.successBgTranslucent40}`,
                                      border: `2px solid ${COLORS.slate800}`,
                                      zIndex: 10
                                    }}>
                                      {cantAsignada}
                                    </div>
                                  )}
                                  <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '8px', marginBottom: '12px', textAlign: 'left' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '10px' }}>
                                      <p className="insurance-player-name" style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: 'white' }}>{seg.nombre}</p>
                                      <span className="insurance-player-price" style={{ fontSize: '13px', color: 'white', fontWeight: '700', whiteSpace: 'nowrap' }}>${seg.precio} c/u</span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }} onClick={(e) => e.stopPropagation()}>
                                      <span style={{ fontSize: '11px', color: COLORS.overlayWhite70, fontWeight: '600' }}>Cantidad:</span>
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength="2"
                                        className={`insurance-input ${totalAsignados > segurosRequeridos && cantAsignada > 0 ? 'error-state' : ''}`}
                                        value={asignacionSeguros[seg.id] ?? ''}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => {
                                          const val = e.target.value.replace(/\D/g, '');
                                          setAsignacionSeguros(prev => ({ ...prev, [seg.id]: val === '' ? '' : parseInt(val, 10) }));
                                          setError(null);
                                        }}
                                        style={{ width: '40px', height: '32px', textAlign: 'center', borderRadius: '8px', border: `1px solid ${COLORS.overlayWhite15}`, backgroundColor: COLORS.overlayWhite05, color: 'white', fontWeight: 'bold' }}
                                      />
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => abrirModalDetalle(seg)}
                                    style={{
                                      width: '100%',
                                      padding: '6px 12px',
                                      borderRadius: '10px',
                                      border: cantAsignada > 0 ? `1px solid ${COLORS.secondaryLight}` : `1px solid ${COLORS.overlayWhite10}`,
                                      backgroundColor: cantAsignada > 0 ? COLORS.brandBlueLight10 : COLORS.overlayWhite04,
                                      color: cantAsignada > 0 ? COLORS.secondaryLight : COLORS.overlayWhite70,
                                      fontWeight: '700',
                                      fontSize: '11px',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.5px'
                                    }}
                                    onMouseOver={(e) => {
                                      e.currentTarget.style.backgroundColor = cantAsignada > 0 ? COLORS.brandBlueLight20 : COLORS.overlayWhite08;
                                    }}
                                    onMouseOut={(e) => {
                                      e.currentTarget.style.backgroundColor = cantAsignada > 0 ? COLORS.brandBlueLight10 : COLORS.overlayWhite04;
                                    }}
                                  >
                                    Ver Beneficios
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>


                        <div className="insurance-section">
                          <div className="insurance-col-title">
                            Seguros Presidente.
                          </div>
                          <div className="insurance-card-list-responsive">
                            {segurosPresidente.map(seg => {
                              const checked = Number(asignacionSeguros[seg.id] || 0) > 0;

                              return (
                                <div
                                  key={seg.id}
                                  className={`insurance-card insurance-player-card ${checked ? 'active-insurance' : ''}`}
                                  style={{ margin: 0, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '15px', cursor: 'pointer' }}
                                  onClick={() => abrirModalDetalle(seg)}
                                >
                                  {checked && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '-8px',
                                      right: '-8px',
                                      background: `linear-gradient(135deg, ${COLORS.brandBlueLight}, ${COLORS.secondaryDark})`,
                                      color: 'white',
                                      fontSize: '11px',
                                      fontWeight: '900',
                                      borderRadius: '50%',
                                      width: '24px',
                                      height: '24px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      boxShadow: `0 4px 10px ${COLORS.brandBlueLight50}`,
                                      border: `2px solid ${COLORS.slate800}`,
                                      zIndex: 10
                                    }}>
                                      ✓
                                    </div>
                                  )}

                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation(); // Avoid opening modal
                                      const next = { ...asignacionSeguros };
                                      segurosPresidente.forEach(item => {
                                        next[item.id] = item.id === seg.id ? 1 : 0;
                                      });
                                      setAsignacionSeguros(next);
                                      setError(null);
                                    }}
                                    style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '8px', marginBottom: '12px', cursor: 'pointer', textAlign: 'left' }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '10px' }}>
                                      <p className="insurance-player-name" style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: 'white' }}>{seg.nombre}</p>
                                      <span className="insurance-player-price" style={{ fontSize: '13px', color: 'white', fontWeight: '700', whiteSpace: 'nowrap' }}>${seg.precio} c/u</span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                      <input
                                        type="radio"
                                        name="seguroPresidenteRadioCard"
                                        checked={checked}
                                        onChange={() => { }} // click en fila maneja el cambio
                                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: COLORS.secondary, margin: 0 }}
                                      />
                                      <span style={{ fontSize: '11px', color: COLORS.overlayWhite70, fontWeight: '600' }}>Seleccionar</span>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => abrirModalDetalle(seg)}
                                    style={{
                                      width: '100%',
                                      padding: '6px 12px',
                                      borderRadius: '10px',
                                      border: checked ? `1px solid ${COLORS.secondaryLight}` : `1px solid ${COLORS.overlayWhite10}`,
                                      backgroundColor: checked ? COLORS.brandBlueLight10 : COLORS.overlayWhite04,
                                      color: checked ? COLORS.secondaryLight : COLORS.overlayWhite70,
                                      fontWeight: '700',
                                      fontSize: '11px',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.5px'
                                    }}
                                    onMouseOver={(e) => {
                                      e.currentTarget.style.backgroundColor = checked ? COLORS.brandBlueLight20 : COLORS.overlayWhite08;
                                    }}
                                    onMouseOut={(e) => {
                                      e.currentTarget.style.backgroundColor = checked ? COLORS.brandBlueLight10 : COLORS.overlayWhite04;
                                    }}
                                  >
                                    Ver Beneficios / Seleccionar
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="assigned-bar">
                      <span>Seguros asignados: {totalAsignados}/{segurosRequeridos}</span>
                      {Number(numPersonas || 0) > 0 && totalAsignados === segurosRequeridos ? (
                        <span style={{ color: COLORS.successLight, fontWeight: '800' }}>✓ Todos asignados</span>
                      ) : (
                        <span style={{ color: COLORS.dangerLight, fontWeight: '800' }}>
                          {totalAsignados > segurosRequeridos ? '● Límite excedido' : '● Pendientes'}
                        </span>
                      )}
                    </div>
                  </div>
                )}

              </div>

              <div className="insurance-layout-right">
                <div className="summary-stack">
                  {/* Resumen de cuotas */}
                  <div style={{
                    background: COLORS.overlayWhite04,
                    border: `1px solid ${COLORS.overlayWhite08}`,
                    borderRadius: '16px', padding: '16px',
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg,transparent,${COLORS.brandBlueLight50},transparent)` }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <div style={{ width: '4px', height: '18px', background: `linear-gradient(180deg,${COLORS.brandBlueLight},${COLORS.primary})`, borderRadius: '4px' }} />
                      <h5 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: COLORS.overlayWhite85 }}>
                        {ordenPendienteId ? 'Detalles de la Orden' : 'Resumen de pago'}
                      </h5>
                    </div>
                    {ordenPendienteId && detalleInscripciones
                      .filter(detalle => {
                        const tafId = Number(detalle.TipoAfiliacionId || detalle.tipo_afiliacion_id);
                        return tafId !== 2 && tafId !== 4;
                      })
                      .map(detalle => (
                        <div key={detalle.OrdenPagoDetalleId || `${detalle.TipoAfiliacionId}-${detalle.Cantidad}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${COLORS.overlayWhite05}`, fontSize: '12px' }}>
                          <span style={{ color: COLORS.overlayWhite60 }}>{nombreAfiliacion(detalle.TipoAfiliacionId || detalle.tipo_afiliacion_id)} (x{detalle.Cantidad || detalle.cantidad})</span>
                          <span style={{ color: COLORS.overlayWhite85, fontWeight: '700' }}>${Number(detalle.Subtotal || detalle.subtotal || 0)}</span>
                        </div>
                      ))}
                    {catalogoSeguros.map(seg =>
                      asignacionSeguros[seg.id] > 0 && (
                        <div key={seg.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${COLORS.overlayWhite05}`, fontSize: '12px' }}>
                          <span style={{ color: COLORS.overlayWhite60 }}>{seg.nombre} (x{asignacionSeguros[seg.id]})</span>
                          <span style={{ color: COLORS.overlayWhite85, fontWeight: '700' }}>${seg.precio * asignacionSeguros[seg.id]}</span>
                        </div>
                      )
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', fontSize: '14px', fontWeight: '800' }}>
                      <span style={{ color: COLORS.overlayWhite70 }}>Total {ordenPendienteId ? 'a pagar' : 'estimado'}:</span>
                      <span style={{ color: COLORS.brandBlueLight }}>${totalMostrado}</span>
                    </div>
                    <button
                      className="btn-nav-blue"
                      onClick={irSiguientePaso}
                      disabled={!ordenPendienteId ? (numPersonas <= 0 || totalAsignados !== segurosRequeridos) : !comprobantePago}
                      title={!ordenPendienteId
                        ? (numPersonas <= 0
                          ? 'Ingresa la cantidad de jugadores para continuar'
                          : (totalAsignados !== segurosRequeridos
                            ? 'La cantidad de seguros asignados debe coincidir con la cantidad total de seguros a pagar'
                            : ''))
                        : ''}
                      style={{ padding: '10px 24px', marginTop: '16px', width: '100%' }}
                    >
                      {ordenPendienteId ? 'Finalizar' : 'Siguiente'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {ordenPendienteId && (
              <div style={{
                marginTop: '20px',
                background: COLORS.primaryBgTranslucent,
                border: `1.5px dashed ${comprobanteDragActive ? COLORS.brandBlueLight : COLORS.brandBlueLight30}`,
                borderRadius: '16px',
                padding: '18px 20px',
                backdropFilter: 'blur(8px)',
                transition: 'border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease',
                boxShadow: comprobanteDragActive ? `0 0 0 3px ${COLORS.brandBlueLight20}` : 'none',
                backgroundColor: comprobanteDragActive ? COLORS.brandBlueLight10 : COLORS.primaryBgTranslucent,
              }}>
                <p style={{ fontSize: '13px', fontWeight: '800', color: COLORS.brandBlueLight, marginBottom: '4px' }}>
                  Paso 2: Sube tu comprobante de pago
                </p>
                <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Adjunta el comprobante (PDF o imagen) para procesar tu registro.
                </p>
                <div
                  className="file-input-custom"
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setComprobanteDragActive(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!comprobanteDragActive) setComprobanteDragActive(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.currentTarget.contains(e.relatedTarget)) return;
                    setComprobanteDragActive(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setComprobanteDragActive(false);
                    const file = e.dataTransfer?.files?.[0];
                    manejarArchivoComprobante(file);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}
                >
                  <input
                    type="file"
                    id="comprobante"
                    style={{ display: 'none' }}
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (!manejarArchivoComprobante(file)) {
                        e.target.value = '';
                      }
                    }}
                  />
                  <button
                    className="btn-outline"
                    onClick={() => document.getElementById('comprobante').click()}
                    style={{ padding: '8px 16px' }}
                  >
                    {comprobantePago ? 'Cambiar archivo' : 'Seleccionar archivo'}
                  </button>
                  {comprobantePago && (
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => setPreviewDoc({ file: comprobantePago, title: 'Comprobante de pago' })}
                      style={{ padding: '8px 16px' }}
                    >
                      Ver archivo
                    </button>
                  )}
                  {ordenPendienteId && (
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => generarPDFCuota(ordenPendienteId)}
                      style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', color: COLORS.secondaryLight, borderColor: COLORS.brandBlueLight50 }}
                    >
                      <FaFileAlt /> Descargar Orden de Pago
                    </button>
                  )}
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {comprobantePago ? comprobantePago.name : 'No se ha seleccionado archivo'}
                  </span>
                  <span style={{ width: '100%', fontSize: '11px', color: comprobanteDragActive ? COLORS.brandBlueLight : 'var(--text-muted)' }}>
                    Arrastra y suelta tu comprobante aquí, o selecciónalo manualmente.
                  </span>
                </div>
              </div>
            )}


            <div className="footer-nav">
              <button className="btn-nav-gray" onClick={irPasoAnterior} style={{ padding: '10px 24px' }}>Regresar</button>
            </div>
          </div>
        )}

        {/* PASO 2: ESPERANDO VALIDACIÓN / PAGO VALIDADO */}
        {pasoActual === 2 && (
          <div className="welcome-content">
            {estadoPago === 3 ? (
              /* PAGO VALIDADO */
              <div className="fade-in" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
                textAlign: 'center',
                minHeight: '400px'
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  background: COLORS.successBgTranslucent10,
                  color: 'var(--secondary)',
                  marginBottom: '25px',
                  border: `2px solid ${COLORS.successBgTranslucent18}`
                }}>
                  <FaCheckCircle />
                </div>

                <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '15px' }}>
                  ¡Bienvenido, {user.Nombre || user.NombreUsuario || user.Correo || user.email || 'Usuario'}!
                </h1>

                <div style={{ maxWidth: '500px' }}>
                  <div style={{
                    display: 'inline-block',
                    background: COLORS.successBgTranslucent10,
                    color: 'var(--secondary)',
                    padding: '8px 20px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '800',
                    marginBottom: '20px',
                    border: `1px solid ${COLORS.successBgTranslucent18}`
                  }}>
                    PAGO VALIDADO
                  </div>
                  <p style={{ fontSize: '16px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '30px' }}>
                    Tu comprobante de pago ha sido verificado correctamente. Ahora puedes continuar con la carga de los documentos.
                  </p>
                  <button className="btn-premium" style={{ padding: '16px 60px' }} onClick={() => setPasoActual(3)}>
                    Continuar con documentos
                  </button>
                  <br />
                  <button style={{
                    marginTop: '20px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }} onClick={handleLogout}>Cerrar sesión</button>
                </div>
              </div>
            ) : estadoPago === 4 ? (
              /* PAGO RECHAZADO */
              <div className="fade-in" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
                textAlign: 'center',
                minHeight: '400px'
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  background: COLORS.dangerBgTranslucent10,
                  color: 'var(--danger)',
                  marginBottom: '25px',
                  border: `2px solid ${COLORS.dangerBgTranslucent}`
                }}>
                  <FaTimesCircle />
                </div>

                <h1 style={{ fontSize: '30px', fontWeight: '800', color: 'var(--danger)', marginBottom: '15px' }}>
                  Un administrador ha revisado el pago y haz sido rechazado
                </h1>

                <div style={{ maxWidth: '500px' }}>
                  <div style={{
                    display: 'inline-block',
                    background: COLORS.dangerBgTranslucent10,
                    color: 'var(--danger)',
                    padding: '8px 20px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '800',
                    marginBottom: '20px',
                    border: `1px solid ${COLORS.dangerBgTranslucent}`
                  }}>
                    PAGO DENEGADO
                  </div>
                  <div style={{ background: COLORS.dangerBgTranslucent05, border: `1px solid ${COLORS.dangerBgTranslucent}`, borderRadius: '16px', padding: '20px', marginBottom: '30px', textAlign: 'left' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: '800', color: 'var(--danger)' }}>Administrador: haz sido rechazado por este motivo:</h4>
                    <p style={{ fontSize: '14px', color: 'var(--text-main)', fontStyle: 'italic', margin: 0 }}>
                      "{mensajeRechazoPago || 'El comprobante de pago no fue aceptado. Por favor, revisa tus datos y sube un comprobante válido.'}"
                    </p>
                  </div>

                  <button className="btn-premium" style={{ padding: '16px 60px' }} onClick={() => {
                    setEstadoPago(null);
                    setPasoActual(1);
                  }}>
                    Subir nuevo comprobante
                  </button>
                  <br />
                  <button style={{
                    marginTop: '20px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }} onClick={handleLogout}>Cerrar sesión</button>
                </div>
              </div>
            ) : (
              /* ESPERANDO VALIDACIÓN */
              <div className="fade-in" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
                textAlign: 'center',
                minHeight: '400px'
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  background: COLORS.warningBgTranslucent10,
                  color: 'var(--warning)',
                  marginBottom: '25px',
                  border: `2px solid ${COLORS.warningBgTranslucent20}`
                }}>
                  <FaClock />
                </div>

                <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '15px' }}>
                  Tu orden será aprobada pronto
                </h1>

                <div style={{ maxWidth: '500px' }}>
                  <div style={{
                    display: 'inline-block',
                    background: COLORS.warningBgTranslucent10,
                    color: 'var(--warning)',
                    padding: '8px 20px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '800',
                    marginBottom: '20px',
                    border: `1px solid ${COLORS.warningBgTranslucent20}`
                  }}>
                    ORDEN EN ESPERA
                  </div>
                  <p style={{ fontSize: '16px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '30px' }}>
                    Hemos recibido tu comprobante de pago. Tu orden será aprobada pronto y, cuando eso ocurra,
                    podrás continuar con la carga de documentos necesarios para tu afiliación oficial.
                  </p>

                  <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '20px', marginBottom: '30px', textAlign: 'left' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '800', color: 'var(--primary)' }}>Documentos a preparar:</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <span>• Acta de nacimiento</span>
                      <span>• Fotografía reciente</span>
                      <span>• Identificación oficial</span>
                    </div>
                  </div>

                  <button className="btn-premium" style={{ padding: '14px 40px', background: 'var(--text-muted)', boxShadow: 'none' }} onClick={handleLogout}>
                    Cerrar sesión
                  </button>
                  <br />
                </div>
              </div>
            )}
          </div>
        )}

        {/* PASO 3: DOCUMENTOS */}
        {pasoActual === 3 && (
          <div className="content-body" style={{ padding: '40px' }}>
            {estadoSolicitud === 3 && (
              <div style={{
                marginBottom: '24px',
                background: COLORS.dangerBgTranslucent10,
                border: `1px solid ${COLORS.dangerBgTranslucent30}`,
                borderRadius: '18px',
                padding: '18px 20px',
                color: 'var(--text-main)'
              }}>
                <h4 style={{ margin: '0 0 8px', color: 'var(--danger)', fontSize: '15px', fontWeight: '800' }}>
                  Tu solicitud fue rechazada por el siguiente motivo:
                </h4>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                  {mensajeRechazoSolicitud || 'Vuelve a subir tus documentos para continuar con tu solicitud.'}
                </p>
              </div>
            )}

            {/* HEADER DE SECCIÓN */}
            <div style={{ textAlign: 'center', marginBottom: '35px' }}>
              <h3 style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-main)', margin: '0 0 8px' }}>
                Sube tus documentos
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
                Asegúrate de que sean legibles. Formatos: PDF, PNG o JPG
              </p>
            </div>

            {/* DATOS DE REGISTRO — PREMIUM GLASS */}
            <div style={{
              background: `linear-gradient(135deg, ${COLORS.primaryBgTranslucent} 0%, ${COLORS.overlaySlateSuperLight} 100%)`,
              border: `1px solid ${COLORS.brandBlueLight16}`,
              borderRadius: '24px',
              padding: '28px',
              marginBottom: '35px',
              backdropFilter: 'blur(8px)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Top accent */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${COLORS.brandBlueLight50}, transparent)` }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <div style={{ width: '5px', height: '24px', background: `linear-gradient(180deg, ${COLORS.brandBlueLight}, ${COLORS.primary})`, borderRadius: '4px' }} />
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: 'var(--text-main)' }}>Datos de Registro</h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                <div className="premium-input-group">
                  <label className="premium-label">Asociación</label>
                  <input type="text" value={asociacion} disabled className="premium-input" style={{ backgroundColor: COLORS.slate500, cursor: 'not-allowed' }} />
                </div>
                <div className="premium-input-group">
                  <label className="premium-label">Liga Destino</label>
                  <select
                    value={liga}
                    onChange={(e) => setLiga(e.target.value)}
                    className="premium-input"
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="">Selecciona...</option>
                    {ligasCatalogo.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                  </select>
                </div>
                <div className="premium-input-group">
                  <label className="premium-label">Cargo de afiliación *</label>
                  <select
                    value={cargoSeleccionado}
                    onChange={(e) => setCargoSeleccionado(e.target.value)}
                    className="premium-input"
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="Presidente Equipo">Presidente Equipo</option>
                    <option value="Entrenador">Entrenador</option>
                  </select>
                </div>
                <div className="premium-input-group">
                  <label className="premium-label">Nombre de equipo *</label>
                  <input
                    type="text"
                    placeholder="Nombre del Equipo"
                    value={ocrResults.equipo || ''}
                    onChange={(e) => handleManualOcrChange('equipo', e.target.value.toUpperCase())}
                    className="premium-input"
                  />
                  {nombreEquipoMensaje && (
                    <span style={{
                      fontSize: '11px',
                      color: nombreEquipoValido ? '#2ecc71' : '#e74c3c',
                      marginTop: '4px',
                      display: 'block',
                      fontWeight: 'bold'
                    }}>
                      {nombreEquipoMensaje}
                    </span>
                  )}
                </div>
                <div className="premium-input-group">
                  <label className="premium-label">Tipo de afiliación comprado*</label>
                  <select
                    value={tipoAfiliacion}
                    onChange={(e) => setTipoAfiliacion(e.target.value)}
                    className="premium-input"
                    style={{ cursor: 'not-allowed', backgroundColor: COLORS.overlayWhite05 }}
                    disabled={true}
                  >
                    <option value="">Selecciona...</option>
                    {CATALOGO_ROLES.map(r => <option key={r.valor} value={r.valor}>{r.etiqueta}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* TARJETAS DE DOCUMENTOS */}
            {(() => {
              const esMayorDeEdad = (() => {
                if (!ocrResults.fecha_nac) return false;
                const val = convertToYYYYMMDD(ocrResults.fecha_nac);
                if (!val) return false;
                const fechaDate = new Date(val);
                if (fechaDate.getFullYear() < 1900) return false;
                if (fechaDate.getFullYear() > new Date().getFullYear()) return false;
                const limitDate = new Date(new Date().setFullYear(new Date().getFullYear() - 18));
                return fechaDate <= limitDate;
              })();

              const formatAfiliacionLocked = !(
                ocrResults.equipo && nombreEquipoValido && ocrResults.nombre && ocrResults.curp &&
                ocrResults.fecha_nac && esMayorDeEdad && ocrResults.nacionalidad && ocrResults.sexo &&
                ocrResults.telefono && liga && tipoAfiliacion &&
                documents.actaNacimiento && documents.identificacion && documents.fotografia
              );
              return (
                <div className="doc-cards-grid">
                  {requisitos.map((doc, idx) => {
                    const docIdMap = {
                      actaNacimiento: 8,
                      identificacion: 38,
                      fotografia: 37,
                      formatoAfiliacion: 10
                    };
                    const docAfiliacionId = docIdMap[doc.documento];
                    const docGuardado = documentosGuardados.find(d => Number(d.DocumentoAfiliacionId || d.documentoAfiliacionId) === Number(docAfiliacionId));

                    const hasLocalFile = !!documents[doc.documento];
                    const isUploaded = hasLocalFile || !!docGuardado;
                    const isOcrDoc = ['actaNacimiento', 'identificacion'].includes(doc.documento);
                    const ocrProcessed = isOcrDoc && ocrResults[doc.documento];
                    const icons = { actaNacimiento: '📜', identificacion: '🪪', fotografia: '📸', formatoAfiliacion: '📝' };

                    let statusLabel, statusColor, statusDotColor, statusBg;
                    if (docGuardado) {
                      const estId = Number(docGuardado.EstadoValidacionId || docGuardado.estadoValidacionId);
                      if (estId === 2) {
                        statusLabel = 'Aprobado'; statusColor = COLORS.success; statusDotColor = COLORS.success; statusBg = COLORS.successBgTranslucent10;
                      } else if (estId === 3) {
                        statusLabel = 'Rechazado'; statusColor = COLORS.danger; statusDotColor = COLORS.danger; statusBg = COLORS.dangerBgTranslucent10;
                      } else {
                        statusLabel = 'En espera'; statusColor = COLORS.warning; statusDotColor = COLORS.warning; statusBg = COLORS.warningBgTranslucent12;
                      }
                    } else if (hasLocalFile) {
                      statusLabel = 'Listo'; statusColor = COLORS.successLight; statusDotColor = COLORS.success; statusBg = COLORS.successBgTranslucent10;
                    } else if (ocrProcessed) {
                      statusLabel = 'Procesado'; statusColor = COLORS.successLight; statusDotColor = COLORS.success; statusBg = COLORS.successBgTranslucent10;
                    } else {
                      statusLabel = 'Pendiente'; statusColor = COLORS.warning; statusDotColor = COLORS.warningDark; statusBg = COLORS.warningBgTranslucent12;
                    }

                    const isApproved = docGuardado && Number(docGuardado.EstadoValidacionId || docGuardado.estadoValidacionId) === 2;
                    const isRejected = docGuardado && Number(docGuardado.EstadoValidacionId || docGuardado.estadoValidacionId) === 3;

                    return (
                      <div
                        key={idx}
                        className={`doc-glass-card${isUploaded ? ' uploaded' : ''}`}
                        onClick={() => {
                          if (isApproved) return;
                          if (doc.documento === 'formatoAfiliacion' && formatAfiliacionLocked) {
                            return Swal.fire('Acción requerida', 'Debes completar todos los datos de identidad y documentos anteriores antes de subir el formato de afiliación.', 'warning');
                          }
                          if (doc.documento !== 'formatoAfiliacion') {
                            const inputId = `file-${doc.documento}`;
                            Swal.fire(buildCaptureSourceDialog(getCameraCaptureKind(doc.documento), COLORS)).then((result) => {
                              if (result.isConfirmed) {
                                setCameraTargetKey(inputId);
                                setIsCameraOpen(true);
                              } else if (result.dismiss === Swal.DismissReason.cancel) {
                                document.getElementById(inputId)?.click();
                              }
                            });
                            return;
                          }
                          if (doc.documento === 'fotografia') {
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
                                setCameraTargetKey('file-fotografia');
                                setIsCameraOpen(true);
                              } else if (result.dismiss === Swal.DismissReason.cancel) {
                                document.getElementById(`file-${doc.documento}`).click();
                              }
                            });
                          } else {
                            document.getElementById(`file-${doc.documento}`).click();
                          }
                        }}
                        onDragEnter={(e) => { if (!isApproved && !(doc.documento === 'formatoAfiliacion' && formatAfiliacionLocked)) { e.preventDefault(); e.stopPropagation(); setDragActive(prev => ({ ...prev, [doc.documento]: true })); } }}
                        onDragOver={(e) => { if (!isApproved && !(doc.documento === 'formatoAfiliacion' && formatAfiliacionLocked)) { e.preventDefault(); e.stopPropagation(); } }}
                        onDragLeave={(e) => { if (!isApproved && !(doc.documento === 'formatoAfiliacion' && formatAfiliacionLocked)) { e.preventDefault(); e.stopPropagation(); setDragActive(prev => ({ ...prev, [doc.documento]: false })); } }}
                        onDrop={(e) => {
                          if (isApproved) return;
                          if (doc.documento === 'formatoAfiliacion' && formatAfiliacionLocked) {
                            e.preventDefault();
                            e.stopPropagation();
                            return Swal.fire('Acción requerida', 'Debes completar todos los datos de identidad y documentos anteriores antes de subir el formato de afiliación.', 'warning');
                          }
                          e.preventDefault();
                          e.stopPropagation();
                          setDragActive(prev => ({ ...prev, [doc.documento]: false }));
                          const file = e.dataTransfer.files[0];
                          if (file) {
                            if (!validarArchivoPermitido(file)) return;
                            if (docGuardado) {
                              handleReemplazarDocumento(docAfiliacionId, file);
                              setDocuments(prev => ({ ...prev, [doc.documento]: file }));
                            } else {
                              handleFileUpload(doc.documento, file);
                            }
                          }
                        }}
                        style={{
                          cursor: isApproved ? 'default' : (doc.documento === 'formatoAfiliacion' && formatAfiliacionLocked ? 'not-allowed' : 'pointer'),
                          border: dragActive[doc.documento] ? `2px solid ${COLORS.primary}` : (isUploaded ? `2px solid ${COLORS.success}` : `2px dashed ${COLORS.slate300}`),
                          backgroundColor: dragActive[doc.documento] ? 'rgba(26, 59, 92, 0.05)' : undefined
                        }}
                      >
                        {/* Top sheen */}
                        <div className="top-sheen" style={{ background: isUploaded ? `linear-gradient(90deg,transparent,${COLORS.successBgTranslucent40},transparent)` : `linear-gradient(90deg,transparent,${COLORS.overlayWhite06},transparent)` }} />
                        {/* Status pill */}
                        <div className="doc-status-pill" style={{ background: statusBg, color: statusColor }}>
                          <div className="doc-status-dot" style={{ background: statusDotColor, boxShadow: `0 0 5px ${statusDotColor}` }} />
                          {statusLabel}
                        </div>
                        {/* Icon */}
                        <div className="doc-glass-icon" style={{
                          background: isUploaded ? `linear-gradient(135deg,${COLORS.successBgTranslucent10},${COLORS.greenMediumTranslucent})` : `linear-gradient(135deg,${COLORS.primaryBgTranslucent},${COLORS.overlaySlateSuperLight})`,
                          border: isUploaded ? `1px solid ${COLORS.successBgTranslucent18}` : `1px solid ${COLORS.brandBlueLight12}`,
                        }}>
                          {isUploaded ? (
                            <span>{icons[doc.documento]}</span>
                          ) : (
                            <div style={{ width: '100%', textAlign: 'center', color: COLORS.slate400, cursor: 'pointer' }}>
                              <FaUpload style={{ fontSize: '28px', marginBottom: '6px' }} />
                              <p style={{ margin: 0, fontSize: '10px', fontWeight: '800' }}>SUBIR ARCHIVO</p>
                            </div>
                          )}
                        </div>
                        {/* Title */}
                        <h4 style={{ fontSize: '14px', fontWeight: '800', color: isUploaded ? COLORS.successLight : 'var(--text-main)', margin: '0 0 5px' }}>
                          {doc.nombre}
                        </h4>
                        {doc.documento === 'fotografia' && (
                          <p style={{ fontSize: '11px', color: COLORS.overlayWhite60, margin: '5px 0 10px', fontStyle: 'italic', lineHeight: '1.4' }}>
                            Mantén una postura recta, visibilidad de hombros, sin sonrisa, ni accesorios como lentes, aretes o gorras.
                          </p>
                        )}
                        {/* Filename */}
                        <p style={{ fontSize: '10px', color: isUploaded ? COLORS.successLightTranslucent80 : 'var(--text-muted)', margin: '0 0 18px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90%' }}>
                          {hasLocalFile ? `📎 ${documents[doc.documento].name}` : (docGuardado ? '📎 Archivo enviado' : 'Sin archivo seleccionado')}
                        </p>
                        {/* Rejection reason display */}
                        {isRejected && docGuardado.ObservacionesDocumento && (
                          <div style={{ background: COLORS.dangerBgTranslucent, color: COLORS.dangerLight, padding: '10px 14px', border: `1px solid ${COLORS.dangerBgTranslucent30}`, borderRadius: '10px', fontSize: '11px', fontWeight: '700', marginBottom: '14px', width: '100%', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            Motivo de rechazo: {docGuardado.ObservacionesDocumento}
                          </div>
                        )}
                        {/* Photo error */}
                        {error && doc.documento === 'fotografia' && (
                          <div style={{ background: COLORS.dangerBgTranslucent10, color: 'var(--danger)', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '600', marginBottom: '14px', width: '100%', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            ⚠️ {error}
                          </div>
                        )}
                        {/* Photo validation bypass button */}
                        {fotoValidacionFallida && doc.documento === 'fotografia' && fotoArchivoPendiente && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleForzarSubidaFoto(e);
                            }}
                            className="doc-action-btn"
                            style={{
                              border: `1px solid ${COLORS.warningBgTranslucent40}`,
                              background: COLORS.warningBgTranslucent,
                              color: COLORS.warning,
                              marginBottom: '14px',
                              width: '100%',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            ⚠️ Omitir validación y usar esta foto
                          </button>
                        )}
                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '8px', width: '100%', flexWrap: 'wrap' }}>
                          {doc.hasDownload && !isApproved && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (doc.documento === 'formatoAfiliacion' && formatAfiliacionLocked) {
                                  e.preventDefault();
                                  return Swal.fire('Acción requerida', 'Debes completar todos los datos de identidad y documentos anteriores antes de descargar el formato de afiliación pre-llenado.', 'warning');
                                }
                                handleDownloadFormato(e);
                              }}
                              className="doc-download-btn"
                              style={doc.documento === 'formatoAfiliacion' && formatAfiliacionLocked ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                            >⬇ Descargar</button>
                          )}
                          {!isApproved && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (doc.documento === 'formatoAfiliacion' && formatAfiliacionLocked) {
                                  return Swal.fire('Acción requerida', 'Debes completar todos los datos de identidad y documentos anteriores antes de subir el formato de afiliación.', 'warning');
                                }
                                if (doc.documento !== 'formatoAfiliacion') {
                                  const inputId = `file-${doc.documento}`;
                                  Swal.fire(buildCaptureSourceDialog(getCameraCaptureKind(doc.documento), COLORS)).then((result) => {
                                    if (result.isConfirmed) {
                                      setCameraTargetKey(inputId);
                                      setIsCameraOpen(true);
                                    } else if (result.dismiss === Swal.DismissReason.cancel) {
                                      document.getElementById(inputId)?.click();
                                    }
                                  });
                                  return;
                                }
                                if (doc.documento === 'fotografia') {
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
                                      setCameraTargetKey('file-fotografia');
                                      setIsCameraOpen(true);
                                    } else if (result.dismiss === Swal.DismissReason.cancel) {
                                      document.getElementById(`file-${doc.documento}`).click();
                                    }
                                  });
                                } else {
                                  document.getElementById(`file-${doc.documento}`).click();
                                }
                              }}
                              className="doc-action-btn"
                              style={{
                                border: isUploaded ? `1px solid ${COLORS.successBgTranslucent30}` : `1px solid ${COLORS.overlayWhite10}`,
                                background: isUploaded ? COLORS.successBgTranslucent10 : COLORS.overlayWhite04,
                                color: isUploaded ? COLORS.successLight : 'var(--text-muted)',
                                opacity: doc.documento === 'formatoAfiliacion' && formatAfiliacionLocked ? 0.5 : 1,
                                cursor: doc.documento === 'formatoAfiliacion' && formatAfiliacionLocked ? 'not-allowed' : 'pointer',
                                flex: 1
                              }}
                            >
                              {hasLocalFile ? 'Cambiar' : (docGuardado ? 'Reemplazar' : (error && doc.documento === 'fotografia' ? '🔄 Reintentar' : '⬆ Subir'))}
                            </button>
                          )}
                          {hasLocalFile && documents[doc.documento] && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewDoc({ file: documents[doc.documento], title: doc.nombre });
                                }}
                                className="doc-action-btn"
                                style={{
                                  border: `1px solid ${COLORS.brandBlueLight50}`,
                                  background: COLORS.brandBlueLight10,
                                  color: COLORS.secondaryLight,
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  flex: 1
                                }}
                              >
                                👁 Ver
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDocuments(prev => ({ ...prev, [doc.documento]: null }));
                                  if (setPreviews) {
                                    setPreviews(prev => ({ ...prev, [doc.documento]: null }));
                                  }
                                }}
                                className="doc-action-btn"
                                style={{
                                  border: `1px solid ${COLORS.dangerBgTranslucent30}`,
                                  background: COLORS.dangerBgTranslucent10,
                                  color: COLORS.dangerLight,
                                  cursor: 'pointer',
                                  flex: '0 0 auto',
                                  width: '40px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <FaTrash />
                              </button>
                            </>
                          )}
                          {!hasLocalFile && docGuardado && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openSecurePath(docGuardado.Url || docGuardado.url);
                              }}
                              className="doc-action-btn"
                              style={{
                                border: `1px solid ${COLORS.brandBlueLight50}`,
                                background: COLORS.brandBlueLight10,
                                color: COLORS.secondaryLight,
                                fontWeight: '700',
                                cursor: 'pointer',
                                flex: 1
                              }}
                            >
                              👁 Ver
                            </button>
                          )}
                          <input
                            type="file"
                            id={`file-${doc.documento}`}
                            style={{ display: 'none' }}
                            accept=".pdf,.png,.jpg,.jpeg"
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (!file) return;
                              if (!validarArchivoPermitido(file)) {
                                e.target.value = '';
                                return;
                              }
                              if (docGuardado) {
                                handleReemplazarDocumento(docAfiliacionId, file);
                                setDocuments(prev => ({ ...prev, [doc.documento]: file }));
                              } else {
                                handleFileUpload(doc.documento, file);
                              }
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* FORMULARIO MANUAL DE IDENTIDAD */}
            <div style={{
              background: `linear-gradient(135deg, ${COLORS.brandBlueLight06} 0%, ${COLORS.overlaySlateSuperLight} 100%)`,
              border: `1px solid ${COLORS.brandBlueLight20}`,
              borderRadius: '24px',
              padding: '28px',
              marginBottom: '35px',
              backdropFilter: 'blur(8px)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${COLORS.brandBlueLight50}, transparent)` }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '5px', height: '24px', background: `linear-gradient(180deg, ${COLORS.brandBlueLight}, ${COLORS.primary})`, borderRadius: '4px' }} />
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: 'var(--text-main)' }}>Formulario Manual de Identidad</h4>
              </div>

              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 20px', lineHeight: '1.5' }}>
                Si el sistema automático de lectura no pudo extraer los datos de tu Acta de Nacimiento o Identificación, puedes llenarlos en este formulario. Estos datos son obligatorios para pre-llenar tu formato de afiliación oficial.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                <div className="premium-input-group">
                  <label className="premium-label">Nombre Completo *</label>
                  <input
                    type="text"
                    placeholder="APELLIDOS NOMBRES"
                    value={ocrResults.nombre || ''}
                    onChange={(e) => handleManualOcrChange('nombre', e.target.value.toUpperCase())}
                    className="premium-input"
                    disabled={true}
                    style={{ cursor: 'not-allowed', backgroundColor: COLORS.overlayWhite05 }}
                  />
                </div>
                <div className="premium-input-group">
                  <label className="premium-label">CURP *</label>
                  <input
                    type="text"
                    placeholder="Se auto-completará con el documento de identidad"
                    maxLength={18}
                    value={ocrResults.curp || ''}
                    onChange={(e) => handleManualOcrChange('curp', e.target.value.toUpperCase())}
                    className="premium-input"
                  />
                  {curpExistente && (
                    <div style={{ color: COLORS.danger, fontSize: '12px', marginTop: '4px', fontWeight: 'bold' }}>
                      Esta CURP ya está registrada a otra persona.
                    </div>
                  )}
                </div>
                <div className="premium-input-group">
                  <label className="premium-label">Nacionalidad *</label>
                  <input
                    type="text"
                    placeholder="Ej. MEXICANA"
                    value={ocrResults.nacionalidad || ''}
                    onChange={(e) => handleManualOcrChange('nacionalidad', e.target.value.toUpperCase())}
                    className="premium-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div className="premium-input-group">
                  <label className="premium-label">Fecha de Nacimiento *</label>
                  <input
                    type="date"
                    value={convertToYYYYMMDD(ocrResults.fecha_nac) || ''}
                    onChange={(e) => handleManualOcrChange('fecha_nac', convertToDDMMYYYY(e.target.value))}
                    className="premium-input"
                    style={{ colorScheme: 'dark', cursor: 'pointer' }}
                  />
                  {(() => {
                    const val = convertToYYYYMMDD(ocrResults.fecha_nac);
                    if (!val) return null;
                    const fechaDate = new Date(val);
                    if (fechaDate.getFullYear() < 1900) {
                      return <div style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '6px', fontWeight: '700' }}>El año de nacimiento no puede ser menor a 1900</div>;
                    }
                    if (fechaDate.getFullYear() > new Date().getFullYear()) {
                      return <div style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '6px', fontWeight: '700' }}>El año de nacimiento es inválido</div>;
                    }
                    const limitDate = new Date(new Date().setFullYear(new Date().getFullYear() - 18));
                    if (fechaDate > limitDate) {
                      return <div style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '6px', fontWeight: '700' }}>Debes tener más de 18 años</div>;
                    }
                    return null;
                  })()}
                </div>
                <div className="premium-input-group">
                  <label className="premium-label">Sexo *</label>
                  <select
                    value={ocrResults.sexo || ''}
                    onChange={(e) => handleManualOcrChange('sexo', e.target.value)}
                    className="premium-input"
                    style={user.usuario?.sexoId ? { cursor: 'not-allowed', backgroundColor: COLORS.overlayWhite05 } : { cursor: 'pointer' }}
                    disabled={!!user.usuario?.sexoId}
                  >
                    <option value="">Selecciona...</option>
                    <option value="MASCULINO">Masculino</option>
                    <option value="FEMENINO">Femenino</option>
                    <option value="NO BINARIO">OTRO</option>
                  </select>
                </div>
                <div className="premium-input-group">
                  <label className="premium-label">Teléfono registrado*</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      value={codigoPais}
                      onChange={(e) => setCodigoPais(e.target.value)}
                      className="premium-input"
                      disabled={true}
                      style={{
                        width: '100px',
                        padding: '12px 16px',
                        background: COLORS.overlayWhite05,
                        border: `1px solid ${COLORS.overlayWhite10}`,
                        borderRadius: '12px',
                        color: 'white',
                        fontSize: '14px',
                        outline: 'none',
                        cursor: 'not-allowed',
                        backdropFilter: 'blur(4px)'
                      }}
                    >
                      <option value="+52" style={{ background: COLORS.indigo950, color: 'white' }}>México +52</option>
                      <option value="+1" style={{ background: COLORS.indigo950, color: 'white' }}>EE.UU./Canadá +1</option>
                      <option value="+34" style={{ background: COLORS.indigo950, color: 'white' }}>España +34</option>
                      <option value="+54" style={{ background: COLORS.indigo950, color: 'white' }}>Argentina +54</option>
                      <option value="+55" style={{ background: COLORS.indigo950, color: 'white' }}>Brasil +55</option>
                      <option value="+56" style={{ background: COLORS.indigo950, color: 'white' }}>Chile +56</option>
                      <option value="+57" style={{ background: COLORS.indigo950, color: 'white' }}>Colombia +57</option>
                      <option value="+506" style={{ background: COLORS.indigo950, color: 'white' }}>Costa Rica +506</option>
                      <option value="+593" style={{ background: COLORS.indigo950, color: 'white' }}>Ecuador +593</option>
                      <option value="+503" style={{ background: COLORS.indigo950, color: 'white' }}>El Salvador +503</option>
                      <option value="+502" style={{ background: COLORS.indigo950, color: 'white' }}>Guatemala +502</option>
                      <option value="+504" style={{ background: COLORS.indigo950, color: 'white' }}>Honduras +504</option>
                      <option value="+505" style={{ background: COLORS.indigo950, color: 'white' }}>Nicaragua +505</option>
                      <option value="+507" style={{ background: COLORS.indigo950, color: 'white' }}>Panamá +507</option>
                      <option value="+595" style={{ background: COLORS.indigo950, color: 'white' }}>Paraguay +595</option>
                      <option value="+51" style={{ background: COLORS.indigo950, color: 'white' }}>Perú +51</option>
                      <option value="+598" style={{ background: COLORS.indigo950, color: 'white' }}>Uruguay +598</option>
                      <option value="+58" style={{ background: COLORS.indigo950, color: 'white' }}>Venezuela +58</option>
                    </select>
                    <input
                      type="tel"
                      placeholder="10 dígitos"
                      maxLength={10}
                      value={ocrResults.telefono || ''}
                      onChange={(e) => handleManualOcrChange('telefono', e.target.value.replace(/\D/g, ''))}
                      className="premium-input"
                      disabled={true}
                      readOnly={true}
                      style={{ cursor: 'not-allowed', flexGrow: 1, backgroundColor: COLORS.overlayWhite05 }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* BOTONES DE NAVEGACIÓN */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: `1px solid ${COLORS.overlayWhite06}` }}>
              <button
                style={{ background: COLORS.overlayWhite04, border: `1px solid ${COLORS.overlayWhite10}`, color: 'var(--text-muted)', padding: '12px 30px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s ease' }}
                onMouseOver={(e) => { e.currentTarget.style.background = COLORS.overlayWhite08; }}
                onMouseOut={(e) => { e.currentTarget.style.background = COLORS.overlayWhite04; }}
                onClick={() => setPasoActual(2)}
              >
                ← Anterior
              </button>

              {/* Pill progress indicator Removed */}

              <button
                className="btn-premium"
                onClick={handleSolicitarRegistro}
                disabled={loading}
                style={{ padding: '12px 50px', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Enviando...' : 'Finalizar Registro ✓'}
              </button>
            </div>
          </div>
        )}

        {/* PASO 5: VALIDACIÓN DE DOCUMENTOS (Paso 3) */}
        {pasoActual === 5 && (
          <div className="content-body" style={{ padding: '40px' }}>
            {estadoSolicitud === 3 && (
              <div style={{
                marginBottom: '24px',
                background: COLORS.dangerBgTranslucent10,
                border: `1px solid ${COLORS.dangerBgTranslucent30}`,
                borderRadius: '18px',
                padding: '18px 20px',
                color: 'var(--text-main)'
              }}>
                <h4 style={{ margin: '0 0 8px', color: 'var(--danger)', fontSize: '15px', fontWeight: '800' }}>
                  Tu solicitud tiene observaciones por el siguiente motivo general:
                </h4>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                  {mensajeRechazoSolicitud || 'Por favor, revisa tus documentos y reemplaza los que fueron rechazados.'}
                </p>
              </div>
            )}

            {/* HEADER DE SECCIÓN */}
            <div style={{ textAlign: 'center', marginBottom: '35px' }}>
              <h3 style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-main)', margin: '0 0 8px' }}>
                Validación de documentos
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
                Revisa el estado de tus documentos. Reemplaza cualquier documento que haya sido rechazado.
              </p>
            </div>

            {/* TARJETAS DE DOCUMENTOS */}
            <div className="doc-cards-grid">
              {requisitos.map((doc, idx) => {
                const docIdMap = {
                  actaNacimiento: 8,
                  identificacion: 38,
                  fotografia: 37,
                  formatoAfiliacion: 10
                };
                const docAfiliacionId = docIdMap[doc.documento];
                const docGuardado = documentosGuardados.find(d => Number(d.DocumentoAfiliacionId || d.documentoAfiliacionId) === Number(docAfiliacionId));

                const hasLocalFile = !!documents[doc.documento];
                const isUploaded = hasLocalFile || !!docGuardado;
                const icons = { actaNacimiento: '📜', identificacion: '🪪', fotografia: '📸', formatoAfiliacion: '📝' };

                let statusLabel, statusColor, statusDotColor, statusBg;
                if (docGuardado) {
                  const estId = Number(docGuardado.EstadoValidacionId || docGuardado.estadoValidacionId);
                  if (estId === 2) {
                    statusLabel = 'Aprobado'; statusColor = COLORS.success; statusDotColor = COLORS.success; statusBg = COLORS.successBgTranslucent10;
                  } else if (estId === 3) {
                    statusLabel = 'Rechazado'; statusColor = COLORS.danger; statusDotColor = COLORS.danger; statusBg = COLORS.dangerBgTranslucent10;
                  } else {
                    statusLabel = 'En espera'; statusColor = COLORS.warning; statusDotColor = COLORS.warning; statusBg = COLORS.warningBgTranslucent12;
                  }
                } else if (hasLocalFile) {
                  statusLabel = 'Listo'; statusColor = COLORS.successLight; statusDotColor = COLORS.success; statusBg = COLORS.successBgTranslucent10;
                } else {
                  statusLabel = 'Pendiente'; statusColor = COLORS.warning; statusDotColor = COLORS.warning; statusBg = COLORS.warningBgTranslucent12;
                }

                const isApproved = docGuardado && Number(docGuardado.EstadoValidacionId || docGuardado.estadoValidacionId) === 2;
                const isRejected = docGuardado && Number(docGuardado.EstadoValidacionId || docGuardado.estadoValidacionId) === 3;

                return (
                  <div
                    key={idx}
                    className={`doc-glass-card${isUploaded ? ' uploaded' : ''}`}
                    onClick={() => {
                      if (isApproved) return;
                      if (doc.documento !== 'formatoAfiliacion') {
                        const inputId = `file-val-${doc.documento}`;
                        Swal.fire(buildCaptureSourceDialog(getCameraCaptureKind(doc.documento), COLORS)).then((result) => {
                          if (result.isConfirmed) {
                            setCameraTargetKey(inputId);
                            setIsCameraOpen(true);
                          } else if (result.dismiss === Swal.DismissReason.cancel) {
                            document.getElementById(inputId)?.click();
                          }
                        });
                        return;
                      }
                      if (doc.documento === 'fotografia') {
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
                            setCameraTargetKey('file-val-fotografia');
                            setIsCameraOpen(true);
                          } else if (result.dismiss === Swal.DismissReason.cancel) {
                            document.getElementById(`file-val-${doc.documento}`).click();
                          }
                        });
                      } else {
                        document.getElementById(`file-val-${doc.documento}`).click();
                      }
                    }}
                    onDragEnter={(e) => { if (!isApproved) { e.preventDefault(); e.stopPropagation(); setDragActive(prev => ({ ...prev, [`val-${doc.documento}`]: true })); } }}
                    onDragOver={(e) => { if (!isApproved) { e.preventDefault(); e.stopPropagation(); } }}
                    onDragLeave={(e) => { if (!isApproved) { e.preventDefault(); e.stopPropagation(); setDragActive(prev => ({ ...prev, [`val-${doc.documento}`]: false })); } }}
                    onDrop={async (e) => {
                      if (isApproved) return;
                      e.preventDefault();
                      e.stopPropagation();
                      setDragActive(prev => ({ ...prev, [`val-${doc.documento}`]: false }));
                      const file = e.dataTransfer.files[0];
                      if (file) {
                        if (!validarArchivoPermitido(file)) return;

                        try {
                          const metadata = JSON.parse(localStorage.getItem('afaem_doc_metadata') || '{}');
                          const previousFile = metadata[doc.documento];
                          if (previousFile && previousFile.size === file.size) {
                            const result = await Swal.fire({
                              title: '¿Subir el mismo archivo?',
                              text: 'Parece que estás intentando subir exactamente el mismo archivo que subiste anteriormente. Por favor, asegúrate de subir el documento con las correcciones correspondientes. ¿Deseas continuar de todos modos?',
                              icon: 'warning',
                              showCancelButton: true,
                              confirmButtonText: 'Sí, subir',
                              cancelButtonText: 'Cancelar',
                              confirmButtonColor: COLORS.primary,
                              cancelButtonColor: COLORS.slate400
                            });
                            if (!result.isConfirmed) return;
                          }
                        } catch (err) {
                          console.warn("Error verifying file metadata duplicate:", err);
                        }

                        if (docGuardado) {
                          handleReemplazarDocumento(docAfiliacionId, file);
                          setDocuments(prev => ({ ...prev, [doc.documento]: file }));
                        } else {
                          handleFileUpload(doc.documento, file);
                        }
                      }
                    }}
                    style={{
                      cursor: isApproved ? 'default' : 'pointer',
                      border: dragActive[`val-${doc.documento}`] ? `2px solid ${COLORS.primary}` : (isUploaded ? `2px solid ${COLORS.success}` : `2px dashed ${COLORS.slate300}`),
                      backgroundColor: dragActive[`val-${doc.documento}`] ? 'rgba(26, 59, 92, 0.05)' : undefined
                    }}
                  >
                    {/* Top sheen */}
                    <div className="top-sheen" style={{ background: isUploaded ? `linear-gradient(90deg,transparent,${COLORS.successBgTranslucent40},transparent)` : `linear-gradient(90deg,transparent,${COLORS.overlayWhite06},transparent)` }} />
                    {/* Status pill */}
                    <div className="doc-status-pill" style={{ background: statusBg, color: statusColor }}>
                      <div className="doc-status-dot" style={{ background: statusDotColor, boxShadow: `0 0 5px ${statusDotColor}` }} />
                      {statusLabel}
                    </div>
                    {/* Icon */}
                    <div className="doc-glass-icon" style={{
                      background: isUploaded ? `linear-gradient(135deg,${COLORS.successBgTranslucent10},${COLORS.greenMediumTranslucent})` : `linear-gradient(135deg,${COLORS.primaryBgTranslucent},${COLORS.overlaySlateSuperLight})`,
                      border: isUploaded ? `1px solid ${COLORS.successBgTranslucent18}` : `1px solid ${COLORS.brandBlueLight12}`,
                    }}>
                      {isUploaded ? (
                        <span>{icons[doc.documento]}</span>
                      ) : (
                        <div style={{ width: '100%', textAlign: 'center', color: COLORS.slate400, cursor: 'pointer' }}>
                          <FaUpload style={{ fontSize: '28px', marginBottom: '6px' }} />
                          <p style={{ margin: 0, fontSize: '10px', fontWeight: '800' }}>SUBIR ARCHIVO</p>
                        </div>
                      )}
                    </div>
                    {/* Title */}
                    <h4 style={{ fontSize: '14px', fontWeight: '800', color: isUploaded ? COLORS.successLight : 'var(--text-main)', margin: '0 0 5px' }}>
                      {doc.nombre}
                    </h4>
                    {doc.documento === 'fotografia' && (
                      <p style={{ fontSize: '11px', color: COLORS.overlayWhite60, margin: '5px 0 10px', fontStyle: 'italic', lineHeight: '1.4' }}>
                        Mantén una postura recta, visibilidad de hombros, sin sonrisa, ni accesorios como lentes, aretes o gorras.
                      </p>
                    )}
                    {/* Filename */}
                    <p style={{ fontSize: '10px', color: isUploaded ? COLORS.successLightTranslucent80 : 'var(--text-muted)', margin: '0 0 18px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90%' }}>
                      {hasLocalFile ? `📎 ${documents[doc.documento].name}` : (docGuardado ? '📎 Archivo enviado' : 'Sin archivo seleccionado')}
                    </p>
                    {/* Rejection reason display */}
                    {isRejected && docGuardado.ObservacionesDocumento && (
                      <div style={{ background: COLORS.dangerBgTranslucent, color: COLORS.dangerLight, padding: '10px 14px', border: `1px solid ${COLORS.dangerBgTranslucent30}`, borderRadius: '10px', fontSize: '11px', fontWeight: '700', marginBottom: '14px', width: '100%', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        Motivo de rechazo: {docGuardado.ObservacionesDocumento}
                      </div>
                    )}
                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '8px', width: '100%', flexWrap: 'wrap' }}>
                      {!isApproved && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (doc.documento !== 'formatoAfiliacion') {
                              const inputId = `file-val-${doc.documento}`;
                              Swal.fire(buildCaptureSourceDialog(getCameraCaptureKind(doc.documento), COLORS)).then((result) => {
                                if (result.isConfirmed) {
                                  setCameraTargetKey(inputId);
                                  setIsCameraOpen(true);
                                } else if (result.dismiss === Swal.DismissReason.cancel) {
                                  document.getElementById(inputId)?.click();
                                }
                              });
                              return;
                            }
                            if (doc.documento === 'fotografia') {
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
                                  setCameraTargetKey('file-val-fotografia');
                                  setIsCameraOpen(true);
                                } else if (result.dismiss === Swal.DismissReason.cancel) {
                                  document.getElementById(`file-val-${doc.documento}`).click();
                                }
                              });
                            } else {
                              document.getElementById(`file-val-${doc.documento}`).click();
                            }
                          }}
                          className="doc-action-btn"
                          style={{
                            border: isUploaded ? `1px solid ${COLORS.successBgTranslucent30}` : `1px solid ${COLORS.overlayWhite10}`,
                            background: isUploaded ? COLORS.successBgTranslucent10 : COLORS.overlayWhite04,
                            color: isUploaded ? COLORS.successLight : 'var(--text-muted)',
                            cursor: 'pointer',
                            flex: 1
                          }}
                        >
                          {hasLocalFile ? '🔄 Cambiar' : (docGuardado ? '🔄 Reemplazar' : '⬆ Subir')}
                        </button>
                      )}
                      {hasLocalFile && documents[doc.documento] && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewDoc({ file: documents[doc.documento], title: doc.nombre });
                            }}
                            className="doc-action-btn"
                            style={{
                              border: `1px solid ${COLORS.brandBlueLight50}`,
                              background: COLORS.brandBlueLight10,
                              color: COLORS.secondaryLight,
                              fontWeight: '700',
                              cursor: 'pointer',
                              flex: 1
                            }}
                          >
                            👁 Ver
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDocuments(prev => ({ ...prev, [doc.documento]: null }));
                              if (setPreviews) {
                                setPreviews(prev => ({ ...prev, [doc.documento]: null }));
                              }
                            }}
                            className="doc-action-btn"
                            style={{
                              border: `1px solid ${COLORS.dangerBgTranslucent30}`,
                              background: COLORS.dangerBgTranslucent10,
                              color: COLORS.dangerLight,
                              cursor: 'pointer',
                              flex: '0 0 auto',
                              width: '40px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <FaTrash />
                          </button>
                        </>
                      )}
                      {!hasLocalFile && docGuardado && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openSecurePath(docGuardado.Url || docGuardado.url);
                          }}
                          className="doc-action-btn"
                          style={{
                            border: `1px solid ${COLORS.brandBlueLight50}`,
                            background: COLORS.brandBlueLight10,
                            color: COLORS.secondaryLight,
                            fontWeight: '700',
                            cursor: 'pointer',
                            flex: 1
                          }}
                        >
                          👁 Ver
                        </button>
                      )}
                      <input
                        type="file"
                        id={`file-val-${doc.documento}`}
                        style={{ display: 'none' }}
                        accept=".pdf,.png,.jpg,.jpeg"
                        onClick={(e) => e.stopPropagation()}
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (!file) return;

                          if (!validarArchivoPermitido(file)) {
                            e.target.value = '';
                            return;
                          }

                          try {
                            const metadata = JSON.parse(localStorage.getItem('afaem_doc_metadata') || '{}');
                            const previousFile = metadata[doc.documento];
                            if (previousFile && previousFile.size === file.size) {
                              const result = await Swal.fire({
                                title: '¿Subir el mismo archivo?',
                                text: 'Parece que estás intentando subir exactamente el mismo archivo que subiste anteriormente. Por favor, asegúrate de subir el documento con las correcciones correspondientes. ¿Deseas continuar de todos modos?',
                                icon: 'warning',
                                showCancelButton: true,
                                confirmButtonText: 'Sí, subir',
                                cancelButtonText: 'Cancelar',
                                confirmButtonColor: COLORS.primary,
                                cancelButtonColor: COLORS.slate400
                              });
                              if (!result.isConfirmed) {
                                e.target.value = '';
                                return;
                              }
                            }
                          } catch (err) {
                            console.warn("Error verifying file metadata duplicate:", err);
                          }

                          if (docGuardado) {
                            handleReemplazarDocumento(docAfiliacionId, file);
                            setDocuments(prev => ({ ...prev, [doc.documento]: file }));
                          } else {
                            handleFileUpload(doc.documento, file);
                          }
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* BOTONES DE NAVEGACIÓN */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', paddingTop: '20px', borderTop: `1px solid ${COLORS.overlayWhite06}` }}>
              <button
                className="btn-premium"
                onClick={handleFinalizarCorreccion}
                disabled={loading}
                style={{ padding: '12px 50px', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Enviando...' : 'Finalizar Corrección ✓'}
              </button>
            </div>
          </div>
        )}

        {/* PASO 4: DOCUMENTOS EN REVISION */}
        {pasoActual === 4 && (
          <div className="pre-registro-section">
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <h2 style={{ color: 'var(--text-main)', fontSize: '28px', fontWeight: '800', marginBottom: '15px' }}>
                Tu solicitud será aprobada pronto
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '16px', maxWidth: '500px', margin: '0 auto 40px', lineHeight: '1.6' }}>
                Tus documentos fueron enviados correctamente. El administrador está revisando tu solicitud y su aprobación llegará pronto.
              </p>
              <div style={{ background: COLORS.overlayWhite03, border: `1px solid ${COLORS.overlayWhite06}`, borderRadius: '16px', padding: '25px', display: 'inline-block', textAlign: 'left' }}>
                <p style={{ margin: '0 0 10px', fontSize: '14px', color: COLORS.successLight, fontWeight: '700' }}>✓ Pago Validado</p>
                <p style={{ margin: '0 0 10px', fontSize: '14px', color: COLORS.warning, fontWeight: '700' }}>⏳ Solicitud: EN ESPERA</p>
                <p style={{ margin: '0', fontSize: '14px', color: COLORS.overlayWhite30, fontWeight: '700' }}>○ Acceso: PENDIENTE</p>
              </div>
              <div style={{ marginTop: '40px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Puedes cerrar sesión y volver más tarde para revisar tu estado.</p>
              </div>
              <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '14px', marginTop: '20px', display: 'inline-block' }} onClick={(e) => { e.preventDefault(); handleLogout(); }}>Cerrar sesión</a>
            </div>
          </div>
        )}
      </div>

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
        const esPresidente = ['TIPO G', 'SIN SEGURO'].includes(segNombreNormalizado);

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
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{
              backgroundColor: COLORS.slate800,
              border: `1px solid ${COLORS.overlayWhite10}`,
              borderRadius: '24px',
              width: '100%',
              maxWidth: '850px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: `0 25px 50px -12px ${COLORS.overlayBlack}`,
              display: 'flex',
              flexDirection: 'column',
              color: 'var(--text-main)'
            }}>
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
                  <h3 style={{ margin: 0, fontSize: '12px', fontWeight: '900', color: COLORS.secondaryLight, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {esPresidente ? 'Seguro Presidente' : 'Seguro Jugador'}
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
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '20px',
                borderBottomLeftRadius: '24px',
                borderBottomRightRadius: '24px'
              }}>
                <div>
                  {esPresidente ? (
                    <div style={{ fontSize: '13px', color: COLORS.overlayWhite60 }}>
                      Este seguro se asignará a tu cuenta de Presidente de Equipo.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', color: COLORS.overlayWhite60, fontWeight: '600' }}>
                        Selecciona la cantidad:
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', background: COLORS.overlayWhite04, border: `1px solid ${COLORS.overlayWhite10}`, borderRadius: '12px', padding: '3px' }}>
                        <button
                          type="button"
                          onClick={() => setCantidadModal(prev => Math.max(0, prev - 1))}
                          style={{ width: '32px', height: '32px', borderRadius: '10px', border: 'none', background: COLORS.overlayWhite06, color: 'white', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >-</button>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength="2"
                          value={cantidadModal}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setCantidadModal(val === '' ? 0 : parseInt(val, 10));
                          }}
                          style={{ width: '60px', border: 'none', background: 'transparent', color: COLORS.white, textAlign: 'center', fontWeight: '900', fontSize: '16px' }}
                        />
                        <button
                          type="button"
                          onClick={() => setCantidadModal(prev => prev + 1)}
                          style={{ width: '32px', height: '32px', borderRadius: '10px', border: 'none', background: COLORS.overlayWhite06, color: 'white', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >+</button>
                      </div>
                      <span style={{ fontSize: '12px', color: COLORS.overlayWhite40, fontWeight: '700' }}>
                        (Faltan {jugadoresRestantes} por asignar)
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
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
                  <button
                    type="button"
                    onClick={() => {
                      if (esPresidente) {
                        const next = { ...asignacionSeguros };
                        segurosPresidente.forEach(item => {
                          next[item.id] = item.id === seguroDetalle.id ? 1 : 0;
                        });
                        setAsignacionSeguros(next);
                      } else {
                        setAsignacionSeguros({ ...asignacionSeguros, [seguroDetalle.id]: cantidadModal });
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
                    {esPresidente ? 'Seleccionar Seguro' : 'Confirmar Cantidad'}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}
      {previewDoc && (
        <Modal
          estaAbierto={!!previewDoc}
          titulo={`Vista previa: ${previewDoc.title}`}
          alCerrar={() => setPreviewDoc(null)}
          tamanio="grande"
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            {previewDoc.file.type.startsWith('image/') ? (
              previewUrl ? (
                <img
                  src={previewUrl}
                  alt={previewDoc.title}
                  style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px', boxShadow: `0 4px 12px ${COLORS.shadow10}` }}
                />
              ) : (
                <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Cargando vista previa...</div>
              )
            ) : previewDoc.file.type === 'application/pdf' ? (
              previewUrl ? (
                <iframe
                  src={`${previewUrl}#toolbar=0&navpanes=0`}
                  title={previewDoc.title}
                  style={{ width: '100%', height: '65vh', border: 'none', borderRadius: '8px' }}
                />
              ) : (
                <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Cargando vista previa...</div>
              )
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: COLORS.slate500 }}>
                <p style={{ fontSize: '16px', fontWeight: 'bold' }}>No se puede previsualizar este tipo de archivo directamente.</p>
                <p style={{ fontSize: '14px' }}>Archivo: {previewDoc.file.name}</p>
                <a
                  href={previewUrl}
                  download={previewDoc.file.name}
                  style={{
                    display: 'inline-block',
                    marginTop: '15px',
                    padding: '10px 20px',
                    backgroundColor: COLORS.primary,
                    color: 'white',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: 'bold'
                  }}
                >
                  Descargar archivo
                </a>
              </div>
            )}
          </div>
        </Modal>
      )}
      {isCameraOpen && (
        <CameraCaptureModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onCapture={handleCameraPhotoCaptured}
          captureKind={getCameraCaptureKind(cameraTargetKey?.replace(/^file-val-/, '').replace(/^file-/, '') || 'fotografia')}
        />
      )}
    </div>
  );
}

export default PreRegistroPresidente;




