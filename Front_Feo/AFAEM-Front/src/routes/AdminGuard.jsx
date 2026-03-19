import React from 'react';
import { Navigate } from 'react-router-dom';

const AdminGuard = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user.rol || user.usuario?.rol || '';

  if (!token || (role !== 'ADMIN' && role !== 'ADMINISTRADOR')) {
    return <Navigate to="/ingresar" replace />;
  }

  return children;
};

export default AdminGuard;
