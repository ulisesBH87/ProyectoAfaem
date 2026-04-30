import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardTable from '../../components/DashboardTable';
import teamsService from '../../services/teams';
import Loader from '../../components/Loader';
import SearchBar from '../../components/Common/SearchBar';
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
          <div style={{ 
            width: '40px', height: '40px', borderRadius: '12px', 
            background: 'var(--primary-light)', color: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '15px', fontWeight: '800', border: '1px solid var(--border-light)'
          }}>
            {val ? val.charAt(0).toUpperCase() : <FaUser />}
          </div>
          <div>
            <div style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '14px' }}>{val}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>{row.Rol || 'Miembro Registrado'}</div>
          </div>
        </div>
      )
    },
    { 
      key: 'Equipo', 
      label: 'Equipo vinculado',
      render: (val) => (
        <div style={{ fontWeight: '700', color: 'var(--text-muted)', fontSize: '12px', background: 'var(--bg-main)', padding: '4px 10px', borderRadius: '8px', display: 'inline-block' }}>
          {val ? val.toUpperCase() : 'SIN EQUIPO'}
        </div>
      )
    },
    { 
      key: 'FechaIngreso',
      label: 'Fecha alta',
      render: (val) => (
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>
          {val ? new Date(val).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
        </div>
      )
    },
    { 
      key: 'Estatus',
      label: 'Estado oficial',
      render: (status) => {
        return (
          <span style={{ 
            padding: '6px 14px', borderRadius: '20px', 
            background: status ? '#dcfce7' : '#fee2e2', 
            color: status ? '#166534' : '#991b1b',
            fontSize: '11px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '6px',
            border: status ? '1px solid #bbf7d0' : '1px solid #fecaca'
          }}>
            {status ? <FaCheckCircle size={10} /> : <FaExclamationCircle size={10} />}
            {status ? 'ACTIVO' : 'INACTIVO'}
          </span>
        );
      }
    }
  ];

  if (loading) {
    return <Loader text="Cargando tu directorio de jugadores..." />;
  }

  return (
    <div className="fade-in">
      {/* CABECERA ESTILO ADMIN/PAGOS */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>Mi directorio de jugadores</h1>
          <p style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Visualización y gestión de miembros activos en tus equipos registrados.</p>
        </div>
        <button 
          className="btn-premium" 
          onClick={() => navigate('/presidente-equipo/registro-jugadores')}
          style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <FaUserPlus /> Registrar nuevo jugador
        </button>
      </div>

      {/* TARJETAS MÉTRICAS ESTILO ADMIN/PAGOS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {[
          { label: 'Total Jugadores', value: totalJugadores, filter: 'todos', color: 'var(--primary)', icon: <FaUsers /> },
          { label: 'Miembros Activos', value: activos, filter: 'activos', color: 'var(--secondary)', icon: <FaCheckCircle /> },
          { label: 'Inactivos / Bajas', value: inactivos, filter: 'inactivos', color: 'var(--danger)', icon: <FaUserInjured /> },
          { label: 'Equipos a cargo', value: equiposUnicos, color: '#6366f1', icon: <FaUsers />, isMetricOnly: true }
        ].map((stat, i) => (
          <div 
            key={i} 
            onClick={() => stat.filter && setFiltroEstatus(stat.filter)}
            className="card" 
            style={{ 
              padding: '24px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '20px',
              cursor: stat.isMetricOnly ? 'default' : 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              border: filtroEstatus === stat.filter ? `2px solid ${stat.color}` : '1.5px solid var(--border-light)',
              transform: filtroEstatus === stat.filter ? 'translateY(-5px)' : 'none',
              boxShadow: filtroEstatus === stat.filter ? `0 12px 20px ${stat.color}15` : 'none',
              borderRadius: '20px'
            }}
          >
            <div style={{ 
              width: '56px', height: '56px', borderRadius: '16px', 
              background: `${stat.color}15`, color: stat.color, 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              fontSize: '22px' 
            }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{stat.label}</div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-main)', lineHeight: 1 }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* SECCIÓN DE TABLA ESTILO ADMIN/PAGOS */}
      <div className="card" style={{ padding: '35px', borderRadius: '24px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
        <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>Listado oficial de la plantilla</h3>
          
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
            <SearchBar 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o equipo..."
              width="300px"
            />

            <button 
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} 
              style={{ 
                background: 'white', border: '1.5px solid var(--border-light)', 
                padding: '10px 18px', borderRadius: '12px', 
                fontSize: '13px', fontWeight: '700', 
                display: 'flex', alignItems: 'center', gap: '8px',
                color: 'var(--text-muted)', cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-light)'}
            >
              {sortOrder === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />} {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
            </button>

            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-main)', padding: '5px', borderRadius: '14px', border: '1.5px solid var(--border-light)' }}>
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
              className="btn-premium" 
              style={{ 
                width: '42px', height: '42px', padding: 0, 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '12px' 
              }}
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
