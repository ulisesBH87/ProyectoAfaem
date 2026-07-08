import React from 'react';

function StepBienvenida({ nombreUsuarioCompleto, irSiguientePaso, handleLogout }) {
  return (
    <div style={{ padding: '60px 40px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '10px' }}>
        Bienvenido, {nombreUsuarioCompleto}
      </h1>
      <p style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '30px' }}>
        Comencemos con tu registro inicial
      </p>
      <p style={{ fontSize: '16px', color: 'var(--text-muted)', lineHeight: '1.6', margin: '30px 0', borderTop: '1px solid var(--border-light)', paddingTop: '30px' }}>
        Para activar tu cuenta y comenzar a gestionar tu equipo, necesitamos completar dos pasos.
      </p>
      <button className="btn-premium" onClick={irSiguientePaso} style={{ padding: '14px 60px' }}>
        Continuar
      </button>
      <br />
      <a
        href="#"
        style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '14px', marginTop: '20px', display: 'inline-block' }}
        onClick={(e) => { e.preventDefault(); handleLogout(); }}
      >
        Cerrar sesión
      </a>
    </div>
  );
}

export default StepBienvenida;
