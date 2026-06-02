import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { 
  FaUpload, 
  FaSyncAlt, 
  FaFilePdf, 
  FaSave, 
  FaCheckCircle, 
  FaArrowLeft,
  FaArrowRight,
  FaFileSignature,
  FaUserEdit,
  FaGlobeAmericas
} from 'react-icons/fa';
import { 
  BotonPrimario, 
  BotonSecundario, 
  EntradaFormulario, 
  EntradaSeleccion, 
  AreaTexto,
  Tarjeta,
  Cargador
} from '../../components/partials';
import Swal from 'sweetalert2';
import { PDFDocument } from 'pdf-lib';
import { validarFotografia } from '../../services/foto';
import { registrarJugadorTemporal, getAvailableSlots, getInvitationInfo } from '../../services/teams';
import '../../styles/dashboard.css';

// Badge Estilizado para los pasos (Igual al de Admin)
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

export default function RegistroJugadores() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useParams();
  const isPublicFlow = !!token;
  const [teamId, setTeamId] = useState(location.state?.teamId || null);
  
  // ESTADOS
  const [uploading, setUploading] = useState(false);
  const [slotsInfo, setSlotsInfo] = useState({ disponibles: 0, total: 0 });
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [slotsData, setSlotsData] = useState(null);
  const [maxPlayers, setMaxPlayers] = useState(1);
  const [jugadores, setJugadores] = useState([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);

  const documentCards = [
    { key: 'actaNacimiento', title: 'Acta de Nacimiento', subtitle: 'Requerido para validación y auto-llenado' },
    { key: 'identificacion', title: 'Identificación Oficial (INE)', subtitle: 'INE, Pasaporte o Cédula' },
    { key: 'fotografia', title: 'Fotografía del Jugador', subtitle: 'Fotografía infantil formal' }
  ];

  const defaultPlayerDatos = {
    nombreJugador: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    curp: '',
    genero: '1',
    fechaNacimiento: '',
    lugarNacimiento: '',
    direccion: '',
    correo: '',
    telefono: '',
    tipoAfiliacion: 'JUGADOR',
    posicion: '',
    numCamiseta: '',
    asociacion: 'AFAEM',
    liga: '',
    equipo: '',
    categoria: '',
    esForaneo: false,
    nacionalidadJugador: 'MEXICANA',
    paisResidencia: 'MÉXICO',
    haVividoExtranjero: false,
    dondeVividoExtranjero: '',
    nacionalidadPadre: '',
    nacionalidadMadre: '',
    registroAsociacionExtranjera: '',
    nacAbueloPaterno: '',
    nacAbuelaPaterna: '',
    nacAbueloMaterno: '',
    nacAbuelaMaterna: '',
    juegoClubExtranjero: ''
  };

  const emptyPlayer = (index = 0, seguroId = '') => ({
    numero: index + 1,
    estado: 'VACIO',
    datos: { ...defaultPlayerDatos },
    documentos: {
      actaNacimiento: null,
      identificacion: null,
      fotografia: null,
      formatoAfiliacion: null,
      documentoEstudiante: null
    },
    seguroId,
    fillManually: false
  });

  const isPlayerMinor = (fechaNacimiento) => {
    if (!fechaNacimiento) return false;
    const hoy = new Date();
    const nac = new Date(fechaNacimiento);
    if (isNaN(nac.getTime())) return false;
    let edad = hoy.getFullYear() - nac.getFullYear();
    const mDiff = hoy.getMonth() - nac.getMonth();
    if (mDiff < 0 || (mDiff === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad < 18;
  };

  const getPlayerStatus = (player) => {
    if (!player) return 'VACIO';
    const datos = player.datos || {};
    const docs = player.documentos || {};
    const hasRequiredFields = Boolean(
      datos.nombreJugador?.trim() &&
      datos.apellidoPaterno?.trim() &&
      datos.curp?.trim() &&
      datos.fechaNacimiento &&
      datos.lugarNacimiento?.trim() &&
      datos.genero &&
      datos.correo?.trim()
    );
    const requiredDocs = [docs.actaNacimiento, docs.identificacion, docs.fotografia];
    const hasRequiredDocs = requiredDocs.every(Boolean) && (!isPlayerMinor(datos.fechaNacimiento) || Boolean(docs.documentoEstudiante));
    const hasAnyData = Object.values(datos).some(value => typeof value === 'string' ? value.trim() !== '' : Boolean(value)) || Object.values(docs).some(Boolean) || Boolean(player.seguroId);
    if (hasRequiredFields && hasRequiredDocs) return 'COMPLETO';
    if (hasAnyData) return 'EN_CAPTURA';
    return 'VACIO';
  };

  const normalizePlayer = (player) => ({
    ...player,
    estado: getPlayerStatus(player)
  });

  const updatePlayer = (index, partial) => {
    setJugadores(prev => {
      const next = [...prev];
      next[index] = normalizePlayer({ ...next[index], ...partial });
      return next;
    });
  };

  const updatePlayerDatos = (index, datosPartial) => {
    setJugadores(prev => {
      const next = [...prev];
      next[index] = normalizePlayer({
        ...next[index],
        datos: {
          ...next[index].datos,
          ...datosPartial
        }
      });
      return next;
    });
  };

  const updatePlayerDocuments = (index, documentosPartial) => {
    setJugadores(prev => {
      const next = [...prev];
      next[index] = normalizePlayer({
        ...next[index],
        documentos: {
          ...next[index].documentos,
          ...documentosPartial
        }
      });
      return next;
    });
  };

  const updatePlayerSeguro = (index, seguroId) => {
    setJugadores(prev => {
      const next = [...prev];
      next[index] = normalizePlayer({
        ...next[index],
        seguroId
      });
      return next;
    });
  };

  const currentPlayer = jugadores[currentPlayerIndex] || emptyPlayer(currentPlayerIndex, String(slotsData?.seguros?.[0]?.seguro_id || ''));
  const currentDatos = currentPlayer.datos;
  const currentDocuments = currentPlayer.documentos;
  const currentSeguroId = currentPlayer.seguroId;
  const currentFillManually = currentPlayer.fillManually;

  const playerStatusConfig = {
    VACIO: { icon: '⚪', label: 'VACIO', bg: '#f8fafc', color: '#475569' },
    EN_CAPTURA: { icon: '🟡', label: 'EN_CAPTURA', bg: '#fffbeb', color: '#92400e' },
    COMPLETO: { icon: '🟢', label: 'COMPLETO', bg: '#dcfce7', color: '#166534' }
  };

  const currentPlayerStatus = getPlayerStatus(currentPlayer);

  // ── Detección de minoría de edad ──
  const esMenorDeEdad = React.useMemo(() => isPlayerMinor(currentDatos.fechaNacimiento), [currentDatos.fechaNacimiento]);

  // DETERMINACIÓN DE PASOS
  const isStep1Done = !!teamId; // El equipo ya viene seleccionado desde el dashboard
  const isStep2Done = Object.values(currentDocuments).some(d => d !== null);
  const showStep2 = isStep1Done;
  const showStep3 = isStep2Done || currentFillManually;

  // CARGAR SLOTS Y DATOS DEL EQUIPO
  const fetchTeamInfo = async () => {
    let effectiveTeamId = teamId;
    let inviteData = null;
    let inviteTeamInfo = {};

    try {
      setLoadingSlots(true);

      if (isPublicFlow && !teamId) {
        inviteData = await getInvitationInfo(token);
        effectiveTeamId = inviteData.equipo_temporal_id;
        setTeamId(effectiveTeamId);
        inviteTeamInfo = {
          equipo: inviteData.nombre_equipo || '',
          liga: inviteData.nombre_liga || '',
          categoria: inviteData.nombre_categoria || 'LIBRE'
        };
      }

      if (!effectiveTeamId) {
        if (!isPublicFlow) {
          Swal.fire('Error', 'No se especificó un equipo para el registro.', 'error');
          navigate('/presidente-equipo/dashboard');
        }
        return;
      }

      const data = await getAvailableSlots(effectiveTeamId);
      setSlotsData(data);
      const paidPlayers = parseInt(data.cantidad_jugadores_pagados ?? data.total_slots ?? 1, 10) || 1;
      setSlotsInfo({
        disponibles: data.jugadores_restantes ?? data.slots_disponibles ?? 0,
        total: paidPlayers
      });
      setMaxPlayers(paidPlayers);

      const firstSeguroId = String(data.seguros?.[0]?.seguro_id || '');
      setJugadores(prev => {
        const next = prev.length === paidPlayers
          ? prev
          : Array.from({ length: paidPlayers }, (_, i) => emptyPlayer(i, firstSeguroId));

        return next.map(player => normalizePlayer({
          ...player,
          seguroId: player.seguroId || firstSeguroId,
          datos: {
            ...player.datos,
            equipo: player.datos.equipo || inviteTeamInfo.equipo || '',
            liga: player.datos.liga || inviteTeamInfo.liga || '',
            categoria: player.datos.categoria || inviteTeamInfo.categoria || ''
          }
        }));
      });
    } catch (err) {
      console.error('Error al obtener info del equipo:', err);
      if (isPublicFlow && !inviteData) {
        Swal.fire('Error', err.response?.data?.detail || 'No se pudo cargar la invitación.', 'error');
      }
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    fetchTeamInfo();
  }, [teamId, token, isPublicFlow, navigate]);

  // PROCESAR OCR (Sincronizado con Admin)
  const handleFileUpload = async (documentKey, file) => {
    if (!file) return;
    updatePlayerDocuments(currentPlayerIndex, { [documentKey]: file });

    if (documentKey === 'fotografia') {
      Swal.fire({ title: 'Validando Fotografía...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
      try {
        const data = await validarFotografia(file);
        if (data.valido) {
          Swal.fire({ title: 'Fotografía Aceptada!', icon: 'success', timer: 1500, showConfirmButton: false });
        } else {
          Swal.fire('Error en la fotografía', data.mensaje, 'error');
          updatePlayerDocuments(currentPlayerIndex, { [documentKey]: null });
        }
      } catch (err) { Swal.fire('Error', 'No se pudo procesar la foto.', 'error'); }
    }

    if (documentKey === 'actaNacimiento' || documentKey === 'identificacion') {
      Swal.fire({ title: 'Analizando Documento...', html: 'Extrayendo información vía OCR.', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
      try {
        const formDataOcr = new FormData();
        formDataOcr.append('file_id', file);
        const response = await fetch('/ocr-api', { method: 'POST', body: formDataOcr });
        const htmlText = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");
        
        let nom = '', crp = '', fnac = '', lnac = '';
        const rows = doc.querySelectorAll('.dato-fila');
        rows.forEach(row => {
          const lbl = row.querySelector('.etiqueta')?.textContent?.toLowerCase() || '';
          const val = row.querySelector('.valor')?.textContent?.trim() || '';
          if (lbl.includes('nombre')) nom = val;
          if (lbl.includes('curp')) crp = val;
          if (lbl.includes('lugar') || lbl.includes('entidad')) lnac = val;
          if (lbl.includes('nacimiento') || lbl.includes('fecha nac')) {
            if (val.includes('/')) {
              const p = val.split('/');
              if (p.length === 3) fnac = p[2].length === 4 ? `${p[2]}-${p[1]}-${p[0]}` : `${p[0]}-${p[1]}-${p[2]}`;
            } else fnac = val;
          }
        });

        if (nom || crp || fnac) {
          const parts = nom ? nom.split(' ') : [];
          let f = '', lp = '', lm = '';
          if (parts.length >= 3) { lp = parts[0]; lm = parts[1]; f = parts.slice(2).join(' '); }
          else if (parts.length === 2) { lp = parts[0]; f = parts[1]; }
          else f = nom;

          updatePlayerDatos(currentPlayerIndex, {
            nombreJugador: f || currentDatos.nombreJugador,
            apellidoPaterno: lp || currentDatos.apellidoPaterno,
            apellidoMaterno: lm || currentDatos.apellidoMaterno,
            curp: crp || currentDatos.curp,
            fechaNacimiento: fnac || currentDatos.fechaNacimiento,
            lugarNacimiento: lnac || currentDatos.lugarNacimiento
          });
          Swal.fire({ title: 'Lectura Exitosa!', icon: 'success', timer: 1500, showConfirmButton: false });
        }
      } catch (err) { Swal.fire('Aviso', 'OCR no disponible. Favor de completar manualmente.', 'info'); }
    }
  };

  const safeSetField = (form, fieldName, value, fontSize) => {
    if (!value) return;
    try {
      const field = form.getTextField(fieldName);
      if (field) {
        field.setText(value.toString().toUpperCase());
        if (fontSize) field.setFontSize(fontSize);
      }
    } catch (e) { console.warn(`Campo PDF no encontrado: ${fieldName}`); }
  };

  const handleDownloadFormato = async () => {
    try {
      Swal.fire({ title: 'Generando PDF...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
      const templateUrl = '/formato_afiliacion_jugador.pdf';
      const existingPdfBytes = await fetch(templateUrl).then(res => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const form = pdfDoc.getForm();
      const firstPage = pdfDoc.getPages()[0];

      if (currentDocuments.fotografia) {
        try {
          const photoBytes = await currentDocuments.fotografia.arrayBuffer();
          const photoImage = currentDocuments.fotografia.name.toLowerCase().endsWith('.png') ? await pdfDoc.embedPng(photoBytes) : await pdfDoc.embedJpg(photoBytes);
          firstPage.drawImage(photoImage, { x: 479, y: 676, width: 76, height: 90 });
        } catch (e) {}
      }

      // MAPEO DE CAMPOS (Sincronizado con Admin)
      safeSetField(form, 'Nombres', currentDatos.nombreJugador);
      safeSetField(form, 'Apellido Paterno', currentDatos.apellidoPaterno);
      safeSetField(form, 'Apellido Materno', currentDatos.apellidoMaterno);
      safeSetField(form, 'CURP o Clave Única de Registro de Población', currentDatos.curp);
      safeSetField(form, 'Fecha de Nacimiento', currentDatos.fechaNacimiento);
      safeSetField(form, 'Sexo', currentDatos.genero === '1' ? 'MASCULINO' : 'FEMENINO');
      safeSetField(form, 'Lugar de Nacimiento', currentDatos.lugarNacimiento);
      const correoRJ = currentDatos.correo || '';
      const correoRJFs = correoRJ.length > 35 ? 6 : correoRJ.length > 25 ? 7 : correoRJ.length > 18 ? 8 : 10;
      safeSetField(form, 'Correo electrónico', correoRJ, correoRJFs);
      safeSetField(form, 'Teléfono', currentDatos.telefono);
      safeSetField(form, 'Asociación', currentDatos.asociacion);
      safeSetField(form, 'Liga', (currentDatos.liga || '').split('(')[0].trim());
      safeSetField(form, 'Equipo', currentDatos.equipo);
      safeSetField(form, 'Categoría', currentDatos.categoria);
      safeSetField(form, 'Posición', currentDatos.posicion);
      safeSetField(form, 'Camiseta', currentDatos.numCamiseta);

      if (currentDatos.esForaneo) {
        safeSetField(form, 'Nacionalidades del jugador', currentDatos.nacionalidadJugador);
        safeSetField(form, 'País de residencia actual', currentDatos.paisResidencia);
        safeSetField(form, '¿El jugador ha vivido en el extranjero? ¿En que país?', currentDatos.haVividoExtranjero ? currentDatos.dondeVividoExtranjero : 'NO');
        safeSetField(form, 'Nacionalidades del padre', currentDatos.nacionalidadPadre);
        safeSetField(form, 'Nacionalidades de la madre', currentDatos.nacionalidadMadre);
        safeSetField(form, 'Nacionalidades del abuelo paterno', currentDatos.nacAbueloPaterno);
        safeSetField(form, 'Nacionalidades de la abuela paterna', currentDatos.nacAbuelaPaterna);
        safeSetField(form, 'Nacionalidades del abuelo materno', currentDatos.nacAbueloMaterno);
        safeSetField(form, 'Nacionalidades de la abuela materna', currentDatos.nacAbuelaMaterna);
        safeSetField(form, 'El jugador ha sido registrado por la Asociación Nacional de Fútbol...', currentDatos.registroAsociacionExtranjera);
        safeSetField(form, 'El jugador ha jugado en un Club extranjero...', currentDatos.juegoClubExtranjero);
      }

      // 3. FECHA DE DESCARGA AUTOMÁTICA
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

      Swal.fire('Listo!', 'El formato se ha descargado correctamente.', 'success');
    } catch (err) { 
      console.error(err);
      Swal.fire('Error', 'No se pudo generar el PDF.', 'error'); 
    }
  };

  const handleGuardar = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!currentDatos.nombreJugador || !currentDatos.curp) {
      Swal.fire('Atención', 'Nombre y CURP son obligatorios.', 'warning');
      return;
    }

    setUploading(true);
    Swal.fire({ title: 'Registrando Jugador', text: 'Enviando información...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    try {
      const formData = new FormData();
      formData.append('equipo_temporal_id', teamId);
      formData.append('nombre', currentDatos.nombreJugador);
      formData.append('primer_apellido', currentDatos.apellidoPaterno);
      formData.append('segundo_apellido', currentDatos.apellidoMaterna);
      formData.append('CURP', currentDatos.curp);
      formData.append('sexo_id', parseInt(currentDatos.genero, 10));
      formData.append('fecha_nacimiento', currentDatos.fechaNacimiento);
      formData.append('lugar_nacimiento', currentDatos.lugarNacimiento);
      formData.append('correo', currentDatos.correo);
      formData.append('telefono', currentDatos.telefono);
      formData.append('posicion', currentDatos.posicion);
      formData.append('num_camiseta', currentDatos.numCamiseta);
      formData.append('seguro_id', currentSeguroId || String(slotsData?.seguros?.[0]?.seguro_id || 1));

      if (currentDatos.esForaneo) {
        formData.append('es_foraneo', '1');
        formData.append('nacionalidad_jugador', currentDatos.nacionalidadJugador);
        formData.append('pais_resid_actual', currentDatos.paisResidencia);
        formData.append('ha_vivido_extranjero', currentDatos.haVividoExtranjero ? '1' : '0');
        formData.append('donde_vivido', currentDatos.dondeVividoExtranjero);
      }

      ['actaNacimiento', 'identificacion', 'fotografia', 'formatoAfiliacion'].forEach(key => {
        if (currentDocuments[key]) { formData.append('documento_afiliacion_ids', 3); formData.append('archivos', currentDocuments[key]); }
      });

      if (esMenorDeEdad && currentDocuments.documentoEstudiante) {
        formData.append('documento_estudiante', currentDocuments.documentoEstudiante);
      }

      await registrarJugadorTemporal(formData);
      Swal.fire({ title: 'Registro Exitoso!', text: 'El jugador ha sido enviado a revisión por el administrador.', icon: 'success' })
        .then(() => {
          if (isPublicFlow) {
            updatePlayerDocuments(currentPlayerIndex, {
              actaNacimiento: null,
              identificacion: null,
              fotografia: null,
              formatoAfiliacion: null,
              documentoEstudiante: null
            });
            updatePlayerDatos(currentPlayerIndex, {
              ...defaultPlayerDatos,
              liga: currentDatos.liga,
              equipo: currentDatos.equipo,
              categoria: currentDatos.categoria
            });
            updatePlayer(currentPlayerIndex, { fillManually: false });
            fetchTeamInfo();
          } else {
            navigate(`/presidente-equipo/admin-equipo/${teamId}`);
          }
        });
    } catch (err) { 
      Swal.fire('Error', 'No se pudo completar el registro.'); 
      //DESCOMENTAR PARA DEBUG. Swal.fire('Error', 'No se pudo completar el registro.', 'error'); 
    } finally { setUploading(false); }
  };

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
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Registro de Jugador</h2>
          </div>

          {jugadores.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setCurrentPlayerIndex(prev => Math.max(prev - 1, 0))}
                disabled={currentPlayerIndex === 0}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  background: currentPlayerIndex === 0 ? '#f1f5f9' : 'white',
                  color: '#1e293b',
                  cursor: currentPlayerIndex === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                <FaArrowLeft />
              </button>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>Jugador {currentPlayerIndex + 1} de {jugadores.length}</div>
              <button
                type="button"
                onClick={() => setCurrentPlayerIndex(prev => Math.min(prev + 1, jugadores.length - 1))}
                disabled={currentPlayerIndex === jugadores.length - 1}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  background: currentPlayerIndex === jugadores.length - 1 ? '#f1f5f9' : 'white',
                  color: '#1e293b',
                  cursor: currentPlayerIndex === jugadores.length - 1 ? 'not-allowed' : 'pointer'
                }}
              >
                <FaArrowRight />
              </button>
            </div>
          )}
        </div>

        {jugadores.length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '0 16px' }}>
            {(() => {
              const index = currentPlayerIndex;
              const status = getPlayerStatus(jugadores[index]);
              const config = playerStatusConfig[status] || playerStatusConfig.VACIO;
              return (
                <button
                  key={`player-status-${index}`}
                  type="button"
                  onClick={() => setCurrentPlayerIndex(index)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '16px',
                    border: '2px solid #0b4ea6',
                    background: '#eff6ff',
                    color: '#1e293b',
                    cursor: 'default',
                    minWidth: '220px',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ fontSize: '14px' }}>{config.icon}</span>
                  <span style={{ fontWeight: '700' }}>Jugador {index + 1}</span>
                  <span style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: '999px', background: config.bg, color: config.color, fontSize: '11px', fontWeight: '700' }}>
                    {config.label}
                  </span>
                </button>
              );
            })()}
          </div>
        )}
      </div>
      <div style={{ height: '132px' }} />

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
          <span style={{ fontSize: '11px', fontWeight: '900', color: '#38bdf8', letterSpacing: '1px', textTransform: 'uppercase' }}>Equipo Seleccionado</span>
          <h1 style={{ fontSize: '26px', fontWeight: '900', margin: '4px 0 8px 0', letterSpacing: '-0.5px' }}>{currentDatos.equipo || 'Equipo No Detectado'}</h1>
          <div style={{ display: 'flex', gap: '15px', fontSize: '13px', color: '#94a3b8', flexWrap: 'wrap' }}>
            <span><strong>Liga:</strong> {currentDatos.liga || 'N/A'}</span>
            <span>•</span>
            <span><strong>Categoría:</strong> {currentDatos.categoria || 'LIBRE'}</span>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px 20px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', fontWeight: '600' }}>Slots Disponibles</span>
          <span style={{ fontSize: '24px', fontWeight: '950', color: slotsInfo.disponibles === 0 ? '#ef4444' : '#10b981' }}>
            {slotsInfo.disponibles} / {slotsInfo.total}
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
        <div style={{ marginBottom: '30px', borderBottom: '1px solid #f1f5f9', paddingBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p className="required-legend" style={{ margin: 0 }}>
            <span className="required-star">*</span> Indica que el campo es obligatorio para el registro oficial.
          </p>
        </div>

        {/* PASO 1: SELECCIÓN DE SEGURO / SLOT A CONSUMIR */}
        <section style={{ marginBottom: '45px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '24px' }}>
            <StepBadge number="1" isActive={!!currentSeguroId} isDone={!!currentSeguroId} />
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Seguro / Slot pagado a asignar</h3>
          </div>
          <div style={{ animation: 'slideUp 0.4s ease', maxWidth: '800px', margin: '0 auto' }}>
            <div className="card" style={{ padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <label className="form-label" style={{ fontWeight: '700', fontSize: '14px', marginBottom: '12px', display: 'block' }}>
                Seleccione el seguro comprado a consumir para esta inscripción: <span className="required-star">*</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                {loadingSlots ? (
                  <div style={{ padding: '18px', color: '#475569' }}>Cargando seguros...</div>
                ) : (
                  (slotsData?.seguros || []).length > 0 ? (
                    slotsData.seguros.map((seg) => {
                      const isSelected = String(currentSeguroId) === String(seg.seguro_id);
                      return (
                        <button
                          key={`seguro-card-${seg.seguro_id}`}
                          type="button"
                          onClick={() => updatePlayerSeguro(currentPlayerIndex, String(seg.seguro_id))}
                          style={{
                            padding: '16px',
                            borderRadius: '12px',
                            border: isSelected ? '2.5px solid #0b4ea6' : '1px solid #cbd5e1',
                            backgroundColor: isSelected ? '#eff6ff' : 'white',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                          }}
                        >
                          <span style={{ fontSize: '14px', fontWeight: '800', color: isSelected ? '#0b4ea6' : '#1e293b' }}>🛡️ {seg.nombre}</span>
                          <div style={{ marginTop: '6px', display: 'inline-flex', alignSelf: 'start', padding: '2px 8px', borderRadius: '20px', background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: '800' }}>
                            {seg.disponibles} disponibles
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div style={{ padding: '18px', borderRadius: '14px', background: '#f1f5f9', color: '#475569', fontSize: '13px' }}>
                      No hay seguros disponibles para mostrar. Se usará el seguro predeterminado en caso de que el sistema lo permita.
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </section>

        {/* PASO 1: CONFIRMACIÓN DE EQUIPO */}
        {false && (
        <section style={{ marginBottom: '45px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '24px' }}>
            <StepBadge number="1" isActive={!isStep1Done} isDone={isStep1Done} />
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Confirmación de Equipo</h3>
          </div>
          <div style={{ animation: 'slideUp 0.4s ease', maxWidth: '800px', margin: '0 auto' }}>
            <div className="card" style={{ padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
              {loadingSlots ? <Cargador texto="Validando equipo..." /> : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: '900', color: '#0b4ea6', letterSpacing: '1px', textTransform: 'uppercase' }}>Equipo seleccionado</span>
                    <h4 style={{ fontSize: '18px', fontWeight: '900', margin: '8px 0 5px 0' }}>{currentDatos.equipo || 'Equipo No Detectado'}</h4>
                    <div style={{ color: '#64748b', fontSize: '13px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <span><strong>Liga:</strong> {currentDatos.liga || 'N/A'}</span>
                      <span><strong>Categoría:</strong> {currentDatos.categoria || 'LIBRE'}</span>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px 20px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', fontWeight: '600' }}>Slots Disponibles</span>
                    <span style={{ fontSize: '24px', fontWeight: '950', color: slotsInfo.disponibles === 0 ? '#ef4444' : '#10b981' }}>
                      {slotsInfo.disponibles} / {slotsInfo.total}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
        )}
        {/* PASO 2: CARGA DE DOCUMENTACIÓN */}
        {showStep2 && (
          <section className="fade-in" style={{ marginBottom: '45px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
              <StepBadge number="2" isActive={!isStep2Done} isDone={isStep2Done} />
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Carga de Documentación</h3>
            </div>
            <div style={{ marginBottom: '24px', paddingLeft: '47px' }}>
              <div style={{ 
                background: '#f8fafc', 
                border: '1px solid #e2e8f0', 
                padding: '10px 16px', 
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                color: '#475569',
                fontSize: '13px',
                fontWeight: '600'
              }}>
                <span style={{ fontSize: '18px' }}>✨</span>
                Sube el acta de nacimiento para auto-llenar los datos del jugador.
              </div>
            </div>

            <div style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '12px',
              padding: '12px 18px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              color: '#0369a1',
              fontWeight: '600'
            }}>
              <span style={{ fontSize: '18px' }}>📋</span>
              Sube primero el <strong style={{ marginLeft: 4 }}>Acta de Nacimiento</strong>. El sistema detectará la minoría de edad y ajustará los requisitos.
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '20px'
            }}>
              {documentCards.map((doc) => (
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
                    cursor: 'pointer'
                  }}
                  onClick={() => document.getElementById(`file-${doc.key}`).click()}
                >
                  <div style={{ fontSize: '32px', marginBottom: '12px', color: currentDocuments[doc.key] ? '#10b981' : '#94a3b8' }}>
                    {currentDocuments[doc.key] ? <FaCheckCircle /> : <FaUpload />}
                  </div>
                  <h4 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '8px', color: '#1e293b' }}>{doc.title}</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>{doc.subtitle}</p>
                  <div style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', backgroundColor: currentDocuments[doc.key] ? '#dcfce7' : '#f1f5f9', color: currentDocuments[doc.key] ? '#166534' : '#64748b', fontSize: '11px', fontWeight: '800' }}>
                    {currentDocuments[doc.key] ? <><FaCheckCircle /> Listo</> : 'Pendiente'}
                  </div>
                  <input type="file" id={`file-${doc.key}`} style={{ display: 'none' }} accept="image/*,.pdf" onChange={(e) => handleFileUpload(doc.key, e.target.files[0])} />
                </div>
              ))}
            </div>

            {currentDocuments.actaNacimiento && !currentDatos.fechaNacimiento && (
              <div className="fade-in" style={{ marginTop: '16px', padding: '12px 18px', background: '#fffbeb', border: '1px dashed #fbbf24', borderRadius: '10px', fontSize: '12px', color: '#92400e', fontWeight: '600' }}>
                ⏳ Analizando el Acta de Nacimiento vía OCR... Los documentos adicionales aparecerán en breve.
              </div>
            )}

            {currentDocuments.actaNacimiento && currentDatos.fechaNacimiento && !esMenorDeEdad && (
              <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginTop: '20px' }}>
                {[{ key: 'identificacion', title: 'Identificación Oficial (INE)', subtitle: 'INE, Pasaporte o Cédula' }] .map(doc => (
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
                      cursor: 'pointer'
                    }}
                    onClick={() => document.getElementById(`file-${doc.key}`).click()}
                  >
                    <div style={{ fontSize: '32px', marginBottom: '12px', color: currentDocuments[doc.key] ? '#10b981' : '#94a3b8' }}>
                      {currentDocuments[doc.key] ? <FaCheckCircle /> : <FaUpload />}
                    </div>
                    <h4 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '8px', color: '#1e293b' }}>{doc.title}</h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>{doc.subtitle}</p>
                    <div style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', backgroundColor: currentDocuments[doc.key] ? '#dcfce7' : '#f1f5f9', color: currentDocuments[doc.key] ? '#166534' : '#64748b', fontSize: '11px', fontWeight: '800' }}>
                      {currentDocuments[doc.key] ? <><FaCheckCircle /> Listo</> : 'Pendiente'}
                    </div>
                    <input type="file" id={`file-${doc.key}`} style={{ display: 'none' }} accept="image/*,.pdf" onChange={(e) => handleFileUpload(doc.key, e.target.files[0])} />
                  </div>
                ))}
              </div>
            )}

            {currentDocuments.actaNacimiento && currentDatos.fechaNacimiento && esMenorDeEdad && (
              <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginTop: '20px' }}>
                <div
                  className="document-card"
                  style={{
                    borderRadius: '20px',
                    border: currentDocuments.documentoEstudiante ? '2px solid #10b981' : '2px dashed #fbbf24',
                    background: currentDocuments.documentoEstudiante ? 'rgba(16,185,129,0.04)' : 'linear-gradient(135deg,#fffbeb,#fef3c7)',
                    padding: '18px',
                    textAlign: 'center',
                    transition: 'all 0.3s',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                  onClick={() => document.getElementById('file-documentoEstudiante').click()}
                >
                  <div style={{ position: 'absolute', top: 10, right: 10, background: 'linear-gradient(90deg,#f59e0b,#fbbf24)', borderRadius: '12px', padding: '4px 10px', fontSize: '10px', fontWeight: '950', color: 'white' }}>🧒 MENOR</div>
                  <div style={{ fontSize: '32px', marginBottom: '12px', color: currentDocuments.documentoEstudiante ? '#10b981' : '#f59e0b' }}>
                    {currentDocuments.documentoEstudiante ? <FaCheckCircle /> : <FaUpload />}
                  </div>
                  <h4 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '8px', color: '#1e293b' }}>Documento de Estudiante</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>Credencial escolar, certificado o carta de residencia</p>
                  <div style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', backgroundColor: currentDocuments.documentoEstudiante ? '#dcfce7' : '#f1f5f9', color: currentDocuments.documentoEstudiante ? '#166534' : '#64748b', fontSize: '11px', fontWeight: '800' }}>
                    {currentDocuments.documentoEstudiante ? <><FaCheckCircle /> Listo</> : 'Pendiente'}
                  </div>
                  <input type="file" id="file-documentoEstudiante" style={{ display: 'none' }} accept="image/*,.pdf" onChange={(e) => handleFileUpload('documentoEstudiante', e.target.files[0])} />
                </div>
              </div>
            )}

            {currentDocuments.actaNacimiento && currentDatos.fechaNacimiento && (
              <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginTop: '20px' }}>
                {[{ key: 'fotografia', title: 'Fotografía del Jugador', subtitle: 'Fotografía infantil formal' }].map(doc => (
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
                      cursor: 'pointer'
                    }}
                    onClick={() => document.getElementById(`file-${doc.key}`).click()}
                  >
                    <div style={{ fontSize: '32px', marginBottom: '12px', color: currentDocuments[doc.key] ? '#10b981' : '#94a3b8' }}>
                      {currentDocuments[doc.key] ? <FaCheckCircle /> : <FaUpload />}
                    </div>
                    <h4 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '8px', color: '#1e293b' }}>{doc.title}</h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>{doc.subtitle}</p>
                    <div style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', backgroundColor: currentDocuments[doc.key] ? '#dcfce7' : '#f1f5f9', color: currentDocuments[doc.key] ? '#166534' : '#64748b', fontSize: '11px', fontWeight: '800' }}>
                      {currentDocuments[doc.key] ? <><FaCheckCircle /> Listo</> : 'Pendiente'}
                    </div>
                    <input type="file" id={`file-${doc.key}`} style={{ display: 'none' }} accept="image/*,.pdf" onChange={(e) => handleFileUpload(doc.key, e.target.files[0])} />
                  </div>
                ))}
              </div>
            )}

            {!isStep2Done && (
              <div style={{ textAlign: 'center', marginTop: '25px' }}>
                <button
                  type="button"
                  onClick={() => updatePlayer(currentPlayerIndex, { fillManually: true })}
                  style={{ fontSize: '13px', color: '#0b4ea6', fontWeight: '700', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}
                >
                  Omitir carga y llenar datos manualmente
                </button>
              </div>
            )}
          </section>
        )}

        {/* PASO 3: FORMULARIO */}
        {showStep3 && (
          <section className="fade-in" style={{ marginBottom: '40px' }}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <StepBadge number="3" isActive={true} isDone={false} />
                <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', margin: 0 }}>Formulario de afiliación completo</h3>
              </div>
            </div>

            <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginBottom: '30px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Nombre(s) <span className="required-star">*</span></label>
                  <input type="text" value={currentDatos.nombreJugador} onChange={e => updatePlayerDatos(currentPlayerIndex, {...currentDatos, nombreJugador: e.target.value})} placeholder="Ej. Juan" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Ap. Paterno <span className="required-star">*</span></label>
                  <input type="text" value={currentDatos.apellidoPaterno} onChange={e => updatePlayerDatos(currentPlayerIndex, {...currentDatos, apellidoPaterno: e.target.value})} placeholder="Ej. Pérez" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Ap. Materno</label>
                  <input type="text" value={currentDatos.apellidoMaterno} onChange={e => updatePlayerDatos(currentPlayerIndex, {...currentDatos, apellidoMaterno: e.target.value})} placeholder="Ej. Gómez" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}># Camiseta</label>
                  <input type="number" value={currentDatos.numCamiseta} onChange={e => updatePlayerDatos(currentPlayerIndex, {...currentDatos, numCamiseta: e.target.value})} placeholder="Ej. 10" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Posición en el campo</label>
                  <select value={currentDatos.posicion} onChange={e => updatePlayerDatos(currentPlayerIndex, {...currentDatos, posicion: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: 'white' }}>
                    <option value="">Posición...</option>
                    <option value="PORTERO">Portero</option>
                    <option value="DEFENSA">Defensa</option>
                    <option value="MEDIO">Medio</option>
                    <option value="DELANTERO">Delantero</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '15px', marginBottom: '25px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>CURP o Identificador <span className="required-star">*</span></label>
                  <input type="text" value={currentDatos.curp || ''} onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    let sId = currentDatos.genero;
                    if (val.length >= 11) {
                      const char = val.charAt(10);
                      if (char === 'M') sId = '2';
                      else if (char === 'H') sId = '1';
                    }
                    updatePlayerDatos(currentPlayerIndex, {...currentDatos, curp: val, genero: sId});
                  }} placeholder="ABCD..." maxLength="18" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Fecha Nac. <span className="required-star">*</span></label>
                  <input
                    type="date"
                    value={currentDatos.fechaNacimiento || ''}
                    min={new Date(new Date().setFullYear(new Date().getFullYear() - 100)).toISOString().split('T')[0]}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={e => updatePlayerDatos(currentPlayerIndex, {...currentDatos, fechaNacimiento: e.target.value})}
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Lugar de Nacimiento <span className="required-star">*</span></label>
                  <input type="text" value={currentDatos.lugarNacimiento || ''} onChange={e => updatePlayerDatos(currentPlayerIndex, {...currentDatos, lugarNacimiento: e.target.value})} placeholder="Ej. Monterrey, NL" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Sexo <span className="required-star">*</span></label>
                  <select value={currentDatos.genero || ""} onChange={e => updatePlayerDatos(currentPlayerIndex, {...currentDatos, genero: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: 'white' }}>
                    <option value="">Seleccione...</option>
                    <option value="1">MASCULINO</option>
                    <option value="2">FEMENINO</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Correo electrónico <span className="required-star">*</span></label>
                  <input type="email" value={currentDatos.correo} onChange={e => updatePlayerDatos(currentPlayerIndex, {...currentDatos, correo: e.target.value})} placeholder="correo@ejemplo.com" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}># de Teléfono</label>
                  <input type="tel" value={currentDatos.telefono} onChange={e => updatePlayerDatos(currentPlayerIndex, {...currentDatos, telefono: e.target.value})} placeholder="10 dígitos numéricos" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
              </div>

              <div style={{ backgroundColor: '#fff7ed', border: '1px solid #ffedd5', padding: '30px', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', marginTop: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px', borderBottom: '1px solid #ffedd5', paddingBottom: '20px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                    <FaGlobeAmericas />
                  </div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#9a3412' }}>Antecedentes internacionales</h4>
                </div>

                {currentDatos.esForaneo ? (
                  <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                      <EntradaFormulario etiqueta="Nacionalidad del jugador" valor={currentDatos.nacionalidadJugador} alCambiar={e => updatePlayerDatos(currentPlayerIndex, {...currentDatos, nacionalidadJugador: e.target.value})} />
                      <EntradaFormulario etiqueta="País de residencia actual" valor={currentDatos.paisResidencia} alCambiar={e => updatePlayerDatos(currentPlayerIndex, {...currentDatos, paisResidencia: e.target.value})} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', alignItems: 'end' }}>
                      <EntradaSeleccion etiqueta="¿El jugador ha vivido en el extranjero?" valor={currentDatos.haVividoExtranjero ? '1' : '0'} alCambiar={e => updatePlayerDatos(currentPlayerIndex, {...currentDatos, haVividoExtranjero: e.target.value === '1'})} opciones={[{ valor: '0', etiqueta: 'No' }, { valor: '1', etiqueta: 'Sí' }]} obligatorio={true} />
                      {currentDatos.haVividoExtranjero && (
                        <EntradaFormulario etiqueta="¿En qué país?" valor={currentDatos.dondeVividoExtranjero} alCambiar={e => updatePlayerDatos(currentPlayerIndex, {...currentDatos, dondeVividoExtranjero: e.target.value})} obligatorio={true} />
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                      <EntradaFormulario etiqueta="Nacionalidad del padre" valor={currentDatos.nacionalidadPadre} alCambiar={e => updatePlayerDatos(currentPlayerIndex, {...currentDatos, nacionalidadPadre: e.target.value})} />
                      <EntradaFormulario etiqueta="Nacionalidad de la madre" valor={currentDatos.nacionalidadMadre} alCambiar={e => updatePlayerDatos(currentPlayerIndex, {...currentDatos, nacionalidadMadre: e.target.value})} />
                    </div>

                    <AreaTexto etiqueta="Registro por Asociación Nacional Extranjera" valor={currentDatos.registroAsociacionExtranjera} alCambiar={e => updatePlayerDatos(currentPlayerIndex, {...currentDatos, registroAsociacionExtranjera: e.target.value})} filas={2} obligatorio={true} />

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                      <EntradaFormulario etiqueta="Nac. Abuelo Paterno" valor={currentDatos.nacAbueloPaterno} alCambiar={e => updatePlayerDatos(currentPlayerIndex, {...currentDatos, nacAbueloPaterno: e.target.value})} />
                      <EntradaFormulario etiqueta="Nac. Abuela Paterna" valor={currentDatos.nacAbuelaPaterna} alCambiar={e => updatePlayerDatos(currentPlayerIndex, {...currentDatos, nacAbuelaPaterna: e.target.value})} />
                      <EntradaFormulario etiqueta="Nac. Abuelo Materno" valor={currentDatos.nacAbueloMaterno} alCambiar={e => updatePlayerDatos(currentPlayerIndex, {...currentDatos, nacAbueloMaterno: e.target.value})} />
                      <EntradaFormulario etiqueta="Nac. Abuela Materna" valor={currentDatos.nacAbuelaMaterna} alCambiar={e => updatePlayerDatos(currentPlayerIndex, {...currentDatos, nacAbuelaMaterna: e.target.value})} />
                    </div>

                    <AreaTexto etiqueta="¿Ha jugado en un Club extranjero?" valor={currentDatos.juegoClubExtranjero} alCambiar={e => updatePlayerDatos(currentPlayerIndex, {...currentDatos, juegoClubExtranjero: e.target.value})} filas={3} obligatorio={true} />
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#9a3412', fontStyle: 'italic' }}>
                      Si el jugador es foráneo, habilite el interruptor para completar los antecedentes internacionales obligatorios.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '20px', marginTop: '40px' }}>
              {!isPublicFlow && (
                <BotonSecundario etiqueta="Cancelar y volver" alHacerClick={() => navigate(-1)} estilo={{ width: '100%', maxWidth: '320px' }} />
              )}
              <BotonPrimario etiqueta={uploading ? "Procesando..." : "Finalizar y Registrar Jugador"} icono={<FaSave />} alHacerClick={handleGuardar} deshabilitado={uploading} estilo={{ width: '100%', maxWidth: '320px' }} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
