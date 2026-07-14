import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../../routes/paths';
import * as bootstrap from 'bootstrap';
import {
  getJugadoresDirectorio,
  getJugadorDocumentos,
  getJugadorSolicitudDocumento,
  exportarJugadorDocumentos,
  updateDocumentoEstado,
  updateJugador,
  subirDocumentoJugador,
  getCatalogosRegistro,
} from '../../services/admin';
import Swal from 'sweetalert2';
import { validarFotografia } from '../../services/foto';
import DashboardTable from '../../components/DashboardTable';
import SearchBar from '../../components/Common/SearchBar';
import { FaSearch, FaSyncAlt, FaSortAmountDown, FaSortAmountUp, FaFileDownload, FaFileArchive, FaPlus, FaEdit, FaSave, FaTimes, FaTable, FaUsers, FaCheckCircle, FaTimesCircle, FaMale, FaFemale, FaIdCard, FaExclamationTriangle, FaUser } from 'react-icons/fa';
import { Modal, BotonPrimario, BotonSecundario, EntradaFormulario, EntradaSeleccion } from '../../components/partials';
import { API_BASE } from '../../config/config';
import Loader from '../../components/Loader';
import CameraCaptureModal from '../../components/Common/CameraCaptureModal';
import { useSecureBlob } from '../../hooks/useSecureBlob';
import { openSecurePath } from '../../utils/secureFetch';
import { registerSuccessfulScanAttempt } from '../../utils/scanAttemptWarning';
import COLORS from '../../styles/colors';

/**
 * Tipos requeridos para jugadores. El campo `id` coincide con DocumentoAfiliacionId
 * usado al subir documentos (ver DOC_TYPE_TO_ID en backend). También se compara con
 * DocumentoId del catálogo por compatibilidad. Sustituir por respuesta del backend.
 */
const TIPOS_DOCUMENTO_JUGADOR_REQUERIDOS = [
  { id: 22, nombre: 'Acta de nacimiento' },
  { id: 26, nombre: 'Identificación' },
  { id: 25, nombre: 'Fotografía' },
  { id: 28, nombre: 'Formato de afiliación' },
];

/** Documentos adicionales: solo se muestran en el modal si ya fueron entregados */
const TIPOS_DOCUMENTO_OPCIONALES = [
  { id: 33, nombre: 'INE del padre o tutor' },
];

const normalizarTextoDocumento = (texto) =>
  String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const PALABRAS_CLAVE_POR_TIPO = {
  22: ['acta', 'nacimiento'],
  26: ['identificacion', 'ine', 'credencial'],
  25: ['foto', 'fotografia'],
  28: ['formato', 'afiliacion'],
  33: ['tutor', 'ine tutor', 'padre', 'madre'],
};

const documentoCoincideConTipo = (doc, tipoId) => {
  const afiliacionId = Number(doc?.DocumentoAfiliacionId ?? doc?.documentoAfiliacionId ?? 0);
  const catalogoId = Number(doc?.DocumentoId ?? doc?.documentoId ?? 0);
  if (afiliacionId === tipoId || catalogoId === tipoId) return true;

  const nombre = normalizarTextoDocumento(doc?.nombre);
  const palabras = PALABRAS_CLAVE_POR_TIPO[tipoId] || [];
  return palabras.some((p) => nombre.includes(p));
};

const obtenerUrlDocumento = (doc) => {
  if (!doc) return null;
  let url = doc.url || doc.RutaArchivo;
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return url.startsWith('/') ? url : `/${url}`;
};

const formatearFechaSubida = (fecha) =>
  fecha
    ? new Date(fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'fecha no disponible';

const obtenerDocumentoMasRecientePorTipo = (documentos, tipoId) => {
  const delTipo = documentos.filter((doc) => documentoCoincideConTipo(doc, tipoId));
  if (delTipo.length === 0) return null;
  return delTipo.sort(
    (a, b) => new Date(b.FechaEntrega || 0) - new Date(a.FechaEntrega || 0)
  )[0];
};

const escaparHtml = (texto) =>
  String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const getDocumentoEstatusInfo = (estadoId) => {
  switch (Number(estadoId)) {
    case 2:
      return {
        texto: 'Aceptado',
        color: COLORS.green, // Green-600
        bg: COLORS.greenBg50, // Green-50
        cardBg: `linear-gradient(180deg, ${COLORS.white} 0%, ${COLORS.greenBg50} 100%)`,
        border: COLORS.success, // Green-500
      };
    case 1:
      return {
        texto: 'Espera',
        color: COLORS.warningDark, // Amber-600
        bg: COLORS.warningBgLight, // Amber-50
        cardBg: `linear-gradient(180deg, ${COLORS.white} 0%, ${COLORS.warningBgLight} 100%)`,
        border: COLORS.warning, // Amber-500
      };
    case 3:
      return {
        texto: 'Rechazado',
        color: COLORS.dangerDark, // Red-600
        bg: COLORS.dangerBgLight, // Red-50
        cardBg: `linear-gradient(180deg, ${COLORS.white} 0%, ${COLORS.dangerBgLight} 100%)`,
        border: COLORS.danger, // Red-500
      };
    default:
      return null;
  }
};

const mapActionKeyToEstadoId = (actionKey) => {
  switch (actionKey) {
    case 'espera':
      return 1;
    case 'aceptar':
      return 2;
    case 'rechazar':
      return 3;
    default:
      return null;
  }
};

const getDocumentActionButtons = (documento, tipoId) => {
  if (!documento) return '';

  const estado = Number(documento.EstadoValidacionId);
  const acciones = [];
  if (estado === 2) {
    acciones.push({ key: 'espera', label: 'Espera' });
    acciones.push({ key: 'rechazar', label: 'Rechazar' });
  } else if (estado === 1) {
    acciones.push({ key: 'aceptar', label: 'Aceptar' });
    acciones.push({ key: 'rechazar', label: 'Rechazar' });
  } else if (estado === 3) {
    acciones.push({ key: 'espera', label: 'Espera' });
    acciones.push({ key: 'aceptar', label: 'Aceptar' });
  }

  const actionStyles = {
    aceptar: `background: ${COLORS.success}; color: white; border: none; box-shadow: 0 2px 4px ${COLORS.successBgTranslucent10};`,
    rechazar: `background: ${COLORS.danger}; color: white; border: none; box-shadow: 0 2px 4px ${COLORS.dangerBgTranslucent10};`,
    espera: `background: ${COLORS.warning}; color: white; border: none; box-shadow: 0 2px 4px ${COLORS.warningBgTranslucent10};`,
  };

  return acciones
    .map(
      (accion) => `
        <button
          type="button"
          data-action-button
          data-action="${accion.key}"
          data-action-text="${accion.label === 'Espera' ? 'poner en espera' : accion.label.toLowerCase()}"
          data-doc-id="${escaparHtml(documento.DocumentosSolicitudId ?? documento.DocumentoId ?? documento.documentoId ?? documento.Id ?? '')}"
          data-tipo-id="${escaparHtml(tipoId)}"
          style="
            flex: 1;
            padding: 7px 10px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 700;
            text-align: center;
            transition: all 0.2s;
            box-sizing: border-box;
            ${actionStyles[accion.key] || `background: ${COLORS.primary}; color: white;`}
          "
          onmouseover="this.style.filter='brightness(0.95)'"
          onmouseout="this.style.filter='none'"
        >
          ${accion.label}
        </button>
      `
    )
    .join('');
};

const actualizarCardDocumentoEstadoVisual = (documentoId, nuevoEstadoId) => {
  const card = document.querySelector(`[data-doc-card-id="${documentoId}"]`);
  if (!card) return;

  const estadoInfo = getDocumentoEstatusInfo(nuevoEstadoId);
  const badge = card.querySelector('[data-doc-status-badge]');
  if (badge && estadoInfo) {
    badge.textContent = estadoInfo.texto;
    badge.style.color = estadoInfo.color;
    badge.style.background = estadoInfo.bg;
  }

  if (estadoInfo) {
    card.style.background = estadoInfo.cardBg;
    card.style.borderColor = estadoInfo.border;
  }

  card.dataset.docEstadoId = nuevoEstadoId;

  const tipoId = card.dataset.docTipoId;
  const actionButtonsWrapper = card.querySelector('[data-doc-action-buttons]');
  if (actionButtonsWrapper) {
    actionButtonsWrapper.innerHTML = getDocumentActionButtons({ EstadoValidacionId: nuevoEstadoId, DocumentosSolicitudId: documentoId }, tipoId);
    attachActionButtonListeners(actionButtonsWrapper);
  }
};

const attachActionButtonListeners = (root = document) => {
  const botones = root.querySelectorAll('[data-action-button]');
  botones.forEach((boton) => {
    if (boton.dataset.listenerAttached === 'true') return;
    boton.dataset.listenerAttached = 'true';

    boton.addEventListener('click', async () => {
      const actionKey = boton.getAttribute('data-action');
      const actionText = boton.getAttribute('data-action-text') || actionKey;
      const documentoId = boton.getAttribute('data-doc-id');
      const tipoId = boton.getAttribute('data-tipo-id');
      const popup = Swal.getPopup() || boton.closest('.modal-content') || document.body;
      if (!documentoId || !popup) return;

      const nuevoEstado = mapActionKeyToEstadoId(actionKey);
      if (!nuevoEstado) return;

      const overlayId = 'document-action-confirmation-overlay';
      const existingOverlay = popup.querySelector(`#${overlayId}`);
      if (existingOverlay) existingOverlay.remove();

      const isRejectAction = actionKey === 'rechazar';
      const overlay = document.createElement('div');
      overlay.id = overlayId;
      overlay.style.cssText = `
        position: absolute;
        inset: 0;
        background: ${COLORS.overlaySlateMedium};
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        border-radius: 16px;
      `;
      popup.style.position = 'relative';

      overlay.innerHTML = `
        <div style="background: white; border-radius: 20px; padding: 24px; width: min(480px, 90%); box-shadow: 0 18px 50px ${COLORS.overlaySlateSuperLight}; text-align: center; font-family: 'Inter', sans-serif;">
          <div style="font-size: 16px; font-weight: 700; color: ${COLORS.slate900}; margin-bottom: 16px;">¿Deseas ${actionText} este documento?</div>
          ${isRejectAction ? `
            <div style="text-align:left; margin-bottom: 14px;">
              <label for="rechazo-motivo" style="display:block; font-size: 13px; font-weight: 700; color: ${COLORS.slate900}; margin-bottom: 8px;">Motivo de rechazo</label>
              <textarea id="rechazo-motivo" data-reject-reason rows="4" style="width: 100%; min-height: 100px; padding: 12px; border: 1.5px solid ${COLORS.slate300}; border-radius: 12px; resize: vertical; font-size: 14px; color: ${COLORS.slate900}; outline: none; box-sizing: border-box;" placeholder="Describe brevemente por qué se rechaza este documento."></textarea>
              <div data-rejection-error style="font-size: 13px; color: ${COLORS.dangerDarker}; margin-top: 6px; min-height: 18px; font-weight: 600;"></div>
            </div>
          ` : ''}
          <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
            <button data-confirm-action type="button" style="padding: 10px 18px; border-radius: 12px; border: none; background: ${COLORS.primary}; color: white; font-weight: 700; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='${COLORS.primaryHover}'" onmouseout="this.style.background='${COLORS.primary}'">Aceptar</button>
            <button data-cancel-action type="button" style="padding: 10px 18px; border-radius: 12px; border: 1px solid ${COLORS.slate300}; background: white; color: ${COLORS.slate600}; font-weight: 700; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='${COLORS.slate50}'" onmouseout="this.style.background='white'">Cancelar</button>
          </div>
        </div>
      `;

      popup.appendChild(overlay);

      const removeOverlay = () => {
        overlay.remove();
      };

      overlay.querySelector('[data-cancel-action]')?.addEventListener('click', removeOverlay);
      overlay.querySelector('[data-confirm-action]')?.addEventListener('click', async () => {
        const confirmButton = overlay.querySelector('[data-confirm-action]');
        const motivoInput = overlay.querySelector('[data-reject-reason]');
        const rejectionError = overlay.querySelector('[data-rejection-error]');
        const motivoRechazo = motivoInput?.value.trim() || null;

        if (isRejectAction && !motivoRechazo) {
          if (rejectionError) rejectionError.textContent = 'El motivo de rechazo es obligatorio.';
          motivoInput?.focus();
          return;
        }

        try {
          const waitingText = document.createElement('div');
          waitingText.textContent = 'Actualizando estado...';
          waitingText.style = `margin-top: 14px; color: ${COLORS.slate700}; font-size: 14px; font-weight: 600;`;
          overlay.querySelector('div').appendChild(waitingText);
          boton.disabled = true;
          if (confirmButton) confirmButton.disabled = true;
          await updateDocumentoEstado(Number(documentoId), nuevoEstado, motivoRechazo);
          actualizarCardDocumentoEstadoVisual(documentoId, nuevoEstado);
        } catch (err) {
          console.error(err);
          Swal.fire('Error', 'No se pudo actualizar el estado del documento.', 'error');
        } finally {
          if (confirmButton) confirmButton.disabled = false;
          boton.disabled = false;
          removeOverlay();
        }
      });
    });
  });
};

const estilosCardDocumento = `
  min-height: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 16px 16px 16px;
  text-align: center;
  border-radius: 16px;
  border: 1.5px solid ${COLORS.slate300};
  background: ${COLORS.white};
  box-shadow: 0 4px 6px -1px ${COLORS.shadow05}, 0 2px 4px -1px ${COLORS.shadow03};
  color: ${COLORS.slate800};
  box-sizing: border-box;
`;

const construirCardDocumentoHtml = (tipo, documento) => {
  const tituloTipo = escaparHtml(tipo.nombre);

  const urlDocumento = obtenerUrlDocumento(documento);
  if (urlDocumento) {
    const nombreDoc = escaparHtml(documento.nombre || tipo.nombre);
    const fechaSubida = formatearFechaSubida(documento.FechaEntrega);
    const estadoInfo = getDocumentoEstatusInfo(documento.EstadoValidacionId);
    const estadoBadge = estadoInfo
      ? `<div data-doc-status-badge style="position: absolute; top: 12px; right: 12px; padding: 3px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; color: ${estadoInfo.color}; background: ${estadoInfo.bg}; letter-spacing: 0.05em; text-transform: uppercase;">${estadoInfo.texto}</div>`
      : '';
    const estadoCardStyle = estadoInfo
      ? `background: ${estadoInfo.cardBg}; border-color: ${estadoInfo.border};`
      : '';
    const botonesEstado = getDocumentActionButtons(documento, tipo.id);

    return `
      <div
        data-doc-card-id="${escaparHtml(documento.DocumentosSolicitudId ?? documento.DocumentoId ?? documento.documentoId ?? documento.Id ?? '')}"
        data-doc-estado-id="${escaparHtml(documento.EstadoValidacionId)}"
        data-doc-tipo-id="${escaparHtml(tipo.id)}"
        style="${estilosCardDocumento}
          ${estadoCardStyle}
          position: relative;
          text-decoration: none;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        "
        onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 12px 20px -8px ${COLORS.shadow15}'; this.querySelector('.doc-icon-wrapper').style.background='${COLORS.skyBg}';"
        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px -1px ${COLORS.shadow05}'; this.querySelector('.doc-icon-wrapper').style.background='${COLORS.skyBgLight}';"
      >
        ${estadoBadge}
        <a
          href="${escaparHtml(urlDocumento)}"
          target="_blank"
          rel="noopener noreferrer"
          style="display: flex; flex-direction: column; align-items: center; width: 100%; gap: 10px; text-decoration: none;"
          title="Ver documento en pestaña nueva"
        >
          <div class="doc-icon-wrapper" style="width: 52px; height: 52px; border-radius: 14px; background: ${COLORS.skyBgLight}; color: ${COLORS.skyDark}; display: flex; align-items: center; justify-content: center; margin-top: 10px; transition: background 0.2s;">
            <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="24" width="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px; align-items: center; width: 100%;">
            <span style="font-size: 12px; font-weight: 700; color: ${COLORS.slate800}; text-transform: uppercase; letter-spacing: 0.04em; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center;">${tituloTipo}</span>
            ${Number(tipo.id) === 25 ? `<span style="font-size: 10px; color: ${COLORS.danger}; font-style: italic; line-height: 1.3; text-align: center; margin-top: 2px; font-weight: 500;">Mantén una postura recta, visibilidad de hombros, sin sonrisa, ni accesorios como lentes, aretes o gorras.</span>` : ''}
            <span style="font-size: 11px; color: ${COLORS.slate500}; line-height: 1.4; text-align: center;">Subido el ${fechaSubida}</span>
          </div>
        </a>
        <div style="display: flex; flex-direction: column; gap: 6px; margin-top: auto; width: 100%;">
          <div data-doc-action-buttons style="display: flex; gap: 6px; width: 100%;">
            ${botonesEstado}
          </div>
          <button
            type="button"
            data-replace-doc="${tipo.id}"
            title="Subir nueva versión de este documento"
            style="
              padding: 6px 12px;
              border-radius: 8px;
              border: 1.5px solid ${COLORS.skyDark};
              background: white;
              color: ${COLORS.skyDark};
              font-size: 11px;
              font-weight: 700;
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
              transition: all 0.2s;
              width: 100%;
              box-sizing: border-box;
            "
            onmouseover="this.style.background='${COLORS.skyBgLight}'"
            onmouseout="this.style.background='white'"
          >
            <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="12" width="12" xmlns="http://www.w3.org/2000/svg"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            Reemplazar
          </button>
        </div>
      </div>
    `;
  }

  return `
    <div
      style="${estilosCardDocumento}"
      onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 12px 20px -8px ${COLORS.shadow10}'; this.querySelector('.missing-icon-wrapper').style.background='${COLORS.roseBg}';"
      onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'; this.querySelector('.missing-icon-wrapper').style.background='${COLORS.dangerBgLight}';"
    >
      <div class="missing-icon-wrapper" style="width: 52px; height: 52px; border-radius: 14px; background: ${COLORS.dangerBgLight}; display: flex; align-items: center; justify-content: center; margin-top: 10px; transition: background 0.2s;">
        <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="24" width="24" xmlns="http://www.w3.org/2000/svg" style="color: ${COLORS.danger};">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="12" y1="18" x2="12" y2="12"></line>
          <line x1="9" y1="15" x2="15" y2="15"></line>
        </svg>
      </div>
      <div style="display: flex; flex-direction: column; gap: 4px; align-items: center; width: 100%;">
        <span style="font-size: 12px; font-weight: 700; color: ${COLORS.slate500}; text-transform: uppercase; letter-spacing: 0.04em; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center;">${tituloTipo}</span>
        ${Number(tipo.id) === 25 ? `<span style="font-size: 10px; color: ${COLORS.danger}; font-style: italic; line-height: 1.3; text-align: center; margin-top: 2px; font-weight: 500;">Mantén una postura recta, visibilidad de hombros, sin sonrisa, ni accesorios como lentes, aretes o gorras.</span>` : ''}
        <span style="font-size: 11px; color: ${COLORS.rose}; font-weight: 700; background: ${COLORS.roseBgLight}; padding: 2px 8px; border-radius: 20px;">Faltante</span>
      </div>
      <button
        type="button"
        data-add-doc="${tipo.id}"
        style="
          margin-top: auto;
          padding: 8px 14px;
          border-radius: 8px;
          border: none;
          background: ${COLORS.primary};
          color: white;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          width: 100%;
          box-sizing: border-box;
          transition: all 0.2s;
        "
        onmouseover="this.style.background='${COLORS.primaryHover}'"
        onmouseout="this.style.background='${COLORS.primary}'"
      >
        Añadir documento
      </button>
    </div>
  `;
};

export default function AdminJugadores() {
  const successfulScanCountsRef = useRef({});
  const navigate = useNavigate();
  const location = useLocation();

  const [jugadores, setJugadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);

  // Estados para filtros, búsqueda y paginación
  const [filtroEstatus, setFiltroEstatus] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ESTADO PARA EDICIÓN (MODAL PROFESIONAL)
  const [modalEdicion, setModalEdicion] = useState(false);
  const [jugadorEdicion, setJugadorEdicion] = useState(null);
  const [fotoJugadorEdicion, setFotoJugadorEdicion] = useState(null);
  const [datosEditables, setDatosEditables] = useState({});
  const [haCambiado, setHaCambiado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  // OCR dentro del modal
  const [ocrCargando, setOcrCargando] = useState(false);
  const [rolesEquipo, setRolesEquipo] = useState([]);

  // Hook para cargar la foto del jugador en edición de forma segura
  const { blobUrl: avatarBlobUrl, error: avatarError } = useSecureBlob(fotoJugadorEdicion || jugadorEdicion?.RutaFoto);
  const [imgError, setImgError] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraTargetJugador, setCameraTargetJugador] = useState(null);
  const [cameraTargetSolicitudId, setCameraTargetSolicitudId] = useState(null);

  useEffect(() => {
    setImgError(false);
  }, [fotoJugadorEdicion, jugadorEdicion?.RutaFoto]);

  const mostrarFallback = !(fotoJugadorEdicion || jugadorEdicion?.RutaFoto) || avatarError || imgError;

  const loadJugadores = async (forceRefresh = false, isTableOnly = false) => {
    try {
      if (isTableOnly) {
        setTableLoading(true);
      } else {
        setLoading(true);
      }
      const data = await getJugadoresDirectorio(forceRefresh);
      setJugadores(data);
      setError(null);
    } catch (err) {
      console.error("Error al cargar jugadores:", err);
      setError("Error al cargar el directorio de jugadores.");
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  const loadJugadoresSilencioso = async () => {
    await loadJugadores(true, true);
  };

  const cargarRoles = async () => {
    try {
      const data = await getCatalogosRegistro();
      setRolesEquipo(data.roles_equipo || []);
    } catch (err) {
      console.error("Error al cargar roles de equipo:", err);
    }
  };

  useEffect(() => {
    loadJugadores();
    cargarRoles();
  }, [navigate]);

  // EFECTO PARA LEER FILTRO DE EQUIPO DESDE NAVEGACIÓN
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const equipoQuery = queryParams.get('equipo');
    const equipoState = location.state?.filtroEquipo;
    const equipoFiltro = equipoQuery || equipoState;

    if (equipoFiltro) {
      setSearchTerm(equipoFiltro);
    }
  }, [location]);

  // EFECTO PARA ABRIR EDICIÓN AUTOMÁTICA DESDE BÚSQUEDA
  useEffect(() => {
    if (!loading && jugadores.length > 0 && location.state?.editPlayerId) {
      const playerToEdit = jugadores.find(j => j.MiembroEquipoId === location.state.editPlayerId);
      if (playerToEdit) {
        handleEditarJugador(playerToEdit);
        // Limpiar el state de React Router para que no se abra de nuevo al recargar
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [loading, jugadores, location.state]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filtroEstatus, searchTerm, sortOrder]);

  const filteredJugadores = React.useMemo(() => {
    let result = [...jugadores];

    if (filtroEstatus !== 'todos') {
      if (filtroEstatus === 'activos') {
        result = result.filter(s => !!s.Estatus);
      } else if (filtroEstatus === 'inactivos') {
        result = result.filter(s => !s.Estatus);
      } else if (filtroEstatus === 'hombres') {
        result = result.filter(s => {
          const sexo = s.Sexo?.toLowerCase() || '';
          return sexo.includes('masculino') || sexo.includes('hombre') || sexo === 'h';
        });
      } else if (filtroEstatus === 'mujeres') {
        result = result.filter(s => {
          const sexo = s.Sexo?.toLowerCase() || '';
          return sexo.includes('femenino') || sexo.includes('mujer') || sexo === 'm';
        });
      } else if (filtroEstatus === 'conNUI') {
        result = result.filter(s => s.NUI && s.NUI !== 'N/A' && s.NUI.trim() !== '');
      } else if (filtroEstatus === 'sinNUI') {
        result = result.filter(s => !s.NUI || s.NUI === 'N/A' || s.NUI.trim() === '');
      }
    }

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      result = result.filter(s =>
        (s.NombreCompleto && s.NombreCompleto.toLowerCase().includes(query)) ||
        (s.CURP && s.CURP.toLowerCase().includes(query)) ||
        (s.Email && s.Email.toLowerCase().includes(query)) || // Búsqueda por email añadida
        (s.EquipoNombre && s.EquipoNombre.toLowerCase().includes(query)) ||
        (s.Liga && s.Liga.toLowerCase().includes(query))
      );
    }

    result.sort((a, b) => {
      if (sortOrder === 'asc') return a.MiembroEquipoId - b.MiembroEquipoId;
      return b.MiembroEquipoId - a.MiembroEquipoId;
    });

    return result;
  }, [jugadores, filtroEstatus, searchTerm, sortOrder]);

  const paginatedJugadores = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredJugadores.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredJugadores, currentPage]);

  const stats = React.useMemo(() => {
    const masculinos = jugadores.filter(j => {
      const sexo = j.Sexo?.toLowerCase() || '';
      return sexo.includes('masculino') || sexo.includes('hombre') || sexo === 'h';
    }).length;

    const femeninos = jugadores.filter(j => {
      const sexo = j.Sexo?.toLowerCase() || '';
      return sexo.includes('femenino') || sexo.includes('mujer') || sexo === 'm';
    }).length;

    return {
      total: jugadores.length,
      hombres: masculinos,
      mujeres: femeninos,
      activos: jugadores.filter(j => j.Estatus === true).length,
      inactivos: jugadores.filter(j => j.Estatus === false).length,
      conNUI: jugadores.filter(j => j.NUI && j.NUI !== 'N/A' && j.NUI.trim() !== '').length,
      sinNUI: jugadores.filter(j => !j.NUI || j.NUI === 'N/A' || j.NUI.trim() === '').length,
    };
  }, [jugadores]);

  const resolverSolicitudIdJugador = async (jugador) =>
    getJugadorSolicitudDocumento(jugador.MiembroEquipoId);

  const manejarSubidaDocumento = async (jugador, tipoDocumentoId, archivo, solicitudId) => {
    if (!jugador?.PersonaId) {
      Swal.fire('Error', 'No se pudo identificar al jugador para subir el documento.', 'error');
      return;
    }

    const ejecutarSubida = async (fileParaSubir) => {
      try {
        Swal.fire({
          title: 'Subiendo documento...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });

        const solicitudIdFinal =
          solicitudId ?? (await resolverSolicitudIdJugador(jugador));

        await subirDocumentoJugador(
          jugador.PersonaId,
          tipoDocumentoId,
          fileParaSubir,
          Number(solicitudIdFinal)
        );
        Swal.close();
        await handleDescargarDocs(jugador);
      } catch (err) {
        console.error(err);
        const msg = err?.response?.data?.detail || 'No se pudo subir el documento.';
        Swal.fire('Error', msg, 'error');
      }
    };

    // Si el tipo de documento es Fotografía (ID: 25), aplicamos validación
    if (Number(tipoDocumentoId) === 25) {
      Swal.fire({
        title: 'Validando Fotografía...',
        html: 'Verificando formato y calidad.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });

      try {
        const activeName = jugador.NombreCompleto || `${jugador.Nombre || ''} ${jugador.PrimerApellido || ''} ${jugador.SegundoApellido || ''}`.trim().toUpperCase();
        const data = await validarFotografia(archivo, "JUGADOR", {
          target_persona_id: jugador.PersonaId,
          target_nombre: activeName,
          target_curp: jugador.CURP || jugador.Curp,
          equipo_id: jugador.EquipoId || jugador.EquipoID
        });
        await registerSuccessfulScanAttempt({ attemptsRef: successfulScanCountsRef, scanKey: `documento-${tipoDocumentoId}`, Swal });
        if (data.valido) {
          // Convertir base64 a File
          const byteCharacters = atob(data.imagen);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const archivoValidado = new File([byteArray], "foto_validada.jpg", {
            type: data.tipo_imagen
          });

          await Swal.fire({
            title: 'Fotografía válida',
            text: 'La fotografía cumple con los criterios establecidos.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });

          await ejecutarSubida(archivoValidado);
        } else {
          const result = await Swal.fire({
            title: 'Error en fotografía',
            text: `${data.mensaje || 'La foto no cumple con los requisitos.'} ¿Quieres subir la foto de todas formas?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, cargar igualmente',
            cancelButtonText: 'No, intentar de nuevo',
            confirmButtonColor: COLORS.primary,
            cancelButtonColor: COLORS.slate300
          });

          if (result.isConfirmed) {
            await ejecutarSubida(archivo);
          } else {
            // Reabrir panel de documentos
            await handleDescargarDocs(jugador);
          }
        }
      } catch (err) {
        const result = await Swal.fire({
          title: 'Error en fotografía',
          text: `${err.message || 'No se pudo procesar la fotografía.'} ¿Quieres subir la foto de todas formas?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Sí, cargar igualmente',
          cancelButtonText: 'No, intentar de nuevo',
          confirmButtonColor: COLORS.primary,
          cancelButtonColor: COLORS.slate300
        });

        if (result.isConfirmed) {
          await ejecutarSubida(archivo);
        } else {
          // Reabrir panel de documentos
          await handleDescargarDocs(jugador);
        }
      }
    } else {
      // Cualquier otro tipo de documento se sube directamente
      await ejecutarSubida(archivo);
    }
  };

  const mostrarModalDocumentos = (jugador, documentos, solicitudId) => {
    const listaDocumentos = Array.isArray(documentos) ? documentos : (documentos?.documentos || []);
    const htmlCardsRequeridos = TIPOS_DOCUMENTO_JUGADOR_REQUERIDOS.map((tipo) => {
      const documento = obtenerDocumentoMasRecientePorTipo(listaDocumentos, tipo.id);
      return construirCardDocumentoHtml(tipo, documento);
    }).join('');

    const htmlCardsOpcionales = TIPOS_DOCUMENTO_OPCIONALES.map((tipo) => {
      const documento = obtenerDocumentoMasRecientePorTipo(listaDocumentos, tipo.id);
      if (!documento) return '';
      return construirCardDocumentoHtml(tipo, documento);
    }).join('');

    const htmlCards = htmlCardsRequeridos + htmlCardsOpcionales;

    const modalId = 'modalDocumentosBootstrap';
    let modalEl = document.getElementById(modalId);
    if (modalEl) {
      modalEl.remove();
    }

    modalEl = document.createElement('div');
    modalEl.id = modalId;
    modalEl.className = 'modal fade';
    modalEl.tabIndex = -1;
    modalEl.setAttribute('aria-hidden', 'true');

    modalEl.innerHTML = `
      <div class="modal-dialog modal-dialog-centered" style="max-width: min(860px, 95vw);">
        <div class="modal-content">
          <div class="modal-header" style="border-bottom: none; padding-bottom: 0;">
            <h5 class="modal-title" style="font-size: 1.875em; font-weight: 600; text-align: center; width: 100%; color: ${COLORS.neutral500}; padding-left: 32px;">Documentos de ${jugador.NombreCompleto}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body" style="padding-top: 0;">
            <style>
              .doc-card-container {
                max-height: 480px;
                overflow-y: auto;
                padding: 8px 6px;
                margin-top: 10px;
              }
              .doc-card-container::-webkit-scrollbar {
                width: 6px;
              }
              .doc-card-container::-webkit-scrollbar-track {
                background: ${COLORS.slate50};
                border-radius: 10px;
              }
              .doc-card-container::-webkit-scrollbar-thumb {
                background: ${COLORS.slate300};
                border-radius: 10px;
              }
              .doc-card-container::-webkit-scrollbar-thumb:hover {
                background: ${COLORS.slate400};
              }
              body, .main-header-fixed {
                padding-right: 0 !important;
              }
            </style>
            <div class="doc-card-container">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 20px;">
                ${htmlCards}
              </div>
            </div>
          </div>
          <div class="modal-footer" style="border-top: none; justify-content: center; gap: 10px; padding-bottom: 20px;">
            <button type="button" class="btn text-white" data-bs-dismiss="modal" style="background-color: ${COLORS.primary}; border: none; padding: 10px 24px; font-weight: 500; border-radius: 0.25em;">Cerrar</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modalEl);
    const bsModal = new bootstrap.Modal(modalEl);

    // Interceptar clics en los enlaces de documentos para cargarlos de forma segura
    modalEl.addEventListener('click', async (e) => {
      const enlace = e.target.closest('a');
      if (enlace && enlace.getAttribute('href')) {
        const href = enlace.getAttribute('href');
        // Si es un path relativo que apunta a /documentos o /uploads
        if (href !== '#' && !href.startsWith('http') && !href.startsWith('blob:') && !href.startsWith('data:')) {
          e.preventDefault();
          e.stopPropagation();
          try {
            Swal.fire({
              title: 'Cargando documento...',
              allowOutsideClick: false,
              didOpen: () => {
                Swal.showLoading();
              }
            });
            await openSecurePath(href);
            Swal.close();
          } catch (error) {
            Swal.fire('Error', 'No se pudo abrir el documento.', 'error');
          }
        }
      }
    });

    // Botón: Añadir documento faltante
    modalEl.querySelectorAll('[data-add-doc]').forEach((boton) => {
      boton.addEventListener('click', () => {
        const tipoId = Number(boton.getAttribute('data-add-doc'));
        if (tipoId === 25) {
          Swal.fire({
            title: 'Selecciona una opción',
            text: '¿Cómo deseas cargar la fotografía?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: '📷 Tomar con cámara',
            cancelButtonText: '📁 Subir archivo',
            confirmButtonColor: COLORS.primary,
            cancelButtonColor: COLORS.slate500
          }).then((result) => {
            if (result.isConfirmed) {
              bsModal.hide();
              setCameraTargetJugador(jugador);
              setCameraTargetSolicitudId(solicitudId);
              setIsCameraOpen(true);
            } else if (result.dismiss === Swal.DismissReason.cancel) {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.pdf,.jpg,.jpeg,.png';
              input.style.display = 'none';
              input.onchange = (e) => {
                const archivo = e.target.files?.[0];
                if (archivo) {
                  if (!validarArchivoDoc(archivo)) {
                    Swal.fire({ title: 'Tipo de archivo no permitido', text: 'Solo se aceptan archivos PDF, JPG, JPEG o PNG.', icon: 'error', confirmButtonColor: COLORS.primary });
                    return;
                  }
                  bsModal.hide();
                  manejarSubidaDocumento(jugador, tipoId, archivo, solicitudId);
                }
              };
              document.body.appendChild(input);
              input.click();
              input.remove();
            }
          });
        } else {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.pdf,.jpg,.jpeg,.png';
          input.style.display = 'none';
          input.onchange = (e) => {
            const archivo = e.target.files?.[0];
            if (archivo) {
              if (!validarArchivoDoc(archivo)) {
                Swal.fire({ title: 'Tipo de archivo no permitido', text: 'Solo se aceptan archivos PDF, JPG, JPEG o PNG.', icon: 'error', confirmButtonColor: COLORS.primary });
                return;
              }
              bsModal.hide();
              manejarSubidaDocumento(jugador, tipoId, archivo, solicitudId);
            }
          };
          document.body.appendChild(input);
          input.click();
          input.remove();
        }
      });
    });

    // Botón: Reemplazar documento existente
    modalEl.querySelectorAll('[data-replace-doc]').forEach((boton) => {
      boton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const tipoId = Number(boton.getAttribute('data-replace-doc'));
        if (tipoId === 25) {
          Swal.fire({
            title: 'Selecciona una opción',
            text: '¿Cómo deseas cargar la fotografía?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: '📷 Tomar con cámara',
            cancelButtonText: '📁 Subir archivo',
            confirmButtonColor: COLORS.primary,
            cancelButtonColor: COLORS.slate500
          }).then((result) => {
            if (result.isConfirmed) {
              bsModal.hide();
              setCameraTargetJugador(jugador);
              setCameraTargetSolicitudId(solicitudId);
              setIsCameraOpen(true);
            } else if (result.dismiss === Swal.DismissReason.cancel) {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.pdf,.jpg,.jpeg,.png';
              input.style.display = 'none';
              input.onchange = (ev) => {
                const archivo = ev.target.files?.[0];
                if (archivo) {
                  if (!validarArchivoDoc(archivo)) {
                    Swal.fire({ title: 'Tipo de archivo no permitido', text: 'Solo se aceptan archivos PDF, JPG, JPEG o PNG.', icon: 'error', confirmButtonColor: COLORS.primary });
                    return;
                  }
                  bsModal.hide();
                  manejarSubidaDocumento(jugador, tipoId, archivo, solicitudId);
                }
              };
              document.body.appendChild(input);
              input.click();
              input.remove();
            }
          });
        } else {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.pdf,.jpg,.jpeg,.png';
          input.style.display = 'none';
          input.onchange = (ev) => {
            const archivo = ev.target.files?.[0];
            if (archivo) {
              if (!validarArchivoDoc(archivo)) {
                Swal.fire({ title: 'Tipo de archivo no permitido', text: 'Solo se aceptan archivos PDF, JPG, JPEG o PNG.', icon: 'error', confirmButtonColor: COLORS.primary });
                return;
              }
              bsModal.hide();
              manejarSubidaDocumento(jugador, tipoId, archivo, solicitudId);
            }
          };
          document.body.appendChild(input);
          input.click();
          input.remove();
        }
      });
    });

    attachActionButtonListeners(modalEl);

    modalEl.addEventListener('hidden.bs.modal', () => {
      modalEl.remove();
      // Limpieza manual de los efectos secundarios de Bootstrap en el DOM
      document.body.style.paddingRight = '';
      document.body.classList.remove('modal-open');
      const fixedEls = document.querySelectorAll('.main-header-fixed, .fixed-top, .sticky-top');
      fixedEls.forEach(el => {
        el.style.paddingRight = '';
      });
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      loadJugadoresSilencioso();
    });

    bsModal.show();
  };

  const handleDescargarDocs = async (jugador) => {
    const originalOverflow = document.body.style.overflow;
    try {
      document.body.style.overflow = 'hidden';
      Swal.fire({
        title: 'Cargando documentos...',
        text: 'Buscando archivos en el sistema',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const [docs, solicitudId] = await Promise.all([
        getJugadorDocumentos(jugador.MiembroEquipoId),
        getJugadorSolicitudDocumento(jugador.MiembroEquipoId),
      ]);
      document.body.style.overflow = originalOverflow;
      Swal.close();
      mostrarModalDocumentos(jugador, docs, solicitudId);
    } catch (err) {
      document.body.style.overflow = originalOverflow;
      console.error(err);
      Swal.fire('Error', 'No se pudieron obtener los documentos del jugador.', 'error');
    }
  };

  const handleExportar = async (jugador) => {
    try {
      Swal.fire({
        title: 'Generando expediente...',
        text: 'Preparando archivos del jugador',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const response = await exportarJugadorDocumentos(jugador.MiembroEquipoId);

      const blob = new Blob([response.data], { type: 'application/zip' });

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;

      // Nombre del archivo
      const nombreJugador = (jugador.NombreCompleto || 'jugador')
        .trim()
        .replace(/[\\/:*?"<>|]+/g, '')
        .replace(/\s+/g, '_');
      const nombre = `expediente_${nombreJugador}.zip`;
      a.download = nombre;

      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);

      Swal.close();

    } catch (error) {
      console.error("Error exportando:", error);
      Swal.fire('Error', 'No se pudo generar el expediente', 'error');
    }
  };

  const handleEditarJugador = (jugador) => {
    setJugadorEdicion(jugador);
    setFotoJugadorEdicion(null);
    setDatosEditables({
      nombre: jugador.Nombre || '',
      primerApellido: jugador.PrimerApellido || '',
      segundoApellido: jugador.SegundoApellido || '',
      curp: jugador.CURP || '',
      email: jugador.Email || '',
      sexo: jugador.Sexo === 'Hombre' ? 'Masculino' : (jugador.Sexo === 'Mujer' ? 'Femenino' : (jugador.Sexo || '')),
      fechaNacimiento: jugador.FechaNacimiento ? jugador.FechaNacimiento.split('T')[0] : '',
      NUI: jugador.NUI || '',
      estatus: jugador.Estatus ? '1' : '0',
      numeroCamiseta: jugador.NumeroCamiseta !== undefined && jugador.NumeroCamiseta !== null ? jugador.NumeroCamiseta : '',
      rolEnEquipo: jugador.RolEnEquipo !== undefined && jugador.RolEnEquipo !== null ? jugador.RolEnEquipo : '',
      seguroNombre: jugador.SeguroNombre || 'Sin seguro asignado',
      inicioSeguro: jugador.InicioSeguro ? jugador.InicioSeguro.split('T')[0] : '',
      vigencia: jugador.Vigencia ? jugador.Vigencia.split('T')[0] : '',
      isCurpInvalid: false
    });
    setHaCambiado(false);
    setOcrCargando(false);
    setModalEdicion(true);

    // Obtener documentos del jugador en background para extraer su fotografía si existe
    getJugadorDocumentos(jugador.MiembroEquipoId)
      .then((res) => {
        const docs = Array.isArray(res) ? res : (res?.documentos || []);
        const docFoto = obtenerDocumentoMasRecientePorTipo(docs, 25);
        if (docFoto) {
          const urlFoto = obtenerUrlDocumento(docFoto);
          setFotoJugadorEdicion(urlFoto);
        }
      })
      .catch((err) => {
        console.error("Error cargando foto del jugador:", err);
      });
  };

  const ALLOWED_TYPES_DOC = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  const ALLOWED_EXT_DOC = ['.pdf', '.jpg', '.jpeg', '.png'];

  const validarArchivoDoc = (file) => {
    if (!file) return false;
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    return ALLOWED_TYPES_DOC.includes(file.type) && ALLOWED_EXT_DOC.includes(ext);
  };

  // PROCESAR OCR PARA EL MODAL DE EDICIÓN
  const handleOcrModalUpload = async (file) => {
    if (!file) return;
    if (!validarArchivoDoc(file)) {
      Swal.fire({
        title: 'Tipo de archivo no permitido',
        text: 'Solo se aceptan archivos PDF, JPG, JPEG o PNG.',
        icon: 'error',
        confirmButtonColor: COLORS.primary
      });
      return;
    }
    setOcrCargando(true);
    Swal.fire({
      title: 'Analizando documento...',
      html: 'Extrayendo información. Por favor espere.',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading()
    });
    try {
      const formDataOcr = new FormData();
      formDataOcr.append('file_id', file);
      const token = localStorage.getItem('token') || sessionStorage.getItem('temp_token');
      const response = await fetch(`${API_BASE}/documentos/ocr`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataOcr
      });
      if (!response.ok) throw new Error('Error al conectar');
      await registerSuccessfulScanAttempt({ attemptsRef: successfulScanCountsRef, scanKey: 'ocr-modal-edicion', Swal });

      const htmlText = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');

      const cleanVal = (val) => {
        if (!val) return '';
        const cleaned = val.trim();
        const lower = cleaned.toLowerCase();
        if (lower === 'no detectado' || lower === 'no detectada' || lower === 'sin anotaciones' || lower === 'vacio') {
          return '';
        }
        return cleaned;
      };

      let nombreEncontrado = '';
      let nombresEncontrados = '';
      let apellidoPaternoEncontrado = '';
      let apellidoMaternoEncontrado = '';
      let curpEncontrada = '';
      let fechaNacEncontrada = '';
      let verificacionRenapo = '';

      const rows = doc.querySelectorAll('.dato-fila');
      rows.forEach(row => {
        const label = row.querySelector('.etiqueta')?.textContent?.toLowerCase() || '';
        const value = cleanVal(row.querySelector('.valor')?.textContent);

        if (!value) return;

        if (label.includes('nombres')) {
          nombresEncontrados = value;
        } else if (label.includes('nombre completo') || label === 'nombre') {
          nombreEncontrado = value;
        } else if (label.includes('nombre')) {
          if (!nombresEncontrados) nombresEncontrados = value;
        }

        if (label.includes('apellido paterno') || label.includes('paterno')) {
          apellidoPaternoEncontrado = value;
        }
        if (label.includes('apellido materno') || label.includes('materno')) {
          apellidoMaternoEncontrado = value;
        }

        if (label.includes('curp')) curpEncontrada = value;
        if (label.includes('verificación renapo') || label.includes('renapo')) {
          verificacionRenapo = value;
        }
        if ((label.includes('nacimiento') && !label.includes('lugar')) || label.includes('fecha nac')) {
          let finalDate = value;
          if (value.includes('/')) {
            const p = value.split('/');
            if (p.length === 3) {
              finalDate = p[2].length === 4 ? `${p[2]}-${p[1]}-${p[0]}` : `${p[0]}-${p[1]}-${p[2]}`;
            }
          }
          fechaNacEncontrada = finalDate;
        }
      });

      const curpOriginalCapturada = curpEncontrada;
      const curpNoValida = (verificacionRenapo === 'RECHAZADO');

      // Fallback: buscar en texto plano si los selectores no devuelven nada
      if (!nombresEncontrados && !apellidoPaternoEncontrado && !nombreEncontrado && !curpEncontrada) {
        const textoCompleto = doc.body?.innerText || '';
        const curpMatch = textoCompleto.match(/[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d/i);
        if (curpMatch && !curpNoValida) curpEncontrada = curpMatch[0].toUpperCase();
      }

      if (nombresEncontrados || apellidoPaternoEncontrado || apellidoMaternoEncontrado || nombreEncontrado || curpEncontrada || fechaNacEncontrada) {
        let firstName = '', lastNameP = '', lastNameM = '';

        if (nombresEncontrados || apellidoPaternoEncontrado || apellidoMaternoEncontrado) {
          firstName = nombresEncontrados;
          lastNameP = apellidoPaternoEncontrado;
          lastNameM = apellidoMaternoEncontrado;
        } else if (nombreEncontrado) {
          const parts = nombreEncontrado.split(' ');
          if (parts.length === 4) {
            firstName = parts.slice(0, 2).join(' ');
            lastNameP = parts[2];
            lastNameM = parts[3];
          } else if (parts.length === 3) {
            firstName = parts[0];
            lastNameP = parts[1];
            lastNameM = parts[2];
          } else if (parts.length === 2) {
            firstName = parts[0];
            lastNameP = parts[1];
          } else {
            firstName = nombreEncontrado;
          }
        }

        setDatosEditables(prev => ({
          ...prev,
          ...(firstName && { nombre: firstName }),
          ...(lastNameP && { primerApellido: lastNameP }),
          ...(lastNameM && { segundoApellido: lastNameM }),
          curp: curpOriginalCapturada || '',
          isCurpInvalid: curpNoValida,
          ...(fechaNacEncontrada && { fechaNacimiento: fechaNacEncontrada })
        }));
        setHaCambiado(true);

        if (curpNoValida) {
          Swal.fire({
            title: 'CURP no validada',
            text: `La CURP ${curpOriginalCapturada} ingresada no fue validada. Revisa si el documento es correcto.`,
            icon: 'warning',
            confirmButtonColor: COLORS.primary || '#1a3b5c'
          });
        } else {
          Swal.fire({ title: '¡Lectura exitosa!', text: `Se detectó: ${nombreEncontrado || curpEncontrada}`, icon: 'success', timer: 2000, showConfirmButton: false });
        }
      } else {
        throw new Error('No se detectaron datos legibles en este documento.');
      }
    } catch (err) {
      console.error('Error al leer el documento:', err);
      Swal.fire('Aviso', 'No se pudo extraer la información automáticamente. Ingresa los datos manualmente una vez que el OCR los actualice.', 'info');
    } finally {
      setOcrCargando(false);
    }
  };

  const handleCerrarModal = () => {
    if (haCambiado) {
      Swal.fire({
        title: '¿Estás seguro de salir?',
        text: "Tienes cambios sin guardar que se perderán.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: COLORS.danger,
        cancelButtonColor: COLORS.slate500,
        confirmButtonText: 'Sí, salir sin guardar',
        cancelButtonText: 'Volver a la edición'
      }).then((result) => {
        if (result.isConfirmed) {
          setModalEdicion(false);
        }
      });
    } else {
      setModalEdicion(false);
    }
  };

  const manejarCambioInput = (e) => {
    const { name, value } = e.target;
    setDatosEditables(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'curp') {
        updated.isCurpInvalid = false;
      }
      return updated;
    });
    setHaCambiado(true);
  };

  const manejarGuardarJugador = async () => {
    if (!datosEditables.nombre || !datosEditables.primerApellido || !datosEditables.curp) {
      Swal.fire('Campos obligatorios', 'Nombre, primer apellido y CURP son requeridos.', 'warning');
      return;
    }

    if (datosEditables.curp && datosEditables.curp.length !== 18) {
      Swal.fire('CURP inválida', 'La CURP debe tener exactamente 18 caracteres.', 'warning');
      return;
    }

    if (datosEditables.inicioSeguro) {
      const inicio = new Date(datosEditables.inicioSeguro);
      if (inicio.getFullYear() > 2099) {
        Swal.fire('Año inválido', 'La fecha de inicio de seguro no puede rebasar el año 2099.', 'warning');
        return;
      }
    }

    if (datosEditables.vigencia) {
      const fin = new Date(datosEditables.vigencia);
      if (fin.getFullYear() > 2099) {
        Swal.fire('Año inválido', 'La fecha de fin (vigencia) no puede rebasar el año 2099.', 'warning');
        return;
      }
    }

    if (datosEditables.inicioSeguro && datosEditables.vigencia) {
      const inicio = new Date(datosEditables.inicioSeguro);
      const fin = new Date(datosEditables.vigencia);
      if (fin <= inicio) {
        Swal.fire('Fechas de seguro inválidas', 'La fecha de fin (vigencia) debe ser posterior a la fecha de inicio del seguro.', 'warning');
        return;
      }
    }

    try {
      setGuardando(true);
      await updateJugador(jugadorEdicion.MiembroEquipoId, {
        nombre: datosEditables.nombre,
        primerApellido: datosEditables.primerApellido,
        segundoApellido: datosEditables.segundoApellido,
        curp: datosEditables.curp,
        email: datosEditables.email,
        sexo: datosEditables.sexo,
        fechaNacimiento: datosEditables.fechaNacimiento,
        NUI: datosEditables.NUI,
        estatus: datosEditables.estatus,
        numeroCamiseta: datosEditables.numeroCamiseta,
        rolEnEquipo: datosEditables.rolEnEquipo,
        inicioSeguro: datosEditables.inicioSeguro,
        vigencia: datosEditables.vigencia
      });

      Swal.fire('¡Éxito!', 'Información del jugador actualizada correctamente.', 'success');
      setModalEdicion(false);
      loadJugadores(true);
    } catch (error) {
      console.error(error);
      const msg = error?.response?.data?.detail || 'No se pudieron guardar los cambios.';
      Swal.fire('Error', msg, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const columns = [
    { key: "MiembroEquipoId", label: "ID" },
    { key: "NombreCompleto", label: "Jugador" },
    { key: "NUI", label: "NUI" },
    { key: "Sexo", label: "Sexo" },
    { key: "EquipoLiga", label: "Equipo actual", style: { width: '340px' } },
    { key: "FechaIngreso", label: "Fecha ingreso" },
    { key: "Estatus", label: "Estatus" },
    { key: "Acciones", label: "Acciones" }
  ];

  const dataTransformada = paginatedJugadores.map(j => ({
    MiembroEquipoId: <span style={{ fontWeight: '700', color: COLORS.slate500 }}>#{j.MiembroEquipoId}</span>,
    NombreCompleto: (
      <div>
        <div style={{ fontWeight: '800', color: COLORS.slate800 }}>{j.NombreCompleto}</div>
        <div style={{ fontSize: '11px', color: COLORS.slate500 }}>{j.Email || 'Sin correo registrado'}</div>
      </div>
    ),
    NUI: j.NUI ? (
      <span style={{ fontFamily: 'monospace', fontSize: '12px', background: COLORS.secondaryBg, color: COLORS.secondary, padding: '3px 8px', borderRadius: '6px', fontWeight: '700' }}>{j.NUI}</span>
    ) : (
      <span style={{ fontSize: '11px', color: COLORS.slate400, fontStyle: 'italic' }}>Sin NUI</span>
    ),
    Sexo: <span style={{ fontSize: '13px', color: COLORS.slate600, fontWeight: '600' }}>{j.Sexo || 'N/A'}</span>,
    EquipoLiga: (
      <div style={{ maxWidth: '340px' }}>
        {j.EquipoId ? (
          <div
            style={{
              fontWeight: '700',
              fontSize: '14px',
              color: COLORS.primary,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`${ROUTES.ADMIN.EQUIPOS}?abrirDetalle=${j.EquipoId}`);
            }}
            title="Ver detalle del equipo"
          >
            {j.EquipoNombre}
          </div>
        ) : (
          <div style={{ fontWeight: '700', fontSize: '14px', color: COLORS.slate500 }}>{j.EquipoNombre || 'Sin equipo'}</div>
        )}
        <div style={{ fontSize: '12px', color: COLORS.slate500 }}>{j.Liga}</div>
      </div>
    ),
    FechaIngreso: <span style={{ fontSize: '12px' }}>{new Date(j.FechaIngreso).toLocaleDateString()}</span>,
    Estatus: j.Estatus ?
      <span className="badge" style={{ background: COLORS.successBg, color: COLORS.successDark, border: `1px solid ${COLORS.successBgDark}` }}>ACTIVO</span> :
      <span className="badge" style={{ background: COLORS.dangerBgLight, color: COLORS.dangerDark, border: `1px solid ${COLORS.dangerBgMedium}` }}>BAJA</span>,
    Acciones: (
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          className="btn btn-sm"
          style={{ padding: '8px 14px', fontSize: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', background: COLORS.slate200, color: COLORS.slate600, border: 'none', fontWeight: '700' }}
          onClick={() => handleDescargarDocs(j)}
          title="Ver documentos"
        >
          <FaFileDownload /> Docs
        </button>
        <button
          className="btn btn-sm"
          style={{
            padding: '8px 14px',
            fontSize: '12px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: j.DocumentosAprobados ? COLORS.secondaryBg : COLORS.slate100,
            color: j.DocumentosAprobados ? COLORS.secondary : COLORS.slate400,
            border: 'none',
            fontWeight: '700',
            cursor: j.DocumentosAprobados ? 'pointer' : 'not-allowed'
          }}
          disabled={!j.DocumentosAprobados}
          onClick={() => handleExportar(j)}
          title={j.DocumentosAprobados ? "Exportar como ZIP" : "Todos los documentos deben estar aprobados para poder exportar"}
        >
          <FaFileArchive /> Exportar
        </button>
        <button
          className="btn btn-sm btn-primary"
          style={{ padding: '8px 14px', fontSize: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}
          onClick={() => handleEditarJugador(j)}
        >
          <FaEdit />
        </button>
      </div>
    )
  }));


  if (loading) {
    return <Loader text="Cargando catálogo de jugadores..." />;
  }

  return (
    <div className="dashboard-content">
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .swal2-container {
          z-index: 11000 !important;
        }
        .aj-ocr-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 768px) {
          .aj-ocr-grid {
            grid-template-columns: 1fr !important;
          }
          /* Grid inside sweetalert document modal */
          .swal2-html-container div[style*="display: grid"] {
            grid-template-columns: 1fr !important;
          }
          /* Custom styles for Swal cards to be readable in portrait */
          .swal2-html-container a {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            text-align: left !important;
            gap: 12px !important;
            width: 100% !important;
          }
          .swal2-html-container div[data-doc-card-id] {
            aspect-ratio: auto !important;
            min-height: auto !important;
            padding: 12px !important;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }
        }
      `}</style>
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
          <span className="alert-icon">⚠️</span>
          <div className="alert-content">
            <p className="alert-message">{error}</p>
          </div>
        </div>
      )}

      <div className="section-header" style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="section-title" style={{ fontSize: '22px', fontWeight: '800', color: COLORS.slate800, margin: 0 }}>Catálogo de jugadores registrados</h2>
          <p style={{ margin: 0, fontSize: '14px', color: COLORS.slate500, marginTop: '4px' }}>Visualiza y gestiona jugadores.</p>
        </div>
        <div className="section-actions" style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn btn-primary"
            onClick={() => navigate(ROUTES.ADMIN.LAYOUT_JUGADORES)}
            style={{ padding: '10px 20px', backgroundColor: 'white', color: COLORS.slate700, border: `1.5px solid ${COLORS.slate200}`, borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FaTable /> Tabla de jugadores
          </button>
          {/*<button
            className="btn btn-premium"
            onClick={() => navigate(ROUTES.ADMIN.JUGADORES_CREAR)}
            style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <FaPlus /> Registrar jugador
          </button>*/}
        </div>
      </div>

      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        {/* TARJETA TOTAL */}
        <div
          onClick={() => setFiltroEstatus('todos')}
          style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            border: filtroEstatus === 'todos' ? `2px solid ${COLORS.primary}` : `1px solid ${COLORS.slate200}`,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: filtroEstatus === 'todos' ? `0 4px 12px ${COLORS.primaryBgTranslucent}` : 'none',
            transform: filtroEstatus === 'todos' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '5px', color: COLORS.primary }}><FaUsers /></div>
          <div style={{ fontSize: '12px', color: COLORS.slate500, fontWeight: '700' }}>TOTAL JUGADORES</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: COLORS.slate800 }}>{stats.total}</div>
        </div>

        {/* TARJETA ACTIVOS */}
        <div
          onClick={() => setFiltroEstatus('activos')}
          style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            border: filtroEstatus === 'activos' ? `2px solid ${COLORS.success}` : `1px solid ${COLORS.slate200}`,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: filtroEstatus === 'activos' ? `0 4px 12px ${COLORS.successBgTranslucent}` : 'none',
            transform: filtroEstatus === 'activos' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '5px', color: COLORS.success }}><FaCheckCircle /></div>
          <div style={{ fontSize: '12px', color: COLORS.slate500, fontWeight: '700' }}>JUGADORES ACTIVOS</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: COLORS.success }}>{stats.activos}</div>
        </div>

        {/* TARJETA INACTIVOS */}
        <div
          onClick={() => setFiltroEstatus('inactivos')}
          style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            border: filtroEstatus === 'inactivos' ? `2px solid ${COLORS.danger}` : `1px solid ${COLORS.slate200}`,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: filtroEstatus === 'inactivos' ? `0 4px 12px ${COLORS.dangerBgTranslucent}` : 'none',
            transform: filtroEstatus === 'inactivos' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '5px', color: COLORS.danger }}><FaTimesCircle /></div>
          <div style={{ fontSize: '12px', color: COLORS.slate500, fontWeight: '700' }}>JUGADORES INACTIVOS</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: COLORS.danger }}>{stats.inactivos}</div>
        </div>

        {/* TARJETA HOMBRES */}
        <div
          onClick={() => setFiltroEstatus('hombres')}
          style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            border: filtroEstatus === 'hombres' ? `2px solid ${COLORS.blue}` : `1px solid ${COLORS.slate200}`,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: filtroEstatus === 'hombres' ? `0 4px 12px ${COLORS.blueTranslucent15}` : 'none',
            transform: filtroEstatus === 'hombres' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '5px', color: COLORS.blue }}><FaMale /></div>
          <div style={{ fontSize: '12px', color: COLORS.slate500, fontWeight: '700' }}>MASCULINO</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: COLORS.blue }}>{stats.hombres}</div>
        </div>

        {/* TARJETA MUJERES */}
        <div
          onClick={() => setFiltroEstatus('mujeres')}
          style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            border: filtroEstatus === 'mujeres' ? `2px solid ${COLORS.rose}` : `1px solid ${COLORS.slate200}`,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: filtroEstatus === 'mujeres' ? `0 4px 12px ${COLORS.roseTranslucent15}` : 'none',
            transform: filtroEstatus === 'mujeres' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '5px', color: COLORS.rose }}><FaFemale /></div>
          <div style={{ fontSize: '12px', color: COLORS.slate500, fontWeight: '700' }}>FEMENINO</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: COLORS.rose }}>{stats.mujeres}</div>
        </div>
        {/* TARJETA CON NUI */}
        <div
          onClick={() => setFiltroEstatus('conNUI')}
          style={{
            background: 'white', padding: '20px', borderRadius: '12px',
            border: filtroEstatus === 'conNUI' ? `2px solid ${COLORS.violet}` : `1px solid ${COLORS.slate200}`,
            textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease',
            boxShadow: filtroEstatus === 'conNUI' ? `0 4px 12px ${COLORS.violetTranslucent15}` : 'none',
            transform: filtroEstatus === 'conNUI' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '5px', color: COLORS.violet }}><FaIdCard /></div>
          <div style={{ fontSize: '12px', color: COLORS.slate500, fontWeight: '700' }}>CON NUI</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: COLORS.violet }}>{stats.conNUI}</div>
        </div>

        {/* TARJETA SIN NUI */}
        <div
          onClick={() => setFiltroEstatus('sinNUI')}
          style={{
            background: 'white', padding: '20px', borderRadius: '12px',
            border: filtroEstatus === 'sinNUI' ? `2px solid ${COLORS.warning}` : `1px solid ${COLORS.slate200}`,
            textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease',
            boxShadow: filtroEstatus === 'sinNUI' ? `0 4px 12px ${COLORS.warningBgTranslucent}` : 'none',
            transform: filtroEstatus === 'sinNUI' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '5px', color: COLORS.warning }}><FaExclamationTriangle /></div>
          <div style={{ fontSize: '12px', color: COLORS.slate500, fontWeight: '700' }}>SIN NUI</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: COLORS.warning }}>{stats.sinNUI}</div>
        </div>
      </div>

      <div className="card" style={{ padding: '35px', border: 'none', boxShadow: `0 10px 15px -3px ${COLORS.shadow05}` }}>
        <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', overflow: 'hidden' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>Lista de jugadores</h3>
          </div>

          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', overflowX: 'auto', overflowY: 'hidden', maxWidth: '100%', scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}>
            <SearchBar
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nombre, CURP o correo..."
              width="280px"
            />

            <button onClick={() => loadJugadores(true, true)} className="btn-premium" style={{ padding: '10px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaSyncAlt style={{ animation: tableLoading ? 'spin 1s linear infinite' : 'none' }} />
            </button>

            <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} style={{ background: 'white', border: '1.5px solid var(--border-light)', padding: '10px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.slate600 }}>
              {sortOrder === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />} {sortOrder === 'asc' ? 'ASC' : 'DEC'}
            </button>

            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-main)', padding: '5px', borderRadius: '14px', border: '1.5px solid var(--border-light)' }}>
              {['todos', 'activos', 'inactivos', 'hombres', 'mujeres', 'conNUI', 'sinNUI'].map((val) => (
                <button key={val} onClick={() => setFiltroEstatus(val)} style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: filtroEstatus === val ? 'white' : 'transparent', color: filtroEstatus === val ? 'var(--primary)' : 'var(--text-muted)', boxShadow: filtroEstatus === val ? 'var(--shadow-sm)' : 'none', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>
                  {val === 'todos' ? 'Todos' : (val === 'activos' ? 'Activos' : (val === 'inactivos' ? 'Inactivos' : (val === 'hombres' ? 'Hombres' : (val === 'mujeres' ? 'Mujeres' : (val === 'conNUI' ? 'Con NUI' : 'Sin NUI')))))}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DashboardTable
          columns={columns}
          data={dataTransformada}
          isLoading={loading || tableLoading}
          totalItems={filteredJugadores.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          emptyMessage="No se encontraron jugadores con los criterios de búsqueda."
        />
      </div>

      {/* MODAL DE EDICIÓN PROFESIONAL */}
      <Modal
        estaAbierto={modalEdicion}
        alCerrar={handleCerrarModal}
        titulo="Detalle y edición del jugador"
        tamanio="grande"
        bloquearCierreFondo={true}
        pie={
          <>
            <BotonSecundario etiqueta="Cancelar" onClick={handleCerrarModal} />
            <BotonPrimario
              etiqueta={guardando ? 'Guardando...' : 'Guardar cambios'}
              onClick={manejarGuardarJugador}
              deshabilitado={guardando || ocrCargando}
              icono={<FaSave />}
            />
          </>
        }
      >
        <div style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
          {/* FOTO DEL JUGADOR Y CABECERA */}
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', background: 'white', padding: '20px', borderRadius: '16px', border: `1px solid ${COLORS.slate200}`, boxShadow: `0 4px 6px -1px ${COLORS.shadow05}` }}>
            <div style={{ width: '100px', height: '100px', borderRadius: '20px', overflow: 'hidden', flexShrink: 0, border: `2px solid ${COLORS.slate200}`, background: COLORS.slate50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {!mostrarFallback ? (
                <img
                  src={avatarBlobUrl}
                  alt="Foto del jugador"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={() => setImgError(true)}
                />
              ) : (
                <FaUser
                  className="fallback-icon"
                  style={{ fontSize: '40px', color: COLORS.slate300 }}
                />
              )}
            </div>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '800', color: COLORS.slate800 }}>
                {datosEditables.nombre} {datosEditables.primerApellido} {datosEditables.segundoApellido}
              </h3>
              <div style={{ margin: 0, fontSize: '13px', color: COLORS.slate500, fontWeight: '600', display: 'flex', gap: '5px', alignItems: 'center' }}>
                <span>{datosEditables.curp || 'CURP NO REGISTRADA'}</span>
                <span>•</span>
                {jugadorEdicion?.EquipoId ? (
                  <span
                    style={{ color: COLORS.primary, cursor: 'pointer', textDecoration: 'underline' }}
                    title="Ver detalle del equipo"
                    onClick={() => {
                      setModalEdicion(false);
                      navigate(`${ROUTES.ADMIN.EQUIPOS}?abrirDetalle=${jugadorEdicion.EquipoId}`);
                    }}
                  >
                    {jugadorEdicion.EquipoNombre}
                  </span>
                ) : (
                  <span>{jugadorEdicion?.EquipoNombre || 'Sin Equipo'}</span>
                )}
              </div>
              {datosEditables.estatus === '1' ? (
                <span style={{ display: 'inline-block', marginTop: '10px', padding: '4px 10px', background: COLORS.successBg, color: COLORS.successDark, fontSize: '11px', fontWeight: '800', borderRadius: '6px', border: `1px solid ${COLORS.successBgDark}` }}>ACTIVO</span>
              ) : (
                <span style={{ display: 'inline-block', marginTop: '10px', padding: '4px 10px', background: COLORS.dangerBgLight, color: COLORS.dangerDark, fontSize: '11px', fontWeight: '800', borderRadius: '6px', border: `1px solid ${COLORS.dangerBgMedium}` }}>BAJA</span>
              )}
            </div>
          </div>

          {/* PRIMERA FILA: AVISO Y OCR */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {/* AVISO CAMPOS PROTEGIDOS */}
            <div style={{ background: COLORS.secondaryBg, border: `1px solid ${COLORS.secondaryBgDark}`, padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ fontSize: '14px', color: COLORS.secondaryHover }}>Campos Protegidos</strong>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: COLORS.blueDark, lineHeight: '1.6' }}>
                El Nombre, Apellidos y CURP están bloqueados. Solo se actualizan automáticamente subiendo y verificando el Acta de Nacimiento o la INE.
              </p>
            </div>

            {/* CARGA DE DOCUMENTO OFICIAL (OCR) */}
            <div style={{ background: 'white', border: `1px solid ${COLORS.slate200}`, borderRadius: '14px', padding: '20px', boxShadow: `0 4px 6px -1px ${COLORS.shadow05}` }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '800', color: COLORS.slate800 }}>Carga de Documento Oficial</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', border: `1.5px dashed ${COLORS.slate300}`, borderRadius: '12px', padding: '14px', cursor: ocrCargando ? 'not-allowed' : 'pointer', background: COLORS.slate50, transition: 'all 0.2s', opacity: ocrCargando ? 0.6 : 1 }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '12px', color: COLORS.slate700 }}>Acta</div>
                    <div style={{ fontSize: '10px', color: COLORS.slate500 }}>PDF/img</div>
                  </div>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} disabled={ocrCargando} onChange={(e) => { if (e.target.files[0]) handleOcrModalUpload(e.target.files[0]); e.target.value = ''; }} />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', border: `1.5px dashed ${COLORS.slate300}`, borderRadius: '12px', padding: '14px', cursor: ocrCargando ? 'not-allowed' : 'pointer', background: COLORS.slate50, transition: 'all 0.2s', opacity: ocrCargando ? 0.6 : 1 }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '12px', color: COLORS.slate700 }}>INE</div>
                    <div style={{ fontSize: '10px', color: COLORS.slate500 }}>PDF/img</div>
                  </div>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} disabled={ocrCargando} onChange={(e) => { if (e.target.files[0]) handleOcrModalUpload(e.target.files[0]); e.target.value = ''; }} />
                </label>
              </div>
              {ocrCargando && (
                <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '13px', color: COLORS.primary, fontWeight: '600', marginBottom: 0 }}>⏳ Procesando documento...</p>
              )}
            </div>
          </div>

          {/* SEGUNDA FILA: FORMULARIO */}
          <div style={{ background: 'white', border: `1px solid ${COLORS.slate200}`, borderRadius: '14px', padding: '16px 16px 0 16px', boxShadow: `0 4px 6px -1px ${COLORS.shadow05}` }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '800', color: COLORS.slate800, borderBottom: `1px solid ${COLORS.slate200}`, paddingBottom: '8px' }}>Datos del Jugador</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', columnGap: '16px', rowGap: '0', alignItems: 'start' }}>
              <EntradaFormulario etiqueta="Nombre(s) *" valor={datosEditables.nombre} onChange={manejarCambioInput} nombre="nombre" obligatorio placeholder="Se actualiza automáticamente" deshabilitado={true} />
              <EntradaFormulario etiqueta="Primer apellido *" valor={datosEditables.primerApellido} onChange={manejarCambioInput} nombre="primerApellido" obligatorio placeholder="Se actualiza automáticamente" deshabilitado={true} />
              <EntradaFormulario etiqueta="Segundo apellido *" valor={datosEditables.segundoApellido} onChange={manejarCambioInput} nombre="segundoApellido" placeholder="Se actualiza automáticamente" deshabilitado={true} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <EntradaFormulario etiqueta="CURP *" valor={datosEditables.curp} onChange={manejarCambioInput} nombre="curp" obligatorio placeholder="Ingresa o corrige la CURP" deshabilitado={false} />
                {datosEditables.isCurpInvalid && (
                  <span style={{ color: COLORS.danger || '#ef4444', fontSize: '11px', fontWeight: 'bold', marginTop: '-8px', marginBottom: '12px', display: 'block' }}>
                    No se pudo validar la veracidad de esta CURP.
                  </span>
                )}
              </div>

              <EntradaFormulario etiqueta="Fecha de nacimiento" valor={datosEditables.fechaNacimiento} onChange={manejarCambioInput} nombre="fechaNacimiento" tipo="date" />
              <EntradaSeleccion etiqueta="Sexo" valor={datosEditables.sexo} onChange={manejarCambioInput} nombre="sexo" opciones={[{ valor: 'Masculino', etiqueta: 'Masculino' }, { valor: 'Femenino', etiqueta: 'Femenino' }, { valor: 'No Binario', etiqueta: 'Otro' }]} />
              <EntradaFormulario etiqueta="Correo electrónico" valor={datosEditables.email} onChange={manejarCambioInput} nombre="email" tipo="email" placeholder="correo@ejemplo.com" />
              <EntradaFormulario etiqueta="NUI" valor={datosEditables.NUI} onChange={manejarCambioInput} nombre="NUI" />
              <EntradaFormulario etiqueta="Número de camiseta" valor={datosEditables.numeroCamiseta} onChange={manejarCambioInput} nombre="numeroCamiseta" tipo="number" placeholder="Ej. 10" />
              <EntradaSeleccion etiqueta="Rol en equipo" valor={String(datosEditables.rolEnEquipo ?? '')} onChange={manejarCambioInput} nombre="rolEnEquipo" opciones={[{ valor: '', etiqueta: 'Selecciona un rol...' }, ...rolesEquipo.map(r => ({ valor: String(r.id), etiqueta: r.nombre }))]} />
              <EntradaSeleccion etiqueta="Estatus del jugador" valor={datosEditables.estatus} onChange={manejarCambioInput} nombre="estatus" opciones={[{ valor: '1', etiqueta: 'Activo' }, { valor: '0', etiqueta: 'Baja' }]} />
              <EntradaFormulario etiqueta="Seguro asignado" valor={datosEditables.seguroNombre} deshabilitado={true} />
              <EntradaFormulario etiqueta="Inicio seguro" valor={datosEditables.inicioSeguro} onChange={manejarCambioInput} nombre="inicioSeguro" tipo="date" max="2099-12-31" />
              <EntradaFormulario etiqueta="Fin seguro" valor={datosEditables.vigencia} onChange={manejarCambioInput} nombre="vigencia" tipo="date" max="2099-12-31" />
            </div>
          </div>
        </div>
      </Modal>

      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => {
          setIsCameraOpen(false);
          setCameraTargetJugador(null);
          setCameraTargetSolicitudId(null);
        }}
        onCapture={(file) => {
          manejarSubidaDocumento(cameraTargetJugador, 25, file, cameraTargetSolicitudId);
        }}
      />
    </div>
  );
}
