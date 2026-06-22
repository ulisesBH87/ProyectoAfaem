import React, { useState } from 'react';
import { FaUpload, FaFilePdf, FaSearchPlus, FaSyncAlt, FaExclamationTriangle, FaCamera } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { C } from './constants';
import CameraCaptureModal from '../../../components/Common/CameraCaptureModal';

/**
 * DocumentCard
 * Tarjeta de carga de documento individual.
 * Muestra:
 * - Preview de imagen o ícono PDF
 * - Overlay con acciones (zoom, cambiar)
 * - Zona de drag & drop
 * - Errores de foto y botón de bypass
 * - Toggle de detalles OCR
 */
export default function DocumentCard({
  doc,
  documents,
  previews,
  ocrResults = {},
  detailsOpen,
  setDetailsOpen,
  fotoError,
  fotoFallida,
  fotoArchivo,
  forzarFoto,
  handleFileUpload,
  descargarFormato,
  onOpenPreview,
  disabledUpload,
}) {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const uploaded = !!documents[doc.documento];
  const ocrDone = doc.ocr && ocrResults[doc.documento];
  const isPhoto = doc.documento === 'fotografia';

  const statusLabel = (ocrDone || uploaded) ? (ocrDone ? 'Procesado' : 'Listo') : 'Pendiente';
  const statusColor = (ocrDone || uploaded) ? C.green : '#f59e0b';
  const statusBg = (ocrDone || uploaded) ? 'rgba(74,222,128,0.1)' : 'rgba(245,158,11,0.1)';

  return (
    <div style={{
      position: 'relative', background: C.card,
      border: `1px solid ${uploaded ? 'rgba(74,222,128,0.2)' : C.cardBorder}`,
      borderRadius: 16, padding: '18px 20px', paddingTop: 45,
      display: 'flex', flexDirection: 'column', transition: 'border-color .2s',
    }}>
      {/* Pill de estado */}
      <div style={{
        position: 'absolute', top: 14, right: 14,
        padding: '3px 10px', borderRadius: 20,
        fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px',
        background: statusBg, color: statusColor,
        display: 'flex', alignItems: 'center', gap: 5, zIndex: 2,
      }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor }} />
        {statusLabel}
      </div>

      {/* Área de preview */}
      <div
        style={{
          height: 140, width: '100%', background: '#111827', borderRadius: 12,
          marginBottom: 14, overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
        }}
        onMouseEnter={e => { const o = e.currentTarget.querySelector('.overlay-actions'); if (o) o.style.opacity = '1'; }}
        onMouseLeave={e => { const o = e.currentTarget.querySelector('.overlay-actions'); if (o) o.style.opacity = '0'; }}
        onDragOver={e => { if (!disabledUpload) e.preventDefault(); }}
        onDrop={e => { 
          if (disabledUpload) {
            e.preventDefault();
            Swal.fire('Atención', 'Debes llenar todos los campos y subir los demás documentos antes de subir el Formato de Afiliación.', 'warning');
            return;
          }
          e.preventDefault(); 
          const file = e.dataTransfer.files[0]; 
          if (file) handleFileUpload(doc.documento, file); 
        }}
      >
        {previews[doc.documento] ? (
          <>
            {previews[doc.documento] === 'pdf' ? (
              <div style={{ color: '#ef4444', fontSize: 42, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <FaFilePdf />
                <span style={{ fontSize: 10, color: '#64748b', fontWeight: 800 }}>PDF</span>
              </div>
            ) : (
              <img src={previews[doc.documento]} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            )}

            {/* Overlay de acciones */}
            <div className="overlay-actions" style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(30, 41, 59, 0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              opacity: 0, transition: 'opacity 0.2s ease', backdropFilter: 'blur(2px)',
            }}>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onOpenPreview(doc, previews[doc.documento], documents[doc.documento]); }}
                style={{
                  width: 36, height: 36, borderRadius: '50%', backgroundColor: '#fff',
                  color: '#1e293b', border: 'none', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', cursor: 'pointer',
                }}
              >
                <FaSearchPlus />
              </button>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  if (isPhoto) {
                    Swal.fire({
                      title: 'Selecciona una opción',
                      text: '¿Cómo deseas cargar la fotografía?',
                      icon: 'question',
                      showCancelButton: true,
                      confirmButtonText: '📷 Tomar con cámara',
                      cancelButtonText: '📁 Subir archivo',
                      confirmButtonColor: '#0b4ea6',
                      cancelButtonColor: '#64748b'
                    }).then((result) => {
                      if (result.isConfirmed) {
                        setIsCameraOpen(true);
                      } else if (result.dismiss === Swal.DismissReason.cancel) {
                        document.getElementById(`file-${doc.documento}`).click();
                      }
                    });
                  } else {
                    document.getElementById(`file-${doc.documento}`).click();
                  }
                }}
                style={{
                  width: 36, height: 36, borderRadius: '50%', backgroundColor: '#0ea5e9',
                  color: '#fff', border: 'none', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', cursor: 'pointer',
                }}
              >
                <FaSyncAlt />
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', color: '#6b7280', cursor: disabledUpload ? 'not-allowed' : 'pointer', opacity: disabledUpload ? 0.5 : 1 }}
            onClick={() => {
              if (disabledUpload) {
                Swal.fire('Atención', 'Debes llenar todos los campos y subir los demás documentos antes de subir el Formato de Afiliación.', 'warning');
                return;
              }
              if (isPhoto) {
                Swal.fire({
                  title: 'Selecciona una opción',
                  text: '¿Cómo deseas cargar la fotografía?',
                  icon: 'question',
                  showCancelButton: true,
                  confirmButtonText: '📷 Tomar con cámara',
                  cancelButtonText: '📁 Subir archivo',
                  confirmButtonColor: '#0b4ea6',
                  cancelButtonColor: '#64748b'
                }).then((result) => {
                  if (result.isConfirmed) {
                    setIsCameraOpen(true);
                  } else if (result.dismiss === Swal.DismissReason.cancel) {
                    document.getElementById(`file-${doc.documento}`).click();
                  }
                });
              } else {
                document.getElementById(`file-${doc.documento}`).click();
              }
            }}>
            <FaUpload style={{ fontSize: 28, marginBottom: 6 }} />
            <p style={{ fontSize: 11 }}>Sin archivo</p>
          </div>
        )}
      </div>

      {/* Nombre y archivo */}
      <div style={{ marginBottom: 12 }}>
        <h4 style={{ margin: '0 0 4px', fontSize: 13.5, fontWeight: 800 }}>{doc.nombre}</h4>
        {isPhoto && (
          <p style={{ margin: '5px 0 8px', fontSize: 11, color: C.textDim, fontStyle: 'italic', lineHeight: 1.4 }}>
            Mantén una postura recta, visibilidad de hombros, sin sonrisa, ni accesorios como lentes, aretes o gorras.
          </p>
        )}
        <p style={{ margin: 0, fontSize: 11, color: C.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {uploaded ? `📎 ${documents[doc.documento].name}` : 'No seleccionado'}
        </p>
      </div>

      {/* Error de foto */}
      {isPhoto && fotoError && (
        <div style={{
          background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
          borderRadius: 8, padding: '8px 12px', fontSize: 11.5, color: C.rose,
          marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7,
        }}>
          <FaExclamationTriangle style={{ flexShrink: 0 }} /> {fotoError}
        </div>
      )}

      {/* Bypass foto */}
      {isPhoto && fotoFallida && fotoArchivo && (
        <button onClick={forzarFoto} style={{
          width: '100%', padding: '7px 12px',
          border: `1px solid rgba(245,158,11,0.4)`, background: 'rgba(245,158,11,0.08)',
          color: C.amber, borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', marginBottom: 10,
        }}>
          ⚠️ Omitir validación y usar esta foto
        </button>
      )}

      {/* Botones de acción */}
      <div style={{ display: 'flex', gap: 8 }}>
        {doc.hasDownload && (
          <button 
            onClick={descargarFormato} 
            disabled={disabledUpload}
            style={{
              flex: 1, padding: '8px 10px', border: `1px solid ${C.inputBorder}`,
              background: 'rgba(255,255,255,0.03)', color: disabledUpload ? C.textDim : C.textMid,
              borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: disabledUpload ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              opacity: disabledUpload ? 0.5 : 1
            }}
          >
            <FaFilePdf /> Descargar
          </button>
        )}
        {isPhoto && (
          <button
            type="button"
            onClick={() => setIsCameraOpen(true)}
            disabled={disabledUpload}
            style={{
              flex: 1, padding: '8px 10px', border: `1px solid ${C.inputBorder}`,
              background: 'rgba(255,255,255,0.03)', color: disabledUpload ? C.textDim : C.textMid,
              borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: disabledUpload ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              opacity: disabledUpload ? 0.5 : 1
            }}
          >
            <FaCamera /> Tomar Foto
          </button>
        )}
        <input
          type="file" id={`file-${doc.documento}`} style={{ display: 'none' }}
          disabled={disabledUpload}
          onChange={e => handleFileUpload(doc.documento, e.target.files[0])}
        />
      </div>

      {isPhoto && (
        <CameraCaptureModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onCapture={(file) => handleFileUpload(doc.documento, file)}
        />
      )}

      {/* Toggle detalles OCR */}
      {(doc.ocr || isPhoto) && (
        <div style={{ marginTop: 10 }}>
          <button
            onClick={() => setDetailsOpen(prev => ({ ...prev, [doc.documento]: !prev[doc.documento] }))}
            style={{ background: 'none', border: 'none', color: C.textDim, fontSize: 10.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            {detailsOpen[doc.documento] ? '▲ Ocultar detalles' : '▼ Ver detalles'}
          </button>

          {detailsOpen[doc.documento] && (
            <div style={{ marginTop: 8, background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: '10px 12px' }}>
              {doc.ocr && Object.keys(ocrResults).length > 0 ? (
                [['Nombre', ocrResults.nombre], ['CURP', ocrResults.curp], ['Fecha Nac.', ocrResults.fecha_nac], ['Edad', ocrResults.edad], ['Nacionalidad', ocrResults.nacionalidad]].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 4 }}>
                    <span style={{ color: C.textDim, fontWeight: 700 }}>{label}:</span>
                    <span style={{ color: 'white' }}>{val || '—'}</span>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: 11.5, color: C.textDim, margin: 0, textAlign: 'center' }}>
                  {isPhoto ? '📸 Validación automática de rostro.' : 'Sube el documento para ver los datos.'}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
