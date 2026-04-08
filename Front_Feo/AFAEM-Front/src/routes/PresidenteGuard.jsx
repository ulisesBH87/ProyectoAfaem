import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useRBAC } from '../hooks/useRBAC';

const PresidenteGuard = ({ children }) => {
  const { hasRole, estatusId, isLoading } = useRBAC();
  const token = localStorage.getItem('token');
  const location = useLocation();

  if (isLoading) return null; // O un loader pequeño

  // El administrador siempre tiene permiso de ver todo si es necesario, 
  // pero para presidentes somos estrictos con su estatus.
  const isAdmin = hasRole('ADMIN') || hasRole('ADMINISTRADOR');
  const isPresidente = hasRole('PRESIDENTE');

  // Si es Admin, dejar pasar siempre
  if (isAdmin) return children;

  // Lógica para Presidentes
  // EstatusId >= 4 significa que está aprobado, en revisión o activo en alguna etapa del dashboard.
  // EstatusId < 4 (1, 2, 3) significa que está en pre-registro o RECHAZADO.
  const isAuthorized = isPresidente && estatusId && parseInt(estatusId) >= 4;

  if (!token) {
    return <Navigate to="/ingresar" state={{ from: location }} replace />;
  }

  if (!isAuthorized) {
    console.warn(`🚫 Acceso denegado. Rol: ${isPresidente ? 'Presidente' : 'Otro'}, EstatusId: ${estatusId}`);
    
    // Si es presidente pero fue rechazado o no ha terminado registro, mandarlo a pre-registro
    if (isPresidente) {
      return <Navigate to="/pre-registro-presidente" replace />;
    }
    
    // Si no es ninguno, afuera
    return <Navigate to="/ingresar" replace />;
  }

  return children;
};

export default PresidenteGuard;
