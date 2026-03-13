import React from 'react';

/**
 * TARJETA REUTILIZABLE (CONTENEDOR CON CONTENIDO)
 * @param {React.ReactNode} hijos - Contenido de la tarjeta
 * @param {string} titulo - Título opcional
 * @param {string} subtitulo - Subtítulo opcional
 * @param {function} alHacerClick - Función al hacer click
 * @param {string} clasesPersonalizadas - Clases adicionales
 * @param {object} estilo - Estilos adicionales
 */
export default function Tarjeta({
  hijos,
  titulo = '',
  subtitulo = '',
  alHacerClick,
  clasesPersonalizadas = '',
  estilo = {},
  conveEnlace = false,
  ...accesorios
}) {
  return (
    <div
      onClick={alHacerClick}
      className={clasesPersonalizadas}
      style={{
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        transition: conveEnlace ? 'all 0.3s ease' : 'none',
        cursor: conveEnlace ? 'pointer' : 'default',
        ...estilo,
      }}
      onMouseEnter={(e) => {
        if (conveEnlace) {
          e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.12)';
          e.currentTarget.style.transform = 'translateY(-4px)';
        }
      }}
      onMouseLeave={(e) => {
        if (conveEnlace) {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08)';
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
      {...accesorios}
    >
      {titulo && (
        <div style={{ marginBottom: subtitulo ? '4px' : '16px' }}>
          <h3
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: '700',
              color: '#0b4ea6',
            }}
          >
            {titulo}
          </h3>
        </div>
      )}
      {subtitulo && (
        <div style={{ marginBottom: '16px' }}>
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: '#64748b',
              fontWeight: '500',
            }}
          >
            {subtitulo}
          </p>
        </div>
      )}
      {hijos}
    </div>
  );
}
