import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaBell, FaSignOutAlt, FaUserCircle } from 'react-icons/fa';
import Swal from 'sweetalert2';
import SearchBar from './Common/SearchBar';

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
      className="main-header-fixed"
      style={{
        height: 'var(--header-height)',
        padding: '0 30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        backgroundColor: '#ffffff', // Fondo sólido
        borderBottom: '1px solid #e2e8f0',
        zIndex: 1000,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
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
        <SearchBar 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar..."
          width="280px"
        />

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
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            cursor: 'pointer',
            padding: '6px 12px',
            borderRadius: '12px',
            transition: 'background 0.2s',
            minWidth: '160px',
            justifyContent: 'flex-end',
            flexShrink: 0
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(11, 78, 166, 0.05)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ textAlign: 'right', flexShrink: 1, minWidth: 0 }}>
            <div style={{ 
              fontSize: '13px', 
              fontWeight: '700', 
              color: 'var(--text-main)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {userEmail ? userEmail.split('@')[0] : 'User'}
            </div>
            <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>Administrator</div>
          </div>
          <div style={{
            width: '44px', 
            height: '44px', 
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--primary) 100%)',
            color: 'white', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontWeight: 'bold',
            flexShrink: 0,
            boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)'
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
