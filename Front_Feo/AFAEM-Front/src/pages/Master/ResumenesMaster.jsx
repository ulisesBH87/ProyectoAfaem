import React, { useState, useEffect } from 'react';
import {
  FaChartPie,
  FaUserTie,
  FaUserCheck,
  FaUsers,
  FaFutbol,
  FaFileAlt,
  FaCalendarAlt,
  FaClock,
  FaDatabase,
  FaRedo
} from 'react-icons/fa';

import Loader from '../../components/Loader';
import { COLORS } from '../../styles/colors';
import {
  getMetricasMaster,
  getReporteMensualMaster,
  getReporteUsuarioMaster,
  getReporteEntidadMaster,
  getReporteDiarioMaster
} from '../../services/admin';

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

const ANIOS = [2025, 2026, 2027, 2028, 2029];

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
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Carga de reportes globales al inicio o por refresh
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
  }, [refreshTrigger]);

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
  }, [mesSeleccionado, anioSeleccionado, refreshTrigger]);

  const handleRecargar = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (loading) return <Loader text="Cargando análisis y resúmenes..." />;

  // Paleta de colores Premium
  const colorPrimary = COLORS.brandBlueLight;
  const colorSuccess = COLORS.success;
  const colorWarning = COLORS.warning;
  const colorInfo = COLORS.violet;

  const formatMonthName = (m, y) => {
    const meses = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return `${meses[m - 1]} ${y}`;
  };

  return (
    <div className="fade-in" style={{ padding: '20px', color: COLORS.slate700, minHeight: '100vh', fontFamily: "'Outfit', sans-serif" }}>
      {/* HEADER SECTION */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '900', color: COLORS.black, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.5px' }}>
          <FaChartPie style={{ color: colorPrimary, filter: `drop-shadow(0 0 10px ${COLORS.brandBlueLight20})` }} /> Panel de Resúmenes
        </h1>
        <p style={{ color: COLORS.slate500, fontWeight: '500', fontSize: '15px' }}>
          Análisis del estado, actividad y crecimiento del sistema AFAEM.
        </p>
      </div>

      {errorMsg && (
        <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: COLORS.dangerBgTranslucent, borderRadius: '12px', border: `1px solid ${COLORS.danger}`, color: COLORS.danger, fontSize: '14px', fontWeight: '600' }}>
          {errorMsg}
        </div>
      )}

      {/* PERIODO FILTER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '800', color: COLORS.black, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Métricas del Período
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label htmlFor="select-mes-filtro" style={{ fontSize: '12px', fontWeight: '700', color: COLORS.slate600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Filtrar por:
          </label>
          <select
            id="select-mes-filtro"
            value={mesSeleccionado}
            onChange={(e) => setMesSeleccionado(parseInt(e.target.value, 10))}
            style={{
              background: COLORS.white,
              border: `1.5px solid ${COLORS.slate300}`,
              borderRadius: '10px',
              padding: '8px 12px',
              color: COLORS.slate900,
              fontSize: '13px',
              fontWeight: '600',
              outline: 'none',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            {MESES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <select
            id="select-anio-filtro"
            value={anioSeleccionado}
            onChange={(e) => setAnioSeleccionado(parseInt(e.target.value, 10))}
            style={{
              background: COLORS.white,
              border: `1.5px solid ${COLORS.slate300}`,
              borderRadius: '10px',
              padding: '8px 12px',
              color: COLORS.slate900,
              fontSize: '13px',
              fontWeight: '600',
              outline: 'none',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            {ANIOS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <button
            onClick={handleRecargar}
            title="Recargar datos del período"
            disabled={loadingMetricas}
            style={{
              background: COLORS.white,
              border: `1.5px solid ${COLORS.slate300}`,
              borderRadius: '10px',
              padding: '8px 12px',
              color: COLORS.slate700,
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = colorPrimary; e.currentTarget.style.color = colorPrimary; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLORS.slate300; e.currentTarget.style.color = COLORS.slate700; }}
          >
            <FaRedo size={12} style={{ transition: 'transform 0.5s ease', transform: loadingMetricas ? 'rotate(360deg)' : 'none' }} /> Recargar
          </button>
        </div>
      </div>

      {/* METRIC CARDS SECTION */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        {/* Presidentes */}
        <div style={{ background: COLORS.white, border: `1px solid ${COLORS.shadow10}`, borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: `0 8px 32px 0 ${COLORS.shadow05}` }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: COLORS.brandBlueLight16, color: colorPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
            <FaUserTie />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: COLORS.slate600, textTransform: 'uppercase', letterSpacing: '1px' }}>Presidentes</div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: COLORS.slate900, marginTop: '2px' }}>
              {loadingMetricas ? '...' : (metricas?.presidentes_mes ?? 0)}
            </div>
            <div style={{ fontSize: '12px', color: COLORS.slate500, marginTop: '4px' }}>Nuevos registros en el mes</div>
          </div>
        </div>

        {/* Entrenadores */}
        <div style={{ background: COLORS.white, border: `1px solid ${COLORS.shadow10}`, borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: `0 8px 32px 0 ${COLORS.shadow05}` }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: COLORS.violetTranslucent15, color: colorInfo, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
            <FaUserCheck />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: COLORS.slate600, textTransform: 'uppercase', letterSpacing: '1px' }}>Entrenadores</div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: COLORS.slate900, marginTop: '2px' }}>
              {loadingMetricas ? '...' : (metricas?.entrenadores_mes ?? 0)}
            </div>
            <div style={{ fontSize: '12px', color: COLORS.slate500, marginTop: '4px' }}>Nuevos registros en el mes</div>
          </div>
        </div>

        {/* Equipos */}
        <div style={{ background: COLORS.white, border: `1px solid ${COLORS.shadow10}`, borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: `0 8px 32px 0 ${COLORS.shadow05}` }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: COLORS.warningBgTranslucent, color: colorWarning, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
            <FaFutbol />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: COLORS.slate600, textTransform: 'uppercase', letterSpacing: '1px' }}>Equipos</div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: COLORS.slate900, marginTop: '2px' }}>
              {loadingMetricas ? '...' : (metricas?.equipos_mes ?? 0)}
            </div>
            <div style={{ fontSize: '12px', color: COLORS.slate500, marginTop: '4px' }}>Creados en el mes</div>
          </div>
        </div>

        {/* Jugadores */}
        <div style={{ background: COLORS.white, border: `1px solid ${COLORS.shadow10}`, borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: `0 8px 32px 0 ${COLORS.shadow05}` }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: COLORS.successBgTranslucent, color: colorSuccess, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
            <FaUsers />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: COLORS.slate600, textTransform: 'uppercase', letterSpacing: '1px' }}>Jugadores</div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: COLORS.slate900, marginTop: '2px' }}>
              {loadingMetricas ? '...' : (metricas?.jugadores_mes ?? 0)}
            </div>
            <div style={{ fontSize: '12px', color: COLORS.slate500, marginTop: '4px' }}>Afiliados en el mes</div>
          </div>
        </div>

        {/* Documentos Subidos */}
        <div style={{ background: COLORS.white, border: `1px solid ${COLORS.shadow10}`, borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: `0 8px 32px 0 ${COLORS.shadow05}` }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: COLORS.violetTranslucent15, color: colorInfo, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
            <FaFileAlt />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: COLORS.slate600, textTransform: 'uppercase', letterSpacing: '1px' }}>Documentos</div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: COLORS.slate900, marginTop: '2px' }}>
              {loadingMetricas ? '...' : (metricas?.documentos_subidos_mes ?? 0)}
            </div>
            <div style={{ fontSize: '12px', color: COLORS.slate500, marginTop: '4px' }}>Subidos en el mes</div>
          </div>
        </div>
      </div>

      {/* DETALLE Y REPORTES SECTION */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px', marginBottom: '40px' }}>
        {/* Historial Mensual de Crecimiento */}
        <div className="card" style={{ background: COLORS.white, border: `1px solid ${COLORS.slate200}`, borderRadius: '20px', padding: '32px', boxShadow: 'var(--shadow-md)' }}>
          <h4 style={{ fontSize: '18px', fontWeight: '800', color: COLORS.slate900, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FaCalendarAlt style={{ color: colorPrimary }} /> Crecimiento Histórico Mensual
          </h4>
          <p style={{ color: COLORS.slate500, fontSize: '13px', marginBottom: '24px' }}>
            Registros de nuevas afiliaciones creadas por mes y año agregados desde la base de datos de auditoría.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${COLORS.slate200}` }}>
                  <th style={{ padding: '12px', color: COLORS.slate900, fontWeight: '800' }}>Periodo</th>
                  <th style={{ padding: '12px', color: colorPrimary, fontWeight: '800' }}>Presidentes</th>
                  <th style={{ padding: '12px', color: colorInfo, fontWeight: '800' }}>Entrenadores</th>
                  <th style={{ padding: '12px', color: colorWarning, fontWeight: '800' }}>Equipos</th>
                  <th style={{ padding: '12px', color: colorSuccess, fontWeight: '800' }}>Jugadores</th>
                </tr>
              </thead>
              <tbody>
                {mensual.length > 0 ? (
                  mensual.map((m, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${COLORS.slate100}`, transition: 'background-color 0.2s' }} className="table-row-hover">
                      <td style={{ padding: '14px 12px', fontWeight: '700', color: COLORS.slate900 }}>{formatMonthName(m.mes, m.anio)}</td>
                      <td style={{ padding: '14px 12px', fontWeight: '600', color: COLORS.slate700 }}>{m.presidentes}</td>
                      <td style={{ padding: '14px 12px', fontWeight: '600', color: COLORS.slate700 }}>{m.entrenadores}</td>
                      <td style={{ padding: '14px 12px', fontWeight: '600', color: COLORS.slate700 }}>{m.equipos}</td>
                      <td style={{ padding: '14px 12px', fontWeight: '600', color: COLORS.slate700 }}>{m.jugadores}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ padding: '20px 12px', color: COLORS.slate500, fontStyle: 'italic', textAlign: 'center' }}>No hay datos suficientes de crecimiento mensual.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '30px', marginBottom: '40px' }}>
        {/* Actividad por Usuario */}
        <div className="card" style={{ background: COLORS.white, border: `1px solid ${COLORS.slate200}`, borderRadius: '20px', padding: '30px', boxShadow: 'var(--shadow-md)' }}>
          <h4 style={{ fontSize: '18px', fontWeight: '800', color: COLORS.slate900, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FaClock style={{ color: colorInfo }} /> Actividad Reciente por Usuario
          </h4>
          <p style={{ color: COLORS.slate500, fontSize: '13px', marginBottom: '20px' }}>
            Total de acciones registradas por usuario (creaciones, modificaciones y eliminaciones).
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {usuarios.length > 0 ? (
              usuarios.map((u, idx) => {
                const maxAcciones = usuarios[0]?.acciones || 1;
                const porcentaje = (u.acciones / maxAcciones) * 100;
                return (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '700', color: COLORS.slate900 }}>{u.usuario}</span>
                      <span style={{ fontWeight: '800', color: COLORS.secondaryHover }}>{u.acciones} acciones</span>
                    </div>
                    <div style={{ height: '8px', background: COLORS.slate100, borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${porcentaje}%`, height: '100%', background: `linear-gradient(90deg, ${colorInfo}, ${colorPrimary})`, borderRadius: '4px', transition: 'width 1s ease-out' }}></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <span style={{ color: COLORS.slate500, fontStyle: 'italic' }}>No hay registros de actividad.</span>
            )}
          </div>
        </div>

        {/* Actividad por Entidad */}
        <div className="card" style={{ background: COLORS.white, border: `1px solid ${COLORS.slate200}`, borderRadius: '20px', padding: '30px', boxShadow: 'var(--shadow-md)' }}>
          <h4 style={{ fontSize: '18px', fontWeight: '800', color: COLORS.slate900, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FaDatabase style={{ color: colorWarning }} /> Actividad por Entidad
          </h4>
          <p style={{ color: COLORS.slate500, fontSize: '13px', marginBottom: '20px' }}>
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
                      <span style={{ fontWeight: '700', color: COLORS.slate900 }}>{e.entidad}</span>
                      <span style={{ fontWeight: '800', color: COLORS.orangeDarker }}>{e.acciones} logs</span>
                    </div>
                    <div style={{ height: '8px', background: COLORS.slate100, borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${porcentaje}%`, height: '100%', background: `linear-gradient(90deg, ${colorWarning}, ${COLORS.orangeDark})`, borderRadius: '4px' }}></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <span style={{ color: COLORS.slate500, fontStyle: 'italic' }}>No hay registros de entidades.</span>
            )}
          </div>
        </div>
      </div>

      {/* Actividad Diaria */}
      <div className="card" style={{ background: COLORS.white, border: `1px solid ${COLORS.slate200}`, borderRadius: '20px', padding: '32px', boxShadow: 'var(--shadow-md)', marginBottom: '40px' }}>
        <h4 style={{ fontSize: '18px', fontWeight: '800', color: COLORS.slate900, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FaCalendarAlt style={{ color: colorSuccess }} /> Frecuencia de Actividad Diaria
        </h4>
        <p style={{ color: COLORS.slate500, fontSize: '13px', marginBottom: '30px' }}>
          Cantidad de transacciones registradas por día en el sistema durante el último periodo de actividad.
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '180px', gap: '12px', paddingBottom: '10px', borderBottom: `1.5px solid ${COLORS.slate200}`, overflowX: 'auto' }}>
          {diario.length > 0 ? (
            diario.map((d, idx) => {
              const maxAcciones = Math.max(...diario.map(x => x.acciones), 1);
              const altura = (d.acciones / maxAcciones) * 140; // max 140px
              const shortDate = d.fecha.substring(5); // MM-DD
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: '35px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: COLORS.successDarker, marginBottom: '6px' }}>{d.acciones}</div>
                  <div style={{ width: '100%', height: `${altura}px`, background: `linear-gradient(180deg, ${colorSuccess}, ${COLORS.successBgTranslucent30})`, borderRadius: '4px 4px 0 0', position: 'relative' }} title={`Fecha: ${d.fecha}\nAcciones: ${d.acciones}`}></div>
                  <div style={{ fontSize: '9px', color: COLORS.slate500, fontWeight: '700', marginTop: '8px' }}>{shortDate}</div>
                </div>
              );
            })
          ) : (
            <div style={{ width: '100%', textAlign: 'center', padding: '50px 0', color: COLORS.slate500, fontStyle: 'italic' }}>No hay registros diarios suficientes.</div>
          )}
        </div>
      </div>
    </div>
  );
}
