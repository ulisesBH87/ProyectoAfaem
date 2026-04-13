import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FaUpload, 
  FaSyncAlt, 
  FaFilePdf, 
  FaSave, 
  FaCheckCircle, 
  FaArrowLeft,
  FaFileSignature,
  FaUserEdit
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
import { registrarJugadorTemporal, getAvailableSlots } from '../../services/teams';
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
  const teamId = location.state?.teamId;
  
  // ESTADOS
  const [uploading, setUploading] = useState(false);
  const [slotsInfo, setSlotsInfo] = useState({ disponibles: 0, total: 0 });
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [fillManually, setFillManually] = useState(false);

  const [documents, setDocuments] = useState({
    actaNacimiento: null,
    identificacion: null,
    fotografia: null,
    formatoAfiliacion: null
  });

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

  // DETERMINACIÓN DE PASOS
  const isStep1Done = !!teamId; // El equipo ya viene seleccionado desde el dashboard
  const isStep2Done = Object.values(documents).some(d => d !== null);
  const showStep2 = isStep1Done;
  const showStep3 = isStep2Done || fillManually;

  // CARGAR SLOTS Y DATOS DEL EQUIPO
  useEffect(() => {
    const fetchTeamInfo = async () => {
      if (!teamId) {
        Swal.fire('Error', 'No se especificó un equipo para el registro.', 'error');
        navigate('/presidente-equipo/dashboard');
        return;
      }
      try {
        setLoadingSlots(true);
        const data = await getAvailableSlots(teamId);
        setSlotsInfo({
          disponibles: data.slots_disponibles || 0,
          total: data.total_slots || 0
        });
        
        // El servicio de slots también suele traer el nombre del equipo y liga
        setExtractedData(prev => ({
          ...prev,
          equipo: data.nombre_equipo || prev.equipo,
          liga: data.nombre_liga || prev.liga,
          categoria: data.nombre_categoria || 'LIBRE'
        }));
      } catch (err) {
        console.error("Error al obtener info del equipo:", err);
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchTeamInfo();
  }, [teamId, navigate]);

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

  const safeSetField = (form, fieldName, value) => {
    if (!value) return;
    try {
      const field = form.getTextField(fieldName);
      if (field) field.setText(value.toString().toUpperCase());
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
      safeSetField(form, 'Correo electrónico', extractedData.correo);
      safeSetField(form, 'Teléfono', extractedData.telefono);
      safeSetField(form, 'Asociación', extractedData.asociacion);
      safeSetField(form, 'Liga', extractedData.liga);
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
      formData.append('seguro_id', 1);

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

      await registrarJugadorTemporal(formData);
      Swal.fire({ title: 'Registro Exitoso!', text: 'El jugador ha sido enviado a revisión por el administrador.', icon: 'success' })
        .then(() => navigate(`/presidente-equipo/admin-equipo/${teamId}`));
    } catch (err) { 
      console.error(err);
      Swal.fire('Error', 'No se pudo completar el registro.', 'error'); 
    } finally { setUploading(false); }
  };

  return (
    <div className="dashboard-content">
      {/* HEADER DINÁMICO */}
      <div style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={() => navigate(-1)} className="btn btn-outline-secondary" style={{ padding: '8px', borderRadius: '10px' }}><FaArrowLeft /></button>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Registro de Jugador</h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Siga los pasos para la afiliación oficial.</p>
          </div>
        </div>
        {!loadingSlots && (
          <div style={{ padding: '8px 15px', backgroundColor: '#f1f5f9', borderRadius: '12px', textAlign: 'right' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Slots Disponibles</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0b4ea6' }}>{slotsInfo.disponibles} / {slotsInfo.total}</div>
          </div>
        )}
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <p className="required-legend" style={{ marginBottom: '20px' }}>
          <span className="required-star">*</span> Indica que el campo es obligatorio para el registro oficial.
        </p>
        
        {/* PASO 1: CONFIRMACIÓN DE EQUIPO */}
        <section style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
            <StepBadge number="1" isActive={!isStep1Done} isDone={isStep1Done} />
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: 0 }}>Confirmación de Equipo</h3>
          </div>
          <Tarjeta estilo={{ border: loadingSlots ? '1px dashed #cbd5e1' : '1px solid #e2e8f0' }}>
            {loadingSlots ? <Cargador texto="Validando equipo..." /> : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#0b4ea6', margin: '0 0 5px 0' }}>{extractedData.equipo || 'Equipo No Detectado'}</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Liga: {extractedData.liga} | Categoría: {extractedData.categoria}</p>
                </div>
                <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '13px' }}>
                  <FaCheckCircle /> Equipo Confirmado
                </div>
              </div>
            )}
          </Tarjeta>
        </section>

        {/* PASO 2: DOCUMENTACIÓN */}
        {showStep2 && (
          <section className="fade-in" style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
              <StepBadge number="2" isActive={!isStep2Done} isDone={isStep2Done} />
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: 0 }}>Carga de Documentación (OCR)</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              {[
                { key: 'actaNacimiento', title: 'Acta de Nacimiento' },
                { key: 'identificacion', title: 'Identificación (INE/Pasaporte)' },
                { key: 'fotografia', title: 'Fotografía Infantil' },
                { key: 'formatoAfiliacion', title: 'Formato de Afiliación Firmado' }
              ].map(doc => (
                <div 
                  key={doc.key}
                  onClick={() => document.getElementById(`file-${doc.key}`).click()}
                  style={{ backgroundColor: 'white', borderRadius: '12px', border: documents[doc.key] ? '2px solid #10b981' : '2px dashed #cbd5e1', padding: '20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s' }}
                >
                  <div style={{ fontSize: '30px', marginBottom: '10px', color: documents[doc.key] ? '#10b981' : '#94a3b8' }}>
                    {documents[doc.key] ? <FaCheckCircle /> : <FaUpload />}
                  </div>
                  <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '5px' }}>{doc.title}</h4>
                  <div style={{ fontSize: '11px', color: documents[doc.key] ? '#166534' : '#64748b' }}>{documents[doc.key] ? 'Listo' : 'Hacer clic para subir'}</div>
                  <input type="file" id={`file-${doc.key}`} style={{ display: 'none' }} accept="image/*,.pdf" onChange={(e) => handleFileUpload(doc.key, e.target.files[0])} />
                </div>
              ))}
            </div>
            {!isStep2Done && (
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button onClick={() => setFillManually(true)} style={{ fontSize: '13px', color: '#0b4ea6', fontWeight: '600', background: 'none', border: 'none', textDecoration: 'underline' }}>
                  O prefiero llenar los datos manualmente
                </button>
              </div>
            )}
          </section>
        )}

        {/* PASO 3: FORMULARIO */}
        {showStep3 && (
          <section className="fade-in" style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <StepBadge number="3" isActive={true} isDone={false} />
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: 0 }}>Formulario de Afiliación</h3>
              </div>
              <BotonSecundario etiqueta="Descargar PDF Pre-llenado" icono={<FaFilePdf />} alHacerClick={handleDownloadFormato} estilo={{ fontSize: '12px', backgroundColor: '#f59e0b', color: 'white', border: 'none' }} />
            </div>

            {/* SECCIÓN 1: DATOS DEL AFILIADO */}
            <Tarjeta titulo="1. Datos del afiliado" estilo={{ marginBottom: '20px' }}>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <EntradaFormulario etiqueta="Nombre(s) *" valor={extractedData.nombreJugador} alCambiar={(e) => setExtractedData({...extractedData, nombreJugador: e.target.value})} />
                <EntradaFormulario etiqueta="Apellido paterno *" valor={extractedData.apellidoPaterno} alCambiar={(e) => setExtractedData({...extractedData, apellidoPaterno: e.target.value})} />
                <EntradaFormulario etiqueta="Apellido materno *" valor={extractedData.apellidoMaterno} alCambiar={(e) => setExtractedData({...extractedData, apellidoMaterno: e.target.value})} />
                <EntradaFormulario etiqueta="CURP *" valor={extractedData.curp} alCambiar={(e) => setExtractedData({...extractedData, curp: e.target.value.toUpperCase()})} maxLength={18} />
                <EntradaFormulario etiqueta="Lugar de nacimiento *" valor={extractedData.lugarNacimiento} alCambiar={(e) => setExtractedData({...extractedData, lugarNacimiento: e.target.value})} marcador="Ciudad y Estado" />
                <EntradaFormulario etiqueta="Fecha de nacimiento *" tipo="date" valor={extractedData.fechaNacimiento} alCambiar={(e) => setExtractedData({...extractedData, fechaNacimiento: e.target.value})} />
                <EntradaSeleccion etiqueta="Sexo *" valor={extractedData.genero} alCambiar={(e) => setExtractedData({...extractedData, genero: e.target.value})} opciones={[{ valor: '1', etiqueta: 'Masculino' }, { valor: '2', etiqueta: 'Femenino' }]} />
                <EntradaFormulario etiqueta="Correo electrónico *" tipo="email" valor={extractedData.correo} alCambiar={(e) => setExtractedData({...extractedData, correo: e.target.value})} />
                <EntradaSeleccion etiqueta="Tipo de afiliación" valor={extractedData.tipoAfiliacion} alCambiar={(e) => setExtractedData({...extractedData, tipoAfiliacion: e.target.value})} opciones={[{ valor: 'JUGADOR', etiqueta: 'Jugador' }, { valor: 'CUERPO_TECNICO', etiqueta: 'Cuerpo Técnico' }]} />
                <EntradaFormulario etiqueta="Teléfono" valor={extractedData.telefono} alCambiar={(e) => setExtractedData({...extractedData, telefono: e.target.value})} />
                <EntradaFormulario etiqueta="Asociación" valor={extractedData.asociacion} deshabilitado />
                <EntradaFormulario etiqueta="Liga" valor={extractedData.liga} deshabilitado />
                <EntradaFormulario etiqueta="Equipo" valor={extractedData.equipo} deshabilitado />
                <EntradaFormulario etiqueta="Categoría" valor={extractedData.categoria} deshabilitado />
                <EntradaSeleccion etiqueta="Posición" valor={extractedData.posicion} alCambiar={(e) => setExtractedData({...extractedData, posicion: e.target.value})} opciones={[{ valor: 'PORTERO', etiqueta: 'Portero' }, { valor: 'DEFENSA', etiqueta: 'Defensa' }, { valor: 'MEDIO', etiqueta: 'Medio' }, { valor: 'DELANTERO', etiqueta: 'Delantero' }]} />
                <EntradaFormulario etiqueta="Camiseta" tipo="number" valor={extractedData.numCamiseta} alCambiar={(e) => setExtractedData({...extractedData, numCamiseta: e.target.value})} />
                <div style={{ gridColumn: '1 / -1' }}>
                  <AreaTexto etiqueta="Dirección completa" valor={extractedData.direccion} alCambiar={(e) => setExtractedData({...extractedData, direccion: e.target.value})} filas={2} />
                </div>
              </div>
            </Tarjeta>

            {/* SECCIÓN 2: ANTECEDENTES INTERNACIONALES */}
            <Tarjeta estilo={{ backgroundColor: '#fff7ed', border: '1px solid #ffedd5', marginBottom: '30px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#9a3412' }}>2. Antecedentes internacionales</h4>
                <div className="form-check form-switch">
                  <input className="form-check-input" type="checkbox" id="switchForaneo" checked={extractedData.esForaneo} onChange={(e) => setExtractedData({...extractedData, esForaneo: e.target.checked})} />
                  <label className="form-check-label" htmlFor="switchForaneo" style={{ fontSize: '13px', fontWeight: '700' }}>¿Jugador foráneo?</label>
                </div>
              </div>

              {extractedData.esForaneo && (
                <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  <EntradaFormulario etiqueta="Nacionalidad del jugador" valor={extractedData.nacionalidadJugador} alCambiar={(e) => setExtractedData({...extractedData, nacionalidadJugador: e.target.value})} />
                  <EntradaFormulario etiqueta="País de residencia actual" valor={extractedData.paisResidencia} alCambiar={(e) => setExtractedData({...extractedData, paisResidencia: e.target.value})} />
                  <EntradaSeleccion etiqueta="¿El jugador ha vivido en el extranjero?" valor={extractedData.haVividoExtranjero ? '1' : '0'} alCambiar={(e) => setExtractedData({...extractedData, haVividoExtranjero: e.target.value === '1'})} opciones={[{ valor: '0', etiqueta: 'No' }, { valor: '1', etiqueta: 'Sí' }]} />
                  {extractedData.haVividoExtranjero && <EntradaFormulario etiqueta="¿En qué país?" valor={extractedData.dondeVividoExtranjero} alCambiar={(e) => setExtractedData({...extractedData, dondeVividoExtranjero: e.target.value})} />}
                  <EntradaFormulario etiqueta="Nacionalidades del padre" valor={extractedData.nacionalidadPadre} alCambiar={(e) => setExtractedData({...extractedData, nacionalidadPadre: e.target.value})} />
                  <EntradaFormulario etiqueta="Nacionalidades de la madre" valor={extractedData.nacionalidadMadre} alCambiar={(e) => setExtractedData({...extractedData, nacionalidadMadre: e.target.value})} />
                  
                  <div style={{ gridColumn: '1 / -1' }}>
                    <AreaTexto etiqueta="El jugador ha sido registrado por la Asociación Nacional de Fútbol (en el extranjero) como jugador amateur o profesional, previo a su solicitud de registro en la FMF." valor={extractedData.registroAsociacionExtranjera} alCambiar={(e) => setExtractedData({...extractedData, registroAsociacionExtranjera: e.target.value})} filas={2} />
                  </div>

                  <EntradaFormulario etiqueta="Nacionalidades del abuelo paterno" valor={extractedData.nacAbueloPaterno} alCambiar={(e) => setExtractedData({...extractedData, nacAbueloPaterno: e.target.value})} />
                  <EntradaFormulario etiqueta="Nacionalidades de la abuela paterna" valor={extractedData.nacAbuelaPaterna} alCambiar={(e) => setExtractedData({...extractedData, nacAbuelaPaterna: e.target.value})} />
                  <EntradaFormulario etiqueta="Nacionalidades del abuelo materno" valor={extractedData.nacAbueloMaterno} alCambiar={(e) => setExtractedData({...extractedData, nacAbueloMaterno: e.target.value})} />
                  <EntradaFormulario etiqueta="Nacionalidades de la abuela materna" valor={extractedData.nacAbuelaMaterna} alCambiar={(e) => setExtractedData({...extractedData, nacAbuelaMaterna: e.target.value})} />
                  <div style={{ gridColumn: '1 / -1' }}>
                    <AreaTexto etiqueta="¿El jugador ha jugado en un club extranjero y participado en torneos y/o competencias internacionales escolares o de recreo como campeonatos estacionales, cursos, etc?" valor={extractedData.juegoClubExtranjero} alCambiar={(e) => setExtractedData({...extractedData, juegoClubExtranjero: e.target.value})} filas={3} />
                  </div>
                </div>
              )}
              {!extractedData.esForaneo && (
                <p style={{ margin: 0, fontSize: '13px', color: '#9a3412', fontStyle: 'italic' }}>El jugador se considera nacional por defecto. Activa el interruptor si es foráneo para habilitar los campos de antecedentes internacionales.</p>
              )}
            </Tarjeta>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '40px' }}>
              <BotonSecundario etiqueta="Cancelar y volver" alHacerClick={() => navigate(-1)} estilo={{ minWidth: '200px' }} />
              <BotonPrimario etiqueta={uploading ? "Procesando..." : "Finalizar y Registrar Jugador"} icono={<FaSave />} alHacerClick={handleGuardar} deshabilitado={uploading} estilo={{ minWidth: '300px' }} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
