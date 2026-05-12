import React from 'react';
import { Navigate } from 'react-router-dom';

const GeneralGuard = ({ children }) => {
  const token = localStorage.getItem('token');
  const timestamp = localStorage.getItem('token_timestamp');
  const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;

  // Verificación de sesión expirada (5 horas)
  const isSessionValid = () => {
    if (!token || !timestamp) return false;
    const now = Date.now();
    const elapsed = now - parseInt(timestamp, 10);
    return elapsed < FIVE_HOURS_MS;
  };

  if (!token || !isSessionValid()) {
    if (token) {
      // Si hay token pero expiró, limpiar para obligar re-login
      localStorage.clear();
    }
    return <Navigate to="/ingresar" replace />;
  }

  return children;
};

export default GeneralGuard;
