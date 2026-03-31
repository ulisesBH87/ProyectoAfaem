import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaUpload, FaSyncAlt } from 'react-icons/fa';
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
import { validarFotografia } from '../../services/foto';
import { registrarJugadorTemporal, getAvailableSlots } from '../../services/teams';
import '../../styles/dashboard.css';
import { useRBAC } from '../../hooks/useRBAC';

export default function RegistroJugadores() {
  const navigate = useNavigate();
  const location = useLocation();
  const teamId = location.state?.teamId;
  const userEmail = localStorage.getItem('email');
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
    genero: 'masculino',
    edad: '',
    fechaNacimiento: '',
    direccion: ''
  });

  const [uploading, setUploading] = useState(false);
  const [slotsInfo, setSlotsInfo] = useState({ disponibles: 0, total: 0 });
  const [loadingSlots, setLoadingSlots] = useState(true);

  React.useEffect(() => {
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

  const documentTypes = [
    {
      key: 'actaNacimiento',
      title: 'Acta de nacimiento',
      icon: '📋',
      requirements: [
        'Digitalización clara',
        'Documento legible',
        'Incluya sello o firma oficial'
      ]
    },
    {
      key: 'identificacion',
      title: 'Identificación',
      icon: '🆔',
      requirements: [
        'Documento vigente o reciente',
        'Imagen completa',
        'Legible'
      ]
    },
    {
      key: 'fotografia',
      title: 'Fotografía del jugador',
      icon: '📸',
      requirements: [
        'Tomada frontalmente',
        'Fondo blanco o neutral que implique identificación',
        'En posición vertical',
        'Bien encuadrada y enfocada'
      ]
    },
    {
      key: 'formatoAfiliacion',
      title: 'Formato de afiliación',
      icon: '📝',
      requirements: [
        'Documento suscrito',
        'Digitalización completa',
        'Incluya fotografía',
        'Vigente a la temporada actual'
      ]
    }
  ];

  const handleFileUpload = async (documentKey, file) => {
    if (file) {
      setDocuments(prev => ({
        ...prev,
        [documentKey]: file
      }));

      // Si es foto, validar
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
            setDocuments(prev => ({ ...prev, [documentKey]: null })); // Limpiar si es inválida
          }
        } catch (err) {
          Swal.fire('Error de validación', err.message || 'No se pudo procesar la foto.', 'error');
        }
      }

      // Si es INE o Acta, procesar OCR
      if (documentKey === 'actaNacimiento' || documentKey === 'identificacion') {
        Swal.fire({
          title: 'Analizando Documento...',
          html: 'Extrayendo información vía OCR. <b>Por favor espere.</b>',
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
          
          const rows = doc.querySelectorAll('.dato-fila');
          rows.forEach(row => {
            const label = row.querySelector('.etiqueta')?.textContent?.toLowerCase() || '';
            const value = row.querySelector('.valor')?.textContent?.trim() || '';
            if (label.includes('nombre')) nombreEncontrado = value;
            if (label.includes('curp')) curpEncontrada = value;
            if (label.includes('fecha de nacimiento')) fechaNacEncontrada = value;
          });

          if (nombreEncontrado) {
            const parts = nombreEncontrado.split(' ');
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
              nombreJugador: firstName,
              apellidoPaterno: lastNamePaterno,
              apellidoMaterno: lastNameMaterno,
              curp: curpEncontrada || prev.curp,
              fechaNacimiento: fechaNacEncontrada || prev.fechaNacimiento,
            }));

            Swal.fire({
              title: '¡Lectura Exitosa!',
              text: `Se detectó a: ${nombreEncontrado}`,
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
            });
          } else {
            throw new Error('No se detectaron nombres legibles en este documento.');
          }
        } catch (err) {
          console.error("Error OCR:", err);
          Swal.fire('Aviso', 'No se pudo extraer la información automáticamente. Por favor ingrésala de forma manual.', 'info');
        }
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.style.backgroundColor = '#dbeafe';
    e.currentTarget.style.borderColor = '#0b4ea6';
  };

  const handleDragLeave = (e) => {
    e.currentTarget.style.backgroundColor = 'white';
    e.currentTarget.style.borderColor = '#e2e8f0';
  };

  const handleDrop = (e, documentKey) => {
    e.preventDefault();
    e.currentTarget.style.backgroundColor = 'white';
    e.currentTarget.style.borderColor = '#e2e8f0';
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(documentKey, file);
    }
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    
    // Validaciones
    const curpRegex = /^[A-Z]{4}\d{6}[A-Z]{6}[A-Z0-0]\d$/;
    
    if (!extractedData.nombreJugador?.trim()) {
      Swal.fire('Atención', 'El nombre del jugador es obligatorio.', 'warning');
      return;
    }
    if (!extractedData.apellidoPaterno?.trim()) {
      Swal.fire('Atención', 'El apellido paterno es obligatorio.', 'warning');
      return;
    }
    if (!extractedData.curp?.trim() || extractedData.curp.length !== 18) {
      Swal.fire('Atención', 'La CURP debe tener exactamente 18 caracteres.', 'warning');
      return;
    }
    if (!curpRegex.test(extractedData.curp)) {
      Swal.fire('Atención', 'El formato de la CURP no es válido.', 'warning');
      return;
    }
    if (!extractedData.fechaNacimiento) {
      Swal.fire('Atención', 'La fecha de nacimiento es obligatoria.', 'warning');
      return;
    }
    
    // Verificar que al menos los documentos esenciales estén presentes
    const missingDocs = [];
    if (!documents.actaNacimiento) missingDocs.push('Acta de Nacimiento');
    if (!documents.identificacion) missingDocs.push('Identificación');
    if (!documents.fotografia) missingDocs.push('Fotografía');
    
    if (missingDocs.length > 0) {
      Swal.fire('Documentación Incompleta', `Faltan los siguientes documentos: ${missingDocs.join(', ')}`, 'warning');
      return;
    }

    if (!teamId) {
      Swal.fire('Error', 'No se detectó el ID del equipo. Intenta regresar y volver a intentarlo.', 'error');
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
      
      let sexoId = 3; // No Binario
      if (extractedData.genero === 'masculino') sexoId = 1;
      else if (extractedData.genero === 'femenino') sexoId = 2;
      formData.append('sexo_id', sexoId);
      
      // Asegurar formato YYYY-MM-DD
      let fechaISO = '';
      if (extractedData.fechaNacimiento) {
          if (extractedData.fechaNacimiento.includes('-')) {
             fechaISO = extractedData.fechaNacimiento;
          } else if (extractedData.fechaNacimiento.includes('/')) {
             const parts = extractedData.fechaNacimiento.split('/');
             if (parts.length === 3) fechaISO = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
      }
      formData.append('fecha_nacimiento', fechaISO);
      
      // seguro_id (Valor por defecto o dinámico si es necesario)
      formData.append('seguro_id', 1);

      // Los archivos deben ir en el mismo orden con el ID estático temporal solicitado (3)
      // El backend espera una lista de archivos y una lista de IDs que coincidan en índice
      const docsParams = ['actaNacimiento', 'identificacion', 'fotografia', 'formatoAfiliacion'];
      docsParams.forEach((docKey) => {
        if (documents[docKey]) {
          formData.append('documento_afiliacion_ids', 3); 
          formData.append('archivos', documents[docKey]);
        }
      });

      // Llamada al Backend
      await registrarJugadorTemporal(formData);
      
      Swal.fire({
        title: '¡Jugador Registrado!',
        text: 'La documentación ha sido enviada para validación con éxito.',
        icon: 'success',
        confirmButtonColor: '#0b4ea6'
      }).then(() => {
        navigate(`/presidente-equipo/admin-equipo/${teamId}`);
      });
    } catch (err) {
      console.error("Error al registrar: ", err);
      let msj = 'No se pudo conectar con el servidor';
      if (err.response && err.response.data && err.response.data.detail) {
        msj = typeof err.response.data.detail === 'string' 
          ? err.response.data.detail 
          : JSON.stringify(err.response.data.detail);
      }
      Swal.fire('Error al guardar', msj, 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="dashboard-content">
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            
            {/* HEADER */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '30px',
              marginBottom: '30px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '20px'
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '12px',
                  backgroundColor: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '40px',
                  flexShrink: 0
                }}>
                  ⚽
                </div>
                <div style={{ flex: 1 }}>
                  <h1 style={{
                    margin: '0 0 8px 0',
                    color: '#0b4ea6',
                    fontSize: '24px',
                    fontWeight: '700'
                  }}>
                    Registrar jugador
                  </h1>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '10px' }}>
                    <p style={{
                      margin: '0',
                      color: '#64748b',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      Sube el documento oficial para completar automáticamente la información.
                    </p>
                    {loadingSlots ? (
                      <span style={{ fontSize: '12px', color: '#64748b' }}>⏳ Cargando slots...</span>
                    ) : (
                      <span style={{ 
                        backgroundColor: slotsInfo.disponibles > 0 ? '#dcfce7' : '#fee2e2',
                        color: slotsInfo.disponibles > 0 ? '#166534' : '#991b1b',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '700',
                        border: `1px solid ${slotsInfo.disponibles > 0 ? '#86efac' : '#fecaca'}`
                      }}>
                        {slotsInfo.disponibles} / {slotsInfo.total} Slots disponibles
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* TARJETAS DE DOCUMENTOS */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '20px',
              marginBottom: '40px'
            }}>
              {documentTypes.map((doc) => (
                <div
                  key={doc.key}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    border: '2px dashed #e2e8f0',
                    padding: '20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    minHeight: '280px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, doc.key)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  {/* ÍCONO Y TÍTULO */}
                  <div>
                    <div style={{
                      fontSize: '40px',
                      marginBottom: '12px'
                    }}>
                      {doc.icon}
                    </div>
                    <h3 style={{
                      margin: '0 0 12px 0',
                      color: '#1e293b',
                      fontSize: '14px',
                      fontWeight: '700',
                      lineHeight: '1.3'
                    }}>
                      {doc.title}
                    </h3>
                    
                    {/* ESTADO DE CARGA */}
                    {documents[doc.key] ? (
                      <div style={{
                        backgroundColor: '#dcfce7',
                        color: '#166534',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        marginBottom: '12px',
                        border: '1px solid #86efac'
                      }}>
                        ✓ {documents[doc.key].name}
                      </div>
                    ) : (
                      <div style={{
                        backgroundColor: '#fef3c7',
                        color: '#92400e',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        marginBottom: '12px',
                        border: '1px solid #fcd34d'
                      }}>
                        Pendiente
                      </div>
                    )}
                  </div>

                  {/* REQUISITOS */}
                  <div style={{
                    textAlign: 'left',
                    marginBottom: '12px'
                  }}>
                    {doc.requirements.map((req, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px',
                          marginBottom: '8px',
                          fontSize: '11px',
                          color: '#64748b',
                          fontWeight: '500'
                        }}
                      >
                        <input
                          type="checkbox"
                          disabled
                          style={{
                            marginTop: '2px',
                            flexShrink: 0
                          }}
                        />
                        <span>{req}</span>
                      </div>
                    ))}
                  </div>

                  {/* INPUT OCULTO */}
                  <input
                    type="file"
                    id={`file-${doc.key}`}
                    accept="image/*,.pdf"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileUpload(doc.key, e.target.files[0])}
                  />

                  {/* BOTÓN PARA SUBIR */}
                  <button
                    onClick={() => document.getElementById(`file-${doc.key}`).click()}
                    style={{
                      backgroundColor: '#0b4ea6',
                      color: 'white',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '700',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#0a3d85';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#0b4ea6';
                    }}
                  >
                    <FaUpload style={{ marginRight: '6px' }} />
                    Subir archivo
                  </button>
                </div>
              ))}
            </div>

            {/* DATOS EXTRAÍDOS - FORMULARIO EDITABLE */}
            {(extractedData.nombreJugador || Object.values(documents).some(d => d !== null)) && (
              <Tarjeta titulo="Información del Jugador" estilo={{ marginBottom: '30px' }}>
                {uploading && <Cargador mensaje="Procesando documentos..." />}
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '20px'
                }}>
                  <EntradaFormulario
                    etiqueta="Nombre del jugador *"
                    tipo="text"
                    nombre="nombreJugador"
                    valor={extractedData.nombreJugador}
                    alCambiar={(e) => setExtractedData({...extractedData, nombreJugador: e.target.value})}
                    marcador="Ej. Juan"
                  />

                  <EntradaFormulario
                    etiqueta="Apellido paterno *"
                    tipo="text"
                    nombre="apellidoPaterno"
                    valor={extractedData.apellidoPaterno}
                    alCambiar={(e) => setExtractedData({...extractedData, apellidoPaterno: e.target.value})}
                    marcador="Ej. Pérez"
                  />

                  <EntradaFormulario
                    etiqueta="Apellido materno"
                    tipo="text"
                    nombre="apellidoMaterno"
                    valor={extractedData.apellidoMaterno}
                    alCambiar={(e) => setExtractedData({...extractedData, apellidoMaterno: e.target.value})}
                    marcador="Ej. García"
                  />

                  <EntradaFormulario
                    etiqueta="CURP *"
                    tipo="text"
                    nombre="curp"
                    valor={extractedData.curp}
                    alCambiar={(e) => setExtractedData({...extractedData, curp: e.target.value.toUpperCase()})}
                    marcador="18 caracteres"
                    longitudMaxima={18}
                  />

                  <EntradaSeleccion
                    etiqueta="Género *"
                    nombre="genero"
                    valor={extractedData.genero}
                    alCambiar={(e) => setExtractedData({...extractedData, genero: e.target.value})}
                    opciones={[
                      { valor: 'masculino', etiqueta: 'Masculino' },
                      { valor: 'femenino', etiqueta: 'Femenino' },
                      { valor: 'otro', etiqueta: 'Otro' }
                    ]}
                  />

                  <EntradaFormulario
                    etiqueta="Edad"
                    tipo="number"
                    nombre="edad"
                    valor={extractedData.edad}
                    alCambiar={(e) => setExtractedData({...extractedData, edad: e.target.value})}
                    marcador="Ej. 18"
                  />

                  <EntradaFormulario
                    etiqueta="Fecha de nacimiento *"
                    tipo="date"
                    nombre="fechaNacimiento"
                    valor={extractedData.fechaNacimiento || ''}
                    alCambiar={(e) => setExtractedData({...extractedData, fechaNacimiento: e.target.value})}
                  />

                  <div style={{ gridColumn: '1 / -1' }}>
                    <AreaTexto
                      etiqueta="Dirección"
                      nombre="direccion"
                      valor={extractedData.direccion}
                      alCambiar={(e) => setExtractedData({...extractedData, direccion: e.target.value})}
                      marcador="Ej. Calle 5 #123, Colonia Centro"
                      filas={3}
                      longitudMaxima={500}
                    />
                  </div>
                </div>
              </Tarjeta>
            )}

            {/* BOTONES DE ACCIÓN */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <BotonPrimario
                etiqueta={`${uploading ? '⏳ Subiendo...' : '📤 Subir documentos'}`}
                alHacerClick={handleSubmit}
                deshabilitado={uploading}
                estilo={{
                  minWidth: '200px'
                }}
              />
              <BotonSecundario
                etiqueta="← Regresar"
                alHacerClick={() => navigate(teamId ? `/presidente-equipo/admin-equipo/${teamId}` : '/presidente-equipo/equipos')}
              />
            </div>

      </div>
    </div>
  );
}
