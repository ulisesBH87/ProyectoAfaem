import { C, fieldStyles, REQUISITOS, CATALOGO_ROLES, CATALOGO_LIGAS_DEFAULT } from './constants';
import PasoHeader from './PasoHeader';
import PaisSelect from './PaisSelect';
import ManualIdentityForm from './ManualIdentityForm';
import DocumentCard from './DocumentCard';
import DocumentPreviewModal from './DocumentPreviewModal';

/**
 * Step3Documentos
 * Paso 3 del wizard: datos del expediente + carga de documentos.
 */
export default function Step3Documentos({
  // Datos del expediente
  correoDoc, setCorreoDoc,
  telefonoDoc, setTelefonoDoc,
  codigoPaisDoc, setCodigoPaisDoc,
  equipo, setEquipo,
  tipoAfiliacion, asociacion,
  liga, setLiga,
  ligasCatalogo,
  // Formulario manual
  mostrarManual, setMostrarManual,
  ocrResults, handleOcrManual,
  // Documentos
  documents, previews,
  detailsOpen, setDetailsOpen,
  fotoError, fotoFallida, fotoArchivo, forzarFoto,
  handleFileUpload,
  descargarFormato,
  // Modal de preview
  previewDoc, setPreviewDoc,
}) {
  const handleOpenPreview = (doc, previewUrl, file) => {
    setPreviewDoc({
      open: true,
      url: previewUrl,
      type: file?.type === 'application/pdf' ? 'pdf' : 'image',
      title: doc.nombre,
    });
  };

  const handleClosePreview = () => setPreviewDoc(prev => ({ ...prev, open: false }));

  return (
    <div>
      <PasoHeader
        titulo="Datos y Documentos"
        descripcion="Sube el Acta o INE para extracción automática. Completa manualmente si es necesario."
      />

      {/* Datos del expediente */}
      <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 18, padding: '20px 22px', marginBottom: 22 }}>
        {/* Fila 1: Correo, Teléfono, Equipo */}
        <div className="rp-grid-3cols-equal">
          <div>
            <label style={fieldStyles.label}>Correo <span style={{ color: C.amber }}>*</span></label>
            <input
              style={{ ...fieldStyles.input, textTransform: 'uppercase' }}
              type="email" value={correoDoc} placeholder="CORREO@EXAMPLE.COM"
              onChange={e => setCorreoDoc(e.target.value.toUpperCase())}
            />
          </div>
          <div>
            <label style={fieldStyles.label}>Teléfono (10 dígitos)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <PaisSelect
                value={codigoPaisDoc}
                onChange={e => setCodigoPaisDoc(e.target.value)}
                withEmoji
              />
              <input
                style={fieldStyles.input}
                type="tel" value={telefonoDoc} placeholder="5512345678" maxLength={10}
                onChange={e => setTelefonoDoc(e.target.value.replace(/\D/g, '').slice(0, 10))}
              />
            </div>
          </div>
          <div>
            <label style={fieldStyles.label}>Nombre del Equipo <span style={{ color: C.amber }}>*</span></label>
            <input
              style={{ ...fieldStyles.input, textTransform: 'uppercase' }}
              type="text" value={equipo} placeholder="EJ: RAYADOS FC" required
              onChange={e => setEquipo(e.target.value.toUpperCase())}
            />
          </div>
        </div>

        {/* Fila 2: Afiliación, Asociación, Liga */}
        <div className="rp-grid-3cols-equal">
          <div>
            <label style={fieldStyles.label}>Cargo / Tipo de Afiliación</label>
            <select
              style={{ ...fieldStyles.select, cursor: 'not-allowed', background: 'rgba(255,255,255,0.05)' }}
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
                background: 'rgba(245,158,11,0.05)',
                borderColor: 'rgba(245,158,11,0.2)',
                color: C.amberLight,
              }}
              value={asociacion}
              disabled
            />
          </div>
          <div>
            <label style={fieldStyles.label}>Liga Destino <span style={{ color: C.amber }}>*</span></label>
            <select style={fieldStyles.select} value={liga} onChange={e => setLiga(e.target.value)} required>
              <option value="">Selecciona…</option>
              {ligasCatalogo.length > 0
                ? ligasCatalogo.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)
                : CATALOGO_LIGAS_DEFAULT.map(l => <option key={l.valor} value={l.valor}>{l.etiqueta}</option>)
              }
            </select>
          </div>
        </div>
      </div>

      {/* Toggle formulario manual */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => setMostrarManual(v => !v)}
          style={{
            padding: '9px 22px', borderRadius: 10,
            border: `1px solid rgba(245,158,11,${mostrarManual ? '0.5' : '0.2'})`,
            background: mostrarManual ? 'rgba(245,158,11,0.12)' : 'transparent',
            color: mostrarManual ? C.amberLight : C.textMid,
            fontWeight: 700, cursor: 'pointer', fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 8, transition: 'all .2s',
          }}
        >
          ⌨️ {mostrarManual ? 'Ocultar Captura Manual de Identidad' : 'Capturar Datos de OCR Manualmente'}
        </button>
      </div>

      {/* Formulario manual colapsable */}
      {mostrarManual && (
        <ManualIdentityForm ocrResults={ocrResults} onOcrManual={handleOcrManual} />
      )}

      {/* Cuadrícula de documentos */}
      <div className="rp-grid-docs">
        {REQUISITOS.map(doc => (
          <DocumentCard
            key={doc.documento}
            doc={doc}
            documents={documents}
            previews={previews}
            ocrResults={ocrResults}
            detailsOpen={detailsOpen}
            setDetailsOpen={setDetailsOpen}
            fotoError={fotoError}
            fotoFallida={fotoFallida}
            fotoArchivo={fotoArchivo}
            forzarFoto={forzarFoto}
            handleFileUpload={handleFileUpload}
            descargarFormato={descargarFormato}
            onOpenPreview={handleOpenPreview}
          />
        ))}
      </div>

      {/* Modal de previsualización */}
      <DocumentPreviewModal previewDoc={previewDoc} onClose={handleClosePreview} />
    </div>
  );
}
