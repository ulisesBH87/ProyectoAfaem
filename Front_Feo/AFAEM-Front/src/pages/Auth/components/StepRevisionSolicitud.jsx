import React from 'react';
import COLORS from '../../../styles/colors';

function StepRevisionSolicitud({ handleLogout }) {
  return (
    <div className="pre-registro-section">
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <h2 style={{ color: 'var(--text-main)', fontSize: '28px', fontWeight: '800', marginBottom: '15px' }}>
          Tu solicitud será aprobada pronto
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '16px', maxWidth: '500px', margin: '0 auto 40px', lineHeight: '1.6' }}>
          Tus documentos fueron enviados correctamente. El administrador está revisando tu solicitud y su aprobación llegará pronto.
        </p>
        <div style={{ background: COLORS.overlayWhite03, border: `1px solid ${COLORS.overlayWhite06}`, borderRadius: '16px', padding: '25px', display: 'inline-block', textAlign: 'left' }}>
          <p style={{ margin: '0 0 10px', fontSize: '14px', color: COLORS.successLight, fontWeight: '700' }}>✓ Pago Validado</p>
          <p style={{ margin: '0 0 10px', fontSize: '14px', color: COLORS.warning, fontWeight: '700' }}>Solicitud: EN ESPERA</p>
          <p style={{ margin: '0', fontSize: '14px', color: COLORS.overlayWhite30, fontWeight: '700' }}>○ Acceso: PENDIENTE</p>
        </div>
        <div style={{ marginTop: '40px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Puedes cerrar sesión y volver más tarde para revisar tu estado.</p>
        </div>
        <a
          href="#"
          style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '14px', marginTop: '20px', display: 'inline-block' }}
          onClick={(e) => { e.preventDefault(); handleLogout(); }}
        >
          Cerrar sesión
        </a>
      </div>
    </div>
  );
}

export default StepRevisionSolicitud;
