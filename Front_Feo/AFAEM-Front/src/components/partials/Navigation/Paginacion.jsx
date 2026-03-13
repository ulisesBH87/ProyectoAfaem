import React from 'react';

/**
 * Componente Paginacion
 * Paginación reutilizable
 * 
 * @param {number} paginaActual - Página actual
 * @param {number} totalPaginas - Total de páginas
 * @param {function} alCambiarPagina - Callback al cambiar página
 * @param {boolean} deshabilitado - Deshabilitado
 */
export default function Paginacion({
  paginaActual = 1,
  totalPaginas = 1,
  alCambiarPagina,
  deshabilitado = false,
  estilo = {}
}) {
  const manejarAnterior = () => {
    if (paginaActual > 1 && !deshabilitado) {
      alCambiarPagina(paginaActual - 1);
    }
  };

  const manejarSiguiente = () => {
    if (paginaActual < totalPaginas && !deshabilitado) {
      alCambiarPagina(paginaActual + 1);
    }
  };

  const manejarClickPagina = (pagina) => {
    if (!deshabilitado) {
      alCambiarPagina(pagina);
    }
  };

  const obtenerNumerosPaginas = () => {
    const paginas = [];
    const maxVisibles = 5;
    
    if (totalPaginas <= maxVisibles) {
      for (let i = 1; i <= totalPaginas; i++) {
        paginas.push(i);
      }
    } else {
      if (paginaActual <= 3) {
        for (let i = 1; i <= 4; i++) paginas.push(i);
        paginas.push('...');
        paginas.push(totalPaginas);
      } else if (paginaActual >= totalPaginas - 2) {
        paginas.push(1);
        paginas.push('...');
        for (let i = totalPaginas - 3; i <= totalPaginas; i++) paginas.push(i);
      } else {
        paginas.push(1);
        paginas.push('...');
        for (let i = paginaActual - 1; i <= paginaActual + 1; i++) paginas.push(i);
        paginas.push('...');
        paginas.push(totalPaginas);
      }
    }
    
    return paginas;
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      margin: '24px 0',
      ...estilo
    }}>
      <button
        onClick={manejarAnterior}
        disabled={paginaActual === 1 || deshabilitado}
        style={{
          padding: '8px 12px',
          border: '1px solid #cbd5e1',
          borderRadius: '6px',
          backgroundColor: paginaActual === 1 || deshabilitado ? '#f1f5f9' : 'white',
          color: paginaActual === 1 || deshabilitado ? '#94a3b8' : '#0b4ea6',
          cursor: paginaActual === 1 || deshabilitado ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: '600',
          transition: 'all 0.2s ease'
        }}
      >
        ← Anterior
      </button>

      <div style={{ display: 'flex', gap: '4px', margin: '0 16px' }}>
        {obtenerNumerosPaginas().map((pagina, idx) => (
          pagina === '...' ? (
            <span key={`puntos-${idx}`} style={{
              padding: '8px 12px',
              color: '#94a3b8'
            }}>
              ...
            </span>
          ) : (
            <button
              key={pagina}
              onClick={() => manejarClickPagina(pagina)}
              disabled={deshabilitado}
              style={{
                padding: '8px 12px',
                border: pagina === paginaActual ? '2px solid #0b4ea6' : '1px solid #cbd5e1',
                borderRadius: '6px',
                backgroundColor: pagina === paginaActual ? '#dbeafe' : 'white',
                color: pagina === paginaActual ? '#0b4ea6' : '#1e293b',
                cursor: deshabilitado ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: pagina === paginaActual ? '700' : '600',
                transition: 'all 0.2s ease',
                minWidth: '40px'
              }}
            >
              {pagina}
            </button>
          )
        ))}
      </div>

      <button
        onClick={manejarSiguiente}
        disabled={paginaActual === totalPaginas || deshabilitado}
        style={{
          padding: '8px 12px',
          border: '1px solid #cbd5e1',
          borderRadius: '6px',
          backgroundColor: paginaActual === totalPaginas || deshabilitado ? '#f1f5f9' : 'white',
          color: paginaActual === totalPaginas || deshabilitado ? '#94a3b8' : '#0b4ea6',
          cursor: paginaActual === totalPaginas || deshabilitado ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: '600',
          transition: 'all 0.2s ease'
        }}
      >
        Siguiente →
      </button>
    </div>
  );
}
