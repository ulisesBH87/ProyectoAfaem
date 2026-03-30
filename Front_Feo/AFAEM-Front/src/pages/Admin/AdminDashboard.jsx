import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/Admin/AdminLayout';
import { 
  FaUsers, 
  FaRegFileAlt, 
  FaShieldAlt, 
  FaHistory,
  FaArrowRight
} from 'react-icons/fa';
import { getSolicitudes } from '../../services/solicitud';
import { getPagosGenerales } from '../../services/admin';

const AdminDashboard = () => {
  const [statsData, setStatsData] = useState({
    solicitudes: 0,
    pagosPendientes: 0,
    totalIngreso: 0,
    equipos: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [solicitudes, pagos] = await Promise.all([
          getSolicitudes(),
          getPagosGenerales()
        ]);

        const solicitudesList = Array.isArray(solicitudes) ? solicitudes : (solicitudes.solicitudes || []);
        const pagosList = Array.isArray(pagos) ? pagos : [];

        const totalIngreso = pagosList
          .filter(p => p.EstatusValidacion === 1)
          .reduce((acc, curr) => acc + parseFloat(curr.MontoTotal), 0);

        setStatsData({
          solicitudes: solicitudesList.length,
          pagosPendientes: pagosList.filter(p => p.EstatusValidacion === 2).length,
          totalIngreso: totalIngreso,
          equipos: solicitudesList.filter(s => s.EstatusValidacion === 1).length
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        // no-op
      }
    };
    fetchData();
  }, []);

  const stats = [
    { title: 'Solicitudes Totales', value: statsData.solicitudes, icon: <FaRegFileAlt />, color: '#0b4ea6', trend: 'Actual' },
    { title: 'Equipos Aprobados', value: statsData.equipos, icon: <FaShieldAlt />, color: '#10b981', trend: 'Activos' },
    { title: 'Pagos Pendientes', value: statsData.pagosPendientes, icon: <FaHistory />, color: '#f59e0b', trend: 'Por validar' },
    { title: 'Recaudación Total', value: `$${statsData.totalIngreso.toLocaleString()}`, icon: <FaHistory />, color: '#8b5cf6', trend: 'Aprobado' },
  ];

  const [recentActivity, setRecentActivity] = useState([]); // Iniciamos vacío para datos del backend

  return (
    <AdminLayout title="Tablero Principal">
      {/* STAT CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '30px', marginBottom: '40px' }}>
        {stats.map((stat, idx) => (
          <div key={idx} style={{
            background: 'white',
            padding: '24px',
            borderRadius: '16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            border: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            gap: '20px'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: `${stat.color}15`,
              color: stat.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>
              {stat.icon}
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#64748b', margin: '0 0 4px 0' }}>{stat.title}</p>
              <h3 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b', margin: 0 }}>{stat.value}</h3>
              <p style={{ fontSize: '12px', fontWeight: '700', color: stat.title.includes('Solicitudes') ? '#f59e0b' : '#10b981', margin: '4px 0 0 0' }}>
                {stat.trend}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
        {/* RECENT ACTIVITY */}
        <div style={{
          background: 'white',
          padding: '30px',
          borderRadius: '20px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          border: '1px solid #f1f5f9'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Actividad Reciente</h3>
            <button style={{ background: 'none', border: 'none', color: '#0b4ea6', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
              Ver todo
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '12px',
                  borderRadius: '12px',
                  transition: 'background 0.2s'
                }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: activity.status === 'success' ? '#10b981' : (activity.status === 'pending' ? '#f59e0b' : (activity.status === 'error' ? '#ef4444' : '#3b82f6'))
                  }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#334155', margin: 0 }}>{activity.text}</p>
                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0 0' }}>{activity.time}</p>
                  </div>
                  <FaArrowRight style={{ color: '#cbd5e1', fontSize: '14px' }} />
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                <p style={{ fontSize: '14px', margin: 0 }}>No hay actividad reciente para mostrar</p>
              </div>
            )}
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #0b4ea6 0%, #063f82 100%)',
            padding: '30px',
            borderRadius: '20px',
            color: 'white',
            boxShadow: '0 10px 15px -3px rgba(11, 78, 166, 0.3)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '15px' }}>Acciones Rápidas</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '10px',
                color: 'white',
                fontWeight: '600',
                fontSize: '14px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
                + Crear Nuevo Torneo
              </button>
              <button style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '10px',
                color: 'white',
                fontWeight: '600',
                fontSize: '14px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
                📣 Enviar Aviso General
              </button>
            </div>
          </div>

          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '20px',
            border: '1px solid #f1f5f9',
            textAlign: 'center'
          }}>
            <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#64748b', marginBottom: '10px' }}>ESTADO DEL SERVIDOR</h4>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#10b981', marginBottom: '5px' }}>ONLINE</div>
            <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', marginTop: '10px' }}>
              <div style={{ width: '100%', height: '100%', background: '#10b981' }} />
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '10px' }}>Todos los servicios operativos</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
