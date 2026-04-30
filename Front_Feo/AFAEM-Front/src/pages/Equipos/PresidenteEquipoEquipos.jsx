import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardTable from '../../components/DashboardTable';
import teamsService from '../../services/teams';
import Skeleton from '../../components/Common/Skeleton';
import SearchBar from '../../components/Common/SearchBar';
import { 
  FaShieldAlt, 
  FaUsers, 
  FaSyncAlt, 
  FaSortAmountDown, 
  FaSortAmountUp, 
  FaCheckCircle, 
  FaExclamationCircle, 
  FaTrophy, 
  FaPlus,
  FaUserPlus 
} from 'react-icons/fa';

export default function PresidenteEquipoEquipos() {
  const navigate = useNavigate();
  
  // ESTADOS
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstatus, setFiltroEstatus] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const loadTeams = async () => {
    try {
      setLoading(true);
      const data = await teamsService.getUserTeamsReal();
      setTeams(data || []);
    } catch (err) {
      console.error('Error cargando equipos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filtroEstatus, searchTerm, sortOrder]);

  // MÉTRICAS
  const totalEquipos = teams.length;
  const jugadoresTotales = teams.reduce((sum, t) => sum + (t.NumeroJugadores || 0), 0);
  const ligasActivas = new Set(teams.map(t => t.Liga)).size;

  // LÓGICA DE FILTRADO, BÚSQUEDA Y ORDENAMIENTO
  const filteredTeams = React.useMemo(() => {
    let result = [...teams];
    
    // Filtro por estatus
    if (filtroEstatus !== 'todos') {
      const boolFiltro = filtroEstatus === 'activos';
      result = result.filter(t => !!t.Estatus === boolFiltro);
    }
    
    // Búsqueda en tiempo real
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      result = result.filter(t => 
        (t.NombreEquipo && t.NombreEquipo.toLowerCase().includes(query)) ||
        (t.Categoria && t.Categoria.toLowerCase().includes(query)) ||
        (t.Liga && t.Liga.toLowerCase().includes(query))
      );
    }
    
    // Ordenamiento por Nombre o ID
    result.sort((a, b) => {
      const nameA = a.NombreEquipo || '';
      const nameB = b.NombreEquipo || '';
      if (sortOrder === 'asc') return nameA.localeCompare(nameB);
      return nameB.localeCompare(nameA);
    });
    
    return result;
  }, [teams, filtroEstatus, searchTerm, sortOrder]);

  const paginatedTeams = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTeams.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTeams, currentPage]);

  const columns = [
    { 
      key: 'NombreEquipo', 
      label: 'Equipo',
      render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '40px', height: '40px', borderRadius: '12px', 
            background: 'var(--primary-light)', color: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', border: '1px solid var(--border-light)',
            overflow: 'hidden'
          }}>
            {row.RutaLogo ? (
              <img 
                src={`/${row.RutaLogo.replace(/\\/g, '/')}`} 
                alt={val} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              <FaShieldAlt />
            )}
          </div>
          <div>
            <div style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '14px' }}>{val}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Club Registrado</div>
          </div>
        </div>
      )
    },
    { 
      key: 'Categoria', 
      label: 'Categoría y rama',
      render: (_, row) => (
        <div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>{row.Categoria || 'LIBRE'}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>{row.Rama} • {row.Liga || 'Liga local'}</div>
        </div>
      )
    },
    { 
      key: 'NumeroJugadores', 
      label: 'Plantilla',
      render: (val, row) => (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--bg-main)', padding: '5px 12px', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
          <FaUsers size={14} style={{ color: 'var(--primary)' }} />
          <span style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '13px' }}>
            {val || 0}/{row.SlotsComprados || 0}
          </span>
        </div>
      )
    },
    { 
      key: 'Estatus',
      label: 'Estado operativo',
      render: (status) => (
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
      )
    },
    {
      key: 'acciones',
      label: 'Acciones',
      render: (_, row) => (
        <button
          onClick={async () => {
            try {
              const slots = await teamsService.checkTeamSlots(row.EquipoId, navigate);
              console.log(slots);
            } catch (err) {
              console.error('Error al verificar slots:', err);
            }
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
            color: 'var(--primary)',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <FaUserPlus />
        </button>
      )
    }
  ];

  return (
    <div className="fade-in">
      {/* CABECERA ESTILO PREMIUM */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>Mis equipos registrados</h1>
          <p style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Panel centralizado para la supervisión y gestión administrativa de tus clubes afiliados.</p>
        </div>
        <button 
          className="btn-premium" 
          onClick={() => navigate('/presidente-equipo/configurar-equipo')}
          style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <FaPlus /> Nuevo equipo
        </button>
      </div>

      {/* TARJETAS MÉTRICAS ESTILO PREMIUM */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {[
          { label: 'Equipos Registrados', value: totalEquipos, filter: 'todos', color: 'var(--primary)', icon: <FaShieldAlt /> },
          { label: 'Jugadores Totales', value: jugadoresTotales, color: 'var(--secondary)', icon: <FaUsers />, isMetricOnly: true },
          { label: 'Equipos Activos', value: teams.filter(t => t.Estatus).length, filter: 'activos', color: '#10b981', icon: <FaCheckCircle /> }
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
              {loading ? <Skeleton width="80px" height="24px" /> : <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-main)', lineHeight: 1 }}>{stat.value}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* SECCIÓN DE TABLA ESTILO PREMIUM */}
      <div className="card" style={{ padding: '35px', borderRadius: '24px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
        <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>Listado oficial de equipos</h3>
          
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
            <SearchBar 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o categoría..."
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
              onClick={loadTeams} 
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
          data={paginatedTeams} 
          isLoading={loading} 
          totalItems={filteredTeams.length} 
          itemsPerPage={itemsPerPage} 
          currentPage={currentPage} 
          onPageChange={setCurrentPage} 
          emptyMessage="No se encontraron equipos en la búsqueda." 
        />
      </div>
    </div>
  );
}
