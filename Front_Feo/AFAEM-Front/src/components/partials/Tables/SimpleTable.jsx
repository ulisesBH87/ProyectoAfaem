import React from 'react';

/**
 * Componente SimpleTable
 * Tabla reutilizable para mostrar datos
 * 
 * @param {array} columns - Columnas [{key, label, render}]
 * @param {array} data - Datos a mostrar
 * @param {function} onRowClick - Callback al hacer click en fila
 * @param {boolean} striped - Filas alternadas (default: true)
 * @param {boolean} hoverable - Efecto hover (default: true)
 */
export default function SimpleTable({
  columns = [],
  data = [],
  onRowClick,
  striped = true,
  hoverable = true,
  style = {}
}) {
  return (
    <div style={{
      overflowX: 'auto',
      borderRadius: '8px',
      border: '1px solid #cbd5e1',
      ...style
    }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        backgroundColor: 'white'
      }}>
        <thead>
          <tr style={{
            backgroundColor: '#f1f5f9',
            borderBottom: '2px solid #cbd5e1'
          }}>
            {columns.map((col) => (
              <th key={col.key} style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: '700',
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: '#94a3b8',
                fontSize: '14px'
              }}>
                No hay datos para mostrar
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={idx}
                onClick={() => onRowClick && onRowClick(row)}
                style={{
                  backgroundColor: striped && idx % 2 === 1 ? '#f8fafc' : 'white',
                  borderBottom: '1px solid #e2e8f0',
                  cursor: onRowClick ? 'pointer' : 'auto',
                  transition: 'all 0.2s ease',
                  ':hover': hoverable ? { backgroundColor: '#f1f5f9' } : {}
                }}
                onMouseEnter={(e) => {
                  if (hoverable) {
                    e.currentTarget.style.backgroundColor = '#f1f5f9';
                  }
                }}
                onMouseLeave={(e) => {
                  if (striped && idx % 2 === 1) {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  } else {
                    e.currentTarget.style.backgroundColor = 'white';
                  }
                }}
              >
                {columns.map((col) => (
                  <td key={col.key} style={{
                    padding: '12px 16px',
                    fontSize: '14px',
                    color: '#1e293b'
                  }}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
