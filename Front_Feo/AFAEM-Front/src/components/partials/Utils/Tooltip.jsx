import React, { useState } from 'react';

/**
 * Componente Tooltip
 * Hint/Tooltip reutilizable
 * 
 * @param {string} text - Texto del tooltip
 * @param {ReactNode} children - Elemento que dispara el tooltip
 * @param {string} position - Posición (top, bottom, left, right)
 * @param {string} type - Tipo (info, warning, error, success)
 */
export default function Tooltip({
  text,
  children,
  position = 'top',
  type = 'info',
  style = {}
}) {
  const [isVisible, setIsVisible] = useState(false);

  const typeStyles = {
    info: { backgroundColor: '#0b4ea6', color: 'white' },
    warning: { backgroundColor: '#dc2626', color: 'white' },
    error: { backgroundColor: '#dc3545', color: 'white' },
    success: { backgroundColor: '#28a745', color: 'white' }
  };

  const positionStyles = {
    top: {
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginBottom: '8px'
    },
    bottom: {
      top: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginTop: '8px'
    },
    left: {
      right: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      marginRight: '8px'
    },
    right: {
      left: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      marginLeft: '8px'
    }
  };

  return (
    <div style={{
      position: 'relative',
      display: 'inline-block',
      ...style
    }}>
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>

      {isVisible && (
        <div style={{
          position: 'absolute',
          ...positionStyles[position],
          ...typeStyles[type],
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '600',
          whiteSpace: 'nowrap',
          zIndex: 1000,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.15)',
          animation: 'fadeIn 0.2s ease',
          pointerEvents: 'none'
        }}>
          {text}
          {/* Arrow */}
          <div style={{
            position: 'absolute',
            width: '0',
            height: '0',
            borderStyle: 'solid',
            ...(position === 'top' && {
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              borderWidth: '6px 6px 0 6px',
              borderColor: `${typeStyles[type].backgroundColor} transparent transparent transparent`
            }),
            ...(position === 'bottom' && {
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              borderWidth: '0 6px 6px 6px',
              borderColor: `transparent transparent ${typeStyles[type].backgroundColor} transparent`
            }),
            ...(position === 'left' && {
              left: '100%',
              top: '50%',
              transform: 'translateY(-50%)',
              borderWidth: '6px 0 6px 6px',
              borderColor: `transparent transparent transparent ${typeStyles[type].backgroundColor}`
            }),
            ...(position === 'right' && {
              right: '100%',
              top: '50%',
              transform: 'translateY(-50%)',
              borderWidth: '6px 6px 6px 0',
              borderColor: `transparent ${typeStyles[type].backgroundColor} transparent transparent`
            })
          }} />
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
