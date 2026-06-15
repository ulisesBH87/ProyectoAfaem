import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import DashboardSidebar from '../components/DashboardSidebar';
import DashboardHeader from '../components/DashboardHeader';
import { useRBAC } from '../hooks/useRBAC';

const MainLayout = ({ userEmail }) => {
  const { estatusId, hasRole, isLoading } = useRBAC();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Si ya cargaron los permisos y es un presidente con estatus no autorizado (<5)
    if (!isLoading && hasRole('PRESIDENTE') && estatusId && parseInt(estatusId) < 5) {
      console.warn('Acceso revocado en tiempo real. Redirigiendo...');
      navigate('/pre-registro-presidente');
    }
  }, [estatusId, isLoading, hasRole, navigate]);

  // Cerrar menú móvil al navegar
  useEffect(() => {
    //eslint-disable-next-line
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Bloquear scroll del body cuando el menú móvil está abierto
  //useEffect(() => {
  // if (mobileMenuOpen) {
  // document.body.style.overflow = 'hidden';
  //} else {
  //document.body.style.overflow = '';
  //}
  //return () => { document.body.style.overflow = ''; };
  //}, [mobileMenuOpen]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
      {/* Backdrop oscuro en móvil */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1099,
            transition: 'opacity 0.3s ease',
          }}
        />
      )}

      <DashboardSidebar
        userEmail={userEmail}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileMenuOpen}
      //onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div
        className="main-content-wrapper"
        style={{
          flex: 1,
          marginLeft: isMobile
            ? '0'
            : (sidebarCollapsed ? '80px' : '260px'),
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          maxWidth: '100vw',
          overflowX: 'auto'
        }}
      >
        <DashboardHeader
          userEmail={userEmail}
          onMenuToggle={() => {
            if (isMobile) {
              setMobileMenuOpen(prev => !prev);
            } else {
              setSidebarCollapsed(prev => !prev);
            }
          }}
        />
        <main className="fade-in" style={{
          padding: '24px 30px',
          flex: 1
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
