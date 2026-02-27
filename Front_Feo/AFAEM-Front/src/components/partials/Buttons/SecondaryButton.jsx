import React from 'react';

/**
 * BOTÓN SECUNDARIO REUTILIZABLE
 * @param {string} etiqueta - Texto del botón
 * @param {function} alHacerClick - Función al hacer click
 * @param {boolean} deshabilitado - Deshabilitado o no
 * @param {string} tamanio - 'pequeno', 'medio', 'grande'
 */
export default function BotonSecundario({
  etiqueta = 'Cancelar',
  alHacerClick,
  deshabilitado = false,
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
      disabled={deshabilitado}
      className={clasesPersonalizadas}
      style={{
        backgroundColor: 'white',
        color: '#0b4ea6',
        border: '1.5px solid #0b4ea6',
        borderRadius: '8px',
        cursor: deshabilitado ? 'not-allowed' : 'pointer',
        fontWeight: '700',
        transition: 'all 0.2s',
        opacity: deshabilitado ? 0.6 : 1,
        ...estilosPorTamanio[tamanio],
      }}
      onMouseEnter={(e) => {
        if (!deshabilitado) {
          e.target.style.backgroundColor = '#dbeafe';
          e.target.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={(e) => {
        if (!deshabilitado) {
          e.target.style.backgroundColor = 'white';
          e.target.style.transform = 'translateY(0)';
        }
      }}
      {...accesorios}
    >
      {etiqueta}
    </button>
  );
}
