import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUpload, FaCheckCircle, FaChevronRight, FaChevronLeft, FaMoneyBillWave, FaFileAlt, FaClock } from 'react-icons/fa';
import AfaemLogo from '../../assets/afaem-logo@4x.png';
import FmfLogo from '../../assets/fmf-logo.png';
import AmateurLogo from '../../assets/amateur-logo.png';
import { validarFotografia } from "../../services/foto";
import Swal from 'sweetalert2';
import { PDFDocument } from 'pdf-lib';
import { API_BASE } from '../../config/config';
import { parseJwt } from '../../services/auth';

function PreRegistroPresidente() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Estados Generales
  const [, setLoading] = useState(false);
  const [, setError] = useState(null);
  const [pasoActual, setPasoActual] = useState(0); // 0 = Bienvenida, 1 = Pago/Seguro, 2 = Esperando validación, 3 = Documentos
  const [estadoPago, setEstadoPago] = useState(null); // null, 1=EN ESPERA, 2=RECHAZADO, 3=APROBADO
  const [ordenPendienteId, setOrdenPendienteId] = useState(null); // ID si se guardó la orden a la mitad


  // Verificar estado de pago al cargar
  useEffect(() => {
    const verificarEstadoPago = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Restaurar progreso guardado si existe
        const saved = localStorage.getItem('afaem_pre_registro_guardado');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.numPersonas) setNumPersonas(parsed.numPersonas);
            if (parsed.asignacionSeguros) setAsignacionSeguros(parsed.asignacionSeguros);
            if (parsed.pasoActual === 1) setPasoActual(1);
          } catch (e) {
            console.error("Error al restaurar progreso", e);
          }
        }
        const res = await fetch(`${API_BASE}/ordenes-pago/mi-estado`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.tiene_orden) {
            setEstadoPago(data.estatus);
            // Si ya tiene orden, ir a la pantalla correcta
            if (data.estatus === 3) {
              // Pago aprobado → mostrar pantalla de validado
              setPasoActual(2);
            } else if (data.estatus === 1) {
              if (data.tiene_comprobante) {
                // Pago pendiente revisión
                setPasoActual(2);
              } else {
                // Generó orden pero no subió comprobante (Guardar y salir)
                setOrdenPendienteId(data.orden_pago_id);
                setPasoActual(1);
              }
            } else if (data.estatus === 2) {
              // Rechazado
              setPasoActual(2);
            }
          }
        }
      } catch (err) {
        console.warn('No se pudo verificar estado de pago:', err);
      }
    };
    verificarEstadoPago();
  }, []);

  // PASO 1: Pago y Seguros
  const [numPersonas, setNumPersonas] = useState(0);
  const [asignacionSeguros, setAsignacionSeguros] = useState({ '1': 0, '2': 0, '3': 0 });
  const [comprobantePago, setComprobantePago] = useState(null);
  const catalogoSeguros = [
    { id: '1', nombre: 'Seguro contra accidentes', descripcion: 'Protege a los jugadores ante accidentes deportivos.', precio: 150 },
    { id: '2', nombre: 'Seguro de vida', descripcion: 'Cobertura en caso de fallecimiento.', precio: 200 },
    { id: '3', nombre: 'Seguro médico', descripcion: 'Incluye atención médica y hospitalaria.', precio: 180 }
  ];

  const bankInfo = {
    banco: 'BBVA México',
    titular: 'Asociación Deportiva Estatal AC',
    cuenta: '0123456789 01',
    clabe: '012 180 0001234567 89',
    referencia: 'RHX-CL26-001'
  };

  const totalAsignados = Object.values(asignacionSeguros).reduce((acc, val) => acc + val, 0);
  const totalPagar = catalogoSeguros.reduce((acc, seg) => acc + (asignacionSeguros[seg.id] || 0) * seg.precio, 0);
  const segurosRequeridos = numPersonas > 0 ? numPersonas + 1 : 0; // Jugadores + Presidente
  const jugadoresRestantes = segurosRequeridos - totalAsignados;

  // PASO 2: Documentos
  const [documents, setDocuments] = useState({});
  const [ocrResults, setOcrResults] = useState({});
  const [, setFotoPreview] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState({});
  const [telefono, setTelefono] = useState('');
  const [tipoAfiliacion, setTipoAfiliacion] = useState('');
  const [asociacion, setAsociacion] = useState('');
  const [liga, setLiga] = useState('');
  const [equipo, setEquipo] = useState('');

  const requisitos = [
    { documento: 'actaNacimiento', nombre: 'Acta de nacimiento' },
    { documento: 'identificacion', nombre: 'Identificación oficial' },
    { documento: 'fotografia', nombre: 'Fotografía (Imagen)' },
    { documento: 'formatoAfiliacion', nombre: 'Formato de afiliación firmado', hasDownload: true }
  ];

  // ================== METODOS DE NAVEGACIÓN ==================
  const handleGuardarYSalir = async () => {
    if (numPersonas <= 0) {
      setError('Debes ingresar el número de jugadores para guardar datos.');
      return;
    }
    if (totalAsignados !== segurosRequeridos) {
      setError(`Debes asignar el seguro a todos los jugadores y a ti mismo (Presidente). Faltan ${jugadoresRestantes} por asignar.`);
      return;
    }

    try {
      // Guardamos la configuración visual de forma local
      const dataToSave = {
        numPersonas,
        asignacionSeguros,
        pasoActual: 1,
        fechaGuardado: new Date().toISOString()
      };
      localStorage.setItem('afaem_pre_registro_guardado', JSON.stringify(dataToSave));

      Swal.fire({
        title: 'Progreso guardado localmente',
        text: 'Tus datos se han guardado en este navegador. Cuando tengas tu comprobante de pago, regresa para subirlo y generar tu orden oficial.',
        icon: 'success',
        confirmButtonColor: '#0b4ea6'
      }).then(() => {
        handleLogout();
      });
    } catch (err) {
      console.error('Error al guardar datos:', err);
      Swal.fire({ title: 'Error', text: err.message, icon: 'error' });
    }
  };

  const irSiguientePaso = async () => {
    setError(null);
    if (pasoActual === 0) {
      setPasoActual(1);
    } else if (pasoActual === 1) {
      if (!ordenPendienteId) {
        if (numPersonas <= 0) {
          setError('Debes ingresar el número de jugadores.');
          return;
        }
        if (totalAsignados !== segurosRequeridos) {
          setError(`Debes asignar el seguro a todos los jugadores y a ti mismo (Presidente). Faltan ${jugadoresRestantes} por asignar.`);
          return;
        }
      }

      if (!comprobantePago) {
        setError('Debes subir el comprobante de pago para continuar.');
        return;
      }

      try {
        Swal.fire({
          title: ordenPendienteId ? 'Subiendo comprobante...' : 'Creando Orden...',
          html: ordenPendienteId ? 'Subiendo tu comprobante de pago. <b>Por favor espere.</b>' : 'Generando tu orden de pago y subiendo el comprobante. <b>Por favor espere.</b>',
          allowOutsideClick: false,
          didOpen: () => { Swal.showLoading(); }
        });

        const token = localStorage.getItem('token');
        if (!token) throw new Error('No se encontró autenticación. Por favor inicia sesión.');

        let idParaComprobante = ordenPendienteId;

        // 1. Si no existe la orden, hay que crearla
        if (!idParaComprobante) {
          const segurosPayload = [];
          for (const [idStr, cant] of Object.entries(asignacionSeguros)) {
            if (cant > 0) {
              segurosPayload.push({
                SeguroId: parseInt(idStr, 10),
                Cantidad: cant
              });
            }
          }

          const ordenPayload = {
            CantidadJugadores: numPersonas,
            Seguros: segurosPayload
          };

          const resOrden = await fetch(`${API_BASE}/ordenes-pago/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(ordenPayload)
          });

          if (!resOrden.ok) {
            const errData = await resOrden.json().catch(() => ({}));
            throw new Error(errData.detail || 'Fallo al crear la orden de pago');
          }

          const ordenData = await resOrden.json();
          // Extraemos el ID
          const ordenId = ordenData.orden_pago_id || ordenData.OrdenPagoId || ordenData.id;
          idParaComprobante = ordenId || ordenData;
        }

        // 2. Subir Comprobante
        const formData = new FormData();
        formData.append('archivo', comprobantePago);

        const resComprobante = await fetch(`${API_BASE}/ordenes-pago/${idParaComprobante}/comprobante`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (!resComprobante.ok) {
          const errData = await resComprobante.json().catch(() => ({}));
          throw new Error('La orden se creó pero falló al subir el comprobante: ' + (errData.detail || ''));
        }

        // Guardar para la UI local de front-end
        const preRegistroData = {
          numPersonas,
          asignacionSeguros,
          totalPagar,
          fechaRegistro: new Date().toISOString()
        };
        localStorage.setItem('afaem_pre_registro', JSON.stringify(preRegistroData));

        Swal.fire({
          title: '¡Evidencia Recibida!',
          text: 'Se ha creado la orden de pago y enviado tu comprobante a revisión.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });

        // Ir a pantalla de espera
        setEstadoPago(1); // Pendiente
        setPasoActual(2);
      } catch (err) {
        console.error('Error al procesar el pago:', err);
        Swal.fire({
          title: 'Error',
          text: err.message,
          icon: 'error'
        });
      }
    }
  };

  const irPasoAnterior = () => {
    setError(null);
    if (pasoActual > 0) {
      setPasoActual(pasoActual - 1);
    }
  };

  // ================== MANEJADORES PASO 2 (OCR Y FOTO) ==================
  const handleFileUpload = (documentKey, file) => {
    if (!file) return;

    if (documentKey === "fotografia") {
      setFotoPreview(null);
      setDocuments(prev => {
        const updated = { ...prev };
        delete updated.fotografia;
        return updated;
      });
      procesarFotografia(file);
    } else {
      setDocuments(prev => ({ ...prev, [documentKey]: file }));
      // Invocar OCR real al subir
      if (['actaNacimiento', 'identificacion'].includes(documentKey)) {
        procesarOCRReal(documentKey, file);
      }
    }
  };

  const procesarOCRReal = async (docKey, file) => {
    Swal.fire({
      title: 'Analizando Documento...',
      html: 'Extrayendo información vía OCR. <b>Por favor espere.</b>',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const formData = new FormData();
      formData.append('file_id', file);

      // Usamos el proxy configurado en vite.config.js
      const response = await fetch('/ocr-api', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Error al conectar con el servidor OCR');

      // Parsea el HTML del OCR para extraer los datos
      const htmlText = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, "text/html");

      const extractedData = {};
      const rows = doc.querySelectorAll('.dato-fila');

      rows.forEach(row => {
        const label = row.querySelector('.etiqueta')?.textContent?.toLowerCase() || '';
        const value = row.querySelector('.valor')?.textContent?.trim() || '';
        if (label.includes('curp')) extractedData.curp = value;
        if (label.includes('nombre')) extractedData.nombre = value;
        if (label.includes('nacionalidad')) extractedData.nacionalidad = value;
        if (label.includes('fecha de nacimiento')) extractedData.fecha_nac = value;
        if (label.includes('edad')) extractedData.edad = value;
        if (label.includes('documento')) extractedData.documento = value;
      });

      setOcrResults(prev => ({
        ...prev,
        ...extractedData,
        [docKey]: `OCR Procesado: ${extractedData.nombre}`
      }));

      if (extractedData.nombre) {
        Swal.fire({
          title: '¡Lectura Exitosa!',
          text: `Se detectó a: ${extractedData.nombre}`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        Swal.fire({
          title: 'Documento procesado',
          text: 'Se leyó el documento pero no se pudo extraer el nombre automáticamente.',
          icon: 'info',
          timer: 2000,
          showConfirmButton: false
        });
      }

    } catch (err) {
      console.error("Error OCR:", err);
      Swal.fire({
        title: 'Error OCR',
        text: 'No se pudo leer el documento de forma automática. Podrás continuar.',
        icon: 'warning'
      });
    }
  };

  const handleDownloadFormato = async () => {
    try {
      Swal.fire({
        title: 'Generando PDF...',
        text: 'Preparando tu formato de afiliación pre-llenado.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });

      // Cargar la plantilla real con campos de formulario
      const templateUrl = '/formato_afiliacion_directivo.pdf';
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

          if (nameLower.endsWith('.png')) {
            photoImage = await pdfDoc.embedPng(photoBytes);
          } else {
            photoImage = await pdfDoc.embedJpg(photoBytes);
          }

          // Coordenadas calculadas para el recuadro superior derecho
          firstPage.drawImage(photoImage, {
            x: 479,
            y: 676,
            width: 76,
            height: 90,
          });
          console.log("✅ Fotografía incrustada en el PDF");
        } catch (photoErr) {
          console.warn("⚠️ Error al incrustar foto:", photoErr);
        }
      }

      const { nombre, curp, fecha_nac, nacionalidad } = ocrResults;

      // Rellenar Nombre(s), Apellido Paterno, Apellido Materno
      if (nombre && nombre !== "No detectado") {
        const parts = nombre.split(' ');
        if (parts.length >= 3) {
          form.getTextField('Apellido Paterno')?.setText(parts[0]);
          form.getTextField('Apellido Materno')?.setText(parts[1]);
          form.getTextField('Nombres')?.setText(parts.slice(2).join(' '));
        } else if (parts.length === 2) {
          form.getTextField('Apellido Paterno')?.setText(parts[0]);
          form.getTextField('Nombres')?.setText(parts[1]);
        } else {
          form.getTextField('Nombres')?.setText(nombre);
        }
      }

      // CURP
      if (curp && curp !== "No detectado") {
        form.getTextField('CURP o Clave Única de Registro de Población')?.setText(curp);
      }

      // Fecha de Nacimiento
      if (fecha_nac && fecha_nac !== "No detectada") {
        form.getTextField('Fecha de Nacimiento')?.setText(fecha_nac);
      }

      // Correo electrónico
      const email = user.Correo || user.correo || user.email || localStorage.getItem('email') || '';
      if (email) {
        form.getTextField('Correo electrónico')?.setText(email);
      }

      // Sexo (extraer de CURP: posición 10, H=Hombre, M=Mujer)
      if (curp && curp.length >= 11) {
        const sexoChar = curp.charAt(10).toUpperCase();
        const sexoTexto = sexoChar === 'H' ? 'MASCULINO' : sexoChar === 'M' ? 'FEMENINO' : '';
        if (sexoTexto) form.getTextField('Sexo')?.setText(sexoTexto);
      }

      // Nacionalidad
      if (nacionalidad) {
        form.getTextField('Lugar de Nacimiento')?.setText(nacionalidad);
      }

      // Teléfono
      if (telefono) {
        form.getTextField('Teléfono')?.setText(telefono);
      }

      // Tipo de afiliación
      if (tipoAfiliacion) {
        form.getTextField('fill_20')?.setText(tipoAfiliacion);
      }

      // Asociación, Liga, Equipo
      if (asociacion) form.getTextField('Asociación')?.setText(asociacion.toUpperCase());
      if (liga) form.getTextField('Liga')?.setText(liga.toUpperCase());
      if (equipo) form.getTextField('Equipo')?.setText(equipo.toUpperCase());

      // Fecha automática (A __ de __ del 20__)
      const hoy = new Date();
      const dia = String(hoy.getDate()).padStart(2, '0');
      const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
      const mes = meses[hoy.getMonth()];
      const anio = String(hoy.getFullYear()).slice(-2);

      form.getTextField('A')?.setText(dia);
      form.getTextField('de')?.setText(mes);
      form.getTextField('del 20')?.setText(anio);

      // Cargo: Presidente
      form.getTextField('Cargo')?.setText('PRESIDENTE');

      // Generar bytes del PDF
      const pdfBytes = await pdfDoc.save();

      // Descargar usando data URI (evita el bug de Safari con blob URLs)
      const uint8 = new Uint8Array(pdfBytes);
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < uint8.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, uint8.subarray(i, i + chunkSize));
      }
      const base64 = btoa(binary);
      const dataUri = `data:application/pdf;base64,${base64}`;

      const safeNombre = (nombre || 'Presidente').toString().replace(/[^a-zA-Z0-9_\s]/g, '').trim();
      const link = document.createElement('a');
      link.href = dataUri;
      link.download = `Formato_Afiliacion_${safeNombre}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => document.body.removeChild(link), 200);

      Swal.fire('¡Listo!', 'El formato se ha descargado correctamente.', 'success');
    } catch (err) {
      console.error("Error generando PDF:", err);
      Swal.fire('Error', 'No se pudo generar el PDF. ' + err.message, 'error');
    }
  };

  const procesarFotografia = async (archivo) => {
    Swal.fire({
      title: 'Validando Fotografía...',
      html: 'Verificando formato, rostros y calidad. <b>Por favor espere.</b>',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const data = await validarFotografia(archivo);
      if (data.valido) {
        setFotoPreview(`data:${data.tipo_imagen};base64,${data.imagen}`);
        setDocuments(prev => ({ ...prev, fotografia: archivo }));
        Swal.fire({
          title: '¡Fotografía Aceptada!',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      } else {
        setFotoPreview(null);
        setError(data.mensaje);
        Swal.fire({
          title: 'Error en la fotografía',
          text: data.mensaje,
          icon: 'error'
        });
      }
    } catch (err) {
      setFotoPreview(null);
      Swal.fire({
        title: 'Error de validación',
        text: err.message || 'No se pudo procesar la foto.',
        icon: 'error'
      });
    }
  };

  const handleLogout = () => {
    // Solo borramos las llaves de sesión (no borramos afaem_pre_registro_guardado)
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('UsuarioId');
    localStorage.removeItem('email');
    localStorage.removeItem('nombre_usuario');
    navigate('/');
  };

  const handleSolicitarRegistro = async () => {
    try {
      setLoading(true);
      setError(null);

      // Verify user/persona ID
      let personaId = localStorage.getItem('UsuarioId') || user.id || user.usuario_id || user.UsuarioId;

      // Fallback: Si no está en storage, intentar extraerlo del token
      if (!personaId) {
        const token = localStorage.getItem('token');
        const decoded = parseJwt(token);
        if (decoded && decoded.sub) {
          personaId = decoded.sub;
          console.log('🆔 ID recuperado del Token en PreRegistro:', personaId);
        }
      }

      if (!personaId) {
        throw new Error('No se encontró el ID del usuario en la sesión.');
      }

      // Verify all 4 documents are present
      const requiredDocs = ['actaNacimiento', 'identificacion', 'fotografia', 'formatoAfiliacion'];
      for (const docKey of requiredDocs) {
        if (!documents[docKey]) {
          throw new Error(`Falta subir el documento: ${requisitos.find(r => r.documento === docKey)?.nombre}`);
        }
      }

      Swal.fire({
        title: 'Subiendo Documentos...',
        html: 'Enviando archivos al servidor. <b>Por favor espere.</b>',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });

      const token = localStorage.getItem('token');

      // Upload each document
      for (const docKey of requiredDocs) {
        const file = documents[docKey];
        const formData = new FormData();
        formData.append('documento_afiliacion_ids', 3); // Hardcoded to 3 as requested
        formData.append('archivo', file);

        const response = await fetch(`${API_BASE}/documentos/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
            // Note: Do NOT set Content-Type for FormData, the browser handles the multipart boundary automatically
          },
          body: formData
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(`Error subiendo ${docKey}: ${errData.detail || response.statusText}`);
        }
      }

      // Save pre-registro data strictly for frontend state tracking
      const preRegistroData = {
        numPersonas,
        asignacionSeguros,
        totalPagar,
        fechaRegistro: new Date().toISOString()
      };
      localStorage.setItem('afaem_pre_registro', JSON.stringify(preRegistroData));

      Swal.fire({
        title: '¡Registro Exitoso!',
        text: 'Tus documentos han sido subidos correctamente.',
        icon: 'success',
        confirmButtonColor: '#0b4ea6'
      }).then(() => {
        navigate('/presidente-equipo');
      });

    } catch (err) {
      console.error("Error en upload:", err);
      setError(err.message || 'Error al enviar los documentos.');
      Swal.fire({
        title: 'Error',
        text: err.message || 'No se pudieron subir los documentos.',
        icon: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pre-registro-container">
      <style>{`
        .pre-registro-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #0b4ea6 0%, #063f82 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 40px 20px;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
        
        .header-logos {
          width: 100%;
          max-width: 1000px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
        }

        .afaem-logo { height: 60px; }
        .fmf-logos { height: 40px; display: flex; gap: 20px; }
        
        .card-main {
          background: white;
          border-radius: 20px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          width: 100%;
          max-width: 800px;
          overflow: hidden;
          animation: fadeIn 0.5s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .welcome-content {
          padding: 60px 40px;
          text-align: center;
        }

        .title-large { font-size: 32px; font-weight: 800; color: #1e293b; margin-bottom: 10px; }
        .subtitle { font-size: 18px; font-weight: 600; color: #475569; margin-bottom: 30px; }
        .welcome-text { font-size: 16px; color: #64748b; line-height: 1.6; margin: 30px 0; border-top: 1px solid #e2e8f0; padding-top: 30px; }

        .btn-blue {
          background: #5d87e5;
          color: white;
          border: none;
          padding: 14px 60px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 16px;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .btn-blue:hover { transform: scale(1.02); background: #4a74d1; }

        .link-logout { color: #64748b; text-decoration: none; font-size: 14px; margin-top: 20px; display: inline-block; }
        
        /* Proceso Header */
        .process-header {
          background: #f8fafc;
          padding: 20px;
          text-align: center;
          border-bottom: 1px solid #e2e8f0;
        }
        .process-title { font-size: 20px; font-weight: 800; color: #1e293b; margin-bottom: 20px; }
        .step-icons { display: flex; justify-content: center; gap: 60px; }
        .step-icon-item { display: flex; flex-direction: column; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; color: #94a3b8; }
        .step-icon-item.active { color: #1e293b; }
        .icon-circle { width: 44px; height: 44px; border-radius: 50%; background: #94a3b8; color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; }
        .step-icon-item.active .icon-circle { background: #0b4ea6; }

        .content-body { padding: 30px 40px; }
        .section-title-small { font-size: 16px; font-weight: 800; color: #1e293b; text-align: center; margin-bottom: 25px; }
        
        /* Ocultar flechas de numero */
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }

        .input-group { 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          gap: 20px; 
          margin-bottom: 30px; 
          background: #f8fafc;
          padding: 15px;
          border-radius: 12px;
        }
        .input-label { font-size: 14px; font-weight: 700; color: #1e293b; margin: 0; }
        .input-number { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; font-size: 16px; width: 80px; text-align: center; }

        .insurance-card {
          background: #f1f7ff;
          border-radius: 12px;
          padding: 15px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .insurance-info h4 { font-size: 15px; font-weight: 800; color: #0b4ea6; margin-bottom: 2px; }
        .insurance-info p { font-size: 11px; color: #64748b; margin: 0; }
        .insurance-input { width: 60px; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; text-align: center; }

        .assigned-bar {
          background: #f0fdf4;
          border-radius: 8px;
          padding: 10px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          font-weight: 700;
          color: #166534;
          margin: 20px 0;
        }

        .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px; }
        .summary-card { border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; }
        .summary-card h5 { font-size: 15px; font-weight: 800; color: #0b4ea6; margin-bottom: 20px; }
        .summary-row { display: flex; justify-content: space-between; font-size: 13px; color: #475569; margin-bottom: 12px; }
        .total-row { display: flex; justify-content: space-between; font-size: 15px; font-weight: 800; color: #0b4ea6; border-top: 1px solid #e2e8f0; padding-top: 15px; }

        .bank-info-item { font-size: 13px; margin-bottom: 12px; }
        .bank-info-label { color: #64748b; display: block; margin-bottom: 2px; }
        .bank-info-value { font-weight: 700; color: #1e293b; }
        .referencia-badge { background: #fffbeb; color: #92400e; padding: 2px 8px; border-radius: 4px; font-size: 11px; }

        .upload-proof { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 30px; margin-top: 30px; text-align: left; }
        .file-input-custom { margin-top: 15px; display: flex; gap: 10px; align-items: center; }
        .btn-outline { border: 1px solid #cbd5e1; background: white; padding: 8px 16px; border-radius: 6px; font-size: 12px; cursor: pointer; }

        /* Step 2 Documentos */
        .doc-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 20px; 
          align-items: start; 
        }
        .doc-card { 
          border: 1px dashed #cbd5e1; 
          border-radius: 16px; 
          padding: 20px; 
          text-align: center; 
          display: flex; 
          flex-direction: column; 
          align-items: center;
          transition: border-color 0.2s;
          min-height: 280px;
          background: #fff;
        }
        .doc-card:hover { border-color: #0b4ea6; }
        .doc-card.success { background: #f0fdf4; border-style: solid; border-color: #10b981; }
        
        .doc-title { font-size: 14px; font-weight: 800; color: #0b4ea6; margin: 15px 0 10px; }
        .status-badge { padding: 2px 12px; border-radius: 12px; font-size: 10px; font-weight: 800; color: white; margin-bottom: 12px; text-transform: uppercase; }
        .file-name { 
          font-size: 11px; 
          font-weight: 700; 
          color: #1e293b; 
          margin-bottom: 12px; 
          white-space: nowrap; 
          overflow: hidden; 
          text-overflow: ellipsis; 
          max-width: 180px; 
        }
        
        .doc-actions { display: flex; gap: 8px; width: 100%; margin-bottom: 15px; }
        .btn-doc { flex: 1; background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px; border-radius: 8px; font-size: 11px; font-weight: 600; cursor: pointer; }
        .btn-download { flex: 1; background: #0b4ea6; color: white; border: none; padding: 8px; border-radius: 8px; font-size: 11px; font-weight: 600; cursor: pointer; }
        .link-details { font-size: 11px; color: #0b4ea6; text-decoration: underline; cursor: pointer; font-weight: 600; }
        .link-details:hover { color: #063f82; }
        .ocr-details-panel { 
          width: 100%; 
          margin-top: 8px; 
          background: #f8fafc; 
          border: 1px solid #e2e8f0; 
          border-radius: 8px; 
          padding: 8px 10px; 
          text-align: left; 
          animation: fadeIn 0.3s ease; 
          max-height: 200px;
          overflow-y: auto;
        }
        .ocr-details-panel .ocr-row { display: flex; justify-content: space-between; font-size: 10px; padding: 4px 0; border-bottom: 1px solid #f0f2f5; }
        .ocr-details-panel .ocr-row:last-child { border-bottom: none; }
        .ocr-details-panel .ocr-label { color: #64748b; font-weight: 600; }
        .ocr-details-panel .ocr-value { color: #1e293b; font-weight: 700; text-align: right; max-width: 60%; word-break: break-all; }

        .footer-nav { display: flex; justify-content: center; gap: 20px; margin-top: 40px; flex-wrap: wrap; }
        .btn-nav-blue { background: #5d87e5; color: white; border: none; padding: 12px 60px; border-radius: 12px; font-weight: 700; cursor: pointer; transition: 0.2s; }
        .btn-nav-blue:disabled { background: #94a3b8; cursor: not-allowed; opacity: 0.7; }
        .btn-nav-gray { background: #f1f5f9; color: #475569; border: none; padding: 12px 60px; border-radius: 12px; font-weight: 700; cursor: pointer; }
        .btn-nav-test { background: #f59e0b; color: white; border: none; padding: 12px 40px; border-radius: 12px; font-weight: 700; cursor: pointer; font-size: 13px; transition: transform 0.2s; }
        .btn-nav-test:hover { transform: scale(1.02); background: #d97706; }
      `}</style>

      {/* HEADER LOGOS */}
      <div className="header-logos">
        <img src={AfaemLogo} alt="AFAEM" className="afaem-logo" />
        <div className="fmf-logos">
          <img src={FmfLogo} alt="FMF" />
          <img src={AmateurLogo} alt="Amateur" />
        </div>
      </div>

      <div className="card-main">
        {/* PASO 0: BIENVENIDA */}
        {pasoActual === 0 && (
          <div className="welcome-content">
            <h1 className="title-large">Bienvenido, {user.Nombre || user.NombreUsuario || user.Correo || user.email || 'Usuario'}</h1>
            <p className="subtitle">Comencemos con tu registro inicial</p>
            <p className="welcome-text">
              Para activar tu cuenta y comenzar a gestionar tu equipo, necesitamos completar dos pasos.
            </p>
            <button className="btn-blue" onClick={irSiguientePaso}>Continuar</button>
            <br />
            <a href="#" className="link-logout" onClick={(e) => { e.preventDefault(); handleLogout(); }}>Cerrar sesión</a>
          </div>
        )}

        {/* PROCESO HEADER (PASO 1 Y 2) */}
        {(pasoActual === 1 || pasoActual === 3) && (
          <div className="process-header">
            <h2 className="process-title">Proceso de activación</h2>
            <div className="step-icons">
              <div className={`step-icon-item ${pasoActual === 1 ? 'active' : ''}`}>
                <div className="icon-circle"><FaMoneyBillWave /></div>
                CUOTAS
              </div>
              <div className={`step-icon-item ${pasoActual === 3 ? 'active' : ''}`}>
                <div className="icon-circle"><FaFileAlt /></div>
                DOCUMENTOS
              </div>
            </div>
          </div>
        )}

        {/* PASO 1: CUOTAS */}
        {pasoActual === 1 && (
          <div className="content-body">
            <h3 className="section-title-small">Selecciona el tipo de seguro para tu plantilla inicial</h3>

            {ordenPendienteId ? (
              <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '12px', border: '1px solid #bbf7d0', marginBottom: '25px', textAlign: 'center' }}>
                <h4 style={{ color: '#166534', fontWeight: '800', margin: '0 0 10px 0', fontSize: '18px' }}>🚀 Orden de Pago #{ordenPendienteId}</h4>
                <p style={{ color: '#15803d', fontSize: '14px', margin: 0 }}>
                  Ya tienes una orden activa. Para continuar, realiza tu pago y adjunta el comprobante en la sección inferior.
                </p>
              </div>
            ) : (
              <>
                <div className="input-group" style={{ flexDirection: 'column', gap: '10px' }}>
                  <label className="input-label" style={{ textAlign: 'center' }}>¿Cuántos jugadores tendrá tu equipo inicialmente?</label>
                  <input
                    type="number"
                    className="input-number"
                    value={numPersonas}
                    onChange={(e) => setNumPersonas(Number(e.target.value))}
                    style={{ marginTop: '5px' }}
                  />
                  <span style={{ fontSize: '11px', color: '#64748b' }}>(Recuerda: Deberás asignar un seguro por cada jugador, **más un seguro extra para ti como Presidente**)</span>
                </div>

                <p style={{ fontSize: '12px', fontWeight: '800', textAlign: 'left', marginBottom: '20px' }}>
                  Distribución de Seguros (Obligatorio)
                </p>

                {catalogoSeguros.map(seg => (
                  <div key={seg.id} className="insurance-card">
                    <div className="insurance-info">
                      <h4>{seg.nombre} <span style={{ fontSize: '14px', color: '#5d87e5' }}>${seg.precio} c/u</span></h4>
                      <p>{seg.descripcion}</p>
                    </div>
                    <input
                      type="number"
                      className="insurance-input"
                      value={asignacionSeguros[seg.id]}
                      onChange={(e) => setAsignacionSeguros({ ...asignacionSeguros, [seg.id]: Number(e.target.value) })}
                    />
                  </div>
                ))}

                <div className="assigned-bar">
                  <span>Seguros asignados (Jugadores + Presid.): {totalAsignados}/{segurosRequeridos}</span>
                  {numPersonas > 0 && totalAsignados === segurosRequeridos ? <span style={{ color: '#166534' }}>Todos asignados</span> : <span style={{ color: '#ef4444' }}>Pendientes</span>}
                </div>
              </>
            )}

            <div className="summary-grid" style={{ marginTop: '20px' }}>
              <div className="summary-card">
                <h5>{ordenPendienteId ? 'Detalles de la Orden' : 'Cuotas correspondientes'}</h5>
                {catalogoSeguros.map(seg => (
                  asignacionSeguros[seg.id] > 0 && (
                    <div key={seg.id} className="summary-row">
                      <span>{seg.nombre} (x{asignacionSeguros[seg.id]})</span>
                      <span>${seg.precio * asignacionSeguros[seg.id]}</span>
                    </div>
                  )
                ))}
                <div className="total-row">
                  <span>Total {ordenPendienteId ? 'a pagar' : 'estimado'}:</span>
                  <span>${totalPagar}</span>
                </div>
              </div>

              <div className="summary-card">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <h5>Depósito o transferencia</h5>
                  <span>📋</span>
                </div>
                <div className="bank-info-item">
                  <span className="bank-info-label">Banco:</span>
                  <span className="bank-info-value">{bankInfo.banco}</span>
                </div>
                <div className="bank-info-item">
                  <span className="bank-info-label">Cuenta:</span>
                  <span className="bank-info-value">{bankInfo.cuenta}</span>
                </div>
                <div className="bank-info-item">
                  <span className="bank-info-label">CLABE:</span>
                  <span className="bank-info-value">{bankInfo.clabe}</span>
                </div>
                <div className="bank-info-item">
                  <span className="bank-info-label">Referencia obligatoria:</span>
                  <span className="referencia-badge">{bankInfo.referencia}</span>
                </div>
              </div>
            </div>

            {ordenPendienteId && (
              <div className="upload-proof" style={{ border: '1px dashed #0b4ea6', background: 'white', marginTop: '30px' }}>
                <p style={{ fontSize: '14px', fontWeight: '800', color: '#0b4ea6', marginBottom: '5px' }}>
                  Paso 2: Sube tu comprobante de pago
                </p>
                <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '15px' }}>
                  Adjunta el comprobante (PDF o imagen) para procesar tu registro.
                </p>
                <div className="file-input-custom">
                  <input
                    type="file"
                    id="comprobante"
                    style={{ display: 'none' }}
                    onChange={(e) => setComprobantePago(e.target.files[0])}
                  />
                  <button
                    className="btn-outline"
                    onClick={() => document.getElementById('comprobante').click()}
                  >
                    {comprobantePago ? 'Cambiar archivo' : 'Seleccionar archivo'}
                  </button>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    {comprobantePago ? comprobantePago.name : 'No se ha seleccionado archivo'}
                  </span>
                </div>
              </div>
            )}

            {!ordenPendienteId ? (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px', marginBottom: '10px' }}>
                <button
                  onClick={handleGuardarYSalir}
                  style={{
                    background: '#0b4ea6',
                    color: 'white',
                    border: 'none',
                    padding: '16px 40px',
                    borderRadius: '12px',
                    fontWeight: '800',
                    fontSize: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 4px 12px rgba(11, 78, 166, 0.3)',
                    transition: 'transform 0.2s, background 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'scale(1.02)';
                    e.target.style.background = '#093d82';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.background = '#0b4ea6';
                  }}
                >
                  💾 Guardar y reanudar después
                </button>
              </div>
            ) : null}

            <div className="footer-nav">
              <button className="btn-nav-gray" onClick={irPasoAnterior}>Anterior</button>
              <button
                className="btn-nav-blue"
                onClick={irSiguientePaso}
                disabled={!comprobantePago}
              >
                {ordenPendienteId ? 'Subir Comprobante' : 'Siguiente'}
              </button>
            </div>
          </div>
        )}

        {/* PASO 2: ESPERANDO VALIDACIÓN / PAGO VALIDADO */}
        {pasoActual === 2 && (
          <div className="welcome-content">
            {estadoPago === 3 ? (
              /* PAGO VALIDADO */
              <>
                <h1 className="title-large">Bienvenido, {user.Nombre || user.NombreUsuario || user.Correo || user.email || 'Usuario'}</h1>
                <div style={{
                  display: 'inline-block',
                  background: '#10b981',
                  color: 'white',
                  padding: '6px 24px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: '700',
                  marginBottom: '10px'
                }}>Pago validado</div>
                <p className="welcome-text">
                  Tu comprobante de pago ha sido verificado correctamente. Ahora puedes continuar con la carga de los documentos.
                </p>
                <button className="btn-blue" onClick={() => setPasoActual(3)}>Continuar con documentos</button>
                <br />
                <a href="#" className="link-logout" onClick={(e) => { e.preventDefault(); handleLogout(); }}>Cerrar sesión</a>
              </>
            ) : (
              /* ESPERANDO VALIDACIÓN */
              <>
                <h1 className="title-large">Comprobante enviado correctamente</h1>
                <div className="welcome-text" style={{ textAlign: 'left' }}>
                  <p>Hemos recibido tu comprobante de pago. Será validado en un plazo de 3 a 5 días hábiles.<br />
                    Una vez validado, podrás continuar con la carga de los siguientes documentos:</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '20px 0', fontSize: '14px' }}>
                    <span>• Acta de nacimiento</span>
                    <span>• Fotografía</span>
                    <span>• Identificación oficial</span>
                    <span>• Formato de afiliación firmado</span>
                  </div>
                  <p style={{ fontSize: '14px', color: '#475569' }}>
                    Asegúrate de contar con estos archivos en formato digital para agilizar tu registro. Formatos permitidos: PDF, PNG o JPG.
                  </p>
                  <p style={{ fontSize: '14px', color: '#64748b', fontStyle: 'italic' }}>
                    Por el momento, no es posible realizar más acciones hasta que el pago sea validado.<br />
                    Puedes cerrar sesión o esta ventana y continuar más tarde.
                  </p>
                </div>
                <button style={{
                  background: '#64748b',
                  color: 'white',
                  border: 'none',
                  padding: '14px 60px',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '16px',
                  cursor: 'pointer'
                }} onClick={handleLogout}>Cerrar sesión</button>
                <br />
                <button className="btn-nav-test" style={{ marginTop: '15px' }} onClick={() => setPasoActual(3)}>Siguiente paso (pruebas) ⚡</button>
              </>
            )}
          </div>
        )}

        {/* PASO 3: DOCUMENTOS */}
        {pasoActual === 3 && (
          <div className="content-body">
            <h3 className="section-title-small">Sube tus documentos para completar tu registro</h3>
            <p style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', marginBottom: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
              Asegúrate de que sean legibles. Formatos permitidos: PDF, PNG o JPG
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px', background: '#f8fafc', padding: '20px', borderRadius: '12px 12px 0 0', border: '1px solid #e2e8f0', borderBottom: 'none' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', display: 'block', marginBottom: '6px' }}>Teléfono *</label>
                <input
                  type="tel"
                  placeholder="Ej: 7771234567"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', display: 'block', marginBottom: '6px' }}>Tipo de afiliación *</label>
                <select
                  value={tipoAfiliacion}
                  onChange={(e) => setTipoAfiliacion(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', background: 'white' }}
                >
                  <option value="">Selecciona...</option>
                  <option value="DIRECTIVO">Directivo</option>
                  <option value="PRESIDENTE">Presidente</option>
                  <option value="DELEGADO">Delegado</option>
                  <option value="REPRESENTANTE">Representante</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '25px', background: '#f8fafc', padding: '0 20px 20px 20px', borderRadius: '0 0 12px 12px', border: '1px solid #e2e8f0', borderTop: 'none' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', display: 'block', marginBottom: '6px' }}>Asociación</label>
                <input
                  type="text"
                  placeholder="Ej: MORELOS"
                  value={asociacion}
                  onChange={(e) => setAsociacion(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', display: 'block', marginBottom: '6px' }}>Liga</label>
                <input
                  type="text"
                  placeholder="Ej: LIGA ESTATAL"
                  value={liga}
                  onChange={(e) => setLiga(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', display: 'block', marginBottom: '6px' }}>Equipo</label>
                <input
                  type="text"
                  placeholder="Ej: ACADEMIA FC"
                  value={equipo}
                  onChange={(e) => setEquipo(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div className="doc-grid">
              {requisitos.map((doc, idx) => {
                const isUploaded = !!documents[doc.documento];
                const status = isUploaded ? 'En Revisión' : 'Pendiente';
                const color = isUploaded ? '#10b981' : '#f59e0b';

                return (
                  <div key={idx} className={`doc-card ${isUploaded ? 'success' : ''}`}>
                    <div style={{ fontSize: '40px', color: '#0b4ea6' }}><FaFileAlt /></div>
                    <h4 className="doc-title">{doc.nombre}</h4>
                    <div className="status-badge" style={{ background: color }}>{status}</div>
                    <div className="file-name">{isUploaded ? documents[doc.documento].name : 'Nombre del archivo'}</div>
                    <div className="doc-actions">
                      {doc.hasDownload && <button className="btn-download" onClick={handleDownloadFormato}>Descargar formato</button>}
                      <button className="btn-doc" onClick={() => document.getElementById(`file-${doc.documento}`).click()}>Seleccionar archivo</button>
                      <input type="file" id={`file-${doc.documento}`} style={{ display: 'none' }} onChange={(e) => handleFileUpload(doc.documento, e.target.files[0])} />
                    </div>
                    <span className="link-details" onClick={() => setDetailsOpen(prev => ({ ...prev, [doc.documento]: !prev[doc.documento] }))}>
                      {detailsOpen[doc.documento] ? '▲ Ocultar detalles' : '▼ Ver detalles'}
                    </span>
                    {detailsOpen[doc.documento] && (
                      <div className="ocr-details-panel">
                        {(doc.documento === 'actaNacimiento' || doc.documento === 'identificacion') && Object.keys(ocrResults).length > 0 ? (
                          <>
                            <div className="ocr-row"><span className="ocr-label">Nombre:</span><span className="ocr-value">{ocrResults.nombre || '—'}</span></div>
                            <div className="ocr-row"><span className="ocr-label">CURP:</span><span className="ocr-value">{ocrResults.curp || '—'}</span></div>
                            <div className="ocr-row"><span className="ocr-label">Fecha Nac.:</span><span className="ocr-value">{ocrResults.fecha_nac || '—'}</span></div>
                            <div className="ocr-row"><span className="ocr-label">Edad:</span><span className="ocr-value">{ocrResults.edad || '—'}</span></div>
                            <div className="ocr-row"><span className="ocr-label">Nacionalidad:</span><span className="ocr-value">{ocrResults.nacionalidad || '—'}</span></div>
                            <div className="ocr-row"><span className="ocr-label">Documento:</span><span className="ocr-value">{ocrResults.documento || '—'}</span></div>
                          </>
                        ) : doc.documento === 'fotografia' ? (
                          <div style={{ fontSize: '11px', color: '#64748b' }}>La fotografía se valida automáticamente (rostro, calidad, formato).</div>
                        ) : doc.documento === 'formatoAfiliacion' ? (
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Descarga el formato, fírmalo y vuelve a subirlo aquí.</div>
                        ) : (
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Sube el documento primero para ver los datos extraídos.</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="footer-nav">
              <button className="btn-nav-gray" onClick={() => setPasoActual(2)}>Anterior</button>
              <button className="btn-nav-blue" onClick={handleSolicitarRegistro}>Finalizar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PreRegistroPresidente;


