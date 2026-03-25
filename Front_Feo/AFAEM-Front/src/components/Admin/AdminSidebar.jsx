import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FaHome, 
  FaClipboardList, 
  FaShieldAlt,
  FaUsers, 
  FaUserShield, 
  FaChartLine, 
  FaCog, 
  FaSignOutAlt,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';

import { useRBAC } from '../../contexts/RBACContext';
import { getIcon } from '../../utils/IconMapper.jsx';

const AdminSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { menus, isLoading } = useRBAC();

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '80px' : '280px');
  }, [isCollapsed]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/ingresar');
  };

  if (isLoading) return null;

  return (
    <div style={{
      width: isCollapsed ? '80px' : '280px',
      background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      flexDirection: 'column',
      color: '#cbd5e1',
      boxShadow: '4px 0 10px rgba(0,0,0,0.1)',
      zIndex: 1000
    }}>
      {/* HEADER / LOGO */}
      <div style={{
        padding: '30px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          background: '#0b4ea6',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          color: 'white',
          flexShrink: 0
        }}>
          A
        </div>
        {!isCollapsed && (
          <div style={{ overflow: 'hidden' }}>
            <h1 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'white', whiteSpace: 'nowrap' }}>AFAEM</h1>
            <p style={{ fontSize: '10px', fontWeight: '500', margin: 0, color: '#64748b', textTransform: 'uppercase' }}>Administrador</p>
          </div>
        )}
      </div>

      {/* MENU ITEMS */}
      <nav style={{ flex: 1, padding: '20px 0', overflowY: 'auto' }}>
        {menus.map((item, idx) => {
          const isActive = location.pathname === item.Ruta;
          const hasChildren = item.SubMenus && item.SubMenus.length > 0;
          
          return (
            <React.Fragment key={idx}>
              {/* Parent Menu / Section Title */}
              <div 
                onClick={() => item.Ruta && navigate(item.Ruta)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 24px',
                  cursor: item.Ruta ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                  backgroundColor: isActive ? 'rgba(11, 78, 166, 0.1)' : 'transparent',
                  borderLeft: `4px solid ${isActive ? '#0b4ea6' : 'transparent'}`,
                  color: isActive ? 'white' : '#94a3b8',
                  marginTop: !item.MenuPadreId && idx > 0 ? '16px' : '4px',
                  opacity: !item.Ruta && !isCollapsed ? 0.6 : 1
                }}
              >
                <span style={{ fontSize: '20px', display: 'flex', alignItems: 'center' }}>
                  {getIcon(item.Icono)}
                </span>
                {!isCollapsed && (
                  <span style={{ marginLeft: '16px', fontSize: item.Ruta ? '14px' : '12px', fontWeight: '700', textTransform: item.Ruta ? 'none' : 'uppercase' }}>
                    {item.Nombre}
                  </span>
                )}
              </div>

              {/* Children Menus */}
              {hasChildren && !isCollapsed && item.SubMenus.map((child, cIdx) => {
                const isChildActive = location.pathname === child.Ruta;
                return (
                  <div 
                    key={`${idx}-${cIdx}`}
                    onClick={() => navigate(child.Ruta)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 24px 8px 52px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      backgroundColor: isChildActive ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                      color: isChildActive ? 'white' : '#94a3b8',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}
                    onMouseEnter={(e) => {
                      if(!isChildActive) e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      if(!isChildActive) e.currentTarget.style.color = '#94a3b8';
                    }}
                  >
                    <span style={{ marginRight: '12px', fontSize: '14px' }}>
                      {getIcon(child.Icono)}
                    </span>
                    {child.Nombre}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </nav>

      {/* FOOTER ACTIONS */}
      <div style={{ padding: '20px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div 
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 24px',
            cursor: 'pointer',
            color: '#ef4444',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <FaSignOutAlt style={{ fontSize: '20px' }} />
          {!isCollapsed && (
            <span style={{ marginLeft: '16px', fontSize: '14px', fontWeight: '600' }}>Cerrar Sesión</span>
          )}
        </div>

        <div 
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 24px',
            cursor: 'pointer',
            color: '#94a3b8'
          }}
        >
          {isCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
          {!isCollapsed && (
            <span style={{ marginLeft: '16px', fontSize: '12px', fontWeight: '500' }}>Colapsar Menú</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar;
