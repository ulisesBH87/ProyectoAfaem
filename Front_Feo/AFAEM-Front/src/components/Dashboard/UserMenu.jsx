import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSignOutAlt, FaUserCircle } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { useRBAC } from '../../hooks/useRBAC';

const UserMenu = ({ userEmail }) => {
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const closeMenu = () => setShowUserMenu(false);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const { hasRole } = useRBAC();
  const isAdmin = hasRole('Admin') || hasRole('Administrador');
  const roleName = isAdmin ? 'Administrador' : 'Presidente';

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
      className="header-user"
      onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu); }}
      style={{ 
        display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
        padding: '6px 12px', borderRadius: '12px', transition: 'background 0.2s',
        justifyContent: 'flex-end', position: 'relative'
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(11, 78, 166, 0.05)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <div className="user-role-text" style={{ textAlign: 'right', flexShrink: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {roleName}
        </div>
      </div>
      <div style={{
        width: '40px', height: '40px', borderRadius: '10px',
        background: isAdmin ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' : 'linear-gradient(135deg, #0b4ea6 0%, #063f82 100%)',
        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', 
        fontSize: '24px', boxShadow: isAdmin ? '0 4px 12px rgba(15, 23, 42, 0.2)' : '0 4px 12px rgba(11, 78, 166, 0.2)'
      }}>
        <FaUserCircle />
      </div>

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
