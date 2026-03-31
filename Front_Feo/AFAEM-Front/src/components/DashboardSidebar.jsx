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
  const { menus, isLoading } = useRBAC();

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '90px' : '280px');
  }, [isCollapsed]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/ingresar');
  };

  if (isLoading) return null;

  return (
    <aside 
      className="glass"
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
        borderRight: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-lg)'
      }}
    >
      {/* HEADER / LOGO */}
      <div style={{
        padding: '25px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        gap: '12px',
        borderBottom: '1px solid var(--border-light)'
      }}>
        <img 
          src={AfaemLogo} 
          alt="AFAEM" 
          style={{
            width: isCollapsed ? '44px' : '48px',
            height: isCollapsed ? '44px' : '48px',
            objectFit: 'contain',
            flexShrink: 0,
            filter: 'drop-shadow(0 2px 4px rgba(11, 78, 166, 0.15))',
            transition: 'all 0.3s'
          }} 
        />
        {!isCollapsed && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <h1 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--primary)', letterSpacing: '-0.5px' }}>AFAEM</h1>
            <p style={{ fontSize: '9px', fontWeight: '700', margin: 0, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Management System</p>
          </div>
        )}
      </div>

      {/* MENU ITEMS */}
      <nav style={{ flex: 1, padding: '24px 12px', overflowY: 'auto' }}>
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
                  padding: '12px 16px',
                  margin: '4px 0',
                  borderRadius: '12px',
                  cursor: item.Ruta ? 'pointer' : 'default',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                  color: isActive ? 'white' : 'var(--text-muted)',
                  boxShadow: isActive ? '0 4px 12px rgba(11, 78, 166, 0.3)' : 'none',
                  justifyContent: isCollapsed ? 'center' : 'flex-start'
                }}
                onMouseEnter={(e) => {
                  if(!isActive) {
                    e.currentTarget.style.backgroundColor = 'rgba(11, 78, 166, 0.05)';
                    e.currentTarget.style.color = 'var(--primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if(!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--text-muted)';
                  }
                }}
              >
                <span style={{ fontSize: '20px', display: 'flex', alignItems: 'center' }}>
                  {getIcon(item.Icono)}
                </span>
                {!isCollapsed && (
                  <span style={{ marginLeft: '16px', fontSize: '14px', fontWeight: '600' }}>
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
                      padding: '10px 16px 10px 52px',
                      margin: '2px 0',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      backgroundColor: isChildActive ? 'rgba(11, 78, 166, 0.08)' : 'transparent',
                      color: isChildActive ? 'var(--primary)' : 'var(--text-muted)',
                      fontSize: '13px',
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
      <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border-light)' }}>
        <div 
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            margin: '4px 0',
            borderRadius: '12px',
            cursor: 'pointer',
            color: 'var(--danger)',
            transition: 'all 0.2s',
            justifyContent: isCollapsed ? 'center' : 'flex-start'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <FaSignOutAlt style={{ fontSize: '20px' }} />
          {!isCollapsed && (
            <span style={{ marginLeft: '16px', fontSize: '14px', fontWeight: '700' }}>Sign Out</span>
          )}
        </div>

        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            padding: '12px',
            borderRadius: '12px',
            backgroundColor: 'transparent',
            color: 'var(--text-muted)',
            marginTop: '8px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          {isCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
        </button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
