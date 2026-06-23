import React from 'react';
import { FaCheck } from 'react-icons/fa';
import { C, PASOS } from './constants';
import COLORS from '../../../styles/colors';

/**
 * StepBar
 * Barra de progreso visual con los pasos del wizard.
 * Muestra ícono, etiqueta y línea conectora entre pasos.
 */
export default function StepBar({ paso, setPaso, stepStatus = {} }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 36 }}>
      {PASOS.map((p, i) => {
        const done = stepStatus[p.id] || false;
        const active = paso === p.id;
        return (
          <React.Fragment key={p.id}>
            <div 
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 90, cursor: setPaso ? 'pointer' : 'default' }}
              onClick={() => setPaso && setPaso(p.id)}
            >
              <div style={{
                width: 46, height: 46, borderRadius: 14, fontSize: 17,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? C.greenDim : active ? `linear-gradient(135deg, ${C.amberDark}, ${C.orange})` : COLORS.overlayWhite04,
                border: done ? `1.5px solid ${COLORS.greenBgTranslucent40}` : active ? `1.5px solid ${C.amber}` : `1.5px solid ${C.cardBorder}`,
                color: done ? C.green : active ? 'white' : C.textDim,
                boxShadow: active ? `0 0 20px ${COLORS.warningBgTranslucent35}` : 'none',
                transition: 'all .4s',
              }}>
                {done ? <FaCheck /> : p.icon}
              </div>
              <span style={{
                fontSize: 10, fontWeight: 800, letterSpacing: 1,
                textTransform: 'uppercase',
                color: done ? C.green : active ? C.amberLight : C.textDim,
              }}>
                {p.label}
              </span>
            </div>

            {i < PASOS.length - 1 && (
              <div className="rp-step-bar-line" style={{ height: 2 }}>
                <div style={{ position: 'absolute', inset: 0, background: C.cardBorder, borderRadius: 2 }} />
                <div style={{
                  position: 'absolute', inset: 0,
                  width: done ? '100%' : '0%',
                  background: `linear-gradient(90deg, ${C.amber}, ${C.green})`,
                  borderRadius: 2,
                  transition: 'width .5s ease',
                }} />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
