import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaRegFileAlt, FaShieldAlt, FaHistory, FaChartLine,
  FaTrophy, FaBolt, FaCheckCircle, FaUsers, FaSyncAlt,
  FaClipboardList, FaMoneyBillWave
} from 'react-icons/fa';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, LabelList, PieChart, Pie
} from 'recharts';
import { getSolicitudes } from '../../services/solicitud';
import { getPagosGenerales, getJugadoresDirectorio } from '../../services/admin';
import Loader from '../../components/Loader';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const [mesFiltro, setMesFiltro] = useState(meses[new Date().getMonth()]);
  const [chartData, setChartData] = useState(meses.map(m => ({ name: m, ingresos: 0 })));
  const [statsData, setStatsData] = useState({
    solicitudesPendientes: 0,
    pagosPendientes: 0,
    totalIngreso: 0,
    equipos: 0,
    jugadoresActivos: 0
  });

  // Dato específico del mes seleccionado para el indicador numérico grande
  const mesSeleccionadoData = chartData.find(d => d.name === mesFiltro) || chartData[new Date().getMonth()];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [solicitudes, pagos, jugadores] = await Promise.all([
          getSolicitudes(),
          getPagosGenerales(),
          getJugadoresDirectorio()
        ]);

        const solicitudesList = Array.isArray(solicitudes) ? solicitudes : (solicitudes.solicitudes || []);
        const pagosList = Array.isArray(pagos) ? pagos : [];
        const jugadoresList = Array.isArray(jugadores) ? jugadores : [];

        const pagosValidos = pagosList.filter(p => (p.EstatusPagoId || p.EstatusValidacion) === 3);
        const totalIngreso = pagosValidos.reduce((acc, curr) => acc + parseFloat(curr.MontoTotal || curr.TotalPagar || 0), 0);

        const nuevosIngresosPorMes = meses.map(m => ({ name: m, ingresos: 0 }));
        pagosValidos.forEach(p => {
          const dateStr = p.FechaEnvio || p.CreatedAt || p.FechaPago || p.FechaCreacion || p.FechaRegistro;
          if (dateStr) {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              nuevosIngresosPorMes[date.getMonth()].ingresos += parseFloat(p.MontoTotal || p.TotalPagar || 0);
            }
          }
        });
        setChartData(nuevosIngresosPorMes);

        setStatsData({
          solicitudesPendientes: solicitudesList.filter(s => s.EstatusValidacion === 1).length,
          pagosPendientes: pagosList.filter(p => (p.EstatusPagoId || p.EstatusValidacion) === 2).length,
          totalIngreso: totalIngreso,
          equipos: solicitudesList.filter(s => s.EstatusValidacion === 2).length,
          jugadoresActivos: jugadoresList.filter(j => j.Estatus === true).length
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div style={{ width: '48px', height: '48px', background: bg, color, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
          {icon}
        </div>
        {badge && <span className="data-fira" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: badge.color, background: badge.bg, padding: '4px 10px', borderRadius: '20px', height: 'fit-content' }}>{badge.text}</span>}
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
            Bienvenido, Administrador. Visualiza estadísticas en tiempo real.
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
          badge={{ text: 'Revisar', color: 'var(--primary)', bg: 'rgba(37,99,235,0.08)' }}
        />

        {/* STAT 2: PAGOS PENDIENTES */}
        <StatCard
          icon={<FaMoneyBillWave />}
          bg="rgba(245, 158, 11, 0.1)"
          color="var(--warning)"
          label="Pagos Pendientes"
          val={statsData.pagosPendientes}
          ruta="/admin/pagos"
          badge={{ text: 'Validar', color: 'var(--warning)', bg: 'rgba(245,158,11,0.08)' }}
        />

        {/* CHART: RECAUDACIÓN (2x2) */}
        <div className="card glass" style={{ gridColumn: 'span 2', gridRow: 'span 2', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px', background: 'radial-gradient(circle, var(--primary) 0%, transparent 60%)', opacity: 0.05, borderRadius: '50%', pointerEvents: 'none' }}></div>

          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
            <div>
              <h3 className="heading-outfit" style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Ingresos del Mes</h3>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '350px' }}>
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

          <div style={{ flex: 1, minHeight: '220px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Ingresos', value: mesSeleccionadoData?.ingresos || 0 },
                    { name: 'Vacio', value: (mesSeleccionadoData?.ingresos || 0) > 0 ? 0 : 1 }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={90}
                  outerRadius={120}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                  stroke="none"
                  cornerRadius={12}
                >
                  <Cell fill="var(--primary)" />
                  <Cell fill="rgba(0,0,0,0.03)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>
                {mesFiltro}
              </div>
              <div className="data-fira" style={{ fontSize: '40px', fontWeight: '800', color: 'var(--primary)', lineHeight: '1', textShadow: '0 4px 12px rgba(11, 78, 166, 0.15)' }}>
                ${(mesSeleccionadoData?.ingresos || 0).toLocaleString()}
              </div>
            </div>
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
        />

        {/* STAT 4: JUGADORES ACTIVOS */}
        <StatCard
          icon={<FaUsers />}
          bg="rgba(139, 92, 246, 0.1)"
          color="#8b5cf6"
          label="Jugadores Activos"
          val={statsData.jugadoresActivos ?? 'N/D'}
          ruta="/admin/jugadores"
        />



      </div>
    </div>
  );
};

export default AdminDashboard;
