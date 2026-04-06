import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FaFootballBall, 
  FaSignOutAlt,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';

import { useRBAC } from '../hooks/useRBAC';
import { getIcon } from '../utils/IconMapper.jsx';
import AfaemLogo from '../assets/afaem-logo@4x.png';

const DashboardSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { menus, isLoading, hasRole } = useRBAC();

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '90px' : '280px');
  }, [isCollapsed]);

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
      style={{
        width: 'var(--sidebar-width)',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
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
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        gap: '10px',
        borderBottom: `1px solid ${theme.border}`
      }}>
        <img 
          src={AfaemLogo} 
          alt="AFAEM" 
          style={{
            width: isCollapsed ? '32px' : '36px',
            height: isCollapsed ? '32px' : '36px',
            objectFit: 'contain',
            flexShrink: 0,
            filter: isAdmin ? 'drop-shadow(0 2px 8px rgba(255, 255, 255, 0.1))' : 'drop-shadow(0 2px 4px rgba(11, 78, 166, 0.15))',
            transition: 'all 0.3s'
          }} 
        />
        {!isCollapsed && (
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
        {menus.map((item, idx) => {
          const isActive = location.pathname === item.Ruta;
          const hasChildren = item.SubMenus && item.SubMenus.length > 0;
          
          return (
            <React.Fragment key={idx}>
                <div 
                  onClick={() => item.Ruta && navigate(item.Ruta)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 12px',
                    margin: '2px 0',
                    borderRadius: '10px',
                    cursor: item.Ruta ? 'pointer' : 'default',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    backgroundColor: isActive ? theme.activeBg : 'transparent',
                    color: isActive ? theme.activeText : theme.text,
                    boxShadow: isActive ? (isAdmin ? '0 4px 12px rgba(37, 99, 235, 0.4)' : '0 4px 8px rgba(11, 78, 166, 0.3)') : 'none',
                    justifyContent: isCollapsed ? 'center' : 'flex-start'
                  }}
                  onMouseEnter={(e) => {
                    if(!isActive) {
                      e.currentTarget.style.backgroundColor = theme.hoverBg;
                      e.currentTarget.style.color = isAdmin ? '#ffffff' : 'var(--primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if(!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = theme.text;
                    }
                  }}
                >
                  <span style={{ fontSize: '18px', display: 'flex', alignItems: 'center' }}>
                    {getIcon(item.Icono)}
                  </span>
                  {!isCollapsed && (
                    <span style={{ marginLeft: '12px', fontSize: '13px', fontWeight: '600' }}>
                      {item.Nombre}
                    </span>
                  )}
                </div>

              {/* Submenus if present */}
              {hasChildren && !isCollapsed && item.SubMenus.map((child, cIdx) => {
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
              justifyContent: isCollapsed ? 'center' : 'flex-start'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <FaSignOutAlt style={{ fontSize: '18px' }} />
            {!isCollapsed && (
              <span style={{ marginLeft: '12px', fontSize: '13px', fontWeight: '700' }}>Sign Out</span>
            )}
          </div>

        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            padding: '10px',
            borderRadius: '10px',
            backgroundColor: 'transparent',
            color: theme.textMuted,
            marginTop: '4px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = isAdmin ? '#ffffff' : 'var(--primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = theme.textMuted}
        >
          {isCollapsed ? <FaChevronRight size={14} /> : <FaChevronLeft size={14} />}
        </button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
