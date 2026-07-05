import { FaArrowLeft } from 'react-icons/fa';
import { C } from './constants';
import COLORS from '../../../styles/colors';

/**
 * PageHeader
 * Header superior con botón de regreso y título/subtítulo de la página.
 */
export default function PageHeader({ onBack, esEntrenador }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 16 }}>
      <button
        onClick={onBack}
        style={{
          width: 42, height: 42, borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: COLORS.overlayWhite04, border: `1px solid ${C.cardBorder}`,
          color: C.textArrow, cursor: 'pointer', fontSize: 15, transition: 'all .2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = COLORS.warningBgTranslucent10;
          e.currentTarget.style.borderColor = C.amber;
          e.currentTarget.style.color = C.amber;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = COLORS.overlayWhite04;
          e.currentTarget.style.borderColor = C.cardBorder;
          e.currentTarget.style.color = C.textArrow;
        }}
      >
        <FaArrowLeft />
      </button>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 5, height: 22, background: `linear-gradient(180deg, ${C.amber}, ${C.orange})`, borderRadius: 4 }} />
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: '0.3px', color: 'black' }}>
            {esEntrenador ? 'Registrar Nuevo Entrenador' : 'Registrar Nuevo Presidente'}
          </h1>
        </div>
      </div>
    </div>
  );
}
