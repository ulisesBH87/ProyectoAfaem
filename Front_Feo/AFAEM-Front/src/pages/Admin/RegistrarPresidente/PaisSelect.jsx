import { C, PAISES, fieldStyles } from './constants';

/**
 * PaisSelect
 * Selector de código de país reutilizable.
 * Reemplaza las 2 copias duplicadas del <select> de países del original.
 *
 * @param {string}   value      - Código seleccionado (ej: '+52')
 * @param {Function} onChange   - Handler de cambio
 * @param {boolean}  withEmoji  - Si true, muestra emoji de bandera en las opciones
 * @param {object}   style      - Estilos extra para el select
 */
export default function PaisSelect({ value, onChange, withEmoji = false, style = {} }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{ ...fieldStyles.select, width: '110px', flexShrink: 0, ...style }}
    >
      {PAISES.map(({ codigo, etiqueta, emoji }) => (
        <option key={codigo} value={codigo}>
          {withEmoji ? `${emoji} ${etiqueta}` : etiqueta}
        </option>
      ))}
    </select>
  );
}
