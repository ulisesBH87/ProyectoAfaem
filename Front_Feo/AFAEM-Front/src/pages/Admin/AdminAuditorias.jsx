import React, { useEffect, useState } from 'react';
import DashboardTable from '../../components/DashboardTable';
import { getAuditorias } from '../../services/admin';
import Modal from '../../components/partials/Forms/Modal';
import { FaHistory, FaEye, FaSyncAlt, FaSortAmountDown, FaSortAmountUp, FaSearch } from 'react-icons/fa';
import Skeleton from '../../components/Common/Skeleton';
import SearchBar from '../../components/Common/SearchBar';

const AdminAuditorias = () => {
  const [auditorias, setAuditorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  // Como el backend restringe el límite máximo a 100 por consulta (le=100), usamos 100
  // para cargar el histórico reciente y permitir que la búsqueda funcione.
  const API_FETCH_SIZE = 100; 
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [errorMsg, setErrorMsg] = useState(null);
  
  // Estados para búsqueda y filtrado
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroAccion, setFiltroAccion] = useState('todos');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modal State
  const [modalAbierto, setModalAbierto] = useState(false);
  const [auditoriaSeleccionada, setAuditoriaSeleccionada] = useState(null);

  const fetchAuditorias = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const resp = await getAuditorias(1, API_FETCH_SIZE);
      setAuditorias(resp?.data || []);
      // Obtenemos el total real en base de datos para mostrar la métrica
      setTotalItems(resp?.total || 0); 
    } catch (error) {
      console.error('Error fetching auditorias:', error);
      setErrorMsg(error?.response?.data?.detail || error.message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditorias();
  }, []);

  // Volver a la página 1 cuando se cambie de filtro
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroAccion, sortOrder]);

  const filteredAuditorias = React.useMemo(() => {
    let result = [...auditorias];

    if (filtroAccion !== 'todos') {
      result = result.filter(a => a.accion === filtroAccion);
    }

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      result = result.filter(a =>
        (a.usuario_que_realizo_la_accion?.toLowerCase().includes(query)) ||
        (a.entidad?.toLowerCase().includes(query)) ||
        (a.resumen?.toLowerCase().includes(query))
      );
    }

    result.sort((a, b) => {
      // Las auditorías traen un AuditoriaId implícito en el orden cronológico o podemos usar fechas
      const dateA = new Date(a.fecha).getTime();
      const dateB = new Date(b.fecha).getTime();
      if (sortOrder === 'asc') return dateA - dateB;
      return dateB - dateA;
    });

    return result;
  }, [auditorias, filtroAccion, searchTerm, sortOrder]);

  const paginatedAuditorias = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAuditorias.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAuditorias, currentPage, itemsPerPage]);

  const formatDate = (val) => {
    if (!val) return '—';
    return new Date(val).toLocaleDateString('es-MX', { 
      day: '2-digit', month: 'short', year: 'numeric', 
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  const handleVerDetalle = (row) => {
    setAuditoriaSeleccionada(row);
    setModalAbierto(true);
  };

  const columns = [
    {
      key: 'fecha',
      label: 'Fecha y Hora',
      render: (val) => (
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatDate(val)}</span>
      )
    },
    { 
      key: 'usuario_que_realizo_la_accion', 
      label: 'Usuario',
      render: (val) => (
        <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-main)' }}>{val || '—'}</span>
      )
    },
    { 
      key: 'titulo', 
      label: 'Acción / Título',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '14px' }}>{val}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{row.accion} - {row.entidad}</div>
        </div>
      )
    },
    { 
      key: 'resumen', 
      label: 'Resumen',
      render: (val) => (
        <span style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: '500' }}>{val || '—'}</span>
      )
    },
    {
      key: 'Acciones',
      label: 'Detalles',
      render: (_, row) => {
        const tieneCambios = row.cambios && row.cambios.length > 0;
        return (
          <button 
            onClick={() => handleVerDetalle(row)}
            disabled={!tieneCambios}
            style={{ 
              padding: '6px 12px', 
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: tieneCambios ? 'rgba(37, 99, 235, 0.08)' : 'rgba(100, 116, 139, 0.08)',
              color: tieneCambios ? 'var(--primary)' : '#94a3b8',
              border: tieneCambios ? '1px solid rgba(37, 99, 235, 0.2)' : '1px solid rgba(100, 116, 139, 0.2)',
              borderRadius: '8px',
              fontWeight: '700',
              cursor: tieneCambios ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              opacity: tieneCambios ? 1 : 0.6
            }}
            onMouseEnter={(e) => {
              if (tieneCambios) e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.15)';
            }}
            onMouseLeave={(e) => {
              if (tieneCambios) e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.08)';
            }}
            title={tieneCambios ? "Ver cambios detallados" : "Sin detalles adicionales"}
          >
            <FaEye /> {tieneCambios ? 'Ver Cambios' : 'Sin Cambios'}
          </button>
        );
      }
    }
  ];

  return (
    <div className="fade-in">
      {/* HEADER SECTION */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FaHistory style={{ color: 'var(--primary)' }} /> Auditorías
        </h1>
        <p style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Registro de acciones y cambios en el sistema.</p>
      </div>

      {/* STATS SECTION */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div 
          className="card" 
          style={{ 
            padding: '20px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px',
            border: '1.5px solid var(--border-light)'
          }}
        >
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `rgba(37, 99, 235, 0.15)`, color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
            <FaHistory />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Registros</div>
            {loading ? <Skeleton width="100px" height="20px" /> : <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)' }}>{totalItems}</div>}
          </div>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="card" style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>Historial de Acciones</h3>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <SearchBar
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar acción, usuario..."
              width="280px"
            />

            <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} style={{ background: 'white', border: '1.5px solid var(--border-light)', padding: '10px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {sortOrder === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />} {sortOrder === 'asc' ? 'Antiguos Primero' : 'Recientes Primero'}
            </button>

            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-main)', padding: '4px', borderRadius: '12px', border: '1.5px solid var(--border-light)' }}>
              {['todos', 'CREATE', 'UPDATE', 'DELETE'].map((val) => (
                <button key={val} onClick={() => setFiltroAccion(val)} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: filtroAccion === val ? 'white' : 'transparent', color: filtroAccion === val ? 'var(--primary)' : 'var(--text-muted)', boxShadow: filtroAccion === val ? 'var(--shadow-sm)' : 'none', fontSize: '11px', fontWeight: '700' }}>
                  {val === 'todos' ? 'Todas' : (val === 'CREATE' ? 'Creaciones' : (val === 'UPDATE' ? 'Ediciones' : 'Eliminaciones'))}
                </button>
              ))}
            </div>

            <button onClick={fetchAuditorias} className="btn-premium" style={{ padding: '10px 16px', fontSize: '12px' }}>
              <FaSyncAlt /> Refrescar
            </button>
          </div>
        </div>

        {errorMsg && (
          <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#fee2e2', borderRadius: '8px', border: '1px solid #fca5a5', color: '#991b1b', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontWeight: '800' }}>No se pudieron cargar los registros:</span>
            <span>{typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg}</span>
          </div>
        )}

        <DashboardTable 
          columns={columns} 
          data={paginatedAuditorias} 
          isLoading={loading} 
          totalItems={filteredAuditorias.length} 
          itemsPerPage={itemsPerPage} 
          currentPage={currentPage} 
          onPageChange={setCurrentPage} 
          emptyMessage="No hay registros de auditoría que coincidan con los filtros." 
        />
      </div>

      {/* MODAL DETALLES */}
      <Modal
        estaAbierto={modalAbierto}
        titulo="Detalle de Cambios"
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
          <div>
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'var(--bg-main)', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: '800', color: 'var(--text-main)' }}>Información General</h4>
              <p style={{ margin: '4px 0', fontSize: '13px' }}><strong>Acción:</strong> {auditoriaSeleccionada.accion}</p>
              <p style={{ margin: '4px 0', fontSize: '13px' }}><strong>Sujeto:</strong> {auditoriaSeleccionada.resumen}</p>
              <p style={{ margin: '4px 0', fontSize: '13px' }}><strong>Usuario:</strong> {auditoriaSeleccionada.usuario_que_realizo_la_accion}</p>
              <p style={{ margin: '4px 0', fontSize: '13px' }}><strong>Fecha:</strong> {formatDate(auditoriaSeleccionada.fecha)}</p>
            </div>

            {auditoriaSeleccionada.cambios && auditoriaSeleccionada.cambios.length > 0 ? (
              <div style={{ marginTop: '16px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '12px' }}>Modificaciones</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {auditoriaSeleccionada.cambios.map((cambio, idx) => (
                    <div key={idx} style={{ padding: '12px', border: '1px solid var(--border-light)', borderRadius: '8px', backgroundColor: '#fff', fontSize: '13px' }}>
                      <div style={{ fontWeight: '700', color: 'var(--primary)', marginBottom: '6px' }}>
                        Atributo: {cambio.campo}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                        <div style={{ flex: 1, padding: '8px', backgroundColor: '#fee2e2', borderRadius: '6px', color: '#991b1b', border: '1px dashed #fca5a5' }}>
                           <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Antes</span>
                           {cambio.antes || <span style={{ fontStyle: 'italic', color: '#f87171' }}>Vacío</span>}
                        </div>
                        <div style={{ fontSize: '16px', color: '#94a3b8' }}>➔</div>
                        <div style={{ flex: 1, padding: '8px', backgroundColor: '#dcfce7', borderRadius: '6px', color: '#166534', border: '1px dashed #86efac' }}>
                           <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Después</span>
                           {cambio.despues || <span style={{ fontStyle: 'italic', color: '#4ade80' }}>Vacío</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No se registraron cambios específicos detallados.</p>
            )}
          </div>
        )}
      </Modal>

    </div>
  );
};

export default AdminAuditorias;
