import { C } from './constants';

/**
 * SeguroRow
 * Fila individual dentro del grid de seguros del Paso 2.
 * Soporta dos modos: radio (seguros de presidente) y number input (seguros de jugadores).
 */
export default function SeguroRow({ seg, isPres, isChecked, asignacion, onSelectPres, onChangeNumero }) {
  return (
    <div
      onClick={isPres ? onSelectPres : undefined}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: isPres && isChecked ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.02)',
        border: isPres && isChecked ? `1px solid ${C.amber}` : `1px solid ${C.cardBorder}`,
        padding: '10px 12px', borderRadius: 10,
        cursor: isPres ? 'pointer' : 'default',
        transition: 'all .2s',
      }}
      onMouseEnter={isPres ? e => {
        if (!isChecked) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
        }
      } : undefined}
      onMouseLeave={isPres ? e => {
        if (!isChecked) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
          e.currentTarget.style.borderColor = C.cardBorder;
        }
      } : undefined}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700 }}>{seg.nombre}</div>
        <div style={{ fontSize: 11, color: C.textDim }}>${seg.precio} c/u</div>
      </div>

      {isPres ? (
        <input
          type="radio"
          name="seguroPresidenteRadio"
          style={{ width: 18, height: 18, cursor: 'pointer', accentColor: C.amber }}
          checked={isChecked}
          onChange={onSelectPres}
        />
      ) : (
        <input
          type="number" min="0"
          style={{
            width: 58, padding: '6px 8px', borderRadius: 8,
            background: C.inputBg, border: `1px solid ${C.inputBorder}`,
            color: 'white', textAlign: 'center', outline: 'none', fontSize: 14,
          }}
          value={asignacion[seg.id] ?? ''}
          onChange={onChangeNumero}
        />
      )}
    </div>
  );
}
