import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUsers, FaClipboard, FaFootballBall, FaAward, FaTrophy } from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../styles/dashboard.css';

// Nuevos componentes premium
import DashboardSidebar from '../../components/DashboardSidebar';
import DashboardHeader from '../../components/DashboardHeader';
import StatCard from '../../components/StatCard';
import DashboardTable from '../../components/DashboardTable';

// Servicios
import teamsService from '../../services/teams';

export default function PresidenteEquipo() {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [teams, setTeams] = useState([]);
  const [stats, setStats] = useState({
    totalTeams: 0,
    totalPlayers: 0,
    pendingRequests: 0,
    certifications: 0
  });
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Obtener datos del usuario del localStorage
        const email = localStorage.getItem('email');
        if (!email) {
          navigate('/ingresar');
          return;
        }

        // Cargar perfil del usuario
        try {
          const profileData = await teamsService.getUserProfile(email);
          setUserInfo({
            email: email,
            ...profileData
          });
        } catch (err) {
          console.warn('No se pudo obtener perfil:', err);
          setUserInfo({ email });
        }

        // Cargar equipos
        try {
          const teamsData = await teamsService.getUserTeams(email);
          const teamsList = teamsData.teams || [];
          setTeams(teamsList);
          
          // Calcular estadísticas
          let totalPlayers = 0;
          teamsList.forEach(team => {
            totalPlayers += team.players?.length || 0;
          });

          setStats({
            totalTeams: teamsList.length,
            totalPlayers: totalPlayers,
            pendingRequests: 0,
            certifications: 1
          });
        } catch (err) {
          console.warn('No se pudo obtener equipos:', err);
          setTeams([]);
        }
      } catch (err) {
        console.error('Error cargando datos:', err);
        setError('Error cargando los datos');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="dashboard-wrapper">
        <DashboardSidebar userEmail="" />
        <div className="dashboard-container">
          <DashboardHeader userEmail="" pageTitle="Cargando..." />
          <div className="dashboard-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
              <p style={{ marginTop: '10px', color: '#64748b' }}>Cargando tu panel...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const userEmail = userInfo?.email || '';
  const userName = userInfo?.name || 'Usuario';

  const obtenerEtiquetaModalidad = (modality) => {
    switch(modality) {
      case 'futbol7': return 'Fútbol 7';
      case 'futbol9': return 'Fútbol 9';
      case 'futbol11': return 'Fútbol 11';
      default: return modality;
    }
  };

  const obtenerInsigniaEstado = (status) => {
    const statusMap = {
      'activo': { color: '#28a745', label: '✓ Activo', bg: '#dcfce7' },
      'inscrito': { color: '#ffc107', label: '⏳ Inscrito', bg: '#fef3c7' },
      'en_inscripcion': { color: '#dc3545', label: '⏳ En inscripción', bg: '#fee2e2' },
      'pendiente': { color: '#ffc107', label: '⏳ Pendiente', bg: '#fef3c7' }
    };
    return statusMap[status] || { color: '#6c757d', label: status, bg: '#f3f4f6' };
  };

  return (
    <div className="dashboard-wrapper">
      <DashboardSidebar userEmail={userEmail} />
      
      <div className="dashboard-container">
        <DashboardHeader userEmail={userEmail} pageTitle={`Bienvenido, ${userName}`} />
        
        <div className="dashboard-main">
          <div className="dashboard-content">
            {/* SECCIÓN "¿QUÉ QUIERES HACER HOY?" + SOLICITUDES PENDIENTES */}
            <div style={{
              marginBottom: '40px',
              paddingBottom: '0',
              borderBottom: 'none'
            }}>
              <h3 style={{
                margin: '0 0 20px 0',
                color: '#0b2546',
                fontSize: '16px',
                fontWeight: '600'
              }}>
                ¿Qué quieres hacer hoy?
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '16px',
                marginBottom: '40px'
              }}>
                {/* BOTÓN 1: CREAR EQUIPO NUEVO */}
                <button
                  onClick={() => navigate('/presidente-equipo/crear-equipo')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    padding: '24px 20px',
                    backgroundColor: 'white',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontWeight: '600',
                    color: '#0b4ea6',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ fontSize: '32px' }}><FaAward /></div>
                  <span>Crea equipo nuevo</span>
                </button>

                {/* BOTÓN 2: INSCRIBIR A LIGA */}
                <button
                  onClick={() => alert('Funcionalidad próximamente')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    padding: '24px 20px',
                    backgroundColor: 'white',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontWeight: '600',
                    color: '#0b4ea6',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ fontSize: '32px' }}><FaTrophy /></div>
                  <span>Inscribir equipo a liga</span>
                </button>

                {/* BOTÓN 3: REGISTRAR INTEGRANTES */}
                <button
                  onClick={() => navigate('/presidente-equipo/registro-jugadores')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    padding: '24px 20px',
                    backgroundColor: 'white',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontWeight: '600',
                    color: '#0b4ea6',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ fontSize: '32px' }}><FaUsers /></div>
                  <span>Registrar integrantes</span>
                </button>

                {/* BOTÓN 4: SOLICITUDES */}
                <button
                  onClick={() => navigate('/presidente-equipo/admin-solicitudes')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    padding: '24px 20px',
                    backgroundColor: 'white',
                    border: `1px solid ${stats.pendingRequests > 0 ? '#ef4444' : 'var(--border-color)'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontWeight: '600',
                    color: stats.pendingRequests > 0 ? '#ef4444' : '#0b4ea6',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ fontSize: '32px' }}><FaClipboard /></div>
                  <span>{stats.pendingRequests === 0 ? 'Sin solicitudes' : `Solicitudes pendientes: ${stats.pendingRequests}`}</span>
                </button>
              </div>
            </div>

            {/* PANEL DE EQUIPOS */}
            <div>
              <h3 style={{
                margin: '0 0 20px 0',
                color: '#0b2546',
                fontSize: '18px',
                fontWeight: '700'
              }}>
                Panel de equipos
              </h3>

              {teams.length > 0 ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '20px'
                }}>
                  {teams.map((team) => {
                    const playerCount = Array.isArray(team.players) ? team.players.length : 0;
                    const trainerCount = Array.isArray(team.trainers) ? team.trainers.length : 0;
                    const statusInfo = obtenerInsigniaEstado(team.status);
                    const modality = obtenerEtiquetaModalidad(team.modality);

                    return (
                      <div
                        key={team.id}
                        style={{
                          backgroundColor: 'white',
                          borderRadius: '12px',
                          padding: '20px',
                          border: '1px solid var(--border-color)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
                          e.currentTarget.style.transform = 'translateY(-4px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        {/* LOGO Y NOMBRE */}
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'flex-start' }}>
                          <div style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '8px',
                            backgroundColor: '#f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '28px',
                            fontWeight: 'bold',
                            color: '#0b4ea6',
                            flexShrink: 0
                          }}>
                            {team.logo ? team.logo : <FaFootballBall />}
                          </div>
                          <div>
                            <h4 style={{
                              margin: '0 0 4px 0',
                              color: '#0b2546',
                              fontSize: '15px',
                              fontWeight: '700'
                            }}>
                              {team.name}
                            </h4>
                            <span style={{
                              fontSize: '12px',
                              color: '#64748b',
                              fontWeight: '500'
                            }}>
                              ID: {team.id}
                            </span>
                          </div>
                        </div>

                        {/* INFORMACIÓN */}
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '12px',
                            marginBottom: '12px'
                          }}>
                            <div>
                              <small style={{ color: '#64748b', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>
                                Modalidad
                              </small>
                              <div style={{ color: '#1e293b', fontWeight: '700', fontSize: '13px', marginTop: '4px' }}>
                                {modality}
                              </div>
                            </div>
                            <div>
                              <small style={{ color: '#64748b', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>
                                Jugadores
                              </small>
                              <div style={{ color: '#1e293b', fontWeight: '700', fontSize: '13px', marginTop: '4px' }}>
                                {playerCount} / 25
                              </div>
                            </div>
                          </div>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '12px'
                          }}>
                            <div>
                              <small style={{ color: '#64748b', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>
                                Entrenadores
                              </small>
                              <div style={{ color: '#1e293b', fontWeight: '700', fontSize: '13px', marginTop: '4px' }}>
                                {trainerCount}
                              </div>
                            </div>
                            <div>
                              <small style={{ color: '#64748b', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>
                                Estado
                              </small>
                              <div style={{
                                backgroundColor: statusInfo.bg,
                                color: statusInfo.color,
                                fontWeight: '700',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                marginTop: '4px',
                                display: 'inline-block'
                              }}>
                                {statusInfo.label}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* BOTÓN */}
                        <button
                          onClick={() => navigate(`/presidente-equipo/admin-equipo/${team.id}`)}
                          style={{
                            width: '100%',
                            padding: '10px 16px',
                            backgroundColor: '#3d79ff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#1e5be6';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#3d79ff';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          Administrar
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  padding: '20px',
                  textAlign: 'center',
                  color: '#0c4a6e'
                }}>
                  <p style={{ margin: '0 0 10px 0', fontWeight: '600' }}>No tienes equipos aún</p>
                  <button
                    onClick={() => navigate('/presidente-equipo/crear-equipo')}
                    style={{
                      backgroundColor: '#3d79ff',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '13px'
                    }}
                  >
                    Crear primer equipo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
