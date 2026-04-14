import React from 'react';
import HeaderSearch from './Dashboard/HeaderSearch';
import NotificationBell from './Dashboard/NotificationBell';
import UserMenu from './Dashboard/UserMenu';

const DashboardHeader = ({ userEmail, pageTitle = 'Panel de Control AFAEM' }) => {
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
        <HeaderSearch />
        <NotificationBell />
        <UserMenu userEmail={userEmail} />
      </div>
    </header>
  );
};

export default DashboardHeader;
