import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { C, fieldStyles, CATALOGO_ROLES, CATALOGO_LIGAS_DEFAULT } from './constants';
import PasoHeader from './PasoHeader';
import SeguroRow from './SeguroRow';
import VoucherUpload from './VoucherUpload';
import COLORS from '../../../styles/colors';

const normalizarNombreSeguro = (nombre) => {
  if (!nombre) return '';
  return nombre.toUpperCase().replace(/[\u0022\u0027]/g, '').trim();
};

const DETALLES_SEGUROS = {
  'TIPO A': {
    nombre: 'TIPO "A"',
    precio: 240,
    poliza: '2922500000281',
    vigencia: 'ENERO 2026 – DICIEMBRE 2026',
    alcance: 'Se ampara un juego por semana (máximo 2), traslados directos e ininterrumpidos de la casa al partido de fútbol (supervisado y autorizado para la realización del evento en ese día de la semana) y viceversa. Ampara exclusivamente traslados dentro del mismo estado.',
    beneficios: [
      'Participación en Torneos Estatales',
      'Participación en Torneos Regionales',
      'Participación en Torneos Nacionales',
      'Participación en Campeonatos Nacionales',
      'Participación en Torneos Federados',
      'Participación en Capacitaciones',
      'Descuentos en Material Deportivo',
      'Expediente deportivo Oficial en la FMF',
      'Activaciones y Experiencias con Patrocinadores',
      'Descuentos en la Compra de Balones Oficiales del Sector Amateur',
      'Seguro de Gastos Médicos por Accidente'
    ],
    coberturas: [
      { cobertura: 'Indemnización por fallecimiento accidental', monto: '$50,000.00' },
      { cobertura: 'Reembolso de Gastos Médicos por Accidente', monto: '$25,000.00' },
      { cobertura: 'Tope de Rodilla', monto: '$25,000.00' },
      { cobertura: 'Deducible', monto: '$1,500.00' }
    ]
  },
  'TIPO B': {
    nombre: 'TIPO "B"',
    precio: 350,
    poliza: '2922500000283',
    vigencia: 'ENERO 2026 – DICIEMBRE 2026',
    alcance: 'Se ampara un juego por semana (máximo 2), traslados directos e ininterrumpidos de la casa al partido de fútbol (supervisado y autorizado para la realización del evento en ese día de la semana) y viceversa. Ampara exclusivamente traslados dentro del mismo estado.',
    beneficios: [
      'Participación en Torneos Estatales',
      'Participación en Torneos Regionales',
      'Participación en Torneos Nacionales',
      'Participación en Campeonatos Nacionales',
      'Participación en Torneos Federados',
      'Participación en Capacitaciones',
      'Descuentos en Material Deportivo',
      'Expediente deportivo Oficial en la FMF',
      'Activaciones y Experiencias con Patrocinadores',
      'Descuentos en la Compra de Balones Oficiales del Sector Amateur',
      'Seguro de Gastos Médicos por Accidente'
    ],
    coberturas: [
      { cobertura: 'Indemnización por fallecimiento accidental', monto: '$100,000.00' },
      { cobertura: 'Reembolso de Gastos Médicos por Accidente', monto: '$50,000.00' },
      { cobertura: 'Tope de Rodilla', monto: '$30,000.00' },
      { cobertura: 'Deducible', monto: '$1,500.00' }
    ]
  },
  'TIPO F': {
    nombre: 'TIPO "F"',
    precio: 670,
    poliza: '2922500000282',
    vigencia: 'ENERO 2026 – DICIEMBRE 2026',
    alcance: 'Se ampara los entrenamientos, partidos y torneos de futbol organizados y supervisados por la FEMEXFUT, adicionalmente se amparan los traslados desde el domicilio al campo de juego y viceversa. Se amparan los traslados entre estados.',
    beneficios: [
      'Participación en Torneos Estatales',
      'Participación en Torneos Regionales',
      'Participación en Torneos Nacionales',
      'Participación en Campeonatos Nacionales',
      'Participación en Torneos Federados',
      'Participación en Capacitaciones',
      'Descuentos en Material Deportivo',
      'Expediente deportivo Oficial en la FMF',
      'Activaciones y Experiencias con Patrocinadores',
      'Descuentos en la Compra de Balones Oficiales del Sector Amateur',
      'Seguro de Gastos Médicos por Accidente'
    ],
    coberturas: [
      { cobertura: 'Indemnización por fallecimiento accidental', monto: '$200,000.00' },
      { cobertura: 'Reembolso de Gastos Médicos por Accidente', monto: '$100,000.00' },
      { cobertura: 'Tope de Rodilla', monto: '$30,000.00' },
      { cobertura: 'Deducible', monto: '$1,500.00' }
    ]
  },
  'TIPO H': {
    nombre: 'TIPO "H"',
    precio: 475,
    poliza: '2922500000286',
    vigencia: 'ENERO 2026 – DICIEMBRE 2026',
    alcance: 'Se ampara los entrenamientos, partidos y torneos de futbol organizados y supervisados por la FEMEXFUT, adicionalmente se amparan los traslados desde el domicilio al campo de juego y viceversa. Se amparan los traslados entre estados.',
    beneficios: [
      'Participación en Torneos Estatales',
      'Participación en Torneos Regionales',
      'Participación en Torneos Nacionales',
      'Participación en Campeonatos Nacionales',
      'Participación en Torneos Federados',
      'Participación en Capacitaciones',
      'Descuentos en Material Deportivo',
      'Expediente deportivo Oficial en la FMF',
      'Activaciones y Experiencias con Patrocinadores',
      'Descuentos en la Compra de Balones Oficiales del Sector Amateur',
      'Seguro de Gastos Médicos por Accidente'
    ],
    coberturas: [
      { cobertura: 'Indemnización por fallecimiento accidental', monto: '$100,000.00' },
      { cobertura: 'Reembolso de Gastos Médicos por Accidente', monto: '$50,000.00' },
      { cobertura: 'Tope de Rodilla', monto: '$30,000.00' },
      { cobertura: 'Deducible', monto: '$1,500.00' }
    ]
  },
  'TIPO G': {
    nombre: 'TIPO "G"',
    precio: 350,
    poliza: '2922500000280',
    vigencia: 'ENERO 2026 – DICIEMBRE 2026',
    alcance: 'Se amparan los traslados de su casa a las ligas, asociaciones y viceversa, y traslados a otras ligas, se cubre dentro de las instalaciones de sus ligas y asociaciones. Se amparan traslados de estado a estado.',
    beneficios: [
      'Participación en Torneos Estatales',
      'Participación en Torneos Regionales',
      'Participación en Torneos Nacionales',
      'Participación en Campeonatos Nacionales',
      'Participación en Torneos Federados',
      'Participación en Capacitaciones',
      'Descuentos en Material Deportivo',
      'Expediente deportivo Oficial en la FMF',
      'Activaciones y Experiencias con Patrocinadores',
      'Descuentos en la Compra de Balones Oficiales del Sector Amateur',
      'Seguro de Gastos Médicos por Accidente'
    ],
    coberturas: [
      { cobertura: 'Indemnización por fallecimiento accidental', monto: '$200,000.00' },
      { cobertura: 'Reembolso de Gastos Médicos por Accidente', monto: '$100,000.00' },
      { cobertura: 'Tope de Rodilla', monto: '$25,000.00' },
      { cobertura: 'Deducible', monto: '$1,500.00' }
    ]
  },
  'BASICA': {
    nombre: 'TIPO "BASICA"',
    precio: 155,
    poliza: 'N/A',
    vigencia: 'ENERO 2026 – DICIEMBRE 2026',
    alcance: 'Esta afiliación no incluye póliza de seguro de gastos médicos por accidente. Solo cubre derechos de participación básica.',
    beneficios: [
      'Participación en Torneos Estatales (Es necesario Afiliación con cobertura de Seguro)',
      'Participación en Torneos Regionales (Es necesario Afiliación con cobertura de Seguro)',
      'Participación en Torneos Nacionales (Es necesario Afiliación con cobertura de Seguro)',
      'Participación en Campeonatos Nacionales (Es necesario Afiliación con cobertura de Seguro)',
      'Participación en Torneos Federados (Es necesario Afiliación con cobertura de Seguro)',
      'Participación en Capacitaciones',
      'Descuentos en Material Deportivo',
      'Expediente deportivo Oficial en la FMF',
      'Activaciones y Experiencias con Patrocinadores',
      'Descuentos en la Compra de Balones Oficiales del Sector Amateur'
    ],
    coberturas: []
  },
  'SIN SEGURO': {
    nombre: 'SIN SEGURO (CON RESPONSABILIDAD DE LIGA)',
    precio: 0,
    poliza: 'N/A',
    vigencia: 'N/A',
    alcance: 'Esta opción deslinda a la asociación de cualquier cobertura médica. La liga asume la total responsabilidad médica por accidentes de sus afiliados.',
    beneficios: [
      'Participación en Torneos Locales autorizados por la Liga',
      'Expediente deportivo en la base de datos de la Liga'
    ],
    coberturas: []
  }
};

/**
 * Step3Cuotas
 * Paso 3 del wizard: asginación de seguros y resumen de pago.
 */
export default function Step3Cuotas({
  ocrResults,
  numPersonas, setNumPersonas,
  segurosJugadores, segurosPresidente,
  asignacion, setAsignacion,
  cargandoSeguros,
  totalAsignados, segurosRequeridos, totalPagar,
  voucher, setVoucher,
  equipo, setEquipo, tipoAfiliacion, asociacion, liga, setLiga, ligasCatalogo,
  esEntrenador, equiposSinEntrenador = [], selectedEquipoId, handleEquipoSelectChange,
  nombreEquipoValido, nombreEquipoMensaje, verificandoNombre
}) {
  const [seguroDetalle, setSeguroDetalle] = useState(null);
  const [cantidadModal, setCantidadModal] = useState(0);

  useEffect(() => {
    if (seguroDetalle) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [seguroDetalle]);

  const abrirModalDetalle = (seguro) => {
    setSeguroDetalle(seguro);
    const normalizedName = normalizarNombreSeguro(seguro.nombre);
    const esPres = ['TIPO G', 'SIN SEGURO'].includes(normalizedName);
    if (!esPres) {
      setCantidadModal(Number(asignacion[seguro.id] || 0));
    }
  };

  const handleSelectPres = (seg, lista) => {
    setAsignacion(prev => {
      const next = { ...prev };
      lista.forEach(item => { next[item.id] = item.id === seg.id ? 1 : 0; });
      return next;
    });
  };

  const handleChangeNumero = (seg, val) => {
    const rawVal = val.replace(/\D/g, '').slice(0, 2);
    const num = rawVal === '' ? '' : parseInt(rawVal, 10);
    setAsignacion(prev => ({ ...prev, [seg.id]: num }));
  };

  const hasInsurancesSelected = esEntrenador
    ? segurosPresidente.some(seg => Number(asignacion[seg.id] || 0) > 0)
    : totalAsignados > 0;

  return (
    <div>
      <PasoHeader
        titulo="Cuotas y Seguros"
        descripcion={esEntrenador ? "Asigna el seguro para el entrenador y selecciona su equipo." : "Configura la plantilla inicial del equipo y asigna sus seguros."}
      />

      {/* Datos del expediente */}
      <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 18, padding: '20px 22px', marginBottom: 22 }}>
        <h3 style={{ marginTop: 0, marginBottom: 16, color: C.text, fontSize: 16 }}>Datos del Expediente</h3>
        
        {/* Fila única: Nombre del equipo, Cargo, Asociación y Liga Destino */}
        <div className="rp-grid-4cols-equal">
          <div>
            <label style={fieldStyles.label}>Nombre del Equipo <span style={{ color: C.amber }}>*</span></label>
            {esEntrenador ? (
              <select
                style={{ ...fieldStyles.select, background: C.inputBg, color: C.text }}
                value={selectedEquipoId || ''}
                onChange={handleEquipoSelectChange}
                required
              >
                <option value="">Selecciona un equipo sin entrenador...</option>
                {equiposSinEntrenador.map(eq => (
                  <option key={eq.EquipoId} value={eq.EquipoId}>
                    {eq.NombreEquipo} ({eq.NombreLiga})
                  </option>
                ))}
              </select>
            ) : (
              <input
                style={{ ...fieldStyles.input, textTransform: 'uppercase' }}
                type="text" value={equipo} placeholder="EJ: RAYADOS FC" required
                onChange={e => setEquipo(e.target.value.toUpperCase())}
              />
            )}
            {nombreEquipoMensaje && (
              <span style={{
                fontSize: '11px',
                color: nombreEquipoValido ? '#2ecc71' : '#e74c3c',
                marginTop: '4px',
                display: 'block',
                fontWeight: 'bold'
              }}>
                {nombreEquipoMensaje}
              </span>
            )}
          </div>
          <div>
            <label style={fieldStyles.label}>Cargo / Tipo de Afiliación</label>
            <select
              style={{ ...fieldStyles.select, cursor: 'not-allowed', background: C.inputBg, color: C.text }}
              value={tipoAfiliacion}
              disabled
            >
              <option value="">Selecciona…</option>
              {CATALOGO_ROLES.map(r => <option key={r.valor} value={r.valor}>{r.etiqueta}</option>)}
            </select>
          </div>
          <div>
            <label style={fieldStyles.label}>Asociación</label>
            <input
              style={{
                ...fieldStyles.input, cursor: 'not-allowed',
                background: COLORS.warningBgTranslucent05,
                borderColor: COLORS.warningBgTranslucent20,
                color: C.amberLight,
              }}
              value={asociacion}
              disabled
            />
          </div>
          <div>
            <label style={fieldStyles.label}>Liga Destino <span style={{ color: C.amber }}>*</span></label>
            <select
              style={{
                ...fieldStyles.select,
                cursor: esEntrenador ? 'not-allowed' : 'default',
                background: C.inputBg,
                color: C.text
              }}
              value={liga}
              onChange={e => setLiga(e.target.value)}
              required
              disabled={esEntrenador}
            >
              <option value="">Selecciona…</option>
              {ligasCatalogo.length > 0
                ? ligasCatalogo.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)
                : CATALOGO_LIGAS_DEFAULT.map(l => <option key={l.valor} value={l.valor}>{l.etiqueta}</option>)
              }
            </select>
          </div>
        </div>
      </div>

      <div className="rp-grid-2to1-cuotas">
        {/* Panel de seguros */}
        <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 18, padding: '22px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 4, height: 18, background: `linear-gradient(180deg, ${C.amber}, ${C.orange})`, borderRadius: 4 }} />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'white' }}>
              {esEntrenador ? 'Seguro del Entrenador' : 'Plantilla y Seguros'}
            </h3>
          </div>

          {/* Número de jugadores */}
          {!esEntrenador && (
            <div style={{
              background: COLORS.warningBgTranslucent04, border: `1px solid ${COLORS.warningBgTranslucent12}`,
              borderRadius: 14, padding: '16px 18px', marginBottom: 22,
              display: 'flex', alignItems: 'center', gap: 18,
            }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.textMid, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ¿Cuántos jugadores inicialmente?
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10 }}>
                  <input
                     type="text" inputMode="numeric" pattern="[0-9]*" placeholder="0" value={numPersonas}
                    onChange={e => {
                      const rawVal = e.target.value.replace(/\D/g, '').slice(0, 2);
                      setNumPersonas(rawVal === '' ? '' : parseInt(rawVal, 10));
                    }}
                    style={{
                      width: 100, padding: '9px 14px', borderRadius: 10,
                      background: C.inputBg, border: `1px solid ${C.inputBorder}`,
                      color: C.text, textAlign: 'center', fontSize: 18, fontWeight: 700, outline: 'none',
                    }}
                  />
                  <div style={{ fontSize: 13, color: C.textDim }}>
                    Slots requeridos: <strong style={{ color: C.amberLight }}>{segurosRequeridos} seguros</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Grid de seguros por categoría */}
          <div className={esEntrenador ? "" : "rp-grid-1to1"}>
            {[['Seguros Jugadores', segurosJugadores, false], ['Seguros Presidente', segurosPresidente, true]]
              .filter(([,, isPres]) => !esEntrenador || isPres)
              .map(([titulo, lista, isPres]) => (
                <div key={titulo} style={{ width: '100%' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.amber, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    {esEntrenador ? 'Selecciona el Seguro del Entrenador' : titulo}
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
                        onVerDetalles={abrirModalDetalle}
                      />
                    ))}
                  </div>
                </div>
              ))}
          </div>

          {/* Resumen de asignación */}
          {!esEntrenador && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: COLORS.overlayWhite02, padding: '12px 16px',
              borderRadius: 10, border: `1px solid ${C.cardBorder}`, marginTop: 18,
            }}>
              <span style={{ fontSize: 13, color: C.textMid }}>Seguros asignados: {totalAsignados}/{segurosRequeridos}</span>
              <span style={{ fontWeight: 800, fontSize: 13, color: Number(numPersonas) > 0 && totalAsignados === segurosRequeridos ? C.green : C.rose }}>
                {Number(numPersonas) > 0 && totalAsignados === segurosRequeridos ? '✓ Completo' : totalAsignados > segurosRequeridos ? '● Excedido' : '● Pendiente'}
              </span>
            </div>
          )}
        </div>

        {/* Voucher y total */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <VoucherUpload voucher={voucher} onFileChange={setVoucher} hasInsurancesSelected={hasInsurancesSelected} />

          <div style={{ background: COLORS.warningBgTranslucent07, border: `1px solid ${COLORS.warningBgTranslucent18}`, borderRadius: 18, padding: '18px 20px', textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Monto Estimado</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: C.amber, marginTop: 6 }}>${totalPagar.toLocaleString()}</div>
          </div>

          {voucher && ocrResults && (
            <div style={{
              background: ocrResults.voucherMonto !== undefined
                ? (Math.abs((ocrResults.voucherMonto || 0) - totalPagar) < 0.01
                  ? COLORS.greenBgTranslucent07
                  : COLORS.warningBgTranslucent07)
                : COLORS.overlayWhite04,
              border: `1px solid ${ocrResults.voucherMonto !== undefined
                ? (Math.abs((ocrResults.voucherMonto || 0) - totalPagar) < 0.01
                  ? COLORS.greenBgTranslucent18
                  : COLORS.warningBgTranslucent18)
                : COLORS.overlayWhite10}`,
              borderRadius: 18,
              padding: '14px 18px',
              fontSize: 13,
              color: 'white',
              display: 'flex',
              flexDirection: 'column',
              gap: 6
            }}>
              <div style={{ fontWeight: 800, fontSize: 11, textTransform: 'uppercase', color: C.textMid, textAlign: 'left' }}>
                Validación de Comprobante
              </div>
              {ocrResults.voucherMonto !== undefined ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span>Monto detectado:</span>
                    <strong style={{ color: Math.abs(ocrResults.voucherMonto - totalPagar) < 0.01 ? COLORS.successLight : C.amberLight }}>
                      ${ocrResults.voucherMonto.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </div>
                  {Math.abs(ocrResults.voucherMonto - totalPagar) < 0.01 ? (
                    <div style={{ color: COLORS.successLight, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, textAlign: 'left' }}>
                      <span>✓</span> El monto del comprobante coincide con el total estimado.
                    </div>
                  ) : (
                    <div style={{ color: C.amberLight, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, textAlign: 'left', lineHeight: '1.4' }}>
                      <span>⚠️ Advertencia:</span> El comprobante subido parece ser por un monto distinto al estimado (${totalPagar.toLocaleString()}). Verifica el archivo.
                    </div>
                  )}
                </>
              ) : (
                <div style={{ color: C.textDim, fontSize: 11, fontStyle: 'italic', textAlign: 'left' }}>
                  Procesando comprobante o no se pudo detectar el monto automáticamente.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE DETALLE DE SEGUROS */}
      {seguroDetalle && (() => {
        const segNombreNormalizado = normalizarNombreSeguro(seguroDetalle.nombre);
        const info = DETALLES_SEGUROS[segNombreNormalizado] || {
          nombre: seguroDetalle.nombre,
          precio: seguroDetalle.precio,
          poliza: 'N/A',
          vigencia: 'N/A',
          alcance: seguroDetalle.descripcion || 'Información general de cobertura y beneficios.',
          beneficios: [seguroDetalle.descripcion || 'Sin descripción adicional.'],
          coberturas: []
        };
        const esPresidente = ['TIPO G', 'SIN SEGURO'].includes(segNombreNormalizado);
        const jugadoresRestantes = Math.max(0, segurosRequeridos - totalAsignados);

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
              color: 'white'
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
                {info.coberturas && info.coberturas.length > 0 && (
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
                        setAsignacion(prev => {
                          const next = { ...prev };
                          segurosPresidente.forEach(item => {
                            next[item.id] = item.id === seguroDetalle.id ? 1 : 0;
                          });
                          return next;
                        });
                      } else {
                        setAsignacion(prev => ({ ...prev, [seguroDetalle.id]: cantidadModal }));
                      }
                      setSeguroDetalle(null);
                    }}
                    style={{
                      background: `linear-gradient(135deg, ${COLORS.blue} 0%, ${COLORS.secondaryDark} 100%)`,
                      border: 'none',
                      color: COLORS.white,
                      padding: '10px 28px',
                      borderRadius: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: 'all 0.2s'
                    }}
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}
    </div>
  );
}
