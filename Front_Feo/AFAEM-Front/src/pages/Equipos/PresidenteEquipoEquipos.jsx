import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/dashboard.css';
import StatCard from '../../components/StatCard';
import DashboardTable from '../../components/DashboardTable';
import teamsService from '../../services/teams';
import { FaShieldAlt, FaUsers, FaCalendarAlt, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

export default function PresidenteEquipoEquipos() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const data = await teamsService.getUserTeamsReal();
      setTeams(data || []);
    } catch (err) {
      console.error('Error cargando equipos:', err);
      setError('No se pudieron cargar los equipos de la base de datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const columns = [
    { 
      key: 'NombreEquipo', 
      label: 'Equipo',
      render: (val) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ 
            width: '32px', height: '32px', borderRadius: '8px', 
            background: 'var(--primary)15', color: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <FaShieldAlt size={14} />
          </div>
          <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>{val}</span>
        </div>
      )
    },
    { 
      key: 'Categoria', 
      label: 'Categoría/Rama',
      render: (_, row) => (
        <div>
          <div style={{ fontSize: '13px', fontWeight: '600' }}>{row.Categoria}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{row.Rama} • {row.Modalidad}</div>
        </div>
      )
    },
    { 
      key: 'NumeroJugadores', 
      label: 'Jugadores',
      render: (val) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontWeight: '600' }}>
          <FaUsers size={12} /> {val}
        </div>
      )
    },
    {
      key: 'FechaCreacion',
      label: 'Registro',
      render: (val) => (
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {new Date(val).toLocaleDateString('es-MX')}
        </div>
      )
    },
    { 
      key: 'Estatus',
      label: 'Estado',
      render: (status) => (
        <span style={{ 
          padding: '4px 10px', borderRadius: '20px', 
          background: status ? '#dcfce7' : '#fee2e2', 
          color: status ? '#166534' : '#991b1b',
          fontSize: '11px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px'
        }}>
          {status ? <FaCheckCircle size={10} /> : <FaExclamationCircle size={10} />}
          {status ? 'ACTIVO' : 'INACTIVO'}
        </span>
      )
    }
  ];

  return (
    <div className="dashboard-content fade-in">
      <div className="section-header" style={{ marginBottom: '30px' }}>
        <div>
          <h2 className="section-title">Mis Equipos Registrados</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Gestión oficial de equipos en la base de datos.</p>
        </div>
        <div className="section-actions">
          <button className="btn-premium" onClick={() => navigate('/presidente-equipo/configurar-equipo')}>
            ➕ Nuevo Equipo
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
          <p>{error}</p>
        </div>
      )}

      <div className="card-grid" style={{ marginBottom: '30px' }}>
        <StatCard icon="⚽" title="Total Equipos" value={teams.length.toString()} />
        <StatCard icon="👥" title="Jugadores Totales" value={teams.reduce((sum, t) => sum + (t.NumeroJugadores || 0), 0).toString()} />
        <StatCard icon="🏆" title="Ligas Activas" value={new Set(teams.map(t => t.Liga)).size.toString()} />
      </div>

      <div className="card" style={{ padding: '20px' }}>
        <DashboardTable
          columns={columns}
          data={teams}
          isLoading={loading}
          emptyMessage="No hay equipos registrados en la base de datos aún"
          onRowClick={(team) => navigate(`/presidente-equipo/admin-equipo/${team.EquipoId}`)}
        />
      </div>
    </div>
  );
}
