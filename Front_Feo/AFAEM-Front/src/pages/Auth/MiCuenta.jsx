import React, { useState, useEffect } from 'react';
import { FaUser, FaEnvelope, FaUserShield, FaKey, FaEye, FaEyeSlash, FaLock, FaSave } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { cambiarContrasena } from '../../services/auth';

export default function MiCuenta() {
  const [user, setUser] = useState({ nombre: '—', correo: '—', rol: '—' });

  // Estados del formulario
  const [contrasenaActual, setContrasenaActual] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');

  // Estados para mostrar/ocultar contraseñas
  const [showActual, setShowActual] = useState(false);
  const [showNueva, setShowNueva] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);

  const [cargando, setCargando] = useState(false);

  // Control de campos interactuados (touched) para no abrumar al usuario con errores antes de que escriba
  const [touched, setTouched] = useState({
    contrasenaActual: false,
    nuevaContrasena: false,
    confirmarContrasena: false
  });

  useEffect(() => {
    try {
      const rawUser = localStorage.getItem('user');
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        const email = parsed?.usuario?.correo || parsed?.correo || localStorage.getItem('email') || '—';
        const nombre = parsed?.usuario?.nombre || parsed?.nombre || '—';
        const rol = parsed?.usuario?.rol || parsed?.rol || '—';
        setUser({ nombre, correo: email, rol });
      } else {
        const email = localStorage.getItem('email') || '—';
        setUser({
          nombre: 'Usuario AFAEM',
          correo: email,
          rol: 'Presidente',
        });
      }
    } catch (e) {
      console.error('Error al parsear datos de usuario:', e);
    }
  }, []);

  // Reglas individuales de la nueva contraseña
  const passwordRules = {
    length:    nuevaContrasena.length >= 8,
    uppercase: /[A-Z]/.test(nuevaContrasena),
    lowercase: /[a-z]/.test(nuevaContrasena),
    number:    /[0-9]/.test(nuevaContrasena),
    special:   /[^A-Za-z0-9]/.test(nuevaContrasena),
  };
  const passwordRulesOk = Object.values(passwordRules).every(Boolean);

  // Validaciones en tiempo real
  const getValidationErrors = () => {
    const errors = {};

    if (!contrasenaActual) {
      errors.contrasenaActual = 'La contraseña actual es obligatoria.';
    }

    if (!nuevaContrasena) {
      errors.nuevaContrasena = 'La nueva contraseña es obligatoria.';
    } else if (!passwordRulesOk) {
      errors.nuevaContrasena = 'La nueva contraseña no cumple los requisitos de seguridad.';
    } else if (nuevaContrasena.length > 50) {
      errors.nuevaContrasena = 'La nueva contraseña no puede exceder los 50 caracteres.';
    } else if (nuevaContrasena === contrasenaActual && contrasenaActual) {
      errors.nuevaContrasena = 'La nueva contraseña no puede ser igual a la contraseña actual.';
    }

    if (!confirmarContrasena) {
      errors.confirmarContrasena = 'La confirmación de la nueva contraseña es obligatoria.';
    } else if (nuevaContrasena !== confirmarContrasena) {
      errors.confirmarContrasena = 'Las contraseñas no coinciden.';
    }

    return errors;
  };

  const errores = getValidationErrors();
  const esFormularioValido = Object.keys(errores).length === 0;

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Forzar touched en todos los campos para mostrar posibles errores
    setTouched({
      contrasenaActual: true,
      nuevaContrasena: true,
      confirmarContrasena: true
    });

    if (!esFormularioValido) {
      Swal.fire('Formulario inválido', 'Por favor, corrige los errores antes de continuar.', 'warning');
      return;
    }

    try {
      setCargando(true);
      await cambiarContrasena(contrasenaActual, nuevaContrasena);

      Swal.fire({
        title: '¡Contraseña cambiada!',
        text: 'Tu contraseña ha sido actualizada correctamente.',
        icon: 'success',
        confirmButtonColor: '#0b4ea6'
      });

      // Limpiar el formulario
      setContrasenaActual('');
      setNuevaContrasena('');
      setConfirmarContrasena('');
      setTouched({
        contrasenaActual: false,
        nuevaContrasena: false,
        confirmarContrasena: false
      });
    } catch (err) {
      console.error(err);
      // Si el backend devuelve CREDENCIALES_INVALIDAS, mostrar mensaje específico del contexto
      const errorCode = err?.response?.data?.code;
      const errorMsg = errorCode === 'CREDENCIALES_INVALIDAS'
        ? 'La contraseña actual es incorrecta.'
        : (err?.response?.data?.detail || err?.message || 'No se pudo cambiar la contraseña.');
      Swal.fire({
        title: 'Error',
        text: errorMsg,
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fade-in-up" style={{ padding: '4px 0 32px' }}>
      {/* ENCABEZADO */}
      <header style={{ marginBottom: '32px' }}>
        <h2
          className="heading-outfit"
          style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}
        >
          Mi Cuenta
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px' }}>
          Visualiza tu perfil de acceso y actualiza tu contraseña de seguridad.
        </p>
      </header>

      {/* DISPOSICIÓN RESPONSIVE DE TARJETAS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* TARJETA 1: INFORMACIÓN DEL USUARIO */}
        <div className="card glass" style={{ padding: '28px', borderRadius: '20px', background: 'white' }}>
          <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
            Información del Perfil
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* NOMBRE COMPLETO */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '12px',
                background: 'rgba(37,99,235,0.08)', color: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0
              }}>
                <FaUser />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nombre completo</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', marginTop: '2px', wordBreak: 'break-word' }}>{user.nombre}</div>
              </div>
            </div>

            {/* CORREO ELECTRÓNICO */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '12px',
                background: 'rgba(37,99,235,0.08)', color: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0
              }}>
                <FaEnvelope />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Correo electrónico</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', marginTop: '2px', wordBreak: 'break-word' }}>{user.correo}</div>
              </div>
            </div>

            {/* ROL ASIGNADO */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '12px',
                background: 'rgba(37,99,235,0.08)', color: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0
              }}>
                <FaUserShield />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rol asignado</div>
                <div style={{ display: 'inline-block', marginTop: '4px' }}>
                  <span style={{
                    background: 'rgba(37, 99, 235, 0.08)',
                    color: 'var(--primary)',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    border: '1.5px solid rgba(37, 99, 235, 0.15)'
                  }}>
                    {user.rol}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TARJETA 2: CAMBIAR CONTRASEÑA */}
        <div className="card glass" style={{ padding: '28px', borderRadius: '20px', background: 'white' }}>
          <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
            Cambiar Contraseña
          </h3>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* CONTRASEÑA ACTUAL */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: '#25303b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Contraseña actual <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                  <FaLock />
                </span>
                <input
                  type={showActual ? 'text' : 'password'}
                  value={contrasenaActual}
                  onChange={(e) => { setContrasenaActual(e.target.value); setTouched(prev => ({ ...prev, contrasenaActual: true })); }}
                  onBlur={() => handleBlur('contrasenaActual')}
                  placeholder="Ingresa tu contraseña actual"
                  disabled={cargando}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '10px 40px 10px 38px', fontSize: '14px',
                    border: `1.5px solid ${touched.contrasenaActual && errores.contrasenaActual ? '#dc3545' : '#cbd5e1'}`,
                    borderRadius: '8px', outline: 'none', background: cargando ? '#f8fafc' : 'white', transition: 'all 0.2s'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowActual(!showActual)}
                  style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px', display: 'flex', alignItems: 'center' }}
                >
                  {showActual ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {touched.contrasenaActual && errores.contrasenaActual && (
                <span style={{ display: 'block', fontSize: '12px', color: '#dc3545', marginTop: '6px', fontWeight: '600' }}>
                  ❌ {errores.contrasenaActual}
                </span>
              )}
            </div>

            {/* NUEVA CONTRASEÑA */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: '#25303b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Nueva contraseña <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                  <FaKey />
                </span>
                <input
                  type={showNueva ? 'text' : 'password'}
                  value={nuevaContrasena}
                  onChange={(e) => { setNuevaContrasena(e.target.value); setTouched(prev => ({ ...prev, nuevaContrasena: true })); }}
                  onBlur={() => handleBlur('nuevaContrasena')}
                  placeholder="Mínimo 8 caracteres"
                  disabled={cargando}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '10px 40px 10px 38px', fontSize: '14px',
                    border: `1.5px solid ${touched.nuevaContrasena && errores.nuevaContrasena ? '#dc3545' : '#cbd5e1'}`,
                    borderRadius: '8px', outline: 'none', background: cargando ? '#f8fafc' : 'white', transition: 'all 0.2s'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowNueva(!showNueva)}
                  style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px', display: 'flex', alignItems: 'center' }}
                >
                  {showNueva ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              {/* INDICADOR DE REQUISITOS */}
              {touched.nuevaContrasena && (
                <div style={{
                  marginTop: '10px', padding: '12px 14px', borderRadius: '10px',
                  background: 'rgba(248, 250, 252, 0.9)', border: '1px solid #e2e8f0',
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px'
                }}>
                  {[
                    { ok: passwordRules.length,    label: 'Mínimo 8 caracteres' },
                    { ok: passwordRules.uppercase,  label: 'Una mayúscula (A-Z)' },
                    { ok: passwordRules.lowercase,  label: 'Una minúscula (a-z)' },
                    { ok: passwordRules.number,     label: 'Un número (0-9)' },
                    { ok: passwordRules.special,    label: 'Un carácter especial (!@#...)' },
                  ].map(({ ok, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        fontSize: '12px', fontWeight: '800',
                        color: ok ? '#16a34a' : '#dc3545'
                      }}>
                        {ok ? '✓' : '×'}
                      </span>
                      <span style={{ fontSize: '12px', color: ok ? '#16a34a' : '#64748b', fontWeight: ok ? '700' : '500' }}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {touched.nuevaContrasena && errores.nuevaContrasena && nuevaContrasena && !passwordRulesOk && (
                <span style={{ display: 'block', fontSize: '12px', color: '#dc3545', marginTop: '6px', fontWeight: '600' }}>
                  ❌ Completa todos los requisitos de seguridad.
                </span>
              )}
              {touched.nuevaContrasena && errores.nuevaContrasena && nuevaContrasena && passwordRulesOk && (
                <span style={{ display: 'block', fontSize: '12px', color: '#dc3545', marginTop: '6px', fontWeight: '600' }}>
                  ❌ {errores.nuevaContrasena}
                </span>
              )}
            </div>

            {/* CONFIRMAR NUEVA CONTRASEÑA */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: '#25303b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Confirmar nueva contraseña <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                  <FaKey />
                </span>
                <input
                  type={showConfirmar ? 'text' : 'password'}
                  value={confirmarContrasena}
                  onChange={(e) => { setConfirmarContrasena(e.target.value); setTouched(prev => ({ ...prev, confirmarContrasena: true })); }}
                  onBlur={() => handleBlur('confirmarContrasena')}
                  placeholder="Repite la nueva contraseña"
                  disabled={cargando}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '10px 40px 10px 38px', fontSize: '14px',
                    border: `1.5px solid ${touched.confirmarContrasena && errores.confirmarContrasena ? '#dc3545' : '#cbd5e1'}`,
                    borderRadius: '8px', outline: 'none', background: cargando ? '#f8fafc' : 'white', transition: 'all 0.2s'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmar(!showConfirmar)}
                  style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px', display: 'flex', alignItems: 'center' }}
                >
                  {showConfirmar ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {touched.confirmarContrasena && errores.confirmarContrasena && (
                <span style={{ display: 'block', fontSize: '12px', color: '#dc3545', marginTop: '6px', fontWeight: '600' }}>
                  ❌ {errores.confirmarContrasena}
                </span>
              )}
            </div>

            {/* BOTÓN DE ENVÍO */}
            <button
              type="submit"
              disabled={cargando || (touched.contrasenaActual || touched.nuevaContrasena || touched.confirmarContrasena ? !esFormularioValido : false)}
              style={{
                width: '100%', padding: '12px 24px', borderRadius: '12px',
                background: cargando || !esFormularioValido && (touched.contrasenaActual || touched.nuevaContrasena || touched.confirmarContrasena)
                  ? '#94a3b8' : 'linear-gradient(135deg, #0b4ea6 0%, #1e40af 100%)',
                color: 'white', border: 'none', fontWeight: '700', fontSize: '14px',
                cursor: cargando || !esFormularioValido && (touched.contrasenaActual || touched.nuevaContrasena || touched.confirmarContrasena) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: cargando || !esFormularioValido && (touched.contrasenaActual || touched.nuevaContrasena || touched.confirmarContrasena) ? 'none' : '0 4px 12px rgba(11, 78, 166, 0.2)',
                transition: 'all 0.2s', marginTop: '8px'
              }}
            >
              <FaSave /> {cargando ? 'Actualizando contraseña...' : 'Actualizar contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
