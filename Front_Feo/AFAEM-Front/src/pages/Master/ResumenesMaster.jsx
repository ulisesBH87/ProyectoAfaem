import COLORS from '../../styles/colors';
import React, { useEffect, useState } from 'react';
import { 
  getMetricasMaster, 
  getReporteMensualMaster, 
  getReporteUsuarioMaster, 
  getReporteEntidadMaster, 
  getReporteDiarioMaster,
  getConsumoResumen,
  getConsumoLedger
} from '../../services/admin';
import Loader from '../../components/Loader';
import { 
  FaChartPie, 
  FaUsers, 
  FaUserTie, 
  FaFutbol, 
  FaCalendarAlt, 
  FaUserCheck, 
  FaDatabase, 
  FaClock,
  FaFileAlt,
  FaCoins,
  FaReceipt,
  FaFilter,
  FaRedo
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

  const [activeTab, setActiveTab] = useState('sistema');
  const [consumoResumen, setConsumoResumen] = useState(null);
  const [consumoLedger, setConsumoLedger] = useState([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerSize] = useState(10);
  const [loadingConsumo, setLoadingConsumo] = useState(false);
  const [filtroTipoConsumo, setFiltroTipoConsumo] = useState('');
  const [filtroTipoRegistro, setFiltroTipoRegistro] = useState('');
  const [filtroEsCobrable, setFiltroEsCobrable] = useState('todos');

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

  useEffect(() => {
    async function cargarConsumo() {
      if (activeTab !== 'consumo') return;
      setLoadingConsumo(true);
      try {
        const fechaInicio = `${anioSeleccionado}-${String(mesSeleccionado).padStart(2, '0')}-01`;
        const ultimoDia = new Date(anioSeleccionado, mesSeleccionado, 0).getDate();
        const fechaFin = `${anioSeleccionado}-${String(mesSeleccionado).padStart(2, '0')}-${ultimoDia}`;
        
        const resumenResp = await getConsumoResumen({ fecha_inicio: fechaInicio, fecha_fin: fechaFin });
        setConsumoResumen(resumenResp);
        
        const paramsLedger = {
          page: ledgerPage,
          size: ledgerSize,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin
        };
        if (filtroTipoConsumo) paramsLedger.tipo_consumo = filtroTipoConsumo;
        if (filtroTipoRegistro) paramsLedger.tipo_registro = filtroTipoRegistro;
        if (filtroEsCobrable === 'si') paramsLedger.es_cobrable = true;
        if (filtroEsCobrable === 'no') paramsLedger.es_cobrable = false;
        
        const ledgerResp = await getConsumoLedger(paramsLedger);
        setConsumoLedger(ledgerResp.data || []);
        setLedgerTotal(ledgerResp.total || 0);
      } catch (err) {
        console.error("Error al cargar datos de consumo:", err);
      } finally {
        setLoadingConsumo(false);
      }
    }
    cargarConsumo();
  }, [activeTab, mesSeleccionado, anioSeleccionado, ledgerPage, filtroTipoConsumo, filtroTipoRegistro, filtroEsCobrable]);

  if (loading) return <Loader text="Cargando análisis y resúmenes..." />;

  // Paleta de colores Premium
  const colorPrimary = COLORS.brandBlueLight; // Azul eléctrico
  const colorSuccess = COLORS.success; // Esmeralda
  const colorWarning = COLORS.warning; // Ámbar
  const colorDanger = COLORS.danger; // Coral
  const colorInfo = COLORS.violet; // Violeta
  const colorDark = COLORS.slate900; // Black glass

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
          Análisis del estado, actividad, crecimiento y costos generales de la plataforma AFAEM.
        </p>
      </div>

      {errorMsg && (
        <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: COLORS.dangerBgTranslucent, borderRadius: '12px', border: `1px solid ${colorDanger}`, color: COLORS.danger, fontSize: '14px', fontWeight: '600' }}>
          {errorMsg}
        </div>
      )}

      {/* TABS SELECTOR */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: `2px solid ${COLORS.slate200}`, paddingBottom: '12px', marginBottom: '24px' }}>
        <button 
          onClick={() => setActiveTab('sistema')} 
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'sistema' ? colorPrimary : 'transparent',
            color: activeTab === 'sistema' ? COLORS.white : COLORS.slate600,
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: activeTab === 'sistema' ? `0 4px 12px ${COLORS.brandBlueLight20}` : 'none'
          }}
        >
          <FaChartPie /> Métricas del Sistema
        </button>
        <button 
          onClick={() => setActiveTab('consumo')} 
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'consumo' ? colorSuccess : 'transparent',
            color: activeTab === 'consumo' ? COLORS.white : COLORS.slate600,
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: activeTab === 'consumo' ? `0 4px 12px ${COLORS.successBgTranslucent}` : 'none'
          }}
        >
          <FaCoins /> Contabilización de Consumo
        </button>
      </div>

      {/* PERIODO FILTER (SHARED FOR BOTH TABS) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '800', color: COLORS.black, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {activeTab === 'sistema' ? 'Métricas del Período' : 'Consumo y Cobros'}
        </h3>

        {/* Filtro de Mes y Año en Español */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label htmlFor="select-mes-filtro" style={{ fontSize: '12px', fontWeight: '700', color: COLORS.slate600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Filtrar por:
          </label>
          <select
            id="select-mes-filtro"
            value={mesSeleccionado}
            onChange={(e) => {
              setMesSeleccionado(parseInt(e.target.value, 10));
              setLedgerPage(1);
            }}
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
            onChange={(e) => {
              setAnioSeleccionado(parseInt(e.target.value, 10));
              setLedgerPage(1);
            }}
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
        </div>
      </div>

      {activeTab === 'sistema' ? (
        <>
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
        </>
      ) : (
        <>
          {/* CONSUMPTION KPI CARDS SECTION */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            {/* Total Operaciones */}
            <div style={{ background: COLORS.white, border: `1px solid ${COLORS.shadow10}`, borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: `0 8px 32px 0 ${COLORS.shadow05}` }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: COLORS.brandBlueLight16, color: colorPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                <FaReceipt />
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: '700', color: COLORS.slate600, textTransform: 'uppercase', letterSpacing: '1px' }}>Total Consumos</div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: COLORS.slate900, marginTop: '2px' }}>
                  {loadingConsumo ? '...' : (consumoResumen?.total_operaciones ?? 0)}
                </div>
                <div style={{ fontSize: '11px', color: COLORS.slate500, marginTop: '2px' }}>Operaciones totales</div>
              </div>
            </div>

            {/* Costo Total */}
            <div style={{ background: COLORS.white, border: `1px solid ${COLORS.shadow10}`, borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: `0 8px 32px 0 ${COLORS.shadow05}` }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: COLORS.successBgTranslucent, color: colorSuccess, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                <FaCoins />
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: '700', color: COLORS.slate600, textTransform: 'uppercase', letterSpacing: '1px' }}>Costo Acumulado</div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: COLORS.slate900, marginTop: '2px' }}>
                  {loadingConsumo ? '...' : (consumoResumen?.costo_total ?? 0).toFixed(4)}
                </div>
                <div style={{ fontSize: '11px', color: COLORS.slate500, marginTop: '2px' }}>Valor Mixto (USD + MXN)</div>
              </div>
            </div>

            {/* OCR */}
            <div style={{ background: COLORS.white, border: `1px solid ${COLORS.shadow10}`, borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: `0 8px 32px 0 ${COLORS.shadow05}` }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: COLORS.violetTranslucent15, color: colorInfo, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                <FaFileAlt />
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: '700', color: COLORS.slate600, textTransform: 'uppercase', letterSpacing: '1px' }}>Costo OCR</div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: COLORS.slate900, marginTop: '2px' }}>
                  {loadingConsumo ? '...' : (consumoResumen?.costo_por_operacion?.OCR ?? 0).toFixed(4)}
                </div>
                <div style={{ fontSize: '11px', color: COLORS.slate500, marginTop: '2px' }}>USD</div>
              </div>
            </div>

            {/* Foto */}
            <div style={{ background: COLORS.white, border: `1px solid ${COLORS.shadow10}`, borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: `0 8px 32px 0 ${COLORS.shadow05}` }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: COLORS.warningBgTranslucent, color: colorWarning, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                <FaUsers />
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: '700', color: COLORS.slate600, textTransform: 'uppercase', letterSpacing: '1px' }}>Costo Fotos</div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: COLORS.slate900, marginTop: '2px' }}>
                  {loadingConsumo ? '...' : (consumoResumen?.costo_por_operacion?.PHOTO_SCAN ?? 0).toFixed(2)}
                </div>
                <div style={{ fontSize: '11px', color: COLORS.slate500, marginTop: '2px' }}>MXN</div>
              </div>
            </div>

            {/* VerificaMex */}
            <div style={{ background: COLORS.white, border: `1px solid ${COLORS.shadow10}`, borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: `0 8px 32px 0 ${COLORS.shadow05}` }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: COLORS.dangerBgTranslucent, color: colorDanger, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                <FaUserCheck />
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: '700', color: COLORS.slate600, textTransform: 'uppercase', letterSpacing: '1px' }}>Costo VerificaMex</div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: COLORS.slate900, marginTop: '2px' }}>
                  {loadingConsumo ? '...' : (consumoResumen?.costo_por_operacion?.VERIFICAMEX ?? 0).toFixed(2)}
                </div>
                <div style={{ fontSize: '11px', color: COLORS.slate500, marginTop: '2px' }}>MXN</div>
              </div>
            </div>
          </div>

          {/* FILTERS BAR FOR LEDGER */}
          <div style={{ background: COLORS.white, border: `1px solid ${COLORS.slate200}`, borderRadius: '16px', padding: '20px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', boxShadow: 'var(--shadow-sm)' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: COLORS.slate700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FaFilter /> Filtrar Ledger:
            </span>
            
            <select 
              value={filtroTipoConsumo} 
              onChange={(e) => { setFiltroTipoConsumo(e.target.value); setLedgerPage(1); }}
              style={{ background: COLORS.white, border: `1px solid ${COLORS.slate300}`, borderRadius: '8px', padding: '6px 12px', fontSize: '13px', fontWeight: '600', outline: 'none' }}
            >
              <option value="">Operación (Todas)</option>
              <option value="OCR">OCR</option>
              <option value="PHOTO_SCAN">Escaneo Foto</option>
              <option value="VERIFICAMEX">VerificaMex</option>
            </select>

            <select 
              value={filtroTipoRegistro} 
              onChange={(e) => { setFiltroTipoRegistro(e.target.value); setLedgerPage(1); }}
              style={{ background: COLORS.white, border: `1px solid ${COLORS.slate300}`, borderRadius: '8px', padding: '6px 12px', fontSize: '13px', fontWeight: '600', outline: 'none' }}
            >
              <option value="">Registro (Todos)</option>
              <option value="PRESIDENTE">Presidente</option>
              <option value="JUGADOR">Jugador</option>
              <option value="ENTRENADOR">Entrenador</option>
              <option value="OTRO">Otro</option>
            </select>

            <select 
              value={filtroEsCobrable} 
              onChange={(e) => { setFiltroEsCobrable(e.target.value); setLedgerPage(1); }}
              style={{ background: COLORS.white, border: `1px solid ${COLORS.slate300}`, borderRadius: '8px', padding: '6px 12px', fontSize: '13px', fontWeight: '600', outline: 'none' }}
            >
              <option value="todos">Cobrable (Todos)</option>
              <option value="si">Solo Cobrables</option>
              <option value="no">Solo No Cobrables</option>
            </select>

            <button
              onClick={() => {
                setFiltroTipoConsumo('');
                setFiltroTipoRegistro('');
                setFiltroEsCobrable('todos');
                setLedgerPage(1);
              }}
              style={{
                background: COLORS.slate100,
                border: `1px solid ${COLORS.slate300}`,
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                color: COLORS.slate700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FaRedo size={11} /> Restablecer
            </button>
          </div>

          {/* LEDGER DETAIL TABLE */}
          <div className="card" style={{ background: COLORS.white, border: `1px solid ${COLORS.slate200}`, borderRadius: '20px', padding: '24px', boxShadow: 'var(--shadow-md)', marginBottom: '30px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '800', color: COLORS.slate900, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FaReceipt style={{ color: colorSuccess }} /> Transacciones Ledger de Consumos (BitacoraConsumo)
            </h4>
            
            {loadingConsumo ? (
              <div style={{ padding: '40px', textAlign: 'center', color: COLORS.slate500, fontWeight: '600' }}>Cargando transacciones de consumo...</div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${COLORS.slate200}` }}>
                        <th style={{ padding: '10px', color: COLORS.slate900, fontWeight: '800' }}>Request ID</th>
                        <th style={{ padding: '10px', color: COLORS.slate900, fontWeight: '800' }}>Fecha</th>
                        <th style={{ padding: '10px', color: COLORS.slate900, fontWeight: '800' }}>Usuario / Sesión</th>
                        <th style={{ padding: '10px', color: COLORS.slate900, fontWeight: '800' }}>Operación</th>
                        <th style={{ padding: '10px', color: COLORS.slate900, fontWeight: '800' }}>Registro</th>
                        <th style={{ padding: '10px', color: COLORS.slate900, fontWeight: '800' }}>Estado Técnico</th>
                        <th style={{ padding: '10px', color: COLORS.slate900, fontWeight: '800' }}>Resultado</th>
                        <th style={{ padding: '10px', color: COLORS.slate900, fontWeight: '800' }}>Cobrable</th>
                        <th style={{ padding: '10px', color: COLORS.slate900, fontWeight: '800', textAlign: 'right' }}>Costo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consumoLedger.length > 0 ? (
                        consumoLedger.map((row) => {
                          const dateObj = new Date(row.CreadoEn);
                          const formattedDate = dateObj.toLocaleDateString('es-MX', { hour: '2-digit', minute: '2-digit' });
                          return (
                            <tr key={row.ConsumoId} style={{ borderBottom: `1px solid ${COLORS.slate100}` }}>
                              <td style={{ padding: '12px 10px', fontWeight: '700', color: COLORS.slate900 }} title={row.RequestId}>
                                {row.RequestId.substring(0, 8)}...
                              </td>
                              <td style={{ padding: '12px 10px', color: COLORS.slate600 }}>{formattedDate}</td>
                              <td style={{ padding: '12px 10px', color: COLORS.slate700 }}>
                                {row.UsuarioId ? `Usuario ID: ${row.UsuarioId}` : `Invitado: ${row.GuestId?.substring(0, 6) || row.SessionId?.substring(0, 6) || 'Anónimo'}...`}
                              </td>
                              <td style={{ padding: '12px 10px', fontWeight: '600', color: colorPrimary }}>{row.TipoConsumo}</td>
                              <td style={{ padding: '12px 10px', color: COLORS.slate700 }}>{row.TipoRegistro}</td>
                              <td style={{ padding: '12px 10px' }}>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: '800',
                                  backgroundColor: row.EstadoTecnico === 'EXITOSO' ? COLORS.successBgTranslucent30 : COLORS.dangerBgTranslucent,
                                  color: row.EstadoTecnico === 'EXITOSO' ? colorSuccess : colorDanger
                                }}>
                                  {row.EstadoTecnico}
                                </span>
                              </td>
                              <td style={{ padding: '12px 10px', color: COLORS.slate500 }} title={row.ResultadoProveedor}>
                                {row.ResultadoProveedor}
                              </td>
                              <td style={{ padding: '12px 10px', fontWeight: '700', color: row.EsCobrable ? colorSuccess : colorDanger }}>
                                {row.EsCobrable ? 'Sí' : 'No'}
                              </td>
                              <td style={{ padding: '12px 10px', fontWeight: '800', color: COLORS.slate900, textAlign: 'right' }}>
                                {parseFloat(row.CostoTotal).toFixed(4)} <span style={{ fontSize: '10px', color: COLORS.slate500 }}>{row.Divisa}</span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="9" style={{ padding: '20px 10px', color: COLORS.slate500, fontStyle: 'italic', textAlign: 'center' }}>No se encontraron transacciones en el Ledger.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* PAGINATION CONTROLS */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                  <span style={{ fontSize: '12px', color: COLORS.slate500, fontWeight: '600' }}>
                    Mostrando {consumoLedger.length} de {ledgerTotal} transacciones
                  </span>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setLedgerPage(prev => Math.max(prev - 1, 1))}
                      disabled={ledgerPage === 1}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: `1.5px solid ${COLORS.slate300}`,
                        background: COLORS.white,
                        cursor: ledgerPage === 1 ? 'not-allowed' : 'pointer',
                        color: ledgerPage === 1 ? COLORS.slate400 : COLORS.slate700,
                        fontSize: '12px',
                        fontWeight: '700',
                        outline: 'none'
                      }}
                    >
                      Anterior
                    </button>
                    
                    <span style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700', color: COLORS.slate900 }}>
                      Pág. {ledgerPage}
                    </span>
                    
                    <button
                      onClick={() => setLedgerPage(prev => prev + 1)}
                      disabled={ledgerPage * ledgerSize >= ledgerTotal}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: `1.5px solid ${COLORS.slate300}`,
                        background: COLORS.white,
                        cursor: ledgerPage * ledgerSize >= ledgerTotal ? 'not-allowed' : 'pointer',
                        color: ledgerPage * ledgerSize >= ledgerTotal ? COLORS.slate400 : COLORS.slate700,
                        fontSize: '12px',
                        fontWeight: '700',
                        outline: 'none'
                      }}
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* DISTRIBUTION CHARTS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px', marginBottom: '40px' }}>
            {/* Costo por Proveedor */}
            <div className="card" style={{ background: COLORS.white, border: `1px solid ${COLORS.slate200}`, borderRadius: '20px', padding: '24px', boxShadow: 'var(--shadow-md)' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '800', color: COLORS.slate900, marginBottom: '16px' }}>
                Costo por Proveedor
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {consumoResumen?.costo_por_proveedor && Object.keys(consumoResumen.costo_por_proveedor).length > 0 ? (
                  Object.entries(consumoResumen.costo_por_proveedor).map(([prov, costo], idx) => {
                    const maxVal = Math.max(...Object.values(consumoResumen.costo_por_proveedor), 1);
                    const porcentaje = (costo / maxVal) * 100;
                    return (
                      <div key={idx}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '700', color: COLORS.slate900 }}>{prov}</span>
                          <span style={{ fontWeight: '800', color: colorSuccess }}>{parseFloat(costo).toFixed(4)}</span>
                        </div>
                        <div style={{ height: '6px', background: COLORS.slate100, borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${porcentaje}%`, height: '100%', background: colorSuccess, borderRadius: '3px' }}></div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ color: COLORS.slate500, fontStyle: 'italic', fontSize: '13px' }}>No hay registros para este período.</div>
                )}
              </div>
            </div>

            {/* Operaciones por Registro */}
            <div className="card" style={{ background: COLORS.white, border: `1px solid ${COLORS.slate200}`, borderRadius: '20px', padding: '24px', boxShadow: 'var(--shadow-md)' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '800', color: COLORS.slate900, marginBottom: '16px' }}>
                Operaciones por Tipo Registro
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {consumoResumen?.operaciones_por_registro && Object.keys(consumoResumen.operaciones_por_registro).length > 0 ? (
                  Object.entries(consumoResumen.operaciones_por_registro).map(([reg, ops], idx) => {
                    const maxVal = Math.max(...Object.values(consumoResumen.operaciones_por_registro), 1);
                    const porcentaje = (ops / maxVal) * 100;
                    return (
                      <div key={idx}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '700', color: COLORS.slate900 }}>{reg}</span>
                          <span style={{ fontWeight: '800', color: colorInfo }}>{ops} ops</span>
                        </div>
                        <div style={{ height: '6px', background: COLORS.slate100, borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${porcentaje}%`, height: '100%', background: colorInfo, borderRadius: '3px' }}></div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ color: COLORS.slate500, fontStyle: 'italic', fontSize: '13px' }}>No hay registros para este período.</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
