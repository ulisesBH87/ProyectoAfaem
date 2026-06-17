import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ROUTES } from '../../routes/paths';
import StadiumBg from '../../assets/stadium.jpg';
import AfaemLogo from '../../assets/afaem-logo@4x.png';
import FmfLogo from '../../assets/fmf-logo.png';
import AmateurLogo from '../../assets/amateur-logo.png';
import { forgotPassword } from '../../services/auth';

export default function OlvideContrasena() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [resetToken, setResetToken] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setResetToken(null);
    if (!email) { setError('Ingresa tu correo electrónico'); return; }
    setLoading(true);
    try {
      const response = await forgotPassword(email);
      setSuccess('Enlace enviado a tu correo electrónico');
      // CAPTURAR EL TOKEN SI ESTÁ DISPONIBLE
      if (response && response.token) {
        setResetToken(response.token);
      }
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'No se pudo enviar el enlace');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToReset = () => {
    // USAR EL TOKEN RECIBIDO DEL BACK COMO FALLBACK
    const token = resetToken || 'demo-token';
    navigate(`${ROUTES.RESTABLECER_CONTRASENA}?email=${encodeURIComponent(email)}&token=${token}`);
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
          width: 38px;
          height: 38px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3px;
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

        .success-message {
          background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
          color: #166534;
          padding: 15px;
          border-radius: 9px;
          margin-bottom: 20px;
          font-size: 13px;
          border-left: 4px solid #16a34a;
          animation: slideIn 0.3s ease;
        }
        
        @keyframes slideIn {
           from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
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

        .btn-outline {
          width: 100%;
          padding: 11px;
          background: white;
          color: #475569;
          border: 1px solid #cbd5e1;
          border-radius: 9px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 10px;
        }

        .btn-outline:hover {
          background: #f8fafc;
          color: #1e293b;
        }
        
        .back-link {
          text-align: center;
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid #e0e6ed;
          font-size: 13px;
          color: #718096;
        }
        
        .back-link a {
          color: #0b4ea6;
          text-decoration: none;
          font-weight: 700;
          transition: all 0.3s ease;
        }
        
        .back-link a:hover {
           color: #063f82;
        }
        
        @media (max-width: 768px) {
           .login-header { padding: 20px 24px 12px; }
          .login-body { padding: 20px 24px; }
          .login-title { font-size: 20px; }
          .logo-group { gap: 10px; }
          .logo-item { width: 40px; height: 40px; }
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
            <h1 className="login-title">Recuperar Contraseña</h1>
          </div>
          
          <div className="login-body">
            {!success && (
              <p style={{ color: '#475569', fontSize: '13px', marginBottom: '20px', lineHeight: '1.5' }}>
                Ingresa tu correo electrónico asociado a tu cuenta y te enviaremos instrucciones para restablecer tu contraseña.
              </p>
            )}

            {error && (
              <div className="error-message">
                <span>❌</span>
                <span>{error}</span>
              </div>
            )}

            {success ? (
              <div className="success-message">
                <h4 style={{ margin: '0 0 8px 0', fontSize: '15px' }}>¡Correo enviado!</h4>
                <p style={{ margin: '0 0 16px 0', color: '#15803d' }}>{success}</p>
                <button type="button" className="submit-btn" onClick={handleGoToReset}>
                  Continuar a restablecer contraseña
                </button>
                <button type="button" className="btn-outline" onClick={() => navigate(ROUTES.LOGIN)}>
                  Volver al inicio
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="email" className="form-label">
                    Correo electrónico
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    className="form-input"
                    placeholder="ejemplo@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                    aria-label="Correo electrónico"
                  />
                </div>
                
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={loading}
                  aria-busy={loading}
                >
                  {loading ? '⏳ Enviando enlace...' : 'Enviar enlace de recuperación'}
                </button>
              </form>
            )}
            
            {!success && (
              <div className="back-link">
                ¿Recordaste tu contraseña? <Link to={ROUTES.LOGIN}>Inicia Sesión</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
