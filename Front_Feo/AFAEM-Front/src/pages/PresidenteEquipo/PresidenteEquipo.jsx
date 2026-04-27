import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaUsers, FaClipboardList,
  FaCheckCircle, FaClock, FaTimesCircle, FaUserPlus,
  FaSyncAlt, FaShieldAlt, FaArrowRight, FaTrophy
} from 'react-icons/fa';
import teamsService from '../../services/teams';
import { getMisSolicitudes } from '../../services/solicitud';
import Skeleton from '../../components/Common/Skeleton';

export default function PresidenteEquipo() {
  const navigate = useNavigate();

  const nombre = localStorage.getItem('nombre') || localStorage.getItem('email') || 'Presidente';
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEquipos: 0,
    totalJugadores: 0,
    solicitudesPendientes: 0,
    solicitudesAprobadas: 0,
    solicitudesRechazadas: 0,
    totalSolicitudes: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [equipos, jugadores, solicitudes] = await Promise.allSettled([
          teamsService.getUserTeamsReal(),
          teamsService.getUserPlayersReal(),
          getMisSolicitudes(),
        ]);

        const eqs = equipos.status === 'fulfilled' ? (equipos.value || []) : [];
        const jugs = jugadores.status === 'fulfilled' ? (jugadores.value || []) : [];
        const sols = solicitudes.status === 'fulfilled' ? (solicitudes.value || []) : [];

        setStats({
          totalEquipos: eqs.length,
          totalJugadores: jugs.length,
          solicitudesPendientes: sols.filter(s => s.EstatusValidacion === 2).length,
          solicitudesAprobadas: sols.filter(s => s.EstatusValidacion === 1).length,
          solicitudesRechazadas: sols.filter(s => s.EstatusValidacion === 0 || s.EstatusValidacion === 3).length,
          totalSolicitudes: sols.length,
        });
      } catch {
        // Silencioso — se muestran ceros si hay error
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const StatCard = ({ icon, bg, color, label, value, ruta }) => (
    <div
      onClick={() => ruta && navigate(ruta)}
      className="card glass"
      style={{
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        cursor: ruta ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        borderRadius: '20px',
      }}
      onMouseEnter={e => ruta && (e.currentTarget.style.transform = 'translateY(-4px)')}
      onMouseLeave={e => ruta && (e.currentTarget.style.transform = 'translateY(0)')}
    >
      <div style={{
        width: '56px', height: '56px', borderRadius: '16px',
        background: bg, color, display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
          {label}
        </div>
        {loading
          ? <Skeleton width="64px" height="28px" />
          : <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text-main)', lineHeight: 1 }}>{value}</div>
        }
      </div>
      {ruta && (
        <FaArrowRight style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '14px', flexShrink: 0 }} />
      )}
    </div>
  );

  const AccionRapida = ({ icon, label, ruta, color = 'var(--primary)' }) => (
    <button
      onClick={() => navigate(ruta)}
      className="card"
      style={{
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        cursor: 'pointer',
        border: '1.5px solid var(--border-light)',
        background: 'white',
        borderRadius: '16px',
        transition: 'all 0.2s',
        textAlign: 'left',
        width: '100%',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = color;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = `0 8px 20px ${color}18`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border-light)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{
        width: '44px', height: '44px', borderRadius: '12px',
        background: `${color}15`, color, display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0
      }}>
        {icon}
      </div>
      <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-main)' }}>{label}</span>
      <FaArrowRight style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '12px' }} />
    </button>
  );

  const estatusConfig = [
    { label: 'Pendientes', value: stats.solicitudesPendientes, color: '#f59e0b', icon: <FaClock /> },
    { label: 'Aprobadas', value: stats.solicitudesAprobadas, color: 'var(--secondary)', icon: <FaCheckCircle /> },
    { label: 'Rechazadas', value: stats.solicitudesRechazadas, color: 'var(--danger)', icon: <FaTimesCircle /> },
  ];

  return (
    <div className="fade-in-up" style={{ padding: '4px 0 32px' }}>

      {/* ENCABEZADO */}
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="heading-outfit" style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-1px', margin: 0 }}>
            Bienvenido, {nombre.split(' ')[0]} 👋
          </h2>
          <p style={{ color: 'var(--text-muted)', fontWeight: '500', fontSize: '15px', margin: '6px 0 0' }}>
            Aquí tienes un resumen de tu actividad como presidente de equipo.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="glass"
          style={{
            padding: '10px 20px', backgroundColor: 'white', color: 'var(--text-main)',
            border: '1.5px solid var(--border-light)', borderRadius: '12px',
            cursor: 'pointer', fontWeight: '700', fontSize: '14px',
            display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
          }}
        >
          <FaSyncAlt /> Actualizar
        </button>
      </header>

      {/* MÉTRICAS PRINCIPALES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <StatCard
          icon={<FaShieldAlt />}
          bg="rgba(37, 99, 235, 0.1)"
          color="var(--primary)"
          label="Mis Equipos"
          value={stats.totalEquipos}
          ruta="/presidente-equipo/equipos"
        />
        <StatCard
          icon={<FaUsers />}
          bg="rgba(16, 185, 129, 0.1)"
          color="var(--secondary)"
          label="Total Jugadores"
          value={stats.totalJugadores}
          ruta="/presidente-equipo/mis-jugadores"
        />
        <StatCard
          icon={<FaClipboardList />}
          bg="rgba(245, 158, 11, 0.1)"
          color="var(--warning)"
          label="Total Solicitudes"
          value={stats.totalSolicitudes}
          ruta="/presidente-equipo/solicitudes"
        />
      </div>

      {/* SECCIÓN INFERIOR: solicitudes + acciones */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>

        {/* ESTADO DE SOLICITUDES */}
        <div className="card glass" style={{ padding: '28px', borderRadius: '20px' }}>
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="heading-outfit" style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
                Estado de mis solicitudes
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                Resumen de todas las solicitudes enviadas al administrador.
              </p>
            </div>
            <button
              onClick={() => navigate('/presidente-equipo/solicitudes')}
              style={{
                padding: '8px 16px', background: 'rgba(37,99,235,0.06)',
                color: 'var(--primary)', border: '1.5px solid rgba(37,99,235,0.2)',
                borderRadius: '10px', fontWeight: '700', fontSize: '12px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              Ver todas <FaArrowRight />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {estatusConfig.map((e, i) => (
              <div
                key={i}
                style={{
                  padding: '20px 16px', background: `${e.color}08`, borderRadius: '14px',
                  border: `1.5px solid ${e.color}25`, textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '20px', color: e.color, marginBottom: '8px' }}>{e.icon}</div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {e.label}
                </div>
                {loading
                  ? <div style={{ display: 'flex', justifyContent: 'center' }}><Skeleton width="40px" height="24px" /></div>
                  : <div style={{ fontSize: '24px', fontWeight: '900', color: e.color }}>{e.value}</div>
                }
              </div>
            ))}
          </div>

          {/* Banner si hay solicitudes pendientes */}
          {!loading && stats.solicitudesPendientes > 0 && (
            <div
              onClick={() => navigate('/presidente-equipo/solicitudes')}
              style={{
                marginTop: '20px', padding: '14px 18px',
                background: 'rgba(245, 158, 11, 0.07)', border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px',
                cursor: 'pointer'
              }}
            >
              <FaClock style={{ color: '#f59e0b', fontSize: '18px' }} />
              <div>
                <div style={{ fontWeight: '800', fontSize: '13px', color: '#92400e' }}>
                  Tienes {stats.solicitudesPendientes} solicitud{stats.solicitudesPendientes > 1 ? 'es' : ''} en proceso
                </div>
                <div style={{ fontSize: '12px', color: '#b45309' }}>Clic para ver el estado actual →</div>
              </div>
            </div>
          )}
        </div>

        {/* ACCIONES RÁPIDAS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 className="heading-outfit" style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 4px' }}>
            Acciones rápidas
          </h3>
          <AccionRapida icon={<FaUserPlus />} label="Registrar nuevo jugador" ruta="/presidente-equipo/registro-jugadores" color="var(--primary)" />
          <AccionRapida icon={<FaShieldAlt />} label="Ver mis equipos" ruta="/presidente-equipo/equipos" color="var(--secondary)" />
          <AccionRapida icon={<FaUsers />} label="Mi directorio de jugadores" ruta="/presidente-equipo/mis-jugadores" color="#6366f1" />
          <AccionRapida icon={<FaClipboardList />} label="Mis solicitudes" ruta="/presidente-equipo/solicitudes" color="var(--warning)" />
          <AccionRapida icon={<FaTrophy />} label="Configuración del equipo" ruta="/presidente-equipo/configuracion" color="#ec4899" />
        </div>
      </div>
    </div>
  );
}
