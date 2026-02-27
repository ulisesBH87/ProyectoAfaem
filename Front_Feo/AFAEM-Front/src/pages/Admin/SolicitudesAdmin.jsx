import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../styles/dashboard.css';
import DashboardSidebar from '../../components/DashboardSidebar';
import DashboardHeader from '../../components/DashboardHeader';
import StatCard from '../../components/StatCard';
import DashboardTable from '../../components/DashboardTable';
import { getSolicitudes } from '../../services/solicitud';

export default function SolicitudesAdmin() {
  const navigate = useNavigate();
  const [solicitudes, setSolicitudes] = useState([]);
  const [userEmail, setUserEmail] = useState('');
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

        setUserEmail(email);
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

  const columns = [
    { 
      key: 'SolicitudId', 
      label: 'ID Solicitud',
      render: (value) => value || '-'
    },
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
            onClick={() => alert('Ver detalles: ID ' + row.SolicitudId)}
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
            onClick={() => alert('Aprobar: ID ' + row.SolicitudId)}
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
            onClick={() => alert('Rechazar: ID ' + row.SolicitudId)}
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
      <div className="dashboard-wrapper">
        <DashboardSidebar userEmail="" />
        <div className="dashboard-container">
          <DashboardHeader userEmail="" pageTitle="Cargando..." />
          <div className="dashboard-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
              <p style={{ marginTop: '10px', color: '#64748b' }}>Cargando solicitudes...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <DashboardSidebar userEmail={userEmail} />
      <div className="dashboard-container">
        <DashboardHeader userEmail={userEmail} pageTitle="Gestión de Solicitudes" />
        <div className="dashboard-main">
          <div className="dashboard-content">
            {error && (
              <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
                <span className="alert-icon">⚠️</span>
                <div className="alert-content">
                  <p className="alert-message">{error}</p>
                </div>
              </div>
            )}

            <div className="section-header" style={{ marginBottom: '30px' }}>
              <h2 className="section-title">Solicitudes de Registro</h2>
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

            <div className="card-grid">
              <StatCard
                icon="📋"
                title="Total de Solicitudes"
                value={stats.total.toString()}
              />
              <StatCard
                icon="⏳"
                title="Pendientes"
                value={stats.pendientes.toString()}
                iconType="warning"
              />
              <StatCard
                icon="✅"
                title="Aprobadas"
                value={stats.aprobadas.toString()}
                iconType="success"
              />
              <StatCard
                icon="❌"
                title="Rechazadas"
                value={stats.rechazadas.toString()}
                iconType="danger"
              />
            </div>

            <DashboardTable
              columns={columns}
              data={solicitudes}
              isLoading={loading}
              emptyMessage="No hay solicitudes registradas"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
