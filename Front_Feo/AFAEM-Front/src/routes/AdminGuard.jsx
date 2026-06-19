import React from 'react';
import { Navigate } from 'react-router-dom';

import { useRBAC } from '../hooks/useRBAC';

const AdminGuard = ({ children, requirePermission }) => {
  const { hasRole, hasPermission, isLoading } = useRBAC();
  const token = localStorage.getItem('token');

  if (isLoading) return null;

  // Si requirePermission está definido, se valida estrictamente por permiso;
  // de lo contrario, se permite el acceso por rol de administrador.
  const isAuthorized = requirePermission 
    ? hasPermission(requirePermission) 
    : (hasRole('ADMIN') || hasRole('ADMINISTRADOR'));

  if (!token || !isAuthorized) {
    console.warn('Acceso no autorizado');
    return <Navigate to="/ingresar" replace />;
  }

  return children;
};

export default AdminGuard;
