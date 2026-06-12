import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getEquiposDirectorio, updateEquipo, exportarEquipoDocumentos, getPresidentesDirectorio, getCatalogosRegistro } from '../../services/admin';
import Swal from 'sweetalert2';
import DashboardTable from '../../components/DashboardTable';
import SearchBar from '../../components/Common/SearchBar';
import { FaSearch, FaSyncAlt, FaSortAmountDown, FaSortAmountUp, FaPlus, FaEdit, FaEye, FaSave, FaShieldAlt, FaUser, FaCalendarDay, FaUserPlus, FaTable, FaFileArchive, FaCheckCircle, FaTimesCircle, FaClipboardList } from 'react-icons/fa';
import { Modal, BotonPrimario, BotonSecundario, EntradaFormulario, EntradaSeleccion } from '../../components/partials';
import Loader from '../../components/Loader';

export default function AdminEquipos() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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

  // ESTADO PARA PRESIDENTE Y CATÁLOGOS
  const [presidentes, setPresidentes] = useState([]);
  const [searchPresidente, setSearchPresidente] = useState('');
  const [presidenteSeleccionado, setPresidenteSeleccionado] = useState(null);
  const [catalogos, setCatalogos] = useState({ ligas: [], modalidades: [], categorias: [], ramas: [] });
  const [collapseOpen, setCollapseOpen] = useState({ liga: false, modalidad: false, categoria: false, rama: false });
  const [catSeleccionada, setCatSeleccionada] = useState({ ligaId: null, modalidadId: null, categoriaId: null, ramaId: null });
  const [loadingExtras, setLoadingExtras] = useState(false);
  const [collapsePresidente, setCollapsePresidente] = useState(false);

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
    // Pre-seleccionar presidente y categorías actuales
    setPresidenteSeleccionado(equipo.PresidenteEquipoId || null);
    setCatSeleccionada({
      ligaId: equipo.LigaId || null,
      modalidadId: equipo.ModalidadId || null,
      categoriaId: equipo.CategoriaId || null,
      ramaId: equipo.RamaId || null
    });
    setSearchPresidente('');
    setCollapseOpen({ liga: false, modalidad: false, categoria: false, rama: false });
    setHaCambiado(false);
    setModalEdicion(true);

    // Cargar presidentes y catálogos en paralelo
    try {
      setLoadingExtras(true);
      const [presData, catData] = await Promise.all([
        getPresidentesDirectorio(),
        getCatalogosRegistro()
      ]);
      setPresidentes(
        Array.isArray(presData)
          ? presData.filter(p => p.estatus === 7 || p.estatusNombre === 'ACTIVO')
          : []
      );
      setCatalogos({
        ligas: catData?.ligas || [],
        modalidades: catData?.modalidades || [],
        categorias: catData?.categorias || [],
        ramas: catData?.ramas || []
      });
    } catch (err) {
      console.error('Error cargando catálogos/presidentes:', err);
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
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, salir sin guardar',
        cancelButtonText: 'Volver a la edición'
      }).then((result) => {
        if (result.isConfirmed) {
          setModalEdicion(false);
          setSearchPresidente('');
          limpiarParams();
        }
      });
    } else {
      setModalEdicion(false);
      setSearchPresidente('');
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

  const handleRowClick = (row) => {
    if (row && row._original) {
      navigate(`/admin/equipos/completar-jugadores/${row._original.EquipoId}`);
    }
  };

  const columns = [
    { key: "EquipoId", label: "ID" },
    { key: "NombreEquipo", label: "Equipo" },
    { key: "Liga", label: "Liga / Cat." },
    { key: "Presidente", label: "Presidente Resp." },
    { key: "NumeroJugadoresRegistrados", label: "# Jugadores" },
    { key: "Estatus", label: "Estatus" },
    { key: "Acciones", label: "Opciones" }
  ];

  const dataTransformada = paginatedEquipos.map(eq => ({
    _original: eq,
    EquipoId: <span style={{ fontWeight: '700', color: '#64748b' }}>#{eq.EquipoId}</span>,
    NombreEquipo: <span style={{ fontWeight: '800', color: '#1e293b' }}>{eq.NombreEquipo}</span>,
    Liga: (
      <div>
        <div style={{ fontWeight: '700', fontSize: '13px' }}>{eq.Liga}</div>
        <div style={{ fontSize: '11px', color: '#64748b' }}>{eq.Categoria} - {eq.Rama}</div>
      </div>
    ),
    Presidente: eq.PresidenteNombreCompleto ? (() => {
      const emailVal = eq.PresidenteEmail || '';
      const esEmailTemporal = emailVal && (emailVal.includes('@temporary.afaem.com') || emailVal.startsWith('draft_'));
      return (
        <div>
          <div
            style={{ fontWeight: '600', fontSize: '13px', cursor: 'pointer', color: '#0b4ea6', textDecoration: 'underline' }}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/presidentes?abrirDetalle=${eq.PresidenteEquipoId}`);
            }}
            title="Ver detalle del presidente"
          >
            {eq.PresidenteNombreCompleto}
          </div>
          {esEmailTemporal ? (
            <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', fontWeight: 600 }}>En espera de registro</div>
          ) : (
            <div style={{ fontSize: '11px', color: '#64748b' }}>{emailVal}</div>
          )}
        </div>
      );
    })() : (
      <div style={{
        background: '#fee2e2',
        color: '#991b1b',
        padding: '6px 14px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '800',
        border: '1px solid #fecaca',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        ⚠️ SIN PRESIDENTE
      </div>
    ),
    NumeroJugadoresRegistrados: (
      <span style={{ fontWeight: '800', color: '#0f172a', background: '#f1f5f9', padding: '4px 10px', borderRadius: '20px' }}>
        {eq.NumeroJugadoresRegistrados || 0}/{eq.SlotsComprados || 0}
      </span>
    ),
    Estatus: eq.Estatus ?
      <span className="badge" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>ACTIVO</span> :
      <span className="badge" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>INACTIVO</span>,
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
          onClick={(e) => { e.stopPropagation(); navigate(`/admin/layout-jugadores?equipo=${encodeURIComponent(eq.NombreEquipo)}`); }}
          title="Ver jugadores del equipo"
        >
          <FaTable /> Jugadores
        </button>
        {/* Descargar Docs */}
        <button
          className="btn btn-sm"
          style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', background: 'white', color: '#059669', border: '1.5px solid #86efac', whiteSpace: 'nowrap' }}
          onClick={(e) => { e.stopPropagation(); handleExportarEquipo(eq); }}
          title="Descargar documentos de todos los jugadores del equipo"
        >
          <FaFileArchive /> Docs
        </button>
        {/* Agregar Jugador */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/admin/equipos/completar-jugadores/${eq.EquipoId}`);
          }}
          style={{
            padding: '6px 10px',
            borderRadius: '8px',
            border: '1.5px solid #cbd5e1',
            background: 'white',
            color: '#0b4ea6',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            fontWeight: '700'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f1f5f9';
            e.currentTarget.style.borderColor = '#94a3b8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
            e.currentTarget.style.borderColor = '#cbd5e1';
          }}
          title="Agregar Jugador"
        >
          <FaUserPlus />
        </button>
      </div>
    )
  }));


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
          <h2 className="section-title" style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Directorio de equipos</h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b', marginTop: '4px' }}>Visualiza los equipos registrados.</p>
        </div>
        <div className="section-actions" style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn btn-premium"
            onClick={() => navigate('/admin/equipos/crear')}
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
            border: filtroEstatus === 'todos' ? '2px solid #0b4ea6' : '1px solid #e2e8f0',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: filtroEstatus === 'todos' ? '0 4px 12px rgba(11, 78, 166, 0.15)' : 'none',
            transform: filtroEstatus === 'todos' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '5px', color: '#0b4ea6' }}><FaClipboardList /></div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>TOTAL EQUIPOS</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>{stats.total}</div>
        </div>

        {/* TARJETA ACTIVOS */}
        <div
          onClick={() => setFiltroEstatus('activos')}
          style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            border: filtroEstatus === 'activos' ? '2px solid #10b981' : '1px solid #e2e8f0',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: filtroEstatus === 'activos' ? '0 4px 12px rgba(16, 185, 129, 0.15)' : 'none',
            transform: filtroEstatus === 'activos' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '5px', color: '#10b981' }}><FaCheckCircle /></div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>EQUIPOS ACTIVOS</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#10b981' }}>{stats.activos}</div>
        </div>

        {/* TARJETA INACTIVOS */}
        <div
          onClick={() => setFiltroEstatus('inactivos')}
          style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            border: filtroEstatus === 'inactivos' ? '2px solid #ef4444' : '1px solid #e2e8f0',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: filtroEstatus === 'inactivos' ? '0 4px 12px rgba(239, 68, 68, 0.15)' : 'none',
            transform: filtroEstatus === 'inactivos' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '5px', color: '#ef4444' }}><FaTimesCircle /></div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>EQUIPOS INACTIVOS</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#ef4444' }}>{stats.inactivos}</div>
        </div>
      </div>

      <div className="card" style={{ padding: '35px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
        <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', overflow: 'hidden' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>Lista de equipos</h3>

          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', overflowX: 'auto', overflowY: 'hidden', maxWidth: '100%', scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}>
            <SearchBar
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar equipo por nombre o id..."
              width="280px"
            />

            <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} style={{ background: 'white', border: '1.5px solid var(--border-light)', padding: '10px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
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
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            padding: '16px 20px',
            borderRadius: '16px',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 4px 6px -1px rgba(245, 158, 11, 0.05)'
          }}>
            <div style={{
              fontSize: '22px',
              background: '#f59e0b',
              color: 'white',
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
              flexShrink: 0
            }}>
              <FaShieldAlt />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '15px', color: '#92400e', fontWeight: '800' }}>Edición de Ficha de equipo</h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#b45309', fontWeight: '500', marginTop: '2px' }}>Edita la información oficial del equipo.</p>
            </div>
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
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                border: '1px solid #bbf7d0',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 4px 6px -1px rgba(22, 163, 74, 0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>👥</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#166534' }}>Ver jugadores del equipo</div>
                    <div style={{ fontSize: '12px', color: '#15803d', marginTop: '1px' }}>
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
                      navigate(`/admin/jugadores?equipo=${encodeURIComponent(equipoEdicion.NombreEquipo)}`, {
                        state: { filtroEquipo: equipoEdicion.NombreEquipo }
                      });
                    };

                    if (haCambiado) {
                      Swal.fire({
                        title: '¿Estás seguro de salir?',
                        text: "Tienes cambios sin guardar que se perderán.",
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#ef4444',
                        cancelButtonColor: '#64748b',
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
                    border: '1px solid #166534',
                    background: '#166534',
                    color: 'white',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 4px rgba(22, 101, 52, 0.15)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#15803d';
                    e.currentTarget.style.borderColor = '#15803d';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#166534';
                    e.currentTarget.style.borderColor = '#166534';
                  }}
                >
                  <FaTable /> Ver catálogo
                </button>
              </div>

              {/* ── SECCIÓN: PRESIDENTE RESPONSABLE ── */}
              <div style={{ marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <FaUser style={{ color: '#0b4ea6', fontSize: '16px' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e3a8a' }}>Presidente responsable</div>
                    <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '1px' }}>
                      {(() => {
                        const pid = presidenteSeleccionado || equipoEdicion.PresidenteEquipoId;
                        const pName = presidenteSeleccionado
                          ? (() => { const p = presidentes.find(x => x.id === presidenteSeleccionado); return p ? p.nombre : equipoEdicion.PresidenteNombreCompleto; })()
                          : equipoEdicion.PresidenteNombreCompleto;

                        return pid && pName ? (
                          <span
                            style={{ cursor: 'pointer', color: '#1e3a8a', textDecoration: 'underline' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              const irAlPresidente = () => {
                                setModalEdicion(false);
                                if (esNavegacionCruzada) {
                                  setEsNavegacionCruzada(false);
                                  searchParams.delete('abrirDetalle');
                                  setSearchParams(searchParams, { replace: true });
                                }
                                navigate(`/admin/presidentes?abrirDetalle=${pid}`);
                              };

                              if (haCambiado) {
                                Swal.fire({
                                  title: '¿Estás seguro de salir?',
                                  text: "Tienes cambios sin guardar que se perderán.",
                                  icon: 'warning',
                                  showCancelButton: true,
                                  confirmButtonColor: '#ef4444',
                                  cancelButtonColor: '#64748b',
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
                  {loadingExtras && <span style={{ fontSize: '11px', color: '#64748b' }}>Sincronizando...</span>}
                </div>

                <button
                  type="button"
                  onClick={() => setCollapsePresidente(!collapsePresidente)}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    background: collapsePresidente ? '#f8fafc' : 'white',
                    border: 'none',
                    borderTop: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'background 0.2s',
                  }}
                >
                  <span style={{ fontWeight: '700', fontSize: '13px', color: '#0b4ea6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Cambiar presidente
                  </span>
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                    {collapsePresidente ? '▲' : '▼'}
                  </span>
                </button>

                {collapsePresidente && (
                  <div style={{ padding: '16px 20px', background: 'white', borderTop: '1px solid #f1f5f9' }}>
                    <input
                      type="text"
                      placeholder="Buscar presidente por nombre..."
                      value={searchPresidente}
                      onChange={e => setSearchPresidente(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #dbeafe', borderRadius: '10px', fontSize: '13px', marginBottom: '10px', outline: 'none', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '20px', fontWeight: '700' }}>
                        Solo presidentes con estatus Activo
                      </span>
                    </div>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: '10px' }}>
                      {loadingExtras ? (
                        <Loader inline text="Cargando presidentes..." />
                      ) : presidentes.filter(p => !searchPresidente || p.nombre.toLowerCase().includes(searchPresidente.toLowerCase())).length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No se encontraron presidentes</div>
                      ) : (
                        presidentes
                          .filter(p => !searchPresidente || p.nombre.toLowerCase().includes(searchPresidente.toLowerCase()))
                          .map(p => (
                            <div
                              key={p.id}
                              onClick={() => { setPresidenteSeleccionado(p.id); setHaCambiado(true); }}
                              style={{
                                padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                                borderBottom: '1px solid #f8fafc', transition: 'background 0.15s',
                                backgroundColor: presidenteSeleccionado === p.id ? '#eff6ff' : 'white'
                              }}
                            >
                              <div style={{
                                width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                                background: presidenteSeleccionado === p.id ? '#0b4ea6' : '#f1f5f9',
                                color: presidenteSeleccionado === p.id ? 'white' : '#64748b',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '11px', fontWeight: '800'
                              }}>
                                {p.nombre.charAt(0).toUpperCase()}
                              </div>
                              <span style={{ fontSize: '13px', fontWeight: presidenteSeleccionado === p.id ? '700' : '500', color: '#1e293b', flex: 1 }}>{p.nombre}</span>
                              {presidenteSeleccionado === p.id && <span style={{ color: '#0b4ea6', fontWeight: '800' }}>✓</span>}
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ── SECCIÓN: ASIGNACIÓN DE LIGA ── */}
              <div style={{ marginBottom: '10px', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => setCollapseOpen(prev => ({ ...prev, liga: !prev.liga }))}
                  style={{
                    width: '100%', padding: '13px 18px', background: collapseOpen.liga ? '#f8fafc' : 'white',
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                    borderBottom: collapseOpen.liga ? '1px solid #e2e8f0' : 'none', transition: 'background 0.2s'
                  }}
                >
                  <span style={{ fontSize: '16px' }}>🏆</span>
                  <span style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b', flex: 1, textAlign: 'left' }}>Liga del equipo</span>
                  {(() => {
                    const currentLiga = catalogos.ligas.find(l => l.id === catSeleccionada.ligaId);
                    return currentLiga && (
                      <span style={{ fontSize: '11px', background: '#eff6ff', color: '#0b4ea6', padding: '3px 10px', borderRadius: '20px', fontWeight: '700' }}>
                        {currentLiga.nombre}
                      </span>
                    );
                  })()}
                  <span style={{ color: '#94a3b8', fontSize: '12px', marginLeft: '6px' }}>{collapseOpen.liga ? '▲' : '▼'}</span>
                </button>

                {collapseOpen.liga && (
                  <div style={{ padding: '12px 16px', background: 'white', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {loadingExtras ? (
                      <Loader inline text="Cargando ligas..." />
                    ) : catalogos.ligas.length === 0 ? (
                      <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '10px' }}>Sin ligas disponibles</div>
                    ) : catalogos.ligas.map(item => (
                      <label
                        key={item.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                          borderRadius: '10px', cursor: 'pointer', transition: 'background 0.15s',
                          border: '1.5px solid',
                          borderColor: catSeleccionada.ligaId === item.id ? '#0b4ea6' : '#f1f5f9',
                          background: catSeleccionada.ligaId === item.id ? '#eff6ff' : 'white'
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
                          style={{ accentColor: '#0b4ea6' }}
                        />
                        <span style={{ fontSize: '13px', fontWeight: catSeleccionada.ligaId === item.id ? '700' : '500', color: '#1e293b' }}>
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
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px'
                  }}>
                    <div style={{ gridColumn: 'span 3', fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                      Información derivada de la Liga:
                    </div>
                    <div style={{ background: 'white', padding: '10px 14px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Modalidad</div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', marginTop: '2px' }}>{modalidadName}</div>
                    </div>
                    <div style={{ background: 'white', padding: '10px 14px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Categoría</div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', marginTop: '2px' }}>{categoriaName}</div>
                    </div>
                    <div style={{ background: 'white', padding: '10px 14px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Rama</div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', marginTop: '2px' }}>{ramaName}</div>
                    </div>
                  </div>
                );
              })()}

            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
