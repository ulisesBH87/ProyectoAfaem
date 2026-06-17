import React from 'react';
import { createPortal } from 'react-dom';

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
  children,
  alCerrar,
  pie,
  tamanio = 'medio',
  clasesPersonalizadas = '',
  bloquearCierreFondo = false,
  ...accesorios
}) {
  React.useEffect(() => {
    if (!estaAbierto) return;

    // BLOQUEAR SCROLL DE FONDO
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const manejarTecla = (e) => {
      if (e.key === 'Escape') {
        if (!bloquearCierreFondo && alCerrar) {
          alCerrar();
        }
      }
    };

    window.addEventListener('keydown', manejarTecla);
    return () => {
      window.removeEventListener('keydown', manejarTecla);
      document.body.style.overflow = originalOverflow || 'unset';
    };
  }, [estaAbierto, bloquearCierreFondo, alCerrar]);

  if (!estaAbierto) return null;

  const content = children || hijos;

  const estilosPorTamanio = {
    pequeno: { maxWidth: '400px' },
    medio: { maxWidth: '600px' },
    grande: { maxWidth: '800px' },
    pantallaFull: { maxWidth: '1400px', width: '95vw' },
  };

  return createPortal(
    <>
      {/* CAPA DE FONDO */}
      <div
        onClick={bloquearCierreFondo ? undefined : alCerrar}
        className="modal-overlay-responsive"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: '50px',
          zIndex: 10500,
        }}
      >
        {/* MODAL */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={`modal-container-responsive ${clasesPersonalizadas}`}
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.2)',
            width: '100%',
            ...estilosPorTamanio[tamanio],
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
          }}
          {...accesorios}
        >
          {/* ENCABEZADO */}
          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: 'white',
              borderTopLeftRadius: '12px',
              borderTopRightRadius: '12px',
              zIndex: 10,
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
          <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>{content}</div>

          {/* PIE */}
          {pie && (
            <div
              style={{
                flexShrink: 0,
                padding: '16px 24px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
                backgroundColor: 'white',
                borderBottomLeftRadius: '12px',
                borderBottomRightRadius: '12px',
                zIndex: 10,
              }}
            >
              {pie}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
