import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/Admin/AdminLayout';
import DashboardTable from '../../components/DashboardTable';
import { getPagosGenerales, updateEstatusPago } from '../../services/admin';
import Swal from 'sweetalert2';

const AdminPagos = () => {
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstatus, setFiltroEstatus] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'

  const fetchPagos = async () => {
    setLoading(true);
    try {
      const data = await getPagosGenerales();
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

  const handleUpdateEstatus = async (id, estatus, label) => {
    const result = await Swal.fire({
      title: `¿${label} este pago?`,
      text: `Estás a punto de ${label.toLowerCase()} la orden de pago #${id}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Sí, ${label.toLowerCase()}`,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: estatus === 3 ? '#10b981' : '#ef4444'
    });

    if (result.isConfirmed) {
      try {
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
    }
  };

  // Stats
  const totalPagos = pagos.length;
  const pendientes = pagos.filter(p => p.EstatusPagoId === 1).length;
  const aprobados = pagos.filter(p => p.EstatusPagoId === 3).length;
  const rechazados = pagos.filter(p => p.EstatusPagoId === 2).length;
  const montoTotal = pagos.reduce((sum, p) => sum + parseFloat(p.TotalPagar || 0), 0);

  const formatDate = (val) => {
    if (!val) return '—';
    return new Date(val).toLocaleDateString('es-MX', { 
      day: '2-digit', month: 'short', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
  };

  // Filter & Search & Sort
  const pagosProcesados = React.useMemo(() => {
    let result = [...pagos];

    // 1. Filter by status
    if (filtroEstatus !== 'todos') {
      result = result.filter(p => p.EstatusPagoId === Number(filtroEstatus));
    }

    // 2. Search
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

    // 3. Sort (Ascending/Descending by Order ID)
    result.sort((a, b) => {
      if (sortOrder === 'asc') return a.OrdenPagoId - b.OrdenPagoId;
      return b.OrdenPagoId - a.OrdenPagoId;
    });

    return result;
  }, [pagos, filtroEstatus, searchTerm, sortOrder]);

  const columns = [
    { key: 'OrdenPagoId', label: '# Orden' },
    { 
      key: 'Correo', 
      label: 'Usuario',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b' }}>{val || '—'}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>ID: {row.UsuarioId}</div>
        </div>
      )
    },
    { 
      key: 'TotalPagar', 
      label: 'Monto',
      render: (val) => (
        <span style={{ fontWeight: '800', color: '#0b4ea6', fontSize: '14px' }}>
          ${parseFloat(val).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    {
      key: 'FechaEnvio',
      label: 'Fecha envío',
      render: (val) => (
        <span style={{ fontSize: '12px', color: '#64748b' }}>{formatDate(val)}</span>
      )
    },
    { 
      key: 'EstatusPagoId', 
      label: 'Estatus',
      render: (val) => {
        const config = { 
          1: { label: 'Pendiente', bg: '#fef3c7', color: '#92400e', icon: '⏳' }, 
          3: { label: 'Aprobado', bg: '#dcfce7', color: '#166534', icon: '✅' }, 
          2: { label: 'Rechazado', bg: '#fee2e2', color: '#991b1b', icon: '❌' } 
        };
        const c = config[val] || { label: 'Desconocido', bg: '#f1f5f9', color: '#64748b', icon: '❓' };
        return (
          <span style={{ 
            padding: '5px 12px', 
            borderRadius: '20px', 
            background: c.bg, 
            color: c.color,
            fontSize: '12px',
            fontWeight: '700',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {c.icon} {c.label}
          </span>
        );
      }
    },
    {
      key: 'Acciones',
      label: 'Acciones',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          {row.EstatusPagoId === 1 && (
            <>
              <button 
                onClick={() => handleUpdateEstatus(row.OrdenPagoId, 3, 'Aprobar')}
                style={{ 
                  background: 'linear-gradient(135deg, #10b981, #059669)', 
                  color: 'white', border: 'none', padding: '7px 16px', 
                  borderRadius: '8px', cursor: 'pointer', fontSize: '12px', 
                  fontWeight: '700', transition: 'transform 0.2s',
                  boxShadow: '0 2px 4px rgba(16,185,129,0.3)'
                }}
                onMouseOver={e => e.target.style.transform = 'scale(1.05)'}
                onMouseOut={e => e.target.style.transform = 'scale(1)'}
              >
                ✓ Aprobar
              </button>
              <button 
                onClick={() => handleUpdateEstatus(row.OrdenPagoId, 2, 'Rechazar')}
                style={{ 
                  background: 'white', color: '#ef4444', 
                  border: '1.5px solid #fecaca', padding: '7px 16px', 
                  borderRadius: '8px', cursor: 'pointer', fontSize: '12px', 
                  fontWeight: '700', transition: 'transform 0.2s'
                }}
                onMouseOver={e => e.target.style.transform = 'scale(1.05)'}
                onMouseOut={e => e.target.style.transform = 'scale(1)'}
              >
                ✗ Rechazar
              </button>
            </>
          )}
          {row.EstatusPagoId === 3 && (
            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>Validado ✓</span>
          )}
          {row.EstatusPagoId === 2 && (
            <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: '600' }}>Rechazado</span>
          )}
        </div>
      )
    }
  ];

  return (
    <AdminLayout title="Validación de Pagos">
      {/* STATS CARDS */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
        gap: '16px', 
        marginBottom: '24px' 
      }}>
        {[
          { label: 'Total Órdenes', value: totalPagos, color: '#0b4ea6', icon: '📋' },
          { label: 'Pendientes', value: pendientes, color: '#f59e0b', icon: '⏳' },
          { label: 'Aprobados', value: aprobados, color: '#10b981', icon: '✅' },
          { label: 'Rechazados', value: rechazados, color: '#ef4444', icon: '❌' },
          { label: 'Monto Total', value: `$${montoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, color: '#0b4ea6', icon: '💰' }
        ].map((stat, i) => (
          <div key={i} style={{
            background: 'white',
            borderRadius: '14px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: stat.color }}>
                  {stat.value}
                </div>
              </div>
              <div style={{ fontSize: '28px', opacity: 0.7 }}>{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* TABLE SECTION */}
      <div style={{ background: 'white', padding: '24px 28px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: 0 }}>
            Órdenes de Pago
            {pagosProcesados.length !== totalPagos && (
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginLeft: '10px' }}>
                ({pagosProcesados.length} resultados)
              </span>
            )}
          </h3>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
              <input 
                type="text" 
                placeholder="Buscar por correo, ID o fecha..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '8px 12px 8px 35px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  fontSize: '13px',
                  width: '220px',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#0b4ea6'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            {/* Sort Toggle */}
            <button 
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '8px 12px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: '700',
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {sortOrder === 'asc' ? '🔼 Ascendente' : '🔽 Descendente'}
            </button>

            {/* Filter buttons */}
            <div style={{ display: 'flex', gap: '8px', background: '#f8fafc', padding: '4px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              {[
                { value: 'todos', label: 'Todos', color: '#0b4ea6' },
                { value: '1', label: 'Pendientes', color: '#f59e0b' },
                { value: '3', label: 'Aprobados', color: '#10b981' },
                { value: '2', label: 'Rechazados', color: '#ef4444' }
              ].map(f => (
                <button 
                  key={f.value}
                  onClick={() => setFiltroEstatus(f.value)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: filtroEstatus === f.value ? 'white' : 'transparent',
                    color: filtroEstatus === f.value ? f.color : '#64748b',
                    boxShadow: filtroEstatus === f.value ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button 
              onClick={fetchPagos}
              style={{ 
                background: '#0b4ea6', border: 'none', padding: '9px 16px', 
                borderRadius: '10px', cursor: 'pointer', fontWeight: '700',
                fontSize: '12px', color: 'white', transition: 'all 0.2s',
                boxShadow: '0 4px 6px rgba(11,78,166,0.2)'
              }}
              onMouseOver={e => e.target.style.backgroundColor = '#063f82'}
              onMouseOut={e => e.target.style.backgroundColor = '#0b4ea6'}
            >
              🔄 Actualizar
            </button>
          </div>
        </div>
        <DashboardTable 
          columns={columns} 
          data={pagosProcesados} 
          isLoading={loading}
          emptyMessage="No hay órdenes de pago con este filtro"
        />
      </div>
    </AdminLayout>
  );
};

export default AdminPagos;
