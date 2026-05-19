import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUpload, FaCheckCircle, FaTimesCircle, FaChevronRight, FaChevronLeft, FaMoneyBillWave, FaFileAlt, FaClock } from 'react-icons/fa';
import AfaemLogo from '../../assets/afaem-logo@4x.png';
import FmfLogo from '../../assets/fmf-logo.png';
import AmateurLogo from '../../assets/amateur-logo.png';
import { validarFotografia } from "../../services/foto";
import Swal from 'sweetalert2';
import { PDFDocument } from 'pdf-lib';
import { jsPDF } from 'jspdf';
import { API_BASE } from '../../config/config';
import { parseJwt } from '../../services/auth';
import { DEFAULT_BANK_INFO } from '../../utils/paymentPdf';

import { useRBAC } from '../../hooks/useRBAC';

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
  const [tieneEstadoBackend, setTieneEstadoBackend] = useState(false);

  // PASO 1: Pago y Seguros
  const [numPersonas, setNumPersonas] = useState('');
  const [catalogoSeguros, setCatalogoSeguros] = useState([]);
  const [catalogoAfiliaciones, setCatalogoAfiliaciones] = useState([]);
  const [cargandoSeguros, setCargandoSeguros] = useState(false);
  const [asignacionSeguros, setAsignacionSeguros] = useState({});
  const [detalleInscripciones, setDetalleInscripciones] = useState([]);
  const [totalOrdenPendiente, setTotalOrdenPendiente] = useState(0);
  const [comprobantePago, setComprobantePago] = useState(null);

  // PASO 2: Documentos
  const [documents, setDocuments] = useState({});
  const [ocrResults, setOcrResults] = useState({});
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


  // Verificar estado de pago al cargar
  useEffect(() => {

    const verificarEstadoPago = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Restaurar progreso guardado si existe
        const saved = localStorage.getItem('afaem_pre_registro_guardado');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.numPersonas) setNumPersonas(parsed.numPersonas);
            if (parsed.asignacionSeguros) setAsignacionSeguros(parsed.asignacionSeguros);
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
        // Inicializar todas las asignaciones a 0
        const initAsignacion = {};
        segurosMapeados.forEach(seg => {
          initAsignacion[seg.id] = 0;
        });
        setAsignacionSeguros(initAsignacion);
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
        navigate('/presidente-equipo');
      } else if (estatusId === 4) {
        // Documentos personales en revisión por el admin
        setEstadoPago(3); // Para que sepa que el pago ya fue validado
        setPasoActual(4); // Nuevo paso: Revisión de documentos
      } else if (estatusId === 3) {
        // Ya pagó, falta subir los documentos personales (INE, Acta, etc)
        setPasoActual(3);
      } else if (estatusId === 2) {
        // Pago APROBADO (Registry stage) pero aún no activado como Presidente ACTIVO (7)
        // Lo mandamos al paso 3 (Subir Documentos) para que no se quede trabado
        setEstadoPago(3); // 3 = Aprobado en la UI local
        setPasoActual(3);
      } else if (estatusId === 1) {
        // Pago pendiente
        setPasoActual(1);
      }
    }
  }, [estatusId, navigate, tieneEstadoBackend]);

  /* ─── Catálogos para Selectores ─── */
  const CATALOGO_ROLES = [
    { valor: 'TIPO F', etiqueta: 'TIPO F' },
    { valor: 'TIPO G', etiqueta: 'TIPO G' },
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

      if (estatusSolicitud === 2 || estatusSolicitud === 3) {
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

  const totalAsignados = Object.values(asignacionSeguros).reduce((acc, val) => acc + Number(val || 0), 0);
  const precioPresidente = catalogoAfiliaciones.find(a => a.TipoAfiliacionId === 2)?.CostoActual || 0;
  const precioJugador = catalogoAfiliaciones.find(a => a.TipoAfiliacionId === 4)?.CostoActual || 0;
  const costoAfiliaciones = precioPresidente + (Number(numPersonas || 0) * precioJugador);
  const totalPagar = costoAfiliaciones + catalogoSeguros.reduce((acc, seg) => acc + (Number(asignacionSeguros[seg.id] || 0)) * seg.precio, 0);
  const totalMostrado = ordenPendienteId ? totalOrdenPendiente : totalPagar;
  const nombreAfiliacion = (tipoAfiliacionId) => {
    const afiliacion = catalogoAfiliaciones.find(a => String(a.TipoAfiliacionId) === String(tipoAfiliacionId));
    return afiliacion?.NombreAfiliacion || 'Inscripción';
  };
  const segurosRequeridos = Number(numPersonas || 0);
  const jugadoresRestantes = segurosRequeridos - totalAsignados;

  const segurosJugadores = catalogoSeguros.filter((seg, idx) =>
    ['TIPO A', 'TIPO B', 'TIPO C', 'TIPO D', 'TIPO E'].includes(seg.nombre.toUpperCase().trim()) ||
    (catalogoSeguros.length === 7 && idx < 5)
  );
  const segurosPresidente = catalogoSeguros.filter((seg, idx) =>
    ['TIPO F', 'TIPO G'].includes(seg.nombre.toUpperCase().trim()) ||
    (catalogoSeguros.length === 7 && idx >= 5)
  );

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
      doc.text(`Nombre: ${user.Nombre || user.NombreUsuario || 'N/A'}`, margin, yPosition);
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
      yPosition += 8;
      doc.setFontSize(11);
      doc.setTextColor(220, 38, 38);
      doc.text(`Referencia obligatoria: ${bankInfo.referencia}`, margin, yPosition, { maxWidth: contentWidth });
      yPosition += 12;

      // Desglose de Cuota
      doc.setFontSize(12);
      doc.setTextColor(11, 78, 166);
      doc.text('DESGLOSE DE CUOTA', margin, yPosition);
      yPosition += 8;
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);

      // Afiliaciones
      const presidenteAf = catalogoAfiliaciones.find(a => a.TipoAfiliacionId === 2);
      const jugadorAf = catalogoAfiliaciones.find(a => a.TipoAfiliacionId === 4);

      if (presidenteAf) {
        const subtotal = presidenteAf.CostoActual;
        doc.text(`${presidenteAf.NombreAfiliacion} (x1)`, margin, yPosition);
        doc.text(`$${subtotal.toFixed(2)}`, pageWidth - margin - 30, yPosition);
        yPosition += 6;
      }

      if (jugadorAf && numPersonas > 0) {
        const subtotal = jugadorAf.CostoActual * numPersonas;
        doc.text(`${jugadorAf.NombreAfiliacion} (x${numPersonas})`, margin, yPosition);
        doc.text(`$${subtotal.toFixed(2)}`, pageWidth - margin - 30, yPosition);
        yPosition += 6;
      }

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
          CantidadJugadores: numPersonas,
          Seguros: segurosPayload
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
              CantidadJugadores: numPersonas,
              Seguros: segurosPayload,
              TipoSolicitud: 1
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
      html: 'Extrayendo información vía OCR. <b>Por favor espere.</b>',
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
      const response = await fetch('ocr-api', {
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

      setOcrResults(prev => ({
        ...prev,
        ...extractedData,
        [docKey]: `OCR Procesado: ${extractedData.nombre}`
      }));

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
      console.error("Error OCR:", err);
      Swal.fire({
        title: 'Error OCR',
        text: 'No se pudo leer el documento de forma automática. Podrás continuar.',
        icon: 'warning'
      });
    }
  };

  // ── HELPER: Escritura segura en campos del PDF ──────────────────────
  // pdf-lib lanza una excepción si el campo no existe (no retorna null),
  // por lo que el operador ?. solo es ineficiente. Este helper lo captura.
  const safeSetField = (form, fieldName, value) => {
    if (value === null || value === undefined || value === '') return;
    try {
      const field = form.getTextField(fieldName);
      if (field) field.setText(String(value));
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

      const { nombre, curp, fecha_nac, nacionalidad } = ocrResults;

      // Rellenar Nombre(s), Apellido Paterno, Apellido Materno
      if (nombre && nombre !== "No detectado") {
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
      const email = user.Correo || user.correo || user.email || localStorage.getItem('email') || '';
      safeSetField(form, 'Correo electrónico', email);

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
      safeSetField(form, 'Teléfono', ocrResults.telefono || '');

      // Tipo de afiliación
      safeSetField(form, 'fill_20', tipoAfiliacion);
      safeSetField(form, 'Tipo', tipoAfiliacion);

      // Asociación, Liga, Equipo
      if (asociacion) safeSetField(form, 'Asociación', asociacion.toUpperCase());
      if (liga) safeSetField(form, 'Liga', liga.toUpperCase());
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

  const handleManualOcrChange = (field, value) => {
    setOcrResults(prev => ({
      ...prev,
      [field]: value,
      actaNacimiento: prev.actaNacimiento || 'Manual',
      identificacion: prev.identificacion || 'Manual'
    }));
  };

  const handleLogout = () => {
    // Solo borramos las llaves de sesión (no borramos afaem_pre_registro_guardado)
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('UsuarioId');
    localStorage.removeItem('email');
    localStorage.removeItem('nombre_usuario');
    navigate('/');
  };

  const handleSolicitarRegistro = async () => {
    try {
      setLoading(true);
      setError(null);

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
        html: 'Enviando archivos al servidor. <b>Por favor espere.</b>',
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
        const resCompleta = await fetch(`${API_BASE}/solicitud/solicitud-completa?solicitud_id=${solicitudActualId}`, {
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
        .insurance-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-top: 15px;
        }
        .insurance-col {
          display: flex;
          flex-direction: column;
          gap: 15px;
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
        @media (max-width: 768px) {
          .insurance-grid {
            grid-template-columns: 1fr;
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
        .prereg-dark-page .assigned-bar { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); }
        .prereg-dark-page .input-label { color: rgba(255,255,255,0.6); }
        .prereg-dark-page .section-title-small { color: rgba(255,255,255,0.88); }
        .prereg-dark-page .input-number {
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          color: white;
          border-radius: 12px;
          padding: 12px 16px;
        }
        .prereg-dark-page .insurance-input {
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          color: white; border-radius: 10px;
          padding: 10px 14px; width: 80px; text-align: center;
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

        /* Insurance Cards */
        .insurance-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; padding: 20px;
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 15px; transition: all 0.3s ease;
        }
        .insurance-card:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(93,135,229,0.35);
          transform: translateX(4px);
          box-shadow: 0 4px 20px rgba(11,78,166,0.15);
        }
        .insurance-info h4 { font-size: 16px; font-weight: 800; color: var(--text-main); margin-bottom: 4px; }
        .insurance-info p { font-size: 13px; color: var(--text-muted); margin: 0; }

        /* GLASS DOC CARDS */
        .doc-glass-card {
          background: rgba(255,255,255,0.03);
          border: 1px dashed rgba(255,255,255,0.12);
          border-radius: 22px; padding: 26px 20px;
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
          width: 68px; height: 68px; border-radius: 20px;
          display: flex; align-items: center; justify-content: center;
          font-size: 30px; margin-bottom: 14px;
          transition: transform 0.3s ease;
        }
        .doc-glass-card:hover .doc-glass-icon { transform: scale(1.08); }
        .doc-status-pill {
          position: absolute; top: 14px; right: 14px;
          padding: 4px 10px; border-radius: 20px;
          font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;
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
      `}</style>

      {/* HEADER LOGOS */}
      <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
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

      <div className="card glass" style={{ width: '100%', maxWidth: '850px', padding: 0, overflow: 'hidden' }}>
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
            padding: '28px 40px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(10px)',
          }}>
            <p style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.35)', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 20px' }}>
              PROCESO DE ACTIVACIÓN
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* STEP 1 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '16px',
                  background: pasoActual === 1 ? 'linear-gradient(135deg, #0b4ea6, #1e40af)' : 'rgba(16,185,129,0.12)',
                  border: pasoActual === 1 ? '1px solid rgba(93,135,229,0.5)' : '1px solid rgba(16,185,129,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                  boxShadow: pasoActual === 1 ? '0 8px 20px rgba(11,78,166,0.4),inset 0 1px 0 rgba(255,255,255,0.15)' : 'none',
                  transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
                }}>
                  {pasoActual === 3 ? <span style={{ color: '#34d399', fontSize: '18px' }}>✓</span> : <FaMoneyBillWave style={{ color: 'white' }} />}
                </div>
                <span style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', color: pasoActual === 1 ? '#5d87e5' : 'rgba(52,211,153,0.8)' }}>
                  Paso 1: Cuotas
                </span>
              </div>

              {/* Connector */}
              <div style={{ position: 'relative', width: '130px', height: '2px', margin: '0 10px', marginBottom: '28px' }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '16px',
                  background: pasoActual === 3 ? 'linear-gradient(135deg, #0b4ea6, #1e40af)' : 'rgba(255,255,255,0.04)',
                  border: pasoActual === 3 ? '1px solid rgba(93,135,229,0.5)' : '1px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
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
          <div className="content-body" style={{ padding: '40px' }}>
            {estadoPago === 4 && (
              <div style={{
                marginBottom: '24px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.28)',
                borderRadius: '18px',
                padding: '18px 20px',
                color: 'var(--text-main)'
              }}>
                <h4 style={{ margin: '0 0 8px', color: 'var(--danger)', fontSize: '15px', fontWeight: '800' }}>
                  Tu orden fue rechazada
                </h4>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6' }}>
                  {mensajeRechazoPago || 'Vuelve a subir tu comprobante de pago para continuar con tu registro.'}
                </p>
              </div>
            )}
            <h3 className="section-title-small" style={{ textAlign: 'center', marginBottom: '30px' }}>Selecciona el tipo de seguro para tu plantilla inicial</h3>

            {ordenPendienteId ? (
              <div style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.07) 0%, rgba(5,150,105,0.04) 100%)',
                padding: '26px',
                borderRadius: '20px',
                border: '1px solid rgba(16,185,129,0.25)',
                marginBottom: '30px',
                textAlign: 'center',
                backdropFilter: 'blur(8px)',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(52,211,153,0.4), transparent)' }} />
                <div style={{
                  display: 'inline-flex', padding: '5px 16px',
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.3))',
                  color: '#34d399', borderRadius: '30px', fontSize: '10px', fontWeight: '800', marginBottom: '12px',
                  border: '1px solid rgba(16,185,129,0.3)', letterSpacing: '1.5px', textTransform: 'uppercase',
                  boxShadow: '0 4px 12px rgba(16,185,129,0.15)',
                }}>
                  ● ORDEN ACTIVA #{ordenPendienteId}
                </div>
                <h4 style={{ color: 'var(--text-main)', fontWeight: '800', margin: '0 0 8px 0', fontSize: '18px' }}>Validación en curso</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>
                  Ya tienes una orden activa en el sistema. Para continuar, adjunta tu comprobante de pago.
                </p>
              </div>
            ) : (
              <>
                <div className="input-group" style={{ flexDirection: 'column', gap: '10px' }}>
                  <label className="input-label" style={{ textAlign: 'center' }}>Ingresa la cantidad total de seguros que deseas pagar.</label>
                  <input
                    type="number"
                    className="input-number"
                    value={numPersonas}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0);
                      setNumPersonas(val);
                    }}
                    style={{ marginTop: '5px' }}
                  />
                </div>

                {numPersonas >= 0 && (
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px', marginTop: '20px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <div style={{ width: '3px', height: '14px', background: 'linear-gradient(180deg, #10b981, #059669)', borderRadius: '2px' }} />
                      <p style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.75)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Costos de Afiliación</p>
                    </div>
                    {catalogoAfiliaciones.filter(a => a.TipoAfiliacionId === 2).map(af => (
                      <div key={af.TipoAfiliacionId} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '12px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.6)' }}>{af.NombreAfiliacion}</span>
                        <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>${af.CostoActual}</span>
                      </div>
                    ))}
                    {catalogoAfiliaciones.filter(a => a.TipoAfiliacionId === 4).map(af => (
                      <div key={af.TipoAfiliacionId} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '12px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.6)' }}>{af.NombreAfiliacion}</span>
                        <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>${af.CostoActual}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '24px 0 16px' }}>
                  <div style={{ width: '4px', height: '18px', background: 'linear-gradient(180deg, #5d87e5, #0b4ea6)', borderRadius: '4px' }} />
                  <p style={{ fontSize: '12px', fontWeight: '800', color: 'rgba(255,255,255,0.85)', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Distribución de Seguros
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
                    <div className="insurance-col">
                      <div className="insurance-col-title">Seguros Jugadores.</div>
                      {segurosJugadores.map(seg => (
                        <div key={seg.id} className="insurance-card" style={{ margin: 0 }}>
                          <div className="insurance-info">
                            <h4>{seg.nombre} <span style={{ fontSize: '14px', color: '#5d87e5' }}>${seg.precio} c/u</span></h4>
                            <p>{seg.descripcion}</p>
                          </div>
                          <input
                            type="number"
                            className="insurance-input"
                            value={asignacionSeguros[seg.id] ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0);
                              setAsignacionSeguros({ ...asignacionSeguros, [seg.id]: val });
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="insurance-col">
                      <div className="insurance-col-title">Seguros Presidente.</div>
                      {segurosPresidente.map(seg => (
                        <div key={seg.id} className="insurance-card" style={{ margin: 0 }}>
                          <div className="insurance-info">
                            <h4>{seg.nombre} <span style={{ fontSize: '14px', color: '#5d87e5' }}>${seg.precio} c/u</span></h4>
                            <p>{seg.descripcion}</p>
                          </div>
                          <input
                            type="number"
                            className="insurance-input"
                            value={asignacionSeguros[seg.id] ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0);
                              setAsignacionSeguros({ ...asignacionSeguros, [seg.id]: val });
                            }}
                          />
                        </div>
                      ))}
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
              </>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px' }}>
              {/* Resumen de cuotas */}
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '20px', padding: '22px',
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg,transparent,rgba(93,135,229,0.4),transparent)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ width: '4px', height: '18px', background: 'linear-gradient(180deg,#5d87e5,#0b4ea6)', borderRadius: '4px' }} />
                  <h5 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: 'rgba(255,255,255,0.85)' }}>
                    {ordenPendienteId ? 'Detalles de la Orden' : 'Cuotas correspondientes'}
                  </h5>
                </div>
                {ordenPendienteId && detalleInscripciones.map(detalle => (
                  <div key={detalle.OrdenPagoDetalleId || `${detalle.TipoAfiliacionId}-${detalle.Cantidad}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '13px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.55)' }}>{nombreAfiliacion(detalle.TipoAfiliacionId || detalle.tipo_afiliacion_id)} (x{detalle.Cantidad || detalle.cantidad})</span>
                    <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '700' }}>${Number(detalle.Subtotal || detalle.subtotal || 0)}</span>
                  </div>
                ))}
                {catalogoSeguros.map(seg =>
                  asignacionSeguros[seg.id] > 0 && (
                    <div key={seg.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '13px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.55)' }}>{seg.nombre} (x{asignacionSeguros[seg.id]})</span>
                      <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '700' }}>${seg.precio * asignacionSeguros[seg.id]}</span>
                    </div>
                  )
                )}
                {!ordenPendienteId && numPersonas > 0 && (
                  <>
                    {catalogoAfiliaciones.filter(a => a.TipoAfiliacionId === 2).map(af => (
                      <div key={af.TipoAfiliacionId} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '13px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.55)' }}>{af.NombreAfiliacion} (x1)</span>
                        <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '700' }}>${af.CostoActual}</span>
                      </div>
                    ))}
                    {catalogoAfiliaciones.filter(a => a.TipoAfiliacionId === 4).map(af => (
                      <div key={af.TipoAfiliacionId} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '13px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.55)' }}>{af.NombreAfiliacion} (x{numPersonas})</span>
                        <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '700' }}>${af.CostoActual * numPersonas}</span>
                      </div>
                    ))}
                  </>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontSize: '15px', fontWeight: '800' }}>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>Total {ordenPendienteId ? 'a pagar' : 'estimado'}:</span>
                  <span style={{ color: '#5d87e5' }}>${totalMostrado}</span>
                </div>
              </div>

              {/* Datos bancarios */}
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '20px', padding: '22px',
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg,transparent,rgba(16,185,129,0.4),transparent)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '4px', height: '18px', background: 'linear-gradient(180deg,#10b981,#059669)', borderRadius: '4px' }} />
                    <h5 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: 'rgba(255,255,255,0.85)' }}>Depósito o transferencia</h5>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(`${bankInfo.banco} | ${bankInfo.cuenta} | ${bankInfo.clabe}`)}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', borderRadius: '8px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer' }}
                  >📋 Copiar</button>
                </div>
                {[['Banco', bankInfo.banco], ['Cuenta', bankInfo.cuenta], ['CLABE', bankInfo.clabe]].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '13px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>{label}</span>
                    <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '700', fontFamily: 'monospace' }}>{val}</span>
                  </div>
                ))}
                <div style={{ marginTop: '12px' }}>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px' }}>Referencia obligatoria</span>
                  <div style={{ marginTop: '6px', background: 'rgba(93,135,229,0.12)', border: '1px solid rgba(93,135,229,0.25)', borderRadius: '10px', padding: '8px 14px', fontFamily: 'monospace', fontWeight: '800', fontSize: '14px', color: '#5d87e5', letterSpacing: '1px' }}>
                    {bankInfo.referencia}
                  </div>
                </div>
              </div>
            </div>

            {ordenPendienteId && (
              <div style={{
                marginTop: '30px',
                background: 'rgba(11,78,166,0.06)',
                border: '1.5px dashed rgba(93,135,229,0.35)',
                borderRadius: '20px',
                padding: '28px',
                backdropFilter: 'blur(8px)',
              }}>
                <p style={{ fontSize: '14px', fontWeight: '800', color: '#5d87e5', marginBottom: '5px' }}>
                  Paso 2: Sube tu comprobante de pago
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '18px' }}>
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
              <button className="btn-nav-gray" onClick={irPasoAnterior}>Anterior</button>
              <button
                className="btn-nav-blue"
                onClick={irSiguientePaso}
                disabled={!ordenPendienteId ? (numPersonas <= 0 || totalAsignados !== segurosRequeridos) : !comprobantePago}
                title={!ordenPendienteId && (numPersonas <= 0 || totalAsignados !== segurosRequeridos) ? 'Asigna un seguro a todos los jugadores y al presidente para continuar' : ''}
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
                      "{(ordenPendienteId && localStorage.getItem(`motivo_rechazo_${ordenPendienteId}`)) || 'El comprobante de pago no fue aceptado. Por favor, revisa tus datos y sube un comprobante válido.'}"
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
            {(estadoSolicitud === 2 || estadoSolicitud === 3) && (
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
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
                    {ligasCatalogo.map(l => <option key={l.id} value={l.nombre}>{l.nombre}</option>)}
                  </select>
                </div>
                <div className="premium-input-group">
                  <label className="premium-label">Tipo de afiliación *</label>
                  <select
                    value={tipoAfiliacion}
                    onChange={(e) => setTipoAfiliacion(e.target.value)}
                    className="premium-input"
                    style={{ cursor: 'pointer' }}
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
                <span>⌨️</span> {mostrarFormularioManual ? 'Ocultar Captura Manual' : 'Capturar Datos de OCR Manualmente'}
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
                  Si el sistema automático de lectura (OCR) no pudo extraer los datos de tu Acta de Nacimiento o Identificación, puedes llenarlos en este formulario. Estos datos son obligatorios para pre-llenar tu formato de afiliación oficial.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '20px' }}>
                  <div className="premium-input-group">
                    <label className="premium-label">Nombre Completo *</label>
                    <input
                      type="text"
                      placeholder="APELLIDOS NOMBRES"
                      value={ocrResults.nombre || ''}
                      onChange={(e) => handleManualOcrChange('nombre', e.target.value.toUpperCase())}
                      className="premium-input"
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
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
                  <div className="premium-input-group">
                    <label className="premium-label">Fecha de Nacimiento *</label>
                    <input
                      type="date"
                      value={convertToYYYYMMDD(ocrResults.fecha_nac) || ''}
                      onChange={(e) => handleManualOcrChange('fecha_nac', convertToDDMMYYYY(e.target.value))}
                      className="premium-input"
                      style={{ colorScheme: 'dark', cursor: 'pointer' }}
                    />
                  </div>
                  {/*<div className="premium-input-group">
                    <label className="premium-label">Edad *</label>
                    <input
                      type="text"
                      placeholder="Ej. 34 años"
                      value={ocrResults.edad || ''}
                      onChange={(e) => handleManualOcrChange('edad', e.target.value)}
                      className="premium-input"
                    />
                  </div>*/}
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                  <div className="premium-input-group">
                    <label className="premium-label">Sexo *</label>
                    <select
                      value={ocrResults.sexo || ''}
                      onChange={(e) => handleManualOcrChange('sexo', e.target.value)}
                      className="premium-input"
                      style={{ cursor: 'pointer' }}
                    >
                      <option value="">Selecciona...</option>
                      <option value="MASCULINO">Masculino</option>
                      <option value="FEMENINO">Femenino</option>
                      <option value="NO BINARIO">No binario</option>
                    </select>
                  </div>
                  <div className="premium-input-group">
                    <label className="premium-label">Teléfono *</label>
                    <input
                      type="tel"
                      placeholder="10 dígitos"
                      maxLength={10}
                      value={ocrResults.telefono || ''}
                      onChange={(e) => handleManualOcrChange('telefono', e.target.value.replace(/\D/g, ''))}
                      className="premium-input"
                    />
                  </div>
                  <div className="premium-input-group">
                    <label className="premium-label">Equipo *</label>
                    <input
                      type="text"
                      placeholder="Nombre del Equipo"
                      value={ocrResults.equipo || ''}
                      onChange={(e) => handleManualOcrChange('equipo', e.target.value.toUpperCase())}
                      className="premium-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TARJETAS DE DOCUMENTOS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '35px' }}>
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
                        <button onClick={handleDownloadFormato} className="doc-download-btn">⬇ Descargar</button>
                      )}
                      <button
                        onClick={() => document.getElementById(`file-${doc.documento}`).click()}
                        className="doc-action-btn"
                        style={{
                          border: isUploaded ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.1)',
                          background: isUploaded ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)',
                          color: isUploaded ? '#34d399' : 'var(--text-muted)',
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
              <div style={{ fontSize: '80px', marginBottom: '30px' }}>⏳</div>
              <h2 style={{ color: 'var(--text-main)', fontSize: '28px', fontWeight: '800', marginBottom: '15px' }}>
                Tu solicitud será aprobada pronto
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '16px', maxWidth: '500px', margin: '0 auto 40px', lineHeight: '1.6' }}>
                Tus documentos ya fueron enviados correctamente. El administrador está revisando tu solicitud y su aprobación llegará pronto.
              </p>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '25px', display: 'inline-block', textAlign: 'left' }}>
                <p style={{ margin: '0 0 10px', fontSize: '14px', color: '#34d399', fontWeight: '700' }}>✓ Pago Validado</p>
                <p style={{ margin: '0 0 10px', fontSize: '14px', color: '#f59e0b', fontWeight: '700' }}>⏳ Solicitud: EN ESPERA</p>
                <p style={{ margin: '0', fontSize: '14px', color: 'rgba(255,255,255,0.3)', fontWeight: '700' }}>○ Acceso al Dashboard: PENDIENTE</p>
              </div>
              <div style={{ marginTop: '40px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Puedes cerrar sesión y volver más tarde para revisar tu estado.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PreRegistroPresidente;


