import React from 'react';
import logo from '../assets/afaem-logo@4x1Azul.png';
import { FaFutbol } from 'react-icons/fa';

const Loader = ({ text = "AFAEM DIGITAL", inline = false }) => {
  return (
    <div className={`afaem-loader-container ${inline ? 'inline' : ''}`}>
      <div className="afaem-loader-content">
        <div className="afaem-logo-wrapper">
          <img src={logo} alt="AFAEM" className="afaem-loader-logo" />
          <div className="afaem-loader-ring"></div>
        </div>
        <div className="afaem-loader-text-group">
          <div className="afaem-loader-text">{text}</div>
        </div>
      </div>

      {/* CÓDIGO DEL BALÓN REBOTANDO PARA USO POSTERIOR:
      <style>
        {`
          @keyframes afaem-bounce {
            0%, 100% {
              transform: translateY(0) scale(1.05, 0.95);
            }
            50% {
              transform: translateY(-55px) scale(0.95, 1.05);
            }
          }
          .afaem-loader-ball {
            animation: afaem-bounce 0.8s ease-in-out infinite;
          }
        `}
      </style>
      <div className="afaem-loader-content" style={{ marginTop: '20px', display: 'none' }}>
        <div className="afaem-logo-wrapper">
          <FaFutbol className="afaem-loader-ball" style={{ fontSize: '70px', color: 'var(--primary)', zIndex: 2 }} />
        </div>
      </div>
      */}
    </div>
  );
};

export default Loader;
