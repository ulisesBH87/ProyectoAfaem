import React, { useState } from 'react';

/**
 * ENTRADA REUTILIZABLE CON VALIDACIÓN
 * @param {string} etiqueta - Etiqueta de la entrada
 * @param {string} tipo - Tipo de entrada (texto, correo, contraseña, etc)
 * @param {string} valor - Valor actual
 * @param {function} alCambiar - Función al cambiar
 * @param {string} marcador - Texto marcador de posición
 * @param {string} error - Mensaje de error
 * @param {boolean} requerido - Es requerido
 * @param {string} icono - Emoji o símbolo a mostrar
 */
export default function EntradaFormulario({
  etiqueta = '',
  tipo = 'text',
  valor = '',
  alCambiar,
  marcador = '',
  error = '',
  requerido = false,
  icono = '',
  deshabilitado = false,
  clasesPersonalizadas = '',
  ...accesorios
}) {
  const [estaEnfocado, setEstaEnfocado] = useState(false);

  return (
    <div style={{ marginBottom: '16px', width: '100%' }}>
      {etiqueta && (
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
          {etiqueta} {requerido && <span style={{ color: '#dc3545' }}>*</span>}
        </label>
      )}
      
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {icono && (
          <span
            style={{
              position: 'absolute',
              left: '12px',
              fontSize: '16px',
              pointerEvents: 'none',
            }}
          >
            {icono}
          </span>
        )}
        
        <input
          type={tipo}
          value={valor}
          onChange={alCambiar}
          placeholder={marcador}
          disabled={deshabilitado}
          className={clasesPersonalizadas}
          style={{
            width: '100%',
            padding: icono ? '10px 12px 10px 36px' : '10px 12px',
            fontSize: '14px',
            border: `1.5px solid ${error ? '#dc3545' : estaEnfocado ? '#0b4ea6' : '#ddd'}`,
            borderRadius: '6px',
            outline: 'none',
            backgroundColor: deshabilitado ? '#f0f0f0' : 'white',
            color: '#1e293b',
            transition: 'all 0.2s',
            boxShadow: estaEnfocado ? '0 0 0 3px rgba(11, 78, 166, 0.1)' : 'none',
          }}
          onFocus={() => setEstaEnfocado(true)}
          onBlur={() => setEstaEnfocado(false)}
          {...accesorios}
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
