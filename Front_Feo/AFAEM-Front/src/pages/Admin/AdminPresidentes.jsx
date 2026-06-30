import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES } from '../../routes/paths';
import { FaPlus, FaCheck, FaTimes, FaUserTie, FaUser, FaEdit, FaTrash, FaMoneyBillWave, FaFileAlt, FaCheckCircle, FaArrowLeft, FaSearch, FaUserPlus, FaShieldAlt, FaSave, FaSyncAlt, FaSortAmountDown, FaSortAmountUp, FaWhatsapp, FaCopy, FaLink, FaArrowRight } from 'react-icons/fa';
import DashboardTable from '../../components/DashboardTable';
import SearchBar from '../../components/Common/SearchBar';
import { Modal, BotonPrimario, BotonSecundario, EntradaFormulario, EntradaSeleccion } from '../../components/partials';
import Loader from '../../components/Loader';
import Swal from 'sweetalert2';
import { PDFDocument } from 'pdf-lib';
import { validarFotografia } from '../../services/foto';
import { API_BASE } from '../../config/config';
import { useSecureBlob } from '../../hooks/useSecureBlob';
import { getPresidentesDirectorio, updatePresidente, deletePresidente, getPresidentesDisponibles, vincularPresidenteEquipo, registrarPresidenteAdmin, obtenerLinkInvitacion, regenerarInvitacion, enviarLinkRegistroPresidenteWhatsApp } from '../../services/admin';
import COLORS from '../../styles/colors';

/* ─── Catálogos ─── */
const CATALOGO_SEGUROS_INICIAL = [
  { id: '1', nombre: 'Seguro contra accidentes', descripcion: 'Protege ante accidentes deportivos.', precio: 150 },
  { id: '2', nombre: 'Seguro de vida', descripcion: 'Cobertura en caso de fallecimiento.', precio: 200 },
  { id: '3', nombre: 'Seguro médico', descripcion: 'Incluye atención médica y hospitalaria.', precio: 180 },
];

const REQUISITOS = [
  { documento: 'actaNacimiento', nombre: 'Acta de nacimiento', icon: '📜' },
  { documento: 'identificacion', nombre: 'Identificación oficial', icon: '🪪' },
  { documento: 'fotografia', nombre: 'Fotografía (Imagen)', icon: '📸' },
  { documento: 'formatoAfiliacion', nombre: 'Formato de afiliación firmado', icon: '📝', hasDownload: true },
];

/* ─── Catálogos para Selectores ─── */
const CATALOGO_LIGAS = [
  { valor: 'LIGA AFAEM NORTE', etiqueta: 'Ligue AFAEM Norte' },
  { valor: 'LIGA AFAEM SUR', etiqueta: 'Ligue AFAEM Sur' },
  { valor: 'VARONIL PRIMERA', etiqueta: 'Varonil Primera Plus' },
  { valor: 'FEMENIL ELITE', etiqueta: 'Femenil Elite' },
  { valor: 'OTRA', etiqueta: 'Otra Liga (Especificar)' },
];

const CATALOGO_ASOCIACIONES = [
  { valor: 'MORELOS', etiqueta: 'Morelos (AFEMOR)' },
  { valor: 'ESTADO DE MEX', etiqueta: 'Estado de México' },
  { valor: 'CDMX', etiqueta: 'Ciudad de México' },
  { valor: 'PUEBLA', etiqueta: 'Puebla' },
  { valor: 'QUERETARO', etiqueta: 'Querétaro' },
];

const CATALOGO_ROLES = [
  { valor: 'TIPO F', etiqueta: 'TIPO F' },
  { valor: 'TIPO G', etiqueta: 'TIPO G' },
];

/* ─── Step pill ─── */
const StepCircle = ({ num, label, active, done }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
    <div style={{
      width: 44, height: 44, borderRadius: 14,
      background: done ? COLORS.successBgTranslucent
        : active ? `linear-gradient(135deg,${COLORS.primary},${COLORS.secondaryHover})`
          : COLORS.overlayWhite05,
      border: done ? `1px solid ${COLORS.successBgTranslucent40}`
        : active ? `1px solid ${COLORS.brandBlueLight50}`
          : `1px solid ${COLORS.overlayWhite10}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
      boxShadow: active ? `0 8px 20px ${COLORS.primaryBgTranslucent40}` : 'none',
      transition: 'all .4s',
    }}>
      {done ? <span style={{ color: COLORS.successLight }}>✓</span>
        : num === 1 ? <FaMoneyBillWave style={{ color: active ? 'white' : COLORS.overlayWhite30 }} />
          : <FaFileAlt style={{ color: active ? 'white' : COLORS.overlayWhite30 }} />}
    </div>
    <span style={{
      fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase',
      color: done ? COLORS.successLightTranslucent80 : active ? COLORS.brandBlueLight : COLORS.overlayWhite25
    }}>
      {label}
    </span>
  </div>
);

/* ══════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════════════════════════════════ */
export default function AdminPresidentes() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [esNavegacionCruzada, setEsNavegacionCruzada] = useState(false);

  const [presidentes, setPresidentes] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Estados para filtros, búsqueda y paginación
  const [filtroEstatus, setFiltroEstatus] = useState('pendientes');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  /* ── Seguros ── */
  const [seguros, setSeguros] = useState(CATALOGO_SEGUROS_INICIAL);
  const [cargandoSeguros, setCargandoSeguros] = useState(false);

  /* ── Modal ── */
  const [modalAbierto, setModalAbierto] = useState(false);
  const [paso, setPaso] = useState(1); // 1 = Cuotas, 2 = Datos + Documentos

  /* Paso 1 – Cuotas */
  const [numPersonas, setNumPersonas] = useState('');
  const [asignacionSeguros, setAsignacionSeguros] = useState({ '1': '', '2': '', '3': '' });

  /* Paso 2 – Datos de afiliación (nombre/CURP vienen del OCR) */
  const [infoPersonal, setInfoPersonal] = useState({
    correo: '', telefono: '', telefonoOpcional: '', tipoAfiliacion: '', asociacion: '', liga: '', equipo: '',
  });
  const [documents, setDocuments] = useState({});
  const [ocrResults, setOcrResults] = useState({});
  const [detailsOpen, setDetailsOpen] = useState({});
  const [loading, setLoading] = useState(false);

  /* ── Edición ── */
  const [modalEdicion, setModalEdicion] = useState(false);
  const [presidenteEnEdicion, setPresidenteEnEdicion] = useState(null);
  const [datosEditables, setDatosEditables] = useState({
    primerNombre: '', primerApellido: '', segundoApellido: '', correo: '', telefono: '', telefonoOpcional: '', curp: '', estatusId: 6, seguroNombre: ''
  });

  // Hook para cargar de forma segura la foto del presidente
  const { blobUrl: avatarBlobUrl, error: avatarError } = useSecureBlob(presidenteEnEdicion?.RutaFoto);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [presidenteEnEdicion?.RutaFoto]);

  const mostrarFallback = !presidenteEnEdicion?.RutaFoto || avatarError || imgError;


  /* ── Reasignación ── */
  const [modalReasignacion, setModalReasignacion] = useState(false);
  const [equipoIDHuerfano, setEquipoIDHuerfano] = useState(null);
  const [equipoNombreHuerfano, setEquipoNombreHuerfano] = useState('');
  const [disponibles, setDisponibles] = useState([]);
  const [searchDisponibles, setSearchDisponibles] = useState('');
  const [loadingReasignacion, setLoadingReasignacion] = useState(false);

  /* Cálculos */
  const totalAsignados = Object.values(asignacionSeguros).reduce((a, v) => a + Number(v || 0), 0);
  const totalPagar = seguros.reduce((a, s) => a + Number(asignacionSeguros[s.id] || 0) * s.precio, 0);
  const segurosRequeridos = Number(numPersonas || 0);

  const segurosJugadores = seguros.filter((seg, idx) =>
    ['TIPO A', 'TIPO B', 'TIPO C', 'TIPO D', 'TIPO E'].includes(seg.nombre.toUpperCase().trim()) ||
    (seguros.length === 7 && idx < 5)
  );
  const segurosPresidente = seguros.filter((seg, idx) =>
    ['TIPO F', 'TIPO G'].includes(seg.nombre.toUpperCase().trim()) ||
    (seguros.length === 7 && idx >= 5)
  );

  /* ─── Carga inicial ─── */
  const cargarPresidentes = async (forceRefresh = false, esBackground = false) => {
    if (!esBackground) setCargando(true);
    try {
      const data = await getPresidentesDirectorio(forceRefresh);
      setPresidentes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error al cargar presidentes:", err);
      // Fallback para desarrollo si el back falla
      setPresidentes([
        { id: 1, nombre: 'Carlos Ruiz', correo: 'carlos.ruiz@hotmail.com', telefono: '55 1234 5678', curp: 'RUZC890102HDFLL4', estatus: true, equipo: 'Rayados', equipoId: 101, equipos: [{ id: 101, nombre: 'Rayados' }] },
        { id: 2, nombre: 'Ana Gónzalez', correo: 'ana.g@gmail.com', telefono: '55 9876 5432', curp: 'GOZA920311MDFXX2', estatus: true, equipo: 'Tigres', equipoId: 102, equipos: [{ id: 102, nombre: 'Tigres' }] },
        { id: 3, nombre: 'Miguel Angel', correo: 'm.angel@outlook.com', telefono: '33 1122 3344', curp: 'ANGM850404HJCR11', estatus: false, equipo: null, equipoId: null, equipos: [] },
      ]);
    } finally {
      if (!esBackground) setCargando(false);
    }
  };

  useEffect(() => {
    cargarPresidentes();
    cargarSeguros();
  }, []);

  // Polling automático en segundo plano para actualizar estados de WhatsApp en tiempo real (cada 8 segundos)
  useEffect(() => {
    const interval = setInterval(() => {
      cargarPresidentes(true, true);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  /* ─── Apertura por navegación cruzada ─── */
  useEffect(() => {
    const idParaAbrir = searchParams.get('abrirDetalle');
    if (idParaAbrir && presidentes.length > 0) {
      const p = presidentes.find(x => String(x.id) === idParaAbrir || String(x.equipoId) === idParaAbrir || String(x.PresidenteEquipoId) === idParaAbrir);
      if (p) {
        setEsNavegacionCruzada(true);
        handleEditarPresidente(p);
        const params = new URLSearchParams(searchParams);
        params.delete('abrirDetalle');
        setSearchParams(params, { replace: true });
      }
    }
  }, [searchParams, presidentes]);

  /* ─── Cargar Seguros del Endpoint ─── */
  const cargarSeguros = async () => {
    setCargandoSeguros(true);
    try {
      const res = await fetch(`${API_BASE}/ordenes-pago/seguros`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Error al cargar seguros');
      const data = await res.json();

      // Extraer el array de seguros (puede estar en diferentes ubicaciones según la API)
      let arrSeguros = Array.isArray(data) ? data :
        Array.isArray(data.data) ? data.data :
          Array.isArray(data.seguros) ? data.seguros :
            Array.isArray(data.results) ? data.results : [];

      if (arrSeguros.length === 0) {
        setSeguros(CATALOGO_SEGUROS_INICIAL);
        return;
      }

      // Mapear los datos del endpoint al formato esperado
      const segurosMapeados = arrSeguros.map((seg, idx) => ({
        id: String(seg.id || seg.SeguroId || idx + 1),
        nombre: seg.nombre || seg.Nombre || seg.name || seg.nombre_seguro || 'Seguro sin nombre',
        descripcion: seg.descripcion || seg.Descripcion || seg.description || '',
        precio: Number(seg.costo || seg.Costo || seg.precio || seg.Precio || seg.price || 0),
      }));

      setSeguros(segurosMapeados);
    } catch (err) {
      console.error("Error al cargar seguros:", err);
      // Fallback a los seguros iniciales en caso de error
      setSeguros(CATALOGO_SEGUROS_INICIAL);
    } finally {
      setCargandoSeguros(false);
    }
  };



  /* ─── Reset / cerrar ─── */
  const resetModal = () => {
    setPaso(1);
    setNumPersonas('');
    // Crear un objeto de asignación vacío para todos los seguros
    const emptyAsignacion = {};
    seguros.forEach(seg => {
      emptyAsignacion[seg.id] = 0;
    });
    setAsignacionSeguros(emptyAsignacion);
    setInfoPersonal({ correo: '', telefono: '', telefonoOpcional: '', tipoAfiliacion: '', asociacion: '', liga: '', equipo: '' });
    setDocuments({});
    setOcrResults({});
    setDetailsOpen({});
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filtroEstatus, searchTerm, sortOrder]);

  const esPresidenteActivo = (p) => {
    const est = p.estatus !== undefined ? p.estatus : p.Estatus;
    const estNom = p.estatusNombre || '';
    return est === 7 || estNom.toUpperCase().trim() === 'ACTIVO';
  };

  const filteredPresidentes = useMemo(() => {
    let result = [...presidentes];

    // Filtrado por estatus/rol
    if (filtroEstatus !== 'todos') {
      if (filtroEstatus === 'activos') {
        result = result.filter(esPresidenteActivo);
      } else if (filtroEstatus === 'inactivos') {
        result = result.filter(p => !esPresidenteActivo(p) && p.estatus !== 8 && (p.estatusNombre || '').toUpperCase().trim() !== 'BORRADOR');
      } else if (filtroEstatus === 'pendientes') {
        result = result.filter(p => p.estatus === 8 || (p.estatusNombre || '').toUpperCase().trim() === 'BORRADOR');
      } else if (filtroEstatus === 'solo_presidentes') {
        result = result.filter(p => !p.esEntrenador);
      } else if (filtroEstatus === 'solo_entrenadores') {
        result = result.filter(p => !!p.esEntrenador);
      }
    }

    // Búsqueda por término
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      result = result.filter(p => {
        const emailVal = p.correo || p.Email || '';
        const esEmailTemporal = emailVal && (emailVal.includes('@temporary.afaem.com') || emailVal.startsWith('draft_'));

        // Si buscan "en espera de registro", que coincidan los correos temporales
        if (query === 'en espera de registro' && esEmailTemporal) {
          return true;
        }

        return (
          (p.nombre && p.nombre.toLowerCase().includes(query)) ||
          (p.Nombre && p.Nombre.toLowerCase().includes(query)) ||
          (!esEmailTemporal && emailVal.toLowerCase().includes(query)) ||
          (p.curp && p.curp.toLowerCase().includes(query)) ||
          (p.CURP && p.CURP.toLowerCase().includes(query))
        );
      });
    }

    // Ordenamiento
    result.sort((a, b) => {
      const idA = a.id || a.UsuarioId || 0;
      const idB = b.id || b.UsuarioId || 0;
      if (sortOrder === 'asc') return idA - idB;
      return idB - idA;
    });

    return result;
  }, [presidentes, filtroEstatus, searchTerm, sortOrder]);

  const paginatedPresidentes = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPresidentes.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPresidentes, currentPage]);

  const stats = useMemo(() => {
    const activosCount = presidentes.filter(esPresidenteActivo).length;
    const pendientesCount = presidentes.filter(p => p.estatus === 8 || (p.estatusNombre || '').toUpperCase().trim() === 'BORRADOR').length;
    const presidentesCount = presidentes.filter(p => !p.esEntrenador).length;
    const entrenadoresCount = presidentes.filter(p => !!p.esEntrenador).length;
    return {
      total: presidentes.length,
      activos: activosCount,
      inactivos: presidentes.length - activosCount - pendientesCount,
      pendientes: pendientesCount,
      presidentes: presidentesCount,
      entrenadores: entrenadoresCount
    };
  }, [presidentes]);
  const cerrarModal = () => { setModalAbierto(false); resetModal(); };

  /* ═══ OCR ═══ */
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

    const firstWord = data.nombre ? data.nombre.split(' ')[0] : '';
    if (!data.nombre || data.nombre === 'No detectado' || data.nombre.split(' ').length < 2 || firstWord.length <= 1) {
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
    if (!data.fecha_nac || data.fecha_nac === 'No detectada') {
      const meses = { ENERO: '01', FEBRERO: '02', MARZO: '03', ABRIL: '04', MAYO: '05', JUNIO: '06', JULIO: '07', AGOSTO: '08', SEPTIEMBRE: '09', OCTUBRE: '10', NOVIEMBRE: '11', DICIEMBRE: '12' };
      const m = rawText.match(/(\d{1,2})\s*DE\s*([A-Z]+)\s*DE\s*(\d{4})/i);
      if (m && meses[m[2].toUpperCase()]) data.fecha_nac = `${m[1].padStart(2, '0')}/${meses[m[2].toUpperCase()]}/${m[3]}`;
    }
    return data;
  };

  const procesarOCRReal = async (docKey, file, prevDoc) => {
    Swal.fire({ title: 'Analizando Documento...', html: 'Extrayendo información . <b>Por favor espere.</b>', allowOutsideClick: false, allowEscapeKey: false, didOpen: () => Swal.showLoading() });
    try {
      const fd = new FormData(); fd.append('file_id', file);
      const token = localStorage.getItem('token') || sessionStorage.getItem('temp_token');
      const res = await fetch(`${API_BASE}/documentos/ocr`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: fd
      });
      if (!res.ok) throw new Error('Error al conectar con el servidor');
      const htmlText = await res.text();
      const doc = new DOMParser().parseFromString(htmlText, 'text/html');
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

      doc.querySelectorAll('.dato-fila').forEach(row => {
        const label = row.querySelector('.etiqueta')?.textContent?.toLowerCase() || '';
        const val = cleanVal(row.querySelector('.valor')?.textContent);

        if (!val) return;

        if (label.includes('nombres')) {
          nombresEncontrados = val;
        } else if (label.includes('nombre completo') || label === 'nombre') {
          nombreEncontrado = val;
        } else if (label.includes('nombre')) {
          if (!nombresEncontrados) nombresEncontrados = val;
        }

        if (label.includes('apellido paterno') || label.includes('paterno')) {
          apellidoPaternoEncontrado = val;
        }
        if (label.includes('apellido materno') || label.includes('materno')) {
          apellidoMaternoEncontrado = val;
        }

        if (label.includes('curp')) curpEncontrada = val;
        if (label.includes('nacionalidad')) nacionalidadEncontrada = val;

        if (label.includes('fecha de nacimiento') || label.includes('fecha nac') || (label.includes('nacimiento') && !label.includes('lugar'))) {
          let dateVal = val;
          if (dateVal.includes('-')) {
            const p = dateVal.split('-');
            if (p.length === 3 && p[0].length === 4) {
              dateVal = `${p[2]}/${p[1]}/${p[0]}`;
            }
          }
          fechaNacEncontrada = dateVal;
        }

        if (label.includes('edad')) edadEncontrada = val;
        if (label.includes('sexo')) sexoEncontrado = val;
        if (label.includes('documento')) documentoEncontrado = val;
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

      let extracted = {
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
      const rawText = doc.querySelector('pre')?.textContent;
      if (rawText && (docKey === 'actaNacimiento' || extracted.documento?.includes('ACTA'))) {
        extracted = mejorarExtraccionActa(rawText, extracted);
      }

      // VALIDACIÓN DE COINCIDENCIA DE TIPO DE DOCUMENTO
      const isActaField = ['acta', 'actaNacimiento'].includes(docKey);
      const isIneField = ['ine', 'ineTutor', 'identificacion'].includes(docKey);
      const isOcrActa = (extracted.documento || '').toUpperCase() === 'ACTA DE NACIMIENTO';
      const isOcrIne = (extracted.documento || '').toUpperCase() === 'INE';

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

      setOcrResults(prev => ({ ...prev, ...extracted, [docKey]: `OCR Procesado: ${extracted.nombre}` }));
       Swal.fire({
         title: '¡Lectura Exitosa!',
         text: extracted.nombre ? `Se detectó a: ${extracted.nombre}` : 'Algunos campos no pudieron ser detectados, ingrésalos manualmente',
         icon: extracted.nombre ? 'success' : 'warning',
         timer: extracted.nombre ? 2000 : 3500,
         showConfirmButton: !extracted.nombre
       });
    } catch (_err) {
      Swal.fire({ title: 'Error', text: 'No se pudo leer el documento de forma automática. Podrás continuar manualmente.', icon: 'warning' });
    }
  };

  const procesarFotografia = async (archivo) => {
    Swal.fire({ title: 'Validando Fotografía...', html: 'Verificando formato, rostros y calidad. <b>Por favor espere.</b>', allowOutsideClick: false, allowEscapeKey: false, didOpen: () => Swal.showLoading() });
    try {
      const data = await validarFotografia(archivo);
      if (data.valido) {
        setDocuments(prev => ({ ...prev, fotografia: archivo }));
        Swal.fire({ title: '¡Fotografía Aceptada!', icon: 'success', timer: 1500, showConfirmButton: false });
      } else {
        Swal.fire({ title: 'Error de validación', text: data.mensaje, icon: 'error', confirmButtonText: 'Intentar de nuevo', confirmButtonColor: COLORS.danger });
      }
    } catch (err) {
      Swal.fire({ title: 'Error de validación', text: err.message || 'No se pudo procesar la foto.', icon: 'error', confirmButtonColor: COLORS.dangerAccent });
    }
  };

  const handleFileUpload = (docKey, file) => {
    if (!file) return;
    if (docKey === 'fotografia') {
      procesarFotografia(file);
    } else {
      const prevDoc = documents[docKey] || null;
      setDocuments(prev => ({ ...prev, [docKey]: file }));
      if (['actaNacimiento', 'identificacion'].includes(docKey)) procesarOCRReal(docKey, file, prevDoc);
    }
  };

  /* ═══ PDF de afiliación ═══ */
  const handleDownloadFormato = async () => {
    try {
      Swal.fire({ title: 'Generando PDF...', text: 'Preparando formato de afiliación pre-llenado.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      const existingPdfBytes = await fetch('/formato_afiliacion_directivo.pdf').then(r => r.arrayBuffer());
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const form = pdfDoc.getForm();
      const page = pdfDoc.getPages()[0];

      if (documents.fotografia) {
        try {
          const photoBytes = await documents.fotografia.arrayBuffer();
          const isJpg = !documents.fotografia.name.toLowerCase().endsWith('.png');
          const img = isJpg ? await pdfDoc.embedJpg(photoBytes) : await pdfDoc.embedPng(photoBytes);
          page.drawImage(img, { x: 479, y: 676, width: 76, height: 90 });
        } catch (_e) { /* silenciar */ }
      }

      const { nombre, curp, fecha_nac, nacionalidad, nombreSolo, primerApellido, segundoApellido } = ocrResults;
      if (nombreSolo || primerApellido || segundoApellido) {
        if (primerApellido) form.getTextField('Apellido Paterno')?.setText(primerApellido.toUpperCase());
        if (segundoApellido) form.getTextField('Apellido Materno')?.setText(segundoApellido.toUpperCase());
        if (nombreSolo) form.getTextField('Nombres')?.setText(nombreSolo.toUpperCase());
      } else if (nombre && nombre !== 'No detectado') {
        const parts = nombre.split(' ');
        if (parts.length === 4) {
          form.getTextField('Nombres')?.setText(parts.slice(0, 2).join(' ').toUpperCase());
          form.getTextField('Apellido Paterno')?.setText(parts[2].toUpperCase());
          form.getTextField('Apellido Materno')?.setText(parts[3].toUpperCase());
        } else if (parts.length === 3) {
          form.getTextField('Nombres')?.setText(parts[0].toUpperCase());
          form.getTextField('Apellido Paterno')?.setText(parts[1].toUpperCase());
          form.getTextField('Apellido Materno')?.setText(parts[2].toUpperCase());
        } else if (parts.length === 2) {
          form.getTextField('Nombres')?.setText(parts[0].toUpperCase());
          form.getTextField('Apellido Paterno')?.setText(parts[1].toUpperCase());
        } else {
          form.getTextField('Nombres')?.setText(nombre.toUpperCase());
        }
      }
      if (curp && curp !== 'No detectado') form.getTextField('CURP o Clave Única de Registro de Población')?.setText(curp);
      if (fecha_nac && fecha_nac !== 'No detectada') form.getTextField('Fecha de Nacimiento')?.setText(fecha_nac);
      if (infoPersonal.correo) {
        const correoField = form.getTextField('Correo electrónico');
        if (correoField) {
          const correoLen = (infoPersonal.correo || '').length;
          const correoFs = correoLen > 35 ? 6 : correoLen > 25 ? 7 : correoLen > 18 ? 8 : 10;
          correoField.setText(infoPersonal.correo);
          correoField.setFontSize(correoFs);
        }
      }
      if (infoPersonal.telefono) form.getTextField('Teléfono')?.setText(infoPersonal.telefono);
      if (infoPersonal.tipoAfiliacion) form.getTextField('fill_20')?.setText(infoPersonal.tipoAfiliacion);
      if (infoPersonal.asociacion) form.getTextField('Asociación')?.setText(infoPersonal.asociacion.toUpperCase());
      if (infoPersonal.liga) form.getTextField('Liga')?.setText(infoPersonal.liga.split('(')[0].trim().toUpperCase());
      if (infoPersonal.equipo) form.getTextField('Equipo')?.setText(infoPersonal.equipo.toUpperCase());
      if (nacionalidad) form.getTextField('Lugar de Nacimiento')?.setText(nacionalidad);
      if (curp && curp.length >= 11) {
        const sx = curp.charAt(10).toUpperCase();
        form.getTextField('Sexo')?.setText(sx === 'H' ? 'MASCULINO' : sx === 'M' ? 'FEMENINO' : '');
      }
      const hoy = new Date();
      const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
      form.getTextField('A')?.setText(String(hoy.getDate()).padStart(2, '0'));
      form.getTextField('de')?.setText(MESES[hoy.getMonth()]);
      form.getTextField('del 20')?.setText(String(hoy.getFullYear()).slice(-2));
      form.getTextField('Cargo')?.setText('PRESIDENTE');

      const blob = new Blob([await pdfDoc.save()], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safe = (nombre || 'Presidente').replace(/[^a-zA-Z0-9_\s]/g, '').trim();
      link.href = url; link.download = `Formato_Afiliacion_${safe}.pdf`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      URL.revokeObjectURL(url);
      Swal.fire('¡Listo!', 'El formato se ha descargado correctamente.', 'success');
    } catch (err) {
      Swal.fire('Error', 'No se pudo generar el PDF. ' + err.message, 'error');
    }
  };

  /* ═══ Navegación ═══ */
  const irSiguiente = () => {
    if (paso === 1) {
      if (Number(numPersonas) <= 0) { Swal.fire('Atención', 'Ingresa el número de jugadores.', 'warning'); return; }
      if (totalAsignados !== segurosRequeridos) {
        if (totalAsignados > segurosRequeridos) {
          Swal.fire('Atención', `Has asignado más seguros de los permitidos. El límite es de ${segurosRequeridos} seguros (uno por jugador) y tienes ${totalAsignados} asignados.`, 'warning');
        } else {
          Swal.fire('Atención', `Debes asignar un seguro a cada jugador. Faltan ${segurosRequeridos - totalAsignados} por asignar.`, 'warning');
        }
        return;
      }
      setPaso(2);
    } else if (paso === 2) {
      if (!infoPersonal.correo) { Swal.fire('Atención', 'El correo electrónico es obligatorio.', 'warning'); return; }
      const missing = ['actaNacimiento', 'identificacion', 'fotografia', 'formatoAfiliacion'].find(k => !documents[k]);
      if (missing) { Swal.fire('Atención', `Falta subir: ${REQUISITOS.find(r => r.documento === missing)?.nombre}`, 'warning'); return; }
      procesarRegistro();
    }
  };

  /* ═══ Finalizar registro (auto-aprobado) ═══ */
  const procesarRegistro = async () => {
    const nombreDetectado = ocrResults.nombre || 'Presidente Registrado';
    const curpDetectada = ocrResults.curp || '';
    try {
      setLoading(true);
      Swal.fire({ title: 'Registrando Presidente...', text: 'Procesando registro con aprobación automática.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

      const payload = {
        nombre: nombreDetectado,
        curp: curpDetectada,
        correo: infoPersonal.correo,
        telefono: infoPersonal.telefono,
        numPersonas: Number(numPersonas) || 0,
      };

      const result = await registrarPresidenteAdmin(payload);

      // Refresh data
      await cargarPresidentes();

      cerrarModal();
      Swal.fire({
        title: '¡Presidente Registrado!',
        html: `<p style="font-size:14px;color:${COLORS.black};">El registro de <strong>${nombreDetectado}</strong> fue completado y aprobado automáticamente. Su contraseña de acceso es <strong>Hola1234?</strong></p>`,
        icon: 'success', confirmButtonColor: COLORS.primary,
      });
    } catch (err) {
      Swal.fire('Error', err.response?.data?.detail || err.message || 'No se pudo completar el registro.', 'error');
    } finally {
      setLoading(false);
    }
  };


  /* Mapa de estatus del catálogo */
  const ESTATUS_CATALOGO = [
    { id: 1, nombre: 'PAGO_PENDIENTE', label: 'Pago Pendiente', bg: COLORS.dangerBg, color: COLORS.dangerDeep },
    { id: 2, nombre: 'PAGO_EN_REVISION', label: 'Pago en Revisión', bg: COLORS.skyBg, color: COLORS.skyDeep },
    { id: 3, nombre: 'DOCUMENTOS_PENDIENTES', label: 'Docs. Pendientes', bg: COLORS.warningBg, color: COLORS.warningBrown },
    { id: 4, nombre: 'DOCUMENTOS_EN_REVISION', label: 'Docs. en Revisión', bg: COLORS.yellowBg, color: COLORS.warningDeep },
    { id: 5, nombre: 'PRE_APROBADO', label: 'Pre-Aprobado', bg: COLORS.successBg100, color: COLORS.successDeep },
    { id: 6, nombre: 'REGISTRO_PENDIENTE', label: 'Registro Pendiente', bg: COLORS.slate100, color: COLORS.slate600 },
    { id: 7, nombre: 'ACTIVO', label: 'Activo', bg: COLORS.greenBg, color: COLORS.greenDarker },
    { id: 8, nombre: 'BORRADOR', label: 'Borrador (Incompleto)', bg: COLORS.warningDarkTranslucent, color: COLORS.warningDark },
  ];

  const handleEditarPresidente = (pres) => {
    setPresidenteEnEdicion(pres);
    const emailVal = pres.correo || pres.Email || '';
    const esEmailTemporal = emailVal && (emailVal.includes('@temporary.afaem.com') || emailVal.startsWith('draft_'));
    setDatosEditables({
      primerNombre: pres.primerNombre || '',
      primerApellido: pres.primerApellido || '',
      segundoApellido: pres.segundoApellido || '',
      correo: esEmailTemporal ? '' : emailVal,
      telefono: pres.telefono || '',
      telefonoOpcional: pres.telefonoOpcional || '',
      curp: pres.curp || '',
      estatusId: pres.estatus || 6,
      seguroNombre: pres.seguroNombre || 'Sin seguro asignado'
    });
    setModalEdicion(true);
  };

  const manejarCambioInput = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'telefono' || name === 'telefonoOpcional') {
      let clean = value.replace(/[^0-9+]/g, '');
      if (clean.includes('+')) {
        const hasPlusAtStart = clean.startsWith('+');
        clean = clean.replace(/\+/g, '');
        if (hasPlusAtStart) {
          clean = '+' + clean;
        }
      }
      finalValue = clean;
    }
    setDatosEditables(prev => ({ ...prev, [name]: finalValue }));
  };

  const guardarEdicion = async () => {
    setLoading(true);
    try {
      await updatePresidente(presidenteEnEdicion.id, datosEditables);
      await cargarPresidentes();
      setModalEdicion(false);
      Swal.fire('¡Éxito!', 'Los datos del presidente han sido actualizados.', 'success');
    } catch (err) {
      const msg = err?.response?.data?.detail || 'No se pudieron guardar los cambios.';
      Swal.fire('Error', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ═══ Eliminación y Reasignación ═══ */
  const handleEliminar = (pres) => {
    const id = pres.id || pres.UsuarioId;
    const nombre = pres.nombre || pres.Nombre;
    const equipoId = pres.equipoId || pres.EquipoId;
    const equipoNombre = pres.equipo || pres.NombreEquipo || 'su equipo';

    Swal.fire({
      title: '¿Eliminar Presidente?',
      text: `¿Estás seguro que quieres eliminar a ${nombre} de forma permanente? Ya no podrá tener acceso al sistema.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: COLORS.danger,
      cancelButtonColor: COLORS.slate500,
      confirmButtonText: 'Sí, eliminar permanentemente',
      cancelButtonText: 'Cancelar'
    }).then(async (res) => {
      if (res.isConfirmed) {
        try {
          Swal.fire({ title: 'Eliminando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
          await deletePresidente(id);
          await cargarPresidentes();

          if (equipoId) {
            Swal.fire({
              title: 'Presidente Eliminado',
              html: `El equipo <strong>${equipoNombre}</strong> ha quedado sin presidente.<br>¿Deseas asignar uno nuevo ahora?`,
              icon: 'info',
              showCancelButton: true,
              confirmButtonText: 'Sí, asignar nuevo presidente',
              cancelButtonText: 'Después',
              confirmButtonColor: COLORS.primary
            }).then((result) => {
              if (result.isConfirmed) {
                abrirReasignacion(equipoId, equipoNombre);
              }
            });
          } else {
            Swal.fire('Eliminado', 'El presidente ha sido removido exitosamente.', 'success');
          }
        } catch (err) {
          Swal.fire('Error', 'No se pudo eliminar al presidente.', 'error');
        }
      }
    });
  };

  const abrirReasignacion = async (eqId, eqNombre) => {
    setEquipoIDHuerfano(eqId);
    setEquipoNombreHuerfano(eqNombre);
    setLoadingReasignacion(true);
    setModalReasignacion(true);
    try {
      const data = await getPresidentesDisponibles();
      setDisponibles(Array.isArray(data) ? data : []);
    } catch (err) {
      // Mock para reasignación
      setDisponibles([
        { id: 4, nombre: 'Javier Mendez', correo: 'j.mendez@test.com' },
        { id: 5, nombre: 'Lucia Ferreyra', correo: 'l.ferreyra@test.com' },
        { id: 6, nombre: 'Roberto Gomez', correo: 'r.gomez@test.com' },
      ]);
    } finally {
      setLoadingReasignacion(false);
    }
  };

  const ejecutarReasignacion = async (nuevoPresId, nuevoNombre) => {
    try {
      Swal.fire({ title: 'Vinculando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      await vincularPresidenteEquipo(nuevoPresId, equipoIDHuerfano);
      await cargarPresidentes();
      setModalReasignacion(false);
      Swal.fire('¡Asignado!', `El equipo ${equipoNombreHuerfano} ahora está bajo el mando de ${nuevoNombre}.`, 'success');
    } catch (err) {
      Swal.fire('Error', 'No se pudo vincular al nuevo presidente.', 'error');
    }
  };

  const handleCopiarEnlace = async (pres) => {
    const usuarioId = pres.usuarioId;
    if (!usuarioId) {
      Swal.fire('Error', 'El presidente no tiene un usuario asociado para generar invitaciones.', 'error');
      return;
    }
    try {
      Swal.fire({ title: 'Obteniendo enlace...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      const res = await obtenerLinkInvitacion(usuarioId);
      if (res.success && res.link_invitacion) {
        await navigator.clipboard.writeText(res.link_invitacion);
        Swal.fire({
          title: '¡Copiado!',
          text: 'El enlace de invitación se ha copiado al portapapeles.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        throw new Error();
      }
    } catch (err) {
      Swal.fire('Error', 'No se pudo obtener el enlace de invitación.', 'error');
    }
  };

  const handleReenviarWhatsApp = async (pres) => {
    const usuarioId = pres.usuarioId;
    if (!usuarioId) {
      Swal.fire('Error', 'El presidente no tiene un usuario asociado para generar invitaciones.', 'error');
      return;
    }

    const telPrincipal = (pres.telefono || pres.Telefono || '').trim();
    const telOpcional = (pres.telefonoOpcional || pres.TelefonoOpcional || '').trim();

    const realizarEnvio = async (numDestino) => {
      try {
        Swal.fire({ title: 'Enviando invitación...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const res = await enviarLinkRegistroPresidenteWhatsApp(usuarioId, numDestino);
        if (res.success) {
          // Recargar el directorio de presidentes para reflejar el estado actual inmediatamente
          await cargarPresidentes(true);
          Swal.fire({
            title: '¡Enviado!',
            text: 'La invitación ha sido puesta en cola y enviada a los servidores de WhatsApp. Podrás ver si fue entregada o leída directamente en la lista.',
            icon: 'success',
            confirmButtonColor: COLORS.primary
          });
        } else {
          throw new Error();
        }
      } catch (err) {
        Swal.fire('Error', err.response?.data?.detail || 'No se pudo enviar la invitación por WhatsApp.', 'error');
      }
    };

    if (telPrincipal && telOpcional) {
      Swal.fire({
        title: '¿A qué número deseas enviar la invitación?',
        input: 'radio',
        inputOptions: {
          [telPrincipal]: `Principal: ${telPrincipal}`,
          [telOpcional]: `Opcional: ${telOpcional}`
        },
        inputValue: telPrincipal,
        showCancelButton: true,
        confirmButtonColor: COLORS.primary,
        cancelButtonColor: COLORS.slate500,
        confirmButtonText: 'Enviar',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
          if (!value) {
            return 'Debes seleccionar un número de teléfono';
          }
        }
      }).then((result) => {
        if (result.isConfirmed && result.value) {
          realizarEnvio(result.value);
        }
      });
    } else {
      const unicoTelefono = telPrincipal || telOpcional || 'número no registrado';
      Swal.fire({
        title: '¿Enviar invitación por WhatsApp?',
        text: `¿Quieres enviar la invitación a ${unicoTelefono}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: COLORS.primary,
        cancelButtonColor: COLORS.slate500,
        confirmButtonText: 'Sí, enviar',
        cancelButtonText: 'No, cerrar'
      }).then((result) => {
        if (result.isConfirmed) {
          realizarEnvio(unicoTelefono !== 'número no registrado' ? unicoTelefono : null);
        }
      });
    }
  };

  const handleRegenerarInvitacion = async (pres) => {
    const usuarioId = pres.usuarioId;
    const nombre = pres.nombre || pres.Nombre;
    if (!usuarioId) {
      Swal.fire('Error', 'El presidente no tiene un usuario asociado para generar invitaciones.', 'error');
      return;
    }

    Swal.fire({
      title: '¿Regenerar Invitación?',
      text: `Se invalidará cualquier enlace anterior y se generará un nuevo token de invitación para ${nombre}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: COLORS.danger,
      cancelButtonColor: COLORS.slate500,
      confirmButtonText: 'Sí, regenerar',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          Swal.fire({ title: 'Generando nuevo enlace...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
          const res = await regenerarInvitacion(usuarioId);
          if (res.success && res.link_invitacion) {
            await navigator.clipboard.writeText(res.link_invitacion);
            Swal.fire({
              title: '¡Regenerada y Copiada!',
              html: `<p>Se ha generado una nueva invitación. El nuevo enlace se copió al portapapeles:</p><code style="font-size:12px;word-break:break-all;">${res.link_invitacion}</code>`,
              icon: 'success',
              confirmButtonColor: COLORS.primary
            });
          } else {
            throw new Error();
          }
        } catch (err) {
          Swal.fire('Error', 'No se pudo regenerar la invitación.', 'error');
        }
      }
    });
  };

  const columns = [
    { key: 'id', label: 'Folio' }, { key: 'presidente', label: 'Directivo' },
    { key: 'tipoDirectivo', label: 'Cargo' },
    { key: 'contacto', label: 'Contacto' }, { key: 'curp', label: 'CURP' },
    { key: 'estatus', label: 'Estatus' },
    { key: 'invitacion', label: 'Invitación', style: { textAlign: 'center' } },
    { key: 'acciones', label: 'Acciones', style: { textAlign: 'center' } },
  ];

  const dataTransformada = paginatedPresidentes.map(p => {
    const esBorrador = p.estatus === 8 || (p.estatusNombre || '').toUpperCase().trim() === 'BORRADOR';

    return {
      id: <span style={{ fontWeight: 700, color: COLORS.slate500 }}>#{p.id || p.UsuarioId || '—'}</span>,
      presidente: <div style={{ fontWeight: 800, color: COLORS.slate800 }}>{p.nombre || p.Nombre || 'Sin nombre'}</div>,
      tipoDirectivo: (
        <span style={{
          background: p.esEntrenador ? COLORS.greenBg50 : COLORS.secondaryBg,
          color: p.esEntrenador ? COLORS.greenDarker : COLORS.secondaryHover,
          border: p.esEntrenador ? `1px solid ${COLORS.greenBgDark}` : `1px solid ${COLORS.secondaryBgDark}`,
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '700',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap'
        }}>
          {p.esEntrenador ? 'Entrenador' : 'Presidente'}
        </span>
      ),
      contacto: (() => {
        const emailVal = p.correo || p.Email || '';
        const esEmailTemporal = emailVal && (emailVal.includes('@temporary.afaem.com') || emailVal.startsWith('draft_'));
        return (
          <div>
            {esEmailTemporal ? (
              <div style={{ fontSize: 13, color: COLORS.slate500, fontStyle: 'italic', fontWeight: 600 }}>En espera de registro</div>
            ) : (
              <div style={{ fontSize: 13, color: COLORS.primary, fontWeight: 600 }}>{emailVal || 'Sin correo'}</div>
            )}
            <div style={{ fontSize: 12, color: COLORS.slate500 }}>{p.telefono || p.Telefono || '—'}</div>
          </div>
        );
      })(),
      curp: <span style={{ fontSize: 12, letterSpacing: '0.5px' }}>{p.curp || p.CURP || '—'}</span>,
      estatus: (() => {
        const cfg = ESTATUS_CATALOGO.find(e => e.id === p.estatus || e.nombre === p.estatusNombre);
        const bg = cfg?.bg || COLORS.slate100;
        const color = cfg?.color || COLORS.slate600;
        const label = cfg?.label || p.estatusNombre || String(p.estatus) || '—';
        return <span style={{ background: bg, color, padding: '5px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }}>{label}</span>;
      })(),

      invitacion: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            <button
              disabled={esBorrador}
              onClick={() => handleCopiarEnlace(p)}
              style={{
                background: esBorrador ? COLORS.slate100 : COLORS.greenBg50,
                border: esBorrador ? `1px solid ${COLORS.slate300}` : `1px solid ${COLORS.greenBgDark}`,
                color: esBorrador ? COLORS.slate400 : COLORS.green,
                cursor: esBorrador ? 'not-allowed' : 'pointer',
                padding: '8px',
                borderRadius: 8,
                fontSize: 14,
                transition: 'all 0.2s'
              }}
              title={esBorrador ? "No disponible para borradores (Incompleto)" : "Copiar Enlace de Invitación"}
            >
              <FaCopy />
            </button>
            <button
              disabled={esBorrador}
              onClick={() => handleReenviarWhatsApp(p)}
              style={{
                background: esBorrador ? COLORS.slate100 : COLORS.greenBg50,
                border: esBorrador ? `1px solid ${COLORS.slate300}` : `1px solid ${COLORS.greenBgDark}`,
                color: esBorrador ? COLORS.slate400 : COLORS.whatsappGreen,
                cursor: esBorrador ? 'not-allowed' : 'pointer',
                padding: '8px',
                borderRadius: 8,
                fontSize: 14,
                transition: 'all 0.2s'
              }}
              title={esBorrador ? "No disponible para borradores (Incompleto)" : "Reenviar Invitación por WhatsApp"}
            >
              <FaWhatsapp />
            </button>
            <button
              disabled={esBorrador}
              onClick={() => handleRegenerarInvitacion(p)}
              style={{
                background: esBorrador ? COLORS.slate100 : COLORS.warningBg,
                border: esBorrador ? `1px solid ${COLORS.slate300}` : `1px solid ${COLORS.warningBgDark}`,
                color: esBorrador ? COLORS.slate400 : COLORS.warningDark,
                cursor: esBorrador ? 'not-allowed' : 'pointer',
                padding: '8px',
                borderRadius: 8,
                fontSize: 14,
                transition: 'all 0.2s'
              }}
              title={esBorrador ? "No disponible para borradores (Incompleto)" : "Regenerar Invitación"}
            >
              <FaLink />
            </button>
          </div>

          {/* Badge de estado del mensaje de WhatsApp */}
          {!esBorrador && (() => {
            const status = p.whatsappStatus ? String(p.whatsappStatus).toLowerCase().trim() : '';
            let label = 'No enviado';
            let bg = COLORS.slate50;
            let color = COLORS.slate400;
            let icon = '';

            if (status === 'read') {
              label = 'Leído';
              bg = COLORS.skyBg;
              color = COLORS.skyDarker;
              icon = '✓✓';
            } else if (status === 'delivered') {
              label = 'Entregado';
              bg = COLORS.slate100;
              color = COLORS.slate600;
              icon = '✓✓';
            } else if (status === 'failed') {
              label = 'Fallido';
              bg = COLORS.dangerBg;
              color = COLORS.dangerDarker;
              icon = '✗';
            } else if (status === 'sent') {
              label = 'Enviado';
              bg = COLORS.slate100;
              color = COLORS.slate600;
              icon = '✓';
            }

            return (
              <span style={{
                background: bg,
                color: color,
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: 10,
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: icon ? 4 : 0,
                border: status ? 'none' : `1px dashed ${COLORS.slate300}`,
                opacity: status ? 1 : 0.75
              }}>
                {icon && <span style={{ fontSize: 9 }}>{icon}</span>} {label}
              </span>
            );
          })()}
        </div>
      ),

      acciones: (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
          {esBorrador ? (
            <button
              onClick={() => navigate(`${ROUTES.ADMIN.REGISTRAR_PRESIDENTE}?borradorId=${p.id}${p.esEntrenador ? '&esEntrenador=true' : ''}`)}
              style={{ background: COLORS.secondaryBg, border: `1px solid ${COLORS.secondaryBgDark}`, color: COLORS.secondary, cursor: 'pointer', padding: '8px', borderRadius: 8, fontSize: 14, transition: 'all 0.2s' }}
              title="Continuar Registro"
            >
              <FaArrowRight />
            </button>
          ) : (
            <button
              onClick={() => handleEditarPresidente(p)}
              style={{ background: COLORS.slate50, border: `1px solid ${COLORS.slate200}`, color: COLORS.blue, cursor: 'pointer', padding: '8px', borderRadius: 8, fontSize: 14, transition: 'all 0.2s' }}
              title="Ver / Editar"
            >
              <FaEdit />
            </button>
          )}
          <button
            onClick={() => handleEliminar(p)}
            style={{ background: COLORS.dangerBgLight, border: `1px solid ${COLORS.dangerBgMedium}`, color: COLORS.danger, cursor: 'pointer', padding: '8px', borderRadius: 8, fontSize: 14, transition: 'all 0.2s' }}
            title="Eliminar Permanente"
          >
            <FaTrash />
          </button>
        </div>
      ),
    };
  });

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  const handleCerrarModalEdicion = () => {
    setModalEdicion(false);
    if (esNavegacionCruzada) {
      setEsNavegacionCruzada(false);
      searchParams.delete('abrirDetalle');
      setSearchParams(searchParams, { replace: true });
    }
  };

  if (cargando) {
    return <Loader text="Cargando directorio de presidentes..." />;
  }

  return (
    <div className="dashboard-content" style={{ padding: 30 }}>
      <style>{`
        .insurance-row-admin {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 14px;
          border-bottom: 1px solid ${COLORS.dustyRedTranslucent};
          transition: all 0.2s ease;
          border-radius: 8px;
        }
        .insurance-row-admin:hover {
          background: ${COLORS.slateBlueOpaque};
        }
        .insurance-row-admin:last-child {
          border-bottom: none;
        }
        .insurance-row-info-admin {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .insurance-row-title-container {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .insurance-row-name {
          font-size: 13.5px;
          font-weight: 600;
          color: ${COLORS.overlayWhite90};
        }
        .insurance-row-price {
          font-size: 11px;
          font-weight: 700;
          color: ${COLORS.white};
          padding: 2px 6px;
          border-radius: 6px;
        }
        .insurance-row-input {
          width: 64px;
          text-align: center;
          padding: 6px 10px;
          background: ${COLORS.overlayWhite04};
          border: 1px solid ${COLORS.overlayWhite10};
          color: white;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s;
        }
        .insurance-row-input:focus {
          border-color: ${COLORS.overlayWhite40};
          background: ${COLORS.brandBlueLight06};
          outline: none;
          box-shadow: 0 0 0 2px ${COLORS.brandBlueLight10};
        }
        .premium-input-admin {
          width: 100%; box-sizing: border-box; padding: 12px 14px;
          background: ${COLORS.overlayWhite05}; border: 1px solid ${COLORS.overlayWhite12};
          border-radius: 12px; font-size: 14px; font-weight: 600; color: white;
          outline: none; transition: all 0.25s;
        }
        .premium-input-admin:focus { background: ${COLORS.brandBlueLight10}; border-color: ${COLORS.brandBlueLight50}; box-shadow: 0 0 0 3px ${COLORS.brandBlueLight12}; }
        .premium-input-admin::placeholder { color: ${COLORS.overlayWhite25}; }
        .premium-input-admin option { background: ${COLORS.indigo950}; color: white; }
        .premium-label-admin { font-size: 10px; font-weight: 800; color: ${COLORS.overlayWhite40}; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 6px; display: block; }
        .doc-glass-card-admin {
          background: ${COLORS.overlayWhite03}; border: 1px dashed ${COLORS.overlayWhite12};
          border-radius: 20px; padding: 22px 16px;
          display: flex; flex-direction: column; align-items: center; text-align: center;
          position: relative; overflow: hidden; transition: all 0.35s;
        }
        .doc-glass-card-admin:hover { background: ${COLORS.overlayWhite06}; border-color: ${COLORS.brandBlueLight30}; border-style: solid; transform: translateY(-5px); box-shadow: 0 14px 35px ${COLORS.shadow28}; }
        .doc-glass-card-admin.uploaded-admin { background: ${COLORS.successBgTranslucent05}; border: 1px solid ${COLORS.successBgTranslucent30}; }
        @keyframes glowPulse2 { 0%,100% { box-shadow: 0 0 0 0 ${COLORS.successTransparent}; } 50% { box-shadow: 0 0 16px 4px ${COLORS.successBgTranslucent18}; } }
        .uploaded-admin { animation: glowPulse2 2s ease-in-out 1; }
        .doc-action-btn-admin { width: 100%; padding: 9px 12px; border-radius: 11px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 4px; }
        .doc-download-btn-admin { width: 100%; padding: 9px 12px; border-radius: 11px; font-size: 12px; font-weight: 700; cursor: pointer; background: ${COLORS.brandBlueLight08}; border: 1px solid ${COLORS.brandBlueLight20}; color: ${COLORS.whiteFallback}; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 8px; }
        .doc-download-btn-admin:hover { background: ${COLORS.brandBlueLight16}; transform: translateY(-1px); }
        .assigned-bar-admin { display: flex; justify-content: space-between; align-items: center; background: ${COLORS.overlayWhite04}; border: 1px solid ${COLORS.overlayWhite08}; border-radius: 12px; padding: 12px 18px; font-size: 13px; color: ${COLORS.overlayWhite60}; margin-top: 16px; }
        .insurance-grid-admin {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-top: 15px;
        }
        .insurance-col-admin {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .insurance-col-title-admin {
          font-size: 12px;
          font-weight: 800;
          color: ${COLORS.overlayWhite80};
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid ${COLORS.overlayWhite08};
          padding-bottom: 6px;
          margin-bottom: 5px;
        }
        @media (max-width: 768px) {
          .insurance-grid-admin {
            grid-template-columns: 1fr;
          }
          .pres-page-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 16px !important;
          }
          .pres-page-header > div {
            width: 100% !important;
          }
          .pres-page-header > div:last-child {
            display: flex !important;
            gap: 12px !important;
          }
          .pres-page-header button {
            flex: 1 !important;
            justify-content: center !important;
          }
          .pres-stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }
          .pres-stats-grid > div {
            padding: 12px !important;
            gap: 10px !important;
            flex-direction: column !important;
            text-align: center !important;
            justify-content: center !important;
          }
          .pres-stats-grid > div > div:first-child {
            width: 48px !important;
            height: 48px !important;
            font-size: 20px !important;
          }
          .pres-stats-grid > div > div:last-child p {
            font-size: 11px !important;
          }
          .pres-stats-grid > div > div:last-child h3 {
            font-size: 22px !important;
          }
          .pres-card-table {
            padding: 16px !important;
          }
          .pres-table-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 16px !important;
          }
          .pres-filters-row {
            flex-direction: column !important;
            align-items: stretch !important;
            width: 100% !important;
            gap: 10px !important;
          }
          .pres-filters-row > div,
          .pres-filters-row > button,
          .pres-filters-row > div > button {
            width: 100% !important;
            justify-content: center !important;
          }
          .table-wrapper {
            overflow-x: auto !important;
            width: 100% !important;
            display: block !important;
          }
          .table-pagination {
            flex-direction: column !important;
            gap: 14px !important;
            align-items: center !important;
            padding: 16px 10px !important;
          }
          .pagination-controls {
            width: 100% !important;
            justify-content: space-between !important;
            flex-wrap: wrap !important;
            gap: 10px !important;
          }
          .pagination-pages {
            justify-content: center !important;
            flex: 1 !important;
          }
        }
        .pres-modal-dark-bg {
          --text-main: ${COLORS.overlayWhite92};
          --text-muted: ${COLORS.overlayWhite45};
          --border-light: ${COLORS.overlayWhite08};
        }
      `}</style>

      <div className="pres-page-header" style={{ marginBottom: 25, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: COLORS.slate800 }}>Lista de directivos</h2>
          <p style={{ margin: 0, fontSize: 14, color: COLORS.slate500 }}>Administra los accesos y directivos registrados.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => cargarPresidentes(true)}
            style={{ padding: '10px 20px', backgroundColor: 'white', color: COLORS.slate700, border: `1.5px solid ${COLORS.slate200}`, borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FaSyncAlt />
          </button>
          <button onClick={() => navigate(ROUTES.ADMIN.REGISTRAR_PRESIDENTE)}
            style={{ background: COLORS.primary, color: 'white', border: 'none', borderRadius: 10, padding: '12px 24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <FaPlus /> Registrar Presidente
          </button>
          <button onClick={() => navigate(`${ROUTES.ADMIN.REGISTRAR_PRESIDENTE}?esEntrenador=true`)}
            style={{ background: `linear-gradient(135deg, ${COLORS.warningDark}, ${COLORS.orangeDark})`, color: 'white', border: 'none', borderRadius: 10, padding: '12px 24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <FaPlus /> Registrar Entrenador
          </button>
        </div>
      </div>

      {/* ─── Stats ─── */}
      <div className="pres-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 20, marginBottom: 30 }}>
        {[
          { icon: <FaFileAlt />, bg: COLORS.warningDarkTranslucent, color: COLORS.warningDark, label: 'PENDIENTES', val: stats.pendientes, key: 'pendientes' },
          { icon: <FaUserTie />, bg: COLORS.secondaryBg, color: COLORS.primary, label: 'TOTAL REGISTROS', val: stats.total, key: 'todos' },
          { icon: <FaCheck />, bg: COLORS.greenBg, color: COLORS.success, label: 'ACTIVOS', val: stats.activos, key: 'activos' },
          { icon: <FaTimes />, bg: COLORS.dangerBg, color: COLORS.danger, label: 'INACTIVOS', val: stats.inactivos, key: 'inactivos' },
          { icon: <FaUser />, bg: COLORS.secondaryBg, color: COLORS.secondaryHover, label: 'PRESIDENTES', val: stats.presidentes, key: 'solo_presidentes' },
          { icon: <FaShieldAlt />, bg: COLORS.greenBg50, color: COLORS.greenDark, label: 'ENTRENADORES', val: stats.entrenadores, key: 'solo_entrenadores' },
        ].map(({ icon, bg, color, label, val, key }) => (
          <div
            key={label}
            onClick={() => setFiltroEstatus(key)}
            style={{
              background: 'white',
              padding: 24,
              borderRadius: 16,
              border: filtroEstatus === key ? `2px solid ${color}` : `1px solid ${COLORS.slate200}`,
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: filtroEstatus === key ? `0 4px 12px ${color}20` : 'none',
              transform: filtroEstatus === key ? 'translateY(-2px)' : 'none'
            }}
          >
            <div style={{ width: 60, height: 60, borderRadius: 14, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color }}>{icon}</div>
            <div>
              <p style={{ margin: 0, fontSize: 13, color: COLORS.slate500, fontWeight: 700 }}>{label}</p>
              <h3 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: COLORS.slate800 }}>{val}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Tabla ─── */}
      <div className="card pres-card-table" style={{ padding: '35px', border: 'none', boxShadow: `0 10px 15px -3px ${COLORS.shadow05}`, background: 'white', borderRadius: '16px' }}>
        <div className="pres-table-header" style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', overflow: 'hidden' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: COLORS.slate800, margin: 0 }}>Lista de directivos</h3>
          </div>

          <div className="pres-filters-row" style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', overflowY: 'hidden', maxWidth: '100%', scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}>
            <SearchBar
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nombre, CURP o correo..."
              width="280px"
            />

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              style={{ background: 'white', border: `1.5px solid ${COLORS.slate200}`, padding: '10px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.slate600, cursor: 'pointer' }}
            >
              {sortOrder === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />} {sortOrder === 'asc' ? 'REC' : 'ANT'}
            </button>

            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-main)', padding: '5px', borderRadius: '14px', border: '1.5px solid var(--border-light)' }}>
              {['pendientes', 'todos', 'activos', 'inactivos', 'solo_presidentes', 'solo_entrenadores'].map((val) => (
                <button
                  key={val}
                  onClick={() => setFiltroEstatus(val)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    background: filtroEstatus === val ? 'white' : 'transparent',
                    color: filtroEstatus === val ? 'var(--primary)' : 'var(--text-muted)',
                    boxShadow: filtroEstatus === val ? 'var(--shadow-sm)' : 'none',
                    fontSize: '11px',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    cursor: 'pointer'
                  }}
                >
                  {{
                    todos: 'Todos',
                    activos: 'Activos',
                    inactivos: 'Inactivos',
                    pendientes: 'Pendientes',
                    solo_presidentes: 'Presidentes',
                    solo_entrenadores: 'Entrenadores'
                  }[val]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DashboardTable
          columns={columns}
          data={dataTransformada}
          isLoading={cargando}
          totalItems={filteredPresidentes.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          emptyMessage="No se encontraron presidentes con los criterios de búsqueda."
        />
      </div>



      {/* ══ MODAL DE EDICIÓN ══ */}
      <Modal
        estaAbierto={modalEdicion}
        alCerrar={handleCerrarModalEdicion}
        titulo="Detalle del Directivo"
        tamanio="grande"
        bloquearCierreFondo={true}
        pie={
          <>
            <BotonSecundario etiqueta="Cancelar" alHacerClick={handleCerrarModalEdicion} />
            <BotonPrimario
              etiqueta={loading ? 'Guardando...' : 'Guardar Cambios'}
              alHacerClick={guardarEdicion}
              deshabilitado={loading}
              icono={<FaSave />}
            />
          </>
        }
      >
        <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
          {/* FOTO DEL PRESIDENTE Y CABECERA */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'white', padding: '16px', borderRadius: '16px', border: `1px solid ${COLORS.slate200}`, boxShadow: `0 4px 6px -1px ${COLORS.shadow05}` }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '16px', overflow: 'hidden', flexShrink: 0, border: `2px solid ${COLORS.slate200}`, background: COLORS.slate50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {!mostrarFallback ? (
                <img
                  src={avatarBlobUrl}
                  alt="Foto del presidente"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={() => setImgError(true)}
                />
              ) : (
                <FaUser className="fallback-icon" style={{ fontSize: '32px', color: COLORS.slate300 }} />
              )}
            </div>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '800', color: COLORS.slate800 }}>
                {datosEditables.primerNombre} {datosEditables.primerApellido} {datosEditables.segundoApellido}
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: COLORS.slate500, fontWeight: '600' }}>
                {datosEditables.curp || 'CURP NO REGISTRADA'} • <strong>Equipos a cargo:</strong>{' '}
                {presidenteEnEdicion?.equipos && presidenteEnEdicion.equipos.length > 0
                  ? presidenteEnEdicion.equipos.map((eq, idx) => (
                    <span key={eq.id || idx}>
                      {idx > 0 && ', '}
                      <span
                        style={{ cursor: 'pointer', color: COLORS.primary, textDecoration: 'underline' }}
                        onClick={() => {
                          setModalEdicion(false);
                          if (esNavegacionCruzada) {
                            setEsNavegacionCruzada(false);
                            searchParams.delete('abrirDetalle');
                            setSearchParams(searchParams, { replace: true });
                          }
                          navigate(`${ROUTES.ADMIN.EQUIPOS}?abrirDetalle=${eq.id}`);
                        }}
                        title="Ver detalle del equipo"
                      >
                        {eq.nombre || eq.NombreEquipo || eq.nombreEquipo}
                      </span>
                    </span>
                  ))
                  : 'Sin equipos asignados'}
              </p>
              {(() => {
                const statusCfg = ESTATUS_CATALOGO.find(e => e.id === Number(datosEditables.estatusId));
                return (
                  <span style={{
                    display: 'inline-block',
                    marginTop: '6px',
                    padding: '4px 10px',
                    background: statusCfg?.bg || COLORS.slate100,
                    color: statusCfg?.color || COLORS.slate600,
                    fontSize: '11px',
                    fontWeight: '800',
                    borderRadius: '6px',
                    border: `1px solid ${statusCfg?.color || COLORS.slate300}22`
                  }}>
                    {statusCfg?.label?.toUpperCase() || 'DESCONOCIDO'}
                  </span>
                );
              })()}
            </div>
          </div>

          {/* SECCIÓN: DATOS DEL PRESIDENTE */}
          <div style={{ background: 'white', border: `1px solid ${COLORS.slate200}`, borderRadius: '14px', padding: '16px 16px 0 16px', boxShadow: `0 4px 6px -1px ${COLORS.shadow05}` }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '800', color: COLORS.slate800, borderBottom: `1px solid ${COLORS.slate200}`, paddingBottom: '8px' }}>Datos del Presidente</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', columnGap: '16px', rowGap: '0', alignItems: 'start' }}>
              <EntradaFormulario
                etiqueta="Nombre(s)"
                nombre="primerNombre"
                valor={datosEditables.primerNombre}
                onChange={manejarCambioInput}
                placeholder="Ej: Juan"
              />
              <EntradaFormulario
                etiqueta="Primer Apellido"
                nombre="primerApellido"
                valor={datosEditables.primerApellido}
                onChange={manejarCambioInput}
                placeholder="Ej: Pérez"
              />
              <EntradaFormulario
                etiqueta="Segundo Apellido"
                nombre="segundoApellido"
                valor={datosEditables.segundoApellido}
                onChange={manejarCambioInput}
                placeholder="Ej: García"
              />
              <EntradaFormulario
                etiqueta="Correo Electrónico"
                nombre="correo"
                valor={datosEditables.correo}
                onChange={manejarCambioInput}
                placeholder={
                  (presidenteEnEdicion && (() => {
                    const emailVal = presidenteEnEdicion.correo || presidenteEnEdicion.Email || '';
                    return emailVal && (emailVal.includes('@temporary.afaem.com') || emailVal.startsWith('draft_'));
                  })()) ? "En espera de registro" : "ejemplo@correo.com"
                }
              />
              <EntradaFormulario
                etiqueta="Teléfono"
                nombre="telefono"
                valor={datosEditables.telefono}
                onChange={manejarCambioInput}
                placeholder="55 0000 0000"
              />
              <EntradaFormulario
                etiqueta="Teléfono Opcional"
                nombre="telefonoOpcional"
                valor={datosEditables.telefonoOpcional}
                onChange={manejarCambioInput}
                placeholder="55 0000 0000"
              />
              <EntradaFormulario
                etiqueta="CURP"
                nombre="curp"
                valor={datosEditables.curp}
                placeholder="Se auto-completará con el documento de identidad"
                deshabilitado={true}
              />
              <EntradaSeleccion
                etiqueta="Estatus del Presidente"
                nombre="estatusId"
                valor={String(datosEditables.estatusId || '')}
                onChange={manejarCambioInput}
                opciones={ESTATUS_CATALOGO.filter(e => e.id !== 8).map(e => ({ valor: String(e.id), etiqueta: e.label }))}
              />
              <EntradaFormulario
                etiqueta="Seguro asignado"
                valor={datosEditables.seguroNombre || 'Sin seguro asignado'}
                deshabilitado={true}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* ══ MODAL DE REASIGNACIÓN ══ */}
      <Modal
        estaAbierto={modalReasignacion}
        alCerrar={() => setModalReasignacion(false)}
        titulo="Asignar Nuevo Presidente"
        tamanio="medio"
      >
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <div style={{
            fontSize: '32px',
            background: COLORS.blueTranslucent10,
            color: COLORS.blue,
            width: '70px',
            height: '70px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 15px',
            boxShadow: `0 8px 16px ${COLORS.blueTranslucent15}`
          }}>
            <FaUserPlus />
          </div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: COLORS.slate800 }}>Equiparando a {equipoNombreHuerfano}</h3>
          <p style={{ margin: '5px 0 0', fontSize: '14px', color: COLORS.slate500 }}>Selecciona un presidente disponible para tomar el mando.</p>
        </div>

        <div style={{ position: 'relative', marginBottom: '20px' }}>
          <div style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: COLORS.slate400 }}>
            <FaSearch />
          </div>
          <input
            type="text"
            placeholder="Buscar presidente por nombre..."
            value={searchDisponibles}
            onChange={(e) => setSearchDisponibles(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 14px 14px 45px',
              borderRadius: '16px',
              border: `2px solid ${COLORS.slate100}`,
              background: COLORS.slate50,
              fontSize: '15px',
              outline: 'none',
              transition: 'all 0.3s'
            }}
          />
        </div>

        <div style={{ maxHeight: '350px', overflowY: 'auto', padding: '5px' }}>
          {loadingReasignacion ? (
            <Loader inline text="Buscando candidatos..." />
          ) : disponibles.filter(d => d.nombre?.toLowerCase().includes(searchDisponibles.toLowerCase()) || d.Nombre?.toLowerCase().includes(searchDisponibles.toLowerCase())).length > 0 ? (
            disponibles
              .filter(d => d.nombre?.toLowerCase().includes(searchDisponibles.toLowerCase()) || d.Nombre?.toLowerCase().includes(searchDisponibles.toLowerCase()))
              .map(pres => (
                <div
                  key={pres.id || pres.UsuarioId}
                  className="pres-item-hover"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '15px',
                    borderRadius: '16px',
                    marginBottom: '10px',
                    border: `1px solid ${COLORS.slate100}`,
                    transition: 'all 0.2s',
                    background: 'white'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondaryHover} 100%)`,
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '800',
                      fontSize: '16px'
                    }}>
                      {(pres.nombre || pres.Nombre || '?').charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', color: COLORS.slate800, fontSize: '14px' }}>{pres.nombre || pres.Nombre}</div>
                      <div style={{ color: COLORS.slate500, fontSize: '12px' }}>{pres.correo || pres.Email}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => ejecutarReasignacion(pres.id || pres.UsuarioId, pres.nombre || pres.Nombre)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      background: COLORS.secondaryBg,
                      color: COLORS.secondary,
                      border: 'none',
                      fontWeight: '700',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Asignar
                  </button>
                </div>
              ))
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: COLORS.slate400 }}>
              <FaUserTie style={{ fontSize: '40px', opacity: 0.3, marginBottom: '10px' }} />
              <p>No hay presidentes disponibles que coincidan.</p>
            </div>
          )}
        </div>
      </Modal>

      <style>{`
        .pres-item-hover:hover {
          background: ${COLORS.slate50} !important;
          border-color: ${COLORS.slate300} !important;
          transform: translateX(5px);
        }
        .pres-item-hover button:hover {
          background: ${COLORS.secondary} !important;
          color: white !important;
        }
      `}</style>

    </div>
  );
}
