import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/Admin/AdminLayout';
import DashboardTable from '../../components/DashboardTable';
import { getPagosGenerales, updateEstatusPago } from '../../services/admin';
import Swal from 'sweetalert2';

const AdminPagos = () => {
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);

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
      title: `¿${label} Pago?`,
      text: `Estás a punto de ${label.toLowerCase()} esta orden de pago.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Sí, ${label.toLowerCase()}`,
      confirmButtonColor: estatus === 1 ? '#10b981' : '#ef4444'
    });

    if (result.isConfirmed) {
      try {
        await updateEstatusPago(id, estatus);
        Swal.fire('¡Éxito!', `Pago ${label.toLowerCase()} correctamente.`, 'success');
        fetchPagos();
      } catch (error) {
        Swal.fire('Error', 'No se pudo actualizar el estatus del pago.', 'error');
      }
    }
  };

  const columns = [
    { key: 'OrdenPagoId', label: 'ID Orden' },
    { key: 'UsuarioId', label: 'ID Usuario' },
    { 
      key: 'MontoTotal', 
      label: 'Monto',
      render: (val) => `$${parseFloat(val).toLocaleString()}`
    },
    { 
      key: 'EstatusValidacion', 
      label: 'Estatus',
      render: (val) => {
        const labels = { 2: 'Pendiente', 1: 'Aprobado', 0: 'Rechazado' };
        const colors = { 2: '#f59e0b', 1: '#10b981', 0: '#ef4444' };
        return (
          <span style={{ 
            padding: '4px 10px', 
            borderRadius: '20px', 
            background: `${colors[val]}20`, 
            color: colors[val],
            fontSize: '12px',
            fontWeight: '700'
          }}>
            {labels[val] || 'Desconocido'}
          </span>
        );
      }
    },
    {
      key: 'Acciones',
      label: 'Acciones',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '10px' }}>
          {row.EstatusValidacion === 2 && (
            <>
              <button 
                onClick={() => handleUpdateEstatus(row.OrdenPagoId, 1, 'Aprobar')}
                style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
              >
                Aprobar
              </button>
              <button 
                onClick={() => handleUpdateEstatus(row.OrdenPagoId, 0, 'Rechazar')}
                style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
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
    <AdminLayout title="Validación de Pagos">
      <div style={{ background: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Órdenes de Pago Generales</h3>
          <button 
             onClick={fetchPagos}
             style={{ background: '#f1f5f9', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
          >
            🔄 Actualizar
          </button>
        </div>
        <DashboardTable 
          columns={columns} 
          data={pagos} 
          isLoading={loading}
          emptyMessage="No hay órdenes de pago registradas"
        />
      </div>
    </AdminLayout>
  );
};

export default AdminPagos;
