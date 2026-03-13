import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/dashboard.css';
import DashboardSidebar from '../../components/DashboardSidebar';
import DashboardHeader from '../../components/DashboardHeader';
import StatCard from '../../components/StatCard';
import DashboardTable from '../../components/DashboardTable';
import teamsService from '../../services/teams';

export default function PresidenteEquipoMisJugadores() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0
  });

  useEffect(() => {
    const loadPlayers = async () => {
      try {
        const email = localStorage.getItem('email');
        if (!email) {
          navigate('/ingresar');
          return;
        }

        setUserEmail(email);

        // Obtener equipos del usuario
        const response = await teamsService.getUserTeams(email);
        const teams = response.teams || [];

        // Consolidar todos los jugadores
        const allPlayers = [];
        teams.forEach(team => {
          const teamPlayers = team.players?.map(p => ({
            ...p,
            teamName: team.nombre,
            teamId: team.id
          })) || [];
          allPlayers.push(...teamPlayers);
        });

        setPlayers(allPlayers);
        setStats({
          total: allPlayers.length,
          active: allPlayers.filter(p => p.estatus === 'activo').length,
          pending: allPlayers.filter(p => p.estatus === 'pendiente').length
        });
      } catch (err) {
        console.error('Error cargando jugadores:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPlayers();
  }, [navigate]);

  const columns = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'posicion', label: 'Posición' },
    { key: 'teamName', label: 'Equipo' },
    { 
      key: 'edad',
      label: 'Edad',
      render: (edad) => edad || '-'
    },
    { 
      key: 'estatus',
      label: 'Estado',
      render: (estatus) => (
        <span className={`badge badge-${estatus === 'activo' ? 'success' : 'warning'}`}>
          {estatus || 'Pendiente'}
        </span>
      )
    }
  ];

  return (
    <div className="dashboard-wrapper">
      <DashboardSidebar userEmail={userEmail} />
      <div className="dashboard-container">
        <DashboardHeader userEmail={userEmail} pageTitle="Gestión de Jugadores" />
        <div className="dashboard-main">
          <div className="dashboard-content">
            <div className="section-header" style={{ marginBottom: '30px' }}>
              <h2 className="section-title">Todos mis Jugadores</h2>
              <div className="section-actions">
                <button className="btn btn-primary" onClick={() => navigate('/presidente-equipo/registro-jugadores')}>
                  ➕ Registrar Jugador
                </button>
              </div>
            </div>

            <div className="card-grid">
              <StatCard
                icon="👥"
                title="Jugadores Registrados"
                value={stats.total.toString()}
              />
              <StatCard
                icon="✅"
                title="Activos"
                value={stats.active.toString()}
                iconType="success"
              />
              <StatCard
                icon="⏳"
                title="Pendientes"
                value={stats.pending.toString()}
                iconType="warning"
              />
            </div>

            <DashboardTable
              columns={columns}
              data={players}
              isLoading={loading}
              emptyMessage="No tienes jugadores registrados aún"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
