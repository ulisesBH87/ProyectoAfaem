import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSignOutAlt } from 'react-icons/fa';
import Swal from 'sweetalert2';

const UserMenu = ({ userEmail }) => {
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const closeMenu = () => setShowUserMenu(false);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

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
    <div 
      onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu); }}
      style={{ 
        display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
        padding: '6px 12px', borderRadius: '12px', transition: 'background 0.2s',
        minWidth: '160px', justifyContent: 'flex-end', position: 'relative'
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(11, 78, 166, 0.05)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ textAlign: 'right', flexShrink: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {userEmail ? userEmail.split('@')[0] : 'User'}
        </div>
        <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>Administrator</div>
      </div>
      <div style={{
        width: '44px', height: '44px', borderRadius: '12px',
        background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--primary) 100%)',
        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', 
        fontWeight: 'bold', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)'
      }}>{getInitials(userEmail)}</div>

      {showUserMenu && (
        <div className="fade-in glass" style={{
          position: 'absolute', top: '60px', right: '0', minWidth: '200px',
          borderRadius: 'var(--radius-md)', padding: '8px', boxShadow: 'var(--shadow-xl)',
          background: 'rgba(255, 255, 255, 0.98)', border: '1px solid var(--border-light)',
          zIndex: 1001
        }}>
           <button 
             onClick={handleLogout}
             style={{ 
               width: '100%', padding: '12px', borderRadius: '8px',
               display: 'flex', alignItems: 'center', gap: '10px',
               color: 'var(--danger)', background: 'transparent', fontWeight: '600',
               border: 'none', cursor: 'pointer'
             }}
             onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
             onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
           >
             <FaSignOutAlt /> Cerrar Sesión
           </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
