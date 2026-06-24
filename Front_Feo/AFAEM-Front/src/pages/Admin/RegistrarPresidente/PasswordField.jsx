import { useState, useMemo } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { C, fieldStyles, calcStrength } from './constants';

/**
 * PasswordField
 * Campo de contraseña con:
 * - Toggle show/hide
 * - Barra de fuerza (solo en el campo primario)
 * - Indicadores de reglas
 * - Mensaje de confirmación (solo en el campo de confirmación)
 *
 * @param {string}   label         - Etiqueta del campo
 * @param {string}   value         - Valor actual
 * @param {Function} onChange      - Handler de cambio
 * @param {string}   error         - Mensaje de error
 * @param {boolean}  showStrength  - Muestra barra de fuerza e indicadores
 * @param {string}   matchValue    - Valor a comparar (para campo de confirmación)
 */
export default function PasswordField({ label, value, onChange, error, showStrength = false, matchValue }) {
  const [show, setShow] = useState(false);
  const pwInfo = useMemo(() => calcStrength(value), [value]);
  const matches = matchValue !== undefined && value && value === matchValue;

  return (
    <div>
      <label style={fieldStyles.label}>
        {label} <span style={{ color: C.amber }}>*</span>
      </label>

      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          placeholder="••••••••"
          value={value}
          onChange={onChange}
          autoComplete="new-password"
          style={{
            ...fieldStyles.input,
            paddingRight: 42,
            borderColor: error ? C.rose : C.inputBorder,
          }}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', fontSize: 15,
          }}
        >
          {show ? <FaEyeSlash /> : <FaEye />}
        </button>
      </div>

      {error && (
        <span style={{ fontSize: 11, color: C.rose, marginTop: 3, display: 'block' }}>{error}</span>
      )}

      {/* Barra de fuerza */}
      {showStrength && (
        <>
          <div style={{ marginTop: 8, height: 4, borderRadius: 4, background: C.cardBorder, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4, transition: 'width .3s, background .3s',
              width: `${(pwInfo.score / 5) * 100}%`,
              background: pwInfo.score <= 2 ? C.rose : pwInfo.score <= 3 ? C.amber : C.green,
            }} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            {[['6+', 'minLen'], ['a-z', 'hasLower'], ['A-Z', 'hasUpper'], ['0-9', 'hasDigit'], ['#@!', 'hasSpecial']].map(([l, k]) => (
              <span key={k} style={{ fontSize: 10, color: pwInfo.rules[k] ? C.green : C.textDim }}>
                {pwInfo.rules[k] ? '✓' : '○'} {l}
              </span>
            ))}
          </div>
        </>
      )}

      {/* Confirmación de coincidencia */}
      {matches && (
        <span style={{ fontSize: 11, color: C.green, marginTop: 4, display: 'block' }}>
          ✓ Las contraseñas coinciden
        </span>
      )}
    </div>
  );
}
