import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Componente MigasDePan
 * Navegación por migas de pan
 * 
 * @param {array} elementos - Elementos [{etiqueta, ruta}]
 * @param {string} separador - Separador (por defecto: '/')
 */
export default function MigasDePan({
  elementos = [],
  separador = '/',
  estilo = {}
}) {
  const navegar = useNavigate();

  const manejarClick = (ruta) => {
    if (ruta) {
      navegar(ruta);
    }
  };

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      fontSize: '14px',
      marginBottom: '20px',
      ...estilo
    }} aria-label="Migas de pan">
      <ol style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0',
        listStyle: 'none',
        margin: '0',
        padding: '0'
      }}>
        {elementos.map((elemento, idx) => {
          const esUltimo = idx === elementos.length - 1;
          
          return (
            <li key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {esUltimo ? (
                <span style={{
                  color: '#1e293b',
                  fontWeight: '600'
                }}>
                  {elemento.etiqueta}
                </span>
              ) : (
                <>
                  <button
                    onClick={() => manejarClick(elemento.ruta)}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#0b4ea6',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      padding: '0',
                      textDecoration: 'none',
                      transition: 'color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.color = '#0940a6'}
                    onMouseLeave={(e) => e.target.style.color = '#0b4ea6'}
                  >
                    {elemento.etiqueta}
                  </button>
                  {idx < elementos.length - 1 && (
                    <span style={{
                      color: '#cbd5e1',
                      fontWeight: '300'
                    }}>
                      {separador}
                    </span>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
