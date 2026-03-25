import React from 'react';
import { Navigate } from 'react-router-dom';

import { useRBAC } from '../contexts/RBACContext';

const AdminGuard = ({ children }) => {
  const { hasRole, isLoading } = useRBAC();
  const token = localStorage.getItem('token');

  if (isLoading) return null;

  if (!token || (!hasRole('ADMIN') && !hasRole('ADMINISTRADOR'))) {
    return <Navigate to="/ingresar" replace />;
  }

  return children;
};

export default AdminGuard;
