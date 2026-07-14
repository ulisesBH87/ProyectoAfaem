import COLORS from '../../styles/colors';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../routes/paths';
import { FaUpload, FaCheckCircle, FaTimesCircle, FaChevronRight, FaChevronLeft, FaFileAlt, FaClock, FaTrash, FaSearchPlus, FaSyncAlt } from 'react-icons/fa';
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
import { openSecurePath, fetchSecureBlobUrl } from '../../utils/secureFetch';
import { buildCaptureSourceDialog, getCameraCaptureKind, showDocumentGuide, CAMERA_CAPTURE_KIND } from '../../utils/cameraCapture';
import { DETALLES_SEGUROS, CATALOGO_ROLES, DOC_AFILIACION_IDS } from './preRegistroConstants';
import { convertToDDMMYYYY, convertToYYYYMMDD, normalizarNombreSeguro, parsearTelefonoE164 } from './preRegistroUtils';
import { generarPDFCuota as generarPDFCuotaHelper, handleDownloadFormato as handleDownloadFormatoHelper, handleEmbedNewPhotoInFormat as handleEmbedNewPhotoInFormatHelper } from './preRegistroPdfHelper';
import { procesarOCRReal as procesarOCRRealHelper } from './preRegistroOcrHelper';
import { registerSuccessfulScanAttempt } from '../../utils/scanAttemptWarning';
import SeguroDetallesModal from './components/SeguroDetallesModal';
import StepBienvenida from './components/StepBienvenida';
import StepRevisionSolicitud from './components/StepRevisionSolicitud';
import StepValidacionPago from './components/StepValidacionPago';

function PreRegistroPresidente() {
  const navigate = useNavigate();
  const { estatusId, refreshAccess, isLoading: rbacLoading } = useRBAC();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const nombreUsuarioCompleto = user?.usuario?.nombre || user?.nombre || user?.Nombre || user?.NombreUsuario || 'Usuario';
  const successfulScanCountsRef = useRef({});

  // Estados Generales
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pasoActual, setPasoActual] = useState(null); // 0 = Bienvenida, 1 = Pago/Seguro, 2 = Revisión de orden, 3 = Documentos, 4 = Revisión de solicitud
  const [estadoPago, setEstadoPago] = useState(null); // null, 1=NO ENVIADO, 2=ESPERA, 3=ACTIVO, 4=RECHAZADO
  const [ordenPendienteId, setOrdenPendienteId] = useState(null); // ID si se guardó la orden a la mitad
  const [estadoSolicitud, setEstadoSolicitud] = useState(null); // 1=ESPERA, 2/3=RECHAZADA, 4=BORRADOR
  const [solicitudActualId, setSolicitudActualId] = useState(null);
  const [mensajeRechazoPago, setMensajeRechazoPago] = useState('');
  const [mensajeRechazoSolicitud, setMensajeRechazoSolicitud] = useState('');
  const [curpExistente, setCurpExistente] = useState(false);
  const [tieneEstadoBackend, setTieneEstadoBackend] = useState(false);
  const [referenciaPago, setReferenciaPago] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null); // { file?: File, url?: string, type?: 'image' | 'pdf', title: string }
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (previewDoc?.url) {
      setPreviewUrl(previewDoc.url);
    } else if (previewDoc?.file) {
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
    const esPres = ['TIPO G', 'TIPO J'].includes(normalizedName);
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
  const [previews, setPreviews] = useState({});
  const [docMimeTypes, setDocMimeTypes] = useState({});

  const uploadPaymentButtonStyle = {
    padding: '10px 18px',
    minHeight: '44px',
    borderRadius: '12px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '13px',
    fontWeight: '800',
    letterSpacing: '0.01em',
    border: `1px solid ${COLORS.brandBlueLight30}`,
    color: COLORS.white,
    background: `linear-gradient(135deg, ${COLORS.brandBlueLight}, ${COLORS.primary})`,
    boxShadow: `0 10px 24px ${COLORS.brandBlueLight20}`,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease',
  };

  const downloadOrderButtonStyle = {
    padding: '10px 18px',
    minHeight: '44px',
    borderRadius: '12px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '13px',
    fontWeight: '800',
    letterSpacing: '0.01em',
    border: `1px solid ${COLORS.brandBlueLight30}`,
    color: COLORS.brandBlueLight,
    background: COLORS.overlayWhite08,
    boxShadow: `0 6px 18px ${COLORS.shadow10}`,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
    backdropFilter: 'blur(10px)',
  };

  const previewPaymentButtonStyle = {
    padding: '10px 18px',
    minHeight: '44px',
    borderRadius: '12px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '13px',
    fontWeight: '800',
    letterSpacing: '0.01em',
    border: `1px solid ${COLORS.brandBlueLight20}`,
    color: COLORS.slate800,
    background: COLORS.overlayWhite06,
    boxShadow: `0 6px 18px ${COLORS.shadow10}`,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
    backdropFilter: 'blur(10px)',
  };

  useEffect(() => {
    if (!documentosGuardados || documentosGuardados.length === 0) return;

    const docIdMap = {
      8: 'actaNacimiento',
      38: 'identificacion',
      37: 'fotografia',
      10: 'formatoAfiliacion'
    };

    documentosGuardados.forEach(async (d) => {
      const docAfiliacionId = Number(d.DocumentoAfiliacionId || d.documentoAfiliacionId);
      const key = docIdMap[docAfiliacionId];
      if (!key) return;

      try {
        const path = d.Url || d.url;
        if (!path) return;

        let url;
        let mimeType = '';

        if (path.startsWith('http') || path.startsWith('data:')) {
          url = path;
          if (path.toLowerCase().endsWith('.pdf')) {
            mimeType = 'application/pdf';
          } else {
            mimeType = 'image/jpeg';
          }
        } else {
          const cleanPath = path.replace(/\\/g, '/');
          const pathWithSlash = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
          const fullUrl = `${API_BASE}${pathWithSlash}`;

          const token = localStorage.getItem('token');
          const headers = {};
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch(fullUrl, { headers });
          if (response.ok) {
            const blob = await response.blob();
            url = URL.createObjectURL(blob);
            mimeType = blob.type;
          }
        }

        if (url) {
          setPreviews(prev => {
            if (prev[key]) return prev;
            return { ...prev, [key]: url };
          });
          setDocMimeTypes(prev => {
            if (prev[key]) return prev;
            return { ...prev, [key]: mimeType };
          });
        }
      } catch (err) {
        console.error(`Error fetching secure preview for ${key}:`, err);
      }
    });
  }, [documentosGuardados]);

  useEffect(() => {
    Object.keys(documents).forEach(key => {
      const file = documents[key];
      if (file) {
        setDocMimeTypes(prev => ({ ...prev, [key]: file.type }));
        if (file.type?.startsWith('image/')) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setPreviews(prev => {
              if (prev[key] === reader.result) return prev;
              return { ...prev, [key]: reader.result };
            });
          };
          reader.readAsDataURL(file);
        } else if (file.type === 'application/pdf') {
          const url = URL.createObjectURL(file);
          setPreviews(prev => ({ ...prev, [key]: url }));
        }
      } else {
        setDocMimeTypes(prev => ({ ...prev, [key]: null }));
        setPreviews(prev => {
          if (prev[key] === null) return prev;
          if (prev[key] && prev[key].startsWith('blob:')) {
            URL.revokeObjectURL(prev[key]);
          }
          return { ...prev, [key]: null };
        });
      }
    });
  }, [documents]);

  const [, setFotoPreview] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState({});
  const [tipoAfiliacion, setTipoAfiliacion] = useState('');
  const [asociacion, setAsociacion] = useState('Morelos');
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


  const triggerDocUpload = (docKey, isValidationFlow = false) => {
    if (docKey === 'formatoAfiliacion' && !isValidationFlow && formatAfiliacionLocked) {
      return Swal.fire('Acción requerida', 'Debes completar todos los datos de identidad y documentos anteriores antes de subir el formato de afiliación.', 'warning');
    }
    const inputId = isValidationFlow ? `file-val-${docKey}` : `file-${docKey}`;
    if (docKey === 'fotografia') {
      const openSource = () => {
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
            setCameraTargetKey(inputId);
            setIsCameraOpen(true);
          } else if (result.dismiss === Swal.DismissReason.cancel) {
            const inputEl = document.getElementById(inputId);
            if (inputEl) inputEl.click();
          }
        });
      };

      showDocumentGuide('fotografia', COLORS).then((result) => {
        if (result.isConfirmed) {
          openSource();
        }
      });
    } else {
      const captureKind = getCameraCaptureKind(docKey);
      const openSource = () => {
        Swal.fire(buildCaptureSourceDialog(captureKind, COLORS)).then((result) => {
          if (result.isConfirmed) {
            setCameraTargetKey(inputId);
            setIsCameraOpen(true);
          } else if (result.dismiss === Swal.DismissReason.cancel) {
            const inputEl = document.getElementById(inputId);
            if (inputEl) inputEl.click();
          }
        });
      };

      if (captureKind === CAMERA_CAPTURE_KIND.DOCUMENT) {
        showDocumentGuide(docKey, COLORS).then((result) => {
          if (result.isConfirmed) {
            openSource();
          }
        });
      } else {
        openSource();
      }
    }
  };

  const triggerComprobanteUpload = () => {
    Swal.fire(buildCaptureSourceDialog(getCameraCaptureKind('comprobante'), COLORS)).then((result) => {
      if (result.isConfirmed) {
        setCameraTargetKey('file-comprobante');
        setIsCameraOpen(true);
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        const inputEl = document.getElementById('comprobante');
        if (inputEl) inputEl.click();
      }
    });
  };

  const handleCameraPhotoCaptured = (file) => {
    if (!cameraTargetKey) return;

    const targetKey = cameraTargetKey.replace(/^file-val-/, '').replace(/^file-/, '');

    if (targetKey === 'comprobante') {
      manejarArchivoComprobante(file);
      return;
    }

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
    ['TIPO G', 'TIPO J'].includes(seg.nombre.toUpperCase().trim())
  );
  const segurosJugadores = catalogoSeguros.filter((seg) =>
    !['TIPO G', 'TIPO J'].includes(seg.nombre.toUpperCase().trim())
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
          if (seg.nombre.toUpperCase().trim() === 'TIPO J') {
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
        setPasoActual(4); // Pantalla de "en espera de aprobación"
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
      setTieneEstadoBackend(true);
    } else if (estatusId === null && !rbacLoading) {
      // Si ya cargó y no hay estatus, iniciar en paso 0 (Bienvenida)
      setPasoActual(0);
      setTieneEstadoBackend(true);
    }
  }, [estatusId, rbacLoading, navigate, tieneEstadoBackend]);

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

    if (data.nombre_equipo) {
      setOcrResults(prev => ({ ...prev, equipo: data.nombre_equipo }));
    }
    if (data.liga_id) {
      setLiga(String(data.liga_id));
    }
    if (data.telefono) {
      const { codigoPais: parsedCodigo, telefono: parsedLocal } = parsearTelefonoE164(data.telefono);
      setCodigoPais(parsedCodigo);
      setOcrResults(prev => ({ ...prev, telefono: parsedLocal }));
    }
    if (data.curp) {
      setOcrResults(prev => ({ ...prev, curp: data.curp.toUpperCase() }));
    }
    if (data.lugar_nacimiento) {
      setOcrResults(prev => ({ ...prev, nacionalidad: data.lugar_nacimiento.toUpperCase() }));
    }
    if (data.fecha_nacimiento) {
      setOcrResults(prev => ({ ...prev, fecha_nac: data.fecha_nacimiento }));
    }
    if (data.sexo) {
      setOcrResults(prev => ({ ...prev, sexo: data.sexo.toUpperCase() }));
    }

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
        setPasoActual(4); // Pantalla de "en espera de aprobación"
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
    generarPDFCuotaHelper(ordenId, refDirecta, { jsPDF, Swal, bankInfo, user, totalMostrado, catalogoSeguros, asignacionSeguros, referenciaPago });
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

  const procesarOCRReal = async (docKey, file, prevDoc) => {
    await procesarOCRRealHelper(docKey, file, prevDoc, { API_BASE, Swal, setOcrResults, setCodigoPais, setDocuments, successfulScanCountsRef });
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
    await handleDownloadFormatoHelper({ Swal, PDFDocument, documents, ocrResults, user, asociacion, codigoPais, tipoAfiliacion, liga, ligasCatalogo, cargoSeleccionado });
  };

  const handleEmbedNewPhotoInFormat = async () => {
    await handleEmbedNewPhotoInFormatHelper({ Swal, PDFDocument, previews, documents, API_BASE, solicitudActualId, cargarDocumentosSolicitud, COLORS });
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
      const data = await validarFotografia(archivo, "PRESIDENTE");
      await registerSuccessfulScanAttempt({ attemptsRef: successfulScanCountsRef, scanKey: 'fotografia', Swal });
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
        ...extra
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
        [field]: value
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

  const isActaUploaded = !!documents.actaNacimiento || documentosGuardados.some(d => Number(d.DocumentoAfiliacionId || d.documentoAfiliacionId) === 8);
  const isIneUploaded = !!documents.identificacion || documentosGuardados.some(d => Number(d.DocumentoAfiliacionId || d.documentoAfiliacionId) === 38);
  const isFotoUploaded = !!documents.fotografia || documentosGuardados.some(d => Number(d.DocumentoAfiliacionId || d.documentoAfiliacionId) === 37);

  const formatAfiliacionLocked = !(
    ocrResults.equipo && nombreEquipoValido && ocrResults.nombre && ocrResults.curp &&
    ocrResults.fecha_nac && esMayorDeEdad && ocrResults.nacionalidad && ocrResults.sexo &&
    ocrResults.telefono && liga && tipoAfiliacion &&
    isActaUploaded && isIneUploaded && isFotoUploaded
  );

  const isFormatoUploaded = !!documents.formatoAfiliacion || documentosGuardados.some(d => Number(d.DocumentoAfiliacionId || d.documentoAfiliacionId) === 10);
  const isRegistroCompleto = !formatAfiliacionLocked && isFormatoUploaded;

  if (rbacLoading || pasoActual === null) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f1f5f9',
        fontFamily: "'Outfit', sans-serif"
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          padding: '40px',
          background: 'white',
          borderRadius: '24px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0'
        }}>
          <img
            src={AfaemLogo}
            alt="AFAEM"
            style={{ height: '80px', width: 'auto', objectFit: 'contain', marginBottom: '10px' }}
          />
          <div style={{
            width: '50px',
            height: '50px',
            border: `5px solid rgba(11, 78, 166, 0.1)`,
            borderTop: `5px solid #0b4ea6`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <p style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: '700',
            color: '#1e293b',
            letterSpacing: '0.5px'
          }}>
            Verificando estatus de registro...
          </p>
          <p style={{
            margin: 0,
            fontSize: '12px',
            color: '#64748b',
            textAlign: 'center'
          }}>
            Por favor, espera un momento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in prereg-dark-page" style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: (pasoActual === 0 || pasoActual === 2 || pasoActual === 4) ? 'center' : 'flex-start',
      padding: '20px 20px',
      position: 'relative',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');

        .prereg-dark-page {
          font-family: 'Outfit', 'Inter', -apple-system, sans-serif !important;
          background: #f1f5f9 !important;

          /* DESIGN SYSTEM COLOR TOKENS */
          --color-bg: #f1f5f9;
          --color-surface: #ffffff;
          --color-card: #ffffff;
          --color-card-hover: #f8fafc;
          --color-card-selected: #eff6ff;

          --color-border: #cbd5e1;
          --color-border-hover: #94a3b8;
          --color-border-active: #0b4ea6;

          --color-text: #111827;
          --color-text-secondary: #374151;
          --color-text-muted: #4b5563;

          --color-primary: #0b4ea6;
          --color-primary-hover: #083b7e;
          --color-primary-active: #063f82;
          --color-success: #03543f;
          --color-danger: #9b1c1c;

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
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
          border-radius: 28px !important;
        }

        .prereg-dark-page .glass {
          background: var(--color-surface) !important;
          border: 1px solid var(--color-border) !important;
          backdrop-filter: blur(24px) !important;
          -webkit-backdrop-filter: blur(24px) !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
        }

        /* Stepper header styling (Blue Header!) */
        .prereg-stepper-header {
          background: var(--color-primary) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.15) !important;
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
          border-color: #e2e8f0 !important; 
          font-size: 16px;
          font-weight: 800;
        }

        .prereg-dark-page .bank-info-label { color: var(--color-text-muted); font-weight: 600; }
        .prereg-dark-page .bank-info-value { color: var(--color-text); font-weight: 700; }
        .prereg-dark-page .referencia-badge { 
          background: #eff6ff !important; 
          color: var(--color-primary); 
          border: 1px solid #bfdbfe !important; 
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
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05) !important;
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
          background: #ffffff !important;
          border: 1px solid #78889b !important;
          color: var(--color-text) !important;
          border-radius: 12px;
          padding: 12px 16px;
          transition: all 0.25s ease !important;
          font-weight: 800;
        }

        .prereg-dark-page .input-number:focus {
          background: #ffffff !important;
          border-color: var(--color-primary) !important;
          box-shadow: 0 0 0 3px rgba(11, 78, 166, 0.15) !important;
          outline: none;
        }

        .prereg-dark-page .insurance-input {
          background: #ffffff !important;
          border: 1px solid #78889b !important;
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
          background: #ffffff !important;
          border-color: var(--color-primary) !important;
          box-shadow: 0 0 0 3px rgba(11, 78, 166, 0.15) !important;
        }

        .prereg-dark-page .insurance-input.error-state {
          border-color: var(--color-danger) !important;
          background: #fdf2f2 !important;
          color: #9b1c1c !important;
        }

        .prereg-dark-page .btn-nav-gray {
          background: #f8fafc !important;
          border: 1px solid var(--color-border) !important;
          color: var(--color-text-secondary) !important;
          border-radius: 14px; 
          padding: 12px 30px; 
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s !important;
        }

        .prereg-dark-page .btn-nav-gray:hover {
          background: #f1f5f9 !important;
          color: var(--color-text) !important;
        }

        .prereg-dark-page .btn-nav-blue {
          background: var(--color-primary) !important;
          color: white !important; 
          border: none !important;
          border-radius: 14px; 
          padding: 12px 30px; 
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
          transition: all 0.2s !important;
        }

        .prereg-dark-page .btn-nav-blue:hover {
          background: var(--color-primary-hover) !important;
          transform: translateY(-1px) !important;
        }

        .prereg-dark-page .btn-nav-blue:disabled { 
          opacity: 0.5 !important; 
          cursor: not-allowed !important;
          transform: none !important;
        }

        .prereg-dark-page .btn-premium {
          background: var(--color-primary) !important;
          border: none !important;
          color: white !important;
          font-weight: 800;
          font-size: 14.5px;
          text-transform: uppercase;
          letter-spacing: 0.75px;
          border-radius: 14px;
          padding: 14px 44px;
          cursor: pointer;
          transition: all 0.25s ease !important;
        }

        .prereg-dark-page .btn-premium:hover {
          background: var(--color-primary-hover) !important;
          transform: translateY(-2px) !important;
          filter: brightness(1.1) !important;
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
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
          transition: all 0.25s ease !important;
        }

        .insurance-card:hover {
          background: var(--color-card-hover) !important;
          border-color: var(--color-border-hover) !important;
          transform: translateY(-2px) !important;
        }

        .insurance-card.active-insurance {
          border-color: var(--color-border-active) !important;
          background: var(--color-card-selected) !important;
        }

        .insurance-radio {
          appearance: none;
          -webkit-appearance: none;
          width: 22px;
          height: 22px;
          border: 2px solid #cbd5e1 !important;
          border-radius: 50%;
          outline: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.25s ease !important;
          position: relative;
        }

        .insurance-radio:checked {
          border-color: var(--color-primary) !important;
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
          transition: all 0.4s ease !important;
        }

        .doc-glass-card:hover {
          transform: translateY(-5px) !important;
          background: var(--color-card-hover) !important;
          border-color: var(--color-border-active) !important; 
          border-style: solid !important;
        }

        .doc-glass-card.uploaded {
          background: #f0fdf4 !important;
          border: 1.5px solid #bbf7d0 !important;
        }

        .doc-glass-card.uploaded:hover { 
          border-color: #86efac !important; 
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
          background: #f8fafc !important;
          border: 1px solid var(--color-border) !important;
          color: var(--color-text-secondary) !important;
        }

        .doc-glass-card:hover .doc-glass-icon { 
          transform: scale(1.05) !important; 
        }

        .doc-glass-card:hover .overlay-actions {
          opacity: 1 !important;
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
          background: #eff6ff !important; 
          border: 1px solid #bfdbfe !important;
          color: var(--color-primary) !important; 
          transition: all 0.2s ease !important;
          display: flex; 
          align-items: center; 
          justify-content: center; 
          gap: 6px;
        }

        .doc-download-btn:hover {
          background: #dbeafe !important; 
          border-color: #93c5fd !important;
          transform: translateY(-1.5px) !important; 
        }

        .ocr-panel {
          width: 100%; 
          margin-top: 14px;
          background: #f8fafc !important; 
          border: 1px solid #e2e8f0 !important;
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
          background: #ffffff !important;
          border: 1px solid #78889b !important;
          border-radius: 14px; 
          font-size: 14.5px; 
          font-weight: 600;
          color: var(--color-text); 
          outline: none;
          transition: all 0.25s ease !important;
        }

        .premium-input.filled {
          border-color: #10b981 !important;
        }

        .premium-input:focus {
          background: #ffffff !important;
          border-color: var(--color-primary) !important;
          box-shadow: 0 0 0 3px rgba(11, 78, 166, 0.15) !important;
        }

        .premium-input.filled:focus {
          border-color: #10b981 !important;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15) !important;
        }

        .premium-input::placeholder { color: #9ca3af !important; }
        .premium-input option { background: #ffffff; color: #111827; }

        .premium-input:disabled {
          background: #f1f5f9 !important;
          color: #6b7280 !important;
          border-color: #cbd5e1 !important;
          cursor: not-allowed !important;
        }

        .progress-pill {
          height: 8px; 
          border-radius: 4px;
          transition: all 0.4s ease !important;
        }

        .afaem-logo {
          height: 75px;
          width: auto;
          object-fit: contain;
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

      <div className="card glass" style={{ width: '95%', maxWidth: '1400px', padding: 0, overflow: 'hidden' }}>
        {pasoActual === 0 && (
          <StepBienvenida
            nombreUsuarioCompleto={nombreUsuarioCompleto}
            irSiguientePaso={irSiguientePaso}
            handleLogout={handleLogout}
          />
        )}

        {/* ===== GLASS STEPPER HEADER (PASO 1, 2 Y 3) ===== */}
        {(pasoActual === 1 || pasoActual === 3 || pasoActual === 5) && (
          <div className="prereg-stepper-header" style={{
            padding: '16px 24px 14px',
            borderBottom: `1px solid rgba(255, 255, 255, 0.15)`,
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <img
                src={AfaemLogo}
                alt="AFAEM"
                style={{ height: '45px', width: 'auto', objectFit: 'contain' }}
              />
              <p style={{
                fontSize: '11px',
                fontWeight: '700',
                color: '#ffffff',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                margin: 0,
                opacity: 0.8,
                textAlign: 'center'
              }}>
                PROCESO DE ACTIVACIÓN
              </p>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <img src={FmfLogo} alt="FMF" style={{ height: '30px', width: 'auto', objectFit: 'contain', opacity: 0.9 }} />
                <img src={AmateurLogo} alt="Amateur" style={{ height: '30px', width: 'auto', objectFit: 'contain', opacity: 0.9 }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* STEP 1 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '18px', height: '18px', borderRadius: '999px',
                  background: pasoActual === 1 ? '#ffffff' : '#10b981',
                  border: pasoActual === 1 ? `3px solid rgba(255, 255, 255, 0.3)` : 'none',
                  transition: 'all 0.4s ease',
                }} />
                <span style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', color: pasoActual === 1 ? '#ffffff' : (pasoActual > 1 ? '#a7f3d0' : 'rgba(255, 255, 255, 0.5)') }}>
                  PASO 1: CUOTAS
                </span>
              </div>

              {/* Connector 1 */}
              <div style={{ position: 'relative', width: '80px', height: '2px', margin: '0 10px', marginBottom: '20px' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255, 255, 255, 0.2)', borderRadius: '2px' }} />
                <div style={{
                  position: 'absolute', top: 0, left: 0, height: '100%',
                  width: pasoActual > 1 ? '100%' : '0%',
                  background: '#10b981',
                  borderRadius: '2px', transition: 'width 0.6s ease',
                }} />
              </div>

              {/* STEP 2 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '18px', height: '18px', borderRadius: '999px',
                  background: pasoActual === 3 ? '#ffffff' : (pasoActual > 3 ? '#10b981' : 'rgba(255, 255, 255, 0.2)'),
                  border: pasoActual === 3 ? `3px solid rgba(255, 255, 255, 0.3)` : (pasoActual > 3 ? 'none' : '1px solid rgba(255, 255, 255, 0.3)'),
                  transition: 'all 0.4s ease',
                }} />
                <span style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', color: pasoActual === 3 ? '#ffffff' : (pasoActual > 3 ? '#a7f3d0' : 'rgba(255, 255, 255, 0.5)') }}>
                  PASO 2: DOCUMENTOS
                </span>
              </div>

              {/* Connector 2 */}
              <div style={{ position: 'relative', width: '80px', height: '2px', margin: '0 10px', marginBottom: '20px' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255, 255, 255, 0.2)', borderRadius: '2px' }} />
                <div style={{
                  position: 'absolute', top: 0, left: 0, height: '100%',
                  width: pasoActual > 3 ? '100%' : '0%',
                  background: '#10b981',
                  borderRadius: '2px', transition: 'width 0.6s ease',
                }} />
              </div>

              {/* STEP 3 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '18px', height: '18px', borderRadius: '999px',
                  background: pasoActual === 5 ? '#ffffff' : 'rgba(255, 255, 255, 0.2)',
                  border: pasoActual === 5 ? `3px solid rgba(255, 255, 255, 0.3)` : '1px solid rgba(255, 255, 255, 0.3)',
                  transition: 'all 0.4s ease',
                }} />
                <span style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', color: pasoActual === 5 ? '#ffffff' : 'rgba(255, 255, 255, 0.5)' }}>
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
                background: '#fef2f2',
                border: `1px solid #fecaca`,
                borderRadius: '12px',
                padding: '12px 16px',
                color: '#9b1c1c',
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
                background: '#fef2f2',
                border: `1px solid #fecaca`,
                borderRadius: '12px',
                padding: '12px 16px',
                color: '#9b1c1c'
              }}>
                <h4 style={{ margin: '0 0 4px', color: '#9b1c1c', fontSize: '14px', fontWeight: '800' }}>
                  Tu orden fue rechazada
                </h4>
                <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5' }}>
                  {mensajeRechazoPago || 'Vuelve a subir tu comprobante de pago para continuar con tu registro.'}
                </p>
              </div>
            )}
            <h3 className="section-title-small" style={{ textAlign: 'center', marginBottom: '28px', fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px' }}>Distribución de seguros</h3>

            {ordenPendienteId && (
              <div style={{
                background: '#f0fdf4',
                padding: '20px',
                borderRadius: '16px',
                border: `1px solid ${COLORS.successBgTranslucent30}`,
                marginBottom: '20px',
                textAlign: 'center',
                backdropFilter: 'blur(8px)',
                position: 'relative',
                overflow: 'hidden',
                width: '100%',
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
                  Ya tienes una orden activa. Para continuar, adjunta tu comprobante de pago.
                </p>
              </div>
            )}

            <div className="cuotas-layout">
              <div className="insurance-layout-left">
                {!ordenPendienteId ? (
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
                                      border: `2px solid white`,
                                      zIndex: 10
                                    }}>
                                      {cantAsignada}
                                    </div>
                                  )}
                                  <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '8px', marginBottom: '12px', textAlign: 'left' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '10px' }}>
                                      <p className="insurance-player-name" style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: 'var(--color-text)' }}>{seg.nombre}</p>
                                      <span className="insurance-player-price" style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: '700', whiteSpace: 'nowrap' }}>${seg.precio} c/u</span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }} onClick={(e) => e.stopPropagation()}>
                                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600' }}>Cantidad:</span>
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
                                        style={{ width: '40px', height: '32px', textAlign: 'center', borderRadius: '8px', border: `1px solid var(--color-border)`, backgroundColor: '#f8fafc', color: 'var(--color-text)', fontWeight: 'bold' }}
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
                                      border: cantAsignada > 0 ? `1px solid ${COLORS.secondaryLight}` : `1px solid var(--color-border)`,
                                      backgroundColor: cantAsignada > 0 ? COLORS.brandBlueLight10 : 'var(--bg-main)',
                                      color: cantAsignada > 0 ? COLORS.secondaryLight : 'var(--color-text-secondary)',
                                      fontWeight: '700',
                                      fontSize: '11px',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.5px'
                                    }}
                                    onMouseOver={(e) => {
                                      e.currentTarget.style.backgroundColor = cantAsignada > 0 ? COLORS.brandBlueLight20 : 'var(--color-card-hover)';
                                    }}
                                    onMouseOut={(e) => {
                                      e.currentTarget.style.backgroundColor = cantAsignada > 0 ? COLORS.brandBlueLight10 : 'var(--bg-main)';
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
                                      border: `2px solid white`,
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
                                      <p className="insurance-player-name" style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: 'var(--color-text)' }}>{seg.nombre}</p>
                                      <span className="insurance-player-price" style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: '700', whiteSpace: 'nowrap' }}>${seg.precio} c/u</span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                      <input
                                        type="radio"
                                        name="seguroPresidenteRadioCard"
                                        checked={checked}
                                        onChange={() => { }} // click en fila maneja el cambio
                                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: COLORS.secondary, margin: 0 }}
                                      />
                                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600' }}>Seleccionar</span>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => abrirModalDetalle(seg)}
                                    style={{
                                      width: '100%',
                                      padding: '6px 12px',
                                      borderRadius: '10px',
                                      border: checked ? `1px solid ${COLORS.secondaryLight}` : `1px solid var(--color-border)`,
                                      backgroundColor: checked ? COLORS.brandBlueLight10 : 'var(--bg-main)',
                                      color: checked ? COLORS.secondaryLight : 'var(--color-text-secondary)',
                                      fontWeight: '700',
                                      fontSize: '11px',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.5px'
                                    }}
                                    onMouseOver={(e) => {
                                      e.currentTarget.style.backgroundColor = checked ? COLORS.brandBlueLight20 : 'var(--color-card-hover)';
                                    }}
                                    onMouseOut={(e) => {
                                      e.currentTarget.style.backgroundColor = checked ? COLORS.brandBlueLight10 : 'var(--bg-main)';
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
                ) : null}

              </div>

              {!ordenPendienteId && (
                <div className="insurance-layout-right">
                  <div className="summary-stack">
                    {/* Resumen de cuotas */}
                    <div style={{
                      background: 'white',
                      border: `1px solid var(--color-border)`,
                      borderRadius: '16px', padding: '16px',
                      position: 'relative', overflow: 'hidden',
                    }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg,transparent,${COLORS.brandBlueLight50},transparent)` }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <div style={{ width: '4px', height: '18px', background: `linear-gradient(180deg,${COLORS.brandBlueLight},${COLORS.primary})`, borderRadius: '4px' }} />
                        <h5 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: 'var(--color-text)' }}>
                          Resumen de pago
                        </h5>
                      </div>
                      {catalogoSeguros.map(seg =>
                        asignacionSeguros[seg.id] > 0 && (
                          <div key={seg.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid var(--color-border)`, fontSize: '12px' }}>
                            <span style={{ color: 'var(--color-text-secondary)' }}>{seg.nombre} (x{asignacionSeguros[seg.id]})</span>
                            <span style={{ color: 'var(--color-text)', fontWeight: '700' }}>${seg.precio * asignacionSeguros[seg.id]}</span>
                          </div>
                        )
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', fontSize: '14px', fontWeight: '800' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Total estimado:</span>
                        <span style={{ color: 'var(--primary)' }}>${totalMostrado}</span>
                      </div>
                      <button
                        className="btn-nav-blue"
                        onClick={irSiguientePaso}
                        disabled={numPersonas <= 0 || totalAsignados !== segurosRequeridos}
                        title={numPersonas <= 0
                          ? 'Ingresa la cantidad de jugadores para continuar'
                          : (totalAsignados !== segurosRequeridos
                            ? 'La cantidad de seguros asignados debe coincidir con la cantidad total de seguros a pagar'
                            : '')}
                        style={{ padding: '10px 24px', marginTop: '16px', width: '100%' }}
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {ordenPendienteId && (
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'stretch', marginTop: '20px' }}>
                <div style={{
                  flex: '1 1 340px',
                  minWidth: '300px',
                  background: 'white',
                  border: `1px solid var(--color-border)`,
                  borderRadius: '16px',
                  padding: '16px',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg,transparent,${COLORS.brandBlueLight50},transparent)` }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ width: '4px', height: '18px', background: `linear-gradient(180deg,${COLORS.brandBlueLight},${COLORS.primary})`, borderRadius: '4px' }} />
                    <h5 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: 'var(--color-text)' }}>
                      Detalles de la Orden
                    </h5>
                  </div>
                  {detalleInscripciones
                    .filter(detalle => {
                      const tafId = Number(detalle.TipoAfiliacionId || detalle.tipo_afiliacion_id);
                      return tafId !== 2 && tafId !== 4;
                    })
                    .map(detalle => (
                      <div key={detalle.OrdenPagoDetalleId || `${detalle.TipoAfiliacionId}-${detalle.Cantidad}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid var(--color-border)`, fontSize: '12px' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>{nombreAfiliacion(detalle.TipoAfiliacionId || detalle.tipo_afiliacion_id)} (x{detalle.Cantidad || detalle.cantidad})</span>
                        <span style={{ color: 'var(--color-text)', fontWeight: '700' }}>${Number(detalle.Subtotal || detalle.subtotal || 0)}</span>
                      </div>
                    ))}
                  {catalogoSeguros.map(seg =>
                    asignacionSeguros[seg.id] > 0 && (
                      <div key={seg.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid var(--color-border)`, fontSize: '12px' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>{seg.nombre} (x{asignacionSeguros[seg.id]})</span>
                        <span style={{ color: 'var(--color-text)', fontWeight: '700' }}>${seg.precio * asignacionSeguros[seg.id]}</span>
                      </div>
                    )
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', fontSize: '14px', fontWeight: '800' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Total a pagar:</span>
                    <span style={{ color: 'var(--primary)' }}>${totalMostrado}</span>
                  </div>
                  <div style={{
                    marginTop: '14px',
                    padding: '14px',
                    borderRadius: '14px',
                    background: COLORS.primaryBgTranslucent,
                    border: `1px solid ${COLORS.brandBlueLight20}`,
                  }}>
                    <p style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: '800', color: COLORS.brandBlueLight }}>
                      Instrucciones de pago
                    </p>
                    <div style={{ display: 'grid', gap: '6px', fontSize: '11.5px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Banco</span>
                        <span style={{ color: 'var(--color-text)', fontWeight: '700', textAlign: 'right' }}>{bankInfo.banco}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Titular</span>
                        <span style={{ color: 'var(--color-text)', fontWeight: '700', textAlign: 'right' }}>{bankInfo.titular}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Cuenta</span>
                        <span style={{ color: 'var(--color-text)', fontWeight: '700', textAlign: 'right' }}>{bankInfo.cuenta}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>CLABE</span>
                        <span style={{ color: 'var(--color-text)', fontWeight: '700', textAlign: 'right' }}>{bankInfo.clabe}</span>
                      </div>
                      {bankInfo.tarjeta && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Tarjeta</span>
                          <span style={{ color: 'var(--color-text)', fontWeight: '700', textAlign: 'right' }}>{bankInfo.tarjeta}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Referencia</span>
                        <span style={{ color: COLORS.brandBlueLight, fontWeight: '800', textAlign: 'right' }}>
                          {referenciaPago || bankInfo.referencia || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <p style={{ margin: '10px 0 0', fontSize: '10.5px', lineHeight: '1.5', color: 'var(--text-muted)' }}>
                      Realiza tu transferencia con esta referencia y después sube tu comprobante para continuar con el pre-registro.
                    </p>
                  </div>
                </div>

                <div style={{
                  flex: '1 1 340px',
                  minWidth: '300px',
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
                      type="button"
                      className="btn-outline"
                      onClick={triggerComprobanteUpload}
                      style={uploadPaymentButtonStyle}
                    >
                      <FaUpload />
                      {comprobantePago ? 'Cambiar archivo' : 'Seleccionar archivo'}
                    </button>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => generarPDFCuota(ordenPendienteId)}
                      style={downloadOrderButtonStyle}
                    >
                      <FaFileAlt /> Descargar Orden de Pago
                    </button>
                    {comprobantePago && (
                      <button
                        type="button"
                        className="btn-outline"
                        onClick={() => setPreviewDoc({ file: comprobantePago, title: 'Comprobante de pago' })}
                        style={previewPaymentButtonStyle}
                      >
                        <FaSearchPlus />
                        Ver archivo
                      </button>
                    )}
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {comprobantePago ? comprobantePago.name : 'No se ha seleccionado archivo'}
                    </span>
                    <span style={{ width: '100%', fontSize: '11px', color: comprobanteDragActive ? COLORS.brandBlueLight : 'var(--text-muted)' }}>
                      Arrastra y suelta tu comprobante aquí, o selecciónalo manualmente.
                    </span>
                  </div>
                  <button
                    className="btn-nav-blue"
                    onClick={irSiguientePaso}
                    disabled={!comprobantePago}
                    style={{ padding: '10px 24px', marginTop: '16px', width: '100%' }}
                  >
                    Finalizar
                  </button>
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
          <StepValidacionPago
            estadoPago={estadoPago}
            nombreUsuarioCompleto={nombreUsuarioCompleto}
            setPasoActual={setPasoActual}
            mensajeRechazoPago={mensajeRechazoPago}
            setEstadoPago={setEstadoPago}
            handleLogout={handleLogout}
          />
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

            {/* DATOS DE REGISTRO — MATCH INVITACION CARDS */}
            <div style={{
              backgroundColor: 'white',
              border: `1px solid var(--color-border)`,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              borderRadius: '16px',
              padding: '28px',
              marginBottom: '35px',
              position: 'relative',
              overflow: 'hidden',
            }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <div style={{ width: '5px', height: '24px', background: `linear-gradient(180deg, ${COLORS.brandBlueLight}, ${COLORS.primary})`, borderRadius: '4px' }} />
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: 'var(--text-main)' }}>Datos de Registro</h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                <div className="premium-input-group">
                  <label className="premium-label">Asociación</label>
                  <input type="text" value={asociacion} disabled className={`premium-input ${asociacion ? 'filled' : ''}`} style={{ backgroundColor: COLORS.slate500, cursor: 'not-allowed' }} />
                </div>
                <div className="premium-input-group">
                  <label className="premium-label">Liga Destino</label>
                  <select
                    value={liga}
                    onChange={(e) => setLiga(e.target.value)}
                    className={`premium-input ${liga ? 'filled' : ''}`}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="">Selecciona...</option>
                    {ligasCatalogo.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                  </select>
                </div>
                <div className="premium-input-group">
                  <label className="premium-label">Cargo de afiliación *</label>
                  <input
                    type="text"
                    value={cargoSeleccionado}
                    disabled
                    className={`premium-input ${cargoSeleccionado ? 'filled' : ''}`}
                    style={{ backgroundColor: COLORS.slate500, cursor: 'not-allowed' }}
                  />
                </div>
                <div className="premium-input-group">
                  <label className="premium-label">Nombre de equipo *</label>
                  <input
                    type="text"
                    placeholder="Nombre del Equipo"
                    value={ocrResults.equipo || ''}
                    onChange={(e) => handleManualOcrChange('equipo', e.target.value.toUpperCase())}
                    className={`premium-input ${ocrResults.equipo ? 'filled' : ''}`}
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
                    className={`premium-input ${tipoAfiliacion ? 'filled' : ''}`}
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
            <div className="doc-cards-grid">
              {requisitos.filter(r => r.documento !== 'formatoAfiliacion').map((doc, idx) => {
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
                      if (isUploaded) return;
                      triggerDocUpload(doc.documento);
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
                      backgroundColor: dragActive[doc.documento] ? 'rgba(26, 59, 92, 0.05)' : undefined,
                      padding: '16px'
                    }}
                  >
                    {/* Top sheen */}
                    <div className="top-sheen" style={{ background: isUploaded ? `linear-gradient(90deg,transparent,${COLORS.successBgTranslucent40},transparent)` : `linear-gradient(90deg,transparent,${COLORS.overlayWhite06},transparent)` }} />
                    {/* Status pill */}
                    <div className="doc-status-pill" style={{ background: statusBg, color: statusColor }}>
                      <div className="doc-status-dot" style={{ background: statusDotColor, boxShadow: `0 0 5px ${statusDotColor}` }} />
                      {statusLabel}
                    </div>

                    {/* Preview / Empty State Container */}
                    <div style={{
                      height: '140px',
                      width: '100%',
                      backgroundColor: isUploaded ? '#ffffff' : 'rgba(248, 250, 252, 0.05)',
                      borderRadius: '16px',
                      marginBottom: '16px',
                      position: 'relative',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: isUploaded ? `1px solid ${COLORS.successBgTranslucent18}` : `1px dashed ${COLORS.brandBlueLight12}`
                    }}>
                      {isUploaded && previews[doc.documento] ? (
                        <div className="preview-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
                          {docMimeTypes[doc.documento] === 'application/pdf' ? (
                            <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#ffffff' }}>
                              <iframe
                                src={`${previews[doc.documento]}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                                title={`Preview ${doc.nombre}`}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  border: 'none',
                                  pointerEvents: 'none'
                                }}
                              />
                              <div style={{
                                position: 'absolute',
                                bottom: '8px',
                                left: '8px',
                                backgroundColor: 'rgba(30, 41, 59, 0.8)',
                                color: '#ffffff',
                                fontSize: '10px',
                                fontWeight: '800',
                                padding: '4px 8px',
                                borderRadius: '999px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <FaFileAlt /> PDF
                              </div>
                            </div>
                          ) : (
                            <img
                              src={previews[doc.documento]}
                              alt="Preview"
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                          )}

                          {/* OVERLAY ACTIONS */}
                          <div className="overlay-actions" style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(15, 23, 42, 0.75)',
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
                                const isPdf = docMimeTypes[doc.documento] === 'application/pdf';
                                setPreviewDoc({
                                  url: previews[doc.documento],
                                  type: isPdf ? 'pdf' : 'image',
                                  title: doc.nombre
                                });
                              }}
                              className="btn-zoom"
                              style={{
                                width: '36px', height: '36px', borderRadius: '50%',
                                backgroundColor: '#ffffff', color: '#1e293b', border: 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', cursor: 'pointer'
                              }}
                            >
                              <FaSearchPlus />
                            </button>
                            {!isApproved && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    triggerDocUpload(doc.documento);
                                  }}
                                  className="btn-change"
                                  style={{
                                    width: '36px', height: '36px', borderRadius: '50%',
                                    backgroundColor: '#38bdf8', color: '#ffffff', border: 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', cursor: 'pointer'
                                  }}
                                >
                                  <FaSyncAlt />
                                </button>
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
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
                                      setDocuments(prev => ({ ...prev, [doc.documento]: null }));
                                      setPreviews(prev => ({ ...prev, [doc.documento]: null }));
                                      if (docGuardado) {
                                        setDocumentosGuardados(prev => prev.filter(d => Number(d.DocumentoAfiliacionId || d.documentoAfiliacionId) !== Number(docAfiliacionId)));
                                      }
                                    }
                                  }}
                                  className="btn-delete"
                                  style={{
                                    width: '36px', height: '36px', borderRadius: '50%',
                                    backgroundColor: COLORS.danger, color: '#ffffff', border: 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', cursor: 'pointer'
                                  }}
                                >
                                  <FaTrash />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
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

            {/* FORMULARIO MANUAL DE IDENTIDAD — MATCH INVITACION CARDS */}
            <div style={{
              backgroundColor: 'white',
              border: `1px solid var(--color-border)`,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              borderRadius: '16px',
              padding: '28px',
              marginBottom: '35px',
              position: 'relative',
              overflow: 'hidden'
            }}>

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
                    className={`premium-input ${ocrResults.nombre ? 'filled' : ''}`}
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
                    onChange={(e) => handleManualOcrChange('curp', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    className={`premium-input ${(ocrResults.curp && ocrResults.curp.length === 18) ? 'filled' : ''}`}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px', display: 'block' }}>
                    Debe tener exactamente 18 caracteres
                  </span>
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
                    maxLength={30}
                    value={ocrResults.nacionalidad || ''}
                    onChange={(e) => handleManualOcrChange('nacionalidad', e.target.value.toUpperCase().replace(/[^A-ZÁÉÍÓÚÜÑ\s]/g, ''))}
                    className={`premium-input ${ocrResults.nacionalidad ? 'filled' : ''}`}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div className="premium-input-group">
                  <label className="premium-label">Fecha de Nacimiento *</label>
                  <input
                    type="date"
                    value={ocrResults.fecha_nac ? convertToYYYYMMDD(ocrResults.fecha_nac) : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const converted = convertToDDMMYYYY(val);
                      handleManualOcrChange('fecha_nac', converted);
                    }}
                    className={`premium-input ${(ocrResults.fecha_nac && esMayorDeEdad) ? 'filled' : ''}`}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px', display: 'block' }}>
                    Selecciona tu fecha de nacimiento
                  </span>
                  {(() => {
                    const dateStr = ocrResults.fecha_nac || '';
                    const parts = dateStr.split('/');
                    if (parts.length !== 3 || !parts[2] || parts[2].length !== 4) return null;

                    const val = convertToYYYYMMDD(dateStr);
                    if (!val) return null;
                    const fechaDate = new Date(val);
                    if (isNaN(fechaDate.getTime())) return null;

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
                    className={`premium-input ${ocrResults.sexo ? 'filled' : ''}`}
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
                      className={`premium-input ${codigoPais ? 'filled' : ''}`}
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
                      className={`premium-input ${ocrResults.telefono ? 'filled' : ''}`}
                      disabled={true}
                      readOnly={true}
                      style={{ cursor: 'not-allowed', flexGrow: 1, backgroundColor: COLORS.overlayWhite05 }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Formato de Afiliación Oficial Card - Same design as RegistroJugadores */}
            {(() => {
              const docIdMap = { formatoAfiliacion: 10 };
              const docAfiliacionId = 10;
              const docGuardado = documentosGuardados.find(d => Number(d.DocumentoAfiliacionId || d.documentoAfiliacionId) === 10);
              const hasLocalFile = !!documents.formatoAfiliacion;
              const isUploaded = hasLocalFile || !!docGuardado;
              const isApproved = docGuardado && Number(docGuardado.EstadoValidacionId || docGuardado.estadoValidacionId) === 2;
              const isRejected = docGuardado && Number(docGuardado.EstadoValidacionId || docGuardado.estadoValidacionId) === 3;
              const isEnEspera = docGuardado && !isApproved && !isRejected;

              let statusLabel = 'Pendiente', statusColor = COLORS.warning, statusDotColor = COLORS.warning, statusBg = COLORS.warningBgTranslucent12;
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
              }

              return (
                <div style={{
                  marginTop: '25px',
                  borderTop: `1px solid var(--color-border)`,
                  paddingTop: '25px',
                  marginBottom: '20px'
                }}>
                  <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-text)', marginBottom: '6px', textAlign: 'center' }}>
                    Formato de Afiliación Oficial:
                    <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textAlign: 'center', maxWidth: '600px', margin: '0 auto 20px auto', lineHeight: '1.5' }}>
                      Descarga el formato prellenado, fírmalo y súbelo escaneado en formato PDF o imagen.
                    </span>
                  </h4>


                  {formatAfiliacionLocked && (
                    <div style={{ backgroundColor: '#fef2f2', border: `1px solid #fee2e2`, borderRadius: '12px', padding: '12px', marginBottom: '20px', maxWidth: '600px', margin: '0 auto 20px auto', textAlign: 'center' }}>
                      <span style={{ color: '#9b1c1c', fontSize: '13px', fontWeight: '700' }}>
                        Debes completar todos tus datos y subir los documentos anteriores para descargar el formato.
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (formatAfiliacionLocked) {
                          return Swal.fire('Acción requerida', 'Debes completar todos los datos de identidad y documentos anteriores antes de descargar el formato de afiliación pre-llenado.', 'warning');
                        }
                        handleDownloadFormato(e);
                      }}
                      disabled={formatAfiliacionLocked}
                      style={{
                        padding: '12px 28px',
                        borderRadius: '12px',
                        border: 'none',
                        background: formatAfiliacionLocked ? '#cbd5e1' : COLORS.primary,
                        color: 'white',
                        fontWeight: '800',
                        fontSize: '14px',
                        cursor: formatAfiliacionLocked ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: formatAfiliacionLocked ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    >
                      Descargar Formato Prellenado
                    </button>
                  </div>

                  <div
                    onClick={() => {
                      if (isApproved) return;
                      if (isUploaded) return;
                      triggerDocUpload('formatoAfiliacion');
                    }}
                    onDragEnter={(e) => { if (!isApproved && !formatAfiliacionLocked) { e.preventDefault(); e.stopPropagation(); setDragActive(prev => ({ ...prev, formatoAfiliacion: true })); } }}
                    onDragOver={(e) => { if (!isApproved && !formatAfiliacionLocked) { e.preventDefault(); e.stopPropagation(); } }}
                    onDragLeave={(e) => { if (!isApproved && !formatAfiliacionLocked) { e.preventDefault(); e.stopPropagation(); setDragActive(prev => ({ ...prev, formatoAfiliacion: false })); } }}
                    onDrop={(e) => {
                      if (isApproved) return;
                      if (formatAfiliacionLocked) {
                        e.preventDefault();
                        e.stopPropagation();
                        return Swal.fire('Acción requerida', 'Debes completar todos los datos de identidad y documentos anteriores antes de subir el formato de afiliación.', 'warning');
                      }
                      e.preventDefault();
                      e.stopPropagation();
                      setDragActive(prev => ({ ...prev, formatoAfiliacion: false }));
                      const file = e.dataTransfer.files[0];
                      if (file) {
                        if (!validarArchivoPermitido(file)) return;
                        if (docGuardado) {
                          handleReemplazarDocumento(docAfiliacionId, file);
                          setDocuments(prev => ({ ...prev, formatoAfiliacion: file }));
                        } else {
                          handleFileUpload('formatoAfiliacion', file);
                        }
                      }
                    }}
                    className={`doc-glass-card${isUploaded ? ' uploaded' : ''}`}
                    style={{
                      border: dragActive.formatoAfiliacion
                        ? `2px solid ${COLORS.primary}`
                        : (isUploaded ? `2px solid ${COLORS.success}` : (formatAfiliacionLocked ? `2px dashed #cbd5e1` : `2px dashed ${COLORS.brandBlueLight50}`)),
                      borderRadius: '20px',
                      padding: '16px',
                      backgroundColor: dragActive.formatoAfiliacion ? 'rgba(26, 59, 92, 0.05)' : undefined,
                      cursor: (formatAfiliacionLocked || isApproved) ? 'default' : 'pointer',
                      transition: 'all 0.3s',
                      maxWidth: '600px',
                      margin: '0 auto',
                      opacity: formatAfiliacionLocked ? 0.6 : 1,
                      position: 'relative',
                      overflow: 'hidden',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    {/* Top sheen */}
                    <div className="top-sheen" style={{ background: isUploaded ? `linear-gradient(90deg,transparent,${COLORS.successBgTranslucent40},transparent)` : `linear-gradient(90deg,transparent,${COLORS.overlayWhite06},transparent)` }} />
                    {/* Document Status Badge */}
                    <span style={{
                      position: 'absolute', top: '12px', right: '12px',
                      backgroundColor: statusBg, color: statusColor,
                      padding: '4px 10px', borderRadius: '20px',
                      fontSize: '11px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px',
                      zIndex: 1
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusDotColor }} />
                      {statusLabel}
                    </span>

                    {/* Preview / Empty State Container */}
                    <div style={{
                      height: '140px',
                      width: '100%',
                      backgroundColor: isUploaded ? '#ffffff' : 'rgba(248, 250, 252, 0.05)',
                      borderRadius: '16px',
                      marginBottom: '16px',
                      position: 'relative',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: isUploaded ? `1px solid ${COLORS.successBgTranslucent18}` : `1px dashed ${COLORS.brandBlueLight12}`
                    }}>
                      {isUploaded && previews.formatoAfiliacion ? (
                        <div className="preview-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
                          {docMimeTypes.formatoAfiliacion === 'application/pdf' ? (
                            <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#ffffff' }}>
                              <iframe
                                src={`${previews.formatoAfiliacion}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                                title="Preview Formato de afiliación firmado"
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  border: 'none',
                                  pointerEvents: 'none'
                                }}
                              />
                              <div style={{
                                position: 'absolute',
                                bottom: '8px',
                                left: '8px',
                                backgroundColor: 'rgba(30, 41, 59, 0.8)',
                                color: '#ffffff',
                                fontSize: '10px',
                                fontWeight: '800',
                                padding: '4px 8px',
                                borderRadius: '999px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <FaFileAlt /> PDF
                              </div>
                            </div>
                          ) : (
                            <img
                              src={previews.formatoAfiliacion}
                              alt="Preview"
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                          )}

                          {/* OVERLAY ACTIONS */}
                          <div className="overlay-actions" style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(15, 23, 42, 0.75)',
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
                                const isPdf = docMimeTypes.formatoAfiliacion === 'application/pdf';
                                setPreviewDoc({
                                  url: previews.formatoAfiliacion,
                                  type: isPdf ? 'pdf' : 'image',
                                  title: 'Formato de afiliación firmado'
                                });
                              }}
                              className="btn-zoom"
                              style={{
                                width: '36px', height: '36px', borderRadius: '50%',
                                backgroundColor: '#ffffff', color: '#1e293b', border: 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', cursor: 'pointer'
                              }}
                            >
                              <FaSearchPlus />
                            </button>
                            {!isApproved && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    triggerDocUpload('formatoAfiliacion');
                                  }}
                                  className="btn-change"
                                  style={{
                                    width: '36px', height: '36px', borderRadius: '50%',
                                    backgroundColor: '#38bdf8', color: '#ffffff', border: 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', cursor: 'pointer'
                                  }}
                                >
                                  <FaSyncAlt />
                                </button>
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const result = await Swal.fire({
                                      title: '¿Quitar documento?',
                                      text: 'Se eliminará el formato de afiliación firmado.',
                                      icon: 'warning',
                                      showCancelButton: true,
                                      confirmButtonText: 'Sí, quitar',
                                      cancelButtonText: 'Cancelar',
                                      confirmButtonColor: COLORS.danger,
                                      cancelButtonColor: COLORS.slate400
                                    });
                                    if (result.isConfirmed) {
                                      setDocuments(prev => ({ ...prev, formatoAfiliacion: null }));
                                      setPreviews(prev => ({ ...prev, formatoAfiliacion: null }));
                                      if (docGuardado) {
                                        setDocumentosGuardados(prev => prev.filter(d => Number(d.DocumentoAfiliacionId || d.documentoAfiliacionId) !== 10));
                                      }
                                    }
                                  }}
                                  className="btn-delete"
                                  style={{
                                    width: '36px', height: '36px', borderRadius: '50%',
                                    backgroundColor: COLORS.danger, color: '#ffffff', border: 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', cursor: 'pointer'
                                  }}
                                >
                                  <FaTrash />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div style={{ width: '100%', textAlign: 'center', color: COLORS.slate400, cursor: 'pointer' }}>
                          <FaUpload style={{ fontSize: '28px', marginBottom: '6px' }} />
                          <p style={{ margin: 0, fontSize: '10px', fontWeight: '800' }}>SUBIR ARCHIVO</p>
                        </div>
                      )}
                    </div>

                    <p style={{ margin: 0, fontWeight: '800', fontSize: '15px', color: 'var(--color-text)' }}>
                      Formato de afiliación firmado
                    </p>

                    <p style={{ fontSize: '11px', color: isUploaded ? 'var(--color-text-secondary)' : 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                      {hasLocalFile
                        ? `📎 ${documents.formatoAfiliacion.name}`
                        : (docGuardado ? '📎 Archivo enviado y guardado' : 'Solo se permiten formatos PDF o imágenes')}
                    </p>
                  </div>
                  <input
                    type="file"
                    id="file-formatoAfiliacion"
                    style={{ display: 'none' }}
                    accept=".pdf,.png,.jpg,.jpeg"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      if (!validarArchivoPermitido(file)) {
                        Swal.fire('Error', 'Tipo de archivo no permitido. Solo se aceptan PDFs e imágenes.', 'error');
                        return;
                      }
                      if (docGuardado) {
                        handleReemplazarDocumento(docAfiliacionId, file);
                        setDocuments(prev => ({ ...prev, formatoAfiliacion: file }));
                      } else {
                        handleFileUpload('formatoAfiliacion', file);
                      }
                    }}
                  />
                </div>
              );
            })()}

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
                disabled={loading || !isRegistroCompleto}
                style={{
                  padding: '12px 50px',
                  opacity: (loading || !isRegistroCompleto) ? 0.5 : 1,
                  cursor: (loading || !isRegistroCompleto) ? 'not-allowed' : 'pointer'
                }}
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
              {requisitos.filter(r => r.documento !== 'formatoAfiliacion').map((doc, idx) => {
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
                      backgroundColor: dragActive[`val-${doc.documento}`] ? 'rgba(26, 59, 92, 0.05)' : undefined,
                      padding: '16px'
                    }}
                    onClick={() => {
                      if (isApproved) return;
                      if (isUploaded) return;
                      triggerDocUpload(doc.documento, true);
                    }}
                  >
                    {/* Top sheen */}
                    <div className="top-sheen" style={{ background: isUploaded ? `linear-gradient(90deg,transparent,${COLORS.successBgTranslucent40},transparent)` : `linear-gradient(90deg,transparent,${COLORS.overlayWhite06},transparent)` }} />
                    {/* Status pill */}
                    <div className="doc-status-pill" style={{ background: statusBg, color: statusColor }}>
                      <div className="doc-status-dot" style={{ background: statusDotColor, boxShadow: `0 0 5px ${statusDotColor}` }} />
                      {statusLabel}
                    </div>

                    {/* Preview / Empty State Container */}
                    <div style={{
                      height: '140px',
                      width: '100%',
                      backgroundColor: isUploaded ? '#ffffff' : 'rgba(248, 250, 252, 0.05)',
                      borderRadius: '16px',
                      marginBottom: '16px',
                      position: 'relative',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: isUploaded ? `1px solid ${COLORS.successBgTranslucent18}` : `1px dashed ${COLORS.brandBlueLight12}`
                    }}>
                      {isUploaded && previews[doc.documento] ? (
                        <div className="preview-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
                          {docMimeTypes[doc.documento] === 'application/pdf' ? (
                            <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#ffffff' }}>
                              <iframe
                                src={`${previews[doc.documento]}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                                title={`Preview ${doc.nombre}`}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  border: 'none',
                                  pointerEvents: 'none'
                                }}
                              />
                              <div style={{
                                position: 'absolute',
                                bottom: '8px',
                                left: '8px',
                                backgroundColor: 'rgba(30, 41, 59, 0.8)',
                                color: '#ffffff',
                                fontSize: '10px',
                                fontWeight: '800',
                                padding: '4px 8px',
                                borderRadius: '999px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <FaFileAlt /> PDF
                              </div>
                            </div>
                          ) : (
                            <img
                              src={previews[doc.documento]}
                              alt="Preview"
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                          )}

                          {/* OVERLAY ACTIONS */}
                          <div className="overlay-actions" style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(15, 23, 42, 0.75)',
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
                                const isPdf = docMimeTypes[doc.documento] === 'application/pdf';
                                setPreviewDoc({
                                  url: previews[doc.documento],
                                  type: isPdf ? 'pdf' : 'image',
                                  title: doc.nombre
                                });
                              }}
                              className="btn-zoom"
                              style={{
                                width: '36px', height: '36px', borderRadius: '50%',
                                backgroundColor: '#ffffff', color: '#1e293b', border: 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', cursor: 'pointer'
                              }}
                            >
                              <FaSearchPlus />
                            </button>
                            {!isApproved && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    triggerDocUpload(doc.documento, true);
                                  }}
                                  className="btn-change"
                                  style={{
                                    width: '36px', height: '36px', borderRadius: '50%',
                                    backgroundColor: '#38bdf8', color: '#ffffff', border: 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', cursor: 'pointer'
                                  }}
                                >
                                  <FaSyncAlt />
                                </button>
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
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
                                      setDocuments(prev => ({ ...prev, [doc.documento]: null }));
                                      setPreviews(prev => ({ ...prev, [doc.documento]: null }));
                                      if (docGuardado) {
                                        setDocumentosGuardados(prev => prev.filter(d => Number(d.DocumentoAfiliacionId || d.documentoAfiliacionId) !== Number(docAfiliacionId)));
                                      }
                                    }
                                  }}
                                  className="btn-delete"
                                  style={{
                                    width: '36px', height: '36px', borderRadius: '50%',
                                    backgroundColor: COLORS.danger, color: '#ffffff', border: 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', cursor: 'pointer'
                                  }}
                                >
                                  <FaTrash />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
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
                    {/* Input element */}
                    <div style={{ display: 'none' }}>
                      <input
                        type="file"
                        id={`file-val-${doc.documento}`}
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

            {/* Formato de Afiliación Oficial Card - validation mode */}
            {(() => {
              const docIdMap = { formatoAfiliacion: 10 };
              const docAfiliacionId = 10;
              const docGuardado = documentosGuardados.find(d => Number(d.DocumentoAfiliacionId || d.documentoAfiliacionId) === 10);
              const hasLocalFile = !!documents.formatoAfiliacion;
              const isUploaded = hasLocalFile || !!docGuardado;
              const isApproved = docGuardado && Number(docGuardado.EstadoValidacionId || docGuardado.estadoValidacionId) === 2;
              const isRejected = docGuardado && Number(docGuardado.EstadoValidacionId || docGuardado.estadoValidacionId) === 3;
              const isEnEspera = docGuardado && !isApproved && !isRejected;

              const fotoGuardado = documentosGuardados.find(d => Number(d.DocumentoAfiliacionId || d.documentoAfiliacionId) === 37);
              const isFotoAprobada = fotoGuardado && Number(fotoGuardado.EstadoValidacionId || fotoGuardado.estadoValidacionId) === 2;
              const isFotoRechazada = fotoGuardado && Number(fotoGuardado.EstadoValidacionId || fotoGuardado.estadoValidacionId) === 3;

              const isFormatoAprobado = isApproved;
              const isFormatoRechazado = isRejected;

              let statusLabel = 'Pendiente', statusColor = COLORS.warning, statusDotColor = COLORS.warning, statusBg = COLORS.warningBgTranslucent12;
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
              }

              return (
                <div style={{
                  marginTop: '25px',
                  borderTop: `1px solid var(--color-border)`,
                  paddingTop: '25px',
                  marginBottom: '20px'
                }}>
                  <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-text)', marginBottom: '6px', textAlign: 'center' }}>
                    Formato de Afiliación Oficial
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textAlign: 'center', maxWidth: '600px', margin: '0 auto 20px auto', lineHeight: '1.5' }}>
                    Estado y validación de tu formato de afiliación firmado.
                  </p>

                  <div
                    onClick={() => {
                      if (isApproved) return;
                      if (isUploaded) return;
                      triggerDocUpload('formatoAfiliacion', true);
                    }}
                    onDragEnter={(e) => { if (!isApproved) { e.preventDefault(); e.stopPropagation(); setDragActive(prev => ({ ...prev, formatoAfiliacion: true })); } }}
                    onDragOver={(e) => { if (!isApproved) { e.preventDefault(); e.stopPropagation(); } }}
                    onDragLeave={(e) => { if (!isApproved) { e.preventDefault(); e.stopPropagation(); setDragActive(prev => ({ ...prev, formatoAfiliacion: false })); } }}
                    onDrop={(e) => {
                      if (isApproved) return;
                      e.preventDefault();
                      e.stopPropagation();
                      setDragActive(prev => ({ ...prev, formatoAfiliacion: false }));
                      const file = e.dataTransfer.files[0];
                      if (file) {
                        if (!validarArchivoPermitido(file)) return;
                        if (docGuardado) {
                          handleReemplazarDocumento(docAfiliacionId, file);
                          setDocuments(prev => ({ ...prev, formatoAfiliacion: file }));
                        } else {
                          handleFileUpload('formatoAfiliacion', file);
                        }
                      }
                    }}
                    className={`doc-glass-card${isUploaded ? ' uploaded' : ''}`}
                    style={{
                      border: dragActive.formatoAfiliacion
                        ? `2px solid ${COLORS.primary}`
                        : (isUploaded ? `2px solid ${COLORS.success}` : `2px dashed ${COLORS.brandBlueLight50}`),
                      borderRadius: '20px',
                      padding: '16px',
                      backgroundColor: dragActive.formatoAfiliacion ? 'rgba(26, 59, 92, 0.05)' : undefined,
                      cursor: isApproved ? 'default' : 'pointer',
                      transition: 'all 0.3s',
                      maxWidth: '600px',
                      margin: '0 auto',
                      position: 'relative',
                      overflow: 'hidden',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    {/* Top sheen */}
                    <div className="top-sheen" style={{ background: isUploaded ? `linear-gradient(90deg,transparent,${COLORS.successBgTranslucent40},transparent)` : `linear-gradient(90deg,transparent,${COLORS.overlayWhite06},transparent)` }} />
                    {/* Document Status Badge */}
                    <span style={{
                      position: 'absolute', top: '12px', right: '12px',
                      backgroundColor: statusBg, color: statusColor,
                      padding: '4px 10px', borderRadius: '20px',
                      fontSize: '11px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px',
                      zIndex: 1
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusDotColor }} />
                      {statusLabel}
                    </span>

                    {/* Preview / Empty State Container */}
                    <div style={{
                      height: '140px',
                      width: '100%',
                      backgroundColor: isUploaded ? '#ffffff' : 'rgba(248, 250, 252, 0.05)',
                      borderRadius: '16px',
                      marginBottom: '16px',
                      position: 'relative',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: isUploaded ? `1px solid ${COLORS.successBgTranslucent18}` : `1px dashed ${COLORS.brandBlueLight12}`
                    }}>
                      {isUploaded && previews.formatoAfiliacion ? (
                        <div className="preview-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
                          {docMimeTypes.formatoAfiliacion === 'application/pdf' ? (
                            <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#ffffff' }}>
                              <iframe
                                src={`${previews.formatoAfiliacion}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                                title="Preview Formato de afiliación firmado"
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  border: 'none',
                                  pointerEvents: 'none'
                                }}
                              />
                              <div style={{
                                position: 'absolute',
                                bottom: '8px',
                                left: '8px',
                                backgroundColor: 'rgba(30, 41, 59, 0.8)',
                                color: '#ffffff',
                                fontSize: '10px',
                                fontWeight: '800',
                                padding: '4px 8px',
                                borderRadius: '999px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <FaFileAlt /> PDF
                              </div>
                            </div>
                          ) : (
                            <img
                              src={previews.formatoAfiliacion}
                              alt="Preview"
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                          )}

                          {/* OVERLAY ACTIONS */}
                          <div className="overlay-actions" style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(15, 23, 42, 0.75)',
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
                                const isPdf = docMimeTypes.formatoAfiliacion === 'application/pdf';
                                setPreviewDoc({
                                  url: previews.formatoAfiliacion,
                                  type: isPdf ? 'pdf' : 'image',
                                  title: 'Formato de afiliación firmado'
                                });
                              }}
                              className="btn-zoom"
                              style={{
                                width: '36px', height: '36px', borderRadius: '50%',
                                backgroundColor: '#ffffff', color: '#1e293b', border: 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', cursor: 'pointer'
                              }}
                            >
                              <FaSearchPlus />
                            </button>
                            {!isApproved && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    triggerDocUpload('formatoAfiliacion', true);
                                  }}
                                  className="btn-change"
                                  style={{
                                    width: '36px', height: '36px', borderRadius: '50%',
                                    backgroundColor: '#38bdf8', color: '#ffffff', border: 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', cursor: 'pointer'
                                  }}
                                >
                                  <FaSyncAlt />
                                </button>
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const result = await Swal.fire({
                                      title: '¿Quitar documento?',
                                      text: 'Se eliminará el formato de afiliación firmado.',
                                      icon: 'warning',
                                      showCancelButton: true,
                                      confirmButtonText: 'Sí, quitar',
                                      cancelButtonText: 'Cancelar',
                                      confirmButtonColor: COLORS.danger,
                                      cancelButtonColor: COLORS.slate400
                                    });
                                    if (result.isConfirmed) {
                                      setDocuments(prev => ({ ...prev, formatoAfiliacion: null }));
                                      setPreviews(prev => ({ ...prev, formatoAfiliacion: null }));
                                      if (docGuardado) {
                                        setDocumentosGuardados(prev => prev.filter(d => Number(d.DocumentoAfiliacionId || d.documentoAfiliacionId) !== 10));
                                      }
                                    }
                                  }}
                                  className="btn-delete"
                                  style={{
                                    width: '36px', height: '36px', borderRadius: '50%',
                                    backgroundColor: COLORS.danger, color: '#ffffff', border: 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', cursor: 'pointer'
                                  }}
                                >
                                  <FaTrash />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div style={{ width: '100%', textAlign: 'center', color: COLORS.slate400, cursor: 'pointer' }}>
                          <FaUpload style={{ fontSize: '28px', marginBottom: '6px' }} />
                          <p style={{ margin: 0, fontSize: '10px', fontWeight: '800' }}>SUBIR ARCHIVO</p>
                        </div>
                      )}
                    </div>

                    <p style={{ margin: 0, fontWeight: '800', fontSize: '15px', color: 'var(--color-text)' }}>
                      Formato de afiliación firmado
                    </p>

                    <p style={{ fontSize: '11px', color: isUploaded ? 'var(--color-text-secondary)' : 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                      {hasLocalFile
                        ? `📎 ${documents.formatoAfiliacion.name}`
                        : (docGuardado ? '📎 Archivo enviado y guardado' : 'Solo se permiten formatos PDF o imágenes')}
                    </p>

                    {isRejected && docGuardado.ObservacionesDocumento && (
                      <div style={{ background: COLORS.dangerBgTranslucent, color: COLORS.dangerLight, padding: '10px 14px', border: `1px solid ${COLORS.dangerBgTranslucent30}`, borderRadius: '10px', fontSize: '11px', fontWeight: '700', marginTop: '14px', width: '100%', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        Motivo de rechazo: {docGuardado.ObservacionesDocumento}
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    id="file-val-formatoAfiliacion"
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
                        const previousFile = metadata.formatoAfiliacion;
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
                        setDocuments(prev => ({ ...prev, formatoAfiliacion: file }));
                      } else {
                        handleFileUpload('formatoAfiliacion', file);
                      }
                    }}
                  />

                  {/* BOTONES DE ACCIÓN ESPECIALES SEGÚN EL REQUISITO */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                    {isFormatoAprobado && !isFotoAprobada && (
                      <button
                        type="button"
                        onClick={handleEmbedNewPhotoInFormat}
                        className="btn-premium"
                        style={{
                          padding: '10px 20px',
                          fontSize: '12px',
                          fontWeight: '800',
                          backgroundColor: COLORS.brandBlue,
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '12px',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        Colocar nueva fotografía en el formato de afiliación ya subido
                      </button>
                    )}
                    {isFormatoRechazado && isFotoRechazada && (
                      <button
                        type="button"
                        onClick={handleDownloadFormato}
                        className="btn-premium"
                        style={{
                          padding: '10px 20px',
                          fontSize: '12px',
                          fontWeight: '800',
                          backgroundColor: COLORS.warning,
                          color: '#1e293b',
                          border: 'none',
                          borderRadius: '12px',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        Descargar formato de afiliación con la nueva fotografía
                      </button>
                    )}
                    {isFormatoRechazado && !isFotoRechazada && (
                      <button
                        type="button"
                        onClick={handleDownloadFormato}
                        className="btn-premium"
                        style={{
                          padding: '10px 20px',
                          fontSize: '12px',
                          fontWeight: '800',
                          backgroundColor: COLORS.primary,
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '12px',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        Descargar formato de afiliación
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

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

        {pasoActual === 4 && (
          <StepRevisionSolicitud handleLogout={handleLogout} />
        )}
      </div>

      {/* MODAL DE DETALLE DE SEGUROS */}
      <SeguroDetallesModal
        seguroDetalle={seguroDetalle}
        setSeguroDetalle={setSeguroDetalle}
        cantidadModal={cantidadModal}
        setCantidadModal={setCantidadModal}
        jugadoresRestantes={jugadoresRestantes}
        asignacionSeguros={asignacionSeguros}
        setAsignacionSeguros={setAsignacionSeguros}
        segurosPresidente={segurosPresidente}
      />
      {previewDoc && (
        <Modal
          estaAbierto={!!previewDoc}
          titulo={`Vista previa: ${previewDoc.title}`}
          alCerrar={() => setPreviewDoc(null)}
          tamanio="grande"
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            {(() => {
              const isImage = previewDoc.type === 'image' ||
                (previewDoc.file?.type && previewDoc.file.type.startsWith('image/'));
              const isPdf = previewDoc.type === 'pdf' ||
                (previewDoc.file?.type && previewDoc.file.type === 'application/pdf');
              const fileName = previewDoc.file?.name || previewDoc.title || 'documento';

              if (isImage) {
                return previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={previewDoc.title}
                    style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px', boxShadow: `0 4px 12px ${COLORS.shadow10}` }}
                  />
                ) : (
                  <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Cargando vista previa...</div>
                );
              } else if (isPdf) {
                return previewUrl ? (
                  <iframe
                    src={`${previewUrl}#toolbar=0&navpanes=0`}
                    title={previewDoc.title}
                    style={{ width: '100%', height: '65vh', border: 'none', borderRadius: '8px' }}
                  />
                ) : (
                  <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Cargando vista previa...</div>
                );
              } else {
                return (
                  <div style={{ padding: '40px', textAlign: 'center', color: COLORS.slate500 }}>
                    <p style={{ fontSize: '16px', fontWeight: 'bold' }}>No se puede previsualizar este tipo de archivo directamente.</p>
                    <p style={{ fontSize: '14px' }}>Archivo: {fileName}</p>
                    <a
                      href={previewUrl}
                      download={fileName}
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
                );
              }
            })()}
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
