import React, { useEffect, useState } from 'react';
import { 
  FaRegFileAlt, 
  FaShieldAlt, 
  FaHistory,
  FaChartLine,
  FaTrophy,
  FaBolt,
  FaCheckCircle
} from 'react-icons/fa';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
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

  // Datos simulados para gráficas basados en la tendencia real
  const chartData = [
    { name: 'Ene', ingresos: 4000, solicitudes: 24 },
    { name: 'Feb', ingresos: 3000, solicitudes: 13 },
    { name: 'Mar', ingresos: 2000, solicitudes: 98 },
    { name: 'Abr', ingresos: statsData.totalIngreso || 2780, solicitudes: statsData.solicitudes || 39 },
  ];

  const statusData = [
    { name: 'Aprobados', value: statsData.equipos, color: 'var(--secondary)' },
    { name: 'Pendientes', value: statsData.pagosPendientes, color: 'var(--warning)' },
    { name: 'Totales', value: statsData.solicitudes, color: 'var(--primary)' },
  ];

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
        setTimeout(() => setLoading(false), 800); // Pequeño delay para apreciar la animación
      }
    };
    fetchData();
  }, []);

  return (
    <div className="fade-in-up" style={{ padding: '20px 0' }}>
      {/* HEADER SECTION */}
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="heading-outfit" style={{ fontSize: '36px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-1px' }}>
            Panel de Control
          </h1>
          <p style={{ color: 'var(--text-muted)', fontWeight: '500', fontSize: '16px' }}>
            Bienvenido, Administrador. Visualiza el pulso de la liga en tiempo real.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="glass" style={{ padding: '10px 16px', borderRadius: '12px', fontWeight: '600', color: 'var(--primary)' }}>
            <FaHistory style={{ marginRight: '8px' }} /> Historial
          </button>
          <button className="btn-premium">
            <FaBolt style={{ marginRight: '8px' }} /> Acción Rápida
          </button>
        </div>
      </header>

      {/* BENTO GRID MAIN */}
      <div className="bento-grid">
        
        {/* STAT 1: SOLICITUDES (1x1) */}
        <div className="card card-hover glass" style={{ gridColumn: 'span 1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ width: '48px', height: '48px', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
              <FaRegFileAlt />
            </div>
            <span className="data-fira" style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary)' }}>+12%</span>
          </div>
          <h3 className="heading-outfit" style={{ fontSize: '14px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Solicitudes</h3>
          {loading ? <Skeleton width="80px" height="32px" /> : <h2 className="data-fira" style={{ fontSize: '32px', fontWeight: '800' }}>{statsData.solicitudes}</h2>}
        </div>

        {/* STAT 2: EQUIPOS (1x1) */}
        <div className="card card-hover glass" style={{ gridColumn: 'span 1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ width: '48px', height: '48px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--secondary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
              <FaShieldAlt />
            </div>
            <span className="data-fira" style={{ fontSize: '12px', fontWeight: '700', color: 'var(--secondary)' }}>ACTIVO</span>
          </div>
          <h3 className="heading-outfit" style={{ fontSize: '14px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Equipos Aprobados</h3>
          {loading ? <Skeleton width="80px" height="32px" /> : <h2 className="data-fira" style={{ fontSize: '32px', fontWeight: '800' }}>{statsData.equipos}</h2>}
        </div>

        {/* CHART 1: RECAUDACIÓN (2x2) */}
        <div className="card glass" style={{ gridColumn: 'span 2', gridRow: 'span 2', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '24px' }}>
            <h3 className="heading-outfit" style={{ fontSize: '18px', fontWeight: '700' }}>Tendencia de Ingresos</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Histórico de los últimos 4 meses ($ MXN)</p>
          </div>
          <div style={{ flex: 1, minHeight: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 12}} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-lg)', padding: '12px' }}
                  itemStyle={{ fontWeight: 700, color: 'var(--primary)' }}
                />
                <Area type="monotone" dataKey="ingresos" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="data-fira" style={{ marginTop: '20px', fontSize: '28px', fontWeight: '800', color: 'var(--primary)' }}>
            ${statsData.totalIngreso.toLocaleString()}
          </div>
        </div>

        {/* STAT 3: PAGOS PENDIENTES (1x1) */}
        <div className="card card-hover glass" style={{ gridColumn: 'span 1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ width: '48px', height: '48px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
              <FaHistory />
            </div>
          </div>
          <h3 className="heading-outfit" style={{ fontSize: '14px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Pendientes</h3>
          {loading ? <Skeleton width="80px" height="32px" /> : <h2 className="data-fira" style={{ fontSize: '32px', fontWeight: '800', color: 'var(--warning)' }}>{statsData.pagosPendientes}</h2>}
        </div>

        {/* QUICK ACTIONS (1x1) */}
        <div className="glass-dark" style={{ gridColumn: 'span 1', borderRadius: 'var(--radius-lg)', padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 className="heading-outfit" style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px' }}>Acciones Rápidas</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button className="btn-premium" style={{ width: '100%', padding: '12px', fontSize: '13px' }}>
              <FaTrophy style={{ marginRight: '8px' }} /> Nuevo Torneo
            </button>
            <button className="btn-ghost" style={{ width: '100%', padding: '12px' }}>
              Anuncio Global
            </button>
          </div>
        </div>

        {/* CHART 2: STATUS DISTRIBUTION (2x1) */}
        <div className="card glass" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column' }}>
          <h3 className="heading-outfit" style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Distribución de Estatus</h3>
          <div style={{ flex: 1 }}>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={statusData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" hide />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SYSTEM STATUS (2x1) */}
        <div className="card glass" style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h4 className="heading-outfit" style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Estado del Sistema</h4>
            <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaCheckCircle /> OPERATIVO
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p className="data-fira" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Latencia: 42ms</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Última sincronización: Hace 1 min</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
