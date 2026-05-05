import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaFutbol, FaTags, FaCalendar, FaUpload, FaFilePdf, FaCheckCircle, FaMoneyBillWave, FaClock, FaTimesCircle } from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../styles/dashboard.css';
import { API_BASE } from '../../config/config';
import { PDFDocument } from 'pdf-lib';
import Swal from 'sweetalert2';
import { validarFotografia } from "../../services/foto";
import teamsService from "../../services/teams";
import { Modal, BotonPrimario, BotonSecundario } from '../../components/partials';
import { useRBAC } from '../../hooks/useRBAC';

const ESTATUS_PAGO = {
  NO_ENVIADO: 1,
  EN_ESPERA: 2,
  APROBADO: 3,
  RECHAZADO: 4
};

const ESTADO_EQUIPO = {
  SIN_ORDEN: 'SIN_ORDEN',
  ORDEN_SIN_COMPROBANTE: 'ORDEN_SIN_COMPROBANTE',
  COMPROBANTE_EN_REVISION: 'COMPROBANTE_EN_REVISION',
  LISTO_PARA_CREAR_EQUIPO: 'LISTO_PARA_CREAR_EQUIPO'
};

export default function ConfigurarEquipo() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hasRole } = useRBAC();
  const isAdmin = hasRole && (hasRole('ADMINISTRADOR') || hasRole('ADMIN'));

  const preRegistro = JSON.parse(localStorage.getItem('afaem_pre_registro') || '{}');
  const [pagoEquipo, setPagoEquipo] = useState({
    loading: !isAdmin,
    aprobado: isAdmin,
    estadoEquipo: null,
    equipoTemporalId: preRegistro.equipo_temporal_id || null,
    estado: null,
    ordenId: null,
    total: 0,
    cantidadJugadores: 0,
    tieneComprobante: false
  });
  const [numJugadoresPago, setNumJugadoresPago] = useState(preRegistro.numPersonas || '');
  const [asignacionSeguros, setAsignacionSeguros] = useState(isAdmin
    ? { '1': 999, '2': 999, '3': 999 }
    : ((preRegistro.asignacionSeguros && Object.keys(preRegistro.asignacionSeguros).length > 0)
        ? preRegistro.asignacionSeguros
        : {}));
  const [comprobantePagoEquipo, setComprobantePagoEquipo] = useState(null);
  const [pagoError, setPagoError] = useState(null);
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [catalogoAfiliacionesPago, setCatalogoAfiliacionesPago] = useState([]);

  const [formData, setFormData] = useState({
    modality: '',
    category: '',
    season: '',
    rama: '',
    agreedToTerms: false
  });

  const [formErrors, setFormErrors] = useState({});

  const [activeStep, setActiveStep] = useState(isAdmin ? 0 : 1); // 0: Select President (Admin), 1: Config, 2: Players
  const [activePresidents, setActivePresidents] = useState([]);
  const [selectedPresidentId, setSelectedPresidentId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [players, setPlayers] = useState([]);
  const [equipoTemporalInfo, setEquipoTemporalInfo] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState({
    id: Date.now(),
    firstName: '',
    lastNamePaterno: '',
    lastNameMaterno: '',
    curp: '',
    nui: '',
    birthDate: '',
    lugarNacimiento: '',
    email: '',
    telefono: '',
    sexo_id: 1, // 1: Masculino, 2: Femenino (según tu catálogo)
    insuranceType: '',
    // Foráneo
    esForaneo: false,
    nacionalidadJugador: 'MEXICANA',
    paisResidencia: 'MÉXICO',
    haVividoExtranjero: false,
    dondeVividoExtranjero: '',
    nacionalidadPadre: '',
    nacionalidadMadre: '',
    registroAsociacionExtranjera: '',
    nacAbueloPaterno: '',
    nacAbuelaPaterna: '',
    nacAbueloMaterno: '',
    nacAbuelaMaterna: '',
    juegoClubExtranjero: '',
    shirtNumber: '',
    positionId: '',
    documents: {}
  });

  const [modalData, setModalData] = useState({
    teamName: '',
    teamLogo: null
  });

  const [errors, setErrors] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [signedForm, setSignedForm] = useState(null);
  const [pendingPlayer, setPendingPlayer] = useState(null);
  const [editingPlayerId, setEditingPlayerId] = useState(null);

  // Estados para Agregar Jugador a Equipo Existente
  const [modoAgregarJugador, setModoAgregarJugador] = useState(false);
  const [equipoTemporalIdAgregar, setEquipoTemporalIdAgregar] = useState(null);
  const [pagoJugador, setPagoJugador] = useState({
    loading: false,
    aprobado: false,
    estado: null,
    ordenId: null,
    total: 0,
    tieneComprobante: false
  });
  const [numJugadoresAgregar, setNumJugadoresAgregar] = useState('1');
  const [asignacionSegurosAgregar, setAsignacionSegurosAgregar] = useState({});
  const [comprobantePagoJugador, setComprobantePagoJugador] = useState(null);
  const [pagoErrorJugador, setPagoErrorJugador] = useState(null);
  const [procesandoPagoJugador, setProcesandoPagoJugador] = useState(false);

  // Lógica de Borradores
  const saveDraft = () => {
    const draftData = {
      formData,
      activeStep,
      players,
      modalData,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('afaem_draft_equipo', JSON.stringify(draftData));
    Swal.fire({
      title: 'Borrador guardado',
      text: 'Tu progreso se ha guardado localmente en este navegador.',
      icon: 'success',
      timer: 2000,
      showConfirmButton: false
    });
  };

  const clearDraft = () => {
    localStorage.removeItem('afaem_draft_equipo');
  };

  // Cargar borrador al montar
  useEffect(() => {
    const draft = localStorage.getItem('afaem_draft_equipo');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        Swal.fire({
          title: '¿Recuperar borrador?',
          text: `Se encontró un borrador guardado el ${new Date(parsed.timestamp).toLocaleString()}. ¿Deseas continuar donde te quedaste?`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Sí, recuperar',
          cancelButtonText: 'No, empezar de nuevo',
          confirmButtonColor: '#0b4ea6'
        }).then((result) => {
          if (result.isConfirmed) {
            if (parsed.formData) setFormData(parsed.formData);
            if (parsed.activeStep) setActiveStep(parsed.activeStep);
            if (parsed.players) setPlayers(parsed.players);
            if (parsed.modalData) setModalData(parsed.modalData);
            Swal.fire('¡Recuperado!', 'Tu progreso ha sido restaurado.', 'success');
          } else {
            clearDraft();
          }
        });
      } catch (e) {
        console.error("Error al cargar borrador:", e);
      }
    }
  }, []);
  const [catalogs, setCatalogs] = useState({
    ligas: [],
    categorias: [],
    modalidades: [],
    ramas: [],
    seguros: [],
    roles_equipo: [],
    combinaciones: []
  });

  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const numPersonasPagadas = isAdmin ? 999 : Number(pagoEquipo.cantidadJugadores || numJugadoresPago || 0);

  // Cargar catálogos al montar
  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        setLoadingCatalogs(true);
        const data = await teamsService.getCatalogs();
        setCatalogs(data);

        if (!isAdmin) {
          const resAfiliaciones = await fetch(`${API_BASE}/ordenes-pago/afiliaciones`);
          if (resAfiliaciones.ok) {
            const afiliaciones = await resAfiliaciones.json();
            setCatalogoAfiliacionesPago(Array.isArray(afiliaciones) ? afiliaciones : []);
          }
        }

        if (isAdmin) {
          const presidents = await teamsService.getPresidentesActivos();
          setActivePresidents(presidents);
        }

      } catch (error) {
        console.error("Error al cargar catálogos:", error);
        Swal.fire('Error', 'No se pudieron cargar los catálogos del servidor.', 'error');
      } finally {
        setLoadingCatalogs(false);
      }
    };
    loadCatalogs();
  }, []);
  //VERIFICA EL ESTADO DE PAGO PARA DECIDIR QUÉ VISTA MOSTRAR
  useEffect(() => {
    const cargarDetalleOrdenPagoEquipo = async (ordenId, token) => {
      if (!ordenId) return;

      try {
        const resOrden = await fetch(`${API_BASE}/ordenes-pago/${ordenId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined
        });

        if (!resOrden.ok) return;

        const orden = await resOrden.json();
        const detalles = Array.isArray(orden.OrdenPagoDetalleRelacion) ? orden.OrdenPagoDetalleRelacion : [];
        const estatusOrden = Number(orden.EstatusPagoId || orden.estatus || 0);
        if (estatusOrden) {
          setPagoEquipo(prev => ({ ...prev, estado: estatusOrden }));
        }

        let cantidadJugadores = null;
        const seguros = {};

        detalles.forEach(detalle => {
          if (Number(detalle.TipoAfiliacionId) === 4) {
            cantidadJugadores = Number(detalle.Cantidad || 0);
          }
          if (detalle.SeguroId) {
            const id = String(detalle.SeguroId);
            seguros[id] = Number(detalle.Cantidad || 0);
          }
        });

        if (cantidadJugadores !== null && !Number.isNaN(cantidadJugadores)) {
          setNumJugadoresPago(cantidadJugadores);
          setPagoEquipo(prev => ({ ...prev, cantidadJugadores }));
        }

        if (Object.keys(seguros).length > 0) {
          setAsignacionSeguros(prev => ({ ...prev, ...seguros }));
        }

        const totalOrden = Number(orden.TotalPagar || orden.total || 0);
        if (!Number.isNaN(totalOrden) && totalOrden > 0) {
          setPagoEquipo(prev => ({ ...prev, total: totalOrden }));
        }
      } catch (error) {
        console.warn('No se pudo cargar el detalle de la orden de pago:', error);
      }
    };

    const cargarEstadoPagoEquipo = async () => {
      if (isAdmin) return;

      try {
        setPagoEquipo(prev => ({ ...prev, loading: true }));
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/ordenes-pago/mi-estado-equipo`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('No se pudo consultar el estado del pago');

        const data = await res.json();

        const estadoEquipo = data.estado;
        const ordenId = data.orden_pago_id || data.OrdenPagoId || null;
        const total = Number(data.total || 0);

        if (estadoEquipo === ESTADO_EQUIPO.SIN_ORDEN || !estadoEquipo) {
          try {
            const nextPreRegistro = { ...(preRegistro || {}) };
            delete nextPreRegistro.equipo_temporal_id;
            localStorage.setItem('afaem_pre_registro', JSON.stringify(nextPreRegistro));
          } catch {}

          setPagoEquipo({
            loading: false,
            aprobado: false,
            estadoEquipo: ESTADO_EQUIPO.SIN_ORDEN,
            equipoTemporalId: null,
            estado: null,
            ordenId: null,
            total: 0,
            cantidadJugadores: 0,
            tieneComprobante: false
          });
          return;
        }

        if (estadoEquipo === ESTADO_EQUIPO.LISTO_PARA_CREAR_EQUIPO) {
          const equipoTemporalId = data.equipo_temporal_id || data.equipoTemporalId || null;
          if (equipoTemporalId) {
            try {
              const nextPreRegistro = { ...(preRegistro || {}), equipo_temporal_id: equipoTemporalId };
              localStorage.setItem('afaem_pre_registro', JSON.stringify(nextPreRegistro));
            } catch {}
          }

          const seguros = {};
          (data.seguros || []).forEach(seguro => {
            const id = String(seguro.SeguroId || seguro.seguro_id);
            seguros[id] = Number(seguro.Cantidad || seguro.cantidad || 0);
          });

          console.log('ConfigurarEquipo - equipoTemporalId:', equipoTemporalId, 'data.seguros:', data.seguros, 'parsed seguros:', seguros);

          if (Object.keys(seguros).length > 0) {
            setAsignacionSeguros(seguros);
          }

          if (data.cantidad_jugadores) {
            setNumJugadoresPago(data.cantidad_jugadores);
          }

          setPagoEquipo({
            loading: false,
            aprobado: true,
            estadoEquipo: ESTADO_EQUIPO.LISTO_PARA_CREAR_EQUIPO,
            equipoTemporalId,
            estado: ESTATUS_PAGO.APROBADO,
            ordenId,
            total: Number(data.total || 0),
            cantidadJugadores: Number(data.cantidad_jugadores || 0),
            tieneComprobante: true
          });
          return;
        }

        if (estadoEquipo === ESTADO_EQUIPO.ORDEN_SIN_COMPROBANTE) {
          setPagoEquipo(prev => ({
            ...prev,
            loading: false,
            aprobado: false,
            estadoEquipo: ESTADO_EQUIPO.ORDEN_SIN_COMPROBANTE,
            equipoTemporalId: prev.equipoTemporalId || null,
            estado: ESTATUS_PAGO.NO_ENVIADO,
            ordenId,
            total,
            tieneComprobante: false
          }));
          if (ordenId) await cargarDetalleOrdenPagoEquipo(ordenId, token);
          return;
        }

        if (estadoEquipo === ESTADO_EQUIPO.COMPROBANTE_EN_REVISION) {
          setPagoEquipo(prev => ({
            ...prev,
            loading: false,
            aprobado: false,
            estadoEquipo: ESTADO_EQUIPO.COMPROBANTE_EN_REVISION,
            equipoTemporalId: prev.equipoTemporalId || null,
            estado: ESTATUS_PAGO.EN_ESPERA,
            ordenId,
            total,
            tieneComprobante: true
          }));
          if (ordenId) await cargarDetalleOrdenPagoEquipo(ordenId, token);
          return;
        }

        setPagoEquipo({
          loading: false,
          aprobado: false,
          estadoEquipo: ESTADO_EQUIPO.SIN_ORDEN,
          equipoTemporalId: null,
          estado: null,
          ordenId: null,
          total: 0,
          cantidadJugadores: 0,
          tieneComprobante: false
        });
      } catch (error) {
        console.error('Error al cargar pago de equipo:', error);
        setPagoEquipo(prev => ({ ...prev, loading: false }));
        setPagoError(error.message);
      }
    };

    cargarEstadoPagoEquipo();
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin || pagoEquipo.ordenId || !numJugadoresPago || catalogs.seguros.length === 0) return;

    const totalNecesario = Number(numJugadoresPago) + 1;
    const nuevaAsignacion = {};
    catalogs.seguros.forEach((seguro, index) => {
      nuevaAsignacion[String(seguro.id)] = index === 0 ? totalNecesario : 0;
    });
    setAsignacionSeguros(nuevaAsignacion);
  }, [catalogs.seguros, isAdmin, numJugadoresPago, pagoEquipo.ordenId]);

  // Detectar parámetros de ruta para modo agregar jugador
  useEffect(() => {
    const equipoId = searchParams.get('equipoId');
    const equipoTemporalId = searchParams.get('equipoTemporalId');
    const agregarJugador = searchParams.get('agregarJugador');
    const requirePago = searchParams.get('requirePago') === 'true';

    if (agregarJugador === 'true') {
      if (equipoTemporalId) {
        setEquipoTemporalIdAgregar(parseInt(equipoTemporalId, 10));
        setModoAgregarJugador(false);
        setActiveStep(2);
        return;
      }

      if (equipoId) {
        setEquipoTemporalIdAgregar(parseInt(equipoId, 10));
        setModoAgregarJugador(requirePago);
        setActiveStep(2);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const equipoId = equipoTemporalIdAgregar || pagoEquipo.equipoTemporalId;
    if (!equipoId) return;

    const loadEquipoTemporalInfo = async () => {
      try {
        const info = await teamsService.getAvailableSlots(equipoId);
        setEquipoTemporalInfo(info);
      } catch (error) {
        console.warn('No se pudo cargar info de equipo temporal:', error);
      }
    };

    loadEquipoTemporalInfo();
  }, [equipoTemporalIdAgregar, pagoEquipo.equipoTemporalId]);

  const TIPO_SOLICITUD = {
    PRESIDENTE: 1,
    EQUIPO: 2,
    JUGADOR: 3
  };

  const segurosRequeridosPago = Number(numJugadoresPago || 0) > 0 ? Number(numJugadoresPago || 0) + 1 : 0;

  const validateCurp = (value) => {
    if (!/^[A-Z0-9]*$/.test(value)) {
      return 'Solo se permiten letras mayúsculas y números.';
    }
    if (value.length > 18) {
      return 'La CURP no puede tener más de 18 caracteres.';
    }
    return '';
  };
  const totalAsignadosPago = Object.values(asignacionSeguros).reduce((sum, value) => sum + Number(value || 0), 0);
  const segurosPendientesPago = segurosRequeridosPago - totalAsignadosPago;
  const costoAfiliacionPresidente = Number(catalogoAfiliacionesPago.find(a => a.TipoAfiliacionId === 2)?.CostoActual || 0);
  const costoAfiliacionJugador = Number(catalogoAfiliacionesPago.find(a => a.TipoAfiliacionId === 4)?.CostoActual || 0);
  const totalPagoEstimado = (
    costoAfiliacionPresidente +
    (costoAfiliacionJugador * Number(numJugadoresPago || 0)) +
    catalogs.seguros.reduce((sum, seguro) => {
      const cantidad = Number(asignacionSeguros[String(seguro.id)] || 0);
      return sum + (Number(seguro.precio || 0) * cantidad);
    }, 0)
  );
  const totalPagoMostrado = pagoEquipo.total || totalPagoEstimado;

  // CÁLCULO PARA PAGO DE AGREGAR JUGADOR (SIN PRESIDENTE, SIN +1 SEGURO)
  const segurosRequeridosPagoJugador = Number(numJugadoresAgregar || 0) > 0 ? Number(numJugadoresAgregar || 0) : 0;
  const totalAsignadosPagoJugador = Object.values(asignacionSegurosAgregar).reduce((sum, value) => sum + Number(value || 0), 0);
  const segurosPendientesPagoJugador = segurosRequeridosPagoJugador - totalAsignadosPagoJugador;
  const totalPagoEstimadoJugador = (
    (costoAfiliacionJugador * Number(numJugadoresAgregar || 0)) +
    catalogs.seguros.reduce((sum, seguro) => {
      const cantidad = Number(asignacionSegurosAgregar[String(seguro.id)] || 0);
      return sum + (Number(seguro.precio || 0) * cantidad);
    }, 0)
  );
  const totalPagoMostradoJugador = pagoJugador.total || totalPagoEstimadoJugador;

  const handleCrearOrdenPagoEquipo = async () => {

    setPagoError(null);

    if (Number(numJugadoresPago) < 1) {
      setPagoError('Debes ingresar el numero de jugadores.');
      return;
    }

    if (totalAsignadosPago !== segurosRequeridosPago) {
      setPagoError(`Debes asignar un seguro por jugador y uno para ti. Faltan ${segurosPendientesPago}.`);
      return;
    }

    try {
      setProcesandoPago(true);
      const token = localStorage.getItem('token');
      const segurosPayload = Object.entries(asignacionSeguros)
        .filter(([, cantidad]) => Number(cantidad) > 0)
        .map(([seguroId, cantidad]) => ({
          SeguroId: Number(seguroId),
          Cantidad: Number(cantidad)
        }));

      const res = await fetch(`${API_BASE}/ordenes-pago/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          CantidadJugadores: Number(numJugadoresPago),
          Seguros: segurosPayload,
          TipoSolicitud: TIPO_SOLICITUD.EQUIPO
        })
      });

      if (!res.ok) {
        let errData = {};
        let rawText = '';

        try {
          errData = await res.json();
        } catch {
          try {
            rawText = await res.text();
          } catch {}
        }

        if (errData && (errData.detail || errData.message || errData.code)) {
          console.error('Error backend crear orden de pago:', errData);
        } else if (rawText) {
          console.error('Error backend (texto):', rawText);
        }

        const backendMsg =
          errData.detail ||
          errData.message ||
          errData.code ||
          rawText ||
          'No se pudo crear la orden de pago';

        setPagoError(backendMsg);
        Swal.fire('Error', backendMsg, 'error');
        return;
      }

      const data = await res.json();
      setPagoEquipo({
        loading: false,
        aprobado: false,
        estadoEquipo: ESTADO_EQUIPO.ORDEN_SIN_COMPROBANTE,
        estado: ESTATUS_PAGO.NO_ENVIADO,
        ordenId: data.orden_pago_id || data.OrdenPagoId || data.id,
        total: Number(data.total || totalPagoEstimado || 0),
        cantidadJugadores: Number(numJugadoresPago),
        tieneComprobante: false
      });

      Swal.fire({
        title: 'Orden generada',
        text: 'Ahora realiza el pago y sube tu comprobante para revision.',
        icon: 'success',
        confirmButtonColor: '#0b4ea6'
      });
    } catch (error) {
      setPagoError(error.message);
      Swal.fire('Error', error.message, 'error');
    } finally {
      setProcesandoPago(false);
    }
  };

  const handleSubirComprobanteEquipo = async () => {
    setPagoError(null);

    if (!comprobantePagoEquipo) {
      setPagoError('Debes subir tu comprobante de pago.');
      return;
    }

    try {
      setProcesandoPago(true);
      const token = localStorage.getItem('token');
      const formDataPago = new FormData();
      formDataPago.append('archivo', comprobantePagoEquipo);

      const res = await fetch(`${API_BASE}/ordenes-pago/${pagoEquipo.ordenId}/comprobante`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formDataPago
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'No se pudo subir el comprobante');
      }

      setPagoEquipo(prev => ({
        ...prev,
        estadoEquipo: ESTADO_EQUIPO.COMPROBANTE_EN_REVISION,
        estado: ESTATUS_PAGO.EN_ESPERA,
        tieneComprobante: true
      }));
      setComprobantePagoEquipo(null);

      Swal.fire({
        title: 'Comprobante recibido',
        text: 'Un administrador debe aprobar el pago antes de configurar el equipo.',
        icon: 'success',
        confirmButtonColor: '#0b4ea6'
      });
    } catch (error) {
      setPagoError(error.message);
      Swal.fire('Error', error.message, 'error');
    } finally {
      setProcesandoPago(false);
    }
  };

  // ===== FUNCIONES PARA AGREGAR JUGADOR A EQUIPO EXISTENTE =====
  const handleAgregarJugador = async (equipoId) => {
    try {
      setPagoJugador(prev => ({ ...prev, loading: true }));
      const slotsResponse = await teamsService.getAvailableSlots(equipoId);
      
      if (slotsResponse === true || (typeof slotsResponse === 'object' && slotsResponse.slots_disponibles > 0)) {
        // Hay slots disponibles, ir directamente al formulario de jugador
        setEquipoTemporalIdAgregar(equipoId);
        setModoAgregarJugador(false);
        navigate(`/presidente-equipo/configurar-equipo?equipoId=${equipoId}&agregarJugador=true`);
      } else {
        // No hay slots, mostrar vista de pago para agregar jugador
        setEquipoTemporalIdAgregar(equipoId);
        setModoAgregarJugador(true);
        setPagoJugador(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Error verificando slots:', error);
      setPagoErrorJugador('Error al verificar disponibilidad de slots');
      setPagoJugador(prev => ({ ...prev, loading: false }));
    }
  };

  const handleCrearOrdenPagoJugador = async () => {
    setPagoErrorJugador(null);

    if (Number(numJugadoresAgregar) < 1) {
      setPagoErrorJugador('Debes ingresar el numero de jugadores.');
      return;
    }

    if (totalAsignadosPagoJugador !== segurosRequeridosPagoJugador) {
      setPagoErrorJugador(`Debes asignar un seguro por jugador. Faltan ${segurosPendientesPagoJugador}.`);
      return;
    }

    try {
      setProcesandoPagoJugador(true);
      const token = localStorage.getItem('token');
      const segurosPayload = Object.entries(asignacionSegurosAgregar)
        .filter(([, cantidad]) => Number(cantidad) > 0)
        .map(([seguroId, cantidad]) => ({
          SeguroId: Number(seguroId),
          Cantidad: Number(cantidad)
        }));

      const res = await fetch(`${API_BASE}/ordenes-pago/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          CantidadJugadores: Number(numJugadoresAgregar),
          Seguros: segurosPayload,
          TipoSolicitud: TIPO_SOLICITUD.JUGADOR
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'No se pudo crear la orden de pago');
      }

      const data = await res.json();
      setPagoJugador({
        loading: false,
        aprobado: false,
        estado: ESTATUS_PAGO.NO_ENVIADO,
        ordenId: data.orden_pago_id || data.OrdenPagoId || data.id,
        total: Number(data.total || totalPagoEstimadoJugador || 0),
        tieneComprobante: false
      });

      Swal.fire({
        title: 'Orden generada',
        text: 'Ahora realiza el pago y sube tu comprobante para revision.',
        icon: 'success',
        confirmButtonColor: '#0b4ea6'
      });
    } catch (error) {
      setPagoErrorJugador(error.message);
      Swal.fire('Error', error.message, 'error');
    } finally {
      setProcesandoPagoJugador(false);
    }
  };

  const handleSubirComprobanteJugador = async () => {
    setPagoErrorJugador(null);

    if (!comprobantePagoJugador) {
      setPagoErrorJugador('Debes subir tu comprobante de pago.');
      return;
    }

    try {
      setProcesandoPagoJugador(true);
      const token = localStorage.getItem('token');
      const formDataPago = new FormData();
      formDataPago.append('archivo', comprobantePagoJugador);

      const res = await fetch(`${API_BASE}/ordenes-pago/${pagoJugador.ordenId}/comprobante`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formDataPago
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'No se pudo subir el comprobante');
      }

      setPagoJugador(prev => ({
        ...prev,
        estado: ESTATUS_PAGO.EN_ESPERA,
        tieneComprobante: true
      }));
      setComprobantePagoJugador(null);

      Swal.fire({
        title: 'Comprobante recibido',
        text: 'Un administrador debe aprobar el pago antes de registrar el jugador.',
        icon: 'success',
        confirmButtonColor: '#0b4ea6'
      });

      // Después de 2 segundos, redirigir al formulario
      setTimeout(() => {
        setModoAgregarJugador(false);
        navigate(`/presidente-equipo/configurar-equipo?equipoId=${equipoTemporalIdAgregar}&agregarJugador=true`);
      }, 2000);
    } catch (error) {
      setPagoErrorJugador(error.message);
      Swal.fire('Error', error.message, 'error');
    } finally {
      setProcesandoPagoJugador(false);
    }
  };

  const handleOptionChange = (field, value) => {

    setFormData(prev => ({
      ...prev,
      [field]: parseInt(value)
    }));
    setErrors(prev => ({
      ...prev,
      [field]: ''
    }));
  };

  const handleCheckboxChange = (e) => {
    setFormData(prev => ({
      ...prev,
      agreedToTerms: e.target.checked
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.modality) newErrors.modality = 'Selecciona una modalidad';
    if (!formData.category) newErrors.category = 'Selecciona una categoría';
    if (!formData.season) newErrors.season = 'Selecciona una temporada';
    if (!formData.rama) newErrors.rama = 'Selecciona una rama';
    if (!formData.agreedToTerms) newErrors.agreedToTerms = 'Debes revisar y aceptar los términos';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) {
      Swal.fire('Atención', 'Por favor completa todos los campos requeridos', 'warning');
      return;
    }
    // Ya no buscamos combinaciones, usamos los IDs individuales directamente
    setShowModal(true);
  };

  const handleGoToPlayers = () => {
    // Validar modal antes de pasar
    if (!modalData.teamName.trim()) {
      Swal.fire('Atención', 'Por favor ingresa el nombre del equipo', 'warning');
      return;
    }
    if (!modalData.teamLogo) {
      Swal.fire('Atención', 'Por favor carga el logo del equipo', 'warning');
      return;
    }
    setActiveStep(2);
    setShowModal(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleSuccessModalContinue = () => {
    clearDraft();
    setShowSuccessModal(false);
    navigate(isAdmin ? '/admin/equipos' : '/presidente-equipo');
  };

  const handleTeamNameChange = (e) => {
    setModalData(prev => ({
      ...prev,
      teamName: e.target.value
    }));
  };

  const handleTeamLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setModalData(prev => ({
        ...prev,
        teamLogo: file
      }));
    }
  };
  
  const procesarOCRReal = async (docKey, file) => {
    Swal.fire({
      title: 'Analizando Documento...',
      html: 'Extrayendo información vía OCR. <b>Por favor espere.</b>',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => { Swal.showLoading(); }
    });

    try {
      const formDataOcr = new FormData();
      formDataOcr.append('file_id', file);

      const response = await fetch('/ocr-api', { method: 'POST', body: formDataOcr });
      if (!response.ok) throw new Error('Error al conectar con el servidor OCR');

      const htmlText = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, "text/html");
      
      const extractedData = {};
      const rows = doc.querySelectorAll('.dato-fila');
      rows.forEach(row => {
        const label = row.querySelector('.etiqueta')?.textContent?.toLowerCase() || '';
        const value = row.querySelector('.valor')?.textContent?.trim() || '';
        if (label.includes('nombre')) extractedData.nombre = value;
        if (label.includes('curp')) extractedData.curp = value;
        if (label.includes('fecha de nacimiento')) extractedData.fecha_nac = value;
      });

      if (extractedData.nombre) {
        const parts = extractedData.nombre.split(' ');
        let firstName = '', lastNamePaterno = '', lastNameMaterno = '';
        
        if (parts.length >= 3) {
          lastNamePaterno = parts[0];
          lastNameMaterno = parts[1];
          firstName = parts.slice(2).join(' ');
        } else if (parts.length === 2) {
          lastNamePaterno = parts[0];
          firstName = parts[1];
        } else {
          firstName = extractedData.nombre;
        }

        // Inferir sexo desde CURP si está disponible
        let inferredSexo = 1;
        if (extractedData.curp && extractedData.curp.length >= 11) {
          const char = extractedData.curp.charAt(10).toUpperCase();
          if (char === 'M') inferredSexo = 2;
        }

        setCurrentPlayer(prev => ({
          ...prev,
          firstName,
          lastNamePaterno,
          lastNameMaterno,
          curp: extractedData.curp || prev.curp,
          birthDate: extractedData.fecha_nac || prev.birthDate,
          sexo_id: inferredSexo,
          seguro_id: 1, 
          documents: { ...prev.documents, [docKey]: file }
        }));

        Swal.fire({
          title: '¡Lectura Exitosa!',
          text: `Se detectó a: ${extractedData.nombre}`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        throw new Error('No se detectaron nombres en el documento.');
      }
    } catch (err) {
      console.error("Error OCR:", err);
      setCurrentPlayer(prev => ({
        ...prev,
        documents: { ...prev.documents, [docKey]: file }
      }));
      Swal.fire('Atención', 'No se pudo leer el nombre automáticamente, por favor ingrésalo manualmente.', 'warning');
    }
  };

  const procesarFotografiaJugador = async (file) => {
    Swal.fire({
      title: 'Validando Fotografía...',
      html: 'Verificando formato y calidad. <b>Por favor espere.</b>',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    try {
      const data = await validarFotografia(file);
      if (data.valido) {
        setCurrentPlayer(prev => ({
          ...prev,
          documents: { ...prev.documents, foto: file }
        }));
        Swal.fire({
          title: '¡Fotografía Aceptada!',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      } else {
        Swal.fire('Error en la fotografía', data.mensaje, 'error');
      }
    } catch (err) {
      Swal.fire('Error de validación', err.message || 'No se pudo procesar la foto.', 'error');
    }
  };

  const handleDownloadPlayerPDF = async () => {
    try {
      Swal.fire({
        title: 'Generando PDF...',
        text: 'Preparando el formato de afiliación pre-llenado.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });

      const templateUrl = '/formato_afiliacion_jugador.pdf';
      const existingPdfBytes = await fetch(templateUrl).then(res => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const form = pdfDoc.getForm();
      const firstPage = pdfDoc.getPages()[0];

      // INCRUSTAR FOTOGRAFÍA SI EXISTE
      if (currentPlayer.documents.foto) {
        try {
          const photoBytes = await currentPlayer.documents.foto.arrayBuffer();
          let photoImage;
          const fileName = currentPlayer.documents.foto.name.toLowerCase();
          
          if (fileName.endsWith('.png')) {
            photoImage = await pdfDoc.embedPng(photoBytes);
          } else {
            photoImage = await pdfDoc.embedJpg(photoBytes);
          }

          // Dibujar la foto en la zona Imagen9_af_image (x: 481, y: 678)
          firstPage.drawImage(photoImage, {
            x: 481,
            y: 678,
            width: 72,
            height: 87,
          });
        } catch (photoErr) {
          console.error("No se pudo incrustar la foto del jugador:", photoErr);
        }
      }

      const { firstName, lastNamePaterno, lastNameMaterno, curp, birthDate, lugarNacimiento, email, telefono, sexo_id, positionId, shirtNumber } = currentPlayer;

      // Nombre y Apellidos
      form.getTextField('Nombres')?.setText(firstName || '');
      form.getTextField('Apellido Paterno')?.setText(lastNamePaterno || '');
      form.getTextField('Apellido Materno')?.setText(lastNameMaterno || '');

      // Identificadores y Nacimiento
      if (curp) form.getTextField('CURP o Clave Única de Registro de Población')?.setText(curp);
      if (birthDate) form.getTextField('Fecha de Nacimiento')?.setText(birthDate);
      if (lugarNacimiento) form.getTextField('Lugar de Nacimiento')?.setText(lugarNacimiento);
      
      // Tipo de Afiliación (Mapeado empíricamente a fill_24) y Asociación
      // El campo 'Tipo' corresponde a 'Tipo de Sangre', no lo llenaremos con AFAEM.
      form.getTextField('Asociación')?.setText('AFAEM');
      form.getTextField('fill_24')?.setText('AFAEM');

      // Contacto
      const formEmail = email || localStorage.getItem('email') || '';
      if (formEmail) form.getTextField('Correo electrónico')?.setText(formEmail);
      if (telefono) form.getTextField('Teléfono')?.setText(telefono);

      // Sexo
      const sexoTexto = sexo_id === 1 ? 'MASCULINO' : sexo_id === 2 ? 'FEMENINO' : curp && curp.length >= 11 ? (curp.charAt(10).toUpperCase() === 'H' ? 'MASCULINO' : 'FEMENINO') : '';
      if (sexoTexto) form.getTextField('Sexo')?.setText(sexoTexto);

      // Equipo y Torneo (tomamos del estado actual del formulario, con fallback a localStorage)
      form.getTextField('Equipo')?.setText(modalData.teamName || preRegistro.teamName || '');
      
      const currentLigaId = formData.season || preRegistro.liga_id || '';
      const ligaObj = catalogs.ligas?.find(l => l.id.toString() === currentLigaId.toString());
      if (ligaObj) form.getTextField('Liga')?.setText(ligaObj.nombre);
      
      const currentCatId = formData.category || preRegistro.categoria_id || '';
      const catObj = catalogs.categorias?.find(c => c.id.toString() === currentCatId.toString());
      if (catObj) form.getTextField('Categoría')?.setText(catObj.nombre);

      // Fecha automática (A __ de __ del 20__)
      const hoy = new Date();
      const dia = String(hoy.getDate()).padStart(2, '0');
      const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
      const mes = meses[hoy.getMonth()];
      const anio = String(hoy.getFullYear()).slice(-2);
      
      form.getTextField('A')?.setText(dia);
      form.getTextField('de')?.setText(mes);
      form.getTextField('del 20')?.setText(anio);

      // Posición y Camiseta
      const rolObj = catalogs.roles_equipo.find(r => r.id.toString() === (positionId || '').toString());
      form.getTextField('Posición')?.setText(rolObj ? rolObj.nombre : 'JUGADOR');
      if (shirtNumber) form.getTextField('Camiseta')?.setText(shirtNumber.toString());
      
      // ANTECEDENTES INTERNACIONALES (FORÁNEO)
      if (currentPlayer.esForaneo) {
        form.getTextField('Nacionalidades del jugador')?.setText(currentPlayer.nacionalidadJugador || '');
        form.getTextField('País de residencia actual')?.setText(currentPlayer.paisResidencia || '');
        form.getTextField('El jugador ha vivido en el extranjero En que país')?.setText(currentPlayer.haVividoExtranjero ? (currentPlayer.dondeVividoExtranjero || 'SÍ') : 'NO');
        form.getTextField('Nacionalidades del padre')?.setText(currentPlayer.nacionalidadPadre || '');
        form.getTextField('Nacionalidades de la madre')?.setText(currentPlayer.nacionalidadMadre || '');
        form.getTextField('Nacionalidades del abuelo paterno')?.setText(currentPlayer.nacAbueloPaterno || '');
        form.getTextField('Nacionalidades de la abuela paterna')?.setText(currentPlayer.nacAbuelaPaterna || '');
        form.getTextField('Nacionalidades del abuelo materno')?.setText(currentPlayer.nacAbueloMaterno || '');
        form.getTextField('Nacionalidades de la abuela materna')?.setText(currentPlayer.nacAbuelaMaterna || '');
        
        form.getTextField('El jugador ha jugado en un Club extranjero y participado en')?.setText(currentPlayer.juegoClubExtranjero || '');
        form.getTextField('El jugador ha sido registrado por la Asociación Nacional de Fútbol')?.setText(currentPlayer.registroAsociacionExtranjera || '');
      }

      // El campo 'Cargo' no existe en el PDF o es redundante con 'Posición'


      // Generar bytes del PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const safeNombre = (firstName || 'Jugador').toString().replace(/[^a-zA-Z0-9_\s]/g, '').trim();
      const link = document.createElement('a');
      link.href = url;
      link.download = `Afiliacion_${safeNombre}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      Swal.fire('¡Listo!', 'El formato se ha generado correctamente. Firma el documento y súbelo.', 'success');
    } catch (err) {
      console.error("Error generando PDF:", err);
      Swal.fire('Error', 'No se pudo generar el PDF. ' + err.message, 'error');
    }
  };

  const userEmail = localStorage.getItem('email') || '';

  const resetPlayerForm = () => {
    setCurrentPlayer({
      id: Date.now(),
      firstName: '',
      lastNamePaterno: '',
      lastNameMaterno: '',
      curp: '',
      nui: '',
      birthDate: '',
      lugarNacimiento: '',
      email: '',
      telefono: '',
      sexo_id: 1,
      insuranceType: '',
      esForaneo: false,
      nacionalidadJugador: 'MEXICANA',
      paisResidencia: 'MÉXICO',
      haVividoExtranjero: false,
      dondeVividoExtranjero: '',
      nacionalidadPadre: '',
      nacionalidadMadre: '',
      registroAsociacionExtranjera: '',
      nacAbueloPaterno: '',
      nacAbuelaPaterna: '',
      nacAbueloMaterno: '',
      nacAbuelaMaterna: '',
      juegoClubExtranjero: '',
      shirtNumber: '',
      positionId: '',
      documents: {}
    });
    setEditingPlayerId(null);
    setFormErrors({});
  };

  const loadPlayerForEditing = (playerId) => {
    const playerToEdit = players.find(p => p.id === playerId);
    if (playerToEdit) {
      setCurrentPlayer({ ...playerToEdit });
      setFormErrors({});
      setEditingPlayerId(playerId);
      // Scroll al formulario
      setTimeout(() => {
        document.querySelector('[data-player-form]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const renderPagoPrevioEquipo = () => {
    const ordenCreada = Boolean(pagoEquipo.ordenId);
    const pagoEnRevision = pagoEquipo.estadoEquipo === ESTADO_EQUIPO.COMPROBANTE_EN_REVISION;
    const pagoRechazado = pagoEquipo.estado === ESTATUS_PAGO.RECHAZADO;

    if (pagoEquipo.loading || loadingCatalogs) {
      return (
        <div style={{ maxWidth: '760px', margin: '0 auto', textAlign: 'center', padding: '60px 20px' }}>
          <FaClock style={{ fontSize: '42px', color: '#0b4ea6', marginBottom: '18px' }} />
          <h2 style={{ fontWeight: '900', color: '#1e293b' }}>Revisando estado de pago</h2>
          <p style={{ color: '#64748b', margin: 0 }}>Un momento mientras validamos si tienes una orden aprobada disponible.</p>
        </div>
      );
    }

    if (pagoEnRevision) {
      return (
        <div style={{ maxWidth: '760px', margin: '0 auto', textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: '82px', height: '82px', borderRadius: '50%', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px', fontSize: '36px' }}>
            <FaClock />
          </div>
          <h2 style={{ fontWeight: '900', color: '#1e293b' }}>Pago en revision</h2>
          <p style={{ color: '#64748b', lineHeight: 1.6, margin: '10px auto 28px', maxWidth: '520px' }}>
            Ya recibimos tu comprobante de la orden #{pagoEquipo.ordenId}. Un administrador debe aprobarlo antes de que puedas configurar tu equipo.
          </p>
          <button onClick={() => navigate('/presidente-equipo')} style={{ padding: '12px 28px', borderRadius: '12px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: '800', cursor: 'pointer' }}>
            Volver al panel
          </button>
        </div>
      );
    }

    if (pagoEquipo.estadoEquipo === ESTADO_EQUIPO.LISTO_PARA_CREAR_EQUIPO) {
      return null;
    }

    return (
      <div style={{ maxWidth: '980px', margin: '0 auto', animation: 'slideUp 0.4s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '70px', height: '70px', borderRadius: '18px', background: 'linear-gradient(135deg, #0b4ea6 0%, #063f82 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: '30px', boxShadow: '0 12px 24px rgba(11,78,166,0.22)' }}>
            <FaMoneyBillWave />
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#1e293b', marginBottom: '8px' }}>Pago previo para nuevo equipo</h2>
          <p style={{ color: '#64748b', margin: 0 }}>
            Genera tu orden, sube el comprobante y espera la aprobacion administrativa para continuar.
          </p>
          <p style={{ color: '#ff0000', margin: 0 }}>
            *Si ya tienes una orden de pago y subiste el comprobante, contáctate con un administrador*
          </p>
        </div>

        {pagoRechazado && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '14px', padding: '16px 18px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <FaTimesCircle />
            <span style={{ fontWeight: '700' }}>El comprobante fue rechazado. Sube un nuevo archivo para enviarlo otra vez a revision.</span>
          </div>
        )}

        {pagoError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '14px', padding: '14px 18px', marginBottom: '20px', fontWeight: '700' }}>
            {pagoError}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(280px, 0.9fr)', gap: '22px' }}>
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '26px', boxShadow: '0 6px 18px rgba(15,23,42,0.05)' }}>
            {!ordenCreada ? (
              <>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '900', color: '#334155', marginBottom: '8px', textTransform: 'uppercase' }}>Numero de jugadores</label>
                <input
                  type="number"
                  min="1"
                  value={numJugadoresPago}
                  onChange={(e) => setNumJugadoresPago(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                  style={{ width: '100%', padding: '14px 16px', border: '2px solid #dbeafe', borderRadius: '12px', fontSize: '18px', fontWeight: '800', color: '#1e293b', marginBottom: '18px' }}
                />

                <div style={{ marginBottom: '12px', fontSize: '13px', fontWeight: '900', color: '#0b4ea6', textTransform: 'uppercase' }}>Distribucion de seguros</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {catalogs.seguros.map(seguro => {
                    const id = String(seguro.id);
                    return (
                      <div key={id} style={{ display: 'grid', gridTemplateColumns: '1fr 92px', gap: '12px', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px' }}>
                        <div>
                          <div style={{ fontWeight: '900', color: '#1e293b', fontSize: '14px' }}>{seguro.nombre}</div>
                          <div style={{ color: '#64748b', fontSize: '12px', marginTop: '3px' }}>${Number(seguro.precio || 0).toFixed(2)} c/u</div>
                        </div>
                        <input
                          type="number"
                          min="0"
                          value={asignacionSeguros[id] ?? ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0);
                            setAsignacionSeguros(prev => ({ ...prev, [id]: value }));
                          }}
                          style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '10px', fontWeight: '800', textAlign: 'center' }}
                        />
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: '16px', padding: '12px 14px', borderRadius: '12px', background: totalAsignadosPago === segurosRequeridosPago && segurosRequeridosPago > 0 ? '#ecfdf5' : '#fff7ed', color: totalAsignadosPago === segurosRequeridosPago && segurosRequeridosPago > 0 ? '#047857' : '#c2410c', fontWeight: '800', fontSize: '13px' }}>
                  Seguros asignados: {totalAsignadosPago}/{segurosRequeridosPago || 0}
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '999px', background: '#ecfdf5', color: '#047857', fontWeight: '900', fontSize: '12px', marginBottom: '18px' }}>
                  <FaCheckCircle /> Orden activa #{pagoEquipo.ordenId}
                </div>
                <h3 style={{ color: '#1e293b', fontWeight: '900', marginBottom: '8px' }}>Sube tu comprobante de pago</h3>
                <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: '22px' }}>
                  Adjunta un PDF o imagen del comprobante. La configuracion se habilitara cuando el administrador apruebe esta orden.
                </p>
                <div style={{ border: '2px dashed #bfdbfe', borderRadius: '16px', padding: '26px', textAlign: 'center', background: '#f8fafc' }}>
                  <FaUpload style={{ fontSize: '34px', color: '#0b4ea6', marginBottom: '12px' }} />
                  <input
                    id="comprobante-equipo"
                    type="file"
                    accept=".pdf,image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => setComprobantePagoEquipo(e.target.files?.[0] || null)}
                  />
                  <div style={{ fontWeight: '800', color: '#1e293b', marginBottom: '12px' }}>
                    {comprobantePagoEquipo ? comprobantePagoEquipo.name : 'No se ha seleccionado archivo'}
                  </div>
                  <button onClick={() => document.getElementById('comprobante-equipo').click()} style={{ padding: '11px 22px', borderRadius: '10px', border: '1px solid #0b4ea6', background: 'white', color: '#0b4ea6', fontWeight: '900', cursor: 'pointer' }}>
                    {comprobantePagoEquipo ? 'Cambiar archivo' : 'Seleccionar archivo'}
                  </button>
                </div>
              </>
            )}
          </div>

          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '26px', boxShadow: '0 6px 18px rgba(15,23,42,0.05)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#1e293b', marginBottom: '18px' }}>Resumen de pago</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '13px' }}>
              <span>Afiliacion presidente</span>
              <strong style={{ color: '#1e293b' }}>${costoAfiliacionPresidente.toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '13px' }}>
              <span>Afiliacion jugadores x{Number(numJugadoresPago || 0)}</span>
              <strong style={{ color: '#1e293b' }}>${(costoAfiliacionJugador * Number(numJugadoresPago || 0)).toFixed(2)}</strong>
            </div>
            {catalogs.seguros.map(seguro => {
              const cantidad = Number(asignacionSeguros[String(seguro.id)] || 0);
              if (!cantidad) return null;
              return (
                <div key={seguro.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '13px' }}>
                  <span>{seguro.nombre} x{cantidad}</span>
                  <strong style={{ color: '#1e293b' }}>${(Number(seguro.precio || 0) * cantidad).toFixed(2)}</strong>
                </div>
              );
            })}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', paddingTop: '18px', borderTop: '2px solid #e2e8f0' }}>
              <span style={{ fontWeight: '900', color: '#1e293b' }}>Total</span>
              <span style={{ fontSize: '24px', fontWeight: '900', color: '#0b4ea6' }}>${Number(totalPagoMostrado || 0).toFixed(2)}</span>
            </div>

            <button
              disabled={procesandoPago || (!ordenCreada && (Number(numJugadoresPago) < 1 || totalAsignadosPago !== segurosRequeridosPago)) || (ordenCreada && !comprobantePagoEquipo)}
              onClick={ordenCreada ? handleSubirComprobanteEquipo : handleCrearOrdenPagoEquipo}
              style={{ width: '100%', marginTop: '24px', padding: '14px 18px', borderRadius: '12px', border: 'none', background: procesandoPago ? '#94a3b8' : '#0b4ea6', color: 'white', fontWeight: '900', cursor: procesandoPago ? 'wait' : 'pointer', opacity: (!ordenCreada && (Number(numJugadoresPago) < 1 || totalAsignadosPago !== segurosRequeridosPago)) || (ordenCreada && !comprobantePagoEquipo) ? 0.55 : 1 }}
            >
              {procesandoPago ? 'Procesando...' : ordenCreada ? 'Enviar comprobante' : 'Generar orden de pago'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderPagoPrevioJugador = () => {
    const ordenCreada = Boolean(pagoJugador.ordenId);
    const pagoEnRevision = pagoJugador.estado === ESTATUS_PAGO.EN_ESPERA && pagoJugador.tieneComprobante;
    const pagoRechazado = pagoJugador.estado === ESTATUS_PAGO.RECHAZADO;

    if (pagoJugador.loading || loadingCatalogs) {
      return (
        <div style={{ maxWidth: '760px', margin: '0 auto', textAlign: 'center', padding: '60px 20px' }}>
          <FaClock style={{ fontSize: '42px', color: '#0b4ea6', marginBottom: '18px' }} />
          <h2 style={{ fontWeight: '900', color: '#1e293b' }}>Revisando estado de pago</h2>
          <p style={{ color: '#64748b', margin: 0 }}>Un momento mientras validamos si tienes una orden aprobada disponible.</p>
        </div>
      );
    }

    if (pagoEnRevision) {
      return (
        <div style={{ maxWidth: '760px', margin: '0 auto', textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: '82px', height: '82px', borderRadius: '50%', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px', fontSize: '36px' }}>
            <FaClock />
          </div>
          <h2 style={{ fontWeight: '900', color: '#1e293b' }}>Pago en revision</h2>
          <p style={{ color: '#64748b', lineHeight: 1.6, margin: '10px auto 28px', maxWidth: '520px' }}>
            Ya recibimos tu comprobante de la orden #{pagoJugador.ordenId}. Un administrador debe aprobarlo antes de que puedas registrar el jugador.
          </p>
          <button onClick={() => navigate('/presidente-equipo')} style={{ padding: '12px 28px', borderRadius: '12px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: '800', cursor: 'pointer' }}>
            Volver al panel
          </button>
        </div>
      );
    }

    return (
      <div style={{ maxWidth: '980px', margin: '0 auto', animation: 'slideUp 0.4s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '70px', height: '70px', borderRadius: '18px', background: 'linear-gradient(135deg, #0b4ea6 0%, #063f82 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: '30px', boxShadow: '0 12px 24px rgba(11,78,166,0.22)' }}>
            <FaMoneyBillWave />
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#1e293b', marginBottom: '8px' }}>Pago previo para agregar jugador</h2>
          <p style={{ color: '#64748b', margin: 0 }}>
            Genera tu orden, sube el comprobante y espera la aprobacion administrativa para continuar.
          </p>
          <p style={{ color: '#ff0000', margin: 0 }}>
            *Si ya tienes una orden de pago y subiste el comprobante, contáctate con un administrador*
          </p>
        </div>

        {pagoRechazado && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '14px', padding: '16px 18px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <FaTimesCircle />
            <span style={{ fontWeight: '700' }}>El comprobante fue rechazado. Sube un nuevo archivo para enviarlo otra vez a revision.</span>
          </div>
        )}

        {pagoErrorJugador && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '14px', padding: '14px 18px', marginBottom: '20px', fontWeight: '700' }}>
            {pagoErrorJugador}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(280px, 0.9fr)', gap: '22px' }}>
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '26px', boxShadow: '0 6px 18px rgba(15,23,42,0.05)' }}>
            {!ordenCreada ? (
              <>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '900', color: '#334155', marginBottom: '8px', textTransform: 'uppercase' }}>Numero de jugadores</label>
                <input
                  type="number"
                  min="1"
                  value={numJugadoresAgregar}
                  onChange={(e) => setNumJugadoresAgregar(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                  style={{ width: '100%', padding: '14px 16px', border: '2px solid #dbeafe', borderRadius: '12px', fontSize: '18px', fontWeight: '800', color: '#1e293b', marginBottom: '18px' }}
                />

                <div style={{ marginBottom: '12px', fontSize: '13px', fontWeight: '900', color: '#0b4ea6', textTransform: 'uppercase' }}>Distribucion de seguros</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {catalogs.seguros.map(seguro => {
                    const id = String(seguro.id);
                    return (
                      <div key={id} style={{ display: 'grid', gridTemplateColumns: '1fr 92px', gap: '12px', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px' }}>
                        <div>
                          <div style={{ fontWeight: '900', color: '#1e293b', fontSize: '14px' }}>{seguro.nombre}</div>
                          <div style={{ color: '#64748b', fontSize: '12px', marginTop: '3px' }}>${Number(seguro.precio || 0).toFixed(2)} c/u</div>
                        </div>
                        <input
                          type="number"
                          min="0"
                          value={asignacionSegurosAgregar[id] ?? ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0);
                            setAsignacionSegurosAgregar(prev => ({ ...prev, [id]: value }));
                          }}
                          style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '10px', fontWeight: '800', textAlign: 'center' }}
                        />
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: '16px', padding: '12px 14px', borderRadius: '12px', background: totalAsignadosPagoJugador === segurosRequeridosPagoJugador && segurosRequeridosPagoJugador > 0 ? '#ecfdf5' : '#fff7ed', color: totalAsignadosPagoJugador === segurosRequeridosPagoJugador && segurosRequeridosPagoJugador > 0 ? '#047857' : '#c2410c', fontWeight: '800', fontSize: '13px' }}>
                  Seguros asignados: {totalAsignadosPagoJugador}/{segurosRequeridosPagoJugador || 0}
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '999px', background: '#ecfdf5', color: '#047857', fontWeight: '900', fontSize: '12px', marginBottom: '18px' }}>
                  <FaCheckCircle /> Orden activa #{pagoJugador.ordenId}
                </div>
                <h3 style={{ color: '#1e293b', fontWeight: '900', marginBottom: '8px' }}>Sube tu comprobante de pago</h3>
                <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: '22px' }}>
                  Adjunta un PDF o imagen del comprobante. El registro se habilitara cuando el administrador apruebe esta orden.
                </p>
                <div style={{ border: '2px dashed #bfdbfe', borderRadius: '16px', padding: '26px', textAlign: 'center', background: '#f8fafc' }}>
                  <FaUpload style={{ fontSize: '34px', color: '#0b4ea6', marginBottom: '12px' }} />
                  <input
                    id="comprobante-jugador"
                    type="file"
                    accept=".pdf,image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => setComprobantePagoJugador(e.target.files?.[0] || null)}
                  />
                  <div style={{ fontWeight: '800', color: '#1e293b', marginBottom: '12px' }}>
                    {comprobantePagoJugador ? comprobantePagoJugador.name : 'No se ha seleccionado archivo'}
                  </div>
                  <button onClick={() => document.getElementById('comprobante-jugador').click()} style={{ padding: '11px 22px', borderRadius: '10px', border: '1px solid #0b4ea6', background: 'white', color: '#0b4ea6', fontWeight: '900', cursor: 'pointer' }}>
                    {comprobantePagoJugador ? 'Cambiar archivo' : 'Seleccionar archivo'}
                  </button>
                </div>
              </>
            )}
          </div>

          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '26px', boxShadow: '0 6px 18px rgba(15,23,42,0.05)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#1e293b', marginBottom: '18px' }}>Resumen de pago</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '13px' }}>
              <span>Afiliacion jugadores x{Number(numJugadoresAgregar || 0)}</span>
              <strong style={{ color: '#1e293b' }}>${(costoAfiliacionJugador * Number(numJugadoresAgregar || 0)).toFixed(2)}</strong>
            </div>
            {catalogs.seguros.map(seguro => {
              const cantidad = Number(asignacionSegurosAgregar[String(seguro.id)] || 0);
              if (!cantidad) return null;
              return (
                <div key={seguro.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '13px' }}>
                  <span>{seguro.nombre} x{cantidad}</span>
                  <strong style={{ color: '#1e293b' }}>${(Number(seguro.precio || 0) * cantidad).toFixed(2)}</strong>
                </div>
              );
            })}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', paddingTop: '18px', borderTop: '2px solid #e2e8f0' }}>
              <span style={{ fontWeight: '900', color: '#1e293b' }}>Total</span>
              <span style={{ fontSize: '24px', fontWeight: '900', color: '#0b4ea6' }}>${Number(totalPagoMostradoJugador || 0).toFixed(2)}</span>
            </div>

            <button
              disabled={procesandoPagoJugador || (!ordenCreada && (Number(numJugadoresAgregar) < 1 || totalAsignadosPagoJugador !== segurosRequeridosPagoJugador)) || (ordenCreada && !comprobantePagoJugador)}
              onClick={ordenCreada ? handleSubirComprobanteJugador : handleCrearOrdenPagoJugador}
              style={{ width: '100%', marginTop: '24px', padding: '14px 18px', borderRadius: '12px', border: 'none', background: procesandoPagoJugador ? '#94a3b8' : '#0b4ea6', color: 'white', fontWeight: '900', cursor: procesandoPagoJugador ? 'wait' : 'pointer', opacity: (!ordenCreada && (Number(numJugadoresAgregar) < 1 || totalAsignadosPagoJugador !== segurosRequeridosPagoJugador)) || (ordenCreada && !comprobantePagoJugador) ? 0.55 : 1 }}
            >
              {procesandoPagoJugador ? 'Procesando...' : ordenCreada ? 'Enviar comprobante' : 'Generar orden de pago'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <style>
        {`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .step-pill {
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            background: #f1f5f9;
            color: #64748b;
            transition: all 0.3s;
          }
          .step-pill.active {
            background: #0b4ea6;
            color: white;
          }
          .dashboard-main { animation: slideUp 0.4s ease; }
        `}
      </style>
      <div className="dashboard-content">
        {modoAgregarJugador && pagoJugador.estado !== ESTATUS_PAGO.APROBADO ? (
          renderPagoPrevioJugador()
        ) : !isAdmin && !pagoEquipo.aprobado ? (
          renderPagoPrevioEquipo()
        ) : (
          <>
        {/* STEP INDICATOR */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '25px', padding: '10px' }}>
              {isAdmin && <div className={`step-pill ${activeStep === 0 ? 'active' : ''}`}>0. Presidente</div>}
              {isAdmin && <div style={{ color: '#cbd5e1', alignSelf: 'center' }}>→</div>}
              <div className={`step-pill ${activeStep === 1 ? 'active' : ''}`}>1. Configuración</div>
              <div style={{ color: '#cbd5e1', alignSelf: 'center' }}>→</div>
              <div className={`step-pill ${activeStep === 2 ? 'active' : ''}`}>2. Jugadores</div>
            </div>

            <div>
              {isAdmin && activeStep === 0 && (
                <div style={{ animation: 'slideUp 0.4s ease', maxWidth: '600px', margin: '0 auto' }}>
                  <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{ fontSize: '40px', marginBottom: '10px' }}>👤</div>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>Seleccionar Presidente</h2>
                    <p style={{ color: '#64748b' }}>Busca y selecciona al presidente responsable de este equipo.</p>
                  </div>

                  <div className="card" style={{ padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div className="mb-4">
                      <label className="form-label" style={{ fontWeight: '700', fontSize: '14px' }}>Buscar Presidente</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Escribe nombre o apellido..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ borderRadius: '10px', padding: '12px' }}
                      />
                    </div>

                    <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '20px' }}>
                      {activePresidents
                        .filter(p => !searchTerm || p.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map(p => (
                          <div 
                            key={p.id} 
                            onClick={() => setSelectedPresidentId(p.id)}
                            style={{ 
                              padding: '12px 20px', 
                              cursor: 'pointer',
                              borderBottom: '1px solid #f1f5f9',
                              backgroundColor: selectedPresidentId === p.id ? '#eff6ff' : 'white',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              transition: 'all 0.2s'
                            }}
                          >
                            <div style={{ 
                              width: '32px', height: '32px', borderRadius: '50%', 
                              background: selectedPresidentId === p.id ? '#0b4ea6' : '#f1f5f9',
                              color: selectedPresidentId === p.id ? 'white' : '#64748b',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '12px', fontWeight: '800'
                            }}>
                              {p.nombre.charAt(0)}
                            </div>
                            <span style={{ fontWeight: selectedPresidentId === p.id ? '700' : '500', color: '#1e293b' }}>{p.nombre}</span>
                            {selectedPresidentId === p.id && <span style={{ marginLeft: 'auto', color: '#0b4ea6' }}>✓</span>}
                          </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
                      <button 
                        onClick={() => navigate('/admin/equipos')}
                        style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: '600' }}
                      >
                        Cancelar
                      </button>
                      <button 
                        disabled={!selectedPresidentId}
                        onClick={() => setActiveStep(1)}
                        style={{ 
                          padding: '10px 30px', borderRadius: '8px', border: 'none', 
                          background: !selectedPresidentId ? '#cbd5e1' : '#0b4ea6', 
                          color: 'white', fontWeight: '700', cursor: !selectedPresidentId ? 'not-allowed' : 'pointer' 
                        }}
                      >
                        Siguiente →
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {activeStep === 1 && (
                <div style={{ animation: 'slideUp 0.4s ease' }}>
                  {/* HEADER DEL FORMULARIO */}
                  <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div style={{ fontSize: '32px', background: 'linear-gradient(135deg, #0b4ea6 0%, #063f82 100%)', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '14px', color: 'white', boxShadow: '0 4px 6px -1px rgba(11, 78, 166, 0.2)' }}>
                        🛡️
                      </div>
                      <div>
                        <h2 style={{ margin: 0, color: '#1e293b', fontSize: '24px', fontWeight: '800' }}>Configuración de Equipo</h2>
                        <p style={{ margin: '5px 0 0 0', color: '#64748b', fontSize: '14px' }}>Define la modalidad y categoría de competencia.</p>
                      </div>
                    </div>
                    
                    <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#eff6ff', borderRadius: '12px', border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', gap: '12px' }}>
                       <div style={{ fontSize: '24px' }}>ℹ️</div>
                       <div>
                         <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e3a8a' }}>
                           {isAdmin ? 'Modo Administrador: Registro sin límites' : `Seguros pre-pagados: ${numPersonasPagadas}`}
                         </div>
                         <div style={{ fontSize: '12px', color: '#60a5fa' }}>
                           {isAdmin ? 'Crea equipos y registra jugadores directamente en el sistema.' : 'Las opciones se habilitan según tu pago previo.'}
                         </div>
                       </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                    {/* MODALIDAD */}
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <h5 style={{ marginBottom: '20px', color: '#0b4ea6', fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FaFutbol /> Modalidad
                      </h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {catalogs.modalidades.map((mod) => (
                          <label key={mod.id} style={{
                            display: 'flex', alignItems: 'center', gap: '15px', padding: '18px', borderRadius: '16px', cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', border: '2px solid',
                            borderColor: formData.modality === mod.id ? '#0b4ea6' : '#f1f5f9',
                            backgroundColor: formData.modality === mod.id ? '#eff6ff' : 'white',
                            position: 'relative', overflow: 'hidden'
                          }}>
                            {formData.modality === mod.id && <div style={{ position: 'absolute', top: 0, right: 0, width: '40px', height: '40px', background: '#0b4ea6', clipPath: 'polygon(100% 0, 0 0, 100% 100%)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', padding: '5px' }}><div style={{ color: 'white', fontSize: '10px' }}>✓</div></div>}
                            <input type="radio" name="modality" value={mod.id} checked={formData.modality === mod.id} onChange={(e) => handleOptionChange('modality', e.target.value)} style={{ width: '20px', height: '20px', accentColor: '#0b4ea6' }} />
                            <div style={{ flex: 1 }}>
                              <span style={{ fontWeight: '800', display: 'block', color: '#1e293b', fontSize: '15px' }}>{mod.nombre}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* CATEGORÍA */}
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <h5 style={{ marginBottom: '20px', color: '#0b4ea6', fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FaTags /> Categoría
                      </h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {catalogs.categorias.map((cat) => (
                          <label key={cat.id} style={{
                            display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', borderRadius: '12px', cursor: 'pointer',
                            transition: 'all 0.2s', border: '1px solid',
                            borderColor: formData.category === cat.id ? '#0b4ea6' : '#f1f5f9',
                            backgroundColor: formData.category === cat.id ? '#eff6ff' : 'white'
                          }}>
                            <input type="radio" name="category" value={cat.id} checked={formData.category === cat.id} onChange={(e) => handleOptionChange('category', e.target.value)} />
                            <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>{cat.nombre}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* TEMPORADA */}
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <h5 style={{ marginBottom: '20px', color: '#0b4ea6', fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FaCalendar /> Temporada
                      </h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {catalogs.ligas.map((s) => (
                          <label key={s.id} style={{
                            display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', borderRadius: '12px', cursor: 'pointer',
                            transition: 'all 0.2s', border: '1px solid',
                            borderColor: formData.season === s.id ? '#0b4ea6' : '#f1f5f9',
                            backgroundColor: formData.season === s.id ? '#eff6ff' : 'white'
                          }}>
                            <input type="radio" name="season" value={s.id} checked={formData.season === s.id} onChange={(e) => handleOptionChange('season', e.target.value)} />
                            <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>{s.nombre}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* RAMA */}
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <h5 style={{ marginBottom: '20px', color: '#0b4ea6', fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FaTags /> Rama
                      </h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {catalogs.ramas.map((r) => (
                          <label key={r.id} style={{
                            display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', borderRadius: '12px', cursor: 'pointer',
                            transition: 'all 0.2s', border: '1px solid',
                            borderColor: formData.rama === r.id ? '#0b4ea6' : '#f1f5f9',
                            backgroundColor: formData.rama === r.id ? '#eff6ff' : 'white'
                          }}>
                            <input type="radio" name="rama" value={r.id} checked={formData.rama === r.id} onChange={(e) => handleOptionChange('rama', e.target.value)} />
                            <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>{r.nombre}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* TÉRMINOS */}
                  <div style={{ backgroundColor: '#f8fafc', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '30px' }}>
                    <div style={{ display: 'flex', gap: '15px' }}>
                      <input type="checkbox" id="terms" checked={formData.agreedToTerms} onChange={handleCheckboxChange} style={{ width: '20px', height: '20px', marginTop: '2px', cursor: 'pointer' }} />
                      <label htmlFor="terms" style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', cursor: 'pointer' }}>
                        He revisado los reglamentos de competencia y acepto que el registro de los jugadores debe cumplir con los seguros pre-pagados.
                      </label>
                    </div>
                    <div style={{ marginTop: '12px', paddingLeft: '35px' }}>
                      <a 
                        href="https://afaem.mx/reglamentos" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ 
                          fontSize: '13px', color: '#0b4ea6', fontWeight: '700', 
                          textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px',
                          transition: 'color 0.2s'
                        }}
                        onMouseEnter={e => e.target.style.textDecoration = 'underline'}
                        onMouseLeave={e => e.target.style.textDecoration = 'none'}
                      >
                        📄 Click aquí para ver los reglamentos de competencia →
                      </a>
                    </div>
                    {errors.agreedToTerms && <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '10px', fontWeight: '700' }}>⚠️ {errors.agreedToTerms}</div>}
                  </div>

                  {/* BOTONES STEP 1 */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
                    {!isAdmin && <button type="button" onClick={saveDraft} style={{ padding: '12px 20px', borderRadius: '10px', border: '1px solid #0b4ea6', background: '#eff6ff', color: '#0b4ea6', fontWeight: '700', cursor: 'pointer' }}>💾 Guardar Borrador</button>}
                    <button type="button" onClick={() => navigate(isAdmin ? '/admin/equipos' : '/presidente-equipo')} style={{ padding: '12px 30px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: '700', cursor: 'pointer' }}>Cancelar</button>
                    <button type="button" onClick={handleSubmit} style={{ padding: '12px 40px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #0b4ea6 0%, #063f82 100%)', color: 'white', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(11, 78, 166, 0.2)' }}>Continuar a Jugadores →</button>
                  </div>
                </div>
              )}

            {/* SECCIÓN 2: REGISTRO DE JUGADORES (PASO 2) */}
            {activeStep === 2 && (
              <div style={{ animation: 'slideUp 0.4s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                   <button onClick={() => setActiveStep(isAdmin ? 0 : 1)} style={{ background: 'none', border: 'none', color: '#0b4ea6', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                     ← Volver {isAdmin ? 'a Selección de Presidente' : 'a Configuración'}
                   </button>
                   <div style={{ background: '#dcfce7', color: '#166534', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                     Equipo: {modalData.teamName || 'Sin nombre'}
                   </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '30px' }}>
                  {/* FORMULARIO DE JUGADOR */}
                  <div data-player-form style={{ backgroundColor: 'white', padding: '30px', borderRadius: '16px', border: editingPlayerId ? '2px solid #0b4ea6' : '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', transition: 'all 0.3s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' }}>
                      <div>
                        <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b', margin: 0 }}>{editingPlayerId ? '✏️ Editar Jugador' : 'Registrar Jugador'}</h3>
                        <p style={{ fontSize: '13px', color: '#64748b', margin: '5px 0 0 0' }}>{editingPlayerId ? 'Modifica la información del jugador seleccionado.' : 'Sube los documentos para autocompletar la información.'}</p>
                      </div>
                      <div style={{ background: '#f1f5f9', padding: '8px 12px', borderRadius: '8px', textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Jugadores</span>
                        <span style={{ fontSize: '18px', fontWeight: '800', color: '#0b4ea6' }}>{players.length}</span>
                      </div>
                    </div>

                    <div style={{ marginBottom: '30px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '12px' }}>Documentación Requerida</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                        {[
                          { key: 'acta', label: 'Acta Nac.', icon: '📜' },
                          { key: 'ine', label: 'INE / Ident.', icon: '🆔' },
                          { key: 'foto', label: 'Foto', icon: '📸' }
                        ].map(doc => {
                          const isFormato = doc.key === 'formato';
                          const canUploadFormato = currentPlayer.firstName && currentPlayer.firstName.trim() !== '';
                          
                          return (
                            <div key={doc.key} style={{ 
                              textAlign: 'center', padding: '20px 10px', border: '1px dashed', borderRadius: '16px',
                              backgroundColor: (currentPlayer.documents && currentPlayer.documents[doc.key]) ? '#f0fdf4' : (isFormato && !canUploadFormato ? '#f1f5f9' : '#f8fafc'),
                              borderColor: (currentPlayer.documents && currentPlayer.documents[doc.key]) ? '#22c55e' : (isFormato && !canUploadFormato ? '#e2e8f0' : '#cbd5e1'),
                              transition: 'all 0.2s',
                              opacity: isFormato && !canUploadFormato ? 0.6 : 1
                            }}>
                               <div style={{ fontSize: '28px', marginBottom: '8px' }}>{doc.icon}</div>
                               <div style={{ fontSize: '10px', fontWeight: '900', color: '#475569', textTransform: 'uppercase', marginBottom: '10px' }}>{doc.label}</div>
                               
                               {(currentPlayer.documents && currentPlayer.documents[doc.key]) ? (
                                 <div style={{ fontSize: '11px', color: '#059669', fontWeight: '800' }}>Cargado ✓</div>
                               ) : (
                                 <button 
                                   disabled={isFormato && !canUploadFormato}
                                   onClick={() => {
                                     const input = document.createElement('input');
                                     input.type = 'file';
                                     input.onchange = (e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                          if (doc.key === 'foto') {
                                            procesarFotografiaJugador(file);
                                          } else if (['acta', 'ine'].includes(doc.key)) {
                                            procesarOCRReal(doc.key, file);
                                          } else {
                                            setCurrentPlayer(prev => ({
                                              ...prev,
                                              documents: { ...prev.documents, [doc.key]: file }
                                            }));
                                          }
                                        }
                                     };
                                     input.click();
                                   }}
                                   style={{ 
                                     fontSize: '10px', padding: '5px 10px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', 
                                     cursor: (isFormato && !canUploadFormato) ? 'not-allowed' : 'pointer', fontWeight: '800', color: '#0b4ea6' 
                                   }}
                                 >
                                   Subir
                                 </button>
                               )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px' }}>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                         <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Nombre(s)</label>
                         <input 
                           type="text" 
                           value={currentPlayer.firstName}
                           onChange={e => setCurrentPlayer({...currentPlayer, firstName: e.target.value})}
                           placeholder="Ej. Juan" 
                           style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} 
                         />
                       </div>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                         <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Ap. Paterno</label>
                         <input 
                           type="text" 
                           value={currentPlayer.lastNamePaterno}
                           onChange={e => setCurrentPlayer({...currentPlayer, lastNamePaterno: e.target.value})}
                           placeholder="Ej. Pérez" 
                           style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} 
                         />
                       </div>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Ap. Materno</label>
                          <input 
                            type="text" 
                            value={currentPlayer.lastNameMaterno}
                            onChange={e => setCurrentPlayer({...currentPlayer, lastNameMaterno: e.target.value})}
                            placeholder="Ej. Gómez" 
                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} 
                          />
                        </div>
                     </div>

                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '25px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}># Camiseta</label>
                          <input 
                            type="number" 
                            value={currentPlayer.shirtNumber}
                            onChange={e => setCurrentPlayer({...currentPlayer, shirtNumber: e.target.value})}
                            placeholder="10" 
                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} 
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Posición</label>
                          <select 
                            value={currentPlayer.positionId}
                            onChange={e => setCurrentPlayer({...currentPlayer, positionId: parseInt(e.target.value)})}
                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: 'white' }}
                          >
                            <option value="">Posición...</option>
                            {catalogs.roles_equipo.map(rol => (
                              <option key={rol.id} value={rol.id}>{rol.nombre}</option>
                            ))}
                          </select>
                        </div>
                     </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px' }}>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                         <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>CURP</label>
                         <input 
                           type="text" 
                           value={currentPlayer.curp}
                           onChange={(e) => {
                             const rawValue = e.target.value.toUpperCase();
                             const filteredValue = rawValue.replace(/[^A-Z0-9]/g, '');
                             const error = validateCurp(filteredValue);
                             setFormErrors({ ...formErrors, curp: error });
                             let sId = currentPlayer.sexo_id;
                             if (filteredValue.length >= 11) {
                               const char = filteredValue.charAt(10);
                               if (char === 'M') sId = 2;
                               else if (char === 'H') sId = 1;
                             }
                             setCurrentPlayer({...currentPlayer, curp: filteredValue, sexo_id: sId});
                           }}
                           placeholder="ABCD..." 
                           maxLength={18}
                           style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} 
                         />
                         {formErrors.curp && <small style={{ color: 'red', fontSize: '12px' }}>{formErrors.curp}</small>}
                       </div>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                         <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>NUI</label>
                         <input 
                           type="text" 
                           value={currentPlayer.nui}
                           onChange={e => setCurrentPlayer({...currentPlayer, nui: e.target.value})}
                           placeholder="NUI o Id FMF..." 
                           style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} 
                         />
                       </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px' }}>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                         <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Fecha Nac.</label>
                         <input 
                           type="date" 
                           value={currentPlayer.birthDate}
                           onChange={e => setCurrentPlayer({...currentPlayer, birthDate: e.target.value})}
                           placeholder="DD/MM/AAAA" 
                           style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} 
                         />
                       </div>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                         <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Lugar de Nacimiento</label>
                         <input 
                           type="text" 
                           value={currentPlayer.lugarNacimiento}
                           onChange={e => setCurrentPlayer({...currentPlayer, lugarNacimiento: e.target.value})}
                           placeholder="Ej. Monterrey, NL" 
                           style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} 
                         />
                       </div>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                         <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Sexo</label>
                         <select 
                           value={currentPlayer.sexo_id}
                           onChange={e => setCurrentPlayer({...currentPlayer, sexo_id: parseInt(e.target.value)})}
                           style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: 'white' }}
                         >
                           <option value={1}>MASCULINO</option>
                           <option value={2}>FEMENINO</option>
                         </select>
                       </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '25px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Correo electrónico</label>
                          <input 
                            type="email" 
                            value={currentPlayer.email}
                            onChange={e => setCurrentPlayer({...currentPlayer, email: e.target.value})}
                            placeholder="correo@ejemplo.com" 
                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} 
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Número de Teléfono</label>
                          <input 
                            type="tel" 
                            value={currentPlayer.telefono}
                            onChange={e => setCurrentPlayer({...currentPlayer, telefono: e.target.value})}
                            placeholder="10 dígitos numericos" 
                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} 
                          />
                        </div>
                     </div>

                     {/* SELECTOR DE NACIONALIDAD E INTERNACIONALES */}
                     <div style={{ marginBottom: '30px' }}>
                       <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '12px' }}>Nacionalidad del Jugador</label>
                       <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', width: 'fit-content', marginBottom: currentPlayer.esForaneo ? '20px' : '0' }}>
                         <button
                           type="button"
                           onClick={() => setCurrentPlayer({...currentPlayer, esForaneo: false})}
                           style={{
                             padding: '8px 20px', borderRadius: '10px', border: 'none',
                             background: !currentPlayer.esForaneo ? 'white' : 'transparent',
                             color: !currentPlayer.esForaneo ? '#0b4ea6' : '#64748b',
                             fontWeight: '800', fontSize: '13px',
                             boxShadow: !currentPlayer.esForaneo ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                             transition: 'all 0.2s', cursor: 'pointer'
                           }}
                         >🇲🇽 Mexicano</button>
                         <button
                           type="button"
                           onClick={() => setCurrentPlayer({...currentPlayer, esForaneo: true})}
                           style={{
                             padding: '8px 20px', borderRadius: '10px', border: 'none',
                             background: currentPlayer.esForaneo ? 'white' : 'transparent',
                             color: currentPlayer.esForaneo ? '#0b4ea6' : '#64748b',
                             fontWeight: '800', fontSize: '13px',
                             boxShadow: currentPlayer.esForaneo ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                             transition: 'all 0.2s', cursor: 'pointer'
                           }}
                         >🌎 Extranjero</button>
                       </div>

                       {currentPlayer.esForaneo && (
                         <div className="fade-in" style={{ padding: '24px', background: '#f0f9ff', borderRadius: '16px', border: '1px solid #bae6fd', marginTop: '15px' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                             <div style={{ color: '#0369a1' }}>📋</div>
                             <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#0369a1' }}>Antecedentes Internacionales Obligatorios</h4>
                           </div>

                           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '15px' }}>
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                               <label style={{ fontSize: '11px', fontWeight: '700', color: '#0369a1' }}>Nacionalidad (País de Origen) *</label>
                               <input type="text" value={currentPlayer.nacionalidadJugador} onChange={e => setCurrentPlayer({...currentPlayer, nacionalidadJugador: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #bae6fd', fontSize: '13px' }} placeholder="Ej. Argentina" />
                             </div>
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                               <label style={{ fontSize: '11px', fontWeight: '700', color: '#0369a1' }}>País de residencia actual *</label>
                               <input type="text" value={currentPlayer.paisResidencia} onChange={e => setCurrentPlayer({...currentPlayer, paisResidencia: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #bae6fd', fontSize: '13px' }} placeholder="Ej. México" />
                             </div>
                           </div>

                           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '15px' }}>
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                               <label style={{ fontSize: '11px', fontWeight: '700', color: '#0369a1' }}>¿Ha vivido en el extranjero?</label>
                               <select value={currentPlayer.haVividoExtranjero ? '1' : '0'} onChange={e => setCurrentPlayer({...currentPlayer, haVividoExtranjero: e.target.value === '1'})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #bae6fd', fontSize: '13px', backgroundColor: 'white' }}>
                                 <option value="0">No</option>
                                 <option value="1">Sí</option>
                               </select>
                             </div>
                             {currentPlayer.haVividoExtranjero && (
                               <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                 <label style={{ fontSize: '11px', fontWeight: '700', color: '#0369a1' }}>¿En qué país? *</label>
                                 <input type="text" value={currentPlayer.dondeVividoExtranjero || ''} onChange={e => setCurrentPlayer({...currentPlayer, dondeVividoExtranjero: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #bae6fd', fontSize: '13px' }} />
                               </div>
                             )}
                           </div>

                           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '15px' }}>
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                               <label style={{ fontSize: '11px', fontWeight: '700', color: '#0369a1' }}>Nacionalidad del Padre *</label>
                               <input type="text" value={currentPlayer.nacionalidadPadre} onChange={e => setCurrentPlayer({...currentPlayer, nacionalidadPadre: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #bae6fd', fontSize: '13px' }} />
                             </div>
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                               <label style={{ fontSize: '11px', fontWeight: '700', color: '#0369a1' }}>Nacionalidad de la Madre *</label>
                               <input type="text" value={currentPlayer.nacionalidadMadre} onChange={e => setCurrentPlayer({...currentPlayer, nacionalidadMadre: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #bae6fd', fontSize: '13px' }} />
                             </div>
                           </div>

                           <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '15px' }}>
                             <label style={{ fontSize: '11px', fontWeight: '700', color: '#0369a1' }}>Registrado previo en Asociación Nacional (Extranjero) *</label>
                             <textarea value={currentPlayer.registroAsociacionExtranjera} onChange={e => setCurrentPlayer({...currentPlayer, registroAsociacionExtranjera: e.target.value})} rows={2} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #bae6fd', fontSize: '13px', resize: 'none' }} placeholder="Describa el registro previo..." />
                           </div>

                           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '15px' }}>
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                               <label style={{ fontSize: '11px', fontWeight: '700', color: '#0369a1' }}>Nac. Abuelo Paterno *</label>
                               <input type="text" value={currentPlayer.nacAbueloPaterno} onChange={e => setCurrentPlayer({...currentPlayer, nacAbueloPaterno: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #bae6fd', fontSize: '13px' }} />
                             </div>
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                               <label style={{ fontSize: '11px', fontWeight: '700', color: '#0369a1' }}>Nac. Abuela Paterna *</label>
                               <input type="text" value={currentPlayer.nacAbuelaPaterna} onChange={e => setCurrentPlayer({...currentPlayer, nacAbuelaPaterna: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #bae6fd', fontSize: '13px' }} />
                             </div>
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                               <label style={{ fontSize: '11px', fontWeight: '700', color: '#0369a1' }}>Nac. Abuelo Materno *</label>
                               <input type="text" value={currentPlayer.nacAbueloMaterno} onChange={e => setCurrentPlayer({...currentPlayer, nacAbueloMaterno: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #bae6fd', fontSize: '13px' }} />
                             </div>
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                               <label style={{ fontSize: '11px', fontWeight: '700', color: '#0369a1' }}>Nac. Abuela Materna *</label>
                               <input type="text" value={currentPlayer.nacAbuelaMaterna} onChange={e => setCurrentPlayer({...currentPlayer, nacAbuelaMaterna: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #bae6fd', fontSize: '13px' }} />
                             </div>
                           </div>

                           <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                             <label style={{ fontSize: '11px', fontWeight: '700', color: '#0369a1' }}>Participaciones competenciales en el extranjero *</label>
                             <textarea value={currentPlayer.juegoClubExtranjero} onChange={e => setCurrentPlayer({...currentPlayer, juegoClubExtranjero: e.target.value})} rows={2} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #bae6fd', fontSize: '13px', resize: 'none' }} placeholder="Clubes, torneos escolares, etc..." />
                           </div>
                         </div>
                       )}
                     </div>
                    <div style={{ marginBottom: '25px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '8px' }}>Asignar Seguro</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                        {catalogs.seguros.map(seg => {
                          const id = seg.id.toString();
                          const count = players.filter(p => p.insuranceType === id).length;
                          const dbSeguro = equipoTemporalInfo?.seguros?.find(s => String(s.seguro_id) === id);
                          const available = dbSeguro ? (dbSeguro.disponibles - count) : ((asignacionSeguros[id] || 0) - count);
                          return (
                            <button
                              key={id}
                              disabled={available <= 0}
                              onClick={() => setCurrentPlayer({...currentPlayer, insuranceType: id})}
                              style={{
                                padding: '10px',
                                borderRadius: '10px',
                                border: currentPlayer.insuranceType === id ? '2px solid #0b4ea6' : '1px solid #e2e8f0',
                                backgroundColor: currentPlayer.insuranceType === id ? '#eff6ff' : (available <= 0 ? '#f8fafc' : 'white'),
                                cursor: available <= 0 ? 'not-allowed' : 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.2s',
                                opacity: available <= 0 ? 0.6 : 1
                              }}
                            >
                              <div style={{ fontSize: '11px', fontWeight: '700', color: currentPlayer.insuranceType === id ? '#0b4ea6' : '#1e293b' }}>{seg?.nombre}</div>
                              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px' }}>Disponibles: {available}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    

                    {/* ANTECEDENTES INTERNACIONALES */}
                    <div style={{ marginBottom: '30px', backgroundColor: '#fff7ed', border: '1px solid #ffedd5', padding: '20px', borderRadius: '16px' }}>
                       <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#9a3412' }}>
                            2. Antecedentes internacionales
                          </h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                             <label style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>¿Jugador foráneo?</label>
                             <input 
                               type="checkbox" 
                               checked={currentPlayer.esForaneo}
                               onChange={(e) => setCurrentPlayer({...currentPlayer, esForaneo: e.target.checked})}
                               style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                             />
                          </div>
                       </div>
                       
                       {currentPlayer.esForaneo ? (
                         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Nacionalidad jugador</label>
                              <input type="text" value={currentPlayer.nacionalidadJugador} onChange={e => setCurrentPlayer({...currentPlayer, nacionalidadJugador: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>País de residencia</label>
                              <input type="text" value={currentPlayer.paisResidencia} onChange={e => setCurrentPlayer({...currentPlayer, paisResidencia: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>¿Ha vivido extranjero?</label>
                              <select value={currentPlayer.haVividoExtranjero ? '1' : '0'} onChange={e => setCurrentPlayer({...currentPlayer, haVividoExtranjero: e.target.value === '1'})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}>
                                 <option value="0">No</option>
                                 <option value="1">Sí</option>
                              </select>
                            </div>
                            {currentPlayer.haVividoExtranjero && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>¿Dónde?</label>
                                <input type="text" value={currentPlayer.dondeVividoExtranjero} onChange={e => setCurrentPlayer({...currentPlayer, dondeVividoExtranjero: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                              </div>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Nacionalidad padre</label>
                              <input type="text" value={currentPlayer.nacionalidadPadre} onChange={e => setCurrentPlayer({...currentPlayer, nacionalidadPadre: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Nacionalidad madre</label>
                              <input type="text" value={currentPlayer.nacionalidadMadre} onChange={e => setCurrentPlayer({...currentPlayer, nacionalidadMadre: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', gridColumn: '1 / -1' }}>
                              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Registro Asoc. Extranjera previo a FMF</label>
                              <textarea value={currentPlayer.registroAsociacionExtranjera} onChange={e => setCurrentPlayer({...currentPlayer, registroAsociacionExtranjera: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} rows={2}></textarea>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Nacionalidad abuelo paterno</label>
                              <input type="text" value={currentPlayer.nacAbueloPaterno} onChange={e => setCurrentPlayer({...currentPlayer, nacAbueloPaterno: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Nac. abuela paterna</label>
                              <input type="text" value={currentPlayer.nacAbuelaPaterna} onChange={e => setCurrentPlayer({...currentPlayer, nacAbuelaPaterna: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Nac. abuelo materno</label>
                              <input type="text" value={currentPlayer.nacAbueloMaterno} onChange={e => setCurrentPlayer({...currentPlayer, nacAbueloMaterno: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Nac. abuela materna</label>
                              <input type="text" value={currentPlayer.nacAbuelaMaterna} onChange={e => setCurrentPlayer({...currentPlayer, nacAbuelaMaterna: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', gridColumn: '1 / -1' }}>
                              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>¿Club extranjero o Torneos internacionales escolares?</label>
                              <textarea value={currentPlayer.juegoClubExtranjero} onChange={e => setCurrentPlayer({...currentPlayer, juegoClubExtranjero: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} rows={2}></textarea>
                            </div>
                         </div>
                       ) : (
                         <p style={{ margin: 0, fontSize: '12px', color: '#9a3412', fontStyle: 'italic' }}>
                            El jugador se considera nacional por defecto. Activa el interruptor si es foráneo para habilitar los campos.
                         </p>
                       )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '25px', borderTop: '1px solid #f1f5f9', gap: '15px' }}>
                       <div style={{ display: 'flex', gap: '10px' }}>
                         <button 
                          disabled={!currentPlayer.firstName}
                          style={{ 
                            background: 'none', border: 'none', color: !currentPlayer.firstName ? '#94a3b8' : '#0b4ea6', 
                            fontSize: '14px', fontWeight: '800', cursor: !currentPlayer.firstName ? 'not-allowed' : 'pointer', 
                            display: 'flex', alignItems: 'center', gap: '8px', opacity: !currentPlayer.firstName ? 0.6 : 1
                          }}
                          onClick={handleDownloadPlayerPDF}
                        >
                           📥 <span style={{ textDecoration: !currentPlayer.firstName ? 'none' : 'underline' }}>Descargar Formato</span>
                        </button>
                        {editingPlayerId && (
                          <button
                            onClick={resetPlayerForm}
                            style={{
                              background: 'none', border: 'none', color: '#64748b',
                              fontSize: '14px', fontWeight: '800', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                          >
                            ✕ Limpiar
                          </button>
                        )}
                       </div>

                      <button 
                        onClick={async () => {
                          const docs = currentPlayer.documents || {};
                          const hasMinDocs = docs.ine && docs.foto;
                          
                          // Validación básica
                          if (!currentPlayer.firstName || !currentPlayer.insuranceType || !hasMinDocs || !currentPlayer.positionId) {
                            Swal.fire('Atención', 'Por favor ingresa el nombre, selecciona posición, seguro y sube INE y Foto para continuar.', 'warning');
                            return;
                          }

                          // Validación estricta para Extranjeros
                          if (currentPlayer.esForaneo) {
                            const fields = [
                              'nacionalidadJugador', 'paisResidencia', 'nacionalidadPadre', 'nacionalidadMadre',
                              'registroAsociacionExtranjera', 'nacAbueloPaterno', 'nacAbuelaPaterna',
                              'nacAbueloMaterno', 'nacAbuelaMaterna', 'juegoClubExtranjero'
                            ];
                            const incomplete = fields.some(f => !String(currentPlayer[f] || '').trim());
                            const liveValid = !currentPlayer.haVividoExtranjero || (currentPlayer.haVividoExtranjero && String(currentPlayer.dondeVividoExtranjero || '').trim());
                            
                            if (incomplete || !liveValid) {
                              Swal.fire('Atención', 'Al ser extranjero, TODOS los campos de antecedentes internacionales son obligatorios.', 'warning');
                              return;
                            }
                          }

                          // Validar número de camiseta único
                          if (currentPlayer.shirtNumber) {
                            const duplicate = players.find(p => p.shirtNumber === currentPlayer.shirtNumber && p.id !== editingPlayerId);
                            if (duplicate) {
                              Swal.fire('Atención', `El número de camiseta ${currentPlayer.shirtNumber} ya está asignado a ${duplicate.firstName}.`, 'error');
                              return;
                            }
                          }

                          if (editingPlayerId) {
                            // Editar jugador existente
                            setPlayers(players.map(p => p.id === editingPlayerId ? { ...currentPlayer } : p));
                            Swal.fire({
                              title: '¡Actualizado!',
                              text: `La información de ${currentPlayer.firstName} ha sido actualizada.`,
                              icon: 'success',
                              timer: 2000,
                              showConfirmButton: false
                            });
                            resetPlayerForm();
                          } else {
                            // Registrar nuevo jugador
                            // 1. Descargamos el PDF
                            await handleDownloadPlayerPDF();
                            // 2. Guardamos el jugador pendiente y abrimos el modal premium
                            setPendingPlayer({ ...currentPlayer });
                            setSignedForm(null);
                            setShowFinishModal(true);
                          }
                        }}
                        style={{ padding: '14px 40px', background: 'linear-gradient(135deg, #0b4ea6 0%, #063f82 100%)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(11, 78, 166, 0.3)', fontSize: '15px' }}
                      >
                        {editingPlayerId ? '💾 Guardar Cambios' : '+ Registrar Jugador'}
                      </button>
                    </div>
                  </div>

                  {/* LATERAL: RESUMEN DE EQUIPO */}
                  <div>
                    <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '20px', border: '1px solid #e2e8f0', marginBottom: '25px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '900', color: '#0b4ea6', marginBottom: '20px', textTransform: 'uppercase' }}>Resumen de Seguros</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        {catalogs.seguros.map(seg => {
                          const id = seg.id.toString();
                          const count = players.filter(p => p.insuranceType === id).length;
                          const total = asignacionSeguros[id] || 0;
                          const percent = total > 0 ? (count / total) * 100 : 0;
                          return (
                            <div key={id}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                                 <span style={{ fontWeight: '700', color: '#475569' }}>{seg.nombre}</span>
                                 <span style={{ fontWeight: '900', color: '#1e293b' }}>{count} / {total}</span>
                              </div>
                              <div style={{ height: '10px', background: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
                                 <div style={{ width: `${percent}%`, height: '100%', background: 'linear-gradient(90deg, #0b4ea6, #60a5fa)', borderRadius: '5px', transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '900', color: '#0b4ea6', marginBottom: '20px', textTransform: 'uppercase' }}>Jugadores Agregados</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                        {players.length === 0 ? (
                          <div style={{ padding: '40px 10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '36px', marginBottom: '15px', opacity: 0.2 }}>🏃‍♂️</div>
                            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, fontWeight: '600' }}>Comienza agregando un jugador.</p>
                          </div>
                        ) : (
                          players.map(p => (
                            <div 
                              key={p.id} 
                              onClick={() => loadPlayerForEditing(p.id)}
                              style={{ 
                                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', 
                                background: editingPlayerId === p.id ? '#dbeafe' : '#f8fafc', 
                                borderRadius: '14px', 
                                border: editingPlayerId === p.id ? '2px solid #0b4ea6' : '1px solid #f1f5f9',
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                                boxShadow: editingPlayerId === p.id ? '0 4px 12px rgba(11, 78, 166, 0.15)' : 'none'
                              }}
                            >
                               <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: editingPlayerId === p.id ? 'linear-gradient(135deg, #0b4ea6 0%, #063f82 100%)' : 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '14px', transition: 'all 0.3s' }}>
                                 {p.firstName?.charAt(0) || 'J'}
                               </div>
                               <div style={{ flex: 1 }}>
                                 <div style={{ fontSize: '13px', fontWeight: editingPlayerId === p.id ? '900' : '800', color: editingPlayerId === p.id ? '#0b4ea6' : '#1e293b', transition: 'all 0.3s' }}>{p.firstName} {p.lastNamePaterno}</div>
                                 <div style={{ fontSize: '11px', color: '#64748b' }}>{catalogs.seguros.find(s => s.id.toString() === p.insuranceType)?.nombre}</div>
                               </div>
                               <button 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setPlayers(players.filter(pl => pl.id !== p.id));
                                   if (editingPlayerId === p.id) {
                                     resetPlayerForm();
                                   }
                                 }} 
                                 style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#fee2e2', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                 onMouseEnter={(e) => e.currentTarget.style.background = '#fecaca'}
                                 onMouseLeave={(e) => e.currentTarget.style.background = '#fee2e2'}
                               >
                                 ×
                               </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'center', gap: '20px' }}>
                   {!isAdmin && <button 
                    onClick={saveDraft}
                    style={{ padding: '14px 30px', background: '#f8fafc', color: '#0b4ea6', border: '1.5px solid #0b4ea6', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '15px' }}
                  >
                    💾 Guardar Borrador
                  </button>}
                  <button 
                    onClick={async () => {
                        try {
                          Swal.fire({
                            title: 'Guardando Equipo...',
                            text: 'Por favor espere mientras procesamos el registro y documentos.',
                            allowOutsideClick: false,
                            didOpen: () => { Swal.showLoading(); }
                          });

                          await teamsService.createTeamCompleto({
                            teamName: modalData.teamName,
                            presidente_id: isAdmin ? (selectedPresidentId || null) : null,
                            equipo_temporal_id: !isAdmin ? (equipoTemporalIdAgregar || pagoEquipo.equipoTemporalId || null) : null,
                            liga_id: formData.season,
                            modalidad_id: formData.modality,
                            categoria_id: formData.category,
                            rama_id: formData.rama,
                            players: players,
                            teamLogo: modalData.teamLogo
                          });

                          try {
                            const nextPreRegistro = { ...(preRegistro || {}) };
                            delete nextPreRegistro.equipo_temporal_id;
                            localStorage.setItem('afaem_pre_registro', JSON.stringify(nextPreRegistro));
                          } catch {}

                          setSuccessMessage(`El equipo "${modalData.teamName}" ha sido registrado exitosamente.`);
                          setShowSuccessModal(true);
                          Swal.close();
                        } catch (err) {
                          console.error("Error al guardar equipo:", err);
                          //Swal.fire('Error', 'No se pudo completar el registro. Inténtalo de nuevo más tarde', 'error');
                          
                          // Para debuguear: 
                          Swal.fire('Error', 'No se pudo completar el registro: ' + (err.response?.data?.detail || err.message), 'error');
                        }
                    }}
                    disabled={players.length === 0}
                    style={{ 
                      padding: '18px 60px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '18px',
                      cursor: players.length === 0 ? 'not-allowed' : 'pointer', opacity: players.length === 0 ? 0.5 : 1, transition: 'all 0.3s',
                      boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)'
                    }}
                  >
                    🚀 Finalizar Configuración y Registro
                  </button>
                </div>
              </div>
            )}
          </div>

          </>
        )}

      {/* MODAL CONFIGURACIÓN EQUIPO */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '40px', maxWidth: '500px', width: '90%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', animation: 'slideUp 0.3s ease-out' }}>
            <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#0b4ea6', marginBottom: '30px', textAlign: 'center' }}>Identidad del Equipo</h2>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', fontWeight: '800', marginBottom: '10px', color: '#1e293b', fontSize: '14px', textTransform: 'uppercase' }}>Nombre del Equipo</label>
              <input type="text" placeholder="Ej: Rayos de Afaem" value={modalData.teamName} onChange={handleTeamNameChange} style={{ width: '100%', padding: '14px', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '16px', fontWeight: '600' }} />
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', fontWeight: '800', marginBottom: '10px', color: '#1e293b', fontSize: '14px', textTransform: 'uppercase' }}>Escudo / Logo</label>
              <div style={{ position: 'relative', height: '100px', border: '2px dashed #cbd5e1', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
                 {modalData.teamLogo ? (
                   <div style={{ textAlign: 'center' }}>
                     <div style={{ fontSize: '24px' }}>🖼️</div>
                     <div style={{ fontSize: '12px', fontWeight: '700', color: '#059669' }}>{modalData.teamLogo.name}</div>
                   </div>
                 ) : (
                   <div style={{ textAlign: 'center' }}>
                     <div style={{ fontSize: '24px', opacity: 0.5 }}>📤</div>
                     <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>Haz click para subir</div>
                   </div>
                 )}
                 <input type="file" accept="image/*" onChange={handleTeamLogoChange} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
              </div>
            </div>

            <div style={{ background: '#f1f5f9', padding: '20px', borderRadius: '16px', marginBottom: '30px' }}>
              <div style={{ fontSize: '14px', marginBottom: '6px' }}><strong style={{ color: '#475569' }}>Modalidad:</strong> <span style={{ color: '#0b4ea6', fontWeight: '800' }}>{catalogs.modalidades.find(m => m.id === formData.modality)?.nombre}</span></div>
              <div style={{ fontSize: '14px', marginBottom: '6px' }}><strong style={{ color: '#475569' }}>Categoría:</strong> <span style={{ color: '#0b4ea6', fontWeight: '800' }}>{catalogs.categorias.find(c => c.id === formData.category)?.nombre}</span></div>
              <div style={{ fontSize: '14px' }}><strong style={{ color: '#475569' }}>Rama:</strong> <span style={{ color: '#0b4ea6', fontWeight: '800' }}>{catalogs.ramas.find(r => r.id === formData.rama)?.nombre}</span></div>
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <button onClick={handleCloseModal} style={{ flex: 1, padding: '14px', border: '2px solid #e2e8f0', background: 'white', borderRadius: '12px', cursor: 'pointer', fontWeight: '800', color: '#64748b' }}>Cerrar</button>
              <button onClick={handleGoToPlayers} style={{ flex: 1, padding: '14px', background: '#0b4ea6', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '900' }}>Confirmar y Sig. →</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXITO FINAL */}
      {showSuccessModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(8px)' }}>
          <div style={{ background: 'white', borderRadius: '30px', padding: '50px', textAlign: 'center', maxWidth: '450px', width: '90%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', animation: 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
             <div style={{ width: '100px', height: '100px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 30px', fontSize: '50px', color: '#10b981' }}>🏆</div>
             <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#1e293b', marginBottom: '15px' }}>¡Registro Completo!</h2>
             <p style={{ color: '#64748b', fontSize: '15px', lineHeight: '1.6', marginBottom: '35px' }}>{successMessage}</p>
             <button 
               onClick={handleSuccessModalContinue} 
               style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #0b4ea6 0%, #063f82 100%)', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '16px', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(11, 78, 166, 0.3)' }}
             >
               Continuar al Panel
             </button>
          </div>
        </div>
      )}

      {/* MODAL PREMIUM: SUBIR FORMATO FIRMADO */}
      <Modal
        estaAbierto={showFinishModal}
        titulo="Finalizar Inscripción de Jugador"
        alCerrar={() => setShowFinishModal(false)}
        tamanio="medio"
        pie={
          <>
            <BotonSecundario etiqueta="Cancelar" alHacerClick={() => setShowFinishModal(false)} />
            <BotonPrimario
              etiqueta="Finalizar Inscripción"
              icono={<FaCheckCircle />}
              alHacerClick={() => {
                if (!signedForm) {
                  Swal.fire('Atención', 'Debe subir el formato firmado para continuar.', 'warning');
                  return;
                }
                const finalPlayer = {
                  ...pendingPlayer,
                  documents: { ...pendingPlayer.documents, formato: signedForm }
                };
                setPlayers(prev => [...prev, finalPlayer]);
                setCurrentPlayer({
                  id: Date.now(),
                  firstName: '',
                  lastNamePaterno: '',
                  lastNameMaterno: '',
                  curp: '',
                  nui: '',
                  birthDate: '',
                  lugarNacimiento: '',
                  email: '',
                  telefono: '',
                  sexo_id: 1,
                  insuranceType: '',
                  esForaneo: false,
                  nacionalidadJugador: 'MEXICANA',
                  paisResidencia: 'MÉXICO',
                  haVividoExtranjero: false,
                  dondeVividoExtranjero: '',
                  nacionalidadPadre: '',
                  nacionalidadMadre: '',
                  registroAsociacionExtranjera: '',
                  nacAbueloPaterno: '',
                  nacAbuelaPaterna: '',
                  nacAbueloMaterno: '',
                  nacAbuelaMaterna: '',
                  juegoClubExtranjero: '',
                  shirtNumber: '',
                  positionId: '',
                  documents: {}
                });
                setPendingPlayer(null);
                setSignedForm(null);
                setShowFinishModal(false);
                Swal.fire({ title: '¡Éxito!', text: 'Jugador agregado correctamente.', icon: 'success', timer: 2000, showConfirmButton: false });
              }}
              deshabilitado={!signedForm}
            />
          </>
        }
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '25px',
            color: '#0369a1',
            fontSize: '14px',
            lineHeight: '1.6'
          }}>
            <p style={{ margin: 0, fontWeight: '700', marginBottom: '10px' }}>
              ¡Formato descargado con éxito!
            </p>
            <p style={{ margin: 0 }}>
              Hemos descargado automáticamente el formato de afiliación pre-llenado con la información proporcionada.
              <strong> A continuación debe subir el formato ya firmado</strong> para finalizar con la inscripción de este nuevo jugador al equipo.
            </p>
          </div>

          <div
            onClick={() => document.getElementById('presidente-signed-form').click()}
            style={{
              border: signedForm ? '2px solid #10b981' : '2px dashed #0ea5e9',
              borderRadius: '20px',
              padding: '40px 20px',
              backgroundColor: signedForm ? '#f0fdf4' : '#f8fafc',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            {signedForm ? (
              <div style={{ color: '#10b981' }}>
                <FaFilePdf style={{ fontSize: '50px', marginBottom: '15px' }} />
                <p style={{ margin: 0, fontWeight: '700' }}>{signedForm.name}</p>
                <p style={{ margin: '5px 0 0 0', fontSize: '12px' }}>Archivo listo para enviar</p>
              </div>
            ) : (
              <div style={{ color: '#0ea5e9' }}>
                <FaUpload style={{ fontSize: '50px', marginBottom: '15px' }} />
                <p style={{ margin: 0, fontWeight: '700' }}>Haga clic para subir el formato firmado</p>
                <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#64748b' }}>Solo se aceptan archivos PDF</p>
              </div>
            )}
            <input
              type="file"
              id="presidente-signed-form"
              style={{ display: 'none' }}
              accept=".pdf"
              onChange={(e) => {
                if (e.target.files[0]) {
                  setSignedForm(e.target.files[0]);
                }
              }}
            />
          </div>
        </div>
      </Modal>

      </div>
    </>
  );
}
