import React from 'react';
import { useNavigate } from 'react-router-dom';

const RegistrationSuccess = () => {
  const navigate = useNavigate();
  return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <style>{`
        .registration-spinner-container {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 24px;
        }
        .registration-spinner {
          width: 60px;
          height: 60px;
          border: 4px solid rgba(255, 255, 255, 0.05);
          border-top: 4px solid var(--secondary, #d97706);
          border-right: 4px solid var(--secondary, #d97706);
          border-radius: 50%;
          animation: spin-loader 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        @keyframes spin-loader {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div className="registration-spinner-container">
        <div className="registration-spinner" />
      </div>
      <h2 className="heading-outfit" style={{ fontSize: '28px', color: 'var(--secondary)', marginBottom: '12px' }}>Registro exitoso</h2>
      <p className="glass-subtitle" style={{ marginBottom: '32px' }}>Tu cuenta ha sido creada correctamente. Serás redirigido al inicio de sesión.</p>
      <button onClick={() => navigate('/ingresar')} className="btn-premium">
        Ir al inicio de sesión
      </button>
    </div>
  );
};

export default RegistrationSuccess;
