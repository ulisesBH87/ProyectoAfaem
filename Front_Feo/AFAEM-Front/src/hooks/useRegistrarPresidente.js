import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes/paths';
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
  correo: '', telefono: '', telefonoOpcional: '', curp: '',
  sexoId: '', fechaNacimiento: '', nacionalidad: '',
  contrasena: '', confirmarContrasena: '',
};

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = error => reject(error);
});

const base64ToFile = async (dataurl, filename) => {
  try {
    const res = await fetch(dataurl);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type });
  } catch (err) {
    throw err;
  }
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
  const [codigoPaisOpcionalCuenta, setCodigoPaisOpcionalCuenta] = useState('+52');
  const [cuentaErrors, setCuentaErrors] = useState({});
  const [isCheckingCurp, setIsCheckingCurp] = useState(false);
  const [isCurpDuplicated, setIsCurpDuplicated] = useState(false);

  const setCuentaField = (field, val) =>
    setCuenta(prev => {
      const next = {
        ...prev,
        [field]: (field === 'contrasena' || field === 'confirmarContrasena')
          ? val
          : (typeof val === 'string' ? val.toUpperCase() : val),
      };
      if (field === 'curp') {
        setIsCurpDuplicated(false);
        setCuentaErrors(errs => {
          if (errs.curp === 'Esta CURP ya se encuentra registrada.') {
            const { curp, ...rest } = errs;
            return rest;
          }
          return errs;
        });
      }
      return next;
    });

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
    if (isCurpDuplicated) errs.curp = 'Esta CURP ya se encuentra registrada.';
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
  const [equipo, setEquipo] = useState('');
  const [tipoAfiliacion, setTipoAfiliacion] = useState('');
  const [asociacion] = useState('AFAEM');
  const [liga, setLiga] = useState('');
  const [documents, setDocuments] = useState({});
  const [previews, setPreviews] = useState({});
  const [detailsOpen, setDetailsOpen] = useState({});
  const [previewDoc, setPreviewDoc] = useState({ open: false, url: '', type: '', title: '' });

  // ── Hooks de lógica ──────────────────────────────────────────────────────
  const ocrHook = useOCR();
  const { ocrResults, setOcrResults, procesarOCR, preFillFromCuenta } = ocrHook;

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
          if (d.codigoPaisOpcionalCuenta) setCodigoPaisOpcionalCuenta(d.codigoPaisOpcionalCuenta);
          if (d.numPersonas) setNumPersonas(d.numPersonas);
          if (d.asignacion) setAsignacion(d.asignacion);
          if (d.equipo) setEquipo(d.equipo);
          if (d.tipoAfiliacion) setTipoAfiliacion(d.tipoAfiliacion);
          if (d.liga) setLiga(d.liga);
          if (d.ocrResults) setOcrResults(prev => ({ ...prev, ...d.ocrResults }));

          if (d.documentosBorrador) {
            const restoredDocs = {};
            const restoredPreviews = {};
            for (const key of Object.keys(d.documentosBorrador)) {
              const docData = d.documentosBorrador[key];
              if (docData && docData.data && docData.name) {
                try {
                  const file = await base64ToFile(docData.data, docData.name);
                  restoredDocs[key] = file;
                  restoredPreviews[key] = file.type === 'application/pdf' ? 'pdf' : URL.createObjectURL(file);
                } catch (e) {
                  console.warn(`Error al restaurar el documento ${key} desde el borrador:`, e);
                }
              }
            }
            if (Object.keys(restoredDocs).length > 0) {
              setDocuments(prev => ({ ...prev, ...restoredDocs }));
              setPreviews(prev => ({ ...prev, ...restoredPreviews }));
            }
          }
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
      numPersonas ||
      Object.keys(documents).length > 0
    );
    if (!tieneDatos) return;

    const delayDebounceFn = setTimeout(() => {
      const save = async () => {
        let isChecking = false;
        try {
          if (cuenta.curp && cuenta.curp.length === 18) {
            setIsCheckingCurp(true);
            isChecking = true;
          }
          const docsB64 = {};
          for (const key of Object.keys(documents)) {
            if (documents[key]) {
              docsB64[key] = {
                name: documents[key].name,
                data: await fileToBase64(documents[key])
              };
            }
          }

          const payloadDatos = {
            paso,
            cuenta,
            codigoPaisCuenta,
            codigoPaisOpcionalCuenta,
            numPersonas,
            asignacion,
            equipo,
            tipoAfiliacion,
            liga,
            ocrResults,
            documentosBorrador: docsB64
          };
          const resData = await guardarBorradorPresidente(payloadDatos, borradorId);
          if (resData && resData.presidente_id && !borradorId) {
            setBorradorId(resData.presidente_id);
            const newUrl = `${window.location.pathname}?borradorId=${resData.presidente_id}`;
            window.history.pushState({ path: newUrl }, '', newUrl);
          }

          if (resData && resData.curp_duplicada) {
            setIsCurpDuplicated(true);
            setCuentaErrors(prev => ({ ...prev, curp: 'Esta CURP ya se encuentra registrada.' }));
          } else {
            setIsCurpDuplicated(false);
            setCuentaErrors(prev => {
              if (prev.curp === 'Esta CURP ya se encuentra registrada.') {
                const { curp, ...rest } = prev;
                return rest;
              }
              return prev;
            });
          }

          triggerToast();
        } catch (err) {
          console.warn('Error al guardar el borrador del presidente:', err);
        } finally {
          if (isChecking) {
            setIsCheckingCurp(false);
          }
        }
      };

      save();
    }, 1000); // 1 segundo de debounce

    return () => clearTimeout(delayDebounceFn);
  }, [
    paso, cuenta, codigoPaisCuenta, numPersonas, asignacion,
    equipo, tipoAfiliacion, liga, ocrResults,
    documents, borradorId, cargandoBorrador
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

  // ── Pre-rellenar al avanzar al Paso 2 (Cuenta) o después ────────────────
  useEffect(() => {
    if (paso >= 2) {
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
    ocrResults, cuenta, documents, codigoPaisCuenta, tipoAfiliacion, asociacion,
    liga, ligasCatalogo, equipo,
  });

  // ── Navegación entre pasos ───────────────────────────────────────────────
  const avanzar = () => {
    setPaso(p => p + 1);
  };

  // ── Envío final ──────────────────────────────────────────────────────────
  const procesarRegistro = async () => {
    if (!validarPaso1()) {
      Swal.fire('Atención', 'Revisa y completa los campos obligatorios de la Cuenta (Paso 2).', 'warning');
      setPaso(2);
      return;
    }
    if (Number(numPersonas) <= 0) {
      Swal.fire('Atención', 'Ingresa el número de jugadores en Cuotas (Paso 3).', 'warning');
      setPaso(3);
      return;
    }
    if (totalAsignados !== segurosRequeridos) {
      const msg = totalAsignados > segurosRequeridos
        ? `Has asignado más seguros de los permitidos (límite: ${segurosRequeridos}).`
        : `Faltan ${segurosRequeridos - totalAsignados} seguros por asignar en Cuotas (Paso 3).`;
      Swal.fire('Atención', msg, 'warning');
      setPaso(3);
      return;
    }

    const correoFinal = cuenta.correo;
    if (!correoFinal) { Swal.fire('Atención', 'El correo es obligatorio.', 'warning'); setPaso(2); return; }
    if (!equipo?.trim()) { Swal.fire('Atención', 'El Nombre del Equipo es obligatorio en Datos del Expediente.', 'warning'); setPaso(2); return; }
    if (!liga?.trim()) { Swal.fire('Atención', 'La Liga Destino es obligatoria en Datos del Expediente.', 'warning'); setPaso(2); return; }
    if (!documents.actaNacimiento || !documents.identificacion || !documents.fotografia) {
      Swal.fire('Atención', 'Faltan documentos personales.', 'warning');
      setPaso(1);
      return;
    }
    if (!documents.formatoAfiliacion) {
      Swal.fire('Atención', 'Falta el Formato de Afiliación.', 'warning');
      setPaso(4);
      return;
    }

    try {
      setLoading(true);
      Swal.fire({ title: 'Registrando presidente…', text: 'Procesando con aprobación automática.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

      const fd = new FormData();
      fd.append('nombre', cuenta.nombre);
      fd.append('primerApellido', cuenta.primerApellido);
      fd.append('segundoApellido', cuenta.segundoApellido || '');
      fd.append('correo', correoFinal);

      const telLocal = ocrResults.telefono || cuenta.telefono || '';
      const codPais = (ocrResults.telefono && ocrResults.telefono.startsWith('+')) ? '' : codigoPaisCuenta;
      fd.append('telefono', codPais + telLocal);
      if (cuenta.telefonoOpcional) {
        fd.append('telefonoOpcional', codigoPaisOpcionalCuenta + cuenta.telefonoOpcional);
      }
      fd.append('curp', ocrResults.curp || cuenta.curp || '');
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

      navigate(ROUTES.ADMIN.PRESIDENTES);
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
    codigoPaisOpcionalCuenta, setCodigoPaisOpcionalCuenta,
    // Paso 2
    numPersonas, setNumPersonas, voucher, setVoucher,
    seguros, segurosPresidente, segurosJugadores, asignacion, setAsignacion,
    cargandoSeguros, ligasCatalogo, totalAsignados, totalPagar, segurosRequeridos,
    // Paso 3
    equipo, setEquipo,
    tipoAfiliacion, asociacion, liga, setLiga,
    documents, previews, detailsOpen, setDetailsOpen,
    previewDoc, setPreviewDoc,
    // OCR
    ocrResults,
    isCheckingCurp,
    isCurpDuplicated,
    // Foto
    fotoError, fotoFallida, fotoArchivo, forzarFoto,
    // Handlers
    handleFileUpload, handleDescargarFormato,
  };
}
