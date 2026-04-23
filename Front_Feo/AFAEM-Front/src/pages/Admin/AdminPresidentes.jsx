import React, { useState, useEffect } from 'react';
import { FaPlus, FaCheck, FaTimes, FaUserTie, FaEdit, FaTrash, FaMoneyBillWave, FaFileAlt, FaCheckCircle, FaArrowLeft, FaSearch, FaUserPlus, FaShieldAlt, FaSave, FaSyncAlt } from 'react-icons/fa';
import DashboardTable from '../../components/DashboardTable';
import SearchBar from '../../components/Common/SearchBar';
import { Modal, BotonPrimario, BotonSecundario, EntradaFormulario, EntradaSeleccion } from '../../components/partials';
import Swal from 'sweetalert2';
import { PDFDocument } from 'pdf-lib';
import { validarFotografia } from '../../services/foto';
import { API_BASE } from '../../config/config';
import { getPresidentesDirectorio, updatePresidente, deletePresidente, getPresidentesDisponibles, vincularPresidenteEquipo, registrarPresidenteAdmin } from '../../services/admin';

/* ─── Catálogos ─── */
const CATALOGO_SEGUROS_INICIAL = [
  { id: '1', nombre: 'Seguro contra accidentes', descripcion: 'Protege ante accidentes deportivos.',   precio: 150 },
  { id: '2', nombre: 'Seguro de vida',           descripcion: 'Cobertura en caso de fallecimiento.',   precio: 200 },
  { id: '3', nombre: 'Seguro médico',            descripcion: 'Incluye atención médica y hospitalaria.', precio: 180 },
];

const REQUISITOS = [
  { documento: 'actaNacimiento',    nombre: 'Acta de nacimiento',             icon: '📜' },
  { documento: 'identificacion',    nombre: 'Identificación oficial',         icon: '🪪' },
  { documento: 'fotografia',        nombre: 'Fotografía (Imagen)',            icon: '📸' },
  { documento: 'formatoAfiliacion', nombre: 'Formato de afiliación firmado',  icon: '📝', hasDownload: true },
];

/* ─── Catálogos para Selectores ─── */
const CATALOGO_LIGAS = [
  { valor: 'LIGA AFAEM NORTE', etiqueta: 'Ligue AFAEM Norte' },
  { valor: 'LIGA AFAEM SUR',   etiqueta: 'Ligue AFAEM Sur' },
  { valor: 'VARONIL PRIMERA',  etiqueta: 'Varonil Primera Plus' },
  { valor: 'FEMENIL ELITE',    etiqueta: 'Femenil Elite' },
  { valor: 'OTRA',             etiqueta: 'Otra Liga (Especificar)' },
];

const CATALOGO_ASOCIACIONES = [
  { valor: 'MORELOS',      etiqueta: 'Morelos (AFEMOR)' },
  { valor: 'ESTADO DE MEX', etiqueta: 'Estado de México' },
  { valor: 'CDMX',         etiqueta: 'Ciudad de México' },
  { valor: 'PUEBLA',       etiqueta: 'Puebla' },
  { valor: 'QUERETARO',    etiqueta: 'Querétaro' },
];

const CATALOGO_ROLES = [
  { valor: 'PRESIDENTE',   etiqueta: 'Presidente de Equipo' },
  { valor: 'DIRECTIVO',    etiqueta: 'Directivo de Club' },
  { valor: 'DELEGADO',     etiqueta: 'Delegado Deportivo' },
  { valor: 'REPRESENTANTE', etiqueta: 'Representante Legal' },
];

/* ─── Step pill ─── */
const StepCircle = ({ num, label, active, done }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
    <div style={{
      width: 44, height: 44, borderRadius: 14,
      background: done  ? 'rgba(16,185,129,.15)'
                : active ? 'linear-gradient(135deg,#0b4ea6,#1e40af)'
                         : 'rgba(255,255,255,.05)',
      border: done  ? '1px solid rgba(16,185,129,.4)'
            : active ? '1px solid rgba(93,135,229,.5)'
                     : '1px solid rgba(255,255,255,.1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
      boxShadow: active ? '0 8px 20px rgba(11,78,166,.4)' : 'none',
      transition: 'all .4s',
    }}>
      {done ? <span style={{ color: '#34d399' }}>✓</span>
            : num === 1 ? <FaMoneyBillWave style={{ color: active ? 'white' : 'rgba(255,255,255,.3)' }} />
                        : <FaFileAlt      style={{ color: active ? 'white' : 'rgba(255,255,255,.3)' }} />}
    </div>
    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase',
      color: done ? 'rgba(52,211,153,.8)' : active ? '#5d87e5' : 'rgba(255,255,255,.25)' }}>
      {label}
    </span>
  </div>
);

/* ══════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════════════════════════════════ */
export default function AdminPresidentes() {

  /* ── Tabla ── */
  const [presidentes,  setPresidentes]  = useState([]);
  const [cargando,     setCargando]     = useState(true);
  const [searchTerm,   setSearchTerm]   = useState('');

  /* ── Seguros ── */
  const [seguros, setSeguros] = useState(CATALOGO_SEGUROS_INICIAL);
  const [cargandoSeguros, setCargandoSeguros] = useState(false);

  /* ── Modal ── */
  const [modalAbierto, setModalAbierto] = useState(false);
  const [paso,         setPaso]         = useState(1); // 1 = Cuotas, 2 = Datos + Documentos

  /* Paso 1 – Cuotas */
  const [numPersonas,       setNumPersonas]       = useState('');
  const [asignacionSeguros, setAsignacionSeguros] = useState({ '1': '', '2': '', '3': '' });

  /* Paso 2 – Datos de afiliación (nombre/CURP vienen del OCR) */
  const [infoPersonal, setInfoPersonal] = useState({
    correo: '', telefono: '', tipoAfiliacion: '', asociacion: '', liga: '', equipo: '',
  });
  const [documents,   setDocuments]   = useState({});
  const [ocrResults,  setOcrResults]  = useState({});
  const [detailsOpen, setDetailsOpen] = useState({});
  const [loading,     setLoading]     = useState(false);

  /* ── Edición ── */
  const [modalEdicion, setModalEdicion] = useState(false);
  const [presidenteEnEdicion, setPresidenteEnEdicion] = useState(null);
  const [datosEditables, setDatosEditables] = useState({
    nombre: '', email: '', telefono: '', curp: '', estatus: '1'
  });

  /* ── Reasignación ── */
  const [modalReasignacion, setModalReasignacion] = useState(false);
  const [equipoIDHuerfano, setEquipoIDHuerfano] = useState(null);
  const [equipoNombreHuerfano, setEquipoNombreHuerfano] = useState('');
  const [disponibles, setDisponibles] = useState([]);
  const [searchDisponibles, setSearchDisponibles] = useState('');
  const [loadingReasignacion, setLoadingReasignacion] = useState(false);

  /* Cálculos */
  const totalAsignados    = Object.values(asignacionSeguros).reduce((a, v) => a + Number(v || 0), 0);
  const totalPagar        = seguros.reduce((a, s) => a + Number(asignacionSeguros[s.id] || 0) * s.precio, 0);
  const segurosRequeridos = Number(numPersonas || 0) > 0 ? Number(numPersonas) + 1 : 0;

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
        { id: 1, nombre: 'Carlos Ruiz',  correo: 'carlos.ruiz@hotmail.com', telefono: '55 1234 5678', curp: 'RUZC890102HDFLL4', estatus: true, equipo: 'Rayados', equipoId: 101 },
        { id: 2, nombre: 'Ana Gónzalez', correo: 'ana.g@gmail.com',         telefono: '55 9876 5432', curp: 'GOZA920311MDFXX2', estatus: true, equipo: 'Tigres', equipoId: 102 },
        { id: 3, nombre: 'Miguel Angel', correo: 'm.angel@outlook.com',     telefono: '33 1122 3344', curp: 'ANGM850404HJCR11', estatus: false, equipo: null, equipoId: null },
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

  /* ─── Efecto de Auto-cálculo ─── */
  useEffect(() => {
    if (numPersonas !== '' && paso === 1) {
      const totalNecesario = Number(numPersonas) + 1;
      // Inicializar con el primer seguro disponible
      const newAsignacion = {};
      seguros.forEach((seg, idx) => {
        newAsignacion[seg.id] = idx === 0 ? totalNecesario : 0;
      });
      setAsignacionSeguros(newAsignacion);
    }
  }, [numPersonas, seguros]);

  /* ─── Reset / cerrar ─── */
  const resetModal = () => {
    setPaso(1);
    setNumPersonas('');
    // Crear un objeto de asignación vacío para todos los seguros
    const emptyAsignacion = {};
    seguros.forEach(seg => {
      emptyAsignacion[seg.id] = '';
    });
    setAsignacionSeguros(emptyAsignacion);
    setInfoPersonal({ correo: '', telefono: '', tipoAfiliacion: '', asociacion: '', liga: '', equipo: '' });
    setDocuments({});
    setOcrResults({});
    setDetailsOpen({});
  };
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
        if (l.includes('NOMBRE(S)') && i + 1 < lines.length)      nombres = lines[i + 1];
        if (l.includes('PRIMER APELLIDO') && i + 1 < lines.length) ap1     = lines[i + 1];
        if (l.includes('SEGUNDO APELLIDO') && i + 1 < lines.length) ap2    = lines[i + 1];
      }
      if (nombres && ap1) data.nombre = `${ap1} ${ap2} ${nombres}`.replace(/\s+/g, ' ').toUpperCase();
    }
    if (!data.fecha_nac || data.fecha_nac === 'No detectada') {
      const meses = { ENERO:'01',FEBRERO:'02',MARZO:'03',ABRIL:'04',MAYO:'05',JUNIO:'06',JULIO:'07',AGOSTO:'08',SEPTIEMBRE:'09',OCTUBRE:'10',NOVIEMBRE:'11',DICIEMBRE:'12' };
      const m = rawText.match(/(\d{1,2})\s*DE\s*([A-Z]+)\s*DE\s*(\d{4})/i);
      if (m && meses[m[2].toUpperCase()]) data.fecha_nac = `${m[1].padStart(2,'0')}/${meses[m[2].toUpperCase()]}/${m[3]}`;
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
        const val   = row.querySelector('.valor')?.textContent?.trim() || '';
        if (label.includes('curp'))                extracted.curp        = val;
        if (label.includes('nombre'))              extracted.nombre      = val;
        if (label.includes('nacionalidad'))        extracted.nacionalidad = val;
        if (label.includes('fecha de nacimiento')) extracted.fecha_nac   = val;
        if (label.includes('edad'))                extracted.edad        = val;
        if (label.includes('documento'))           extracted.documento   = val;
      });
      const rawText = doc.querySelector('pre')?.textContent;
      if (rawText && (docKey === 'actaNacimiento' || extracted.documento?.includes('ACTA'))) {
        extracted = mejorarExtraccionActa(rawText, extracted);
      }
      setOcrResults(prev => ({ ...prev, ...extracted, [docKey]: `OCR Procesado: ${extracted.nombre}` }));
      Swal.fire({
        title: extracted.nombre ? '¡Lectura Exitosa!' : 'Documento procesado',
        text:  extracted.nombre ? `Se detectó a: ${extracted.nombre}` : 'Se leyó el documento pero no se extrajo el nombre automáticamente.',
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
      const form   = pdfDoc.getForm();
      const page   = pdfDoc.getPages()[0];

      if (documents.fotografia) {
        try {
          const photoBytes = await documents.fotografia.arrayBuffer();
          const isJpg = !documents.fotografia.name.toLowerCase().endsWith('.png');
          const img   = isJpg ? await pdfDoc.embedJpg(photoBytes) : await pdfDoc.embedPng(photoBytes);
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
      if (curp && curp !== 'No detectado')           form.getTextField('CURP o Clave Única de Registro de Población')?.setText(curp);
      if (fecha_nac && fecha_nac !== 'No detectada') form.getTextField('Fecha de Nacimiento')?.setText(fecha_nac);
      if (infoPersonal.correo)                       form.getTextField('Correo electrónico')?.setText(infoPersonal.correo);
      if (infoPersonal.telefono)                     form.getTextField('Teléfono')?.setText(infoPersonal.telefono);
      if (infoPersonal.tipoAfiliacion)               form.getTextField('fill_20')?.setText(infoPersonal.tipoAfiliacion);
      if (infoPersonal.asociacion)                   form.getTextField('Asociación')?.setText(infoPersonal.asociacion.toUpperCase());
      if (infoPersonal.liga)                         form.getTextField('Liga')?.setText(infoPersonal.liga.toUpperCase());
      if (infoPersonal.equipo)                       form.getTextField('Equipo')?.setText(infoPersonal.equipo.toUpperCase());
      if (nacionalidad)                              form.getTextField('Lugar de Nacimiento')?.setText(nacionalidad);
      if (curp && curp.length >= 11) {
        const sx = curp.charAt(10).toUpperCase();
        form.getTextField('Sexo')?.setText(sx === 'H' ? 'MASCULINO' : sx === 'M' ? 'FEMENINO' : '');
      }
      const hoy   = new Date();
      const MESES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
      form.getTextField('A')?.setText(String(hoy.getDate()).padStart(2, '0'));
      form.getTextField('de')?.setText(MESES[hoy.getMonth()]);
      form.getTextField('del 20')?.setText(String(hoy.getFullYear()).slice(-2));
      form.getTextField('Cargo')?.setText('PRESIDENTE');

      const blob  = new Blob([await pdfDoc.save()], { type: 'application/pdf' });
      const url   = URL.createObjectURL(blob);
      const link  = document.createElement('a');
      const safe  = (nombre || 'Presidente').replace(/[^a-zA-Z0-9_\s]/g, '').trim();
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
      if (totalAsignados !== segurosRequeridos) { Swal.fire('Atención', `Faltan ${segurosRequeridos - totalAsignados} seguros por asignar (Jugadores + Presidente).`, 'warning'); return; }
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
    const curpDetectada   = ocrResults.curp   || '';
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
        html: `<p style="font-size:14px;color:#475569;">El registro de <strong>${nombreDetectado}</strong> fue completado y aprobado automáticamente. Su contraseña de acceso es <strong>Hola1234?</strong></p>`,
        icon: 'success', confirmButtonColor: '#0b4ea6',
      });
    } catch (err) {
      Swal.fire('Error', err.response?.data?.detail || err.message || 'No se pudo completar el registro.', 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ═══ Tabla ═══ */
  const stats = { 
    total: (presidentes || []).length, 
    activos: (presidentes || []).filter(p => p.estatus === true || p.Estatus === true || p.estatus === 1 || p.estatus === "1").length, 
    inactivos: (presidentes || []).filter(p => !(p.estatus === true || p.Estatus === true || p.estatus === 1 || p.estatus === "1")).length 
  };

  /* ═══ Edición ═══ */
  const handleEditarPresidente = (pres) => {
    setPresidenteEnEdicion(pres);
    setDatosEditables({
      nombre: pres.nombre || pres.Nombre || '',
      email: pres.correo || pres.Email || '',
      telefono: pres.telefono || pres.Telefono || '',
      curp: pres.curp || pres.CURP || '',
      estatus: pres.estatus ? '1' : '0'
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
      await updatePresidente(presidenteEnEdicion.id || presidenteEnEdicion.UsuarioId, datosEditables);
      await cargarPresidentes();
      setModalEdicion(false);
      Swal.fire('¡Éxito!', 'Los datos del presidente han sido actualizados.', 'success');
    } catch (err) {
      Swal.fire('Error', 'No se pudieron guardar los cambios.', 'error');
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

  const filtrados = (presidentes || []).filter(p => {
    const nom = (p.nombre || p.Nombre || "").toLowerCase();
    const mail = (p.correo || p.Email || "").toLowerCase();
    const query = (searchTerm || "").toLowerCase();
    return nom.includes(query) || mail.includes(query);
  });

  const columns = [
    { key: 'id', label: 'Folio' }, { key: 'presidente', label: 'Presidente' },
    { key: 'contacto', label: 'Contacto' }, { key: 'curp', label: 'CURP' },
    { key: 'estatus', label: 'Estatus' }, { key: 'acciones', label: 'Acciones', style: { textAlign: 'center' } },
  ];

  const dataTransformada = filtrados.map(p => ({
    id:         <span style={{ fontWeight: 700, color: '#64748b' }}>#{p.id || p.UsuarioId || '—'}</span>,
    presidente: <div style={{ fontWeight: 800, color: '#1e293b' }}>{p.nombre || p.Nombre || 'Sin nombre'}</div>,
    contacto:   <div><div style={{ fontSize: 13, color: '#0b4ea6', fontWeight: 600 }}>{p.correo || p.Email || 'Sin correo'}</div><div style={{ fontSize: 12, color: '#64748b' }}>{p.telefono || p.Telefono || '—'}</div></div>,
    curp:       <span style={{ fontSize: 12, letterSpacing: '0.5px' }}>{p.curp || p.CURP || '—'}</span>,
    estatus:    (p.estatus === true || p.Estatus === true || p.estatus === 1 || p.estatus === "1")
      ? <span style={{ background: '#dcfce7', color: '#166534', padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800 }}>ACTIVO</span>
      : <span style={{ background: '#fee2e2', color: '#991b1b', padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800 }}>SUSPENDIDO</span>,
    acciones: (
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button 
          onClick={() => handleEditarPresidente(p)}
          style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#3b82f6', cursor: 'pointer', padding: '10px', borderRadius: 10, fontSize: 16, transition: 'all 0.2s' }}
          title="Ver / Editar"
        >
          <FaEdit />
        </button>
        <button 
          onClick={() => handleEliminar(p)} 
          style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', cursor: 'pointer', padding: '10px', borderRadius: 10, fontSize: 16, transition: 'all 0.2s' }}
          title="Eliminar Permanente"
        >
          <FaTrash />
        </button>
      </div>
    ),
  }));

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <div style={{ padding: 30 }}>
      <style>{`
        .insurance-card-admin {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; padding: 18px 20px;
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 12px; transition: all 0.3s ease;
        }
        .insurance-card-admin:hover { background: rgba(255,255,255,0.06); border-color: rgba(93,135,229,0.35); transform: translateX(3px); }
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
        .doc-download-btn-admin { width: 100%; padding: 9px 12px; border-radius: 11px; font-size: 12px; font-weight: 700; cursor: pointer; background: rgba(93,135,229,0.08); border: 1px solid rgba(93,135,229,0.2); color: #5d87e5; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 8px; }
        .doc-download-btn-admin:hover { background: rgba(93,135,229,0.16); transform: translateY(-1px); }
        .assigned-bar-admin { display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px 18px; font-size: 13px; color: rgba(255,255,255,0.6); margin-top: 16px; }
        .pres-modal-dark-bg {
          --text-main: rgba(255,255,255,0.92);
          --text-muted: rgba(255,255,255,0.45);
          --border-light: rgba(255,255,255,0.08);
        }
      `}</style>

      <div style={{ marginBottom: 25, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
          <button onClick={() => { resetModal(); setModalAbierto(true); }}
            style={{ background: '#0b4ea6', color: 'white', border: 'none', borderRadius: 10, padding: '12px 24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <FaPlus /> Registrar Presidente
          </button>
        </div>
      </div>

      {/* ─── Stats ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 20, marginBottom: 30 }}>
        {[
          { icon: <FaUserTie />, bg: '#eff6ff', color: '#3b82f6', label: 'TOTAL REGISTROS', val: stats.total    },
          { icon: <FaCheck />,   bg: '#dcfce7', color: '#10b981', label: 'ACTIVOS',          val: stats.activos  },
          { icon: <FaTimes />,   bg: '#fee2e2', color: '#ef4444', label: 'INACTIVOS',         val: stats.inactivos },
        ].map(({ icon, bg, color, label, val }) => (
          <div key={label} style={{ background: 'white', padding: 24, borderRadius: 16, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 60, height: 60, borderRadius: 14, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color }}>{icon}</div>
            <div>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontWeight: 700 }}>{label}</p>
              <h3 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#1e293b' }}>{val}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Tabla ─── */}
      <div style={{ background: 'white', borderRadius: 16, padding: 25, boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <SearchBar value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar por nombre o correo..." />
        </div>
        <DashboardTable columns={columns} data={dataTransformada} isLoading={cargando} emptyMessage="No se encontraron presidentes." />
      </div>

      {/* ══ MODAL ══ */}
      <Modal
        estaAbierto={modalAbierto}
        alCerrar={cerrarModal}
        titulo=""
        tamanio="grande"
        pie={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <BotonSecundario etiqueta="Cancelar" alHacerClick={cerrarModal} />
            <div style={{ display: 'flex', gap: 12 }}>
              {paso > 1 && (
                <button onClick={() => setPaso(p => p - 1)} style={{ padding: '10px 22px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FaArrowLeft /> Anterior
                </button>
              )}
              <BotonPrimario
                etiqueta={paso === 2 ? (loading ? 'Registrando…' : '✓ Finalizar Registro') : 'Siguiente →'}
                alHacerClick={irSiguiente}
                deshabilitado={loading}
              />
            </div>
          </div>
        }
      >
        {/* Contenedor dark glass */}
        <div className="pres-modal-dark-bg" style={{
          background: 'linear-gradient(135deg,#060f2e 0%,#0b2a6b 40%,#1e1b4b 100%)',
          borderRadius: 16, padding: '30px 35px', minHeight: 480,
        }}>

          {/* ── Stepper ── */}
          <div style={{ marginBottom: 28 }}>
            <p style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 18px' }}>
              REGISTRO DE NUEVO PRESIDENTE — APROBACIÓN AUTOMÁTICA
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <StepCircle num={1} label="Cuotas y Seguros" active={paso === 1} done={paso > 1} />
              <div style={{ position: 'relative', width: 110, height: 2, margin: '0 12px', marginBottom: 26 }}>
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }} />
                <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: paso > 1 ? '100%' : '0%', background: 'linear-gradient(90deg,#10b981,#34d399)', borderRadius: 2, transition: 'width 0.6s', boxShadow: '0 0 8px rgba(16,185,129,.5)' }} />
              </div>
              <StepCircle num={2} label="Datos y Documentos" active={paso === 2} done={false} />
            </div>
          </div>

          {/* ════ PASO 1: Solo Cuotas ════ */}
          {paso === 1 && (
            <div>
              {/* Banner info */}
              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 16, padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                <FaCheckCircle style={{ color: '#34d399', fontSize: 20, flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
                  Como <strong style={{ color: '#34d399' }}>Administrador</strong>, el pago se aprueba automáticamente. El nombre y CURP del presidente serán extraídos en el siguiente paso mediante OCR.
                </p>
              </div>

              {/* Cuotas */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '22px 20px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(16,185,129,.35),transparent)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                  <div style={{ width: 4, height: 18, background: 'linear-gradient(180deg,#10b981,#059669)', borderRadius: 4 }} />
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.88)' }}>Plantilla Inicial y Distribución de Seguros</h4>
                </div>

                <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '20px', background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ flex: 1 }}>
                    <label className="premium-label-admin">¿Cuántos jugadores tendrá el equipo inicialmente?</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '8px' }}>
                      <input
                        type="number" placeholder="0" min="0"
                        value={numPersonas}
                        onChange={e => { const v = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0); setNumPersonas(v); }}
                        className="premium-input-admin" style={{ width: 120, fontSize: '18px', textAlign: 'center' }}
                      />
                      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.4' }}>
                        # Jugadores + 1 Presidente = <strong style={{ color: '#5d87e5' }}>{segurosRequeridos} seguros</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {seguros.map(seg => (
                  <div key={seg.id} className="insurance-card-admin">
                    <div>
                      <h4 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)', margin: '0 0 3px' }}>
                        {seg.nombre} <span style={{ fontSize: 13, color: '#5d87e5' }}>${seg.precio} c/u</span>
                      </h4>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{seg.descripcion}</p>
                    </div>
                    <input
                      type="number" min="0" value={asignacionSeguros[seg.id]}
                      onChange={e => { const v = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0); setAsignacionSeguros(prev => ({ ...prev, [seg.id]: v })); }}
                      style={{ width: 70, textAlign: 'center', padding: '9px 12px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', borderRadius: 10 }}
                    />
                  </div>
                ))}

                <div className="assigned-bar-admin">
                  <span>Seguros asignados (Jugadores + Presid.): {totalAsignados}/{segurosRequeridos}</span>
                  {Number(numPersonas) > 0 && totalAsignados === segurosRequeridos
                    ? <span style={{ color: '#34d399', fontWeight: 800 }}>✓ Todos asignados</span>
                    : <span style={{ color: '#f87171', fontWeight: 800 }}>● Pendientes</span>}
                </div>

                <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ background: 'rgba(93,135,229,0.1)', border: '1px solid rgba(93,135,229,0.2)', borderRadius: 12, padding: '10px 20px', fontSize: 15, fontWeight: 800, color: '#5d87e5' }}>
                    Total estimado: ${totalPagar}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════ PASO 2: Datos de Afiliación + Documentos ════ */}
          {paso === 2 && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 22 }}>
                <h3 style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-main)', margin: '0 0 6px' }}>Datos y Documentación</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>El nombre y CURP se extraerán automáticamente por OCR al subir el Acta o Identificación.</p>
              </div>

              {/* Datos de afiliación — misma sección del pre-registro */}
              <div style={{ background: 'linear-gradient(135deg,rgba(11,78,166,.07) 0%,rgba(30,27,75,.09) 100%)', border: '1px solid rgba(93,135,229,.15)', borderRadius: 22, padding: '22px 20px', marginBottom: 26, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(93,135,229,.5),transparent)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                  <div style={{ width: 5, height: 20, background: 'linear-gradient(180deg,#5d87e5,#0b4ea6)', borderRadius: 4 }} />
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text-main)' }}>Datos de Registro</h4>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label className="premium-label-admin">Correo Electrónico *</label>
                    <input type="email" placeholder="correo@example.com" value={infoPersonal.correo} onChange={e => setInfoPersonal(p => ({ ...p, correo: e.target.value }))} className="premium-input-admin" />
                  </div>
                  <div>
                    <label className="premium-label-admin">Teléfono</label>
                    <input type="tel" placeholder="55 1234 5678" value={infoPersonal.telefono} onChange={e => setInfoPersonal(p => ({ ...p, telefono: e.target.value }))} className="premium-input-admin" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  <div>
                    <label className="premium-label-admin">Rol / Cargo</label>
                    <select 
                      value={infoPersonal.tipoAfiliacion} 
                      onChange={e => setInfoPersonal(p => ({ ...p, tipoAfiliacion: e.target.value }))} 
                      className="premium-input-admin"
                      style={{ cursor: 'pointer' }}
                    >
                      <option value="">Selecciona...</option>
                      {CATALOGO_ROLES.map(r => <option key={r.valor} value={r.valor}>{r.etiqueta}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="premium-label-admin">Asociación</label>
                    <select 
                      value={infoPersonal.asociacion} 
                      onChange={e => setInfoPersonal(p => ({ ...p, asociacion: e.target.value }))} 
                      className="premium-input-admin"
                      style={{ cursor: 'pointer' }}
                    >
                      <option value="">Selecciona...</option>
                      {CATALOGO_ASOCIACIONES.map(a => <option key={a.valor} value={a.valor}>{a.etiqueta}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="premium-label-admin">Liga Destino</label>
                    <select 
                      value={infoPersonal.liga} 
                      onChange={e => setInfoPersonal(p => ({ ...p, liga: e.target.value }))} 
                      className="premium-input-admin"
                      style={{ cursor: 'pointer' }}
                    >
                      <option value="">Selecciona...</option>
                      {CATALOGO_LIGAS.map(l => <option key={l.valor} value={l.valor}>{l.etiqueta}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="premium-label-admin">Nombre del Equipo</label>
                    <input type="text" placeholder="Ej: Rayados FC" value={infoPersonal.equipo} onChange={e => setInfoPersonal(p => ({ ...p, equipo: e.target.value }))} className="premium-input-admin" />
                  </div>
                </div>
              </div>

              {/* Tarjetas de documentos */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16, marginBottom: 20 }}>
                {REQUISITOS.map((doc, idx) => {
                  const isUploaded = !!documents[doc.documento];
                  const isOcrDoc   = ['actaNacimiento','identificacion'].includes(doc.documento);
                  const ocrDone    = isOcrDoc && ocrResults[doc.documento];

                  let statusLabel, statusColor, statusBg, statusDot;
                  if (ocrDone || isUploaded) {
                    statusLabel = ocrDone ? 'Procesado' : 'Listo'; statusColor = '#34d399'; statusDot = '#10b981'; statusBg = 'rgba(16,185,129,0.12)';
                  } else {
                    statusLabel = 'Pendiente'; statusColor = '#f59e0b'; statusDot = '#d97706'; statusBg = 'rgba(245,158,11,0.12)';
                  }

                  return (
                    <div key={idx} className={`doc-glass-card-admin${isUploaded ? ' uploaded-admin' : ''}`}>
                      {/* Sheen */}
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: isUploaded ? 'linear-gradient(90deg,transparent,rgba(16,185,129,.4),transparent)' : 'linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent)' }} />
                      {/* Status pill */}
                      <div style={{ position: 'absolute', top: 13, right: 13, padding: '4px 10px', borderRadius: 20, fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', background: statusBg, color: statusColor, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: statusDot, boxShadow: `0 0 5px ${statusDot}` }} />
                        {statusLabel}
                      </div>
                      {/* Icono */}
                      <div style={{ width: 64, height: 64, borderRadius: 18, background: isUploaded ? 'rgba(16,185,129,0.1)' : 'rgba(11,78,166,0.1)', border: isUploaded ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(93,135,229,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 12 }}>
                        {doc.icon}
                      </div>
                      <h4 style={{ fontSize: 13, fontWeight: 800, color: isUploaded ? '#34d399' : 'var(--text-main)', margin: '0 0 5px' }}>{doc.nombre}</h4>
                      <p style={{ fontSize: 10, color: isUploaded ? 'rgba(52,211,153,0.7)' : 'var(--text-muted)', margin: '0 0 14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90%' }}>
                        {isUploaded ? `📎 ${documents[doc.documento].name}` : 'Sin archivo seleccionado'}
                      </p>

                      {doc.hasDownload && (
                        <button onClick={handleDownloadFormato} className="doc-download-btn-admin">⬇ Descargar formato</button>
                      )}
                      <button
                        onClick={() => document.getElementById(`admin-file-${doc.documento}`).click()}
                        className="doc-action-btn-admin"
                        style={{ border: isUploaded ? '1px solid rgba(16,185,129,.3)' : '1px solid rgba(255,255,255,.1)', background: isUploaded ? 'rgba(16,185,129,.08)' : 'rgba(255,255,255,.04)', color: isUploaded ? '#34d399' : 'var(--text-muted)' }}
                      >
                        {isUploaded ? '🔄 Cambiar' : '⬆ Subir'}
                      </button>
                      <input type="file" id={`admin-file-${doc.documento}`} style={{ display: 'none' }} onChange={e => handleFileUpload(doc.documento, e.target.files[0])} />

                      {/* OCR toggle */}
                      {(isOcrDoc || doc.documento === 'fotografia') && (
                        <>
                          <button onClick={() => setDetailsOpen(prev => ({ ...prev, [doc.documento]: !prev[doc.documento] }))}
                            style={{ marginTop: 10, background: 'none', border: 'none', color: 'rgba(255,255,255,.3)', fontSize: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                            {detailsOpen[doc.documento] ? '▲ Ocultar detalles' : '▼ Ver detalles extraídos'}
                          </button>
                          {detailsOpen[doc.documento] && (
                            <div style={{ width: '100%', marginTop: 10, background: 'rgba(11,78,166,.06)', border: '1px solid rgba(93,135,229,.12)', borderRadius: 12, padding: 12 }}>
                              {isOcrDoc && Object.keys(ocrResults).length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                                  {[
                                    { label: 'Nombre',       value: ocrResults.nombre },
                                    { label: 'CURP',         value: ocrResults.curp },
                                    { label: 'Fecha Nac.',   value: ocrResults.fecha_nac },
                                    { label: 'Edad',         value: ocrResults.edad },
                                    { label: 'Nacionalidad', value: ocrResults.nacionalidad },
                                  ].map((row, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                      <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{row.label}:</span>
                                      <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{row.value || '—'}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
                                  {doc.documento === 'fotografia' ? '📸 Validación automática de rostro y calidad.' : 'Sube el documento primero para ver los datos extraídos.'}
                                </p>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Progress pills */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 8 }}>
                {REQUISITOS.map((doc, i) => (
                  <div key={i} style={{ height: 8, borderRadius: 4, transition: 'all .4s', width: documents[doc.documento] ? 22 : 8, background: documents[doc.documento] ? '#10b981' : 'rgba(255,255,255,0.12)', boxShadow: documents[doc.documento] ? '0 0 6px rgba(16,185,129,.5)' : 'none' }} />
                ))}
              </div>
            </div>
          )}

        </div>
      </Modal>
      
      {/* ══ MODAL DE EDICIÓN ══ */}
      <Modal
        estaAbierto={modalEdicion}
        alCerrar={() => setModalEdicion(false)}
        titulo="Detalle del Presidente"
        tamanio="medio"
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <EntradaFormulario 
              etiqueta="Nombre Completo" 
              nombre="nombre" 
              valor={datosEditables.nombre} 
              onChange={manejarCambioInput}
              placeholder="Ej: Juan Pérez"
            />
          </div>
          <EntradaFormulario 
            etiqueta="Correo Electrónico" 
            nombre="email" 
            valor={datosEditables.email} 
            onChange={manejarCambioInput}
            placeholder="ejemplo@correo.com"
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
            etiqueta="Estatus del Usuario" 
            nombre="estatus" 
            valor={datosEditables.estatus} 
            onChange={manejarCambioInput}
            opciones={[
              { valor: '1', etiqueta: 'Activo (Acceso Total)' },
              { valor: '0', etiqueta: 'Suspendido (Sin Acceso)' }
            ]}
          />
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
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="spinner-border text-primary" style={{ width: '2rem', height: '2rem' }}></div>
              <p style={{ marginTop: '10px', color: '#64748b', fontSize: '14px' }}>Buscando candidatos...</p>
            </div>
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
