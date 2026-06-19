import React, { useEffect, useState } from 'react';
import { 
  getMetricasMaster, 
  getReporteMensualMaster, 
  getReporteUsuarioMaster, 
  getReporteEntidadMaster, 
  getReporteDiarioMaster 
} from '../../services/admin';
import Loader from '../../components/Loader';
import { 
  FaChartPie, 
  FaUsers, 
  FaUserTie, 
  FaFutbol, 
  FaCreditCard, 
  FaClipboardList, 
  FaCalendarAlt, 
  FaUserCheck, 
  FaDatabase, 
  FaClock,
  FaFileAlt
} from 'react-icons/fa';

export default function ResumenesMaster() {
  const [metricas, setMetricas] = useState(null);
  const [mensual, setMensual] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [entidades, setEntidades] = useState([]);
  const [diario, setDiario] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMetricas, setLoadingMetricas] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const [mesSeleccionado, setMesSeleccionado] = useState(() => new Date().getMonth() + 1);
  const [anioSeleccionado, setAnioSeleccionado] = useState(() => new Date().getFullYear());

  const MESES = [
    { value: 1, label: "Enero" },
    { value: 2, label: "Febrero" },
    { value: 3, label: "Marzo" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Mayo" },
    { value: 6, label: "Junio" },
    { value: 7, label: "Julio" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Septiembre" },
    { value: 10, label: "Octubre" },
    { value: 11, label: "Noviembre" },
    { value: 12, label: "Diciembre" }
  ];

  const ANIOS = Array.from({ length: 6 }, (_, i) => 2024 + i); // 2024 a 2029

  // Carga de reportes e históricos (Una sola vez)
  useEffect(() => {
    async function cargarDatosGenerales() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const [menResp, uResp, eResp, dResp] = await Promise.all([
          getReporteMensualMaster(),
          getReporteUsuarioMaster(10),
          getReporteEntidadMaster(),
          getReporteDiarioMaster(15) // últimos 15 días activos
        ]);
        setMensual(menResp);
        setUsuarios(uResp);
        setEntidades(eResp);
        setDiario(dResp);
      } catch (err) {
        console.error("Error al cargar reportes generales:", err);
        setErrorMsg("Ocurrió un error al obtener la información agregada del sistema.");
      } finally {
        setLoading(false);
      }
    }
    cargarDatosGenerales();
  }, []);

  // Carga de métricas KPI cada vez que cambia el mes o año seleccionado
  useEffect(() => {
    async function cargarMetricasFiltradas() {
      setLoadingMetricas(true);
      try {
        const resp = await getMetricasMaster(anioSeleccionado, mesSeleccionado);
        setMetricas(resp);
      } catch (err) {
        console.error("Error al cargar métricas por mes:", err);
      } finally {
        setLoadingMetricas(false);
      }
    }
    if (mesSeleccionado && anioSeleccionado) {
      cargarMetricasFiltradas();
    }
  }, [mesSeleccionado, anioSeleccionado]);

  if (loading) return <Loader text="Cargando análisis y resúmenes..." />;

  // Paleta de colores Premium
  const colorPrimary = '#3b82f6'; // Azul eléctrico
  const colorSuccess = '#10b981'; // Esmeralda
  const colorWarning = '#f59e0b'; // Ámbar
  const colorDanger = '#ef4444'; // Coral
  const colorInfo = '#8b5cf6'; // Violeta
  const colorDark = 'rgba(15, 23, 42, 0.95)'; // Black glass

  const formatMonthName = (m, y) => {
    const meses = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return `${meses[m - 1]} ${y}`;
  };

  return (
    <div className="fade-in" style={{ padding: '20px', color: '#e2e8f0', minHeight: '100vh', fontFamily: "'Outfit', sans-serif" }}>
      {/* HEADER SECTION */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#ffffff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.5px' }}>
          <FaChartPie style={{ color: colorPrimary, filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.5))' }} /> Panel de Resúmenes
        </h1>
        <p style={{ color: '#94a3b8', fontWeight: '500', fontSize: '15px' }}>
          Análisis del estado, actividad y crecimiento general de la plataforma AFAEM.
        </p>
      </div>

      {errorMsg && (
        <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'rgba(239, 68, 68, 0.15)', borderRadius: '12px', border: `1px solid ${colorDanger}`, color: '#fca5a5', fontSize: '14px' }}>
          {errorMsg}
        </div>
      )}

      {/* METRIC CARDS SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Métricas del Período
        </h3>

        {/* Filtro de Mes y Año en Español */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label htmlFor="select-mes-filtro" style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Filtrar por:
          </label>
          <select
            id="select-mes-filtro"
            value={mesSeleccionado}
            onChange={(e) => setMesSeleccionado(parseInt(e.target.value, 10))}
            style={{
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1.5px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              padding: '8px 12px',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '600',
              outline: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}
          >
            {MESES.map((m) => (
              <option key={m.value} value={m.value} style={{ background: '#0f172a' }}>
                {m.label}
              </option>
            ))}
          </select>

          <select
            id="select-anio-filtro"
            value={anioSeleccionado}
            onChange={(e) => setAnioSeleccionado(parseInt(e.target.value, 10))}
            style={{
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1.5px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              padding: '8px 12px',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '600',
              outline: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}
          >
            {ANIOS.map((y) => (
              <option key={y} value={y} style={{ background: '#0f172a' }}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        
        {/* Presidentes */}
        <div style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.06)', transition: 'transform 0.2s' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(59, 130, 246, 0.15)', color: colorPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
            <FaUserTie />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '1px' }}>Presidentes</div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>
              {loadingMetricas ? '...' : (metricas?.presidentes_mes ?? 0)}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Nuevos registros en el mes</div>
          </div>
        </div>

        {/* Entrenadores */}
        <div style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.06)' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(139, 92, 246, 0.15)', color: colorInfo, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
            <FaUserCheck />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '1px' }}>Entrenadores</div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>
              {loadingMetricas ? '...' : (metricas?.entrenadores_mes ?? 0)}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Nuevos registros en el mes</div>
          </div>
        </div>

        {/* Equipos */}
        <div style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.06)' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(245, 158, 11, 0.15)', color: colorWarning, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
            <FaFutbol />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '1px' }}>Equipos</div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>
              {loadingMetricas ? '...' : (metricas?.equipos_mes ?? 0)}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Creados en el mes</div>
          </div>
        </div>

        {/* Jugadores */}
        <div style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.06)' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.15)', color: colorSuccess, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
            <FaUsers />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '1px' }}>Jugadores</div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>
              {loadingMetricas ? '...' : (metricas?.jugadores_mes ?? 0)}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Afiliados en el mes</div>
          </div>
        </div>

        {/* Pagos Aprobados */}
        <div style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.06)' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(239, 68, 68, 0.15)', color: colorDanger, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
            <FaCreditCard />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '1px' }}>Pagos Aprobados</div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>
              {loadingMetricas ? '...' : (metricas?.pagos_aprobados_mes ?? 0)}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Órdenes validadas este mes</div>
          </div>
        </div>

        {/* Solicitudes Enviadas */}
        <div style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.06)' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.15)', color: colorSuccess, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
            <FaClipboardList />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '1px' }}>Solicitudes</div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>
              {loadingMetricas ? '...' : (metricas?.solicitudes_enviadas_mes ?? 0)}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Enviadas para revisión este mes</div>
          </div>
        </div>

        {/* Documentos Subidos */}
        <div style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.06)' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(139, 92, 246, 0.15)', color: colorInfo, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
            <FaFileAlt />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '1px' }}>Documentos</div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>
              {loadingMetricas ? '...' : (metricas?.documentos_subidos_mes ?? 0)}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Subidos en el mes</div>
          </div>
        </div>

      </div>

      {/* DETALLE Y REPORTES SECTION */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px', marginBottom: '40px' }}>
        
        {/* Historial Mensual de Crecimiento (Phase 3 - Reporte 1) */}
        <div style={{ background: colorDark, border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '32px', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)' }}>
          <h4 style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FaCalendarAlt style={{ color: colorPrimary }} /> Crecimiento Histórico Mensual
          </h4>
          <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '24px' }}>
            Registros de nuevas afiliaciones creadas por mes y año agregados desde la base de datos de auditoría.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255, 255, 255, 0.1)' }}>
                  <th style={{ padding: '12px', color: '#ffffff', fontWeight: '800' }}>Periodo</th>
                  <th style={{ padding: '12px', color: colorPrimary, fontWeight: '800' }}>Presidentes</th>
                  <th style={{ padding: '12px', color: colorInfo, fontWeight: '800' }}>Entrenadores</th>
                  <th style={{ padding: '12px', color: colorWarning, fontWeight: '800' }}>Equipos</th>
                  <th style={{ padding: '12px', color: colorSuccess, fontWeight: '800' }}>Jugadores</th>
                </tr>
              </thead>
              <tbody>
                {mensual.length > 0 ? (
                  mensual.map((m, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '14px 12px', fontWeight: '700', color: '#ffffff' }}>{formatMonthName(m.mes, m.anio)}</td>
                      <td style={{ padding: '14px 12px', fontWeight: '600' }}>{m.presidentes}</td>
                      <td style={{ padding: '14px 12px', fontWeight: '600' }}>{m.entrenadores}</td>
                      <td style={{ padding: '14px 12px', fontWeight: '600' }}>{m.equipos}</td>
                      <td style={{ padding: '14px 12px', fontWeight: '600' }}>{m.jugadores}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ padding: '20px 12px', color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>No hay datos suficientes de crecimiento mensual.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '30px', marginBottom: '40px' }}>
        
        {/* Actividad por Usuario (Phase 3 - Reporte 2) */}
        <div style={{ background: colorDark, border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '30px', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)' }}>
          <h4 style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FaClock style={{ color: colorInfo }} /> Actividad Reciente por Usuario
          </h4>
          <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px' }}>
            Total de acciones registradas por usuario (creaciones, modificaciones y eliminaciones).
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {usuarios.length > 0 ? (
              usuarios.map((u, idx) => {
                // Calcular porcentaje visual relativo al usuario más activo (primero en la lista)
                const maxAcciones = usuarios[0]?.acciones || 1;
                const porcentaje = (u.acciones / maxAcciones) * 100;
                return (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '700', color: '#ffffff' }}>{u.usuario}</span>
                      <span style={{ fontWeight: '800', color: colorInfo }}>{u.acciones} acciones</span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${porcentaje}%`, height: '100%', background: `linear-gradient(90deg, ${colorInfo}, ${colorPrimary})`, borderRadius: '4px', transition: 'width 1s ease-out' }}></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <span style={{ color: '#64748b', fontStyle: 'italic' }}>No hay registros de actividad.</span>
            )}
          </div>
        </div>

        {/* Actividad por Entidad (Phase 3 - Reporte 3) */}
        <div style={{ background: colorDark, border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '30px', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)' }}>
          <h4 style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FaDatabase style={{ color: colorWarning }} /> Actividad por Entidad
          </h4>
          <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px' }}>
            Distribución de las acciones de auditoría agrupadas por la tabla afectada en el sistema.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {entidades.length > 0 ? (
              entidades.map((e, idx) => {
                const maxAcciones = entidades[0]?.acciones || 1;
                const porcentaje = (e.acciones / maxAcciones) * 100;
                return (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '700', color: '#ffffff' }}>{e.entidad}</span>
                      <span style={{ fontWeight: '800', color: colorWarning }}>{e.acciones} logs</span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${porcentaje}%`, height: '100%', background: `linear-gradient(90deg, ${colorWarning}, #f97316)`, borderRadius: '4px' }}></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <span style={{ color: '#64748b', fontStyle: 'italic' }}>No hay registros de entidades.</span>
            )}
          </div>
        </div>

      </div>

      {/* Actividad Diaria (Phase 3 - Reporte 4) */}
      <div style={{ background: colorDark, border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '32px', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)', marginBottom: '40px' }}>
        <h4 style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FaCalendarAlt style={{ color: colorSuccess }} /> Frecuencia de Actividad Diaria
        </h4>
        <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '30px' }}>
          Cantidad de transacciones registradas por día en el sistema durante el último periodo de actividad.
        </p>

        {/* Gráfico Simple de Barras en CSS Puro */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '180px', gap: '12px', paddingBottom: '10px', borderBottom: '1.5px solid rgba(255,255,255,0.1)', overflowX: 'auto' }}>
          {diario.length > 0 ? (
            diario.map((d, idx) => {
              const maxAcciones = Math.max(...diario.map(x => x.acciones), 1);
              const altura = (d.acciones / maxAcciones) * 140; // max 140px
              const shortDate = d.fecha.substring(5); // MM-DD
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: '35px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: colorSuccess, marginBottom: '6px' }}>{d.acciones}</div>
                  <div style={{ width: '100%', height: `${altura}px`, background: `linear-gradient(180deg, ${colorSuccess}, rgba(16, 185, 129, 0.3))`, borderRadius: '4px 4px 0 0', position: 'relative' }} title={`Fecha: ${d.fecha}\nAcciones: ${d.acciones}`}></div>
                  <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '700', marginTop: '8px' }}>{shortDate}</div>
                </div>
              );
            })
          ) : (
            <div style={{ width: '100%', textAlign: 'center', padding: '50px 0', color: '#64748b', fontStyle: 'italic' }}>No hay registros diarios suficientes.</div>
          )}
        </div>
      </div>

    </div>
  );
}
