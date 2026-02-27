import React from 'react';

/**
 * CARGADOR REUTILIZABLE (INDICADOR DE CARGA)
 * @param {string} tamanio - 'pequeno', 'medio', 'grande'
 * @param {boolean} pantallaCompleta - Ocupar toda la pantalla
 * @param {string} mensaje - Mensaje de carga
 */
export default function Cargador({
  tamanio = 'medio',
  pantallaCompleta = false,
  mensaje = '',
  color = '#0b4ea6',
  ...accesorios
}) {
  const mapaaTamanios = {
    pequeno: '20px',
    medio: '40px',
    grande: '60px',
  };

  const estiloContenedor = pantallaCompleta
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }
    : {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
      };

  const tamanioCargador = mapaaTamanios[tamanio] || mapaaTamanios.medio;

  return (
    <div style={estiloContenedor} {...accesorios}>
      <div
        style={{
          width: tamanioCargador,
          height: tamanioCargador,
          border: `3px solid ${color}20`,
          borderTopColor: color,
          borderRadius: '50%',
          animation: 'girar 0.8s linear infinite',
        }}
      >
        <style>{`
          @keyframes girar {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>

      {mensaje && (
        <span
          style={{
            color: pantallaCompleta ? 'white' : '#64748b',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          {mensaje}
        </span>
      )}
    </div>
  );
}
