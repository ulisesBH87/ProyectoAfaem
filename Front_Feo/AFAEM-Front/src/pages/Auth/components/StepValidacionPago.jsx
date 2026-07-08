import React from 'react';
import { FaCheckCircle, FaTimesCircle, FaClock } from 'react-icons/fa';
import COLORS from '../../../styles/colors';

function StepValidacionPago({
  estadoPago,
  nombreUsuarioCompleto,
  setPasoActual,
  mensajeRechazoPago,
  setEstadoPago,
  handleLogout
}) {
  return (
    <div className="welcome-content">
      {estadoPago === 3 ? (
        /* PAGO VALIDADO */
        <div className="fade-in" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          textAlign: 'center',
          minHeight: '400px'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            background: COLORS.successBgTranslucent10,
            color: 'var(--secondary)',
            marginBottom: '25px',
            border: `2px solid ${COLORS.successBgTranslucent18}`
          }}>
            <FaCheckCircle />
          </div>

          <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '15px' }}>
            ¡Bienvenido, {nombreUsuarioCompleto}!
          </h1>

          <div style={{ maxWidth: '500px' }}>
            <div style={{
              display: 'inline-block',
              background: COLORS.successBgTranslucent10,
              color: 'var(--secondary)',
              padding: '8px 20px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '800',
              marginBottom: '20px',
              border: `1px solid ${COLORS.successBgTranslucent18}`
            }}>
              PAGO VALIDADO
            </div>
            <p style={{ fontSize: '16px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '30px' }}>
              Tu comprobante de pago ha sido verificado correctamente. Ahora puedes continuar con la carga de los documentos.
            </p>
            <button className="btn-premium" style={{ padding: '16px 60px' }} onClick={() => setPasoActual(3)}>
              Continuar con documentos
            </button>
            <br />
            <button style={{
              marginTop: '20px',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }} onClick={handleLogout}>Cerrar sesión</button>
          </div>
        </div>
      ) : estadoPago === 4 ? (
        /* PAGO RECHAZADO */
        <div className="fade-in" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          textAlign: 'center',
          minHeight: '400px'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            background: COLORS.dangerBgTranslucent10,
            color: 'var(--danger)',
            marginBottom: '25px',
            border: `2px solid ${COLORS.dangerBgTranslucent}`
          }}>
            <FaTimesCircle />
          </div>

          <h1 style={{ fontSize: '30px', fontWeight: '800', color: 'var(--danger)', marginBottom: '15px' }}>
            Un administrador ha revisado el pago y haz sido rechazado
          </h1>

          <div style={{ maxWidth: '500px' }}>
            <div style={{
              display: 'inline-block',
              background: COLORS.dangerBgTranslucent10,
              color: 'var(--danger)',
              padding: '8px 20px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '800',
              marginBottom: '20px',
              border: `1px solid ${COLORS.dangerBgTranslucent}`
            }}>
              PAGO DENEGADO
            </div>
            <div style={{ background: COLORS.dangerBgTranslucent05, border: `1px solid ${COLORS.dangerBgTranslucent}`, borderRadius: '16px', padding: '20px', marginBottom: '30px', textAlign: 'left' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: '800', color: 'var(--danger)' }}>Administrador: haz sido rechazado por este motivo:</h4>
              <p style={{ fontSize: '14px', color: 'var(--text-main)', fontStyle: 'italic', margin: 0 }}>
                "{mensajeRechazoPago || 'El comprobante de pago no fue aceptado. Por favor, revisa tus datos y sube un comprobante válido.'}"
              </p>
            </div>

            <button className="btn-premium" style={{ padding: '16px 60px' }} onClick={() => {
              setEstadoPago(null);
              setPasoActual(1);
            }}>
              Subir nuevo comprobante
            </button>
            <br />
            <button style={{
              marginTop: '20px',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }} onClick={handleLogout}>Cerrar sesión</button>
          </div>
        </div>
      ) : (
        /* ESPERANDO VALIDACIÓN */
        <div className="fade-in" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          textAlign: 'center',
          minHeight: '400px'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            background: COLORS.warningBgTranslucent10,
            color: 'var(--warning)',
            marginBottom: '25px',
            border: `2px solid ${COLORS.warningBgTranslucent20}`
          }}>
            <FaClock />
          </div>

          <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '15px' }}>
            Tu orden será aprobada pronto
          </h1>

          <div style={{ maxWidth: '500px' }}>
            <div style={{
              display: 'inline-block',
              background: COLORS.warningBgTranslucent10,
              color: 'var(--warning)',
              padding: '8px 20px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '800',
              marginBottom: '20px',
              border: `1px solid ${COLORS.warningBgTranslucent20}`
            }}>
              ORDEN EN ESPERA
            </div>
            <p style={{ fontSize: '16px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '30px' }}>
              Hemos recibido tu comprobante de pago. Tu orden será aprobada pronto y, cuando eso ocurra,
              podrás continuar con la carga de documentos necesarios para tu afiliación oficial.
            </p>

            <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '20px', marginBottom: '30px', textAlign: 'left' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '800', color: 'var(--primary)' }}>Documentos a preparar:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span>• Acta de nacimiento</span>
                <span>• Fotografía reciente</span>
                <span>• Identificación oficial</span>
              </div>
            </div>

            <button className="btn-premium" style={{ padding: '14px 40px', background: 'var(--text-muted)', boxShadow: 'none' }} onClick={handleLogout}>
              Cerrar sesión
            </button>
            <br />
          </div>
        </div>
      )}
    </div>
  );
}

export default StepValidacionPago;
