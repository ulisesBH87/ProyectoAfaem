import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../styles/dashboard.css';
import DashboardTable from '../../components/DashboardTable';
import { getSolicitudes } from '../../services/solicitud';
import { getSolicitudDetalle, getSolicitudDocumentos, updateSolicitudEstatus } from '../../services/admin';
import Swal from 'sweetalert2';
import DetalleSolicitudModal from '../../components/Admin/DetalleSolicitudModal';
import SearchBar from '../../components/Common/SearchBar';
import { FaSearch, FaSyncAlt, FaSortAmountDown, FaSortAmountUp } from 'react-icons/fa';
import Loader from '../../components/Loader';

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
  const [filtroEstatus, setFiltroEstatus] = useState('1'); // Pendientes por defecto
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadSolicitudes = async (forceRefresh = false) => {
    try {
      const email = localStorage.getItem('email');
      const token = localStorage.getItem('token');

      if (!email || !token) {
        setError('Sesión expirada. Por favor inicia sesión.');
        setTimeout(() => navigate('/ingresar'), 2000);
        return;
      }

      setLoading(true);

      const response = await getSolicitudes(forceRefresh);

      // Manejar diferentes estructuras de respuesta
      let solicitudesList = [];
      if (Array.isArray(response)) {
        solicitudesList = response;
      } else if (response?.solicitudes && Array.isArray(response.solicitudes)) {
        solicitudesList = response.solicitudes;
      } else if (response?.data && Array.isArray(response.data)) {
        solicitudesList = response.data;
      }

      setSolicitudes(solicitudesList);

      // Calcular estadísticas basadas en EstatusValidacion
      // IDs del Backend: 1=Pendiente (Espera), 2=Aprobado (Aceptado), 3=Rechazado
      setStats({
        total: solicitudesList.length,
        pendientes: solicitudesList.filter(s => s.EstatusValidacion === 1).length,
        aprobadas: solicitudesList.filter(s => s.EstatusValidacion === 2).length,
        rechazadas: solicitudesList.filter(s => s.EstatusValidacion === 3).length
      });
      
      setError(null);
    } catch (err) {
      console.error('Error cargando solicitudes:', err);
      if (err.response?.status === 401) {
        setError('Token no válido. Por favor inicia sesión nuevamente.');
        setTimeout(() => navigate('/ingresar'), 3000);
      } else {
        setError(`Error al cargar solicitudes: ${err.response?.data?.detail || err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
              <p style="margin-bottom: 8px; font-weight:700; color:#0b4ea6;">Datos del Solicitante</p>
              <p style="margin-bottom: 6px;"><strong>Nombre:</strong> ${detalle.Nombre || ''} ${detalle.PrimerApellido || ''} ${detalle.SegundoApellido || ''}</p>
              <p style="margin-bottom: 6px;"><strong>Email:</strong> ${detalle.Email || 'N/A'}</p>
              <p style="margin-bottom: 6px;"><strong>CURP:</strong> <code>${detalle.CURP || 'N/A'}</code></p>
              <p style="margin-bottom: 6px;"><strong>Sexo:</strong> ${detalle.Sexo || 'N/A'}</p>
              <p style="margin-bottom: 0;"><strong>Fecha Nacimiento:</strong> ${detalle.FechaNacimiento ? new Date(detalle.FechaNacimiento).toLocaleDateString('es-MX') : 'N/A'}</p>
            </div>
            <div style="background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0;">
              <p style="margin-bottom: 8px; font-weight:700; color:#0b4ea6;">Datos de la Solicitud</p>
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
            <!--<p><strong>Monto:</strong> ${row.Monto ? `$${parseFloat(row.Monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : 'N/A'}</p>-->
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
      const docs = await getSolicitudDocumentos(id);
      setDatosRevision(docs);
    } catch (error) {
      Swal.fire('Error', 'No se pudieron cargar los documentos para revisión.', 'error');
      setModalAbierto(false);
    } finally {
      setCargandoRevision(false);
    }
  };


  const handleAprobarSolicitud = async (id, reporteValidacion = null) => {
    // Si hay reporte, verificamos si hay algún rechazo
    const tieneRechazos = reporteValidacion && Object.values(reporteValidacion).some(v => v.estado === 'rechazado');

    const { isConfirmed } = await Swal.fire({
      title: tieneRechazos ? 'Solicitud con Observaciones' : 'Aprobar solicitud',
      text: tieneRechazos
        ? "Has rechazado algunos documentos. La solicitud se marcará como 'Revisada con Observaciones' y el usuario deberá corregirlos."
        : "Al aprobar, el usuario recibirá acceso completo a su dashboard de AFAEM.",
      icon: tieneRechazos ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonText: tieneRechazos ? 'Enviar observaciones' : 'Sí, aprobar',
      cancelButtonText: 'Volver',
      cancelButtonColor: '#94a3b8',
      confirmButtonColor: tieneRechazos ? '#f59e0b' : '#10b981'
    });

    if (isConfirmed) {
      try {
        setLoading(true);

        // El estatus final dependerá de si hubo rechazos
        // 2 = Aprobado total, 4 = Revisado con observaciones (Docs pendientes)
        const estatusFinal = tieneRechazos ? 4 : 2;

        await updateSolicitudEstatus(id, estatusFinal, JSON.stringify(reporteValidacion));

        setModalAbierto(false);
        Swal.fire({
          title: '¡Éxito!',
          text: tieneRechazos ? 'Se han enviado las observaciones al usuario.' : 'La solicitud ha sido aprobada correctamente.',
          icon: 'success'
        }).then(() => {
          loadSolicitudes(); // Recargar datos sin refrescar toda la página
        });
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
      inputValidator: (value) => {
        if (!value || value.trim() === '') {
          return '¡Debes ingresar un motivo para rechazar la solicitud!';
        }
      },
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#dc3545',
    
      // NUEVO
      inputValidator: (value) => {
          if (!value || !value.trim()) {
            return 'Debes escribir un motivo de rechazo';
          }
        }
    });

    if (motivo?.trim()) {
      try {
        setLoading(true);
        await updateSolicitudEstatus(id, 3, motivo); // 3 = Rechazado (Backend Sync)
        setModalAbierto(false);
        Swal.fire('Rechazada', 'La solicitud ha sido rechazada y se ha notificado al presidente.', 'info');
        loadSolicitudes(); // Recargar datos localmente
      } catch (error) {
        Swal.fire('Error', 'No se pudo actualizar el estatus de la solicitud.', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCambiarEstatusTerminal = async (id, estatusActual) => {
    const esAprobado = estatusActual === 2;
    const mensaje = esAprobado 
      ? "¿Estás a punto de rechazar una solicitud que ya ha sido aceptada, estás seguro?"
      : "¿Estás a punto de aceptar una solicitud que ya ha sido rechazada, estás seguro?";
    
    const { isConfirmed } = await Swal.fire({
      title: 'Cambiar Estado',
      text: mensaje,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, continuar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: esAprobado ? '#ef4444' : '#10b981',
      cancelButtonColor: '#94a3b8'
    });

    if (isConfirmed) {
      if (esAprobado) {
        handleRechazarSolicitud(id);
      } else {
        handleAprobarSolicitud(id);
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
      width: '10%',
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
      width: '25%',
      render: (value, row) => (
        <div>
          <div style={{ fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {value || row.TipoSolicitud || 'Usuario Registrado'}
            {row.TipoAfiliacion === 2 && (
              <span style={{
                fontSize: '10px',
                backgroundColor: '#eff6ff',
                color: '#1e40af',
                padding: '2px 8px',
                borderRadius: '12px',
                border: '1px solid #bfdbfe',
                fontWeight: '800'
              }}>
                PRESIDENTE
              </span>
            )}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{row.Correo || `ID Usuario: ${row.UsuarioId}`}</div>
        </div>
      )
    },
    {
      key: 'FechaSolicitud',
      label: 'Fecha de Solicitud',
      width: '15%',
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
      width: '15%',
      render: (estatus) => {
        let badgeClass = 'badge-warning';
        let label = 'Pendiente';

        if (estatus === 2) {
          badgeClass = 'badge-success';
          label = 'Aprobado';
        } else if (estatus === 3) {
          badgeClass = 'badge-danger';
          label = 'Rechazado';
        } else if (estatus === 1) {
          badgeClass = 'badge-warning';
          label = 'Pendiente';
        } else if (estatus === 4) {
          badgeClass = 'badge-primary';
          label = 'Borrador';
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
      width: '25%',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleVerDetalles(row.SolicitudId)}
            style={{
              padding: '7px 14px', background: '#3b82f6', color: 'white',
              border: 'none', borderRadius: '8px', cursor: 'pointer',
              fontSize: '12px', fontWeight: '700'
            }}
          >
            Ver
          </button>
          {(row.EstatusValidacion === 2 || row.EstatusValidacion === 4 || row.EstatusValidacion === 1 || row.EstatusValidacion === 3) && (
            <button
              onClick={() => handleRevisarDocumentos(row.SolicitudId)}
              style={{
                padding: '7px 14px', background: '#6366f1', color: 'white',
                border: 'none', borderRadius: '8px', cursor: 'pointer',
                fontSize: '12px', fontWeight: '700'
              }}
            >
              Docs
            </button>
          )}
          
          {((filtroEstatus === '2' || filtroEstatus === '3') && (row.EstatusValidacion === 2 || row.EstatusValidacion === 3)) ? (
            <button
              onClick={() => handleCambiarEstatusTerminal(row.SolicitudId, row.EstatusValidacion)}
              style={{
                padding: '7px 14px', background: '#f59e0b', color: 'white',
                border: 'none', borderRadius: '8px', cursor: 'pointer',
                fontSize: '12px', fontWeight: '700'
              }}
            >
              Editar
            </button>
          ) : (
            <>
              <button
                onClick={() => handleAprobarSolicitud(row.SolicitudId)}
                style={{
                  padding: '7px 14px', background: '#10b981', color: 'white',
                  border: 'none', borderRadius: '8px', cursor: 'pointer',
                  fontSize: '12px', fontWeight: '700'
                }}
              >
                Aprobar
              </button>
              <button
                onClick={() => handleRechazarSolicitud(row.SolicitudId)}
                style={{
                  padding: '7px 14px', background: '#ef4444', color: 'white',
                  border: 'none', borderRadius: '8px', cursor: 'pointer',
                  fontSize: '12px', fontWeight: '700'
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


  if (loading) {
    return <Loader text="Cargando solicitudes..." />;
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
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Validación de Solicitudes</h2>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b' }}>Revisa y aprueba las solicitudes de registro de presidente de equipo entrantes.</p>
        </div>
        <button
          onClick={() => loadSolicitudes(true)}
          title="Actualizar"
          style={{
            padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px',
            background: 'white', color: '#334155',
            border: '1.5px solid #e2e8f0', borderRadius: '12px',
            cursor: 'pointer', fontWeight: '700', fontSize: '14px'
          }}
        >
          <FaSyncAlt />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        {/* TARJETA PENDIENTES — Primero */}
        <div
          onClick={() => setFiltroEstatus('1')}
          style={{
            background: 'white', padding: '20px', borderRadius: '12px',
            border: filtroEstatus === '1' ? '2px solid #f59e0b' : '1px solid #e2e8f0',
            textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease',
            boxShadow: filtroEstatus === '1' ? '0 4px 12px rgba(245, 158, 11, 0.15)' : 'none',
            transform: filtroEstatus === '1' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '5px' }}>⏳</div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>PENDIENTES</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#f59e0b' }}>{stats.pendientes}</div>
        </div>

        {/* TARJETA TOTAL */}
        <div
          onClick={() => setFiltroEstatus('todos')}
          style={{
            background: 'white', padding: '20px', borderRadius: '12px',
            border: filtroEstatus === 'todos' ? '2px solid #0b4ea6' : '1px solid #e2e8f0',
            textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease',
            boxShadow: filtroEstatus === 'todos' ? '0 4px 12px rgba(11, 78, 166, 0.15)' : 'none',
            transform: filtroEstatus === 'todos' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '5px' }}>📋</div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>TOTAL</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>{stats.total}</div>
        </div>

        {/* TARJETA APROBADAS */}
        <div
          onClick={() => setFiltroEstatus('2')}
          style={{
            background: 'white', padding: '20px', borderRadius: '12px',
            border: filtroEstatus === '2' ? '2px solid #10b981' : '1px solid #e2e8f0',
            textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease',
            boxShadow: filtroEstatus === '2' ? '0 4px 12px rgba(16, 185, 129, 0.15)' : 'none',
            transform: filtroEstatus === '2' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '5px' }}>✅</div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>APROBADAS</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#10b981' }}>{stats.aprobadas}</div>
        </div>

        {/* TARJETA RECHAZADAS */}
        <div
          onClick={() => setFiltroEstatus('3')}
          style={{
            background: 'white', padding: '20px', borderRadius: '12px',
            border: filtroEstatus === '3' ? '2px solid #ef4444' : '1px solid #e2e8f0',
            textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease',
            boxShadow: filtroEstatus === '3' ? '0 4px 12px rgba(239, 68, 68, 0.15)' : 'none',
            transform: filtroEstatus === '3' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '5px' }}>❌</div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>RECHAZADAS</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#ef4444' }}>{stats.rechazadas}</div>
        </div>
      </div>

      <div className="card" style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>Lista de solicitudes</h3>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <SearchBar
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar solicitud..."
              width="280px"
            />

            <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} style={{ background: 'white', border: '1.5px solid var(--border-light)', padding: '10px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {sortOrder === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />} {sortOrder === 'asc' ? 'ASC' : 'DESC'}
            </button>

            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-main)', padding: '4px', borderRadius: '12px', border: '1.5px solid var(--border-light)' }}>
              {['todos', '1', '4', '2', '3'].map((val) => (
                <button key={val} onClick={() => setFiltroEstatus(val)} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: filtroEstatus === val ? 'white' : 'transparent', color: filtroEstatus === val ? 'var(--primary)' : 'var(--text-muted)', boxShadow: filtroEstatus === val ? 'var(--shadow-sm)' : 'none', fontSize: '11px', fontWeight: '700' }}>
                  {val === 'todos' ? 'Todas' : (val === '1' ? 'Pendientes' : (val === '4' ? 'Docs' : (val === '2' ? 'Aprobadas' : 'Rechazadas')))}
                </button>
              ))}
            </div>

            <button onClick={() => loadSolicitudes(true)} className="btn-premium" style={{ padding: '10px 16px', fontSize: '12px' }}>
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
