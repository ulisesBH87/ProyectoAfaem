import React from 'react';

/**
 * MODAL REUTILIZABLE
 * @param {boolean} estaAbierto - Si el modal está abierto
 * @param {string} titulo - Título del modal
 * @param {React.ReactNode} hijos - Contenido
 * @param {function} alCerrar - Función al cerrar
 * @param {React.ReactNode} pie - Contenido del pie (botones)
 */
export default function Modal({
  estaAbierto = false,
  titulo = '',
  hijos,
  alCerrar,
  pie,
  tamanio = 'medio',
  clasesPersonalizadas = '',
  ...accesorios
}) {
  if (!estaAbierto) return null;

  const estilosPorTamanio = {
    pequeno: { maxWidth: '400px' },
    medio: { maxWidth: '600px' },
    grande: { maxWidth: '800px' },
  };

  return (
    <>
      {/* CAPA DE FONDO */}
      <div
        onClick={alCerrar}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
      >
        {/* MODAL */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={clasesPersonalizadas}
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.2)',
            ...estilosPorTamanio[tamanio],
            maxHeight: '90vh',
            overflow: 'auto',
          }}
          {...accesorios}
        >
          {/* ENCABEZADO */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '700',
                color: '#0b4ea6',
              }}
            >
              {titulo}
            </h2>
            {alCerrar && (
              <button
                onClick={alCerrar}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* CUERPO */}
          <div style={{ padding: '24px' }}>{hijos}</div>

          {/* PIE */}
          {pie && (
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
              }}
            >
              {pie}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
