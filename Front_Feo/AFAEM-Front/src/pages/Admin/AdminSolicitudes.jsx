import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../styles/dashboard.css';
import DashboardTable from '../../components/DashboardTable';
import { getSolicitudes } from '../../services/solicitud';
import { getSolicitudDetalle, getSolicitudDocumentosMock, updateSolicitudEstatus } from '../../services/admin';
import Swal from 'sweetalert2';
import DetalleSolicitudModal from '../../components/Admin/DetalleSolicitudModal';
import { FaSearch, FaSyncAlt, FaSortAmountDown, FaSortAmountUp } from 'react-icons/fa';

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
  
  // Estado para el modal de revisión
  const [modalAbierto, setModalAbierto] = useState(false);
  const [datosRevision, setDatosRevision] = useState(null);
  const [cargandoRevision, setCargandoRevision] = useState(false);

  // Estados para filtros, búsqueda y paginación
  const [filtroEstatus, setFiltroEstatus] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  useEffect(() => {
    setCurrentPage(1);
  }, [filtroEstatus, searchTerm, sortOrder]);

  const filteredSolicitudes = React.useMemo(() => {
    let result = [...solicitudes];
    
    // Filtro por estatus
    if (filtroEstatus !== 'todos') {
      result = result.filter(s => s.EstatusValidacion === Number(filtroEstatus));
    }
    
    // Búsqueda
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      result = result.filter(s => 
        (s.Nombre && s.Nombre.toLowerCase().includes(query)) ||
        (s.PrimerApellido && s.PrimerApellido.toLowerCase().includes(query)) ||
        (s.Correo && s.Correo.toLowerCase().includes(query)) ||
        (s.Equipo && s.Equipo.toLowerCase().includes(query)) ||
        (s.SolicitudId && String(s.SolicitudId).includes(query))
      );
    }
    
    // Ordenamiento
    result.sort((a, b) => {
      if (sortOrder === 'asc') return a.SolicitudId - b.SolicitudId;
      return b.SolicitudId - a.SolicitudId;
    });
    
    return result;
  }, [solicitudes, filtroEstatus, searchTerm, sortOrder]);

  const paginatedSolicitudes = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSolicitudes.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSolicitudes, currentPage]);

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
        title: `Solicitud #${id}`,
        html: `
          <div style="text-align: left; font-size: 14px;">
            <div style="background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 12px;">
              <p style="margin-bottom: 8px; font-weight:700; color:#0b4ea6;">👤 Datos del Solicitante</p>
              <p style="margin-bottom: 6px;"><strong>Nombre:</strong> ${detalle.Nombre || ''} ${detalle.PrimerApellido || ''} ${detalle.SegundoApellido || ''}</p>
              <p style="margin-bottom: 6px;"><strong>Email:</strong> ${detalle.Email || 'N/A'}</p>
              <p style="margin-bottom: 6px;"><strong>CURP:</strong> <code>${detalle.CURP || 'N/A'}</code></p>
              <p style="margin-bottom: 6px;"><strong>Sexo:</strong> ${detalle.Sexo || 'N/A'}</p>
              <p style="margin-bottom: 0;"><strong>Fecha Nacimiento:</strong> ${detalle.FechaNacimiento ? new Date(detalle.FechaNacimiento).toLocaleDateString('es-MX') : 'N/A'}</p>
            </div>
            <div style="background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0;">
              <p style="margin-bottom: 8px; font-weight:700; color:#0b4ea6;">📋 Datos de la Solicitud</p>
              <p style="margin-bottom: 6px;"><strong>Tipo:</strong> ${detalle.TipoSolicitud || 'N/A'}</p>
              <p style="margin-bottom: 6px;"><strong>Estatus:</strong> ${detalle.EstatusSolicitud || 'N/A'}</p>
              <p style="margin-bottom: 0;"><strong>Fecha:</strong> ${detalle.FechaSolicitud ? new Date(detalle.FechaSolicitud).toLocaleString('es-MX') : 'Sin fecha'}</p>
            </div>
          </div>
        `,
        confirmButtonText: 'Cerrar',
        confirmButtonColor: '#0b4ea6',
        width: '550px'
      });
    } catch (error) {
      console.warn('⚠️ Error cargando detalle:', error);
      const row = solicitudes.find(s => s.SolicitudId === id) || {};
      
      Swal.fire({
        title: `Solicitud #${id}`,
        html: `
          <div style="text-align: left; font-size: 13px;">
            <p><strong>Nombre:</strong> ${row.Nombre || ''} ${row.PrimerApellido || ''}</p>
            <p><strong>Correo:</strong> ${row.Correo || 'N/A'}</p>
            <p><strong>Equipo:</strong> ${row.Equipo || 'N/A'}</p>
            <p><strong>Monto:</strong> ${row.Monto ? `$${parseFloat(row.Monto).toLocaleString('es-MX', {minimumFractionDigits: 2})}` : 'N/A'}</p>
          </div>
        `,
        confirmButtonText: 'Cerrar',
        confirmButtonColor: '#0b4ea6'
      });
    }
  };

  const handleRevisarDocumentos = async (id) => {
    try {
      setCargandoRevision(true);
      setModalAbierto(true);
      const docs = await getSolicitudDocumentosMock(id);
      setDatosRevision(docs);
    } catch (error) {
      Swal.fire('Error', 'No se pudieron cargar los documentos para revisión.', 'error');
      setModalAbierto(false);
    } finally {
      setCargandoRevision(false);
    }
  };


  const handleAprobarSolicitud = async (id) => {
    const { isConfirmed } = await Swal.fire({
      title: '¿Aprobar solicitud?',
      text: "El presidente de equipo tendrá acceso completo al dashboard a partir de ahora.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar equipo',
      cancelButtonColor: '#94a3b8',
      confirmButtonColor: '#0b4ea6'
    });

    if (isConfirmed) {
      try {
        setLoading(true);
        await updateSolicitudEstatus(id, 1); // 1 = Aprobado / Acceso
        setModalAbierto(false);
        Swal.fire('¡Éxito!', 'La solicitud ha sido aprobada correctamente.', 'success');
        // Recargar la lista
        window.location.reload();
      } catch (error) {
        Swal.fire('Error', 'No se pudo actualizar el estatus de la solicitud.', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRechazarSolicitud = async (id) => {
    const { value: motivo } = await Swal.fire({
      title: 'Rechazar Solicitud',
      input: 'textarea',
      inputLabel: 'Motivo del rechazo',
      inputPlaceholder: 'Escribe aquí por qué se rechaza la solicitud...',
      inputAttributes: {
        'aria-label': 'Escribe aquí el motivo del rechazo'
      },
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#dc3545',
    });

    if (motivo) {
      try {
        setLoading(true);
        await updateSolicitudEstatus(id, 0); // 0 = Rechazado
        setModalAbierto(false);
        Swal.fire('Rechazada', 'La solicitud ha sido rechazada y se ha notificado al presidente.', 'info');
        window.location.reload();
      } catch (error) {
        Swal.fire('Error', 'No se pudo actualizar el estatus de la solicitud.', 'error');
      } finally {
        setLoading(false);
      }
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
      key: 'SolicitudId', 
      label: 'ID Solicitud',
      render: (value, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>#{value || '-'}</span>
          {row.esMock && <span style={{ fontSize: '9px', padding: '2px 6px', background: '#e2e8f0', borderRadius: '4px', color: '#475569', fontWeight: '800' }}>MOCK</span>}
        </div>
      )
    },
    { 
      key: 'Equipo', 
      label: 'Equipo / Usuario',
      render: (value, row) => (
        <div>
          <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{value || row.TipoSolicitud || 'Usuario Registrado'}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{row.Correo || `ID Usuario: ${row.UsuarioId}`}</div>
        </div>
      )
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
      key: 'Monto', 
      label: 'Monto',
      render: (value) => value ? (
        <span style={{ fontWeight: '700', color: 'var(--primary)' }}>
          ${parseFloat(value).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </span>
      ) : '-'
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
        } else if (estatus === 4) {
          badgeClass = 'badge-info';
          label = 'Revisión Docs';
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
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
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
          {row.EstatusValidacion === 4 && (
            <button 
              onClick={() => handleRevisarDocumentos(row.SolicitudId)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600'
              }}
            >
              📄 Docs
            </button>
          )}
          <button 
            onClick={() => handleAprobarSolicitud(row.SolicitudId)}
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
            onClick={() => handleRechazarSolicitud(row.SolicitudId)}
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


  // Verificar si hay datos mock
  const tieneMock = solicitudes.some(s => s.esMock);
  const errorServidor = solicitudes.find(s => s.errorServidor)?.errorServidor;

  return (
    <div className="dashboard-content">
      {tieneMock && (
        <div style={{ 
          background: '#fffbeb', 
          border: '1px solid #fde68a', 
          padding: '16px 20px', 
          borderRadius: '12px', 
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          color: '#92400e',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '24px' }}>⚠️</div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '15px' }}>Modo de Simulación Activo (Fallo en Servidor)</div>
              <div style={{ fontSize: '13px', opacity: 0.9 }}>
                No pudimos conectar con los datos reales. Se cargaron datos de prueba para que sigas trabajando.
              </div>
            </div>
          </div>
          {errorServidor && (
            <div style={{ 
              marginTop: '10px', 
              padding: '10px', 
              background: 'rgba(0,0,0,0.05)', 
              borderRadius: '6px',
              fontFamily: 'monospace',
              fontSize: '11px',
              border: '1px dashed #d97706'
            }}>
              <strong>Error Técnico:</strong> {errorServidor}
            </div>
          )}
        </div>
      )}
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

      <div className="card" style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>Lista de Solicitudes</h3>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <FaSearch style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" placeholder="Buscar solicitud..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="form-input" style={{ paddingLeft: '40px', width: '240px' }} />
            </div>

            <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} style={{ background: 'white', border: '1.5px solid var(--border-light)', padding: '10px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {sortOrder === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />} {sortOrder === 'asc' ? 'ASC' : 'DESC'}
            </button>

            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-main)', padding: '4px', borderRadius: '12px', border: '1.5px solid var(--border-light)' }}>
              {['todos', '2', '4', '1', '0'].map((val) => (
                <button key={val} onClick={() => setFiltroEstatus(val)} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: filtroEstatus === val ? 'white' : 'transparent', color: filtroEstatus === val ? 'var(--primary)' : 'var(--text-muted)', boxShadow: filtroEstatus === val ? 'var(--shadow-sm)' : 'none', fontSize: '11px', fontWeight: '700' }}>
                  {val === 'todos' ? 'TODAS' : (val === '2' ? 'PENDIENTES' : (val === '4' ? 'DOCS' : (val === '1' ? 'APROBADAS' : 'RECHAZADAS')))}
                </button>
              ))}
            </div>

            <button onClick={() => window.location.reload()} className="btn-premium" style={{ padding: '10px 16px', fontSize: '12px' }}>
              <FaSyncAlt />
            </button>
          </div>
        </div>

        <DashboardTable
          columns={columns}
          data={paginatedSolicitudes}
          isLoading={loading}
          totalItems={filteredSolicitudes.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          emptyMessage="No hay solicitudes que coincidan con la búsqueda."
        />
      </div>

      <DetalleSolicitudModal 
        estaAbierto={modalAbierto}
        alCerrar={() => setModalAbierto(false)}
        datos={datosRevision}
        alAprobar={handleAprobarSolicitud}
        alRechazar={handleRechazarSolicitud}
        cargando={cargandoRevision}
      />
    </div>
  );
}
