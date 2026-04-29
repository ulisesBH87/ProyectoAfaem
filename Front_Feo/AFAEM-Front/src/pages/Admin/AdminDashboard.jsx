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
import Loader from '../../components/Loader';

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
        setLoading(false); 
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <Loader text="Cargando panel de control..." />;
  }

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
      <h2 className="data-fira" style={{ fontSize: '32px', fontWeight: '800', margin: 0 }}>{val}</h2>
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
          style={{ padding: '10px 20px', backgroundColor: 'white', color: 'var(--text-main)', border: '1.5px solid var(--border-light)', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
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
            <div style={{ display: 'flex', gap: '8px' }}>
              {meses.map(m => (
                <button
                  key={m}
                  onClick={() => setMesFiltro(m)}
                  style={{
                    padding: '6px 14px', borderRadius: '10px', variant: 'none', border: 'none', fontSize: '11px', fontWeight: '800', cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    background: mesFiltro === m ? 'var(--primary)' : 'rgba(0,0,0,0.03)',
                    color: mesFiltro === m ? 'white' : 'var(--text-muted)',
                    boxShadow: mesFiltro === m ? '0 4px 12px rgba(11, 78, 166, 0.25)' : 'none',
                    transform: mesFiltro === m ? 'scale(1.05)' : 'scale(1)'
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
          val={statsData.jugadoresActivos || 'N/D'}
          ruta="/admin/jugadores"
        />



      </div>
    </div>
  );
};

export default AdminDashboard;
