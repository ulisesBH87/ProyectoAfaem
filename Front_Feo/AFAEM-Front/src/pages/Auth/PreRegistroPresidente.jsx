import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../routes/paths';
import { FaUpload, FaCheckCircle, FaTimesCircle, FaChevronRight, FaChevronLeft, FaMoneyBillWave, FaFileAlt, FaClock } from 'react-icons/fa';
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

import { useRBAC } from '../../hooks/useRBAC';

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
  return nombre.toUpperCase().replace(/["']/g, '').trim();
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
  const [asociacion, setAsociacion] = useState('AFAEM');
  const [liga, setLiga] = useState('');
  const [ligasCatalogo, setLigasCatalogo] = useState([]);

  // Estados para validación fallida de fotografía y captura manual de OCR
  const [fotoValidacionFallida, setFotoValidacionFallida] = useState(false);
  const [fotoArchivoPendiente, setFotoArchivoPendiente] = useState(null);
  const [mostrarFormularioManual, setMostrarFormularioManual] = useState(false);

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
        setPasoActual(4); // Nuevo paso: Revisión de documentos
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
    const observacionesSolicitud = obtenerMensajeObservaciones(
      solicitud?.observaciones,
      'Tu solicitud fue rechazada.'
    );

    setOrdenPendienteId(ordenId);
    setEstadoPago(estatusOrden);
    setEstadoSolicitud(estatusSolicitud);
    setSolicitudActualId(solicitudId);
    setMensajeRechazoPago(observacionesPago);
    setMensajeRechazoSolicitud(observacionesSolicitud);
    setTotalOrdenPendiente(Number(data.total || data.TotalPagar || 0));

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
        confirmButtonColor: '#0b4ea6'
      });
      return;
    }

    if (estatusOrden === 3) {
      if (!estatusSolicitud || estatusSolicitud === 4) {
        setPasoActual(3);
        return;
      }

      if (estatusSolicitud === 1) {
        setPasoActual(4);
        return;
      }

      if (estatusSolicitud === 3) {
        setPasoActual(3);
        await Swal.fire({
          title: 'Tu solicitud fue rechazada',
          text: `Motivo: ${observacionesSolicitud} Vuelve a subir tus documentos.`,
          icon: 'warning',
          confirmButtonColor: '#0b4ea6'
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
    { documento: 'fotografia', nombre: 'Fotografía (Imagen)' },
    { documento: 'formatoAfiliacion', nombre: 'Formato de afiliación firmado', hasDownload: true }
  ];

  // ================== FUNCIÓN PARA GENERAR PDF DE CUOTA ==================
  const generarPDFCuota = (ordenId) => {
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
      doc.text('Una vez realizado el pago, sube el comprobante en la plataforma para procesar tu registro.', margin, yPosition, { maxWidth: contentWidth });

      // Descargar PDF
      const nombreArchivo = `Cuota_AFAEM_${ordenId}_${today.replace(/\//g, '-')}.pdf`;
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
        confirmButtonColor: '#0b4ea6'
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
            generarPDFCuota(newOrdenId);
          }, 500);

          Swal.fire({
            title: '¡Orden Generada!',
            text: 'Se ha descargado tu ficha de pago en PDF. Ahora utiliza los datos bancarios para realizar tu transferencia y sube el comprobante aquí mismo.',
            icon: 'success',
            confirmButtonColor: '#0b4ea6'
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

    if (documentKey === "fotografia") {
      setFotoPreview(null);
      setDocuments(prev => {
        const updated = { ...prev };
        delete updated.fotografia;
        return updated;
      });
      procesarFotografia(file);
    } else {
      setDocuments(prev => ({ ...prev, [documentKey]: file }));
      // Invocar OCR real al subir
      if (['actaNacimiento', 'identificacion'].includes(documentKey)) {
        procesarOCRReal(documentKey, file);
      }
    }
  };

  const mejorarExtraccionActa = (rawText, currentData) => {
    if (!rawText) return currentData;
    const data = { ...currentData };

    // 1. RESCATE DE NOMBRE (Especialmente para actas digitales mexicanas)
    // Buscamos patrones de etiquetas seguidas de valores en líneas subsecuentes
    if (!data.nombre || data.nombre === 'No detectado' || data.nombre.split(' ').length < 2) {
      // Intento 1: Formato "Nombre(s) \n VALOR \n Primer Apellido \n VALOR ..."
      const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
      let nombres = '', ap1 = '', ap2 = '';

      for (let i = 0; i < lines.length; i++) {
        const l = lines[i].toUpperCase();
        if (l.includes('NOMBRE(S)') && i + 1 < lines.length) nombres = lines[i + 1];
        if (l.includes('PRIMER APELLIDO') && i + 1 < lines.length) ap1 = lines[i + 1];
        if (l.includes('SEGUNDO APELLIDO') && i + 1 < lines.length) ap2 = lines[i + 1];
      }

      if (nombres && ap1) {
        data.nombre = `${ap1} ${ap2} ${nombres}`.replace(/\s+/g, ' ').toUpperCase();
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

  const procesarOCRReal = async (docKey, file) => {
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

      // Usamos el proxy configurado en vite.config.js
      const response = await fetch('/ocr-api', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Error al conectar con el servidor OCR');

      // Parsea el HTML del OCR para extraer los datos
      const htmlText = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, "text/html");

      let extractedData = {};
      const rows = doc.querySelectorAll('.dato-fila');

      rows.forEach(row => {
        const label = row.querySelector('.etiqueta')?.textContent?.toLowerCase() || '';
        const value = row.querySelector('.valor')?.textContent?.trim() || '';
        if (label.includes('curp')) extractedData.curp = value;
        if (label.includes('nombre')) extractedData.nombre = value;
        if (label.includes('nacionalidad')) extractedData.nacionalidad = value;
        if (label.includes('fecha de nacimiento')) extractedData.fecha_nac = value;
        if (label.includes('edad')) extractedData.edad = value;
        if (label.includes('documento')) extractedData.documento = value;
      });

      // --- REFUERZO DESDE EL FRONTEND (RESCATE DE TEXTO CRUDO) ---
      const rawText = doc.querySelector('pre')?.textContent;
      if (rawText && (docKey === 'actaNacimiento' || extractedData.documento?.includes('ACTA'))) {
        extractedData = mejorarExtraccionActa(rawText, extractedData);
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
          title: 'Documento procesado',
          text: 'Se leyó el documento pero no se pudo extraer el nombre automáticamente.',
          icon: 'info',
          timer: 2000,
          showConfirmButton: false
        });
      }

    } catch (err) {
      Swal.fire({
        title: 'Error',
        text: 'No se pudo leer el documento de forma automática. Podrás continuar.',
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

      // Rellenar Nombre(s), Apellido Paterno, Apellido Materno
      if (nombreSolo || primerApellido || segundoApellido) {
        if (primerApellido) safeSetField(form, 'Apellido Paterno', primerApellido.toUpperCase());
        if (segundoApellido) safeSetField(form, 'Apellido Materno', segundoApellido.toUpperCase());
        if (nombreSolo) safeSetField(form, 'Nombres', nombreSolo.toUpperCase());
      } else if (nombre && nombre !== "No detectado") {
        const parts = nombre.split(' ');
        if (parts.length >= 3) {
          safeSetField(form, 'Apellido Paterno', parts[0]);
          safeSetField(form, 'Apellido Materno', parts[1]);
          safeSetField(form, 'Nombres', parts.slice(2).join(' '));
        } else if (parts.length === 2) {
          safeSetField(form, 'Apellido Paterno', parts[0]);
          safeSetField(form, 'Nombres', parts[1]);
        } else {
          safeSetField(form, 'Nombres', nombre);
        }
      }

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
          // Hacemos la letra más pequeña si el nombre de la liga es largo para evitar desbordes
          const fontSize = nameStr.length > 25 ? 6 : (nameStr.length > 15 ? 8 : 10);
          safeSetField(form, 'Liga', nameStr, fontSize);
        }
      }
      safeSetField(form, 'Equipo', (ocrResults.equipo || '').toUpperCase());

      // Fecha automática (A __ de __ del 20__)
      const hoy = new Date();
      const dia = String(hoy.getDate()).padStart(2, '0');
      const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
      const mes = meses[hoy.getMonth()];
      const anio = String(hoy.getFullYear()).slice(-2);

      safeSetField(form, 'A', dia);
      safeSetField(form, 'de', mes);
      safeSetField(form, 'del 20', anio);

      // Cargo: Presidente
      safeSetField(form, 'Cargo', 'PRESIDENTE');

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
          confirmButtonColor: '#ef4444'
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
        confirmButtonColor: '#ef3030'
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
      confirmButtonColor: '#0b4ea6'
    });
  };



  const handleManualOcrChange = async (field, value) => {
    if (field === 'nombre') {
      return;
    }

    if (field === 'curp') {
      setOcrResults(prev => ({
        ...prev,
        [field]: value,
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

      // Verify all 4 documents are present
      const requiredDocs = ['actaNacimiento', 'identificacion', 'fotografia', 'formatoAfiliacion'];
      for (const docKey of requiredDocs) {
        if (!documents[docKey]) {
          throw new Error(`Falta subir el documento: ${requisitos.find(r => r.documento === docKey)?.nombre}`);
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

      // ── SUBIDA REAL DE LOS 4 DOCUMENTOS DEL PRESIDENTE ──────────────
      // IDs de DocumentoAfiliacion confirmados en base de datos:
      //   actaNacimiento   → 8  (ACTA_NACIMIENTO, Presidente de Equipo)
      //   identificacion   → 38 (INE, Presidente de Equipo)
      //   fotografia       → 37 (FOTOGRAFIA, Presidente de Equipo)
      //   formatoAfiliacion→ 10 (FORMATO_DIRECTIVO, Presidente de Equipo)
      const docMapping = [
        { key: 'actaNacimiento', docAfiliacionId: 8 },
        { key: 'identificacion', docAfiliacionId: 38 },
        { key: 'fotografia', docAfiliacionId: 37 },
        { key: 'formatoAfiliacion', docAfiliacionId: 10 },
      ];

      const formDataDocs = new FormData();
      for (const { key, docAfiliacionId } of docMapping) {
        formDataDocs.append('documento_afiliacion_ids', docAfiliacionId);
        formDataDocs.append('archivo', documents[key]);
      }
      if (solicitudActualId) {
        formDataDocs.append('solicitud_id', solicitudActualId);
      }

      const resUpload = await fetch(`${API_BASE}/documentos/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataDocs
      });

      if (!resUpload.ok) {
        const errData = await resUpload.json().catch(() => ({}));
        throw new Error(`Error al subir documentos: ${errData.detail || resUpload.statusText}`);
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
        confirmButtonColor: '#0b4ea6'
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

  return (
    <div className="fade-in prereg-dark-page" style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #060f2e 0%, #0b2a6b 40%, #1e1b4b 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px',
      position: 'relative',
    }}>
      <style>{`
        .cuotas-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.65fr) minmax(320px, 0.95fr);
          gap: 20px;
          align-items: start;
        }
        .insurance-layout-left,
        .insurance-layout-right {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 0;
        }
        .insurance-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .insurance-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
        }
        .insurance-card-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 12px;
          min-width: 0;
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
          gap: 2px;
          flex: 1;
          min-width: 0;
        }
        .insurance-player-name {
          font-size: 14px;
          font-weight: 800;
          color: var(--text-main);
          line-height: 1.2;
          white-space: normal;
          word-break: normal;
          overflow-wrap: break-word;
          margin: 0;
        }
        .insurance-player-price {
          font-size: 12.5px;
          color: #5d87e5;
          font-weight: 700;
          white-space: nowrap;
          line-height: 1.2;
        }
        .insurance-player-description {
          font-size: 11px;
          color: var(--text-muted);
          margin: 0;
          white-space: normal;
          word-break: normal;
          overflow-wrap: break-word;
          line-height: 1.3;
        }
        .insurance-player-card .insurance-input {
          flex: 0 0 76px;
          width: 76px;
          min-width: 76px;
          max-width: 100%;
        }
        .insurance-col-title {
          font-size: 13px;
          font-weight: 800;
          color: rgba(255,255,255,0.85);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          padding-bottom: 6px;
          margin-bottom: 5px;
        }
        .summary-stack {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
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
            grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.95fr);
          }
        }
        /* ====== DARK MODE SCOPE: Override global light vars for this page ====== */
        .prereg-dark-page {
          --text-main: rgba(255,255,255,0.92);
          --text-muted: rgba(255,255,255,0.45);
          --border-light: rgba(255,255,255,0.08);
          --card-bg: rgba(255,255,255,0.04);
          --bg-main: rgba(11,78,166,0.04);
          --bg-surface: rgba(255,255,255,0.06);
          --bg-glass: rgba(255,255,255,0.05);
        }
        /* Force the card to be dark/transparent on this page */
        .prereg-dark-page .card {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06);
        }
        .prereg-dark-page .glass {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.09);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        /* Summary/bank cards also need dark treatment */
        .prereg-dark-page .summary-card {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.08);
        }
        .prereg-dark-page .summary-card h5 { color: rgba(255,255,255,0.85); }
        .prereg-dark-page .summary-row { color: rgba(255,255,255,0.6); border-color: rgba(255,255,255,0.06); }
        .prereg-dark-page .total-row { color: rgba(255,255,255,0.9); border-color: rgba(255,255,255,0.08); }
        .prereg-dark-page .bank-info-label { color: rgba(255,255,255,0.45); }
        .prereg-dark-page .bank-info-value { color: rgba(255,255,255,0.88); }
        .prereg-dark-page .referencia-badge { background: rgba(93,135,229,0.15); color: #5d87e5; border: 1px solid rgba(93,135,229,0.25); }
        .prereg-dark-page .assigned-bar {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.6);
          padding: 8px 14px;
          margin-top: 8px;
          font-size: 13px;
          border-radius: 10px;
        }
        .prereg-dark-page .pago-card {
          background: rgba(255, 255, 255, 0.04) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 18px !important;
          padding: 26px !important;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3) !important;
          backdrop-filter: blur(10px) !important;
          -webkit-backdrop-filter: blur(10px) !important;
        }
        @media (max-width: 768px) {
          .prereg-dark-page .pago-card {
            padding: 16px !important;
          }
        }
        .prereg-dark-page .input-label { color: rgba(255,255,255,0.6); }
        .prereg-dark-page .section-title-small { color: rgba(255,255,255,0.88); }
        .prereg-dark-page .input-number {
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          color: white;
          border-radius: 12px;
          padding: 10px 14px;
          transition: all 0.2s ease;
        }
        .prereg-dark-page .input-number:focus {
          background: rgba(93,135,229,0.1);
          border-color: #5d87e5;
          box-shadow: 0 0 0 3px rgba(93,135,229,0.15);
          outline: none;
        }
        .prereg-dark-page .insurance-input {
          background: rgba(255, 255, 255, 0.08);
          border: 1.5px solid rgba(255, 255, 255, 0.15);
          color: white;
          border-radius: 10px;
          width: 76px;
          height: 34px;
          text-align: center;
          font-weight: 800;
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
          transition: all 0.2s ease;
        }
        .prereg-dark-page .insurance-input:focus {
          background: rgba(93, 135, 229, 0.1) !important;
          border-color: #5d87e5 !important;
          box-shadow: 0 0 0 3px rgba(93, 135, 229, 0.15);
        }
        .prereg-dark-page .insurance-input.error-state {
          border-color: #ef4444 !important;
          background: rgba(239, 68, 68, 0.08) !important;
          color: #f87171 !important;
        }
        .prereg-dark-page .btn-nav-gray {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.6);
          border-radius: 12px; padding: 12px 28px; font-weight: 700;
        }
        .prereg-dark-page .btn-nav-gray:hover {
          background: rgba(255,255,255,0.1);
        }
        .prereg-dark-page .btn-nav-blue {
          background: linear-gradient(135deg, #3d79ff, #0b4ea6);
          color: white; border: none;
          border-radius: 12px; padding: 12px 28px; font-weight: 700;
          box-shadow: 0 4px 16px rgba(11,78,166,0.35);
        }
        .prereg-dark-page .btn-nav-blue:disabled { opacity: 0.4; }
        .prereg-dark-page .footer-nav {
          display: flex; justify-content: space-between;
          padding-top: 20px; margin-top: 10px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .prereg-dark-page .welcome-content {
          background: transparent;
        }

        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
          50% { box-shadow: 0 0 18px 5px rgba(16,185,129,0.18); }
        }
        @keyframes connectorFill {
          from { width: 0%; } to { width: 100%; }
        }

        .insurance-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px; padding: 12px 14px;
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 0; transition: all 0.3s ease;
        }
        .insurance-card:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(93,135,229,0.35);
          transform: translateX(4px);
          box-shadow: 0 4px 20px rgba(11,78,166,0.15);
        }
        .insurance-card.active-insurance {
          border-color: #5d87e5;
          background: rgba(93, 135, 229, 0.08);
          box-shadow: 0 0 15px rgba(93, 135, 229, 0.18);
        }
        .insurance-radio {
          appearance: none;
          -webkit-appearance: none;
          width: 24px;
          height: 24px;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          outline: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.25s ease;
          position: relative;
          background: transparent;
        }
        .insurance-radio:checked {
          border-color: #5d87e5;
          background: transparent;
          box-shadow: 0 0 8px rgba(93, 135, 229, 0.5);
        }
        .insurance-radio:checked::after {
          content: '';
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #5d87e5;
          display: block;
        }
        .insurance-info h4 { font-size: 14px; font-weight: 800; color: var(--text-main); margin-bottom: 2px; }
        .insurance-info p { font-size: 11.5px; color: var(--text-muted); margin: 0; }

        /* GLASS DOC CARDS */
        .doc-glass-card {
          background: rgba(255,255,255,0.03);
          border: 1px dashed rgba(255,255,255,0.12);
          border-radius: 20px; padding: 16px 14px;
          display: flex; flex-direction: column; align-items: center; text-align: center;
          position: relative; overflow: hidden;
          transition: all 0.35s cubic-bezier(0.4,0,0.2,1);
          backdrop-filter: blur(8px);
        }
        .doc-glass-card:hover {
          transform: translateY(-6px);
          background: rgba(255,255,255,0.06);
          border-color: rgba(93,135,229,0.3); border-style: solid;
          box-shadow: 0 16px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(93,135,229,0.1);
        }
        .doc-glass-card.uploaded {
          background: rgba(16,185,129,0.05);
          border: 1px solid rgba(16,185,129,0.3);
          animation: glowPulse 2s ease-in-out 1;
        }
        .doc-glass-card.uploaded:hover { border-color: rgba(16,185,129,0.5); box-shadow: 0 16px 40px rgba(16,185,129,0.12); }
        .doc-glass-card .top-sheen {
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
        }
        .doc-glass-icon {
          width: 50px; height: 50px; border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          font-size: 24px; margin-bottom: 10px;
          transition: transform 0.3s ease;
        }
        .doc-glass-card:hover .doc-glass-icon { transform: scale(1.08); }
        .doc-status-pill {
          position: absolute; top: 10px; right: 10px;
          padding: 3px 8px; border-radius: 20px;
          font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;
          display: flex; align-items: center; gap: 5px;
        }
        .doc-status-dot { width: 5px; height: 5px; border-radius: 50%; }
        .doc-action-btn {
          flex: 1; padding: 10px 12px; border-radius: 12px;
          font-size: 12px; font-weight: 700; cursor: pointer;
          transition: all 0.2s ease;
          display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        .doc-action-btn:hover { transform: translateY(-1px); }
        .doc-download-btn {
          flex: 1; padding: 10px 12px; border-radius: 12px;
          font-size: 12px; font-weight: 700; cursor: pointer;
          background: rgba(93,135,229,0.08); border: 1px solid rgba(93,135,229,0.2);
          color: #5d87e5; transition: all 0.2s ease;
          display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        .doc-download-btn:hover {
          background: rgba(93,135,229,0.16); border-color: rgba(93,135,229,0.4);
          transform: translateY(-1px); box-shadow: 0 4px 12px rgba(93,135,229,0.2);
        }
        .ocr-panel {
          width: 100%; margin-top: 12px;
          background: rgba(11,78,166,0.06); border: 1px solid rgba(93,135,229,0.12);
          border-radius: 14px; padding: 14px; animation: fadeIn 0.3s ease;
        }

        /* PREMIUM INPUTS */
        .premium-input-group { display: flex; flex-direction: column; gap: 6px; }
        .premium-label {
          font-size: 10px; font-weight: 800; color: rgba(255,255,255,0.4);
          text-transform: uppercase; letter-spacing: 1.2px;
        }
        .premium-input {
          width: 100%; box-sizing: border-box;
          padding: 13px 16px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; font-size: 14px; font-weight: 600;
          color: var(--text-main); outline: none;
          transition: all 0.25s ease; backdrop-filter: blur(4px);
        }
        .premium-input:focus {
          background: rgba(93,135,229,0.1);
          border-color: rgba(93,135,229,0.5);
          box-shadow: 0 0 0 3px rgba(93,135,229,0.12);
        }
        .premium-input::placeholder { color: rgba(255,255,255,0.25); }
        .premium-input option { background: #1e1b4b; color: white; }

        /* PILL progress dots for Paso 3 */
        .progress-pill {
          height: 8px; border-radius: 4px;
          transition: all 0.4s cubic-bezier(0.4,0,0.2,1);
        }

        /* LOGO CONSTRAINTS */
        .afaem-logo {
          height: 75px;
          width: auto;
          object-fit: contain;
          filter: drop-shadow(0 0 12px rgba(255,255,255,0.2));
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
          transition: opacity 0.3s;
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
      <div style={{ width: '95%', maxWidth: '1400px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <img
          src={AfaemLogo}
          alt="AFAEM"
          style={{ height: '70px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.2))' }}
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

        {/* ===== GLASS STEPPER HEADER (PASO 1 Y 3) ===== */}
        {(pasoActual === 1 || pasoActual === 3) && (
          <div style={{
            padding: '18px 30px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(10px)',
          }}>
            <p style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.35)', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 12px' }}>
              PROCESO DE ACTIVACIÓN
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* STEP 1 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px',
                  background: pasoActual === 1 ? 'linear-gradient(135deg, #0b4ea6, #1e40af)' : 'rgba(16,185,129,0.12)',
                  border: pasoActual === 1 ? '1px solid rgba(93,135,229,0.5)' : '1px solid rgba(16,185,129,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
                  boxShadow: pasoActual === 1 ? '0 8px 20px rgba(11,78,166,0.4),inset 0 1px 0 rgba(255,255,255,0.15)' : 'none',
                  transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
                }}>
                  {pasoActual === 3 ? <span style={{ color: '#34d399', fontSize: '16px' }}>✓</span> : <FaMoneyBillWave style={{ color: 'white' }} />}
                </div>
                <span style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', color: pasoActual === 1 ? '#5d87e5' : 'rgba(52,211,153,0.8)' }}>
                  Paso 1: Cuotas
                </span>
              </div>

              {/* Connector */}
              <div style={{ position: 'relative', width: '100px', height: '2px', margin: '0 10px', marginBottom: '20px' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.08)', borderRadius: '2px' }} />
                <div style={{
                  position: 'absolute', top: 0, left: 0, height: '100%',
                  width: pasoActual === 3 ? '100%' : '0%',
                  background: 'linear-gradient(90deg, #10b981, #34d399)',
                  borderRadius: '2px', transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                  boxShadow: '0 0 8px rgba(16,185,129,0.5)',
                }} />
              </div>

              {/* STEP 2 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px',
                  background: pasoActual === 3 ? 'linear-gradient(135deg, #0b4ea6, #1e40af)' : 'rgba(255,255,255,0.04)',
                  border: pasoActual === 3 ? '1px solid rgba(93,135,229,0.5)' : '1px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
                  boxShadow: pasoActual === 3 ? '0 8px 20px rgba(11,78,166,0.4),inset 0 1px 0 rgba(255,255,255,0.15)' : 'none',
                  transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
                }}>
                  <FaFileAlt style={{ color: pasoActual === 3 ? 'white' : 'rgba(255,255,255,0.25)' }} />
                </div>
                <span style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', color: pasoActual === 3 ? '#5d87e5' : 'rgba(255,255,255,0.25)' }}>
                  Paso 2: Documentos
                </span>
              </div>
            </div>
          </div>
        )}

        {/* PASO 1: CUOTAS */}
        {pasoActual === 1 && (
          <div className="content-body" style={{ padding: '24px 30px' }}>
            {error && (
              <div style={{
                marginBottom: '20px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.28)',
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
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.28)',
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
            <h3 className="section-title-small" style={{ textAlign: 'center', marginBottom: '20px', fontSize: '20px' }}>Selecciona los seguros para tus jugadores</h3>

            <div className="cuotas-layout">
              <div className="insurance-layout-left">
                {ordenPendienteId ? (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.07) 0%, rgba(5,150,105,0.04) 100%)',
                    padding: '20px',
                    borderRadius: '16px',
                    border: '1px solid rgba(16,185,129,0.25)',
                    marginBottom: '20px',
                    textAlign: 'center',
                    backdropFilter: 'blur(8px)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(52,211,153,0.4), transparent)' }} />
                    <div style={{
                      display: 'inline-flex', padding: '4px 12px',
                      background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.3))',
                      color: '#34d399', borderRadius: '20px', fontSize: '9px', fontWeight: '800', marginBottom: '10px',
                      border: '1px solid rgba(16,185,129,0.3)', letterSpacing: '1px', textTransform: 'uppercase',
                      boxShadow: '0 4px 12px rgba(16,185,129,0.15)',
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
                    <div className="input-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '15px' }}>
                      <label className="input-label" style={{ textAlign: 'left', fontSize: '13px', margin: 0, flex: 1 }}>Ingresa la cantidad total de seguros que deseas pagar para Jugadores.</label>
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
                        style={{ marginTop: '0', width: '80px', textAlign: 'center' }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '16px 0 12px' }}>
                      <div style={{ width: '4px', height: '18px', background: 'linear-gradient(180deg, #5d87e5, #0b4ea6)', borderRadius: '4px' }} />
                      <p style={{ fontSize: '12px', fontWeight: '800', color: 'rgba(255,255,255,0.85)', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        DISTRIBUCIÓN DE SEGUROS
                      </p>
                      <span style={{ fontSize: '10px', padding: '2px 8px', background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '20px', fontWeight: '700' }}>Obligatorio</span>
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
                          <div className="insurance-card-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                            {segurosJugadores.map(seg => {
                              const cantAsignada = Number(asignacionSeguros[seg.id] || 0);
                              return (
                                <div
                                  key={seg.id}
                                  className={`insurance-card insurance-player-card ${cantAsignada > 0 ? 'active-insurance' : ''}`}
                                  style={{ margin: 0, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '15px' }}
                                >
                                  {cantAsignada > 0 && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '-8px',
                                      right: '-8px',
                                      background: 'linear-gradient(135deg, #10b981, #059669)',
                                      color: 'white',
                                      fontSize: '11px',
                                      fontWeight: '900',
                                      borderRadius: '50%',
                                      width: '24px',
                                      height: '24px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      boxShadow: '0 4px 10px rgba(16, 185, 129, 0.4)',
                                      border: '2px solid #1e293b',
                                      zIndex: 10
                                    }}>
                                      {cantAsignada}
                                    </div>
                                  )}
                                  <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <div className="insurance-player-content" style={{ flex: 1, textAlign: 'left', paddingRight: '10px' }}>
                                      <p className="insurance-player-name" style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: '800' }}>{seg.nombre}</p>
                                      <span className="insurance-player-price" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>${seg.precio} c/u</span>
                                    </div>

                                    {/* Input directo en la tarjeta */}
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      pattern="[0-9]*"
                                      maxLength="2"
                                      className={`insurance-input ${totalAsignados > segurosRequeridos && cantAsignada > 0 ? 'error-state' : ''}`}
                                      value={asignacionSeguros[seg.id] ?? ''}
                                      onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        setAsignacionSeguros(prev => ({ ...prev, [seg.id]: val === '' ? '' : parseInt(val, 10) }));
                                        setError(null);
                                      }}
                                    />
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => abrirModalDetalle(seg)}
                                    style={{
                                      width: '100%',
                                      padding: '6px 12px',
                                      borderRadius: '10px',
                                      border: cantAsignada > 0 ? '1px solid #60a5fa' : '1px solid rgba(255, 255, 255, 0.1)',
                                      backgroundColor: cantAsignada > 0 ? 'rgba(96, 165, 250, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                                      color: cantAsignada > 0 ? '#60a5fa' : 'rgba(255,255,255,0.7)',
                                      fontWeight: '700',
                                      fontSize: '11px',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.5px'
                                    }}
                                    onMouseOver={(e) => {
                                      e.currentTarget.style.backgroundColor = cantAsignada > 0 ? 'rgba(96, 165, 250, 0.2)' : 'rgba(255, 255, 255, 0.08)';
                                    }}
                                    onMouseOut={(e) => {
                                      e.currentTarget.style.backgroundColor = cantAsignada > 0 ? 'rgba(96, 165, 250, 0.1)' : 'rgba(255, 255, 255, 0.04)';
                                    }}
                                  >
                                    Ver Beneficios / Asignar
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
                          <div className="insurance-card-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                            {segurosPresidente.map(seg => {
                              const checked = Number(asignacionSeguros[seg.id] || 0) > 0;

                              return (
                                <div
                                  key={seg.id}
                                  className={`insurance-card insurance-player-card ${checked ? 'active-insurance' : ''}`}
                                  style={{ margin: 0, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '15px' }}
                                >
                                  {checked && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '-8px',
                                      right: '-8px',
                                      background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                                      color: 'white',
                                      fontSize: '11px',
                                      fontWeight: '900',
                                      borderRadius: '50%',
                                      width: '24px',
                                      height: '24px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      boxShadow: '0 4px 10px rgba(59, 130, 246, 0.4)',
                                      border: '2px solid #1e293b',
                                      zIndex: 10
                                    }}>
                                      ✓
                                    </div>
                                  )}

                                  <div
                                    onClick={() => {
                                      const next = { ...asignacionSeguros };
                                      segurosPresidente.forEach(item => {
                                        next[item.id] = item.id === seg.id ? 1 : 0;
                                      });
                                      setAsignacionSeguros(next);
                                      setError(null);
                                    }}
                                    style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', cursor: 'pointer' }}
                                  >
                                    <div className="insurance-player-content" style={{ flex: 1, textAlign: 'left', paddingRight: '10px' }}>
                                      <p className="insurance-player-name" style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: '800' }}>{seg.nombre}</p>
                                      <span className="insurance-player-price" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>${seg.precio} c/u</span>
                                    </div>

                                    <input
                                      type="radio"
                                      name="seguroPresidenteRadioCard"
                                      checked={checked}
                                      onChange={() => { }} // click en fila maneja el cambio
                                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#3d79ff' }}
                                    />
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => abrirModalDetalle(seg)}
                                    style={{
                                      width: '100%',
                                      padding: '6px 12px',
                                      borderRadius: '10px',
                                      border: checked ? '1px solid #60a5fa' : '1px solid rgba(255, 255, 255, 0.1)',
                                      backgroundColor: checked ? 'rgba(96, 165, 250, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                                      color: checked ? '#60a5fa' : 'rgba(255,255,255,0.7)',
                                      fontWeight: '700',
                                      fontSize: '11px',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.5px'
                                    }}
                                    onMouseOver={(e) => {
                                      e.currentTarget.style.backgroundColor = checked ? 'rgba(96, 165, 250, 0.2)' : 'rgba(255, 255, 255, 0.08)';
                                    }}
                                    onMouseOut={(e) => {
                                      e.currentTarget.style.backgroundColor = checked ? 'rgba(96, 165, 250, 0.1)' : 'rgba(255, 255, 255, 0.04)';
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
                        <span style={{ color: '#34d399', fontWeight: '800' }}>✓ Todos asignados</span>
                      ) : (
                        <span style={{ color: '#f87171', fontWeight: '800' }}>
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
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '16px', padding: '16px',
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg,transparent,rgba(93,135,229,0.4),transparent)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <div style={{ width: '4px', height: '18px', background: 'linear-gradient(180deg,#5d87e5,#0b4ea6)', borderRadius: '4px' }} />
                      <h5 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: 'rgba(255,255,255,0.85)' }}>
                        {ordenPendienteId ? 'Detalles de la Orden' : 'Resumen de pago'}
                      </h5>
                    </div>
                    {ordenPendienteId && detalleInscripciones
                      .filter(detalle => {
                        const tafId = Number(detalle.TipoAfiliacionId || detalle.tipo_afiliacion_id);
                        return tafId !== 2 && tafId !== 4;
                      })
                      .map(detalle => (
                        <div key={detalle.OrdenPagoDetalleId || `${detalle.TipoAfiliacionId}-${detalle.Cantidad}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '12px' }}>
                          <span style={{ color: 'rgba(255,255,255,0.55)' }}>{nombreAfiliacion(detalle.TipoAfiliacionId || detalle.tipo_afiliacion_id)} (x{detalle.Cantidad || detalle.cantidad})</span>
                          <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '700' }}>${Number(detalle.Subtotal || detalle.subtotal || 0)}</span>
                        </div>
                      ))}
                    {catalogoSeguros.map(seg =>
                      asignacionSeguros[seg.id] > 0 && (
                        <div key={seg.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '12px' }}>
                          <span style={{ color: 'rgba(255,255,255,0.55)' }}>{seg.nombre} (x{asignacionSeguros[seg.id]})</span>
                          <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '700' }}>${seg.precio * asignacionSeguros[seg.id]}</span>
                        </div>
                      )
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', fontSize: '14px', fontWeight: '800' }}>
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>Total {ordenPendienteId ? 'a pagar' : 'estimado'}:</span>
                      <span style={{ color: '#5d87e5' }}>${totalMostrado}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {ordenPendienteId && (
              <div style={{
                marginTop: '20px',
                background: 'rgba(11,78,166,0.06)',
                border: '1.5px dashed rgba(93,135,229,0.35)',
                borderRadius: '16px',
                padding: '18px 20px',
                backdropFilter: 'blur(8px)',
              }}>
                <p style={{ fontSize: '13px', fontWeight: '800', color: '#5d87e5', marginBottom: '4px' }}>
                  Paso 2: Sube tu comprobante de pago
                </p>
                <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Adjunta el comprobante (PDF o imagen) para procesar tu registro.
                </p>
                <div className="file-input-custom">
                  <input
                    type="file"
                    id="comprobante"
                    style={{ display: 'none' }}
                    onChange={(e) => setComprobantePago(e.target.files[0])}
                  />
                  <button
                    className="btn-outline"
                    onClick={() => document.getElementById('comprobante').click()}
                    style={{ padding: '8px 16px' }}
                  >
                    {comprobantePago ? 'Cambiar archivo' : 'Seleccionar archivo'}
                  </button>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {comprobantePago ? comprobantePago.name : 'No se ha seleccionado archivo'}
                  </span>
                </div>
              </div>
            )}


            <div className="footer-nav">
              <button className="btn-nav-gray" onClick={irPasoAnterior} style={{ padding: '10px 24px' }}>Anterior</button>
              <button
                className="btn-nav-blue"
                onClick={irSiguientePaso}
                disabled={!ordenPendienteId ? (numPersonas <= 0) : !comprobantePago}
                title={!ordenPendienteId && (numPersonas <= 0) ? 'Ingresa la cantidad de jugadores para continuar' : ''}
                style={{ padding: '10px 24px' }}
              >
                {ordenPendienteId ? 'Finalizar' : 'Siguiente'}
              </button>
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
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: 'var(--secondary)',
                  marginBottom: '25px',
                  border: '2px solid rgba(16, 185, 129, 0.2)'
                }}>
                  <FaCheckCircle />
                </div>

                <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '15px' }}>
                  ¡Bienvenido, {user.Nombre || user.NombreUsuario || user.Correo || user.email || 'Usuario'}!
                </h1>

                <div style={{ maxWidth: '500px' }}>
                  <div style={{
                    display: 'inline-block',
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: 'var(--secondary)',
                    padding: '8px 20px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '800',
                    marginBottom: '20px',
                    border: '1px solid rgba(16, 185, 129, 0.2)'
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
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: 'var(--danger)',
                  marginBottom: '25px',
                  border: '2px solid rgba(239, 68, 68, 0.2)'
                }}>
                  <FaTimesCircle />
                </div>

                <h1 style={{ fontSize: '30px', fontWeight: '800', color: 'var(--danger)', marginBottom: '15px' }}>
                  Un administrador ha revisado el pago y haz sido rechazado
                </h1>

                <div style={{ maxWidth: '500px' }}>
                  <div style={{
                    display: 'inline-block',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: 'var(--danger)',
                    padding: '8px 20px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '800',
                    marginBottom: '20px',
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                  }}>
                    PAGO DENEGADO
                  </div>
                  <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '16px', padding: '20px', marginBottom: '30px', textAlign: 'left' }}>
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
                  background: 'rgba(245, 158, 11, 0.1)',
                  color: 'var(--warning)',
                  marginBottom: '25px',
                  border: '2px solid rgba(245, 158, 11, 0.2)'
                }}>
                  <FaClock />
                </div>

                <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '15px' }}>
                  Tu orden será aprobada pronto
                </h1>

                <div style={{ maxWidth: '500px' }}>
                  <div style={{
                    display: 'inline-block',
                    background: 'rgba(245, 158, 11, 0.1)',
                    color: 'var(--warning)',
                    padding: '8px 20px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '800',
                    marginBottom: '20px',
                    border: '1px solid rgba(245, 158, 11, 0.2)'
                  }}>
                    ORDEN EN ESPERA
                  </div>
                  <p style={{ fontSize: '16px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '30px' }}>
                    Hemos recibido tu comprobante de pago. Tu orden será aprobada pronto y, cuando eso ocurra,
                    podrás continuar con la carga de documentos necesarios para tu afiliación oficial.
                  </p>

                  <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '20px', marginBottom: '30px', textAlign: 'left' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '800', color: 'var(--primary)' }}>📄 Documentos a preparar:</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <span>• Acta de nacimiento</span>
                      <span>• Fotografía reciente</span>
                      <span>• Identificación oficial</span>
                      <span>• Formato de afiliación</span>
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
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.28)',
                borderRadius: '18px',
                padding: '18px 20px',
                color: 'var(--text-main)'
              }}>
                <h4 style={{ margin: '0 0 8px', color: 'var(--danger)', fontSize: '15px', fontWeight: '800' }}>
                  Tu solicitud fue rechazada por el siguiente motivo:
                </h4>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6' }}>
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
              background: 'linear-gradient(135deg, rgba(11,78,166,0.07) 0%, rgba(30,27,75,0.09) 100%)',
              border: '1px solid rgba(93,135,229,0.15)',
              borderRadius: '24px',
              padding: '28px',
              marginBottom: '35px',
              backdropFilter: 'blur(8px)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Top accent */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, rgba(93,135,229,0.5), transparent)' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <div style={{ width: '5px', height: '24px', background: 'linear-gradient(180deg, #5d87e5, #0b4ea6)', borderRadius: '4px' }} />
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: 'var(--text-main)' }}>Datos de Registro</h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                <div className="premium-input-group">
                  <label className="premium-label">Asociación</label>
                  <input type="text" value={asociacion} disabled className="premium-input" style={{ backgroundColor: '#436c95ff', cursor: 'not-allowed' }} />
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
                  <label className="premium-label">Nombre de equipo *</label>
                  <input
                    type="text"
                    placeholder="Nombre del Equipo"
                    value={ocrResults.equipo || ''}
                    onChange={(e) => handleManualOcrChange('equipo', e.target.value.toUpperCase())}
                    className="premium-input"
                  />
                </div>
                <div className="premium-input-group">
                  <label className="premium-label">Tipo de afiliación comprado*</label>
                  <select
                    value={tipoAfiliacion}
                    onChange={(e) => setTipoAfiliacion(e.target.value)}
                    className="premium-input"
                    style={{ cursor: 'not-allowed', backgroundColor: 'rgba(255,255,255,0.05)' }}
                    disabled={true}
                  >
                    <option value="">Selecciona...</option>
                    {CATALOGO_ROLES.map(r => <option key={r.valor} value={r.valor}>{r.etiqueta}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* OPCIÓN DE LLENADO MANUAL DE OCR */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '25px' }}>
              <button
                type="button"
                onClick={() => setMostrarFormularioManual(!mostrarFormularioManual)}
                className="doc-action-btn"
                style={{
                  padding: '10px 24px',
                  borderRadius: '12px',
                  border: '1px solid rgba(93,135,229,0.3)',
                  background: mostrarFormularioManual ? 'rgba(93,135,229,0.15)' : 'rgba(255,255,255,0.04)',
                  color: '#5d87e5',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {mostrarFormularioManual ? 'Ocultar Captura Manual' : 'Capturar Datos Manualmente'}
              </button>
            </div>

            {mostrarFormularioManual && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(93,135,229,0.06) 0%, rgba(30,27,75,0.09) 100%)',
                border: '1px solid rgba(93,135,229,0.2)',
                borderRadius: '24px',
                padding: '28px',
                marginBottom: '35px',
                backdropFilter: 'blur(8px)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, rgba(93,135,229,0.5), transparent)' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ width: '5px', height: '24px', background: 'linear-gradient(180deg, #5d87e5, #0b4ea6)', borderRadius: '4px' }} />
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
                      style={{ cursor: 'not-allowed', backgroundColor: 'rgba(255,255,255,0.05)' }}
                    />
                  </div>
                  <div className="premium-input-group">
                    <label className="premium-label">CURP *</label>
                    <input
                      type="text"
                      placeholder="18 caracteres alfanuméricos"
                      maxLength={18}
                      value={ocrResults.curp || ''}
                      onChange={(e) => handleManualOcrChange('curp', e.target.value.toUpperCase())}
                      className="premium-input"
                      disabled={!!user.usuario?.curp}
                      style={user.usuario?.curp ? { cursor: 'not-allowed', backgroundColor: 'rgba(255,255,255,0.05)' } : {}}
                    />
                    {curpExistente && (
                      <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', fontWeight: 'bold' }}>
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
                      style={user.usuario?.sexoId ? { cursor: 'not-allowed', backgroundColor: 'rgba(255,255,255,0.05)' } : { cursor: 'pointer' }}
                      disabled={!!user.usuario?.sexoId}
                    >
                      <option value="">Selecciona...</option>
                      <option value="MASCULINO">Masculino</option>
                      <option value="FEMENINO">Femenino</option>
                      <option value="NO BINARIO">No binario</option>
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
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '12px',
                          color: 'white',
                          fontSize: '14px',
                          outline: 'none',
                          cursor: 'not-allowed',
                          backdropFilter: 'blur(4px)'
                        }}
                      >
                        <option value="+52" style={{ background: '#1e1b4b', color: 'white' }}>México +52</option>
                        <option value="+1" style={{ background: '#1e1b4b', color: 'white' }}>EE.UU./Canadá +1</option>
                        <option value="+34" style={{ background: '#1e1b4b', color: 'white' }}>España +34</option>
                        <option value="+54" style={{ background: '#1e1b4b', color: 'white' }}>Argentina +54</option>
                        <option value="+55" style={{ background: '#1e1b4b', color: 'white' }}>Brasil +55</option>
                        <option value="+56" style={{ background: '#1e1b4b', color: 'white' }}>Chile +56</option>
                        <option value="+57" style={{ background: '#1e1b4b', color: 'white' }}>Colombia +57</option>
                        <option value="+506" style={{ background: '#1e1b4b', color: 'white' }}>Costa Rica +506</option>
                        <option value="+593" style={{ background: '#1e1b4b', color: 'white' }}>Ecuador +593</option>
                        <option value="+503" style={{ background: '#1e1b4b', color: 'white' }}>El Salvador +503</option>
                        <option value="+502" style={{ background: '#1e1b4b', color: 'white' }}>Guatemala +502</option>
                        <option value="+504" style={{ background: '#1e1b4b', color: 'white' }}>Honduras +504</option>
                        <option value="+505" style={{ background: '#1e1b4b', color: 'white' }}>Nicaragua +505</option>
                        <option value="+507" style={{ background: '#1e1b4b', color: 'white' }}>Panamá +507</option>
                        <option value="+595" style={{ background: '#1e1b4b', color: 'white' }}>Paraguay +595</option>
                        <option value="+51" style={{ background: '#1e1b4b', color: 'white' }}>Perú +51</option>
                        <option value="+598" style={{ background: '#1e1b4b', color: 'white' }}>Uruguay +598</option>
                        <option value="+58" style={{ background: '#1e1b4b', color: 'white' }}>Venezuela +58</option>
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
                        style={{ cursor: 'not-allowed', flexGrow: 1, backgroundColor: 'rgba(255,255,255,0.05)' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                ocrResults.equipo && ocrResults.nombre && ocrResults.curp &&
                ocrResults.fecha_nac && esMayorDeEdad && ocrResults.nacionalidad && ocrResults.sexo &&
                ocrResults.telefono && liga && tipoAfiliacion &&
                documents.actaNacimiento && documents.identificacion && documents.fotografia
              );
              return (
                <div className="doc-cards-grid">
                  {requisitos.map((doc, idx) => {
                    const isUploaded = !!documents[doc.documento];
                    const isOcrDoc = ['actaNacimiento', 'identificacion'].includes(doc.documento);
                    const ocrProcessed = isOcrDoc && ocrResults[doc.documento];
                    const icons = { actaNacimiento: '📜', identificacion: '🪪', fotografia: '📸', formatoAfiliacion: '📝' };

                    let statusLabel, statusColor, statusDotColor, statusBg;
                    if (ocrProcessed) {
                      statusLabel = 'Procesado'; statusColor = '#34d399'; statusDotColor = '#10b981'; statusBg = 'rgba(16,185,129,0.12)';
                    } else if (isUploaded) {
                      statusLabel = 'Listo'; statusColor = '#34d399'; statusDotColor = '#10b981'; statusBg = 'rgba(16,185,129,0.12)';
                    } else {
                      statusLabel = 'Pendiente'; statusColor = '#f59e0b'; statusDotColor = '#d97706'; statusBg = 'rgba(245,158,11,0.12)';
                    }

                    return (
                      <div key={idx} className={`doc-glass-card${isUploaded ? ' uploaded' : ''}`}>
                        {/* Top sheen */}
                        <div className="top-sheen" style={{ background: isUploaded ? 'linear-gradient(90deg,transparent,rgba(16,185,129,0.4),transparent)' : 'linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)' }} />
                        {/* Status pill */}
                        <div className="doc-status-pill" style={{ background: statusBg, color: statusColor }}>
                          <div className="doc-status-dot" style={{ background: statusDotColor, boxShadow: `0 0 5px ${statusDotColor}` }} />
                          {statusLabel}
                        </div>
                        {/* Icon */}
                        <div className="doc-glass-icon" style={{
                          background: isUploaded ? 'linear-gradient(135deg,rgba(16,185,129,0.12),rgba(5,150,105,0.08))' : 'linear-gradient(135deg,rgba(11,78,166,0.1),rgba(30,27,75,0.08))',
                          border: isUploaded ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(93,135,229,0.12)',
                        }}>
                          <span>{icons[doc.documento]}</span>
                        </div>
                        {/* Title */}
                        <h4 style={{ fontSize: '14px', fontWeight: '800', color: isUploaded ? '#34d399' : 'var(--text-main)', margin: '0 0 5px' }}>
                          {doc.nombre}
                        </h4>
                        {/* Filename */}
                        <p style={{ fontSize: '10px', color: isUploaded ? 'rgba(52,211,153,0.7)' : 'var(--text-muted)', margin: '0 0 18px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90%' }}>
                          {isUploaded ? `📎 ${documents[doc.documento].name}` : 'Sin archivo seleccionado'}
                        </p>
                        {/* Photo error */}
                        {error && doc.documento === 'fotografia' && (
                          <div style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '600', marginBottom: '14px', width: '100%', textAlign: 'center' }}>
                            ⚠️ {error}
                          </div>
                        )}
                        {/* Photo validation bypass button */}
                        {fotoValidacionFallida && doc.documento === 'fotografia' && fotoArchivoPendiente && (
                          <button
                            onClick={handleForzarSubidaFoto}
                            className="doc-action-btn"
                            style={{
                              border: '1px solid rgba(245,158,11,0.5)',
                              background: 'rgba(245,158,11,0.15)',
                              color: '#f59e0b',
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
                        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                          {doc.hasDownload && (
                            <button
                              onClick={(e) => {
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
                          <button
                            onClick={() => {
                              if (doc.documento === 'formatoAfiliacion' && formatAfiliacionLocked) {
                                return Swal.fire('Acción requerida', 'Debes completar todos los datos de identidad y documentos anteriores antes de subir el formato de afiliación.', 'warning');
                              }
                              document.getElementById(`file-${doc.documento}`).click();
                            }}
                            className="doc-action-btn"
                            style={{
                              border: isUploaded ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.1)',
                              background: isUploaded ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)',
                              color: isUploaded ? '#34d399' : 'var(--text-muted)',
                              opacity: doc.documento === 'formatoAfiliacion' && formatAfiliacionLocked ? 0.5 : 1,
                              cursor: doc.documento === 'formatoAfiliacion' && formatAfiliacionLocked ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {isUploaded ? '🔄 Cambiar' : (error && doc.documento === 'fotografia' ? '🔄 Reintentar' : '⬆ Subir')}
                          </button>
                          <input type="file" id={`file-${doc.documento}`} style={{ display: 'none' }} onChange={(e) => handleFileUpload(doc.documento, e.target.files[0])} />
                        </div>
                        {/* OCR toggle */}
                        <button
                          onClick={() => setDetailsOpen(prev => ({ ...prev, [doc.documento]: !prev[doc.documento] }))}
                          style={{ marginTop: '12px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', letterSpacing: '0.5px' }}
                        >
                          {detailsOpen[doc.documento] ? '▲ Ocultar detalles' : '▼ Ver detalles extraídos'}
                        </button>
                        {detailsOpen[doc.documento] && (
                          <div className="ocr-panel">
                            {(doc.documento === 'actaNacimiento' || doc.documento === 'identificacion') && Object.keys(ocrResults).length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {[
                                  { label: 'Nombre', value: ocrResults.nombre },
                                  { label: 'CURP', value: ocrResults.curp },
                                  { label: 'Fecha Nac.', value: ocrResults.fecha_nac },
                                  { label: 'Edad', value: ocrResults.edad },
                                  { label: 'Nacionalidad', value: ocrResults.nacionalidad },
                                  { label: 'Sexo', value: ocrResults.sexo },
                                  { label: 'Teléfono', value: ocrResults.telefono },
                                  { label: 'Equipo', value: ocrResults.equipo },
                                ].map((row, i) => (
                                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                    <span style={{ color: 'var(--text-muted)', fontWeight: '700' }}>{row.label}:</span>
                                    <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>{row.value || '—'}</span>
                                  </div>
                                ))}
                              </div>
                            ) : doc.documento === 'fotografia' ? (
                              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>📸 Validación automática de rostro, calidad y formato.</p>
                            ) : doc.documento === 'formatoAfiliacion' ? (
                              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>📝 Descarga el formato, fírmalo físicamente y súbelo aquí.</p>
                            ) : (
                              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>Sube el documento primero para ver los datos extraídos.</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* BOTONES DE NAVEGACIÓN */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', padding: '12px 30px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s ease' }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
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
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '25px', display: 'inline-block', textAlign: 'left' }}>
                <p style={{ margin: '0 0 10px', fontSize: '14px', color: '#34d399', fontWeight: '700' }}>✓ Pago Validado</p>
                <p style={{ margin: '0 0 10px', fontSize: '14px', color: '#f59e0b', fontWeight: '700' }}>⏳ Solicitud: EN ESPERA</p>
                <p style={{ margin: '0', fontSize: '14px', color: 'rgba(255,255,255,0.3)', fontWeight: '700' }}>○ Acceso: PENDIENTE</p>
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
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{
              backgroundColor: '#1e293b',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '850px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              color: 'var(--text-main)'
            }}>
              {/* Header */}
              <div style={{
                padding: '25px 30px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '15px',
                background: 'linear-gradient(90deg, #1e293b, #0f172a)'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '12px', fontWeight: '900', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {esPresidente ? 'Seguro Presidente' : 'Seguro Jugador'}
                  </h3>
                  <h2 style={{ margin: '5px 0 0', fontSize: '22px', fontWeight: '900', color: '#ffffff' }}>
                    {info.nombre}
                  </h2>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: '700', textTransform: 'uppercase' }}>Costo Unitario</div>
                  <div style={{ fontSize: '26px', fontWeight: '900', color: '#34d399' }}>
                    ${Number(info.precio).toFixed(2)} <span style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.6)' }}>M.N.</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '25px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px' }}>
                  {/* Left Column - Benefits */}
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '900', color: '#94a3b8', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                      Beneficios Incluidos
                    </h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {info.beneficios.map((ben, idx) => (
                        <li key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '13px', lineHeight: '1.5', color: 'rgba(255,255,255,0.85)' }}>
                          <span style={{ color: '#34d399', fontWeight: '900', fontSize: '15px' }}>✓</span>
                          <span>{ben}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Right Column - Policy & Scope */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: '900', color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                        Detalles de la Póliza
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '700', textTransform: 'uppercase' }}>No. de Póliza</div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff', marginTop: '4px' }}>{info.poliza}</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '700', textTransform: 'uppercase' }}>Vigencia</div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff', marginTop: '4px' }}>{info.vigencia}</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: '900', color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                        Alcance y Cobertura
                      </h4>
                      <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.6', color: 'rgba(255, 255, 255, 0.7)', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '12px', padding: '14px' }}>
                        {info.alcance.includes('traslados dentro del mismo estado') ? (
                          <>
                            {info.alcance.replace('traslados dentro del mismo estado.', '')}
                            <strong style={{ color: '#ef4444' }}>traslados dentro del mismo estado.</strong>
                          </>
                        ) : info.alcance.includes('traslados de estado a estado') ? (
                          <>
                            {info.alcance.replace('traslados de estado a estado.', '')}
                            <strong style={{ color: '#ef4444' }}>traslados de estado a estado.</strong>
                          </>
                        ) : info.alcance.includes('traslados entre estados') ? (
                          <>
                            {info.alcance.replace('traslados entre estados.', '')}
                            <strong style={{ color: '#ef4444' }}>traslados entre estados.</strong>
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
                    <h4 style={{ fontSize: '14px', fontWeight: '900', color: '#94a3b8', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                      Montos de Cobertura
                    </h4>
                    <div style={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', overflowX: 'auto' }}>
                      <table style={{ width: '100%', minWidth: '300px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <th style={{ padding: '12px 20px', fontWeight: '800', color: 'rgba(255,255,255,0.6)' }}>Cobertura / Concepto</th>
                            <th style={{ padding: '12px 20px', fontWeight: '800', color: 'rgba(255,255,255,0.6)', textAlign: 'right' }}>Monto Máximo Amparado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {info.coberturas.map((cob, idx) => (
                            <tr key={idx} style={{ borderBottom: idx === info.coberturas.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)', backgroundColor: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                              <td style={{ padding: '12px 20px', fontWeight: '700', color: '#ffffff' }}>{cob.cobertura}</td>
                              <td style={{ padding: '12px 20px', fontWeight: '900', color: cob.cobertura.toLowerCase().includes('deducible') ? '#ef4444' : '#34d399', textAlign: 'right' }}>{cob.monto}</td>
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
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: 'rgba(15, 23, 42, 0.3)',
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
                    <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)' }}>
                      Este seguro se asignará a tu cuenta de Presidente de Equipo.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600' }}>
                        Selecciona la cantidad:
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '3px' }}>
                        <button
                          type="button"
                          onClick={() => setCantidadModal(prev => Math.max(0, prev - 1))}
                          style={{ width: '32px', height: '32px', borderRadius: '10px', border: 'none', background: 'rgba(255,255,255,0.06)', color: 'white', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
                          style={{ width: '60px', border: 'none', background: 'transparent', color: '#ffffff', textAlign: 'center', fontWeight: '900', fontSize: '16px' }}
                        />
                        <button
                          type="button"
                          onClick={() => setCantidadModal(prev => prev + 1)}
                          style={{ width: '32px', height: '32px', borderRadius: '10px', border: 'none', background: 'rgba(255,255,255,0.06)', color: 'white', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >+</button>
                      </div>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>
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
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.7)',
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
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                      border: 'none',
                      color: '#ffffff',
                      padding: '10px 28px',
                      borderRadius: '12px',
                      fontWeight: '900',
                      cursor: 'pointer',
                      fontSize: '14px',
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
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
    </div>
  );
}

export default PreRegistroPresidente;


