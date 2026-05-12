import React from 'react';
import HeaderSearch from './Dashboard/HeaderSearch';
// NotificationBell oculto hasta que el backend soporte notificaciones reales
// import NotificationBell from './Dashboard/NotificationBell';
import UserMenu from './Dashboard/UserMenu';
import { FaBars } from 'react-icons/fa';

const DashboardHeader = ({ userEmail, pageTitle = 'Panel de Control AFAEM', onMenuToggle }) => {
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
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        zIndex: 1000,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Botón hamburguesa - solo visible en móvil */}
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="mobile-menu-btn"
            aria-label="Abrir menú"
            style={{
              display: 'none', /* Se muestra via CSS en <768px */
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              border: '1.5px solid var(--border-light)',
              background: 'white',
              color: 'var(--text-main)',
              cursor: 'pointer',
              fontSize: '18px',
              transition: 'all 0.2s ease',
            }}
          >
            <FaBars />
          </button>
        )}
        <h2 className="header-title" style={{ 
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
        <HeaderSearch />
        <UserMenu userEmail={userEmail} />
      </div>
    </header>
  );
};

export default DashboardHeader;
