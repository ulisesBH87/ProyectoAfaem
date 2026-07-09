import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../routes/paths';
import { useRegistrarPresidente } from '../../hooks/useRegistrarPresidente';
import { C, PASOS } from './RegistrarPresidente/constants';
import PageHeader from './RegistrarPresidente/PageHeader';
import StepBar from './RegistrarPresidente/StepBar';
import Step1Documentos from './RegistrarPresidente/Step1Documentos';
import Step2Cuenta from './RegistrarPresidente/Step2Cuenta';
import Step3Cuotas from './RegistrarPresidente/Step3Cuotas';
import Step4Afiliacion from './RegistrarPresidente/Step4Afiliacion';
import { FaCheckCircle } from 'react-icons/fa';
import Loader from '../../components/Loader';
import COLORS from '../../styles/colors';

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
    // Borrador
    toastVisible, cargandoBorrador,
    // Paso 1
    cuenta, setCuentaField, cuentaErrors, codigoPaisCuenta, setCodigoPaisCuenta,
    codigoPaisOpcionalCuenta, setCodigoPaisOpcionalCuenta,
    isCheckingCurp,
    isCurpDuplicated,
    // Paso 2
    numPersonas, setNumPersonas, voucher, setVoucher,
    segurosPresidente, segurosJugadores, asignacion, setAsignacion,
    cargandoSeguros, ligasCatalogo, totalAsignados, totalPagar, segurosRequeridos,
    // Paso 3
    equipo, setEquipo,
    tipoAfiliacion, asociacion, liga, setLiga,
    documents, previews, detailsOpen, setDetailsOpen,
    previewDoc, setPreviewDoc,
    nombreEquipoValido,
    nombreEquipoMensaje,
    verificandoNombre,
    // OCR
    ocrResults,
    // Foto
    fotoError, fotoFallida, fotoArchivo, forzarFoto,
    // Handlers
    handleFileUpload, handleDescargarFormato,
    // Entrenador
    esEntrenador,
    equiposSinEntrenador,
    selectedEquipoId,
    handleEquipoSelectChange
  } = useRegistrarPresidente();

  if (cargandoBorrador) {
    return <Loader text="Cargando borrador..." />;
  }

  const isPaso1Ready =
    !!documents.actaNacimiento &&
    !!documents.identificacion &&
    !!documents.fotografia;

  const esFechaPresidenteValida = (() => {
    if (!cuenta.fechaNacimiento) return true; // Si no es obligatorio, no lo validamos aquí, pero si existe:
    const val = cuenta.fechaNacimiento;
    const fechaDate = new Date(val);
    const hoy = new Date();
    if (fechaDate.getFullYear() < 1900 || fechaDate.getFullYear() > hoy.getFullYear()) return false;
    const limitDate = new Date(hoy.getFullYear() - 18, hoy.getMonth(), hoy.getDate());
    return fechaDate <= limitDate;
  })();

  const isPaso2Ready =
    !!cuenta.nombre?.trim() &&
    !!cuenta.primerApellido?.trim() &&
    !!cuenta.correo?.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cuenta.correo) &&
    !!cuenta.telefono?.trim() &&
    /^\d{10}$/.test(cuenta.telefono) &&
    !!cuenta.curp?.trim() &&
    cuenta.curp.length === 18 &&
    !isCurpDuplicated &&
    !!cuenta.contrasena &&
    cuenta.contrasena.length >= 6 &&
    cuenta.contrasena === cuenta.confirmarContrasena &&
    esFechaPresidenteValida;

  const selectedPresCount = segurosPresidente.reduce((acc, seg) => acc + Number(asignacion[seg.id] || 0), 0);
  const isPaso3Ready = esEntrenador
    ? (!!selectedEquipoId && !!liga && selectedPresCount === 1)
    : (!!equipo?.trim() && !!liga?.trim() && Number(numPersonas) > 0 && totalAsignados === segurosRequeridos && nombreEquipoValido);

  const isPaso4Ready = !!documents.formatoAfiliacion;

  const pasosAnterioresLlenos = isPaso1Ready && isPaso2Ready && isPaso3Ready;

  const stepStatus = {
    1: isPaso1Ready,
    2: isPaso2Ready,
    3: isPaso3Ready,
    4: isPaso4Ready,
  };


  return (
    <div className="rp-page-wrapper" style={{
      color: C.text,
      minHeight: '100vh', background: C.bg,
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      <style>{`
        .rp-page-wrapper {
          padding: 20px 24px;
        }
        .rp-container {
          padding: 24px 30px;
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
        .rp-grid-4cols-equal {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 16px;
        }
        .rp-grid-4cols-equal label,
        .rp-grid-3cols-equal label,
        .rp-grid-3cols label,
        .rp-grid-2cols label {
          min-height: 32px;
          display: flex;
          align-items: flex-end;
          flex-wrap: wrap;
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
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }
        .rp-document-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3) !important;
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
          .rp-grid-4cols-equal,
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
          .rp-grid-4cols-equal label,
          .rp-grid-3cols-equal label,
          .rp-grid-3cols label,
          .rp-grid-2cols label {
            min-height: auto !important;
            display: block !important;
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

        .toast-auto-save {
          position: fixed;
          top: 24px;
          right: 24px;
          background: ${COLORS.overlayWhite75};
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid ${COLORS.overlayWhite40};
          padding: 12px 20px;
          border-radius: 12px;
          box-shadow: 0 8px 32px 0 ${COLORS.glassShadowBorder};
          z-index: 9999;
          font-family: inherit;
          font-size: 14px;
          font-weight: 700;
          color: ${COLORS.slate800};
          display: flex;
          align-items: center;
          gap: 8px;
          pointer-events: none;
          opacity: 0;
          transform: translateY(-20px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .toast-auto-save.show {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      <div style={{ maxWidth: '1350px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {/* Header de página */}
        <PageHeader onBack={() => navigate(ROUTES.ADMIN.PRESIDENTES)} esEntrenador={esEntrenador} />

        {/* Contenedor principal con decoración */}
        <div className="rp-container" style={{
          background: C.surface, borderRadius: 20,
          border: `1px solid ${C.cardBorder}`,
          boxShadow: `0 24px 60px ${COLORS.overlayBlack}`,
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Línea decorativa superior */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: `linear-gradient(90deg, ${C.amberDark}, ${C.orange}, ${C.amber})`,
          }} />

          {/* Barra de progreso de pasos */}
          <StepBar paso={paso} setPaso={setPaso} stepStatus={stepStatus} />

          {/* ── Paso 1: Documentos ── */}
          {paso === 1 && (
            <Step1Documentos
              ocrResults={ocrResults}
              documents={documents}
              previews={previews}
              detailsOpen={detailsOpen}
              setDetailsOpen={setDetailsOpen}
              fotoError={fotoError}
              fotoFallida={fotoFallida}
              fotoArchivo={fotoArchivo}
              forzarFoto={forzarFoto}
              handleFileUpload={handleFileUpload}
              previewDoc={previewDoc}
              setPreviewDoc={setPreviewDoc}
            />
          )}

          {/* ── Paso 2: Cuenta ── */}
          {paso === 2 && (
            <Step2Cuenta
              cuenta={cuenta}
              setCuentaField={setCuentaField}
              cuentaErrors={cuentaErrors}
              codigoPaisCuenta={codigoPaisCuenta}
              setCodigoPaisCuenta={setCodigoPaisCuenta}
              codigoPaisOpcionalCuenta={codigoPaisOpcionalCuenta}
              setCodigoPaisOpcionalCuenta={setCodigoPaisOpcionalCuenta}
              isCheckingCurp={isCheckingCurp}
            />
          )}

          {/* ── Paso 3: Cuotas ── */}
          {paso === 3 && (
            <Step3Cuotas
              ocrResults={ocrResults}
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
              equipo={equipo}
              setEquipo={setEquipo}
              tipoAfiliacion={tipoAfiliacion}
              asociacion={asociacion}
              liga={liga}
              setLiga={setLiga}
              ligasCatalogo={ligasCatalogo}
              esEntrenador={esEntrenador}
              equiposSinEntrenador={equiposSinEntrenador}
              selectedEquipoId={selectedEquipoId}
              handleEquipoSelectChange={handleEquipoSelectChange}
              nombreEquipoValido={nombreEquipoValido}
              nombreEquipoMensaje={nombreEquipoMensaje}
              verificandoNombre={verificandoNombre}
            />
          )}

          {/* ── Paso 4: Afiliación ── */}
          {paso === 4 && (
            <Step4Afiliacion
              documents={documents}
              previews={previews}
              detailsOpen={detailsOpen}
              setDetailsOpen={setDetailsOpen}
              handleFileUpload={handleFileUpload}
              descargarFormato={handleDescargarFormato}
              previewDoc={previewDoc}
              setPreviewDoc={setPreviewDoc}
              pasosAnterioresLlenos={pasosAnterioresLlenos}
            />
          )}

          {/* ── Footer de navegación ── */}
          <div className="rp-wizard-footer">
            <button
              onClick={() => paso > 1 ? setPaso(p => p - 1) : navigate(ROUTES.ADMIN.PRESIDENTES)}
              style={{
                padding: '10px 22px', borderRadius: 10,
                border: `1px solid ${C.inputBorder}`, background: COLORS.overlayWhite03,
                color: C.textMid, fontWeight: 700, cursor: 'pointer', fontSize: 14, transition: 'all .2s',
              }}
            >
              {paso > 1 ? '← Anterior' : 'Cancelar'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: C.textDim }}>Paso {paso} de {PASOS.length}</span>
              <button
                onClick={paso === 4 ? procesarRegistro : avanzar}
                disabled={loading}
                style={{
                  padding: '11px 28px', borderRadius: 10,
                  background: loading ? COLORS.overlayWhite10 : `linear-gradient(135deg, ${C.amberDark}, ${C.orange})`,
                  border: 'none',
                  color: loading ? C.textDim : 'white',
                  fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: 14, display: 'flex', alignItems: 'center', gap: 9,
                  boxShadow: loading ? 'none' : `0 6px 20px ${COLORS.warningDarkTranslucent35}`,
                  transition: 'all .2s',
                }}
              >
                {loading ? '⏳ Procesando…' : paso === 4 ? '✓ Finalizar Registro' : 'Continuar →'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notificación de autoguardado */}
      <div className={`toast-auto-save ${toastVisible ? 'show' : ''}`}>
        <FaCheckCircle style={{ color: COLORS.success, fontSize: '16px' }} />
        <span>Borrador guardado</span>
      </div>
    </div>
  );
}
