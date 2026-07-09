import React from 'react';
import { useNavigate } from 'react-router-dom';

const RegistrationSuccess = () => {
  const navigate = useNavigate();
  return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <style>{`
        .registration-success-icon-container {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 24px;
        }
        .checkmark-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.1);
          border: 3px solid #10b981;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
        }
        .checkmark-icon {
          width: 40px;
          height: 40px;
          stroke: #10b981;
          stroke-width: 4;
          stroke-linecap: round;
          stroke-linejoin: round;
          fill: none;
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          animation: drawCheckmark 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards;
        }
        @keyframes scaleIn {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes drawCheckmark {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
      <div className="registration-success-icon-container">
        <div className="checkmark-circle">
          <svg viewBox="0 0 24 24" className="checkmark-icon">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
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
