import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { 
  FaUpload, 
  FaSyncAlt, 
  FaFilePdf, 
  FaSave, 
  FaCheckCircle, 
  FaArrowLeft,
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
  const [selectedSeguroId, setSelectedSeguroId] = useState('');
  const [fillManually, setFillManually] = useState(false);

  const [documents, setDocuments] = useState({
    actaNacimiento: null,
    identificacion: null,
    fotografia: null,
    formatoAfiliacion: null,
    documentoEstudiante: null
  });

  const documentCards = [
    { key: 'actaNacimiento', title: 'Acta de Nacimiento', subtitle: 'Requerido para validación y auto-llenado' },
    { key: 'identificacion', title: 'Identificación Oficial (INE)', subtitle: 'INE, Pasaporte o Cédula' },
    { key: 'fotografia', title: 'Fotografía del Jugador', subtitle: 'Fotografía infantil formal' }
  ];

  const [extractedData, setExtractedData] = useState({
    nombreJugador: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    curp: '',
    genero: '1', 
    fechaNacimiento: '',
    lugarNacimiento: '',
    direccion: '',

    // DATOS DE AFILIADO
    correo: '',
    telefono: '',
    tipoAfiliacion: 'JUGADOR',
    posicion: '',
    numCamiseta: '',
    asociacion: 'AFAEM',
    liga: '',
    equipo: '',
    categoria: '',

    // ANTECEDENTES INTERNACIONALES (FORÁNEO)
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
  });

  // ── Detección de minoría de edad ──
  const esMenorDeEdad = React.useMemo(() => {
    if (!extractedData.fechaNacimiento) return false;
    const hoy = new Date();
    const nac = new Date(extractedData.fechaNacimiento);
    if (isNaN(nac.getTime())) return false;
    let edad = hoy.getFullYear() - nac.getFullYear();
    const mDiff = hoy.getMonth() - nac.getMonth();
    if (mDiff < 0 || (mDiff === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad < 18;
  }, [extractedData.fechaNacimiento]);

  // DETERMINACIÓN DE PASOS
  const isStep1Done = !!teamId; // El equipo ya viene seleccionado desde el dashboard
  const isStep2Done = Object.values(documents).some(d => d !== null);
  const showStep2 = isStep1Done;
  const showStep3 = isStep2Done || fillManually;

  // CARGAR SLOTS Y DATOS DEL EQUIPO
  const fetchTeamInfo = async () => {
    let effectiveTeamId = teamId;
    let inviteData = null;

    try {
      setLoadingSlots(true);

      if (isPublicFlow && !teamId) {
        inviteData = await getInvitationInfo(token);
        effectiveTeamId = inviteData.equipo_temporal_id;
        setTeamId(effectiveTeamId);
        setExtractedData(prev => ({
          ...prev,
          equipo: inviteData.nombre_equipo || prev.equipo,
          liga: inviteData.nombre_liga || prev.liga,
          categoria: inviteData.nombre_categoria || 'LIBRE'
        }));
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
      setSlotsInfo({
        disponibles: data.jugadores_restantes ?? data.slots_disponibles ?? 0,
        total: data.cantidad_jugadores_pagados ?? data.total_slots ?? 0
      });

      if (data?.seguros?.length > 0) {
        setSelectedSeguroId(String(data.seguros[0].seguro_id));
      }
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
    setDocuments(prev => ({ ...prev, [documentKey]: file }));

    if (documentKey === 'fotografia') {
      Swal.fire({ title: 'Validando Fotografía...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
      try {
        const data = await validarFotografia(file);
        if (data.valido) {
          Swal.fire({ title: 'Fotografía Aceptada!', icon: 'success', timer: 1500, showConfirmButton: false });
        } else {
          Swal.fire('Error en la fotografía', data.mensaje, 'error');
          setDocuments(prev => ({ ...prev, [documentKey]: null }));
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

          setExtractedData(prev => ({
            ...prev,
            nombreJugador: f || prev.nombreJugador,
            apellidoPaterno: lp || prev.apellidoPaterno,
            apellidoMaterno: lm || prev.apellidoMaterno,
            curp: crp || prev.curp,
            fechaNacimiento: fnac || prev.fechaNacimiento,
            lugarNacimiento: lnac || prev.lugarNacimiento
          }));
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

      if (documents.fotografia) {
        try {
          const photoBytes = await documents.fotografia.arrayBuffer();
          const photoImage = documents.fotografia.name.toLowerCase().endsWith('.png') ? await pdfDoc.embedPng(photoBytes) : await pdfDoc.embedJpg(photoBytes);
          firstPage.drawImage(photoImage, { x: 479, y: 676, width: 76, height: 90 });
        } catch (e) {}
      }

      // MAPEO DE CAMPOS (Sincronizado con Admin)
      safeSetField(form, 'Nombres', extractedData.nombreJugador);
      safeSetField(form, 'Apellido Paterno', extractedData.apellidoPaterno);
      safeSetField(form, 'Apellido Materno', extractedData.apellidoMaterno);
      safeSetField(form, 'CURP o Clave Única de Registro de Población', extractedData.curp);
      safeSetField(form, 'Fecha de Nacimiento', extractedData.fechaNacimiento);
      safeSetField(form, 'Sexo', extractedData.genero === '1' ? 'MASCULINO' : 'FEMENINO');
      safeSetField(form, 'Lugar de Nacimiento', extractedData.lugarNacimiento);
      const correoRJ = extractedData.correo || '';
      const correoRJFs = correoRJ.length > 35 ? 6 : correoRJ.length > 25 ? 7 : correoRJ.length > 18 ? 8 : 10;
      safeSetField(form, 'Correo electrónico', correoRJ, correoRJFs);
      safeSetField(form, 'Teléfono', extractedData.telefono);
      safeSetField(form, 'Asociación', extractedData.asociacion);
      safeSetField(form, 'Liga', (extractedData.liga || '').split('(')[0].trim());
      safeSetField(form, 'Equipo', extractedData.equipo);
      safeSetField(form, 'Categoría', extractedData.categoria);
      safeSetField(form, 'Posición', extractedData.posicion);
      safeSetField(form, 'Camiseta', extractedData.numCamiseta);

      if (extractedData.esForaneo) {
        safeSetField(form, 'Nacionalidades del jugador', extractedData.nacionalidadJugador);
        safeSetField(form, 'País de residencia actual', extractedData.paisResidencia);
        safeSetField(form, '¿El jugador ha vivido en el extranjero? ¿En que país?', extractedData.haVividoExtranjero ? extractedData.dondeVividoExtranjero : 'NO');
        safeSetField(form, 'Nacionalidades del padre', extractedData.nacionalidadPadre);
        safeSetField(form, 'Nacionalidades de la madre', extractedData.nacionalidadMadre);
        safeSetField(form, 'Nacionalidades del abuelo paterno', extractedData.nacAbueloPaterno);
        safeSetField(form, 'Nacionalidades de la abuela paterna', extractedData.nacAbuelaPaterna);
        safeSetField(form, 'Nacionalidades del abuelo materno', extractedData.nacAbueloMaterno);
        safeSetField(form, 'Nacionalidades de la abuela materna', extractedData.nacAbuelaMaterna);
        safeSetField(form, 'El jugador ha sido registrado por la Asociación Nacional de Fútbol...', extractedData.registroAsociacionExtranjera);
        safeSetField(form, 'El jugador ha jugado en un Club extranjero...', extractedData.juegoClubExtranjero);
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
      link.download = `Formato_Afiliacion_${extractedData.nombreJugador || 'Jugador'}.pdf`;
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
    if (!extractedData.nombreJugador || !extractedData.curp) {
      Swal.fire('Atención', 'Nombre y CURP son obligatorios.', 'warning');
      return;
    }

    setUploading(true);
    Swal.fire({ title: 'Registrando Jugador', text: 'Enviando información...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    try {
      const formData = new FormData();
      formData.append('equipo_temporal_id', teamId);
      formData.append('nombre', extractedData.nombreJugador);
      formData.append('primer_apellido', extractedData.apellidoPaterno);
      formData.append('segundo_apellido', extractedData.apellidoMaterno);
      formData.append('CURP', extractedData.curp);
      formData.append('sexo_id', parseInt(extractedData.genero, 10));
      formData.append('fecha_nacimiento', extractedData.fechaNacimiento);
      formData.append('lugar_nacimiento', extractedData.lugarNacimiento);
      formData.append('correo', extractedData.correo);
      formData.append('telefono', extractedData.telefono);
      formData.append('posicion', extractedData.posicion);
      formData.append('num_camiseta', extractedData.numCamiseta);
      formData.append('seguro_id', selectedSeguroId || String(slotsData?.seguros?.[0]?.seguro_id || 1));

      if (extractedData.esForaneo) {
        formData.append('es_foraneo', '1');
        formData.append('nacionalidad_jugador', extractedData.nacionalidadJugador);
        formData.append('pais_resid_actual', extractedData.paisResidencia);
        formData.append('ha_vivido_extranjero', extractedData.haVividoExtranjero ? '1' : '0');
        formData.append('donde_vivido', extractedData.dondeVividoExtranjero);
      }

      ['actaNacimiento', 'identificacion', 'fotografia', 'formatoAfiliacion'].forEach(key => {
        if (documents[key]) { formData.append('documento_afiliacion_ids', 3); formData.append('archivos', documents[key]); }
      });

      // Documento de estudiante (solo si el jugador es menor de edad)
      if (esMenorDeEdad && documents.documentoEstudiante) {
        formData.append('documento_estudiante', documents.documentoEstudiante);
      }

      await registrarJugadorTemporal(formData);
      Swal.fire({ title: 'Registro Exitoso!', text: 'El jugador ha sido enviado a revisión por el administrador.', icon: 'success' })
        .then(() => {
          if (isPublicFlow) {
            setDocuments({
              actaNacimiento: null,
              identificacion: null,
              fotografia: null,
              formatoAfiliacion: null,
              documentoEstudiante: null
            });
            setExtractedData({
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
              liga: extractedData.liga,
              equipo: extractedData.equipo,
              categoria: extractedData.categoria,
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
            });
            setFillManually(false);
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

      <div style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
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
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Siga los pasos para la afiliación oficial.</p>
        </div>
      </div>

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
          <h1 style={{ fontSize: '26px', fontWeight: '900', margin: '4px 0 8px 0', letterSpacing: '-0.5px' }}>{extractedData.equipo || 'Equipo No Detectado'}</h1>
          <div style={{ display: 'flex', gap: '15px', fontSize: '13px', color: '#94a3b8', flexWrap: 'wrap' }}>
            <span><strong>Liga:</strong> {extractedData.liga || 'N/A'}</span>
            <span>•</span>
            <span><strong>Categoría:</strong> {extractedData.categoria || 'LIBRE'}</span>
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
            <StepBadge number="1" isActive={!!selectedSeguroId} isDone={!!selectedSeguroId} />
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
                      const isSelected = String(selectedSeguroId) === String(seg.seguro_id);
                      return (
                        <button
                          key={`seguro-card-${seg.seguro_id}`}
                          type="button"
                          onClick={() => setSelectedSeguroId(String(seg.seguro_id))}
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
                    <h4 style={{ fontSize: '18px', fontWeight: '900', margin: '8px 0 5px 0' }}>{extractedData.equipo || 'Equipo No Detectado'}</h4>
                    <div style={{ color: '#64748b', fontSize: '13px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <span><strong>Liga:</strong> {extractedData.liga || 'N/A'}</span>
                      <span><strong>Categoría:</strong> {extractedData.categoria || 'LIBRE'}</span>
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
                    border: documents[doc.key] ? '2px solid #10b981' : '2px dashed #cbd5e1',
                    padding: '18px',
                    textAlign: 'center',
                    transition: 'all 0.3s',
                    cursor: 'pointer'
                  }}
                  onClick={() => document.getElementById(`file-${doc.key}`).click()}
                >
                  <div style={{ fontSize: '32px', marginBottom: '12px', color: documents[doc.key] ? '#10b981' : '#94a3b8' }}>
                    {documents[doc.key] ? <FaCheckCircle /> : <FaUpload />}
                  </div>
                  <h4 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '8px', color: '#1e293b' }}>{doc.title}</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>{doc.subtitle}</p>
                  <div style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', backgroundColor: documents[doc.key] ? '#dcfce7' : '#f1f5f9', color: documents[doc.key] ? '#166534' : '#64748b', fontSize: '11px', fontWeight: '800' }}>
                    {documents[doc.key] ? <><FaCheckCircle /> Listo</> : 'Pendiente'}
                  </div>
                  <input type="file" id={`file-${doc.key}`} style={{ display: 'none' }} accept="image/*,.pdf" onChange={(e) => handleFileUpload(doc.key, e.target.files[0])} />
                </div>
              ))}
            </div>

            {documents.actaNacimiento && !extractedData.fechaNacimiento && (
              <div className="fade-in" style={{ marginTop: '16px', padding: '12px 18px', background: '#fffbeb', border: '1px dashed #fbbf24', borderRadius: '10px', fontSize: '12px', color: '#92400e', fontWeight: '600' }}>
                ⏳ Analizando el Acta de Nacimiento vía OCR... Los documentos adicionales aparecerán en breve.
              </div>
            )}

            {documents.actaNacimiento && extractedData.fechaNacimiento && !esMenorDeEdad && (
              <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginTop: '20px' }}>
                {[{ key: 'identificacion', title: 'Identificación Oficial (INE)', subtitle: 'INE, Pasaporte o Cédula' }] .map(doc => (
                  <div
                    key={doc.key}
                    className="document-card"
                    style={{
                      backgroundColor: 'white',
                      borderRadius: '20px',
                      border: documents[doc.key] ? '2px solid #10b981' : '2px dashed #cbd5e1',
                      padding: '18px',
                      textAlign: 'center',
                      transition: 'all 0.3s',
                      cursor: 'pointer'
                    }}
                    onClick={() => document.getElementById(`file-${doc.key}`).click()}
                  >
                    <div style={{ fontSize: '32px', marginBottom: '12px', color: documents[doc.key] ? '#10b981' : '#94a3b8' }}>
                      {documents[doc.key] ? <FaCheckCircle /> : <FaUpload />}
                    </div>
                    <h4 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '8px', color: '#1e293b' }}>{doc.title}</h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>{doc.subtitle}</p>
                    <div style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', backgroundColor: documents[doc.key] ? '#dcfce7' : '#f1f5f9', color: documents[doc.key] ? '#166534' : '#64748b', fontSize: '11px', fontWeight: '800' }}>
                      {documents[doc.key] ? <><FaCheckCircle /> Listo</> : 'Pendiente'}
                    </div>
                    <input type="file" id={`file-${doc.key}`} style={{ display: 'none' }} accept="image/*,.pdf" onChange={(e) => handleFileUpload(doc.key, e.target.files[0])} />
                  </div>
                ))}
              </div>
            )}

            {documents.actaNacimiento && extractedData.fechaNacimiento && esMenorDeEdad && (
              <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginTop: '20px' }}>
                <div
                  className="document-card"
                  style={{
                    borderRadius: '20px',
                    border: documents.documentoEstudiante ? '2px solid #10b981' : '2px dashed #fbbf24',
                    background: documents.documentoEstudiante ? 'rgba(16,185,129,0.04)' : 'linear-gradient(135deg,#fffbeb,#fef3c7)',
                    padding: '18px',
                    textAlign: 'center',
                    transition: 'all 0.3s',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                  onClick={() => document.getElementById('file-documentoEstudiante').click()}
                >
                  <div style={{ position: 'absolute', top: 10, right: 10, background: 'linear-gradient(90deg,#f59e0b,#fbbf24)', borderRadius: '12px', padding: '4px 10px', fontSize: '10px', fontWeight: '950', color: 'white' }}>🧒 MENOR</div>
                  <div style={{ fontSize: '32px', marginBottom: '12px', color: documents.documentoEstudiante ? '#10b981' : '#f59e0b' }}>
                    {documents.documentoEstudiante ? <FaCheckCircle /> : <FaUpload />}
                  </div>
                  <h4 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '8px', color: '#1e293b' }}>Documento de Estudiante</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>Credencial escolar, certificado o carta de residencia</p>
                  <div style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', backgroundColor: documents.documentoEstudiante ? '#dcfce7' : '#f1f5f9', color: documents.documentoEstudiante ? '#166534' : '#64748b', fontSize: '11px', fontWeight: '800' }}>
                    {documents.documentoEstudiante ? <><FaCheckCircle /> Listo</> : 'Pendiente'}
                  </div>
                  <input type="file" id="file-documentoEstudiante" style={{ display: 'none' }} accept="image/*,.pdf" onChange={(e) => handleFileUpload('documentoEstudiante', e.target.files[0])} />
                </div>
              </div>
            )}

            {documents.actaNacimiento && extractedData.fechaNacimiento && (
              <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginTop: '20px' }}>
                {[{ key: 'fotografia', title: 'Fotografía del Jugador', subtitle: 'Fotografía infantil formal' }].map(doc => (
                  <div
                    key={doc.key}
                    className="document-card"
                    style={{
                      backgroundColor: 'white',
                      borderRadius: '20px',
                      border: documents[doc.key] ? '2px solid #10b981' : '2px dashed #cbd5e1',
                      padding: '18px',
                      textAlign: 'center',
                      transition: 'all 0.3s',
                      cursor: 'pointer'
                    }}
                    onClick={() => document.getElementById(`file-${doc.key}`).click()}
                  >
                    <div style={{ fontSize: '32px', marginBottom: '12px', color: documents[doc.key] ? '#10b981' : '#94a3b8' }}>
                      {documents[doc.key] ? <FaCheckCircle /> : <FaUpload />}
                    </div>
                    <h4 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '8px', color: '#1e293b' }}>{doc.title}</h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>{doc.subtitle}</p>
                    <div style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', backgroundColor: documents[doc.key] ? '#dcfce7' : '#f1f5f9', color: documents[doc.key] ? '#166534' : '#64748b', fontSize: '11px', fontWeight: '800' }}>
                      {documents[doc.key] ? <><FaCheckCircle /> Listo</> : 'Pendiente'}
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
                  onClick={() => setFillManually(true)}
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
                  <input type="text" value={extractedData.nombreJugador} onChange={e => setExtractedData({...extractedData, nombreJugador: e.target.value})} placeholder="Ej. Juan" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Ap. Paterno <span className="required-star">*</span></label>
                  <input type="text" value={extractedData.apellidoPaterno} onChange={e => setExtractedData({...extractedData, apellidoPaterno: e.target.value})} placeholder="Ej. Pérez" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Ap. Materno</label>
                  <input type="text" value={extractedData.apellidoMaterno} onChange={e => setExtractedData({...extractedData, apellidoMaterno: e.target.value})} placeholder="Ej. Gómez" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}># Camiseta</label>
                  <input type="number" value={extractedData.numCamiseta} onChange={e => setExtractedData({...extractedData, numCamiseta: e.target.value})} placeholder="Ej. 10" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Posición en el campo</label>
                  <select value={extractedData.posicion} onChange={e => setExtractedData({...extractedData, posicion: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: 'white' }}>
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
                  <input type="text" value={extractedData.curp || ''} onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    let sId = extractedData.genero;
                    if (val.length >= 11) {
                      const char = val.charAt(10);
                      if (char === 'M') sId = '2';
                      else if (char === 'H') sId = '1';
                    }
                    setExtractedData({...extractedData, curp: val, genero: sId});
                  }} placeholder="ABCD..." maxLength="18" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Fecha Nac. <span className="required-star">*</span></label>
                  <input
                    type="date"
                    value={extractedData.fechaNacimiento || ''}
                    min={new Date(new Date().setFullYear(new Date().getFullYear() - 100)).toISOString().split('T')[0]}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={e => setExtractedData({...extractedData, fechaNacimiento: e.target.value})}
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Lugar de Nacimiento <span className="required-star">*</span></label>
                  <input type="text" value={extractedData.lugarNacimiento || ''} onChange={e => setExtractedData({...extractedData, lugarNacimiento: e.target.value})} placeholder="Ej. Monterrey, NL" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Sexo <span className="required-star">*</span></label>
                  <select value={extractedData.genero || ""} onChange={e => setExtractedData({...extractedData, genero: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: 'white' }}>
                    <option value="">Seleccione...</option>
                    <option value="1">MASCULINO</option>
                    <option value="2">FEMENINO</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Correo electrónico <span className="required-star">*</span></label>
                  <input type="email" value={extractedData.correo} onChange={e => setExtractedData({...extractedData, correo: e.target.value})} placeholder="correo@ejemplo.com" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}># de Teléfono</label>
                  <input type="tel" value={extractedData.telefono} onChange={e => setExtractedData({...extractedData, telefono: e.target.value})} placeholder="10 dígitos numéricos" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
              </div>

              <div style={{ backgroundColor: '#fff7ed', border: '1px solid #ffedd5', padding: '30px', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', marginTop: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px', borderBottom: '1px solid #ffedd5', paddingBottom: '20px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                    <FaGlobeAmericas />
                  </div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#9a3412' }}>Antecedentes internacionales</h4>
                </div>

                {extractedData.esForaneo ? (
                  <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                      <EntradaFormulario etiqueta="Nacionalidad del jugador" valor={extractedData.nacionalidadJugador} alCambiar={e => setExtractedData({...extractedData, nacionalidadJugador: e.target.value})} />
                      <EntradaFormulario etiqueta="País de residencia actual" valor={extractedData.paisResidencia} alCambiar={e => setExtractedData({...extractedData, paisResidencia: e.target.value})} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', alignItems: 'end' }}>
                      <EntradaSeleccion etiqueta="¿El jugador ha vivido en el extranjero?" valor={extractedData.haVividoExtranjero ? '1' : '0'} alCambiar={e => setExtractedData({...extractedData, haVividoExtranjero: e.target.value === '1'})} opciones={[{ valor: '0', etiqueta: 'No' }, { valor: '1', etiqueta: 'Sí' }]} obligatorio={true} />
                      {extractedData.haVividoExtranjero && (
                        <EntradaFormulario etiqueta="¿En qué país?" valor={extractedData.dondeVividoExtranjero} alCambiar={e => setExtractedData({...extractedData, dondeVividoExtranjero: e.target.value})} obligatorio={true} />
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                      <EntradaFormulario etiqueta="Nacionalidad del padre" valor={extractedData.nacionalidadPadre} alCambiar={e => setExtractedData({...extractedData, nacionalidadPadre: e.target.value})} />
                      <EntradaFormulario etiqueta="Nacionalidad de la madre" valor={extractedData.nacionalidadMadre} alCambiar={e => setExtractedData({...extractedData, nacionalidadMadre: e.target.value})} />
                    </div>

                    <AreaTexto etiqueta="Registro por Asociación Nacional Extranjera" valor={extractedData.registroAsociacionExtranjera} alCambiar={e => setExtractedData({...extractedData, registroAsociacionExtranjera: e.target.value})} filas={2} obligatorio={true} />

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                      <EntradaFormulario etiqueta="Nac. Abuelo Paterno" valor={extractedData.nacAbueloPaterno} alCambiar={e => setExtractedData({...extractedData, nacAbueloPaterno: e.target.value})} />
                      <EntradaFormulario etiqueta="Nac. Abuela Paterna" valor={extractedData.nacAbuelaPaterna} alCambiar={e => setExtractedData({...extractedData, nacAbuelaPaterna: e.target.value})} />
                      <EntradaFormulario etiqueta="Nac. Abuelo Materno" valor={extractedData.nacAbueloMaterno} alCambiar={e => setExtractedData({...extractedData, nacAbueloMaterno: e.target.value})} />
                      <EntradaFormulario etiqueta="Nac. Abuela Materna" valor={extractedData.nacAbuelaMaterna} alCambiar={e => setExtractedData({...extractedData, nacAbuelaMaterna: e.target.value})} />
                    </div>

                    <AreaTexto etiqueta="¿Ha jugado en un Club extranjero?" valor={extractedData.juegoClubExtranjero} alCambiar={e => setExtractedData({...extractedData, juegoClubExtranjero: e.target.value})} filas={3} obligatorio={true} />
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
