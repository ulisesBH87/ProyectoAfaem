import React, { useEffect, useState } from 'react';
import { FaUserCog, FaLock, FaBell, FaSave } from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../styles/dashboard.css';

// Componentes
import DashboardSidebar from '../../components/DashboardSidebar';
import DashboardHeader from '../../components/DashboardHeader';
import { EntradaFormulario, BotonPrimario, BotonSecundario, Alerta } from '../../components/partials';

export default function PresidenteEquipoConfiguracion() {
  const userEmail = localStorage.getItem('email');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

  // Datos del perfil
  const [perfil, setPerfil] = useState({
    nombre: 'Juan Entrenador',
    apellido: 'García López',
    email: userEmail,
    telefono: '+56 9 1234 5678',
    ciudad: 'Santiago',
    experiencia: '15 años',
    especializacion: 'Fútbol'
  });

  // Datos de seguridad
  const [seguridad, setSeguridad] = useState({
    contraseniaActual: '',
    contraseniaNueva: '',
    confirmarContrasenia: ''
  });

  // Notificaciones
  const [notificaciones, setNotificaciones] = useState({
    emailSolicitudes: true,
    emailReportes: true,
    emailCambios: false,
    emailNoticiasEquipo: true,
    notificacionesPush: true
  });

  // Configuración de equipo
  const [equipoConfig, setEquipoConfig] = useState({
    nombreEquipo: 'Equipo Ejemplo',
    ciudad: 'Santiago',
    aFundacion: 2015,
    descripcion: 'Descripción del equipo'
  });

  useEffect(() => {
    const cargarConfiguracion = async () => {
      try {
        setLoading(true);
        // Aquí iría la llamada a API para obtener configuración
        // const datos = await authService.obtenerConfiguracion();
        setError(null);
      } catch (err) {
        console.error('Error al cargar configuración:', err);
        setError('No se pudo cargar la configuración');
      } finally {
        setLoading(false);
      }
    };

    if (userEmail) {
      cargarConfiguracion();
    }
  }, [userEmail]);

  const manejarCambioPerfil = (campo, valor) => {
    setPerfil({ ...perfil, [campo]: valor });
  };

  const manejarCambioSeguridad = (campo, valor) => {
    setSeguridad({ ...seguridad, [campo]: valor });
  };

  const manejarCambioNotificaciones = (campo, valor) => {
    setNotificaciones({ ...notificaciones, [campo]: valor });
  };

  const manejarCambioEquipo = (campo, valor) => {
    setEquipoConfig({ ...equipoConfig, [campo]: valor });
  };

  const manejarGuardarPerfil = async () => {
    try {
      // Aquí iría la llamada a API para guardar cambios
      setExito('Perfil actualizado correctamente');
      setTimeout(() => setExito(null), 3000);
      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      setError('Error al guardar los cambios');
    }
  };

  const manejarCambiarContrasenia = async () => {
    if (seguridad.contraseniaNueva !== seguridad.confirmarContrasenia) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (seguridad.contraseniaNueva.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      // Aquí iría la llamada a API para cambiar contraseña
      setExito('Contraseña actualizada correctamente');
      setSeguridad({ contraseniaActual: '', contraseniaNueva: '', confirmarContrasenia: '' });
      setTimeout(() => setExito(null), 3000);
      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      setError('Error al cambiar la contraseña');
    }
  };

  const manejarGuardarNotificaciones = async () => {
    try {
      // Aquí iría la llamada a API para guardar preferencias
      setExito('Preferencias de notificaciones actualizado');
      setTimeout(() => setExito(null), 3000);
      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      setError('Error al guardar las preferencias');
    }
  };

  if (loading) {
    return (
      <div className="dashboard-wrapper">
        <DashboardSidebar userEmail={userEmail} />
        <div className="dashboard-container">
          <DashboardHeader userEmail={userEmail} pageTitle="Cargando..." />
          <div className="dashboard-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div>Cargando configuración...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <DashboardSidebar userEmail={userEmail} />
      
      <div className="dashboard-container">
        <DashboardHeader userEmail={userEmail} pageTitle="Configuración" />
        
        <div className="dashboard-main">
          <div className="dashboard-content">
            {error && (
              <Alerta
                tipo="error"
                mensaje={error}
                conCierre={true}
                alCerrar={() => setError(null)}
              />
            )}

            {exito && (
              <Alerta
                tipo="exito"
                mensaje={exito}
                conCierre={true}
                alCerrar={() => setExito(null)}
              />
            )}

            {/* SECCIÓN: PERFIL */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '20px',
                paddingBottom: '16px',
                borderBottom: '1px solid #e2e8f0'
              }}>
                <FaUserCog style={{ fontSize: '20px', color: '#0b4ea6', marginRight: '12px' }} />
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                  Información del Perfil
                </h3>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '16px'
              }}>
                <EntradaFormulario
                  etiqueta="Nombre"
                  tipo="text"
                  valor={perfil.nombre}
                  alCambiar={(e) => manejarCambioPerfil('nombre', e.target.value)}
                />
                <EntradaFormulario
                  etiqueta="Apellido"
                  tipo="text"
                  valor={perfil.apellido}
                  alCambiar={(e) => manejarCambioPerfil('apellido', e.target.value)}
                />
                <EntradaFormulario
                  etiqueta="Correo Electrónico"
                  tipo="email"
                  valor={perfil.email}
                  deshabilitado={true}
                />
                <EntradaFormulario
                  etiqueta="Teléfono"
                  tipo="tel"
                  valor={perfil.telefono}
                  alCambiar={(e) => manejarCambioPerfil('telefono', e.target.value)}
                />
                <EntradaFormulario
                  etiqueta="Ciudad"
                  tipo="text"
                  valor={perfil.ciudad}
                  alCambiar={(e) => manejarCambioPerfil('ciudad', e.target.value)}
                />
                <EntradaFormulario
                  etiqueta="Experiencia"
                  tipo="text"
                  valor={perfil.experiencia}
                  alCambiar={(e) => manejarCambioPerfil('experiencia', e.target.value)}
                />
              </div>

              <div style={{
                marginTop: '20px',
                paddingTop: '20px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                gap: '12px'
              }}>
                <BotonPrimario
                  etiqueta="Guardar Cambios"
                  alHacerClick={manejarGuardarPerfil}
                  icono={<FaSave style={{ marginRight: '6px' }} />}
                />
              </div>
            </div>

            {/* SECCIÓN: SEGURIDAD */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '20px',
                paddingBottom: '16px',
                borderBottom: '1px solid #e2e8f0'
              }}>
                <FaLock style={{ fontSize: '20px', color: '#dc3545', marginRight: '12px' }} />
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                  Cambiar Contraseña
                </h3>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '16px'
              }}>
                <EntradaFormulario
                  etiqueta="Contraseña Actual"
                  tipo="password"
                  valor={seguridad.contraseniaActual}
                  alCambiar={(e) => manejarCambioSeguridad('contraseniaActual', e.target.value)}
                />
                <EntradaFormulario
                  etiqueta="Nueva Contraseña"
                  tipo="password"
                  valor={seguridad.contraseniaNueva}
                  alCambiar={(e) => manejarCambioSeguridad('contraseniaNueva', e.target.value)}
                />
                <EntradaFormulario
                  etiqueta="Confirmar Contraseña"
                  tipo="password"
                  valor={seguridad.confirmarContrasenia}
                  alCambiar={(e) => manejarCambioSeguridad('confirmarContrasenia', e.target.value)}
                />
              </div>

              <div style={{
                marginTop: '20px',
                paddingTop: '20px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                gap: '12px'
              }}>
                <BotonPrimario
                  etiqueta="Cambiar Contraseña"
                  alHacerClick={manejarCambiarContrasenia}
                />
                <BotonSecundario
                  etiqueta="Cancelar"
                  alHacerClick={() => setSeguridad({ contraseniaActual: '', contraseniaNueva: '', confirmarContrasenia: '' })}
                />
              </div>
            </div>

            {/* SECCIÓN: NOTIFICACIONES */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '20px',
                paddingBottom: '16px',
                borderBottom: '1px solid #e2e8f0'
              }}>
                <FaBell style={{ fontSize: '20px', color: '#ffc107', marginRight: '12px' }} />
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                  Preferencias de Notificaciones
                </h3>
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  borderRadius: '6px',
                  backgroundColor: '#f8fafc',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={notificaciones.emailSolicitudes}
                    onChange={(e) => manejarCambioNotificaciones('emailSolicitudes', e.target.checked)}
                    style={{ marginRight: '12px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px', color: '#1e293b' }}>
                    Notificaciones de solicitudes por correo
                  </span>
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  borderRadius: '6px',
                  backgroundColor: '#f8fafc',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={notificaciones.emailReportes}
                    onChange={(e) => manejarCambioNotificaciones('emailReportes', e.target.checked)}
                    style={{ marginRight: '12px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px', color: '#1e293b' }}>
                    Resúmenes de reportes
                  </span>
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  borderRadius: '6px',
                  backgroundColor: '#f8fafc',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={notificaciones.emailCambios}
                    onChange={(e) => manejarCambioNotificaciones('emailCambios', e.target.checked)}
                    style={{ marginRight: '12px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px', color: '#1e293b' }}>
                    Notificaciones de cambios importantes
                  </span>
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  borderRadius: '6px',
                  backgroundColor: '#f8fafc',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={notificaciones.emailNoticiasEquipo}
                    onChange={(e) => manejarCambioNotificaciones('emailNoticiasEquipo', e.target.checked)}
                    style={{ marginRight: '12px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px', color: '#1e293b' }}>
                    Noticias de mi equipo
                  </span>
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  borderRadius: '6px',
                  backgroundColor: '#f8fafc',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={notificaciones.notificacionesPush}
                    onChange={(e) => manejarCambioNotificaciones('notificacionesPush', e.target.checked)}
                    style={{ marginRight: '12px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px', color: '#1e293b' }}>
                    Notificaciones push en el navegador
                  </span>
                </label>
              </div>

              <div style={{
                marginTop: '20px',
                paddingTop: '20px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                gap: '12px'
              }}>
                <BotonPrimario
                  etiqueta="Guardar Preferencias"
                  alHacerClick={manejarGuardarNotificaciones}
                  icono={<FaSave style={{ marginRight: '6px' }} />}
                />
              </div>
            </div>

            {/* SECCIÓN: CONFIGURACIÓN DE EQUIPO */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '20px',
                paddingBottom: '16px',
                borderBottom: '1px solid #e2e8f0'
              }}>
                <FaUserCog style={{ fontSize: '20px', color: '#28a745', marginRight: '12px' }} />
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                  Información del Equipo
                </h3>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '16px'
              }}>
                <EntradaFormulario
                  etiqueta="Nombre del Equipo"
                  tipo="text"
                  valor={equipoConfig.nombreEquipo}
                  alCambiar={(e) => manejarCambioEquipo('nombreEquipo', e.target.value)}
                />
                <EntradaFormulario
                  etiqueta="Ciudad"
                  tipo="text"
                  valor={equipoConfig.ciudad}
                  alCambiar={(e) => manejarCambioEquipo('ciudad', e.target.value)}
                />
                <EntradaFormulario
                  etiqueta="Año de Fundación"
                  tipo="number"
                  valor={equipoConfig.aFundacion}
                  alCambiar={(e) => manejarCambioEquipo('aFundacion', e.target.value)}
                />
              </div>

              <div style={{
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid #e2e8f0'
              }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: '#1e293b'
                }}>
                  Descripción del Equipo
                </label>
                <textarea
                  value={equipoConfig.descripcion}
                  onChange={(e) => manejarCambioEquipo('descripcion', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
                    fontSize: '14px',
                    resize: 'vertical',
                    minHeight: '100px'
                  }}
                  placeholder="Escribe una descripción de tu equipo..."
                />
              </div>

              <div style={{
                marginTop: '20px',
                paddingTop: '20px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                gap: '12px'
              }}>
                <BotonPrimario
                  etiqueta="Guardar Información"
                  alHacerClick={manejarGuardarPerfil}
                  icono={<FaSave style={{ marginRight: '6px' }} />}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
