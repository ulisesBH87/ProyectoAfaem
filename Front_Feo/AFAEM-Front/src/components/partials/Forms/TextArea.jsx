import React from 'react';

/**
 * Componente TextArea
 * Área de texto reutilizable para formularios
 * 
 * @param {string} label - Etiqueta
 * @param {string} name - Nombre del campo
 * @param {string} value - Valor actual
 * @param {function} onChange - Callback al cambiar
 * @param {number} rows - Número de filas (default: 4)
 * @param {number} maxLength - Máximo de caracteres
 * @param {string} placeholder - Placeholder
 * @param {boolean} required - Requerido
 * @param {boolean} disabled - Deshabilitado
 * @param {object} style - Estilos adicionales
 */
export default function TextArea({
  label,
  name,
  value = '',
  onChange,
  rows = 4,
  maxLength,
  placeholder = 'Escribe aquí...',
  required = false,
  disabled = false,
  style = {}
}) {
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && (
        <label htmlFor={name} style={{
          display: 'block',
          marginBottom: '6px',
          fontSize: '14px',
          fontWeight: '600',
          color: '#1e293b'
        }}>
          {label}
          {required && <span style={{ color: '#dc3545' }}>*</span>}
          {maxLength && (
            <span style={{
              float: 'right',
              fontSize: '12px',
              color: '#94a3b8'
            }}>
              {value.length || 0}/{maxLength}
            </span>
          )}
        </label>
      )}
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid #cbd5e1',
          borderRadius: '6px',
          fontSize: '14px',
          fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
          backgroundColor: disabled ? '#f1f5f9' : 'white',
          color: '#1e293b',
          cursor: disabled ? 'not-allowed' : 'text',
          transition: 'all 0.2s ease',
          resize: 'vertical',
          ...style
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#0b4ea6';
          e.target.style.outline = 'none';
          e.target.style.boxShadow = '0 0 0 3px rgba(11, 78, 166, 0.1)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#cbd5e1';
          e.target.style.boxShadow = 'none';
        }}
      />
    </div>
  );
}
