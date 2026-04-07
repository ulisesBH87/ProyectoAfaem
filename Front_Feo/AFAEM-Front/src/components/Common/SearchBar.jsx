import React, { useState } from 'react';
import { FaSearch } from 'react-icons/fa';

/**
 * Componente SearchBar Reutilizable con estilo Premium
 * 
 * @param {string} value - Valor actual de la búsqueda
 * @param {function} onChange - Función para manejar el cambio de valor
 * @param {string} placeholder - Texto del marcador de posición (default: "Buscar...")
 * @param {string} width - Ancho del input (default: "280px")
 * @param {object} style - Estilos adicionales opcionales para el contenedor
 */
const SearchBar = ({ 
  value, 
  onChange, 
  placeholder = "Buscar...", 
  width = "280px",
  style = {}
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div style={{ position: 'relative', width, ...style }}>
      <FaSearch 
        style={{ 
          position: 'absolute', 
          left: '16px', 
          top: '50%', 
          transform: 'translateY(-50%)', 
          color: isFocused ? 'var(--primary)' : 'var(--text-muted)', 
          fontSize: '14px',
          transition: 'color 0.3s ease'
        }} 
      />
      <input 
        type="text" 
        placeholder={placeholder} 
        value={value}
        onChange={onChange}
        style={{
          padding: '10px 16px 10px 42px',
          width: '100%',
          background: 'rgba(11, 78, 166, 0.05)',
          borderRadius: '12px',
          fontSize: '13px',
          fontWeight: '500',
          border: '1.5px solid transparent',
          borderColor: isFocused ? 'var(--primary-light)' : 'transparent',
          outline: 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          color: 'var(--text-main)',
          boxShadow: isFocused ? '0 0 0 4px rgba(37, 99, 235, 0.08)' : 'none'
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </div>
  );
};

export default SearchBar;
