import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../styles/dashboard.css';
import DashboardTable from '../../components/DashboardTable';
import { getSolicitudes } from '../../services/solicitud';
import { getSolicitudDetalle } from '../../services/admin';
import { getSolicitudDetalle } from '../../services/admin';
import Swal from 'sweetalert2';

export default function AdminSolicitudes() {
  const navigate = useNavigate();
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    pendientes: 0,
    aprobadas: 0,
    rechazadas: 0
  });

  useEffect(() => {
    const loadSolicitudes = async () => {
      try {
        const email = localStorage.getItem('email');
        const token = localStorage.getItem('token');

        console.log('📋 Cargando solicitudes...');
        console.log('✅ Email:', email);
        console.log('✅ Token existe:', !!token);

        if (!email) {
          console.warn('❌ No hay email en localStorage');
          setError('No se encontró email. Por favor inicia sesión.');
          setTimeout(() => navigate('/ingresar'), 2000);
          return;
        }

        // VERIFICAR QUE HAY TOKEN
        if (!token) {
          console.warn('❌ No hay token en localStorage');
          setError('Sesión expirada. Por favor inicia sesión de nuevo.');
          setTimeout(() => navigate('/ingresar'), 2000);
          return;
        }

        setLoading(true);

        console.log('🚀 Haciendo petición a /solicitud/solicitudes-usuarios...');
        
        // Obtener solicitudes del servidor
        const response = await getSolicitudes();
        console.log('✅ Respuesta de solicitudes:', response);

        // Manejar diferentes estructuras de respuesta
        let solicitudesList = [];
        if (Array.isArray(response)) {
          solicitudesList = response;
        } else if (response?.solicitudes && Array.isArray(response.solicitudes)) {
          solicitudesList = response.solicitudes;
        } else if (response?.data && Array.isArray(response.data)) {
          solicitudesList = response.data;
        }

        // Log para verificar estructura de datos
        console.log('📊 Estructura de primer solicitud:', solicitudesList[0]);
        const primerasSolicitud = solicitudesList[0];
        const claves = Object.keys(primerasSolicitud || {});
        console.log('📊 Todas las claves disponibles:', claves);

        // Usar los datos tal como vienen del backend
        setSolicitudes(solicitudesList);

        // Calcular estadísticas basadas en EstatusValidacion
        setStats({
          total: solicitudesList.length,
          pendientes: solicitudesList.filter(s => s.EstatusValidacion === 2).length,
          aprobadas: solicitudesList.filter(s => s.EstatusValidacion === 1).length,
          rechazadas: solicitudesList.filter(s => s.EstatusValidacion === 0).length
        });
        
        console.log('✅ Solicitudes cargadas:', solicitudesList.length);
        setError(null);
      } catch (err) {
        console.error('❌ Error cargando solicitudes:', err);
        console.error('Response status:', err.response?.status);
        console.error('Response data:', err.response?.data);
        
        // Verificar si es error de autenticación
        if (err.response?.status === 401) {
          console.warn('⚠️ Error 401: Token no válido o expirado');
          setError('Token no válido. Por favor inicia sesión nuevamente.');
          localStorage.removeItem('token');
          localStorage.removeItem('UsuarioId');
          setTimeout(() => {
            navigate('/ingresar');
          }, 3000);
        } else if (err.response?.status === 403) {
          console.warn('⚠️ Error 403: No tienes permisos para acceder a esto');
          setError('No tienes permisos para acceder a las solicitudes.');
        } else {
          setError(`Error al cargar solicitudes: ${err.response?.data?.detail || err.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    loadSolicitudes();
  }, [navigate]);

  const handleVerDetalles = async (id) => {
    try {
      Swal.fire({
        title: 'Cargando detalles...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const detalle = await getSolicitudDetalle(id);
      
      Swal.fire({
        title: `Vista Rápida: Solicitud #${id}`,
        html: `
          <div style="text-align: left; font-size: 14px; background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0;">
            <p style="margin-bottom: 8px;"><strong>📋 Tipo:</strong> ${detalle.TipoSolicitud || 'N/A'}</p>
            <p style="margin-bottom: 8px;"><strong>🔔 Estatus:</strong> ${detalle.EstatusSolicitud || 'N/A'}</p>
            <p style="margin-bottom: 8px;"><strong>📅 Fecha:</strong> ${new Date(detalle.FechaSolicitud).toLocaleString()}</p>
            <p style="margin-bottom: 8px;"><strong>👤 Usuario:</strong> ${detalle.Nombre} ${detalle.PrimerApellido}</p>
            <p style="margin-bottom: 0;"><strong>🆔 CURP:</strong> ${detalle.CURP}</p>
          </div>
        `,
        confirmButtonText: 'Cerrar',
        confirmButtonColor: '#0b4ea6'
      });
    } catch (error) {
      console.warn('⚠️ Fallback a vista limitada por error de backend:', error);
      // Obtener datos básicos de la fila si están disponibles (pasados por parámetro o buscados)
      const row = solicitudes.find(s => s.SolicitudId === id) || {};
      
      Swal.fire({
        title: `Solicitud #${id} (Vista Limitada)`,
        html: `
          <div style="text-align: left; font-size: 13px;">
            <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 10px; border-radius: 6px; margin-bottom: 15px; color: #92400e;">
               ⚠️ Los detalles completos (nombre, CURP) no están disponibles porque el Backend devolvió un error de esquema.
            </div>
            <p><strong>ID Usuario:</strong> ${row.UsuarioId || 'N/A'}</p>
            <p><strong>Fecha:</strong> ${row.FechaSolicitud ? new Date(row.FechaSolicitud).toLocaleString() : 'N/A'}</p>
            <p><strong>Estado ID:</strong> ${row.EstatusValidacion !== undefined ? row.EstatusValidacion : 'N/A'}</p>
          </div>
        `,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#0b4ea6'
      });
    }
  };

  const handleUpdateStatus = (id, label) => {
    Swal.fire({
      title: `${label} Solicitud`,
      text: `La funcionalidad para ${label.toLowerCase()} solicitudes requiere un nuevo endpoint en el Backend que aún no está disponible.`,
      icon: 'info',
      confirmButtonText: 'Aceptar',
      footer: '<small style="color: #64748b">Nota para el equipo: Falta implementar POST /solicitud/estatus</small>'
    });
  };

  const columns = [
    { 
      key: 'UsuarioId', 
      label: 'ID Usuario',
      render: (value) => value || '-'
    },
    { 
      key: 'FechaSolicitud', 
      label: 'Fecha de Solicitud',
      render: (fecha) => {
        if (!fecha) return '-';
        try {
          const date = new Date(fecha);
          return date.toLocaleDateString('es-MX', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        } catch {
          return fecha;
        }
      }
    },
    { 
      key: 'TipoSolicitud', 
      label: 'Tipo de Solicitud',
      render: (value) => value || '-'
    },
    { 
      key: 'EstatusValidacion', 
      label: 'Estado',
      render: (estatus) => {
        let badgeClass = 'badge-warning';
        let label = 'Pendiente';

        if (estatus === 1) {
          badgeClass = 'badge-success';
          label = 'Aprobado';
        } else if (estatus === 0) {
          badgeClass = 'badge-danger';
          label = 'Rechazado';
        } else if (estatus === 2) {
          badgeClass = 'badge-warning';
          label = 'Pendiente';
        }

        return (
          <span className={`badge ${badgeClass}`}>
            {label}
          </span>
        );
      }
    },
    { 
      key: 'acciones',
      label: 'Acciones',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => handleVerDetalles(row.SolicitudId)}
            style={{
              padding: '6px 12px',
              backgroundColor: '#0b4ea6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            Ver
          </button>
          <button 
            onClick={() => handleUpdateStatus(row.SolicitudId, 'Aprobar')}
            style={{
              padding: '6px 12px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            Aprobar
          </button>
          <button 
            onClick={() => handleUpdateStatus(row.SolicitudId, 'Rechazar')}
            style={{
              padding: '6px 12px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            Rechazar
          </button>
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p style={{ marginTop: '10px', color: '#64748b' }}>Cargando solicitudes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
          <span className="alert-icon">⚠️</span>
          <div className="alert-content">
            <p className="alert-message">{error}</p>
          </div>
        </div>
      )}

      <div className="section-header" style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="section-title" style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Solicitudes de Registro</h2>
        <div className="section-actions">
          <button 
            className="btn btn-primary"
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#0b4ea6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            🔄 Actualizar
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '5px' }}>📋</div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>TOTAL</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>{stats.total}</div>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '5px' }}>⏳</div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>PENDIENTES</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#f59e0b' }}>{stats.pendientes}</div>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '5px' }}>✅</div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>APROBADAS</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#10b981' }}>{stats.aprobadas}</div>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '5px' }}>❌</div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>RECHAZADAS</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#ef4444' }}>{stats.rechazadas}</div>
        </div>
      </div>

      <DashboardTable
        columns={columns}
        data={solicitudes}
        isLoading={loading}
        emptyMessage="No hay solicitudes registradas"
      />
    </div>
  );
}
