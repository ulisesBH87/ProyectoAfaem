import React, { useEffect, useState } from 'react';
import DashboardTable from '../../components/DashboardTable';
import { getAuditoriasMaster } from '../../services/admin';
import Modal from '../../components/partials/Forms/Modal';
import { FaHistory, FaEye, FaSyncAlt, FaSortAmountDown, FaSortAmountUp, FaSearch, FaFilter } from 'react-icons/fa';
import Loader from '../../components/Loader';
import SearchBar from '../../components/Common/SearchBar';
import COLORS from '../../styles/colors';

const AdminAuditorias = () => {
  const [auditorias, setAuditorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [errorMsg, setErrorMsg] = useState(null);

  // Estados para búsqueda y filtrado en base de datos
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [usuario, setUsuario] = useState('');
  const [accion, setAccion] = useState('todos');
  const [entidad, setEntidad] = useState('todos');
  const [ip, setIp] = useState('');

  // Modal State
  const [modalAbierto, setModalAbierto] = useState(false);
  const [auditoriaSeleccionada, setAuditoriaSeleccionada] = useState(null);

  const fetchAuditorias = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const filters = {};
      if (fechaInicio) {
        // Enviar con hora inicio de día
        filters.fecha_inicio = `${fechaInicio}T00:00:00`;
      }
      if (fechaFin) {
        // Enviar con hora fin de día
        filters.fecha_fin = `${fechaFin}T23:59:59`;
      }
      if (usuario.trim()) {
        filters.usuario = usuario.trim();
      }
      if (accion !== 'todos') {
        filters.accion = accion;
      }
      if (entidad !== 'todos') {
        filters.entidad = entidad;
      }
      if (ip.trim()) {
        filters.ip = ip.trim();
      }

      const resp = await getAuditoriasMaster(currentPage, itemsPerPage, filters);
      setAuditorias(resp?.data || []);
      setTotalItems(resp?.total || 0);
      setTotalPages(resp?.total_pages || 0);
    } catch (error) {
      console.error('Error fetching auditorias:', error);
      setErrorMsg(error?.response?.data?.detail || error.message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos al montar y al cambiar de página o filtros principales
  useEffect(() => {
    fetchAuditorias();
  }, [currentPage, itemsPerPage]);

  const handleBuscar = (e) => {
    if (e) e.preventDefault();
    setCurrentPage(1);
    fetchAuditorias();
  };

  const handleLimpiarFiltros = () => {
    setFechaInicio('');
    setFechaFin('');
    setUsuario('');
    setAccion('todos');
    setEntidad('todos');
    setIp('');
    setCurrentPage(1);
    // Ejecutar después de limpiar los estados
    setTimeout(() => {
      fetchAuditorias();
    }, 50);
  };

  const formatDate = (val) => {
    if (!val) return '—';
    return new Date(val).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleVerDetalle = (row) => {
    setAuditoriaSeleccionada(row);
    setModalAbierto(true);
  };

  const parseJsonData = (val) => {
    if (!val) return null;
    try {
      return typeof val === 'string' ? JSON.parse(val) : val;
    } catch (e) {
      return null;
    }
  };

  const renderValoresObjeto = (objeto, tipo = 'normal') => {
    const data = parseJsonData(objeto);
    if (!data || Object.keys(data).length === 0) {
      return <span style={{ fontStyle: 'italic', color: COLORS.slate500, fontSize: '13px' }}>Sin datos registrados</span>;
    }

    const isAntes = tipo === 'antes';
    const isDespues = tipo === 'despues';

    const containerStyle = {
      maxHeight: '260px',
      overflowY: 'auto',
      border: isAntes 
        ? `1.5px solid ${COLORS.dangerBgDark}` 
        : isDespues 
        ? `1.5px solid ${COLORS.emerald300}` 
        : `1.5px solid ${COLORS.slate200}`,
      borderRadius: '12px',
      background: COLORS.white,
      boxShadow: 'var(--shadow-sm)',
      transition: 'all 0.3s ease'
    };

    const keyBgColor = isAntes 
      ? COLORS.dangerBgLight 
      : isDespues 
      ? COLORS.greenBg50 
      : COLORS.slate50;

    const keyTextColor = isAntes 
      ? COLORS.dangerDeep 
      : isDespues 
      ? COLORS.successDeep 
      : COLORS.secondaryHover;

    const borderCellColor = isAntes
      ? COLORS.dangerBg
      : isDespues
      ? COLORS.greenBg
      : COLORS.slate100;

    return (
      <div style={containerStyle}>
        <table style={{ width: '100%', fontSize: '12.5px', borderCollapse: 'collapse', color: COLORS.slate700 }}>
          <tbody>
            {Object.entries(data).map(([key, val]) => (
              <tr key={key} style={{ borderBottom: `1px solid ${borderCellColor}`, transition: 'background-color 0.2s' }} className="table-row-hover">
                <td style={{ 
                  padding: '10px 14px', 
                  fontWeight: '700', 
                  color: keyTextColor, 
                  width: '38%', 
                  borderRight: `1px solid ${borderCellColor}`, 
                  fontFamily: 'monospace', 
                  backgroundColor: keyBgColor 
                }}>
                  {key}
                </td>
                <td style={{ padding: '10px 14px', wordBreak: 'break-all', fontFamily: 'monospace', color: COLORS.slate900, fontWeight: '500' }}>
                  {val !== null && val !== undefined ? String(val) : <span style={{ fontStyle: 'italic', color: COLORS.slate400 }}>null</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'CREATE':
        return (
          <span style={{ display: 'inline-block', color: COLORS.successDarker, background: COLORS.successBg, border: `1px solid ${COLORS.successBgDark}`, padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '800' }}>
            CREACIÓN (CREATE)
          </span>
        );
      case 'UPDATE':
        return (
          <span style={{ display: 'inline-block', color: COLORS.secondaryDark, background: COLORS.secondaryBg, border: `1px solid ${COLORS.secondaryBgDark}`, padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '800' }}>
            EDICIÓN (UPDATE)
          </span>
        );
      case 'DELETE':
        return (
          <span style={{ display: 'inline-block', color: COLORS.dangerDarker, background: COLORS.dangerBgLight, border: `1px solid ${COLORS.dangerBgDark}`, padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '800' }}>
            ELIMINACIÓN (DELETE)
          </span>
        );
      case 'READ':
        return (
          <span style={{ display: 'inline-block', color: COLORS.gray600, background: COLORS.gray100, border: `1px solid ${COLORS.gray200}`, padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '800' }}>
            CONSULTA (READ)
          </span>
        );
      default:
        return (
          <span style={{ display: 'inline-block', color: COLORS.gray500, background: COLORS.gray50, border: `1px solid ${COLORS.gray100}`, padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '800' }}>
            {action}
          </span>
        );
    }
  };

  const columns = [
    {
      key: 'fecha',
      label: 'Fecha y Hora',
      render: (val) => (
        <span style={{ fontSize: '12px', color: COLORS.black, fontWeight: '600' }}>{formatDate(val)}</span>
      )
    },
    {
      key: 'usuario_que_realizo_la_accion',
      label: 'Usuario',
      render: (val) => (
        <span style={{ fontWeight: '700', fontSize: '13px', color: COLORS.black }}>{val || '—'}</span>
      )
    },
    {
      key: 'titulo',
      label: 'Acción / Entidad',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: '800', color: COLORS.secondary, fontSize: '13px' }}>{val}</div>
          <div style={{ fontSize: '11px', color: COLORS.slate500, fontWeight: '600' }}>{row.accion} - {row.entidad}</div>
        </div>
      )
    },
    {
      key: 'ip',
      label: 'Dirección IP',
      render: (val) => (
        <span style={{ fontSize: '12px', color: COLORS.black, fontFamily: 'monospace' }}>{val || '—'}</span>
      )
    },
    {
      key: 'resumen',
      label: 'Detalle',
      render: (val) => (
        <span style={{ fontSize: '12px', color: COLORS.black, fontWeight: '500' }}>{val || '—'}</span>
      )
    },
    {
      key: 'Acciones',
      label: 'Acción',
      render: (_, row) => {
        const tieneDetalle = row.valores_antes || row.valores_despues || (row.cambios && row.cambios.length > 0);
        return (
          <button
            onClick={() => handleVerDetalle(row)}
            disabled={!tieneDetalle}
            className="btn-premium"
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderRadius: '8px',
              cursor: tieneDetalle ? 'pointer' : 'not-allowed',
              opacity: tieneDetalle ? 1 : 0.4
            }}
          >
            <FaEye /> Ver Detalle
          </button>
        );
      }
    }
  ];

  return (
    <div className="fade-in" style={{ color: COLORS.slate700 }}>
      {/* Estilos locales para resaltar el ícono de calendario en los date inputs y tablas */}
      <style>{`
        .date-input-premium::-webkit-calendar-picker-indicator {
          cursor: pointer;
        }
        .date-input-premium, .select-premium, .input-premium {
          transition: all 0.2s ease;
        }
        .date-input-premium:focus, .select-premium:focus, .input-premium:focus {
          border-color: ${COLORS.secondary} !important;
          box-shadow: 0 0 0 3px ${COLORS.secondaryBgTranslucent10} !important;
          outline: none;
        }
        .table-row-hover:hover {
          background-color: ${COLORS.slate50};
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spin-animation {
          animation: spin 1s linear infinite;
        }
      `}</style>

      {/* HEADER SECTION */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '900', color: COLORS.black, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.5px' }}>
          <FaHistory style={{ color: COLORS.secondary, filter: `drop-shadow(0 0 8px ${COLORS.secondaryBgTranslucent20})` }} /> Auditorías
        </h1>
        <p style={{ color: COLORS.slate500, fontWeight: '500', fontSize: '15px' }}>Registro centralizado de transacciones y operaciones en el sistema.</p>
      </div>

      {/* FILTER PANEL */}
      <div className="card" style={{ background: COLORS.white, border: `1px solid ${COLORS.slate200}`, borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: 'var(--shadow-md)' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '800', color: COLORS.slate900, marginBottom: '16px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaFilter style={{ color: COLORS.secondary, fontSize: '12px' }} /> Filtrar Auditorías
        </h3>
        
        <form onSubmit={handleBuscar} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          {/* Fecha Inicio */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: COLORS.slate600, textTransform: 'uppercase', marginBottom: '6px' }}>Fecha Inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="date-input-premium"
              style={{ width: '100%', background: COLORS.white, border: `1.5px solid ${COLORS.slate300}`, borderRadius: '10px', padding: '8px 12px', color: COLORS.slate900, fontSize: '13px' }}
            />
          </div>

          {/* Fecha Fin */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: COLORS.slate600, textTransform: 'uppercase', marginBottom: '6px' }}>Fecha Fin</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="date-input-premium"
              style={{ width: '100%', background: COLORS.white, border: `1.5px solid ${COLORS.slate300}`, borderRadius: '10px', padding: '8px 12px', color: COLORS.slate900, fontSize: '13px' }}
            />
          </div>

          {/* Usuario */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: COLORS.slate600, textTransform: 'uppercase', marginBottom: '6px' }}>Usuario</label>
            <input
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="Nombre de usuario..."
              className="input-premium"
              style={{ width: '100%', background: COLORS.white, border: `1.5px solid ${COLORS.slate300}`, borderRadius: '10px', padding: '8px 12px', color: COLORS.slate900, fontSize: '13px' }}
            />
          </div>

          {/* IP */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: COLORS.slate600, textTransform: 'uppercase', marginBottom: '6px' }}>Dirección IP</label>
            <input
              type="text"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="Ej. 127.0.0.1"
              className="input-premium"
              style={{ width: '100%', background: COLORS.white, border: `1.5px solid ${COLORS.slate300}`, borderRadius: '10px', padding: '8px 12px', color: COLORS.slate900, fontSize: '13px' }}
            />
          </div>

          {/* Acción */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: COLORS.slate600, textTransform: 'uppercase', marginBottom: '6px' }}>Acción</label>
            <select
              value={accion}
              onChange={(e) => setAccion(e.target.value)}
              className="select-premium"
              style={{ width: '100%', background: COLORS.white, border: `1.5px solid ${COLORS.slate300}`, borderRadius: '10px', padding: '8px 12px', color: COLORS.slate900, fontSize: '13px' }}
            >
              <option value="todos">Todas</option>
              <option value="CREATE">CREATE (Creación)</option>
              <option value="UPDATE">UPDATE (Edición)</option>
              <option value="DELETE">DELETE (Eliminación)</option>
              <option value="READ">READ (Consulta)</option>
            </select>
          </div>

          {/* Entidad */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: COLORS.slate600, textTransform: 'uppercase', marginBottom: '6px' }}>Entidad Afectada</label>
            <select
              value={entidad}
              onChange={(e) => setEntidad(e.target.value)}
              className="select-premium"
              style={{ width: '100%', background: COLORS.white, border: `1.5px solid ${COLORS.slate300}`, borderRadius: '10px', padding: '8px 12px', color: COLORS.slate900, fontSize: '13px' }}
            >
              <option value="todos">Todas</option>
              <option value="Personas">Personas</option>
              <option value="Usuarios">Usuarios</option>
              <option value="Equipos">Equipos</option>
              <option value="MiembrosEquipo">Miembros de Equipo</option>
              <option value="Ligas">Ligas</option>
              <option value="PresidenteInvitacion">Invitaciones</option>
            </select>
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: '8px', gridColumn: 'span 2' }}>
            <button
              type="submit"
              className="btn-premium"
              style={{ flex: 1, padding: '10px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
            >
              <FaSearch /> Filtrar
            </button>
            <button
              type="button"
              onClick={handleLimpiarFiltros}
              style={{ background: 'transparent', border: `1.5px solid ${COLORS.slate300}`, color: COLORS.slate600, padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
            >
              Limpiar
            </button>
          </div>
        </form>
      </div>

      {/* TABLE SECTION */}
      <div className="card" style={{ background: COLORS.white, border: `1px solid ${COLORS.slate200}`, borderRadius: '20px', padding: '32px', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: COLORS.slate900, margin: 0 }}>Historial de Acciones</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={fetchAuditorias}
              disabled={loading}
              className="btn-premium"
              style={{
                padding: '10px 18px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
              title="Actualizar tabla"
            >
              <FaSyncAlt style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            <span style={{ fontSize: '12px', color: COLORS.secondaryDark, fontWeight: '700', background: COLORS.secondaryBg, border: `1px solid ${COLORS.secondaryBgDark}`, padding: '4px 10px', borderRadius: '8px' }}>
              {totalItems} registros totales
            </span>
          </div>
        </div>

        {errorMsg && (
          <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: COLORS.dangerBgTranslucent, borderRadius: '8px', border: `1px solid ${COLORS.dangerBgTranslucent30}`, color: COLORS.danger, fontSize: '14px', fontWeight: '600' }}>
            {errorMsg}
          </div>
        )}

        <DashboardTable
          columns={columns}
          data={auditorias}
          isLoading={loading}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          emptyMessage="No hay registros de auditoría que coincidan con los filtros."
        />
      </div>

      {/* MODAL DETALLES */}
      <Modal
        estaAbierto={modalAbierto}
        titulo="Detalle de Auditoría"
        alCerrar={() => setModalAbierto(false)}
        tamanio="grande"
        pie={
          <button
            onClick={() => setModalAbierto(false)}
            className="btn-premium"
            style={{ minWidth: '100px', cursor: 'pointer' }}
          >
            Cerrar
          </button>
        }
      >
        {auditoriaSeleccionada && (
          <div style={{ fontFamily: "'Outfit', sans-serif", color: COLORS.slate700 }}>
            {/* Metadata Card */}
            <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: COLORS.white, borderRadius: '12px', border: `1px solid ${COLORS.slate200}`, boxShadow: 'var(--shadow-sm)' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '800', color: COLORS.slate900, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: COLORS.secondary }}>●</span> Información General
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', fontSize: '13px' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: COLORS.slate500, textTransform: 'uppercase', marginBottom: '4px' }}>Acción</span>
                  {getActionBadge(auditoriaSeleccionada.accion)}
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: COLORS.slate500, textTransform: 'uppercase', marginBottom: '4px' }}>Entidad Afectada</span>
                  <span style={{ fontWeight: '700', color: COLORS.slate900 }}>{auditoriaSeleccionada.entidad}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: COLORS.slate500, textTransform: 'uppercase', marginBottom: '4px' }}>Usuario Ejecutor</span>
                  <span style={{ fontWeight: '700', color: COLORS.slate900 }}>{auditoriaSeleccionada.usuario_que_realizo_la_accion || '—'}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: COLORS.slate500, textTransform: 'uppercase', marginBottom: '4px' }}>IP Origen</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: '700', color: COLORS.slate900 }}>{auditoriaSeleccionada.ip || 'N/A'}</span>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: COLORS.slate500, textTransform: 'uppercase', marginBottom: '4px' }}>Fecha y Hora</span>
                  <span style={{ fontWeight: '600', color: COLORS.slate900 }}>{formatDate(auditoriaSeleccionada.fecha)}</span>
                </div>
              </div>
              {auditoriaSeleccionada.observaciones && (
                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: `1px solid ${COLORS.slate100}` }}>
                  <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: COLORS.slate500, textTransform: 'uppercase', marginBottom: '4px' }}>Observaciones</span>
                  <p style={{ margin: 0, color: COLORS.slate700, fontStyle: 'italic' }}>{auditoriaSeleccionada.observaciones}</p>
                </div>
              )}
            </div>

            {/* Changed Fields (UPDATE vs CREATE/DELETE) */}
            {auditoriaSeleccionada.accion === 'UPDATE' && auditoriaSeleccionada.cambios && auditoriaSeleccionada.cambios.length > 0 ? (
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '800', color: COLORS.slate900, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: COLORS.secondary }}>●</span> Campos Modificados
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {auditoriaSeleccionada.cambios.map((cambio, idx) => (
                    <div key={idx} style={{ padding: '16px', border: `1px solid ${COLORS.slate200}`, borderRadius: '12px', backgroundColor: COLORS.slate50, boxShadow: 'var(--shadow-sm)' }}>
                      <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '10px', fontWeight: '700', color: COLORS.slate600, textTransform: 'uppercase' }}>Campo:</span>
                        <span style={{ background: COLORS.secondaryBg, color: COLORS.secondaryHover, border: `1px solid ${COLORS.secondaryBgDark}`, padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '800', fontFamily: 'monospace' }}>
                          {cambio.campo}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'center' }}>
                        {/* Antes */}
                        <div style={{ padding: '12px 16px', backgroundColor: COLORS.dangerBgLight, borderRadius: '8px', color: COLORS.dangerDeep, borderLeft: `4px solid ${COLORS.danger}`, borderTop: `1px solid ${COLORS.dangerBgTranslucent10}`, borderRight: `1px solid ${COLORS.dangerBgTranslucent10}`, borderBottom: `1px solid ${COLORS.dangerBgTranslucent10}` }}>
                           <span style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '6px', color: COLORS.danger, letterSpacing: '0.5px' }}>Antes</span>
                           <span style={{ fontFamily: 'monospace', fontSize: '13px', wordBreak: 'break-all', fontWeight: '600' }}>
                             {cambio.antes !== null && cambio.antes !== undefined ? String(cambio.antes) : <span style={{ fontStyle: 'italic', opacity: 0.5 }}>vacío</span>}
                           </span>
                        </div>
                        {/* Arrow */}
                        <div style={{ fontSize: '20px', color: COLORS.slate400, fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>➔</div>
                        {/* Después */}
                        <div style={{ padding: '12px 16px', backgroundColor: COLORS.successBg, borderRadius: '8px', color: COLORS.successDeep, borderLeft: `4px solid ${COLORS.success}`, borderTop: `1px solid ${COLORS.successBgTranslucent10}`, borderRight: `1px solid ${COLORS.successBgTranslucent10}`, borderBottom: `1px solid ${COLORS.successBgTranslucent10}` }}>
                           <span style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '6px', color: COLORS.success, letterSpacing: '0.5px' }}>Después</span>
                           <span style={{ fontFamily: 'monospace', fontSize: '13px', wordBreak: 'break-all', fontWeight: '600' }}>
                             {cambio.despues !== null && cambio.despues !== undefined ? String(cambio.despues) : <span style={{ fontStyle: 'italic', opacity: 0.5 }}>vacío</span>}
                           </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '20px' }}>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '800', color: COLORS.slate900, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: COLORS.danger }}></span> Valores Antes
                  </h4>
                  {renderValoresObjeto(auditoriaSeleccionada.valores_antes, 'antes')}
                </div>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '800', color: COLORS.slate900, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: COLORS.success }}></span> Valores Después
                  </h4>
                  {renderValoresObjeto(auditoriaSeleccionada.valores_despues, 'despues')}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminAuditorias;
