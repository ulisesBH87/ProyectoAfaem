import React from 'react';

/**
 * ALERTA REUTILIZABLE
 * @param {string} tipo - Tipo: 'exito', 'error', 'advertencia', 'informacion'
 * @param {string} mensaje - Mensaje a mostrar
 * @param {boolean} descartable - Si se puede cerrar
 * @param {function} alCerrar - Función al cerrar
 */
export default function Alerta({
  tipo = 'informacion',
  mensaje = '',
  descartable = true,
  alCerrar,
  icono = '',
  titulo = '',
  estilo = {},
  ...accesorios
}) {
  const estilosAlerta = {
    exito: {
      backgroundColor: '#d4edda',
      borderColor: '#28a745',
      color: '#155724',
      icono: '✓',
    },
    error: {
      backgroundColor: '#f8d7da',
      borderColor: '#dc3545',
      color: '#721c24',
      icono: '✕',
    },
    advertencia: {
      backgroundColor: '#fff3cd',
      borderColor: '#ffc107',
      color: '#856404',
      icono: '⚠',
    },
    informacion: {
      backgroundColor: '#d1ecf1',
      borderColor: '#0c5460',
      color: '#0c5460',
      icono: 'ℹ',
    },
  };

  const configuracion = estilosAlerta[tipo] || estilosAlerta.informacion;

  return (
    <div
      style={{
        backgroundColor: configuracion.backgroundColor,
        borderLeft: `4px solid ${configuracion.borderColor}`,
        borderRadius: '6px',
        padding: '12px 16px',
        color: configuracion.color,
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        ...estilo,
      }}
      {...accesorios}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
        {(icono || configuracion.icono) && (
          <span style={{ fontSize: '16px', fontWeight: 'bold', flexShrink: 0 }}>
            {icono || configuracion.icono}
          </span>
        )}
        <div>
          {titulo && (
            <strong style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
              {titulo}
            </strong>
          )}
          <span style={{ fontSize: '13px' }}>{mensaje}</span>
        </div>
      </div>

      {descartable && (
        <button
          type="button"
          onClick={alCerrar}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: 'inherit',
            fontSize: '18px',
            cursor: 'pointer',
            fontWeight: 'bold',
            padding: '0',
            marginLeft: '12px',
            lineHeight: 1,
          }}
          aria-label="Cerrar alerta"
        >
          ✕
        </button>
      )}
    </div>
  );
}
