import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardTable from '../../components/DashboardTable';
import teamsService from '../../services/teams';
import Loader from '../../components/Loader';
import SearchBar from '../../components/Common/SearchBar';
import '../../styles/dashboard.css';
import { 
  FaUser, 
  FaSyncAlt, 
  FaSortAmountDown, 
  FaSortAmountUp, 
  FaCheckCircle, 
  FaExclamationCircle, 
  FaUsers, 
  FaUserInjured, 
  FaUserPlus 
} from 'react-icons/fa';

// Componente de avatar de jugador para manejar fallback de imagen si falla la carga o no existe
function PlayerAvatar({ rutaFoto, nombre, fallbackIcon }) {
  const [hasError, setHasError] = useState(false);

  if (rutaFoto && !hasError) {
    const cleanPath = rutaFoto.replace(/\\/g, '/');
    const src = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
    return (
      <img
        src={src}
        alt={nombre}
        onError={() => setHasError(true)}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '12px',
          objectFit: 'cover'
        }}
      />
    );
  }

  return <>{nombre ? nombre.charAt(0).toUpperCase() : fallbackIcon}</>;
}

export default function PresidenteEquipoMisJugadores() {
  const navigate = useNavigate();
  
  // ESTADOS
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstatus, setFiltroEstatus] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const data = await teamsService.getUserPlayersReal();
      setPlayers(data || []);
    } catch (err) {
      console.error('Error cargando jugadores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlayers();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filtroEstatus, searchTerm, sortOrder]);

  // MÉTRICAS
  const totalJugadores = players.length;
  const activos = players.filter(p => p.Estatus === true).length;
  const inactivos = players.filter(p => p.Estatus === false).length;
  const equiposUnicos = [...new Set(players.map(p => p.Equipo))].length;

  // LÓGICA DE FILTRADO, BÚSQUEDA Y ORDENAMIENTO
  const filteredPlayers = React.useMemo(() => {
    let result = [...players];
    
    // Filtro por estatus
    if (filtroEstatus !== 'todos') {
      const boolFiltro = filtroEstatus === 'activos';
      result = result.filter(p => !!p.Estatus === boolFiltro);
    }
    
    // Búsqueda en tiempo real
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      result = result.filter(p => 
        (p.NombreCompleto && p.NombreCompleto.toLowerCase().includes(query)) ||
        (p.Rol && p.Rol.toLowerCase().includes(query)) ||
        (p.Equipo && p.Equipo.toLowerCase().includes(query))
      );
    }
    
    // Ordenamiento por Nombre o ID (simulado)
    result.sort((a, b) => {
      const nameA = a.NombreCompleto || '';
      const nameB = b.NombreCompleto || '';
      if (sortOrder === 'asc') return nameA.localeCompare(nameB);
      return nameB.localeCompare(nameA);
    });
    
    return result;
  }, [players, filtroEstatus, searchTerm, sortOrder]);

  const paginatedPlayers = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPlayers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPlayers, currentPage]);

  const columns = [
    { 
      key: 'NombreCompleto', 
      label: 'Jugador',
      render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="team-logo-table">
            <PlayerAvatar rutaFoto={row.RutaFoto} nombre={val} fallbackIcon={<FaUser />} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="team-name-table">{val}</div>
            <div className="team-subname-table">{row.Rol || 'Miembro Registrado'}</div>
          </div>
        </div>
      )
    },
    { 
      key: 'Equipo', 
      label: 'Equipo vinculado',
      render: (val) => (
        <div className="linked-team-badge-table">
          {val ? val.toUpperCase() : 'SIN EQUIPO'}
        </div>
      )
    },
    { 
      key: 'FechaIngreso',
      label: 'Fecha alta',
      render: (val) => (
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>
          {val ? new Date(val).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
        </div>
      )
    },
    { 
      key: 'Estatus',
      label: 'Estado oficial',
      render: (status) => {
        return (
          <span 
            className="status-badge-table"
            style={{ 
              background: status ? '#dcfce7' : '#fee2e2', 
              color: status ? '#166534' : '#991b1b',
              border: status ? '1px solid #bbf7d0' : '1px solid #fecaca'
            }}
          >
            {status ? <FaCheckCircle size={10} /> : <FaExclamationCircle size={10} />}
            {status ? 'ACTIVO' : 'INACTIVO'}
          </span>
        );
      }
    }
  ];

  if (loading && players.length === 0) {
    return <Loader text="Cargando tu directorio de jugadores..." />;
  }

  return (
    <div className="fade-in">
      {/* CABECERA ESTILO ADMIN/PAGOS */}
      <div className="page-header-premium">
        <div>
          <h1 className="page-header-title">Mi directorio de jugadores</h1>
          <p className="page-header-subtitle">Visualización y gestión de miembros activos en tus equipos registrados.</p>
        </div>
      </div>

      {/* TARJETAS MÉTRICAS ESTILO ADMIN/PAGOS */}
      <div className="metrics-grid-4">
        {[
          { label: 'Total Jugadores', value: totalJugadores, filter: 'todos', color: 'var(--primary)', icon: <FaUsers /> },
          { label: 'Miembros Activos', value: activos, filter: 'activos', color: 'var(--secondary)', icon: <FaCheckCircle /> },
          { label: 'Inactivos / Bajas', value: inactivos, filter: 'inactivos', color: 'var(--danger)', icon: <FaUserInjured /> },
          { label: 'Equipos a cargo', value: equiposUnicos, color: '#6366f1', icon: <FaUsers />, isMetricOnly: true }
        ].map((stat, i) => (
          <div 
            key={i} 
            onClick={() => stat.filter && setFiltroEstatus(stat.filter)}
            className={`metric-card ${filtroEstatus === stat.filter ? 'active' : ''}`}
            style={{ 
              cursor: stat.isMetricOnly ? 'default' : 'pointer',
              border: filtroEstatus === stat.filter ? `2px solid ${stat.color}` : '1.5px solid var(--border-light)',
              boxShadow: filtroEstatus === stat.filter ? `0 12px 20px ${stat.color}15` : 'none'
            }}
          >
            <div className="metric-icon-wrapper" style={{ background: `${stat.color}15`, color: stat.color }}>
              {stat.icon}
            </div>
            <div className="metric-content">
              <div className="metric-label">{stat.label}</div>
              <div className="metric-value">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* SECCIÓN DE TABLA ESTILO ADMIN/PAGOS */}
      <div className="dashboard-card">
        <div className="table-header-actions">
          <h3 className="table-header-title">Listado oficial de la plantilla</h3>
          
          <div className="table-actions-group">
            <div className="search-wrapper-responsive">
              <SearchBar 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre o equipo..."
                width="100%"
                style={{ maxWidth: '300px' }}
              />
            </div>

            <button 
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} 
              className="sort-btn-responsive"
            >
              {sortOrder === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />} {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
            </button>

            <div className="filters-wrapper-responsive">
              {[
                { val: 'todos', label: 'Todos' },
                { val: 'activos', label: 'Activos' },
                { val: 'inactivos', label: 'Inactivos' }
              ].map((item) => (
                <button 
                  key={item.val} 
                  onClick={() => setFiltroEstatus(item.val)} 
                  style={{ 
                    padding: '8px 16px', borderRadius: '10px', border: 'none', 
                    background: filtroEstatus === item.val ? 'white' : 'transparent', 
                    color: filtroEstatus === item.val ? 'var(--primary)' : 'var(--text-muted)', 
                    boxShadow: filtroEstatus === item.val ? 'var(--shadow-sm)' : 'none', 
                    fontSize: '11px', fontWeight: '800', textTransform: 'uppercase',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button 
              onClick={loadPlayers} 
              className="btn-premium reload-btn-responsive"
            >
              <FaSyncAlt />
            </button>
          </div>
        </div>

        <DashboardTable 
          columns={columns} 
          data={paginatedPlayers} 
          isLoading={loading} 
          totalItems={filteredPlayers.length} 
          itemsPerPage={itemsPerPage} 
          currentPage={currentPage} 
          onPageChange={setCurrentPage} 
          emptyMessage="No se encontraron jugadores que coincidan con tu búsqueda." 
        />
      </div>
    </div>
  );
}
