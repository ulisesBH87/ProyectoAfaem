import React from 'react';

/**
 * Componente EntradaSeleccion
 * Desplegable/Selección reutilizable con estilo consistente
 * 
 * @param {string} etiqueta - Etiqueta del selección
 * @param {string} nombre - Nombre del campo
 * @param {string} valor - Valor seleccionado
 * @param {function} alCambiar - Callback al cambiar
 * @param {array} opciones - Opciones [{valor, etiqueta}]
 * @param {boolean} requerido - Requerido (por defecto: falso)
 * @param {string} marcador - Marcador de posición
 * @param {boolean} deshabilitado - Deshabilitado
 * @param {object} estilo - Estilos adicionales
 */
export default function EntradaSeleccion({
  etiqueta,
  nombre,
  valor,
  alCambiar,
  opciones = [],
  requerido = false,
  marcador = 'Selecciona una opción',
  deshabilitado = false,
  estilo = {}
}) {
  return (
    <div style={{ marginBottom: '16px' }}>
      {etiqueta && (
        <label htmlFor={nombre} style={{
          display: 'block',
          marginBottom: '6px',
          fontSize: '14px',
          fontWeight: '600',
          color: '#1e293b'
        }}>
          {etiqueta}
          {requerido && <span style={{ color: '#dc3545' }}>*</span>}
        </label>
      )}
      <select
        id={nombre}
        name={nombre}
        value={valor}
        onChange={alCambiar}
        disabled={deshabilitado}
        required={requerido}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid #cbd5e1',
          borderRadius: '6px',
          fontSize: '14px',
          fontFamily: 'inherit',
          backgroundColor: deshabilitado ? '#f1f5f9' : 'white',
          color: valor ? '#1e293b' : '#94a3b8',
          cursor: deshabilitado ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%230b4ea6' d='M1 1l5 5 5-5'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          paddingRight: '36px',
          ...estilo
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
        <option value="">{marcador}</option>
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>
    </div>
  );
}
