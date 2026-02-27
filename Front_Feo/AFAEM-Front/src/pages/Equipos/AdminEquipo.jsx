import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaFootballBall, FaCog } from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../styles/dashboard.css';
import DashboardSidebar from '../../components/DashboardSidebar';
import DashboardHeader from '../../components/DashboardHeader';
import { 
  BotonPrimario, 
  BotonSecundario, 
  Insignia, 
  Tarjeta, 
  Cargador,
  Alerta,
  TablaSimple,
  EntradaSeleccion,
  MigasDePan,
  ConsejoFlotante
} from '../../components/partials';
import teamsService from '../../services/teams';

export default function AdminEquipo() {
  const navigate = useNavigate();
  const { teamId } = useParams();
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [activeTab, setActiveTab] = useState('jugadores');
  const [filterStatus, setFilterStatus] = useState(null);
  const [filterStatusTrainers, setFilterStatusTrainers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [stats, setStats] = useState({
    pendientes: 0,
    rechazados: 0,
    enProceso: 0,
    aprobados: 0
  });
  const [statsTrainers, setStatsTrainers] = useState({
    pendientes: 0,
    rechazados: 0,
    enProceso: 0,
    aprobados: 0
  });

  useEffect(() => {
    const loadTeamData = async () => {
      try {
        const email = localStorage.getItem('email');
        if (!email) {
          navigate('/ingresar');
          return;
        }

        setUserEmail(email);

        // Obtener datos del equipo
        const teamsResponse = await teamsService.getUserTeams(email);
        const teams = teamsResponse.teams || [];
        const currentTeam = teams.find(t => t.id == teamId);

        if (!currentTeam) {
          navigate('/presidente-equipo/equipos');
          return;
        }

        setTeam(currentTeam);

        // Obtener jugadores y entrenadores - asegurar que sean arrays
        const jugadores = Array.isArray(currentTeam.players) ? currentTeam.players : [];
        const entrenadores = Array.isArray(currentTeam.trainers) ? currentTeam.trainers : [];

        setPlayers(jugadores);
        setTrainers(entrenadores);

        // Calcular estadísticas para jugadores
        setStats({
          pendientes: jugadores.filter(p => p.estatus === 'pendiente').length,
          rechazados: jugadores.filter(p => p.estatus === 'rechazado').length,
          enProceso: jugadores.filter(p => p.estatus === 'en_proceso').length,
          aprobados: jugadores.filter(p => p.estatus === 'aprobado').length
        });

        // Calcular estadísticas para entrenadores
        setStatsTrainers({
          pendientes: entrenadores.filter(t => t.estatus === 'pendiente').length,
          rechazados: entrenadores.filter(t => t.estatus === 'rechazado').length,
          enProceso: entrenadores.filter(t => t.estatus === 'en_proceso').length,
          aprobados: entrenadores.filter(t => t.estatus === 'aprobado').length
        });
      } catch (err) {
        console.error('Error cargando equipo:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTeamData();
  }, [navigate, teamId]);

  if (loading) {
    return (
      <div className="dashboard-wrapper">
        <DashboardSidebar userEmail="" />
        <div className="dashboard-container">
          <DashboardHeader userEmail="" pageTitle="Cargando..." />
          <div className="dashboard-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Cargador tamanio="grande" mensaje="Cargando equipo..." />
          </div>
        </div>
      </div>
    );
  }

  const filteredPlayers = filterStatus 
    ? players.filter(p => p.estatus === filterStatus)
    : players;

  const filteredTrainers = filterStatusTrainers 
    ? trainers.filter(t => t.estatus === filterStatusTrainers)
    : trainers;

  const _getStatusColor = (status) => {
    switch(status) {
      case 'aprobado': return '#28a745';
      case 'rechazado': return '#dc3545';
      case 'en_proceso': return '#ffc107';
      case 'pendiente': return '#6c757d';
      default: return '#0b4ea6';
    }
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case 'aprobado': return 'Aprobado';
      case 'rechazado': return 'Rechazado';
      case 'en_proceso': return 'En proceso';
      case 'pendiente': return 'Pendiente';
      default: return 'Desconocido';
    }
  };

  return (
    <div className="dashboard-wrapper">
      <DashboardSidebar userEmail={userEmail} />
      
      <div className="dashboard-container">
        <DashboardHeader userEmail={userEmail} pageTitle="Administración de Equipo" />
        
        <div className="dashboard-main">
          <div className="dashboard-content">
            {/* MIGAS DE PAN */}
            <MigasDePan
              elementos={[
                { etiqueta: 'Mis equipos', ruta: '/presidente-equipo/equipos' },
                { etiqueta: team?.name || 'Equipo', ruta: null }
              ]}
            />
            {team && (
              <>
                {/* HEADER DEL EQUIPO */}
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '30px',
                  marginBottom: '30px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '30px'
                  }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flex: 1 }}>
                      {/* LOGO DEL EQUIPO */}
                      <div style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '12px',
                        backgroundColor: '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '40px',
                        fontWeight: 'bold',
                        color: '#0b4ea6',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        flexShrink: 0
                      }}>
                        {team.logo || '⚽'}
                      </div>

                      {/* INFO DEL EQUIPO */}
                      <div style={{ flex: 1 }}>
                        <h1 style={{
                          margin: '0 0 15px 0',
                          color: '#0b4ea6',
                          fontSize: '24px',
                          fontWeight: '700',
                          lineHeight: '1.3'
                        }}>
                          {team.name}
                        </h1>
                        
                        {/* STATS EN GRID */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '20px',
                          marginBottom: '15px'
                        }}>
                          <div>
                            <small style={{ 
                              color: '#64748b', 
                              fontSize: '11px',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}>
                              Modalidad
                            </small>
                            <div style={{ 
                              color: '#1e293b', 
                              fontWeight: '700',
                              fontSize: '14px',
                              marginTop: '4px'
                            }}>
                              {team.modality === 'futbol7' ? 'Fútbol 7' : 
                               team.modality === 'futbol9' ? 'Fútbol 9' :
                               team.modality === 'futbol11' ? 'Fútbol 11' : team.modality}
                            </div>
                          </div>
                          <div>
                            <small style={{ 
                              color: '#64748b', 
                              fontSize: '11px',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}>
                              Jugadores
                            </small>
                            <div style={{ 
                              color: '#1e293b', 
                              fontWeight: '700',
                              fontSize: '14px',
                              marginTop: '4px'
                            }}>
                              {Array.isArray(team.players) ? team.players.length : 0} / 25
                            </div>
                          </div>
                          <div>
                            <small style={{ 
                              color: '#64748b', 
                              fontSize: '11px',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}>
                              Entrenadores
                            </small>
                            <div style={{ 
                              color: '#1e293b', 
                              fontWeight: '700',
                              fontSize: '14px',
                              marginTop: '4px'
                            }}>
                              {Array.isArray(team.trainers) ? team.trainers.length : 0}
                            </div>
                          </div>
                        </div>

                        {/* ESTADO */}
                        <span style={{
                          display: 'inline-block',
                          backgroundColor: team.status === 'activo' ? '#dcfce7' : '#fef3c7',
                          color: team.status === 'activo' ? '#166534' : '#92400e',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          {team.status === 'activo' ? '✓ Activo' : '⏳ Inscrito'}
                        </span>
                      </div>
                    </div>

                    {/* BOTONES */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '200px' }}>
                      <BotonPrimario 
                        etiqueta="🏆 Inscribir equipo a liga"
                        alHacerClick={() => {}}
                        tamanio="medio"
                      />
                      <BotonSecundario
                        etiqueta="⚙ Configurar equipo"
                        alHacerClick={() => {}}
                        tamanio="medio"
                      />
                    </div>
                  </div>
                </div>

                {/* TABS */}
                <div style={{
                  borderBottom: '2px solid var(--border-color)',
                  marginBottom: '30px',
                  display: 'flex',
                  gap: '30px',
                  backgroundColor: 'white',
                  paddingBottom: '0',
                  marginTop: '-1px'
                }}>
                  <button
                    onClick={() => {
                      setActiveTab('jugadores');
                      setFilterStatus(null);
                    }}
                    style={{
                      padding: '16px 0',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      fontSize: '15px',
                      fontWeight: activeTab === 'jugadores' ? '700' : '600',
                      color: activeTab === 'jugadores' ? '#0b4ea6' : '#64748b',
                      borderBottom: activeTab === 'jugadores' ? '3px solid #0b4ea6' : 'none',
                      marginBottom: '-2px',
                      transition: 'all 0.3s',
                      position: 'relative'
                    }}
                  >
                    Jugadores
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('entrenadores');
                      setFilterStatusTrainers(null);
                    }}
                    style={{
                      padding: '16px 0',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      fontSize: '15px',
                      fontWeight: activeTab === 'entrenadores' ? '700' : '600',
                      color: activeTab === 'entrenadores' ? '#0b4ea6' : '#64748b',
                      borderBottom: activeTab === 'entrenadores' ? '3px solid #0b4ea6' : 'none',
                      marginBottom: '-2px',
                      transition: 'all 0.3s'
                    }}
                  >
                    Entrenadores
                  </button>
                </div>

                {activeTab === 'jugadores' && (
                  <>
                    {/* RESUMEN DE ESTADOS */}
                    <div style={{
                      display: 'flex',
                      gap: '15px',
                      marginBottom: '25px',
                      flexWrap: 'wrap',
                      alignItems: 'center'
                    }}>
                      <div style={{
                        padding: '14px 18px',
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <span style={{ color: '#64748b' }}>Total registrados:</span>
                        <span style={{ color: '#0b4ea6', fontWeight: '700' }}>
                          {players.length} / 25
                        </span>
                        <BotonPrimario
                          etiqueta="+ Agregar"
                          alHacerClick={() => navigate('/presidente-equipo/registro-jugadores', { state: { teamId } })}
                          tamanio="pequeno"
                          estilo={{ marginLeft: '8px' }}
                        />
                      </div>
                    </div>

                    {/* FILTROS DE ESTADO */}
                    <div style={{
                      display: 'flex',
                      gap: '20px',
                      marginBottom: '30px',
                      padding: '16px 20px',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      alignItems: 'center',
                      flexWrap: 'wrap'
                    }}>
                      <label style={{
                        fontSize: '12px',
                        color: '#64748b',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        FILTRAR POR ESTADO:
                      </label>
                      
                      <EntradaSeleccion
                        nombre="filterStatus"
                        valor={filterStatus || ''}
                        alCambiar={(e) => setFilterStatus(e.target.value || null)}
                        opciones={[
                          { valor: '', etiqueta: 'Todos' },
                          { valor: 'pendiente', etiqueta: `Pendientes (${stats.pendientes})` },
                          { valor: 'rechazado', etiqueta: `Rechazados (${stats.rechazados})` },
                          { valor: 'en_proceso', etiqueta: `En proceso (${stats.enProceso})` },
                          { valor: 'aprobado', etiqueta: `Aprobados (${stats.aprobados})` }
                        ]}
                        estilo={{ minWidth: '250px', marginBottom: '0' }}
                      />
                    </div>

                    {/* GRID DE JUGADORES */}
                    {filteredPlayers.length > 0 ? (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                        gap: '24px'
                      }}>
                        {filteredPlayers.map((player) => (
                          <div
                            key={player.id}
                            style={{
                              border: '1px solid var(--border-color)',
                              borderRadius: '12px',
                              overflow: 'hidden',
                              backgroundColor: 'white',
                              transition: 'all 0.3s ease',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.12)';
                              e.currentTarget.style.transform = 'translateY(-4px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                          >
                            {/* FOTO DEL JUGADOR */}
                            <div style={{
                              width: '100%',
                              height: '160px',
                              backgroundColor: '#f1f5f9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '50px',
                              borderBottom: '1px solid var(--border-color)',
                              overflow: 'hidden'
                            }}>
                              {player.foto || '👤'}
                            </div>

                            {/* INFO DEL JUGADOR */}
                            <div style={{ padding: '16px' }}>
                              <h3 style={{
                                margin: '0 0 10px 0',
                                fontSize: '13px',
                                fontWeight: '700',
                                color: '#1e293b',
                                lineHeight: '1.4'
                              }}>
                                {player.nombre}
                              </h3>

                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '12px',
                                color: '#64748b',
                                marginBottom: '12px',
                                fontWeight: '500'
                              }}>
                                <span>{player.genero === 'M' ? 'Masculino' : 'Femenino'}</span>
                                <span>{player.edad || '-'}</span>
                              </div>

                              {/* ESTADO */}
                              <Insignia
                                etiqueta={getStatusLabel(player.estatus)}
                                tipo={
                                  player.estatus === 'aprobado' ? 'exito' :
                                  player.estatus === 'rechazado' ? 'error' :
                                  player.estatus === 'en_proceso' ? 'advertencia' :
                                  'gris'
                                }
                                tamanio="pequeno"
                              />

                              {/* BOTONES */}
                              <div style={{
                                display: 'flex',
                                gap: '8px',
                                marginTop: '12px'
                              }}>
                                <BotonPrimario 
                                  etiqueta="Ver"
                                  alHacerClick={() => {}}
                                  tamanio="pequeno"
                                  estilo={{ flex: 1 }}
                                />
                                <BotonSecundario
                                  etiqueta="Editar"
                                  alHacerClick={() => {}}
                                  tamanio="pequeno"
                                  estilo={{ flex: 1 }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{
                        padding: '60px 40px',
                        textAlign: 'center',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        color: '#64748b',
                        border: '1px solid var(--border-color)'
                      }}>
                        <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
                        <p style={{ margin: '0', fontSize: '15px', fontWeight: '600' }}>
                          {filterStatus ? 'No hay jugadores con este estado' : 'No has registrado jugadores aún'}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'entrenadores' && (
                  <>
                    {/* RESUMEN DE ESTADOS */}
                    <div style={{
                      display: 'flex',
                      gap: '15px',
                      marginBottom: '25px',
                      flexWrap: 'wrap',
                      alignItems: 'center'
                    }}>
                      <div style={{
                        padding: '14px 18px',
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <span style={{ color: '#64748b' }}>Total registrados:</span>
                        <span style={{ color: '#0b4ea6', fontWeight: '700' }}>
                          {trainers.length}
                        </span>
                        <BotonPrimario
                          etiqueta="+ Invitar entrenador"
                          alHacerClick={() => {}}
                          tamanio="pequeno"
                          estilo={{ marginLeft: '8px' }}
                        />
                      </div>
                    </div>

                    {/* FILTROS DE ESTADO */}
                    <div style={{
                      display: 'flex',
                      gap: '20px',
                      marginBottom: '30px',
                      padding: '16px 20px',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      alignItems: 'center',
                      flexWrap: 'wrap'
                    }}>
                      <label style={{
                        fontSize: '12px',
                        color: '#64748b',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        FILTRAR POR ESTADO:
                      </label>
                      
                      <EntradaSeleccion
                        nombre="filterStatusTrainers"
                        valor={filterStatusTrainers || ''}
                        alCambiar={(e) => setFilterStatusTrainers(e.target.value || null)}
                        opciones={[
                          { valor: '', etiqueta: 'Todos' },
                          { valor: 'pendiente', etiqueta: `Pendientes (${statsTrainers.pendientes})` },
                          { valor: 'rechazado', etiqueta: `Rechazados (${statsTrainers.rechazados})` },
                          { valor: 'en_proceso', etiqueta: `En proceso (${statsTrainers.enProceso})` },
                          { valor: 'aprobado', etiqueta: `Aprobados (${statsTrainers.aprobados})` }
                        ]}
                        estilo={{ minWidth: '250px', marginBottom: '0' }}
                      />
                    </div>

                    {/* GRID DE ENTRENADORES */}
                    {filteredTrainers.length > 0 ? (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                        gap: '24px'
                      }}>
                        {filteredTrainers.map((trainer) => (
                          <div
                            key={trainer.id}
                            style={{
                              border: '1px solid var(--border-color)',
                              borderRadius: '12px',
                              overflow: 'hidden',
                              backgroundColor: 'white',
                              transition: 'all 0.3s ease',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.12)';
                              e.currentTarget.style.transform = 'translateY(-4px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                          >
                            {/* FOTO DEL ENTRENADOR */}
                            <div style={{
                              width: '100%',
                              height: '160px',
                              backgroundColor: '#f1f5f9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '50px',
                              borderBottom: '1px solid var(--border-color)',
                              overflow: 'hidden'
                            }}>
                              {trainer.foto || '👨‍🏫'}
                            </div>

                            {/* INFO DEL ENTRENADOR */}
                            <div style={{ padding: '16px' }}>
                              <h3 style={{
                                margin: '0 0 10px 0',
                                fontSize: '13px',
                                fontWeight: '700',
                                color: '#1e293b',
                                lineHeight: '1.4'
                              }}>
                                {trainer.nombre}
                              </h3>

                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '12px',
                                color: '#64748b',
                                marginBottom: '12px',
                                fontWeight: '500'
                              }}>
                                <span>{trainer.especialidad || 'Entrenador'}</span>
                              </div>

                              {/* ESTADO */}
                              <Insignia
                                etiqueta={getStatusLabel(trainer.estatus)}
                                tipo={
                                  trainer.estatus === 'aprobado' ? 'exito' :
                                  trainer.estatus === 'rechazado' ? 'error' :
                                  trainer.estatus === 'en_proceso' ? 'advertencia' :
                                  'gris'
                                }
                                tamanio="pequeno"
                              />

                              {/* BOTONES */}
                              <div style={{
                                display: 'flex',
                                gap: '8px',
                                marginTop: '12px'
                              }}>
                                <BotonPrimario 
                                  etiqueta="Ver"
                                  alHacerClick={() => {}}
                                  tamanio="pequeno"
                                  estilo={{ flex: 1 }}
                                />
                                <BotonSecundario
                                  etiqueta="Editar"
                                  alHacerClick={() => {}}
                                  tamanio="pequeno"
                                  estilo={{ flex: 1 }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{
                        padding: '60px 40px',
                        textAlign: 'center',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        color: '#64748b',
                        border: '1px solid var(--border-color)'
                      }}>
                        <div style={{ fontSize: '32px', marginBottom: '12px' }}>👨‍🏫</div>
                        <p style={{ margin: '0', fontSize: '15px', fontWeight: '600' }}>
                          {filterStatusTrainers ? 'No hay entrenadores con este estado' : 'No has registrado entrenadores aún'}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
