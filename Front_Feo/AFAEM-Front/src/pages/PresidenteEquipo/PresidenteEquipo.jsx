import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUsers, FaClipboard, FaFootballBall, FaAward, FaTrophy } from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../styles/dashboard.css';

// Nuevos componentes premium
import StatCard from '../../components/StatCard';
import DashboardTable from '../../components/DashboardTable';
import { useRBAC } from '../../hooks/useRBAC';
import { 
  BotonPrimario, 
  BotonSecundario, 
  Tarjeta, 
  Alerta 
} from '../../components/partials';

// Servicios
import teamsService from '../../services/teams';

export default function PresidenteEquipo() {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate('/presidente-equipo/equipos');
  }, [navigate]);

  return null;
  /* El código anterior queda comentado o eliminado para evitar carga innecesaria
  const [userInfo, setUserInfo] = useState(null);
  const [teams, setTeams] = useState([]);
  const [usingLocalFallback, setUsingLocalFallback] = useState(false);
  const [stats, setStats] = useState({
    totalTeams: 0,
    totalPlayers: 0,
    pendingRequests: 0,
    certifications: 0
  });
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const email = localStorage.getItem('email');
        if (!email) {
          navigate('/ingresar');
          return;
        }

        try {
          const profileData = await teamsService.getUserProfile(email);
          setUserInfo({
            email: email,
            ...profileData
          });
        } catch (err) {
          console.warn('No se pudo obtener perfil:', err);
          setUserInfo({ email });
        }

        let availableSlots = null;
        let segurosData = [];
        try {
          // 1. Obtener ID de equipo temporal
          const tempTeamInfo = await teamsService.getEquipoTemporalInfo();
          if (tempTeamInfo && (Array.isArray(tempTeamInfo) ? tempTeamInfo.length > 0 : tempTeamInfo.id)) {
            const teamId = Array.isArray(tempTeamInfo) ? tempTeamInfo[0].id : tempTeamInfo.id;
            
            // 2. Obtener slots con ese ID
            const slotsData = await teamsService.getAvailableSlots(teamId);
            availableSlots = slotsData.jugadores_restantes;
            segurosData = slotsData.seguros || [];
            console.log('✅ Slots disponibles:', availableSlots, 'Seguros:', segurosData);
          }
        } catch (err) {
          console.warn('No se pudo obtener información de slots temporales:', err);
        }

        try {
          const teamsData = await teamsService.getUserTeams(email);
          const teamsList = teamsData.teams || [];
          setUsingLocalFallback(Boolean(teamsData.local));
          setTeams(teamsList);
          
          let totalPlayers = 0;
          teamsList.forEach(team => {
            totalPlayers += team.players?.length || 0;
          });

          setStats({
            totalTeams: teamsList.length,
            totalPlayers: totalPlayers,
            pendingRequests: 0,
            certifications: 1,
            slotsDisponibles: availableSlots,
            segurosInfo: segurosData
          });
        } catch (err) {
          console.warn('No se pudo obtener equipos:', err);
          setTeams([]);
        }
      } catch (err) {
        console.error('Error cargando datos:', err);
        setError('Error cargando los datos');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p style={{ marginTop: '10px', color: '#64748b' }}>Cargando tu panel...</p>
        </div>
      </div>
    );
  }

  const { roles, estatusId, hasRole } = useRBAC();
  const userEmail = userInfo?.email || '';
  const userName = userInfo?.name || 'Usuario';
  
  // --- VISTAS CONDICIONALES POR ESTADO ---

  // 1. VISTA INVITADO (Costos)
  if (hasRole('Invitado') && !hasRole('Presidente_Equipo')) {
    return (
      <div className="dashboard-content" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Tarjeta titulo="Calculadora de Costos AFAEM">
          <p>Bienvenido. Para comenzar tu proceso de afiliación como Presidente de Equipo, revisa los costos estimados:</p>
          <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px', marginBottom: '20px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>Costo por jugador:</span>
                <span style={{ fontWeight: '700' }}>$250.00 MXN</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>Costo anual de franquicia:</span>
                <span style={{ fontWeight: '700' }}>$1,500.00 MXN</span>
             </div>
             <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: '700' }}>Total estimado (18 jugadores):</span>
                <span style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '18px' }}>$6,000.00 MXN</span>
             </div>
          </div>
          <BotonPrimario etiqueta="Iniciar Pre-Registro" alHacerClick={() => navigate('/proximo-presidente')} />
        </Tarjeta>
      </div>
    );
  }

  // 2. VISTAS PRESIDENTE POR ESTATUS
  if (hasRole('Presidente_Equipo')) {
    
    // ESTATUS 1: Pago pendiente
    if (estatusId === 1) {
      return (
        <div className="dashboard-content" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <Alerta tipo="alerta" titulo="Acción Requerida" mensaje="Tienes un pago pendiente. Realiza el depósito y sube el comprobante para continuar con tu proceso." />
          <Tarjeta titulo="Detalles del Pago">
             <p>Por favor, realiza tu pago a la siguiente cuenta:</p>
             <ul style={{ color: '#64748b', fontSize: '14px' }}>
                <li><strong>Banco:</strong> BBVA</li>
                <li><strong>Cuenta:</strong> 0123 4567 8901 2345</li>
                <li><strong>CLABE:</strong> 0123 4567 8901 2345 67</li>
                <li><strong>Concepto:</strong> Pago Afiliación AFAEM</li>
             </ul>
             <BotonPrimario etiqueta="Subir Comprobante" alHacerClick={() => navigate('/pre-registro-presidente')} />
          </Tarjeta>
        </div>
      );
    }

    // ESTATUS 2: Verificando pago
    if (estatusId === 2) {
      return (
        <div className="dashboard-content" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
             <div style={{ fontSize: '64px', marginBottom: '20px' }}>⏳</div>
             <h2 style={{ color: '#0b2546' }}>Tu pago está siendo verificado</h2>
             <p style={{ color: '#64748b' }}>Nuestro equipo administrativo está revisando tu comprobante. Recibirás una notificación pronto.</p>
          </div>
        </div>
      );
    }

    // ESTATUS 3: Falta subir documentos PERSONALES del presidente
    if (estatusId === 3) {
      return (
        <div className="dashboard-content" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <Alerta tipo="alerta" titulo="Documentación Personal Pendiente" mensaje="Tu pago fue aprobado, pero aún falta que subas tus documentos personales (INE, Acta de Nacimiento, etc.) para completar tu perfil." />
          <Tarjeta titulo="Completa tu Perfil de Presidente">
             <p>Para poder comenzar a registrar tu equipo y jugadores, el sistema requiere validar tu identidad primero.</p>
             <div style={{ display: 'flex', gap: '10px' }}>
               <BotonPrimario etiqueta="Subir mis Documentos" alHacerClick={() => navigate('/pre-registro-presidente')} />
             </div>
          </Tarjeta>
        </div>
      );
    }

    // ESTATUS 4: Documentos en revisión por el Administrador
    if (estatusId === 4) {
      return (
        <div className="dashboard-content" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
             <div style={{ fontSize: '64px', marginBottom: '20px' }}>📄</div>
             <h2 style={{ color: '#0b2546' }}>Documentos en Revisión</h2>
             <p style={{ color: '#64748b' }}>Tu documentación personal ya fue recibida y está siendo validada por un administrador. Recibirás respuesta pronto para poder continuar con el registro de tu equipo.</p>
          </div>
        </div>
      );
    }

    // ESTATUS 5: Pre-aprobado (Panel con limitaciones o preparativos)
    if (estatusId === 5) {
      return (
        <div className="dashboard-content">
          <Alerta tipo="info" titulo="Pre-Aprobación Exitosa" mensaje="Tus documentos fueron validados satisfactoriamente. Ahora puedes comenzar con la configuración preliminar de tu equipo." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '20px', maxWidth: '600px', margin: '0 auto' }}>
            <Tarjeta titulo="Mi Equipo">
               <p>Ya puedes comenzar a configurar los detalles de tu liga y equipo.</p>
               <BotonPrimario etiqueta="Configurar Equipo" alHacerClick={() => navigate('/presidente-equipo/configuracion')} />
            </Tarjeta>
          </div>
        </div>
      );
    }
  }

  // ESTATUS 7: Dashboard Completo (Vista por defecto para Presidente aprobado)
  const obtenerEtiquetaModalidad = (modality) => {
    switch(modality) {
      case 'futbol7': return 'Fútbol 7';
      case 'futbol9': return 'Fútbol 9';
      case 'futbol11': return 'Fútbol 11';
      default: return modality;
    }
  };

  const obtenerInsigniaEstado = (status) => {
    const statusMap = {
      'activo': { color: '#28a745', label: '✓ Activo', bg: '#dcfce7' },
      'inscrito': { color: '#ffc107', label: '⏳ Inscrito', bg: '#fef3c7' },
      'en_inscripcion': { color: '#dc3545', label: '⏳ En inscripción', bg: '#fee2e2' },
      'pendiente': { color: '#ffc107', label: '⏳ Pendiente', bg: '#fef3c7' }
    };
    return statusMap[status] || { color: '#6c757d', label: status, bg: '#f3f4f6' };
  };

  return (
    <div className="dashboard-content">
      {/* SECCIÓN DE ESTADÍSTICAS */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '20px', 
        marginBottom: '40px' 
      }}>
        <StatCard 
          title="Equipos Propios" 
          value={stats.totalTeams} 
          icon={<FaFootballBall />} 
          iconType="primary" 
        />
        <StatCard 
          title="Jugadores Registrados" 
          value={stats.totalPlayers} 
          icon={<FaUsers />} 
          iconType="secondary" 
        />
        <StatCard 
          title="Slots Disponibles" 
          value={stats.slotsDisponibles !== null ? stats.slotsDisponibles : '...'} 
          icon={<FaClipboard />} 
          iconType="warning" 
        />
        <StatCard 
          title="Certificaciones" 
          value={stats.certifications} 
          icon={<FaAward />} 
          iconType="success" 
        />
      </div>

      {/* SECCIÓN SEGUROS MÉDICOS Y SLOTS */}
      {stats.segurosInfo && stats.segurosInfo.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h3 style={{ margin: '0 0 20px 0', color: 'var(--text-main)', fontSize: '16px', fontWeight: '600' }}>
            Estado de Seguros Médicos (Jugadores Pagados)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {stats.segurosInfo.map(seguro => (
              <Tarjeta key={seguro.seguro_id} titulo={seguro.nombre}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Membresías Pagadas:</span>
                  <span style={{ fontWeight: '700' }}>{seguro.pagados}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Slots Usados:</span>
                  <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{seguro.usados}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: '12px', marginTop: '4px', fontSize: '15px' }}>
                  <span style={{ fontWeight: '600' }}>Slots Disponibles:</span>
                  <span style={{ fontWeight: '800', color: seguro.disponibles > 0 ? '#10b981' : '#ef4444' }}>
                    {seguro.disponibles}
                  </span>
                </div>
              </Tarjeta>
            ))}
          </div>
        </div>
      )}

      {/* SECCIÓN "¿QUÉ QUIERES HACER HOY?" + SOLICITUDES PENDIENTES */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ margin: '0 0 20px 0', color: 'var(--text-main)', fontSize: '16px', fontWeight: '600' }}>
          ¿Qué quieres hacer hoy?
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '40px' }}>
          {/* BOTÓN 1: CONFIGURAR EQUIPO NUEVO */}
          <button
            onClick={() => navigate('/presidente-equipo/configurar-equipo')}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '12px', padding: '24px 20px', backgroundColor: 'white', border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.3s ease',
              fontWeight: '600', color: 'var(--primary)', fontSize: '14px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ fontSize: '32px' }}><FaAward /></div>
            <span>Configura equipo nuevo</span>
          </button>

          {/* BOTÓN 2: INSCRIBIR A LIGA */}
          <button
            onClick={() => alert('Funcionalidad próximamente')}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '12px', padding: '24px 20px', backgroundColor: 'white', border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.3s ease',
              fontWeight: '600', color: 'var(--primary)', fontSize: '14px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ fontSize: '32px' }}><FaTrophy /></div>
            <span>Inscribir equipo a liga</span>
          </button>

          {/* BOTÓN 3: REGISTRAR INTEGRANTES */}
          <button
            onClick={() => navigate('/presidente-equipo/registro-jugadores')}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '12px', padding: '24px 20px', backgroundColor: 'white', border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.3s ease',
              fontWeight: '600', color: 'var(--primary)', fontSize: '14px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ fontSize: '32px' }}><FaUsers /></div>
            <span>Registrar integrantes</span>
          </button>

          {/* BOTÓN 4: SOLICITUDES */}
          <button
            onClick={() => navigate('/presidente-equipo/solicitudes')}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '12px', padding: '24px 20px', backgroundColor: 'white', 
              border: `1px solid ${stats.pendingRequests > 0 ? 'var(--danger)' : 'var(--border-light)'}`,
              borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.3s ease',
              fontWeight: '600', color: stats.pendingRequests > 0 ? 'var(--danger)' : 'var(--primary)',
              fontSize: '14px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ fontSize: '32px' }}><FaClipboard /></div>
            <span>{stats.pendingRequests === 0 ? 'Sin solicitudes' : `Solicitudes pendientes: ${stats.pendingRequests}`}</span>
          </button>
        </div>
      </div>

      {/* PANEL DE EQUIPOS */}
      <div>
        {usingLocalFallback && (
          <div style={{
            backgroundColor: '#fff7ed', border: '1px solid #fdba74', color: '#9a3412',
            borderRadius: '8px', padding: '12px 16px', marginBottom: '16px',
            fontSize: '13px', fontWeight: '600'
          }}>
            Modo local activo: esta vista esta usando datos guardados en el navegador porque los endpoints de equipos/perfil del backend no estan disponibles.
          </div>
        )}
        <h3 style={{ margin: '0 0 20px 0', color: 'var(--text-main)', fontSize: '18px', fontWeight: '700' }}>
          Panel de equipos
        </h3>

        {teams.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {teams.map((team) => {
              const playerCount = Array.isArray(team.players) ? team.players.length : 0;
              const trainerCount = Array.isArray(team.trainers) ? team.trainers.length : 0;
              const statusInfo = obtenerInsigniaEstado(team.status);
              const modality = obtenerEtiquetaModalidad(team.modality);

              return (
                <div
                  key={team.id}
                  className="card"
                  style={{ padding: '20px', transition: 'all 0.3s ease', cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  {/* LOGO Y NOMBRE */}
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '60px', height: '60px', borderRadius: '12px', backgroundColor: 'var(--bg-main)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px',
                      fontWeight: 'bold', color: 'var(--primary)', flexShrink: 0
                    }}>
                      {team.logo ? team.logo : <FaFootballBall />}
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', color: 'var(--text-main)', fontSize: '15px', fontWeight: '700' }}>
                        {team.name}
                      </h4>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>
                        ID: {team.id}
                      </span>
                    </div>
                  </div>

                  {/* INFORMACIÓN */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <small style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>Modalidad</small>
                        <div style={{ color: 'var(--text-main)', fontWeight: '700', fontSize: '13px', marginTop: '4px' }}>{modality}</div>
                      </div>
                      <div>
                        <small style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>Jugadores</small>
                        <div style={{ color: 'var(--text-main)', fontWeight: '700', fontSize: '13px', marginTop: '4px' }}>{playerCount} / 25</div>
                      </div>
                    </div>
                  </div>

                  {/* BOTÓN */}
                  <button
                    onClick={() => navigate(`/presidente-equipo/admin-equipo/${team.id}`)}
                    className="btn-premium"
                    style={{ width: '100%', padding: '10px 16px', fontSize: '12px' }}
                  >
                    Administrar
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)', padding: '40px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 20px 0', fontWeight: '600', color: 'var(--text-main)' }}>No tienes equipos aún registrados</p>
            <button
              onClick={() => navigate('/presidente-equipo/configurar-equipo')}
              className="btn-premium"
            >
              Crear primer equipo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
