import React from 'react';
import { Navigate } from 'react-router-dom';

import { useRBAC } from '../hooks/useRBAC';

const AdminGuard = ({ children }) => {
  const { hasRole, isLoading } = useRBAC();
  const token = localStorage.getItem('token');

  if (isLoading) return null;

  const isAuthorized = (hasRole('ADMIN') || hasRole('ADMINISTRADOR'));

  if (!token || !isAuthorized) {
    console.warn('Acceso no autorizado en AdminGuard');
    return <Navigate to="/ingresar" replace />;
  }

  return children;
};

export default AdminGuard;
