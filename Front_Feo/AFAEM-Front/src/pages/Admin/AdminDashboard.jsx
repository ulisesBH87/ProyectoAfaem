import React, { useEffect, useState } from 'react';
import { 
  FaUsers, 
  FaRegFileAlt, 
  FaShieldAlt, 
  FaHistory,
  FaArrowRight,
  FaChartLine,
  FaTrophy
} from 'react-icons/fa';
import { getSolicitudes } from '../../services/solicitud';
import { getPagosGenerales } from '../../services/admin';
import Skeleton from '../../components/Common/Skeleton';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState({
    solicitudes: 0,
    pagosPendientes: 0,
    totalIngreso: 0,
    equipos: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [solicitudes, pagos] = await Promise.all([
          getSolicitudes(),
          getPagosGenerales()
        ]);

        const solicitudesList = Array.isArray(solicitudes) ? solicitudes : (solicitudes.solicitudes || []);
        const pagosList = Array.isArray(pagos) ? pagos : [];

        const totalIngreso = pagosList
          .filter(p => (p.EstatusPagoId || p.EstatusValidacion) === 3)
          .reduce((acc, curr) => acc + parseFloat(curr.MontoTotal || curr.TotalPagar || 0), 0);

        setStatsData({
          solicitudes: solicitudesList.length,
          pagosPendientes: pagosList.filter(p => (p.EstatusPagoId || p.EstatusValidacion) === 2).length,
          totalIngreso: totalIngreso,
          equipos: solicitudesList.filter(s => s.EstatusValidacion === 1).length
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = [
    { title: 'Solicitudes Totales', value: statsData.solicitudes, icon: <FaRegFileAlt />, color: 'var(--primary)', trend: 'Actual' },
    { title: 'Equipos Aprobados', value: statsData.equipos, icon: <FaShieldAlt />, color: 'var(--secondary)', trend: 'Activos' },
    { title: 'Pagos Pendientes', value: statsData.pagosPendientes, icon: <FaHistory />, color: 'var(--warning)', trend: 'Por validar' },
    { title: 'Recaudación Total', value: `$${statsData.totalIngreso.toLocaleString()}`, icon: <FaChartLine />, color: 'var(--accent)', trend: 'Aprobado' },
  ];

  return (
    <div className="fade-in">
      {/* WELCOME SECTION */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>
          Resumen del Panel
        </h1>
        <p style={{ color: 'var(--text-muted)', fontWeight: '500' }}>
          Bienvenido de nuevo, Administrador. Esto es lo que está sucediendo hoy.
        </p>
      </div>

      {/* STAT CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {stats.map((stat, idx) => (
          <div key={idx} className="card" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            padding: '28px',
            transition: 'transform 0.3s ease'
          }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            {loading ? (
              <Skeleton width="56px" height="56px" borderRadius="14px" />
            ) : (
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: `linear-gradient(135deg, ${stat.color} 0%, ${stat.color}99 100%)`,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                boxShadow: `0 8px 16px ${stat.color}33`
              }}>
                {stat.icon}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', margin: '0 0 4px 0', textTransform: 'uppercase' }}>{stat.title}</p>
              {loading ? (
                <Skeleton width="100px" height="24px" />
              ) : (
                <h3 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>{stat.value}</h3>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.4fr', gap: '24px' }}>
        {/* RECENT ACTIVITY */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>Actividad Reciente</h3>
            <button style={{ background: 'none', color: 'var(--primary)', fontWeight: '700', fontSize: '14px' }}>
              Ver Todo
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px' }}>
                  <Skeleton width="12px" height="12px" borderRadius="50%" />
                  <Skeleton width="80%" height="16px" />
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '14px', fontWeight: '500' }}>No hay actividad reciente para mostrar</p>
              </div>
            )}
          </div>
        </div>

        {/* QUICK ACTIONS & SERVER STATUS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card" style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
            color: 'white',
            border: 'none'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>Acciones Rápidas</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button className="btn-premium" style={{ width: '100%', background: 'rgba(255,255,255,0.1)', boxShadow: 'none' }}>
                <FaTrophy style={{ marginRight: '10px' }} /> Crear Nuevo Torneo
              </button>
              <button className="btn-premium" style={{ width: '100%', background: 'rgba(255,255,255,0.1)', boxShadow: 'none' }}>
                Send Global Announcement
              </button>
            </div>
          </div>

          <div className="card" style={{ textAlign: 'center' }}>
            <h4 style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>Estado del Servidor</h4>
            <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--secondary)', marginBottom: '8px' }}>SISTEMA EN OPERACIÓN</div>
            <div style={{ height: '8px', background: 'var(--bg-main)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: '100%', height: '100%', background: 'var(--secondary)' }} className="skeleton" />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px', fontWeight: '600' }}>Última revisión: Justo ahora</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
