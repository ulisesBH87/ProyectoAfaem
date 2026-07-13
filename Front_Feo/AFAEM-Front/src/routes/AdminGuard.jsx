import React from 'react';
import { Navigate } from 'react-router-dom';

import { useRBAC } from '../hooks/useRBAC';

const AdminGuard = ({ children, requirePermission }) => {
  const { hasRole, hasPermission, isLoading } = useRBAC();
  const token = localStorage.getItem('token');

  if (isLoading) return null;

  const isAdmin = hasRole('ADMIN') || hasRole('ADMINISTRADOR');
  const isMaster = hasRole('MASTER') || (hasPermission('auditorias.ver') && !isAdmin);

  let isAuthorized = false;
  if (requirePermission === 'auditorias.ver') {
    isAuthorized = isMaster;
  } else if (requirePermission) {
    isAuthorized = hasPermission(requirePermission);
  } else {
    isAuthorized = isAdmin;
  }

  if (!token || !isAuthorized) {
    console.warn('Acceso no autorizado');
    return <Navigate to="/ingresar" replace />;
  }

  return children;
};

export default AdminGuard;
