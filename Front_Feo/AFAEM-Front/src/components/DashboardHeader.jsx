import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaBell, FaSignOutAlt, FaUserCircle, FaKeyboard, FaShieldAlt, FaUsers, FaArrowRight } from 'react-icons/fa';
import Swal from 'sweetalert2';
import SearchBar from './Common/SearchBar';
import { getEquiposDirectorio, getJugadoresDirectorio } from '../services/admin';

const DashboardHeader = ({ userEmail, pageTitle = 'Dashboard' }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // ESTADOS PARA BÚSQUEDA INTELIGENTE
  const [showResults, setShowResults] = useState(false);
  const [allTeams, setAllTeams] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [filteredResults, setFilteredResults] = useState({ actions: [], teams: [], players: [] });

  useEffect(() => {
    const closeMenu = () => setShowUserMenu(false);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const notifications = [
    { id: 1, text: 'Nueva solicitud de validación', time: 'hace 5 min', type: 'info' },
    { id: 2, text: 'Actualización de equipo exitosa', time: 'hace 1 h', type: 'success' },
  ];

  // CATÁLOGO DE ACCIONES ESTÁTICAS
  const quickActions = [
    { label: 'Administrar equipos', route: '/admin/equipos', keywords: 'crear nuevo club equipos directorio' },
    { label: 'Directorio de jugadores', route: '/admin/jugadores', keywords: 'editar buscar jugadores personas' },
    { label: 'Alta rápida (Jugador)', route: '/admin/jugadores/crear', keywords: 'inscribir nuevo alta rapida' },
    { label: 'Validación de pagos', route: '/admin/pagos', keywords: 'voucher validar ordenes dinero' },
    { label: 'Gestión de solicitudes', route: '/admin/solicitudes', keywords: 'tramites pendientes autorizar' },
    { label: 'Dashboard general', route: '/admin/dashboard', keywords: 'inicio home resumen resúmen' },
    { label: 'Configuración y Roles', route: '/admin/usuarios-roles', keywords: 'administradores seguridad permisos' }
  ];

  // CARGAR DATOS PARA BÚSQUEDA
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teams, players] = await Promise.all([
          getEquiposDirectorio(),
          getJugadoresDirectorio()
        ]);
        setAllTeams(teams || []);
        setAllPlayers(players || []);
      } catch (err) {
        console.warn("No se pudo cargar el índice de búsqueda completo.");
      }
    };
    fetchData();
  }, []);

  // LÓGICA DE FILTRADO DINÁMICO
  useEffect(() => {
    if (searchQuery.length < 2) {
      setFilteredResults({ actions: [], teams: [], players: [] });
      setShowResults(false);
      return;
    }

    const query = searchQuery.toLowerCase();

    const matchedActions = quickActions.filter(a => 
      a.label.toLowerCase().includes(query) || a.keywords.includes(query)
    ).slice(0, 5);

    const matchedTeams = allTeams.filter(t => 
      t.NombreEquipo?.toLowerCase().includes(query)
    ).slice(0, 5);

    const matchedPlayers = allPlayers.filter(p => 
      p.NombreCompleto?.toLowerCase().includes(query) || 
      p.CURP?.toLowerCase().includes(query) ||
      p.Email?.toLowerCase().includes(query)
    ).slice(0, 5);

    setFilteredResults({
      actions: matchedActions,
      teams: matchedTeams,
      players: matchedPlayers
    });
    
    setShowResults(true);
  }, [searchQuery, allTeams, allPlayers]);

  const getInitials = (email) => {
    return email ? email.split('@')[0].substring(0, 2).toUpperCase() : 'US';
  };

  const handleLogout = () => {
    Swal.fire({
      title: '¿Cerrar sesión?',
      text: 'Tendrás que ingresar tus credenciales nuevamente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--danger)',
      cancelButtonColor: 'var(--text-muted)',
      confirmButtonText: 'Sí, cerrar sesión',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.clear();
        navigate('/ingresar');
      }
    });
  };

  const handleSelectResult = (type, item) => {
    setSearchQuery('');
    setShowResults(false);
    
    if (type === 'action') {
      navigate(item.route);
    } else if (type === 'team') {
      // Navegar a detalle de equipo (Usando la vista AdminEquipo que está en presidente-equipo pero es compartida)
      navigate(`/presidente-equipo/admin-equipo/${item.EquipoId}`);
    } else if (type === 'player') {
      // Navegar a directorio de jugadores y pasar ID para abrir edición
      navigate('/admin/jugadores', { state: { editPlayerId: item.MiembroEquipoId } });
    }
  };

  return (
    <header 
      className="main-header-fixed"
      style={{
        height: 'var(--header-height)',
        padding: '0 30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        backgroundColor: '#ffffff', // Fondo sólido
        borderBottom: '1px solid #e2e8f0',
        zIndex: 1000,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <h2 style={{ 
          fontSize: '22px', 
          fontWeight: '800', 
          color: 'var(--primary)', 
          margin: 0,
          letterSpacing: '-0.5px'
        }}>
          {pageTitle}
        </h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div style={{ position: 'relative' }}>
          <SearchBar 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar equipos, jugadores o secciones..."
            width="320px"
          />

          {/* DROPDOWN DE RESULTADOS INTELIGENTE */}
          {showResults && (
            <div className="fade-in glass" style={{
              position: 'absolute', top: '50px', left: 0,
              width: '400px', backgroundColor: 'rgba(255,255,255,0.98)',
              borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
              padding: '12px', zIndex: 2000, border: '1px solid var(--border-light)',
              maxHeight: '80vh', overflowY: 'auto'
            }}>
              
              {/* SECCIÓN ACCIONES */}
              {filteredResults.actions.length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', padding: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaKeyboard /> Sugerencias rápidas
                  </div>
                  {filteredResults.actions.map((act, i) => (
                    <div 
                      key={i} 
                      onClick={() => handleSelectResult('action', act)}
                      style={{ padding: '12px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-light)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>{act.label}</div>
                      <FaArrowRight style={{ fontSize: '10px', color: 'var(--primary)' }} />
                    </div>
                  ))}
                </div>
              )}

              {/* SECCIÓN EQUIPOS */}
              {filteredResults.teams.length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', padding: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaShieldAlt /> Equipos destacados
                  </div>
                  {filteredResults.teams.map((team, i) => (
                    <div 
                      key={i} 
                      onClick={() => handleSelectResult('team', team)}
                      style={{ padding: '12px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '12px' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-light)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <FaShieldAlt style={{ fontSize: '14px' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>{team.NombreEquipo}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{team.Liga || 'Liga Oficial'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* SECCIÓN JUGADORES */}
              {filteredResults.players.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', padding: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaUsers /> Resultados de jugadores
                  </div>
                  {filteredResults.players.map((plyr, i) => (
                    <div 
                      key={i} 
                      onClick={() => handleSelectResult('player', plyr)}
                      style={{ padding: '12px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '12px' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-light)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '12px' }}>
                         {plyr.NombreCompleto?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>{plyr.NombreCompleto}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{plyr.CURP} • {plyr.EquipoNombre || 'Sin equipo'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {filteredResults.actions.length === 0 && filteredResults.teams.length === 0 && filteredResults.players.length === 0 && (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                   <FaSearch style={{ fontSize: '24px', marginBottom: '10px', opacity: 0.3 }} />
                   <div style={{ fontSize: '13px', fontWeight: '600' }}>No encontramos coincidencias para "{searchQuery}"</div>
                   <div style={{ fontSize: '11px' }}>Prueba con otras palabras clave</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div 
          style={{ position: 'relative', cursor: 'pointer' }}
          onMouseEnter={() => setShowNotifications(true)}
          onMouseLeave={() => setShowNotifications(false)}
        >
          <div style={{ 
            width: '40px', height: '40px', borderRadius: '10px', 
            background: 'white', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', color: 'var(--text-muted)', border: '1px solid var(--border-light)'
          }}>
            <FaBell style={{ fontSize: '18px' }} />
            {notifications.length > 0 && (
              <span style={{
                position: 'absolute', top: '-4px', right: '-4px',
                width: '18px', height: '18px', borderRadius: '50%',
                backgroundColor: 'var(--danger)', color: 'white',
                fontSize: '10px', fontWeight: 'bold', display: 'flex',
                alignItems: 'center', justifyContent: 'center', border: '2px solid white'
              }}>{notifications.length}</span>
            )}
          </div>
          
          {showNotifications && (
            <div className="fade-in glass" style={{
              position: 'absolute', top: '50px', right: '0',
              width: '320px', borderRadius: 'var(--radius-md)', 
              boxShadow: 'var(--shadow-xl)', padding: '16px', zIndex: 1000
            }}>
              <h4 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '12px' }}>Notificaciones</h4>
              {notifications.map(notif => (
                <div key={notif.id} style={{ 
                  padding: '10px', borderRadius: '8px', marginBottom: '8px',
                  background: 'rgba(255,255,255,0.5)', border: '1px solid var(--border-light)'
                }}>
                  <div style={{ fontSize: '13px', fontWeight: '600' }}>{notif.text}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{notif.time}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Profile */}
        <div 
          onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu); }}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            cursor: 'pointer',
            padding: '6px 12px',
            borderRadius: '12px',
            transition: 'background 0.2s',
            minWidth: '160px',
            justifyContent: 'flex-end',
            flexShrink: 0
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(11, 78, 166, 0.05)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ textAlign: 'right', flexShrink: 1, minWidth: 0 }}>
            <div style={{ 
              fontSize: '13px', 
              fontWeight: '700', 
              color: 'var(--text-main)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {userEmail ? userEmail.split('@')[0] : 'User'}
            </div>
            <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>Administrator</div>
          </div>
          <div style={{
            width: '44px', 
            height: '44px', 
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--primary) 100%)',
            color: 'white', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontWeight: 'bold',
            flexShrink: 0,
            boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)'
          }}>
            {getInitials(userEmail)}
          </div>

          {showUserMenu && (
            <div className="fade-in glass" style={{
              position: 'absolute', top: '70px', right: '30px', minWidth: '200px',
              borderRadius: 'var(--radius-md)', padding: '8px', boxShadow: 'var(--shadow-xl)'
            }}>
               <button 
                 onClick={handleLogout}
                 style={{ 
                   width: '100%', padding: '12px', borderRadius: '8px',
                   display: 'flex', alignItems: 'center', gap: '10px',
                   color: 'var(--danger)', background: 'transparent', fontWeight: '600'
                 }}
                 onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                 onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
               >
                 <FaSignOutAlt /> Cerrar Sesión
               </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
