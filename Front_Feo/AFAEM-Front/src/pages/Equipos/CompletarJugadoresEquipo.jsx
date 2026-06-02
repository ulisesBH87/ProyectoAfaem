import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

export default function CompletarJugadoresEquipo() {
  const { equipoId } = useParams();
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
  const [equipo, setEquipo] = useState(null);
  const [slotsData, setSlotsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSeguroId, setSelectedSeguroId] = useState('');
  const [fillManually, setFillManually] = useState(false);

  const [documents, setDocuments] = useState({
    acta: null,
    ine: null,
    ineTutor: null,
    identificacionMenor: null,
    foto: null
  });

  // Previsualizaciones (URLs locales o base64)
  const [previews, setPreviews] = useState({
    acta: null,
    ine: null,
    ineTutor: null,
    identificacionMenor: null,
    foto: null
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

  // Datos extraídos o capturados del jugador
  const [extractedData, setExtractedData] = useState({
    nombreJugador: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    curp: '',
    genero: '1', // Default MASCULINO (SexoId = 1)
    fechaNacimiento: '',
    lugarNacimiento: 'MÉXICO',
    correo: '',
    telefono: '',
    posicion: '',
    numCamiseta: '',
    esForaneo: false,
    nacionalidadJugador: '',
    paisResidencia: '',
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

  // Detección de minoría de edad
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
  const [failedPhoto, setFailedPhoto] = useState(null);

  const [showFinishModal, setShowFinishModal] = useState(false);
  const [signedForm, setSignedForm] = useState(null);
  const [previewDoc, setPreviewDoc] = useState({ open: false, url: '', type: '', title: '' });

  // DETERMINACIÓN DE PASOS
  const isStep1Done = !!selectedSeguroId;
  const isStep2Done = Object.values(documents).some(d => d !== null);
  const showStep2 = isStep1Done;
  const showStep3 = isStep2Done || fillManually;

  // Cargar catálogos, detalles de equipo y disponibilidad de slots
  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);

        // 1. Obtener catálogos
        const catalogsData = await teamsService.getCatalogs();
        setCatalogs(catalogsData);

        // 2. Obtener datos del equipo del directorio
        const equiposList = await adminService.getEquiposDirectorio();
        const targetTeam = equiposList.find(e => String(e.EquipoId) === String(equipoId));
        if (!targetTeam) {
          throw new Error('No se encontró el equipo en el directorio.');
        }
        setEquipo(targetTeam);

        // 3. Verificar slots disponibles
        const slotsResponse = await teamsService.checkTeamSlots(equipoId);
        setSlotsData(slotsResponse);

        // Preseleccionar primer seguro disponible si existe
        if (slotsResponse?.seguros_disponibles?.length > 0) {
          setSelectedSeguroId(String(slotsResponse.seguros_disponibles[0].SeguroId));
        }

      } catch (error) {
        console.error("Error al iniciar datos:", error);
        Swal.fire('Error', error.message || 'No se pudo cargar la información del equipo.', 'error');
      } finally {
        setLoading(false);
        setLoadingCatalogs(false);
      }
    };
    initData();
  }, [equipoId]);

  // PROCESAR SUBIDA DE DOCUMENTOS Y OCR
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
    if (documentKey === 'foto') {
      Swal.fire({
        title: 'Validando Fotografía...',
        html: 'Verificando formato y calidad.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });
      try {
        const data = await validarFotografia(file);
        if (data.valido) {
          // Convertir base64 a URL y a File
          const imageUrl = `data:${data.tipo_imagen};base64,${data.imagen}`;
          const byteCharacters = atob(data.imagen);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const newFile = new File([byteArray], "foto_validada.jpg", {
            type: data.tipo_imagen
          });

          setDocuments(prev => ({ ...prev, foto: newFile }));
          setPreviews(prev => ({ ...prev, foto: imageUrl }));
          setFailedPhoto(null);

          Swal.fire({ title: '¡Fotografía Aceptada!', icon: 'success', timer: 1500, showConfirmButton: false });
        } else {
          setFailedPhoto(file);
          setPreviews(prev => ({ ...prev, foto: null }));
          setDocuments(prev => ({ ...prev, foto: null }));

          Swal.fire({
            title: 'Error en la fotografía',
            text: `${data.mensaje || 'La foto no cumple con los requisitos.'} ¿Deseas cargarla de todos modos?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, cargar igualmente',
            cancelButtonText: 'No, intentar de nuevo',
            confirmButtonColor: '#0b4ea6',
            cancelButtonColor: '#cbd5e1'
          }).then((result) => {
            if (result.isConfirmed) {
              const reader = new FileReader();
              reader.onloadend = () => {
                setPreviews(prev => ({ ...prev, foto: reader.result }));
              };
              reader.readAsDataURL(file);
              setDocuments(prev => ({ ...prev, foto: file }));
              setFailedPhoto(null);

              Swal.fire({
                title: 'Cargada',
                text: 'Se ha cargado la fotografía original.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
              });
            }
          });
        }
      } catch (err) {
        Swal.fire('Error de validación', err.message || 'No se pudo procesar la foto.', 'error');
      }
    }

    // PROCESAR OCR PARA ACTA O IDENTIFICACIÓN
    if (documentKey === 'acta' || documentKey === 'ine' || documentKey === 'ineTutor') {
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

          // Auto-detectar género por CURP
          let detectedGenero = extractedData.genero;
          if (curpEncontrada && curpEncontrada.length >= 11) {
            const char = curpEncontrada.charAt(10);
            if (char === 'M') detectedGenero = '2'; // Femenino
            else if (char === 'H') detectedGenero = '1'; // Masculino
          }

          const ocrResult = {
            nombreJugador: firstName || '',
            apellidoPaterno: lastNamePaterno || '',
            apellidoMaterno: lastNameMaterno || '',
            curp: curpEncontrada || '',
            fechaNacimiento: fechaNacEncontrada || '',
            lugarNacimiento: lugarNacEncontrado || 'MÉXICO',
            genero: detectedGenero
          };

          setOcrDataOriginal(ocrResult);
          setExtractedData(prev => ({ ...prev, ...ocrResult }));

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

  // BYPASS DE FOTOGRAFÍA MANUAL
  const forceLoadFailedPhoto = () => {
    if (!failedPhoto) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviews(prev => ({ ...prev, foto: reader.result }));
    };
    reader.readAsDataURL(failedPhoto);

    setDocuments(prev => ({ ...prev, foto: failedPhoto }));
    setFailedPhoto(null);

    Swal.fire({
      title: 'Fotografía Cargada',
      text: 'La fotografía se cargó sin validación.',
      icon: 'success',
      timer: 1500,
      showConfirmButton: false
    });
  };

  // AUXILIAR PARA ESCRITURA EN PDF
  const safeSetField = (form, fieldName, value, fontSize) => {
    if (!value) return;
    try {
      const field = form.getTextField(fieldName);
      if (field) {
        field.setText(value.toString().toUpperCase());
        if (fontSize) field.setFontSize(fontSize);
      }
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

      // Incrustar fotografía si existe
      if (documents.foto) {
        try {
          const photoBytes = await documents.foto.arrayBuffer();
          let photoImage;
          const nameLower = documents.foto.name.toLowerCase();
          if (nameLower.endsWith('.png')) photoImage = await pdfDoc.embedPng(photoBytes);
          else photoImage = await pdfDoc.embedJpg(photoBytes);

          firstPage.drawImage(photoImage, {
            x: 479, y: 676, width: 76, height: 90,
          });
        } catch (photoErr) {
          console.warn("Error al incrustar foto en PDF:", photoErr);
        }
      }

      // Rellenar campos básicos
      safeSetField(form, 'Nombres', extractedData.nombreJugador);
      safeSetField(form, 'Apellido Paterno', extractedData.apellidoPaterno);
      safeSetField(form, 'Apellido Materno', extractedData.apellidoMaterno);
      safeSetField(form, 'CURP o Clave Única de Registro de Población', extractedData.curp);
      safeSetField(form, 'Fecha de Nacimiento', extractedData.fechaNacimiento);
      safeSetField(form, 'Sexo', extractedData.genero === '1' ? 'MASCULINO' : 'FEMENINO');
      safeSetField(form, 'Lugar de Nacimiento', extractedData.lugarNacimiento);

      // Datos de afiliado
      const correoCJE = extractedData.correo || '';
      const correoCJEFs = correoCJE.length > 35 ? 6 : correoCJE.length > 25 ? 7 : correoCJE.length > 18 ? 8 : 10;
      safeSetField(form, 'Correo electrónico', correoCJE, correoCJEFs);
      safeSetField(form, 'Teléfono', extractedData.telefono);
      safeSetField(form, 'Asociación', 'AFAEM');
      safeSetField(form, 'fill_24', 'AFAEM');

      // Tipo de Afiliación (Tipo y fill_20) → nombre del seguro seleccionado
      const seguroSel = catalogs?.seguros?.find(s => String(s.id) === String(selectedSeguroId));
      if (seguroSel?.nombre) {
        try { form.getTextField('Tipo')?.setText(seguroSel.nombre.toUpperCase()); } catch (_) { }
        try { form.getTextField('fill_20')?.setText(seguroSel.nombre.toUpperCase()); } catch (_) { }
      }

      safeSetField(form, 'Liga', (equipo?.Liga || '').split('(')[0].trim());
      safeSetField(form, 'Equipo', equipo?.NombreEquipo || '');
      safeSetField(form, 'Categoría', equipo?.Categoria || '');

      // Traducir el ID de posición a su nombre en texto
      const posObj = catalogs?.roles_equipo?.find(r => String(r.id) === String(extractedData.posicion));
      safeSetField(form, 'Posición', posObj ? posObj.nombre : 'JUGADOR');
      safeSetField(form, 'Camiseta', extractedData.numCamiseta);

      // Antecedentes internacionales si es foráneo
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
      } else {
        // Jugador mexicano: rellenar todos los campos con valores nacionales por defecto
        safeSetField(form, 'Nacionalidades del jugador', 'MEXICANA');
        safeSetField(form, 'País de residencia actual', 'MÉXICO');
        safeSetField(form, 'El jugador ha vivido en el extranjero En que país', 'NO');
        safeSetField(form, 'Nacionalidades del padre', 'MEXICANA');
        safeSetField(form, 'Nacionalidades de la madre', 'MEXICANA');
        safeSetField(form, 'Nacionalidades del abuelo paterno', 'MEXICANA');
        safeSetField(form, 'Nacionalidades de la abuela paterna', 'MEXICANA');
        safeSetField(form, 'Nacionalidades del abuelo materno', 'MEXICANA');
        safeSetField(form, 'Nacionalidades de la abuela materna', 'MEXICANA');
        safeSetField(form, 'El jugador ha sido registrado por la Asociación Nacional de Fútbol', 'NO');
        safeSetField(form, 'El jugador ha jugado en un Club extranjero y participado en', 'NO');
      }

      // Fecha de descarga
      const hoy = new Date();
      const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
      const dia = String(hoy.getDate()).padStart(2, '0');
      const mes = meses[hoy.getMonth()];
      const anio = String(hoy.getFullYear()).slice(-2);

      safeSetField(form, 'A', dia);
      safeSetField(form, 'de', mes);
      safeSetField(form, 'del 20', anio);

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
      return true;
    } catch (err) {
      console.error("Error al generar PDF:", err);
      Swal.fire('Error', 'No se pudo generar el PDF prellenado: ' + err.message, 'error');
      return false;
    }
  };

  // PRE-GUARDAR Y DESCARGAR FORMATO
  const handleGuardar = async (e) => {
    if (e) e.preventDefault();

    if (!selectedSeguroId) {
      Swal.fire('Atención', 'Debe seleccionar un tipo de seguro/slot disponible.', 'warning');
      return;
    }

    if (!extractedData.nombreJugador || !extractedData.apellidoPaterno || !extractedData.curp) {
      Swal.fire('Atención', 'Los campos Nombres, Apellido Paterno y CURP son obligatorios.', 'warning');
      return;
    }

    if (extractedData.curp.length !== 18) {
      Swal.fire('Atención', 'El campo CURP debe tener exactamente 18 caracteres.', 'warning');
      return;
    }

    if (!extractedData.fechaNacimiento || !extractedData.correo) {
      Swal.fire('Atención', 'Los campos Fecha de Nacimiento y Correo electrónico son obligatorios.', 'warning');
      return;
    }

    // Validar documentos requeridos cargados
    if (!documents.acta) {
      Swal.fire('Atención', 'El Acta de Nacimiento es obligatoria.', 'warning');
      return;
    }
    if (esMenorDeEdad) {
      if (!documents.ineTutor) {
        Swal.fire('Atención', 'El INE del Padre o Tutor es obligatorio para menores de edad.', 'warning');
        return;
      }
      if (!documents.identificacionMenor) {
        Swal.fire('Atención', 'La Identificación del Menor es obligatoria para menores de edad.', 'warning');
        return;
      }
    } else {
      if (!documents.ine) {
        Swal.fire('Atención', 'La Identificación Oficial (INE) es obligatoria.', 'warning');
        return;
      }
    }
    if (!documents.foto) {
      Swal.fire('Atención', 'La Fotografía del Jugador es obligatoria.', 'warning');
      return;
    }

    // Validar campos de extranjero si aplica
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

    // Abrir modal para subir el formato (opcionalmente)
    setShowFinishModal(true);
  };

  // ENVÍO FINAL A BACKEND
  const handleFinalizarInscripcion = async () => {

    setSubmitting(true);
    Swal.fire({
      title: 'Registrando Jugador',
      text: 'Consumiendo slot y subiendo documentos al servidor...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const formData = new FormData();
      formData.append('equipo_id', parseInt(equipoId, 10));
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
      formData.append('seguro_id', parseInt(selectedSeguroId, 10));

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
        formData.append('donde_vivido', extractedData.dondeVividoExtranjero || '');
      }

      // Archivos obligatorios
      if (documents.acta) formData.append('acta', documents.acta);
      if (documents.foto) formData.append('foto', documents.foto);

      // Archivos condicionales por edad
      if (esMenorDeEdad) {
        if (documents.ineTutor) formData.append('ineTutor', documents.ineTutor);
        if (documents.identificacionMenor) formData.append('identificacionMenor', documents.identificacionMenor);
      } else {
        if (documents.ine) formData.append('ine', documents.ine);
      }

      // El formato de afiliación firmado (opcional)
      if (signedForm) formData.append('formato_firmado', signedForm);

      await adminService.agregarJugadorEquipoExistente(formData);

      setShowFinishModal(false);
      Swal.fire({
        icon: 'success',
        title: 'Jugador Inscrito Correctamente',
        text: 'El slot se ha completado y los documentos se guardaron en el servidor.'
      }).then(() => {
        navigate('/admin/equipos');
      });
    } catch (err) {
      console.error("Error al registrar jugador en equipo existente:", err);
      Swal.fire('Error', err.response?.data?.detail || err.message || 'Error interno del servidor', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Documentos requeridos para renderizar dinámicamente
  const documentCards = [
    { key: 'acta', title: 'Acta de Nacimiento', subtitle: 'Requerido para validación y auto-llenado' },
    ...(esMenorDeEdad
      ? [
        { key: 'ineTutor', title: 'INE de Padre o Tutor', subtitle: 'Identificación oficial del tutor' },
        { key: 'identificacionMenor', title: 'Identificación de Menor', subtitle: 'Credencial escolar o certificado' }
      ]
      : [
        { key: 'ine', title: 'Identificación Oficial (INE)', subtitle: 'INE, Pasaporte o Cédula' }
      ]),
    { key: 'foto', title: 'Fotografía del Jugador', subtitle: 'Fotografía infantil formal' }
  ];

  if (loading) {
    return (
      <div className="dashboard-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Loader text="Cargando información del equipo y slots disponibles..." />
      </div>
    );
  }

  // Si no hay slots en absoluto
  const sinSlots = slotsData?.slots_disponibles === 0 || slotsData?.hay_slots === false;

  return (
    <div className="dashboard-content">
      <style>{hoverStyles}</style>

      {/* HEADER */}
      <div style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
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
                if (result.isConfirmed) navigate('/admin/equipos');
              });
            } else {
              navigate('/admin/equipos');
            }
          }}
          className="btn btn-outline-secondary"
          style={{ padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', background: 'none', border: '1px solid #cbd5e1', cursor: 'pointer' }}
        >
          <FaArrowLeft />
        </button>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Completar Jugadores de Equipo</h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Registrar jugadores en slots pagados restantes.</p>
        </div>
      </div>

      {/* DETALLES DEL EQUIPO */}
      {equipo && (
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
            <h1 style={{ fontSize: '26px', fontWeight: '900', margin: '4px 0 8px 0', letterSpacing: '-0.5px' }}>🛡️ {equipo.NombreEquipo}</h1>
            <div style={{ display: 'flex', gap: '15px', fontSize: '13px', color: '#94a3b8', flexWrap: 'wrap' }}>
              <span><strong>Liga:</strong> {equipo.Liga || 'N/A'}</span>
              <span>•</span>
              <span><strong>Categoría:</strong> {equipo.Categoria || 'LIBRE'} ({equipo.Rama || 'N/A'})</span>
              <span>•</span>
              <span><strong>Presidente:</strong> {equipo.PresidenteNombreCompleto || 'Sin Presidente'}</span>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px 20px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', fontWeight: '600' }}>Slots Disponibles</span>
            <span style={{ fontSize: '24px', fontWeight: '950', color: sinSlots ? '#ef4444' : '#10b981' }}>
              {slotsData?.slots_disponibles || 0} slots
            </span>
          </div>
        </div>
      )}

      {/* BLOQUEO SI NO HAY SLOTS */}
      {sinSlots ? (
        <div className="premium-card fade-in" style={{
          maxWidth: '1000px',
          margin: '0 auto',
          background: 'white',
          borderRadius: '24px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
          border: '1px solid #fee2e2'
        }}>
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>⚠️</div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#ef4444', marginBottom: '10px' }}>Sin Slots / Seguros Disponibles</h2>
          <p style={{ color: '#64748b', maxWidth: '600px', margin: '0 auto 25px auto', lineHeight: '1.6' }}>
            Este equipo ya ha completado todos los seguros y slots contratados por el presidente.
            No es posible agregar más jugadores hasta que el presidente adquiera nuevos slots de registro.
          </p>
          <BotonSecundario
            etiqueta="Volver al Directorio de Equipos"
            alHacerClick={() => navigate('/admin/equipos')}
          />
        </div>
      ) : (
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
              <span className="required-star">*</span> Indica que el campo es obligatorio.
            </p>
          </div>

          {/* PASO 1: SELECCION DE SEGURO / SLOT A CONSUMIR */}
          <section style={{ marginBottom: '45px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '24px' }}>
              <StepBadge number="1" isActive={!isStep1Done} isDone={isStep1Done} />
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Seguro pagado por asignar.</h3>
            </div>

            <div style={{ animation: 'slideUp 0.4s ease', maxWidth: '800px', margin: '0 auto' }}>
              <div className="card" style={{ padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <label className="form-label" style={{ fontWeight: '700', fontSize: '14px', marginBottom: '12px', display: 'block' }}>
                  Seleccione el seguro comprado que desea para esta inscripción: <span className="required-star">*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                  {slotsData?.seguros_disponibles?.map((seg) => {
                    const matchedSeguro = catalogs?.seguros?.find(s => s.id === seg.SeguroId);
                    const isSelected = String(selectedSeguroId) === String(seg.SeguroId);
                    return (
                      <div
                        key={`seguro-card-${seg.SeguroId}`}
                        onClick={() => setSelectedSeguroId(String(seg.SeguroId))}
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
                        <span style={{ fontSize: '14px', fontWeight: '800', color: isSelected ? '#0b4ea6' : '#1e293b' }}>
                          🛡️ {matchedSeguro ? matchedSeguro.nombre : `Seguro ID ${seg.SeguroId}`}
                        </span>
                        {matchedSeguro?.precio !== undefined && (
                          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                            Precio: ${matchedSeguro.precio} MXN
                          </span>
                        )}
                        <div style={{ marginTop: '5px', display: 'inline-flex', alignSelf: 'start', padding: '2px 8px', borderRadius: '20px', background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: '800' }}>
                          {seg.Cantidad} disponibles
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* PASO 2: CARGA DE DOCUMENTOS */}
          {showStep2 && (
            <section className="fade-in" style={{ marginBottom: '45px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                <StepBadge number="2" isActive={!isStep2Done} isDone={isStep2Done} />
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Carga de Documentación</h3>
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
                Recomendamos subir primero el<strong style={{ marginLeft: 4 }}>Acta de Nacimiento / INE</strong>el sistema detectará la minoría de edad y ajustará los requisitos.
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
                      padding: '15px',
                      textAlign: 'center',
                      transition: 'all 0.3s',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Indicador de Menor para tutor/credencial */}
                    {esMenorDeEdad && (doc.key === 'ineTutor' || doc.key === 'identificacionMenor') && (
                      <div style={{ position: 'absolute', top: 10, right: 10, background: 'linear-gradient(90deg,#f59e0b,#fbbf24)', borderRadius: '12px', padding: '3px 9px', fontSize: '9px', fontWeight: '950', color: 'white', letterSpacing: '0.5px', zIndex: 1 }}>🧒 MENOR</div>
                    )}

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
                    }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleFileUpload(doc.key, e.dataTransfer.files[0]);
                      }}
                    >
                      {previews[doc.key] ? (
                        <div className="preview-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
                          {documents[doc.key]?.type === 'application/pdf' ? (
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

                          {/* OVERLAY ACTIONS */}
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
                    <p style={{ margin: '0 0 6px', fontSize: '10px', color: '#64748b', lineHeight: 1.4 }}>{doc.subtitle}</p>
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

                    {/* Botón de validación fallida y bypass para fotografía */}
                    {doc.key === 'foto' && !documents.foto && failedPhoto && (
                      <div style={{ marginTop: '8px' }}>
                        <button
                          type="button"
                          onClick={forceLoadFailedPhoto}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            backgroundColor: '#f59e0b',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={e => e.target.style.backgroundColor = '#d97706'}
                          onMouseLeave={e => e.target.style.backgroundColor = '#f59e0b'}
                        >
                          ⚠️ Cargar igualmente
                        </button>
                      </div>
                    )}

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

              {/* Loader temporal OCR */}
              {documents.acta && !extractedData.fechaNacimiento && (
                <div className="fade-in" style={{ marginTop: '16px', padding: '12px 18px', background: '#fffbeb', border: '1px dashed #fbbf24', borderRadius: '10px', fontSize: '12px', color: '#92400e', fontWeight: '600' }}>
                  ⏳ Analizando el Acta de Nacimiento vía OCR... Los documentos adicionales y campos se rellenarán automáticamente en breve.
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

          {/* PASO 3: FORMULARIO DE INFORMACIÓN DEL JUGADOR */}
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

              {/* CAMPOS DEL FORMULARIO */}
              <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginBottom: '30px' }}>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Nombre(s) <span className="required-star">*</span></label>
                    <input type="text" value={extractedData.nombreJugador} onChange={e => setExtractedData({ ...extractedData, nombreJugador: e.target.value })} placeholder="Ej. Juan" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Ap. Paterno <span className="required-star">*</span></label>
                    <input type="text" value={extractedData.apellidoPaterno} onChange={e => setExtractedData({ ...extractedData, apellidoPaterno: e.target.value })} placeholder="Ej. Pérez" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Ap. Materno</label>
                    <input type="text" value={extractedData.apellidoMaterno} onChange={e => setExtractedData({ ...extractedData, apellidoMaterno: e.target.value })} placeholder="Ej. Gómez" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '25px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}># Camiseta</label>
                    <input type="number" value={extractedData.numCamiseta} onChange={e => setExtractedData({ ...extractedData, numCamiseta: e.target.value })} placeholder="Ej. 10" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Posición en el campo</label>
                    <select value={extractedData.posicion} onChange={e => setExtractedData({ ...extractedData, posicion: parseInt(e.target.value) || '' })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: 'white' }}>
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
                        if (char === 'M') sId = '2'; // Femenino
                        else if (char === 'H') sId = '1'; // Masculino
                      }
                      setExtractedData({ ...extractedData, curp: val, genero: sId });
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
                      onChange={e => setExtractedData({ ...extractedData, fechaNacimiento: e.target.value })}
                      style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Lugar de Nacimiento <span className="required-star">*</span></label>
                    <input type="text" value={extractedData.lugarNacimiento || ''} onChange={e => setExtractedData({ ...extractedData, lugarNacimiento: e.target.value })} placeholder="Ej. Monterrey, NL" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Sexo <span className="required-star">*</span></label>
                    <select value={extractedData.genero || ""} onChange={e => setExtractedData({ ...extractedData, genero: e.target.value })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: 'white' }}>
                      <option value="">Seleccione...</option>
                      <option value="1">MASCULINO</option>
                      <option value="2">FEMENINO</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '25px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Correo electrónico <span className="required-star">*</span></label>
                    <input type="email" value={extractedData.correo} onChange={e => setExtractedData({ ...extractedData, correo: e.target.value })} placeholder="correo@ejemplo.com" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}># de Teléfono</label>
                    <input type="tel" value={extractedData.telefono} onChange={e => setExtractedData({ ...extractedData, telefono: e.target.value })} placeholder="10 dígitos numéricos" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                  </div>
                </div>

                {/* Selector de Nacionalidad */}
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
                      type="button"
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
                      type="button"
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

                {/* ANTECEDENTES INTERNACIONALES (FORÁNEO) */}
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
                          alCambiar={e => setExtractedData({ ...extractedData, nacionalidadJugador: e.target.value })}
                        />
                        <EntradaFormulario
                          etiqueta="País de residencia actual"
                          valor={extractedData.paisResidencia}
                          alCambiar={e => setExtractedData({ ...extractedData, paisResidencia: e.target.value })}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', alignItems: 'end' }}>
                        <EntradaSeleccion
                          etiqueta="¿El jugador ha vivido en el extranjero?"
                          valor={extractedData.haVividoExtranjero ? '1' : '0'}
                          alCambiar={e => setExtractedData({ ...extractedData, haVividoExtranjero: e.target.value === '1' })}
                          opciones={[{ valor: '0', etiqueta: 'No' }, { valor: '1', etiqueta: 'Sí' }]}
                          obligatorio={true}
                        />
                        {extractedData.haVividoExtranjero && (
                          <EntradaFormulario
                            etiqueta="¿En qué país?"
                            valor={extractedData.dondeVividoExtranjero}
                            alCambiar={e => setExtractedData({ ...extractedData, dondeVividoExtranjero: e.target.value })}
                            obligatorio={true}
                          />
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                        <EntradaFormulario
                          etiqueta="Nacionalidad del padre"
                          valor={extractedData.nacionalidadPadre}
                          alCambiar={e => setExtractedData({ ...extractedData, nacionalidadPadre: e.target.value })}
                        />
                        <EntradaFormulario
                          etiqueta="Nacionalidad de la madre"
                          valor={extractedData.nacionalidadMadre}
                          alCambiar={e => setExtractedData({ ...extractedData, nacionalidadMadre: e.target.value })}
                        />
                      </div>

                      <EntradaFormulario
                        etiqueta="El jugador ha sido registrado por la Asociación Nacional de Fútbol (en el extranjero) como jugador amateur o profesional, previo a su solitud de registro en la FMF (Si - No)"
                        valor={extractedData.registroAsociacionExtranjera}
                        alCambiar={e => setExtractedData({ ...extractedData, registroAsociacionExtranjera: e.target.value })}
                        filas={2}
                        obligatorio={true}
                      />

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                        <EntradaFormulario etiqueta="Nac. Abuelo Paterno" valor={extractedData.nacAbueloPaterno} alCambiar={e => setExtractedData({ ...extractedData, nacAbueloPaterno: e.target.value })} />
                        <EntradaFormulario etiqueta="Nac. Abuela Paterna" valor={extractedData.nacAbuelaPaterna} alCambiar={e => setExtractedData({ ...extractedData, nacAbuelaPaterna: e.target.value })} />
                        <EntradaFormulario etiqueta="Nac. Abuelo Materno" valor={extractedData.nacAbueloMaterno} alCambiar={e => setExtractedData({ ...extractedData, nacAbueloMaterno: e.target.value })} />
                        <EntradaFormulario etiqueta="Nac. Abuela Materna" valor={extractedData.nacAbuelaMaterna} alCambiar={e => setExtractedData({ ...extractedData, nacAbuelaMaterna: e.target.value })} />
                      </div>

                      <EntradaFormulario
                        etiqueta="El jugador ha jugado en un Club extranjero y participado en Torneos y/o competencias internacionales, escolares o de recreo como campamentos estacionales, cursos, etc"
                        valor={extractedData.juegoClubExtranjero}
                        alCambiar={e => setExtractedData({ ...extractedData, juegoClubExtranjero: e.target.value })}
                        filas={3}
                        obligatorio={true}
                      />
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <p style={{ margin: 0, fontSize: '13px', color: '#9a3412', fontStyle: 'italic' }}>
                        Si el jugador es extranjero, habilite está opción para completar los antecedentes internacionales.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ACCIONES FINALES */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '40px' }}>
                <BotonSecundario
                  etiqueta="Cancelar y volver"
                  alHacerClick={() => navigate('/admin/equipos')}
                  estilo={{ minWidth: '200px' }}
                />
                <BotonPrimario
                  etiqueta={submitting ? "Procesando..." : "Descargar formato y continuar"}
                  icono={<FaSave />}
                  alHacerClick={handleGuardar}
                  deshabilitado={submitting}
                  estilo={{ minWidth: '300px' }}
                />
              </div>
            </section>
          )}
        </div>
      )}

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

      {/* MODAL DE FINALIZACIÓN Y CARGA DE FORMATO FIRMADO */}
      <Modal
        estaAbierto={showFinishModal}
        titulo="Finalizar Inscripción de Jugador"
        alCerrar={() => setShowFinishModal(false)}
        tamanio="medio"
        pie={
          <>
            <BotonSecundario etiqueta="Cancelar" alHacerClick={() => setShowFinishModal(false)} />
            <BotonPrimario
              etiqueta={submitting ? "Enviando..." : "Finalizar Inscripción"}
              icono={<FaCheckCircle />}
              alHacerClick={handleFinalizarInscripcion}
              deshabilitado={submitting}
            />
          </>
        }
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', justifyContent: 'center' }}>
            <button
              onClick={() => handleDownloadFormato()}
              style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #0b4ea6, #063f82)', color: 'white', fontWeight: '800', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              📥 Descargar Formato
            </button>
          </div>
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
              Formato de Afiliación — Subida Opcional
            </p>
            <p style={{ margin: 0 }}>
              Descarga el formato pre-llenado con el botón de arriba, imprímelo, fírmalo y escanéalo para subirlo.
              <strong> Si aún no tienes el formato firmado, puedes continuar sin subirlo ahora</strong> y cargarlo después desde
              la sección <em>AdminJugadores → Docs</em>.
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
