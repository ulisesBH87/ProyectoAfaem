import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEquiposDirectorio, updateEquipo, exportarEquipoDocumentos, getPresidentesDirectorio, getCatalogosRegistro } from '../../services/admin';
import Swal from 'sweetalert2';
import DashboardTable from '../../components/DashboardTable';
import SearchBar from '../../components/Common/SearchBar';
import { FaSearch, FaSyncAlt, FaSortAmountDown, FaSortAmountUp, FaPlus, FaEdit, FaEye, FaSave, FaShieldAlt, FaUser, FaCalendarDay, FaUserPlus, FaTable, FaFileArchive } from 'react-icons/fa';
import { Modal, BotonPrimario, BotonSecundario, EntradaFormulario, EntradaSeleccion } from '../../components/partials';
import Loader from '../../components/Loader';

export default function AdminEquipos() {
  const navigate = useNavigate();

  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    loadEquipos();
  }, [navigate]);

  const loadEquipos = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const data = await getEquiposDirectorio(forceRefresh);
      setEquipos(data);
      setError(null);
    } catch (err) {
      console.error("Error al cargar equipos:", err);
      setError("Error al cargar el directorio de equipos.");
    } finally {
      setLoading(false);
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
    Swal.fire({
      title: 'Información del Equipo',
      html: `
        <div style="text-align: left;">
          <p><strong>ID:</strong> ${equipo.EquipoId}</p>
          <p><strong>Nombre:</strong> ${equipo.NombreEquipo}</p>
          <p><strong>Presidente:</strong> ${equipo.PresidenteNombreCompleto}</p>
          <p><strong>Email:</strong> ${equipo.PresidenteEmail}</p>
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
      setPresidentes(presData || []);
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
        }
      });
    } else {
      setModalEdicion(false);
      setSearchPresidente('');
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
    EquipoId: <span style={{ fontWeight: '700', color: '#64748b' }}>#{eq.EquipoId}</span>,
    NombreEquipo: <span style={{ fontWeight: '800', color: '#1e293b' }}>{eq.NombreEquipo}</span>,
    Liga: (
      <div>
        <div style={{ fontWeight: '700', fontSize: '13px' }}>{eq.Liga}</div>
        <div style={{ fontSize: '11px', color: '#64748b' }}>{eq.Categoria} - {eq.Rama}</div>
      </div>
    ),
    Presidente: eq.PresidenteNombreCompleto ? (
      <div>
        <div style={{ fontWeight: '600', fontSize: '13px' }}>{eq.PresidenteNombreCompleto}</div>
        <div style={{ fontSize: '11px', color: '#64748b' }}>{eq.PresidenteEmail}</div>
      </div>
    ) : (
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
    NumeroJugadoresRegistrados: <span style={{ fontWeight: '800', color: '#0f172a', background: '#f1f5f9', padding: '4px 10px', borderRadius: '20px' }}>{eq.NumeroJugadoresRegistrados}</span>,
    Estatus: eq.Estatus ? 
      <span className="badge" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>🟢 ACTIVO</span> :
      <span className="badge" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>🔴 INACTIVO</span>,
    Acciones: (
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button 
          className="btn btn-sm btn-primary"
          style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}
          onClick={() => handleEditarEquipo(eq)}
        >
          <FaEdit /> Detalles y gestión
        </button>
        <button 
          className="btn btn-sm"
          style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', background: 'white', color: '#059669', border: '1.5px solid #86efac' }}
          onClick={() => handleExportarEquipo(eq)}
          title="Descargar documentos de todos los jugadores del equipo"
        >
          <FaFileArchive /> Descargar documentos
        </button>
      </div>
    )
  }));


  if (loading) {
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
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b', marginTop: '4px' }}>Visualiza los equipos que han completado su registro oficial.</p>
        </div>
        <div className="section-actions" style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn btn-primary"
            onClick={() => loadEquipos(true)}
            style={{ padding: '10px 20px', backgroundColor: 'white', color: '#334155', border: '1.5px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FaSyncAlt />
          </button>
          <button 
            onClick={() => navigate('/admin/layout-jugadores')}
            style={{ padding: '10px 20px', backgroundColor: 'white', color: '#334155', border: '1.5px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FaTable /> Layout Jugadores
          </button>
          <button 
            className="btn btn-premium"
            onClick={() => navigate('/admin/equipos/crear')}
            style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <FaPlus /> Crear equipo
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
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
          <div style={{ fontSize: '24px', marginBottom: '5px' }}>📋</div>
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
          <div style={{ fontSize: '24px', marginBottom: '5px' }}>✅</div>
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
          <div style={{ fontSize: '24px', marginBottom: '5px' }}>🔴</div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>EQUIPOS INACTIVOS</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#ef4444' }}>{stats.inactivos}</div>
        </div>
      </div>

      <div className="card" style={{ padding: '35px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
        <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>Lista de equipos confirmados</h3>
          
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
            <SearchBar 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar equipo por nombre o id..."
              width="280px"
            />

            <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} style={{ background: 'white', border: '1.5px solid var(--border-light)', padding: '10px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
              {sortOrder === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />} {sortOrder === 'asc' ? 'ANT' : 'REC'}
            </button>

            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-main)', padding: '5px', borderRadius: '14px', border: '1.5px solid var(--border-light)' }}>
              {['todos', 'activos', 'inactivos'].map((val) => (
                <button key={val} onClick={() => setFiltroEstatus(val)} style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: filtroEstatus === val ? 'white' : 'transparent', color: filtroEstatus === val ? 'var(--primary)' : 'var(--text-muted)', boxShadow: filtroEstatus === val ? 'var(--shadow-sm)' : 'none', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>
                  {val === 'todos' ? 'Todas' : (val === 'activos' ? 'Activos' : 'Inactivos')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DashboardTable
          columns={columns}
          data={dataTransformada}
          isLoading={loading}
          totalItems={filteredEquipos.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          emptyMessage="No se encontraron equipos con los criterios de búsqueda."
        />
      </div>

      {/* MODAL DE EDICIÓN PROFESIONAL */}
      <Modal
        estaAbierto={modalEdicion}
        alCerrar={handleCerrarModal}
        titulo="Detalles y gestión del equipo"
        tamanio="grande"
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
                <h4 style={{ margin: 0, fontSize: '15px', color: '#92400e', fontWeight: '800' }}>Edición de Ficha Oficial</h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#b45309', fontWeight: '500', marginTop: '2px' }}>Cualquier cambio afectará la visibilidad en torneos y cédulas oficiales.</p>
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

              {/* ── SECCIÓN: PRESIDENTE RESPONSABLE ── */}
              <div style={{ marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <FaUser style={{ color: '#0b4ea6', fontSize: '16px' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e3a8a' }}>Presidente responsable</div>
                    <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '1px' }}>
                      {presidenteSeleccionado
                        ? (() => { const p = presidentes.find(x => x.id === presidenteSeleccionado); return p ? p.nombre : equipoEdicion.PresidenteNombreCompleto; })()
                        : equipoEdicion.PresidenteNombreCompleto}
                    </div>
                  </div>
                  {loadingExtras && <span style={{ fontSize: '11px', color: '#64748b' }}>Sincronizando...</span>}
                </div>

                <div style={{ padding: '16px 20px', background: 'white' }}>
                  <input
                    type="text"
                    placeholder="Buscar presidente por nombre..."
                    value={searchPresidente}
                    onChange={e => setSearchPresidente(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #dbeafe', borderRadius: '10px', fontSize: '13px', marginBottom: '10px', outline: 'none', boxSizing: 'border-box' }}
                  />
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
              </div>

              {/* ── COLLAPSES: CATEGORÍAS ── */}
              {[
                { key: 'liga', label: 'Liga', icon: '🏆', items: catalogos.ligas, selKey: 'ligaId' },
                { key: 'modalidad', label: 'Modalidad', icon: '⚽', items: catalogos.modalidades, selKey: 'modalidadId' },
                { key: 'categoria', label: 'Categoría', icon: '🏅', items: catalogos.categorias, selKey: 'categoriaId' },
                { key: 'rama', label: 'Rama', icon: '🌿', items: catalogos.ramas, selKey: 'ramaId' }
              ].map(({ key, label, icon, items, selKey }) => {
                const isOpen = collapseOpen[key];
                const currentId = catSeleccionada[selKey];
                const currentItem = items.find(i => i.id === currentId);
                return (
                  <div key={key} style={{ marginBottom: '10px', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => setCollapseOpen(prev => ({ ...prev, [key]: !prev[key] }))}
                      style={{
                        width: '100%', padding: '13px 18px', background: isOpen ? '#f8fafc' : 'white',
                        border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                        borderBottom: isOpen ? '1px solid #e2e8f0' : 'none', transition: 'background 0.2s'
                      }}
                    >
                      <span style={{ fontSize: '16px' }}>{icon}</span>
                      <span style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b', flex: 1, textAlign: 'left' }}>{label}</span>
                      {currentItem && (
                        <span style={{ fontSize: '11px', background: '#eff6ff', color: '#0b4ea6', padding: '3px 10px', borderRadius: '20px', fontWeight: '700' }}>
                          {currentItem.nombre}
                        </span>
                      )}
                      <span style={{ color: '#94a3b8', fontSize: '12px', marginLeft: '6px' }}>{isOpen ? '▲' : '▼'}</span>
                    </button>

                    {isOpen && (
                      <div style={{ padding: '12px 16px', background: 'white', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {loadingExtras ? (
                          <Loader inline text="Cargando opciones..." />
                        ) : items.length === 0 ? (
                          <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '10px' }}>Sin opciones disponibles</div>
                        ) : items.map(item => (
                          <label
                            key={item.id}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                              borderRadius: '10px', cursor: 'pointer', transition: 'background 0.15s',
                              border: '1.5px solid',
                              borderColor: currentId === item.id ? '#0b4ea6' : '#f1f5f9',
                              background: currentId === item.id ? '#eff6ff' : 'white'
                            }}
                          >
                            <input
                              type="radio"
                              name={`cat_${key}`}
                              value={item.id}
                              checked={currentId === item.id}
                              onChange={() => {
                                setCatSeleccionada(prev => ({ ...prev, [selKey]: item.id }));
                                setHaCambiado(true);
                              }}
                              style={{ accentColor: '#0b4ea6' }}
                            />
                            <span style={{ fontSize: '13px', fontWeight: currentId === item.id ? '700' : '500', color: '#1e293b' }}>
                              {item.nombre}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

            </div>
          )}

           {/* SECCIÓN: CUERPO TÉCNICO REMOVIDA A PETICIÓN */}


          {/* SECCIÓN: NÓMINA DE JUGADORES (ACCESO RÁPIDO) */}
          <div style={{ gridColumn: 'span 2', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ 
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ 
                  width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(11,78,166,0.1)', 
                  color: '#0b4ea6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' 
                }}>
                  <FaTable />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>Nómina de Jugadores</h4>
                  <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>Consulta y copia los datos masivos de todos los miembros inscritos.</p>
                </div>
              </div>
              <button 
                onClick={() => navigate(`/admin/layout-jugadores?equipo=${encodeURIComponent(equipoEdicion.NombreEquipo)}`)}
                className="btn-premium" 
                style={{ padding: '10px 18px', fontSize: '12px', background: 'white', color: '#0b4ea6', border: '1.5px solid #0b4ea6', boxShadow: 'none' }}
              >
                Ver Nómina Completa →
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
