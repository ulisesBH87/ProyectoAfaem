import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/dashboard.css';
import StatCard from '../../components/StatCard';
import DashboardTable from '../../components/DashboardTable';
import teamsService from '../../services/teams';
import { FaUser, FaRunning, FaHistory, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

export default function PresidenteEquipoMisJugadores() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0
  });

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const data = await teamsService.getUserPlayersReal();
      setPlayers(data || []);
      
      setStats({
        total: data.length,
        active: data.filter(p => p.Estatus).length,
        inactive: data.filter(p => !p.Estatus).length
      });
    } catch (err) {
      console.error('Error cargando jugadores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlayers();
  }, []);

  const columns = [
    { 
      key: 'NombreCompleto', 
      label: 'Jugador',
      render: (val) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ 
            width: '36px', height: '36px', borderRadius: '50%', 
            background: 'var(--primary)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', fontWeight: '800'
          }}>
            {val ? val.charAt(0).toUpperCase() : 'P'}
          </div>
          <div>
            <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '14px' }}>{val}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Miembro Registrado</div>
          </div>
        </div>
      )
    },
    { 
      key: 'Rol', 
      label: 'Posición/Rol',
      render: (val) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', color: 'var(--text-main)', fontSize: '13px' }}>
          <FaRunning size={12} style={{ color: 'var(--primary)' }} /> {val}
        </div>
      )
    },
    { 
      key: 'Equipo', 
      label: 'Equipo Actual',
      render: (val) => (
        <div style={{ fontWeight: '700', color: 'var(--text-muted)', fontSize: '12px' }}>
          {val.toUpperCase()}
        </div>
      )
    },
    { 
      key: 'FechaIngreso',
      label: 'Fecha Ingreso',
      render: (val) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <FaHistory size={11} /> {new Date(val).toLocaleDateString('es-MX')}
        </div>
      )
    },
    { 
      key: 'Estatus',
      label: 'Estado',
      render: (status) => {
        const activeStyle = { 
          padding: '5px 12px', borderRadius: '20px', background: '#dcfce7', color: '#166534',
          fontSize: '11px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px'
        };
        const inactiveStyle = { 
          padding: '5px 12px', borderRadius: '20px', background: '#fee2e2', color: '#991b1b',
          fontSize: '11px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px'
        };

        return (
          <span style={status ? activeStyle : inactiveStyle}>
            {status ? <FaCheckCircle size={10} /> : <FaExclamationCircle size={10} />}
            {status ? 'ACTIVO' : 'INACTIVO'}
          </span>
        );
      }
    }
  ];

  return (
    <div className="dashboard-content fade-in">
      <div className="section-header" style={{ marginBottom: '30px' }}>
        <div>
          <h2 className="section-title">Todos mis Jugadores</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Visualización de miembros activos en tus equipos.</p>
        </div>
        <div className="section-actions">
          <button className="btn-premium" onClick={() => navigate('/presidente-equipo/registro-jugadores')}>
            ➕ Registrar Jugador
          </button>
        </div>
      </div>

      <div className="card-grid" style={{ marginBottom: '30px' }}>
        <StatCard icon="👥" title="Jugadores Registrados" value={stats.total.toString()} />
        <StatCard icon="✅" title="Jugadores Activos" value={stats.active.toString()} />
        <StatCard icon="⏳" title="Inactivos/Pendientes" value={stats.inactive.toString()} />
      </div>

      <div className="card" style={{ padding: '24px' }}>
        <DashboardTable
          columns={columns}
          data={players}
          isLoading={loading}
          emptyMessage="No hay jugadores registrados en la base de datos aún"
          totalItems={stats.total}
          itemsPerPage={10}
        />
      </div>
    </div>
  );
}
