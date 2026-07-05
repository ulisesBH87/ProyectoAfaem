import React, { useState, useEffect } from 'react';
import { FaUpload, FaSearchPlus, FaSyncAlt, FaTrash, FaFilePdf, FaCheckCircle } from 'react-icons/fa';
import { C } from './constants';
import COLORS from '../../../styles/colors';
import { Modal, BotonSecundario } from '../../../components/partials';
import Swal from 'sweetalert2';

/**
 * VoucherUpload
 * Zona de arrastrar/soltar para el comprobante de pago (opcional)
 * Rediseñada para coincidir con la estética de las document cards de RegistroJugadores.
 */
export default function VoucherUpload({ voucher, onFileChange, hasInsurancesSelected }) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!voucher) {
      setPreview(null);
      return;
    }
    let active = true;
    let objectUrl = null;

    if (voucher.type?.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (active) setPreview(reader.result);
      };
      reader.readAsDataURL(voucher);
    } else if (voucher.type === 'application/pdf') {
      objectUrl = URL.createObjectURL(voucher);
      setPreview(objectUrl);
    }

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [voucher]);

  const handleFileChange = (file) => {
    if (!file) return;
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(file.type) && !['.pdf', '.jpg', '.jpeg', '.png'].includes(ext)) {
      Swal.fire({
        title: 'Tipo de archivo no permitido',
        text: 'Solo se aceptan archivos PDF, JPG, JPEG o PNG.',
        icon: 'error',
        confirmButtonColor: COLORS.primary
      });
      return;
    }
    onFileChange(file);
  };

  const handleRemove = async (e) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: '¿Quitar documento?',
      text: 'Se eliminará el comprobante cargado actualmente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: COLORS.danger,
      cancelButtonColor: COLORS.slate400
    });
    if (result.isConfirmed) {
      onFileChange(null);
    }
  };

  const checkSelectionAndExecute = (action) => {
    if (!hasInsurancesSelected) {
      Swal.fire({
        title: 'Selecciona un seguro primero',
        text: 'Debes elegir al menos un seguro para tu plantilla antes de poder subir el comprobante de pago.',
        icon: 'warning',
        confirmButtonColor: COLORS.primary
      });
      return false;
    }
    action();
    return true;
  };

  const handleCardClick = () => {
    checkSelectionAndExecute(() => {
      document.getElementById('voucher-inp')?.click();
    });
  };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 18, padding: '20px 18px' }}>
      <style>{`
        .voucher-upload-card:hover .voucher-overlay-actions {
          opacity: 1 !important;
        }
        .voucher-upload-card:hover {
          transform: ${hasInsurancesSelected ? 'translateY(-5px)' : 'none'};
          box-shadow: ${hasInsurancesSelected ? `0 10px 15px -3px ${COLORS.shadow10}` : 'none'};
        }
      `}</style>
      <div style={{ fontSize: 12, fontWeight: 800, color: C.textMid, textTransform: 'uppercase', marginBottom: 14 }}>
        Comprobante de Pago <span style={{ opacity: 0.5 }}>(Opcional)</span>
      </div>

      <div
        className="voucher-upload-card"
        onClick={!voucher ? handleCardClick : undefined}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!hasInsurancesSelected) return;
          setIsDragging(true);
        }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
          if (!hasInsurancesSelected) {
            Swal.fire({
              title: 'Selecciona un seguro primero',
              text: 'Debes elegir al menos un seguro para tu plantilla antes de poder subir el comprobante de pago.',
              icon: 'warning',
              confirmButtonColor: COLORS.primary
            });
            return;
          }
          const file = e.dataTransfer.files[0];
          if (file) handleFileChange(file);
        }}
        style={{
          backgroundColor: isDragging ? 'rgba(26, 59, 92, 0.05)' : C.inputBg,
          borderRadius: '20px',
          border: isDragging ? `2px solid ${COLORS.primary}` : (voucher ? `2px solid ${COLORS.success}` : `2px dashed ${C.inputBorder}`),
          padding: '15px',
          textAlign: 'center',
          transition: 'all 0.3s',
          position: 'relative',
          overflow: 'hidden',
          cursor: voucher ? 'default' : 'pointer',
          opacity: hasInsurancesSelected ? 1 : 0.6
        }}
      >
        <div style={{ pointerEvents: isDragging ? 'none' : 'auto', display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
          <div style={{
            height: '140px',
            width: '100%',
            backgroundColor: C.inputBg,
            borderRadius: '12px',
            marginBottom: '10px',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${C.inputBorder}`
          }}>
            {preview ? (
              <div className="preview-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
                {voucher?.type === 'application/pdf' ? (
                  /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? (
                    <div style={{ color: COLORS.danger, fontSize: '45px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                      <FaFilePdf />
                      <span style={{ fontSize: '10px', color: C.textDim, fontWeight: '800' }}>PDF</span>
                    </div>
                  ) : (
                    <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: COLORS.slate800 }}>
                      <iframe
                        src={`${preview}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                        title="Voucher Preview"
                        style={{
                          width: '100%',
                          height: '100%',
                          border: 'none',
                          pointerEvents: 'none'
                        }}
                      />
                      <div style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '8px',
                        backgroundColor: COLORS.overlaySlateGray,
                        color: COLORS.white,
                        fontSize: '10px',
                        fontWeight: '800',
                        padding: '4px 8px',
                        borderRadius: '999px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <FaFilePdf />
                        PDF
                      </div>
                    </div>
                  )
                ) : (
                  <img
                    src={preview}
                    alt="Voucher Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                )}

                {/* OVERLAY ACTIONS */}
                <div className="voucher-overlay-actions" style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: COLORS.overlaySlateGray,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  opacity: 0,
                  transition: 'opacity 0.2s ease',
                  backdropFilter: 'blur(2px)'
                }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewOpen(true);
                    }}
                    className="btn-zoom"
                    style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      backgroundColor: COLORS.white, color: COLORS.slate800, border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 4px 6px -1px ${COLORS.shadow10}`, cursor: 'pointer'
                    }}
                  >
                    <FaSearchPlus />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick();
                    }}
                    className="btn-change"
                    style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      backgroundColor: COLORS.sky, color: COLORS.white, border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 4px 6px -1px ${COLORS.shadow10}`, cursor: 'pointer'
                    }}
                  >
                    <FaSyncAlt />
                  </button>
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="btn-delete"
                    style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      backgroundColor: COLORS.danger, color: COLORS.white, border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 4px 6px -1px ${COLORS.shadow10}`, cursor: 'pointer'
                    }}
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ) : (
              /* ESTADO VACÍO */
              <div
                onClick={handleCardClick}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  textAlign: 'center',
                  color: C.textDim,
                  cursor: 'pointer'
                }}
              >
                <FaUpload style={{ fontSize: '28px', marginBottom: '6px' }} />
                <p style={{ margin: 0, fontSize: '10px', fontWeight: '800' }}>SUBIR COMPROBANTE</p>
              </div>
            )}
          </div>

          <h4 style={{ fontSize: '13px', fontWeight: '800', margin: '8px 0 5px 0', color: C.text }}>
            {voucher ? 'Voucher Cargado' : 'Sin Voucher'}
          </h4>
          <p style={{ margin: '0 0 6px', fontSize: '10px', color: C.textDim, lineHeight: 1.4, wordBreak: 'break-all' }}>
            {voucher ? voucher.name : 'Arrastra o haz clic para subir el Voucher'}
          </p>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '20px',
            backgroundColor: voucher ? COLORS.greenBg : COLORS.slate100,
            color: voucher ? COLORS.greenDeep : COLORS.slate500,
            fontSize: '10px',
            fontWeight: '800',
            alignSelf: 'center'
          }}>
            {voucher ? <><FaCheckCircle /> Listo</> : 'Pendiente'}
          </div>
        </div>
      </div>

      <input
        type="file" id="voucher-inp" style={{ display: 'none' }}
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={e => handleFileChange(e.target.files[0])}
      />

      {/* MODAL DE PREVISUALIZACIÓN DE VOUCHER (ZOOM) */}
      <Modal
        estaAbierto={previewOpen}
        titulo="Previsualización del Voucher"
        alCerrar={() => setPreviewOpen(false)}
        tamanio={voucher?.type === 'application/pdf' ? 'grande' : 'medio'}
        pie={<BotonSecundario etiqueta="Cerrar" alHacerClick={() => setPreviewOpen(false)} />}
      >
        <div style={{ width: '100%', height: voucher?.type === 'application/pdf' ? '70vh' : 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {voucher?.type === 'application/pdf' ? (
            /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? (
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
                  href={preview}
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
              <iframe src={`${preview}#toolbar=0&navpanes=0`} title="Voucher Preview" style={{ width: '100%', height: '100%', border: 'none', borderRadius: '12px' }} />
            )
          ) : (
            <img src={preview} alt="Voucher Preview" style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '12px' }} />
          )}
        </div>
      </Modal>
    </div>
  );
}
