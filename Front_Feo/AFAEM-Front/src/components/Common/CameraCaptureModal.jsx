import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaCamera, FaCheck, FaExclamationTriangle, FaSyncAlt, FaTimes } from 'react-icons/fa';
import '../../styles/CameraCaptureModal.css';
import { CAMERA_CAPTURE_KIND, getCameraCaptureModalConfig } from '../../utils/cameraCapture';

export default function CameraCaptureModal({
  isOpen,
  onClose,
  onCapture,
  captureKind = CAMERA_CAPTURE_KIND.PHOTO,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const previewWrapperRef = useRef(null);
  const overlayRef = useRef(null);
  const activeStreamRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('user');
  const scrollLockRef = useRef(null);

  const modalConfig = getCameraCaptureModalConfig(captureKind);

  useEffect(() => {
    if (!isOpen) return undefined;

    const startCamera = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('El acceso a la cámara requiere una conexión segura (HTTPS); el navegador la bloquea por seguridad.');
        return;
      }

      try {
        setError(null);
        let mediaStream;

        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode,
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch (constraintErr) {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        setStream(mediaStream);
        activeStreamRef.current = mediaStream;

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        setError(`No se pudo acceder a la cámara (${err.name}: ${err.message}). Verifica permisos y que no esté en uso.`);
      }
    };

    startCamera();

    return () => {
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach((track) => track.stop());
        activeStreamRef.current = null;
      }
    };
  }, [facingMode, isOpen]);

  useEffect(() => () => {
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    const scrollY = window.scrollY;
    const { body, documentElement } = document;

    scrollLockRef.current = {
      scrollY,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      bodyTouchAction: body.style.touchAction,
      htmlOverflow: documentElement.style.overflow,
      htmlOverscrollBehavior: documentElement.style.overscrollBehavior,
    };

    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.touchAction = 'none';
    documentElement.style.overflow = 'hidden';
    documentElement.style.overscrollBehavior = 'none';

    return () => {
      const lockState = scrollLockRef.current;
      if (!lockState) return;

      body.style.overflow = lockState.bodyOverflow;
      body.style.position = lockState.bodyPosition;
      body.style.top = lockState.bodyTop;
      body.style.width = lockState.bodyWidth;
      body.style.touchAction = lockState.bodyTouchAction;
      documentElement.style.overflow = lockState.htmlOverflow;
      documentElement.style.overscrollBehavior = lockState.htmlOverscrollBehavior;
      window.scrollTo(0, lockState.scrollY);
      scrollLockRef.current = null;
    };
  }, [isOpen]);

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const getDocumentCrop = (videoWidth, videoHeight) => {
    if (!previewWrapperRef.current || !overlayRef.current) return null;

    const wrapperRect = previewWrapperRef.current.getBoundingClientRect();
    const overlayRect = overlayRef.current.getBoundingClientRect();
    const wrapperWidth = wrapperRect.width;
    const wrapperHeight = wrapperRect.height;

    if (!wrapperWidth || !wrapperHeight || !videoWidth || !videoHeight) return null;

    const scale = Math.max(wrapperWidth / videoWidth, wrapperHeight / videoHeight);
    const renderedWidth = videoWidth * scale;
    const renderedHeight = videoHeight * scale;
    const overflowX = (renderedWidth - wrapperWidth) / 2;
    const overflowY = (renderedHeight - wrapperHeight) / 2;

    const overlayLeft = overlayRect.left - wrapperRect.left;
    const overlayTop = overlayRect.top - wrapperRect.top;
    const sourceX = Math.max(0, (overlayLeft + overflowX) / scale);
    const sourceY = Math.max(0, (overlayTop + overflowY) / scale);
    const sourceWidth = Math.min(videoWidth - sourceX, overlayRect.width / scale);
    const sourceHeight = Math.min(videoHeight - sourceY, overlayRect.height / scale);

    if (sourceWidth <= 0 || sourceHeight <= 0) return null;

    return {
      x: sourceX,
      y: sourceY,
      width: sourceWidth,
      height: sourceHeight,
    };
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    const documentCrop =
      captureKind === CAMERA_CAPTURE_KIND.DOCUMENT ? getDocumentCrop(width, height) : null;
    const outputWidth = Math.round(documentCrop?.width || width);
    const outputHeight = Math.round(documentCrop?.height || height);

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    if (facingMode === 'user') {
      context.translate(outputWidth, 0);
      context.scale(-1, 1);
    }

    if (documentCrop) {
      context.drawImage(
        video,
        documentCrop.x,
        documentCrop.y,
        documentCrop.width,
        documentCrop.height,
        0,
        0,
        outputWidth,
        outputHeight
      );
    } else {
      context.drawImage(video, 0, 0, width, height, 0, 0, outputWidth, outputHeight);
    }
    context.setTransform(1, 0, 0, 1, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'captura_camara.jpg', { type: 'image/jpeg' });
      onCapture(file);
      handleClose();
    }, 'image/jpeg', 0.95);
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="camera-capture-backdrop" onClick={handleClose}>
      <div className="camera-capture-container" onClick={(e) => e.stopPropagation()}>
        <div className="camera-capture-header">
          <h3>{modalConfig.title}</h3>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {!error && (
              <button
                type="button"
                className="camera-capture-close-btn"
                onClick={toggleCamera}
                title="Girar cámara"
                style={{ color: '#0b4ea6', fontSize: '18px' }}
              >
                <FaSyncAlt />
              </button>
            )}
            <button type="button" className="camera-capture-close-btn" onClick={handleClose}>
              <FaTimes />
            </button>
          </div>
        </div>

        <div ref={previewWrapperRef} className="camera-preview-wrapper">
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {error ? (
            <div className="camera-error-container">
              <FaExclamationTriangle />
              <p>{error}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="camera-video"
                style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
              />
              <div
                ref={overlayRef}
                className={`camera-overlay-guide camera-overlay-guide--${modalConfig.guideVariant}`}
              />
            </>
          )}
        </div>

        {!error && (
          <div className="camera-instructions-flat">
            <p>{modalConfig.instructionTitle}</p>
            <div className="camera-instruction-list">
              {modalConfig.instructions.map((instruction) => (
                <div key={instruction} className="camera-instruction-item">
                  <FaCheck /> {instruction}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="camera-controls">
          {!error && (
            <button type="button" className="camera-btn-capture" onClick={handleCapture}>
              <FaCamera /> {modalConfig.captureButtonLabel}
            </button>
          )}
          <button type="button" className="camera-btn-cancel" onClick={handleClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
