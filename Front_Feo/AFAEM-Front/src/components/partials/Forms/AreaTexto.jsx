import React from 'react';

/**
 * Componente AreaTexto
 * Área de texto reutilizable para formularios
 * 
 * @param {string} etiqueta - Etiqueta
 * @param {string} nombre - Nombre del campo
 * @param {string} valor - Valor actual
 * @param {function} alCambiar - Callback al cambiar
 * @param {number} filas - Número de filas (por defecto: 4)
 * @param {number} longitudMaxima - Máximo de caracteres
 * @param {string} marcador - Marcador de posición
 * @param {boolean} requerido - Requerido
 * @param {boolean} deshabilitado - Deshabilitado
 * @param {object} estilo - Estilos adicionales
 */
export default function AreaTexto({
  etiqueta,
  nombre,
  valor = '',
  alCambiar,
  filas = 4,
  longitudMaxima,
  marcador = 'Escribe aquí...',
  requerido = false,
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
          {longitudMaxima && (
            <span style={{
              float: 'right',
              fontSize: '12px',
              color: '#94a3b8'
            }}>
              {valor.length || 0}/{longitudMaxima}
            </span>
          )}
        </label>
      )}
      <textarea
        id={nombre}
        name={nombre}
        value={valor}
        onChange={alCambiar}
        rows={filas}
        maxLength={longitudMaxima}
        placeholder={marcador}
        required={requerido}
        disabled={deshabilitado}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid #cbd5e1',
          borderRadius: '6px',
          fontSize: '14px',
          fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
          backgroundColor: deshabilitado ? '#f1f5f9' : 'white',
          color: '#1e293b',
          cursor: deshabilitado ? 'not-allowed' : 'text',
          transition: 'all 0.2s ease',
          resize: 'vertical',
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
      />
    </div>
  );
}
