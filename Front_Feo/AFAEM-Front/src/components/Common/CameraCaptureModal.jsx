import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaCamera, FaTimes, FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import '../../styles/CameraCaptureModal.css';

export default function CameraCaptureModal({ isOpen, onClose, onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    const startCamera = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("El acceso a la cámara requiere una conexión segura (HTTPS), el navegador bloquea la cámara por motivos de seguridad.");
        return;
      }
      try {
        setError(null);
        let mediaStream;
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false
          });
        } catch (constraintErr) {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        }
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError(`No se pudo acceder a la cámara (${err.name}: ${err.message}). Asegúrate de que no esté en uso por otra aplicación y que los permisos de cámara estén habilitados en tu navegador.`);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas dimensions to match video stream
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;

    // Mirror image for final capture to match mirror preview
    context.translate(width, 0);
    context.scale(-1, 1);

    // Draw frame
    context.drawImage(video, 0, 0, width, height);

    // Reset transform
    context.setTransform(1, 0, 0, 1, 0, 0);

    // Convert to Blob and send
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], "captura_camara.jpg", { type: "image/jpeg" });
        onCapture(file);
        handleClose();
      }
    }, "image/jpeg", 0.95);
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="camera-capture-backdrop" onClick={handleClose}>
      <div className="camera-capture-container" onClick={e => e.stopPropagation()}>
        <div className="camera-capture-header">
          <h3>Tomar Fotografía</h3>
          <button className="camera-capture-close-btn" onClick={handleClose}>
            <FaTimes />
          </button>
        </div>

        <div className="camera-preview-wrapper">
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
              />
              {/* Vignette face cutout */}
              <div className="camera-overlay-guide" />

              {/* Guidelines panel */}
              <div className="camera-instructions">
                <p>Indicaciones para la foto</p>
                <div className="camera-instruction-list">
                  <div className="camera-instruction-item">
                    <FaCheck /> Postura recta
                  </div>
                  <div className="camera-instruction-item">
                    <FaCheck /> Vista al frente
                  </div>
                  <div className="camera-instruction-item">
                    <FaCheck /> Sin sonrisa
                  </div>
                  <div className="camera-instruction-item">
                    <FaCheck /> Buena iluminación
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="camera-controls">
          {!error && (
            <button className="camera-btn-capture" onClick={handleCapture}>
              <FaCamera /> Capturar Foto
            </button>
          )}
          <button className="camera-btn-cancel" onClick={handleClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
