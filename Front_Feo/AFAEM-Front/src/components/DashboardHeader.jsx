import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaBell, FaSignOutAlt } from 'react-icons/fa';
import '../styles/dashboard.css';

const DashboardHeader = ({ userEmail, pageTitle = 'Dashboard' }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const notifications = [
    { id: 1, text: 'Nueva solicitud de validación', time: 'hace 5 minutos', type: 'info' },
    { id: 2, text: 'Tu equipo ha sido actualizado', time: 'hace 1 hora', type: 'success' },
  ];

  const getInitials = (email) => {
    return email.split('@')[0].substring(0, 2).toUpperCase();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    navigate('/ingresar');
  };

  return (
    <div className="dashboard-header">
      <div className="header-left">
        <h1 className="header-title" style={{
          background: 'linear-gradient(135deg, #0b4ea6 0%, #063f82 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontSize: pageTitle.includes('Bienvenido') ? '28px' : '24px',
          fontWeight: pageTitle.includes('Bienvenido') ? '700' : '600',
          margin: '0',
          transition: 'all 0.3s ease'
        }}>
          {pageTitle}
        </h1>
      </div>

      <div className="header-right">
        <div className="search-box">
          <input 
            type="text" 
            placeholder="Buscar..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <FaSearch style={{ fontSize: '16px' }} />
        </div>

        <div 
          className="header-notifications"
          onMouseEnter={() => setShowNotifications(true)}
          onMouseLeave={() => setShowNotifications(false)}
          style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <FaBell style={{ fontSize: '18px' }} />
          {notifications.length > 0 && (
            <div className="notification-badge">{notifications.length}</div>
          )}
          
          {showNotifications && (
            <div style={{
              position: 'absolute',
              top: '50px',
              right: '0',
              background: 'white',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              width: '300px',
              maxHeight: '300px',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 1000
            }}>
              {notifications.map(notif => (
                <div key={notif.id} style={{
                  padding: '12px',
                  borderBottom: '1px solid var(--border-color)',
                  fontSize: '13px'
                }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>{notif.text}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{notif.time}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div 
          className="user-profile"
          onMouseEnter={() => setShowUserMenu(true)}
          onMouseLeave={() => setShowUserMenu(false)}
          style={{ position: 'relative', cursor: 'pointer' }}
        >
          <div className="user-avatar">{getInitials(userEmail)}</div>
          <div className="user-info">
            <p className="user-name">Usuario</p>
            <p className="user-role">Entrenador Certificado</p>
          </div>

          {/* DROPDOWN MENU */}
          {showUserMenu && (
            <div 
              style={{
                position: 'absolute',
                top: '65px',
                right: '0',
                background: 'white',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                minWidth: '200px',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 1001,
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  borderBottom: '1px solid var(--border-color)',
                  color: 'var(--text-primary)'
                }}
              >
                <div 
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, #3d79ff 0%, #1e5be6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '12px'
                  }}
                >
                  {getInitials(userEmail)}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', margin: 0 }}>Usuario</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>{userEmail}</div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: '#ef4444',
                  fontSize: '13px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#fee2e2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <FaSignOutAlt style={{ fontSize: '14px' }} />
                <span>Cerrar sesión</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
