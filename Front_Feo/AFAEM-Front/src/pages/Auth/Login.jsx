import React, { useState } from 'react';
import StadiumBg from '../../assets/stadium.jpg';
import { Link, useNavigate } from 'react-router-dom';
import { login, setAuthToken, pingBackend } from '../../services/auth';
import AfaemLogo from '../../assets/afaem-logo@4x.png';
import AmateurLogo from '../../assets/amateur-logo.png';
import FmfLogo from '../../assets/fmf-logo.png';

export default function Login() {
  const navigate = useNavigate();
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
      if (token) {
        setAuthToken(token);
        localStorage.setItem('token', token);
      }
      const userData = {
        email: email,
        correo: email,
        ...data
      };
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('email', email); // GUARDAR EMAIL DIRECTAMENTE
      
      // GUARDAR UsuarioId SI EXISTE EN LA RESPUESTA
      if (data?.UsuarioId) {
        localStorage.setItem('UsuarioId', data.UsuarioId);
      } else if (data?.usuario_id) {
        localStorage.setItem('UsuarioId', data.usuario_id);
      } else if (data?.id) {
        localStorage.setItem('UsuarioId', data.id);
      }
      
      navigate('/pre-registro-presidente');
    } catch (error) {
      const msg = (error && (error.detail || error.message || error.error || error.msg)) || String(error);
      setErr(typeof msg === 'object' ? JSON.stringify(msg) : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <style>{`
        .login-container {
          min-height: 100vh;
          background-image: url('${StadiumBg}');
          background-position: center;
          background-size: cover;
          background-attachment: fixed;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          position: relative;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
        }
        
        .login-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.35);
          pointer-events: none;
          z-index: 5;
        }
        
        .login-wrapper {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 450px;
        }
        
        .login-card {
          background: white;
          border-radius: 14px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          overflow: hidden;
        }
        
        .login-header {
          background: linear-gradient(135deg, #0b4ea6 0%, #063f82 100%);
          padding: 24px 32px 16px;
          text-align: center;
          position: relative;
        }
        
        .logo-group {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-bottom: 12px;
          align-items: center;
          flex-wrap: wrap;
        }
        
        .logo-item {
          width: 45px;
          height: 45px;
          background: rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          backdrop-filter: blur(10px);
        }
        
        .logo-item img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          filter: brightness(1.1);
        }
        
        .login-title {
          color: white;
          font-size: 22px;
          font-weight: 700;
          margin: 0;
          letter-spacing: 0.6px;
        }
        
        .login-body {
          padding: 24px 32px;
        }
        
        .form-group {
          margin-bottom: 14px;
        }
        
        .form-label {
          display: block;
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 6px;
          font-size: 13px;
          letter-spacing: 0.5px;
          text-transform: capitalize;
        }
        
        .form-input {
          width: 100%;
          padding: 10px 14px;
          border: 2px solid #e0e6ed;
          border-radius: 9px;
          font-size: 14px;
          transition: all 0.3s ease;
          font-family: inherit;
          background: #f8fafb;
          box-sizing: border-box;
        }
        
        .form-input:focus {
          outline: none;
          border-color: #0b4ea6;
          box-shadow: 0 0 0 4px rgba(11, 78, 166, 0.12);
          background-color: #ffffff;
        }
        
        .form-input::placeholder {
          color: #cbd5e0;
        }
        
        .password-group {
          position: relative;
        }
        
        .toggle-password {
          position: absolute;
          right: 14px;
          top: 32px;
          background: none;
          border: none;
          cursor: pointer;
          color: #718096;
          font-size: 18px;
          padding: 8px;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .toggle-password:hover {
          color: #0b4ea6;
          transform: scale(1.1);
        }
        
        .error-message {
          background: linear-gradient(135deg, #fee 0%, #fdd 100%);
          color: #d32f2f;
          padding: 10px 14px;
          border-radius: 9px;
          margin-bottom: 14px;
          font-size: 13px;
          border-left: 4px solid #d32f2f;
          animation: slideIn 0.3s ease;
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        
        .backend-warning {
          background: linear-gradient(135deg, #fff3cd 0%, #ffe8a6 100%);
          color: #856404;
          padding: 10px 14px;
          border-radius: 9px;
          margin-bottom: 14px;
          font-size: 13px;
          border-left: 4px solid #ffc107;
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .submit-btn {
          width: 100%;
          padding: 11px;
          background: linear-gradient(135deg, #0b4ea6 0%, #063f82 100%);
          color: white;
          border: none;
          border-radius: 9px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          letter-spacing: 0.5px;
          margin-top: 8px;
          box-shadow: 0 4px 15px rgba(11, 78, 166, 0.25);
        }
        
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(11, 78, 166, 0.35);
        }
        
        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        
        .submit-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
        
        .signup-link {
          text-align: center;
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid #e0e6ed;
          font-size: 13px;
          color: #718096;
        }
        
        .signup-link a {
          color: #0b4ea6;
          text-decoration: none;
          font-weight: 700;
          transition: all 0.3s ease;
        }
        
        .signup-link a:hover {
          color: #063f82;
        }
        
        .forgot-password-link {
          font-size: 12px;
          color: #0b4ea6;
          text-decoration: none;
          font-weight: 500;
          transition: all 0.3s ease;
          display: inline-block;
          margin-top: 4px;
        }
        
        .forgot-password-link:hover {
          color: #063f82;
        }
        
        .backend-diag {
          font-size: 12px;
          color: #666;
          margin-top: 6px;
          word-break: break-word;
        }
        
        @media (max-width: 768px) {
          .login-header {
            padding: 20px 24px 12px;
          }
          
          .login-body {
            padding: 20px 24px;
          }
          
          .login-title {
            font-size: 20px;
          }
          
          .logo-group {
            gap: 10px;
          }
          
          .logo-item {
            width: 40px;
            height: 40px;
          }
        }
      `}</style>
      
      <div className="login-wrapper">
        <div className="login-card">
          <div className="login-header">
            <div className="logo-group">
              <div className="logo-item">
                <img src={AfaemLogo} alt="AFAEM" title="AFAEM" />
              </div>
              <div className="logo-item">
                <img src={FmfLogo} alt="FMF" title="Federación Mexicana de Fútbol" />
              </div>
              <div className="logo-item">
                <img src={AmateurLogo} alt="Sector Amateur" title="Sector Amateur" />
              </div>
            </div>
            <h1 className="login-title">Inicia Sesión</h1>
          </div>
          
          <form className="login-body" onSubmit={handleSubmit}>
            {!backendOk && (
              <div className="backend-warning">
                <span>⚠️</span>
                <div>
                  <strong>Conexión con servidor no disponible</strong>
                  <div className="backend-diag">Verifica URL / que el servidor esté activo: {backendDiag}</div>
                </div>
              </div>
            )}
            
            {err && (
              <div className="error-message">
                <span>❌</span>
                <span>{err}</span>
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                aria-label="Correo electrónico"
              />
            </div>
            
            <div className="form-group password-group">
              <label htmlFor="password" className="form-label">
                Contraseña
              </label>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                aria-label="Contraseña"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
              <div style={{ textAlign: 'right', marginTop: '6px' }}>
                <Link to="/forgot-password" className="forgot-password-link">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>
            
            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? '⏳ Ingresando...' : 'Ingresar'}
            </button>
          </form>
          
          <div className="signup-link">
            ¿No tienes cuenta? <Link to="/signup">Crea una aquí</Link>
          </div>
        </div>
      </div>
    </div>
  );
}