import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  FaArrowLeft,
  FaSave,
  FaUpload,
  FaFilePdf,
  FaSyncAlt,
  FaCheckCircle,
  FaSearchPlus,
  FaGlobeAmericas
} from 'react-icons/fa';
import { PDFDocument } from 'pdf-lib';
import { validarFotografia } from '../../services/foto';
import adminService from '../../services/admin';
import teamsService from '../../services/teams';
import {
  BotonPrimario,
  BotonSecundario,
  Tarjeta,
  EntradaFormulario,
  EntradaSeleccion,
  AreaTexto,
  Cargador,
  Modal
} from '../../components/partials';
import Loader from '../../components/Loader';

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
  
  // Límites de fecha para el registro de jugadores
  const today = new Date().toISOString().split('T')[0];
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 100);
  const minDateStr = minDate.toISOString().split('T')[0];

  // ESTILO DINÁMICO PARA HOVER
  const hoverStyles = `
    .document-card:hover .overlay-actions {
      opacity: 1 !important;
    }
    .document-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }
  `;

  // ESTADOS
  const [equiposDb, setEquiposDb] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [teamSearchTerm, setTeamSearchTerm] = useState('');
  const [fillManually, setFillManually] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [documents, setDocuments] = useState({
    actaNacimiento: null,
    identificacion: null,
    fotografia: null,
    formatoAfiliacion: null,
    documentoEstudiante: null
  });

  // Previsualizaciones (URLs locales)
  const [previews, setPreviews] = useState({
    actaNacimiento: null,
    identificacion: null,
    fotografia: null,
    formatoAfiliacion: null,
    documentoEstudiante: null
  });



  const [catalogs, setCatalogs] = useState({
    ligas: [],
    categorias: [],
    modalidades: [],
    ramas: [],
    seguros: [],
    roles_equipo: [],
    combinaciones: []
  });
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);

  // Cargar catálogos al montar
  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        setLoadingCatalogs(true);
        const data = await teamsService.getCatalogs();
        setCatalogs(data);
      } catch (error) {
        console.error("Error al cargar catálogos:", error);
      } finally {
        setLoadingCatalogs(false);
      }
    };
    loadCatalogs();
  }, []);

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

  // RESPALDO DE DATOS OCR (PARA COMPARACIÓN)
  const [ocrDataOriginal, setOcrDataOriginal] = useState(null);

  const [showFinishModal, setShowFinishModal] = useState(false);
  const [signedForm, setSignedForm] = useState(null);
  const [signedFormPreview, setSignedFormPreview] = useState(null);
  const [previewDoc, setPreviewDoc] = useState({ open: false, url: '', type: '', title: '' });

  // DETERMINACIÓN DE PASOS
  const isStep1Done = !!extractedData.equipoSeleccionado;
  const isStep2Done = Object.values(documents).some(d => d !== null);
  const showStep2 = isStep1Done;
  const showStep3 = isStep2Done || fillManually;

  // EFECTO PARA AUTO-LLENAR LIGA Y EQUIPO AL CAMBIAR EQUIPO SELECCIONADO
  useEffect(() => {
    if (extractedData.equipoSeleccionado && equiposDb.length > 0) {
      const selected = equiposDb.find(e => String(e.EquipoId) === String(extractedData.equipoSeleccionado));
      if (selected) {
        setExtractedData(prev => ({
          ...prev,
          equipo: selected.NombreEquipo || '',
          liga: selected.Liga || '',
          categoria: selected.Categoria || 'LIBRE'
        }));
      }
    }
  }, [extractedData.equipoSeleccionado, equiposDb]);

  // CARGAR CATÁLOGO DE EQUIPOS ACTIVOS PARA REGISTRO
  useEffect(() => {
    const fetchTeamCatalog = async () => {
      try {
        setLoadingTeams(true);
        const data = await adminService.getEquiposDirectorio();
        setEquiposDb(data || []);
      } catch (e) {
        console.error("No se pudieron cargar los equipos:", e);
        Swal.fire('Error', 'No se pudo cargar el directorio de equipos.', 'error');
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

    // Generar Previsualización
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => ({ ...prev, [documentKey]: reader.result }));
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      const url = URL.createObjectURL(file);
      setPreviews(prev => ({ ...prev, [documentKey]: url }));
    }

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

          const ocrResult = {
            nombreJugador: firstName || '',
            apellidoPaterno: lastNamePaterno || '',
            apellidoMaterno: lastNameMaterno || '',
            curp: curpEncontrada || '',
            fechaNacimiento: fechaNacEncontrada || '',
            lugarNacimiento: lugarNacEncontrado || ''
          };

          setOcrDataOriginal(ocrResult);

          setExtractedData(prev => ({
            ...prev,
            ...ocrResult
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
      
      // La Asociación y campo fill_24 (empírico para Tipo Afiliación / Asociación) deben ser "AFAEM"
      safeSetField(form, 'Asociación', 'AFAEM');
      safeSetField(form, 'fill_24', 'AFAEM');
      
      safeSetField(form, 'Liga', extractedData.liga);
      safeSetField(form, 'Equipo', extractedData.equipo);
      safeSetField(form, 'Categoría', extractedData.categoria);

      // Traducir el ID de Posición a su Nombre string
      const posObj = catalogs?.roles_equipo?.find(r => r.id.toString() === extractedData.posicion?.toString());
      safeSetField(form, 'Posición', posObj ? posObj.nombre : (extractedData.tipoAfiliacion || 'JUGADOR'));
      
      safeSetField(form, 'Camiseta', extractedData.numCamiseta);

      // ANTECEDENTES INTERNACIONALES (SI ES FORÁNEO)
      if (extractedData.esForaneo) {
        safeSetField(form, 'Nacionalidades del jugador', extractedData.nacionalidadJugador);
        safeSetField(form, 'País de residencia actual', extractedData.paisResidencia);
        safeSetField(form, 'El jugador ha vivido en el extranjero En que país', extractedData.haVividoExtranjero ? extractedData.dondeVividoExtranjero : 'NO');
        safeSetField(form, 'Nacionalidades del padre', extractedData.nacionalidadPadre);
        safeSetField(form, 'Nacionalidades de la madre', extractedData.nacionalidadMadre);
        safeSetField(form, 'Nacionalidades del abuelo paterno', extractedData.nacAbueloPaterno);
        safeSetField(form, 'Nacionalidades de la abuela paterna', extractedData.nacAbuelaPaterna);
        safeSetField(form, 'Nacionalidades del abuelo materno', extractedData.nacAbueloMaterno);
        safeSetField(form, 'Nacionalidades de la abuela materna', extractedData.nacAbuelaMaterna);
        safeSetField(form, 'El jugador ha sido registrado por la Asociación Nacional de Fútbol', extractedData.registroAsociacionExtranjera);
        safeSetField(form, 'El jugador ha jugado en un Club extranjero y participado en', extractedData.juegoClubExtranjero);
      }

      // 3. FECHA DE DESCARGA AUTOMÁTICA (Usando los mapeos corregidos de ConfigurarEquipo)
      const hoy = new Date();
      const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
      const dia = String(hoy.getDate()).padStart(2, '0');
      const mes = meses[hoy.getMonth()];
      const anio = String(hoy.getFullYear()).slice(-2);

      safeSetField(form, 'A', dia);
      safeSetField(form, 'de', mes);
      safeSetField(form, 'del 20', anio);

      // Fallback
      const fechaCompleta = `${dia} DE ${mes} DE 20${anio}`;
      safeSetField(form, 'Fecha de descarga', fechaCompleta);
      safeSetField(form, 'Fecha descarga', fechaCompleta);
      safeSetField(form, 'Fecha', fechaCompleta);

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

      Swal.close();
      return true; // Indicar éxito
    } catch (err) {
      console.error("Error PDF:", err);
      Swal.fire('Error', 'No se pudo generar el PDF. ' + err.message, 'error');
      return false;
    }
  };

  // GUARDAR JUGADOR (Ahora abre el modal final)
  const handleGuardar = async (e) => {
    if (e) e.preventDefault();

    if (!extractedData.nombreJugador || !extractedData.curp) {
      Swal.fire('Atención', 'Los campos Nombre y CURP son obligatorios.', 'warning');
      return;
    }

    if (extractedData.esForaneo) {
      const {
        nacionalidadJugador, paisResidencia, dondeVividoExtranjero, haVividoExtranjero,
        nacionalidadPadre, nacionalidadMadre, registroAsociacionExtranjera,
        nacAbueloPaterno, nacAbuelaPaterna, nacAbueloMaterno, nacAbuelaMaterna,
        juegoClubExtranjero
      } = extractedData;
      
      const basicosForaneo = [
        nacionalidadJugador, paisResidencia, nacionalidadPadre, nacionalidadMadre,
        registroAsociacionExtranjera, nacAbueloPaterno, nacAbuelaPaterna, 
        nacAbueloMaterno, nacAbuelaMaterna, juegoClubExtranjero
      ];
      
      const completado = basicosForaneo.every(campo => String(campo || '').trim() !== '');
      const vivoValid = !haVividoExtranjero || (haVividoExtranjero && String(dondeVividoExtranjero || '').trim() !== '');
      
      if (!completado || !vivoValid) {
        Swal.fire('Atención', 'Al seleccionar que el jugador es extranjero, TODOS los campos de antecedentes internacionales deben ser llenados.', 'warning');
        return;
      }
    }

    // 1. Descargar el formato automáticamente
    const success = await handleDownloadFormato();

    if (success) {
      // 2. Abrir el modal de finalización
      setShowFinishModal(true);
    }
  };

  // ENVÍO FINAL A BACKEND
  const handleFinalizarInscripcion = async () => {
    if (!signedForm) {
      Swal.fire('Archivo requerido', 'Por favor, suba el formato de afiliación firmado para finalizar.', 'warning');
      return;
    }

    setUploading(true);
    Swal.fire({
      title: 'Finalizando Inscripción',
      text: 'Enviando información y documentos...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const formData = new FormData();
      formData.append('equipo_id', parseInt(extractedData.equipoSeleccionado, 10));
      formData.append('nombre', (extractedData.nombreJugador || '').toString().trim());
      formData.append('primer_apellido', (extractedData.apellidoPaterno || '').toString().trim());
      formData.append('segundo_apellido', (extractedData.apellidoMaterno || '').toString().trim());
      formData.append('curp', (extractedData.curp || '').toString().toUpperCase());
      formData.append('sexo_id', parseInt(extractedData.genero, 10));
      formData.append('fecha_nacimiento', extractedData.fechaNacimiento);
      formData.append('lugar_nacimiento', extractedData.lugarNacimiento || 'MÉXICO');
      formData.append('correo', extractedData.correo || '');
      formData.append('telefono', extractedData.telefono || '');
      formData.append('rol_en_equipo', extractedData.posicion || '3');
      formData.append('numero_camiseta', extractedData.numCamiseta || '0');
      formData.append('seguro_id', 1);

      // Mapeo detallado de antecedentes si es foráneo
      if (extractedData.esForaneo) {
        formData.append('extranjero', '1');
        formData.append('nacionalidad', extractedData.nacionalidadJugador);
        formData.append('pais_residencia', extractedData.paisResidencia);
        formData.append('nacionalidad_padre', extractedData.nacionalidadPadre);
        formData.append('nacionalidad_madre', extractedData.nacionalidadMadre);
        formData.append('nac_abuelo_paterno', extractedData.nacAbueloPaterno);
        formData.append('nac_abuela_paterna', extractedData.nacAbuelaPaterna);
        formData.append('nac_abuelo_materno', extractedData.nacAbueloMaterno);
        formData.append('nac_abuela_materna', extractedData.nacAbuelaMaterna);
        formData.append('registro_asociacion_extranjera', extractedData.registroAsociacionExtranjera);
        formData.append('juego_club_extranjero', extractedData.juegoClubExtranjero);
        
        formData.append('ha_vivido_extranjero', extractedData.haVividoExtranjero ? '1' : '0');
        formData.append('donde_vivido', extractedData.dondeVividoExtranjero);
      }

      // Archivos con llaves específicas requeridas por el backend
      if (documents.actaNacimiento) formData.append('acta', documents.actaNacimiento);
      if (documents.identificacion) formData.append('ine', documents.identificacion);
      if (documents.fotografia) formData.append('foto', documents.fotografia);

      // Documento de estudiante (solo si el jugador es menor de edad)
      if (esMenorDeEdad && documents.documentoEstudiante) {
        formData.append('documento_estudiante', documents.documentoEstudiante);
      }

      // El formato firmado desde el modal
      formData.append('formato_firmado', signedForm);

      await adminService.agregarJugadorEquipoExistente(formData);

      setShowFinishModal(false);
      Swal.fire({
        icon: 'success',
        title: 'Jugador Inscrito Correctamente',
        text: 'El expediente se ha completado con el formato firmado.'
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
      <style>{hoverStyles}</style>
      {/* HEADER */}
      <div style={{ marginBottom: '40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button
            onClick={() => {
              const tieneDatos = Object.values(documents).some(d => d !== null) || extractedData.nombreJugador;
              if (tieneDatos) {
                Swal.fire({
                  title: '¿Abandonar registro?',
                  text: "Se perderán los documentos subidos y el progreso actual.",
                  icon: 'warning',
                  showCancelButton: true,
                  confirmButtonColor: '#ef4444',
                  cancelButtonColor: '#64748b',
                  confirmButtonText: 'Sí, salir',
                  cancelButtonText: 'Continuar registro'
                }).then((result) => {
                  if (result.isConfirmed) navigate('/admin/jugadores');
                });
              } else {
                navigate('/admin/jugadores');
              }
            }}
            className="btn btn-outline-secondary"
            style={{ padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center' }}
          >
            <FaArrowLeft />
          </button>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Alta rápida de jugador</h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Inscripción administrativa directa en equipos de liga.</p>
          </div>
        </div>
      </div>

      <div className="premium-card fade-in" style={{ maxWidth: '1000px', margin: '0 auto', background: 'white', borderRadius: '24px', padding: '40px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}>
        <div style={{ marginBottom: '30px', borderBottom: '1px solid #f1f5f9', paddingBottom: '20px' }}>
          <p className="required-legend" style={{ margin: 0 }}>
            <span className="required-star">*</span> Indica que el campo es obligatorio para el registro oficial en la liga.
          </p>
        </div>

        {/* PASO 1: SELECCION DE EQUIPO */}
        <section style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '24px' }}>
            <StepBadge number="1" isActive={!isStep1Done} isDone={isStep1Done} />
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Elección de equipo destino</h3>
          </div>

          <div style={{ animation: 'slideUp 0.4s ease', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>🛡️</div>
              <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>Seleccionar Equipo</h2>
              <p style={{ color: '#64748b' }}>Busca y elige el equipo donde se inscribirá el jugador.</p>
            </div>

            <div className="card" style={{ padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'relative', border: '1px solid #e2e8f0', background: 'white' }}>
              <div className="mb-4">
                <label className="form-label" style={{ fontWeight: '700', fontSize: '14px', marginBottom: '8px', display: 'block' }}>Buscar Equipo <span className="required-star">*</span></label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Escribe nombre de equipo, liga o categoría..." 
                  value={teamSearchTerm}
                  onChange={(e) => setTeamSearchTerm(e.target.value)}
                  style={{ borderRadius: '10px', padding: '12px', width: '100%', border: '1px solid #cbd5e1' }}
                  disabled={loadingTeams}
                />
              </div>

              {loadingTeams ? (
                <Loader inline text="Cargando equipos..." />
              ) : (
                <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '20px' }}>
                  {equiposDb
                    .filter(eq => {
                      const term = (teamSearchTerm || '').toLowerCase().trim();
                      if (!term) return true;
                      
                      const name = (eq.NombreEquipo || '').toLowerCase();
                      const liga = (eq.Liga || '').toLowerCase();
                      const cat = (eq.Categoria || '').toLowerCase();
                      
                      return name.includes(term) || 
                             liga.includes(term) ||
                             cat.includes(term);
                    })
                    .map((eq, index) => (
                      <div 
                        key={`equipo-${eq.EquipoId || index}`} 
                        onClick={() => setExtractedData(prev => ({ 
                          ...prev, 
                          equipoSeleccionado: String(eq.EquipoId),
                          equipo: eq.NombreEquipo,
                          liga: eq.Liga,
                          categoria: eq.Categoria
                        }))}
                        style={{ 
                          padding: '12px 20px', 
                          cursor: 'pointer',
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: String(extractedData.equipoSeleccionado) === String(eq.EquipoId) ? '#eff6ff' : 'white',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ 
                          width: '40px', height: '40px', borderRadius: '50%', 
                          background: String(extractedData.equipoSeleccionado) === String(eq.EquipoId) ? '#0b4ea6' : '#f1f5f9',
                          color: String(extractedData.equipoSeleccionado) === String(eq.EquipoId) ? 'white' : '#64748b',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '14px', fontWeight: '800', flexShrink: 0
                        }}>
                          {(eq.NombreEquipo || 'E').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: String(extractedData.equipoSeleccionado) === String(eq.EquipoId) ? '700' : '500', color: '#1e293b', display: 'block' }}>
                            {eq.NombreEquipo}
                          </span>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            {eq.Liga || 'Sin Liga'} - {eq.Categoria || 'LIBRE'}
                          </span>
                        </div>
                        {String(extractedData.equipoSeleccionado) === String(eq.EquipoId) && <span style={{ marginLeft: 'auto', color: '#0b4ea6', fontSize: '20px' }}>✓</span>}
                      </div>
                    ))}
                  {equiposDb.filter(eq => {
                      const term = (teamSearchTerm || '').toLowerCase().trim();
                      if (!term) return true;
                      const name = (eq.NombreEquipo || '').toLowerCase();
                      const liga = (eq.Liga || '').toLowerCase();
                      return name.includes(term) || liga.includes(term);
                    }).length === 0 && (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                         No se encontraron equipos que coincidan con la búsqueda.
                      </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* SELECTOR DE NACIONALIDAD */}
        <section className="fade-in" style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
            <FaGlobeAmericas style={{ color: '#0b4ea6', fontSize: '20px' }} />
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', margin: 0 }}>Nacionalidad del jugador</h3>
          </div>
          
          <div style={{ 
            display: 'flex', 
            background: '#f1f5f9', 
            padding: '4px', 
            borderRadius: '12px', 
            width: 'fit-content' 
          }}>
            <button
              onClick={() => setExtractedData(prev => ({ ...prev, esForaneo: false }))}
              style={{
                padding: '10px 24px',
                borderRadius: '10px',
                border: 'none',
                background: !extractedData.esForaneo ? 'white' : 'transparent',
                color: !extractedData.esForaneo ? '#0b4ea6' : '#64748b',
                fontWeight: '800',
                fontSize: '13px',
                boxShadow: !extractedData.esForaneo ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              🇲🇽 Mexicano
            </button>
            <button
              onClick={() => setExtractedData(prev => ({ ...prev, esForaneo: true }))}
              style={{
                padding: '10px 24px',
                borderRadius: '10px',
                border: 'none',
                background: extractedData.esForaneo ? 'white' : 'transparent',
                color: extractedData.esForaneo ? '#0b4ea6' : '#64748b',
                fontWeight: '800',
                fontSize: '13px',
                boxShadow: extractedData.esForaneo ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              🌎 Extranjero
            </button>
          </div>
        </section>

        {/* PASO 2: CARGA DE DOCUMENTOS */}
        {showStep2 && (
          <section className="fade-in" style={{ marginBottom: '40px' }}>
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
                Sube tus documentos y tus datos se rellenarán automáticamente
              </div>
            </div>

            {/* ── Instrucción de flujo ── */}
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
              Sube primero el <strong style={{ marginLeft: 4 }}>Acta de Nacimiento</strong>. El sistema detectará automáticamente si el jugador es mayor o menor de edad.
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '20px'
            }}>
              {/* ─── 1. ACTA DE NACIMIENTO (siempre visible) ─── */}
              {[{ key: 'actaNacimiento', title: 'Acta de Nacimiento' }].map(doc => (
                <div
                  key={doc.key}
                  className="document-card"
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '20px',
                    border: documents[doc.key] ? '2px solid #10b981' : '2px dashed #cbd5e1',
                    padding: '15px',
                    textAlign: 'center',
                    transition: 'all 0.3s',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{
                    height: '140px',
                    width: '100%',
                    backgroundColor: '#f8fafc',
                    borderRadius: '12px',
                    marginBottom: '10px',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #f1f5f9'
                  }}>
                    {previews[doc.key] ? (
                      <div className="preview-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
                        {/* MINIATURA */}
                        {(previews[doc.key].startsWith('blob:') && documents[doc.key]?.type === 'application/pdf') || previews[doc.key] === 'pdf_icon' ? (
                          <div style={{ color: '#ef4444', fontSize: '45px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                            <FaFilePdf />
                            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '800' }}>PDF</span>
                          </div>
                        ) : (
                          <img
                            src={previews[doc.key]}
                            alt="Preview"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        )}

                        {/* OVERLAY (Se controla via CSS en index.css o inline hover si fuera necesario) */}
                        <div className="overlay-actions" style={{
                          position: 'absolute',
                          top: 0, left: 0, right: 0, bottom: 0,
                          backgroundColor: 'rgba(30, 41, 59, 0.7)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '12px',
                          opacity: 0,
                          transition: 'opacity 0.2s ease',
                          backdropFilter: 'blur(2px)'
                        }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const isPdf = documents[doc.key]?.type === 'application/pdf';
                              setPreviewDoc({
                                open: true,
                                url: previews[doc.key],
                                type: isPdf ? 'pdf' : 'image',
                                title: doc.title
                              });
                            }}
                            className="btn-zoom"
                            style={{
                              width: '36px', height: '36px', borderRadius: '50%',
                              backgroundColor: '#fff', color: '#1e293b', border: 'none',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', cursor: 'pointer'
                            }}
                          >
                            <FaSearchPlus />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              document.getElementById(`file-${doc.key}`).click();
                            }}
                            className="btn-change"
                            style={{
                              width: '36px', height: '36px', borderRadius: '50%',
                              backgroundColor: '#0ea5e9', color: '#fff', border: 'none',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', cursor: 'pointer'
                            }}
                          >
                            <FaSyncAlt />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ESTADO VACÍO */
                      <div
                        onClick={() => document.getElementById(`file-${doc.key}`).click()}
                        style={{ textAlign: 'center', color: '#94a3b8', cursor: 'pointer' }}
                      >
                        <FaUpload style={{ fontSize: '28px', marginBottom: '6px' }} />
                        <p style={{ margin: 0, fontSize: '10px', fontWeight: '800' }}>SUBIR ARCHIVO</p>
                      </div>
                    )}
                  </div>

                  <h4 style={{ fontSize: '13px', fontWeight: '800', margin: '8px 0 5px 0', color: '#1e293b' }}>{doc.title}</h4>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    backgroundColor: documents[doc.key] ? '#dcfce7' : '#f1f5f9',
                    color: documents[doc.key] ? '#166534' : '#64748b',
                    fontSize: '10px',
                    fontWeight: '800'
                  }}>
                    {documents[doc.key] ? <><FaCheckCircle /> Listo</> : 'Pendiente'}
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

            {/* ── INE para mayores (aparece tras OCR del acta) ── */}
            {documents.actaNacimiento && extractedData.fechaNacimiento && !esMenorDeEdad && (
              <div
                className="fade-in"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginTop: '20px' }}
              >
                {[{ key: 'identificacion', title: 'Identificación (INE / Pasaporte)' }].map(doc => (
                  <div key={doc.key} className="document-card" style={{ backgroundColor: 'white', borderRadius: '20px', border: documents[doc.key] ? '2px solid #10b981' : '2px dashed #cbd5e1', padding: '15px', textAlign: 'center', transition: 'all 0.3s', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ height: '140px', width: '100%', backgroundColor: '#f8fafc', borderRadius: '12px', marginBottom: '10px', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #f1f5f9' }}>
                      {previews[doc.key] ? (
                        <div className="preview-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
                          {documents[doc.key]?.type === 'application/pdf'
                            ? <div style={{ color: '#ef4444', fontSize: '45px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}><FaFilePdf /><span style={{ fontSize: '10px', color: '#64748b', fontWeight: '800' }}>PDF</span></div>
                            : <img src={previews[doc.key]} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                          <div className="overlay-actions" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(30,41,59,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', opacity: 0, transition: 'opacity 0.2s ease', backdropFilter: 'blur(2px)' }}>
                            <button type="button" onClick={(e) => { e.stopPropagation(); setPreviewDoc({ open: true, url: previews[doc.key], type: documents[doc.key]?.type === 'application/pdf' ? 'pdf' : 'image', title: doc.title }); }} style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#fff', color: '#1e293b', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', cursor: 'pointer' }}><FaSearchPlus /></button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); document.getElementById(`file-${doc.key}`).click(); }} style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#0ea5e9', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', cursor: 'pointer' }}><FaSyncAlt /></button>
                          </div>
                        </div>
                      ) : (
                        <div onClick={() => document.getElementById(`file-${doc.key}`).click()} style={{ textAlign: 'center', color: '#94a3b8', cursor: 'pointer' }}>
                          <FaUpload style={{ fontSize: '28px', marginBottom: '6px' }} />
                          <p style={{ margin: 0, fontSize: '10px', fontWeight: '800' }}>SUBIR ARCHIVO</p>
                        </div>
                      )}
                    </div>
                    <h4 style={{ fontSize: '13px', fontWeight: '800', margin: '8px 0 5px 0', color: '#1e293b' }}>{doc.title}</h4>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', backgroundColor: documents[doc.key] ? '#dcfce7' : '#f1f5f9', color: documents[doc.key] ? '#166534' : '#64748b', fontSize: '10px', fontWeight: '800' }}>
                      {documents[doc.key] ? <><FaCheckCircle /> Listo</> : 'Pendiente'}
                    </div>
                    <input type="file" id={`file-${doc.key}`} style={{ display: 'none' }} accept="image/*,.pdf" onChange={(e) => handleFileUpload(doc.key, e.target.files[0])} />
                  </div>
                ))}
              </div>
            )}

            {/* ── Documento Estudiante para menores (aparece tras OCR del acta) ── */}
            {documents.actaNacimiento && extractedData.fechaNacimiento && esMenorDeEdad && (
              <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginTop: '20px' }}>
                <div className="document-card" style={{ borderRadius: '20px', border: documents.documentoEstudiante ? '2px solid #10b981' : '2px solid #fbbf24', background: documents.documentoEstudiante ? 'rgba(16,185,129,0.04)' : 'linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%)', padding: '15px', textAlign: 'center', transition: 'all 0.3s', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 10, right: 10, background: 'linear-gradient(90deg,#f59e0b,#fbbf24)', borderRadius: '12px', padding: '3px 9px', fontSize: '9px', fontWeight: '900', color: 'white', letterSpacing: '0.5px', zIndex: 1 }}>🧒 MENOR</div>
                  <div style={{ height: '140px', width: '100%', backgroundColor: '#fef9ec', borderRadius: '12px', marginBottom: '10px', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fde68a' }}>
                    {previews.documentoEstudiante ? (
                      <div className="preview-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
                        {documents.documentoEstudiante?.type === 'application/pdf'
                          ? <div style={{ color: '#ef4444', fontSize: '45px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}><FaFilePdf /><span style={{ fontSize: '10px', color: '#64748b', fontWeight: '800' }}>PDF</span></div>
                          : <img src={previews.documentoEstudiante} alt="Doc estudiante" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                        <div className="overlay-actions" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(30,41,59,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', opacity: 0, transition: 'opacity 0.2s ease' }}>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setPreviewDoc({ open: true, url: previews.documentoEstudiante, type: documents.documentoEstudiante?.type === 'application/pdf' ? 'pdf' : 'image', title: 'Documento de Estudiante' }); }} style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#fff', color: '#1e293b', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><FaSearchPlus /></button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); document.getElementById('file-documentoEstudiante').click(); }} style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#0ea5e9', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><FaSyncAlt /></button>
                        </div>
                      </div>
                    ) : (
                      <div onClick={() => document.getElementById('file-documentoEstudiante').click()} style={{ textAlign: 'center', color: '#f59e0b', cursor: 'pointer' }}>
                        <FaUpload style={{ fontSize: '28px', marginBottom: '6px' }} />
                        <p style={{ margin: 0, fontSize: '10px', fontWeight: '800', color: '#92400e' }}>SUBIR DOCUMENTO</p>
                      </div>
                    )}
                  </div>
                  <h4 style={{ fontSize: '13px', fontWeight: '800', margin: '8px 0 4px 0', color: '#78350f' }}>Documento de Estudiante</h4>
                  <p style={{ margin: '0 0 6px', fontSize: '10px', color: '#92400e' }}>Credencial escolar, certificado o carta de residencia</p>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', backgroundColor: documents.documentoEstudiante ? '#dcfce7' : '#fef3c7', color: documents.documentoEstudiante ? '#166534' : '#92400e', fontSize: '10px', fontWeight: '800' }}>
                    {documents.documentoEstudiante ? <><FaCheckCircle /> Listo</> : '⏳ Pendiente'}
                  </div>
                  <input type="file" id="file-documentoEstudiante" style={{ display: 'none' }} accept="image/*,.pdf" onChange={(e) => handleFileUpload('documentoEstudiante', e.target.files[0])} />
                </div>
              </div>
            )}

            {/* ── FOTOGRAFÍA (aparece tras OCR del acta) ── */}
            {documents.actaNacimiento && extractedData.fechaNacimiento && (
              <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginTop: '20px' }}>
                {[{ key: 'fotografia', title: 'Fotografía del Jugador' }].map(doc => (
                  <div key={doc.key} className="document-card" style={{ backgroundColor: 'white', borderRadius: '20px', border: documents[doc.key] ? '2px solid #10b981' : '2px dashed #cbd5e1', padding: '15px', textAlign: 'center', transition: 'all 0.3s', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ height: '140px', width: '100%', backgroundColor: '#f8fafc', borderRadius: '12px', marginBottom: '10px', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #f1f5f9' }}>
                      {previews[doc.key] ? (
                        <div className="preview-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
                          <img src={previews[doc.key]} alt="Preview foto" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          <div className="overlay-actions" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(30,41,59,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', opacity: 0, transition: 'opacity 0.2s ease', backdropFilter: 'blur(2px)' }}>
                            <button type="button" onClick={(e) => { e.stopPropagation(); setPreviewDoc({ open: true, url: previews[doc.key], type: 'image', title: doc.title }); }} style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#fff', color: '#1e293b', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', cursor: 'pointer' }}><FaSearchPlus /></button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); document.getElementById(`file-${doc.key}`).click(); }} style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#0ea5e9', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', cursor: 'pointer' }}><FaSyncAlt /></button>
                          </div>
                        </div>
                      ) : (
                        <div onClick={() => document.getElementById(`file-${doc.key}`).click()} style={{ textAlign: 'center', color: '#94a3b8', cursor: 'pointer' }}>
                          <FaUpload style={{ fontSize: '28px', marginBottom: '6px' }} />
                          <p style={{ margin: 0, fontSize: '10px', fontWeight: '800' }}>SUBIR ARCHIVO</p>
                        </div>
                      )}
                    </div>
                    <h4 style={{ fontSize: '13px', fontWeight: '800', margin: '8px 0 5px 0', color: '#1e293b' }}>{doc.title}</h4>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', backgroundColor: documents[doc.key] ? '#dcfce7' : '#f1f5f9', color: documents[doc.key] ? '#166534' : '#64748b', fontSize: '10px', fontWeight: '800' }}>
                      {documents[doc.key] ? <><FaCheckCircle /> Listo</> : 'Pendiente'}
                    </div>
                    <input type="file" id={`file-${doc.key}`} style={{ display: 'none' }} accept="image/*,.pdf" onChange={(e) => handleFileUpload(doc.key, e.target.files[0])} />
                  </div>
                ))}
              </div>
            )}

            {/* Hint mientras el OCR analiza el acta */}
            {documents.actaNacimiento && !extractedData.fechaNacimiento && (
              <div className="fade-in" style={{ marginTop: '16px', padding: '12px 18px', background: '#fffbeb', border: '1px dashed #fbbf24', borderRadius: '10px', fontSize: '12px', color: '#92400e', fontWeight: '600' }}>
                ⏳ Analizando el Acta de Nacimiento... Los documentos adicionales aparecerán en breve.
              </div>
            )}

            {!isStep2Done && (
              <div style={{ textAlign: 'center', marginTop: '25px' }}>
                <button
                  onClick={() => setFillManually(true)}
                  style={{ fontSize: '13px', color: '#0b4ea6', fontWeight: '700', background: 'none', border: 'none', textDecoration: 'underline' }}
                >
                  Omitir carga y llenar datos manualmente
                </button>
              </div>
            )}
          </section>
        )}

        {/* PASO 3: INFORMACIÓN DEL JUGADOR */}
        {showStep3 && (
          <section className="fade-in" style={{ marginBottom: '40px' }}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <StepBadge number="3" isActive={true} isDone={false} />
                <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', margin: 0 }}>Formulario de afiliación completo</h3>
              </div>
            </div>

            {/* AVISO DE DISCREPANCIA OCR */}
            {ocrDataOriginal && (
              <div className="fade-in" style={{
                marginBottom: '20px',
                padding: '16px',
                borderRadius: '12px',
                background: (
                  extractedData.nombreJugador?.toUpperCase() !== ocrDataOriginal.nombreJugador?.toUpperCase() ||
                  extractedData.curp?.toUpperCase() !== ocrDataOriginal.curp?.toUpperCase()
                ) ? '#fff7ed' : '#f0fdf4',
                border: (
                  extractedData.nombreJugador?.toUpperCase() !== ocrDataOriginal.nombreJugador?.toUpperCase() ||
                  extractedData.curp?.toUpperCase() !== ocrDataOriginal.curp?.toUpperCase()
                ) ? '1px solid #ffedd5' : '1px solid #dcfce7',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{ fontSize: '20px' }}>
                  {(extractedData.nombreJugador?.toUpperCase() !== ocrDataOriginal.nombreJugador?.toUpperCase() ||
                    extractedData.curp?.toUpperCase() !== ocrDataOriginal.curp?.toUpperCase()) ? '⚠️' : '✅'}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#9a3412' }}>
                    {(extractedData.nombreJugador?.toUpperCase() !== ocrDataOriginal.nombreJugador?.toUpperCase() ||
                      extractedData.curp?.toUpperCase() !== ocrDataOriginal.curp?.toUpperCase()) ?
                      'Discrepancia detectada' : 'Datos validados con OCR'}
                  </h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#c2410c' }}>
                    {(extractedData.nombreJugador?.toUpperCase() !== ocrDataOriginal.nombreJugador?.toUpperCase() ||
                      extractedData.curp?.toUpperCase() !== ocrDataOriginal.curp?.toUpperCase()) ?
                      'La información ingresada difiere de la detectada en el documento subido. Por favor, verifica tu captura.' :
                      'La información coincide correctamente con la extracción inteligente de tus documentos.'}
                  </p>
                </div>
              </div>
            )}

            {/* FORMULARIO DE AFILIACIÓN */}
            <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginBottom: '30px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Nombre(s) <span className="required-star">*</span></label>
                  <input type="text" value={extractedData.nombreJugador} onChange={e => setExtractedData({...extractedData, nombreJugador: e.target.value})} placeholder="Ej. Juan" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Ap. Paterno <span className="required-star">*</span></label>
                  <input type="text" value={extractedData.apellidoPaterno} onChange={e => setExtractedData({...extractedData, apellidoPaterno: e.target.value})} placeholder="Ej. Pérez" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Ap. Materno <span className="required-star">*</span></label>
                  <input type="text" value={extractedData.apellidoMaterno} onChange={e => setExtractedData({...extractedData, apellidoMaterno: e.target.value})} placeholder="Ej. Gómez" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '25px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}># Camiseta</label>
                  <input type="number" value={extractedData.numCamiseta} onChange={e => setExtractedData({...extractedData, numCamiseta: e.target.value})} placeholder="Ej. 10" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Posición en el campo</label>
                  <select value={extractedData.posicion} onChange={e => setExtractedData({...extractedData, posicion: parseInt(e.target.value) || ''})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: 'white' }}>
                    <option value="">Posición...</option>
                    {(catalogs?.roles_equipo || []).map(r => (
                      <option key={r.id} value={r.id}>{r.nombre}</option>
                    ))}
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
                      if (char === 'M') sId = 2; // Femenino
                      else if (char === 'H') sId = 1; // Masculino
                    }
                    setExtractedData({...extractedData, curp: val, genero: sId});
                  }} placeholder="ABCD..." maxLength="18" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Fecha Nac. <span className="required-star">*</span></label>
                  <input 
                    type="date" 
                    value={extractedData.fechaNacimiento || ''} 
                    min={minDateStr}
                    max={today}
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
                  <select value={extractedData.genero || ""} onChange={e => setExtractedData({...extractedData, genero: parseInt(e.target.value) || ''})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: 'white' }}>
                    <option value="">Seleccione...</option>
                    <option value={1}>MASCULINO</option>
                    <option value={2}>FEMENINO</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '25px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Correo electrónico <span className="required-star">*</span></label>
                  <input type="email" value={extractedData.correo} onChange={e => setExtractedData({...extractedData, correo: e.target.value})} placeholder="correo@ejemplo.com" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}># de Teléfono</label>
                  <input type="tel" value={extractedData.telefono} onChange={e => setExtractedData({...extractedData, telefono: e.target.value})} placeholder="10 dígitos numericos" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
              </div>

              {/* SECCIÓN MODO PREMIUM: ANTECEDENTES INTERNACIONALES */}
              <div style={{ backgroundColor: '#fff7ed', border: '1px solid #ffedd5', padding: '30px', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', marginTop: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px', borderBottom: '1px solid #ffedd5', paddingBottom: '20px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                    <FaGlobeAmericas />
                  </div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#9a3412' }}>Antecedentes internacionales</h4>
                </div>

                {extractedData.esForaneo ? (
                  <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                      <EntradaFormulario
                        etiqueta="Nacionalidad del jugador"
                        valor={extractedData.nacionalidadJugador}
                        alCambiar={e => setExtractedData({...extractedData, nacionalidadJugador: e.target.value})}
                      />
                      <EntradaFormulario
                        etiqueta="País de residencia actual"
                        valor={extractedData.paisResidencia}
                        alCambiar={e => setExtractedData({...extractedData, paisResidencia: e.target.value})}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', alignItems: 'end' }}>
                      <EntradaSeleccion
                        etiqueta="¿El jugador ha vivido en el extranjero?"
                        valor={extractedData.haVividoExtranjero ? '1' : '0'}
                        alCambiar={e => setExtractedData({...extractedData, haVividoExtranjero: e.target.value === '1'})}
                        opciones={[{id: '0', nombre: 'No'}, {id: '1', nombre: 'Sí'}]}
                        obligatorio={true}
                      />
                      {extractedData.haVividoExtranjero && (
                        <EntradaFormulario
                          etiqueta="¿En qué país?"
                          valor={extractedData.dondeVividoExtranjero}
                          alCambiar={e => setExtractedData({...extractedData, dondeVividoExtranjero: e.target.value})}
                          obligatorio={true}
                        />
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                      <EntradaFormulario
                        etiqueta="Nacionalidad del padre"
                        valor={extractedData.nacionalidadPadre}
                        alCambiar={e => setExtractedData({...extractedData, nacionalidadPadre: e.target.value})}
                      />
                      <EntradaFormulario
                        etiqueta="Nacionalidad de la madre"
                        valor={extractedData.nacionalidadMadre}
                        alCambiar={e => setExtractedData({...extractedData, nacionalidadMadre: e.target.value})}
                      />
                    </div>

                    <AreaTexto
                      etiqueta="Registro por Asociación Nacional Extranjera"
                      valor={extractedData.registroAsociacionExtranjera}
                      alCambiar={e => setExtractedData({...extractedData, registroAsociacionExtranjera: e.target.value})}
                      filas={2}
                      obligatorio={true}
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                      <EntradaFormulario etiqueta="Nac. Abuelo Paterno" valor={extractedData.nacAbueloPaterno} alCambiar={e => setExtractedData({...extractedData, nacAbueloPaterno: e.target.value})} />
                      <EntradaFormulario etiqueta="Nac. Abuela Paterna" valor={extractedData.nacAbuelaPaterna} alCambiar={e => setExtractedData({...extractedData, nacAbuelaPaterna: e.target.value})} />
                      <EntradaFormulario etiqueta="Nac. Abuelo Materno" valor={extractedData.nacAbueloMaterno} alCambiar={e => setExtractedData({...extractedData, nacAbueloMaterno: e.target.value})} />
                      <EntradaFormulario etiqueta="Nac. Abuela Materna" valor={extractedData.nacAbuelaMaterna} alCambiar={e => setExtractedData({...extractedData, nacAbuelaMaterna: e.target.value})} />
                    </div>

                    <AreaTexto
                      etiqueta="¿Ha jugado en un Club extranjero?"
                      valor={extractedData.juegoClubExtranjero}
                      alCambiar={e => setExtractedData({...extractedData, juegoClubExtranjero: e.target.value})}
                      filas={3}
                      obligatorio={true}
                    />
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#9a3412', fontStyle: 'italic' }}>
                      Si el jugador es foráneo, habilita el interruptor para completar los antecedentes internacionales obligatorios.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ACCIONES FINALES */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '40px' }}>
              <BotonSecundario
                etiqueta="Cancelar y volver"
                alHacerClick={() => navigate('/admin/jugadores')}
                estilo={{ minWidth: '200px' }}
              />
              <BotonPrimario
                etiqueta={uploading ? "Procesando..." : "Autorizar e Inscribir Jugador"}
                icono={<FaSave />}
                alHacerClick={handleGuardar}
                deshabilitado={uploading}
                estilo={{ minWidth: '300px' }}
              />
            </div>
          </section>
        )}
      </div>

      {/* MODAL DE PREVISUALIZACIÓN DE DOCUMENTOS (ZOOM) */}
      <Modal
        estaAbierto={previewDoc.open}
        titulo={previewDoc.title}
        alCerrar={() => setPreviewDoc({ ...previewDoc, open: false })}
        tamanio={previewDoc.type === 'pdf' ? 'grande' : 'medio'}
        pie={<BotonSecundario etiqueta="Cerrar" alHacerClick={() => setPreviewDoc({ ...previewDoc, open: false })} />}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '300px',
          backgroundColor: '#f1f5f9',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          {previewDoc.type === 'pdf' ? (
            <iframe
              src={previewDoc.url}
              style={{ width: '100%', height: '70vh', border: 'none' }}
              title="Visor de PDF"
            />
          ) : (
            <img
              src={previewDoc.url}
              alt="Preview Grande"
              style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
            />
          )}
        </div>
      </Modal>

      {/* MODAL DE FINALIZACIÓN Y CARGA DE FORMATO */}
      <Modal
        estaAbierto={showFinishModal}
        titulo="Finalizar Inscripción de Jugador"
        alCerrar={() => setShowFinishModal(false)}
        tamanio="medio"
        pie={
          <>
            <BotonSecundario etiqueta="Cancelar" alHacerClick={() => setShowFinishModal(false)} />
            <BotonPrimario
              etiqueta={uploading ? "Enviando..." : "Finalizar Inscripción"}
              icono={<FaCheckCircle />}
              alHacerClick={handleFinalizarInscripcion}
              deshabilitado={uploading || !signedForm}
            />
          </>
        }
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '25px',
            color: '#0369a1',
            fontSize: '14px',
            lineHeight: '1.6'
          }}>
            <p style={{ margin: 0, fontWeight: '700', marginBottom: '10px' }}>
              ¡Formato descargado con éxito!
            </p>
            <p style={{ margin: 0 }}>
              Hemos descargado automáticamente el formato de afiliación pre-llenado con la información proporcionada.
              <strong> A continuación debe subir el formato ya firmado</strong> para finalizar con la inscripción de este nuevo jugador al equipo.
            </p>
          </div>

          <div
            onClick={() => document.getElementById('final-signed-form').click()}
            style={{
              border: signedForm ? '2px solid #10b981' : '2px dashed #0ea5e9',
              borderRadius: '20px',
              padding: '40px 20px',
              backgroundColor: signedForm ? '#f0fdf4' : '#f8fafc',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            {signedForm ? (
              <div style={{ color: '#10b981' }}>
                <FaFilePdf style={{ fontSize: '50px', marginBottom: '15px' }} />
                <p style={{ margin: 0, fontWeight: '700' }}>{signedForm.name}</p>
                <p style={{ margin: '5px 0 0 0', fontSize: '12px' }}>Archivo listo para enviar</p>
              </div>
            ) : (
              <div style={{ color: '#0ea5e9' }}>
                <FaUpload style={{ fontSize: '50px', marginBottom: '15px' }} />
                <p style={{ margin: 0, fontWeight: '700' }}>Haga clic para subir el formato firmado</p>
                <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#64748b' }}>Solo se aceptan archivos PDF</p>
              </div>
            )}
            <input
              type="file"
              id="final-signed-form"
              style={{ display: 'none' }}
              accept=".pdf"
              onChange={(e) => {
                if (e.target.files[0]) {
                  setSignedForm(e.target.files[0]);
                }
              }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
