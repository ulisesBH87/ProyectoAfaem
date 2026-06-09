import { C, fieldStyles, toYYYYMMDD, toDDMMYYYY } from './constants';

/**
 * ManualIdentityForm
 * Formulario colapsable para que el usuario corrija manualmente
 * los datos que el OCR no pudo extraer correctamente.
 */
export default function ManualIdentityForm({ ocrResults, onOcrManual }) {
  return (
    <div style={{
      background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.15)',
      borderRadius: 18, padding: '22px 24px', marginBottom: 22,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Línea decorativa superior */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.5), transparent)' }} />

      <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 800, color: C.amberLight, display: 'flex', alignItems: 'center', gap: 8 }}>
        ✏️ Formulario Manual de Identidad
      </h4>
      <p style={{ fontSize: 12, color: C.textDim, margin: '0 0 18px', lineHeight: 1.5 }}>
        Si el OCR no pudo extraer los datos, ingrésalos aquí. Los campos marcados con{' '}
        <span style={{ color: C.amber }}>*</span> son necesarios para finalizar.
      </p>

      {/* Nombre y CURP */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div>
          <label style={fieldStyles.label}>Nombre Completo <span style={{ color: C.amber }}>*</span></label>
          <input
            style={{ ...fieldStyles.input, textTransform: 'uppercase' }}
            type="text" placeholder="APELLIDOS NOMBRES (EN MAYÚSCULAS)"
            value={ocrResults.nombre || ''}
            onChange={e => onOcrManual('nombre', e.target.value.toUpperCase())}
          />
        </div>
        <div>
          <label style={fieldStyles.label}>CURP <span style={{ color: C.amber }}>*</span></label>
          <input
            style={{ ...fieldStyles.input, textTransform: 'uppercase' }}
            type="text" placeholder="18 CARACTERES" maxLength={18}
            value={ocrResults.curp || ''}
            onChange={e => onOcrManual('curp', e.target.value.toUpperCase())}
          />
        </div>
      </div>

      {/* Fecha de nacimiento y nacionalidad */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <div>
          <label style={fieldStyles.label}>Fecha de Nacimiento</label>
          <input
            style={{ ...fieldStyles.input, colorScheme: 'dark' }}
            type="date"
            value={toYYYYMMDD(ocrResults.fecha_nac) || ''}
            onChange={e => onOcrManual('fecha_nac', toDDMMYYYY(e.target.value))}
          />
        </div>
        <div>
          <label style={fieldStyles.label}>Nacionalidad</label>
          <input
            style={{ ...fieldStyles.input, textTransform: 'uppercase' }}
            type="text" placeholder="EJ. MEXICANA"
            value={ocrResults.nacionalidad || ''}
            onChange={e => onOcrManual('nacionalidad', e.target.value.toUpperCase())}
          />
        </div>
      </div>
    </div>
  );
}
