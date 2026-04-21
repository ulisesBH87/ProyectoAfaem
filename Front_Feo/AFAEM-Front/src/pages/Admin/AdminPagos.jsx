import React, { useEffect, useState } from 'react';
import DashboardTable from '../../components/DashboardTable';
import { getPagosGenerales, updateEstatusPago } from '../../services/admin';
import { API_BASE } from '../../config/config';
import Swal from 'sweetalert2';
import Skeleton from '../../components/Common/Skeleton';
import SearchBar from '../../components/Common/SearchBar';
import { FaSearch, FaSyncAlt, FaFilter, FaSortAmountDown, FaSortAmountUp, FaWallet, FaCheckCircle, FaTimesCircle, FaClock, FaFileInvoice } from 'react-icons/fa';

const AdminPagos = () => {
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstatus, setFiltroEstatus] = useState('2'); // Pendientes por defecto
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchPagos = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const data = await getPagosGenerales(forceRefresh);
      setPagos(data);
    } catch (error) {
      console.error('Error fetching pagos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPagos();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filtroEstatus, searchTerm, sortOrder]);

  const handleUpdateEstatus = async (id, estatus, label) => {
    let motivoRechazo = '';

    if (estatus === 4) {
      const result = await Swal.fire({
        title: `¿Rechazar este pago?`,
        text: `Explica el por qué fue rechazado el pago #${id}.`,
        icon: 'warning',
        input: 'textarea',
        inputPlaceholder: 'Escribe el motivo del rechazo aquí...',
        inputAttributes: {
          'aria-label': 'Motivo de rechazo'
        },
        showCancelButton: true,
        confirmButtonText: 'Enviar y Rechazar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: 'var(--danger)',
        cancelButtonColor: 'var(--text-muted)',
        preConfirm: (text) => {
          if (!text) {
            Swal.showValidationMessage('Debes ingresar un motivo para rechazar el pago');
          }
          return text;
        }
      });

      if (result.isConfirmed) {
        motivoRechazo = result.value;
      } else {
        return;
      }
    } else {
      const result = await Swal.fire({
        title: `¿${label} este pago?`,
        text: `Estás a punto de ${label.toLowerCase()} la orden de pago #${id}.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: `Sí, ${label.toLowerCase()}`,
        cancelButtonText: 'Cancelar',
        confirmButtonColor: estatus === 3 ? 'var(--secondary)' : 'var(--danger)',
        cancelButtonColor: 'var(--text-muted)'
      });
      if (!result.isConfirmed) return;
    }

    try {
      if (estatus === 4) {
        localStorage.setItem(`motivo_rechazo_${id}`, motivoRechazo);
      }
      await updateEstatusPago(id, estatus);
      Swal.fire({
        title: '¡Actualizado!',
        text: `Pago ${label.toLowerCase()} correctamente.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      fetchPagos();
    } catch {
      Swal.fire('Error', 'No se pudo actualizar el estatus del pago.', 'error');
    }
  };

  const handleCambiarEstatusTerminal = async (id, estatusActual) => {
    const esAprobado = estatusActual === 3;
    const mensaje = esAprobado 
      ? "¿Estás a punto de rechazar un pago que ya ha sido aprobado, estás seguro?"
      : "¿Estás a punto de aprobar un pago que ya ha sido rechazado, estás seguro?";
    
    const { isConfirmed } = await Swal.fire({
      title: 'Cambiar Estado de Pago',
      text: mensaje,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, continuar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: esAprobado ? 'var(--danger)' : '#10b981',
      cancelButtonColor: 'var(--text-muted)'
    });

    if (isConfirmed) {
      if (esAprobado) {
        handleUpdateEstatus(id, 4, 'Rechazar');
      } else {
        handleUpdateEstatus(id, 3, 'Aprobar');
      }
    }
  };

  const handleVerVoucher = (rutaVoucher, ordenId) => {
    if (!rutaVoucher) {
      Swal.fire({
        title: 'Sin comprobante',
        text: `La orden #${ordenId} aún no tiene un comprobante de pago adjunto.`,
        icon: 'info',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    // Construir la URL del archivo estático desde el backend
    // RutaVoucher viene como "uploads/vouchers/orden_XX.ext"
    const url = `/${rutaVoucher}`;
    window.open(url, '_blank');
  };

  // Stats
  const totalPagos = pagos.length;
  const pendientes = pagos.filter(p => p.EstatusPagoId === 2).length;
  const aprobados = pagos.filter(p => p.EstatusPagoId === 3).length;
  const rechazados = pagos.filter(p => p.EstatusPagoId === 4).length;
  const montoTotal = pagos.reduce((sum, p) => sum + parseFloat(p.TotalPagar || 0), 0);

  const formatDate = (val) => {
    if (!val) return '—';
    return new Date(val).toLocaleDateString('es-MX', { 
      day: '2-digit', month: 'short', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
  };

  // Filter & Search & Sort
  const filteredPagos = React.useMemo(() => {
    let result = [...pagos];
    if (filtroEstatus !== 'todos') {
      result = result.filter(p => p.EstatusPagoId === Number(filtroEstatus));
    }
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      result = result.filter(p => {
        const dateStr = p.FechaEnvio ? formatDate(p.FechaEnvio).toLowerCase() : '';
        return (p.Correo && p.Correo.toLowerCase().includes(query)) ||
               (p.UsuarioId && String(p.UsuarioId).includes(query)) ||
               (p.OrdenPagoId && String(p.OrdenPagoId).includes(query)) ||
               (dateStr.includes(query));
      });
    }
    result.sort((a, b) => {
      if (sortOrder === 'asc') return a.OrdenPagoId - b.OrdenPagoId;
      return b.OrdenPagoId - a.OrdenPagoId;
    });
    return result;
  }, [pagos, filtroEstatus, searchTerm, sortOrder]);

  const paginatedPagos = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPagos.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPagos, currentPage]);

  const columns = [
    { key: 'OrdenPagoId', label: '# Orden' },
    { 
      key: 'Correo', 
      label: 'Usuario',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-main)' }}>{val || '—'}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {row.UsuarioId}</div>
        </div>
      )
    },
    { 
      key: 'TotalPagar', 
      label: 'Monto',
      render: (val) => (
        <span style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '14px' }}>
          ${parseFloat(val).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    {
      key: 'FechaEnvio',
      label: 'Fecha envío',
      render: (val) => (
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatDate(val)}</span>
      )
    },
    { 
      key: 'EstatusPagoId', 
      label: 'Estatus',
      render: (val) => {
        const config = { 
          2: { label: 'Pendiente', bg: '#fef3c7', color: '#92400e', icon: <FaClock /> }, 
          3: { label: 'Aprobado', bg: '#dcfce7', color: '#166534', icon: <FaCheckCircle /> }, 
          4: { label: 'Rechazado', bg: '#fee2e2', color: '#991b1b', icon: <FaTimesCircle /> } 
        };
        const c = config[val] || { label: 'Desconocido', bg: '#f1f5f9', color: '#64748b', icon: null };
        return (
          <span style={{ 
            padding: '5px 12px', borderRadius: '20px', background: c.bg, color: c.color,
            fontSize: '11px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px'
          }}>
            {c.icon} {c.label.toUpperCase()}
          </span>
        );
      }
    },
    {
      key: 'Acciones',
      label: 'Acciones',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            onClick={() => handleVerVoucher(row.RutaVoucher, row.OrdenPagoId)}
            style={{ 
              padding: '6px 12px', 
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(37, 99, 235, 0.08)',
              color: 'var(--primary)',
              border: '1px solid rgba(37, 99, 235, 0.2)',
              borderRadius: '8px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.08)';
            }}
            title="Ver comprobante adjunto"
          >
            <FaFileInvoice /> Ver
          </button>

          {(row.EstatusPagoId === 3 || row.EstatusPagoId === 4) ? (
            <button 
              onClick={() => handleCambiarEstatusTerminal(row.OrdenPagoId, row.EstatusPagoId)}
              style={{ 
                padding: '7px 14px', fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px'
              }}
            >
              Editar
            </button>
          ) : (
            <>
              <button 
                onClick={() => handleUpdateEstatus(row.OrdenPagoId, 3, 'Aprobar')}
                style={{ 
                  padding: '7px 14px', fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                  background: '#10b981', color: 'white', border: 'none', borderRadius: '8px'
                }}
              >
                Aprobar
              </button>
              <button 
                onClick={() => handleUpdateEstatus(row.OrdenPagoId, 4, 'Rechazar')}
                style={{ 
                  padding: '7px 14px', fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                  background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px'
                }}
              >
                Rechazar
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px', margin: 0 }}>Validación de Pagos</h2>
        <p style={{ color: 'var(--text-muted)', fontWeight: '500', marginTop: '6px' }}>Gestiona y verifica los comprobantes de pago recibidos.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {[
          { label: 'Pendientes', value: pendientes, filter: '2', color: 'var(--warning)', icon: <FaClock /> },
          { label: 'Total Órdenes', value: totalPagos, filter: 'todos', color: 'var(--primary)', icon: <FaWallet /> },
          { label: 'Aprobados', value: aprobados, filter: '3', color: 'var(--secondary)', icon: <FaCheckCircle /> },
          { label: 'Rechazados', value: rechazados, filter: '4', color: 'var(--danger)', icon: <FaTimesCircle /> },
          { label: 'Monto Total', value: `$${montoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, color: 'var(--primary)', icon: <FaWallet />, isMetricOnly: true }
        ]
        .map((stat, i) => (
          <div 
            key={i} 
            onClick={() => stat.filter && setFiltroEstatus(stat.filter)}
            className="card" 
            style={{ 
              padding: '20px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px',
              cursor: stat.isMetricOnly ? 'default' : 'pointer',
              transition: 'all 0.2s ease',
              border: filtroEstatus === stat.filter ? `2px solid ${stat.color}` : '1.5px solid var(--border-light)',
              transform: filtroEstatus === stat.filter ? 'translateY(-3px)' : 'none',
              boxShadow: filtroEstatus === stat.filter ? `0 8px 15px ${stat.color}15` : 'none'
            }}
          >
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${stat.color}15`, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              <div style={{ margin: '0 auto' }}>{stat.icon}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{stat.label}</div>
              {loading ? <Skeleton width="100px" height="20px" /> : <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)' }}>{stat.value}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* TABLE SECTION */}
      <div className="card" style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>Órdenes de pago</h3>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <SearchBar 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              width="280px"
            />

            <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} style={{ background: 'white', border: '1.5px solid var(--border-light)', padding: '10px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {sortOrder === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />} {sortOrder === 'asc' ? 'ASC' : 'DESC'}
            </button>

            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-main)', padding: '4px', borderRadius: '12px', border: '1.5px solid var(--border-light)' }}>
              {['todos', '2', '3', '4'].map((val) => (
                <button key={val} onClick={() => setFiltroEstatus(val)} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: filtroEstatus === val ? 'white' : 'transparent', color: filtroEstatus === val ? 'var(--primary)' : 'var(--text-muted)', boxShadow: filtroEstatus === val ? 'var(--shadow-sm)' : 'none', fontSize: '11px', fontWeight: '700' }}>
                  {val === 'todos' ? 'Todos' : (val === '2' ? 'Pendientes' : (val === '3' ? 'Aprobados' : 'Rechazados'))}
                </button>
              ))}
            </div>

            <button onClick={() => fetchPagos(true)} className="btn-premium" style={{ padding: '10px 16px', fontSize: '12px' }}>
              <FaSyncAlt />
            </button>
          </div>
        </div>

        <DashboardTable columns={columns} data={paginatedPagos} isLoading={loading} totalItems={filteredPagos.length} itemsPerPage={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} emptyMessage="No hay órdenes de pago registradas." />
      </div>
    </div>
  );
};

export default AdminPagos;
