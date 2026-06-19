import React, { useEffect, useState } from 'react';
import DashboardTable from '../../components/DashboardTable';
import { getAuditoriasMaster } from '../../services/admin';
import Modal from '../../components/partials/Forms/Modal';
import { FaHistory, FaEye, FaSyncAlt, FaSortAmountDown, FaSortAmountUp, FaSearch, FaFilter } from 'react-icons/fa';
import Loader from '../../components/Loader';
import SearchBar from '../../components/Common/SearchBar';

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

  const renderValoresObjeto = (objeto) => {
    const data = parseJsonData(objeto);
    if (!data || Object.keys(data).length === 0) {
      return <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>Sin datos registrados</span>;
    }

    return (
      <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', background: 'rgba(0,0,0,0.2)' }}>
        <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', color: '#e2e8f0' }}>
          <tbody>
            {Object.entries(data).map(([key, val]) => (
              <tr key={key} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '8px 12px', fontWeight: '700', color: '#3b82f6', width: '40%', borderRight: '1px solid rgba(255,255,255,0.03)' }}>
                  {key}
                </td>
                <td style={{ padding: '8px 12px', wordBreak: 'break-all' }}>
                  {val !== null && val !== undefined ? String(val) : <span style={{ fontStyle: 'italic', color: '#64748b' }}>null</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const columns = [
    {
      key: 'fecha',
      label: 'Fecha y Hora',
      render: (val) => (
        <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>{formatDate(val)}</span>
      )
    },
    {
      key: 'usuario_que_realizo_la_accion',
      label: 'Usuario',
      render: (val) => (
        <span style={{ fontWeight: '700', fontSize: '13px', color: '#ffffff' }}>{val || '—'}</span>
      )
    },
    {
      key: 'titulo',
      label: 'Acción / Entidad',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: '800', color: '#3b82f6', fontSize: '13px' }}>{val}</div>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>{row.accion} - {row.entidad}</div>
        </div>
      )
    },
    {
      key: 'ip',
      label: 'Dirección IP',
      render: (val) => (
        <span style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>{val || '—'}</span>
      )
    },
    {
      key: 'resumen',
      label: 'Detalle',
      render: (val) => (
        <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: '500' }}>{val || '—'}</span>
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
    <div className="fade-in" style={{ color: '#e2e8f0' }}>
      {/* HEADER SECTION */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#ffffff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.5px' }}>
          <FaHistory style={{ color: '#3b82f6', filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.4))' }} /> Auditorías
        </h1>
        <p style={{ color: '#94a3b8', fontWeight: '500', fontSize: '15px' }}>Registro centralizado de transacciones y operaciones en el sistema.</p>
      </div>

      {/* FILTER PANEL */}
      <div className="card" style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff', marginBottom: '16px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaFilter style={{ color: '#3b82f6', fontSize: '12px' }} /> Filtrar Auditorías
        </h3>
        
        <form onSubmit={handleBuscar} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          {/* Fecha Inicio */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Fecha Inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 12px', color: '#ffffff', fontSize: '13px' }}
            />
          </div>

          {/* Fecha Fin */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Fecha Fin</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 12px', color: '#ffffff', fontSize: '13px' }}
            />
          </div>

          {/* Usuario */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Usuario</label>
            <input
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="Nombre de usuario..."
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 12px', color: '#ffffff', fontSize: '13px' }}
            />
          </div>

          {/* IP */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Dirección IP</label>
            <input
              type="text"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="Ej. 127.0.0.1"
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 12px', color: '#ffffff', fontSize: '13px' }}
            />
          </div>

          {/* Acción */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Acción</label>
            <select
              value={accion}
              onChange={(e) => setAccion(e.target.value)}
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 12px', color: '#ffffff', fontSize: '13px' }}
            >
              <option value="todos" style={{ background: '#0f172a' }}>Todas</option>
              <option value="CREATE" style={{ background: '#0f172a' }}>CREATE (Creación)</option>
              <option value="UPDATE" style={{ background: '#0f172a' }}>UPDATE (Edición)</option>
              <option value="DELETE" style={{ background: '#0f172a' }}>DELETE (Eliminación)</option>
              <option value="READ" style={{ background: '#0f172a' }}>READ (Consulta)</option>
            </select>
          </div>

          {/* Entidad */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Entidad Afectada</label>
            <select
              value={entidad}
              onChange={(e) => setEntidad(e.target.value)}
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 12px', color: '#ffffff', fontSize: '13px' }}
            >
              <option value="todos" style={{ background: '#0f172a' }}>Todas</option>
              <option value="Personas" style={{ background: '#0f172a' }}>Personas</option>
              <option value="Usuarios" style={{ background: '#0f172a' }}>Usuarios</option>
              <option value="Equipos" style={{ background: '#0f172a' }}>Equipos</option>
              <option value="MiembrosEquipo" style={{ background: '#0f172a' }}>Miembros de Equipo</option>
              <option value="Ligas" style={{ background: '#0f172a' }}>Ligas</option>
              <option value="PresidenteInvitacion" style={{ background: '#0f172a' }}>Invitaciones</option>
            </select>
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: '8px', gridColumn: 'span 2' }}>
            <button
              type="submit"
              className="btn-premium"
              style={{ flex: 1, padding: '10px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <FaSearch /> Filtrar
            </button>
            <button
              type="button"
              onClick={handleLimpiarFiltros}
              style={{ background: 'transparent', border: '1.5px solid rgba(255,255,255,0.1)', color: '#cbd5e1', padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
            >
              Limpiar
            </button>
          </div>
        </form>
      </div>

      {/* TABLE SECTION */}
      <div className="card" style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '20px', padding: '32px', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff', margin: 0 }}>Historial de Acciones</h3>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', padding: '4px 10px', borderRadius: '8px' }}>
            {totalItems} registros totales
          </span>
        </div>

        {errorMsg && (
          <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: 'rgba(239, 68, 68, 0.15)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', fontSize: '14px' }}>
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
        tamanio="medio"
        pie={
          <button
            onClick={() => setModalAbierto(false)}
            className="btn-premium"
            style={{ minWidth: '100px' }}
          >
            Cerrar
          </button>
        }
      >
        {auditoriaSeleccionada && (
          <div style={{ fontFamily: "'Outfit', sans-serif" }}>
            <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: 'rgba(0, 0, 0, 0.25)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)', color: '#cbd5e1' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '800', color: '#ffffff', textTransform: 'uppercase' }}>Información General</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '13px' }}>
                <p style={{ margin: 0 }}><strong>Acción:</strong> <span style={{ color: '#3b82f6', fontWeight: '700' }}>{auditoriaSeleccionada.accion}</span></p>
                <p style={{ margin: 0 }}><strong>Entidad:</strong> {auditoriaSeleccionada.entidad}</p>
                <p style={{ margin: 0 }}><strong>IP Origen:</strong> {auditoriaSeleccionada.ip || 'N/A'}</p>
                <p style={{ margin: 0 }}><strong>Usuario Ejecutor:</strong> {auditoriaSeleccionada.usuario_que_realizo_la_accion}</p>
                <p style={{ margin: 0 }}><strong>Fecha:</strong> {formatDate(auditoriaSeleccionada.fecha)}</p>
              </div>
              {auditoriaSeleccionada.observaciones && (
                <p style={{ margin: '8px 0 0 0', fontSize: '13px' }}><strong>Observaciones:</strong> {auditoriaSeleccionada.observaciones}</p>
              )}
            </div>

            {auditoriaSeleccionada.accion === 'UPDATE' && auditoriaSeleccionada.cambios && auditoriaSeleccionada.cambios.length > 0 ? (
              <div style={{ marginTop: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff', marginBottom: '12px', textTransform: 'uppercase' }}>Campos Modificados</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {auditoriaSeleccionada.cambios.map((cambio, idx) => (
                    <div key={idx} style={{ padding: '12px', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '8px', backgroundColor: 'rgba(0, 0, 0, 0.15)', fontSize: '12px' }}>
                      <div style={{ fontWeight: '700', color: '#3b82f6', marginBottom: '6px' }}>
                        Campo: {cambio.campo}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                        <div style={{ flex: 1, padding: '8px', backgroundColor: 'rgba(239, 68, 68, 0.08)', borderRadius: '6px', color: '#fca5a5', border: '1px dashed rgba(239, 68, 68, 0.2)' }}>
                           <span style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '4px', color: '#ef4444' }}>Antes</span>
                           {cambio.antes !== null && cambio.antes !== undefined ? String(cambio.antes) : <span style={{ fontStyle: 'italic', opacity: 0.5 }}>vacío</span>}
                        </div>
                        <div style={{ fontSize: '16px', color: '#64748b' }}>➔</div>
                        <div style={{ flex: 1, padding: '8px', backgroundColor: 'rgba(16, 185, 129, 0.08)', borderRadius: '6px', color: '#a7f3d0', border: '1px dashed rgba(16, 185, 129, 0.2)' }}>
                           <span style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '4px', color: '#10b981' }}>Después</span>
                           {cambio.despues !== null && cambio.despues !== undefined ? String(cambio.despues) : <span style={{ fontStyle: 'italic', opacity: 0.5 }}>vacío</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '16px' }}>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff', marginBottom: '8px', textTransform: 'uppercase' }}>Valores Antes</h4>
                  {renderValoresObjeto(auditoriaSeleccionada.valores_antes)}
                </div>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff', marginBottom: '8px', textTransform: 'uppercase' }}>Valores Después</h4>
                  {renderValoresObjeto(auditoriaSeleccionada.valores_despues)}
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
