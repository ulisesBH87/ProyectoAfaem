export const CAMERA_CAPTURE_KIND = {
  PHOTO: 'photo',
  DOCUMENT: 'document',
};

export const isPhotoCaptureKey = (documentKey) => ['foto', 'fotografia'].includes(documentKey);

export const getCameraCaptureKind = (documentKey) =>
  isPhotoCaptureKey(documentKey) ? CAMERA_CAPTURE_KIND.PHOTO : CAMERA_CAPTURE_KIND.DOCUMENT;

export const getCameraCaptureModalConfig = (kind = CAMERA_CAPTURE_KIND.PHOTO) => {
  if (kind === CAMERA_CAPTURE_KIND.DOCUMENT) {
    return {
      title: 'Tomar fotografía del documento',
      captureButtonLabel: 'Capturar Documento',
      instructionTitle: 'Indicaciones para el documento',
      instructions: [
        'Coloca el documento dentro del marco.',
        'Asegúrate de que haya buena iluminación.',
        'Centra completamente el documento.',
        'Evita reflejos o sombras.',
        'Verifica que todo el documento sea legible antes de capturar la imagen.',
      ],
      guideVariant: 'document',
    };
  }

  return {
    title: 'Tomar Fotografía',
    captureButtonLabel: 'Capturar Foto',
    instructionTitle: 'Indicaciones para la foto',
    instructions: [
      'Postura recta',
      'Vista al frente',
      'Sin sonrisa',
      'Buena iluminación',
    ],
    guideVariant: 'photo',
  };
};

export const buildCaptureSourceDialog = (kind, colors) => {
  const isDocument = kind === CAMERA_CAPTURE_KIND.DOCUMENT;

  return {
    title: 'Selecciona una opción',
    text: isDocument ? '¿Cómo deseas cargar el documento?' : '¿Cómo deseas cargar la fotografía?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: '📷 Tomar con cámara',
    cancelButtonText: '📁 Subir archivo',
    confirmButtonColor: colors.primary,
    cancelButtonColor: colors.slate500,
  };
};
