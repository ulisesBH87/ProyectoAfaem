import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/auth';
import { RBACContext } from './RBACContextObject';
import { ROUTES, mapOldToNewPath } from '../routes/paths';

const PERMISSIONS_REFRESH_MS = 30 * 60 * 1000;

export const RBACProvider = ({ children }) => {
  const [access, setAccess] = useState({
    roles: [],
    permissions: [],
    menus: [],
    isLoading: true
  });

  const fetchAccess = useCallback(async (isSilent = false) => {
    const token = localStorage.getItem('token');
    if (!token || token === 'undefined' || token === 'null') {
      setAccess({ roles: [], permissions: [], menus: [], isLoading: false });
      return;
    }

    // Solo activamos isLoading si NO es una actualización silenciosa en segundo plano
    if (!isSilent) {
      setAccess(prev => ({ ...prev, isLoading: true }));
    }

    try {
      const response = await api.get('/permisos/mi-acceso', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data || {};
      const finalRoles = data.Roles || [];
      const rawMenus = data.Menus ? [...data.Menus] : [];
      const finalMenus = rawMenus.map(m => {
        const mappedSubMenus = m.SubMenus ? m.SubMenus.map(sm => ({
          ...sm,
          Ruta: mapOldToNewPath(sm.Ruta)
        })) : [];
        return {
          ...m,
          Ruta: mapOldToNewPath(m.Ruta),
          SubMenus: mappedSubMenus
        };
      });
      
      const isAdmin = finalRoles.map(r => r.toUpperCase()).includes('ADMINISTRADOR') || finalRoles.map(r => r.toUpperCase()).includes('ADMIN');
      
      if (isAdmin) {
        if (!finalMenus.find(m => m.Nombre === 'Catálogos')) {
          finalMenus.push({
            Nombre: 'Catálogos',
            Icono: 'FaListAlt',
            Ruta: ROUTES.ADMIN.CATALOGOS
          });
        }
        if (!finalMenus.find(m => m.Nombre === 'Presidentes')) {
          finalMenus.push({
            Nombre: 'Presidentes',
            Icono: 'FaUserTie',
            Ruta: ROUTES.ADMIN.PRESIDENTES
          });
        }
        if (!finalMenus.find(m => m.Nombre === 'Auditorías')) {
          finalMenus.push({
            Nombre: 'Auditorías',
            Icono: 'FaHistory',
            Ruta: ROUTES.ADMIN.AUDITORIAS
          });
        }
      }

      const newState = {
        roles: finalRoles,
        permissions: data.Permisos || [],
        menus: finalMenus,
        estatusId: (data.estatusId !== undefined && data.estatusId !== null) ? parseInt(data.estatusId) : null,
        isLoading: false
      };
      
      setAccess(newState);
      return newState;
    } catch (error) {
      console.error('Error fetching RBAC access:', error);
      
      let errorState = { roles: [], permissions: [], menus: [], isLoading: false };
      
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
    const id = setTimeout(() => fetchAccess(false), 0);
    
    const handleLogin = () => fetchAccess(false);
    window.addEventListener('user-logged-in', handleLogin);
    
    // Refresco espaciado: suficiente para cambios de permisos, sin castigar la sesión.
    const interval = setInterval(() => fetchAccess(true), PERMISSIONS_REFRESH_MS);
    
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


