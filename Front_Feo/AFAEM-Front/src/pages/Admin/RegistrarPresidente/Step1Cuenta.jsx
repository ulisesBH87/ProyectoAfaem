import { C, fieldStyles } from './constants';
import PasoHeader from './PasoHeader';
import PaisSelect from './PaisSelect';
import PasswordField from './PasswordField';

/**
 * Step1Cuenta
 * Paso 1 del wizard: datos de cuenta del nuevo presidente.
 */
export default function Step1Cuenta({ cuenta, setCuentaField, cuentaErrors, codigoPaisCuenta, setCodigoPaisCuenta }) {
  return (
    <div>
      <PasoHeader
        titulo="Datos de la Cuenta"
        descripcion="El administrador define las credenciales de acceso del nuevo presidente."
      />

      {/* Aviso admin */}
      <div style={{
        background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)',
        borderRadius: 14, padding: '14px 18px', marginBottom: 26,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 20 }}>🔐</span>
        <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
          Como <strong style={{ color: C.amberLight }}>Administrador</strong> defines la contraseña del nuevo presidente.
          La cuenta se activará <strong style={{ color: C.amberLight }}>al instante</strong> sin procesos de validación.
        </p>
      </div>

      {/* Nombre y apellidos */}
      <div className="rp-grid-3cols">
        <div>
          <label style={fieldStyles.label}>Nombre(s) <span style={{ color: C.amber }}>*</span></label>
          <input
            style={{ ...fieldStyles.input, textTransform: 'uppercase', borderColor: cuentaErrors.nombre ? C.rose : C.inputBorder }}
            type="text" placeholder="Ej: JUAN CARLOS"
            value={cuenta.nombre} onChange={e => setCuentaField('nombre', e.target.value)}
          />
          {cuentaErrors.nombre && <span style={{ fontSize: 11, color: C.rose, marginTop: 3, display: 'block' }}>{cuentaErrors.nombre}</span>}
        </div>
        <div>
          <label style={fieldStyles.label}>Primer Apellido <span style={{ color: C.amber }}>*</span></label>
          <input
            style={{ ...fieldStyles.input, textTransform: 'uppercase', borderColor: cuentaErrors.primerApellido ? C.rose : C.inputBorder }}
            type="text" placeholder="Ej: GARCÍA"
            value={cuenta.primerApellido} onChange={e => setCuentaField('primerApellido', e.target.value)}
          />
          {cuentaErrors.primerApellido && <span style={{ fontSize: 11, color: C.rose, marginTop: 3, display: 'block' }}>{cuentaErrors.primerApellido}</span>}
        </div>
        <div>
          <label style={fieldStyles.label}>Segundo Apellido</label>
          <input
            style={{ ...fieldStyles.input, textTransform: 'uppercase' }}
            type="text" placeholder="Ej: LÓPEZ"
            value={cuenta.segundoApellido} onChange={e => setCuentaField('segundoApellido', e.target.value)}
          />
        </div>
      </div>

      {/* Correo y teléfono */}
      <div className="rp-grid-2cols">
        <div>
          <label style={fieldStyles.label}>Correo Electrónico <span style={{ color: C.amber }}>*</span></label>
          <input
            style={{ ...fieldStyles.input, textTransform: 'uppercase', borderColor: cuentaErrors.correo ? C.rose : C.inputBorder }}
            type="email" placeholder="PRESIDENTE@CORREO.COM"
            value={cuenta.correo} onChange={e => setCuentaField('correo', e.target.value)}
          />
          {cuentaErrors.correo && <span style={{ fontSize: 11, color: C.rose, marginTop: 3, display: 'block' }}>{cuentaErrors.correo}</span>}
        </div>
        <div>
          <label style={fieldStyles.label}>Teléfono (10 dígitos) <span style={{ color: C.amber }}>*</span></label>
          <div style={{ display: 'flex', gap: 8 }}>
            <PaisSelect value={codigoPaisCuenta} onChange={e => setCodigoPaisCuenta(e.target.value)} withEmoji={false} />
            <input
              style={{ ...fieldStyles.input, borderColor: cuentaErrors.telefono ? C.rose : C.inputBorder }}
              type="tel" placeholder="5512345678" maxLength={10}
              value={cuenta.telefono}
              onChange={e => setCuentaField('telefono', e.target.value.replace(/\D/g, '').slice(0, 10))}
            />
          </div>
          {cuentaErrors.telefono && <span style={{ fontSize: 11, color: C.rose, marginTop: 3, display: 'block' }}>{cuentaErrors.telefono}</span>}
        </div>
      </div>

      {/* CURP y sexo */}
      <div className="rp-grid-2to1">
        <div>
          <label style={fieldStyles.label}>CURP <span style={{ color: C.amber }}>*</span></label>
          <input
            style={{ ...fieldStyles.input, textTransform: 'uppercase', borderColor: cuentaErrors.curp ? C.rose : C.inputBorder }}
            type="text" placeholder="18 CARACTERES" maxLength={18}
            value={cuenta.curp} onChange={e => setCuentaField('curp', e.target.value.toUpperCase())}
          />
          {cuentaErrors.curp && <span style={{ fontSize: 11, color: C.rose, marginTop: 3, display: 'block' }}>{cuentaErrors.curp}</span>}
        </div>
        <div>
          <label style={fieldStyles.label}>Sexo</label>
          <select style={fieldStyles.select} value={cuenta.sexoId} onChange={e => setCuentaField('sexoId', e.target.value)}>
            <option value="">Selecciona…</option>
            <option value="1">Masculino</option>
            <option value="2">Femenino</option>
            <option value="3">No binario</option>
          </select>
        </div>
      </div>

      {/* Fecha de nacimiento + contraseñas */}
      <div className="rp-grid-3cols-equal">
        <div>
          <label style={fieldStyles.label}>Fecha de Nacimiento</label>
          <input
            style={{ ...fieldStyles.input, colorScheme: 'dark' }}
            type="date" value={cuenta.fechaNacimiento}
            onChange={e => setCuentaField('fechaNacimiento', e.target.value)}
          />
        </div>
        <PasswordField
          label="Contraseña"
          value={cuenta.contrasena}
          onChange={e => setCuentaField('contrasena', e.target.value)}
          error={cuentaErrors.contrasena}
          showStrength
        />
        <PasswordField
          label="Confirmar Contraseña"
          value={cuenta.confirmarContrasena}
          onChange={e => setCuentaField('confirmarContrasena', e.target.value)}
          error={cuentaErrors.confirmarContrasena}
          matchValue={cuenta.contrasena}
        />
      </div>
    </div>
  );
}
