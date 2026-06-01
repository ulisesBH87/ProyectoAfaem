import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowLeft, FaUser, FaMoneyBillWave, FaFolderOpen,
  FaEye, FaEyeSlash, FaUpload, FaFilePdf, FaCheck, FaExclamationTriangle,
  FaSearchPlus, FaSyncAlt
} from 'react-icons/fa';
import Swal from 'sweetalert2';
import { PDFDocument } from 'pdf-lib';
import { validarFotografia } from '../../services/foto';
import { API_BASE } from '../../config/config';
import { registrarPresidenteAdmin } from '../../services/admin';
import { Modal, BotonPrimario, BotonSecundario } from '../../components/partials';

// ─── Paleta de colores (distinta a PreRegistro) ──────────────────────────────
// PreRegistro usa: #090f2b, #0b4ea6, #34d399, #5d87e5 (azul-marino + verde)
// Este panel usa:  #0f1117, #d97706, #f59e0b, #fb923c (negro carbón + ámbar)
const C = {
  bg: '#FFFFFF',//#F1F5F9
  surface: '#181c27',
  card: 'rgba(255,255,255,0.03)',
  cardBorder: 'rgba(255,255,255,0.07)',
  amber: '#f59e0b',
  amberDark: '#d97706',
  amberLight: '#fbbf24',
  orange: '#fb923c',
  rose: '#f87171',
  green: '#4ade80',
  greenDim: 'rgba(74,222,128,0.15)',
  text: 'rgba(255,255,255,0.87)',
  textMid: 'rgba(255,255,255,0.5)',
  textDim: 'rgba(255,255,255,0.28)',
  inputBg: 'rgba(255,255,255,0.04)',
  inputBorder: 'rgba(255,255,255,0.1)',
  focusBorder: '#f59e0b',
};

const PASOS = [
  { id: 1, label: 'Cuenta', icon: <FaUser />, desc: 'Credenciales de acceso' },
  { id: 2, label: 'Cuotas', icon: <FaMoneyBillWave />, desc: 'Seguros y pago' },
  { id: 3, label: 'Documentos', icon: <FaFolderOpen />, desc: 'Expediente' },
];

const REQUISITOS = [
  { documento: 'actaNacimiento', nombre: 'Acta de Nacimiento', icon: '📜', ocr: true },
  { documento: 'identificacion', nombre: 'Identificación Oficial', icon: '🪪', ocr: true },
  { documento: 'fotografia', nombre: 'Fotografía', icon: '📸' },
  { documento: 'formatoAfiliacion', nombre: 'Formato de Afiliación', icon: '📝', hasDownload: true },
];

const CATALOGO_ROLES = [
  { valor: 'TIPO G', etiqueta: 'TIPO G' },
  { valor: 'SIN SEGURO', etiqueta: 'SIN SEGURO' },
];

const CATALOGO_LIGAS_DEFAULT = [
  { valor: 'LIGA AFAEM NORTE', etiqueta: 'AFAEM Norte' },
  { valor: 'LIGA AFAEM SUR', etiqueta: 'AFAEM Sur' },
  { valor: 'VARONIL PRIMERA', etiqueta: 'Varonil Primera Plus' },
  { valor: 'FEMENIL ELITE', etiqueta: 'Femenil Elite' },
  { valor: 'OTRA', etiqueta: 'Otra Liga' },
];

// ─── Subcomponentes ───────────────────────────────────────────────────────────
function FieldLabel({ text, required }) {
  return (
    <label style={{ fontSize: 10.5, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: 6 }}>
      {text}{required && <span style={{ color: C.amber, marginLeft: 3 }}>*</span>}
    </label>
  );
}

function Input({ type = 'text', ...props }) {
  return (
    <input
      type={type}
      {...props}
      style={{
        width: '100%', boxSizing: 'border-box',
        padding: '11px 14px', borderRadius: 10,
        background: C.inputBg, border: `1px solid ${props.error ? C.rose : C.inputBorder}`,
        color: C.text, outline: 'none', fontSize: 14,
        transition: 'border-color .2s',
        ...props.style,
      }}
      onFocus={e => e.target.style.borderColor = C.focusBorder}
      onBlur={e => e.target.style.borderColor = props.error ? C.rose : C.inputBorder}
    />
  );
}

function Select({ children, error, ...props }) {
  return (
    <select
      {...props}
      style={{
        width: '100%', boxSizing: 'border-box',
        padding: '11px 14px', borderRadius: 10,
        background: 'rgba(20,24,38,0.95)', border: `1px solid ${error ? C.rose : C.inputBorder}`,
        color: C.text, outline: 'none', fontSize: 14, cursor: 'pointer',
        ...props.style,
      }}
    >
      {children}
    </select>
  );
}

function StepBar({ paso }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 36 }}>
      {PASOS.map((p, i) => {
        const done = paso > p.id;
        const active = paso === p.id;
        return (
          <React.Fragment key={p.id}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 90 }}>
              <div style={{
                width: 46, height: 46, borderRadius: 14, fontSize: 17,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? C.greenDim : active ? `linear-gradient(135deg, ${C.amberDark}, ${C.orange})` : 'rgba(255,255,255,0.04)',
                border: done ? '1.5px solid rgba(74,222,128,.4)' : active ? `1.5px solid ${C.amber}` : `1.5px solid ${C.cardBorder}`,
                color: done ? C.green : active ? 'white' : C.textDim,
                boxShadow: active ? `0 0 20px rgba(245,158,11,.35)` : 'none',
                transition: 'all .4s',
              }}>
                {done ? <FaCheck /> : p.icon}
              </div>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: done ? C.green : active ? C.amberLight : C.textDim }}>
                {p.label}
              </span>
            </div>
            {i < PASOS.length - 1 && (
              <div style={{ position: 'relative', flex: 1, height: 2, maxWidth: 100, margin: '0 4px', marginBottom: 20 }}>
                <div style={{ position: 'absolute', inset: 0, background: C.cardBorder, borderRadius: 2 }} />
                <div style={{ position: 'absolute', inset: 0, width: done ? '100%' : '0%', background: `linear-gradient(90deg, ${C.amber}, ${C.green})`, borderRadius: 2, transition: 'width .5s ease' }} />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Password strength ────────────────────────────────────────────────────────
function calcStrength(pw) {
  const r = {
    minLen: (pw || '').length >= 6,
    hasLower: /[a-z]/.test(pw),
    hasUpper: /[A-Z]/.test(pw),
    hasDigit: /\d/.test(pw),
    hasSpecial: /[^A-Za-z0-9]/.test(pw),
  };
  return { rules: r, score: Object.values(r).filter(Boolean).length };
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function RegistrarPresidente() {
  const navigate = useNavigate();
  const [paso, setPaso] = useState(1);
  const [loading, setLoading] = useState(false);

  // ── PASO 1: Cuenta ──────────────────────────────────────────────────────────
  const [cuenta, setCuenta] = useState({
    nombre: '', primerApellido: '', segundoApellido: '',
    correo: '', telefono: '', curp: '', rfc: '',
    sexoId: '', fechaNacimiento: '',
    contrasena: '', confirmarContrasena: '',
  });
  const [cuentaErrors, setCuentaErrors] = useState({});
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const pwInfo = useMemo(() => calcStrength(cuenta.contrasena), [cuenta.contrasena]);

  const setCuentaField = (field, val) => setCuenta(prev => ({ ...prev, [field]: val }));

  const validarPaso1 = () => {
    const errs = {};
    if (!cuenta.nombre.trim()) errs.nombre = 'Obligatorio';
    if (!cuenta.primerApellido.trim()) errs.primerApellido = 'Obligatorio';
    if (!cuenta.correo.trim()) errs.correo = 'Obligatorio';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cuenta.correo)) errs.correo = 'Correo inválido';
    if (!cuenta.telefono.trim()) errs.telefono = 'Obligatorio';
    if (!/^\d{10}$/.test(cuenta.telefono)) errs.telefono = '10 dígitos requeridos';
    if (!cuenta.curp.trim()) errs.curp = 'Obligatorio';
    if (cuenta.curp.length !== 18) errs.curp = '18 caracteres';
    if (!cuenta.contrasena) errs.contrasena = 'Obligatorio';
    if (cuenta.contrasena.length < 6) errs.contrasena = 'Mínimo 6 caracteres';
    if (!cuenta.confirmarContrasena) errs.confirmarContrasena = 'Obligatorio';
    if (cuenta.contrasena !== cuenta.confirmarContrasena) errs.confirmarContrasena = 'Las contraseñas no coinciden';
    setCuentaErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── PASO 2: Cuotas ──────────────────────────────────────────────────────────
  const [numPersonas, setNumPersonas] = useState('');
  const [seguros, setSeguros] = useState([]);
  const [asignacion, setAsignacion] = useState({});
  const [voucher, setVoucher] = useState(null);
  const [cargandoSeguros, setCargandoSeguros] = useState(false);

  const segurosPresidente = useMemo(() =>
    seguros.filter(s => ['TIPO G', 'SIN SEGURO'].includes(s.nombre.toUpperCase().trim()))
    , [seguros]);

  const segurosJugadores = useMemo(() =>
    seguros.filter(s => !['TIPO G', 'SIN SEGURO'].includes(s.nombre.toUpperCase().trim()))
    , [seguros]);

  const totalAsignados = useMemo(() => {
    return segurosJugadores.reduce((acc, seg) => acc + Number(asignacion[seg.id] || 0), 0);
  }, [asignacion, segurosJugadores]);

  const totalPagar = useMemo(() => seguros.reduce((a, s) => a + Number(asignacion[s.id] || 0) * s.precio, 0), [seguros, asignacion]);
  const segurosRequeridos = Number(numPersonas || 0);

  // ── PASO 3: Documentos ──────────────────────────────────────────────────────
  const [correoDoc, setCorreoDoc] = useState('');
  const [telefonoDoc, setTelefonoDoc] = useState('');
  const [equipo, setEquipo] = useState('');
  const [tipoAfiliacion, setTipoAfiliacion] = useState('');
  const [asociacion] = useState('AFAEM');
  const [liga, setLiga] = useState('');
  const [ligasCatalogo, setLigasCatalogo] = useState([]);

  const [documents, setDocuments] = useState({});
  const [ocrResults, setOcrResults] = useState({});
  const [detailsOpen, setDetailsOpen] = useState({});
  const [mostrarManual, setMostrarManual] = useState(false);
  const [fotoError, setFotoError] = useState(null);
  const [fotoFallida, setFotoFallida] = useState(false);
  const [fotoArchivo, setFotoArchivo] = useState(null);
  const [previews, setPreviews] = useState({});
  const [previewDoc, setPreviewDoc] = useState({
    open: false,
    url: '',
    type: '',
    title: ''
  });
  // ── Carga inicial ───────────────────────────────────────────────────────────
  useEffect(() => {
    // Seguros
    (async () => {
      setCargandoSeguros(true);
      try {
        const res = await fetch(`${API_BASE}/ordenes-pago/seguros`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        const arr = Array.isArray(data) ? data : data.data || data.seguros || data.results || [];
        const mapped = arr.map((s, i) => ({
          id: String(s.id || s.SeguroId || i + 1),
          nombre: s.nombre || s.Nombre || s.name || 'Seguro',
          precio: Number(s.costo || s.Costo || s.precio || s.Precio || 0),
        }));
        setSeguros(mapped);
        const init = {};
        mapped.forEach(s => {
          if (s.nombre.toUpperCase().trim() === 'SIN SEGURO') {
            init[s.id] = 1;
          } else {
            init[s.id] = 0;
          }
        });
        setAsignacion(init);
      } catch { setSeguros([]); }
      finally { setCargandoSeguros(false); }
    })();

    // Ligas
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/equipo-temporal/catalogos-registro`);
        if (res.ok) {
          const data = await res.json();
          if (data.ligas) setLigasCatalogo(data.ligas);
        }
      } catch { }
    })();
  }, []);

  // Pre-rellenar correo/teléfono y datos de identidad manuales con los datos de cuenta si están vacíos
  useEffect(() => {
    if (paso === 3) {
      if (!correoDoc && cuenta.correo) setCorreoDoc(cuenta.correo);
      if (!telefonoDoc && cuenta.telefono) setTelefonoDoc(cuenta.telefono);

      setOcrResults(prev => {
        const next = { ...prev };
        if (!next.nombre) {
          const fullName = `${cuenta.primerApellido} ${cuenta.segundoApellido} ${cuenta.nombre}`.replace(/\s+/g, ' ').trim().toUpperCase();
          if (fullName) next.nombre = fullName;
        }
        if (!next.curp && cuenta.curp) {
          next.curp = cuenta.curp.toUpperCase();
        }
        if (!next.fecha_nac && cuenta.fechaNacimiento) {
          next.fecha_nac = toDDMMYYYY(cuenta.fechaNacimiento);
        }
        return next;
      });
    }
  }, [paso]);

  // Sincronizar tipo de afiliación con el seguro de presidente asignado
  useEffect(() => {
    if (seguros.length > 0 && segurosPresidente.length > 0) {
      const selectedPresSeguro = segurosPresidente.find(seg => Number(asignacion[seg.id] || 0) > 0);
      if (selectedPresSeguro) {
        setTipoAfiliacion(selectedPresSeguro.nombre.toUpperCase().trim());
      } else {
        setTipoAfiliacion('');
      }
    }
  }, [asignacion, seguros, segurosPresidente]);

  // ── OCR ────────────────────────────────────────────────────────────────────
  const mejorarActa = (rawText, data) => {
    if (!rawText) return data;
    const d = { ...data };
    if (!d.nombre || d.nombre === 'No detectado' || d.nombre.split(' ').length < 2) {
      const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
      let nombres = '', ap1 = '', ap2 = '';
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i].toUpperCase();
        if (l.includes('NOMBRE(S)') && i + 1 < lines.length) nombres = lines[i + 1];
        if (l.includes('PRIMER APELLIDO') && i + 1 < lines.length) ap1 = lines[i + 1];
        if (l.includes('SEGUNDO APELLIDO') && i + 1 < lines.length) ap2 = lines[i + 1];
      }
      if (nombres && ap1) d.nombre = `${ap1} ${ap2} ${nombres}`.replace(/\s+/g, ' ').toUpperCase();
    }
    if (!d.fecha_nac || d.fecha_nac === 'No detectada') {
      const MESES = { ENERO: '01', FEBRERO: '02', MARZO: '03', ABRIL: '04', MAYO: '05', JUNIO: '06', JULIO: '07', AGOSTO: '08', SEPTIEMBRE: '09', OCTUBRE: '10', NOVIEMBRE: '11', DICIEMBRE: '12' };
      const m = rawText.match(/(\d{1,2})\s*DE\s*([A-Z]+)\s*DE\s*(\d{4})/i);
      if (m && MESES[m[2].toUpperCase()]) d.fecha_nac = `${m[1].padStart(2, '0')}/${MESES[m[2].toUpperCase()]}/${m[3]}`;
    }
    return d;
  };

  const procesarOCR = async (docKey, file) => {
    Swal.fire({ title: 'Analizando documento…', html: 'Extrayendo información vía OCR. <b>Por favor espere.</b>', allowOutsideClick: false, allowEscapeKey: false, didOpen: () => Swal.showLoading() });
    try {
      const fd = new FormData(); fd.append('file_id', file);
      const res = await fetch('/ocr-api', { method: 'POST', body: fd });
      if (!res.ok) throw new Error();
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
        extracted = mejorarActa(rawText, extracted);
      }
      setOcrResults(prev => ({ ...prev, ...extracted, [docKey]: `OCR: ${extracted.nombre || 'ok'}` }));
      Swal.fire({ title: extracted.nombre ? '¡Lectura exitosa!' : 'Documento procesado', text: extracted.nombre ? `Detectado: ${extracted.nombre}` : 'No se extrajo el nombre, continúa manualmente.', icon: 'success', timer: 2200, showConfirmButton: false });
    } catch {
      Swal.fire({ title: 'Error OCR', text: 'No se pudo leer el documento automáticamente. Puedes continuar manualmente.', icon: 'warning' });
    }
  };

  const procesarFoto = async (archivo) => {
    Swal.fire({ title: 'Validando fotografía…', 
      html: 'Verificando calidad y rostros. <b>Por favor espere.</b>', 
      allowOutsideClick: false, allowEscapeKey: false, 
      didOpen: () => Swal.showLoading() });
    
      try {
      const data = await validarFotografia(archivo);
      if (data.valido) {

      // BASE64 -> URL PREVIEW
      const imagenProcesada = `data:${data.tipo_imagen};base64,${data.imagen}`;

      // BASE64 -> FILE
      const byteCharacters = atob(data.imagen);
      const byteNumbers = new Array(byteCharacters.length);

      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);

       const archivoValidado = new File(
        [byteArray],
        "foto_validada.jpg",
        { type: data.tipo_imagen }
      );

      // GUARDAR DOCUMENTO
      setDocuments(prev => ({
        ...prev,
        fotografia: archivoValidado
      }));

      // GUARDAR PREVIEW
      setPreviews(prev => ({
        ...prev,
        fotografia: imagenProcesada
      }));

      // LIMPIAR ERRORES
      setFotoFallida(false);
      setFotoError(null);
      setFotoArchivo(null);

      Swal.fire({
        title: '¡Fotografía aceptada!',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });

      } else {
        // GUARDAR FOTO FALLIDA
      setFotoError(data.mensaje);
      setFotoFallida(true);
      setFotoArchivo(archivo);

      Swal.fire({
        title: 'Error en fotografía',
        text: `${data.mensaje} ¿Deseas cargarla de todos modos?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, cargar igualmente',
        cancelButtonText: 'No, intentar de nuevo'
      }).then((result) => {

        if (result.isConfirmed) {

          // PREVIEW ORIGINAL
          const reader = new FileReader();

          reader.onloadend = () => {
            setPreviews(prev => ({
              ...prev,
              fotografia: reader.result
            }));
          };

          reader.readAsDataURL(archivo);

          // GUARDAR ORIGINAL
          setDocuments(prev => ({
            ...prev,
            fotografia: archivo
          }));

          setFotoFallida(false);
          setFotoError(null);
          setFotoArchivo(null);

          Swal.fire({
            title: 'Fotografía cargada',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
          });
        }
      });
    }

    } catch (err) {

      const msg = err.message || 'No se pudo procesar la fotografía.';

      setFotoError(msg);
      setFotoFallida(true);
      setFotoArchivo(archivo);

      Swal.fire({
        title: 'Error de validación',
        text: `${msg} ¿Deseas cargarla igualmente?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, cargar igualmente',
        cancelButtonText: 'No, intentar de nuevo'
      }).then((result) => {

        if (result.isConfirmed) {

          // PREVIEW ORIGINAL
          const reader = new FileReader();

          reader.onloadend = () => {
            setPreviews(prev => ({
              ...prev,
              fotografia: reader.result
            }));
          };

          reader.readAsDataURL(archivo);

          // GUARDAR ORIGINAL
          setDocuments(prev => ({
            ...prev,
            fotografia: archivo
          }));

          setFotoFallida(false);
          setFotoError(null);
          setFotoArchivo(null);

          Swal.fire({
            title: 'Fotografía cargada',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
          });
        }
      });
    }
  };

  const handleFileUpload = (docKey, file) => {
  if (!file) return;

  // Generar preview
  const preview =
    file.type === 'application/pdf'
      ? 'pdf'
      : URL.createObjectURL(file);

  setPreviews(prev => ({
    ...prev,
    [docKey]: preview
  }));

  if (docKey === 'fotografia') {
    procesarFoto(file);
  } else {
    setDocuments(prev => ({
      ...prev,
      [docKey]: file
    }));

    if (['actaNacimiento', 'identificacion'].includes(docKey)) {
      procesarOCR(docKey, file);
    }
  }
};

  const forzarFoto = () => {
    if (!fotoArchivo) return;
    setDocuments(prev => ({ ...prev, fotografia: fotoArchivo }));
    setFotoFallida(false); setFotoError(null);
    Swal.fire({ title: 'Fotografía cargada', text: 'Se omitió la validación automática.', icon: 'warning', confirmButtonColor: C.amberDark });
  };

  const handleOcrManual = (field, val) => {
    setOcrResults(prev => ({
      ...prev, [field]: val,
      actaNacimiento: prev.actaNacimiento || 'Manual',
      identificacion: prev.identificacion || 'Manual',
    }));
  };

  const toYYYYMMDD = s => { if (!s) return ''; const p = s.split('/'); return p.length !== 3 ? s : `${p[2]}-${p[1]}-${p[0]}`; };
  const toDDMMYYYY = s => { if (!s) return ''; const p = s.split('-'); return p.length !== 3 ? s : `${p[2]}/${p[1]}/${p[0]}`; };

  // ── PDF ────────────────────────────────────────────────────────────────────
  const safeField = (form, name, val) => {
    if (!val) return;
    try { form.getTextField(name)?.setText(String(val)); } catch { }
  };

  const descargarFormato = async () => {
    try {
      Swal.fire({ title: 'Generando PDF…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      const bytes = await fetch('/formato_afiliacion_directivo.pdf').then(r => r.arrayBuffer());
      const pdfDoc = await PDFDocument.load(bytes);
      const form = pdfDoc.getForm();
      const page = pdfDoc.getPages()[0];

      if (documents.fotografia) {
        try {
          const pb = await documents.fotografia.arrayBuffer();
          const img = documents.fotografia.name.toLowerCase().endsWith('.png') ? await pdfDoc.embedPng(pb) : await pdfDoc.embedJpg(pb);
          page.drawImage(img, { x: 479, y: 676, width: 76, height: 90 });
        } catch { }
      }

      const { nombre, curp, fecha_nac, nacionalidad } = ocrResults;
      if (nombre && nombre !== 'No detectado') {
        const parts = nombre.split(' ');
        if (parts.length >= 3) { safeField(form, 'Apellido Paterno', parts[0]); safeField(form, 'Apellido Materno', parts[1]); safeField(form, 'Nombres', parts.slice(2).join(' ')); }
        else if (parts.length === 2) { safeField(form, 'Apellido Paterno', parts[0]); safeField(form, 'Nombres', parts[1]); }
        else safeField(form, 'Nombres', nombre);
      }
      safeField(form, 'CURP o Clave Única de Registro de Población', curp);
      safeField(form, 'Fecha de Nacimiento', fecha_nac);
      safeField(form, 'Correo electrónico', correoDoc || cuenta.correo);
      safeField(form, 'Teléfono', ocrResults.telefono || telefonoDoc || cuenta.telefono);
      safeField(form, 'fill_20', tipoAfiliacion);
      safeField(form, 'Tipo', tipoAfiliacion);
      safeField(form, 'Asociación', asociacion);
      safeField(form, 'Liga', liga?.toUpperCase());
      safeField(form, 'Equipo', equipo?.toUpperCase());
      if (nacionalidad) safeField(form, 'Lugar de Nacimiento', nacionalidad);
      let sexoTexto = '';
      if (cuenta.sexoId === '1' || cuenta.sexoId === 1) sexoTexto = 'MASCULINO';
      else if (cuenta.sexoId === '2' || cuenta.sexoId === 2) sexoTexto = 'FEMENINO';
      else if (cuenta.sexoId === '3' || cuenta.sexoId === 3) sexoTexto = 'NO BINARIO';
      else if (curp?.length >= 11) {
        const sx = curp.charAt(10).toUpperCase();
        sexoTexto = sx === 'H' ? 'MASCULINO' : sx === 'M' ? 'FEMENINO' : '';
      }
      safeField(form, 'Sexo', sexoTexto);
      const hoy = new Date();
      const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
      safeField(form, 'A', String(hoy.getDate()).padStart(2, '0'));
      safeField(form, 'de', MESES[hoy.getMonth()]);
      safeField(form, 'del 20', String(hoy.getFullYear()).slice(-2));
      safeField(form, 'Cargo', 'PRESIDENTE');

      const blob = new Blob([await pdfDoc.save()], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `Formato_${(nombre || 'Presidente').replace(/[^a-zA-Z0-9 ]/g, '').trim()}.pdf`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      URL.revokeObjectURL(url);
      Swal.fire('¡Listo!', 'Formato descargado.', 'success');
    } catch (err) {
      Swal.fire('Error', 'No se pudo generar el PDF: ' + err.message, 'error');
    }
  };

  // ── Navegación ──────────────────────────────────────────────────────────────
  const avanzar = () => {
    if (paso === 1) {
      if (!validarPaso1()) { Swal.fire({ title: 'Completa los campos requeridos', icon: 'warning', confirmButtonColor: C.amberDark }); return; }
    }
    if (paso === 2) {
      if (Number(numPersonas) <= 0) { Swal.fire({ title: 'Atención', text: 'Ingresa el número de jugadores.', icon: 'warning', confirmButtonColor: C.amberDark }); return; }
      if (totalAsignados !== segurosRequeridos) {
        const msg = totalAsignados > segurosRequeridos
          ? `Has asignado más seguros de los permitidos (límite: ${segurosRequeridos}).`
          : `Faltan ${segurosRequeridos - totalAsignados} seguros por asignar.`;
        Swal.fire({ title: 'Atención', text: msg, icon: 'warning', confirmButtonColor: C.amberDark }); return;
      }
    }
    setPaso(p => p + 1);
  };

  // ── Envío final ─────────────────────────────────────────────────────────────
  const procesarRegistro = async () => {
    const correoFinal = correoDoc || cuenta.correo;
    if (!correoFinal) { Swal.fire('Atención', 'El correo es obligatorio.', 'warning'); return; }

    const missing = REQUISITOS.find(r => !documents[r.documento]);
    if (missing) { Swal.fire('Atención', `Falta subir: ${missing.nombre}`, 'warning'); return; }

    const nombreDetectado = ocrResults.nombre;
    const curpDetectada = ocrResults.curp;
    if (!nombreDetectado || nombreDetectado === 'No detectado') {
      Swal.fire('Atención', 'Nombre no detectado. Complétalo en el Formulario Manual.', 'warning'); return;
    }
    if (!curpDetectada || curpDetectada === 'No detectado') {
      Swal.fire('Atención', 'CURP no detectado. Complétalo en el Formulario Manual.', 'warning'); return;
    }

    try {
      setLoading(true);
      Swal.fire({ title: 'Registrando presidente…', text: 'Procesando con aprobación automática.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

      const fd = new FormData();
      // Datos de cuenta
      fd.append('nombre', cuenta.nombre);
      fd.append('primerApellido', cuenta.primerApellido);
      fd.append('segundoApellido', cuenta.segundoApellido || '');
      fd.append('correo', correoFinal);
      fd.append('telefono', ocrResults.telefono || telefonoDoc || cuenta.telefono || '');
      fd.append('curp', curpDetectada);
      fd.append('rfc', cuenta.rfc || '');
      fd.append('sexoId', cuenta.sexoId || '');
      fd.append('fechaNacimiento', cuenta.fechaNacimiento || '');
      fd.append('contrasena', cuenta.contrasena);
      // Datos de cuotas
      fd.append('numPersonas', String(numPersonas));
      const segFiltrados = {};
      Object.entries(asignacion).forEach(([k, v]) => {
        if (Number(v) > 0) {
          const segObj = seguros.find(s => String(s.id) === String(k));
          if (segObj && ['TIPO G', 'SIN SEGURO'].includes(segObj.nombre.toUpperCase().trim())) {
            return;
          }
          segFiltrados[k] = Number(v);
        }
      });
      fd.append('segurosAsignados', JSON.stringify(segFiltrados));
      // Archivos
      if (voucher) fd.append('voucher', voucher);
      if (documents.actaNacimiento) fd.append('actaNacimiento', documents.actaNacimiento);
      if (documents.identificacion) fd.append('identificacion', documents.identificacion);
      if (documents.fotografia) fd.append('fotografia', documents.fotografia);
      if (documents.formatoAfiliacion) fd.append('formatoAfiliacion', documents.formatoAfiliacion);

      await registrarPresidenteAdmin(fd);

      const nombrePresidente = cuenta.nombre || '';
      const telefonoRegistrado = ocrResults.telefono || telefonoDoc || cuenta.telefono || '';
      const telefonoLimpio = telefonoRegistrado.replace(/\D/g, '');

      const result = await Swal.fire({
        title: 'Cuenta creada correctamente, ¿Enviar mensaje al presidente?',
        text: '¿Desea enviar por WhatsApp el enlace de registro de jugadores al presidente recién creado?',
        icon: 'success',
        showCancelButton: true,
        confirmButtonText: 'Enviar WhatsApp',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: C.amberDark,
        cancelButtonColor: '#64748b',
      });

      if (result.isConfirmed) {
        const mensaje = `Hola ${nombrePresidente}. Este es un mensaje de prueba enviado desde el sistema. Próximamente aquí se enviará el enlace para registrar jugadores.`;
        const mensajeCodificado = encodeURIComponent(mensaje);
        const url = `https://wa.me/${telefonoLimpio}?text=${mensajeCodificado}`;
        window.open(url, '_blank');
      }

      navigate('/admin/presidentes');
    } catch (err) {
      Swal.fire('Error', err.response?.data?.detail || err.message || 'No se pudo completar el registro.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  const labelStyle = { fontSize: 11, fontWeight: 700, color: C.textMid, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 6 };
  const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 10, background: C.inputBg, border: `1px solid ${C.inputBorder}`, color: C.text, outline: 'none', fontSize: 14 };
  const selectStyle = { ...inputStyle, background: 'rgba(15,17,23,0.95)', cursor: 'pointer' };

  return (
    <div style={{ padding: '28px 36px', color: C.text, minHeight: '100vh', background: C.bg, fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      {/* ─── Header ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 32 }}>
        <button
          onClick={() => navigate('/admin/presidentes')}
          style={{ width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.cardBorder}`, color: C.textMid, cursor: 'pointer', fontSize: 15, transition: 'all .2s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.1)'; e.currentTarget.style.borderColor = C.amber; e.currentTarget.style.color = C.amber; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = C.cardBorder; e.currentTarget.style.color = C.textMid; }}
        >
          <FaArrowLeft />
        </button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 5, height: 22, background: `linear-gradient(180deg, ${C.amber}, ${C.orange})`, borderRadius: 4 }} />
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: '0.3px', color: 'black' }}>Registrar Nuevo Presidente</h1>
          </div>
          <p style={{ margin: '4px 0 0 15px', fontSize: 13, color: "black" }}>Flujo completo de alta sin validación previa — activación inmediata.</p>
        </div>
      </div>

      {/* ─── Contenedor principal ─── */}
      <div style={{ background: C.surface, borderRadius: 20, padding: '32px 36px', border: `1px solid ${C.cardBorder}`, boxShadow: '0 24px 60px rgba(0,0,0,.5)', position: 'relative', overflow: 'hidden' }}>
        {/* Decoración top */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${C.amberDark}, ${C.orange}, ${C.amber})` }} />

        {/* Step bar */}
        <StepBar paso={paso} />

        {/* ════════════════ PASO 1: CUENTA ════════════════ */}
        {paso === 1 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <h2 style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 900, color: 'white' }}>Datos de la Cuenta</h2>
              <p style={{ margin: 0, fontSize: 13, color: C.textDim }}>El administrador define las credenciales de acceso del nuevo presidente.</p>
            </div>

            {/* Aviso admin */}
            <div style={{ background: `rgba(245,158,11,0.07)`, border: `1px solid rgba(245,158,11,0.2)`, borderRadius: 14, padding: '14px 18px', marginBottom: 26, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 20 }}>🔐</span>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                Como <strong style={{ color: C.amberLight }}>Administrador</strong> defines la contraseña del nuevo presidente.
                La cuenta se activará <strong style={{ color: C.amberLight }}>al instante</strong> sin procesos de validación.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
              {/* Nombre */}
              <div>
                <label style={labelStyle}>Nombre(s) <span style={{ color: C.amber }}>*</span></label>
                <input style={{ ...inputStyle, borderColor: cuentaErrors.nombre ? C.rose : C.inputBorder }} type="text" placeholder="Ej: Juan Carlos" value={cuenta.nombre} onChange={e => setCuentaField('nombre', e.target.value)} />
                {cuentaErrors.nombre && <span style={{ fontSize: 11, color: C.rose, marginTop: 3, display: 'block' }}>{cuentaErrors.nombre}</span>}
              </div>
              {/* Primer apellido */}
              <div>
                <label style={labelStyle}>Primer Apellido <span style={{ color: C.amber }}>*</span></label>
                <input style={{ ...inputStyle, borderColor: cuentaErrors.primerApellido ? C.rose : C.inputBorder }} type="text" placeholder="Ej: García" value={cuenta.primerApellido} onChange={e => setCuentaField('primerApellido', e.target.value)} />
                {cuentaErrors.primerApellido && <span style={{ fontSize: 11, color: C.rose, marginTop: 3, display: 'block' }}>{cuentaErrors.primerApellido}</span>}
              </div>
              {/* Segundo apellido */}
              <div>
                <label style={labelStyle}>Segundo Apellido</label>
                <input style={inputStyle} type="text" placeholder="Ej: López" value={cuenta.segundoApellido} onChange={e => setCuentaField('segundoApellido', e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              {/* Correo */}
              <div>
                <label style={labelStyle}>Correo Electrónico <span style={{ color: C.amber }}>*</span></label>
                <input style={{ ...inputStyle, borderColor: cuentaErrors.correo ? C.rose : C.inputBorder }} type="email" placeholder="presidente@correo.com" value={cuenta.correo} onChange={e => setCuentaField('correo', e.target.value)} />
                {cuentaErrors.correo && <span style={{ fontSize: 11, color: C.rose, marginTop: 3, display: 'block' }}>{cuentaErrors.correo}</span>}
              </div>
              {/* Teléfono */}
              <div>
                <label style={labelStyle}>Teléfono (10 dígitos) <span style={{ color: C.amber }}>*</span></label>
                <input style={{ ...inputStyle, borderColor: cuentaErrors.telefono ? C.rose : C.inputBorder }} type="tel" placeholder="5512345678" maxLength={10} value={cuenta.telefono} onChange={e => setCuentaField('telefono', e.target.value.replace(/\D/g, ''))} />
                {cuentaErrors.telefono && <span style={{ fontSize: 11, color: C.rose, marginTop: 3, display: 'block' }}>{cuentaErrors.telefono}</span>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
              {/* CURP */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>CURP <span style={{ color: C.amber }}>*</span></label>
                <input style={{ ...inputStyle, borderColor: cuentaErrors.curp ? C.rose : C.inputBorder }} type="text" placeholder="18 caracteres" maxLength={18} value={cuenta.curp} onChange={e => setCuentaField('curp', e.target.value.toUpperCase())} />
                {cuentaErrors.curp && <span style={{ fontSize: 11, color: C.rose, marginTop: 3, display: 'block' }}>{cuentaErrors.curp}</span>}
              </div>
              {/* RFC */}
              <div>
                <label style={labelStyle}>RFC</label>
                <input style={inputStyle} type="text" placeholder="12-13 caracteres" maxLength={13} value={cuenta.rfc} onChange={e => setCuentaField('rfc', e.target.value.toUpperCase())} />
              </div>
              {/* Sexo */}
              <div>
                <label style={labelStyle}>Sexo</label>
                <select style={selectStyle} value={cuenta.sexoId} onChange={e => setCuentaField('sexoId', e.target.value)}>
                  <option value="">Selecciona…</option>
                  <option value="1">Masculino</option>
                  <option value="2">Femenino</option>
                  <option value="3">No binario</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
              {/* Fecha nacimiento */}
              <div>
                <label style={labelStyle}>Fecha de Nacimiento</label>
                <input style={{ ...inputStyle, colorScheme: 'dark' }} type="date" value={cuenta.fechaNacimiento} onChange={e => setCuentaField('fechaNacimiento', e.target.value)} />
              </div>
              {/* Contraseña */}
              <div>
                <label style={labelStyle}>Contraseña <span style={{ color: C.amber }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    style={{ ...inputStyle, paddingRight: 42, borderColor: cuentaErrors.contrasena ? C.rose : C.inputBorder }}
                    type={showPass ? 'text' : 'password'} placeholder="••••••••"
                    value={cuenta.contrasena} onChange={e => setCuentaField('contrasena', e.target.value)}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', fontSize: 15 }}>
                    {showPass ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {cuentaErrors.contrasena && <span style={{ fontSize: 11, color: C.rose, marginTop: 3, display: 'block' }}>{cuentaErrors.contrasena}</span>}
                {/* Barra de fuerza */}
                <div style={{ marginTop: 8, height: 4, borderRadius: 4, background: C.cardBorder, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 4, transition: 'width .3s, background .3s',
                    width: `${(pwInfo.score / 5) * 100}%`,
                    background: pwInfo.score <= 2 ? C.rose : pwInfo.score <= 3 ? C.amber : C.green,
                  }} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                  {[['6+', 'minLen'], ['a-z', 'hasLower'], ['A-Z', 'hasUpper'], ['0-9', 'hasDigit'], ['#@!', 'hasSpecial']].map(([l, k]) => (
                    <span key={k} style={{ fontSize: 10, color: pwInfo.rules[k] ? C.green : C.textDim }}>
                      {pwInfo.rules[k] ? '✓' : '○'} {l}
                    </span>
                  ))}
                </div>
              </div>
              {/* Confirmar */}
              <div>
                <label style={labelStyle}>Confirmar Contraseña <span style={{ color: C.amber }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    style={{ ...inputStyle, paddingRight: 42, borderColor: cuentaErrors.confirmarContrasena ? C.rose : C.inputBorder }}
                    type={showConfirm ? 'text' : 'password'} placeholder="••••••••"
                    value={cuenta.confirmarContrasena} onChange={e => setCuentaField('confirmarContrasena', e.target.value)}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', fontSize: 15 }}>
                    {showConfirm ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {cuentaErrors.confirmarContrasena && <span style={{ fontSize: 11, color: C.rose, marginTop: 3, display: 'block' }}>{cuentaErrors.confirmarContrasena}</span>}
                {cuenta.confirmarContrasena && cuenta.contrasena === cuenta.confirmarContrasena && (
                  <span style={{ fontSize: 11, color: C.green, marginTop: 4, display: 'block' }}>✓ Las contraseñas coinciden</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════ PASO 2: CUOTAS ════════════════ */}
        {paso === 2 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <h2 style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 900, color: 'white' }}>Cuotas y Seguros</h2>
              <p style={{ margin: 0, fontSize: 13, color: C.textDim }}>Configura la plantilla inicial del equipo y asigna sus seguros.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'start' }}>
              {/* Seguros */}
              <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 18, padding: '22px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 4, height: 18, background: `linear-gradient(180deg, ${C.amber}, ${C.orange})`, borderRadius: 4 }} />
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'white' }}>Plantilla y Seguros</h3>
                </div>

                {/* Número jugadores */}
                <div style={{ background: 'rgba(245,158,11,0.04)', border: `1px solid rgba(245,158,11,0.12)`, borderRadius: 14, padding: '16px 18px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 18 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.textMid, textTransform: 'uppercase', letterSpacing: '0.5px' }}>¿Cuántos jugadores inicialmente?</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10 }}>
                      <input
                        type="number" placeholder="0" min="0" value={numPersonas}
                        onChange={e => setNumPersonas(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                        style={{ width: 100, padding: '9px 14px', borderRadius: 10, background: C.inputBg, border: `1px solid ${C.inputBorder}`, color: 'white', textAlign: 'center', fontSize: 18, fontWeight: 700, outline: 'none' }}
                      />
                      <div style={{ fontSize: 13, color: C.textDim }}>
                        Slots requeridos: <strong style={{ color: C.amberLight }}>{segurosRequeridos} seguros</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grid de seguros */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                  {[['Seguros Jugadores', segurosJugadores], ['Seguros Presidente', segurosPresidente]].map(([titulo, lista]) => (
                    <div key={titulo}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: C.amber, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{titulo}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {cargandoSeguros ? (
                          <div style={{ fontSize: 12, color: C.textDim, padding: 10 }}>Cargando…</div>
                        ) : lista.length === 0 ? (
                          <div style={{ fontSize: 12, color: C.textDim, padding: 10 }}>Sin seguros en esta categoría</div>
                        ) : lista.map(seg => {
                          const isPres = titulo === 'Seguros Presidente';
                          const isChecked = Number(asignacion[seg.id] || 0) === 1;

                          const handleSelectPres = () => {
                            setAsignacion(prev => {
                              const next = { ...prev };
                              lista.forEach(item => {
                                next[item.id] = item.id === seg.id ? 1 : 0;
                              });
                              return next;
                            });
                          };

                          return (
                            <div
                              key={seg.id}
                              onClick={isPres ? handleSelectPres : undefined}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: isPres && isChecked ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.02)',
                                border: isPres && isChecked ? `1px solid ${C.amber}` : `1px solid ${C.cardBorder}`,
                                padding: '10px 12px',
                                borderRadius: 10,
                                cursor: isPres ? 'pointer' : 'default',
                                transition: 'all .2s',
                              }}
                              onMouseEnter={isPres ? e => {
                                if (!isChecked) {
                                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                                }
                              } : undefined}
                              onMouseLeave={isPres ? e => {
                                if (!isChecked) {
                                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                                  e.currentTarget.style.borderColor = C.cardBorder;
                                }
                              } : undefined}
                            >
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{seg.nombre}</div>
                                <div style={{ fontSize: 11, color: C.textDim }}>${seg.precio} c/u</div>
                              </div>
                              {isPres ? (
                                <input
                                  type="radio"
                                  name="seguroPresidenteRadio"
                                  style={{ width: 18, height: 18, cursor: 'pointer', accentColor: C.amber }}
                                  checked={isChecked}
                                  onChange={handleSelectPres}
                                />
                              ) : (
                                <input
                                  type="number" min="0"
                                  style={{ width: 58, padding: '6px 8px', borderRadius: 8, background: C.inputBg, border: `1px solid ${C.inputBorder}`, color: 'white', textAlign: 'center', outline: 'none', fontSize: 14 }}
                                  value={asignacion[seg.id] ?? ''}
                                  onChange={e => {
                                    const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0);
                                    setAsignacion(prev => ({ ...prev, [seg.id]: val }));
                                  }}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Resumen asignación */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: 10, border: `1px solid ${C.cardBorder}`, marginTop: 18 }}>
                  <span style={{ fontSize: 13, color: C.textMid }}>Seguros asignados: {totalAsignados}/{segurosRequeridos}</span>
                  <span style={{ fontWeight: 800, fontSize: 13, color: Number(numPersonas) > 0 && totalAsignados === segurosRequeridos ? C.green : C.rose }}>
                    {Number(numPersonas) > 0 && totalAsignados === segurosRequeridos ? '✓ Completo' : totalAsignados > segurosRequeridos ? '● Excedido' : '● Pendiente'}
                  </span>
                </div>
              </div>

              {/* Voucher + total */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 18, padding: '20px 18px' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: C.textMid, textTransform: 'uppercase', marginBottom: 14 }}>Comprobante de Pago <span style={{ opacity: 0.5 }}>(Opcional)</span></div>
                  <div
                    onClick={() => document.getElementById('voucher-inp').click()}
                    style={{ width: '100%', height: 110, border: `2px dashed ${voucher ? 'rgba(74,222,128,0.3)' : C.inputBorder}`, borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: voucher ? 'rgba(74,222,128,0.03)' : 'transparent', transition: 'all .2s' }}
                  >
                    <FaUpload style={{ fontSize: 22, color: voucher ? C.green : C.textDim, marginBottom: 8 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.textMid, textAlign: 'center' }}>{voucher ? voucher.name : 'Subir Voucher'}</span>
                    <span style={{ fontSize: 10, color: C.textDim, marginTop: 4 }}>PDF, JPG o PNG</span>
                  </div>
                  <input type="file" id="voucher-inp" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png" onChange={e => setVoucher(e.target.files[0])} />
                </div>
                <div style={{ background: `rgba(245,158,11,0.07)`, border: `1px solid rgba(245,158,11,0.18)`, borderRadius: 18, padding: '18px 20px', textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Monto Estimado</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: C.amber, marginTop: 6 }}>${totalPagar.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════ PASO 3: DOCUMENTOS ════════════════ */}
        {paso === 3 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <h2 style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 900, color: 'white' }}>Datos y Documentos</h2>
              <p style={{ margin: 0, fontSize: 13, color: C.textDim }}>Sube el Acta o INE para extracción automática. Completa manualmente si es necesario.</p>
            </div>

            {/* Datos del expediente */}
            <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 18, padding: '20px 22px', marginBottom: 22 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Correo <span style={{ color: C.amber }}>*</span></label>
                  <input style={inputStyle} type="email" value={correoDoc} onChange={e => setCorreoDoc(e.target.value)} placeholder="correo@example.com" />
                </div>
                <div>
                  <label style={labelStyle}>Teléfono</label>
                  <input style={inputStyle} type="tel" value={telefonoDoc} onChange={e => setTelefonoDoc(e.target.value)} placeholder="5512345678" maxLength={10} />
                </div>
                <div>
                  <label style={labelStyle}>Nombre del Equipo</label>
                  <input style={inputStyle} type="text" value={equipo} onChange={e => setEquipo(e.target.value)} placeholder="Ej: Rayados FC" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Cargo / Tipo de Afiliación</label>
                  <select
                    style={{ ...selectStyle, cursor: 'not-allowed', background: 'rgba(255,255,255,0.05)' }}
                    value={tipoAfiliacion}
                    disabled
                  >
                    <option value="">Selecciona…</option>
                    {CATALOGO_ROLES.map(r => <option key={r.valor} value={r.valor}>{r.etiqueta}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Asociación</label>
                  <input style={{ ...inputStyle, cursor: 'not-allowed', background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.2)', color: C.amberLight }} value={asociacion} disabled />
                </div>
                <div>
                  <label style={labelStyle}>Liga Destino</label>
                  <select style={selectStyle} value={liga} onChange={e => setLiga(e.target.value)}>
                    <option value="">Selecciona…</option>
                    {(ligasCatalogo.length > 0 ? ligasCatalogo.map(l => ({ valor: l.nombre, etiqueta: l.nombre })) : CATALOGO_LIGAS_DEFAULT).map(l => (
                      <option key={l.valor} value={l.valor}>{l.etiqueta}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Toggle formulario manual */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <button
                type="button"
                onClick={() => setMostrarManual(!mostrarManual)}
                style={{ padding: '9px 22px', borderRadius: 10, border: `1px solid rgba(245,158,11,${mostrarManual ? '0.5' : '0.2'})`, background: mostrarManual ? 'rgba(245,158,11,0.12)' : 'transparent', color: mostrarManual ? C.amberLight : C.textMid, fontWeight: 700, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, transition: 'all .2s' }}
              >
                ⌨️ {mostrarManual ? 'Ocultar Captura Manual de Identidad' : 'Capturar Datos de OCR Manualmente'}
              </button>
            </div>

            {/* Formulario manual */}
            {mostrarManual && (
              <div style={{ background: 'rgba(245,158,11,0.04)', border: `1px solid rgba(245,158,11,0.15)`, borderRadius: 18, padding: '22px 24px', marginBottom: 22, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, rgba(245,158,11,0.5), transparent)` }} />
                <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 800, color: C.amberLight, display: 'flex', alignItems: 'center', gap: 8 }}>
                  ✏️ Formulario Manual de Identidad
                </h4>
                <p style={{ fontSize: 12, color: C.textDim, margin: '0 0 18px', lineHeight: 1.5 }}>
                  Si el OCR no pudo extraer los datos, ingresalos aquí. Los campos marcados con <span style={{ color: C.amber }}>*</span> son necesarios para finalizar.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={labelStyle}>Nombre Completo <span style={{ color: C.amber }}>*</span></label>
                    <input style={inputStyle} type="text" placeholder="APELLIDOS NOMBRES (en mayúsculas)" value={ocrResults.nombre || ''} onChange={e => handleOcrManual('nombre', e.target.value.toUpperCase())} />
                  </div>
                  <div>
                    <label style={labelStyle}>CURP <span style={{ color: C.amber }}>*</span></label>
                    <input style={inputStyle} type="text" placeholder="18 caracteres" maxLength={18} value={ocrResults.curp || ''} onChange={e => handleOcrManual('curp', e.target.value.toUpperCase())} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Fecha de Nacimiento</label>
                    <input style={{ ...inputStyle, colorScheme: 'dark' }} type="date" value={toYYYYMMDD(ocrResults.fecha_nac) || ''} onChange={e => handleOcrManual('fecha_nac', toDDMMYYYY(e.target.value))} />
                  </div>
                  <div>
                    <label style={labelStyle}>Nacionalidad</label>
                    <input style={inputStyle} type="text" placeholder="Ej. MEXICANA" value={ocrResults.nacionalidad || ''} onChange={e => handleOcrManual('nacionalidad', e.target.value.toUpperCase())} />
                  </div>
                  <div>
                    <label style={labelStyle}>Sexo</label>
                    <select style={selectStyle} value={ocrResults.sexo || ''} onChange={e => handleOcrManual('sexo', e.target.value)}>
                      <option value="">Selecciona…</option>
                      <option value="MASCULINO">Masculino</option>
                      <option value="FEMENINO">Femenino</option>
                      <option value="NO BINARIO">No binario</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Tarjetas de documentos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18 }}>
              {REQUISITOS.map((doc) => {
                const uploaded = !!documents[doc.documento];
                const ocrDone = doc.ocr && ocrResults[doc.documento];
                const isPhoto = doc.documento === 'fotografia';
                let statusLabel = 'Pendiente', statusColor = '#f59e0b', statusBg = 'rgba(245,158,11,0.1)';
                if (ocrDone || uploaded) { statusLabel = ocrDone ? 'Procesado' : 'Listo'; statusColor = C.green; statusBg = 'rgba(74,222,128,0.1)'; }

                return (
                  <div key={doc.documento} 
                  style={{
                  position: 'relative',
                  background: C.card,
                  border: `1px solid ${uploaded ? 'rgba(74,222,128,0.2)' : C.cardBorder}`,
                  borderRadius: 16,
                  padding: '18px 20px',
                  paddingTop: '45px',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'border-color .2s'
                }}
                >
                    {/* Pill de estado */}
                    <div 
                    style={{
                      position: 'absolute',
                      top: 14,
                      right: 14,
                      padding: '3px 10px',
                      borderRadius: 20,
                      fontSize: 9,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.8px',
                      background: statusBg,
                      color: statusColor,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      zIndex: 2
                    }}

                    >
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor }} />
                      {statusLabel}
                    </div>

                    <div style={{ display: 'block', gap: 14, marginBottom: 14 }}>
                      <div className="preview-container"
                        style={{
                          height: '140px',
                          width: '100%',
                          background: '#111827',
                          borderRadius: 12,
                          marginBottom: 14,
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative'
                        }}

                         onMouseEnter={(e) => {
                          const overlay =
                            e.currentTarget.querySelector('.overlay-actions');

                          if (overlay) overlay.style.opacity = '1';
                        }}
                        onMouseLeave={(e) => {
                          const overlay =
                            e.currentTarget.querySelector('.overlay-actions');

                          if (overlay) overlay.style.opacity = '0';
                        }}
                        
                        onDragOver={(e) => {
                          e.preventDefault();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();

                          const file = e.dataTransfer.files[0];

                          if (file) {
                            handleFileUpload(doc.documento, file);
                          }
                        }}
                      >
                        {previews[doc.documento] ? (
                          <>
                          {previews[doc.documento] === 'pdf' ? (
                            <div style={{
                              color: '#ef4444',
                              fontSize: 42,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 5
                            }}>
                              <FaFilePdf />
                              <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '800' }}>PDF</span>
                            </div>
                            
                          ) : (
                            <img
                              src={previews[doc.documento]}
                              alt="preview"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain'
                              }}
                            />
                          )}
                          
                          {/* Overlay */}
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
                                const isPdf = documents[doc.documento]?.type === 'application/pdf';
                                setPreviewDoc({
                                  open: true,
                                  url: previews[doc.documento],
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
                                document.getElementById(`file-${doc.documento}`).click();
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
                          </>
                        ) : (
                          <div style={{
                            textAlign: 'center',
                            color: '#6b7280'
                          }}
                          onClick={() => document.getElementById(`file-${doc.documento}`).click()}>
                            <FaUpload style={{ fontSize: 28, marginBottom: 6 }} />
                            <p style={{ fontSize: 11 }}>Sin archivo</p>
                          </div>
                        )}
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <h4 style={{ margin: '0 0 4px', fontSize: 13.5, fontWeight: 800 }}>
                          {doc.nombre}
                        </h4>

                        <p style={{
                          margin: 0,
                          fontSize: 11,
                          color: C.textDim,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {uploaded
                            ? `📎 ${documents[doc.documento].name}`
                            : 'No seleccionado'}
                        </p>
                      </div>
                    </div>

                    {/* Error foto */}
                    {isPhoto && fotoError && (
                      <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 11.5, color: C.rose, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
                        <FaExclamationTriangle style={{ flexShrink: 0 }} /> {fotoError}
                      </div>
                    )}
                    {/* Bypass foto */}
                    {isPhoto && fotoFallida && fotoArchivo && (
                      <button onClick={forzarFoto} style={{ width: '100%', padding: '7px 12px', border: `1px solid rgba(245,158,11,0.4)`, background: 'rgba(245,158,11,0.08)', color: C.amber, borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>
                        ⚠️ Omitir validación y usar esta foto
                      </button>
                    )}

                    <div style={{ display: 'flex', gap: 8 }}>
                      {doc.hasDownload && (
                        <button onClick={descargarFormato} style={{ flex: 1, padding: '8px 10px', border: `1px solid ${C.inputBorder}`, background: 'rgba(255,255,255,0.03)', color: C.textMid, borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                          <FaFilePdf /> Descargar
                        </button>
                      )}

                      {/* <button
                        onClick={() => document.getElementById(`file-${doc.documento}`).click()}
                        style={{ flex: 1, padding: '8px 10px', border: `1px solid ${uploaded ? 'rgba(74,222,128,0.3)' : 'rgba(245,158,11,0.25)'}`, background: uploaded ? 'rgba(74,222,128,0.06)' : 'rgba(245,158,11,0.05)', color: uploaded ? C.green : C.amber, borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                      >
                        <FaUpload /> {uploaded ? 'Cambiar' : 'Subir'}
                      </button> */}
                      
                      <input type="file" id={`file-${doc.documento}`} style={{ display: 'none' }} onChange={e => handleFileUpload(doc.documento, e.target.files[0])} />
                    </div>

                    {/* Toggle detalles OCR */}
                    {(doc.ocr || isPhoto) && (
                      <div style={{ marginTop: 10 }}>
                        <button onClick={() => setDetailsOpen(prev => ({ ...prev, [doc.documento]: !prev[doc.documento] }))} style={{ background: 'none', border: 'none', color: C.textDim, fontSize: 10.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {detailsOpen[doc.documento] ? '▲ Ocultar detalles' : '▼ Ver detalles'}
                        </button>
                        {detailsOpen[doc.documento] && (
                          <div style={{ marginTop: 8, background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: '10px 12px' }}>
                            {doc.ocr && Object.keys(ocrResults).length > 0 ? (
                              [['Nombre', ocrResults.nombre], ['CURP', ocrResults.curp], ['Fecha Nac.', ocrResults.fecha_nac], ['Edad', ocrResults.edad], ['Nacionalidad', ocrResults.nacionalidad]].map(([label, val]) => (
                                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 4 }}>
                                  <span style={{ color: C.textDim, fontWeight: 700 }}>{label}:</span>
                                  <span style={{ color: 'white' }}>{val || '—'}</span>
                                </div>
                              ))
                            ) : (
                              <p style={{ fontSize: 11.5, color: C.textDim, margin: 0, textAlign: 'center' }}>
                                {isPhoto ? '📸 Validación automática de rostro.' : 'Sube el documento para ver los datos.'}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* MODAL DE PREVISUALIZACIÓN DE DOCUMENTOS (ZOOM) */}
            <Modal
            estaAbierto={previewDoc.open}
            titulo={previewDoc.title}
            alCerrar={() => setPreviewDoc({ ...previewDoc, open: false })}
            tamanio={previewDoc.type === 'pdf' ? 'grande' : 'medio'}
            pie={<BotonSecundario etiqueta="Cerrar" alHacerClick={() => setPreviewDoc({ ...previewDoc, open: false })} />}
            >
              <div style={{
                width: '100%',
                height: previewDoc.type === 'pdf' ? '100%' : 'auto',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#0f172a',
                borderRadius: '12px',
                overflow: 'hidden'
                }}>
                  {previewDoc.type === 'pdf' ? (
                    <iframe
                    src={previewDoc.url}
                    style={{ width: '1800px', height: '70vh', border: 'none' }} title="Visor de PDF"
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
          </div>
        )}


        {/* ─── Footer de navegación ─── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, paddingTop: 24, borderTop: `1px solid ${C.cardBorder}` }}>
          <button
            onClick={() => paso > 1 ? setPaso(p => p - 1) : navigate('/admin/presidentes')}
            style={{ padding: '10px 22px', borderRadius: 10, border: `1px solid ${C.inputBorder}`, background: 'rgba(255,255,255,0.03)', color: C.textMid, fontWeight: 700, cursor: 'pointer', fontSize: 14, transition: 'all .2s' }}
          >
            {paso > 1 ? '← Anterior' : 'Cancelar'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: C.textDim }}>Paso {paso} de {PASOS.length}</span>
            <button
              onClick={paso === 3 ? procesarRegistro : avanzar}
              disabled={loading}
              style={{ padding: '11px 28px', borderRadius: 10, background: loading ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg, ${C.amberDark}, ${C.orange})`, border: 'none', color: loading ? C.textDim : 'white', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 9, boxShadow: loading ? 'none' : `0 6px 20px rgba(217,119,6,.35)`, transition: 'all .2s' }}
            >
              {loading ? '⏳ Procesando…' : paso === 3 ? '✓ Finalizar Registro' : 'Continuar →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
