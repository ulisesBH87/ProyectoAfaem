import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/auth';
import { RBACContext } from './RBACContextObject';

export const RBACProvider = ({ children }) => {
  const [access, setAccess] = useState({
    roles: [],
    permissions: [],
    menus: [],
    isLoading: true
  });

  const fetchAccess = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token || token === 'undefined' || token === 'null') {
      setAccess({ roles: [], permissions: [], menus: [], isLoading: false });
      return;
    }

    // Aseguramos que isLoading sea true mientras pedimos nuevos datos (evita race conditions)
    setAccess(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await api.get('/permisos/mi-acceso', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data || {};
      const finalRoles = data.Roles || [];
      
      const newState = {
        roles: finalRoles,
        permissions: data.Permisos || [],
        menus: data.Menus || [],
        isLoading: false
      };
      
      setAccess(newState);
      return newState; // Devolvemos el nuevo estado para poder esperarlo en el login
    } catch (error) {
      console.error('Error fetching RBAC access:', error);
      
      let errorState = { roles: [], permissions: [], menus: [], isLoading: false };
      
      // Si el token es inválido o expira
      if (error.response && error.response.status === 401) {
          setAccess(errorState);
      } else {
          setAccess(prev => ({ ...prev, isLoading: false }));
          errorState = { ...access, isLoading: false };
      }
      return errorState;
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(fetchAccess, 0);
    
    // Escuchar eventos de login para actualizar inmediatamente
    const handleLogin = () => fetchAccess();
    window.addEventListener('user-logged-in', handleLogin);
    
    // Polling opcional para cambios de permisos en tiempo real (cada 2 minutos)
    const interval = setInterval(fetchAccess, 2 * 60 * 1000);
    
    return () => {
        clearTimeout(id);
        window.removeEventListener('user-logged-in', handleLogin);
        clearInterval(interval);
    };
  }, [fetchAccess]);

  const hasPermission = (permission) => access.permissions.includes(permission);
  const hasRole = (role) => access.roles.map(r => r.toUpperCase()).includes(role.toUpperCase());

  return (
    <RBACContext.Provider value={{ ...access, hasPermission, hasRole, refreshAccess: fetchAccess }}>
      {children}
    </RBACContext.Provider>
  );
};


