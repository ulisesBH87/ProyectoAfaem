import React, { useState } from 'react';
import { FaCamera, FaExclamationTriangle, FaFilePdf, FaSearchPlus, FaSyncAlt, FaTrash, FaUpload } from 'react-icons/fa';
import Swal from 'sweetalert2';
import CameraCaptureModal from '../../../components/Common/CameraCaptureModal';
import COLORS from '../../../styles/colors';
import { buildCaptureSourceDialog, getCameraCaptureKind, isPhotoCaptureKey } from '../../../utils/cameraCapture';
import { C } from './constants';

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
  const [isDragging, setIsDragging] = useState(false);

  const uploaded = !!documents[doc.documento];
  const ocrDone = doc.ocr && ocrResults[doc.documento];
  const isPhoto = isPhotoCaptureKey(doc.documento);
  const captureKind = getCameraCaptureKind(doc.documento);
  const supportsCameraCapture = !doc.hasDownload;

  const statusLabel = ocrDone || uploaded ? (ocrDone ? 'Procesado' : 'Listo') : 'Pendiente';
  const statusColor = ocrDone || uploaded ? C.green : COLORS.warning;
  const statusBg = ocrDone || uploaded ? COLORS.greenBgTranslucent10 : COLORS.warningBgTranslucent10;

  const openFilePicker = () => {
    const input = document.getElementById(`file-${doc.documento}`);
    if (input) input.click();
  };

  const openUploadOptions = () => {
    if (!supportsCameraCapture) {
      openFilePicker();
      return;
    }

    Swal.fire(buildCaptureSourceDialog(captureKind, COLORS)).then((result) => {
      if (result.isConfirmed) {
        setIsCameraOpen(true);
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        openFilePicker();
      }
    });
  };

  const triggerUploadFlow = (e) => {
    if (
      e.target.tagName === 'BUTTON' ||
      e.target.tagName === 'A' ||
      e.target.tagName === 'INPUT' ||
      e.target.closest('button') ||
      e.target.closest('a') ||
      e.target.closest('.overlay-actions')
    ) {
      return;
    }

    if (disabledUpload) {
      Swal.fire('Atención', 'Debes llenar todos los campos y subir los demás documentos antes de subir el Formato de Afiliación.', 'warning');
      return;
    }

    openUploadOptions();
  };

  return (
    <div
      className="rp-document-card"
      onClick={triggerUploadFlow}
      onDragEnter={(e) => {
        if (!disabledUpload) {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
        }
      }}
      onDragOver={(e) => {
        if (!disabledUpload) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onDragLeave={(e) => {
        if (!disabledUpload) {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
        }
      }}
      onDrop={(e) => {
        if (disabledUpload) {
          e.preventDefault();
          e.stopPropagation();
          Swal.fire('Atención', 'Debes llenar todos los campos y subir los demás documentos antes de subir el Formato de Afiliación.', 'warning');
          return;
        }

        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(doc.documento, file);
      }}
      style={{
        position: 'relative',
        background: isDragging ? 'rgba(26, 59, 92, 0.05)' : C.card,
        border: isDragging ? `2px solid ${COLORS.primary}` : `1px solid ${uploaded ? COLORS.greenBgTranslucent20 : C.cardBorder}`,
        borderRadius: 14,
        padding: '12px 14px',
        paddingTop: 34,
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          padding: '2px 8px',
          borderRadius: 20,
          fontSize: 8.5,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          background: statusBg,
          color: statusColor,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          zIndex: 2,
        }}
      >
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor }} />
        {statusLabel}
      </div>

      <div
        style={{
          height: 105,
          width: '100%',
          background: COLORS.gray900,
          borderRadius: 10,
          marginBottom: 10,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
        onMouseEnter={(e) => {
          const overlay = e.currentTarget.querySelector('.overlay-actions');
          if (overlay) overlay.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          const overlay = e.currentTarget.querySelector('.overlay-actions');
          if (overlay) overlay.style.opacity = '0';
        }}
      >
        {previews[doc.documento] ? (
          <>
            {documents[doc.documento]?.type === 'application/pdf' || previews[doc.documento] === 'pdf' ? (
              <div style={{ color: COLORS.danger, fontSize: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <FaFilePdf />
                <span style={{ fontSize: 9, color: COLORS.slate500, fontWeight: 800 }}>PDF</span>
              </div>
            ) : (
              <img src={previews[doc.documento]} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            )}

            <div
              className="overlay-actions"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: COLORS.overlaySlateGray,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                opacity: 0,
                transition: 'opacity 0.2s ease',
                backdropFilter: 'blur(2px)',
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenPreview(doc, previews[doc.documento], documents[doc.documento]);
                }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: COLORS.white,
                  color: COLORS.slate800,
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 4px 6px -1px ${COLORS.shadow10}`,
                  cursor: 'pointer',
                }}
              >
                <FaSearchPlus style={{ fontSize: 13 }} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openUploadOptions();
                }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: COLORS.sky,
                  color: COLORS.white,
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 4px 6px -1px ${COLORS.shadow10}`,
                  cursor: 'pointer',
                }}
              >
                <FaSyncAlt style={{ fontSize: 13 }} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFileUpload(doc.documento, null);
                }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: COLORS.danger,
                  color: COLORS.white,
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 4px 6px -1px ${COLORS.shadow10}`,
                  cursor: 'pointer',
                }}
              >
                <FaTrash style={{ fontSize: 13 }} />
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', color: COLORS.gray500, opacity: disabledUpload ? 0.5 : 1 }}>
            <FaUpload style={{ fontSize: 24, marginBottom: 4 }} />
            <p style={{ fontSize: 10 }}>Sin archivo</p>
          </div>
        )}
      </div>

      <div style={{ marginBottom: 8 }}>
        <h4 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 800 }}>{doc.nombre}</h4>
        {isPhoto && (
          <p style={{ margin: '4px 0 6px', fontSize: 10.5, color: C.textDim, fontStyle: 'italic', lineHeight: 1.35 }}>
            Mantén una postura recta, visibilidad de hombros, sin sonrisa, ni accesorios como lentes, aretes o gorras.
          </p>
        )}
        <p style={{ margin: 0, fontSize: 10.5, color: C.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {uploaded ? `📎 ${documents[doc.documento].name}` : 'No seleccionado'}
        </p>
      </div>

      {isPhoto && fotoError && (
        <div
          style={{
            background: COLORS.dangerLightTranslucent,
            border: `1px solid ${COLORS.dangerLightTranslucent20}`,
            borderRadius: 8,
            padding: '6px 10px',
            fontSize: 10.5,
            color: C.rose,
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <FaExclamationTriangle style={{ flexShrink: 0 }} /> {fotoError}
        </div>
      )}

      {isPhoto && fotoFallida && fotoArchivo && (
        <button
          type="button"
          onClick={forzarFoto}
          style={{
            width: '100%',
            padding: '6px 10px',
            border: `1px solid ${COLORS.warningBgTranslucent40}`,
            background: COLORS.warningBgTranslucent08,
            color: C.amber,
            borderRadius: 8,
            fontSize: 10.5,
            fontWeight: 700,
            cursor: 'pointer',
            marginBottom: 8,
          }}
        >
          ⚠️ Omitir validación y usar esta foto
        </button>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        {doc.hasDownload && (
          <button
            type="button"
            onClick={descargarFormato}
            disabled={disabledUpload}
            style={{
              flex: 1,
              padding: '8px 10px',
              border: `1px solid ${C.inputBorder}`,
              background: COLORS.overlayWhite03,
              color: disabledUpload ? C.textDim : C.textMid,
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              cursor: disabledUpload ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              opacity: disabledUpload ? 0.5 : 1,
            }}
          >
            <FaFilePdf /> Descargar
          </button>
        )}
        {supportsCameraCapture && (
          <button
            type="button"
            onClick={() => setIsCameraOpen(true)}
            disabled={disabledUpload}
            style={{
              flex: 1,
              padding: '8px 10px',
              border: `1px solid ${C.inputBorder}`,
              background: COLORS.overlayWhite03,
              color: disabledUpload ? C.textDim : C.textMid,
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              cursor: disabledUpload ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              opacity: disabledUpload ? 0.5 : 1,
            }}
          >
            <FaCamera /> {isPhoto ? 'Tomar Foto' : 'Tomar Documento'}
          </button>
        )}
        <input
          type="file"
          id={`file-${doc.documento}`}
          style={{ display: 'none' }}
          disabled={disabledUpload}
          onChange={(e) => handleFileUpload(doc.documento, e.target.files[0])}
        />
      </div>

      {supportsCameraCapture && (
        <CameraCaptureModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onCapture={(file) => handleFileUpload(doc.documento, file)}
          captureKind={captureKind}
        />
      )}

      {(doc.ocr || isPhoto) && (
        <div style={{ marginTop: 10 }}>
          <button
            type="button"
            onClick={() => setDetailsOpen((prev) => ({ ...prev, [doc.documento]: !prev[doc.documento] }))}
            style={{ background: 'none', border: 'none', color: C.textDim, fontSize: 10.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            {detailsOpen[doc.documento] ? '▲ Ocultar detalles' : '▼ Ver detalles'}
          </button>

          {detailsOpen[doc.documento] && (
            <div style={{ marginTop: 8, background: COLORS.overlayWhite02, border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: '10px 12px' }}>
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
