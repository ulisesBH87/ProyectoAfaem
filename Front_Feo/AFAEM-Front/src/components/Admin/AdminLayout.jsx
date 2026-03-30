import React from 'react';
import AdminSidebar from './AdminSidebar';

const AdminLayout = ({ children, title }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <AdminSidebar />
      <div style={{ 
        flex: 1, 
        marginLeft: 'var(--sidebar-width, 280px)', 
        transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0
      }}>
        {/* TOP BAR */}
        <header style={{
          height: '70px',
          background: 'white',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 40px',
          position: 'sticky',
          top: 0,
          zIndex: 50
        }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
              {title || 'Dashboard'}
            </h2>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                {user.Nombre || 'Admin Account'}
              </p>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                {user.Correo || 'admin@afaem.com'}
              </p>
            </div>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#0b4ea6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '700'
            }}>
              {(user.Nombre?.[0] || 'A').toUpperCase()}
            </div>
          </div>
        </header>

        {/* MAIN CONTENT AREA */}
        <main style={{ padding: '40px', overflowY: 'auto' }}>
          {children}
        </main>
      </div>

      <style>{`
        :root {
          --sidebar-width: 280px;
        }
        /* Ajustar margen dinámicamente si el sidebar cambia */
      `}</style>
    </div>
  );
};

export default AdminLayout;
