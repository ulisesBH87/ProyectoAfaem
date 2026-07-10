import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FaSignOutAlt,
  FaChevronLeft,
  FaChevronRight,
  FaGavel,
  FaShieldAlt,
  FaFileContract
} from 'react-icons/fa';

import { useRBAC } from '../hooks/useRBAC';
import { getIcon } from '../utils/IconMapper.jsx';
import AfaemLogo from '../assets/afaem-logo@4x.png';
import { ROUTES } from '../routes/paths';

const DashboardSidebar = ({ collapsed, mobileOpen, isMobile: isMobileProp }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { menus, isLoading, hasRole, hasPermission } = useRBAC();
  const [isHovered, setIsHovered] = useState(false);

  // DEFINICIÓN DE TEMAS (Glassmorphism)
  const isAdmin = hasRole('Admin') || hasRole('Administrador');
  const isMaster = hasRole('MASTER') || (hasPermission('auditorias.ver') && !isAdmin);
  const isMobile = isMobileProp !== undefined ? isMobileProp : (window.innerWidth <= 768);
  const isExpanded = isMobile || !collapsed || isHovered;

  const handleLogoClick = () => {
    if (isAdmin) {
      navigate(ROUTES.ADMIN.DASHBOARD);
    } else if (hasPermission('auditorias.ver')) {
      navigate(ROUTES.MASTER.AUDITORIAS);
    } else {
      navigate(ROUTES.PRESIDENTE.EQUIPOS);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate(ROUTES.LOGIN);
  };

  if (isLoading) return null;

  const theme = {
    bg: isAdmin
      ? '#0f172a'
      : 'rgba(255, 255, 255, 0.85)',
    text: isAdmin ? '#e2e8f0' : '#1e293b',
    textMuted: isAdmin ? '#94a3b8' : '#64748b',
    border: isAdmin ? 'rgba(148, 163, 184, 0.18)' : 'rgba(0, 0, 0, 0.05)',
    activeBg: isAdmin ? '#1e293b' : '#0b4ea6',
    activeText: '#ffffff',
    hoverBg: isAdmin ? 'rgba(148, 163, 184, 0.12)' : 'rgba(11, 78, 166, 0.05)',
    shadow: isAdmin ? '0 8px 32px 0 rgba(0, 0, 0, 0.8)' : '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
  };
  return (
    <aside
      className={`dashboard-sidebar${mobileOpen ? ' mobile-open' : ''}${isHovered && collapsed ? ' hovering' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transform: isMobile
          ? (mobileOpen ? 'translateX(0)' : 'translateX(-100%)')
          : 'translateX(0)',

        width: isMobile
          ? '260px'
          : (isExpanded ? '260px' : '80px'),
        height: '100vh',
        maxHeight: '100vh',
        overflowX: 'hidden',
        overflowY: 'auto',
        position: 'fixed',
        left: 0,
        top: 0,
        transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1100,
        backgroundColor: theme.bg,
        backdropFilter: 'blur(15px)',
        WebkitBackdropFilter: 'blur(15px)',
        borderRight: `1px solid ${theme.border}`,
        boxShadow: (isHovered && collapsed)
          ? (isAdmin ? '0 12px 40px 0 rgba(0, 0, 0, 0.9)' : '0 12px 40px 0 rgba(31, 38, 135, 0.3)')
          : theme.shadow,
        color: theme.text
      }}
    >
      {/* HEADER / LOGO */}
      <div style={{
        padding: '16px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '10px',
        borderBottom: `1px solid ${theme.border}`,
        overflow: 'hidden',
        whiteSpace: 'nowrap'
      }}>
        <img
          src={AfaemLogo}
          alt="AFAEM"
          onClick={handleLogoClick}
          style={{
            width: '42px',
            height: '42px',
            objectFit: 'contain',
            flexShrink: 0,
            cursor: 'pointer',
            filter: isAdmin ? 'drop-shadow(0 2px 8px rgba(255, 255, 255, 0.1))' : 'drop-shadow(0 2px 4px rgba(11, 78, 166, 0.15))',
            transition: 'all 0.3s'
          }}
        />
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden', 
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
          maxWidth: isExpanded ? '150px' : '0px', 
          opacity: isExpanded ? 1 : 0 
        }}>
          <h1
            onClick={handleLogoClick}
            style={{ fontSize: '15px', fontWeight: '800', margin: 0, color: isAdmin ? '#ffffff' : 'var(--primary)', letterSpacing: '-0.5px', cursor: 'pointer' }}>
            AFAEM
          </h1>
          <p
            onClick={handleLogoClick}
            style={{ fontSize: '7.5px', fontWeight: '700', margin: 0, color: theme.textMuted, textTransform: 'uppercase', cursor: 'pointer' }}>
            Sistema de gestión
          </p>
        </div>
      </div>

      {/* MENU ITEMS */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto', overflowX: 'hidden' }}>
        {menus
          .filter(item => {
            // Seguridad: Si es una ruta de Master, ocultar a cualquiera que no sea Master
            if (item.Ruta && (item.Ruta.startsWith('/ms') || ['Auditorías', 'Resúmenes', 'Consumos'].includes(item.Nombre))) {
              if (!isMaster) return false;
            }

            // Seguridad: Si es una ruta de Admin, ocultar a cualquiera que no sea Admin
            if (item.Ruta && item.Ruta.startsWith('/ad') && !isAdmin) {
              // Permitir excepción para la pantalla de Auditorías si es Master
              if (item.Nombre === 'Auditorías' && isMaster) {
                // Permitir
              } else {
                return false;
              }
            }
            // Si es Catálogos o Directorio de Equipos y no es Admin, ocultar
            if ((item.Nombre === 'Catálogos' || item.Nombre === 'Equipos') && !isAdmin) {
              // A menos que sea un "Ver Mi Equipo" específico para presidentes (otra ruta)
              if (item.Ruta !== ROUTES.PRESIDENTE.EQUIPOS) return false;
            }
            // Si es 'Mi Equipo' y es Admin, ocultar (porque pertenece a la vista de presidente)
            if (item.Nombre === 'Mi Equipo' && isAdmin) return false;

            // Ocultar Inicio y Solicitudes para Presidente de Equipo (Solo dejar Equipos y Jugadores) en el nivel superior
            if (!isAdmin && (item.Nombre === 'Inicio' || item.Nombre === 'Solicitudes' || item.Nombre === 'Dashboard' || item.Nombre === 'Reportes')) return false;

            return true;
          })
          .map((item, idx) => {
            const isActive = location.pathname === item.Ruta;

            // FILTRAR SUBMENÚS PARA PRESIDENTES
            let filteredSubMenus = item.SubMenus || [];
            if (!isAdmin) {
              filteredSubMenus = filteredSubMenus.filter(sub =>
                !['inicio', 'solicitudes', 'reportes', 'dashboard'].includes(sub.Nombre.toLowerCase())
              );
            }

            const hasChildren = filteredSubMenus.length > 0;

            return (
              <React.Fragment key={idx}>
                <div
                  onClick={() => {
                    if (item.Nombre === 'Mi Equipo') return;
                    const targetRoute = item.Ruta || (item.SubMenus && item.SubMenus.length > 0 ? item.SubMenus[0].Ruta : null);
                    if (targetRoute) navigate(targetRoute);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    margin: '6px 0',
                    borderRadius: '10px',
                    cursor: (item.Ruta && item.Nombre !== 'Mi Equipo') ? 'pointer' : 'default',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    backgroundColor: isActive ? theme.activeBg : 'transparent',
                    color: isActive ? theme.activeText : theme.text,
                    boxShadow: isActive ? (isAdmin ? '0 4px 12px rgba(37, 99, 235, 0.4)' : '0 4px 8px rgba(11, 78, 166, 0.3)') : 'none',
                    padding: isExpanded ? '8px 12px' : '12px 18px',
                    justifyContent: 'flex-start',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive && item.Nombre !== 'Mi Equipo') {
                      e.currentTarget.style.backgroundColor = theme.hoverBg;
                      e.currentTarget.style.color = isAdmin ? '#ffffff' : 'var(--primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive && item.Nombre !== 'Mi Equipo') {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = theme.text;
                    }
                  }}
                >
                  <span style={{ fontSize: '18px', display: 'flex', alignItems: 'center', flexShrink: 0, width: '24px', justifyContent: 'center' }}>
                    {getIcon(item.Icono)}
                  </span>
                  <span
                    style={{
                      marginLeft: isExpanded ? '12px' : '0px',
                      fontSize: '13px',
                      fontWeight: '600',
                      whiteSpace: 'nowrap',
                      opacity: isExpanded ? 1 : 0,
                      maxWidth: isExpanded ? '200px' : '0px',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: 'inline-block',
                      overflow: 'hidden'
                    }}
                  >
                    {item.Nombre}
                  </span>
                </div>

                {/* Submenus if present */}
                <div style={{ 
                  maxHeight: (isExpanded && hasChildren) ? '500px' : '0px', 
                  opacity: (isExpanded && hasChildren) ? 1 : 0, 
                  overflow: 'hidden', 
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
                }}>
                  {hasChildren && filteredSubMenus.map((child, cIdx) => {
                  const isChildActive = location.pathname === child.Ruta;
                  return (
                    <div
                      key={`${idx}-${cIdx}`}
                      onClick={() => navigate(child.Ruta)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '6px 12px 6px 44px',
                        margin: '1px 0',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        backgroundColor: isChildActive ? (isAdmin ? 'rgba(255, 255, 255, 0.05)' : 'rgba(11, 78, 166, 0.08)') : 'transparent',
                        color: isChildActive ? (isAdmin ? '#ffffff' : 'var(--primary)') : theme.textMuted,
                        fontSize: '12px',
                        fontWeight: '500',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden'
                      }}
                    >
                      {child.Nombre}
                    </div>
                  );
                })}
                </div>
              </React.Fragment>
            );
          })}
      </nav>

      {/* FOOTER ACTIONS */}
      <div style={{ padding: '8px 10px', borderTop: `1px solid ${theme.border}` }}>
        {/* SECCIÓN LEGAL MAPEADA */}
        {[{
          label: 'Reglamentos y Legal',
          icon: <FaGavel style={{ fontSize: '18px' }} />,
          path: isAdmin ? ROUTES.ADMIN.REGLAMENTOS : ROUTES.PRESIDENTE.REGLAMENTOS,
        }].map(({ label, icon, path }) => {
          const isActive = location.pathname === path;
          return (
            <div
              key={path}
              onClick={() => navigate(path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: isExpanded ? '10px 12px' : '10px 18px',
                margin: '2px 0',
                borderRadius: '10px',
                cursor: 'pointer',
                color: isActive ? (isAdmin ? '#ffffff' : 'var(--primary)') : theme.text,
                backgroundColor: isActive ? theme.hoverBg : 'transparent',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                justifyContent: 'flex-start',
                overflow: 'hidden',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = theme.hoverBg;
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span style={{ fontSize: '18px', display: 'flex', alignItems: 'center', flexShrink: 0, width: '24px', justifyContent: 'center' }}>
                {icon}
              </span>
              <span style={{ 
                marginLeft: isExpanded ? '12px' : '0px', 
                fontSize: '13px', 
                fontWeight: '700',
                opacity: isExpanded ? 1 : 0,
                maxWidth: isExpanded ? '200px' : '0px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'inline-block',
                overflow: 'hidden'
              }}>
                {label}
              </span>
            </div>
          );
        })}

        <div style={{ height: '1px', background: theme.border, margin: '6px 0' }} />

        <div
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: isExpanded ? '10px 12px' : '10px 18px',
            margin: '2px 0',
            borderRadius: '10px',
            cursor: 'pointer',
            color: 'var(--danger)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            justifyContent: 'flex-start',
            overflow: 'hidden',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <span style={{ fontSize: '18px', display: 'flex', alignItems: 'center', flexShrink: 0, width: '24px', justifyContent: 'center' }}>
            <FaSignOutAlt />
          </span>
          <span style={{ 
            marginLeft: isExpanded ? '12px' : '0px', 
            fontSize: '13px', 
            fontWeight: '700',
            opacity: isExpanded ? 1 : 0,
            maxWidth: isExpanded ? '200px' : '0px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'inline-block',
            overflow: 'hidden'
          }}>
            Cerrar Sesión
          </span>
        </div>

      </div>
    </aside>
  );
};

export default DashboardSidebar;
