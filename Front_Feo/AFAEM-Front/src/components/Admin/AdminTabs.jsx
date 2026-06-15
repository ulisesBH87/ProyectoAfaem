import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaHome, FaClipboardList, FaMoneyBillWave } from 'react-icons/fa';

const AdminTabs = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { label: 'Tablero Principal', path: '/admin/dashboard', icon: <FaHome /> },
    { label: 'Validar Solicitudes', path: '/admin/solicitudes', icon: <FaClipboardList /> },
    { label: 'Validación de Pagos', path: '/admin/pagos', icon: <FaMoneyBillWave /> },
  ];

  return (
    <>
      <style>{`
        @media (min-width: 769px) {
          .admin-tabs-container {
            display: none !important;
          }
        }
      `}</style>
      <div className="admin-tabs-container" style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '1px solid var(--border-light)',
        paddingBottom: '8px',
        overflowX: 'auto',
        whiteSpace: 'nowrap'
      }}>
      {tabs.map((tab, idx) => {
        const isActive = location.pathname === tab.path;
        return (
          <button
            key={idx}
            onClick={() => navigate(tab.path)}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: isActive ? 'var(--primary)' : 'transparent',
              fontSize: '14px',
              fontWeight: '700',
              color: isActive ? 'white' : 'var(--text-muted)',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: isActive ? '0 4px 12px rgba(11, 78, 166, 0.25)' : 'none'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        );
      })}
    </div>
    </>
  );
};

export default AdminTabs;
