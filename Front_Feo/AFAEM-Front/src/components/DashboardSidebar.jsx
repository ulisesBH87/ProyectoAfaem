import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FaHome, FaFootballBall, FaUsers, FaClipboard, FaChartBar, FaCog,
  FaGavel, FaShieldAlt, FaFileContract
} from 'react-icons/fa';
import '../styles/dashboard.css';

const DashboardSidebar = ({ userEmail, role }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isHovering, setIsHovering] = useState(false);

  // Detectar si es admin o presidente de equipo
  const isAdmin = role === 'admin' || location.pathname.startsWith('/admin');

  // Tema según rol
  const theme = {
    textMuted: '#64748b',
    hoverBg: isAdmin ? 'rgba(255,255,255,0.06)' : 'rgba(11,78,166,0.06)',
    border: isAdmin ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
  };

  const menuItems = [
    { label: 'Inicio', icon: FaHome, path: isAdmin ? '/admin' : '/presidente-equipo' },
    { label: 'Equipos', icon: FaFootballBall, path: isAdmin ? '/admin/equipos' : '/presidente-equipo/equipos' },
    { label: 'Jugadores', icon: FaUsers, path: isAdmin ? '/admin/jugadores' : '/presidente-equipo/mis-jugadores' },
    { label: 'Solicitudes', icon: FaClipboard, path: isAdmin ? '/admin/solicitudes' : '/presidente-equipo/solicitudes' },
    { label: 'Reportes', icon: FaChartBar, path: isAdmin ? '/admin/reportes' : '/presidente-equipo/reportes' },
    { label: 'Configuración', icon: FaCog, path: isAdmin ? '/admin/configuracion' : '/presidente-equipo/configuracion' },
  ];

  // Determinar si mostrar expandido (por collapse manual o hover)
  const isExpanded = !isCollapsed || isHovering;

  return (
    <div
      className={`dashboard-sidebar ${isCollapsed ? 'collapsed' : ''} ${isHovering ? 'hovering' : ''}`}
      onMouseEnter={() => isCollapsed && setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      style={{
        width: isExpanded ? '280px' : '80px',
        transition: 'width 0.3s ease'
      }}
    >
      {/* HEADER */}
      <div className="sidebar-header" style={{
        opacity: isExpanded ? 1 : 0,
        visibility: isExpanded ? 'visible' : 'hidden',
        transition: 'opacity 0.3s ease'
      }}>
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white' }}>
          <FaFootballBall style={{ fontSize: '18px', color: '#0b4ea6' }} />
          AFAEM
        </div>
        <div className="sidebar-subtitle" style={{ color: 'white' }}>
          {isAdmin ? 'ADMINISTRADOR' : 'PRESIDENTE DE EQUIPO'}
        </div>
      </div>

      {/* BOTÓN TOGGLE */}
      <div style={{
        display: 'flex',
        justifyContent: isExpanded ? 'flex-end' : 'center',
        padding: isExpanded ? '12px 16px' : '12px',
        transition: 'all 0.3s ease'
      }}>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            backgroundColor: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            transition: 'all 0.2s ease',
            color: '#0b4ea6'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f1f5f9';
            e.currentTarget.style.borderColor = '#cbd5e1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
          title={isCollapsed ? 'Expandir' : 'Contraer'}
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      {/* MENÚ PRINCIPAL */}
      <ul className="sidebar-menu">
        {menuItems.map((item, idx) => (
          <li
            key={idx}
            className="sidebar-menu-item"
            style={{ transition: 'all 0.3s ease' }}
          >
            <a
              className="sidebar-menu-link"
              onClick={() => navigate(item.path)}
              style={{
                justifyContent: isExpanded ? 'flex-start' : 'center',
                gap: isExpanded ? '12px' : '0',
                padding: isExpanded ? '12px 16px' : '12px',
                transition: 'all 0.3s ease'
              }}
              title={!isExpanded ? item.label : ''}
            >
              <span
                className="sidebar-menu-icon"
                style={{ fontSize: '20px', flexShrink: 0 }}
              >
                <item.icon />
              </span>
              <span
                style={{
                  opacity: isExpanded ? 1 : 0,
                  visibility: isExpanded ? 'visible' : 'hidden',
                  transition: 'opacity 0.3s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                {item.label}
              </span>
            </a>
          </li>
        ))}
      </ul>

      {/* ── FOOTER ACTIONS ── */}
      {isExpanded && (
        <div style={{ padding: '0 8px', marginTop: 'auto' }}>
          {/* Separador */}
          <div style={{ height: '1px', background: theme.border, margin: '6px 0' }} />

          {/* ── Sección Legal ── */}
          {[{
            label: 'Reglamentos',
            icon: <FaGavel style={{ fontSize: '17px' }} />,
            path: isAdmin ? '/admin/reglamentos' : '/presidente-equipo/reglamentos',
          }, {
            label: 'Política de Privacidad',
            icon: <FaShieldAlt style={{ fontSize: '17px' }} />,
            path: isAdmin ? '/admin/politica-privacidad' : '/presidente-equipo/politica-privacidad',
          }, {
            label: 'Términos y Condiciones',
            icon: <FaFileContract style={{ fontSize: '17px' }} />,
            path: isAdmin ? '/admin/terminos-condiciones' : '/presidente-equipo/terminos-condiciones',
          }].map(({ label, icon, path }) => {
            const isLegalActive = location.pathname === path;
            return (
              <div
                key={path}
                onClick={() => navigate(path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '9px 12px',
                  margin: '1px 0',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  color: isLegalActive
                    ? (isAdmin ? '#ffffff' : 'var(--primary)')
                    : theme.textMuted,
                  backgroundColor: isLegalActive
                    ? (isAdmin ? 'rgba(255,255,255,0.08)' : 'rgba(11,78,166,0.08)')
                    : 'transparent',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!isLegalActive) e.currentTarget.style.backgroundColor = theme.hoverBg;
                }}
                onMouseLeave={(e) => {
                  if (!isLegalActive) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {icon}
                <span style={{ marginLeft: '12px', fontSize: '12px', fontWeight: '600' }}>
                  {label}
                </span>
              </div>
            );
          })}

          {/* Separador */}
          <div style={{ height: '1px', background: theme.border, margin: '6px 0' }} />
        </div>
      )}

    </div>
  );
};

export default DashboardSidebar;
