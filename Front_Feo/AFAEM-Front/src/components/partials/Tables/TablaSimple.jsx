import React from 'react';

/**
 * Componente TablaSimple
 * Tabla reutilizable para mostrar datos
 * 
 * @param {array} columnas - Columnas [{clave, etiqueta, renderizar}]
 * @param {array} datos - Datos a mostrar
 * @param {function} alHacerClickFila - Callback al hacer click en fila
 * @param {boolean} conRayas - Filas alternadas (por defecto: verdadero)
 * @param {boolean} conEfectoHover - Efecto hover (por defecto: verdadero)
 */
export default function TablaSimple({
  columnas = [],
  datos = [],
  alHacerClickFila,
  conRayas = true,
  conEfectoHover = true,
  estilo = {}
}) {
  return (
    <div style={{
      overflowX: 'auto',
      borderRadius: '8px',
      border: '1px solid #cbd5e1',
      ...estilo
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
            {columnas.map((col) => (
              <th key={col.clave} style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: '700',
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {col.etiqueta}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {datos.length === 0 ? (
            <tr>
              <td colSpan={columnas.length} style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: '#94a3b8',
                fontSize: '14px'
              }}>
                No hay datos para mostrar
              </td>
            </tr>
          ) : (
            datos.map((fila, idx) => (
              <tr
                key={idx}
                onClick={() => alHacerClickFila && alHacerClickFila(fila)}
                style={{
                  backgroundColor: conRayas && idx % 2 === 1 ? '#f8fafc' : 'white',
                  borderBottom: '1px solid #e2e8f0',
                  cursor: alHacerClickFila ? 'pointer' : 'auto',
                  transition: 'all 0.2s ease',
                  ':hover': conEfectoHover ? { backgroundColor: '#f1f5f9' } : {}
                }}
                onMouseEnter={(e) => {
                  if (conEfectoHover) {
                    e.currentTarget.style.backgroundColor = '#f1f5f9';
                  }
                }}
                onMouseLeave={(e) => {
                  if (conRayas && idx % 2 === 1) {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  } else {
                    e.currentTarget.style.backgroundColor = 'white';
                  }
                }}
              >
                {columnas.map((col) => (
                  <td key={col.clave} style={{
                    padding: '12px 16px',
                    fontSize: '14px',
                    color: '#1e293b'
                  }}>
                    {col.renderizar ? col.renderizar(fila[col.clave], fila) : fila[col.clave]}
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
