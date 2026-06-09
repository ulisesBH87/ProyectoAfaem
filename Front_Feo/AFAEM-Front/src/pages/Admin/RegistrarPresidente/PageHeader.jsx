import { FaArrowLeft } from 'react-icons/fa';
import { C } from './constants';

/**
 * PageHeader
 * Header superior con botón de regreso y título/subtítulo de la página.
 */
export default function PageHeader({ onBack }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 32 }}>
      <button
        onClick={onBack}
        style={{
          width: 42, height: 42, borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.cardBorder}`,
          color: C.textMid, cursor: 'pointer', fontSize: 15, transition: 'all .2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(245,158,11,0.1)';
          e.currentTarget.style.borderColor = C.amber;
          e.currentTarget.style.color = C.amber;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
          e.currentTarget.style.borderColor = C.cardBorder;
          e.currentTarget.style.color = C.textMid;
        }}
      >
        <FaArrowLeft />
      </button>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 5, height: 22, background: `linear-gradient(180deg, ${C.amber}, ${C.orange})`, borderRadius: 4 }} />
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: '0.3px', color: 'black' }}>
            Registrar Nuevo Presidente
          </h1>
        </div>
        <p style={{ margin: '4px 0 0 15px', fontSize: 13, color: 'black' }}>
          Flujo completo de alta sin validación previa — activación inmediata.
        </p>
      </div>
    </div>
  );
}
