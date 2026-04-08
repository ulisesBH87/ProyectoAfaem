import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEquiposDirectorio, updateEquipo } from '../../services/admin';
import Swal from 'sweetalert2';
import DashboardTable from '../../components/DashboardTable';
import SearchBar from '../../components/Common/SearchBar';
import { FaSearch, FaSyncAlt, FaSortAmountDown, FaSortAmountUp, FaPlus, FaEdit, FaEye, FaSave } from 'react-icons/fa';
import { Modal, BotonPrimario, BotonSecundario, EntradaFormulario, EntradaSeleccion } from '../../components/partials';

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

  useEffect(() => {
    loadEquipos();
  }, [navigate]);

  const loadEquipos = async () => {
    try {
      setLoading(true);
      const data = await getEquiposDirectorio();
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
      const boolFiltro = filtroEstatus === 'activos';
      result = result.filter(s => !!s.Estatus === boolFiltro);
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

  const handleEditarEquipo = (equipo) => {
    setEquipoEdicion(equipo);
    setDatosEditables({
      nombre: equipo.NombreEquipo || '',
      estatus: equipo.Estatus ? '1' : '0'
    });
    setHaCambiado(false);
    setModalEdicion(true);
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
        }
      });
    } else {
      setModalEdicion(false);
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
      await updateEquipo(equipoEdicion.EquipoId, datosEditables.nombre, datosEditables.estatus);
      
      Swal.fire('¡Éxito!', 'Información del equipo actualizada correctamente.', 'success');
      setModalEdicion(false);
      loadEquipos();
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudieron guardar los cambios.', 'error');
    } finally {
      setGuardando(false);
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
    Presidente: (
      <div>
        <div style={{ fontWeight: '600', fontSize: '13px' }}>{eq.PresidenteNombreCompleto}</div>
        <div style={{ fontSize: '11px', color: '#64748b' }}>{eq.PresidenteEmail}</div>
      </div>
    ),
    NumeroJugadoresRegistrados: <span style={{ fontWeight: '800', color: '#0f172a', background: '#f1f5f9', padding: '4px 10px', borderRadius: '20px' }}>{eq.NumeroJugadoresRegistrados}</span>,
    Estatus: eq.Estatus ? 
      <span className="badge" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>🟢 ACTIVO</span> :
      <span className="badge" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>🔴 INACTIVO</span>,
    Acciones: (
      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          className="btn btn-sm btn-primary"
          style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}
          onClick={() => handleEditarEquipo(eq)}
        >
          <FaEdit /> Detalles y gestión
        </button>
      </div>
    )
  }));


  if (loading) {
    return (
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p style={{ marginTop: '10px', color: '#64748b' }}>Cargando directorio de equipos...</p>
        </div>
      </div>
    );
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
            onClick={() => window.location.reload()}
            style={{ padding: '10px 20px', backgroundColor: 'white', color: '#334155', border: '1.5px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FaSyncAlt />
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>Total equipos</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b' }}>{stats.total}</div>
        </div>
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>Equipos activos</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#10b981' }}>{stats.activos}</div>
        </div>
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>Promedio jugadores</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#6366f1' }}>{stats.avgJugadores}</div>
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
            <BotonSecundario texto="Cancelar" onClick={handleCerrarModal} />
            <BotonPrimario 
              texto={guardando ? 'Guardando...' : 'Guardar cambios'} 
              onClick={manejarGuardarEquipo} 
              deshabilitado={guardando}
              icono={<FaSave />}
            />
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
          <div style={{ gridColumn: 'span 2', background: 'var(--primary-light)', padding: '15px 20px', borderRadius: '12px', marginBottom: '10px', border: '1px solid var(--border-light)' }}>
             <p style={{ margin: 0, fontSize: '14px', color: 'var(--primary)', fontWeight: '700' }}>⚠️ Estás editando la ficha oficial del equipo.</p>
             <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Cualquier cambio afectará la visibilidad en torneos y cédulas oficiales.</p>
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
              { valor: '1', etiqueta: 'Activo (Habilitado para Torneos)' },
              { valor: '0', etiqueta: 'Inactivo (Baja Temporal)' }
            ]}
          />

          {equipoEdicion && (
            <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px', padding: '15px', background: '#f8fafc', borderRadius: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Presidente responsable</label>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{equipoEdicion.PresidenteNombreCompleto}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{equipoEdicion.PresidenteEmail}</div>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Vigencia Matricula</label>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>Temporada 2024 - 2025</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{equipoEdicion.Liga}</div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
