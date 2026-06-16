import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRBAC } from '../hooks/useRBAC';
import { getIcon } from '../utils/IconMapper.jsx';
import { FaEllipsisH, FaGavel, FaShieldAlt, FaFileContract, FaTimes } from 'react-icons/fa';

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { menus, isLoading, hasRole } = useRBAC();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  if (isLoading) return null;

  const isAdmin = hasRole('Admin') || hasRole('Administrador');

  const theme = {
    bg: isAdmin ? 'rgba(15, 23, 42, 0.95)' : '#ffffff',
    text: isAdmin ? '#94a3b8' : '#64748b',
    activeText: isAdmin ? '#ffffff' : 'var(--primary)',
    borderTop: isAdmin ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
    sheetBg: isAdmin ? '#0f172a' : '#ffffff',
    sheetTitle: isAdmin ? '#f8fafc' : '#1e293b',
    sheetSubtitle: isAdmin ? '#64748b' : '#94a3b8',
    sheetItemBg: isAdmin ? 'rgba(255,255,255,0.05)' : '#f8fafc',
    sheetItemActiveBg: isAdmin ? 'var(--primary)' : 'rgba(37, 99, 235, 0.08)',
    sheetItemText: isAdmin ? '#e2e8f0' : '#1e293b',
    sheetItemActiveText: isAdmin ? '#ffffff' : 'var(--primary)',
  };

  let flattenedMenus = [];
  menus.forEach(item => {
    if (item.Nombre === 'Mi Equipo' && !isAdmin && item.SubMenus && item.SubMenus.length > 0) {
      flattenedMenus.push(...item.SubMenus);
    } else {
      flattenedMenus.push(item);
    }
  });

  const allValidMenus = flattenedMenus.filter(item => {
    if (item.Ruta && item.Ruta.startsWith('/admin') && !isAdmin) return false;
    if ((item.Nombre === 'Catálogos' || item.Nombre === 'Equipos' || item.Nombre === 'Catálogo Equipos' || item.Nombre === 'Catálogo Jugadores') && !isAdmin) {
      if (item.Ruta !== '/presidente-equipo/equipos' && item.Ruta !== '/presidente-equipo/mis-jugadores') return false;
    }
    if (item.Nombre === 'Mi Equipo' && isAdmin) return false;
    if (item.Nombre === 'Auditorías') return false;
    if (!isAdmin && (item.Nombre === 'Inicio' || item.Nombre === 'Solicitudes' || item.Nombre === 'Dashboard' || item.Nombre === 'Reportes')) return false;
    return true;
  });

  const mainMenus = allValidMenus.filter(item => item.Nombre !== 'Catálogos').slice(0, 4);
  const extraMenus = allValidMenus.filter(item => !mainMenus.includes(item));

  const legalLinks = [
    { label: 'Reglamentos', icon: <FaGavel />, path: isAdmin ? '/admin/reglamentos' : '/presidente-equipo/reglamentos' },
    { label: 'Privacidad', icon: <FaShieldAlt />, path: isAdmin ? '/admin/politica-privacidad' : '/presidente-equipo/politica-privacidad' },
    { label: 'Términos', icon: <FaFileContract />, path: isAdmin ? '/admin/terminos-condiciones' : '/presidente-equipo/terminos-condiciones' },
  ];

  return (
    <>
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: theme.bg,
        backdropFilter: 'blur(15px)',
        WebkitBackdropFilter: 'blur(15px)',
        borderTop: theme.borderTop,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingTop: '12px',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        zIndex: 1100,
        boxShadow: isAdmin ? '0 -8px 32px 0 rgba(0, 0, 0, 0.8)' : '0 -4px 6px -1px rgba(0, 0, 0, 0.05)',
      }}>
        {mainMenus.map((item, idx) => {
          const isActive = location.pathname === item.Ruta || (item.SubMenus && item.SubMenus.some(sub => location.pathname === sub.Ruta));
          return (
            <div
              key={idx}
              onClick={() => {
                if (item.Nombre === 'Mi Equipo') return;
                setShowMoreMenu(false);
                const targetRoute = item.Ruta || (item.SubMenus && item.SubMenus.length > 0 ? item.SubMenus[0].Ruta : null);
                if (targetRoute) navigate(targetRoute);
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: '1 1 0',
                minWidth: 0,
                color: isActive ? theme.activeText : theme.text,
                cursor: 'pointer',
                transition: 'color 0.2s'
              }}
            >
              <span style={{ fontSize: '20px', marginBottom: '4px', flexShrink: 0 }}>
                {getIcon(item.Icono)}
              </span>
              <span style={{ fontSize: '10px', fontWeight: isActive ? '700' : '500', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', padding: '0 2px' }}>
                {item.Nombre}
              </span>
            </div>
          );
        })}

        <div
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: '1 1 0',
            minWidth: 0,
            color: showMoreMenu ? theme.activeText : theme.text,
            cursor: 'pointer',
            transition: 'color 0.2s'
          }}
        >
          <span style={{ fontSize: '20px', marginBottom: '4px', flexShrink: 0 }}>
            <FaEllipsisH />
          </span>
          <span style={{ fontSize: '10px', fontWeight: showMoreMenu ? '700' : '500', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', padding: '0 2px' }}>
            Más
          </span>
        </div>
      </div>

      {/* Menú Más (Bottom Sheet) */}
      {showMoreMenu && (
        <>
          <div 
            onClick={() => setShowMoreMenu(false)}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1098 }} 
          />
          <div style={{
            position: 'fixed',
            bottom: '65px',
            left: 0,
            right: 0,
            backgroundColor: theme.sheetBg,
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            padding: '20px',
            zIndex: 1099,
            boxShadow: isAdmin ? '0 -10px 40px rgba(0,0,0,0.6)' : '0 -10px 20px rgba(0,0,0,0.1)',
            paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
            animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            maxHeight: '70vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: theme.sheetTitle }}>Más opciones</h3>
              <FaTimes onClick={() => setShowMoreMenu(false)} style={{ color: theme.text, cursor: 'pointer', fontSize: '20px' }} />
            </div>

            {/* Render extra menus that didn't fit in main 4 */}
            {extraMenus.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: '700', color: theme.sheetSubtitle, textTransform: 'uppercase', marginBottom: '8px' }}>Módulos</h4>
                {extraMenus.map((item, idx) => {
                  const isActive = location.pathname === item.Ruta || (item.SubMenus && item.SubMenus.some(sub => location.pathname === sub.Ruta));
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (item.Nombre === 'Mi Equipo') return;
                        setShowMoreMenu(false);
                        const targetRoute = item.Ruta || (item.SubMenus && item.SubMenus.length > 0 ? item.SubMenus[0].Ruta : null);
                        if (targetRoute) navigate(targetRoute);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '16px 12px',
                        margin: '8px 0',
                        borderRadius: '12px',
                        backgroundColor: isActive ? theme.sheetItemActiveBg : theme.sheetItemBg,
                        color: isActive ? theme.sheetItemActiveText : theme.sheetItemText,
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <span style={{ fontSize: '18px', marginRight: '16px', color: isActive ? theme.sheetItemActiveText : theme.text }}>
                        {getIcon(item.Icono)}
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: '600' }}>
                        {item.Nombre}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div>
              <h4 style={{ fontSize: '12px', fontWeight: '700', color: theme.sheetSubtitle, textTransform: 'uppercase', marginBottom: '8px', marginTop: extraMenus.length > 0 ? '16px' : '0' }}>Información Legal</h4>
              {legalLinks.map((link, idx) => {
                const isLinkActive = location.pathname === link.path;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      navigate(link.path);
                      setShowMoreMenu(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '16px 12px',
                      margin: '8px 0',
                      borderRadius: '12px',
                      backgroundColor: isLinkActive ? theme.sheetItemActiveBg : theme.sheetItemBg,
                      color: isLinkActive ? theme.sheetItemActiveText : theme.sheetItemText,
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    <span style={{ fontSize: '18px', marginRight: '16px', color: isLinkActive ? theme.sheetItemActiveText : theme.text }}>
                      {link.icon}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: '600' }}>
                      {link.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <style>{`
            @keyframes slideUp {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
          `}</style>
        </>
      )}
    </>
  );
};

export default MobileBottomNav;
