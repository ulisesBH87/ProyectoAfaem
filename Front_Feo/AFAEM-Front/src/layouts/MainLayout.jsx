import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import DashboardSidebar from '../components/DashboardSidebar';
import DashboardHeader from '../components/DashboardHeader';
import { useRBAC } from '../hooks/useRBAC';

const MainLayout = ({ userEmail }) => {
  const { estatusId, hasRole, isLoading } = useRBAC();
  const navigate = useNavigate();

  useEffect(() => {
    // Si ya cargaron los permisos y es un presidente con estatus no autorizado (<4)
    if (!isLoading && hasRole('PRESIDENTE') && estatusId && parseInt(estatusId) < 4) {
      console.warn('⚠️ Acceso revocado en tiempo real. Redirigiendo...');
      navigate('/pre-registro-presidente');
    }
  }, [estatusId, isLoading, hasRole, navigate]);
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
      <DashboardSidebar userEmail={userEmail} />
      
      <div style={{ 
        flex: 1, 
        marginLeft: 'var(--sidebar-width)', 
        transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        maxWidth: '100vw',
        overflowX: 'hidden'
      }}>
        <DashboardHeader userEmail={userEmail} />
        
        <main className="fade-in" style={{ 
          padding: '30px', 
          flex: 1
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
