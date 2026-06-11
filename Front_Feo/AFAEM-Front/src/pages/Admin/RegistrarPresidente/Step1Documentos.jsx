import { C, REQUISITOS } from './constants';
import PasoHeader from './PasoHeader';

import DocumentCard from './DocumentCard';
import DocumentPreviewModal from './DocumentPreviewModal';

/**
 * Step1Documentos
 * Paso 1 del wizard: Carga de documentos personales.
 */
export default function Step1Documentos({
  // Documentos
  documents, previews,
  ocrResults,
  detailsOpen, setDetailsOpen,
  fotoError, fotoFallida, fotoArchivo, forzarFoto,
  handleFileUpload,
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
        titulo="Documentos Personales"
        descripcion="Sube el Acta, Identificación oficial y Fotografía."
      />

      {/* Cuadrícula de documentos personales */}
      <div className="rp-grid-docs">
        {REQUISITOS.filter(d => d.documento !== 'formatoAfiliacion').map(doc => {
          return (
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
              onOpenPreview={handleOpenPreview}
              disabledUpload={false}
            />
          );
        })}
      </div>

      {/* Modal de previsualización */}
      <DocumentPreviewModal previewDoc={previewDoc} onClose={handleClosePreview} />
    </div>
  );
}
