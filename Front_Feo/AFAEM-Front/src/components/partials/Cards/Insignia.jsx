import React from 'react';

/**
 * INSIGNIA REUTILIZABLE (ETIQUETA)
 * @param {string} etiqueta - Texto de la insignia
 * @param {string} tipo - Tipo: 'exito', 'error', 'advertencia', 'informacion', 'primaria', 'gris'
 * @param {string} tamanio - 'pequeno', 'medio'
 */
export default function Insignia({
  etiqueta = '',
  tipo = 'primaria',
  tamanio = 'medio',
  icono = '',
  clasesPersonalizadas = '',
  estilo = {},
  ...accesorios
}) {
  const estilosPorTipo = {
    exito: {
      backgroundColor: '#dcfce7',
      color: '#166534',
      borderColor: '#28a745',
    },
    error: {
      backgroundColor: '#fee2e2',
      color: '#991b1b',
      borderColor: '#dc3545',
    },
    advertencia: {
      backgroundColor: '#fef3c7',
      color: '#92400e',
      borderColor: '#ffc107',
    },
    informacion: {
      backgroundColor: '#e0f2fe',
      color: '#0369a1',
      borderColor: '#0284c7',
    },
    primaria: {
      backgroundColor: '#dbeafe',
      color: '#0b4ea6',
      borderColor: '#0b4ea6',
    },
    gris: {
      backgroundColor: '#f3f4f6',
      color: '#374151',
      borderColor: '#d1d5db',
    },
  };

  const estilosPorTamanio = {
    pequeno: { padding: '4px 8px', fontSize: '11px', fontWeight: '600' },
    medio: { padding: '6px 12px', fontSize: '12px', fontWeight: '700' },
  };

  const configuracion = estilosPorTipo[tipo] || estilosPorTipo.primaria;

  return (
    <span
      className={clasesPersonalizadas}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        borderRadius: '999px',
        border: `1px solid ${configuracion.borderColor}`,
        textTransform: 'uppercase',
        letterSpacing: '0.3px',
        ...configuracion,
        ...estilosPorTamanio[tamanio],
        ...estilo,
      }}
      {...accesorios}
    >
      {icono && <span>{icono}</span>}
      {etiqueta}
    </span>
  );
}
