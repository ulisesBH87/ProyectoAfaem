import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaCheck, FaTimes, FaUserTie, FaUser, FaEdit, FaTrash, FaMoneyBillWave, FaFileAlt, FaCheckCircle, FaArrowLeft, FaSearch, FaUserPlus, FaShieldAlt, FaSave, FaSyncAlt, FaSortAmountDown, FaSortAmountUp, FaWhatsapp, FaCopy, FaLink, FaArrowRight } from 'react-icons/fa';
import DashboardTable from '../../components/DashboardTable';
import SearchBar from '../../components/Common/SearchBar';
import { Modal, BotonPrimario, BotonSecundario, EntradaFormulario, EntradaSeleccion } from '../../components/partials';
import Loader from '../../components/Loader';
import Swal from 'sweetalert2';
import { PDFDocument } from 'pdf-lib';
import { validarFotografia } from '../../services/foto';
import { API_BASE } from '../../config/config';
import { getPresidentesDirectorio, updatePresidente, deletePresidente, getPresidentesDisponibles, vincularPresidenteEquipo, registrarPresidenteAdmin, obtenerLinkInvitacion, regenerarInvitacion, enviarLinkRegistroPresidenteWhatsApp } from '../../services/admin';

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
      background: done ? 'rgba(16,185,129,.15)'
        : active ? 'linear-gradient(135deg,#0b4ea6,#1e40af)'
          : 'rgba(255,255,255,.05)',
      border: done ? '1px solid rgba(16,185,129,.4)'
        : active ? '1px solid rgba(93,135,229,.5)'
          : '1px solid rgba(255,255,255,.1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
      boxShadow: active ? '0 8px 20px rgba(11,78,166,.4)' : 'none',
      transition: 'all .4s',
    }}>
      {done ? <span style={{ color: '#34d399' }}>✓</span>
        : num === 1 ? <FaMoneyBillWave style={{ color: active ? 'white' : 'rgba(255,255,255,.3)' }} />
          : <FaFileAlt style={{ color: active ? 'white' : 'rgba(255,255,255,.3)' }} />}
    </div>
    <span style={{
      fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase',
      color: done ? 'rgba(52,211,153,.8)' : active ? '#5d87e5' : 'rgba(255,255,255,.25)'
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
    correo: '', telefono: '', tipoAfiliacion: '', asociacion: '', liga: '', equipo: '',
  });
  const [documents, setDocuments] = useState({});
  const [ocrResults, setOcrResults] = useState({});
  const [detailsOpen, setDetailsOpen] = useState({});
  const [loading, setLoading] = useState(false);

  /* ── Edición ── */
  const [modalEdicion, setModalEdicion] = useState(false);
  const [presidenteEnEdicion, setPresidenteEnEdicion] = useState(null);
  const [datosEditables, setDatosEditables] = useState({
    primerNombre: '', primerApellido: '', segundoApellido: '', correo: '', telefono: '', curp: '', estatusId: 6
  });


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
  const cargarPresidentes = async (forceRefresh = false) => {
    setCargando(true);
    try {
      const data = await getPresidentesDirectorio(forceRefresh);
      setPresidentes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error al cargar presidentes:", err);
      // Fallback para desarrollo si el back falla
      setPresidentes([
        { id: 1, nombre: 'Carlos Ruiz', correo: 'carlos.ruiz@hotmail.com', telefono: '55 1234 5678', curp: 'RUZC890102HDFLL4', estatus: true, equipo: 'Rayados', equipoId: 101 },
        { id: 2, nombre: 'Ana Gónzalez', correo: 'ana.g@gmail.com', telefono: '55 9876 5432', curp: 'GOZA920311MDFXX2', estatus: true, equipo: 'Tigres', equipoId: 102 },
        { id: 3, nombre: 'Miguel Angel', correo: 'm.angel@outlook.com', telefono: '33 1122 3344', curp: 'ANGM850404HJCR11', estatus: false, equipo: null, equipoId: null },
      ]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPresidentes();
    cargarSeguros();
  }, []);

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
    setInfoPersonal({ correo: '', telefono: '', tipoAfiliacion: '', asociacion: '', liga: '', equipo: '' });
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

    // Filtrado por estatus
    if (filtroEstatus !== 'todos') {
      if (filtroEstatus === 'activos') {
        result = result.filter(esPresidenteActivo);
      } else if (filtroEstatus === 'inactivos') {
        result = result.filter(p => !esPresidenteActivo(p) && p.estatus !== 8 && (p.estatusNombre || '').toUpperCase().trim() !== 'BORRADOR');
      } else if (filtroEstatus === 'pendientes') {
        result = result.filter(p => p.estatus === 8 || (p.estatusNombre || '').toUpperCase().trim() === 'BORRADOR');
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
    return {
      total: presidentes.length,
      activos: activosCount,
      inactivos: presidentes.length - activosCount - pendientesCount,
      pendientes: pendientesCount
    };
  }, [presidentes]);
  const cerrarModal = () => { setModalAbierto(false); resetModal(); };

  /* ═══ OCR ═══ */
  const mejorarExtraccionActa = (rawText, currentData) => {
    if (!rawText) return currentData;
    const data = { ...currentData };
    if (!data.nombre || data.nombre === 'No detectado' || data.nombre.split(' ').length < 2) {
      const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
      let nombres = '', ap1 = '', ap2 = '';
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i].toUpperCase();
        if (l.includes('NOMBRE(S)') && i + 1 < lines.length) nombres = lines[i + 1];
        if (l.includes('PRIMER APELLIDO') && i + 1 < lines.length) ap1 = lines[i + 1];
        if (l.includes('SEGUNDO APELLIDO') && i + 1 < lines.length) ap2 = lines[i + 1];
      }
      if (nombres && ap1) data.nombre = `${ap1} ${ap2} ${nombres}`.replace(/\s+/g, ' ').toUpperCase();
    }
    if (!data.fecha_nac || data.fecha_nac === 'No detectada') {
      const meses = { ENERO: '01', FEBRERO: '02', MARZO: '03', ABRIL: '04', MAYO: '05', JUNIO: '06', JULIO: '07', AGOSTO: '08', SEPTIEMBRE: '09', OCTUBRE: '10', NOVIEMBRE: '11', DICIEMBRE: '12' };
      const m = rawText.match(/(\d{1,2})\s*DE\s*([A-Z]+)\s*DE\s*(\d{4})/i);
      if (m && meses[m[2].toUpperCase()]) data.fecha_nac = `${m[1].padStart(2, '0')}/${meses[m[2].toUpperCase()]}/${m[3]}`;
    }
    return data;
  };

  const procesarOCRReal = async (docKey, file) => {
    Swal.fire({ title: 'Analizando Documento...', html: 'Extrayendo información vía OCR. <b>Por favor espere.</b>', allowOutsideClick: false, allowEscapeKey: false, didOpen: () => Swal.showLoading() });
    try {
      const fd = new FormData(); fd.append('file_id', file);
      const res = await fetch('/ocr-api', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Error al conectar con el servidor OCR');
      const htmlText = await res.text();
      const doc = new DOMParser().parseFromString(htmlText, 'text/html');
      let extracted = {};
      doc.querySelectorAll('.dato-fila').forEach(row => {
        const label = row.querySelector('.etiqueta')?.textContent?.toLowerCase() || '';
        const val = row.querySelector('.valor')?.textContent?.trim() || '';
        if (label.includes('curp')) extracted.curp = val;
        if (label.includes('nombre')) extracted.nombre = val;
        if (label.includes('nacionalidad')) extracted.nacionalidad = val;
        if (label.includes('fecha de nacimiento')) extracted.fecha_nac = val;
        if (label.includes('edad')) extracted.edad = val;
        if (label.includes('documento')) extracted.documento = val;
      });
      const rawText = doc.querySelector('pre')?.textContent;
      if (rawText && (docKey === 'actaNacimiento' || extracted.documento?.includes('ACTA'))) {
        extracted = mejorarExtraccionActa(rawText, extracted);
      }
      setOcrResults(prev => ({ ...prev, ...extracted, [docKey]: `OCR Procesado: ${extracted.nombre}` }));
      Swal.fire({
        title: extracted.nombre ? '¡Lectura Exitosa!' : 'Documento procesado',
        text: extracted.nombre ? `Se detectó a: ${extracted.nombre}` : 'Se leyó el documento pero no se extrajo el nombre automáticamente.',
        icon: 'success', timer: 2000, showConfirmButton: false
      });
    } catch (_err) {
      Swal.fire({ title: 'Error OCR', text: 'No se pudo leer el documento de forma automática. Podrás continuar.', icon: 'warning' });
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
        Swal.fire({ title: 'Error de validación', text: data.mensaje, icon: 'error', confirmButtonText: 'Intentar de nuevo', confirmButtonColor: '#ef4444' });
      }
    } catch (err) {
      Swal.fire({ title: 'Error de validación', text: err.message || 'No se pudo procesar la foto.', icon: 'error', confirmButtonColor: '#ef3030' });
    }
  };

  const handleFileUpload = (docKey, file) => {
    if (!file) return;
    if (docKey === 'fotografia') {
      procesarFotografia(file);
    } else {
      setDocuments(prev => ({ ...prev, [docKey]: file }));
      if (['actaNacimiento', 'identificacion'].includes(docKey)) procesarOCRReal(docKey, file);
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

      const { nombre, curp, fecha_nac, nacionalidad } = ocrResults;
      if (nombre && nombre !== 'No detectado') {
        const parts = nombre.split(' ');
        if (parts.length >= 3) {
          form.getTextField('Apellido Paterno')?.setText(parts[0]);
          form.getTextField('Apellido Materno')?.setText(parts[1]);
          form.getTextField('Nombres')?.setText(parts.slice(2).join(' '));
        } else {
          form.getTextField('Nombres')?.setText(nombre);
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
        html: `<p style="font-size:14px;color:#000000;">El registro de <strong>${nombreDetectado}</strong> fue completado y aprobado automáticamente. Su contraseña de acceso es <strong>Hola1234?</strong></p>`,
        icon: 'success', confirmButtonColor: '#0b4ea6',
      });
    } catch (err) {
      Swal.fire('Error', err.response?.data?.detail || err.message || 'No se pudo completar el registro.', 'error');
    } finally {
      setLoading(false);
    }
  };


  /* Mapa de estatus del catálogo */
  const ESTATUS_CATALOGO = [
    { id: 1, nombre: 'PAGO_PENDIENTE', label: 'Pago Pendiente', bg: '#fee2e2', color: '#991b1b' },
    { id: 2, nombre: 'PAGO_EN_REVISION', label: 'Pago en Revisión', bg: '#e0f2fe', color: '#075985' },
    { id: 3, nombre: 'DOCUMENTOS_PENDIENTES', label: 'Docs. Pendientes', bg: '#fef3c7', color: '#92400e' },
    { id: 4, nombre: 'DOCUMENTOS_EN_REVISION', label: 'Docs. en Revisión', bg: '#fef9c3', color: '#854d0e' },
    { id: 5, nombre: 'PRE_APROBADO', label: 'Pre-Aprobado', bg: '#d1fae5', color: '#065f46' },
    { id: 6, nombre: 'REGISTRO_PENDIENTE', label: 'Registro Pendiente', bg: '#f1f5f9', color: '#475569' },
    { id: 7, nombre: 'ACTIVO', label: 'Activo', bg: '#dcfce7', color: '#166534' },
    { id: 8, nombre: 'BORRADOR', label: 'Borrador (Incompleto)', bg: 'rgba(217, 119, 6, 0.1)', color: '#d97706' },
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
      curp: pres.curp || '',
      estatusId: pres.estatus || 6,
    });
    setModalEdicion(true);
  };

  const manejarCambioInput = (e) => {
    const { name, value } = e.target;
    setDatosEditables(prev => ({ ...prev, [name]: value }));
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
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
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
              confirmButtonColor: '#0b4ea6'
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
    try {
      Swal.fire({ title: 'Enviando invitación...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      const res = await enviarLinkRegistroPresidenteWhatsApp(usuarioId);
      if (res.success) {
        Swal.fire({
          title: '¡Enviado!',
          text: 'La invitación ha sido reenviada por WhatsApp exitosamente.',
          icon: 'success',
          timer: 2500,
          showConfirmButton: false
        });
      } else {
        throw new Error();
      }
    } catch (err) {
      Swal.fire('Error', err.response?.data?.detail || 'No se pudo enviar la invitación por WhatsApp.', 'error');
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
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
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
              confirmButtonColor: '#0b4ea6'
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
    { key: 'id', label: 'Folio' }, { key: 'presidente', label: 'Presidente' },
    { key: 'contacto', label: 'Contacto' }, { key: 'curp', label: 'CURP' },
    { key: 'estatus', label: 'Estatus' },
    { key: 'invitacion', label: 'Invitación', style: { textAlign: 'center' } },
    { key: 'acciones', label: 'Acciones', style: { textAlign: 'center' } },
  ];

  const dataTransformada = paginatedPresidentes.map(p => {
    const esBorrador = p.estatus === 8 || (p.estatusNombre || '').toUpperCase().trim() === 'BORRADOR';
    
    return {
      id: <span style={{ fontWeight: 700, color: '#64748b' }}>#{p.id || p.UsuarioId || '—'}</span>,
      presidente: <div style={{ fontWeight: 800, color: '#1e293b' }}>{p.nombre || p.Nombre || 'Sin nombre'}</div>,
      contacto: (() => {
        const emailVal = p.correo || p.Email || '';
        const esEmailTemporal = emailVal && (emailVal.includes('@temporary.afaem.com') || emailVal.startsWith('draft_'));
        return (
          <div>
            {esEmailTemporal ? (
              <div style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic', fontWeight: 600 }}>En espera de registro</div>
            ) : (
              <div style={{ fontSize: 13, color: '#0b4ea6', fontWeight: 600 }}>{emailVal || 'Sin correo'}</div>
            )}
            <div style={{ fontSize: 12, color: '#64748b' }}>{p.telefono || p.Telefono || '—'}</div>
          </div>
        );
      })(),
      curp: <span style={{ fontSize: 12, letterSpacing: '0.5px' }}>{p.curp || p.CURP || '—'}</span>,
      estatus: (() => {
        const cfg = ESTATUS_CATALOGO.find(e => e.id === p.estatus || e.nombre === p.estatusNombre);
        const bg = cfg?.bg || '#f1f5f9';
        const color = cfg?.color || '#475569';
        const label = cfg?.label || p.estatusNombre || String(p.estatus) || '—';
        return <span style={{ background: bg, color, padding: '5px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }}>{label}</span>;
      })(),

      invitacion: (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
          <button
            disabled={esBorrador}
            onClick={() => handleCopiarEnlace(p)}
            style={{ 
              background: esBorrador ? '#f1f5f9' : '#f0fdf4', 
              border: esBorrador ? '1px solid #cbd5e1' : '1px solid #bbf7d0', 
              color: esBorrador ? '#94a3b8' : '#16a34a', 
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
              background: esBorrador ? '#f1f5f9' : '#f0fdf4', 
              border: esBorrador ? '1px solid #cbd5e1' : '1px solid #bbf7d0', 
              color: esBorrador ? '#94a3b8' : '#25d366', 
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
              background: esBorrador ? '#f1f5f9' : '#fef3c7', 
              border: esBorrador ? '1px solid #cbd5e1' : '1px solid #fde68a', 
              color: esBorrador ? '#94a3b8' : '#d97706', 
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
      ),

      acciones: (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
          {esBorrador ? (
            <button
              onClick={() => navigate(`/admin/registrar-presidente?borradorId=${p.id}`)}
              style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', cursor: 'pointer', padding: '8px', borderRadius: 8, fontSize: 14, transition: 'all 0.2s' }}
              title="Continuar Registro"
            >
              <FaArrowRight />
            </button>
          ) : (
            <button
              onClick={() => handleEditarPresidente(p)}
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#3b82f6', cursor: 'pointer', padding: '8px', borderRadius: 8, fontSize: 14, transition: 'all 0.2s' }}
              title="Ver / Editar"
            >
              <FaEdit />
            </button>
          )}
          <button
            onClick={() => handleEliminar(p)}
            style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', cursor: 'pointer', padding: '8px', borderRadius: 8, fontSize: 14, transition: 'all 0.2s' }}
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
  if (cargando) {
    return <Loader text="Cargando directorio de presidentes..." />;
  }

  return (
    <div style={{ padding: 30 }}>
      <style>{`
        .insurance-row-admin {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 14px;
          border-bottom: 1px solid rgba(174, 142, 142, 0.44);
          transition: all 0.2s ease;
          border-radius: 8px;
        }
        .insurance-row-admin:hover {
          background: rgba(100, 127, 165, 1);
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
          color: rgba(255,255,255,0.9);
        }
        .insurance-row-price {
          font-size: 11px;
          font-weight: 700;
          color: #ffffffff;
          padding: 2px 6px;
          border-radius: 6px;
        }
        .insurance-row-input {
          width: 64px;
          text-align: center;
          padding: 6px 10px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          color: white;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s;
        }
        .insurance-row-input:focus {
          border-color: rgba(255, 255, 255, 0.4);
          background: rgba(93,135,229,0.06);
          outline: none;
          box-shadow: 0 0 0 2px rgba(93,135,229,0.1);
        }
        .premium-input-admin {
          width: 100%; box-sizing: border-box; padding: 12px 14px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12);
          border-radius: 12px; font-size: 14px; font-weight: 600; color: white;
          outline: none; transition: all 0.25s;
        }
        .premium-input-admin:focus { background: rgba(93,135,229,0.1); border-color: rgba(93,135,229,0.5); box-shadow: 0 0 0 3px rgba(93,135,229,0.12); }
        .premium-input-admin::placeholder { color: rgba(255,255,255,0.25); }
        .premium-input-admin option { background: #1e1b4b; color: white; }
        .premium-label-admin { font-size: 10px; font-weight: 800; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 6px; display: block; }
        .doc-glass-card-admin {
          background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.12);
          border-radius: 20px; padding: 22px 16px;
          display: flex; flex-direction: column; align-items: center; text-align: center;
          position: relative; overflow: hidden; transition: all 0.35s;
        }
        .doc-glass-card-admin:hover { background: rgba(255,255,255,0.06); border-color: rgba(93,135,229,0.3); border-style: solid; transform: translateY(-5px); box-shadow: 0 14px 35px rgba(0,0,0,0.28); }
        .doc-glass-card-admin.uploaded-admin { background: rgba(16,185,129,0.05); border: 1px solid rgba(16,185,129,0.3); }
        @keyframes glowPulse2 { 0%,100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); } 50% { box-shadow: 0 0 16px 4px rgba(16,185,129,0.18); } }
        .uploaded-admin { animation: glowPulse2 2s ease-in-out 1; }
        .doc-action-btn-admin { width: 100%; padding: 9px 12px; border-radius: 11px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 4px; }
        .doc-download-btn-admin { width: 100%; padding: 9px 12px; border-radius: 11px; font-size: 12px; font-weight: 700; cursor: pointer; background: rgba(93,135,229,0.08); border: 1px solid rgba(93,135,229,0.2); color: #fcfcfcff; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 8px; }
        .doc-download-btn-admin:hover { background: rgba(93,135,229,0.16); transform: translateY(-1px); }
        .assigned-bar-admin { display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px 18px; font-size: 13px; color: rgba(255,255,255,0.6); margin-top: 16px; }
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
          color: rgba(255,255,255,0.8);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
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
          --text-main: rgba(255,255,255,0.92);
          --text-muted: rgba(255,255,255,0.45);
          --border-light: rgba(255,255,255,0.08);
        }
      `}</style>

      <div className="pres-page-header" style={{ marginBottom: 25, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' }}>Directorio de Presidentes</h2>
          <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>Administra los accesos y directivos registrados.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => cargarPresidentes(true)}
            style={{ padding: '10px 20px', backgroundColor: 'white', color: '#334155', border: '1.5px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FaSyncAlt />
          </button>
          <button onClick={() => navigate('/admin/registrar-presidente')}
            style={{ background: '#0b4ea6', color: 'white', border: 'none', borderRadius: 10, padding: '12px 24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <FaPlus /> Registrar Presidente
          </button>
        </div>
      </div>

      {/* ─── Stats ─── */}
      <div className="pres-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 20, marginBottom: 30 }}>
        {[
          { icon: <FaFileAlt />, bg: 'rgba(217, 119, 6, 0.1)', color: '#d97706', label: 'PENDIENTES', val: stats.pendientes, key: 'pendientes' },
          { icon: <FaUserTie />, bg: '#eff6ff', color: '#3b82f6', label: 'TOTAL REGISTROS', val: stats.total, key: 'todos' },
          { icon: <FaCheck />, bg: '#dcfce7', color: '#10b981', label: 'ACTIVOS', val: stats.activos, key: 'activos' },
          { icon: <FaTimes />, bg: '#fee2e2', color: '#ef4444', label: 'INACTIVOS', val: stats.inactivos, key: 'inactivos' },
        ].map(({ icon, bg, color, label, val, key }) => (
          <div
            key={label}
            onClick={() => setFiltroEstatus(key)}
            style={{
              background: 'white',
              padding: 24,
              borderRadius: 16,
              border: filtroEstatus === key ? `2px solid ${color}` : '1px solid #e2e8f0',
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
              <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontWeight: 700 }}>{label}</p>
              <h3 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#1e293b' }}>{val}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Tabla ─── */}
      <div className="card pres-card-table" style={{ padding: '35px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', background: 'white', borderRadius: '16px' }}>
        <div className="pres-table-header" style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', overflow: 'hidden' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Lista de presidentes</h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Usa los filtros para búsqueda por nombre, CURP o correo electrónico.</p>
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
              style={{ background: 'white', border: '1.5px solid #e2e8f0', padding: '10px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', cursor: 'pointer' }}
            >
              {sortOrder === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />} {sortOrder === 'asc' ? 'REC' : 'ANT'}
            </button>

            <div style={{ display: 'flex', gap: '4px', background: '#f8fafc', padding: '5px', borderRadius: '14px', border: '1.5px solid #e2e8f0' }}>
              {['pendientes', 'todos', 'activos', 'inactivos'].map((val) => (
                <button
                  key={val}
                  onClick={() => setFiltroEstatus(val)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    background: filtroEstatus === val ? 'white' : 'transparent',
                    color: filtroEstatus === val ? (val === 'pendientes' ? '#d97706' : '#0b4ea6') : '#64748b',
                    boxShadow: filtroEstatus === val ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    fontSize: '11px',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    cursor: 'pointer'
                  }}
                >
                  {val === 'todos' ? 'Todos' : (val === 'activos' ? 'Activos' : (val === 'inactivos' ? 'Inactivos' : 'Pendientes'))}
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
        alCerrar={() => setModalEdicion(false)}
        titulo="Detalle del Presidente"
        tamanio="grande"
        pie={
          <>
            <BotonSecundario etiqueta="Cancelar" alHacerClick={() => setModalEdicion(false)} />
            <BotonPrimario
              etiqueta={loading ? 'Guardando...' : 'Guardar Cambios'}
              alHacerClick={guardarEdicion}
              deshabilitado={loading}
              icono={<FaSave />}
            />
          </>
        }
      >
        <div style={{ display: 'flex', gap: '24px', flexDirection: 'column' }}>
          {/* FOTO DEL PRESIDENTE Y CABECERA */}
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ width: '100px', height: '100px', borderRadius: '20px', overflow: 'hidden', flexShrink: 0, border: '2px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {presidenteEnEdicion?.RutaFoto ? (
                <img 
                  src={presidenteEnEdicion.RutaFoto.startsWith('http') ? presidenteEnEdicion.RutaFoto : `${API_BASE}${presidenteEnEdicion.RutaFoto.replace(/\\/g, '/').startsWith('/') ? '' : '/'}${presidenteEnEdicion.RutaFoto.replace(/\\/g, '/')}`} 
                  alt="Foto del presidente" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  onError={(e) => { 
                    e.target.style.display = 'none'; 
                    const sib = e.target.parentNode.querySelector('.fallback-icon');
                    if (sib) sib.style.display = 'block';
                  }}
                />
              ) : null}
              <FaUser className="fallback-icon" style={{ display: presidenteEnEdicion?.RutaFoto ? 'none' : 'block', fontSize: '40px', color: '#cbd5e1' }} />
            </div>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>
                {datosEditables.primerNombre} {datosEditables.primerApellido} {datosEditables.segundoApellido}
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '600' }}>
                {datosEditables.curp || 'CURP NO REGISTRADA'} • {presidenteEnEdicion?.equipo || 'Sin Equipo'}
              </p>
              {(() => {
                const statusCfg = ESTATUS_CATALOGO.find(e => e.id === Number(datosEditables.estatusId));
                return (
                  <span style={{
                    display: 'inline-block',
                    marginTop: '10px',
                    padding: '4px 10px',
                    background: statusCfg?.bg || '#f1f5f9',
                    color: statusCfg?.color || '#475569',
                    fontSize: '11px',
                    fontWeight: '800',
                    borderRadius: '6px',
                    border: `1px solid ${statusCfg?.color || '#cbd5e1'}22`
                  }}>
                    {statusCfg?.label?.toUpperCase() || 'DESCONOCIDO'}
                  </span>
                );
              })()}
            </div>
          </div>

          {/* SECCIÓN: DATOS DEL PRESIDENTE */}
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <h4 style={{ margin: '0 0 20px 0', fontSize: '15px', fontWeight: '800', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>Datos del Presidente</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
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
                etiqueta="CURP"
                nombre="curp"
                valor={datosEditables.curp}
                onChange={manejarCambioInput}
                placeholder="CURP de 18 caracteres"
              />
              <EntradaSeleccion
                etiqueta="Estatus del Presidente"
                nombre="estatusId"
                valor={String(datosEditables.estatusId || '')}
                onChange={manejarCambioInput}
                opciones={ESTATUS_CATALOGO.filter(e => e.id !== 8).map(e => ({ valor: String(e.id), etiqueta: e.label }))}
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
            background: 'rgba(59, 130, 246, 0.1)',
            color: '#3b82f6',
            width: '70px',
            height: '70px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 15px',
            boxShadow: '0 8px 16px rgba(59, 130, 246, 0.15)'
          }}>
            <FaUserPlus />
          </div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>Equiparando a {equipoNombreHuerfano}</h3>
          <p style={{ margin: '5px 0 0', fontSize: '14px', color: '#64748b' }}>Selecciona un presidente disponible para tomar el mando.</p>
        </div>

        <div style={{ position: 'relative', marginBottom: '20px' }}>
          <div style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
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
              border: '2px solid #f1f5f9',
              background: '#f8fafc',
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
                    border: '1px solid #f1f5f9',
                    transition: 'all 0.2s',
                    background: 'white'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #0b4ea6 0%, #1e40af 100%)',
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
                      <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>{pres.nombre || pres.Nombre}</div>
                      <div style={{ color: '#64748b', fontSize: '12px' }}>{pres.correo || pres.Email}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => ejecutarReasignacion(pres.id || pres.UsuarioId, pres.nombre || pres.Nombre)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      background: '#eff6ff',
                      color: '#2563eb',
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
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              <FaUserTie style={{ fontSize: '40px', opacity: 0.3, marginBottom: '10px' }} />
              <p>No hay presidentes disponibles que coincidan.</p>
            </div>
          )}
        </div>
      </Modal>

      <style>{`
        .pres-item-hover:hover {
          background: #f8fafc !important;
          border-color: #cbd5e1 !important;
          transform: translateX(5px);
        }
        .pres-item-hover button:hover {
          background: #2563eb !important;
          color: white !important;
        }
      `}</style>

    </div>
  );
}
