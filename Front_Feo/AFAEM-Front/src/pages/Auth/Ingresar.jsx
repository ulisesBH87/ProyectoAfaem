import React, { useState } from 'react';
import StadiumBg from '../../assets/stadium.jpg';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../routes/paths';
import { login, setAuthToken, pingBackend, parseJwt } from '../../services/auth';
import { useRBAC } from '../../hooks/useRBAC';
import Swal from 'sweetalert2';
import AfaemLogo from '../../assets/afaem-logo@4x.png';
import AmateurLogo from '../../assets/amateur-logo.png';
import FmfLogo from '../../assets/fmf-logo.png';

export default function Ingresar() {
  const navigate = useNavigate();
  const { refreshAccess } = useRBAC();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [backendOk, setBackendOk] = useState(true);
  const [backendDiag, setBackendDiag] = useState('');

  React.useEffect(() => {
    (async () => {
      try {
        const r = await pingBackend();
        setBackendOk(!!r.ok);
        if (!r.ok) setBackendDiag(r.tried || '');
      } catch (e) {
        setBackendOk(false);
        setBackendDiag('Error comprobando backend');
      }
    })();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr(null);
    if (!email || !password) { setErr('Ingresa correo y contraseña'); return; }
    setLoading(true);
    try {
      const data = await login(email.toLowerCase(), password);
      const token = data?.token || data?.access || data?.access_token || null;
      let currentEstatusId = null;
      if (token) {
        setAuthToken(token);
        localStorage.setItem('token', token);
        const accessData = await refreshAccess();
        currentEstatusId = data?.usuario?.estatusId || accessData?.estatusId;
        window.dispatchEvent(new Event('user-logged-in'));
      }

      const userData = {
        email: email,
        correo: email,
        ...data
      };
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('email', email);
      localStorage.setItem('token_timestamp', Date.now().toString()); // CONTROL DE 5 HORAS

      const role = (data?.usuario?.rol || data?.rol || '').toUpperCase();

      // GUARDAR UsuarioId SI EXISTE EN LA RESPUESTA
      if (data?.UsuarioId) {
        localStorage.setItem('UsuarioId', data.UsuarioId);
      } else if (data?.usuario_id) {
        localStorage.setItem('UsuarioId', data.usuario_id);
      } else if (data?.id) {
        localStorage.setItem('UsuarioId', data.id);
      } else {
        const decoded = parseJwt(token);
        if (decoded && decoded.sub) {
          localStorage.setItem('UsuarioId', decoded.sub);
        }
      }

      // --- NUEVA LÓGICA DE REDIRECCIÓN ESTRICTA ---
      if (role === 'ADMIN' || role === 'ADMINISTRADOR') {
        navigate(ROUTES.ADMIN.DASHBOARD);
      } else if (role === 'MASTER') {
        navigate(ROUTES.MASTER.AUDITORIAS);
      } else if (role === 'ENTRENADOR') {
        Swal.fire({
          icon: 'info',
          title: 'Módulo en desarrollo',
          text: 'El módulo de entrenador estará disponible próximamente.',
          confirmButtonColor: 'var(--primary)',
          timer: 4000,
          showConfirmButton: true,
        });
        navigate(ROUTES.LOGIN);
      } else if (role.includes('PRESIDENTE') || role === 'INVITADO') {
        // Solo entra al dashboard si ya está aprobado/activo o en revisión (Estatus 4, 5, 6 o 7)
        // Pero si es INVITADO, siempre va a pre-registro
        if (role !== 'INVITADO' && currentEstatusId && parseInt(currentEstatusId) >= 5) {
          navigate(ROUTES.PRESIDENTE.EQUIPOS);
        } else {
          navigate(ROUTES.PRE_REGISTRO_PRESIDENTE);
        }
      } else {
        // En cualquier otro caso, al home
        navigate(ROUTES.HOME);
      }
    } catch (error) {
      const msg = (error && (error.detail || error.message || error.error || error.msg)) || String(error);
      setErr(typeof msg === 'object' ? JSON.stringify(msg) : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-overlay"></div>

      <div className="auth-content fade-in-up">
        <div className="glass-dark auth-card-refined" style={{ padding: 'clamp(24px, 6vh, 48px) clamp(16px, 5vw, 40px)' }}>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(20px, 5vh, 40px)' }}>
            <img src={AfaemLogo} alt="AFAEM" style={{ height: 'clamp(60px, 12vh, 84px)', marginBottom: 'clamp(12px, 3vh, 24px)', filter: 'drop-shadow(0 0 15px rgba(255,255,255,0.3))' }} />
            <h1 className="heading-outfit" style={{ fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: '800', marginBottom: '8px', color: 'white' }}>Inicia Sesión</h1>
            <p className="glass-subtitle" style={{ fontWeight: '500', color: 'rgba(255,255,255,0.7)', fontSize: 'clamp(12px, 3.5vw, 15px)' }}>Bienvenido a la plataforma AFAEM</p>
          </div>

          <form onSubmit={handleSubmit}>
            {!backendOk && (
              <div style={{ background: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fef3c7', padding: '12px', borderRadius: '12px', marginBottom: '20px', fontSize: '13px', textAlign: 'center' }}>
                <strong>Problemas de conexión</strong>
                <div style={{ opacity: 0.8, marginTop: '4px' }}>Estamos experimentando errores internos. Por favor, inténtalo de nuevo en unos minutos.</div>
              </div>
            )}

            {err && (
              <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fecaca', padding: '12px', borderRadius: '12px', marginBottom: '20px', fontSize: '14px', textAlign: 'center', fontWeight: '600' }}>
                {err}
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label className="auth-label" style={{ fontSize: 'clamp(11px, 3vw, 13px)' }}>Correo electrónico</label>
              <input
                type="email"
                className="auth-input"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                disabled={loading}
                required
                style={{ padding: 'clamp(10px, 2.2vh, 14px) 16px' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="auth-label" style={{ fontSize: 'clamp(11px, 3vw, 13px)' }}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  style={{ padding: 'clamp(10px, 2.2vh, 14px) 16px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: '6px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 10
                  }}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-premium"
              disabled={loading}
              style={{ width: '100%', marginTop: '16px', padding: 'clamp(12px, 2.5vh, 16px)' }}
            >
              {loading ? 'Validando acceso...' : 'Ingresar al sistema'}
            </button>
          </form>

          <div style={{ marginTop: 'clamp(16px, 4vh, 32px)', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(12px, 3.5vw, 14px)' }}>
            ¿No tienes cuenta? <Link to={ROUTES.REGISTRARSE_CUENTA} style={{ color: 'white', fontWeight: '700', textDecoration: 'none' }}>Regístrate ahora</Link>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: 'clamp(16px, 4vh, 32px)', opacity: 0.6 }}>
            <img src={FmfLogo} alt="FMF" style={{ height: 'clamp(16px, 3vh, 24px)', objectFit: 'contain' }} />
            <img src={AmateurLogo} alt="Sector Amateur" style={{ height: 'clamp(16px, 3vh, 24px)', objectFit: 'contain' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
