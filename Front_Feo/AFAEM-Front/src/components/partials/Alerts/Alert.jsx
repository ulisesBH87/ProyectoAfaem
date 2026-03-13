import React from 'react';

/**
 * ALERTA REUTILIZABLE
 * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
 * @param {string} message - Mensaje a mostrar
 * @param {boolean} dismissible - Si se puede cerrar
 * @param {function} onClose - Función al cerrar
 */
export default function Alert({
  type = 'info',
  message = '',
  dismissible = true,
  onClose,
  icon = '',
  title = '',
  style = {},
  ...props
}) {
  const alertStyles = {
    success: {
      backgroundColor: '#d4edda',
      borderColor: '#28a745',
      color: '#155724',
      icon: '✓',
    },
    error: {
      backgroundColor: '#f8d7da',
      borderColor: '#dc3545',
      color: '#721c24',
      icon: '✕',
    },
    warning: {
      backgroundColor: '#fff3cd',
      borderColor: '#ffc107',
      color: '#856404',
      icon: '⚠',
    },
    info: {
      backgroundColor: '#d1ecf1',
      borderColor: '#0c5460',
      color: '#0c5460',
      icon: 'ℹ',
    },
  };

  const config = alertStyles[type] || alertStyles.info;

  return (
    <div
      style={{
        backgroundColor: config.backgroundColor,
        borderLeft: `4px solid ${config.borderColor}`,
        borderRadius: '6px',
        padding: '12px 16px',
        color: config.color,
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        ...style,
      }}
      {...props}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
        {(icon || config.icon) && (
          <span style={{ fontSize: '16px', fontWeight: 'bold', flexShrink: 0 }}>
            {icon || config.icon}
          </span>
        )}
        <div>
          {title && (
            <strong style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
              {title}
            </strong>
          )}
          <span style={{ fontSize: '13px' }}>{message}</span>
        </div>
      </div>

      {dismissible && onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: config.color,
            cursor: 'pointer',
            fontSize: '18px',
            padding: '0 0 0 12px',
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
