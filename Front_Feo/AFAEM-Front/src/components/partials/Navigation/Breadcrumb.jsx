import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Componente Breadcrumb
 * Navegación por migas de pan
 * 
 * @param {array} items - Items [{label, path}]
 * @param {string} separator - Separador (default: '/')
 */
export default function Breadcrumb({
  items = [],
  separator = '/',
  style = {}
}) {
  const navigate = useNavigate();

  const handleClick = (path) => {
    if (path) {
      navigate(path);
    }
  };

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      fontSize: '14px',
      marginBottom: '20px',
      ...style
    }} aria-label="Breadcrumb">
      <ol style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0',
        listStyle: 'none',
        margin: '0',
        padding: '0'
      }}>
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          
          return (
            <li key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {isLast ? (
                <span style={{
                  color: '#1e293b',
                  fontWeight: '600'
                }}>
                  {item.label}
                </span>
              ) : (
                <>
                  <button
                    onClick={() => handleClick(item.path)}
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
                    {item.label}
                  </button>
                  {idx < items.length - 1 && (
                    <span style={{
                      color: '#cbd5e1',
                      fontWeight: '300'
                    }}>
                      {separator}
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
