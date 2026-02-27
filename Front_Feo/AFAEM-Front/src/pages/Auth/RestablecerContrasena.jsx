import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import StadiumBg from '../../assets/stadium.jpg';
import AfaemLogo from '../../assets/afaem-logo@4x.png';
import { resetPassword } from '../../services/auth';

export default function RestablecerContrasena() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Obtener email y token de los parámetros de la URL
    const emailParam = searchParams.get('email');
    const tokenParam = searchParams.get('token');
    
    if (!emailParam || !tokenParam) {
      setError('Enlace inválido o expirado');
      return;
    }
    
    setEmail(emailParam);
    setToken(tokenParam);
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // VALIDACIONES
    if (!password) {
      setError('Ingresa una nueva contraseña');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (!token) {
      setError('Token inválido');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email, token, password);
      setSuccess('Contraseña actualizada correctamente');
      setTimeout(() => {
        navigate('/ingresar');
      }, 2000);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'No se pudo resetear la contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (error && !token) {
    return (
      <div
        className="login d-flex align-items-center justify-content-center"
        style={{
          minHeight: '100vh',
          minWidth: '100vw',
          background: `linear-gradient(rgba(10,30,70,0.6),rgba(10,30,70,0.6)), url(${StadiumBg}) center/cover no-repeat`,
        }}
      >
        <div className="card shadow-lg w-100" style={{ maxWidth: 420, marginTop: 48, marginBottom: 48 }}>
          <img src={AfaemLogo} className="login-logo" alt="AFAEM" />
          <h2 className="login-title">Enlace Inválido</h2>
          <div style={{ background: '#f8d7da', color: '#721c24', padding: 12, borderRadius: 6, marginBottom: 12 }}>
            {error}
          </div>
          <button className="btn-primary" style={{ width: '100%' }} onClick={() => navigate('/olvide-contrasena')}>
            Solicitar nuevo enlace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="login d-flex align-items-center justify-content-center"
      style={{
        minHeight: '100vh',
        minWidth: '100vw',
        background: `linear-gradient(rgba(10,30,70,0.6),rgba(10,30,70,0.6)), url(${StadiumBg}) center/cover no-repeat`,
      }}
    >
      <div className="card shadow-lg w-100" style={{ maxWidth: 420, marginTop: 48, marginBottom: 48 }}>
        <img src={AfaemLogo} className="login-logo" alt="AFAEM" />
        <h2 className="login-title">Restablecer Contraseña</h2>
        {success ? (
          <div style={{ background: '#d4edda', color: '#155724', padding: 12, borderRadius: 6, marginBottom: 12 }}>
            {success}
            <p style={{ marginTop: 12, fontSize: '0.9em' }}>Redirigiendo a inicio de sesión...</p>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: '100%' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nueva contraseña"
                  aria-label="Nueva contraseña"
                  className="form-input"
                  style={{ width: '100%', paddingRight: 40, border: error ? '2px solid red' : undefined, boxSizing: 'border-box' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  style={{
                    position: 'absolute',
                    right: 10,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#5b6b87',
                    fontSize: 18,
                    padding: '4px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {showPassword ? '👁️‍🗨️' : '👁️'}
                </button>
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmar contraseña"
                  aria-label="Confirmar contraseña"
                  className="form-input"
                  style={{ width: '100%', paddingRight: 40, border: error ? '2px solid red' : undefined, boxSizing: 'border-box' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  style={{
                    position: 'absolute',
                    right: 10,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#5b6b87',
                    fontSize: 18,
                    padding: '4px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {showConfirmPassword ? '👁️‍🗨️' : '👁️'}
                </button>
              </div>
              {error && <div style={{ color: '#c00', fontSize: '0.9em' }}>{error}</div>}
              <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
              </button>
            </form>
            <button className="btn-secondary" style={{ width: '100%', marginTop: 12 }} onClick={() => navigate('/ingresar')}>
              Volver al inicio
            </button>
          </>
        )}
      </div>
    </div>
  );
}
