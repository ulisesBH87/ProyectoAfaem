import React from 'react';
import { createPortal } from 'react-dom';
import COLORS from '../../../styles/colors';
import { normalizarNombreSeguro } from '../preRegistroUtils';
import { DETALLES_SEGUROS } from '../preRegistroConstants';

function SeguroDetallesModal({
  seguroDetalle,
  setSeguroDetalle,
  cantidadModal,
  setCantidadModal,
  jugadoresRestantes,
  asignacionSeguros,
  setAsignacionSeguros,
  segurosPresidente
}) {
  if (!seguroDetalle) return null;

  const segNombreNormalizado = normalizarNombreSeguro(seguroDetalle.nombre);
  const dbInfo = DETALLES_SEGUROS[segNombreNormalizado] || {};
  const info = {
    ...dbInfo,
    nombre: seguroDetalle.nombre || dbInfo.nombre || seguroDetalle.Nombre || 'Seguro',
    precio: seguroDetalle.precio !== undefined ? seguroDetalle.precio : (seguroDetalle.Precio !== undefined ? seguroDetalle.Precio : dbInfo.precio),
    poliza: dbInfo.poliza || 'N/A',
    vigencia: dbInfo.vigencia || 'N/A',
    alcance: dbInfo.alcance || seguroDetalle.descripcion || 'Información general de cobertura y beneficios.',
    beneficios: dbInfo.beneficios || [seguroDetalle.descripcion || 'Sin descripción adicional.'],
    coberturas: dbInfo.coberturas || []
  };
  const esPresidente = ['TIPO G', 'TIPO J'].includes(segNombreNormalizado);

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: COLORS.overlaySlateDeep,
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        backgroundColor: COLORS.slate800,
        border: `1px solid ${COLORS.overlayWhite10}`,
        borderRadius: '24px',
        width: '100%',
        maxWidth: '850px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: `0 25px 50px -12px ${COLORS.overlayBlack}`,
        display: 'flex',
        flexDirection: 'column',
        color: 'var(--text-main)'
      }}>
        {/* Header */}
        <div style={{
          padding: '25px 30px',
          borderBottom: `1px solid ${COLORS.overlayWhite08}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '15px',
          background: `linear-gradient(90deg, ${COLORS.slate800}, ${COLORS.slate900})`
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '12px', fontWeight: '900', color: COLORS.secondaryLight, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {esPresidente ? 'Seguro Presidente' : 'Seguro Jugador'}
            </h3>
            <h2 style={{ margin: '5px 0 0', fontSize: '22px', fontWeight: '900', color: COLORS.white }}>
              {info.nombre}
            </h2>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: COLORS.overlayWhite50, fontWeight: '700', textTransform: 'uppercase' }}>Costo Unitario</div>
            <div style={{ fontSize: '26px', fontWeight: '900', color: COLORS.successLight }}>
              ${Number(info.precio).toFixed(2)} <span style={{ fontSize: '12px', fontWeight: '700', color: COLORS.overlayWhite60 }}>M.N.</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '25px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px' }}>
            {/* Left Column - Benefits */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '900', color: COLORS.slate400, marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${COLORS.overlayWhite06}`, paddingBottom: '6px' }}>
                Beneficios Incluidos
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {info.beneficios.map((ben, idx) => (
                  <li key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '13px', lineHeight: '1.5', color: COLORS.overlayWhite85 }}>
                    <span style={{ color: COLORS.successLight, fontWeight: '900', fontSize: '15px' }}>✓</span>
                    <span>{ben}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right Column - Policy & Scope */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: '900', color: COLORS.slate400, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${COLORS.overlayWhite06}`, paddingBottom: '6px' }}>
                  Detalles de la Póliza
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                  <div style={{ background: COLORS.overlayWhite03, border: `1px solid ${COLORS.overlayWhite06}`, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: COLORS.overlayWhite40, fontWeight: '700', textTransform: 'uppercase' }}>No. de Póliza</div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: COLORS.white, marginTop: '4px' }}>{info.poliza}</div>
                  </div>
                  <div style={{ background: COLORS.overlayWhite03, border: `1px solid ${COLORS.overlayWhite06}`, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: COLORS.overlayWhite40, fontWeight: '700', textTransform: 'uppercase' }}>Vigencia</div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: COLORS.white, marginTop: '4px' }}>{info.vigencia}</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '14px', fontWeight: '900', color: COLORS.slate400, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${COLORS.overlayWhite06}`, paddingBottom: '6px' }}>
                  Alcance y Cobertura
                </h4>
                <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.6', color: COLORS.overlayWhite70, background: COLORS.dangerBgTranslucent05, border: `1px solid ${COLORS.dangerBgTranslucent}`, borderRadius: '12px', padding: '14px' }}>
                  {info.alcance.includes('traslados dentro del mismo estado') ? (
                    <>
                      {info.alcance.replace('traslados dentro del mismo estado.', '')}
                      <strong style={{ color: COLORS.danger }}>traslados dentro del mismo estado.</strong>
                    </>
                  ) : info.alcance.includes('traslados de estado a estado') ? (
                    <>
                      {info.alcance.replace('traslados de estado a estado.', '')}
                      <strong style={{ color: COLORS.danger }}>traslados de estado a estado.</strong>
                    </>
                  ) : info.alcance.includes('traslados entre estados') ? (
                    <>
                      {info.alcance.replace('traslados entre estados.', '')}
                      <strong style={{ color: COLORS.danger }}>traslados entre estados.</strong>
                    </>
                  ) : (
                    info.alcance
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Coverages Table (if applicable) */}
          {info.coberturas.length > 0 && (
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '900', color: COLORS.slate400, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${COLORS.overlayWhite06}`, paddingBottom: '6px' }}>
                Montos de Cobertura
              </h4>
              <div style={{ borderRadius: '16px', border: `1px solid ${COLORS.overlayWhite08}`, overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '300px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: COLORS.overlayWhite04, borderBottom: `1px solid ${COLORS.overlayWhite08}` }}>
                      <th style={{ padding: '12px 20px', fontWeight: '800', color: COLORS.overlayWhite60 }}>Cobertura / Concepto</th>
                      <th style={{ padding: '12px 20px', fontWeight: '800', color: COLORS.overlayWhite60, textAlign: 'right' }}>Monto Máximo Amparado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {info.coberturas.map((cob, idx) => (
                      <tr key={idx} style={{ borderBottom: idx === info.coberturas.length - 1 ? 'none' : `1px solid ${COLORS.overlayWhite05}`, backgroundColor: idx % 2 === 0 ? COLORS.overlayWhite01 : 'transparent' }}>
                        <td style={{ padding: '12px 20px', fontWeight: '700', color: COLORS.white }}>{cob.cobertura}</td>
                        <td style={{ padding: '12px 20px', fontWeight: '900', color: cob.cobertura.toLowerCase().includes('deducible') ? COLORS.danger : COLORS.successLight, textAlign: 'right' }}>{cob.monto}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div style={{
          padding: '20px 30px',
          borderTop: `1px solid ${COLORS.overlayWhite08}`,
          backgroundColor: COLORS.overlaySlateLight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
          borderBottomLeftRadius: '24px',
          borderBottomRightRadius: '24px'
        }}>
          <div>
            {esPresidente ? (
              <div style={{ fontSize: '13px', color: COLORS.overlayWhite60 }}>
                Este seguro se asignará a tu cuenta de Presidente de Equipo.
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', color: COLORS.overlayWhite60, fontWeight: '600' }}>
                  Selecciona la cantidad:
                </span>
                <div style={{ display: 'flex', alignItems: 'center', background: COLORS.overlayWhite04, border: `1px solid ${COLORS.overlayWhite10}`, borderRadius: '12px', padding: '3px' }}>
                  <button
                    type="button"
                    onClick={() => setCantidadModal(prev => Math.max(0, prev - 1))}
                    style={{ width: '32px', height: '32px', borderRadius: '10px', border: 'none', background: COLORS.overlayWhite06, color: 'white', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >-</button>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength="2"
                    value={cantidadModal}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setCantidadModal(val === '' ? 0 : parseInt(val, 10));
                    }}
                    style={{ width: '60px', border: 'none', background: 'transparent', color: COLORS.white, textAlign: 'center', fontWeight: '900', fontSize: '16px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setCantidadModal(prev => prev + 1)}
                    style={{ width: '32px', height: '32px', borderRadius: '10px', border: 'none', background: COLORS.overlayWhite06, color: 'white', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >+</button>
                </div>
                <span style={{ fontSize: '12px', color: COLORS.overlayWhite40, fontWeight: '700' }}>
                  (Faltan {jugadoresRestantes} por asignar)
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setSeguroDetalle(null)}
              style={{
                background: COLORS.overlayWhite05,
                border: `1px solid ${COLORS.overlayWhite10}`,
                color: COLORS.overlayWhite70,
                padding: '10px 24px',
                borderRadius: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s'
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                if (esPresidente) {
                  const next = { ...asignacionSeguros };
                  segurosPresidente.forEach(item => {
                    next[item.id] = item.id === seguroDetalle.id ? 1 : 0;
                  });
                  setAsignacionSeguros(next);
                } else {
                  setAsignacionSeguros({ ...asignacionSeguros, [seguroDetalle.id]: cantidadModal });
                }
                setSeguroDetalle(null);
              }}
              style={{
                background: `linear-gradient(135deg, ${COLORS.brandBlueLight} 0%, ${COLORS.secondaryDark} 100%)`,
                border: 'none',
                color: COLORS.white,
                padding: '10px 28px',
                borderRadius: '12px',
                fontWeight: '900',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: `0 4px 12px ${COLORS.brandBlueLight30}`,
                transition: 'all 0.2s'
              }}
            >
              {esPresidente ? 'Seleccionar Seguro' : 'Confirmar Cantidad'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default SeguroDetallesModal;
