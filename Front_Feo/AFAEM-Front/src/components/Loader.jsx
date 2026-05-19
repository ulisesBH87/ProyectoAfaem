import React from 'react';
import logo from '../assets/afaem-logo@4x1.png';

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
      {!inline && (
        <div className="afaem-loader-footer">
          <div className="afaem-loader-bar-bg">
            <div className="afaem-loader-bar-fill"></div>
          </div>
          <span>AFAEM Digital Studio © 2026</span>
        </div>
      )}
    </div>
  );
};

export default Loader;
