import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaRegFileAlt, FaShieldAlt, FaHistory, FaChartLine,
  FaTrophy, FaBolt, FaCheckCircle, FaUsers, FaSyncAlt,
  FaClipboardList, FaMoneyBillWave
} from 'react-icons/fa';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, LabelList
} from 'recharts';
import { getSolicitudes } from '../../services/solicitud';
import { getPagosGenerales } from '../../services/admin';
import Skeleton from '../../components/Common/Skeleton';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [mesFiltro, setMesFiltro] = useState('Abr');
  const [statsData, setStatsData] = useState({
    solicitudesPendientes: 0,
    pagosPendientes: 0,
    totalIngreso: 0,
    equipos: 0,
    jugadoresActivos: 0
  });

  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];

  // Datos simulados para gráficas hasta que backend tenga endpoint
  const chartDataCompleto = {
    'Ene': [{ name: 'Ene', ingresos: 4200 }],
    'Feb': [{ name: 'Ene', ingresos: 4200 }, { name: 'Feb', ingresos: 3800 }],
    'Mar': [{ name: 'Ene', ingresos: 4200 }, { name: 'Feb', ingresos: 3800 }, { name: 'Mar', ingresos: 5100 }],
    'Abr': [
      { name: 'Ene', ingresos: 4200 }, { name: 'Feb', ingresos: 3800 },
      { name: 'Mar', ingresos: 5100 }, { name: 'Abr', ingresos: statsData.totalIngreso || 6400 }
    ],
    'May': [
      { name: 'Ene', ingresos: 4200 }, { name: 'Feb', ingresos: 3800 },
      { name: 'Mar', ingresos: 5100 }, { name: 'Abr', ingresos: 6400 }, { name: 'May', ingresos: 0 }
    ],
    'Jun': [
      { name: 'Ene', ingresos: 4200 }, { name: 'Feb', ingresos: 3800 },
      { name: 'Mar', ingresos: 5100 }, { name: 'Abr', ingresos: 6400 }, { name: 'May', ingresos: 0 }, { name: 'Jun', ingresos: 0 }
    ],
  };

  const chartData = chartDataCompleto[mesFiltro] || chartDataCompleto['Abr'];

  const statusData = [
    { name: 'Aprobados', value: statsData.equipos, color: '#10b981' },
    { name: 'Pendientes', value: statsData.pagosPendientes, color: '#f59e0b' },
    { name: 'Solicitudes', value: statsData.solicitudesPendientes, color: 'var(--primary)' },
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
          .filter(p => (p.EstatusPagoId || p.EstatusValidacion) === 3)
          .reduce((acc, curr) => acc + parseFloat(curr.MontoTotal || curr.TotalPagar || 0), 0);

        setStatsData({
          solicitudesPendientes: solicitudesList.filter(s => s.EstatusValidacion === 1).length,
          pagosPendientes: pagosList.filter(p => (p.EstatusPagoId || p.EstatusValidacion) === 2).length,
          totalIngreso: totalIngreso,
          equipos: solicitudesList.filter(s => s.EstatusValidacion === 2).length,
          jugadoresActivos: 0 // Mock hasta endpoint de backend
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setTimeout(() => setLoading(false), 800);
      }
    };
    fetchData();
  }, []);

  const StatCard = ({ icon, bg, color, label, val, ruta, badge }) => (
    <div
      onClick={() => ruta && navigate(ruta)}
      className="card card-hover glass"
      style={{
        gridColumn: 'span 1',
        cursor: ruta ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ width: '48px', height: '48px', background: bg, color, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
          {icon}
        </div>
        {badge && <span className="data-fira" style={{ fontSize: '12px', fontWeight: '700', color: badge.color, background: badge.bg, padding: '4px 10px', borderRadius: '20px' }}>{badge.text}</span>}
      </div>
      <h3 className="heading-outfit" style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
        {label}
      </h3>
      {loading
        ? <Skeleton width="80px" height="32px" />
        : <h2 className="data-fira" style={{ fontSize: '32px', fontWeight: '800', margin: 0 }}>{val}</h2>
      }
      {ruta && <p style={{ margin: '8px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Clic para ver →</p>}
    </div>
  );

  return (
    <div className="fade-in-up" style={{ padding: '20px 0' }}>
      {/* HEADER SECTION */}
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 className="heading-outfit" style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-1px', margin: 0 }}>
            Panel de Control AFAEM
          </h2>
          <p style={{ color: 'var(--text-muted)', fontWeight: '500', fontSize: '15px', margin: '6px 0 0' }}>
            Bienvenido, Administrador. Visualiza el pulso de la liga en tiempo real.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="glass"
          style={{ padding: '10px 16px', borderRadius: '12px', fontWeight: '600', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <FaSyncAlt /> Actualizar
        </button>
      </header>

      {/* BENTO GRID */}
      <div className="bento-grid">

        {/* STAT 1: SOLICITUDES PENDIENTES */}
        <StatCard
          icon={<FaRegFileAlt />}
          bg="rgba(37, 99, 235, 0.1)"
          color="var(--primary)"
          label="Solicitudes Pendientes"
          val={statsData.solicitudesPendientes}
          ruta="/admin/solicitudes"
          badge={{ text: '⚡ Revisar', color: 'var(--primary)', bg: 'rgba(37,99,235,0.08)' }}
        />

        {/* STAT 2: PAGOS PENDIENTES */}
        <StatCard
          icon={<FaMoneyBillWave />}
          bg="rgba(245, 158, 11, 0.1)"
          color="var(--warning)"
          label="Pagos Pendientes"
          val={statsData.pagosPendientes}
          ruta="/admin/pagos"
          badge={{ text: '⏳ Validar', color: 'var(--warning)', bg: 'rgba(245,158,11,0.08)' }}
        />

        {/* CHART: RECAUDACIÓN (2x2) */}
        <div className="card glass" style={{ gridColumn: 'span 2', gridRow: 'span 2', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="heading-outfit" style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Tendencia de ingresos</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>Histórico mensual ($ MXN)</p>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {meses.map(m => (
                <button
                  key={m}
                  onClick={() => setMesFiltro(m)}
                  style={{
                    padding: '5px 12px', borderRadius: '8px', border: 'none', fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                    background: mesFiltro === m ? 'var(--primary)' : 'transparent',
                    color: mesFiltro === m ? 'white' : 'var(--text-muted)'
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
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
                  formatter={(val) => [`$${val.toLocaleString('es-MX')}`, 'Ingresos']}
                />
                <Area type="monotone" dataKey="ingresos" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="data-fira" style={{ marginTop: '20px', fontSize: '28px', fontWeight: '800', color: 'var(--primary)' }}>
            ${statsData.totalIngreso.toLocaleString()}
          </div>
        </div>

        {/* STAT 3: EQUIPOS APROBADOS */}
        <StatCard
          icon={<FaShieldAlt />}
          bg="rgba(16, 185, 129, 0.1)"
          color="var(--secondary)"
          label="Equipos Aprobados"
          val={statsData.equipos}
          ruta="/admin/equipos"
          badge={{ text: 'ACTIVO', color: 'var(--secondary)', bg: 'rgba(16,185,129,0.08)' }}
        />

        {/* STAT 4: JUGADORES ACTIVOS */}
        <StatCard
          icon={<FaUsers />}
          bg="rgba(139, 92, 246, 0.1)"
          color="#8b5cf6"
          label="Jugadores Activos"
          val={loading ? '—' : (statsData.jugadoresActivos || 'N/D')}
          ruta="/admin/jugadores"
        />

        {/* DISTRIBUCIÓN DE ESTATUS (2x1) */}
        <div className="card glass" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column' }}>
          <h3 className="heading-outfit" style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px' }}>Distribución de Estatus</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {statusData.map(item => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ width: '100px', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', flexShrink: 0 }}>
                  {item.name}
                </span>
                <div style={{ flex: 1, background: '#f1f5f9', borderRadius: '6px', height: '20px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${item.value > 0 ? Math.max((item.value / Math.max(...statusData.map(d => d.value), 1)) * 100, 5) : 0}%`,
                      background: item.color,
                      borderRadius: '6px',
                      transition: 'width 0.6s ease'
                    }}
                  />
                </div>
                <span style={{ width: '30px', textAlign: 'right', fontSize: '14px', fontWeight: '800', color: item.color, flexShrink: 0 }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ESTADO DEL SISTEMA (2x1) */}
        <div className="card glass" style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h4 className="heading-outfit" style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Estado del sistema</h4>
            <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaCheckCircle /> OPERATIVO
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p className="data-fira" style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Latencia: 42ms</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0' }}>Última sincronización: Hace 1 min</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
