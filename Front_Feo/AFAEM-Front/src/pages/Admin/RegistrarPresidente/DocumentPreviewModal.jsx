import { Modal, BotonSecundario } from '../../../components/partials';

/**
 * DocumentPreviewModal
 * Modal de previsualización de documentos (zoom).
 * Soporta imágenes e iframes para PDF con estilos responsivos.
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
        height: previewDoc.type === 'pdf' ? '70vh' : 'auto',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
      }}>
        {previewDoc.type === 'pdf' ? (
          <iframe
            src={previewDoc.url}
            style={{ width: '100%', height: '100%', border: 'none', borderRadius: '12px' }}
            title="Visor de PDF"
          />
        ) : (
          <img
            src={previewDoc.url}
            alt="Preview Grande"
            style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '12px' }}
          />
        )}
      </div>
    </Modal>
  );
}
