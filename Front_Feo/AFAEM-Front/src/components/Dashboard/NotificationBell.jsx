import React, { useState } from 'react';
import { FaBell } from 'react-icons/fa';

const NotificationBell = () => {
  const [showNotifications, setShowNotifications] = useState(false);
  
  const notifications = [
    { id: 1, text: 'Nueva solicitud de validación', time: 'hace 5 min', type: 'info' },
    { id: 2, text: 'Actualización de equipo exitosa', time: 'hace 1 h', type: 'success' },
  ];

  return (
    <div 
      style={{ position: 'relative', cursor: 'pointer' }}
      onMouseEnter={() => setShowNotifications(true)}
      onMouseLeave={() => setShowNotifications(false)}
    >
      <div style={{ 
        width: '40px', height: '40px', borderRadius: '10px', 
        background: 'white', display: 'flex', alignItems: 'center', 
        justifyContent: 'center', color: 'var(--text-muted)', border: '1px solid var(--border-light)'
      }}>
        <FaBell style={{ fontSize: '18px' }} />
        {notifications.length > 0 && (
          <span style={{
            position: 'absolute', top: '-4px', right: '-4px',
            width: '18px', height: '18px', borderRadius: '50%',
            backgroundColor: 'var(--danger)', color: 'white',
            fontSize: '10px', fontWeight: 'bold', display: 'flex',
            alignItems: 'center', justifyContent: 'center', border: '2px solid white'
          }}>{notifications.length}</span>
        )}
      </div>
      
      {showNotifications && (
        <div className="fade-in glass" style={{
          position: 'absolute', top: '50px', right: '0',
          width: '320px', borderRadius: 'var(--radius-md)', 
          boxShadow: 'var(--shadow-xl)', padding: '16px', zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid var(--border-light)'
        }}>
          <h4 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '12px' }}>Notificaciones</h4>
          {notifications.map(notif => (
            <div key={notif.id} style={{ 
              padding: '10px', borderRadius: '8px', marginBottom: '8px',
              background: 'rgba(255,255,255,0.5)', border: '1px solid var(--border-light)'
            }}>
              <div style={{ fontSize: '13px', fontWeight: '600' }}>{notif.text}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{notif.time}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
