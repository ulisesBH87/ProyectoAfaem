import { Modal, BotonSecundario } from '../../../components/partials';

/**
 * DocumentPreviewModal
 * Modal de previsualización de documentos (zoom).
 * Soporta imágenes e iframes para PDF.
 */
export default function DocumentPreviewModal({ previewDoc, onClose }) {
  return (
    <Modal
      estaAbierto={previewDoc.open}
      titulo={previewDoc.title}
      alCerrar={onClose}
      tamanio={previewDoc.type === 'pdf' ? 'grande' : 'medio'}
      pie={<BotonSecundario etiqueta="Cerrar" alHacerClick={onClose} />}
    >
      <div style={{
        width: '100%',
        height: previewDoc.type === 'pdf' ? '100%' : 'auto',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#0f172a', borderRadius: 12, overflow: 'hidden',
      }}>
        {previewDoc.type === 'pdf' ? (
          <iframe
            src={previewDoc.url}
            style={{ width: '1800px', height: '70vh', border: 'none' }}
            title="Visor de PDF"
          />
        ) : (
          <img
            src={previewDoc.url}
            alt="Preview Grande"
            style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
          />
        )}
      </div>
    </Modal>
  );
}
