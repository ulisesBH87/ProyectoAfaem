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
        background: isDragging ? 'rgba(26, 59, 92, 0.08)' : C.card,
        border: isDragging
          ? `2px solid ${C.focusBorder || COLORS.primary}`
          : (uploaded
            ? `2.5px solid ${C.green}`
            : `2px dashed ${C.cardBorder || COLORS.slate700}`),
        borderRadius: '20px',
        padding: '15px',
        textAlign: 'center',
        transition: 'all 0.3s',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ pointerEvents: isDragging ? 'none' : 'auto', display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
        <div
          style={{
            height: '140px',
            width: '100%',
            background: C.inputBg,
            borderRadius: '12px',
            marginBottom: '10px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            border: `1px solid ${C.cardBorder}`
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
                <div style={{ color: COLORS.danger, fontSize: '45px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                  <FaFilePdf />
                  <span style={{ fontSize: '10px', color: COLORS.slate500, fontWeight: '800' }}>PDF</span>
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
                  gap: '12px',
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
                    width: '36px',
                    height: '36px',
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
                  <FaSearchPlus style={{ fontSize: 14 }} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openUploadOptions();
                  }}
                  style={{
                    width: '36px',
                    height: '36px',
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
                  <FaSyncAlt style={{ fontSize: 14 }} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFileUpload(doc.documento, null);
                  }}
                  style={{
                    width: '36px',
                    height: '36px',
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
                  <FaTrash style={{ fontSize: 14 }} />
                </button>
              </div>
            </>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                textAlign: 'center',
                color: COLORS.slate400,
                opacity: disabledUpload ? 0.5 : 1,
                cursor: 'pointer'
              }}
            >
              <FaUpload style={{ fontSize: '28px', marginBottom: '6px' }} />
              <p style={{ margin: 0, fontSize: '10px', fontWeight: '800' }}>SUBIR ARCHIVO</p>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 12 }}>
          <h4 style={{ margin: '0 0 5px', fontSize: '13px', fontWeight: 800, color: C.text }}>{doc.nombre}</h4>
          {isPhoto && (
            <p style={{ margin: '4px 0 6px', fontSize: '10px', color: C.textDim, fontStyle: 'italic', lineHeight: 1.4 }}>
              Mantén una postura recta, visibilidad de hombros, sin sonrisa, ni accesorios como lentes, aretes o gorras.
            </p>
          )}
          <p style={{ margin: 0, fontSize: '10px', color: C.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
              fontSize: '10px',
              color: C.rose,
              marginBottom: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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
              padding: '8px 12px',
              border: 'none',
              background: COLORS.warning,
              color: 'white',
              borderRadius: 8,
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              marginBottom: 10,
              boxShadow: `0 2px 4px ${COLORS.warningBgTranslucent30}`,
              transition: 'background-color 0.2s',
            }}
          >
            ⚠️ Omitir validación y usar esta foto
          </button>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '20px',
            backgroundColor: statusBg,
            color: statusColor,
            fontSize: '10px',
            fontWeight: '800'
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor }} />
            {statusLabel}
          </div>
        </div>

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
      </div>
    </div>
  );
}
