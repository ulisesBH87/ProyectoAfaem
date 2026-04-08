import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaFootballBall, FaTags, FaCalendar } from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../styles/dashboard.css';
import { API_BASE } from '../../config/config';
import { PDFDocument } from 'pdf-lib';
import Swal from 'sweetalert2';
import { validarFotografia } from "../../services/foto";
import teamsService from "../../services/teams";

export default function ConfigurarEquipo() {
  const navigate = useNavigate();
  const preRegistro = JSON.parse(localStorage.getItem('afaem_pre_registro') || '{}');
  const numPersonasPagadas = preRegistro.numPersonas || 25; // Default 25 for testing
  const asignacionSeguros = (preRegistro.asignacionSeguros && Object.keys(preRegistro.asignacionSeguros).length > 0) 
    ? preRegistro.asignacionSeguros 
    : { '1': 15, '2': 15, '3': 15 }; // Default quotas for testing

  const catalogoSeguros = [
    { id: '1', nombre: 'Seguro Básico (Futbol 7/9/Sala)', precio: 350 },
    { id: '2', nombre: 'Seguro Profesional (Futbol 11)', precio: 550 },
    { id: '3', nombre: 'Seguro Premier (Todas las categorías)', precio: 750 }
  ];

  const [formData, setFormData] = useState({
    modality: '',
    category: '',
    season: '',
    rama: '',
    agreedToTerms: false
  });

  const [activeStep, setActiveStep] = useState(1); // 1: Config, 2: Players
  const [players, setPlayers] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState({
    id: Date.now(),
    firstName: '',
    lastNamePaterno: '',
    lastNameMaterno: '',
    curp: '',
    birthDate: '',
    sexo_id: 1, // 1: Masculino, 2: Femenino (según tu catálogo)
    insuranceType: '',
    // Foráneo
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
    juegoClubExtranjero: '',
    documents: {}
  });

  const [modalData, setModalData] = useState({
    teamName: '',
    teamLogo: null
  });

  const [errors, setErrors] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Lógica de Borradores
  const saveDraft = () => {
    const draftData = {
      formData,
      activeStep,
      players,
      modalData,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('afaem_draft_equipo', JSON.stringify(draftData));
    Swal.fire({
      title: 'Borrador guardado',
      text: 'Tu progreso se ha guardado localmente en este navegador.',
      icon: 'success',
      timer: 2000,
      showConfirmButton: false
    });
  };

  const clearDraft = () => {
    localStorage.removeItem('afaem_draft_equipo');
  };

  // Cargar borrador al montar
  useEffect(() => {
    const draft = localStorage.getItem('afaem_draft_equipo');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        Swal.fire({
          title: '¿Recuperar borrador?',
          text: `Se encontró un borrador guardado el ${new Date(parsed.timestamp).toLocaleString()}. ¿Deseas continuar donde te quedaste?`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Sí, recuperar',
          cancelButtonText: 'No, empezar de nuevo',
          confirmButtonColor: '#0b4ea6'
        }).then((result) => {
          if (result.isConfirmed) {
            if (parsed.formData) setFormData(parsed.formData);
            if (parsed.activeStep) setActiveStep(parsed.activeStep);
            if (parsed.players) setPlayers(parsed.players);
            if (parsed.modalData) setModalData(parsed.modalData);
            Swal.fire('¡Recuperado!', 'Tu progreso ha sido restaurado.', 'success');
          } else {
            clearDraft();
          }
        });
      } catch (e) {
        console.error("Error al cargar borrador:", e);
      }
    }
  }, []);

  const [catalogs, setCatalogs] = useState({
    ligas: [],
    categorias: [],
    modalidades: [],
    ramas: [],
    seguros: [],
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
        Swal.fire('Error', 'No se pudieron cargar los catálogos del servidor.', 'error');
      } finally {
        setLoadingCatalogs(false);
      }
    };
    loadCatalogs();
  }, []);

  const handleOptionChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: parseInt(value)
    }));
    setErrors(prev => ({
      ...prev,
      [field]: ''
    }));
  };

  const handleCheckboxChange = (e) => {
    setFormData(prev => ({
      ...prev,
      agreedToTerms: e.target.checked
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.modality) newErrors.modality = 'Selecciona una modalidad';
    if (!formData.category) newErrors.category = 'Selecciona una categoría';
    if (!formData.season) newErrors.season = 'Selecciona una temporada';
    if (!formData.rama) newErrors.rama = 'Selecciona una rama';
    if (!formData.agreedToTerms) newErrors.agreedToTerms = 'Debes revisar y aceptar los términos';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) {
      Swal.fire('Atención', 'Por favor completa todos los campos requeridos', 'warning');
      return;
    }
    
    // Buscar la combinación válida de LigaModalidadCategoriaRamaId
    const combinacion = catalogs.combinaciones.find(c => 
      c.liga_id === formData.season && 
      c.modalidad_id === formData.modality && 
      c.categoria_id === formData.category &&
      c.rama_id === formData.rama
    );

    if (!combinacion) {
      Swal.fire('Atención', 'La combinación de Liga, Modalidad, Categoría y Rama seleccionada no está disponible actualmente.', 'info');
      return;
    }

    setFormData(prev => ({ ...prev, liga_mod_cat_ram_id: combinacion.id }));
    setShowModal(true);
  };

  const handleGoToPlayers = () => {
    // Validar modal antes de pasar
    if (!modalData.teamName.trim()) {
      Swal.fire('Atención', 'Por favor ingresa el nombre del equipo', 'warning');
      return;
    }
    if (!modalData.teamLogo) {
      Swal.fire('Atención', 'Por favor carga el logo del equipo', 'warning');
      return;
    }
    setActiveStep(2);
    setShowModal(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleSuccessModalContinue = () => {
    clearDraft();
    setShowSuccessModal(false);
    navigate('/presidente-equipo');
  };

  const handleTeamNameChange = (e) => {
    setModalData(prev => ({
      ...prev,
      teamName: e.target.value
    }));
  };

  const handleTeamLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setModalData(prev => ({
        ...prev,
        teamLogo: file
      }));
    }
  };
  
  const procesarOCRReal = async (docKey, file) => {
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
      
      const extractedData = {};
      const rows = doc.querySelectorAll('.dato-fila');
      rows.forEach(row => {
        const label = row.querySelector('.etiqueta')?.textContent?.toLowerCase() || '';
        const value = row.querySelector('.valor')?.textContent?.trim() || '';
        if (label.includes('nombre')) extractedData.nombre = value;
        if (label.includes('curp')) extractedData.curp = value;
        if (label.includes('fecha de nacimiento')) extractedData.fecha_nac = value;
      });

      if (extractedData.nombre) {
        const parts = extractedData.nombre.split(' ');
        let firstName = '', lastNamePaterno = '', lastNameMaterno = '';
        
        if (parts.length >= 3) {
          lastNamePaterno = parts[0];
          lastNameMaterno = parts[1];
          firstName = parts.slice(2).join(' ');
        } else if (parts.length === 2) {
          lastNamePaterno = parts[0];
          firstName = parts[1];
        } else {
          firstName = extractedData.nombre;
        }

        // Inferir sexo desde CURP si está disponible
        let inferredSexo = 1;
        if (extractedData.curp && extractedData.curp.length >= 11) {
          const char = extractedData.curp.charAt(10).toUpperCase();
          if (char === 'M') inferredSexo = 2;
        }

        setCurrentPlayer(prev => ({
          ...prev,
          firstName,
          lastNamePaterno,
          lastNameMaterno,
          curp: extractedData.curp || prev.curp,
          birthDate: extractedData.fecha_nac || prev.birthDate,
          sexo_id: inferredSexo,
          documents: { ...prev.documents, [docKey]: file }
        }));

        Swal.fire({
          title: '¡Lectura Exitosa!',
          text: `Se detectó a: ${extractedData.nombre}`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        throw new Error('No se detectaron nombres en el documento.');
      }
    } catch (err) {
      console.error("Error OCR:", err);
      setCurrentPlayer(prev => ({
        ...prev,
        documents: { ...prev.documents, [docKey]: file }
      }));
      Swal.fire('Atención', 'No se pudo leer el nombre automáticamente, por favor ingrésalo manualmente.', 'warning');
    }
  };

  const procesarFotografiaJugador = async (file) => {
    Swal.fire({
      title: 'Validando Fotografía...',
      html: 'Verificando formato y calidad. <b>Por favor espere.</b>',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    try {
      const data = await validarFotografia(file);
      if (data.valido) {
        setCurrentPlayer(prev => ({
          ...prev,
          documents: { ...prev.documents, foto: file }
        }));
        Swal.fire({
          title: '¡Fotografía Aceptada!',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      } else {
        Swal.fire('Error en la fotografía', data.mensaje, 'error');
      }
    } catch (err) {
      Swal.fire('Error de validación', err.message || 'No se pudo procesar la foto.', 'error');
    }
  };

  const handleDownloadPlayerPDF = async () => {
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
      if (currentPlayer.documents.foto) {
        try {
          const photoBytes = await currentPlayer.documents.foto.arrayBuffer();
          let photoImage;
          const fileName = currentPlayer.documents.foto.name.toLowerCase();
          
          if (fileName.endsWith('.png')) {
            photoImage = await pdfDoc.embedPng(photoBytes);
          } else {
            photoImage = await pdfDoc.embedJpg(photoBytes);
          }

          // Dibujar la foto en la zona Imagen9_af_image (x: 481, y: 678)
          firstPage.drawImage(photoImage, {
            x: 481,
            y: 678,
            width: 72,
            height: 87,
          });
        } catch (photoErr) {
          console.error("No se pudo incrustar la foto del jugador:", photoErr);
        }
      }

      const { firstName, lastNamePaterno, lastNameMaterno, curp, birthDate } = currentPlayer;

      // Nombre y Apellidos en sus campos exactos
      form.getTextField('Nombres')?.setText(firstName || '');
      form.getTextField('Apellido Paterno')?.setText(lastNamePaterno || '');
      form.getTextField('Apellido Materno')?.setText(lastNameMaterno || '');

      // CURP
      if (curp) {
        form.getTextField('CURP o Clave Única de Registro de Población')?.setText(curp);
      }

      // Fecha de Nacimiento
      if (birthDate) {
        form.getTextField('Fecha de Nacimiento')?.setText(birthDate);
      }

      // Correo electrónico
      const email = localStorage.getItem('email') || '';
      if (email) {
        form.getTextField('Correo electrónico')?.setText(email);
      }

      // Sexo (extraer de CURP)
      if (curp && curp.length >= 11) {
        const sexoChar = curp.charAt(10).toUpperCase();
        const sexoTexto = sexoChar === 'H' ? 'MASCULINO' : sexoChar === 'M' ? 'FEMENINO' : '';
        if (sexoTexto) form.getTextField('Sexo')?.setText(sexoTexto);
      }

      // Fecha automática (A __ de __ del 20__)
      const hoy = new Date();
      const dia = String(hoy.getDate()).padStart(2, '0');
      const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
      const mes = meses[hoy.getMonth()];
      const anio = String(hoy.getFullYear()).slice(-2);
      
      form.getTextField('A')?.setText(dia);
      form.getTextField('de')?.setText(mes);
      form.getTextField('del 20')?.setText(anio);

      // Posición y NumCamiseta defaults si no tiene en este momento
      form.getTextField('Posición')?.setText('JUGADOR');
      
      // ANTECEDENTES INTERNACIONALES (FORÁNEO)
      if (currentPlayer.esForaneo) {
        form.getTextField('Nacionalidades del jugador')?.setText(currentPlayer.nacionalidadJugador);
        form.getTextField('País de residencia actual')?.setText(currentPlayer.paisResidencia);
        form.getTextField('¿El jugador ha vivido en el extranjero? ¿En que país?')?.setText(currentPlayer.haVividoExtranjero ? currentPlayer.dondeVividoExtranjero : 'NO');
        form.getTextField('Nacionalidades del padre')?.setText(currentPlayer.nacionalidadPadre);
        form.getTextField('Nacionalidades de la madre')?.setText(currentPlayer.nacionalidadMadre);
        form.getTextField('Nacionalidades del abuelo paterno')?.setText(currentPlayer.nacAbueloPaterno);
        form.getTextField('Nacionalidades de la abuela paterna')?.setText(currentPlayer.nacAbuelaPaterna);
        form.getTextField('Nacionalidades del abuelo materno')?.setText(currentPlayer.nacAbueloMaterno);
        form.getTextField('Nacionalidades de la abuela materna')?.setText(currentPlayer.nacAbuelaMaterna);
        
        form.getTextField('El jugador ha jugado en un Club extranjero...')?.setText(currentPlayer.juegoClubExtranjero);
      }

      // Cargo: JUGADOR
      form.getTextField('Cargo')?.setText('JUGADOR');

      // Generar bytes del PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const safeNombre = (firstName || 'Jugador').toString().replace(/[^a-zA-Z0-9_\s]/g, '').trim();
      const link = document.createElement('a');
      link.href = url;
      link.download = `Afiliacion_${safeNombre}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      Swal.fire('¡Listo!', 'El formato se ha generado correctamente. Firma el documento y súbelo.', 'success');
    } catch (err) {
      console.error("Error generando PDF:", err);
      Swal.fire('Error', 'No se pudo generar el PDF. ' + err.message, 'error');
    }
  };

  const userEmail = localStorage.getItem('email') || '';

  return (
    <>
      <style>
        {`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .step-pill {
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            background: #f1f5f9;
            color: #64748b;
            transition: all 0.3s;
          }
          .step-pill.active {
            background: #0b4ea6;
            color: white;
          }
          .dashboard-main { animation: slideUp 0.4s ease; }
        `}
      </style>
      <div className="dashboard-content">
        {/* STEP INDICATOR */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '25px', padding: '10px' }}>
              <div className={`step-pill ${activeStep === 1 ? 'active' : ''}`}>1. Configuración</div>
              <div style={{ color: '#cbd5e1', alignSelf: 'center' }}>→</div>
              <div className={`step-pill ${activeStep === 2 ? 'active' : ''}`}>2. Jugadores</div>
            </div>

            <div>
              {activeStep === 1 && (
                <div style={{ animation: 'slideUp 0.4s ease' }}>
                  {/* HEADER DEL FORMULARIO */}
                  <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div style={{ fontSize: '32px', background: 'linear-gradient(135deg, #0b4ea6 0%, #063f82 100%)', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '14px', color: 'white', boxShadow: '0 4px 6px -1px rgba(11, 78, 166, 0.2)' }}>
                        🛡️
                      </div>
                      <div>
                        <h2 style={{ margin: 0, color: '#1e293b', fontSize: '24px', fontWeight: '800' }}>Configuración de Equipo</h2>
                        <p style={{ margin: '5px 0 0 0', color: '#64748b', fontSize: '14px' }}>Define la modalidad y categoría de competencia.</p>
                      </div>
                    </div>
                    
                    <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#eff6ff', borderRadius: '12px', border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', gap: '12px' }}>
                       <div style={{ fontSize: '24px' }}>ℹ️</div>
                       <div>
                         <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e3a8a' }}>Seguros pre-pagados: {numPersonasPagadas}</div>
                         <div style={{ fontSize: '12px', color: '#60a5fa' }}>Las opciones se habilitan según tu pago previo.</div>
                       </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                    {/* MODALIDAD */}
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <h5 style={{ marginBottom: '20px', color: '#0b4ea6', fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FaFootballBall /> Modalidad
                      </h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {catalogs.modalidades.map((mod) => (
                          <label key={mod.id} style={{
                            display: 'flex', alignItems: 'center', gap: '15px', padding: '18px', borderRadius: '16px', cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', border: '2px solid',
                            borderColor: formData.modality === mod.id ? '#0b4ea6' : '#f1f5f9',
                            backgroundColor: formData.modality === mod.id ? '#eff6ff' : 'white',
                            position: 'relative', overflow: 'hidden'
                          }}>
                            {formData.modality === mod.id && <div style={{ position: 'absolute', top: 0, right: 0, width: '40px', height: '40px', background: '#0b4ea6', clipPath: 'polygon(100% 0, 0 0, 100% 100%)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', padding: '5px' }}><div style={{ color: 'white', fontSize: '10px' }}>✓</div></div>}
                            <input type="radio" name="modality" value={mod.id} checked={formData.modality === mod.id} onChange={(e) => handleOptionChange('modality', e.target.value)} style={{ width: '20px', height: '20px', accentColor: '#0b4ea6' }} />
                            <div style={{ flex: 1 }}>
                              <span style={{ fontWeight: '800', display: 'block', color: '#1e293b', fontSize: '15px' }}>{mod.nombre}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* CATEGORÍA */}
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <h5 style={{ marginBottom: '20px', color: '#0b4ea6', fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FaTags /> Categoría
                      </h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {catalogs.categorias.map((cat) => (
                          <label key={cat.id} style={{
                            display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', borderRadius: '12px', cursor: 'pointer',
                            transition: 'all 0.2s', border: '1px solid',
                            borderColor: formData.category === cat.id ? '#0b4ea6' : '#f1f5f9',
                            backgroundColor: formData.category === cat.id ? '#eff6ff' : 'white'
                          }}>
                            <input type="radio" name="category" value={cat.id} checked={formData.category === cat.id} onChange={(e) => handleOptionChange('category', e.target.value)} />
                            <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>{cat.nombre}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* TEMPORADA */}
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <h5 style={{ marginBottom: '20px', color: '#0b4ea6', fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FaCalendar /> Temporada
                      </h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {catalogs.ligas.map((s) => (
                          <label key={s.id} style={{
                            display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', borderRadius: '12px', cursor: 'pointer',
                            transition: 'all 0.2s', border: '1px solid',
                            borderColor: formData.season === s.id ? '#0b4ea6' : '#f1f5f9',
                            backgroundColor: formData.season === s.id ? '#eff6ff' : 'white'
                          }}>
                            <input type="radio" name="season" value={s.id} checked={formData.season === s.id} onChange={(e) => handleOptionChange('season', e.target.value)} />
                            <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>{s.nombre}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* RAMA */}
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <h5 style={{ marginBottom: '20px', color: '#0b4ea6', fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FaTags /> Rama
                      </h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {catalogs.ramas.map((r) => (
                          <label key={r.id} style={{
                            display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', borderRadius: '12px', cursor: 'pointer',
                            transition: 'all 0.2s', border: '1px solid',
                            borderColor: formData.rama === r.id ? '#0b4ea6' : '#f1f5f9',
                            backgroundColor: formData.rama === r.id ? '#eff6ff' : 'white'
                          }}>
                            <input type="radio" name="rama" value={r.id} checked={formData.rama === r.id} onChange={(e) => handleOptionChange('rama', e.target.value)} />
                            <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>{r.nombre}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* TÉRMINOS */}
                  <div style={{ backgroundColor: '#f8fafc', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '30px' }}>
                    <div style={{ display: 'flex', gap: '15px' }}>
                      <input type="checkbox" id="terms" checked={formData.agreedToTerms} onChange={handleCheckboxChange} style={{ width: '20px', height: '20px', marginTop: '2px', cursor: 'pointer' }} />
                      <label htmlFor="terms" style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', cursor: 'pointer' }}>
                        He revisado los reglamentos de competencia y acepto que el registro de los jugadores debe cumplir con los seguros pre-pagados.
                      </label>
                    </div>
                    <div style={{ marginTop: '12px', paddingLeft: '35px' }}>
                      <a 
                        href="https://afaem.mx/reglamentos" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ 
                          fontSize: '13px', color: '#0b4ea6', fontWeight: '700', 
                          textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px',
                          transition: 'color 0.2s'
                        }}
                        onMouseEnter={e => e.target.style.textDecoration = 'underline'}
                        onMouseLeave={e => e.target.style.textDecoration = 'none'}
                      >
                        📄 Click aquí para ver los reglamentos de competencia →
                      </a>
                    </div>
                    {errors.agreedToTerms && <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '10px', fontWeight: '700' }}>⚠️ {errors.agreedToTerms}</div>}
                  </div>

                  {/* BOTONES STEP 1 */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
                    <button type="button" onClick={saveDraft} style={{ padding: '12px 20px', borderRadius: '10px', border: '1px solid #0b4ea6', background: '#eff6ff', color: '#0b4ea6', fontWeight: '700', cursor: 'pointer' }}>💾 Guardar Borrador</button>
                    <button type="button" onClick={() => navigate('/presidente-equipo')} style={{ padding: '12px 30px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: '700', cursor: 'pointer' }}>Cancelar</button>
                    <button type="button" onClick={handleSubmit} style={{ padding: '12px 40px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #0b4ea6 0%, #063f82 100%)', color: 'white', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(11, 78, 166, 0.2)' }}>Continuar a Jugadores →</button>
                  </div>
                </div>
              )}

            {/* SECCIÓN 2: REGISTRO DE JUGADORES (PASO 2) */}
            {activeStep === 2 && (
              <div style={{ animation: 'slideUp 0.4s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                   <button onClick={() => setActiveStep(1)} style={{ background: 'none', border: 'none', color: '#0b4ea6', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                     ← Volver a Configuración
                   </button>
                   <div style={{ background: '#dcfce7', color: '#166534', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                     Equipo: {modalData.teamName || 'Sin nombre'}
                   </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '30px' }}>
                  {/* FORMULARIO DE JUGADOR */}
                  <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' }}>
                      <div>
                        <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Registrar Jugador</h3>
                        <p style={{ fontSize: '13px', color: '#64748b', margin: '5px 0 0 0' }}>Sube los documentos para autocompletar la información.</p>
                      </div>
                      <div style={{ background: '#f1f5f9', padding: '8px 12px', borderRadius: '8px', textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Jugadores</span>
                        <span style={{ fontSize: '18px', fontWeight: '800', color: '#0b4ea6' }}>{players.length}</span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px' }}>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                         <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Nombre(s)</label>
                         <input 
                           type="text" 
                           value={currentPlayer.firstName}
                           onChange={e => setCurrentPlayer({...currentPlayer, firstName: e.target.value})}
                           placeholder="Ej. Juan" 
                           style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} 
                         />
                       </div>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                         <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Ap. Paterno</label>
                         <input 
                           type="text" 
                           value={currentPlayer.lastNamePaterno}
                           onChange={e => setCurrentPlayer({...currentPlayer, lastNamePaterno: e.target.value})}
                           placeholder="Ej. Pérez" 
                           style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} 
                         />
                       </div>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                         <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Ap. Materno</label>
                         <input 
                           type="text" 
                           value={currentPlayer.lastNameMaterno}
                           onChange={e => setCurrentPlayer({...currentPlayer, lastNameMaterno: e.target.value})}
                           placeholder="Ej. Gómez" 
                           style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} 
                         />
                       </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px' }}>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                         <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>CURP</label>
                         <input 
                           type="text" 
                           value={currentPlayer.curp}
                           onChange={(e) => {
                             const val = e.target.value.toUpperCase();
                             let sId = currentPlayer.sexo_id;
                             if (val.length >= 11) {
                               const char = val.charAt(10);
                               if (char === 'M') sId = 2;
                               else if (char === 'H') sId = 1;
                             }
                             setCurrentPlayer({...currentPlayer, curp: val, sexo_id: sId});
                           }}
                           placeholder="ABCD..." 
                           style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} 
                         />
                       </div>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                         <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Fecha Nac.</label>
                         <input 
                           type="text" 
                           value={currentPlayer.birthDate}
                           onChange={e => setCurrentPlayer({...currentPlayer, birthDate: e.target.value})}
                           placeholder="DD/MM/AAAA" 
                           style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} 
                         />
                       </div>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                         <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Sexo</label>
                         <select 
                           value={currentPlayer.sexo_id}
                           onChange={e => setCurrentPlayer({...currentPlayer, sexo_id: parseInt(e.target.value)})}
                           style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: 'white' }}
                         >
                           <option value={1}>MASCULINO</option>
                           <option value={2}>FEMENINO</option>
                         </select>
                       </div>
                    </div>

                    <div style={{ marginBottom: '25px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '8px' }}>Asignar Seguro</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                        {catalogs.seguros.map(seg => {
                          const id = seg.id.toString();
                          const count = players.filter(p => p.insuranceType === id).length;
                          const available = (asignacionSeguros[id] || 0) - count;
                          return (
                            <button
                              key={id}
                              disabled={available <= 0}
                              onClick={() => setCurrentPlayer({...currentPlayer, insuranceType: id})}
                              style={{
                                padding: '10px',
                                borderRadius: '10px',
                                border: currentPlayer.insuranceType === id ? '2px solid #0b4ea6' : '1px solid #e2e8f0',
                                backgroundColor: currentPlayer.insuranceType === id ? '#eff6ff' : (available <= 0 ? '#f8fafc' : 'white'),
                                cursor: available <= 0 ? 'not-allowed' : 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.2s',
                                opacity: available <= 0 ? 0.6 : 1
                              }}
                            >
                              <div style={{ fontSize: '11px', fontWeight: '700', color: currentPlayer.insuranceType === id ? '#0b4ea6' : '#1e293b' }}>{seg?.nombre}</div>
                              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px' }}>Disponibles: {available}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ marginBottom: '30px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '12px' }}>Documentación Requerida</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                        {[
                          { key: 'acta', label: 'Acta Nac.', icon: '📜' },
                          { key: 'ine', label: 'INE / Ident.', icon: '🆔' },
                          { key: 'foto', label: 'Foto', icon: '📸' }
                        ].map(doc => {
                          const isFormato = doc.key === 'formato';
                          const canUploadFormato = currentPlayer.firstName && currentPlayer.firstName.trim() !== '';
                          
                          return (
                            <div key={doc.key} style={{ 
                              textAlign: 'center', padding: '20px 10px', border: '1px dashed', borderRadius: '16px',
                              backgroundColor: (currentPlayer.documents && currentPlayer.documents[doc.key]) ? '#f0fdf4' : (isFormato && !canUploadFormato ? '#f1f5f9' : '#f8fafc'),
                              borderColor: (currentPlayer.documents && currentPlayer.documents[doc.key]) ? '#22c55e' : (isFormato && !canUploadFormato ? '#e2e8f0' : '#cbd5e1'),
                              transition: 'all 0.2s',
                              opacity: isFormato && !canUploadFormato ? 0.6 : 1
                            }}>
                               <div style={{ fontSize: '28px', marginBottom: '8px' }}>{doc.icon}</div>
                               <div style={{ fontSize: '10px', fontWeight: '900', color: '#475569', textTransform: 'uppercase', marginBottom: '10px' }}>{doc.label}</div>
                               
                               {(currentPlayer.documents && currentPlayer.documents[doc.key]) ? (
                                 <div style={{ fontSize: '11px', color: '#059669', fontWeight: '800' }}>Cargado ✓</div>
                               ) : (
                                 <button 
                                   disabled={isFormato && !canUploadFormato}
                                   onClick={() => {
                                     const input = document.createElement('input');
                                     input.type = 'file';
                                     input.onchange = (e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                          if (doc.key === 'foto') {
                                            procesarFotografiaJugador(file);
                                          } else if (['acta', 'ine'].includes(doc.key)) {
                                            procesarOCRReal(doc.key, file);
                                          } else {
                                            setCurrentPlayer(prev => ({
                                              ...prev,
                                              documents: { ...prev.documents, [doc.key]: file }
                                            }));
                                          }
                                        }
                                     };
                                     input.click();
                                   }}
                                   style={{ 
                                     fontSize: '10px', padding: '5px 10px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', 
                                     cursor: (isFormato && !canUploadFormato) ? 'not-allowed' : 'pointer', fontWeight: '800', color: '#0b4ea6' 
                                   }}
                                 >
                                   Subir
                                 </button>
                               )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* ANTECEDENTES INTERNACIONALES */}
                    <div style={{ marginBottom: '30px', backgroundColor: '#fff7ed', border: '1px solid #ffedd5', padding: '20px', borderRadius: '16px' }}>
                       <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#9a3412' }}>
                            2. Antecedentes internacionales
                          </h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                             <label style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>¿Jugador foráneo?</label>
                             <input 
                               type="checkbox" 
                               checked={currentPlayer.esForaneo}
                               onChange={(e) => setCurrentPlayer({...currentPlayer, esForaneo: e.target.checked})}
                               style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                             />
                          </div>
                       </div>
                       
                       {currentPlayer.esForaneo ? (
                         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Nacionalidad jugador</label>
                              <input type="text" value={currentPlayer.nacionalidadJugador} onChange={e => setCurrentPlayer({...currentPlayer, nacionalidadJugador: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>País de residencia</label>
                              <input type="text" value={currentPlayer.paisResidencia} onChange={e => setCurrentPlayer({...currentPlayer, paisResidencia: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>¿Ha vivido extranjero?</label>
                              <select value={currentPlayer.haVividoExtranjero ? '1' : '0'} onChange={e => setCurrentPlayer({...currentPlayer, haVividoExtranjero: e.target.value === '1'})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}>
                                 <option value="0">No</option>
                                 <option value="1">Sí</option>
                              </select>
                            </div>
                            {currentPlayer.haVividoExtranjero && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>¿Dónde?</label>
                                <input type="text" value={currentPlayer.dondeVividoExtranjero} onChange={e => setCurrentPlayer({...currentPlayer, dondeVividoExtranjero: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                              </div>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Nacionalidad padre</label>
                              <input type="text" value={currentPlayer.nacionalidadPadre} onChange={e => setCurrentPlayer({...currentPlayer, nacionalidadPadre: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Nacionalidad madre</label>
                              <input type="text" value={currentPlayer.nacionalidadMadre} onChange={e => setCurrentPlayer({...currentPlayer, nacionalidadMadre: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', gridColumn: '1 / -1' }}>
                              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Registro Asoc. Extranjera previo a FMF</label>
                              <textarea value={currentPlayer.registroAsociacionExtranjera} onChange={e => setCurrentPlayer({...currentPlayer, registroAsociacionExtranjera: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} rows={2}></textarea>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Nacionalidad abuelo paterno</label>
                              <input type="text" value={currentPlayer.nacAbueloPaterno} onChange={e => setCurrentPlayer({...currentPlayer, nacAbueloPaterno: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Nac. abuela paterna</label>
                              <input type="text" value={currentPlayer.nacAbuelaPaterna} onChange={e => setCurrentPlayer({...currentPlayer, nacAbuelaPaterna: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Nac. abuelo materno</label>
                              <input type="text" value={currentPlayer.nacAbueloMaterno} onChange={e => setCurrentPlayer({...currentPlayer, nacAbueloMaterno: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Nac. abuela materna</label>
                              <input type="text" value={currentPlayer.nacAbuelaMaterna} onChange={e => setCurrentPlayer({...currentPlayer, nacAbuelaMaterna: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', gridColumn: '1 / -1' }}>
                              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>¿Club extranjero o Torneos internacionales escolares?</label>
                              <textarea value={currentPlayer.juegoClubExtranjero} onChange={e => setCurrentPlayer({...currentPlayer, juegoClubExtranjero: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} rows={2}></textarea>
                            </div>
                         </div>
                       ) : (
                         <p style={{ margin: 0, fontSize: '12px', color: '#9a3412', fontStyle: 'italic' }}>
                            El jugador se considera nacional por defecto. Activa el interruptor si es foráneo para habilitar los campos.
                         </p>
                       )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '25px', borderTop: '1px solid #f1f5f9' }}>
                      <button 
                        disabled={!currentPlayer.firstName}
                        style={{ 
                          background: 'none', border: 'none', color: !currentPlayer.firstName ? '#94a3b8' : '#0b4ea6', 
                          fontSize: '14px', fontWeight: '800', cursor: !currentPlayer.firstName ? 'not-allowed' : 'pointer', 
                          display: 'flex', alignItems: 'center', gap: '8px', opacity: !currentPlayer.firstName ? 0.6 : 1
                        }}
                        onClick={handleDownloadPlayerPDF}
                      >
                        📥 <span style={{ textDecoration: !currentPlayer.firstName ? 'none' : 'underline' }}>Descargar Formato Pre-llenado</span>
                      </button>
                      <button 
                        onClick={async () => {
                          const docs = currentPlayer.documents || {};
                          const hasMinDocs = docs.ine && docs.foto;
                          if (!currentPlayer.firstName || !currentPlayer.insuranceType || !hasMinDocs) {
                            Swal.fire('Atención', 'Por favor ingresa el nombre, selecciona seguro y sube INE y Foto para continuar.', 'warning');
                            return;
                          }
                          
                          // 1. Descargamos el PDF
                          await handleDownloadPlayerPDF();
                          
                          // 2. Mostramos el Swal alert para pedir que suban el documento firmado
                          const { value: fileFormato } = await Swal.fire({
                             title: '¡Formato descargado con éxito!',
                             html: `
                               <p style="font-size:14px; margin-bottom:15px; color:#0369a1;">Hemos descargado automáticamente el formato de afiliación pre-llenado con la información proporcionada. <strong>A continuación debe subir el formato ya firmado</strong> para finalizar.</p>
                               <input type="file" id="formato-swal" class="swal2-file" accept=".pdf">
                             `,
                             showCancelButton: true,
                             confirmButtonText: 'Guardar y Finalizar',
                             cancelButtonText: 'Cancelar',
                             preConfirm: () => {
                               const fileInput = document.getElementById('formato-swal');
                               if (!fileInput.files[0]) {
                                 Swal.showValidationMessage('Debe subir el formato firmado para continuar');
                                 return false;
                               }
                               return fileInput.files[0];
                             }
                          });
                          
                          if (fileFormato) {
                             const finalPlayer = {
                               ...currentPlayer,
                               documents: { ...currentPlayer.documents, formato: fileFormato }
                             };
                             setPlayers([...players, finalPlayer]);
                             setCurrentPlayer({
                               id: Date.now(),
                               firstName: '',
                               lastNamePaterno: '',
                               lastNameMaterno: '',
                               curp: '',
                               birthDate: '',
                               sexo_id: 1,
                               insuranceType: '',
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
                               juegoClubExtranjero: '',
                               documents: {}
                             });
                             Swal.fire('Éxito', 'Jugador agregado correctamente', 'success');
                          }
                        }}
                        style={{ padding: '14px 30px', background: '#0b4ea6', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(11, 78, 166, 0.2)', fontSize: '15px' }}
                      >
                        + Guardar Jugador
                      </button>
                    </div>
                  </div>

                  {/* LATERAL: RESUMEN DE EQUIPO */}
                  <div>
                    <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '20px', border: '1px solid #e2e8f0', marginBottom: '25px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '900', color: '#0b4ea6', marginBottom: '20px', textTransform: 'uppercase' }}>Resumen de Seguros</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        {catalogs.seguros.map(seg => {
                          const id = seg.id.toString();
                          const count = players.filter(p => p.insuranceType === id).length;
                          const total = asignacionSeguros[id] || 0;
                          const percent = total > 0 ? (count / total) * 100 : 0;
                          return (
                            <div key={id}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                                 <span style={{ fontWeight: '700', color: '#475569' }}>{seg.nombre}</span>
                                 <span style={{ fontWeight: '900', color: '#1e293b' }}>{count} / {total}</span>
                              </div>
                              <div style={{ height: '10px', background: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
                                 <div style={{ width: `${percent}%`, height: '100%', background: 'linear-gradient(90deg, #0b4ea6, #60a5fa)', borderRadius: '5px', transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '900', color: '#0b4ea6', marginBottom: '20px', textTransform: 'uppercase' }}>Jugadores Agregados</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                        {players.length === 0 ? (
                          <div style={{ padding: '40px 10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '36px', marginBottom: '15px', opacity: 0.2 }}>🏃‍♂️</div>
                            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, fontWeight: '600' }}>Comienza agregando un jugador.</p>
                          </div>
                        ) : (
                          players.map(p => (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                               <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', color: '#0b4ea6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '14px' }}>
                                 {p.firstName?.charAt(0) || 'J'}
                               </div>
                               <div style={{ flex: 1 }}>
                                 <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>{p.firstName} {p.lastNamePaterno}</div>
                                 <div style={{ fontSize: '11px', color: '#64748b' }}>{catalogs.seguros.find(s => s.id.toString() === p.insuranceType)?.nombre}</div>
                               </div>
                               <button onClick={() => setPlayers(players.filter(pl => pl.id !== p.id))} style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#fee2e2', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'center', gap: '20px' }}>
                  <button 
                    onClick={saveDraft}
                    style={{ padding: '14px 30px', background: '#f8fafc', color: '#0b4ea6', border: '1.5px solid #0b4ea6', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '15px' }}
                  >
                    💾 Guardar Borrador
                  </button>
                  <button 
                    onClick={async () => {
                        try {
                          Swal.fire({
                            title: 'Guardando Equipo...',
                            text: 'Por favor espere mientras procesamos el registro y documentos.',
                            allowOutsideClick: false,
                            didOpen: () => { Swal.showLoading(); }
                          });

                          await teamsService.createTeamCompleto({
                            teamName: modalData.teamName,
                            liga_mod_cat_ram_id: formData.liga_mod_cat_ram_id,
                            players: players
                          });

                          setSuccessMessage(`El equipo "${modalData.teamName}" ha sido registrado exitosamente en la base de datos.`);
                          setShowSuccessModal(true);
                          Swal.close();
                        } catch (err) {
                          console.error("Error al guardar equipo:", err);
                          Swal.fire('Error', 'No se pudo completar el registro: ' + (err.response?.data?.detail || err.message), 'error');
                        }
                    }}
                    disabled={players.length === 0}
                    style={{ 
                      padding: '18px 60px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '18px',
                      cursor: players.length === 0 ? 'not-allowed' : 'pointer', opacity: players.length === 0 ? 0.5 : 1, transition: 'all 0.3s',
                      boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)'
                    }}
                  >
                    🚀 Finalizar Configuración y Registro
                  </button>
                </div>
              </div>
            )}
          </div>

      {/* MODAL CONFIGURACIÓN EQUIPO */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '40px', maxWidth: '500px', width: '90%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', animation: 'slideUp 0.3s ease-out' }}>
            <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#0b4ea6', marginBottom: '30px', textAlign: 'center' }}>Identidad del Equipo</h2>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', fontWeight: '800', marginBottom: '10px', color: '#1e293b', fontSize: '14px', textTransform: 'uppercase' }}>Nombre del Equipo</label>
              <input type="text" placeholder="Ej: Rayos de Afaem" value={modalData.teamName} onChange={handleTeamNameChange} style={{ width: '100%', padding: '14px', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '16px', fontWeight: '600' }} />
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', fontWeight: '800', marginBottom: '10px', color: '#1e293b', fontSize: '14px', textTransform: 'uppercase' }}>Escudo / Logo</label>
              <div style={{ position: 'relative', height: '100px', border: '2px dashed #cbd5e1', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
                 {modalData.teamLogo ? (
                   <div style={{ textAlign: 'center' }}>
                     <div style={{ fontSize: '24px' }}>🖼️</div>
                     <div style={{ fontSize: '12px', fontWeight: '700', color: '#059669' }}>{modalData.teamLogo.name}</div>
                   </div>
                 ) : (
                   <div style={{ textAlign: 'center' }}>
                     <div style={{ fontSize: '24px', opacity: 0.5 }}>📤</div>
                     <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>Haz click para subir</div>
                   </div>
                 )}
                 <input type="file" accept="image/*" onChange={handleTeamLogoChange} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
              </div>
            </div>

            <div style={{ background: '#f1f5f9', padding: '20px', borderRadius: '16px', marginBottom: '30px' }}>
              <div style={{ fontSize: '14px', marginBottom: '6px' }}><strong style={{ color: '#475569' }}>Modalidad:</strong> <span style={{ color: '#0b4ea6', fontWeight: '800' }}>{catalogs.modalidades.find(m => m.id === formData.modality)?.nombre}</span></div>
              <div style={{ fontSize: '14px', marginBottom: '6px' }}><strong style={{ color: '#475569' }}>Categoría:</strong> <span style={{ color: '#0b4ea6', fontWeight: '800' }}>{catalogs.categorias.find(c => c.id === formData.category)?.nombre}</span></div>
              <div style={{ fontSize: '14px' }}><strong style={{ color: '#475569' }}>Rama:</strong> <span style={{ color: '#0b4ea6', fontWeight: '800' }}>{catalogs.ramas.find(r => r.id === formData.rama)?.nombre}</span></div>
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <button onClick={handleCloseModal} style={{ flex: 1, padding: '14px', border: '2px solid #e2e8f0', background: 'white', borderRadius: '12px', cursor: 'pointer', fontWeight: '800', color: '#64748b' }}>Cerrar</button>
              <button onClick={handleGoToPlayers} style={{ flex: 1, padding: '14px', background: '#0b4ea6', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '900' }}>Confirmar y Sig. →</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXITO FINAL */}
      {showSuccessModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(8px)' }}>
          <div style={{ background: 'white', borderRadius: '30px', padding: '50px', textAlign: 'center', maxWidth: '450px', width: '90%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', animation: 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
             <div style={{ width: '100px', height: '100px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 30px', fontSize: '50px', color: '#10b981' }}>🏆</div>
             <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#1e293b', marginBottom: '15px' }}>¡Registro Completo!</h2>
             <p style={{ color: '#64748b', fontSize: '15px', lineHeight: '1.6', marginBottom: '35px' }}>{successMessage}</p>
             <button 
               onClick={handleSuccessModalContinue} 
               style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #0b4ea6 0%, #063f82 100%)', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '16px', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(11, 78, 166, 0.3)' }}
             >
               Continuar al Panel
             </button>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
