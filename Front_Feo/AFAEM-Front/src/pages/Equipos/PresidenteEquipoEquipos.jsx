import COLORS from '../../styles/colors';
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../routes/paths';
import DashboardTable from '../../components/DashboardTable';
import teamsService from '../../services/teams';
import Loader from '../../components/Loader';
import SearchBar from '../../components/Common/SearchBar';
import { API_BASE } from '../../config/config';
import Swal from 'sweetalert2';
import '../../styles/dashboard.css';
import {
  FaShieldAlt,
  FaUsers,
  FaSyncAlt,
  FaSortAmountDown,
  FaSortAmountUp,
  FaCheckCircle,
  FaExclamationCircle,
  FaTrophy,
  FaPlus,
  FaUserPlus
} from 'react-icons/fa';

export default function PresidenteEquipoEquipos() {
  const navigate = useNavigate();

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
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstatus, setFiltroEstatus] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const fileInputRef = useRef(null);
  const [selectedTeamId, setSelectedTeamId] = useState(null);

  const handleAddLogoClick = (teamId) => {
    setSelectedTeamId(teamId);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire('Error', 'El archivo supera el peso máximo permitido (5 MB)', 'error');
      return;
    }

    try {
      Swal.fire({
        title: 'Cargando logo...',
        text: 'Por favor espera',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const response = await teamsService.uploadTeamLogo(selectedTeamId, file);
      
      Swal.fire({
        title: '¡Éxito!',
        text: 'El logo se ha actualizado correctamente.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });

      loadTeams();
    } catch (err) {
      console.error(err);
      Swal.fire('Error', err.response?.data?.detail || 'No se pudo cargar el logo del equipo', 'error');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Función para verificar estado de pago para agregar jugador
  const verificarEstadoPagoJugador = async (equipoId) => {
    try {
      const token = localStorage.getItem('token');

      const resOrdenes = await fetch(
        `${API_BASE}/ordenes-pago/hay-orden/?tipo_solicitud=3&equipo_id=${equipoId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!resOrdenes.ok) {
        alert("NOOO TIENES ORDEN")
        return {
          tieneOrden: false,
          accion: "CREAR_ORDEN"

        };
      }

      const data = await resOrdenes.json();

      return {
        tieneOrden: data.tiene_orden,
        accion: data.accion,
        ordenId: data.orden_id,
        total: data.total
      };

    } catch (err) {
      alert("ERROR VERIFICANDO EL PAGO " + err);
      console.error('Error verificando pago de jugador:', err);
      return {
        tieneOrden: false,
        accion: "CREAR_ORDEN"
      };
    }
  };

  const loadTeams = async () => {
    try {
      setLoading(true);
      const data = await teamsService.getUserTeamsReal();
      setTeams(data || []);
    } catch (err) {
      console.error('Error cargando equipos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filtroEstatus, searchTerm, sortOrder]);

  // MÉTRICAS
  const totalEquipos = teams.length;
  const jugadoresTotales = teams.reduce((sum, t) => sum + (t.NumeroJugadores || 0), 0);
  const ligasActivas = new Set(teams.map(t => t.Liga)).size;

  // LÓGICA DE FILTRADO, BÚSQUEDA Y ORDENAMIENTO
  const filteredTeams = React.useMemo(() => {
    let result = [...teams];

    // Filtro por estatus
    if (filtroEstatus !== 'todos') {
      const boolFiltro = filtroEstatus === 'activos';
      result = result.filter(t => !!t.Estatus === boolFiltro);
    }

    // Búsqueda en tiempo real
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      result = result.filter(t =>
        (t.NombreEquipo && t.NombreEquipo.toLowerCase().includes(query)) ||
        (t.Categoria && t.Categoria.toLowerCase().includes(query)) ||
        (t.Liga && t.Liga.toLowerCase().includes(query))
      );
    }

    // Ordenamiento por Nombre o ID
    result.sort((a, b) => {
      const nameA = a.NombreEquipo || '';
      const nameB = b.NombreEquipo || '';
      if (sortOrder === 'asc') return nameA.localeCompare(nameB);
      return nameB.localeCompare(nameA);
    });

    return result;
  }, [teams, filtroEstatus, searchTerm, sortOrder]);

  const paginatedTeams = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTeams.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTeams, currentPage]);

  // Determina la ruta de navegación según la acción de pago
  const determinarRutaPago = (accion, estadoPago, equipoId) => {
    const baseParams = {
      equipoId,
      tieneOrden: estadoPago.tieneOrden,
      ordenId: estadoPago.ordenId || null,
      total: estadoPago.total || 0
    };

    switch (accion) {
      case 'CREAR_ORDEN':
        return {
          path: ROUTES.PRESIDENTE.PAGO_CREAR_ORDEN,
          state: baseParams
        };
      case 'SUBIR_COMPROBANTE':
        return {
          path: ROUTES.PRESIDENTE.PAGO_SUBIR_COMPROBANTE,
          state: baseParams
        };
      case 'EN_REVISION':
        return {
          path: ROUTES.PRESIDENTE.PAGO_EN_REVISION,
          state: baseParams
        };
      case 'REENVIAR_COMPROBANTE':
        return {
          path: ROUTES.PRESIDENTE.PAGO_REENVIAR_COMPROBANTE,
          state: baseParams
        };
      default:
        return {
          path: ROUTES.PRESIDENTE.PAGO_CREAR_ORDEN,
          state: baseParams
        };
    }
  };

  const columns = [
    {
      key: 'NombreEquipo',
      label: 'Nombre del Equipo',
      render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="team-logo-table">
            {row.RutaLogo ? (
              <img
                src={obtenerRutaLogo(row.RutaLogo)}
                alt={val}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <FaShieldAlt />
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="team-name-table">{val}</div>
            <div className="team-subname-table">Club Registrado</div>
          </div>
        </div>
      )
    },
    {
      key: 'Categoria',
      label: 'Catalogo',
      render: (_, row) => (
        <div>
          <div className="cat-name-table">{row.Categoria || 'LIBRE'}</div>
          <div className="cat-subname-table">{row.Rama} • {row.Liga || 'Liga local'}</div>
        </div>
      )
    },
    {
      key: 'NumeroJugadores',
      label: 'Jugadores',
      render: (val, row) => (
        <div className="players-badge-table">
          <FaUsers size={14} style={{ color: 'var(--primary)' }} />
          <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>
            {val || 0}/{row.SlotsComprados || 0}
          </span>
        </div>
      )
    },
    {
      key: 'Estatus',
      label: 'Estatus',
      render: (status) => (
        <span 
          className="status-badge-table"
          style={{
            background: status ? COLORS.greenBg : COLORS.dangerBg,
            color: status ? COLORS.greenDeep : COLORS.dangerDeep,
            border: status ? `1px solid ${COLORS.greenBgDark}` : `1px solid ${COLORS.dangerBgMedium}`
          }}
        >
          {status ? <FaCheckCircle size={10} /> : <FaExclamationCircle size={10} />}
          {status ? 'ACTIVO' : 'INACTIVO'}
        </span>
      )
    },
    {
      key: 'acciones',
      label: 'Acciones',
      render: (_, row) => (
        <button
          onClick={async () => {
            try {
              //verifica si hay slots en el equipo
              const slots = await teamsService.checkTeamSlots(row.EquipoId);

              if (slots?.equipo_temporal_activo && slots.slots_disponibles > 0) {
                navigate(`${ROUTES.PRESIDENTE.CONFIGURAR_EQUIPO}?equipoTemporalId=${slots.equipo_temporal_id}&equipoId=${row.EquipoId}&agregarJugador=true`);
                return;
              }

              //NO HAY SLOTS. VERIFICAR ORDEN DE PAGO
              const estadoPago = await verificarEstadoPagoJugador(row.EquipoId);

              // Determinar ruta según acción de pago
              const navegacion = determinarRutaPago(estadoPago.accion, estadoPago, row.EquipoId);
              navigate(navegacion.path, { state: navegacion.state });

            } catch (err) {
              console.error('Error al verificar slots:', err);
              Swal.fire('Error', 'No se pudo verificar el estado de pago del equipo', 'error');
            }
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
            color: 'var(--primary)',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <FaUserPlus />
        </button>
      )
    }
  ];

  if (loading && teams.length === 0) {
    return <Loader text="Cargando tus equipos..." />;
  }

  return (
    <div className="fade-in">
      {/* CABECERA ESTILO PREMIUM */}
      <div className="page-header-premium">
        <div>
          <h1 className="page-header-title">Mis equipos registrados</h1>
          <p className="page-header-subtitle">Gestiona tus equipos registrados en AFAEM</p>
        </div>
      </div>

      {/* TARJETAS MÉTRICAS ESTILO PREMIUM */}
      <div className="metrics-grid">
        {[
          { label: 'Equipos Registrados', value: totalEquipos, filter: 'todos', color: 'var(--primary)', icon: <FaShieldAlt /> },
          { label: 'Jugadores Totales', value: jugadoresTotales, color: 'var(--secondary)', icon: <FaUsers />, action: () => navigate(ROUTES.PRESIDENTE.MIS_JUGADORES) },
          { label: 'Equipos Activos', value: teams.filter(t => t.Estatus).length, filter: 'activos', color: COLORS.success, icon: <FaCheckCircle /> }
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

      {/* SECCIÓN DE EQUIPOS EN TARJETAS RESPONSIVAS */}
      <div className="dashboard-card" style={{ padding: '24px' }}>
        <div className="table-header-actions" style={{ marginBottom: '20px' }}>
          <h3 className="table-header-title">Listado oficial de equipos</h3>

          <div className="table-actions-group">
            <div className="search-wrapper-responsive">
              <SearchBar
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre o categoría..."
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
              onClick={loadTeams}
              className="btn-premium reload-btn-responsive"
            >
              <FaSyncAlt />
            </button>
          </div>
        </div>

        {filteredTeams.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: COLORS.slate400, fontWeight: '700' }}>
            No se encontraron equipos en la búsqueda.
          </div>
        ) : (
          <>
            <div className="teams-card-grid">
              {paginatedTeams.map((team) => (
                <div key={team.EquipoId} className="team-card-refined">
                  <div className="team-card-logo-wrapper" style={{ position: 'relative' }}>
                    {team.RutaLogo ? (
                      <>
                        <img
                          src={obtenerRutaLogo(team.RutaLogo)}
                          alt={team.NombreEquipo}
                        />
                        <div className="replace-logo-overlay">
                          <button
                            onClick={() => handleAddLogoClick(team.EquipoId)}
                            className="btn-replace-logo"
                          >
                            Reemplazar
                          </button>
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <FaShieldAlt style={{ fontSize: '40px', color: '#94a3b8' }} />
                        <button
                          onClick={() => handleAddLogoClick(team.EquipoId)}
                          style={{
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            borderRadius: '8px',
                            backgroundColor: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}
                        >
                          Añadir logo
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="team-card-info">
                    <h4 className="team-card-name" title={team.NombreEquipo}>{team.NombreEquipo}</h4>
                    <div className="team-card-detail-item">
                      <strong>Categoría:</strong> {team.Categoria || 'LIBRE'}
                    </div>
                    <div className="team-card-detail-item">
                      <strong>Liga:</strong> {team.Liga || 'Liga local'} • {team.Rama}
                    </div>
                    <div className="team-card-detail-item">
                      <strong>Jugadores:</strong>
                      <div className="players-badge-table" style={{ margin: 0 }}>
                        <FaUsers size={14} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>
                          {team.NumeroJugadores || 0}/{team.SlotsComprados || 0}
                        </span>
                      </div>
                    </div>
                    <div className="team-card-detail-item">
                      <strong>Estado:</strong>
                      <span 
                        className="status-badge-table"
                        style={{
                          background: team.Estatus ? COLORS.greenBg : COLORS.dangerBg,
                          color: team.Estatus ? COLORS.greenDeep : COLORS.dangerDeep,
                          border: team.Estatus ? `1px solid ${COLORS.greenBgDark}` : `1px solid ${COLORS.dangerBgMedium}`,
                          margin: 0
                        }}
                      >
                        {team.Estatus ? <FaCheckCircle size={10} /> : <FaExclamationCircle size={10} />}
                        {team.Estatus ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </div>
                    <div className="team-card-actions">
                      <button
                        onClick={() => navigate(`${ROUTES.PRESIDENTE.MIS_JUGADORES}?equipoId=${team.EquipoId}`)}
                        className="btn btn-primary btn-sm"
                        style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        Administrar
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const slots = await teamsService.checkTeamSlots(team.EquipoId);
                             if (slots?.equipo_temporal_activo && slots.slots_disponibles > 0) {
                               navigate(`${ROUTES.PRESIDENTE.CONFIGURAR_EQUIPO}?equipoTemporalId=${slots.equipo_temporal_id}&equipoId=${team.EquipoId}&agregarJugador=true`);
                               return;
                             }
                            const estadoPago = await verificarEstadoPagoJugador(team.EquipoId);
                            const navegacion = determinarRutaPago(estadoPago.accion, estadoPago, team.EquipoId);
                            navigate(navegacion.path, { state: navegacion.state });
                          } catch (err) {
                            console.error('Error al verificar slots:', err);
                            Swal.fire('Error', 'No se pudo verificar el estado de pago del equipo', 'error');
                          }
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '8px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Agregar Jugador"
                      >
                        <FaUserPlus />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* CONTROL DE PAGINACIÓN */}
            {filteredTeams.length > itemsPerPage && (
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
                  Página {currentPage} de {Math.ceil(filteredTeams.length / itemsPerPage)}
                </span>
                <button
                  disabled={currentPage === Math.ceil(filteredTeams.length / itemsPerPage)}
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredTeams.length / itemsPerPage), prev + 1))}
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
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
      />
    </div>
  );
}
