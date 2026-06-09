import { C } from './constants';

/**
 * PasoHeader
 * Encabezado reutilizable para cada paso del wizard:
 * título centrado + párrafo descriptivo.
 */
export default function PasoHeader({ titulo, descripcion }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 28 }}>
      <h2 style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 900, color: 'white' }}>
        {titulo}
      </h2>
      <p style={{ margin: 0, fontSize: 13, color: C.textDim }}>
        {descripcion}
      </p>
    </div>
  );
}
