import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/dashboard.css';
import DashboardSidebar from '../../components/DashboardSidebar';
import DashboardHeader from '../../components/DashboardHeader';
import StatCard from '../../components/StatCard';
import DashboardTable from '../../components/DashboardTable';
import teamsService from '../../services/teams';

export default function PresidenteEquipoEquipos() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const email = localStorage.getItem('email');
        if (!email) {
          navigate('/ingresar');
          return;
        }

        setUserEmail(email);

        const response = await teamsService.getUserTeams(email);
        setTeams(response.teams || []);
      } catch (err) {
        console.error('Error cargando equipos:', err);
        setError('No se pudieron cargar los equipos');
      } finally {
        setLoading(false);
      }
    };

    loadTeams();
  }, [navigate]);

  const columns = [
    { key: 'name', label: 'Nombre' },
    { 
      key: 'players', 
      label: 'Jugadores',
      render: (players) => {
        if (Array.isArray(players)) return players.length;
        if (typeof players === 'object') return players?.current || 0;
        return 0;
      }
    },
    { 
      key: 'status',
      label: 'Estado',
      render: (status) => (
        <span className={`badge badge-${status === 'activo' ? 'success' : 'warning'}`}>
          {status || 'Activo'}
        </span>
      )
    }
  ];

  return (
    <div className="dashboard-wrapper">
      <DashboardSidebar userEmail={userEmail} />
      <div className="dashboard-container">
        <DashboardHeader userEmail={userEmail} pageTitle="Mis Equipos" />
        <div className="dashboard-main">
          <div className="dashboard-content">
            {error && (
              <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
                <span className="alert-icon">⚠️</span>
                <div className="alert-content">
                  <p className="alert-message">{error}</p>
                </div>
              </div>
            )}

            <div className="section-header" style={{ marginBottom: '30px' }}>
              <h2 className="section-title">Equipos Registrados</h2>
              <div className="section-actions">
                <button className="btn btn-primary" onClick={() => navigate('/presidente-equipo/crear-equipo')}>
                  ➕ Nuevo Equipo
                </button>
              </div>
            </div>

            <div className="card-grid">
              <StatCard
                icon="⚽"
                title="Total de Equipos"
                value={teams.length.toString()}
              />
              <StatCard
                icon="👥"
                title="Jugadores Totales"
                value={teams.reduce((sum, t) => sum + (t.players?.length || 0), 0).toString()}
              />
            </div>

            <DashboardTable
              columns={columns}
              data={teams}
              isLoading={loading}
              emptyMessage="No has registrado equipos aún"
              onRowClick={(team) => navigate(`/presidente-equipo/admin-equipo/${team.id}`)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
