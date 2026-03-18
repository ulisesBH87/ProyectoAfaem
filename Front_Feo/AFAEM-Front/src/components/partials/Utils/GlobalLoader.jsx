import React from 'react';
import soccerBall from '../../../assets/amateur-logo.png'; // Using the amateur logo as it has a ball or we can use an emoji/css ball

export default function GlobalLoader({ isLoading, message = "Cargando..." }) {
  if (!isLoading) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(4px)'
    }}>
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes pulseText {
            0% { opacity: 0.7; transform: scale(0.98); }
            50% { opacity: 1; transform: scale(1); }
            100% { opacity: 0.7; transform: scale(0.98); }
          }
          .football-spinner {
            font-size: 60px;
            animation: spin 1.2s linear infinite;
            filter: drop-shadow(0 0 10px rgba(255,255,255,0.3));
          }
        `}
      </style>
      
      <div className="football-spinner">⚽</div>
      
      <h3 style={{
        color: 'white',
        marginTop: '20px',
        fontWeight: 'bold',
        letterSpacing: '1px',
        animation: 'pulseText 1.5s ease-in-out infinite',
        textShadow: '0 2px 4px rgba(0,0,0,0.5)'
      }}>
        {message}
      </h3>
    </div>
  );
}
