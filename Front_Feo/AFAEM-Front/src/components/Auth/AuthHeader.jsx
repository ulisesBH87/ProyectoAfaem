import React from 'react';
import AfaemLogo from '../../assets/afaem-logo@4x.png';
import AmateurLogo from '../../assets/amateur-logo.png';
import FmfLogo from '../../assets/fmf-logo.png';

const AuthHeader = ({ title, subtitle }) => {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <img src={AfaemLogo} alt="AFAEM" style={{ height: '60px', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.2))' }} />
        <div style={{ display: 'flex', gap: '15px' }}>
          <img src={FmfLogo} alt="FMF" style={{ height: '32px', opacity: 0.8 }} />
          <img src={AmateurLogo} alt="Amateur" style={{ height: '32px', opacity: 0.8 }} />
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 className="heading-outfit" style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>{title}</h2>
        <p className="glass-subtitle">{subtitle}</p>
      </div>
    </>
  );
};

export default AuthHeader;
