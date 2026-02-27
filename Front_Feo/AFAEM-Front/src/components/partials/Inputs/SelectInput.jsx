import React from 'react';

/**
 * Componente SelectInput
 * Dropdown/Select reutilizable con estilo consistente
 * 
 * @param {string} label - Etiqueta del select
 * @param {string} name - Nombre del campo
 * @param {string} value - Valor seleccionado
 * @param {function} onChange - Callback al cambiar
 * @param {array} options - Opciones [{value, label}]
 * @param {boolean} required - Requerido (default: false)
 * @param {string} placeholder - Placeholder
 * @param {boolean} disabled - Deshabilitado
 * @param {object} style - Estilos adicionales
 */
export default function SelectInput({
  label,
  name,
  value,
  onChange,
  options = [],
  required = false,
  placeholder = 'Selecciona una opción',
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
        </label>
      )}
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid #cbd5e1',
          borderRadius: '6px',
          fontSize: '14px',
          fontFamily: 'inherit',
          backgroundColor: disabled ? '#f1f5f9' : 'white',
          color: value ? '#1e293b' : '#94a3b8',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%230b4ea6' d='M1 1l5 5 5-5'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          paddingRight: '36px',
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
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
