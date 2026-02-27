import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaFootballBall, FaUsers, FaClipboard, FaChartBar, FaCog } from 'react-icons/fa';
import '../styles/dashboard.css';

const DashboardSidebar = ({ userEmail }) => {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isHovering, setIsHovering] = useState(false);

  const menuItems = [
    { label: 'Inicio', icon: FaHome, path: '/presidente-equipo' },
    { label: 'Equipos', icon: FaFootballBall, path: '/presidente-equipo/equipos' },
    { label: 'Jugadores', icon: FaUsers, path: '/presidente-equipo/mis-jugadores' },
    { label: 'Solicitudes', icon: FaClipboard, path: '/presidente-equipo/solicitudes' },
    { label: 'Reportes', icon: FaChartBar, path: '/presidente-equipo/reportes' },
    { label: 'Configuración', icon: FaCog, path: '/presidente-equipo/configuracion' },
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
        <div className="sidebar-subtitle" style={{ color: 'white' }}>PRESIDENTE DE EQUIPO</div>
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

      {/* MENÚ */}
      <ul className="sidebar-menu">
        {menuItems.map((item, idx) => (
          <li 
            key={idx} 
            className="sidebar-menu-item"
            style={{
              transition: 'all 0.3s ease'
            }}
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
                style={{
                  fontSize: '20px',
                  flexShrink: 0
                }}
              >
                {item.icon}
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


    </div>
  );
};

export default DashboardSidebar;
