import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES } from '../../routes/paths';
import { getEquiposDirectorio, updateEquipo, exportarEquipoDocumentos, getPresidentesDirectorio, getCatalogosRegistro, getJugadoresEquipo } from '../../services/admin';
import Swal from 'sweetalert2';
import DashboardTable from '../../components/DashboardTable';
import SearchBar from '../../components/Common/SearchBar';
import { FaSearch, FaSyncAlt, FaSortAmountDown, FaSortAmountUp, FaPlus, FaEdit, FaEye, FaSave, FaShieldAlt, FaUser, FaCalendarDay, FaUserPlus, FaTable, FaFileArchive, FaCheckCircle, FaTimesCircle, FaClipboardList } from 'react-icons/fa';
import { Modal, BotonPrimario, BotonSecundario, EntradaFormulario, EntradaSeleccion } from '../../components/partials';
import Loader from '../../components/Loader';
import COLORS from '../../styles/colors';
import { API_BASE } from '../../config/config';
import { uploadTeamLogo } from '../../services/teams';

export default function AdminEquipos() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Helper para normalizar la ruta del logo del equipo
  const obtenerRutaLogo = (rutaLogo) => {
    if (!rutaLogo) return '';
    if (rutaLogo.startsWith('http')) return rutaLogo;
    let cleanPath = rutaLogo.replace(/\\/g, '/');
    if (!cleanPath.startsWith('uploads/') && !cleanPath.startsWith('/uploads/')) {
      cleanPath = `uploads/${cleanPath.startsWith('/') ? cleanPath.substring(1) : cleanPath}`;
    }
    return `${API_BASE}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
  };

  const fileInputRef = useRef(null);
  const [selectedTeamId, setSelectedTeamId] = useState(null);

  const handleAddLogoClick = (teamId) => {
    setSelectedTeamId(teamId);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire('Error', 'El archivo supera el peso máximo permitido (5 MB)', 'error');
      return;
    }

    try {
      Swal.fire({
        title: 'Cargando logo...',
        text: 'Por favor espera',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const response = await uploadTeamLogo(selectedTeamId, file);
      
      Swal.fire({
        title: '¡Éxito!',
        text: 'El logo se ha actualizado correctamente.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });

      setEquipoEdicion(prev => prev ? {
        ...prev,
        RutaLogo: response.ruta_logo
      } : null);

      loadEquipos(true, true);
    } catch (err) {
      console.error(err);
      Swal.fire('Error', err.response?.data?.detail || 'No se pudo cargar el logo del equipo', 'error');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const [esNavegacionCruzada, setEsNavegacionCruzada] = useState(false);

  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);

  // Estados para filtros, búsqueda y paginación
  const [filtroEstatus, setFiltroEstatus] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ESTADO PARA EDICIÓN (MODAL PROFESIONAL)
  const [modalEdicion, setModalEdicion] = useState(false);
  const [equipoEdicion, setEquipoEdicion] = useState(null);
  const [datosEditables, setDatosEditables] = useState({});
  const [haCambiado, setHaCambiado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // ESTADO PARA PRESIDENTE, ENTRENADOR Y CATÁLOGOS
  const [presidentes, setPresidentes] = useState([]);
  const [entrenadores, setEntrenadores] = useState([]);
  const [searchPresidente, setSearchPresidente] = useState('');
  const [searchEntrenador, setSearchEntrenador] = useState('');
  const [presidenteSeleccionado, setPresidenteSeleccionado] = useState(null);
  const [entrenadorSeleccionado, setEntrenadorSeleccionado] = useState(null);
  const [catalogos, setCatalogos] = useState({ ligas: [], modalidades: [], categorias: [], ramas: [] });
  const [collapseOpen, setCollapseOpen] = useState({ liga: false, modalidad: false, categoria: false, rama: false });
  const [catSeleccionada, setCatSeleccionada] = useState({ ligaId: null, modalidadId: null, categoriaId: null, ramaId: null });
  const [loadingExtras, setLoadingExtras] = useState(false);
  const [collapsePresidente, setCollapsePresidente] = useState(false);
  const [collapseEntrenador, setCollapseEntrenador] = useState(false);

  // Estados para descarga de documentos por equipo
  const [modalDescargaDocs, setModalDescargaDocs] = useState(false);
  const [equipoDescarga, setEquipoDescarga] = useState(null);
  const [jugadoresDescarga, setJugadoresDescarga] = useState([]);
  const [cargandoJugadoresDescarga, setCargandoJugadoresDescarga] = useState(false);

  useEffect(() => {
    loadEquipos();
  }, [navigate]);

  useEffect(() => {
    const idParaAbrir = searchParams.get('abrirDetalle');
    if (idParaAbrir && equipos.length > 0) {
      const eq = equipos.find(x => String(x.EquipoId) === idParaAbrir);
      if (eq) {
        setEsNavegacionCruzada(true);
        handleEditarEquipo(eq);
        const params = new URLSearchParams(searchParams);
        params.delete('abrirDetalle');
        setSearchParams(params, { replace: true });
      }
    }
  }, [searchParams, equipos]);

  const loadEquipos = async (forceRefresh = false, isTableOnly = false) => {
    try {
      if (isTableOnly) {
        setTableLoading(true);
      } else {
        setLoading(true);
      }
      const data = await getEquiposDirectorio(forceRefresh);
      setEquipos(data);
      setError(null);
    } catch (err) {
      console.error("Error al cargar equipos:", err);
      setError("Error al cargar el directorio de equipos.");
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filtroEstatus, searchTerm, sortOrder]);

  const filteredEquipos = React.useMemo(() => {
    let result = [...equipos];

    // Filtro por estatus
    if (filtroEstatus !== 'todos') {
      if (filtroEstatus === 'activos') {
        result = result.filter(s => !!s.Estatus);
      } else if (filtroEstatus === 'inactivos') {
        result = result.filter(s => !s.Estatus);
      }
    }

    // Búsqueda
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      result = result.filter(s =>
        (s.NombreEquipo && s.NombreEquipo.toLowerCase().includes(query)) ||
        (s.Liga && s.Liga.toLowerCase().includes(query)) ||
        (s.PresidenteNombreCompleto && s.PresidenteNombreCompleto.toLowerCase().includes(query)) ||
        (s.PresidenteEmail && s.PresidenteEmail.toLowerCase().includes(query)) ||
        (s.EquipoId && String(s.EquipoId).includes(query))
      );
    }

    // Ordenamiento
    result.sort((a, b) => {
      if (sortOrder === 'asc') return a.EquipoId - b.EquipoId;
      return b.EquipoId - a.EquipoId;
    });

    return result;
  }, [equipos, filtroEstatus, searchTerm, sortOrder]);

  const paginatedEquipos = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredEquipos.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEquipos, currentPage]);

  const stats = React.useMemo(() => {
    const activos = equipos.filter(e => e.Estatus === true).length;
    const inactivos = equipos.filter(e => e.Estatus === false).length;
    const totalJugadores = equipos.reduce((acc, eq) => acc + (eq.NumeroJugadoresRegistrados || 0), 0);
    const avgJugadores = equipos.length > 0 ? (totalJugadores / equipos.length).toFixed(1) : 0;

    return {
      total: equipos.length,
      activos: activos,
      inactivos: inactivos,
      avgJugadores: avgJugadores
    };
  }, [equipos]);

  const handleVerDetalles = async (equipo) => {
    const emailVal = equipo.PresidenteEmail || '';
    const esEmailTemporal = emailVal && (emailVal.includes('@temporary.afaem.com') || emailVal.startsWith('draft_'));
    const displayEmail = esEmailTemporal ? 'En espera de registro' : (emailVal || 'Sin correo');

    Swal.fire({
      title: 'Información del Equipo',
      html: `
        <div style="text-align: left;">
          <p><strong>ID:</strong> ${equipo.EquipoId}</p>
          <p><strong>Nombre:</strong> ${equipo.NombreEquipo}</p>
          <p><strong>Presidente:</strong> ${equipo.PresidenteNombreCompleto || 'Sin presidente'}</p>
          <p><strong>Email:</strong> ${displayEmail}</p>
          <p><strong>Entrenador:</strong> ${equipo.EntrenadorNombreCompleto || 'Sin entrenador asignado'}</p>
          <p><strong>Liga:</strong> ${equipo.Liga}</p>
          <p><strong>Categoría:</strong> ${equipo.Categoria} - ${equipo.Rama}</p>
          <p><strong>Jugadores Registrados:</strong> ${equipo.NumeroJugadoresRegistrados}</p>
          <p><strong>Creación:</strong> ${new Date(equipo.FechaCreacion).toLocaleDateString()}</p>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Cerrar'
    });
  };

  const handleEditarEquipo = async (equipo) => {
    setEquipoEdicion(equipo);
    setDatosEditables({
      nombre: equipo.NombreEquipo || '',
      estatus: equipo.Estatus ? '1' : '0'
    });
    // Pre-seleccionar presidente, entrenador y categorías actuales
    setPresidenteSeleccionado(equipo.PresidenteEquipoId || null);
    setEntrenadorSeleccionado(equipo.EntrenadorEquipoId || null);
    setCatSeleccionada({
      ligaId: equipo.LigaId || null,
      modalidadId: equipo.ModalidadId || null,
      categoriaId: equipo.CategoriaId || null,
      ramaId: equipo.RamaId || null
    });
    setSearchPresidente('');
    setSearchEntrenador('');
    setCollapseOpen({ liga: false, modalidad: false, categoria: false, rama: false });
    setCollapsePresidente(false);
    setCollapseEntrenador(false);
    setHaCambiado(false);
    setModalEdicion(true);

    // Cargar presidentes y catálogos en paralelo
    try {
      setLoadingExtras(true);
      const [presData, catData] = await Promise.all([
        getPresidentesDirectorio(),
        getCatalogosRegistro()
      ]);
      const activeDirectivos = Array.isArray(presData)
        ? presData.filter(p => p.estatus === 7 || p.estatusNombre === 'ACTIVO')
        : [];
      setPresidentes(activeDirectivos.filter(p => !p.esEntrenador));
      setEntrenadores(activeDirectivos.filter(p => p.esEntrenador));
      setCatalogos({
        ligas: catData?.ligas || [],
        modalidades: catData?.modalidades || [],
        categorias: catData?.categorias || [],
        ramas: catData?.ramas || []
      });
    } catch (err) {
      console.error('Error cargando catálogos/presidentes/entrenadores:', err);
    } finally {
      setLoadingExtras(false);
    }
  };

  const handleCerrarModal = () => {
    const limpiarParams = () => {
      if (esNavegacionCruzada) {
        setEsNavegacionCruzada(false);
        searchParams.delete('abrirDetalle');
        setSearchParams(searchParams, { replace: true });
      }
    };

    if (haCambiado) {
      Swal.fire({
        title: '¿Estás seguro de salir?',
        text: "Tienes cambios sin guardar que se perderán.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: COLORS.danger,
        cancelButtonColor: COLORS.slate500,
        confirmButtonText: 'Sí, salir sin guardar',
        cancelButtonText: 'Volver a la edición'
      }).then((result) => {
        if (result.isConfirmed) {
          setModalEdicion(false);
          setSearchPresidente('');
          setSearchEntrenador('');
          limpiarParams();
        }
      });
    } else {
      setModalEdicion(false);
      setSearchPresidente('');
      setSearchEntrenador('');
      limpiarParams();
    }
  };

  const manejarCambioInput = (e) => {
    const { name, value } = e.target;
    setDatosEditables(prev => ({ ...prev, [name]: value }));
    setHaCambiado(true);
  };

  const manejarGuardarEquipo = async () => {
    if (!datosEditables.nombre) {
      Swal.fire('Error', 'El nombre del equipo es obligatorio.', 'warning');
      return;
    }

    try {
      setGuardando(true);
      await updateEquipo(
        equipoEdicion.EquipoId,
        datosEditables.nombre,
        datosEditables.estatus,
        {
          presidenteEquipoId: presidenteSeleccionado,
          entrenadorEquipoId: entrenadorSeleccionado,
          ligaId: catSeleccionada.ligaId,
          modalidadId: catSeleccionada.modalidadId,
          categoriaId: catSeleccionada.categoriaId,
          ramaId: catSeleccionada.ramaId
        }
      );
      Swal.fire('¡Éxito!', 'Información del equipo actualizada correctamente.', 'success');
      setModalEdicion(false);
      loadEquipos(true);
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudieron guardar los cambios.', 'error');
    } finally {
      setGuardando(false);
    }
  };

  const handleExportarEquipo = async (equipo) => {
    try {
      Swal.fire({
        title: 'Generando expediente...',
        text: 'Preparando archivos del equipo',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const response = await exportarEquipoDocumentos(equipo.EquipoId);

      const blob = new Blob([response.data], { type: 'application/zip' });

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;

      // Nombre del archivo: NombreEquipo_fecha_actual.zip
      const nombreEquipo = (equipo.NombreEquipo || 'equipo')
        .trim()
        .replace(/[\\/:*?"<>|]+/g, '')
        .replace(/\s+/g, '_');
      const hoy = new Date().toISOString().split('T')[0];
      const nombre = `${nombreEquipo}_${hoy}.zip`;
      a.download = nombre;

      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);

      Swal.close();

    } catch (error) {
      console.error("Error exportando:", error);
      Swal.fire('Error', 'No se pudo generar el expediente del equipo', 'error');
    }
  };

  const handleMostrarDescargaDocs = async (equipo) => {
    setEquipoDescarga(equipo);
    setJugadoresDescarga([]);
    setModalDescargaDocs(true);
    setCargandoJugadoresDescarga(true);
    try {
      const jugadores = await getJugadoresEquipo(equipo.EquipoId);
      setJugadoresDescarga(jugadores || []);
    } catch (err) {
      console.error('Error cargando jugadores para descarga:', err);
      Swal.fire('Error', 'No se pudieron cargar los jugadores del equipo.', 'error');
    } finally {
      setCargandoJugadoresDescarga(false);
    }
  };

  const handleConfirmarDescarga = async () => {
    setModalDescargaDocs(false);
    if (equipoDescarga) {
      await handleExportarEquipo(equipoDescarga);
    }
  };

  const columns = [
    { key: "EquipoId", label: "ID" },
    { key: "Logo", label: "Logo" },
    { key: "NombreEquipo", label: "Equipo" },
    { key: "Liga", label: "Liga / Cat." },
    { key: "Presidente", label: "Presidente Resp." },
    { key: "NumeroJugadoresRegistrados", label: "# Jugadores" },
    { key: "Estatus", label: "Estatus" },
    { key: "Acciones", label: "Opciones" }
  ];

  const dataTransformada = paginatedEquipos.map(eq => ({
    _original: eq,
    EquipoId: <span style={{ fontWeight: '700', color: COLORS.slate500 }}>#{eq.EquipoId}</span>,
    Logo: eq.RutaLogo ? (
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '8px',
        overflow: 'hidden',
        border: `1.5px solid ${COLORS.slate200}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc'
      }}>
        <img
          src={obtenerRutaLogo(eq.RutaLogo)}
          alt={eq.NombreEquipo}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    ) : (
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fff7ed',
        border: '1px solid #ffedd5'
      }}>
        <FaShieldAlt style={{ fontSize: '20px', color: '#f97316' }} />
      </div>
    ),
    NombreEquipo: <span style={{ fontWeight: '800', color: COLORS.slate800 }}>{eq.NombreEquipo}</span>,
    Liga: (
      <div>
        <div style={{ fontWeight: '700', fontSize: '13px' }}>{eq.Liga}</div>
        <div style={{ fontSize: '11px', color: COLORS.slate500 }}>{eq.Categoria} - {eq.Rama}</div>
      </div>
    ),
    Presidente: eq.PresidenteNombreCompleto ? (() => {
      const emailVal = eq.PresidenteEmail || '';
      const esEmailTemporal = emailVal && (emailVal.includes('@temporary.afaem.com') || emailVal.startsWith('draft_'));
      return (
        <div>
          <div
            style={{ fontWeight: '600', fontSize: '13px', cursor: 'pointer', color: COLORS.primary, textDecoration: 'underline' }}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`${ROUTES.ADMIN.PRESIDENTES}?abrirDetalle=${eq.PresidenteEquipoId}`);
            }}
            title="Ver detalle del presidente"
          >
            {eq.PresidenteNombreCompleto}
          </div>
          {esEmailTemporal ? (
            <div style={{ fontSize: '11px', color: COLORS.slate500, fontStyle: 'italic', fontWeight: 600 }}>En espera de registro</div>
          ) : (
            <div style={{ fontSize: '11px', color: COLORS.slate500 }}>{emailVal}</div>
          )}
        </div>
      );
    })() : (
      <div style={{
        background: COLORS.dangerBg,
        color: COLORS.dangerDeep,
        padding: '6px 14px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '800',
        border: `1px solid ${COLORS.dangerBgMedium}`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        ⚠️ SIN PRESIDENTE
      </div>
    ),
    NumeroJugadoresRegistrados: (
      <span style={{ fontWeight: '800', color: COLORS.slate900, background: COLORS.slate100, padding: '4px 10px', borderRadius: '20px' }}>
        {eq.NumeroJugadoresRegistrados || 0}/{eq.SlotsComprados || 0}
      </span>
    ),
    Estatus: eq.Estatus ?
      <span className="badge" style={{ background: COLORS.successBg, color: COLORS.successDark, border: `1px solid ${COLORS.successBgDark}` }}>ACTIVO</span> :
      <span className="badge" style={{ background: COLORS.dangerBgLight, color: COLORS.dangerDark, border: `1px solid ${COLORS.dangerBgMedium}` }}>INACTIVO</span>,
    Acciones: (
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'nowrap' }}>
        {/* Editar */}
        <button
          className="btn btn-sm btn-primary"
          style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}
          onClick={(e) => { e.stopPropagation(); handleEditarEquipo(eq); }}
          title="Editar equipo"
        >
          <FaEdit />
        </button>
        {/* Jugadores */}
        <button
          className="btn btn-sm btn-primary"
          style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', whiteSpace: 'nowrap' }}
          onClick={(e) => { e.stopPropagation(); navigate(`${ROUTES.ADMIN.LAYOUT_JUGADORES}?equipo=${encodeURIComponent(eq.NombreEquipo)}`); }}
          title="Ver jugadores del equipo"
        >
          <FaTable /> Jugadores
        </button>
        {/* Descargar Docs */}
        <button
          className="btn btn-sm"
          style={{
            padding: '6px 10px',
            fontSize: '12px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: '700',
            background: 'white',
            color: (eq.NumeroJugadoresRegistrados || 0) === 0 ? COLORS.slate400 : COLORS.successDark,
            border: (eq.NumeroJugadoresRegistrados || 0) === 0 ? `1.5px solid ${COLORS.slate300}` : `1.5px solid ${COLORS.green300}`,
            whiteSpace: 'nowrap',
            cursor: (eq.NumeroJugadoresRegistrados || 0) === 0 ? 'not-allowed' : 'pointer'
          }}
          disabled={(eq.NumeroJugadoresRegistrados || 0) === 0}
          onClick={(e) => {
            e.stopPropagation();
            handleMostrarDescargaDocs(eq);
          }}
          title={(eq.NumeroJugadoresRegistrados || 0) === 0 ? "No hay ningún jugador en el equipo" : "Descargar documentos de todos los jugadores del equipo"}
        >
          <FaFileArchive /> Docs
        </button>
        {/* Agregar Jugador */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(ROUTES.ADMIN.EQUIPOS_COMPLETAR.replace(':equipoId', eq.EquipoId));
          }}
          style={{
            padding: '6px 10px',
            borderRadius: '8px',
            border: `1.5px solid ${COLORS.slate300}`,
            background: 'white',
            color: COLORS.primary,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            fontWeight: '700'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = COLORS.slate100;
            e.currentTarget.style.borderColor = COLORS.slate400;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
            e.currentTarget.style.borderColor = COLORS.slate300;
          }}
          title="Agregar Jugador"
        >
          <FaUserPlus />
        </button>
      </div>
    )
  }));

  const handleRowClick = (row) => {
    const eq = row._original;
    if (!eq) return;
    
    Swal.fire({
      title: `Gestión de Jugadores: ${eq.NombreEquipo}`,
      text: 'Selecciona la acción que deseas realizar con los jugadores de este equipo:',
      icon: 'question',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: '📋 Ir a lista general',
      denyButtonText: '✏️ Ir a editar jugadores',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: COLORS.primary,
      denyButtonColor: COLORS.success,
      cancelButtonColor: COLORS.slate500,
      customClass: {
        confirmButton: 'mx-2 my-1',
        denyButton: 'mx-2 my-1',
        cancelButton: 'mx-2 my-1'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        navigate(ROUTES.ADMIN.EQUIPOS_JUGADORES.replace(':equipoId', eq.EquipoId));
      } else if (result.isDenied) {
        navigate(`${ROUTES.ADMIN.JUGADORES}?equipo=${encodeURIComponent(eq.NombreEquipo)}`);
      }
    });
  };


  if (loading && equipos.length === 0) {
    return <Loader text="Cargando directorio de equipos..." />;
  }

  return (
    <div className="dashboard-content">
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
          <span className="alert-icon">⚠️</span>
          <div className="alert-content">
            <p className="alert-message">{error}</p>
          </div>
        </div>
      )}

      <div className="section-header" style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="section-title" style={{ fontSize: '22px', fontWeight: '800', color: COLORS.slate800, margin: 0 }}>Directorio de equipos</h2>
          <p style={{ margin: 0, fontSize: '14px', color: COLORS.slate500, marginTop: '4px' }}>Visualiza los equipos registrados.</p>
        </div>
        <div className="section-actions" style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn btn-premium"
            onClick={() => navigate(ROUTES.ADMIN.EQUIPOS_CREAR)}
            style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <FaPlus /> Crear equipo
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        {/* TARJETA TOTAL */}
        <div
          onClick={() => setFiltroEstatus('todos')}
          style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            border: filtroEstatus === 'todos' ? `2px solid ${COLORS.primary}` : `1px solid ${COLORS.slate200}`,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: filtroEstatus === 'todos' ? `0 4px 12px ${COLORS.primaryBgTranslucent}` : 'none',
            transform: filtroEstatus === 'todos' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '5px', color: COLORS.primary }}><FaClipboardList /></div>
          <div style={{ fontSize: '12px', color: COLORS.slate500, fontWeight: '700' }}>TOTAL EQUIPOS</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: COLORS.slate800 }}>{stats.total}</div>
        </div>

        {/* TARJETA ACTIVOS */}
        <div
          onClick={() => setFiltroEstatus('activos')}
          style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            border: filtroEstatus === 'activos' ? `2px solid ${COLORS.success}` : `1px solid ${COLORS.slate200}`,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: filtroEstatus === 'activos' ? `0 4px 12px ${COLORS.successBgTranslucent}` : 'none',
            transform: filtroEstatus === 'activos' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '5px', color: COLORS.success }}><FaCheckCircle /></div>
          <div style={{ fontSize: '12px', color: COLORS.slate500, fontWeight: '700' }}>EQUIPOS ACTIVOS</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: COLORS.success }}>{stats.activos}</div>
        </div>

        {/* TARJETA INACTIVOS */}
        <div
          onClick={() => setFiltroEstatus('inactivos')}
          style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            border: filtroEstatus === 'inactivos' ? `2px solid ${COLORS.danger}` : `1px solid ${COLORS.slate200}`,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: filtroEstatus === 'inactivos' ? `0 4px 12px ${COLORS.dangerBgTranslucent}` : 'none',
            transform: filtroEstatus === 'inactivos' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '5px', color: COLORS.danger }}><FaTimesCircle /></div>
          <div style={{ fontSize: '12px', color: COLORS.slate500, fontWeight: '700' }}>EQUIPOS INACTIVOS</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: COLORS.danger }}>{stats.inactivos}</div>
        </div>
      </div>

      <div className="card" style={{ padding: '35px', border: 'none', boxShadow: `0 10px 15px -3px ${COLORS.shadow05}` }}>
        <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', overflow: 'hidden' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>Lista de equipos</h3>

          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', overflowX: 'auto', overflowY: 'hidden', maxWidth: '100%', scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}>
            <SearchBar
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar equipo por nombre o id..."
              width="280px"
            />

            <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} style={{ background: 'white', border: '1.5px solid var(--border-light)', padding: '10px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.slate600 }}>
              {sortOrder === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />} {sortOrder === 'asc' ? 'ANT' : 'REC'}
            </button>

            <button onClick={() => loadEquipos(true, true)} className="btn-premium" style={{ padding: '10px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaSyncAlt />
            </button>

            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-main)', padding: '5px', borderRadius: '14px', border: '1.5px solid var(--border-light)' }}>
              {['todos', 'activos', 'inactivos'].map((val) => (
                <button key={val} onClick={() => setFiltroEstatus(val)} style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: filtroEstatus === val ? 'white' : 'transparent', color: filtroEstatus === val ? 'var(--primary)' : 'var(--text-muted)', boxShadow: filtroEstatus === val ? 'var(--shadow-sm)' : 'none', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>
                  {val === 'todos' ? 'Todos' : (val === 'activos' ? 'Activos' : 'Inactivos')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DashboardTable
          columns={columns}
          data={dataTransformada}
          isLoading={loading || tableLoading}
          totalItems={filteredEquipos.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onRowClick={handleRowClick}
          emptyMessage="No se encontraron equipos con los criterios de búsqueda."
        />
      </div>

      {/* MODAL DE EDICIÓN PROFESIONAL */}
      <Modal
        estaAbierto={modalEdicion}
        alCerrar={handleCerrarModal}
        titulo="Detalles y gestión del equipo"
        tamanio="grande"
        bloquearCierreFondo={true}
        pie={
          <>
            <BotonSecundario etiqueta="Cancelar" onClick={handleCerrarModal} />
            <BotonPrimario
              etiqueta={guardando ? 'Guardando...' : 'Guardar cambios'}
              onClick={manejarGuardarEquipo}
              deshabilitado={guardando}
              icono={<FaSave />}
            />
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
          <div style={{
            gridColumn: 'span 2',
            background: COLORS.warningBgTranslucent08,
            border: `1px solid ${COLORS.warningBgTranslucent20}`,
            padding: '16px 20px',
            borderRadius: '16px',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: `0 4px 6px -1px ${COLORS.warningBgTranslucent05}`
          }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: equipoEdicion?.RutaLogo ? 'none' : `0 4px 12px ${COLORS.warningBgTranslucent30}`,
              background: equipoEdicion?.RutaLogo ? 'white' : COLORS.warning,
              border: equipoEdicion?.RutaLogo ? `1px solid ${COLORS.slate200}` : 'none',
              overflow: 'hidden',
              flexShrink: 0
            }}>
              {equipoEdicion?.RutaLogo ? (
                <img
                  src={obtenerRutaLogo(equipoEdicion.RutaLogo)}
                  alt="Logo del equipo"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <FaShieldAlt style={{ fontSize: '22px', color: 'white' }} />
              )}
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '15px', color: COLORS.warningBrown, fontWeight: '800' }}>Edición de Ficha de equipo</h4>
              <p style={{ margin: 0, fontSize: '13px', color: COLORS.warningBrown, fontWeight: '500', marginTop: '2px' }}>Edita la información oficial del equipo.</p>
            </div>
            {equipoEdicion && (
              <div style={{ marginLeft: 'auto' }}>
                <button
                  type="button"
                  onClick={() => handleAddLogoClick(equipoEdicion.EquipoId)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: '800',
                    borderRadius: '10px',
                    backgroundColor: COLORS.warning,
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: `0 4px 12px ${COLORS.warningBgTranslucent30}`,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = `0 6px 16px ${COLORS.warningBgTranslucent30}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = `0 4px 12px ${COLORS.warningBgTranslucent30}`;
                  }}
                >
                  {equipoEdicion.RutaLogo ? 'Reemplazar Logo' : 'Subir Logo'}
                </button>
              </div>
            )}
          </div>

          <EntradaFormulario
            etiqueta="Nombre del equipo"
            valor={datosEditables.nombre}
            onChange={manejarCambioInput}
            nombre="nombre"
            obligatorio
            placeholder="Ej: Rayados de Monterrey"
          />

          <EntradaSeleccion
            etiqueta="Estatus operativo"
            valor={datosEditables.estatus}
            onChange={manejarCambioInput}
            nombre="estatus"
            opciones={[
              { valor: '1', etiqueta: 'Activo' },
              { valor: '0', etiqueta: 'Inactivo' }
            ]}
          />

          {equipoEdicion && (
            <div style={{ gridColumn: 'span 2' }}>

              {/* ACCESO A JUGADORES FILTRADOS */}
              <div style={{
                marginBottom: '16px',
                padding: '12px 20px',
                background: `linear-gradient(135deg, ${COLORS.greenBg50} 0%, ${COLORS.greenBg} 100%)`,
                border: `1px solid ${COLORS.greenBgDark}`,
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: `0 4px 6px -1px ${COLORS.greenMediumTranslucent}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>👥</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: COLORS.greenDarker }}>Ver jugadores del equipo</div>
                    <div style={{ fontSize: '12px', color: COLORS.greenDark, marginTop: '1px' }}>
                      Ver catálogo de jugadores de: <strong>{equipoEdicion.NombreEquipo}</strong>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const irAJugadores = () => {
                      setModalEdicion(false);
                      if (esNavegacionCruzada) {
                        setEsNavegacionCruzada(false);
                        searchParams.delete('abrirDetalle');
                        setSearchParams(searchParams, { replace: true });
                      }
                      navigate(`${ROUTES.ADMIN.JUGADORES}?equipo=${encodeURIComponent(equipoEdicion.NombreEquipo)}`, {
                        state: { filtroEquipo: equipoEdicion.NombreEquipo }
                      });
                    };

                    if (haCambiado) {
                      Swal.fire({
                        title: '¿Estás seguro de salir?',
                        text: "Tienes cambios sin guardar que se perderán.",
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: COLORS.danger,
                        cancelButtonColor: COLORS.slate500,
                        confirmButtonText: 'Sí, salir sin guardar',
                        cancelButtonText: 'Cancelar navegación'
                      }).then((result) => {
                        if (result.isConfirmed) {
                          setSearchPresidente('');
                          irAJugadores();
                        }
                      });
                    } else {
                      setSearchPresidente('');
                      irAJugadores();
                    }
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: `1px solid ${COLORS.greenDarker}`,
                    background: COLORS.greenDarker,
                    color: 'white',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                    boxShadow: `0 2px 4px ${COLORS.greenDeepTranslucent}`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = COLORS.greenDark;
                    e.currentTarget.style.borderColor = COLORS.greenDark;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = COLORS.greenDarker;
                    e.currentTarget.style.borderColor = COLORS.greenDarker;
                  }}
                >
                  <FaTable /> Ver catálogo
                </button>
              </div>

              {/* ── SECCIÓN: PRESIDENTE RESPONSABLE ── */}
              <div style={{ marginBottom: '16px', border: `1px solid ${COLORS.slate200}`, borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', background: `linear-gradient(135deg, ${COLORS.secondaryBg} 0%, ${COLORS.secondaryBg100} 100%)`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <FaUser style={{ color: COLORS.primary, fontSize: '16px' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: COLORS.blueDark }}>Presidente responsable</div>
                    <div style={{ fontSize: '12px', color: COLORS.blue, marginTop: '1px' }}>
                      {(() => {
                        const pid = presidenteSeleccionado || equipoEdicion.PresidenteEquipoId;
                        const pName = presidenteSeleccionado
                          ? (() => { const p = presidentes.find(x => x.id === presidenteSeleccionado); return p ? p.nombre : equipoEdicion.PresidenteNombreCompleto; })()
                          : equipoEdicion.PresidenteNombreCompleto;

                        return pid && pName ? (
                          <span
                            style={{ cursor: 'pointer', color: COLORS.blueDark, textDecoration: 'underline' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              const irAlPresidente = () => {
                                setModalEdicion(false);
                                if (esNavegacionCruzada) {
                                  setEsNavegacionCruzada(false);
                                  searchParams.delete('abrirDetalle');
                                  setSearchParams(searchParams, { replace: true });
                                }
                                navigate(`${ROUTES.ADMIN.PRESIDENTES}?abrirDetalle=${pid}`);
                              };

                              if (haCambiado) {
                                Swal.fire({
                                  title: '¿Estás seguro de salir?',
                                  text: "Tienes cambios sin guardar que se perderán.",
                                  icon: 'warning',
                                  showCancelButton: true,
                                  confirmButtonColor: COLORS.danger,
                                  cancelButtonColor: COLORS.slate500,
                                  confirmButtonText: 'Sí, salir sin guardar',
                                  cancelButtonText: 'Cancelar navegación'
                                }).then((result) => {
                                  if (result.isConfirmed) {
                                    setSearchPresidente('');
                                    irAlPresidente();
                                  }
                                });
                              } else {
                                setSearchPresidente('');
                                irAlPresidente();
                              }
                            }}
                            title="Ver detalle del presidente"
                          >
                            {pName}
                          </span>
                        ) : (
                          pName || 'Sin Presidente Asignado'
                        );
                      })()}
                    </div>
                  </div>
                  {loadingExtras && <span style={{ fontSize: '11px', color: COLORS.slate500 }}>Sincronizando...</span>}
                </div>

                <button
                  type="button"
                  onClick={() => setCollapsePresidente(!collapsePresidente)}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    background: collapsePresidente ? COLORS.slate50 : 'white',
                    border: 'none',
                    borderTop: `1px solid ${COLORS.slate200}`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'background 0.2s',
                  }}
                >
                  <span style={{ fontWeight: '700', fontSize: '13px', color: COLORS.primary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Cambiar presidente
                  </span>
                  <span style={{ color: COLORS.slate400, fontSize: '12px' }}>
                    {collapsePresidente ? '▲' : '▼'}
                  </span>
                </button>

                {collapsePresidente && (
                  <div style={{ padding: '16px 20px', background: 'white', borderTop: `1px solid ${COLORS.slate100}` }}>
                    <input
                      type="text"
                      placeholder="Buscar presidente por nombre..."
                      value={searchPresidente}
                      onChange={e => setSearchPresidente(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', border: `1.5px solid ${COLORS.secondaryBg100}`, borderRadius: '10px', fontSize: '13px', marginBottom: '10px', outline: 'none', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', background: COLORS.greenBg, color: COLORS.greenDarker, padding: '2px 8px', borderRadius: '20px', fontWeight: '700' }}>
                        Solo presidentes con estatus Activo
                      </span>
                    </div>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: `1px solid ${COLORS.slate100}`, borderRadius: '10px' }}>
                      {loadingExtras ? (
                        <Loader inline text="Cargando presidentes..." />
                      ) : presidentes.filter(p => !searchPresidente || p.nombre.toLowerCase().includes(searchPresidente.toLowerCase())).length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: COLORS.slate400, fontSize: '13px' }}>No se encontraron presidentes</div>
                      ) : (
                        presidentes
                          .filter(p => !searchPresidente || p.nombre.toLowerCase().includes(searchPresidente.toLowerCase()))
                          .map(p => (
                            <div
                              key={p.id}
                              onClick={() => { setPresidenteSeleccionado(p.id); setHaCambiado(true); }}
                              style={{
                                padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                                borderBottom: `1px solid ${COLORS.slate50}`, transition: 'background 0.15s',
                                backgroundColor: presidenteSeleccionado === p.id ? COLORS.secondaryBg : 'white'
                              }}
                            >
                              <div style={{
                                width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                                background: presidenteSeleccionado === p.id ? COLORS.primary : COLORS.slate100,
                                color: presidenteSeleccionado === p.id ? 'white' : COLORS.slate500,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '11px', fontWeight: '800'
                              }}>
                                {p.nombre.charAt(0).toUpperCase()}
                              </div>
                              <span style={{ fontSize: '13px', fontWeight: presidenteSeleccionado === p.id ? '700' : '500', color: COLORS.slate800, flex: 1 }}>{p.nombre}</span>
                              {presidenteSeleccionado === p.id && <span style={{ color: COLORS.primary, fontWeight: '800' }}>✓</span>}
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ── SECCIÓN: ENTRENADOR RESPONSABLE ── */}
              <div style={{ marginBottom: '16px', border: `1px solid ${COLORS.slate200}`, borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', background: `linear-gradient(135deg, ${COLORS.greenBg50} 0%, ${COLORS.greenBg} 100%)`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <FaUser style={{ color: COLORS.greenDark, fontSize: '16px' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: COLORS.greenDark }}>Entrenador responsable</div>
                    <div style={{ fontSize: '12px', color: COLORS.green, marginTop: '1px' }}>
                      {(() => {
                        const eid = entrenadorSeleccionado || equipoEdicion.EntrenadorEquipoId;
                        const eName = entrenadorSeleccionado
                          ? (() => { const e = entrenadores.find(x => x.id === entrenadorSeleccionado); return e ? e.nombre : equipoEdicion.EntrenadorNombreCompleto; })()
                          : equipoEdicion.EntrenadorNombreCompleto;

                        return eid && eName && eName !== 'Sin entrenador asignado' ? (
                          <span
                            style={{ cursor: 'pointer', color: COLORS.greenDark, textDecoration: 'underline' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              const irAlEntrenador = () => {
                                setModalEdicion(false);
                                if (esNavegacionCruzada) {
                                  setEsNavegacionCruzada(false);
                                  searchParams.delete('abrirDetalle');
                                  setSearchParams(searchParams, { replace: true });
                                }
                                navigate(`${ROUTES.ADMIN.PRESIDENTES}?abrirDetalle=${eid}`);
                              };

                              if (haCambiado) {
                                Swal.fire({
                                  title: '¿Estás seguro de salir?',
                                  text: "Tienes cambios sin guardar que se perderán.",
                                  icon: 'warning',
                                  showCancelButton: true,
                                  confirmButtonColor: COLORS.danger,
                                  cancelButtonColor: COLORS.slate500,
                                  confirmButtonText: 'Sí, salir sin guardar',
                                  cancelButtonText: 'Cancelar navegación'
                                }).then((result) => {
                                  if (result.isConfirmed) {
                                    setSearchEntrenador('');
                                    irAlEntrenador();
                                  }
                                });
                              } else {
                                setSearchEntrenador('');
                                irAlEntrenador();
                              }
                            }}
                            title="Ver detalle del entrenador"
                          >
                            {eName}
                          </span>
                        ) : (
                          eName || 'Sin entrenador asignado'
                        );
                      })()}
                    </div>
                  </div>
                  {loadingExtras && <span style={{ fontSize: '11px', color: COLORS.slate500 }}>Sincronizando...</span>}
                </div>

                <button
                  type="button"
                  onClick={() => setCollapseEntrenador(!collapseEntrenador)}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    background: collapseEntrenador ? COLORS.slate50 : 'white',
                    border: 'none',
                    borderTop: `1px solid ${COLORS.slate200}`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'background 0.2s',
                  }}
                >
                  <span style={{ fontWeight: '700', fontSize: '13px', color: COLORS.greenDark, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Cambiar entrenador
                  </span>
                  <span style={{ color: COLORS.slate400, fontSize: '12px' }}>
                    {collapseEntrenador ? '▲' : '▼'}
                  </span>
                </button>

                {collapseEntrenador && (
                  <div style={{ padding: '16px 20px', background: 'white', borderTop: `1px solid ${COLORS.slate100}` }}>
                    <input
                      type="text"
                      placeholder="Buscar entrenador por nombre..."
                      value={searchEntrenador}
                      onChange={e => setSearchEntrenador(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', border: `1.5px solid ${COLORS.greenBg}`, borderRadius: '10px', fontSize: '13px', marginBottom: '10px', outline: 'none', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', background: COLORS.greenBg, color: COLORS.greenDarker, padding: '2px 8px', borderRadius: '20px', fontWeight: '700' }}>
                        Solo entrenadores con estatus Activo
                      </span>
                    </div>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: `1px solid ${COLORS.slate100}`, borderRadius: '10px' }}>
                      {loadingExtras ? (
                        <Loader inline text="Cargando entrenadores..." />
                      ) : (
                        <>
                          {entrenadores.length > 0 && (
                            <div
                              onClick={() => { setEntrenadorSeleccionado(null); setHaCambiado(true); }}
                              style={{
                                padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                                borderBottom: `1px solid ${COLORS.slate50}`, transition: 'background 0.15s',
                                backgroundColor: entrenadorSeleccionado === null ? COLORS.greenBg50 : 'white'
                              }}
                            >
                              <div style={{
                                width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                                background: entrenadorSeleccionado === null ? COLORS.greenDark : COLORS.slate100,
                                color: entrenadorSeleccionado === null ? 'white' : COLORS.slate500,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '14px', fontWeight: '800'
                              }}>
                                ∅
                              </div>
                              <span style={{ fontSize: '13px', fontWeight: entrenadorSeleccionado === null ? '700' : '500', color: COLORS.dangerDark, flex: 1 }}>Sin entrenador (desasignar)</span>
                              {entrenadorSeleccionado === null && <span style={{ color: COLORS.greenDark, fontWeight: '800' }}>✓</span>}
                            </div>
                          )}

                          {entrenadores.filter(p => !searchEntrenador || p.nombre.toLowerCase().includes(searchEntrenador.toLowerCase())).length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: COLORS.slate400, fontSize: '13px' }}>No se encontraron entrenadores</div>
                          ) : (
                            entrenadores
                              .filter(p => !searchEntrenador || p.nombre.toLowerCase().includes(searchEntrenador.toLowerCase()))
                              .map(p => (
                                <div
                                  key={p.id}
                                  onClick={() => { setEntrenadorSeleccionado(p.id); setHaCambiado(true); }}
                                  style={{
                                    padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                                    borderBottom: `1px solid ${COLORS.slate50}`, transition: 'background 0.15s',
                                    backgroundColor: entrenadorSeleccionado === p.id ? COLORS.greenBg50 : 'white'
                                  }}
                                >
                                  <div style={{
                                    width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                                    background: entrenadorSeleccionado === p.id ? COLORS.greenDark : COLORS.slate100,
                                    color: entrenadorSeleccionado === p.id ? 'white' : COLORS.slate500,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '11px', fontWeight: '800'
                                  }}>
                                    {p.nombre.charAt(0).toUpperCase()}
                                  </div>
                                  <span style={{ fontSize: '13px', fontWeight: entrenadorSeleccionado === p.id ? '700' : '500', color: COLORS.slate800, flex: 1 }}>{p.nombre}</span>
                                  {entrenadorSeleccionado === p.id && <span style={{ color: COLORS.greenDark, fontWeight: '800' }}>✓</span>}
                                </div>
                              ))
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ── SECCIÓN: ASIGNACIÓN DE LIGA ── */}
              <div style={{ marginBottom: '10px', border: `1px solid ${COLORS.slate200}`, borderRadius: '14px', overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => setCollapseOpen(prev => ({ ...prev, liga: !prev.liga }))}
                  style={{
                    width: '100%', padding: '13px 18px', background: collapseOpen.liga ? COLORS.slate50 : 'white',
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                    borderBottom: collapseOpen.liga ? `1px solid ${COLORS.slate200}` : 'none', transition: 'background 0.2s'
                  }}
                >
                  <span style={{ fontSize: '16px' }}>🏆</span>
                  <span style={{ fontWeight: '700', fontSize: '13px', color: COLORS.slate800, flex: 1, textAlign: 'left' }}>Liga del equipo</span>
                  {(() => {
                    const currentLiga = catalogos.ligas.find(l => l.id === catSeleccionada.ligaId);
                    return currentLiga && (
                      <span style={{ fontSize: '11px', background: COLORS.secondaryBg, color: COLORS.primary, padding: '3px 10px', borderRadius: '20px', fontWeight: '700' }}>
                        {currentLiga.nombre}
                      </span>
                    );
                  })()}
                  <span style={{ color: COLORS.slate400, fontSize: '12px', marginLeft: '6px' }}>{collapseOpen.liga ? '▲' : '▼'}</span>
                </button>

                {collapseOpen.liga && (
                  <div style={{ padding: '12px 16px', background: 'white', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {loadingExtras ? (
                      <Loader inline text="Cargando ligas..." />
                    ) : catalogos.ligas.length === 0 ? (
                      <div style={{ color: COLORS.slate400, fontSize: '13px', textAlign: 'center', padding: '10px' }}>Sin ligas disponibles</div>
                    ) : catalogos.ligas.map(item => (
                      <label
                        key={item.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                          borderRadius: '10px', cursor: 'pointer', transition: 'background 0.15s',
                          border: '1.5px solid',
                          borderColor: catSeleccionada.ligaId === item.id ? COLORS.primary : COLORS.slate100,
                          background: catSeleccionada.ligaId === item.id ? COLORS.secondaryBg : 'white'
                        }}
                      >
                        <input
                          type="radio"
                          name="liga_selection"
                          value={item.id}
                          checked={catSeleccionada.ligaId === item.id}
                          onChange={() => {
                            setCatSeleccionada({
                              ligaId: item.id,
                              modalidadId: item.modalidadId,
                              categoriaId: item.categoriaId,
                              ramaId: item.ramaId
                            });
                            setHaCambiado(true);
                          }}
                          style={{ accentColor: COLORS.primary }}
                        />
                        <span style={{ fontSize: '13px', fontWeight: catSeleccionada.ligaId === item.id ? '700' : '500', color: COLORS.slate800 }}>
                          {item.nombre}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* ── DETALLES DE LIGA SELECCIONADA (VISTA PREVIA DE CATEGORÍAS) ── */}
              {(() => {
                const currentLiga = catalogos.ligas.find(l => l.id === catSeleccionada.ligaId);
                if (!currentLiga) return null;

                const modalidadName = catalogos.modalidades.find(m => m.id === catSeleccionada.modalidadId)?.nombre || 'Desconocida';
                const categoriaName = catalogos.categorias.find(c => c.id === catSeleccionada.categoriaId)?.nombre || 'Desconocida';
                const ramaName = catalogos.ramas.find(r => r.id === catSeleccionada.ramaId)?.nombre || 'Desconocida';

                return (
                  <div style={{
                    marginTop: '15px',
                    padding: '16px 20px',
                    background: COLORS.slate50,
                    border: `1px solid ${COLORS.slate200}`,
                    borderRadius: '16px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px'
                  }}>
                    <div style={{ gridColumn: 'span 3', fontSize: '12px', fontWeight: '800', color: COLORS.slate500, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                      Información derivada de la Liga:
                    </div>
                    <div style={{ background: 'white', padding: '10px 14px', borderRadius: '12px', border: `1px solid ${COLORS.slate100}` }}>
                      <div style={{ fontSize: '10px', color: COLORS.slate400, fontWeight: '700', textTransform: 'uppercase' }}>Modalidad</div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: COLORS.slate800, marginTop: '2px' }}>{modalidadName}</div>
                    </div>
                    <div style={{ background: 'white', padding: '10px 14px', borderRadius: '12px', border: `1px solid ${COLORS.slate100}` }}>
                      <div style={{ fontSize: '10px', color: COLORS.slate400, fontWeight: '700', textTransform: 'uppercase' }}>Categoría</div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: COLORS.slate800, marginTop: '2px' }}>{categoriaName}</div>
                    </div>
                    <div style={{ background: 'white', padding: '10px 14px', borderRadius: '12px', border: `1px solid ${COLORS.slate100}` }}>
                      <div style={{ fontSize: '10px', color: COLORS.slate400, fontWeight: '700', textTransform: 'uppercase' }}>Rama</div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: COLORS.slate800, marginTop: '2px' }}>{ramaName}</div>
                    </div>
                  </div>
                );
              })()}

            </div>
          )}
        </div>
      </Modal>

      {/* MODAL DE CONFIRMACIÓN DE DESCARGA DE DOCUMENTOS */}
      <Modal
        estaAbierto={modalDescargaDocs}
        alCerrar={() => setModalDescargaDocs(false)}
        titulo="Confirmar Descarga de Documentos"
        tamanio="medio"
        pie={
          <>
            <BotonSecundario etiqueta="Cancelar" onClick={() => setModalDescargaDocs(false)} />
            <BotonPrimario
              etiqueta="Descargar"
              onClick={handleConfirmarDescarga}
              deshabilitado={cargandoJugadoresDescarga || jugadoresDescarga.length === 0 || jugadoresDescarga.some(j => !j.DocumentosAprobados)}
              icono={<FaFileArchive />}
            />
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: COLORS.slate800 }}>
            Se descargarán los documentos del presidente: <span style={{ color: COLORS.primary }}>{equipoDescarga?.PresidenteNombreCompleto || 'Sin presidente asignado'}</span>
          </p>
          <p style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: COLORS.slate800 }}>
            Se descargarán los documentos de los siguientes jugadores:
          </p>
          
          {cargandoJugadoresDescarga ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: COLORS.slate500 }}>
              Cargando jugadores...
            </div>
          ) : (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '8px',
                maxHeight: '180px',
                overflowY: 'auto',
                border: `1px solid ${COLORS.slate200}`,
                borderRadius: '12px',
                padding: '12px',
                background: COLORS.slate50
              }}>
                {jugadoresDescarga.length > 0 ? (
                  jugadoresDescarga.map((jugador, idx) => (
                    <div
                      key={jugador.MiembroEquipoId || jugador.PersonaId || idx}
                      style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: COLORS.slate700,
                        padding: '8px 12px',
                        background: 'white',
                        border: `1px solid ${COLORS.slate200}`,
                        borderRadius: '8px',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px'
                      }}
                      title={jugador.NombreCompleto}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <span style={{ color: COLORS.primary }}>👤</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{jugador.NombreCompleto}</span>
                      </div>
                      <span style={{ flexShrink: 0 }}>
                        {jugador.DocumentosAprobados ? (
                          <span style={{ color: COLORS.green, fontWeight: 'bold' }} title="Documentos aprobados">✔️</span>
                        ) : (
                          <span style={{ color: COLORS.dangerDark, fontWeight: 'bold' }} title="Documentos pendientes de aprobación">⚠️</span>
                        )}
                      </span>
                    </div>
                  ))
                ) : (
                  <p style={{ gridColumn: '1 / -1', margin: 0, fontSize: '13px', color: COLORS.slate500, textAlign: 'center' }}>
                    No hay ningún jugador registrado en este equipo.
                  </p>
                )}
              </div>
              {jugadoresDescarga.some(j => !j.DocumentosAprobados) && (
                <p style={{ margin: 0, fontSize: '13px', color: COLORS.dangerDark, fontWeight: '700', textAlign: 'center', background: COLORS.dangerBgLight, border: `1px solid ${COLORS.dangerBgMedium}`, padding: '8px', borderRadius: '8px' }}>
                  ⚠️ Todos los jugadores deben tener sus documentos aprobados para poder exportar el equipo.
                </p>
              )}
            </>
          )}
        </div>
      </Modal>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
      />
    </div>
  );
}
