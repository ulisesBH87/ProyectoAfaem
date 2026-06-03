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
        left: 0,
        width: '100%',
        transition: 'all 0.3s ease',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        zIndex: 1000,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Botón hamburguesa - solo visible en móvil */}
        <button
          className="mobile-menu-btn"
          onClick={onMenuToggle}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--primary)'
          }}
        >
          <FaBars />
        </button>
        <h2 className="header-title" style={{ 
          fontSize: '22px', 
          fontWeight: '800', 
          color: 'var(--primary)', 
          margin: 0,
          letterSpacing: '-0.5px',
          whiteSpace: 'nowrap',
          overflow: 'nowrap',
          textOverflow: 'ellipsis'
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
