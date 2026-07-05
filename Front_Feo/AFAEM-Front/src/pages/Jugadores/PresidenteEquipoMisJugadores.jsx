import COLORS from '../../styles/colors';
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES } from '../../routes/paths';
import teamsService from '../../services/teams';
import Loader from '../../components/Loader';
import SearchBar from '../../components/Common/SearchBar';
import Swal from 'sweetalert2';
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
  FaUserInjured,
  FaUserPlus,
  FaShieldAlt
} from 'react-icons/fa';

// Componente de avatar de jugador para manejar fallback de imagen si falla la carga o no existe
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

export default function PresidenteEquipoMisJugadores() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const equipoIdFilter = searchParams.get('equipoId');

  // Helper para normalizar la ruta del logo del equipo
  const obtenerRutaLogo = (rutaLogo) => {
    if (!rutaLogo) return '';
    if (rutaLogo.startsWith('http')) return rutaLogo;
    let cleanPath = rutaLogo.replace(/\\/g, '/');
    if (!cleanPath.startsWith('uploads/') && !cleanPath.startsWith('/uploads/')) {
      cleanPath = `uploads/${cleanPath.startsWith('/') ? cleanPath.substring(1) : cleanPath}`;
    }
    return `${API_BASE}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
  };

  // ESTADOS
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstatus, setFiltroEstatus] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const loadData = async () => {
    try {
      setLoading(true);
      const [playersData, teamsData] = await Promise.all([
        teamsService.getUserPlayersReal(),
        teamsService.getUserTeamsReal()
      ]);
      setPlayers(playersData || []);
      setTeams(teamsData || []);
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filtroEstatus, searchTerm, sortOrder, equipoIdFilter]);

  // Obtener información del equipo filtrado
  const selectedTeamInfo = React.useMemo(() => {
    if (!equipoIdFilter) return null;
    return teams.find(t => String(t.EquipoId) === String(equipoIdFilter));
  }, [teams, equipoIdFilter]);

  // MÉTRICAS
  const totalJugadores = players.length;
  const activos = players.filter(p => p.Estatus === true).length;
  const inactivos = players.filter(p => p.Estatus === false).length;
  const equiposUnicos = [...new Set(players.map(p => p.Equipo))].length;

  // LÓGICA DE FILTRADO, BÚSQUEDA Y ORDENAMIENTO
  const filteredPlayers = React.useMemo(() => {
    let result = [...players];

    // Filtro por equipo desde URL
    if (equipoIdFilter) {
      result = result.filter(p => String(p.EquipoId) === String(equipoIdFilter));
    }

    // Filtro por estatus
    if (filtroEstatus !== 'todos') {
      const boolFiltro = filtroEstatus === 'activos';
      result = result.filter(p => !!p.Estatus === boolFiltro);
    }

    // Búsqueda en tiempo real
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      result = result.filter(p =>
        (p.NombreCompleto && p.NombreCompleto.toLowerCase().includes(query)) ||
        (p.Rol && p.Rol.toLowerCase().includes(query)) ||
        (p.Equipo && p.Equipo.toLowerCase().includes(query))
      );
    }

    // Ordenamiento por Nombre o ID (simulado)
    result.sort((a, b) => {
      const nameA = a.NombreCompleto || '';
      const nameB = b.NombreCompleto || '';
      if (sortOrder === 'asc') return nameA.localeCompare(nameB);
      return nameB.localeCompare(nameA);
    });

    return result;
  }, [players, filtroEstatus, searchTerm, sortOrder, equipoIdFilter]);

  const paginatedPlayers = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPlayers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPlayers, currentPage]);

  const handleVerDetalles = (player) => {
    Swal.fire({
      title: 'Información del Jugador',
      html: `
        <div style="text-align: left; font-size: 14px; line-height: 1.8; padding: 10px;">
          <p style="margin-bottom: 8px;"><strong>Nombre Completo:</strong> ${player.NombreCompleto}</p>
          <p style="margin-bottom: 8px;"><strong>NUI:</strong> ${player.NUI || 'No asignado'}</p>
          <p style="margin-bottom: 8px;"><strong>Equipo Vinculado:</strong> ${player.Equipo ? player.Equipo.toUpperCase() : 'SIN EQUIPO'}</p>
          <p style="margin-bottom: 8px;"><strong>Posición / Rol:</strong> ${player.Rol || 'Miembro Registrado'}</p>
          <p style="margin-bottom: 8px;"><strong>Fecha de Registro:</strong> ${player.FechaIngreso ? new Date(player.FechaIngreso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</p>
          <p style="margin-bottom: 8px;"><strong>Dorsal / Camiseta:</strong> ${player.NumeroCamiseta || 'No asignado'}</p>
          <p style="margin-bottom: 8px;"><strong>Estado de Registro:</strong> ${player.Estatus ? 'Activo / Aprobado' : 'Inactivo / Pendiente'}</p>
          <p style="margin-bottom: 8px;"><strong>Seguro Asignado:</strong> ${player.SeguroNombre || 'Sin seguro asignado'}</p>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: COLORS.slate300,
      customClass: {
        popup: 'swal2-popup-custom'
      }
    });
  };

  if (loading && players.length === 0) {
    return <Loader text="Cargando tu directorio de jugadores..." />;
  }

  return (
    <div className="fade-in">
      {/* CABECERA ESTILO ADMIN/PAGOS */}
      <div className="page-header-premium">
        <div>
          <h1 className="page-header-title">Mi directorio de jugadores</h1>
          <p className="page-header-subtitle">Visualización y gestión de miembros activos en tus equipos registrados.</p>
        </div>
      </div>

      {/* TARJETAS MÉTRICAS ESTILO ADMIN/PAGOS */}
      <div className="metrics-grid-4">
        {[
          { label: 'Total Jugadores', value: totalJugadores, filter: 'todos', color: 'var(--primary)', icon: <FaUsers /> },
          { label: 'Miembros Activos', value: activos, filter: 'activos', color: 'var(--secondary)', icon: <FaCheckCircle /> },
          { label: 'Inactivos / Bajas', value: inactivos, filter: 'inactivos', color: 'var(--danger)', icon: <FaUserInjured /> },
          { label: 'Equipos a cargo', value: equiposUnicos, color: COLORS.indigo, icon: <FaUsers />, action: () => navigate(ROUTES.PRESIDENTE.EQUIPOS) }
        ].map((stat, i) => (
          <div
            key={i}
            onClick={() => {
              if (stat.action) {
                stat.action();
              } else if (stat.filter) {
                setFiltroEstatus(stat.filter);
              }
            }}
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

      {/* CABECERA DE PERFIL DE EQUIPO DESTACADO (SI FILTRO DE URL EXISTE) */}
      {selectedTeamInfo && (
        <div className="team-profile-header-card fade-in">
          <div className="team-profile-header-left">
            <div className="team-profile-header-logo">
              {selectedTeamInfo.RutaLogo ? (
                <img
                  src={obtenerRutaLogo(selectedTeamInfo.RutaLogo)}
                  alt={selectedTeamInfo.NombreEquipo}
                />
              ) : (
                <FaShieldAlt />
              )}
            </div>
            <div>
              <h2 className="team-profile-header-title">{selectedTeamInfo.NombreEquipo.toUpperCase()}</h2>
              <div className="team-profile-header-meta">
                Categoría: {selectedTeamInfo.Categoria || 'LIBRE'} • Liga: {selectedTeamInfo.Liga || 'Liga local'} • {selectedTeamInfo.Rama || 'Rama mixta'}
              </div>
            </div>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setSearchParams({})}
          >
            Ver todos los jugadores
          </button>
        </div>
      )}

      {/* SECCIÓN DE CUADRÍCULA DE JUGADORES */}
      <div className="dashboard-card" style={{ padding: '24px' }}>
        <div className="table-header-actions" style={{ marginBottom: '20px' }}>
          <h3 className="table-header-title">
            {selectedTeamInfo ? `Plantilla de ${selectedTeamInfo.NombreEquipo}` : 'Lista de jugadores'}
          </h3>

          <div className="table-actions-group">
            <div className="search-wrapper-responsive">
              <SearchBar
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre o equipo..."
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
            <p style={{ fontWeight: '700' }}>No se encontraron jugadores que coincidan con tu búsqueda.</p>
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
                  {!selectedTeamInfo && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase' }}>
                      {player.Equipo || 'SIN EQUIPO'}
                    </div>
                  )}
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

                    {player.EstatusDocumentos && (
                      <span
                        className="status-badge-table player-card-status-badge"
                        style={{
                          background:
                            player.EstatusDocumentos === 'Aprobado' ? COLORS.greenBg50 :
                              player.EstatusDocumentos === 'Rechazado' ? COLORS.dangerBgLight :
                                player.EstatusDocumentos === 'En espera' ? COLORS.warningBgLight : COLORS.slate50,
                          color:
                            player.EstatusDocumentos === 'Aprobado' ? COLORS.greenDark :
                              player.EstatusDocumentos === 'Rechazado' ? COLORS.dangerDark :
                                player.EstatusDocumentos === 'En espera' ? COLORS.warningDark : COLORS.slate500,
                          border:
                            player.EstatusDocumentos === 'Aprobado' ? `1px solid ${COLORS.greenBgDark}` :
                              player.EstatusDocumentos === 'Rechazado' ? `1px solid ${COLORS.dangerBgMedium}` :
                                player.EstatusDocumentos === 'En espera' ? `1px solid ${COLORS.warningBgDark}` : `1px solid ${COLORS.slate300}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          margin: 0
                        }}
                      >
                        {player.EstatusDocumentos === 'Aprobado' && <FaCheckCircle size={10} />}
                        {player.EstatusDocumentos === 'Rechazado' && <FaExclamationCircle size={10} />}
                        {player.EstatusDocumentos === 'En espera' && <FaExclamationCircle size={10} style={{ color: COLORS.warningDark }} />}
                        {player.EstatusDocumentos === 'Pendiente' && <FaUser size={10} style={{ color: COLORS.slate500 }} />}
                        DOCS: {player.EstatusDocumentos.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="player-card-actions" style={{ display: 'flex', gap: '8px', width: '100%' }}>
                    <button
                      onClick={() => handleVerDetalles(player)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '11px', fontWeight: '800', flex: 1, borderRadius: '10px' }}
                    >
                      Detalle
                    </button>
                    <button
                      onClick={() => navigate(ROUTES.PRESIDENTE.JUGADOR_DOCUMENTOS.replace(':miembroEquipoId', player.MiembroEquipoId))}
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '11px', fontWeight: '800', flex: 1, borderRadius: '10px', background: COLORS.primary, border: 'none', color: 'white' }}
                    >
                      Docs
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* CONTROL DE PAGINACIÓN */}
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
    </div>
  );
}
