import React, { useState } from 'react';

/**
 * INPUT REUTILIZABLE CON VALIDACIÓN
 * @param {string} label - Etiqueta del input
 * @param {string} type - Tipo de input (text, email, password, etc)
 * @param {string} value - Valor actual
 * @param {function} onChange - Función al cambiar
 * @param {string} placeholder - Texto placeholder
 * @param {string} error - Mensaje de error
 * @param {boolean} required - Es requerido
 * @param {string} icon - Emoji o símbolo a mostrar
 */
export default function FormInput({
  label = '',
  type = 'text',
  value = '',
  onChange,
  placeholder = '',
  error = '',
  required = false,
  icon = '',
  disabled = false,
  className = '',
  ...props
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div style={{ marginBottom: '16px', width: '100%' }}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: '700',
            marginBottom: '6px',
            color: '#25303b',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {label} {required && <span style={{ color: '#dc3545' }}>*</span>}
        </label>
      )}
      
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {icon && (
          <span
            style={{
              position: 'absolute',
              left: '12px',
              fontSize: '16px',
              pointerEvents: 'none',
            }}
          >
            {icon}
          </span>
        )}
        
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={className}
          style={{
            width: '100%',
            padding: icon ? '10px 12px 10px 36px' : '10px 12px',
            fontSize: '14px',
            border: `1.5px solid ${error ? '#dc3545' : isFocused ? '#0b4ea6' : '#ddd'}`,
            borderRadius: '6px',
            outline: 'none',
            backgroundColor: disabled ? '#f0f0f0' : 'white',
            color: '#1e293b',
            transition: 'all 0.2s',
            boxShadow: isFocused ? '0 0 0 3px rgba(11, 78, 166, 0.1)' : 'none',
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
      </div>
      
      {error && (
        <span
          style={{
            display: 'block',
            fontSize: '12px',
            color: '#dc3545',
            marginTop: '4px',
            fontWeight: '600',
          }}
        >
          ❌ {error}
        </span>
      )}
    </div>
  );
}
