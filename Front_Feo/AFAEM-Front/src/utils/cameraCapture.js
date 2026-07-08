import Swal from 'sweetalert2';
import imgCorrecta from '../assets/Ejemplos/1.Correcta.webp';
import imgIncorrecta from '../assets/Ejemplos/3. Evitar a toda costa.webp';
import imgIneCorrecta from '../assets/Ejemplos/1. INE correcta.webp';
import imgIneIncorrecta from '../assets/Ejemplos/1. INE Incorrecta.webp';
import imgFotoCorrecta from '../assets/Ejemplos/1. FOTO correcta.webp';
import imgFotoIncorrecta from '../assets/Ejemplos/1. FOTO Incorrecta.webp';

export const CAMERA_CAPTURE_KIND = {
  PHOTO: 'photo',
  DOCUMENT: 'document',
};

export const isPhotoCaptureKey = (documentKey) => ['foto', 'fotografia'].includes(documentKey);

export const getCameraCaptureKind = (documentKey) =>
  isPhotoCaptureKey(documentKey) ? CAMERA_CAPTURE_KIND.PHOTO : CAMERA_CAPTURE_KIND.DOCUMENT;

export const isIneDocument = (documentKeyOrId) => {
  if (typeof documentKeyOrId === 'number') {
    return [26, 33].includes(documentKeyOrId);
  }
  if (typeof documentKeyOrId === 'string') {
    const key = documentKeyOrId.toLowerCase();
    return ['ine', 'inetutor', 'identificacion'].includes(key);
  }
  return false;
};

export const isPhotoDocument = (documentKeyOrId) => {
  if (typeof documentKeyOrId === 'number') {
    return [25, 37].includes(documentKeyOrId);
  }
  if (typeof documentKeyOrId === 'string') {
    const key = documentKeyOrId.toLowerCase();
    return ['foto', 'fotografia'].includes(key);
  }
  return false;
};

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

export const showDocumentGuide = (documentKeyOrId, colors) => {
  const isIne = isIneDocument(documentKeyOrId);
  const isFoto = isPhotoDocument(documentKeyOrId);

  let correctImg = imgCorrecta;
  let incorrectImg = imgIncorrecta;
  let titleText = 'Guía para cargar tu documento';
  let descText = 'Asegúrate de que tu documento sea completamente legible, esté bien iluminado y plano. Evita reflejos, sombras u obstrucciones.';

  if (isIne) {
    correctImg = imgIneCorrecta;
    incorrectImg = imgIneIncorrecta;
    titleText = 'Guía para cargar tu INE';
    descText = 'Asegúrate de que tu INE esté bien encuadrada, enfocada, con todos los datos legibles y sin reflejos que cubran la información.';
  } else if (isFoto) {
    correctImg = imgFotoCorrecta;
    incorrectImg = imgFotoIncorrecta;
    titleText = 'Guía para tomar tu Fotografía';
    descText = 'Mantén una postura recta, vista al frente, con fondo claro, iluminación uniforme, sin sonreír y sin accesorios (lentes, gorras, aretes).';
  }

  return Swal.fire({
    title: titleText,
    html: `
      <div style="display: flex; gap: 16px; justify-content: space-around; flex-wrap: wrap; margin-top: 15px; font-family: inherit;">
        <div style="flex: 1; min-width: 140px; text-align: center;">
          <div style="background-color: #e6f4ea; color: #137333; font-weight: bold; padding: 6px; border-radius: 8px; margin-bottom: 8px; font-size: 14px;">✓ Correcta</div>
          <img src="${correctImg}" style="width: 100%; max-width: 180px; height: auto; border-radius: 8px; border: 2px solid #34a853; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" alt="Correcta" />
        </div>
        <div style="flex: 1; min-width: 140px; text-align: center;">
          <div style="background-color: #fce8e6; color: #c5221f; font-weight: bold; padding: 6px; border-radius: 8px; margin-bottom: 8px; font-size: 14px;">✗ Incorrecta</div>
          <img src="${incorrectImg}" style="width: 100%; max-width: 180px; height: auto; border-radius: 8px; border: 2px solid #ea4335; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" alt="Incorrecta" />
        </div>
      </div>
      <p style="margin-top: 16px; font-size: 13px; color: #5f6368; line-height: 1.4; text-align: center;">
        ${descText}
      </p>
    `,
    confirmButtonText: 'Entendido, continuar',
    confirmButtonColor: colors.primary,
    showCancelButton: true,
    cancelButtonText: 'Cancelar',
    cancelButtonColor: colors.slate500,
  });
};



