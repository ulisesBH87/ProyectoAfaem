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

const AdminSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '80px' : '280px');
  }, [isCollapsed]);

  const menuItems = [
    { label: 'Tablero Principal', icon: <FaHome />, path: '/admin/dashboard' },
    { label: 'Validar Solicitudes', icon: <FaClipboardList />, path: '/admin/solicitudes' },
    { label: 'Validación de Pagos', icon: <FaShieldAlt />, path: '/admin/pagos' },
  ];

  const handleLogout = () => {
    localStorage.clear();
    navigate('/ingresar');
  };

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
        {menuItems.map((item, idx) => {
          const isActive = location.pathname === item.path;
          return (
            <div 
              key={idx}
              onClick={() => navigate(item.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 24px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                backgroundColor: isActive ? 'rgba(11, 78, 166, 0.1)' : 'transparent',
                borderLeft: `4px solid ${isActive ? '#0b4ea6' : 'transparent'}`,
                color: isActive ? 'white' : '#94a3b8',
                marginBottom: '4px'
              }}
              onMouseEnter={(e) => {
                if(!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)';
                  e.currentTarget.style.color = '#e2e8f0';
                }
              }}
              onMouseLeave={(e) => {
                if(!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#94a3b8';
                }
              }}
            >
              <span style={{ fontSize: '20px', display: 'flex', alignItems: 'center' }}>
                {item.icon}
              </span>
              {!isCollapsed && (
                <span style={{ marginLeft: '16px', fontSize: '14px', fontWeight: '600' }}>
                  {item.label}
                </span>
              )}
            </div>
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
