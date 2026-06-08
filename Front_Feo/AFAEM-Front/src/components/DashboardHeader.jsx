import React from 'react';
import HeaderSearch from './Dashboard/HeaderSearch';
// NotificationBell oculto hasta que el backend soporte notificaciones reales
// import NotificationBell from './Dashboard/NotificationBell';
import UserMenu from './Dashboard/UserMenu';
import { FaBars } from 'react-icons/fa';

const DashboardHeader = ({ userEmail, pageTitle = 'Panel de Control AFAEM', onMenuToggle }) => {
  return (
    <>
      <style>{`
        .dashboard-header-container {
          height: var(--header-height, 72px);
          padding: 0 30px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          left: 0;
          width: 100%;
          transition: all 0.3s ease;
          background-color: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          z-index: 1000;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          gap: 16px;
        }

        .header-left-section {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-shrink: 0;
        }

        .header-hamburger-btn {
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 20px;
          display: flex !important; /* Siempre visible como se solicitó */
          align-items: center;
          color: var(--primary);
        }

        .header-title-text {
          font-size: 22px;
          font-weight: 800;
          color: var(--primary);
          margin: 0;
          letter-spacing: -0.5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .header-right-section {
          display: flex;
          align-items: center;
          gap: 24px;
          flex: 1;
          min-width: 0;
          justify-content: flex-end;
        }

        .header-search-wrapper {
          flex: 1;
          min-width: 0;
          max-width: 400px;
        }

        /* Mobile (< 768px) */
        @media (max-width: 767px) {
          .dashboard-header-container {
            padding: 0 16px;
            gap: 12px;
          }
          .header-title-text {
            display: none; /* Ocultar título en móvil */
          }
          .header-right-section {
            gap: 12px;
          }
          .header-search-wrapper {
            max-width: none; /* Ocupa todo el espacio en móvil */
          }
          .user-role-text {
            display: none !important; /* Ocultar rol en móvil */
          }
        }

        /* Tablet (768px - 1024px) */
        @media (min-width: 768px) and (max-width: 1024px) {
          .header-title-text {
            font-size: 18px; /* Título un poco más pequeño para que quepa */
          }
          .header-search-wrapper {
            max-width: 300px;
          }
          .user-role-text {
            display: none !important; /* Ocultar rol en tablet para dar espacio al buscador y título */
          }
        }
      `}</style>
      <header className="main-header-fixed dashboard-header-container">
        <div className="header-left-section">
          <button
            className="header-hamburger-btn"
            onClick={onMenuToggle}
          >
            <FaBars />
          </button>
          <h2 className="header-title header-title-text">
            {pageTitle}
          </h2>
        </div>

        <div className="header-right-section">
          <div className="header-search-wrapper">
            <HeaderSearch />
          </div>
          <UserMenu userEmail={userEmail} />
        </div>
      </header>
    </>
  );
};

export default DashboardHeader;
