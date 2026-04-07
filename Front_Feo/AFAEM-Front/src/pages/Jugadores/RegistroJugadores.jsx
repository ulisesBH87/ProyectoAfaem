import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaUpload, FaSyncAlt, FaFilePdf, FaSave, FaCheckCircle, FaArrowLeft } from 'react-icons/fa';
import { 
  BotonPrimario, 
  BotonSecundario, 
  EntradaFormulario, 
  EntradaSeleccion, 
  AreaTexto,
  Alerta,
  Tarjeta,
  Cargador,
  ConsejoFlotante
} from '../../components/partials';
import Swal from 'sweetalert2';
import { PDFDocument } from 'pdf-lib';
import { validarFotografia } from '../../services/foto';
import { registrarJugadorTemporal, getAvailableSlots } from '../../services/teams';
import '../../styles/dashboard.css';

export default function RegistroJugadores() {
  const navigate = useNavigate();
  const location = useLocation();
  const teamId = location.state?.teamId;
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

  const [uploading, setUploading] = useState(false);
  const [slotsInfo, setSlotsInfo] = useState({ disponibles: 0, total: 0 });
  const [loadingSlots, setLoadingSlots] = useState(true);

  // CARGAR SLOTS
  useEffect(() => {
    const fetchSlots = async () => {
      if (!teamId) return;
      try {
        setLoadingSlots(true);
        const data = await getAvailableSlots(teamId);
        setSlotsInfo({
          disponibles: data.slots_disponibles || 0,
          total: data.total_slots || 0
        });
      } catch (err) {
        console.error("Error al obtener slots:", err);
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [teamId]);

  // PROCESAR OCR
  const handleFileUpload = async (documentKey, file) => {
    if (!file) return;
    setDocuments(prev => ({ ...prev, [documentKey]: file }));

    if (documentKey === 'fotografia') {
      Swal.fire({ title: 'Validando Fotografía...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
      try {
        const data = await validarFotografia(file);
        if (data.valido) {
          Swal.fire({ title: '¡Fotografía Aceptada!', icon: 'success', timer: 1500, showConfirmButton: false });
        } else {
          Swal.fire('Error en la fotografía', data.mensaje, 'error');
          setDocuments(prev => ({ ...prev, [documentKey]: null }));
        }
      } catch (err) { Swal.fire('Error', 'No se pudo procesar la foto.', 'error'); }
    }

    if (documentKey === 'actaNacimiento' || documentKey === 'identificacion') {
      Swal.fire({ title: 'Analizando Documento...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
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
          if (lbl.includes('nacimiento')) {
            if (val.includes('/')) {
              const p = val.split('/');
              if (p.length === 3) fnac = p[2].length === 4 ? `${p[2]}-${p[1]}-${p[0]}` : `${p[0]}-${p[1]}-${p[2]}`;
            } else fnac = val;
          }
        });

        if (nom || crp) {
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
          Swal.fire({ title: '¡Lectura Exitosa!', icon: 'success', timer: 1500, showConfirmButton: false });
        }
      } catch (err) { Swal.fire('Aviso', 'No se extrajeron todos los datos. Favor de completar manualmente.', 'info'); }
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

  // DESCARGAR FORMATO
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

      safeSetField(form, 'Nombres', extractedData.nombreJugador);
      safeSetField(form, 'Apellido Paterno', extractedData.apellidoPaterno);
      safeSetField(form, 'Apellido Materno', extractedData.apellidoMaterno);
      safeSetField(form, 'CURP o Clave Única de Registro de Población', extractedData.curp);
      safeSetField(form, 'Fecha de Nacimiento', extractedData.fechaNacimiento);
      safeSetField(form, 'Sexo', extractedData.genero === '1' ? 'MASCULINO' : 'FEMENINO');
      safeSetField(form, 'Lugar de Nacimiento', extractedData.lugarNacimiento);
      safeSetField(form, 'Correo electrónico', extractedData.correo);
      safeSetField(form, 'Teléfono', extractedData.telefono);
      safeSetField(form, 'Posición', extractedData.posicion);
      safeSetField(form, 'Camiseta', extractedData.numCamiseta);

      if (extractedData.esForaneo) {
        safeSetField(form, 'Nacionalidades del jugador', extractedData.nacionalidadJugador);
        safeSetField(form, 'País de residencia actual', extractedData.paisResidencia);
        safeSetField(form, 'Nacionalidades del padre', extractedData.nacionalidadPadre);
        safeSetField(form, 'Nacionalidades de la madre', extractedData.nacionalidadMadre);
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Formato_Afiliacion_${extractedData.nombreJugador}.pdf`;
      link.click();
      Swal.close();
    } catch (err) { Swal.fire('Error', 'No se pudo generar el PDF.', 'error'); }
  };

  // ENVIAR REGISTRO
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!extractedData.nombreJugador || !extractedData.curp || !extractedData.fechaNacimiento) {
      Swal.fire('Atención', 'Nombre, CURP y Fecha son obligatorios.', 'warning');
      return;
    }
    if (!documents.actaNacimiento || !documents.identificacion || !documents.fotografia) {
      Swal.fire('Documentación Incompleta', 'Debe subir Acta, Identificación y Fotografía.', 'warning');
      return;
    }

    setUploading(true);
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

      ['actaNacimiento', 'identificacion', 'fotografia', 'formatoAfiliacion'].forEach(key => {
        if (documents[key]) { formData.append('documento_afiliacion_ids', 3); formData.append('archivos', documents[key]); }
      });

      await registrarJugadorTemporal(formData);
      Swal.fire({ title: '¡Registro Exitoso!', text: 'El jugador ha sido enviado a revisión.', icon: 'success' })
        .then(() => navigate(`/presidente-equipo/admin-equipo/${teamId}`));
    } catch (err) { Swal.fire('Error', 'No se pudo completar el registro.', 'error'); }
    finally { setUploading(false); }
  };

  return (
    <div className="dashboard-content">
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* HEADER */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '25px', marginBottom: '25px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ fontSize: '40px' }}>⚽</div>
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: 0, color: '#0b4ea6', fontSize: '22px', fontWeight: '800' }}>Registro de Jugador</h1>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Complete el formulario oficial de afiliación.</p>
                {!loadingSlots && (
                  <span style={{ fontSize: '12px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', backgroundColor: '#f1f5f9' }}>
                    Slots: {slotsInfo.disponibles} / {slotsInfo.total}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* DOCUMENTOS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          {[
            { key: 'actaNacimiento', title: 'Acta Nacimiento', icon: '📋' },
            { key: 'identificacion', title: 'Identificación', icon: '🆔' },
            { key: 'fotografia', title: 'Fotografía', icon: '📸' },
            { key: 'formatoAfiliacion', title: 'Formato Firmado', icon: '📝' }
          ].map(doc => (
            <div 
              key={doc.key} 
              onClick={() => document.getElementById(`file-${doc.key}`).click()}
              style={{ padding: '20px', textAlign: 'center', border: '2px dashed #e2e8f0', borderRadius: '12px', cursor: 'pointer', backgroundColor: documents[doc.key] ? '#f0fdf4' : 'white' }}
            >
              <div style={{ fontSize: '30px', marginBottom: '10px' }}>{doc.icon}</div>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: '700' }}>{doc.title}</p>
              {documents[doc.key] && <span style={{ fontSize: '11px', color: '#166534' }}>✓ Cargado</span>}
              <input type="file" id={`file-${doc.key}`} style={{ display: 'none' }} onChange={(e) => handleFileUpload(doc.key, e.target.files[0])} />
            </div>
          ))}
        </div>

        {/* FORMULARIO */}
        <Tarjeta titulo="Información de Afiliación">
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <EntradaFormulario etiqueta="Nombre(s) *" valor={extractedData.nombreJugador} alCambiar={(e) => setExtractedData({...extractedData, nombreJugador: e.target.value})} />
            <EntradaFormulario etiqueta="Apellido Paterno *" valor={extractedData.apellidoPaterno} alCambiar={(e) => setExtractedData({...extractedData, apellidoPaterno: e.target.value})} />
            <EntradaFormulario etiqueta="Apellido Materno" valor={extractedData.apellidoMaterno} alCambiar={(e) => setExtractedData({...extractedData, apellidoMaterno: e.target.value})} />
            <EntradaFormulario etiqueta="CURP *" valor={extractedData.curp} alCambiar={(e) => setExtractedData({...extractedData, curp: e.target.value.toUpperCase()})} maxLength={18} />
            <EntradaFormulario etiqueta="Fecha Nacimiento *" tipo="date" valor={extractedData.fechaNacimiento} alCambiar={(e) => setExtractedData({...extractedData, fechaNacimiento: e.target.value})} />
            <EntradaFormulario etiqueta="Lugar de Nacimiento *" valor={extractedData.lugarNacimiento} alCambiar={(e) => setExtractedData({...extractedData, lugarNacimiento: e.target.value})} />
            <EntradaSeleccion etiqueta="Género *" valor={extractedData.genero} alCambiar={(e) => setExtractedData({...extractedData, genero: e.target.value})} opciones={[{ valor: '1', etiqueta: 'Masculino' }, { valor: '2', etiqueta: 'Femenino' }]} />
            <EntradaFormulario etiqueta="Correo *" tipo="email" valor={extractedData.correo} alCambiar={(e) => setExtractedData({...extractedData, correo: e.target.value})} />
            <EntradaFormulario etiqueta="Teléfono *" valor={extractedData.telefono} alCambiar={(e) => setExtractedData({...extractedData, telefono: e.target.value})} />
            <EntradaSeleccion etiqueta="Posición" valor={extractedData.posicion} alCambiar={(e) => setExtractedData({...extractedData, posicion: e.target.value})} opciones={[{ valor: 'PORTERO', etiqueta: 'Portero' }, { valor: 'DEFENSA', etiqueta: 'Defensa' }, { valor: 'MEDIO', etiqueta: 'Medio' }, { valor: 'DELANTERO', etiqueta: 'Delantero' }]} />
            <EntradaFormulario etiqueta="Camiseta" tipo="number" valor={extractedData.numCamiseta} alCambiar={(e) => setExtractedData({...extractedData, numCamiseta: e.target.value})} />
            
            <div style={{ gridColumn: '1 / -1', padding: '15px', backgroundColor: '#fdf2f2', borderRadius: '8px', border: '1px solid #fee2e2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '700', fontSize: '14px' }}>¿Es Jugador Foráneo?</span>
                <input type="checkbox" checked={extractedData.esForaneo} onChange={(e) => setExtractedData({...extractedData, esForaneo: e.target.checked})} />
              </div>
              {extractedData.esForaneo && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                  <EntradaFormulario etiqueta="Nacionalidad" valor={extractedData.nacionalidadJugador} alCambiar={(e) => setExtractedData({...extractedData, nacionalidadJugador: e.target.value})} />
                  <EntradaFormulario etiqueta="Residencia" valor={extractedData.paisResidencia} alCambiar={(e) => setExtractedData({...extractedData, paisResidencia: e.target.value})} />
                </div>
              )}
            </div>
            
            <div style={{ gridColumn: '1 / -1' }}>
              <AreaTexto etiqueta="Dirección completa" valor={extractedData.direccion} alCambiar={(e) => setExtractedData({...extractedData, direccion: e.target.value})} filas={2} />
            </div>
          </div>
        </Tarjeta>

        {/* ACCIONES */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '30px' }}>
          <BotonSecundario etiqueta="Descargar PDF Pre-llenado" icono={<FaFilePdf />} alHacerClick={handleDownloadFormato} />
          <BotonPrimario etiqueta={uploading ? "Procesando..." : "Registrar Jugador Ahora"} icono={<FaSave />} alHacerClick={handleSubmit} deshabilitado={uploading} />
        </div>

      </div>
    </div>
  );
}
