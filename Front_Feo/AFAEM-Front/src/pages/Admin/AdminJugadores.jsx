import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  getJugadoresDirectorio,
  getJugadorDocumentos,
  getJugadorSolicitudDocumento,
  exportarJugadorDocumentos,
  updateDocumentoEstado,
  updateJugador,
  subirDocumentoJugador,
} from '../../services/admin';
import Swal from 'sweetalert2';
import DashboardTable from '../../components/DashboardTable';
import SearchBar from '../../components/Common/SearchBar';
import { FaSearch, FaSyncAlt, FaSortAmountDown, FaSortAmountUp, FaFileDownload, FaFileArchive, FaPlus, FaEdit, FaSave, FaTimes, FaTable, FaUsers, FaCheckCircle, FaTimesCircle, FaMale, FaFemale, FaIdCard, FaExclamationTriangle, FaUser } from 'react-icons/fa';
import { Modal, BotonPrimario, BotonSecundario, EntradaFormulario, EntradaSeleccion } from '../../components/partials';
import { API_BASE } from '../../config/config';
import Loader from '../../components/Loader';

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
  if (doc.url) return doc.url;
  const ruta = doc.RutaArchivo;
  if (!ruta) return null;
  return ruta.startsWith('http') ? ruta : `/${String(ruta).replace(/^\/+/, '')}`;
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
    case 1:
      return {
        texto: 'Espera',
        color: '#92400e',
        bg: '#fef3c7',
        cardBg: 'linear-gradient(180deg, #fef3c7 0%, #fef08a 100%)',
        border: '#f59e0b',
      };
    case 2:
      return {
        texto: 'Aceptado',
        color: '#14532d',
        bg: '#dcfce7',
        cardBg: 'linear-gradient(180deg, #dcfce7 0%, #bbf7d0 100%)',
        border: '#4ade80',
      };
    case 3:
      return {
        texto: 'Rechazado',
        color: '#7f1d1d',
        bg: '#fee2e2',
        cardBg: 'linear-gradient(180deg, #fee2e2 0%, #fecaca 100%)',
        border: '#f87171',
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
  if (estado === 1) {
    acciones.push({ key: 'aceptar', label: 'Aceptar' });
    acciones.push({ key: 'rechazar', label: 'Rechazar' });
  } else if (estado === 2) {
    acciones.push({ key: 'espera', label: 'Poner en espera' });
    acciones.push({ key: 'rechazar', label: 'Rechazar' });
  } else if (estado === 3) {
    acciones.push({ key: 'espera', label: 'Poner en espera' });
    acciones.push({ key: 'aceptar', label: 'Aceptar' });
  }

  const actionStyles = {
    aceptar: 'background: #15803d; color: white;',
    rechazar: 'background: #dc2626; color: white;',
    espera: 'background: #ea580c; color: white;',
  };

  return acciones
    .map(
      (accion) => `
        <button
          type="button"
          data-action-button
          data-action="${accion.key}"
          data-action-text="${accion.label.toLowerCase()}"
          data-doc-id="${escaparHtml(documento.DocumentosSolicitudId ?? documento.DocumentoId ?? documento.documentoId ?? documento.Id ?? '')}"
          data-tipo-id="${escaparHtml(tipoId)}"
          style="
            padding: 8px 12px;
            border-radius: 999px;
            border: none;
            cursor: pointer;
            font-size: 12px;
            font-weight: 700;
            ${actionStyles[accion.key] || 'background: #0b4ea6; color: white;'}
          "
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
      const popup = Swal.getPopup();
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
        background: rgba(15, 23, 42, 0.55);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      `;
      popup.style.position = 'relative';

      overlay.innerHTML = `
        <div style="background: white; border-radius: 20px; padding: 24px; width: min(480px, 90%); box-shadow: 0 18px 50px rgba(15,23,42,0.18); text-align: center;">
          <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 16px;">¿Deseas ${actionText} este documento?</div>
          ${isRejectAction ? `
            <div style="text-align:left; margin-bottom: 14px;">
              <label for="rechazo-motivo" style="display:block; font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">Motivo de rechazo</label>
              <textarea id="rechazo-motivo" data-reject-reason rows="4" style="width: 100%; min-height: 100px; padding: 10px; border: 1px solid #cbd5e1; border-radius: 12px; resize: vertical; font-size: 14px; color: #0f172a;" placeholder="Describe brevemente por qué se rechaza este documento."></textarea>
              <div data-rejection-error style="font-size: 13px; color: #b91c1c; margin-top: 6px; min-height: 18px;"></div>
            </div>
          ` : ''}
          <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
            <button data-confirm-action type="button" style="padding: 10px 18px; border-radius: 12px; border: none; background: #0b4ea6; color: white; font-weight: 700; cursor: pointer;">Aceptar</button>
            <button data-cancel-action type="button" style="padding: 10px 18px; border-radius: 12px; border: 1px solid #cbd5e1; background: white; color: #475569; font-weight: 700; cursor: pointer;">Cancelar</button>
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
          waitingText.style = 'margin-top: 14px; color: #334155; font-size: 14px;';
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
  aspect-ratio: 1 / 1;
  min-height: 170px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 18px;
  text-align: center;
  border-radius: 18px;
  border: 1px solid #dbe4f0;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
  color: #1e293b;
`;

const construirCardDocumentoHtml = (tipo, documento) => {
  const tituloTipo = escaparHtml(tipo.nombre);

  const urlDocumento = obtenerUrlDocumento(documento);
  if (urlDocumento) {
    const nombreDoc = escaparHtml(documento.nombre || tipo.nombre);
    const fechaSubida = formatearFechaSubida(documento.FechaEntrega);
    const estadoInfo = getDocumentoEstatusInfo(documento.EstadoValidacionId);
    const estadoBadge = estadoInfo
      ? `<div data-doc-status-badge style="position: absolute; top: 14px; right: 14px; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; color: ${estadoInfo.color}; background: ${estadoInfo.bg};">${estadoInfo.texto}</div>`
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
        onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 16px 30px rgba(15, 23, 42, 0.12)'"
        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 10px 25px rgba(15, 23, 42, 0.08)'"
      >
        ${estadoBadge}
        <a
          href="${escaparHtml(urlDocumento)}"
          target="_blank"
          rel="noopener noreferrer"
          style="display: contents;"
        >
          <div style="width: 60px; height: 60px; border-radius: 16px; background: #eff6ff; display: flex; align-items: center; justify-content: center; font-size: 30px;">📄</div>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <span style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em;">${tituloTipo}</span>
            <span style="font-size: 12px; color: #64748b; line-height: 1.45;">Subido el ${fechaSubida}</span>
          </div>
        </a>
        <div data-doc-action-buttons style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: auto; width: 100%;">
          ${botonesEstado}
          <button
            type="button"
            data-replace-doc="${tipo.id}"
            title="Subir nueva versión de este documento"
            style="
              margin-top: 2px;
              padding: 6px 12px;
              border-radius: 10px;
              border: 1.5px solid #0ea5e9;
              background: white;
              color: #0ea5e9;
              font-size: 11px;
              font-weight: 700;
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              gap: 4px;
            "
          >
            📤 Reemplazar
          </button>
        </div>
      </div>
    `;
  }

  return `
    <div style="${estilosCardDocumento} border-style: dashed; border-color: #cbd5e1; background: #f8fafc; box-shadow: none;">
      <div style="width: 60px; height: 60px; border-radius: 16px; background: #fef2f2; display: flex; align-items: center; justify-content: center; font-size: 28px;">📋</div>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <span style="font-size: 15px; font-weight: 700; line-height: 1.35;">${tituloTipo}</span>
        <span style="font-size: 13px; color: #94a3b8; font-weight: 600;">Documento faltante</span>
      </div>
      <button
        type="button"
        data-add-doc="${tipo.id}"
        style="
          margin-top: 4px;
          padding: 8px 14px;
          border-radius: 10px;
          border: none;
          background: #0b4ea6;
          color: white;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        "
      >
        Añadir documento
      </button>
    </div>
  `;
};

export default function AdminJugadores() {
  const navigate = useNavigate();
  const location = useLocation();

  const [jugadores, setJugadores] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const loadJugadores = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const data = await getJugadoresDirectorio(forceRefresh);
      setJugadores(data);
      setError(null);
    } catch (err) {
      console.error("Error al cargar jugadores:", err);
      setError("Error al cargar el directorio de jugadores.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJugadores();
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
        archivo,
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

  const mostrarModalDocumentos = (jugador, documentos, solicitudId) => {
    const listaDocumentos = Array.isArray(documentos) ? documentos : [];
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

    Swal.fire({
      title: `Documentos de ${jugador.NombreCompleto}`,
      html: `
        <div style="max-height: 420px; overflow-y: auto; padding: 4px;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 16px;">
            ${htmlCards}
          </div>
        </div>
      `,
      showConfirmButton: true,
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#ff0000',
      didOpen: () => {
        // Botón: Añadir documento faltante
        document.querySelectorAll('[data-add-doc]').forEach((boton) => {
          boton.addEventListener('click', () => {
            const tipoId = Number(boton.getAttribute('data-add-doc'));
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.pdf,image/*';
            input.style.display = 'none';
            input.onchange = (e) => {
              const archivo = e.target.files?.[0];
              if (archivo) {
                Swal.close();
                manejarSubidaDocumento(jugador, tipoId, archivo, solicitudId);
              }
            };
            document.body.appendChild(input);
            input.click();
            input.remove();
          });
        });

        // Botón: Reemplazar documento existente
        document.querySelectorAll('[data-replace-doc]').forEach((boton) => {
          boton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const tipoId = Number(boton.getAttribute('data-replace-doc'));
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.pdf,image/*';
            input.style.display = 'none';
            input.onchange = (ev) => {
              const archivo = ev.target.files?.[0];
              if (archivo) {
                Swal.close();
                manejarSubidaDocumento(jugador, tipoId, archivo, solicitudId);
              }
            };
            document.body.appendChild(input);
            input.click();
            input.remove();
          });
        });

        const popup = Swal.getPopup();
        attachActionButtonListeners(popup || document);
      },
    });
  };

  const handleDescargarDocs = async (jugador) => {
    try {
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
      Swal.close();
      mostrarModalDocumentos(jugador, docs, solicitudId);
    } catch (err) {
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
      sexo: jugador.Sexo || '',
      fechaNacimiento: jugador.FechaNacimiento ? jugador.FechaNacimiento.split('T')[0] : '',
      NUI: jugador.NUI || '',
      estatus: jugador.Estatus ? '1' : '0'
    });
    setHaCambiado(false);
    setOcrCargando(false);
    setModalEdicion(true);

    // Obtener documentos del jugador en background para extraer su fotografía si existe
    getJugadorDocumentos(jugador.MiembroEquipoId)
      .then((docs) => {
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

  // PROCESAR OCR PARA EL MODAL DE EDICIÓN
  const handleOcrModalUpload = async (file) => {
    if (!file) return;
    setOcrCargando(true);
    Swal.fire({
      title: 'Analizando documento...',
      html: 'Extrayendo información vía OCR. Por favor espere.',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading()
    });
    try {
      const formDataOcr = new FormData();
      formDataOcr.append('file_id', file);
      const response = await fetch('/ocr-api', { method: 'POST', body: formDataOcr });
      if (!response.ok) throw new Error('Error al conectar con el servidor OCR');

      const htmlText = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');

      let nombreEncontrado = '';
      let curpEncontrada = '';
      let fechaNacEncontrada = '';

      const rows = doc.querySelectorAll('.dato-fila');
      rows.forEach(row => {
        const label = row.querySelector('.etiqueta')?.textContent?.toLowerCase() || '';
        const value = row.querySelector('.valor')?.textContent?.trim() || '';
        if (label.includes('nombre')) nombreEncontrado = value;
        if (label.includes('curp')) curpEncontrada = value;
        if (label.includes('nacimiento') || label.includes('fecha nac')) {
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

      // Fallback: buscar en texto plano si los selectores no devuelven nada
      if (!nombreEncontrado && !curpEncontrada) {
        const textoCompleto = doc.body?.innerText || '';
        const curpMatch = textoCompleto.match(/[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d/i);
        if (curpMatch) curpEncontrada = curpMatch[0].toUpperCase();
      }

      if (nombreEncontrado || curpEncontrada || fechaNacEncontrada) {
        const parts = nombreEncontrado ? nombreEncontrado.split(' ') : [];
        let firstName = '', lastNameP = '', lastNameM = '';
        if (parts.length >= 3) { lastNameP = parts[0]; lastNameM = parts[1]; firstName = parts.slice(2).join(' '); }
        else if (parts.length === 2) { lastNameP = parts[0]; firstName = parts[1]; }
        else { firstName = nombreEncontrado; }

        setDatosEditables(prev => ({
          ...prev,
          ...(firstName && { nombre: firstName }),
          ...(lastNameP && { primerApellido: lastNameP }),
          ...(lastNameM && { segundoApellido: lastNameM }),
          ...(curpEncontrada && { curp: curpEncontrada }),
          ...(fechaNacEncontrada && { fechaNacimiento: fechaNacEncontrada }),
          ...(NUI && { NUI: NUI })
        }));
        setHaCambiado(true);
        Swal.fire({ title: '¡Lectura exitosa!', text: `Se detectó: ${nombreEncontrado || curpEncontrada}`, icon: 'success', timer: 2000, showConfirmButton: false });
      } else {
        throw new Error('No se detectaron datos legibles en este documento.');
      }
    } catch (err) {
      console.error('Error OCR modal:', err);
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
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
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
    setDatosEditables(prev => ({ ...prev, [name]: value }));
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
        estatus: datosEditables.estatus
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
    MiembroEquipoId: <span style={{ fontWeight: '700', color: '#64748b' }}>#{j.MiembroEquipoId}</span>,
    NombreCompleto: (
      <div>
        <div style={{ fontWeight: '800', color: '#1e293b' }}>{j.NombreCompleto}</div>
        <div style={{ fontSize: '11px', color: '#64748b' }}>{j.Email || 'Sin correo registrado'}</div>
      </div>
    ),
    NUI: j.NUI ? (
      <span style={{ fontFamily: 'monospace', fontSize: '12px', background: '#eff6ff', color: '#2563eb', padding: '3px 8px', borderRadius: '6px', fontWeight: '700' }}>{j.NUI}</span>
    ) : (
      <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>Sin NUI</span>
    ),
    Sexo: <span style={{ fontSize: '13px', color: '#475569', fontWeight: '600' }}>{j.Sexo || 'N/A'}</span>,
    EquipoLiga: (
      <div style={{ maxWidth: '340px' }}>
        {j.EquipoId ? (
          <div
            style={{
              fontWeight: '700',
              fontSize: '14px',
              color: '#0b4ea6',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/equipos?abrirDetalle=${j.EquipoId}`);
            }}
            title="Ver detalle del equipo"
          >
            {j.EquipoNombre}
          </div>
        ) : (
          <div style={{ fontWeight: '700', fontSize: '14px', color: '#64748b' }}>{j.EquipoNombre || 'Sin equipo'}</div>
        )}
        <div style={{ fontSize: '12px', color: '#64748b' }}>{j.Liga}</div>
      </div>
    ),
    FechaIngreso: <span style={{ fontSize: '12px' }}>{new Date(j.FechaIngreso).toLocaleDateString()}</span>,
    Estatus: j.Estatus ?
      <span className="badge" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>ACTIVO</span> :
      <span className="badge" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>BAJA</span>,
    Acciones: (
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          className="btn btn-sm"
          style={{ padding: '8px 14px', fontSize: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', background: '#e2e8f0', color: '#475569', border: 'none', fontWeight: '700' }}
          onClick={() => handleDescargarDocs(j)}
          title="Ver documentos"
        >
          <FaFileDownload /> Docs
        </button>
        <button
          className="btn btn-sm"
          style={{ padding: '8px 14px', fontSize: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', background: '#eff6ff', color: '#2563eb', border: 'none', fontWeight: '700' }}
          onClick={() => handleExportar(j)}
          title="Exportar como ZIP"
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
          <h2 className="section-title" style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Catálogo de jugadores registrados</h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b', marginTop: '4px' }}>Visualiza y gestiona jugadores.</p>
        </div>
        <div className="section-actions" style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn btn-primary"
            onClick={() => loadJugadores(true)}
            style={{ padding: '10px 20px', backgroundColor: 'white', color: '#334155', border: '1.5px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FaSyncAlt />
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/admin/layout-jugadores')}
            style={{ padding: '10px 20px', backgroundColor: 'white', color: '#334155', border: '1.5px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FaTable /> Tabla de jugadores
          </button>
          {/*<button
            className="btn btn-premium"
            onClick={() => navigate('/admin/jugadores/crear')}
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
            border: filtroEstatus === 'todos' ? '2px solid #0b4ea6' : '1px solid #e2e8f0',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: filtroEstatus === 'todos' ? '0 4px 12px rgba(11, 78, 166, 0.15)' : 'none',
            transform: filtroEstatus === 'todos' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '5px', color: '#0b4ea6' }}><FaUsers /></div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>TOTAL JUGADORES</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>{stats.total}</div>
        </div>

        {/* TARJETA ACTIVOS */}
        <div
          onClick={() => setFiltroEstatus('activos')}
          style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            border: filtroEstatus === 'activos' ? '2px solid #10b981' : '1px solid #e2e8f0',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: filtroEstatus === 'activos' ? '0 4px 12px rgba(16, 185, 129, 0.15)' : 'none',
            transform: filtroEstatus === 'activos' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '5px', color: '#10b981' }}><FaCheckCircle /></div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>JUGADORES ACTIVOS</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#10b981' }}>{stats.activos}</div>
        </div>

        {/* TARJETA INACTIVOS */}
        <div
          onClick={() => setFiltroEstatus('inactivos')}
          style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            border: filtroEstatus === 'inactivos' ? '2px solid #ef4444' : '1px solid #e2e8f0',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: filtroEstatus === 'inactivos' ? '0 4px 12px rgba(239, 68, 68, 0.15)' : 'none',
            transform: filtroEstatus === 'inactivos' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '5px', color: '#ef4444' }}><FaTimesCircle /></div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>JUGADORES INACTIVOS</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#ef4444' }}>{stats.inactivos}</div>
        </div>

        {/* TARJETA HOMBRES */}
        <div
          onClick={() => setFiltroEstatus('hombres')}
          style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            border: filtroEstatus === 'hombres' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: filtroEstatus === 'hombres' ? '0 4px 12px rgba(59, 130, 246, 0.15)' : 'none',
            transform: filtroEstatus === 'hombres' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '5px', color: '#3b82f6' }}><FaMale /></div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>MASCULINO</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#3b82f6' }}>{stats.hombres}</div>
        </div>

        {/* TARJETA MUJERES */}
        <div
          onClick={() => setFiltroEstatus('mujeres')}
          style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            border: filtroEstatus === 'mujeres' ? '2px solid #f43f5e' : '1px solid #e2e8f0',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: filtroEstatus === 'mujeres' ? '0 4px 12px rgba(244, 63, 94, 0.15)' : 'none',
            transform: filtroEstatus === 'mujeres' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '5px', color: '#f43f5e' }}><FaFemale /></div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>FEMENINO</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#f43f5e' }}>{stats.mujeres}</div>
        </div>
        {/* TARJETA CON NUI */}
        <div
          onClick={() => setFiltroEstatus('conNUI')}
          style={{
            background: 'white', padding: '20px', borderRadius: '12px',
            border: filtroEstatus === 'conNUI' ? '2px solid #8b5cf6' : '1px solid #e2e8f0',
            textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease',
            boxShadow: filtroEstatus === 'conNUI' ? '0 4px 12px rgba(139,92,246,0.15)' : 'none',
            transform: filtroEstatus === 'conNUI' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '5px', color: '#8b5cf6' }}><FaIdCard /></div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>CON NUI</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#8b5cf6' }}>{stats.conNUI}</div>
        </div>

        {/* TARJETA SIN NUI */}
        <div
          onClick={() => setFiltroEstatus('sinNUI')}
          style={{
            background: 'white', padding: '20px', borderRadius: '12px',
            border: filtroEstatus === 'sinNUI' ? '2px solid #f59e0b' : '1px solid #e2e8f0',
            textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease',
            boxShadow: filtroEstatus === 'sinNUI' ? '0 4px 12px rgba(245,158,11,0.15)' : 'none',
            transform: filtroEstatus === 'sinNUI' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '5px', color: '#f59e0b' }}><FaExclamationTriangle /></div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>SIN NUI</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#f59e0b' }}>{stats.sinNUI}</div>
        </div>
      </div>

      <div className="card" style={{ padding: '35px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
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

            <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} style={{ background: 'white', border: '1.5px solid var(--border-light)', padding: '10px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
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
          isLoading={loading}
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
        <div style={{ display: 'flex', gap: '24px', flexDirection: 'column' }}>
          {/* FOTO DEL JUGADOR Y CABECERA */}
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ width: '100px', height: '100px', borderRadius: '20px', overflow: 'hidden', flexShrink: 0, border: '2px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {(fotoJugadorEdicion || jugadorEdicion?.RutaFoto) ? (
                <img
                  src={(fotoJugadorEdicion || jugadorEdicion?.RutaFoto).startsWith('http') ? (fotoJugadorEdicion || jugadorEdicion?.RutaFoto) : `${API_BASE}${(fotoJugadorEdicion || jugadorEdicion?.RutaFoto).replace(/\\/g, '/').startsWith('/') ? '' : '/'}${(fotoJugadorEdicion || jugadorEdicion?.RutaFoto).replace(/\\/g, '/')}`}
                  alt="Foto del jugador"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const sib = e.target.parentNode.querySelector('.fallback-icon');
                    if (sib) sib.style.display = 'block';
                  }}
                />
              ) : null}
              <FaUser
                className="fallback-icon"
                style={{ display: (fotoJugadorEdicion || jugadorEdicion?.RutaFoto) ? 'none' : 'block', fontSize: '40px', color: '#cbd5e1' }}
              />
            </div>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>
                {datosEditables.nombre} {datosEditables.primerApellido} {datosEditables.segundoApellido}
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '600' }}>
                {datosEditables.curp || 'CURP NO REGISTRADA'} • {jugadorEdicion?.EquipoNombre || 'Sin Equipo'}
              </p>
              {datosEditables.estatus === '1' ? (
                <span style={{ display: 'inline-block', marginTop: '10px', padding: '4px 10px', background: '#ecfdf5', color: '#059669', fontSize: '11px', fontWeight: '800', borderRadius: '6px', border: '1px solid #a7f3d0' }}>ACTIVO</span>
              ) : (
                <span style={{ display: 'inline-block', marginTop: '10px', padding: '4px 10px', background: '#fef2f2', color: '#dc2626', fontSize: '11px', fontWeight: '800', borderRadius: '6px', border: '1px solid #fecaca' }}>BAJA</span>
              )}
            </div>
          </div>

          {/* PRIMERA FILA: AVISO Y OCR */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {/* AVISO CAMPOS PROTEGIDOS */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>ℹ️</span>
                <strong style={{ fontSize: '14px', color: '#1e40af' }}>Campos Protegidos</strong>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#1e3a8a', lineHeight: '1.6' }}>
                El Nombre, Apellidos y CURP están bloqueados. Solo se actualizan automáticamente subiendo y verificando el Acta de Nacimiento o la INE.
              </p>
            </div>

            {/* CARGA DE DOCUMENTO OFICIAL (OCR) */}
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>Carga de Documento Oficial</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', border: '1.5px dashed #cbd5e1', borderRadius: '12px', padding: '14px', cursor: ocrCargando ? 'not-allowed' : 'pointer', background: '#f8fafc', transition: 'all 0.2s', opacity: ocrCargando ? 0.6 : 1 }}>
                  <span style={{ fontSize: '24px' }}>📋</span>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '12px', color: '#334155' }}>Acta</div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>PDF/img</div>
                  </div>
                  <input type="file" accept=".pdf,image/*" style={{ display: 'none' }} disabled={ocrCargando} onChange={(e) => { if (e.target.files[0]) handleOcrModalUpload(e.target.files[0]); e.target.value = ''; }} />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', border: '1.5px dashed #cbd5e1', borderRadius: '12px', padding: '14px', cursor: ocrCargando ? 'not-allowed' : 'pointer', background: '#f8fafc', transition: 'all 0.2s', opacity: ocrCargando ? 0.6 : 1 }}>
                  <span style={{ fontSize: '24px' }}>🪪</span>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '12px', color: '#334155' }}>INE</div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>PDF/img</div>
                  </div>
                  <input type="file" accept=".pdf,image/*" style={{ display: 'none' }} disabled={ocrCargando} onChange={(e) => { if (e.target.files[0]) handleOcrModalUpload(e.target.files[0]); e.target.value = ''; }} />
                </label>
              </div>
              {ocrCargando && (
                <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '13px', color: '#0b4ea6', fontWeight: '600', marginBottom: 0 }}>⏳ Procesando documento...</p>
              )}
            </div>
          </div>

          {/* SEGUNDA FILA: FORMULARIO */}
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px 16px 0 16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '800', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Datos del Jugador</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', columnGap: '16px', rowGap: '0', alignItems: 'start' }}>
              <EntradaFormulario etiqueta="Nombre(s) *" valor={datosEditables.nombre} onChange={manejarCambioInput} nombre="nombre" obligatorio placeholder="Se actualiza con OCR" deshabilitado={true} />
              <EntradaFormulario etiqueta="Primer apellido *" valor={datosEditables.primerApellido} onChange={manejarCambioInput} nombre="primerApellido" obligatorio placeholder="Se actualiza con OCR" deshabilitado={true} />
              <EntradaFormulario etiqueta="Segundo apellido *" valor={datosEditables.segundoApellido} onChange={manejarCambioInput} nombre="segundoApellido" placeholder="Se actualiza con OCR" deshabilitado={true} />
              <EntradaFormulario etiqueta="CURP *" valor={datosEditables.curp} onChange={manejarCambioInput} nombre="curp" obligatorio placeholder="Se actualiza con OCR" deshabilitado={true} />

              <EntradaFormulario etiqueta="Fecha de nacimiento" valor={datosEditables.fechaNacimiento} onChange={manejarCambioInput} nombre="fechaNacimiento" tipo="date" />
              <EntradaSeleccion etiqueta="Sexo" valor={datosEditables.sexo} onChange={manejarCambioInput} nombre="sexo" opciones={[{ valor: 'Masculino', etiqueta: 'Masculino' }, { valor: 'Femenino', etiqueta: 'Femenino' }, { valor: 'No Binario', etiqueta: 'No Binario' }]} />
              <EntradaFormulario etiqueta="Correo electrónico" valor={datosEditables.email} onChange={manejarCambioInput} nombre="email" tipo="email" placeholder="correo@ejemplo.com" />
              <EntradaFormulario etiqueta="NUI" valor={datosEditables.NUI} onChange={manejarCambioInput} nombre="NUI" />
              <EntradaSeleccion etiqueta="Estatus del jugador" valor={datosEditables.estatus} onChange={manejarCambioInput} nombre="estatus" opciones={[{ valor: '1', etiqueta: 'Activo' }, { valor: '0', etiqueta: 'Baja' }]} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
