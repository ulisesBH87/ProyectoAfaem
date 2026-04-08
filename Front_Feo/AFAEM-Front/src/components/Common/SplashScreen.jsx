import React from 'react';
import afaemLogo from '../../assets/afaem-logo@4x.png';

const SplashScreen = ({ isExiting }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'white',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      opacity: isExiting ? 0 : 1,
      visibility: isExiting ? 'hidden' : 'visible',
      transition: 'opacity 0.6s ease, visibility 0.6s ease'
    }}>
      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(0.95); opacity: 0.8; }
            50% { transform: scale(1.05); opacity: 1; }
            100% { transform: scale(0.95); opacity: 0.8; }
          }
          .pulse-logo {
            animation: pulse 2.5s ease-in-out infinite;
          }
        `}
      </style>
      <img 
        src={afaemLogo} 
        alt="AFAEM Logo" 
        className="pulse-logo"
        style={{ width: '250px', height: 'auto', marginBottom: '20px' }} 
      />
      <div style={{ 
        fontSize: '14px', 
        fontWeight: '700', 
        color: '#64748b', 
        letterSpacing: '2px',
        textTransform: 'uppercase'
      }}>
        Cargando sistema...
      </div>
    </div>
  );
};

export default SplashScreen;
