import React, { useState, useEffect } from 'react';
import { getJugadoresDirectorio, getEquiposDirectorio } from '../../services/admin';
import { FaSyncAlt, FaCopy, FaCheck, FaFilter } from 'react-icons/fa';
import { useSearchParams } from 'react-router-dom';
import SearchBar from '../../components/Common/SearchBar';

export default function AdminLayoutJugadores() {
  const [jugadores, setJugadores] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchParams] = useSearchParams();
  const [filtroEquipo, setFiltroEquipo] = useState(searchParams.get('equipo') || 'todos');
  const [copiedCell, setCopiedCell] = useState(null);

  const fetchData = async (forceRefresh = false) => {
    setLoading(true);
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
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
      result = result.filter(j => String(j.EquipoId) === filtroEquipo);
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
          color: '#1e293b',
          cursor: value ? 'pointer' : 'default',
          borderBottom: '1px solid #f1f5f9',
          transition: 'background 0.15s',
          whiteSpace: 'nowrap',
          maxWidth: '200px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          background: isCopied ? '#eff6ff' : 'transparent',
          fontFamily: id?.includes('curp') ? 'monospace' : 'inherit',
          position: 'relative',
        }}
        onMouseEnter={e => { if (value) e.currentTarget.style.background = '#f8fafc'; }}
        onMouseLeave={e => { if (!isCopied) e.currentTarget.style.background = 'transparent'; }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {value || <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>—</span>}
          {isCopied && <FaCheck style={{ color: '#10b981', fontSize: '10px', flexShrink: 0 }} />}
        </span>
      </td>
    );
  };

  return (
    <div className="dashboard-content">
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b', margin: 0 }}>
            Layout de Jugadores
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b' }}>
            Haz clic en cualquier dato para copiarlo al portapapeles.
          </p>
        </div>
        <button
          onClick={() => fetchData(true)} // Recarga asíncrona en lugar de reload()
          style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', color: '#334155' }}
        >
          <FaSyncAlt />
        </button>
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
          <FaFilter style={{ color: '#94a3b8', fontSize: '12px' }} />
          <select
            value={filtroEquipo}
            onChange={(e) => setFiltroEquipo(e.target.value)}
            style={{
              padding: '8px 16px', borderRadius: '10px', border: '1.5px solid #e2e8f0',
              fontWeight: '700', fontSize: '13px', background: 'white', color: '#334155',
              cursor: 'pointer'
            }}
          >
            <option value="todos">Todos los equipos</option>
            {equipos.map(eq => (
              <option key={eq.EquipoId} value={String(eq.EquipoId)}>
                {eq.NombreEquipo}
              </option>
            ))}
          </select>
        </div>

        <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: 'auto' }}>
          {filteredJugadores.length} jugadores
        </span>
      </div>

      {/* TABLA */}
      <div className="card" style={{ padding: 0, overflowX: 'auto', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
            <p style={{ marginTop: '16px' }}>Cargando jugadores...</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['#', 'Nombre completo', 'CURP', 'Sexo', 'Equipo', 'Liga', 'Email', 'Fecha Nac.', 'NUI'].map(col => (
                  <th key={col} style={{ padding: '12px 14px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: '#64748b', textAlign: 'left', whiteSpace: 'nowrap' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredJugadores.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    No se encontraron jugadores con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredJugadores.map((j, idx) => (
                  <tr key={j.MiembroEquipoId} style={{ borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <CeldaCopia value={String(j.MiembroEquipoId)} id={`id-${idx}`} />
                    <CeldaCopia value={j.NombreCompleto} id={`nombre-${idx}`} />
                    <CeldaCopia value={j.CURP} id={`curp-${idx}`} />
                    <CeldaCopia value={j.Sexo} id={`sexo-${idx}`} />
                    <CeldaCopia value={j.EquipoNombre} id={`equipo-${idx}`} />
                    <CeldaCopia value={j.Liga} id={`liga-${idx}`} />
                    <CeldaCopia value={j.Email} id={`email-${idx}`} />
                    <CeldaCopia value={j.FechaNacimiento ? new Date(j.FechaNacimiento).toLocaleDateString('es-MX') : null} id={`fnac-${idx}`} />
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: '12px', color: '#cbd5e1', fontStyle: 'italic' }}>—</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <p style={{ marginTop: '16px', fontSize: '12px', color: '#cbd5e1', textAlign: 'center' }}>
        💡 Tip: Clic en cualquier celda para copiar el dato al portapapeles. La columna NUI se llena cuando el backend asigne el identificador.
      </p>
    </div>
  );
}
