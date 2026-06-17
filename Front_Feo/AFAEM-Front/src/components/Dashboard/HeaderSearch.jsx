import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaKeyboard, FaShieldAlt, FaUsers, FaArrowRight } from 'react-icons/fa';
import SearchBar from '../Common/SearchBar';
import { getEquiposDirectorio, getJugadoresDirectorio } from '../../services/admin';
import { ROUTES } from '../../routes/paths';

const HeaderSearch = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [allTeams, setAllTeams] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [filteredResults, setFilteredResults] = useState({ actions: [], teams: [], players: [] });

  const quickActions = [
    { label: 'Administrar equipos', route: ROUTES.ADMIN.EQUIPOS, keywords: 'crear nuevo club equipos directorio' },
    { label: 'Directorio de jugadores', route: ROUTES.ADMIN.JUGADORES, keywords: 'editar buscar jugadores personas' },
    { label: 'Alta rápida (Jugador)', route: ROUTES.ADMIN.JUGADORES_CREAR, keywords: 'inscribir nuevo alta rapida' },
    { label: 'Validación de pagos', route: ROUTES.ADMIN.PAGOS, keywords: 'voucher validar ordenes dinero' },
    { label: 'Gestión de solicitudes', route: ROUTES.ADMIN.SOLICITUDES, keywords: 'tramites pendientes autorizar' },
    { label: 'Dashboard general', route: ROUTES.ADMIN.DASHBOARD, keywords: 'inicio home resumen resúmen' },
    { label: 'Configuración y Roles', route: ROUTES.ADMIN.USUARIOS_ROLES, keywords: 'administradores seguridad permisos' }
  ];

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
      }
    };
    fetchData();
  }, []);

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

  const handleSelectResult = (type, item) => {
    setSearchQuery('');
    setShowResults(false);
    if (type === 'action') navigate(item.route);
    else if (type === 'team') navigate(ROUTES.PRESIDENTE.ADMIN_EQUIPO.replace(':equipoId', item.EquipoId));
    else if (type === 'player') navigate(ROUTES.ADMIN.JUGADORES, { state: { editPlayerId: item.MiembroEquipoId } });
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <SearchBar
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Buscar equipos, jugadores o secciones..."
        width="100%"
      />

      {showResults && (
        <div className="fade-in glass" style={{
          position: 'absolute', top: '50px', left: 0,
          width: '400px', backgroundColor: 'rgba(255,255,255,0.98)',
          borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
          padding: '12px', zIndex: 2000, border: '1px solid var(--border-light)',
          maxHeight: '80vh', overflowY: 'auto'
        }}>
          {filteredResults.actions.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', padding: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaKeyboard /> Sugerencias rápidas
              </div>
              {filteredResults.actions.map((act, i) => (
                <div key={i} onClick={() => handleSelectResult('action', act)} style={{ padding: '12px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-light)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>{act.label}</div>
                  <FaArrowRight style={{ fontSize: '10px', color: 'var(--primary)' }} />
                </div>
              ))}
            </div>
          )}

          {filteredResults.teams.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', padding: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaShieldAlt /> Equipos destacados
              </div>
              {filteredResults.teams.map((team, i) => (
                <div key={i} onClick={() => handleSelectResult('team', team)} style={{ padding: '12px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '12px' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-light)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaShieldAlt style={{ fontSize: '14px' }} /></div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>{team.NombreEquipo}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{team.Liga || 'Liga Oficial'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredResults.players.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', padding: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaUsers /> Resultados de jugadores
              </div>
              {filteredResults.players.map((plyr, i) => (
                <div key={i} onClick={() => handleSelectResult('player', plyr)} style={{ padding: '12px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '12px' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-light)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '12px' }}>{plyr.NombreCompleto?.charAt(0).toUpperCase()}</div>
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
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HeaderSearch;
