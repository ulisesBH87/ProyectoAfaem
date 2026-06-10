import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { 
  registrarPresidenteAdmin, 
  enviarLinkRegistroPresidenteWhatsApp, 
  guardarBorradorPresidente, 
  obtenerBorradorPresidente 
} from '../services/admin';
import { useSeguros } from './useSeguros';
import { useOCR } from './useOCR';
import { useFotografia } from './useFotografia';
import { useGenerarPDF } from './useGenerarPDF';
import { REQUISITOS, C } from '../pages/Admin/RegistrarPresidente/constants';

const CUENTA_INICIAL = {
  nombre: '', primerApellido: '', segundoApellido: '',
  correo: '', telefono: '', curp: '',
  sexoId: '', fechaNacimiento: '',
  contrasena: '', confirmarContrasena: '',
};

/**
 * useRegistrarPresidente
 * Hook maestro que orquesta todo el estado y la lógica del wizard de registro.
 * El componente RegistrarPresidente solo necesita consumir este hook.
 */
export function useRegistrarPresidente() {
  const navigate = useNavigate();

  // ── Estado del borrador ──────────────────────────────────────────────────
  const [borradorId, setBorradorId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('borradorId') || null;
  });
  const [toastVisible, setToastVisible] = useState(false);
  const [cargandoBorrador, setCargandoBorrador] = useState(false);
  const toastTimeoutRef = useRef(null);
  const hasLoadedRef = useRef(false);

  // ── Estado del wizard ────────────────────────────────────────────────────
  const [paso, setPaso] = useState(1);
  const [loading, setLoading] = useState(false);

  // ── Paso 1: Cuenta ───────────────────────────────────────────────────────
  const [cuenta, setCuenta] = useState(CUENTA_INICIAL);
  const [codigoPaisCuenta, setCodigoPaisCuenta] = useState('+52');
  const [cuentaErrors, setCuentaErrors] = useState({});

  const setCuentaField = (field, val) =>
    setCuenta(prev => ({
      ...prev,
      [field]: (field === 'contrasena' || field === 'confirmarContrasena')
        ? val
        : (typeof val === 'string' ? val.toUpperCase() : val),
    }));

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

  // ── Paso 2: Cuotas ───────────────────────────────────────────────────────
  const [numPersonas, setNumPersonas] = useState('');
  const [voucher, setVoucher] = useState(null);
  const segurosHook = useSeguros();
  const { seguros, segurosPresidente, segurosJugadores, asignacion, setAsignacion, ligasCatalogo, totalAsignados, totalPagar, cargandoSeguros } = segurosHook;
  const segurosRequeridos = Number(numPersonas || 0);

  // ── Paso 3: Documentos ───────────────────────────────────────────────────
  const [correoDoc, setCorreoDoc] = useState('');
  const [telefonoDoc, setTelefonoDoc] = useState('');
  const [codigoPaisDoc, setCodigoPaisDoc] = useState('+52');
  const [equipo, setEquipo] = useState('');
  const [tipoAfiliacion, setTipoAfiliacion] = useState('');
  const [asociacion] = useState('AFAEM');
  const [liga, setLiga] = useState('');
  const [documents, setDocuments] = useState({});
  const [previews, setPreviews] = useState({});
  const [detailsOpen, setDetailsOpen] = useState({});
  const [mostrarManual, setMostrarManual] = useState(false);
  const [previewDoc, setPreviewDoc] = useState({ open: false, url: '', type: '', title: '' });

  // ── Hooks de lógica ──────────────────────────────────────────────────────
  const ocrHook = useOCR();
  const { ocrResults, setOcrResults, procesarOCR, handleOcrManual, preFillFromCuenta } = ocrHook;

  const fotoHook = useFotografia({ setDocuments, setPreviews });
  const { procesarFoto, forzarFoto, fotoError, fotoFallida, fotoArchivo } = fotoHook;

  const { descargarFormato } = useGenerarPDF();

  const triggerToast = () => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastVisible(true);
    toastTimeoutRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 2500);
  };

  // Cargar borrador al montar si borradorId está en la URL
  useEffect(() => {
    const fetchBorrador = async () => {
      if (!borradorId) {
        hasLoadedRef.current = true;
        return;
      }
      try {
        setCargandoBorrador(true);
        const data = await obtenerBorradorPresidente(borradorId);
        if (data && data.datos) {
          const d = data.datos;
          if (d.paso) setPaso(d.paso);
          if (d.cuenta) setCuenta(prev => ({ ...prev, ...d.cuenta }));
          if (d.codigoPaisCuenta) setCodigoPaisCuenta(d.codigoPaisCuenta);
          if (d.numPersonas) setNumPersonas(d.numPersonas);
          if (d.asignacion) setAsignacion(d.asignacion);
          if (d.correoDoc) setCorreoDoc(d.correoDoc);
          if (d.telefonoDoc) setTelefonoDoc(d.telefonoDoc);
          if (d.codigoPaisDoc) setCodigoPaisDoc(d.codigoPaisDoc);
          if (d.equipo) setEquipo(d.equipo);
          if (d.tipoAfiliacion) setTipoAfiliacion(d.tipoAfiliacion);
          if (d.liga) setLiga(d.liga);
          if (d.ocrResults) setOcrResults(prev => ({ ...prev, ...d.ocrResults }));
        }
      } catch (err) {
        console.error('Error al cargar borrador:', err);
        Swal.fire({
          title: 'Error',
          text: 'No se pudo cargar el borrador de presidente.',
          icon: 'error',
          confirmButtonColor: C.amberDark
        });
      } finally {
        setCargandoBorrador(false);
        // Esperamos un tick antes de activar el autoguardado para evitar sobreescritura
        setTimeout(() => {
          hasLoadedRef.current = true;
        }, 150);
      }
    };
    fetchBorrador();
  }, [borradorId]);

  // Guardar borrador automáticamente al cambiar los datos (con debounce)
  useEffect(() => {
    if (!hasLoadedRef.current || cargandoBorrador) return;

    const tieneDatos = !!(
      cuenta.nombre?.trim() ||
      cuenta.primerApellido?.trim() ||
      cuenta.segundoApellido?.trim() ||
      cuenta.correo?.trim() ||
      cuenta.telefono?.trim() ||
      cuenta.curp?.trim() ||
      cuenta.contrasena?.trim() ||
      equipo?.trim() ||
      numPersonas
    );
    if (!tieneDatos) return;

    const delayDebounceFn = setTimeout(() => {
      const payloadDatos = {
        paso,
        cuenta,
        codigoPaisCuenta,
        numPersonas,
        asignacion,
        correoDoc,
        telefonoDoc,
        codigoPaisDoc,
        equipo,
        tipoAfiliacion,
        liga,
        ocrResults,
      };

      const save = async () => {
        try {
          const resData = await guardarBorradorPresidente(payloadDatos, borradorId);
          if (resData && resData.presidente_id && !borradorId) {
            setBorradorId(resData.presidente_id);
            const newUrl = `${window.location.pathname}?borradorId=${resData.presidente_id}`;
            window.history.pushState({ path: newUrl }, '', newUrl);
          }
          triggerToast();
        } catch (err) {
          console.warn('Error al guardar el borrador del presidente:', err);
        }
      };

      save();
    }, 1000); // 1 segundo de debounce

    return () => clearTimeout(delayDebounceFn);
  }, [
    paso, cuenta, codigoPaisCuenta, numPersonas, asignacion,
    correoDoc, telefonoDoc, codigoPaisDoc, equipo, tipoAfiliacion, liga, ocrResults,
    borradorId, cargandoBorrador
  ]);

  // Cleanup del toast al desmontar
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // ── Sincronizar tipo de afiliación con seguro de presidente ─────────────
  useEffect(() => {
    if (seguros.length > 0 && segurosPresidente.length > 0) {
      const selected = segurosPresidente.find(seg => Number(asignacion[seg.id] || 0) > 0);
      setTipoAfiliacion(selected ? selected.nombre.toUpperCase().trim() : '');
    }
  }, [asignacion, seguros, segurosPresidente]);

  // ── Pre-rellenar al entrar al Paso 3 ────────────────────────────────────
  useEffect(() => {
    if (paso === 3) {
      if (!correoDoc && cuenta.correo) setCorreoDoc(cuenta.correo);
      if (!telefonoDoc && cuenta.telefono) {
        setTelefonoDoc(cuenta.telefono);
        setCodigoPaisDoc(codigoPaisCuenta);
      }
      preFillFromCuenta(cuenta);
    }
  }, [paso]);

  // ── Manejo de subida de archivos ─────────────────────────────────────────
  const handleFileUpload = (docKey, file) => {
    if (!file) return;
    const preview = file.type === 'application/pdf' ? 'pdf' : URL.createObjectURL(file);
    setPreviews(prev => ({ ...prev, [docKey]: preview }));

    if (docKey === 'fotografia') {
      procesarFoto(file);
    } else {
      setDocuments(prev => ({ ...prev, [docKey]: file }));
      if (['actaNacimiento', 'identificacion'].includes(docKey)) procesarOCR(docKey, file);
    }
  };

  // ── Wrapper descargarFormato con contexto actual ─────────────────────────
  const handleDescargarFormato = () => descargarFormato({
    ocrResults, cuenta, documents, correoDoc, telefonoDoc,
    codigoPaisDoc, codigoPaisCuenta, tipoAfiliacion, asociacion,
    liga, ligasCatalogo, equipo,
  });

  // ── Navegación entre pasos ───────────────────────────────────────────────
  const avanzar = () => {
    setPaso(p => p + 1);
  };

  // ── Envío final ──────────────────────────────────────────────────────────
  const procesarRegistro = async () => {
    if (!validarPaso1()) {
      Swal.fire('Atención', 'Revisa y completa los campos obligatorios del Paso 1 (Cuenta).', 'warning');
      setPaso(1);
      return;
    }
    if (Number(numPersonas) <= 0) {
      Swal.fire('Atención', 'Ingresa el número de jugadores en el Paso 2 (Cuotas).', 'warning');
      setPaso(2);
      return;
    }
    if (totalAsignados !== segurosRequeridos) {
      const msg = totalAsignados > segurosRequeridos
        ? `Has asignado más seguros de los permitidos (límite: ${segurosRequeridos}).`
        : `Faltan ${segurosRequeridos - totalAsignados} seguros por asignar en el Paso 2.`;
      Swal.fire('Atención', msg, 'warning');
      setPaso(2);
      return;
    }

    const correoFinal = correoDoc || cuenta.correo;
    if (!correoFinal) { Swal.fire('Atención', 'El correo es obligatorio.', 'warning'); return; }
    if (!equipo?.trim()) { Swal.fire('Atención', 'El Nombre del Equipo es obligatorio.', 'warning'); return; }
    if (!liga?.trim()) { Swal.fire('Atención', 'La Liga Destino es obligatoria.', 'warning'); return; }

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
      fd.append('nombre', cuenta.nombre);
      fd.append('primerApellido', cuenta.primerApellido);
      fd.append('segundoApellido', cuenta.segundoApellido || '');
      fd.append('correo', correoFinal);

      const telLocal = ocrResults.telefono || telefonoDoc || cuenta.telefono || '';
      const codPais = (ocrResults.telefono && ocrResults.telefono.startsWith('+')) ? '' : (telefonoDoc ? codigoPaisDoc : codigoPaisCuenta);
      fd.append('telefono', codPais + telLocal);
      fd.append('curp', curpDetectada);
      fd.append('sexoId', cuenta.sexoId || '');
      fd.append('fechaNacimiento', cuenta.fechaNacimiento || '');
      fd.append('contrasena', cuenta.contrasena);
      fd.append('numPersonas', String(numPersonas));
      if (borradorId) {
        fd.append('borradorId', String(borradorId));
      }

      // Filtrar seguros de presidente (solo se envían los de jugadores)
      const segFiltrados = {};
      Object.entries(asignacion).forEach(([k, v]) => {
        if (Number(v) > 0) {
          const segObj = seguros.find(s => String(s.id) === String(k));
          if (segObj && ['TIPO G', 'SIN SEGURO'].includes(segObj.nombre.toUpperCase().trim())) return;
          segFiltrados[k] = Number(v);
        }
      });
      fd.append('segurosAsignados', JSON.stringify(segFiltrados));

      if (voucher) fd.append('voucher', voucher);
      if (documents.actaNacimiento) fd.append('actaNacimiento', documents.actaNacimiento);
      if (documents.identificacion) fd.append('identificacion', documents.identificacion);
      if (documents.fotografia) fd.append('fotografia', documents.fotografia);
      if (documents.formatoAfiliacion) fd.append('formatoAfiliacion', documents.formatoAfiliacion);

      if (liga) {
        const ligaObj = ligasCatalogo.find(l => String(l.id) === String(liga));
        if (ligaObj) fd.append('ligaId', String(ligaObj.id));
        else fd.append('ligaNombre', liga);
      }
      if (equipo) fd.append('nombreEquipo', equipo.trim());
      if (tipoAfiliacion) fd.append('afiliacion', tipoAfiliacion);

      const response = await registrarPresidenteAdmin(fd);

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
        const usuarioId = response?.presidente?.usuario_id;
        if (!usuarioId) throw new Error('No se recibió el identificador del presidente para enviar el mensaje.');
        Swal.fire({ title: 'Enviando WhatsApp…', text: 'Enviando mensaje al presidente de equipo.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const envio = await enviarLinkRegistroPresidenteWhatsApp(usuarioId);
        await Swal.fire({ title: 'WhatsApp enviado', text: envio?.mensaje || 'El mensaje fue enviado correctamente al presidente.', icon: 'success', confirmButtonColor: C.amberDark });
      }

      navigate('/admin/presidentes');
    } catch (err) {
      const detail = err.response?.data?.detail;
      const errorMessage = typeof detail === 'string'
        ? detail
        : detail?.mensaje
          ? `${detail.mensaje} (HTTP ${detail.status_code || 'N/D'})`
          : (err.message || 'No se pudo completar el registro.');
      Swal.fire('Error', errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return {
    // Navegación
    paso, setPaso, avanzar, procesarRegistro, loading,
    // Borrador
    borradorId, toastVisible, cargandoBorrador,
    // Paso 1
    cuenta, setCuentaField, cuentaErrors, codigoPaisCuenta, setCodigoPaisCuenta,
    // Paso 2
    numPersonas, setNumPersonas, voucher, setVoucher,
    seguros, segurosPresidente, segurosJugadores, asignacion, setAsignacion,
    cargandoSeguros, ligasCatalogo, totalAsignados, totalPagar, segurosRequeridos,
    // Paso 3
    correoDoc, setCorreoDoc, telefonoDoc, setTelefonoDoc,
    codigoPaisDoc, setCodigoPaisDoc, equipo, setEquipo,
    tipoAfiliacion, asociacion, liga, setLiga,
    documents, previews, detailsOpen, setDetailsOpen,
    mostrarManual, setMostrarManual,
    previewDoc, setPreviewDoc,
    // OCR
    ocrResults, handleOcrManual,
    // Foto
    fotoError, fotoFallida, fotoArchivo, forzarFoto,
    // Handlers
    handleFileUpload, handleDescargarFormato,
  };
}
