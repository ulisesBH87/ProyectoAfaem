import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEquiposDirectorio } from '../../services/admin';
import Swal from 'sweetalert2';
import DashboardTable from '../../components/DashboardTable';
import { FaSearch, FaSyncAlt, FaSortAmountDown, FaSortAmountUp } from 'react-icons/fa';

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

  useEffect(() => {
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

    loadEquipos();
  }, [navigate]);

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
          className="btn btn-sm btn-outline-primary"
          style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px' }}
          onClick={() => handleVerDetalles(eq)}
        >
          🔍 Ver
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
          <p style={{ marginTop: '10px', color: '#64748b' }}>Cargando directorio...</p>
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
          <h2 className="section-title" style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Directorio de Equipos</h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Visualiza todos los equipos que ya completaron su registro.</p>
        </div>
        <div className="section-actions">
          <button 
            className="btn btn-primary"
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#0b4ea6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            🔄 Actualizar
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '5px' }}>📋</div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>TOTAL EQUIPOS</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>{stats.total}</div>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '5px' }}>🟢</div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>EQUIPOS ACTIVOS</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#10b981' }}>{stats.activos}</div>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '5px' }}>🏃</div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>PROMEDIO JUGADORES</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#6366f1' }}>{stats.avgJugadores}</div>
        </div>
      </div>

      <div className="card" style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>Lista de Equipos Confirmados</h3>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <FaSearch style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" placeholder="Buscar equipo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="form-input" style={{ paddingLeft: '40px', width: '240px' }} />
            </div>

            <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} style={{ background: 'white', border: '1.5px solid var(--border-light)', padding: '10px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {sortOrder === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />} {sortOrder === 'asc' ? 'ASC' : 'DESC'}
            </button>

            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-main)', padding: '4px', borderRadius: '12px', border: '1.5px solid var(--border-light)' }}>
              {['todos', 'activos', 'inactivos'].map((val) => (
                <button key={val} onClick={() => setFiltroEstatus(val)} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: filtroEstatus === val ? 'white' : 'transparent', color: filtroEstatus === val ? 'var(--primary)' : 'var(--text-muted)', boxShadow: filtroEstatus === val ? 'var(--shadow-sm)' : 'none', fontSize: '11px', fontWeight: '700' }}>
                  {val.toUpperCase()}
                </button>
              ))}
            </div>

            <button onClick={() => window.location.reload()} className="btn-premium" style={{ padding: '10px 16px', fontSize: '12px' }}>
              <FaSyncAlt />
            </button>
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
          emptyMessage="No hay equipos que coincidan con la búsqueda."
        />
      </div>
    </div>
  );
}
