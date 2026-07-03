import { Modal, BotonSecundario } from '../../../components/partials';
import { FaFilePdf } from 'react-icons/fa';
import COLORS from '../../../styles/colors';

/**
 * DocumentPreviewModal
 * Modal de previsualización de documentos (zoom).
 * Soporta imágenes e iframes para PDF con estilos responsivos.
 */
export default function DocumentPreviewModal({ previewDoc, onClose }) {
  const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

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
          isMobileDevice ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '30px 20px',
              textAlign: 'center',
              background: COLORS.slate900,
              borderRadius: '16px',
              border: `1px dashed ${COLORS.slate600}`,
              color: 'white',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              <div style={{ fontSize: '48px', color: COLORS.danger, marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaFilePdf />
              </div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: '800' }}>Vista previa no disponible</h3>
              <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: COLORS.slate300, lineHeight: '1.5' }}>
                Los navegadores móviles no permiten ver archivos PDF integrados en la pantalla. Haz clic abajo para abrirlo directamente en tu dispositivo.
              </p>
              <a
                href={previewDoc.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: COLORS.primary,
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '14px',
                  textDecoration: 'none',
                  boxShadow: `0 4px 12px ${COLORS.primaryBgTranslucent25}`,
                  transition: 'all 0.2s'
                }}
              >
                📥 Abrir PDF Completo
              </a>
            </div>
          ) : (
            <iframe
              src={`${previewDoc.url}#toolbar=0&navpanes=0`}
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: '12px' }}
              title="Visor de PDF"
            />
          )
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
