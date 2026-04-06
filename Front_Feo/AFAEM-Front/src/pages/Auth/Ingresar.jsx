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
      const data = await login(email, password);
      const token = data?.token || data?.access || data?.access_token || null;
      console.log('TOKEN RECIBIDO:', token);
      let currentEstatusId = null;
      if (token) {
        setAuthToken(token);
        localStorage.setItem('token', token);
        console.log('🔄 Sincronizando permisos con el backend...');
        const accessData = await refreshAccess(); // ESPERAR a que el backend confirme quién es este usuario
        currentEstatusId = accessData?.estatusId;
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
      } else if (currentEstatusId && currentEstatusId >= 5) {
        // Solo entra al dashboard si ya está aprobado/activo (Estatus 5, 6 o 7)
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
    <div className="login-container fade-in">
      <style>{`
        .login-container {
          min-height: 100vh;
          background: linear-gradient(135deg, rgba(11, 78, 166, 0.8) 0%, rgba(6, 63, 130, 0.9) 100%), url('${StadiumBg}');
          background-position: center;
          background-size: cover;
          background-blend-mode: overlay;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
        
        .login-card {
          width: 100%;
          max-width: 480px;
          padding: 50px 40px;
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .login-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .logo-main {
          height: 80px;
          margin-bottom: 20px;
          filter: drop-shadow(0 0 10px rgba(255,255,255,0.2));
        }
        
        .logo-group {
          display: flex;
          justify-content: center;
          gap: 15px;
          margin-top: 25px;
          opacity: 0.7;
          align-items: center;
        }
        
        .logo-group img {
          height: 28px;
          object-fit: contain;
        }
        
        .login-title {
          color: white;
          font-size: 32px;
          font-weight: 800;
          margin: 0;
          letter-spacing: -0.5px;
        }
        
        .login-subtitle {
          color: rgba(255,255,255,0.7);
          font-size: 16px;
          margin-top: 10px;
        }
        
        .form-label {
          display: block;
          font-weight: 700;
          color: rgba(255,255,255,0.9);
          margin-bottom: 10px;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .form-input {
          width: 100%;
          padding: 15px 18px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          font-size: 15px;
          color: white;
          transition: all 0.3s ease;
          box-sizing: border-box;
          backdrop-filter: blur(5px);
        }
        
        .form-input:focus {
          outline: none;
          background: rgba(255, 255, 255, 0.2);
          border-color: var(--primary-light, #5d87e5);
          box-shadow: 0 0 0 4px rgba(93, 135, 229, 0.2);
        }

        .form-input::placeholder {
          color: rgba(255,255,255,0.4);
        }
        
        .password-container {
          position: relative;
        }
        
        .toggle-password {
          position: absolute;
          right: 15px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: rgba(255,255,255,0.6);
          font-size: 18px;
          padding: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }
        .toggle-password:hover { color: white; }
        
        .error-box {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fecaca;
          padding: 15px;
          border-radius: 12px;
          margin-bottom: 25px;
          font-size: 14px;
          text-align: center;
          font-weight: 500;
        }
        
        .backend-warning {
          background: rgba(245, 158, 11, 0.2);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: #fef3c7;
          padding: 15px;
          border-radius: 12px;
          margin-bottom: 25px;
          font-size: 13px;
          text-align: center;
        }

        .footer-links {
          margin-top: 30px;
          text-align: center;
          color: rgba(255,255,255,0.6);
          font-size: 14px;
        }
        .footer-links a {
          color: white;
          text-decoration: none;
          font-weight: 700;
          margin-left: 5px;
        }
        .footer-links a:hover { text-decoration: underline; }

        @media (max-width: 480px) {
          .login-card { padding: 40px 25px; }
          .login-title { font-size: 26px; }
        }
      `}</style>
      
      <div className="login-card card glass">
        <div className="login-header">
          <img src={AfaemLogo} alt="AFAEM" className="logo-main" />
          <h1 className="login-title">Inicia Sesión</h1>
          <p className="login-subtitle">Bienvenido a la plataforma AFAEM</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          {!backendOk && (
            <div className="backend-warning">
              <strong>⚠️ Servidor no disponible</strong>
              <div style={{ opacity: 0.8, marginTop: '4px' }}>{backendDiag}</div>
            </div>
          )}
          
          {err && <div className="error-box">{err}</div>}
          
          <div style={{ marginBottom: '25px' }}>
            <label className="form-label">Correo electrónico</label>
            <input
              type="email"
              className="form-input"
              placeholder="ejemplo@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label className="form-label">Contraseña</label>
            <div className="password-container">
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <div style={{ textAlign: 'right', marginTop: '10px' }}>
              <Link to="/olvide-contrasena" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '12px' }}>
                ¿Olvidó su contraseña?
              </Link>
            </div>
          </div>
          
          <button
            type="submit"
            className="btn-premium"
            disabled={loading}
            style={{ width: '100%', marginTop: '15px', padding: '16px' }}
          >
            {loading ? '⏳ Validando acceso...' : 'Ingresar al sistema'}
          </button>
        </form>
        
        <div className="footer-links">
          ¿No tienes cuenta? <Link to="/registrarse-cuenta">Regístrate ahora</Link>
        </div>

        <div className="logo-group">
          <img src={FmfLogo} alt="FMF" />
          <img src={AmateurLogo} alt="Sector Amateur" />
        </div>
      </div>
    </div>
  );
}
