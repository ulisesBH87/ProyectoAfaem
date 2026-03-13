import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StadiumBg from '../../assets/stadium.jpg';
import AfaemLogo from '../../assets/afaem-logo@4x.png';
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
    if (!email) { setError('Ingresa tu correo'); return; }
    setLoading(true);
    try {
      const response = await forgotPassword(email);
      setSuccess('Enlace enviado a tu correo electrónico');
      // CAPTURAR EL TOKEN SI ESTÁ DISPONIBLE
      if (response.token) {
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
    navigate(`/restablecer-contrasena?email=${encodeURIComponent(email)}&token=${token}`);
  };

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
        <h2 className="login-title">Olvidé la Contraseña</h2>
        {success ? (
          <div style={{ background: '#d4edda', color: '#155724', padding: 12, borderRadius: 6, marginBottom: 12 }}>
            <p style={{ margin: '0 0 12px 0' }}>{success}</p>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.9em' }}>Se ha enviado un enlace de recuperación a: <strong>{email}</strong></p>
            <button className="btn-primary" style={{ marginTop: 12, width: '100%' }} onClick={handleGoToReset}>
              Continuar a resetear contraseña
            </button>
            <button className="btn-secondary" style={{ width: '100%', marginTop: 8 }} onClick={() => navigate('/ingresar')}>
              Volver al inicio
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: '100%' }}>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ingresa tu correo"
                aria-label="Correo"
                className="form-input"
                style={{ width: '100%', border: error ? '2px solid red' : undefined }}
              />
              {error && <div style={{ color:'#c00' }}>{error}</div>}
              <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
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
