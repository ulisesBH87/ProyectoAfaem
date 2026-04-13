import React from 'react';
import logo from '../assets/afaem-logo@4x.png';

const Loader = ({ text = "AFAEM DIGITAL" }) => {
  return (
    <div className="afaem-loader-container">
      <div className="afaem-loader-content">
        <div className="afaem-logo-wrapper">
          <img src={logo} alt="AFAEM" className="afaem-loader-logo" />
          <div className="afaem-loader-ring"></div>
        </div>
        <div className="afaem-loader-text-group">
          <div className="afaem-loader-text">{text}</div>
          <div className="afaem-loader-subtitle">Cargando experiencia premium</div>
        </div>
      </div>
      <div className="afaem-loader-footer">
        <div className="afaem-loader-bar-bg">
          <div className="afaem-loader-bar-fill"></div>
        </div>
        <span>AFAEM Digital Studio © 2026</span>
      </div>
    </div>
  );
};

export default Loader;
