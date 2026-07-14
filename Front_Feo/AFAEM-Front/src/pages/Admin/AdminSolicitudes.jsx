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
import AdminTabs from '../../components/Admin/AdminTabs';
import { FaSearch, FaSyncAlt, FaSortAmountDown, FaSortAmountUp, FaHourglassHalf, FaClipboardList, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import Loader from '../../components/Loader';
import COLORS from '../../styles/colors';

export default function AdminSolicitudes() {
  const navigate = useNavigate();
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
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

  const loadSolicitudes = async (forceRefresh = false, isTableOnly = false) => {
    try {
      const email = localStorage.getItem('email');
      const token = localStorage.getItem('token');

      if (!email || !token) {
        setError('Sesión expirada. Por favor inicia sesión.');
        setTimeout(() => navigate('/ingresar'), 2000);
        return;
      }

      if (isTableOnly) {
        setTableLoading(true);
      } else {
        setLoading(true);
      }

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
      setTableLoading(false);
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
            <div style="background: ${COLORS.slate50}; padding: 15px; border-radius: 10px; border: 1px solid ${COLORS.slate200}; margin-bottom: 12px;">
              <p style="margin-bottom: 8px; font-weight:700; color:${COLORS.primary};">Datos del Solicitante</p>
              <p style="margin-bottom: 6px;"><strong>Nombre:</strong> ${detalle.Nombre || ''} ${detalle.PrimerApellido || ''} ${detalle.SegundoApellido || ''}</p>
              <p style="margin-bottom: 6px;"><strong>Email:</strong> ${detalle.Email || 'N/A'}</p>
              <p style="margin-bottom: 6px;"><strong>CURP:</strong> <code>${detalle.CURP || 'N/A'}</code></p>
              <p style="margin-bottom: 6px;"><strong>Sexo:</strong> ${detalle.Sexo || 'N/A'}</p>
              <p style="margin-bottom: 0;"><strong>Fecha Nacimiento:</strong> ${detalle.FechaNacimiento ? new Date(detalle.FechaNacimiento).toLocaleDateString('es-MX') : 'N/A'}</p>
            </div>
            <div style="background: ${COLORS.slate50}; padding: 15px; border-radius: 10px; border: 1px solid ${COLORS.slate200};">
              <p style="margin-bottom: 8px; font-weight:700; color:${COLORS.primary};">Datos de la Solicitud</p>
              <p style="margin-bottom: 6px;"><strong>Tipo:</strong> ${detalle.TipoSolicitud || 'N/A'}</p>
              <p style="margin-bottom: 6px;"><strong>Estatus:</strong> ${detalle.EstatusSolicitud || 'N/A'}</p>
              <p style="margin-bottom: 0;"><strong>Fecha:</strong> ${detalle.FechaSolicitud ? new Date(detalle.FechaSolicitud).toLocaleString('es-MX') : 'Sin fecha'}</p>
            </div>
          </div>
        `,
        confirmButtonText: 'Cerrar',
        confirmButtonColor: COLORS.primary,
        width: '550px'
      });
    } catch (error) {
      console.warn('Error cargando detalle:', error);
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
        confirmButtonColor: COLORS.primary
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


  const handleGuardarProgreso = async (id, reporteValidacion) => {
    try {
      setLoading(true);
      await updateSolicitudEstatus(id, 1, JSON.stringify(reporteValidacion));
      setModalAbierto(false);
      Swal.fire({
        title: '¡Progreso guardado!',
        text: 'Se ha guardado el estado de los documentos.',
        icon: 'success'
      }).then(() => loadSolicitudes(true));
    } catch (error) {
      Swal.fire('Error', 'No se pudo guardar el progreso.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAprobarSolicitud = async (id, reporteValidacion = null, saltarConfirmacion = false) => {
    if (reporteValidacion && !saltarConfirmacion) {
      const tieneNoAprobados = Object.values(reporteValidacion).some(v => v.estado !== 'aprobado');

      if (tieneNoAprobados) {
        const result = await Swal.fire({
          title: 'Documentos pendientes / rechazados',
          text: 'Existen documentos que no han sido aprobados. ¿Deseas rechazar formalmente la solicitud para que el presidente pueda corregir sus archivos, o solo deseas guardar el progreso para continuar después?',
          icon: 'warning',
          showCancelButton: true,
          showDenyButton: true,
          confirmButtonText: 'Rechazar solicitud',
          denyButtonText: 'Guardar progreso',
          cancelButtonText: 'Seguir revisando',
          confirmButtonColor: COLORS.danger,
          denyButtonColor: COLORS.primary,
          cancelButtonColor: COLORS.slate400
        });

        if (result.isConfirmed) {
          const row = solicitudes.find(s => s.SolicitudId === id);
          const yaAprobado = row && Number(row.EstatusValidacion || row.estatusValidacion) === 2;

          if (yaAprobado) {
            const confirmRechazo = await Swal.fire({
              title: 'Confirmar acción',
              text: 'El presidente estaba aprobado, perderá acceso a su panel, ¿rechazar documentos?',
              icon: 'warning',
              showCancelButton: true,
              confirmButtonText: 'Sí, rechazar',
              cancelButtonText: 'Cancelar',
              confirmButtonColor: COLORS.danger,
              cancelButtonColor: COLORS.slate400
            });
            if (!confirmRechazo.isConfirmed) return;
          }

          try {
            setLoading(true);
            await updateSolicitudEstatus(id, 3, JSON.stringify(reporteValidacion));
            setModalAbierto(false);
            Swal.fire({
              title: 'Solicitud rechazada',
              text: 'La solicitud ha sido rechazada y se le ha notificado al presidente para que corrija sus documentos.',
              icon: 'info'
            }).then(() => loadSolicitudes(true));
          } catch (error) {
            Swal.fire('Error', 'No se pudo rechazar la solicitud.', 'error');
          } finally {
            setLoading(false);
          }
        } else if (result.isDenied) {
          await handleGuardarProgreso(id, reporteValidacion);
        }
        return;
      }
    }

    if (saltarConfirmacion) {
      try {
        setLoading(true);
        await updateSolicitudEstatus(id, 2, reporteValidacion ? JSON.stringify(reporteValidacion) : null);
        setModalAbierto(false);
        Swal.fire({
          title: '¡Éxito!',
          text: 'La solicitud ha sido aprobada correctamente.',
          icon: 'success'
        }).then(() => {
          loadSolicitudes(true);
        });
      } catch (error) {
        Swal.fire('Error', 'No se pudo actualizar el estatus de la solicitud.', 'error');
      } finally {
        setLoading(false);
      }
      return;
    }

    const { isConfirmed } = await Swal.fire({
      title: 'Aprobar solicitud',
      text: 'Al aprobar, el usuario recibirá acceso completo a su panel de AFAEM.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Volver',
      cancelButtonColor: COLORS.slate400,
      confirmButtonColor: COLORS.success
    });

    if (isConfirmed) {
      try {
        setLoading(true);
        await updateSolicitudEstatus(id, 2, reporteValidacion ? JSON.stringify(reporteValidacion) : null);
        setModalAbierto(false);
        Swal.fire({
          title: '¡Éxito!',
          text: 'La solicitud ha sido aprobada correctamente.',
          icon: 'success'
        }).then(() => {
          loadSolicitudes(true);
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
        if (!value || !value.trim()) {
          return '¡Debes ingresar un motivo para rechazar la solicitud!';
        }
      },
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Volver',
      confirmButtonColor: COLORS.dangerBootstrap
    });

    if (motivo?.trim()) {
      try {
        setLoading(true);
        await updateSolicitudEstatus(id, 3, motivo); // 3 = Rechazado (Backend Sync)
        setModalAbierto(false);
        Swal.fire('Rechazada', 'La solicitud ha sido rechazada y se ha notificado al presidente.', 'info')
          .then(() => {
            loadSolicitudes(true); // Recargar datos forzando petición fresca
          });
      } catch (error) {
        Swal.fire('Error', 'No se pudo actualizar el estatus de la solicitud.', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCambiarEstatusTerminal = async (id, estatusActual) => {
    const esAprobado = estatusActual === 2;
    const etiqueta = esAprobado ? 'aprobada' : 'rechazada';

    const { isConfirmed } = await Swal.fire({
      title: 'Re-verificar Solicitud',
      html: `
        <p style="margin:0; color:${COLORS.slate600}; font-size:14px;">
          Esta solicitud fue <strong>${etiqueta}</strong> previamente.<br/>
          Se abrirá el módulo de revisión para que puedas evaluarla nuevamente
          y decidir si <strong>aprobarla o rechazarla</strong>.
        </p>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Abrir revisión',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: COLORS.indigo,
      cancelButtonColor: COLORS.slate400
    });

    if (isConfirmed) {
      // Abre el modal de documentos — desde ahí el admin decide aprobar o rechazar
      handleRevisarDocumentos(id);
    }
  };

  const handleUpdateStatus = (id, label) => {
    Swal.fire({
      title: `${label} Solicitud`,
      text: `La funcionalidad para ${label.toLowerCase()} solicitudes requiere un nuevo endpoint en el Backend que aún no está disponible.`,
      icon: 'info',
      confirmButtonText: 'Aceptar',
      footer: '<small style=`color: ${COLORS.slate500}`>Nota para el equipo: Falta implementar POST /solicitud/estatus</small>'
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
          {row.esMock && <span style={{ fontSize: '9px', padding: '2px 6px', background: COLORS.slate200, borderRadius: '4px', color: COLORS.slate600, fontWeight: '800' }}>MOCK</span>}
        </div>
      )
    },
    {
      key: 'Equipo',
      label: 'Equipo / Usuario',
      width: '20%',
      render: (value, row) => (
        <div>
          <div style={{ fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {value || row.TipoSolicitud || 'Usuario Registrado'}
            {row.TipoAfiliacion === 2 && (
              <span style={{
                fontSize: '10px',
                backgroundColor: COLORS.secondaryBg,
                color: COLORS.secondaryHover,
                padding: '2px 8px',
                borderRadius: '12px',
                border: `1px solid ${COLORS.secondaryBgDark}`,
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
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap', minWidth: 'max-content' }}>
          <button
            onClick={() => handleVerDetalles(row.SolicitudId)}
            style={{
              padding: '7px 14px', background: COLORS.primary, color: 'white',
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
                padding: '7px 14px', background: COLORS.indigo, color: 'white',
                border: 'none', borderRadius: '8px', cursor: 'pointer',
                fontSize: '12px', fontWeight: '700'
              }}
            >
              Ver/rechazar documentos
            </button>
          )}

          {((filtroEstatus === '2' || filtroEstatus === '3') && (row.EstatusValidacion === 2 || row.EstatusValidacion === 3)) ? (
            <button
              onClick={() => handleCambiarEstatusTerminal(row.SolicitudId, row.EstatusValidacion)}
              style={{
                padding: '7px 14px', background: COLORS.warning, color: 'white',
                border: 'none', borderRadius: '8px', cursor: 'pointer',
                fontSize: '12px', fontWeight: '700'
              }}
            >
              Editar
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  if (row.EstatusValidacion !== 2) {
                    handleAprobarSolicitud(row.SolicitudId);
                  }
                }}
                disabled={row.EstatusValidacion === 2}
                style={{
                  padding: '7px 14px', background: COLORS.success, color: 'white',
                  border: 'none', borderRadius: '8px', cursor: row.EstatusValidacion === 2 ? 'not-allowed' : 'pointer',
                  fontSize: '12px', fontWeight: '700',
                  opacity: row.EstatusValidacion === 2 ? 0.5 : 1
                }}
              >
                Aprobar
              </button>
            </>
          )}
        </div>
      )
    }
  ];


  if (loading && solicitudes.length === 0) {
    return <Loader text="Cargando solicitudes..." />;
  }


  // Verificar si hay datos mock
  const tieneMock = solicitudes.some(s => s.esMock);
  const errorServidor = solicitudes.find(s => s.errorServidor)?.errorServidor;
  return (
    <div className="dashboard-content">
      {tieneMock && (
        <div style={{
          background: COLORS.warningBgLight,
          border: `1px solid ${COLORS.warningBgDark}`,
          padding: '16px 20px',
          borderRadius: '12px',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          color: COLORS.warningBrown,
          boxShadow: `0 2px 10px ${COLORS.shadow05}`
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
              background: COLORS.shadow05,
              borderRadius: '6px',
              fontFamily: 'monospace',
              fontSize: '11px',
              border: `1px dashed ${COLORS.warningDark}`
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

      <div className="fade-in-up" style={{ padding: '20px 0' }}>
        <AdminTabs />
        {/* HEADER SECTION */}
        <header className="admin-dashboard-header">
          <div>
            <h2 className="admin-dashboard-title">
              Validación de Solicitudes
            </h2>
            <p style={{ color: 'var(--text-muted)', fontWeight: '500', fontSize: '15px', margin: '6px 0 0' }}>
              Revisa y aprueba las solicitudes de registro de presidente de equipo
            </p>
          </div>
        </header>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          {/* TARJETA PENDIENTES — Primero */}
          <div
            onClick={() => setFiltroEstatus('1')}
            style={{
              background: 'white', padding: '20px', borderRadius: '12px',
              border: filtroEstatus === '1' ? `2px solid ${COLORS.warning}` : `1px solid ${COLORS.slate200}`,
              textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease',
              boxShadow: filtroEstatus === '1' ? `0 4px 12px ${COLORS.warningBgTranslucent}` : 'none',
              transform: filtroEstatus === '1' ? 'translateY(-2px)' : 'none'
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '5px', color: COLORS.warning }}><FaHourglassHalf /></div>
            <div style={{ fontSize: '12px', color: COLORS.slate500, fontWeight: '700' }}>PENDIENTES</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: COLORS.warning }}>{stats.pendientes}</div>
          </div>

          {/* TARJETA TOTAL */}
          <div
            onClick={() => setFiltroEstatus('todos')}
            style={{
              background: 'white', padding: '20px', borderRadius: '12px',
              border: filtroEstatus === 'todos' ? `2px solid ${COLORS.primary}` : `1px solid ${COLORS.slate200}`,
              textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease',
              boxShadow: filtroEstatus === 'todos' ? `0 4px 12px ${COLORS.primaryBgTranslucent}` : 'none',
              transform: filtroEstatus === 'todos' ? 'translateY(-2px)' : 'none'
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '5px', color: COLORS.primary }}><FaClipboardList /></div>
            <div style={{ fontSize: '12px', color: COLORS.slate500, fontWeight: '700' }}>TOTAL</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: COLORS.slate800 }}>{stats.total}</div>
          </div>

          {/* TARJETA APROBADAS */}
          <div
            onClick={() => setFiltroEstatus('2')}
            style={{
              background: 'white', padding: '20px', borderRadius: '12px',
              border: filtroEstatus === '2' ? `2px solid ${COLORS.success}` : `1px solid ${COLORS.slate200}`,
              textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease',
              boxShadow: filtroEstatus === '2' ? `0 4px 12px ${COLORS.successBgTranslucent}` : 'none',
              transform: filtroEstatus === '2' ? 'translateY(-2px)' : 'none'
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '5px', color: COLORS.success }}><FaCheckCircle /></div>
            <div style={{ fontSize: '12px', color: COLORS.slate500, fontWeight: '700' }}>APROBADAS</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: COLORS.success }}>{stats.aprobadas}</div>
          </div>

          {/* TARJETA RECHAZADAS */}
          <div
            onClick={() => setFiltroEstatus('3')}
            style={{
              background: 'white', padding: '20px', borderRadius: '12px',
              border: filtroEstatus === '3' ? `2px solid ${COLORS.danger}` : `1px solid ${COLORS.slate200}`,
              textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease',
              boxShadow: filtroEstatus === '3' ? `0 4px 12px ${COLORS.dangerBgTranslucent}` : 'none',
              transform: filtroEstatus === '3' ? 'translateY(-2px)' : 'none'
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '5px', color: COLORS.danger }}><FaTimesCircle /></div>
            <div style={{ fontSize: '12px', color: COLORS.slate500, fontWeight: '700' }}>RECHAZADAS</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: COLORS.danger }}>{stats.rechazadas}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '32px' }}>
          <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', overflow: 'hidden' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>Lista de solicitudes</h3>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', overflowX: 'auto', overflowY: 'hidden', maxWidth: '100%', scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}>
              <SearchBar
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar solicitud..."
                width="280px"
              />

              <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} style={{ background: 'white', border: '1.5px solid var(--border-light)', padding: '10px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.slate600 }}>
                {sortOrder === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />} {sortOrder === 'asc' ? 'ANT' : 'REC'}
              </button>

              <button onClick={() => loadSolicitudes(true, true)} className="btn-premium" style={{ padding: '10px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaSyncAlt style={{ animation: tableLoading ? 'spin 1s linear infinite' : 'none' }} />
              </button>

              <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-main)', padding: '5px', borderRadius: '14px', border: '1.5px solid var(--border-light)' }}>
                {['todos', '1', '4', '2', '3'].map((val) => (
                  <button key={val} onClick={() => setFiltroEstatus(val)} style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: filtroEstatus === val ? 'white' : 'transparent', color: filtroEstatus === val ? 'var(--primary)' : 'var(--text-muted)', boxShadow: filtroEstatus === val ? 'var(--shadow-sm)' : 'none', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>
                    {val === 'todos' ? 'Todas' : (val === '1' ? 'Pendientes' : (val === '4' ? 'Docs' : (val === '2' ? 'Aprobadas' : 'Rechazadas')))}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto', width: '100%' }}>
            <DashboardTable
              columns={columns}
              data={paginatedSolicitudes}
              isLoading={loading || tableLoading}
              totalItems={filteredSolicitudes.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              emptyMessage="No hay solicitudes que coincidan con la búsqueda."
            />
          </div>
        </div>

        <DetalleSolicitudModal
          estaAbierto={modalAbierto}
          alCerrar={() => setModalAbierto(false)}
          datos={datosRevision}
          alAprobar={handleAprobarSolicitud}
          alRechazar={handleRechazarSolicitud}
          alGuardarProgreso={handleGuardarProgreso}
          cargando={cargandoRevision}
        />
      </div>
    </div>
  );
}
