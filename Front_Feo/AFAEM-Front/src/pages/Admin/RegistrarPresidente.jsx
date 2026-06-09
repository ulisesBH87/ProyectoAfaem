import { useNavigate } from 'react-router-dom';
import { useRegistrarPresidente } from '../../hooks/useRegistrarPresidente';
import { C, PASOS } from './RegistrarPresidente/constants';
import PageHeader from './RegistrarPresidente/PageHeader';
import StepBar from './RegistrarPresidente/StepBar';
import Step1Cuenta from './RegistrarPresidente/Step1Cuenta';
import Step2Cuotas from './RegistrarPresidente/Step2Cuotas';
import Step3Documentos from './RegistrarPresidente/Step3Documentos';

/**
 * RegistrarPresidente
 * Orquestador del wizard de registro de presidente.
 * Toda la lógica de negocio, estado y efectos están en useRegistrarPresidente.
 * Este componente solo renderiza estructura y delega a los sub-componentes de paso.
 */
export default function RegistrarPresidente() {
  const navigate = useNavigate();
  const {
    // Wizard
    paso, setPaso, avanzar, procesarRegistro, loading,
    // Paso 1
    cuenta, setCuentaField, cuentaErrors, codigoPaisCuenta, setCodigoPaisCuenta,
    // Paso 2
    numPersonas, setNumPersonas, voucher, setVoucher,
    seguros, segurosPresidente, segurosJugadores, asignacion, setAsignacion,
    cargandoSeguros, ligasCatalogo, totalAsignados, totalPagar, segurosRequeridos,
    // Paso 3
    correoDoc, setCorreoDoc, telefonoDoc, setTelefonoDoc,
    codigoPaisDoc, setCodigoPaisDoc, equipo, setEquipo,
    tipoAfiliacion, asociacion, liga, setLiga,
    documents, previews, detailsOpen, setDetailsOpen,
    mostrarManual, setMostrarManual,
    previewDoc, setPreviewDoc,
    // OCR
    ocrResults, handleOcrManual,
    // Foto
    fotoError, fotoFallida, fotoArchivo, forzarFoto,
    // Handlers
    handleFileUpload, handleDescargarFormato,
  } = useRegistrarPresidente();

  return (
    <div className="rp-page-wrapper" style={{
      color: C.text,
      minHeight: '100vh', background: C.bg,
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      <style>{`
        .rp-page-wrapper {
          padding: 28px 36px;
        }
        .rp-container {
          padding: 32px 36px;
        }
        .rp-grid-3cols {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }
        .rp-grid-3cols-equal {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }
        .rp-grid-2cols {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }
        .rp-grid-2to1 {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }
        .rp-grid-2to1-cuotas {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
          align-items: start;
        }
        .rp-grid-1to1 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }
        .rp-grid-docs {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 18px;
        }
        .rp-step-bar-line {
          position: relative;
          flex: 1;
          height: 2px;
          max-width: 100px;
          margin: 0 4px;
          margin-bottom: 20px;
        }
        .rp-wizard-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid ${C.cardBorder};
        }

        @media (max-width: 768px) {
          .rp-page-wrapper {
            padding: 16px 10px !important;
          }
          .rp-container {
            padding: 24px 16px !important;
          }
          .rp-grid-3cols,
          .rp-grid-3cols-equal,
          .rp-grid-2cols,
          .rp-grid-2to1,
          .rp-grid-2to1-cuotas,
          .rp-grid-1to1,
          .rp-grid-docs {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          .rp-step-bar-line {
            max-width: 40px !important;
          }
          .rp-wizard-footer {
            flex-direction: column-reverse;
            gap: 18px;
            align-items: stretch !important;
          }
          .rp-wizard-footer button {
            width: 100%;
            text-align: center;
            justify-content: center;
          }
          .rp-wizard-footer div {
            justify-content: space-between;
            width: 100%;
          }
        }
      `}</style>
      {/* Header de página */}
      <PageHeader onBack={() => navigate('/admin/presidentes')} />

      {/* Contenedor principal con decoración */}
      <div className="rp-container" style={{
        background: C.surface, borderRadius: 20,
        border: `1px solid ${C.cardBorder}`,
        boxShadow: '0 24px 60px rgba(0,0,0,.5)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Línea decorativa superior */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${C.amberDark}, ${C.orange}, ${C.amber})`,
        }} />

        {/* Barra de progreso de pasos */}
        <StepBar paso={paso} />

        {/* ── Paso 1: Cuenta ── */}
        {paso === 1 && (
          <Step1Cuenta
            cuenta={cuenta}
            setCuentaField={setCuentaField}
            cuentaErrors={cuentaErrors}
            codigoPaisCuenta={codigoPaisCuenta}
            setCodigoPaisCuenta={setCodigoPaisCuenta}
          />
        )}

        {/* ── Paso 2: Cuotas ── */}
        {paso === 2 && (
          <Step2Cuotas
            numPersonas={numPersonas}
            setNumPersonas={setNumPersonas}
            segurosJugadores={segurosJugadores}
            segurosPresidente={segurosPresidente}
            asignacion={asignacion}
            setAsignacion={setAsignacion}
            cargandoSeguros={cargandoSeguros}
            totalAsignados={totalAsignados}
            segurosRequeridos={segurosRequeridos}
            totalPagar={totalPagar}
            voucher={voucher}
            setVoucher={setVoucher}
          />
        )}

        {/* ── Paso 3: Documentos ── */}
        {paso === 3 && (
          <Step3Documentos
            correoDoc={correoDoc}
            setCorreoDoc={setCorreoDoc}
            telefonoDoc={telefonoDoc}
            setTelefonoDoc={setTelefonoDoc}
            codigoPaisDoc={codigoPaisDoc}
            setCodigoPaisDoc={setCodigoPaisDoc}
            equipo={equipo}
            setEquipo={setEquipo}
            tipoAfiliacion={tipoAfiliacion}
            asociacion={asociacion}
            liga={liga}
            setLiga={setLiga}
            ligasCatalogo={ligasCatalogo}
            mostrarManual={mostrarManual}
            setMostrarManual={setMostrarManual}
            ocrResults={ocrResults}
            handleOcrManual={handleOcrManual}
            documents={documents}
            previews={previews}
            detailsOpen={detailsOpen}
            setDetailsOpen={setDetailsOpen}
            fotoError={fotoError}
            fotoFallida={fotoFallida}
            fotoArchivo={fotoArchivo}
            forzarFoto={forzarFoto}
            handleFileUpload={handleFileUpload}
            descargarFormato={handleDescargarFormato}
            previewDoc={previewDoc}
            setPreviewDoc={setPreviewDoc}
          />
        )}

        {/* ── Footer de navegación ── */}
        <div className="rp-wizard-footer">
          <button
            onClick={() => paso > 1 ? setPaso(p => p - 1) : navigate('/admin/presidentes')}
            style={{
              padding: '10px 22px', borderRadius: 10,
              border: `1px solid ${C.inputBorder}`, background: 'rgba(255,255,255,0.03)',
              color: C.textMid, fontWeight: 700, cursor: 'pointer', fontSize: 14, transition: 'all .2s',
            }}
          >
            {paso > 1 ? '← Anterior' : 'Cancelar'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: C.textDim }}>Paso {paso} de {PASOS.length}</span>
            <button
              onClick={paso === 3 ? procesarRegistro : avanzar}
              disabled={loading}
              style={{
                padding: '11px 28px', borderRadius: 10,
                background: loading ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg, ${C.amberDark}, ${C.orange})`,
                border: 'none',
                color: loading ? C.textDim : 'white',
                fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 14, display: 'flex', alignItems: 'center', gap: 9,
                boxShadow: loading ? 'none' : `0 6px 20px rgba(217,119,6,.35)`,
                transition: 'all .2s',
              }}
            >
              {loading ? '⏳ Procesando…' : paso === 3 ? '✓ Finalizar Registro' : 'Continuar →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
