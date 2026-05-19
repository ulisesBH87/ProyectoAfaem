import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FaSignOutAlt,
  FaChevronLeft,
  FaChevronRight,
  FaGavel
} from 'react-icons/fa';

import { useRBAC } from '../hooks/useRBAC';
import { getIcon } from '../utils/IconMapper.jsx';
import AfaemLogo from '../assets/afaem-logo@4x.png';

const DashboardSidebar = ({ collapsed}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { menus, isLoading, hasRole } = useRBAC();


  const handleLogout = () => {
    localStorage.clear();
    navigate('/ingresar');
  };

  if (isLoading) return null;

  // DEFINICIÓN DE TEMAS (Glassmorphism)
  const isAdmin = hasRole('Admin') || hasRole('Administrador');

  const theme = {
    bg: isAdmin
      ? 'rgba(15, 23, 42, 0.95)' // Black Glass (Deep Navy)
      : 'rgba(255, 255, 255, 0.85)', // White Glass
    text: isAdmin ? '#e2e8f0' : '#1e293b',
    textMuted: isAdmin ? '#94a3b8' : '#64748b',
    border: isAdmin ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    activeBg: isAdmin ? 'var(--primary)' : '#0b4ea6',
    activeText: '#ffffff',
    hoverBg: isAdmin ? 'rgba(255, 255, 255, 0.05)' : 'rgba(11, 78, 166, 0.05)',
    shadow: isAdmin ? '0 8px 32px 0 rgba(0, 0, 0, 0.8)' : '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
  };

  return (
    <aside
      className={`dashboard-sidebar`}
      style={{
        width: collapsed ? '80px' : '260px',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1100,
        backgroundColor: theme.bg,
        backdropFilter: 'blur(15px)',
        WebkitBackdropFilter: 'blur(15px)',
        borderRight: `1px solid ${theme.border}`,
        boxShadow: theme.shadow,
        color: theme.text
      }}
    >
      {/* HEADER / LOGO */}
      <div style={{
        padding: '16px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '10px',
        borderBottom: `1px solid ${theme.border}`
      }}>
        <img
          src={AfaemLogo}
          alt="AFAEM"
          style={{
            width: '36px',
            height: '36px',
            objectFit: 'contain',
            flexShrink: 0,
            filter: isAdmin ? 'drop-shadow(0 2px 8px rgba(255, 255, 255, 0.1))' : 'drop-shadow(0 2px 4px rgba(11, 78, 166, 0.15))',
            transition: 'all 0.3s'
          }}
        />
        {!collapsed && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <h1 style={{ fontSize: '15px', fontWeight: '800', margin: 0, color: isAdmin ? '#ffffff' : 'var(--primary)', letterSpacing: '-0.5px' }}>
              AFAEM
            </h1>
            <p style={{ fontSize: '7.5px', fontWeight: '700', margin: 0, color: theme.textMuted, textTransform: 'uppercase' }}>
              Management System
            </p>
          </div>
        )}
      </div>

      {/* MENU ITEMS */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        {menus
          .filter(item => {
            // Seguridad: Si es una ruta de admin, solo mostrar si es admin
            if (item.Ruta && item.Ruta.startsWith('/admin') && !isAdmin) return false;
            // Si es Catálogos o Directorio de Equipos y no es Admin, ocultar
            if ((item.Nombre === 'Catálogos' || item.Nombre === 'Equipos') && !isAdmin) {
               // A menos que sea un "Ver Mi Equipo" específico para presidentes (otra ruta)
               if (item.Ruta !== '/presidente-equipo/equipos') return false;
            }
            // Si es 'Mi Equipo' y es Admin, ocultar (porque pertenece a la vista de presidente)
            if (item.Nombre === 'Mi Equipo' && isAdmin) return false;
            // Ocultar Auditorías temporalmente del sidebar (sin borrar)
            if (item.Nombre === 'Auditorías') return false;
            
            // Ocultar Inicio y Solicitudes para Presidente de Equipo (Solo dejar Equipos y Jugadores) en el nivel superior
            if (!isAdmin && (item.Nombre === 'Inicio' || item.Nombre === 'Solicitudes' || item.Nombre === 'Dashboard' || item.Nombre === 'Reportes')) return false;

            return true;
          })
          .map((item, idx) => {
            const isActive = location.pathname === item.Ruta;
            
            // FILTRAR SUBMENÚS PARA PRESIDENTES
            let filteredSubMenus = item.SubMenus || [];
            if (!isAdmin) {
              filteredSubMenus = filteredSubMenus.filter(sub => 
                !['inicio', 'solicitudes', 'reportes', 'dashboard'].includes(sub.Nombre.toLowerCase())
              );
            }
            
            const hasChildren = filteredSubMenus.length > 0;

          return (
            <React.Fragment key={idx}>
              <div
                onClick={() => item.Ruta && navigate(item.Ruta)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  margin: '6px 0',
                  borderRadius: '10px',
                  cursor: item.Ruta ? 'pointer' : 'default',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backgroundColor: isActive ? theme.activeBg : 'transparent',
                  color: isActive ? theme.activeText : theme.text,
                  boxShadow: isActive ? (isAdmin ? '0 4px 12px rgba(37, 99, 235, 0.4)' : '0 4px 8px rgba(11, 78, 166, 0.3)') : 'none',
                  padding: collapsed ? '12px 0' : '8px 12px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = theme.hoverBg;
                    e.currentTarget.style.color = isAdmin ? '#ffffff' : 'var(--primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = theme.text;
                  }
                }}
              >
                <span style={{ fontSize: '18px', display: 'flex', alignItems: 'center'}}>
                  {getIcon(item.Icono)}
                </span>
                {!collapsed && (
                <span
                  style={{
                    marginLeft: '12px',
                    fontSize: '13px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                    animation: 'fadeIn 0.2s ease'
                  }}
                >
                  {item.Nombre}
                </span>
              )}
              </div>

              {/* Submenus if present */}
              {!collapsed && hasChildren && filteredSubMenus.map((child, cIdx) => {
                const isChildActive = location.pathname === child.Ruta;
                return (
                  <div
                    key={`${idx}-${cIdx}`}
                    onClick={() => navigate(child.Ruta)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '6px 12px 6px 44px',
                      margin: '1px 0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      backgroundColor: isChildActive ? (isAdmin ? 'rgba(255, 255, 255, 0.05)' : 'rgba(11, 78, 166, 0.08)') : 'transparent',
                      color: isChildActive ? (isAdmin ? '#ffffff' : 'var(--primary)') : theme.textMuted,
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                  >
                    {child.Nombre}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </nav>

      {/* FOOTER ACTIONS */}
      <div style={{ padding: '8px 10px', borderTop: `1px solid ${theme.border}` }}>
        <div
          onClick={() => navigate('/reglamentos')}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px 12px',
            margin: '2px 0',
            borderRadius: '10px',
            cursor: 'pointer',
            color: theme.text,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.hover}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <FaGavel style={{ fontSize: '18px' }} />
          {!collapsed && (
  <span style={{ marginLeft: '12px', fontSize: '13px', fontWeight: '700' }}>
    Reglamentos
  </span>
)}
        </div>

        <div
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px 12px',
            margin: '2px 0',
            borderRadius: '10px',
            cursor: 'pointer',
            color: 'var(--danger)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <FaSignOutAlt style={{ fontSize: '18px' }} />
          {!collapsed && (
  <span style={{ marginLeft: '12px', fontSize: '13px', fontWeight: '700' }}>
    Cerrar Sesión
  </span>
)}
        </div>


      </div>
    </aside>
  );
};

export default DashboardSidebar;
