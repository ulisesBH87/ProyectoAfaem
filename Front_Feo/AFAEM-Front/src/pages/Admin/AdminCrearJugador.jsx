import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { 
  FaArrowLeft, 
  FaSave, 
  FaUpload, 
  FaFilePdf, 
  FaSyncAlt,
  FaCheckCircle
} from 'react-icons/fa';
import { PDFDocument } from 'pdf-lib';
import { getSolicitudes } from '../../services/solicitud';
import { validarFotografia } from '../../services/foto';
import { registrarJugadorTemporal } from '../../services/teams';
import { 
  BotonPrimario, 
  BotonSecundario, 
  Tarjeta, 
  EntradaFormulario, 
  EntradaSeleccion, 
  AreaTexto,
  Cargador
} from '../../components/partials';

// Badge Estilizado para los pasos
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

export default function AdminCrearJugador() {
  const navigate = useNavigate();
  
  // ESTADOS
  const [equiposDb, setEquiposDb] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [fillManually, setFillManually] = useState(false);
  
  const [documents, setDocuments] = useState({
    actaNacimiento: null,
    identificacion: null,
    fotografia: null,
    formatoAfiliacion: null
  });

  const [extractedData, setExtractedData] = useState({
    equipoSeleccionado: '',
    nombreJugador: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    curp: '',
    genero: '1', 
    fechaNacimiento: '',
    lugarNacimiento: '',
    direccion: '',
    
    // DATOS DE AFILIADO (NUEVOS)
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
  const isStep1Done = !!extractedData.equipoSeleccionado;
  const isStep2Done = Object.values(documents).some(d => d !== null);
  const showStep2 = isStep1Done;
  const showStep3 = isStep2Done || fillManually;

  // EFECTO PARA AUTO-LLENAR LIGA Y EQUIPO AL CAMBIAR EQUIPO SELECCIONADO
  useEffect(() => {
    if (extractedData.equipoSeleccionado && equiposDb.length > 0) {
      const selected = equiposDb.find(e => String(e.SolicitudId) === String(extractedData.equipoSeleccionado));
      if (selected) {
        setExtractedData(prev => ({
          ...prev,
          equipo: selected.Equipo || selected.NombreEquipo || '',
          liga: selected.Liga || '',
          categoria: selected.Categoria || 'LIBRE'
        }));
      }
    }
  }, [extractedData.equipoSeleccionado, equiposDb]);

  // CARGAR CATÁLOGO DE SOLICITUDES ACTIVAS PARA REGISTRO
  useEffect(() => {
    const fetchTeamCatalog = async () => {
      try {
        setLoadingTeams(true);
        const data = await getSolicitudes();
        // Filtramos solo las solicitudes aprobadas o en revisión que tengan equipo
        const listaEquipos = (Array.isArray(data) ? data : (data.solicitudes || [])).filter(s => s.Equipo);
        setEquiposDb(listaEquipos);
      } catch (e) {
        console.error("No se pudieron cargar los equipos:", e);
        Swal.fire('Error', 'No se pudo cargar el catálogo de trámites activos.', 'error');
      } finally {
        setLoadingTeams(false);
      }
    };
    fetchTeamCatalog();
  }, []);

  // PROCESAR OCR
  const handleFileUpload = async (documentKey, file) => {
    if (!file) return;

    setDocuments(prev => ({ ...prev, [documentKey]: file }));

    // VALIDACIÓN DE FOTOGRAFÍA
    if (documentKey === 'fotografia') {
      Swal.fire({
        title: 'Validando Fotografía...',
        html: 'Verificando formato y calidad.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });
      try {
        const data = await validarFotografia(file);
        if (data.valido) {
          Swal.fire({ title: '¡Fotografía Aceptada!', icon: 'success', timer: 1500, showConfirmButton: false });
        } else {
          Swal.fire('Error en la fotografía', data.mensaje, 'error');
          setDocuments(prev => ({ ...prev, [documentKey]: null }));
        }
      } catch (err) {
        Swal.fire('Error de validación', err.message || 'No se pudo procesar la foto.', 'error');
      }
    }

    // PROCESAR OCR PARA ACTA O IDENTIFICACIÓN
    if (documentKey === 'actaNacimiento' || documentKey === 'identificacion') {
      Swal.fire({
        title: 'Analizando Documento...',
        html: 'Extrayendo información vía OCR. Por favor espere.',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => { Swal.showLoading(); }
      });

      try {
        const formDataOcr = new FormData();
        formDataOcr.append('file_id', file);

        const response = await fetch('/ocr-api', { method: 'POST', body: formDataOcr });
        if (!response.ok) throw new Error('Error al conectar con el servidor OCR');

        const htmlText = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");
        
        let nombreEncontrado = '';
        let curpEncontrada = '';
        let fechaNacEncontrada = '';
        let lugarNacEncontrado = '';
        
        const rows = doc.querySelectorAll('.dato-fila');
        rows.forEach(row => {
          const label = row.querySelector('.etiqueta')?.textContent?.toLowerCase() || '';
          const value = row.querySelector('.valor')?.textContent?.trim() || '';
          
          if (label.includes('nombre')) nombreEncontrado = value;
          if (label.includes('curp')) curpEncontrada = value;
          if (label.includes('lugar de nacimiento') || label.includes('entidad')) lugarNacEncontrado = value;
          if (label.includes('nacimiento') || label.includes('fecha nac')) {
            let finalDate = value;
            if (value.includes('/')) {
              const p = value.split('/');
              if (p.length === 3) {
                if (p[2].length === 4) finalDate = `${p[2]}-${p[1]}-${p[0]}`;
                else if (p[0].length === 4) finalDate = `${p[0]}-${p[1]}-${p[2]}`;
              }
            }
            fechaNacEncontrada = finalDate;
          }
        });

        if (nombreEncontrado || curpEncontrada || fechaNacEncontrada) {
          const parts = nombreEncontrado ? nombreEncontrado.split(' ') : [];
          let firstName = '', lastNamePaterno = '', lastNameMaterno = '';
          
          if (parts.length >= 3) {
            lastNamePaterno = parts[0];
            lastNameMaterno = parts[1];
            firstName = parts.slice(2).join(' ');
          } else if (parts.length === 2) {
            lastNamePaterno = parts[0];
            firstName = parts[1];
          } else {
            firstName = nombreEncontrado;
          }

          setExtractedData(prev => ({
            ...prev,
            nombreJugador: firstName || prev.nombreJugador,
            apellidoPaterno: lastNamePaterno || prev.apellidoPaterno,
            apellidoMaterno: lastNameMaterno || prev.apellidoMaterno,
            curp: curpEncontrada || prev.curp,
            fechaNacimiento: fechaNacEncontrada || prev.fechaNacimiento,
            lugarNacimiento: lugarNacEncontrado || prev.lugarNacimiento,
          }));

          Swal.fire({
            title: '¡Lectura Exitosa!',
            text: `Se detectó a: ${nombreEncontrado || 'el documento'}`,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
        } else {
          throw new Error('No se detectaron datos legibles en este documento.');
        }
      } catch (err) {
        console.error("Error OCR:", err);
        Swal.fire('Aviso', 'No se pudo extraer la información automáticamente. Por favor ingrésala de forma manual.', 'info');
      }
    }
  };

  // FUNCIÓN AUXILIAR PARA ESCRITURA SEGURA EN PDF
  const safeSetField = (form, fieldName, value) => {
    if (!value) return;
    try {
      const field = form.getTextField(fieldName);
      if (field) field.setText(value.toString().toUpperCase());
    } catch (e) {
      console.warn(`Campo PDF no encontrado: ${fieldName}`);
    }
  };

  // GENERAR PDF PRE-LLENADO
  const handleDownloadFormato = async () => {
    try {
      Swal.fire({
        title: 'Generando PDF...',
        text: 'Preparando el formato de afiliación pre-llenado.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });

      const templateUrl = '/formato_afiliacion_jugador.pdf';
      const existingPdfBytes = await fetch(templateUrl).then(res => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const form = pdfDoc.getForm();
      const firstPage = pdfDoc.getPages()[0];

      // INCRUSTAR FOTOGRAFÍA SI EXISTE
      if (documents.fotografia) {
        try {
          const photoBytes = await documents.fotografia.arrayBuffer();
          let photoImage;
          const nameLower = documents.fotografia.name.toLowerCase();
          if (nameLower.endsWith('.png')) photoImage = await pdfDoc.embedPng(photoBytes);
          else photoImage = await pdfDoc.embedJpg(photoBytes);

          firstPage.drawImage(photoImage, {
            x: 479, y: 676, width: 76, height: 90,
          });
        } catch (photoErr) { console.warn("Error al incrustar foto:", photoErr); }
      }

      // RELLENAR CAMPOS BÁSICOS
      safeSetField(form, 'Nombres', extractedData.nombreJugador);
      safeSetField(form, 'Apellido Paterno', extractedData.apellidoPaterno);
      safeSetField(form, 'Apellido Materno', extractedData.apellidoMaterno);
      safeSetField(form, 'CURP o Clave Única de Registro de Población', extractedData.curp);
      safeSetField(form, 'Fecha de Nacimiento', extractedData.fechaNacimiento);
      safeSetField(form, 'Sexo', extractedData.genero === '1' ? 'MASCULINO' : 'FEMENINO');
      safeSetField(form, 'Lugar de Nacimiento', extractedData.lugarNacimiento);
      
      // DATOS DE AFILIADO
      safeSetField(form, 'Correo electrónico', extractedData.correo);
      safeSetField(form, 'Teléfono', extractedData.telefono);
      safeSetField(form, 'Asociación', extractedData.asociacion);
      safeSetField(form, 'Liga', extractedData.liga);
      safeSetField(form, 'Equipo', extractedData.equipo);
      safeSetField(form, 'Categoría', extractedData.categoria);
      safeSetField(form, 'Posición', extractedData.posicion);
      safeSetField(form, 'Camiseta', extractedData.numCamiseta);

      // ANTECEDENTES INTERNACIONALES (SI ES FORÁNEO)
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
      console.error("Error PDF:", err);
      Swal.fire('Error', 'No se pudo generar el PDF. ' + err.message, 'error');
    }
  };

  // GUARDAR JUGADOR
  const handleGuardar = async (e) => {
    e.preventDefault();

    if (!extractedData.nombreJugador || !extractedData.curp) {
      Swal.fire('Atención', 'Los campos Nombre y CURP son obligatorios.', 'warning');
      return;
    }

    setUploading(true);
    Swal.fire({
      title: 'Inscribiendo Jugador',
      text: 'Comunicando con el servidor...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const formData = new FormData();
      formData.append('equipo_temporal_id', parseInt(extractedData.equipoSeleccionado, 10));
      formData.append('nombre', (extractedData.nombreJugador || '').toString().trim());
      formData.append('primer_apellido', (extractedData.apellidoPaterno || '').toString().trim());
      formData.append('segundo_apellido', (extractedData.apellidoMaterno || '').toString().trim()); // Evitar null/undefined
      formData.append('curp', (extractedData.curp || '').toString().toUpperCase());
      formData.append('sexo_id', parseInt(extractedData.genero, 10));
      formData.append('fecha_nacimiento', extractedData.fechaNacimiento);
      formData.append('lugar_nacimiento', extractedData.lugarNacimiento || 'MÉXICO');
      formData.append('correo', extractedData.correo || '');
      formData.append('telefono', extractedData.telefono || '');
      formData.append('posicion', extractedData.posicion || 'JUGADOR');
      formData.append('num_camiseta', extractedData.numCamiseta || '0');
      formData.append('seguro_id', 1);

      if (extractedData.esForaneo) {
        formData.append('es_foraneo', '1');
        formData.append('nacionalidad_jugador', extractedData.nacionalidadJugador);
        formData.append('pais_resid_actual', extractedData.paisResidencia);
        formData.append('ha_vivido_extranjero', extractedData.haVividoExtranjero ? '1' : '0');
        formData.append('donde_vivido', extractedData.dondeVividoExtranjero);
        // ... otros campos si el backend los soporta
      }

      const docsParams = ['actaNacimiento', 'identificacion', 'fotografia', 'formatoAfiliacion'];
      docsParams.forEach(key => {
        if (documents[key]) {
          formData.append('documento_afiliacion_ids', 3);
          formData.append('archivos', documents[key]);
        }
      });

      await registrarJugadorTemporal(formData);

      Swal.fire({
        icon: 'success',
        title: 'Jugador Inscrito',
        text: 'El jugador ha sido añadido directamente al equipo solicitado.'
      }).then(() => {
        navigate('/admin/jugadores');
      });
    } catch (err) {
      console.error("Error:", err);
      Swal.fire('Error', err.message || 'Error del servidor', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="dashboard-content">
      {/* HEADER */}
      <div style={{ marginBottom: '40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button 
            onClick={() => navigate('/admin/jugadores')}
            className="btn btn-outline-secondary"
            style={{ padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center' }}
          >
            <FaArrowLeft />
          </button>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Alta Rápida de Jugador</h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Inscripción administrativa directa en equipos de liga.</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* PASO 1: SELECCION DE EQUIPO */}
        <section style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
            <StepBadge number="1" isActive={!isStep1Done} isDone={isStep1Done} />
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', margin: 0 }}>Elección de Equipo Destino</h3>
          </div>
          
          <Tarjeta estilo={{ 
            border: isStep1Done ? '1px solid #dcfce7' : '1px solid #e2e8f0',
            backgroundColor: isStep1Done ? '#f8fafc' : 'white'
          }}>
            <div className="form-group">
              <label style={{ fontWeight: '700', fontSize: '14px', color: isStep1Done ? '#64748b' : '#1e293b', marginBottom: '10px', display: 'block' }}>
                ¿A qué equipo quieres agregar este jugador? *
              </label>
              <select 
                className="form-select" 
                value={extractedData.equipoSeleccionado} 
                onChange={(e) => setExtractedData({...extractedData, equipoSeleccionado: e.target.value})}
                style={{ 
                  borderRadius: '12px', 
                  padding: '12px 15px', 
                  border: isStep1Done ? '2px solid #10b981' : '2px solid #e2e8f0', 
                  fontSize: '15px',
                  boxShadow: isStep1Done ? '0 4px 12px rgba(16, 185, 129, 0.05)' : 'none'
                }}
                disabled={loadingTeams}
              >
                <option value="">-- Elige un Trámite/Equipo Activo --</option>
                {equiposDb.map(eq => (
                  <option key={eq.SolicitudId} value={eq.SolicitudId}>
                    {eq.Equipo} (Solicitud #{eq.SolicitudId}) - {eq.Correo}
                  </option>
                ))}
              </select>
            </div>
          </Tarjeta>
        </section>

        {/* PASO 2: CARGA DE DOCUMENTOS */}
        {showStep2 && (
          <section className="fade-in" style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
              <StepBadge number="2" isActive={!isStep2Done} isDone={isStep2Done} />
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', margin: 0 }}>Carga de Documentación</h3>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', 
              gap: '20px' 
            }}>
              {[
                { key: 'actaNacimiento', title: 'Acta de nacimiento', icon: null },
                { key: 'identificacion', title: 'Identificación', icon: null },
                { key: 'fotografia', title: 'Fotografía', icon: null },
                { key: 'formatoAfiliacion', title: 'Formato Firmado', icon: null }
              ].map(doc => (
                <div 
                  key={doc.key}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    border: documents[doc.key] ? '2px solid #10b981' : '2px dashed #cbd5e1',
                    padding: '24px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: documents[doc.key] ? '0 10px 20px rgba(16, 185, 129, 0.08)' : 'none'
                  }}
                  onClick={() => document.getElementById(`file-${doc.key}`).click()}
                >
                  <div style={{ fontSize: '36px', marginBottom: '12px' }}>{doc.icon}</div>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 8px 0', color: '#1e293b' }}>{doc.title}</h4>
                  <div style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    backgroundColor: documents[doc.key] ? '#dcfce7' : '#f1f5f9',
                    color: documents[doc.key] ? '#166534' : '#64748b',
                    fontSize: '11px',
                    fontWeight: '700'
                  }}>
                    {documents[doc.key] ? <><FaCheckCircle /> Cargado</> : 'Pendiente'}
                  </div>
                  <input 
                    type="file" 
                    id={`file-${doc.key}`} 
                    style={{ display: 'none' }} 
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload(doc.key, e.target.files[0])}
                  />
                </div>
              ))}
            </div>

            {!isStep2Done && (
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button 
                  onClick={() => setFillManually(true)}
                  style={{ fontSize: '13px', color: '#0b4ea6', fontWeight: '600', background: 'none', border: 'none', textDecoration: 'underline' }}
                >
                  O prefiero llenar los datos manualmente ahora
                </button>
              </div>
            )}
          </section>
        )}

        {/* PASO 3: INFORMACIÓN DEL JUGADOR */}
        {showStep3 && (
          <section className="fade-in" style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <StepBadge number="3" isActive={true} isDone={false} />
                <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', margin: 0 }}>Formulario de Afiliación Completo</h3>
              </div>
              <BotonSecundario 
                etiqueta="Descargar Formato Pre-llenado" 
                icono={<FaFilePdf />} 
                alHacerClick={handleDownloadFormato} 
                estilo={{ height: '38px', fontSize: '13px', backgroundColor: '#f59e0b', color: 'white', border: 'none' }}
              />
            </div>

            {/* SECCIÓN 1: DATOS PERSONALES */}
            <Tarjeta titulo="1. Datos Personales (Detectados por OCR)" estilo={{ marginBottom: '20px' }}>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <EntradaFormulario
                  etiqueta="Nombre(s) *"
                  valor={extractedData.nombreJugador}
                  alCambiar={(e) => setExtractedData({...extractedData, nombreJugador: e.target.value})}
                />
                <EntradaFormulario
                  etiqueta="Apellido Paterno *"
                  valor={extractedData.apellidoPaterno}
                  alCambiar={(e) => setExtractedData({...extractedData, apellidoPaterno: e.target.value})}
                />
                <EntradaFormulario
                  etiqueta="Apellido Materno"
                  valor={extractedData.apellidoMaterno}
                  alCambiar={(e) => setExtractedData({...extractedData, apellidoMaterno: e.target.value})}
                />
                <EntradaFormulario
                  etiqueta="CURP Oficial *"
                  valor={extractedData.curp}
                  alCambiar={(e) => setExtractedData({...extractedData, curp: e.target.value.toUpperCase()})}
                  maxLength={18}
                />
                <EntradaFormulario
                  etiqueta="Fecha de Nacimiento *"
                  tipo="date"
                  valor={extractedData.fechaNacimiento}
                  alCambiar={(e) => setExtractedData({...extractedData, fechaNacimiento: e.target.value})}
                />
                <EntradaFormulario
                  etiqueta="Lugar de Nacimiento *"
                  valor={extractedData.lugarNacimiento}
                  alCambiar={(e) => setExtractedData({...extractedData, lugarNacimiento: e.target.value})}
                  marcador="Ciudad y Estado"
                />
                <EntradaSeleccion
                  etiqueta="Género *"
                  valor={extractedData.genero}
                  alCambiar={(e) => setExtractedData({...extractedData, genero: e.target.value})}
                  opciones={[{ valor: '1', etiqueta: 'Masculino' }, { valor: '2', etiqueta: 'Femenino' }]}
                />
                <div style={{ gridColumn: '1 / -1' }}>
                  <AreaTexto
                    etiqueta="Dirección Completa (Calle, Col, Municipio)"
                    valor={extractedData.direccion}
                    alCambiar={(e) => setExtractedData({...extractedData, direccion: e.target.value})}
                    filas={2}
                  />
                </div>
              </div>
            </Tarjeta>

            {/* SECCIÓN 2: DATOS DE CONTACTO Y EQUIPO */}
            <Tarjeta titulo="2. Contacto y Detalles del Jugador" estilo={{ marginBottom: '20px' }}>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <EntradaFormulario
                  etiqueta="Correo Electrónico"
                  tipo="email"
                  valor={extractedData.correo}
                  alCambiar={(e) => setExtractedData({...extractedData, correo: e.target.value})}
                />
                <EntradaFormulario
                  etiqueta="Teléfono Contacto"
                  valor={extractedData.telefono}
                  alCambiar={(e) => setExtractedData({...extractedData, telefono: e.target.value})}
                />
                <EntradaSeleccion
                  etiqueta="Posición"
                  valor={extractedData.posicion}
                  alCambiar={(e) => setExtractedData({...extractedData, posicion: e.target.value})}
                  opciones={[
                    { valor: '', etiqueta: 'Seleccione...' },
                    { valor: 'PORTERO', etiqueta: 'Portero' },
                    { valor: 'DEFENSA', etiqueta: 'Defensa' },
                    { valor: 'MEDIO', etiqueta: 'Medio' },
                    { valor: 'DELANTERO', etiqueta: 'Delantero' }
                  ]}
                />
                <EntradaFormulario
                  etiqueta="Número Camiseta"
                  tipo="number"
                  valor={extractedData.numCamiseta}
                  alCambiar={(e) => setExtractedData({...extractedData, numCamiseta: e.target.value})}
                />
                <EntradaFormulario etiqueta="Categoría (Auto)" valor={extractedData.categoria} deshabilitado />
                <EntradaFormulario etiqueta="Equipo (Auto)" valor={extractedData.equipo} deshabilitado />
              </div>
            </Tarjeta>

            {/* SECCIÓN 3: FORÁNEO / INTERNACIONAL */}
            <Tarjeta estilo={{ backgroundColor: '#fff7ed', border: '1px solid #ffedd5', marginBottom: '30px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#9a3412' }}>
                  Antecedentes Internacionales
                </h4>
                <div className="form-check form-switch">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    id="switchForaneo" 
                    checked={extractedData.esForaneo}
                    onChange={(e) => setExtractedData({...extractedData, esForaneo: e.target.checked})}
                  />
                  <label className="form-check-label" htmlFor="switchForaneo" style={{ fontSize: '13px', fontWeight: '700' }}>
                    ¿Jugador Foráneo?
                  </label>
                </div>
              </div>

              {extractedData.esForaneo ? (
                <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  <EntradaFormulario
                    etiqueta="Nacionalidad Jugador"
                    valor={extractedData.nacionalidadJugador}
                    alCambiar={(e) => setExtractedData({...extractedData, nacionalidadJugador: e.target.value})}
                  />
                  <EntradaFormulario
                    etiqueta="País Residencia Actual"
                    valor={extractedData.paisResidencia}
                    alCambiar={(e) => setExtractedData({...extractedData, paisResidencia: e.target.value})}
                  />
                  <EntradaSeleccion
                    etiqueta="¿Ha vivido en el extranjero?"
                    valor={extractedData.haVividoExtranjero ? '1' : '0'}
                    alCambiar={(e) => setExtractedData({...extractedData, haVividoExtranjero: e.target.value === '1'})}
                    opciones={[{ valor: '0', etiqueta: 'No' }, { valor: '1', etiqueta: 'Sí' }]}
                  />
                  {extractedData.haVividoExtranjero && (
                    <EntradaFormulario
                      etiqueta="¿En qué país?"
                      valor={extractedData.dondeVividoExtranjero}
                      alCambiar={(e) => setExtractedData({...extractedData, dondeVividoExtranjero: e.target.value})}
                    />
                  )}
                  <EntradaFormulario
                    etiqueta="Nacionalidad del Padre"
                    valor={extractedData.nacionalidadPadre}
                    alCambiar={(e) => setExtractedData({...extractedData, nacionalidadPadre: e.target.value})}
                  />
                  <EntradaFormulario
                    etiqueta="Nacionalidad de la Madre"
                    valor={extractedData.nacionalidadMadre}
                    alCambiar={(e) => setExtractedData({...extractedData, nacionalidadMadre: e.target.value})}
                  />
                  
                  <EntradaFormulario
                    etiqueta="Nacionalidad Abuelo Paterno"
                    valor={extractedData.nacAbueloPaterno}
                    alCambiar={(e) => setExtractedData({...extractedData, nacAbueloPaterno: e.target.value})}
                  />
                  <EntradaFormulario
                    etiqueta="Nacionalidad Abuela Paterna"
                    valor={extractedData.nacAbuelaPaterna}
                    alCambiar={(e) => setExtractedData({...extractedData, nacAbuelaPaterna: e.target.value})}
                  />
                  <EntradaFormulario
                    etiqueta="Nacionalidad Abuelo Materno"
                    valor={extractedData.nacAbueloMaterno}
                    alCambiar={(e) => setExtractedData({...extractedData, nacAbueloMaterno: e.target.value})}
                  />
                  <EntradaFormulario
                    etiqueta="Nacionalidad Abuela Materna"
                    valor={extractedData.nacAbuelaMaterna}
                    alCambiar={(e) => setExtractedData({...extractedData, nacAbuelaMaterna: e.target.value})}
                  />

                  <div style={{ gridColumn: '1 / -1' }}>
                    <AreaTexto
                      etiqueta="Registro en Asociación Extranjera (Detalles)"
                      valor={extractedData.registroAsociacionExtranjera}
                      alCambiar={(e) => setExtractedData({...extractedData, registroAsociacionExtranjera: e.target.value})}
                      filas={2}
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <AreaTexto
                      etiqueta="Participación en Clubes/Competencias Extranjeras"
                      valor={extractedData.juegoClubExtranjero}
                      alCambiar={(e) => setExtractedData({...extractedData, juegoClubExtranjero: e.target.value})}
                      filas={2}
                    />
                  </div>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '13px', color: '#9a3412', fontStyle: 'italic' }}>
                  El jugador se considera nacional por defecto. Activa el interruptor si es foráneo para habilitar campos adicionales.
                </p>
              )}
            </Tarjeta>

            {/* ACCIONES FINALES */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
              <BotonSecundario etiqueta="Cancelar" alHacerClick={() => navigate('/admin/jugadores')} />
              <BotonPrimario 
                etiqueta={uploading ? "Procesando..." : "Autorizar e Inscribir Jugador Ahora"} 
                icono={<FaSave />} 
                alHacerClick={handleGuardar} 
                deshabilitado={uploading}
                estilo={{ minWidth: '280px' }}
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
