import { C, fieldStyles } from './constants';
import PasoHeader from './PasoHeader';
import SeguroRow from './SeguroRow';
import VoucherUpload from './VoucherUpload';

/**
 * Step2Cuotas
 * Paso 2 del wizard: configuración de plantilla y seguros.
 */
export default function Step2Cuotas({
  numPersonas, setNumPersonas,
  segurosJugadores, segurosPresidente,
  asignacion, setAsignacion,
  cargandoSeguros,
  totalAsignados, segurosRequeridos, totalPagar,
  voucher, setVoucher,
}) {
  const handleSelectPres = (seg, lista) => {
    setAsignacion(prev => {
      const next = { ...prev };
      lista.forEach(item => { next[item.id] = item.id === seg.id ? 1 : 0; });
      return next;
    });
  };

  const handleChangeNumero = (seg, val) => {
    const num = val === '' ? '' : Math.max(0, parseInt(val) || 0);
    setAsignacion(prev => ({ ...prev, [seg.id]: num }));
  };

  return (
    <div>
      <PasoHeader
        titulo="Cuotas y Seguros"
        descripcion="Configura la plantilla inicial del equipo y asigna sus seguros."
      />

      <div className="rp-grid-2to1-cuotas">
        {/* Panel de seguros */}
        <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 18, padding: '22px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 4, height: 18, background: `linear-gradient(180deg, ${C.amber}, ${C.orange})`, borderRadius: 4 }} />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'white' }}>Plantilla y Seguros</h3>
          </div>

          {/* Número de jugadores */}
          <div style={{
            background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.12)',
            borderRadius: 14, padding: '16px 18px', marginBottom: 22,
            display: 'flex', alignItems: 'center', gap: 18,
          }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.textMid, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ¿Cuántos jugadores inicialmente?
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10 }}>
                <input
                  type="number" placeholder="0" min="0" value={numPersonas}
                  onChange={e => setNumPersonas(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                  style={{
                    width: 100, padding: '9px 14px', borderRadius: 10,
                    background: C.inputBg, border: `1px solid ${C.inputBorder}`,
                    color: 'white', textAlign: 'center', fontSize: 18, fontWeight: 700, outline: 'none',
                  }}
                />
                <div style={{ fontSize: 13, color: C.textDim }}>
                  Slots requeridos: <strong style={{ color: C.amberLight }}>{segurosRequeridos} seguros</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Grid de seguros por categoría */}
          <div className="rp-grid-1to1">
            {[['Seguros Jugadores', segurosJugadores, false], ['Seguros Presidente', segurosPresidente, true]].map(([titulo, lista, isPres]) => (
              <div key={titulo}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.amber, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  {titulo}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {cargandoSeguros ? (
                    <div style={{ fontSize: 12, color: C.textDim, padding: 10 }}>Cargando…</div>
                  ) : lista.length === 0 ? (
                    <div style={{ fontSize: 12, color: C.textDim, padding: 10 }}>Sin seguros en esta categoría</div>
                  ) : lista.map(seg => (
                    <SeguroRow
                      key={seg.id}
                      seg={seg}
                      isPres={isPres}
                      isChecked={Number(asignacion[seg.id] || 0) === 1}
                      asignacion={asignacion}
                      onSelectPres={() => handleSelectPres(seg, lista)}
                      onChangeNumero={e => handleChangeNumero(seg, e.target.value)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Resumen de asignación */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'rgba(255,255,255,0.02)', padding: '12px 16px',
            borderRadius: 10, border: `1px solid ${C.cardBorder}`, marginTop: 18,
          }}>
            <span style={{ fontSize: 13, color: C.textMid }}>Seguros asignados: {totalAsignados}/{segurosRequeridos}</span>
            <span style={{ fontWeight: 800, fontSize: 13, color: Number(numPersonas) > 0 && totalAsignados === segurosRequeridos ? C.green : C.rose }}>
              {Number(numPersonas) > 0 && totalAsignados === segurosRequeridos ? '✓ Completo' : totalAsignados > segurosRequeridos ? '● Excedido' : '● Pendiente'}
            </span>
          </div>
        </div>

        {/* Voucher y total */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <VoucherUpload voucher={voucher} onFileChange={setVoucher} />

          <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: 18, padding: '18px 20px', textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Monto Estimado</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: C.amber, marginTop: 6 }}>${totalPagar.toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
