import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useRBAC } from '../hooks/useRBAC';

const PresidenteGuard = ({ children }) => {
  const { hasRole, estatusId, isLoading, roles = [] } = useRBAC();
  const token = localStorage.getItem('token');
  const location = useLocation();

  if (isLoading) return null; // O un loader pequeño

  // El administrador siempre tiene permiso de ver todo si es necesario, 
  // pero para presidentes somos estrictos con su estatus.
  const isAdmin = hasRole('ADMIN') || hasRole('ADMINISTRADOR');
  const isPresidente = hasRole('PRESIDENTE') || hasRole('PRESIDENTE_EQUIPO') || hasRole('PRESIDENTE_LIGA');

  // Si es Admin, dejar pasar siempre
  if (isAdmin) return children;

  // Lógica para Presidentes
  // EstatusId >= 4 (Revisión, Pago, etc) o 7 (ACTIVO) significa que ya pasó el pre-registro.
  // IMPORTANTE: Permitimos 7 explícitamente y nos aseguramos de que existan los datos antes de denegar.
  const isAuthorized = isPresidente && (
    (estatusId && parseInt(estatusId) >= 4) || 
    parseInt(estatusId) === 7
  );

  if (!token) {
    return <Navigate to="/ingresar" state={{ from: location }} replace />;
  }

  // Verificación de Suspensión (Acordado con Backend estatusId: 0)
  // IMPORTANTE: Solo activa si el backend devuelve EXPLÍCITAMENTE 0, nunca si es null/undefined
  if (estatusId !== null && estatusId !== undefined && parseInt(estatusId) === 0) {
    return <Navigate to="/suspendido" replace />;
  }

  // Si no estamos cargando, pero no tenemos roles aún, esperar un momento (puede ser un refresh)
  if (!isLoading && roles.length === 0 && token) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando permisos...</span>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    console.warn(`🚫 Acceso denegado. Rol: ${isPresidente ? 'Presidente' : 'Otro'}, EstatusId: ${estatusId}`);
    
    // Si es presidente pero fue rechazado o no ha terminado registro (Estatus < 4 y != 7), mandarlo a pre-registro
    // Pero solo si ya tenemos el estatus cargado (evitar estatus 0 momentáneo)
    if (isPresidente && estatusId !== undefined) {
       // Si el estatus es 1, 2 o 3, va a pre-registro
       if ([1, 2, 3].includes(parseInt(estatusId))) {
         return <Navigate to="/pre-registro-presidente" replace />;
       }
    }
    
    // Fallback: Si no es presidente o tiene un estatus desconocido, fuera
    if (!isPresidente && !isAdmin) {
      return <Navigate to="/ingresar" replace />;
    }
  }

  return children;
};

export default PresidenteGuard;
