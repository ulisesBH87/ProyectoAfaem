import React from 'react';

/**
 * CARD REUTILIZABLE (TARJETA CON CONTENIDO)
 * @param {React.ReactNode} children - Contenido de la tarjeta
 * @param {string} title - Título opcional
 * @param {string} subtitle - Subtítulo opcional
 * @param {function} onClick - Función al hacer click
 * @param {string} className - Classes adicionales
 * @param {object} style - Estilos adicionales
 */
export default function Card({
  children,
  title = '',
  subtitle = '',
  onClick,
  className = '',
  style = {},
  hoverable = false,
  ...props
}) {
  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        transition: hoverable ? 'all 0.3s ease' : 'none',
        cursor: hoverable ? 'pointer' : 'default',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (hoverable) {
          e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.12)';
          e.currentTarget.style.transform = 'translateY(-4px)';
        }
      }}
      onMouseLeave={(e) => {
        if (hoverable) {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08)';
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
      {...props}
    >
      {title && (
        <div style={{ marginBottom: subtitle ? '4px' : '16px' }}>
          <h3
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: '700',
              color: '#0b4ea6',
            }}
          >
            {title}
          </h3>
        </div>
      )}

      {subtitle && (
        <div style={{ marginBottom: '16px' }}>
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: '#64748b',
              fontWeight: '500',
            }}
          >
            {subtitle}
          </p>
        </div>
      )}

      {children}
    </div>
  );
}
