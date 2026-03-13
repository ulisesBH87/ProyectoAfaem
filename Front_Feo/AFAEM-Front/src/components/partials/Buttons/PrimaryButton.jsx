import React from 'react';

/**
 * BOTÓN PRIMARIO REUTILIZABLE
 * @param {string} etiqueta - Texto del botón
 * @param {function} alHacerClick - Función al hacer click
 * @param {boolean} deshabilitado - Deshabilitado o no
 * @param {boolean} cargando - Mostrar estado de carga
 * @param {string} tamanio - 'pequeno', 'medio', 'grande'
 * @param {string} clasesPersonalizadas - Clases adicionales
 */
export default function BotonPrimario({
  etiqueta = 'Enviar',
  alHacerClick,
  deshabilitado = false,
  cargando = false,
  tamanio = 'medio',
  clasesPersonalizadas = '',
  tipo = 'button',
  ...accesorios
}) {
  const estilosPorTamanio = {
    pequeno: { padding: '6px 12px', fontSize: '12px' },
    medio: { padding: '10px 20px', fontSize: '14px' },
    grande: { padding: '14px 28px', fontSize: '16px' },
  };

  return (
    <button
      type={tipo}
      onClick={alHacerClick}
      disabled={deshabilitado || cargando}
      className={clasesPersonalizadas}
      style={{
        backgroundColor: deshabilitado || cargando ? '#ccc' : '#0b4ea6',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: deshabilitado || cargando ? 'not-allowed' : 'pointer',
        fontWeight: '700',
        transition: 'all 0.2s',
        opacity: deshabilitado || cargando ? 0.6 : 1,
        ...estilosPorTamanio[tamanio],
      }}
      onMouseEnter={(e) => {
        if (!deshabilitado && !cargando) {
          e.target.style.backgroundColor = '#063f82';
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 4px 12px rgba(11, 78, 166, 0.3)';
        }
      }}
      onMouseLeave={(e) => {
        if (!deshabilitado && !cargando) {
          e.target.style.backgroundColor = '#0b4ea6';
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = 'none';
        }
      }}
      {...accesorios}
    >
      {cargando ? '⏳ Cargando...' : etiqueta}
    </button>
  );
}
