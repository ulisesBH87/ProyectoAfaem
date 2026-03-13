import React, { useState } from 'react';

/**
 * Componente ConsejoFlotante
 * Sugerencia/Consejo flotante reutilizable
 * 
 * @param {string} texto - Texto del consejo
 * @param {ReactNode} hijos - Elemento que dispara el consejo
 * @param {string} posicion - Posición (superior, inferior, izquierda, derecha)
 * @param {string} tipo - Tipo (informacion, advertencia, error, exito)
 */
export default function ConsejoFlotante({
  texto,
  hijos,
  posicion = 'superior',
  tipo = 'informacion',
  estilo = {}
}) {
  const [esVisible, setEsVisible] = useState(false);

  const estilosPorTipo = {
    informacion: { backgroundColor: '#0b4ea6', color: 'white' },
    advertencia: { backgroundColor: '#dc2626', color: 'white' },
    error: { backgroundColor: '#dc3545', color: 'white' },
    exito: { backgroundColor: '#28a745', color: 'white' }
  };

  const estilosPorPosicion = {
    superior: {
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginBottom: '8px'
    },
    inferior: {
      top: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginTop: '8px'
    },
    izquierda: {
      right: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      marginRight: '8px'
    },
    derecha: {
      left: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      marginLeft: '8px'
    }
  };

  return (
    <div style={{
      position: 'relative',
      display: 'inline-block',
      ...estilo
    }}>
      <div
        onMouseEnter={() => setEsVisible(true)}
        onMouseLeave={() => setEsVisible(false)}
      >
        {hijos}
      </div>

      {esVisible && (
        <div style={{
          position: 'absolute',
          ...estilosPorPosicion[posicion],
          ...estilosPorTipo[tipo],
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '600',
          whiteSpace: 'nowrap',
          zIndex: 1000,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.15)',
          animation: 'desvanecerEntrante 0.2s ease',
          pointerEvents: 'none'
        }}>
          {texto}
          {/* Flecha */}
          <div style={{
            position: 'absolute',
            width: '0',
            height: '0',
            borderStyle: 'solid',
            ...(posicion === 'superior' && {
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              borderWidth: '6px 6px 0 6px',
              borderColor: `${estilosPorTipo[tipo].backgroundColor} transparent transparent transparent`
            }),
            ...(posicion === 'inferior' && {
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              borderWidth: '0 6px 6px 6px',
              borderColor: `transparent transparent ${estilosPorTipo[tipo].backgroundColor} transparent`
            }),
            ...(posicion === 'izquierda' && {
              left: '100%',
              top: '50%',
              transform: 'translateY(-50%)',
              borderWidth: '6px 0 6px 6px',
              borderColor: `transparent transparent transparent ${estilosPorTipo[tipo].backgroundColor}`
            }),
            ...(posicion === 'derecha' && {
              right: '100%',
              top: '50%',
              transform: 'translateY(-50%)',
              borderWidth: '6px 6px 6px 0',
              borderColor: `transparent ${estilosPorTipo[tipo].backgroundColor} transparent transparent`
            })
          }} />
        </div>
      )}

      <style>{`
        @keyframes desvanecerEntrante {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
