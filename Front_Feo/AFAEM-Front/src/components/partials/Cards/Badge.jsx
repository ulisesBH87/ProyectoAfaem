import React from 'react';

/**
 * BADGE REUTILIZABLE (ETIQUETA)
 * @param {string} label - Texto de la etiqueta
 * @param {string} type - Tipo: 'success', 'error', 'warning', 'info', 'primary', 'gray'
 * @param {string} size - 'small', 'medium'
 */
export default function Badge({
  label = '',
  type = 'primary',
  size = 'medium',
  icon = '',
  className = '',
  style = {},
  ...props
}) {
  const typeStyles = {
    success: {
      backgroundColor: '#dcfce7',
      color: '#166534',
      borderColor: '#28a745',
    },
    error: {
      backgroundColor: '#fee2e2',
      color: '#991b1b',
      borderColor: '#dc3545',
    },
    warning: {
      backgroundColor: '#fef3c7',
      color: '#92400e',
      borderColor: '#ffc107',
    },
    info: {
      backgroundColor: '#e0f2fe',
      color: '#0369a1',
      borderColor: '#0284c7',
    },
    primary: {
      backgroundColor: '#dbeafe',
      color: '#0b4ea6',
      borderColor: '#0b4ea6',
    },
    gray: {
      backgroundColor: '#f3f4f6',
      color: '#374151',
      borderColor: '#d1d5db',
    },
  };

  const sizeStyles = {
    small: { padding: '4px 8px', fontSize: '11px', fontWeight: '600' },
    medium: { padding: '6px 12px', fontSize: '12px', fontWeight: '700' },
  };

  const config = typeStyles[type] || typeStyles.primary;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        borderRadius: '999px',
        border: `1px solid ${config.borderColor}`,
        textTransform: 'uppercase',
        letterSpacing: '0.3px',
        ...config,
        ...sizeStyles[size],
        ...style,
      }}
      {...props}
    >
      {icon && <span>{icon}</span>}
      {label}
    </span>
  );
}
