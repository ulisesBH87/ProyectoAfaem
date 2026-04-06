import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaBell, FaSignOutAlt, FaUserCircle } from 'react-icons/fa';
import Swal from 'sweetalert2';

const DashboardHeader = ({ userEmail, pageTitle = 'Dashboard' }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const closeMenu = () => setShowUserMenu(false);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const notifications = [
    { id: 1, text: 'Nueva solicitud de validación', time: 'hace 5 min', type: 'info' },
    { id: 2, text: 'Actualización de equipo exitosa', time: 'hace 1 h', type: 'success' },
  ];

  const getInitials = (email) => {
    return email ? email.split('@')[0].substring(0, 2).toUpperCase() : 'US';
  };

  const handleLogout = () => {
    Swal.fire({
      title: '¿Cerrar sesión?',
      text: 'Tendrás que ingresar tus credenciales nuevamente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--danger)',
      cancelButtonColor: 'var(--text-muted)',
      confirmButtonText: 'Sí, cerrar sesión',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.clear();
        navigate('/ingresar');
      }
    });
  };

  return (
    <header 
      className="glass"
      style={{
        height: 'var(--header-height)',
        padding: '0 30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'fixed',
        top: 0,
        right: 0,
        width: 'calc(100% - var(--sidebar-width))',
        transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 999,
        borderBottom: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <h2 style={{ 
          fontSize: '22px', 
          fontWeight: '800', 
          color: 'var(--primary)', 
          margin: 0,
          letterSpacing: '-0.5px'
        }}>
          {pageTitle}
        </h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        {/* Search Bar */}
        <div style={{ position: 'relative' }}>
          <FaSearch style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '14px' }} />
          <input 
            type="text" 
            placeholder="Buscar..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '10px 16px 10px 40px',
              width: '280px',
              background: 'rgba(11, 78, 166, 0.05)',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '500',
              border: '1px solid transparent'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--primary-light)'}
            onBlur={(e) => e.target.style.borderColor = 'transparent'}
          />
        </div>

        {/* Notifications */}
        <div 
          style={{ position: 'relative', cursor: 'pointer' }}
          onMouseEnter={() => setShowNotifications(true)}
          onMouseLeave={() => setShowNotifications(false)}
        >
          <div style={{ 
            width: '40px', height: '40px', borderRadius: '10px', 
            background: 'white', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', color: 'var(--text-muted)', border: '1px solid var(--border-light)'
          }}>
            <FaBell style={{ fontSize: '18px' }} />
            {notifications.length > 0 && (
              <span style={{
                position: 'absolute', top: '-4px', right: '-4px',
                width: '18px', height: '18px', borderRadius: '50%',
                backgroundColor: 'var(--danger)', color: 'white',
                fontSize: '10px', fontWeight: 'bold', display: 'flex',
                alignItems: 'center', justifyContent: 'center', border: '2px solid white'
              }}>{notifications.length}</span>
            )}
          </div>
          
          {showNotifications && (
            <div className="fade-in glass" style={{
              position: 'absolute', top: '50px', right: '0',
              width: '320px', borderRadius: 'var(--radius-md)', 
              boxShadow: 'var(--shadow-xl)', padding: '16px', zIndex: 1000
            }}>
              <h4 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '12px' }}>Notificaciones</h4>
              {notifications.map(notif => (
                <div key={notif.id} style={{ 
                  padding: '10px', borderRadius: '8px', marginBottom: '8px',
                  background: 'rgba(255,255,255,0.5)', border: '1px solid var(--border-light)'
                }}>
                  <div style={{ fontSize: '13px', fontWeight: '600' }}>{notif.text}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{notif.time}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Profile */}
        <div 
          onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu); }}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
        >
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>{userEmail ? userEmail.split('@')[0] : 'Usuario'}</div>
            <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>Administrador</div>
          </div>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--primary) 100%)',
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
          }}>
            {getInitials(userEmail)}
          </div>

          {showUserMenu && (
            <div className="fade-in glass" style={{
              position: 'absolute', top: '70px', right: '30px', minWidth: '200px',
              borderRadius: 'var(--radius-md)', padding: '8px', boxShadow: 'var(--shadow-xl)'
            }}>
               <button 
                 onClick={handleLogout}
                 style={{ 
                   width: '100%', padding: '12px', borderRadius: '8px',
                   display: 'flex', alignItems: 'center', gap: '10px',
                   color: 'var(--danger)', background: 'transparent', fontWeight: '600'
                 }}
                 onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                 onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
               >
                 <FaSignOutAlt /> Cerrar Sesión
               </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
