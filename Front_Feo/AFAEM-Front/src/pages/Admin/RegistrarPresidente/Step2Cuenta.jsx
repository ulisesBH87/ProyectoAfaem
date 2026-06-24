import { C, fieldStyles } from './constants';
import PasoHeader from './PasoHeader';
import PaisSelect from './PaisSelect';
import PasswordField from './PasswordField';
import COLORS from '../../../styles/colors';

/**
 * Step1Cuenta
 * Paso 1 del wizard: datos de cuenta del nuevo presidente.
 */
export default function Step2Cuenta({
  cuenta, setCuentaField, cuentaErrors, codigoPaisCuenta, setCodigoPaisCuenta,
  codigoPaisOpcionalCuenta, setCodigoPaisOpcionalCuenta, isCheckingCurp
}) {
  return (
    <div>
      <PasoHeader
        titulo="Datos de la Cuenta"
      />

      {/* Aviso admin */}
      <div style={{
        background: COLORS.warningBgTranslucent07, border: `1px solid ${COLORS.warningBgTranslucent20}`,
        borderRadius: 14, padding: '14px 18px', marginBottom: 26,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 20 }}>🔐</span>
        <p style={{ margin: 0, fontSize: 13, color: COLORS.overlayWhite70, lineHeight: 1.5 }}>
          Como <strong style={{ color: C.amberLight }}>Administrador</strong> defines la contraseña del nuevo presidente.
          La cuenta se activará <strong style={{ color: C.amberLight }}>al instante</strong> sin procesos de validación.
        </p>
      </div>

      {/* Fila 1: Nombre, Primer Apellido, Segundo Apellido y Correo */}
      <div className="rp-grid-4cols-equal">
        <div>
          <label style={fieldStyles.label}>Nombre(s) <span style={{ color: C.amber }}>*</span></label>
          <input
            style={{ ...fieldStyles.input, textTransform: 'uppercase', borderColor: cuentaErrors.nombre ? C.rose : C.inputBorder }}
            type="text" placeholder="Ej: JUAN CARLOS"
            autoComplete="off"
            value={cuenta.nombre} onChange={e => setCuentaField('nombre', e.target.value)}
          />
          {cuentaErrors.nombre && <span style={{ fontSize: 11, color: C.rose, marginTop: 3, display: 'block' }}>{cuentaErrors.nombre}</span>}
        </div>
        <div>
          <label style={fieldStyles.label}>Primer Apellido <span style={{ color: C.amber }}>*</span></label>
          <input
            style={{ ...fieldStyles.input, textTransform: 'uppercase', borderColor: cuentaErrors.primerApellido ? C.rose : C.inputBorder }}
            type="text" placeholder="Ej: GARCÍA"
            autoComplete="off"
            value={cuenta.primerApellido} onChange={e => setCuentaField('primerApellido', e.target.value)}
          />
          {cuentaErrors.primerApellido && <span style={{ fontSize: 11, color: C.rose, marginTop: 3, display: 'block' }}>{cuentaErrors.primerApellido}</span>}
        </div>
        <div>
          <label style={fieldStyles.label}>Segundo Apellido</label>
          <input
            style={{ ...fieldStyles.input, textTransform: 'uppercase' }}
            type="text" placeholder="Ej: LÓPEZ"
            autoComplete="off"
            value={cuenta.segundoApellido} onChange={e => setCuentaField('segundoApellido', e.target.value)}
          />
        </div>
        <div>
          <label style={fieldStyles.label}>Correo Electrónico <span style={{ color: C.amber }}>*</span></label>
          <input
            style={{ ...fieldStyles.input, textTransform: 'uppercase', borderColor: cuentaErrors.correo ? C.rose : C.inputBorder }}
            type="email" placeholder="PRESIDENTE@CORREO.COM"
            autoComplete="new-password"
            value={cuenta.correo} onChange={e => setCuentaField('correo', e.target.value)}
          />
          {cuentaErrors.correo && <span style={{ fontSize: 11, color: C.rose, marginTop: 3, display: 'block' }}>{cuentaErrors.correo}</span>}
        </div>
      </div>

      {/* Fila 2: Teléfono, Segundo Teléfono y CURP */}
      <div className="rp-grid-3cols-equal">
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
        <div>
          <label style={fieldStyles.label}>Segundo Teléfono (Opcional)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <PaisSelect value={codigoPaisOpcionalCuenta} onChange={e => setCodigoPaisOpcionalCuenta(e.target.value)} withEmoji={false} />
            <input
              style={{ ...fieldStyles.input }}
              type="tel" placeholder="5512345678" maxLength={10}
              value={cuenta.telefonoOpcional || ''}
              onChange={e => setCuentaField('telefonoOpcional', e.target.value.replace(/\D/g, '').slice(0, 10))}
            />
          </div>
        </div>
        <div>
          <label style={fieldStyles.label}>
            CURP <span style={{ color: C.amber }}>*</span>
            {isCheckingCurp && <span style={{ marginLeft: '10px', color: COLORS.success, fontSize: '10px' }}>Validando...</span>}
          </label>
          <input
            style={{ ...fieldStyles.input, textTransform: 'uppercase', borderColor: cuentaErrors.curp ? C.rose : C.inputBorder }}
            type="text" placeholder="18 CARACTERES" maxLength={18}
            value={cuenta.curp} onChange={e => setCuentaField('curp', e.target.value.toUpperCase())}
          />
          {cuentaErrors.curp && <span style={{ fontSize: 11, color: C.rose, marginTop: 3, display: 'block' }}>{cuentaErrors.curp}</span>}
        </div>
      </div>

      {/* Fila 3: Sexo, Fecha de nacimiento y Nacionalidad */}
      <div className="rp-grid-3cols-equal">
        <div>
          <label style={fieldStyles.label}>Sexo</label>
          <select style={fieldStyles.select} value={cuenta.sexoId} onChange={e => setCuentaField('sexoId', e.target.value)}>
            <option value="">Selecciona…</option>
            <option value="1">Masculino</option>
            <option value="2">Femenino</option>
            <option value="3">Otro</option>
          </select>
        </div>
        <div>
          <label style={fieldStyles.label}>Fecha de Nacimiento</label>
          <input
            style={{ ...fieldStyles.input, colorScheme: 'dark' }}
            type="date" value={cuenta.fechaNacimiento || ''}
            onChange={e => setCuentaField('fechaNacimiento', e.target.value)}
          />
          {(() => {
            const val = cuenta.fechaNacimiento;
            if (!val) return null;
            const fechaDate = new Date(val);
            const hoy = new Date();

            if (fechaDate.getFullYear() < 1900) {
              return <span style={{ fontSize: 11, color: C.rose, marginTop: 4, display: 'block' }}>El año de nacimiento no puede ser menor a 1900</span>;
            }
            if (fechaDate.getFullYear() > hoy.getFullYear()) {
              return <span style={{ fontSize: 11, color: C.rose, marginTop: 4, display: 'block' }}>El año de nacimiento es inválido</span>;
            }

            const limitDate = new Date(hoy.getFullYear() - 18, hoy.getMonth(), hoy.getDate());
            if (fechaDate > limitDate) {
              return <span style={{ fontSize: 11, color: C.rose, marginTop: 4, display: 'block' }}>El presidente debe tener más de 18 años</span>;
            }

            return null;
          })()}
        </div>
        <div>
          <label style={fieldStyles.label}>Nacionalidad</label>
          <input
            style={{ ...fieldStyles.input, textTransform: 'uppercase' }}
            type="text" placeholder="EJ: MEXICANA"
            value={cuenta.nacionalidad}
            onChange={e => setCuentaField('nacionalidad', e.target.value)}
          />
        </div>
      </div>

      {/* Contraseñas */}
      <div className="rp-grid-2cols">
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
