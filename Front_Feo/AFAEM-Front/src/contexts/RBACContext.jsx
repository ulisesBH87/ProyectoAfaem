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
    if (!token) {
      setAccess({ roles: [], permissions: [], menus: [], isLoading: false });
      return;
    }

    // Aseguramos que isLoading sea true mientras pedimos nuevos datos (evita race conditions)
    // setAccess(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await api.get('/permisos/mi-acceso', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAccess({
        roles: response.data.Roles,
        permissions: response.data.Permisos,
        menus: response.data.Menus,
        isLoading: false
      });
    } catch (error) {
      console.error('Error fetching RBAC access:', error);
      // Si el token es inválido o expira
      if (error.response && error.response.status === 401) {
          setAccess({ roles: [], permissions: [], menus: [], isLoading: false });
      } else {
          setAccess(prev => ({ ...prev, isLoading: false }));
      }
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


