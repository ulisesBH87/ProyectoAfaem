import COLORS from '../../styles/colors';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '../../routes/paths';
import { getEquiposDirectorio, getJugadoresDirectorio } from '../../services/admin';
import { getUserPlayersReal } from '../../services/teams';
import Loader from '../../components/Loader';
import SearchBar from '../../components/Common/SearchBar';
import Swal from 'sweetalert2';
import { Modal, BotonPrimario } from '../../components/partials';
import { API_BASE } from '../../config/config';
import { useSecureBlob } from '../../hooks/useSecureBlob';
import '../../styles/dashboard.css';
import {
  FaUser,
  FaSyncAlt,
  FaSortAmountDown,
  FaSortAmountUp,
  FaCheckCircle,
  FaExclamationCircle,
  FaUsers,
  FaArrowLeft,
  FaShieldAlt
} from 'react-icons/fa';

// Avatar component handling secure fallback
function PlayerAvatar({ rutaFoto, nombre, fallbackIcon }) {
  const [hasError, setHasError] = useState(false);
  const { blobUrl, loading } = useSecureBlob(rutaFoto);

  if (rutaFoto && !hasError && !loading && blobUrl) {
    return (
      <img
        src={blobUrl}
        alt={nombre}
        onError={() => setHasError(true)}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '12px',
          objectFit: 'cover'
        }}
      />
    );
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
      fontWeight: 'bold',
      color: COLORS.slate400,
      background: COLORS.slate100,
      borderRadius: '12px'
    }}>
      {nombre ? nombre.charAt(0).toUpperCase() : fallbackIcon}
    </div>
  );
}

const esSeguroProximoAVencer = (vigenciaStr) => {
  if (!vigenciaStr) return false;
  const vigencia = new Date(vigenciaStr);
  if (isNaN(vigencia.getTime())) return false;
  const hoy = new Date();
  const diffTime = vigencia - hoy;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 30;
};

const formatFecha = (fechaStr) => {
  if (!fechaStr) return 'No especificada';
  try {
    const date = new Date(fechaStr + 'T00:00:00');
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch (e) {
    return fechaStr;
  }
};

export default function AdminVerJugadoresEquipo() {
  const navigate = useNavigate();
  const { equipoId } = useParams();

  // STAGES
  const [players, setPlayers] = useState([]);
  const [teamInfo, setTeamInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtroEstatus, setFiltroEstatus] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [selectedPlayerDetails, setSelectedPlayerDetails] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);

  const obtenerRutaLogo = (rutaLogo) => {
    if (!rutaLogo) return '';
    if (rutaLogo.startsWith('http')) return rutaLogo;
    let cleanPath = rutaLogo.replace(/\\/g, '/');
    if (!cleanPath.startsWith('uploads/') && !cleanPath.startsWith('/uploads/')) {
      cleanPath = `uploads/${cleanPath.startsWith('/') ? cleanPath.substring(1) : cleanPath}`;
    }
    return `${API_BASE}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [equiposList, playersReal, jugadoresDir] = await Promise.all([
        getEquiposDirectorio(true),
        getUserPlayersReal(),
        getJugadoresDirectorio(true)
      ]);
      const currentTeam = equiposList.find(e => String(e.EquipoId) === String(equipoId));
      setTeamInfo(currentTeam || null);

      // Filter jugadoresDir by team
      const teamPlayers = jugadoresDir.filter(p => String(p.EquipoId) === String(equipoId));

      // Merge with playersReal to get RutaFoto and EstatusDocumentos
      const mergedPlayers = teamPlayers.map(p => {
        const real = playersReal.find(pr => String(pr.MiembroEquipoId) === String(p.MiembroEquipoId));
        return {
          ...p,
          Equipo: p.EquipoNombre || real?.Equipo || 'SIN EQUIPO',
          RutaFoto: real?.RutaFoto || null,
          EstatusDocumentos: real?.EstatusDocumentos || (p.DocumentosAprobados ? 'Aprobado' : 'Pendiente')
        };
      });

      setPlayers(mergedPlayers);
    } catch (err) {
      console.error('Error cargando datos de jugadores del equipo:', err);
      Swal.fire('Error', 'No se pudieron cargar los jugadores del equipo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (equipoId) {
      loadData();
    }
  }, [equipoId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filtroEstatus, searchTerm, sortOrder]);

  // METRICS
  const totalJugadores = players.length;
  const activos = players.filter(p => p.Estatus === true).length;
  const inactivos = players.filter(p => p.Estatus === false).length;

  // FILTERING LOGIC
  const filteredPlayers = React.useMemo(() => {
    let result = [...players];

    // Status filter
    if (filtroEstatus !== 'todos') {
      const boolFiltro = filtroEstatus === 'activos';
      result = result.filter(p => !!p.Estatus === boolFiltro);
    }

    // Search filter
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      result = result.filter(p =>
        (p.NombreCompleto && p.NombreCompleto.toLowerCase().includes(query)) ||
        (p.Rol && p.Rol.toLowerCase().includes(query)) ||
        (p.CURP && p.CURP.toLowerCase().includes(query))
      );
    }

    // Sort order
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

  const handleVerDetalles = (player) => {
    setSelectedPlayerDetails(player);
    setModalAbierto(true);
  };

  if (loading) {
    return <Loader text="Cargando jugadores del equipo..." />;
  }

  return (
    <div className="fade-in">
      {/* HEADER */}
      <div className="page-header-premium">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '100%' }}>
          <button
            onClick={() => navigate(ROUTES.ADMIN.EQUIPOS)}
            className="btn btn-outline-secondary"
            style={{ padding: '8px 12px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', background: 'none', border: `1.5px solid ${COLORS.slate300}`, cursor: 'pointer' }}
          >
            <FaArrowLeft />
          </button>
          <div>
            <h1 className="page-header-title">Plantilla del Equipo</h1>
            <p className="page-header-subtitle">Consulta de jugadores inscritos y estatus de seguros.</p>
          </div>
        </div>
      </div>

      {/* METRICS GRID */}
      <div className="metrics-grid-4" style={{ marginBottom: '24px' }}>
        {[
          { label: 'Total Jugadores', value: totalJugadores, filter: 'todos', color: 'var(--primary)', icon: <FaUsers /> },
          { label: 'Miembros Activos', value: activos, filter: 'activos', color: 'var(--secondary)', icon: <FaCheckCircle /> },
          { label: 'Inactivos / Bajas', value: inactivos, filter: 'inactivos', color: 'var(--danger)', icon: <FaExclamationCircle /> }
        ].map((stat, i) => (
          <div
            key={i}
            onClick={() => setFiltroEstatus(stat.filter)}
            className={`metric-card ${filtroEstatus === stat.filter ? 'active' : ''}`}
            style={{
              cursor: 'pointer',
              border: filtroEstatus === stat.filter ? `2px solid ${stat.color}` : '1.5px solid var(--border-light)',
              boxShadow: filtroEstatus === stat.filter ? `0 12px 20px ${stat.color}15` : 'none'
            }}
          >
            <div className="metric-icon-wrapper" style={{ background: `${stat.color}15`, color: stat.color }}>
              {stat.icon}
            </div>
            <div className="metric-content">
              <div className="metric-label">{stat.label}</div>
              <div className="metric-value">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* TEAM PROFILE HEADER CARD */}
      {teamInfo && (
        <div className="team-profile-header-card fade-in" style={{ marginBottom: '24px' }}>
          <div className="team-profile-header-left">
            <div className="team-profile-header-logo">
              {teamInfo.RutaLogo ? (
                <img
                  src={obtenerRutaLogo(teamInfo.RutaLogo)}
                  alt={teamInfo.NombreEquipo}
                />
              ) : (
                <FaShieldAlt />
              )}
            </div>
            <div>
              <h2 className="team-profile-header-title">{teamInfo.NombreEquipo.toUpperCase()}</h2>
              <div className="team-profile-header-meta">
                Categoría: {teamInfo.Categoria || 'LIBRE'} • Liga: {teamInfo.Liga || 'Liga local'} • {teamInfo.Rama || 'Rama mixta'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PLAYERS CARD GRID CARD */}
      <div className="dashboard-card" style={{ padding: '24px' }}>
        <div className="table-header-actions" style={{ marginBottom: '20px' }}>
          <h3 className="table-header-title">
            {teamInfo ? `Jugadores de ${teamInfo.NombreEquipo}` : 'Lista de jugadores'}
          </h3>

          <div className="table-actions-group">
            <div className="search-wrapper-responsive">
              <SearchBar
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre o CURP..."
                width="100%"
                style={{ maxWidth: '300px' }}
              />
            </div>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="sort-btn-responsive"
            >
              {sortOrder === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />} {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
            </button>

            <div className="filters-wrapper-responsive">
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
              onClick={loadData}
              className="btn-premium reload-btn-responsive"
            >
              <FaSyncAlt />
            </button>
          </div>
        </div>

        {filteredPlayers.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: COLORS.slate400 }}>
            <FaUser style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }} />
            <p style={{ fontWeight: '700' }}>No se encontraron jugadores en la plantilla del equipo.</p>
          </div>
        ) : (
          <>
            <div className="players-card-grid">
              {paginatedPlayers.map((player) => (
                <div key={player.MiembroEquipoId || player.id} className="player-card-refined">
                  <div className="player-card-photo-wrapper">
                    <PlayerAvatar
                      rutaFoto={player.RutaFoto}
                      nombre={player.NombreCompleto}
                      fallbackIcon={<FaUser />}
                    />
                  </div>
                  <h4 className="player-card-name" title={player.NombreCompleto}>
                    {player.NombreCompleto}
                  </h4>
                  <div className="player-card-meta">
                    {player.Rol || 'Miembro Registrado'}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', marginBottom: '12px' }}>
                    <span
                      className="status-badge-table player-card-status-badge"
                      style={{
                        background: player.Estatus ? COLORS.greenBg : COLORS.dangerBg,
                        color: player.Estatus ? COLORS.greenDeep : COLORS.dangerDeep,
                        border: player.Estatus ? `1px solid ${COLORS.greenBgDark}` : `1px solid ${COLORS.dangerBgMedium}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        margin: 0
                      }}
                    >
                      {player.Estatus ? <FaCheckCircle size={10} /> : <FaExclamationCircle size={10} />}
                      {player.Estatus ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </div>

                  <div className="player-card-actions" style={{ display: 'flex', gap: '8px', width: '100%' }}>
                    <button
                      onClick={() => handleVerDetalles(player)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '12px', fontWeight: '800', flex: 1, borderRadius: '10px', padding: '8px' }}
                    >
                      Ver Detalle
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* PAGINATION CONTROL */}
            {filteredPlayers.length > itemsPerPage && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px', gap: '8px', alignItems: 'center' }}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="btn btn-secondary btn-sm"
                  style={{ minWidth: '80px' }}
                >
                  Anterior
                </button>
                <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)' }}>
                  Página {currentPage} de {Math.ceil(filteredPlayers.length / itemsPerPage)}
                </span>
                <button
                  disabled={currentPage === Math.ceil(filteredPlayers.length / itemsPerPage)}
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredPlayers.length / itemsPerPage), prev + 1))}
                  className="btn btn-secondary btn-sm"
                  style={{ minWidth: '80px' }}
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* PLAYER DETAILS MODAL */}
      <Modal
        estaAbierto={modalAbierto}
        alCerrar={() => setModalAbierto(false)}
        titulo="Ficha del Jugador"
        tamanio="grande"
        bloquearCierreFondo={false}
        pie={
          <BotonPrimario
            etiqueta="Cerrar"
            onClick={() => setModalAbierto(false)}
          />
        }
      >
        {selectedPlayerDetails && (() => {
          const player = selectedPlayerDetails;
          const inicioSegStr = formatFecha(player.InicioSeguro);
          const finSegStr = formatFecha(player.Vigencia);
          const regDateStr = player.FechaIngreso ? formatFecha(player.FechaIngreso.split('T')[0]) : '—';
          const isProximo = esSeguroProximoAVencer(player.Vigencia);

          const getFontSizeForText = (text, defaultSize = '16px') => {
            if (!text) return defaultSize;
            const len = text.length;
            if (len > 25) return '11px';
            if (len > 18) return '12px';
            if (len > 12) return '14px';
            return defaultSize;
          };

          return (
            <div style={{ display: 'flex', gap: '20px', flexDirection: 'column', fontFamily: "'Outfit', 'Inter', sans-serif" }}>
              {/* HEADER WITH BANNER */}
              <div style={{
                background: `linear-gradient(135deg, ${COLORS.slate800}, ${COLORS.slate900})`,
                padding: '15px 15px',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                borderRadius: '12px',
                borderBottom: `3px solid ${COLORS.primary}`
              }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  background: `${COLORS.primary}20`,
                  border: `2px solid ${COLORS.primary}`,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  color: COLORS.primary,
                  flexShrink: 0
                }}>
                  ⚽
                </div>
                <div style={{ minWidth: 0, flexGrow: 1 }}>
                  <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {player.NombreCompleto}
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '15px', color: COLORS.slate300, fontWeight: '500' }}>
                    Ficha del Jugador
                  </p>
                </div>
              </div>

              {/* DETAILS GRID */}
              <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', borderRadius: '12px' }}>
                <div style={{ background: 'white', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: COLORS.slate400, textTransform: 'uppercase', letterSpacing: '0.5px' }}>NUI</div>
                  <div style={{ fontSize: getFontSizeForText(player.NUI || 'No asignado'), fontWeight: '750', color: COLORS.slate800 }}>{player.NUI || 'No asignado'}</div>
                </div>

                <div style={{ background: 'white', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: COLORS.slate400, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Equipo</div>
                  <div style={{ fontSize: getFontSizeForText(player.Equipo ? player.Equipo.toUpperCase() : 'SIN EQUIPO'), fontWeight: '750', color: COLORS.slate800 }}>{player.Equipo || 'SIN EQUIPO'}</div>
                </div>

                <div style={{ background: 'white', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: COLORS.slate400, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Posición / Rol</div>
                  <div style={{ fontSize: getFontSizeForText(player.Rol || 'Miembro Registrado'), fontWeight: '750', color: COLORS.slate800 }}>{player.Rol || 'Miembro Registrado'}</div>
                </div>

                <div style={{ background: 'white', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: COLORS.slate400, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Playera</div>
                  <div style={{ fontSize: getFontSizeForText(player.NumeroCamiseta ? `# ${player.NumeroCamiseta}` : 'No asignado'), fontWeight: '750', color: COLORS.slate800 }}>{player.NumeroCamiseta ? `# ${player.NumeroCamiseta}` : 'No asignado'}</div>
                </div>

                <div style={{ background: 'white', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: COLORS.slate400, textTransform: 'uppercase', letterSpacing: '0.5px' }}>CURP</div>
                  <div style={{ fontSize: getFontSizeForText(player.CURP), fontWeight: '750', color: COLORS.slate800 }}>{player.CURP || '—'}</div>
                </div>

                <div style={{ background: 'white', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: COLORS.slate400, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estatus</div>
                  <span
                    className="status-badge-table"
                    style={{
                      background: player.Estatus ? COLORS.greenBg : COLORS.dangerBg,
                      color: player.Estatus ? COLORS.greenDeep : COLORS.dangerDeep,
                      border: player.Estatus ? `1px solid ${COLORS.greenBgDark}` : `1px solid ${COLORS.dangerBgMedium}`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '10px',
                      fontWeight: '800',
                      marginTop: '4px'
                    }}
                  >
                    {player.Estatus ? <FaCheckCircle size={10} /> : <FaExclamationCircle size={10} />}
                    {player.Estatus ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </div>
              </div>

              {/* INSURANCE SECTION */}
              <div style={{ padding: '16px 20px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: COLORS.slate800 }}>Seguro Asignado</h4>
                  {isProximo && (
                    <span style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fef3c7', borderRadius: '6px', padding: '2px 8px', fontSize: '12px', fontWeight: '800' }}>
                      PRÓXIMO A VENCER
                    </span>
                  )}
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: COLORS.primary, marginBottom: '6px' }}>
                    {player.SeguroNombre || 'Sin seguro asignado'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '15px', color: COLORS.slate800 }}>
                    <div>
                      <strong style={{ color: COLORS.slate500, fontSize: '13px', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Inicio Seguro:</strong>
                      {inicioSegStr}
                    </div>
                    <div>
                      <strong style={{ color: COLORS.slate500, fontSize: '13px', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Vigencia:</strong>
                      {finSegStr}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
