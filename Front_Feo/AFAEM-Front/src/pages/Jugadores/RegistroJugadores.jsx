import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  FaArrowLeft,
  FaArrowRight,
  FaCheckCircle,
  FaGlobeAmericas,
  FaUpload
} from 'react-icons/fa';
import Swal from 'sweetalert2';
import { PDFDocument } from 'pdf-lib';
import {
  BotonPrimario,
  BotonSecundario,
  EntradaFormulario,
  EntradaSeleccion,
  AreaTexto,
  Cargador
} from '../../components/partials';
import { validarFotografia } from '../../services/foto';
import teamsService from '../../services/teams';
import {
  inferGeneroFromCurp,
  isJugadorMenorDeEdad,
  mapAvailableSlotsResponse,
  useEquipoTemporalPlayerDraft
} from '../../hooks/useEquipoTemporalPlayerDraft';
import '../../styles/dashboard.css';

const StepBadge = ({ number, isActive, isDone }) => (
  <div style={{
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: isDone ? '#10b981' : (isActive ? '#0b4ea6' : '#e2e8f0'),
    color: (isActive || isDone) ? 'white' : '#64748b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '800',
    flexShrink: 0,
    transition: 'all 0.3s'
  }}>
    {isDone ? <FaCheckCircle /> : number}
  </div>
);

const EMPTY_DOCUMENTS = {
  acta: null,
  ine: null,
  ineTutor: null,
  identificacionMenor: null,
  foto: null
};

const EMPTY_PREVIEWS = {
  acta: null,
  ine: null,
  ineTutor: null,
  identificacionMenor: null,
  foto: null
};

const PLAYER_STATUS_CONFIG = {
  VACIO: { icon: '○', label: 'VACIO', bg: '#f8fafc', color: '#475569' },
  EN_CAPTURA: { icon: '◐', label: 'EN_CAPTURA', bg: '#fffbeb', color: '#92400e' },
  COMPLETO: { icon: '●', label: 'COMPLETO', bg: '#dcfce7', color: '#166534' }
};

const BASE_DOCUMENT_CARDS = [
  { key: 'acta', title: 'Acta de nacimiento', subtitle: 'Opcional para OCR y autollenado' },
  { key: 'ine', title: 'Identificacion oficial', subtitle: 'INE, pasaporte o cedula' },
  { key: 'foto', title: 'Fotografia del jugador', subtitle: 'Fotografia infantil formal' }
];

const MINOR_DOCUMENT_CARDS = [
  { key: 'ineTutor', title: 'INE de padre o tutor', subtitle: 'Identificacion oficial del tutor' },
  { key: 'identificacionMenor', title: 'Identificacion del menor', subtitle: 'Credencial escolar o certificado' }
];

const revokeBlobUrl = (url) => {
  if (typeof url === 'string' && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
};

export default function RegistroJugadores() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useParams();
  const isPublicFlow = Boolean(token);

  const [teamId, setTeamId] = useState(location.state?.teamId || null);
  const [teamInfo, setTeamInfo] = useState({
    equipo: location.state?.equipo || '',
    liga: location.state?.liga || '',
    categoria: location.state?.categoria || ''
  });
  const [slotsData, setSlotsData] = useState(null);
  const [catalogs, setCatalogs] = useState({
    seguros: [],
    roles_equipo: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [documentsBySlot, setDocumentsBySlot] = useState({});
  const [previewsBySlot, setPreviewsBySlot] = useState({});
  const [failedPhotoState, setFailedPhotoState] = useState(null);

  const {
    currentSlot,
    currentStatus,
    draftData: currentDatos,
    setDraftData: setCurrentDatos,
    saveDraft,
    slotStatuses,
    allSlotsComplete
  } = useEquipoTemporalPlayerDraft({
    rawSlots: slotsData?.rawSlots || [],
    selectedSlotId
  });

  const slotIndex = useMemo(
    () => slotStatuses.findIndex((slot) => String(slot.slot_id) === String(currentSlot?.slot_id)),
    [slotStatuses, currentSlot?.slot_id]
  );

  const slotsDisponibles = useMemo(
    () => slotStatuses.filter((slot) => !slot.completo).length,
    [slotStatuses]
  );

  const currentDocuments = currentSlot?.slot_id
    ? (documentsBySlot[currentSlot.slot_id] || EMPTY_DOCUMENTS)
    : EMPTY_DOCUMENTS;

  const currentPreviews = currentSlot?.slot_id
    ? (previewsBySlot[currentSlot.slot_id] || EMPTY_PREVIEWS)
    : EMPTY_PREVIEWS;

  const esMenorDeEdad = useMemo(
    () => isJugadorMenorDeEdad(currentDatos.fechaNacimiento),
    [currentDatos.fechaNacimiento]
  );

  const currentSeguro = useMemo(
    () => catalogs.seguros?.find((seguro) => String(seguro.id) === String(currentSlot?.seguro_id)) || null,
    [catalogs.seguros, currentSlot?.seguro_id]
  );

  const isStep1Done = Boolean(currentSlot);
  const isStep2Done = Object.values(currentDocuments).some(Boolean);
  const showStep2 = isStep1Done;
  const showStep3 = isStep1Done;

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        let effectiveTeamId = teamId;
        let inviteTeamInfo = { ...teamInfo };

        if (isPublicFlow && !effectiveTeamId) {
          const inviteData = await teamsService.getInvitationInfo(token);
          effectiveTeamId = inviteData.equipo_temporal_id;
          inviteTeamInfo = {
            equipo: inviteData.nombre_equipo || '',
            liga: inviteData.nombre_liga || '',
            categoria: inviteData.nombre_categoria || 'LIBRE'
          };
          setTeamId(effectiveTeamId);
          setTeamInfo(inviteTeamInfo);
        }

        if (!effectiveTeamId) {
          Swal.fire('Error', 'No se encontro el equipo temporal para este flujo.', 'error');
          if (!isPublicFlow) navigate('/presidente-equipo/dashboard');
          return;
        }

        const [catalogsResponse, slotsResponse] = await Promise.all([
          teamsService.getCatalogs(),
          teamsService.getAvailableSlots(effectiveTeamId)
        ]);

        const mappedSlotsData = mapAvailableSlotsResponse(slotsResponse);
        setCatalogs(catalogsResponse);
        setSlotsData(mappedSlotsData);

        const firstAvailableSlot = mappedSlotsData.rawSlots.find((slot) => !slot.completo) || mappedSlotsData.rawSlots[0] || null;
        setSelectedSlotId((previousSlotId) => {
          if (previousSlotId && mappedSlotsData.rawSlots.some((slot) => String(slot.slot_id) === String(previousSlotId))) {
            return previousSlotId;
          }
          return firstAvailableSlot?.slot_id || null;
        });
      } catch (error) {
        console.error('Error al cargar la invitacion:', error);
        Swal.fire('Error', error.response?.data?.detail || 'No se pudo cargar la invitacion.', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [teamId, token, isPublicFlow, navigate]);

  const updateSlotDocuments = (slotId, updater) => {
    if (!slotId) return;
    setDocumentsBySlot((previous) => {
      const currentValue = previous[slotId] || EMPTY_DOCUMENTS;
      const nextValue = typeof updater === 'function' ? updater(currentValue) : updater;
      return { ...previous, [slotId]: nextValue };
    });
  };

  const updateSlotPreviews = (slotId, updater) => {
    if (!slotId) return;
    setPreviewsBySlot((previous) => {
      const currentValue = previous[slotId] || EMPTY_PREVIEWS;
      const nextValue = typeof updater === 'function' ? updater(currentValue) : updater;
      return { ...previous, [slotId]: nextValue };
    });
  };

  const setDocumentForCurrentSlot = (documentKey, file) => {
    if (!currentSlot?.slot_id) return;
    updateSlotDocuments(currentSlot.slot_id, (currentValue) => ({
      ...EMPTY_DOCUMENTS,
      ...currentValue,
      [documentKey]: file
    }));
  };

  const setPreviewForCurrentSlot = (documentKey, value) => {
    if (!currentSlot?.slot_id) return;
    updateSlotPreviews(currentSlot.slot_id, (currentValue) => {
      revokeBlobUrl(currentValue?.[documentKey]);
      return {
        ...EMPTY_PREVIEWS,
        ...currentValue,
        [documentKey]: value
      };
    });
  };

  const createPreviewFromFile = (documentKey, file) => {
    if (!file || !currentSlot?.slot_id) return;

    const isPdf = file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      setPreviewForCurrentSlot(documentKey, URL.createObjectURL(file));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewForCurrentSlot(documentKey, reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleFieldChange = (field, value) => {
    setCurrentDatos((previous) => ({ ...previous, [field]: value }));
  };

  const handleImmediateDraftChange = async (partial) => {
    const merged = { ...currentDatos, ...partial };
    setCurrentDatos(merged);
    await saveDraft(merged);
  };

  const handleBlur = () => {
    saveDraft(currentDatos);
  };

  const forceLoadFailedPhoto = () => {
    if (!failedPhotoState || String(failedPhotoState.slotId) !== String(currentSlot?.slot_id)) return;

    const { file } = failedPhotoState;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewForCurrentSlot('foto', reader.result);
    };
    reader.readAsDataURL(file);
    setDocumentForCurrentSlot('foto', file);
    setFailedPhotoState(null);

    Swal.fire({
      title: 'Fotografia cargada',
      text: 'La fotografia se cargo sin validacion.',
      icon: 'success',
      timer: 1500,
      showConfirmButton: false
    });
  };

  const handleFileUpload = async (documentKey, file) => {
    if (!file || !currentSlot?.slot_id) return;

    setDocumentForCurrentSlot(documentKey, file);
    createPreviewFromFile(documentKey, file);

    if (documentKey === 'foto') {
      Swal.fire({
        title: 'Validando fotografia...',
        html: 'Verificando formato y calidad.',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      try {
        const data = await validarFotografia(file);
        if (data.valido) {
          const imageUrl = `data:${data.tipo_imagen};base64,${data.imagen}`;
          const byteCharacters = atob(data.imagen);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i += 1) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const validatedFile = new File([new Uint8Array(byteNumbers)], 'foto_validada.jpg', {
            type: data.tipo_imagen
          });

          setDocumentForCurrentSlot('foto', validatedFile);
          setPreviewForCurrentSlot('foto', imageUrl);
          setFailedPhotoState(null);

          Swal.fire({
            title: 'Fotografia aceptada',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
          });
        } else {
          setFailedPhotoState({ slotId: currentSlot.slot_id, file });
          setDocumentForCurrentSlot('foto', null);
          setPreviewForCurrentSlot('foto', null);

          Swal.fire({
            title: 'Error en la fotografia',
            text: `${data.mensaje || 'La foto no cumple con los requisitos.'} Deseas cargarla de todos modos?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Si, cargar igualmente',
            cancelButtonText: 'No, intentar de nuevo',
            confirmButtonColor: '#0b4ea6',
            cancelButtonColor: '#cbd5e1'
          }).then((result) => {
            if (result.isConfirmed) {
              forceLoadFailedPhoto();
            }
          });
        }
      } catch (error) {
        Swal.fire('Error de validacion', error.message || 'No se pudo procesar la foto.', 'error');
      }
    }

    if (documentKey === 'acta' || documentKey === 'ine' || documentKey === 'ineTutor') {
      Swal.fire({
        title: 'Analizando documento...',
        html: 'Extrayendo informacion via OCR.',
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
        let lugarNacEncontrado = '';

        const rows = doc.querySelectorAll('.dato-fila');
        rows.forEach((row) => {
          const label = row.querySelector('.etiqueta')?.textContent?.toLowerCase() || '';
          const value = row.querySelector('.valor')?.textContent?.trim() || '';

          if (label.includes('nombre')) nombreEncontrado = value;
          if (label.includes('curp')) curpEncontrada = value;
          if (label.includes('lugar de nacimiento') || label.includes('entidad')) lugarNacEncontrado = value;
          if (label.includes('nacimiento') || label.includes('fecha nac')) {
            let normalizedDate = value;
            if (value.includes('/')) {
              const parts = value.split('/');
              if (parts.length === 3) {
                if (parts[2].length === 4) normalizedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                else if (parts[0].length === 4) normalizedDate = `${parts[0]}-${parts[1]}-${parts[2]}`;
              }
            }
            fechaNacEncontrada = normalizedDate;
          }
        });

        if (nombreEncontrado || curpEncontrada || fechaNacEncontrada) {
          const nameParts = nombreEncontrado ? nombreEncontrado.split(' ') : [];
          let firstName = '';
          let lastNamePaterno = '';
          let lastNameMaterno = '';

          if (nameParts.length >= 3) {
            lastNamePaterno = nameParts[0];
            lastNameMaterno = nameParts[1];
            firstName = nameParts.slice(2).join(' ');
          } else if (nameParts.length === 2) {
            lastNamePaterno = nameParts[0];
            firstName = nameParts[1];
          } else {
            firstName = nombreEncontrado;
          }

          const merged = {
            ...currentDatos,
            nombreJugador: firstName || currentDatos.nombreJugador,
            apellidoPaterno: lastNamePaterno || currentDatos.apellidoPaterno,
            apellidoMaterno: lastNameMaterno || currentDatos.apellidoMaterno,
            curp: curpEncontrada || currentDatos.curp,
            fechaNacimiento: fechaNacEncontrada || currentDatos.fechaNacimiento,
            lugarNacimiento: lugarNacEncontrado || currentDatos.lugarNacimiento || 'MEXICO',
            genero: inferGeneroFromCurp(curpEncontrada, currentDatos.genero)
          };

          setCurrentDatos(merged);
          await saveDraft(merged);

          Swal.fire({
            title: 'Lectura exitosa',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
          });
        } else {
          throw new Error('No se detectaron datos legibles en el documento.');
        }
      } catch (error) {
        Swal.fire('Aviso', 'No se pudo extraer la informacion automaticamente. Puedes continuar manualmente.', 'info');
      }
    }
  };

  const safeSetField = (form, fieldName, value, fontSize) => {
    if (!value) return;
    try {
      const field = form.getTextField(fieldName);
      field.setText(value.toString().toUpperCase());
      if (fontSize) field.setFontSize(fontSize);
    } catch (error) {
      console.warn(`Campo PDF no encontrado: ${fieldName}`);
    }
  };

  const handleDownloadFormato = async () => {
    try {
      Swal.fire({
        title: 'Generando PDF...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const templateUrl = '/formato_afiliacion_jugador.pdf';
      const existingPdfBytes = await fetch(templateUrl).then((res) => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const form = pdfDoc.getForm();
      const firstPage = pdfDoc.getPages()[0];

      if (currentDocuments.foto) {
        try {
          const photoBytes = await currentDocuments.foto.arrayBuffer();
          const embeddedPhoto = currentDocuments.foto.name.toLowerCase().endsWith('.png')
            ? await pdfDoc.embedPng(photoBytes)
            : await pdfDoc.embedJpg(photoBytes);

          firstPage.drawImage(embeddedPhoto, {
            x: 479,
            y: 676,
            width: 76,
            height: 90
          });
        } catch (error) {
          console.warn('No se pudo incrustar la fotografia en el PDF:', error);
        }
      }

      safeSetField(form, 'Nombres', currentDatos.nombreJugador);
      safeSetField(form, 'Apellido Paterno', currentDatos.apellidoPaterno);
      safeSetField(form, 'Apellido Materno', currentDatos.apellidoMaterno);
      safeSetField(form, 'CURP o Clave Unica de Registro de Poblacion', currentDatos.curp);
      safeSetField(form, 'Fecha de Nacimiento', currentDatos.fechaNacimiento);
      safeSetField(form, 'Sexo', currentDatos.genero === '1' ? 'MASCULINO' : 'FEMENINO');
      safeSetField(form, 'Lugar de Nacimiento', currentDatos.lugarNacimiento);

      const correo = currentDatos.correo || '';
      const correoFontSize = correo.length > 35 ? 6 : correo.length > 25 ? 7 : correo.length > 18 ? 8 : 10;
      safeSetField(form, 'Correo electronico', correo, correoFontSize);
      safeSetField(form, 'Telefono', currentDatos.telefono);
      safeSetField(form, 'Asociacion', 'AFAEM');

      if (currentSeguro?.nombre) {
        safeSetField(form, 'Tipo', currentSeguro.nombre);
        safeSetField(form, 'fill_20', currentSeguro.nombre);
      }

      safeSetField(form, 'Liga', (teamInfo.liga || '').split('(')[0].trim());
      safeSetField(form, 'Equipo', teamInfo.equipo || '');
      safeSetField(form, 'Categoria', teamInfo.categoria || '');

      const posicionSeleccionada = catalogs.roles_equipo?.find(
        (rol) => String(rol.id) === String(currentDatos.posicion)
      );
      safeSetField(form, 'Posicion', posicionSeleccionada?.nombre || '');
      safeSetField(form, 'Camiseta', currentDatos.numCamiseta);

      if (currentDatos.esForaneo) {
        safeSetField(form, 'Nacionalidades del jugador', currentDatos.nacionalidadJugador);
        safeSetField(form, 'Pais de residencia actual', currentDatos.paisResidencia);
        safeSetField(form, 'El jugador ha vivido en el extranjero En que pais', currentDatos.haVividoExtranjero ? currentDatos.dondeVividoExtranjero : 'NO');
        safeSetField(form, 'Nacionalidades del padre', currentDatos.nacionalidadPadre);
        safeSetField(form, 'Nacionalidades de la madre', currentDatos.nacionalidadMadre);
        safeSetField(form, 'Nacionalidades del abuelo paterno', currentDatos.nacAbueloPaterno);
        safeSetField(form, 'Nacionalidades de la abuela paterna', currentDatos.nacAbuelaPaterna);
        safeSetField(form, 'Nacionalidades del abuelo materno', currentDatos.nacAbueloMaterno);
        safeSetField(form, 'Nacionalidades de la abuela materna', currentDatos.nacAbuelaMaterna);
        safeSetField(form, 'El jugador ha sido registrado por la Asociacion Nacional de Futbol', currentDatos.registroAsociacionExtranjera);
        safeSetField(form, 'El jugador ha jugado en un Club extranjero y participado en', currentDatos.juegoClubExtranjero);
      }

      const now = new Date();
      const fechaDescarga = now.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
      safeSetField(form, 'Fecha de descarga', fechaDescarga);
      safeSetField(form, 'Fecha descarga', fechaDescarga);
      safeSetField(form, 'Fecha', fechaDescarga);

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Formato_Afiliacion_${currentDatos.nombreJugador || 'Jugador'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      Swal.fire('Listo', 'El formato se descargo correctamente.', 'success');
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo generar el PDF.', 'error');
    }
  };

  const handleFinalizarRegistroCompleto = async () => {
    await saveDraft(currentDatos);
    Swal.fire(
      'Todos los jugadores estan completos.',
      'Registro listo para procesarse.',
      'success'
    );
  };

  if (loading) {
    return (
      <div className="dashboard-content">
        <div style={{ maxWidth: '900px', margin: '80px auto' }}>
          <Cargador texto="Cargando informacion del equipo..." />
        </div>
      </div>
    );
  }

  if (!currentSlot) {
    return (
      <div className="dashboard-content">
        <div style={{
          maxWidth: '900px',
          margin: '80px auto',
          background: 'white',
          borderRadius: '24px',
          padding: '40px',
          border: '1px solid #e2e8f0',
          textAlign: 'center'
        }}>
          <h2 style={{ marginTop: 0, color: '#1e293b' }}>No hay espacios disponibles</h2>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>
            Este enlace ya no tiene espacios por capturar o el equipo no fue encontrado.
          </p>
          {!isPublicFlow && (
            <BotonSecundario etiqueta="Volver" alHacerClick={() => navigate(-1)} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      <style>{`
        .document-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
      `}</style>

      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'white', padding: '18px 0 12px', borderBottom: '1px solid #e2e8f0', boxShadow: '0 4px 10px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', justifyContent: 'space-between', padding: '0 16px' }}>
          {!isPublicFlow && (
            <button
              onClick={() => navigate(-1)}
              className="btn btn-outline-secondary"
              style={{ padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', background: 'none', border: '1px solid #cbd5e1', cursor: 'pointer' }}
            >
              <FaArrowLeft />
            </button>
          )}

          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Registro de jugadores</h2>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
              Guardado automatico desde el mismo borrador del panel del presidente.
            </div>
          </div>

          {slotStatuses.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setSelectedSlotId(slotStatuses[Math.max(slotIndex - 1, 0)]?.slot_id || currentSlot.slot_id)}
                disabled={slotIndex <= 0}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  background: slotIndex <= 0 ? '#f1f5f9' : 'white',
                  color: '#1e293b',
                  cursor: slotIndex <= 0 ? 'not-allowed' : 'pointer'
                }}
              >
                <FaArrowLeft />
              </button>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>
                Jugador {slotIndex + 1} de {slotStatuses.length}
              </div>
              <button
                type="button"
                onClick={() => setSelectedSlotId(slotStatuses[Math.min(slotIndex + 1, slotStatuses.length - 1)]?.slot_id || currentSlot.slot_id)}
                disabled={slotIndex >= slotStatuses.length - 1}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  background: slotIndex >= slotStatuses.length - 1 ? '#f1f5f9' : 'white',
                  color: '#1e293b',
                  cursor: slotIndex >= slotStatuses.length - 1 ? 'not-allowed' : 'pointer'
                }}
              >
                <FaArrowRight />
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', padding: '0 16px' }}>
          {slotStatuses.map((slot, index) => {
            const config = PLAYER_STATUS_CONFIG[slot.estado] || PLAYER_STATUS_CONFIG.VACIO;
            return (
              <button
                key={slot.slot_id}
                type="button"
                onClick={() => setSelectedSlotId(slot.slot_id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '16px',
                  border: String(slot.slot_id) === String(currentSlot.slot_id) ? '2px solid #0b4ea6' : '1px solid #cbd5e1',
                  background: String(slot.slot_id) === String(currentSlot.slot_id) ? '#eff6ff' : 'white',
                  color: '#1e293b',
                  cursor: 'pointer'
                }}
              >
                <span style={{ fontSize: '14px' }}>{config.icon}</span>
                <span style={{ fontWeight: '700' }}>Jugador {index + 1}</span>
                <span style={{ padding: '4px 10px', borderRadius: '999px', background: config.bg, color: config.color, fontSize: '11px', fontWeight: '700' }}>
                  {config.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ height: '170px' }} />

      <div className="premium-card fade-in" style={{
        maxWidth: '1000px',
        margin: '0 auto 30px auto',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        color: 'white',
        borderRadius: '20px',
        padding: '25px 35px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: '900', color: '#38bdf8', letterSpacing: '1px', textTransform: 'uppercase' }}>Equipo seleccionado</span>
          <h1 style={{ fontSize: '26px', fontWeight: '900', margin: '4px 0 8px 0', letterSpacing: '-0.5px' }}>{teamInfo.equipo || 'Equipo sin nombre'}</h1>
          <div style={{ display: 'flex', gap: '15px', fontSize: '13px', color: '#94a3b8', flexWrap: 'wrap' }}>
            <span><strong>Liga:</strong> {teamInfo.liga || 'N/A'}</span>
            <span><strong>Categoria:</strong> {teamInfo.categoria || 'LIBRE'}</span>
            <span><strong>Seguro:</strong> {currentSeguro?.nombre || `ID ${currentSlot.seguro_id}`}</span>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px 20px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', fontWeight: '600' }}>Slots disponibles</span>
          <span style={{ fontSize: '24px', fontWeight: '950', color: slotsDisponibles === 0 ? '#ef4444' : '#10b981' }}>
            {slotsDisponibles} / {slotStatuses.length}
          </span>
        </div>
      </div>

      <div className="premium-card fade-in" style={{
        maxWidth: '1000px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '24px',
        padding: '40px',
        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <p style={{ margin: 0, color: '#475569', fontSize: '13px' }}>
            El borrador se guarda automaticamente al salir de cada campo o al completar OCR.
          </p>
          <div style={{ padding: '8px 12px', borderRadius: '999px', background: '#eff6ff', color: '#0b4ea6', fontSize: '12px', fontWeight: '700' }}>
            Estado actual: {PLAYER_STATUS_CONFIG[currentStatus]?.label || 'VACIO'}
          </div>
        </div>

        <section style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '18px' }}>
            <StepBadge number="1" isActive={Boolean(currentSlot)} isDone={Boolean(currentSlot)} />
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Slot asignado</h3>
          </div>

          <div style={{ padding: '24px', borderRadius: '18px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Jugador {slotIndex + 1}
                </div>
                <div style={{ marginTop: '8px', fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>
                  {currentSeguro?.nombre || `Seguro ${currentSlot.seguro_id}`}
                </div>
              </div>

              <div style={{ padding: '8px 12px', borderRadius: '999px', background: PLAYER_STATUS_CONFIG[currentStatus]?.bg, color: PLAYER_STATUS_CONFIG[currentStatus]?.color, fontSize: '12px', fontWeight: '800' }}>
                {PLAYER_STATUS_CONFIG[currentStatus]?.label || 'VACIO'}
              </div>
            </div>
          </div>
        </section>

        {showStep2 && (
          <section style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '18px' }}>
              <StepBadge number="2" isActive={!isStep2Done} isDone={isStep2Done} />
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Documentacion</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              {[...BASE_DOCUMENT_CARDS, ...(esMenorDeEdad ? MINOR_DOCUMENT_CARDS : [])].map((doc) => (
                <div
                  key={doc.key}
                  className="document-card"
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '20px',
                    border: currentDocuments[doc.key] ? '2px solid #10b981' : '2px dashed #cbd5e1',
                    padding: '18px',
                    textAlign: 'center',
                    transition: 'all 0.3s',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onClick={() => document.getElementById(`file-${doc.key}`).click()}
                >
                  {doc.key === 'foto' && currentPreviews.foto && (
                    <div style={{
                      height: '140px',
                      width: '100%',
                      backgroundColor: '#f8fafc',
                      borderRadius: '12px',
                      marginBottom: '10px',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #f1f5f9'
                    }}>
                      <img
                        src={currentPreviews.foto}
                        alt="Previsualizacion de la fotografia"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                  )}

                  <div style={{ fontSize: '32px', marginBottom: '12px', color: currentDocuments[doc.key] ? '#10b981' : '#94a3b8' }}>
                    {currentDocuments[doc.key] ? <FaCheckCircle /> : <FaUpload />}
                  </div>
                  <h4 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '8px', color: '#1e293b' }}>{doc.title}</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>{doc.subtitle}</p>
                  <div style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', backgroundColor: currentDocuments[doc.key] ? '#dcfce7' : '#f1f5f9', color: currentDocuments[doc.key] ? '#166534' : '#64748b', fontSize: '11px', fontWeight: '800' }}>
                    {currentDocuments[doc.key] ? 'Listo' : 'Pendiente'}
                  </div>

                  {doc.key === 'foto' && !currentDocuments.foto && failedPhotoState && String(failedPhotoState.slotId) === String(currentSlot.slot_id) && (
                    <div style={{ marginTop: '10px' }}>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          forceLoadFailedPhoto();
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          backgroundColor: '#f59e0b',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: '800',
                          cursor: 'pointer'
                        }}
                      >
                        Cargar igualmente
                      </button>
                    </div>
                  )}

                  <input
                    type="file"
                    id={`file-${doc.key}`}
                    style={{ display: 'none' }}
                    accept="image/*,.pdf"
                    onChange={(event) => handleFileUpload(doc.key, event.target.files[0])}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {showStep3 && (
          <section style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '18px' }}>
              <StepBadge number="3" isActive isDone={currentStatus === 'COMPLETO'} />
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Formulario de afiliacion</h3>
            </div>

            <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Nombre(s) *</label>
                  <input type="text" value={currentDatos.nombreJugador} onChange={(e) => handleFieldChange('nombreJugador', e.target.value)} onBlur={handleBlur} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Apellido paterno *</label>
                  <input type="text" value={currentDatos.apellidoPaterno} onChange={(e) => handleFieldChange('apellidoPaterno', e.target.value)} onBlur={handleBlur} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Apellido materno *</label>
                  <input type="text" value={currentDatos.apellidoMaterno} onChange={(e) => handleFieldChange('apellidoMaterno', e.target.value)} onBlur={handleBlur} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>CURP *</label>
                  <input
                    type="text"
                    value={currentDatos.curp || ''}
                    maxLength="18"
                    onChange={(e) => {
                      const curp = e.target.value.toUpperCase();
                      setCurrentDatos((previous) => ({
                        ...previous,
                        curp,
                        genero: inferGeneroFromCurp(curp, previous.genero)
                      }));
                    }}
                    onBlur={handleBlur}
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>NUI *</label>
                  <input type="text" value={currentDatos.nui || ''} onChange={(e) => handleFieldChange('nui', e.target.value)} onBlur={handleBlur} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Fecha de nacimiento *</label>
                  <input type="date" value={currentDatos.fechaNacimiento || ''} min={new Date(new Date().setFullYear(new Date().getFullYear() - 100)).toISOString().split('T')[0]} max={new Date().toISOString().split('T')[0]} onChange={(e) => handleFieldChange('fechaNacimiento', e.target.value)} onBlur={handleBlur} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Lugar de nacimiento *</label>
                  <input type="text" value={currentDatos.lugarNacimiento || ''} onChange={(e) => handleFieldChange('lugarNacimiento', e.target.value)} onBlur={handleBlur} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Sexo *</label>
                  <select value={currentDatos.genero || ''} onChange={(e) => handleImmediateDraftChange({ genero: e.target.value })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: 'white' }}>
                    <option value="">Seleccione...</option>
                    <option value="1">MASCULINO</option>
                    <option value="2">FEMENINO</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Correo electronico *</label>
                  <input type="email" value={currentDatos.correo} onChange={(e) => handleFieldChange('correo', e.target.value)} onBlur={handleBlur} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Telefono *</label>
                  <input type="tel" value={currentDatos.telefono} onChange={(e) => handleFieldChange('telefono', e.target.value)} onBlur={handleBlur} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Numero de camiseta *</label>
                  <input type="number" value={currentDatos.numCamiseta} onChange={(e) => handleFieldChange('numCamiseta', e.target.value)} onBlur={handleBlur} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Posicion *</label>
                  <select value={currentDatos.posicion || ''} onChange={(e) => handleImmediateDraftChange({ posicion: e.target.value })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: 'white' }}>
                    <option value="">Seleccione...</option>
                    {(catalogs.roles_equipo || []).map((rol) => (
                      <option key={rol.id} value={rol.id}>{rol.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ backgroundColor: '#fff7ed', border: '1px solid #ffedd5', padding: '30px', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', marginTop: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px', borderBottom: '1px solid #ffedd5', paddingBottom: '20px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                    <FaGlobeAmericas />
                  </div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#9a3412' }}>Antecedentes internacionales</h4>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <EntradaSeleccion
                    etiqueta="El jugador es foraneo"
                    valor={currentDatos.esForaneo ? '1' : '0'}
                    onChange={(event) => handleImmediateDraftChange({ esForaneo: event.target.value === '1' })}
                    opciones={[
                      { valor: '0', etiqueta: 'No' },
                      { valor: '1', etiqueta: 'Si' }
                    ]}
                    requerido
                  />
                </div>

                {currentDatos.esForaneo ? (
                  <div style={{ display: 'grid', gap: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                      <EntradaFormulario etiqueta="Nacionalidad del jugador" valor={currentDatos.nacionalidadJugador} onChange={(event) => handleFieldChange('nacionalidadJugador', event.target.value)} onBlur={handleBlur} />
                      <EntradaFormulario etiqueta="Pais de residencia actual" valor={currentDatos.paisResidencia} onChange={(event) => handleFieldChange('paisResidencia', event.target.value)} onBlur={handleBlur} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', alignItems: 'end' }}>
                      <EntradaSeleccion
                        etiqueta="Ha vivido en el extranjero"
                        valor={currentDatos.haVividoExtranjero ? '1' : '0'}
                        onChange={(event) => handleImmediateDraftChange({ haVividoExtranjero: event.target.value === '1' })}
                        opciones={[
                          { valor: '0', etiqueta: 'No' },
                          { valor: '1', etiqueta: 'Si' }
                        ]}
                        requerido
                      />
                      {currentDatos.haVividoExtranjero && (
                        <EntradaFormulario etiqueta="En que pais" valor={currentDatos.dondeVividoExtranjero} onChange={(event) => handleFieldChange('dondeVividoExtranjero', event.target.value)} onBlur={handleBlur} requerido />
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                      <EntradaFormulario etiqueta="Nacionalidad del padre" valor={currentDatos.nacionalidadPadre} onChange={(event) => handleFieldChange('nacionalidadPadre', event.target.value)} onBlur={handleBlur} />
                      <EntradaFormulario etiqueta="Nacionalidad de la madre" valor={currentDatos.nacionalidadMadre} onChange={(event) => handleFieldChange('nacionalidadMadre', event.target.value)} onBlur={handleBlur} />
                    </div>

                    <AreaTexto etiqueta="Registro por asociacion nacional extranjera" valor={currentDatos.registroAsociacionExtranjera} onChange={(event) => handleImmediateDraftChange({ registroAsociacionExtranjera: event.target.value })} filas={2} requerido />

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                      <EntradaFormulario etiqueta="Nac. abuelo paterno" valor={currentDatos.nacAbueloPaterno} onChange={(event) => handleFieldChange('nacAbueloPaterno', event.target.value)} onBlur={handleBlur} />
                      <EntradaFormulario etiqueta="Nac. abuela paterna" valor={currentDatos.nacAbuelaPaterna} onChange={(event) => handleFieldChange('nacAbuelaPaterna', event.target.value)} onBlur={handleBlur} />
                      <EntradaFormulario etiqueta="Nac. abuelo materno" valor={currentDatos.nacAbueloMaterno} onChange={(event) => handleFieldChange('nacAbueloMaterno', event.target.value)} onBlur={handleBlur} />
                      <EntradaFormulario etiqueta="Nac. abuela materna" valor={currentDatos.nacAbuelaMaterna} onChange={(event) => handleFieldChange('nacAbuelaMaterna', event.target.value)} onBlur={handleBlur} />
                    </div>

                    <AreaTexto etiqueta="Ha jugado en un club extranjero" valor={currentDatos.juegoClubExtranjero} onChange={(event) => handleImmediateDraftChange({ juegoClubExtranjero: event.target.value })} filas={3} requerido />
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#9a3412', fontStyle: 'italic' }}>
                      Si el jugador es foraneo, activa esta seccion para completar los antecedentes obligatorios.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '20px', marginTop: '40px' }}>
          {!isPublicFlow && (
            <BotonSecundario etiqueta="Cancelar y volver" alHacerClick={() => navigate(-1)} />
          )}
          <BotonSecundario etiqueta="Descargar formato" alHacerClick={handleDownloadFormato} />
          <BotonPrimario
            etiqueta="Finalizar registro completo"
            alHacerClick={handleFinalizarRegistroCompleto}
            deshabilitado={!allSlotsComplete}
          />
        </div>
      </div>
    </div>
  );
}
