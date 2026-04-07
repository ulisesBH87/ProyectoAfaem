import React, { useState } from 'react';
import StadiumBg from '../../assets/stadium.jpg';
import { Link, useNavigate } from 'react-router-dom';
import { login, setAuthToken, pingBackend, parseJwt } from '../../services/auth';
import { useRBAC } from '../../hooks/useRBAC';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
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
        console.log('pingBackend response:', r);
        setBackendOk(!!r.ok);
        if (!r.ok) setBackendDiag(r.tried || '');
      } catch (e) {
        setBackendOk(false);
        setBackendDiag('Error comprobando backend');
        console.log('pingBackend error:', e);
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
      console.log('TOKEN RECIBIDO:', token);
      let currentEstatusId = null;
      if (token) {
        setAuthToken(token);
        localStorage.setItem('token', token);
        console.log('🔄 Sincronizando permisos con el backend...');
        const accessData = await refreshAccess(); // ESPERAR a que el backend confirme quién es este usuario
        // Fallback: Prioridad a la respuesta del login, luego al servicio de permisos
        currentEstatusId = data?.usuario?.estatusId || accessData?.estatusId;
        window.dispatchEvent(new Event('user-logged-in'));
      }

      const userData = {
        email: email,
        correo: email,
        ...data
      };
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('email', email); // GUARDAR EMAIL DIRECTAMENTE

      const role = (data?.usuario?.rol || data?.rol || '').toUpperCase();
      console.log('ROL USUARIO (desde respuesta login):', role);
      console.log('ESTATUS ID detectado:', currentEstatusId);

      // GUARDAR UsuarioId SI EXISTE EN LA RESPUESTA
      if (data?.UsuarioId) {
        localStorage.setItem('UsuarioId', data.UsuarioId);
      } else if (data?.usuario_id) {
        localStorage.setItem('UsuarioId', data.usuario_id);
      } else if (data?.id) {
        localStorage.setItem('UsuarioId', data.id);
      } else {
        // FALLBACK: Extraer ID del JWT si no viene en el primer nivel del JSON
        const decoded = parseJwt(token);
        if (decoded && decoded.sub) {
          localStorage.setItem('UsuarioId', decoded.sub);
          console.log('🆔 ID extraído del Token:', decoded.sub);
        }
      }

      console.log('ROL USUARIO:', role);

      // --- NUEVA LÓGICA DE REDIRECCIÓN ESTRICTA ---
      if (role === 'ADMIN' || role === 'ADMINISTRADOR') {
        navigate('/admin/dashboard');
      } else if (role === 'ENTRENADOR') {
        navigate('/coach/dashboard');
      } else if (currentEstatusId && currentEstatusId >= 4) {
        // Solo entra al dashboard si ya está aprobado/activo o en revisión (Estatus 4, 5, 6 o 7)
        navigate('/presidente-equipo');
      } else {
        // En cualquier otro caso (Estatus 1, 2, 3, 4 o nuevo), al pre-registro
        navigate('/pre-registro-presidente');
      }
    } catch (error) {
      const msg = (error && (error.detail || error.message || error.error || error.msg)) || String(error);
      setErr(typeof msg === 'object' ? JSON.stringify(msg) : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page fade-in-up">
      <div className="auth-overlay"></div>
      
      <div className="auth-content">
        <div className="glass-dark auth-card-refined" style={{ maxWidth: '440px', margin: '0 auto', padding: '48px 40px', borderRadius: '24px', position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <img src={AfaemLogo} alt="AFAEM" style={{ height: '84px', marginBottom: '24px', filter: 'drop-shadow(0 0 15px rgba(255,255,255,0.3))' }} />
            <h1 className="heading-outfit" style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px', color: 'white' }}>Inicia Sesión</h1>
            <p className="glass-subtitle" style={{ fontWeight: '500', color: 'rgba(255,255,255,0.7)' }}>Bienvenido a la plataforma AFAEM</p>
          </div>
          
          <form onSubmit={handleSubmit}>
            {!backendOk && (
              <div style={{ background: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fef3c7', padding: '12px', borderRadius: '12px', marginBottom: '20px', fontSize: '13px', textAlign: 'center' }}>
                <strong>Servidor no disponible</strong>
                <div style={{ opacity: 0.8, marginTop: '4px' }}>{backendDiag}</div>
              </div>
            )}
            
            {err && (
              <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fecaca', padding: '12px', borderRadius: '12px', marginBottom: '20px', fontSize: '14px', textAlign: 'center', fontWeight: '600' }}>
                {err}
              </div>
            )}
            
            <div style={{ marginBottom: '24px' }}>
              <label className="auth-label">Correo electrónico</label>
              <input
                type="email"
                className="auth-input"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                disabled={loading}
                required
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label className="auth-label">Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', background: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '18px' }}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <div style={{ textAlign: 'right', marginTop: '12px' }}>
                <Link to="/olvide-contrasena" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '12px', fontWeight: '600' }}>
                  ¿Olvidó su contraseña?
                </Link>
              </div>
            </div>
            
            <button
              type="submit"
              className="btn-premium"
              disabled={loading}
              style={{ width: '100%', marginTop: '20px', padding: '16px' }}
            >
              {loading ? 'Validando acceso...' : 'Ingresar al sistema'}
            </button>
          </form>
          
          <div style={{ marginTop: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
            ¿No tienes cuenta? <Link to="/registrarse-cuenta" style={{ color: 'white', fontWeight: '700', textDecoration: 'none' }}>Regístrate ahora</Link>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '32px', opacity: 0.6 }}>
            <img src={FmfLogo} alt="FMF" style={{ height: '24px', objectFit: 'contain' }} />
            <img src={AmateurLogo} alt="Sector Amateur" style={{ height: '24px', objectFit: 'contain' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
