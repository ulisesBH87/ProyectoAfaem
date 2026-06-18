import React, { useEffect, useState } from 'react';
import DashboardTable from '../../components/DashboardTable';
import { getPagosGenerales, updateEstatusPago, getPagoIndividual, getSeguros, getAfiliaciones } from '../../services/admin';
import { API_BASE } from '../../config/config';
import Swal from 'sweetalert2';
import Loader from '../../components/Loader';
import SearchBar from '../../components/Common/SearchBar';
import { FaSearch, FaSyncAlt, FaFilter, FaSortAmountDown, FaSortAmountUp, FaWallet, FaCheckCircle, FaTimesCircle, FaClock, FaFileInvoice, FaFileAlt } from 'react-icons/fa';
import Modal from '../../components/partials/Forms/Modal';
import AdminTabs from '../../components/Admin/AdminTabs';

import { useSecureBlob } from '../../hooks/useSecureBlob';

const AdminPagos = () => {
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);

  const [filtroEstatus, setFiltroEstatus] = useState('2'); // Pendientes por defecto
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal states for payment order details and voucher
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [pagoDetalle, setPagoDetalle] = useState(null);
  const [catalogoSeguros, setCatalogoSeguros] = useState([]);
  const [catalogoAfiliaciones, setCatalogoAfiliaciones] = useState([]);

  // Hook para cargar el voucher de forma segura
  const { blobUrl: voucherBlobUrl, loading: voucherLoading, error: voucherError } = useSecureBlob(pagoDetalle?.RutaVoucher);
  const isVoucherVisible = pagoDetalle?.RutaVoucher && !voucherError;

  // Fetch catalogs on mount for display mapping
  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const [segurosData, afiliacionesData] = await Promise.all([
          getSeguros(),
          getAfiliaciones()
        ]);
        setCatalogoSeguros(segurosData || []);
        setCatalogoAfiliaciones(afiliacionesData || []);
      } catch (err) {
        console.error('Error al cargar catálogos en AdminPagos:', err);
      }
    };
    cargarCatalogos();
  }, []);

  const fetchPagos = async (forceRefresh = false, isTableOnly = false) => {
    if (isTableOnly) {
      setTableLoading(true);
    } else {
      setLoading(true);
    }
    try {
      const data = await getPagosGenerales(forceRefresh);
      setPagos(data);
    } catch (error) {
      console.error('Error fetching pagos:', error);
    } finally {
      setLoading(false);
      setTableLoading(false);
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
        text: `Estás a punto de ${label.toLowerCase()} la orden de pago #${id}. Al hacerlo, el presidente podrá subir sus documentos.`,
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
      await updateEstatusPago(id, estatus, motivoRechazo);
      setModalOpen(false);
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
    const etiqueta = estatusActual === 3 ? 'aprobado' : 'rechazado';

    const { isConfirmed, isDenied } = await Swal.fire({
      title: 'Re-verificar Pago',
      html: `
        <p style="margin:0 0 12px; color:#475569; font-size:14px;">
          Este pago fue <strong>${etiqueta}</strong> previamente.<br/>
          Selecciona la nueva acción a realizar:
        </p>
      `,
      icon: 'info',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: '✓ Aprobar',
      denyButtonText: '✗ Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      denyButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8'
    });

    if (isConfirmed) {
      handleUpdateEstatus(id, 3, 'Aprobar');
    } else if (isDenied) {
      handleUpdateEstatus(id, 4, 'Rechazar');
    }
  };

  const handleVerVoucher = async (rutaVoucher, ordenId) => {
    setLoadingDetalle(true);
    setModalOpen(true);
    setPagoDetalle(null);

    try {
      const data = await getPagoIndividual(ordenId);
      setPagoDetalle(data);
    } catch (error) {
      console.error('Error al cargar detalle del pago:', error);
      Swal.fire({
        title: 'Error',
        text: 'Ocurrió un error al consultar los detalles de la orden de pago.',
        icon: 'error'
      });
      setModalOpen(false);
    } finally {
      setLoadingDetalle(false);
    }
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
      width: '180px',
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
          4: { label: 'Rechazado', bg: '#fee2e2', color: '#991b1b', icon: <FaTimesCircle /> },
          5: { label: 'Caducado', bg: '#fee2e2', color: '#006774', icon: <FaTimesCircle /> }
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
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'nowrap', minWidth: 'max-content' }}>
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

  if (loading && pagos.length === 0) {
    return <Loader text="Cargando historial de pagos..." />;
  }

  return (
    <div className="fade-in">
      <AdminTabs />
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px', margin: 0 }}>Validación de Pagos</h2>
        <p style={{ color: 'var(--text-muted)', fontWeight: '500', marginTop: '6px' }}>Gestiona y verifica los comprobantes de pago recibidos.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '20px', marginBottom: '32px' }}>
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
                <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)' }}>{stat.value}</div>
              </div>
            </div>
          ))}
      </div>

      {/* TABLE SECTION */}
      <div className="card" style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>Órdenes de pago</h3>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
            <div style={{ flex: '1 1 200px' }}>
              <SearchBar
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar..."
                width="100%"
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: '1 1 auto' }}>
              <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} style={{ background: 'white', border: '1.5px solid var(--border-light)', padding: '10px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 auto', justifyContent: 'center' }}>
                {sortOrder === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />} {sortOrder === 'asc' ? 'ASC' : 'DESC'}
              </button>

              <button onClick={() => fetchPagos(true, true)} className="btn-premium" style={{ padding: '10px 16px', fontSize: '12px', flex: '1 1 auto', justifyContent: 'center' }}>
                <FaSyncAlt />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-main)', padding: '4px', borderRadius: '12px', border: '1.5px solid var(--border-light)', flexWrap: 'wrap', flex: '1 1 100%' }}>
              {['todos', '2', '3', '4'].map((val) => (
                <button key={val} onClick={() => setFiltroEstatus(val)} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: filtroEstatus === val ? 'white' : 'transparent', color: filtroEstatus === val ? 'var(--primary)' : 'var(--text-muted)', boxShadow: filtroEstatus === val ? 'var(--shadow-sm)' : 'none', fontSize: '11px', fontWeight: '700', flex: '1 1 auto' }}>
                  {val === 'todos' ? 'Todos' : (val === '2' ? 'Pendientes' : (val === '3' ? 'Aprobados' : 'Rechazados'))}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <DashboardTable columns={columns} data={paginatedPagos} isLoading={loading || tableLoading} totalItems={filteredPagos.length} itemsPerPage={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} emptyMessage="No hay órdenes de pago registradas." />
        </div>
      </div>

      {/* MODAL DETALLE Y COMPROBANTE DE PAGO */}
      <Modal
        estaAbierto={modalOpen}
        titulo="Detalle y Comprobante de Pago"
        alCerrar={() => setModalOpen(false)}
        tamanio="grande"
        pie={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <div>
              {pagoDetalle && (
                (pagoDetalle.EstatusPagoId === 3 || pagoDetalle.EstatusPagoId === 4) ? (
                  <button
                    onClick={() => handleCambiarEstatusTerminal(pagoDetalle.OrdenPagoId, pagoDetalle.EstatusPagoId)}
                    style={{
                      padding: '8px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                      background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', marginRight: '10px'
                    }}
                  >
                    Editar Estatus
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleUpdateEstatus(pagoDetalle.OrdenPagoId, 3, 'Aprobar')}
                      style={{
                        padding: '8px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                        background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', marginRight: '10px'
                      }}
                    >
                      Aprobar
                    </button>
                    <button
                      onClick={() => handleUpdateEstatus(pagoDetalle.OrdenPagoId, 4, 'Rechazar')}
                      style={{
                        padding: '8px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                        background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', marginRight: '10px'
                      }}
                    >
                      Rechazar
                    </button>
                  </>
                )
              )}
            </div>
            <button
              onClick={() => setModalOpen(false)}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                background: '#94a3b8',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#64748b'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#94a3b8'}
            >
              Cerrar
            </button>
          </div>
        }
      >
        {loadingDetalle ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
            <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Cargando...</span>
            </div>
            <span style={{ marginTop: '16px', color: '#64748b', fontWeight: '600' }}>Cargando detalles de la orden...</span>
          </div>
        ) : pagoDetalle ? (
          <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '24px' }}>
            {/* Columna izquierda: Detalles del pago */}
            <div style={{ flex: '1 1 350px', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc' }}>
                <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0b4ea6', marginBottom: '16px', marginTop: 0 }}>Conceptos de la Orden #{pagoDetalle.OrdenPagoId}</h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {pagoDetalle.OrdenPagoDetalleRelacion && pagoDetalle.OrdenPagoDetalleRelacion.length > 0 ? (
                    pagoDetalle.OrdenPagoDetalleRelacion.map((detalle, idx) => {
                      let nombreConcepto = 'Concepto desconocido';
                      if (detalle.TipoConceptoId === 1) {
                        const seg = catalogoSeguros.find(s => s.SeguroId === detalle.SeguroId);
                        nombreConcepto = seg ? `Seguro: ${seg.Nombre}` : `Seguro (ID: ${detalle.SeguroId})`;
                      } else if (detalle.TipoConceptoId === 2) {
                        const af = catalogoAfiliaciones.find(a => a.TipoAfiliacionId === detalle.TipoAfiliacionId);
                        nombreConcepto = af ? `Inscripción: ${af.NombreAfiliacion}` : `Inscripción (ID: ${detalle.TipoAfiliacionId})`;
                      }

                      return (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
                          <div>
                            <div style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b' }}>{nombreConcepto}</div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Cant: {detalle.Cantidad} x ${parseFloat(detalle.PrecioUnitarioCobrado).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
                          </div>
                          <div style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b', alignSelf: 'center' }}>
                            ${parseFloat(detalle.Subtotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ color: '#64748b', fontSize: '12px', fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>
                      No hay conceptos registrados para esta orden.
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '2px solid #e2e8f0' }}>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#64748b' }}>Total de la orden:</span>
                  <span style={{ fontSize: '20px', fontWeight: '900', color: '#0b4ea6' }}>
                    ${parseFloat(pagoDetalle.TotalPagar).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', background: 'white' }}>
                <h5 style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', margin: '0 0 10px 0' }}>Información de Pago</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: '#64748b', fontWeight: '600' }}>Usuario:</span> <span style={{ color: '#1e293b' }}>{pagoDetalle.NombreCompleto ? `${pagoDetalle.NombreCompleto} (${pagoDetalle.Correo})` : (pagoDetalle.Correo || '—')}</span>
                  </div>
                  {pagoDetalle.ReferenciaPago && (
                    <div>
                      <span style={{ color: '#64748b', fontWeight: '600' }}>Referencia de Pago:</span>{' '}
                      <span style={{ color: '#1e293b', fontWeight: '800', fontFamily: 'monospace', fontSize: '13px', letterSpacing: '0.5px' }}>{pagoDetalle.ReferenciaPago}</span>
                    </div>
                  )}
                  {pagoDetalle.FechaEnvio && (
                    <div>
                      <span style={{ color: '#64748b', fontWeight: '600' }}>Fecha envío:</span> <span style={{ color: '#1e293b' }}>{formatDate(pagoDetalle.FechaEnvio)}</span>
                    </div>
                  )}
                  {pagoDetalle.FechaDePago && (
                    <div>
                      <span style={{ color: '#64748b', fontWeight: '600' }}>Fecha pago:</span> <span style={{ color: '#1e293b' }}>{formatDate(pagoDetalle.FechaDePago)}</span>
                    </div>
                  )}
                  <div>
                    <span style={{ color: '#64748b', fontWeight: '600' }}>Estatus actual:</span>{' '}
                    {(() => {
                      const estatusConfig = {
                        2: { label: 'PENDIENTE', bg: '#fef3c7', color: '#92400e' },
                        3: { label: 'APROBADO', bg: '#dcfce7', color: '#166534' },
                        4: { label: 'RECHAZADO', bg: '#fee2e2', color: '#991b1b' },
                        5: { label: 'CADUCADO', bg: '#fee2e2', color: '#006774' }
                      };
                      const conf = estatusConfig[pagoDetalle.EstatusPagoId] || { label: 'DESCONOCIDO', bg: '#f1f5f9', color: '#64748b' };
                      return (
                        <span style={{ padding: '2px 8px', borderRadius: '12px', background: conf.bg, color: conf.color, fontSize: '10px', fontWeight: '700' }}>
                          {conf.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Columna derecha: Comprobante/Voucher */}
            <div style={{ flex: '1 1 350px', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0b4ea6', margin: 0 }}>Comprobante de Pago</h4>
                {isVoucherVisible && !voucherLoading && (
                  <a
                    href={voucherBlobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '12px', fontWeight: '700', color: '#2563eb', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    Ver en pantalla completa ↗
                  </a>
                )}
              </div>

              {voucherLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px dashed #e2e8f0', borderRadius: '12px', height: '400px', background: '#f8fafc' }}>
                  <Loader />
                  <span style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>Cargando comprobante...</span>
                </div>
              ) : !isVoucherVisible ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #cbd5e1', borderRadius: '12px', height: '400px', padding: '24px', background: '#f8fafc', color: '#64748b', textAlign: 'center' }}>
                  <FaFileAlt style={{ fontSize: '48px', color: '#94a3b8', marginBottom: '16px' }} />
                  <h5 style={{ fontSize: '14px', fontWeight: '800', color: '#475569', margin: '0 0 8px 0' }}>El comprobante no se encuentra disponible.</h5>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>El usuario aún no ha cargado un voucher o el archivo ya no existe.</p>
                </div>
              ) : pagoDetalle.RutaVoucher.toLowerCase().includes('.pdf') ? (
                <object
                  data={voucherBlobUrl}
                  type="application/pdf"
                  style={{ width: '100%', height: '400px', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '24px', background: '#f8fafc', color: '#64748b', textAlign: 'center' }}>
                    <FaFileAlt style={{ fontSize: '32px', marginBottom: '8px' }} />
                    <span style={{ fontSize: '13px', fontWeight: '500' }}>No se puede previsualizar el PDF directamente.</span>
                    <a
                      href={voucherBlobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ marginTop: '12px', padding: '8px 16px', background: '#2563eb', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '12px', fontWeight: '700' }}
                    >
                      Abrir PDF en nueva pestaña
                    </a>
                  </div>
                </object>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#f8fafc', height: '400px', padding: '8px' }}>
                  <img
                    src={voucherBlobUrl}
                    alt="Voucher"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', color: '#ef4444' }}>
            <FaTimesCircle style={{ fontSize: '32px', marginBottom: '12px' }} />
            <span style={{ fontWeight: '700' }}>No se pudieron obtener los detalles de la orden de pago.</span>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminPagos;
