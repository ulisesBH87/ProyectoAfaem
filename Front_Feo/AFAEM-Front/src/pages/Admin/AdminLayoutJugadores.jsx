import React, { useState, useEffect } from 'react';
import { getJugadoresDirectorio, getEquiposDirectorio } from '../../services/admin';
import { FaSyncAlt, FaCopy, FaCheck, FaFilter, FaUsers } from 'react-icons/fa';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../routes/paths';
import SearchBar from '../../components/Common/SearchBar';
import Loader from '../../components/Loader';
import COLORS from '../../styles/colors';

export default function AdminLayoutJugadores() {
  const [jugadores, setJugadores] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchParams] = useSearchParams();
  const [filtroEquipo, setFiltroEquipo] = useState(searchParams.get('equipo') || 'todos');
  const [copiedCell, setCopiedCell] = useState(null);
  const navigate = useNavigate();

  const fetchData = async (forceRefresh = false, isTableOnly = false) => {
    if (isTableOnly) {
      setTableLoading(true);
    } else {
      setLoading(true);
    }
    try {
      const [j, e] = await Promise.all([
        getJugadoresDirectorio(forceRefresh),
        getEquiposDirectorio(forceRefresh)
      ]);
      setJugadores(j || []);
      setEquipos(e || []);
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sincronizar filtro con la URL
  useEffect(() => {
    const q = searchParams.get('equipo');
    if (q) {
      setFiltroEquipo(q);
    } else {
      setFiltroEquipo('todos');
    }
  }, [searchParams]);

  const handleCopy = (text, cellId) => {
    if (!text || text === '—') return;
    navigator.clipboard.writeText(String(text)).then(() => {
      setCopiedCell(cellId);
      setTimeout(() => setCopiedCell(null), 1500);
    });
  };

  const filteredJugadores = React.useMemo(() => {
    let result = [...jugadores];
    if (filtroEquipo !== 'todos') {
      result = result.filter(j => j.EquipoNombre === filtroEquipo);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(j =>
        (j.NombreCompleto && j.NombreCompleto.toLowerCase().includes(q)) ||
        (j.CURP && j.CURP.toLowerCase().includes(q)) ||
        (j.EquipoNombre && j.EquipoNombre.toLowerCase().includes(q))
      );
    }
    return result;
  }, [jugadores, filtroEquipo, searchTerm]);

  const CeldaCopia = ({ value, id }) => {
    const isCopied = copiedCell === id;
    return (
      <td
        onClick={() => handleCopy(value, id)}
        title={value ? `Clic para copiar: ${value}` : 'Sin valor'}
        style={{
          padding: '10px 12px',
          fontSize: '12px',
          color: COLORS.slate800,
          cursor: value ? 'pointer' : 'default',
          borderBottom: `1px solid ${COLORS.slate100}`,
          transition: 'background 0.15s',
          whiteSpace: 'nowrap',
          maxWidth: '200px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          background: isCopied ? COLORS.secondaryBg : 'transparent',
          fontFamily: id?.includes('curp') ? 'monospace' : 'inherit',
          position: 'relative',
        }}
        onMouseEnter={e => { if (value) e.currentTarget.style.background = COLORS.slate50; }}
        onMouseLeave={e => { if (!isCopied) e.currentTarget.style.background = 'transparent'; }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {value || <span style={{ color: COLORS.slate300, fontStyle: 'italic' }}>—</span>}
          {isCopied && <FaCheck style={{ color: COLORS.success, fontSize: '10px', flexShrink: 0 }} />}
        </span>
      </td>
    );
  };

  if (loading && !tableLoading) {
    return <Loader text="Cargando layout de jugadores..." />;
  }

  return (
    <div className="dashboard-content">
      <div className="admin-dashboard-header" style={{ marginBottom: '28px' }}>
        <div>
          <h2 style={{ fontSize: 'clamp(20px, 5vw, 24px)', fontWeight: '800', color: COLORS.slate800, margin: 0 }}>
            Layout de Jugadores
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 'clamp(12px, 3.5vw, 14px)', color: COLORS.slate500 }}>
            Haz clic en cualquier dato para copiarlo al portapapeles.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => fetchData(true, true)}
            className="btn-premium"
            style={{ padding: '10px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: tableLoading ? 'not-allowed' : 'pointer' }}
          >
            <FaSyncAlt style={{ animation: tableLoading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <button
            onClick={() => navigate(ROUTES.ADMIN.JUGADORES)}
            style={{ padding: '10px 20px', backgroundColor: 'white', color: COLORS.slate700, border: `1.5px solid ${COLORS.slate200}`, borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FaUsers /> Catálogo de jugadores
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchBar
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Nombre, CURP o equipo..."
          width="280px"
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaFilter style={{ color: COLORS.slate400, fontSize: '12px' }} />
          <select
            value={filtroEquipo}
            onChange={(e) => setFiltroEquipo(e.target.value)}
            style={{
              padding: '8px 16px', borderRadius: '10px', border: `1.5px solid ${COLORS.slate200}`,
              fontWeight: '700', fontSize: '13px', background: 'white', color: COLORS.slate700,
              cursor: 'pointer'
            }}
          >
            <option value="todos">Todos los equipos</option>
            {equipos.map(eq => (
              <option key={eq.EquipoId} value={eq.EquipoI}>
                {eq.NombreEquipo}
              </option>
            ))}
          </select>
        </div>

        <span style={{ fontSize: '12px', color: COLORS.slate400, marginLeft: 'auto' }}>
          {filteredJugadores.length} jugadores
        </span>
      </div>

      {/* TABLA */}
      <div className="card" style={{ padding: 0, overflowX: 'auto', borderRadius: '16px', boxShadow: `0 4px 12px ${COLORS.shadow05}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
          <thead>
            <tr style={{ background: COLORS.slate50, borderBottom: `2px solid ${COLORS.slate200}` }}>
              {['#', 'Nombre completo', 'CURP', 'Sexo', 'Equipo', 'Liga', 'Email', 'Fecha Nac.', 'NUI'].map(col => (
                <th key={col} style={{ padding: '12px 14px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: COLORS.slate500, textAlign: 'left', whiteSpace: 'nowrap' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredJugadores.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: COLORS.slate400 }}>
                  No se encontraron jugadores con los filtros actuales.
                </td>
              </tr>
            ) : (
              filteredJugadores.map((j, idx) => (
                <tr key={j.MiembroEquipoId} style={{ borderBottom: `1px solid ${COLORS.slate100}` }}
                  onMouseEnter={e => e.currentTarget.style.background = COLORS.neutral50}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <CeldaCopia value={String(j.MiembroEquipoId)} id={`id-${idx}`} />
                  <CeldaCopia value={j.NombreCompleto} id={`nombre-${idx}`} />
                  <CeldaCopia value={j.CURP} id={`curp-${idx}`} />
                  <CeldaCopia value={j.Sexo} id={`sexo-${idx}`} />
                  <CeldaCopia value={j.EquipoNombre} id={`equipo-${idx}`} />
                  <CeldaCopia value={j.Liga} id={`liga-${idx}`} />
                  <CeldaCopia value={j.Email} id={`email-${idx}`} />
                  <CeldaCopia value={j.FechaNacimiento ? new Date(j.FechaNacimiento).toLocaleDateString('es-MX', { timeZone: 'UTC' }) : null} id={`fnac-${idx}`} />
                  <CeldaCopia value={j.NUI} id={`nui-${idx}`} />
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: '16px', fontSize: '12px', color: COLORS.neutralSlate, textAlign: 'center' }}>
        💡 Clic en cualquier celda para copiar el dato al portapapeles.
      </p>
    </div>
  );
}
