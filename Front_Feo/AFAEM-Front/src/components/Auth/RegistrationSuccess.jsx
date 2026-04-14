import React from 'react';
import { useNavigate } from 'react-router-dom';

const RegistrationSuccess = () => {
  const navigate = useNavigate();
  return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <div style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
      <h2 className="heading-outfit" style={{ fontSize: '28px', color: 'var(--secondary)', marginBottom: '12px' }}>Registro exitoso</h2>
      <p className="glass-subtitle" style={{ marginBottom: '32px' }}>Tu cuenta ha sido creada correctamente. Serás redirigido al inicio de sesión.</p>
      <button onClick={() => navigate('/ingresar')} className="btn-premium">
        Ir al inicio de sesión
      </button>
    </div>
  );
};

export default RegistrationSuccess;
