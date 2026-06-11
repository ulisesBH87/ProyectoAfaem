import { REQUISITOS } from './constants';
import PasoHeader from './PasoHeader';
import DocumentCard from './DocumentCard';
import DocumentPreviewModal from './DocumentPreviewModal';

/**
 * Step4Afiliacion
 * Paso 4 del wizard: Generación y carga del Formato de Afiliación.
 */
export default function Step4Afiliacion({
  documents, previews,
  detailsOpen, setDetailsOpen,
  handleFileUpload,
  descargarFormato,
  // Modal de preview
  previewDoc, setPreviewDoc,
  // Validación de pasos anteriores
  pasosAnterioresLlenos,
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

  const docAfiliacion = REQUISITOS.find(d => d.documento === 'formatoAfiliacion');

  return (
    <div>
      <PasoHeader
        titulo="Documento de Afiliación"
        descripcion="Descarga, firma y sube tu Formato de Afiliación Oficial."
      />

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
        <div style={{ maxWidth: '400px', width: '100%' }}>
          <DocumentCard
            doc={docAfiliacion}
            documents={documents}
            previews={previews}
            detailsOpen={detailsOpen}
            setDetailsOpen={setDetailsOpen}
            handleFileUpload={handleFileUpload}
            descargarFormato={descargarFormato}
            onOpenPreview={handleOpenPreview}
            disabledUpload={!pasosAnterioresLlenos}
          />
        </div>
      </div>

      {/* Modal de previsualización */}
      <DocumentPreviewModal previewDoc={previewDoc} onClose={handleClosePreview} />
    </div>
  );
}
