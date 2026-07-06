import COLORS from '../../styles/colors';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getJugadorDocumentos, getJugadorSolicitudDocumento, subirDocumentoJugador } from '../../services/admin';
import { openSecurePath } from '../../utils/secureFetch';
import Loader from '../../components/Loader';
import Swal from 'sweetalert2';
import { FaArrowLeft, FaFileAlt, FaCheckCircle, FaExclamationCircle, FaUpload, FaClock, FaEye } from 'react-icons/fa';
import { ROUTES } from '../../routes/paths';
import CameraCaptureModal from '../../components/Common/CameraCaptureModal';
import { buildCaptureSourceDialog, CAMERA_CAPTURE_KIND } from '../../utils/cameraCapture';

// Tipos de documentos requeridos y opcionales por edad
const TIPOS_DOCUMENTO_ADULTO = [
  { id: 22, nombre: 'Acta de Nacimiento' },
  { id: 26, nombre: 'INE (Adulto)' },
  { id: 25, nombre: 'Fotografía' },
  { id: 28, nombre: 'Formato de Afiliación Prellenado' }
];

const TIPOS_DOCUMENTO_MENOR = [
  { id: 22, nombre: 'Acta de Nacimiento' },
  { id: 33, nombre: 'INE Tutor (Menor)' },
  { id: 36, nombre: 'Identificación Menor' },
  { id: 25, nombre: 'Fotografía' },
  { id: 28, nombre: 'Formato de Afiliación Prellenado' }
];

const normalizarTextoDocumento = (texto) =>
  String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const PALABRAS_CLAVE_POR_TIPO = {
  22: ['acta', 'nacimiento'],
  26: ['identificacion', 'ine', 'credencial', 'adulto'],
  25: ['foto', 'fotografia'],
  28: ['formato', 'afiliacion', 'prellenado'],
  33: ['tutor', 'ine tutor', 'padre', 'madre'],
  36: ['identificacion', 'menor']
};

const documentoCoincideConTipo = (doc, tipoId) => {
  const afiliacionId = Number(doc?.DocumentoAfiliacionId ?? doc?.documentoAfiliacionId ?? 0);
  const catalogoId = Number(doc?.DocumentoId ?? doc?.documentoId ?? 0);
  if (afiliacionId === tipoId || catalogoId === tipoId) return true;

  const nombre = normalizarTextoDocumento(doc?.nombre || doc?.NombreDocumento);
  const palabras = PALABRAS_CLAVE_POR_TIPO[tipoId] || [];
  return palabras.some((p) => nombre.includes(p));
};

const obtenerDocumentoMasRecientePorTipo = (documentos, tipoId) => {
  const delTipo = documentos.filter((doc) => documentoCoincideConTipo(doc, tipoId));
  if (delTipo.length === 0) return null;
  return delTipo.sort(
    (a, b) => new Date(b.FechaEntrega || 0) - new Date(a.FechaEntrega || 0)
  )[0];
};

export default function PresidenteJugadorDocumentos() {
  const { miembroEquipoId } = useParams();
  const navigate = useNavigate();

  const [documentos, setDocumentos] = useState([]);
  const [esMenor, setEsMenor] = useState(false);
  const [solicitudId, setSolicitudId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [jugadorInfo, setJugadorInfo] = useState(null);
  const [personaId, setPersonaId] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraTargetTipoId, setCameraTargetTipoId] = useState(25);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [resDocs, solId] = await Promise.all([
        getJugadorDocumentos(miembroEquipoId),
        getJugadorSolicitudDocumento(miembroEquipoId)
      ]);
      const docs = resDocs?.documentos || [];
      const isMinor = !!resDocs?.es_menor;
      const nombreCompleto = resDocs?.nombre_completo || '';
      const pId = resDocs?.persona_id || null;

      setDocumentos(docs);
      setEsMenor(isMinor);
      setSolicitudId(solId);
      setPersonaId(pId);

      setJugadorInfo({
        nombre: nombreCompleto || 'Miembro del Equipo'
      });
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudieron cargar los documentos del jugador.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [miembroEquipoId]);


  const handleSubirDocumento = async (tipoDocumentoId, archivo) => {
    if (!solicitudId) {
      Swal.fire('Error', 'No se pudo asociar la solicitud para subir el documento.', 'error');
      return;
    }

    if (!personaId) {
      Swal.fire('Error', 'No se pudo identificar la persona asociada al jugador.', 'error');
      return;
    }

    try {
      Swal.fire({
        title: 'Subiendo documento...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      await subirDocumentoJugador(
        personaId,
        tipoDocumentoId,
        archivo,
        Number(solicitudId)
      );

      Swal.close();
      await Swal.fire('¡Éxito!', 'El documento ha sido subido y enviado a revisión.', 'success');
      cargarDatos();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.detail || 'No se pudo subir el documento.';
      Swal.fire('Error', msg, 'error');
    }
  };

  const getEstatusInfo = (estadoId) => {
    switch (Number(estadoId)) {
      case 2:
        return {
          texto: 'Aprobado',
          color: COLORS.greenDark,
          bg: COLORS.greenBg50,
          border: COLORS.success,
          icon: <FaCheckCircle style={{ color: COLORS.greenDark }} />
        };
      case 1:
        return {
          texto: 'En espera',
          color: COLORS.warningDark,
          bg: COLORS.warningBgLight,
          border: COLORS.warning,
          icon: <FaClock style={{ color: COLORS.warningDark }} />
        };
      case 3:
        return {
          texto: 'Rechazado',
          color: COLORS.dangerDark,
          bg: COLORS.dangerBgLight,
          border: COLORS.danger,
          icon: <FaExclamationCircle style={{ color: COLORS.dangerDark }} />
        };
      default:
        return {
          texto: 'Faltante',
          color: COLORS.slate500,
          bg: COLORS.slate50,
          border: COLORS.slate300,
          icon: <FaFileAlt style={{ color: COLORS.slate500 }} />
        };
    }
  };

  const openUploadOptions = (tipoId) => {
    const supportsCameraCapture = tipoId !== 28;

    if (!supportsCameraCapture) {
      document.getElementById(`file-upload-${tipoId}`)?.click();
      return;
    }

    const captureKind = tipoId === 25 ? CAMERA_CAPTURE_KIND.PHOTO : CAMERA_CAPTURE_KIND.DOCUMENT;

    Swal.fire(buildCaptureSourceDialog(captureKind, COLORS)).then((result) => {
      if (result.isConfirmed) {
        setCameraTargetTipoId(tipoId);
        setIsCameraOpen(true);
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        document.getElementById(`file-upload-${tipoId}`)?.click();
      }
    });
  };

  if (loading) {
    return <Loader text="Cargando expediente digital..." />;
  }

  // Combinar los tipos requeridos con los documentos ya entregados
  const tiposAMostrar = esMenor ? TIPOS_DOCUMENTO_MENOR : TIPOS_DOCUMENTO_ADULTO;
  const docsRenderList = tiposAMostrar.map(tipo => {
    const entregado = obtenerDocumentoMasRecientePorTipo(documentos, tipo.id);
    return {
      tipoId: tipo.id,
      nombre: tipo.nombre,
      documento: entregado || null
    };
  });

  return (
    <div className="dashboard-content fade-in" style={{ padding: '30px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button
          onClick={() => navigate(ROUTES.PRESIDENTE.MIS_JUGADORES)}
          style={{
            background: 'white',
            border: `1.5px solid ${COLORS.slate200}`,
            borderRadius: '12px',
            width: '42px',
            height: '42px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: COLORS.slate600,
            boxShadow: `0 1px 3px ${COLORS.shadow05}`
          }}
          title="Regresar al listado"
        >
          <FaArrowLeft />
        </button>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: COLORS.slate800, margin: 0 }}>Documentación de {jugadorInfo?.nombre ? jugadorInfo.nombre.toUpperCase() : 'Jugador'}</h2>
          <p style={{ margin: 0, fontSize: '14px', color: COLORS.slate500, marginTop: '2px' }}>Consulta el estatus de los documentos de afiliación y sube archivos si fueron rechazados.</p>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '16px',
        marginTop: '20px'
      }}>
        {docsRenderList.map((item) => {
          const estatus = item.documento ? getEstatusInfo(item.documento.EstadoValidacionId) : getEstatusInfo(null);
          
          return (
            <div
              key={item.tipoId}
              style={{
                background: 'white',
                border: `1.5px solid ${estatus.border}`,
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '150px',
                maxWidth: '360px',
                boxShadow: `0 4px 6px -1px ${COLORS.shadow05}`,
                position: 'relative'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '700',
                textTransform: 'uppercase',
                background: estatus.bg,
                color: estatus.color,
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                {estatus.icon}
                {estatus.texto}
              </div>

              <div style={{ marginTop: '10px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: '800', color: COLORS.slate800, marginBottom: '8px', paddingRight: '90px' }}>
                  {item.nombre}
                </h4>
                {item.tipoId === 25 && (!item.documento || Number(item.documento.EstadoValidacionId) === 3) && (
                  <p style={{ margin: '5px 0 8px', fontSize: '11px', color: COLORS.danger, fontStyle: 'italic', fontWeight: '500', lineHeight: 1.4 }}>
                    Mantén una postura recta, visibilidad de hombros, sin sonrisa, ni accesorios como lentes, aretes o gorras.
                  </p>
                )}
                {item.documento && (
                  <p style={{ fontSize: '12px', color: COLORS.slate500, margin: 0 }}>
                    Entregado el: {new Date(item.documento.FechaEntrega).toLocaleDateString()}
                  </p>
                )}
              </div>

              {item.documento && Number(item.documento.EstadoValidacionId) === 3 && (
                <div style={{
                  background: COLORS.dangerBgLight,
                  border: `1px solid ${COLORS.dangerBgMedium}`,
                  borderRadius: '12px',
                  padding: '12px',
                  margin: '12px 0 6px 0',
                  fontSize: '12px',
                  color: COLORS.dangerDeep
                }}>
                  <strong>Motivo de rechazo:</strong> {item.documento.ObservacionesDocumento || 'No especificado por el administrador.'}
                </div>
              )}

              {(!item.documento || Number(item.documento.EstadoValidacionId) === 3) && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  {item.tipoId === 25 ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          openUploadOptions(item.tipoId);
                          return;
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
                              setIsCameraOpen(true);
                            } else if (result.dismiss === Swal.DismissReason.cancel) {
                              document.getElementById('file-upload-25').click();
                            }
                          });
                        }}
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          background: COLORS.primary,
                          color: 'white',
                          border: 'none',
                          borderRadius: '10px',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          textAlign: 'center',
                          margin: 0
                        }}
                      >
                        <FaUpload /> {item.documento ? 'Reemplazar' : 'Subir'}
                      </button>
                      <input
                        type="file"
                        id="file-upload-25"
                        accept=".pdf,.jpg,.jpeg,.png"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const ext = '.' + file.name.split('.').pop().toLowerCase();
                          const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
                          const allowedExt = ['.pdf', '.jpg', '.jpeg', '.png'];
                          if (!allowed.includes(file.type) || !allowedExt.includes(ext)) {
                            Swal.fire({ title: 'Tipo de archivo no permitido', text: 'Solo se aceptan archivos PDF, JPG, JPEG o PNG.', icon: 'error', confirmButtonColor: COLORS.primary });
                            return;
                          }
                          handleSubirDocumento(item.tipoId, file);
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          background: COLORS.primary,
                          color: 'white',
                          borderRadius: '10px',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          textAlign: 'center',
                          margin: 0,
                          border: 'none'
                        }}
                        onClick={() => openUploadOptions(item.tipoId)}
                      >
                        <FaUpload /> {item.documento ? 'Reemplazar' : 'Subir'}
                      </button>
                      <input
                        type="file"
                        id={`file-upload-${item.tipoId}`}
                        accept=".pdf,.jpg,.jpeg,.png"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const ext = '.' + file.name.split('.').pop().toLowerCase();
                          const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
                          const allowedExt = ['.pdf', '.jpg', '.jpeg', '.png'];
                          if (!allowed.includes(file.type) || !allowedExt.includes(ext)) {
                            Swal.fire({ title: 'Tipo de archivo no permitido', text: 'Solo se aceptan archivos PDF, JPG, JPEG o PNG.', icon: 'error', confirmButtonColor: COLORS.primary });
                            return;
                          }
                          handleSubirDocumento(item.tipoId, file);
                        }}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(file) => handleSubirDocumento(cameraTargetTipoId, file)}
        captureKind={cameraTargetTipoId === 25 ? CAMERA_CAPTURE_KIND.PHOTO : CAMERA_CAPTURE_KIND.DOCUMENT}
      />
    </div>
  );
}
