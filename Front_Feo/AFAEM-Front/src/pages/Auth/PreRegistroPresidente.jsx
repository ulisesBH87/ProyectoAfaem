import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUpload, FaCheckCircle, FaChevronRight, FaChevronLeft, FaMoneyBillWave, FaFileAlt } from 'react-icons/fa';
import AfaemLogo from '../../assets/afaem-logo@4x.png';
import FmfLogo from '../../assets/fmf-logo.png';
import AmateurLogo from '../../assets/amateur-logo.png';
import solicitudService from '../../services/solicitud';
import { validarFotografia } from "../../services/foto";
import Swal from 'sweetalert2';
import { PDFDocument } from 'pdf-lib';

function PreRegistroPresidente() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  // Estados Generales
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pasoActual, setPasoActual] = useState(1); // 1 = Pago/Seguro, 2 = Documentos
  
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
  const jugadoresRestantes = numPersonas - totalAsignados;

  // PASO 2: Documentos
  const [documents, setDocuments] = useState({});
  const [ocrResults, setOcrResults] = useState({});
  const [fotoPreview, setFotoPreview] = useState(null);

  const requisitos = [
    { documento: 'actaNacimiento', nombre: 'Acta de nacimiento', accept: '.pdf,image/png,image/jpeg,image/jpg' },
    { documento: 'identificacion', nombre: 'Identificación oficial', accept: '.pdf,image/png,image/jpeg,image/jpg' },
    { documento: 'fotografia', nombre: 'Fotografía (Imagen)', accept: 'image/*' },
    { documento: 'formatoAfiliacion', nombre: 'Formato de afiliación firmado', accept: '.pdf,image/png,image/jpeg,image/jpg' }
  ];

  // ================== METODOS DE NAVEGACIÓN ==================
  const irSiguientePaso = () => {
    setError(null);
    if (pasoActual === 1) {
      if (numPersonas <= 0) {
        setError('Debes ingresar el número de personas.');
        return;
      }
      if (totalAsignados !== numPersonas) {
        setError(`Debes asignar el seguro a todos los jugadores. Faltan ${jugadoresRestantes} por asignar.`);
        return;
      }
      if (!comprobantePago) {
        setError('Debes subir el comprobante de pago para continuar.');
        return;
      }
      
      Swal.fire({
        title: 'Comprobante guardado',
        text: 'Hemos registrado tu pago para validación interna.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      setPasoActual(2);
    }
  };

  const irPasoAnterior = () => {
    setError(null);
    if (pasoActual > 1) {
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
      if (['actaNacimiento','identificacion'].includes(documentKey)) {
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
      formData.append('file', file);

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

      if (!extractedData.curp || extractedData.curp === "No detectado") {
        throw new Error('No se detectaron datos legibles en el documento.');
      }

      setOcrResults(prev => ({
        ...prev,
        ...extractedData,
        [docKey]: `OCR Procesado: ${extractedData.nombre}`
      }));

      Swal.fire({
        title: '¡Lectura Exitosa!',
        text: `Se detectó a: ${extractedData.nombre}`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });

    } catch (err) {
      console.error("Error OCR:", err);
      setOcrResults(prev => ({
        ...prev,
        [docKey]: `Error: No se pudo leer el documento.`
      }));
      Swal.fire({
        title: 'Error OCR',
        text: 'No se pudo leer el documento de forma automática. Podrás continuar, pero el formato no se pre-llenará.',
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

      const url = '/template.pdf';
      const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const form = pdfDoc.getForm();

      const { nombre, curp, fecha_nac } = ocrResults;

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
      
      if (curp && curp !== "No detectado") {
          form.getTextField('CURP o Clave Única de Registro de Población')?.setText(curp);
      }
      if (fecha_nac && fecha_nac !== "No detectada") {
          form.getTextField('Fecha de Nacimiento')?.setText(fecha_nac);
      }
      
      if (user.Correo) {
          form.getTextField('Correo electrónico')?.setText(user.Correo);
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Formato_Afiliacion_${nombre || 'Usuario'}.pdf`;
      link.click();

      Swal.fire('¡Listo!', 'El formato se ha generado correctamente.', 'success');
    } catch (err) {
      console.error("Error generando PDF:", err);
      Swal.fire('Error', 'No se pudo generar el PDF pre-llenado. Se descargará el formato base.', 'error');
      const link = document.createElement('a');
      link.href = '/template.pdf';
      link.download = 'Formato_Afiliacion_Base.pdf';
      link.click();
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

  // ================== ENVÍO FINAL ==================
  const handleSolicitarRegistro = async () => {
    try {
      setLoading(true);
      setError(null);

      // (Simulación de guardar documentos + solicitud al back)
      // Como ya no pedimos datos, enviamos cadenas vacías o valores nulos
      // Mapeamos los resultados del OCR a lo que el backend espera
      const curp = ocrResults.curp || '';
      
      // Derivamos RFC (primeros 10 de CURP + homoclave dummy)
      const rfc = curp ? (curp.substring(0, 10) + 'XXX') : '';
      
      // Derivamos SexoId del caracter 10 de la CURP (H=1, M=2, x=3)
      const sexoChar = curp ? curp.charAt(10).toUpperCase() : '';
      const sexoId = sexoChar === 'H' ? 1 : (sexoChar === 'M' ? 2 : 3);
      
      // Convertimos Fecha de Nacimiento de DD/MM/YYYY a YYYY-MM-DD
      let fechaISO = '';
      if (ocrResults.fecha_nac && ocrResults.fecha_nac.includes('/')) {
          const parts = ocrResults.fecha_nac.split('/');
          if (parts.length === 3) {
              fechaISO = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
      } else if (curp && curp.length >= 10) {
          // Fallback: extraer de la CURP (YYMMDD)
          const yy = curp.substring(4, 6);
          const mm = curp.substring(6, 8);
          const dd = curp.substring(8, 10);
          const anio = parseInt(yy) < 30 ? `20${yy}` : `19${yy}`;
          fechaISO = `${anio}-${mm}-${dd}`;
      }

      console.log("🚀 Enviando datos reales:", { curp, rfc, sexoId, fechaISO });

      await solicitudService.sendRegistroSolicitud(
        curp,
        rfc,
        sexoId,
        fechaISO
      );
      
      // PERSISTIR DATOS PARA EL SIGUIENTE PASO (CONFIGURAR EQUIPO)
      const preRegistroData = {
        numPersonas,
        asignacionSeguros,
        totalPagar,
        fechaRegistro: new Date().toISOString()
      };
      localStorage.setItem('afaem_pre_registro', JSON.stringify(preRegistroData));
      console.log("💾 Datos de pre-registro guardados en localStorage:", preRegistroData);

      Swal.fire({
        title: '¡Registro Exitoso!',
        text: 'Tu solicitud de presidente ha sido registrada.',
        icon: 'success',
        confirmButtonColor: '#0b4ea6'
      }).then(() => {
        navigate('/presidente-equipo');
      });

    } catch (err) {
      const statusCode = err?.response?.status;
      const backendDetail = err?.response?.data?.detail;
      const safeDetail = typeof backendDetail === 'string' ? backendDetail : '';
      const fallbackMsg = err?.response?.data?.message || err?.message || 'Error al enviar la solicitud.';
      const userMsg = statusCode === 500
        ? 'El servidor no pudo completar la solicitud de pre-registro. Ya registramos el intento; intenta nuevamente en unos minutos o avisa al equipo de backend.'
        : fallbackMsg;

      setError(userMsg);
      Swal.fire({
        title: statusCode === 500 ? 'Error del servidor' : 'Error',
        text: safeDetail || userMsg,
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
          align-items: center;
          justify-content: center;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
        }
        
        .pre-registro-card {
          background: white;
          border-radius: 14px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          max-width: 650px;
          width: 100%;
          animation: slideUp 0.4s ease;
        }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .pre-registro-header {
          background: linear-gradient(135deg, #0b4ea6 0%, #063f82 100%);
          padding: 30px 32px 20px;
          text-align: center;
        }
        
        .pre-registro-logo-group {
          display: flex;
          justify-content: center; align-items: center; gap: 15px; margin-bottom: 15px;
        }
        
        .pre-registro-logo-item {
          width: 45px; height: 45px; background: rgba(255, 255, 255, 0.12);
          border-radius: 10px; display: flex; align-items: center; justify-content: center; padding: 5px;
        }
        
        .pre-registro-logo-item img {
          max-width: 100%; max-height: 100%; object-fit: contain; filter: brightness(1.1);
        }
        
        .pre-registro-title {
          color: white; font-size: 20px; font-weight: 700; margin: 0;
        }

        .stepper-container {
          display: flex;
          justify-content: space-around;
          padding: 15px 32px;
          background: #f1f5f9;
          border-bottom: 1px solid #e2e8f0;
        }

        .step-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .step-item.active {
          color: #0b4ea6;
        }

        .step-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: white;
          border: 2px solid #cbd5e1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .step-item.active .step-icon {
          border-color: #0b4ea6;
          background: #0b4ea6;
          color: white;
        }
        .step-item.completed .step-icon {
          border-color: #10b981;
          background: #10b981;
          color: white;
        }
        
        .pre-registro-body {
          padding: 30px 32px;
        }

        .info-bancaria {
          background: #e0f2fe;
          border: 1px solid #38bdf8;
          border-radius: 8px;
          padding: 15px;
          margin-top: 15px;
        }

        .nav-buttons {
          display: flex;
          justify-content: space-between;
          margin-top: 25px;
          gap: 15px;
        }

        .btn {
          padding: 12px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: none;
          transition: all 0.2s ease;
        }

        .btn-outline {
          background: white;
          border: 1px solid #cbd5e1;
          color: #475569;
        }
        .btn-outline:hover { background: #f8fafc; }

        .btn-primary {
          background: #0b4ea6;
          color: white;
        }
        .btn-primary:hover { background: #063f82; }
        
        .btn-success {
          background: #10b981;
          color: white;
        }
        .btn-success:hover { background: #059669; }

      `}</style>
      
      <div className="pre-registro-card">
        <div className="pre-registro-header">
          <div className="pre-registro-logo-group">
            <div className="pre-registro-logo-item"><img src={AfaemLogo} alt="AFAEM" /></div>
            <div className="pre-registro-logo-item"><img src={FmfLogo} alt="FMF" /></div>
            <div className="pre-registro-logo-item"><img src={AmateurLogo} alt="Sector Amateur" /></div>
          </div>
          <h1 className="pre-registro-title">Pre-registro Presidente</h1>
        </div>

        {/* STEPPER */}
        <div className="stepper-container">
          <div className={`step-item ${pasoActual >= 1 ? 'active' : ''} ${pasoActual > 1 ? 'completed' : ''}`}>
            <div className="step-icon"><FaMoneyBillWave /></div>
            <span>Cuotas</span>
          </div>
          <div className={`step-item ${pasoActual >= 2 ? 'active' : ''}`}>
            <div className="step-icon"><FaFileAlt /></div>
            <span>Documentos</span>
          </div>
        </div>
        
        <div className="pre-registro-body">
          {error && (
            <div style={{background: '#fee', color: '#d32f2f', padding: '12px', borderRadius: '8px', marginBottom: '20px', borderLeft: '4px solid #d32f2f'}}>
              ⚠️ {error}
            </div>
          )}

          {/* ======================= PASO 1 (ANTES PASO 2) ======================= */}
          {pasoActual === 1 && (
            <div>
              <p style={{color:'#64748b', fontSize:'14px', marginBottom:'20px'}}>Antes de subir tus documentos, debes definir la cuota de seguro de tu equipo inicial.</p>
              
              <div style={{marginBottom:'15px'}}>
                <label style={{fontWeight:'bold', display:'block', marginBottom:'5px'}}>¿Cuántas personas tendrá tu equipo inicialmente?</label>
                <input type="number" min={1} value={numPersonas} onChange={e=>setNumPersonas(Number(e.target.value))} style={{padding:'8px', borderRadius:'6px', border:'1px solid #cbd5e1', width:'100px'}} />
              </div>

              <div style={{marginBottom:'20px'}}>
                <label style={{fontWeight:'bold', display:'block', marginBottom:'10px'}}>Distribución de Seguros (Obligatorio)</label>
                <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                  {catalogoSeguros.map(seg => (
                    <div key={seg.id} style={{padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px'}}>
                        <div>
                          <span style={{fontWeight: '600', color: '#1e293b'}}>{seg.nombre}</span>
                          <span style={{marginLeft: '8px', color: '#0b4ea6', fontWeight: 'bold'}}>${seg.precio} c/u</span>
                        </div>
                        <input 
                          type="number" 
                          min={0} 
                          value={asignacionSeguros[seg.id]} 
                          onChange={e => {
                            const val = parseInt(e.target.value) || 0;
                            setAsignacionSeguros(prev => ({ ...prev, [seg.id]: val }));
                          }}
                          style={{width: '70px', padding: '5px', borderRadius: '4px', border: '1px solid #cbd5e1'}}
                        />
                      </div>
                      <p style={{margin: 0, fontSize: '12px', color: '#64748b'}}>{seg.descripcion}</p>
                    </div>
                  ))}
                </div>
                
                <div style={{marginTop: '15px', padding: '10px', borderRadius: '6px', background: jugadoresRestantes === 0 ? '#f0fdf4' : (jugadoresRestantes < 0 ? '#fef2f2' : '#fff7ed'), border: `1px solid ${jugadoresRestantes === 0 ? '#22c55e' : (jugadoresRestantes < 0 ? '#ef4444' : '#f97316')}`}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', fontWeight: 'bold'}}>
                    <span>Total Jugadores: {numPersonas}</span>
                    <span style={{color: jugadoresRestantes === 0 ? '#15803d' : (jugadoresRestantes < 0 ? '#b91c1c' : '#c2410c')}}>
                      {jugadoresRestantes === 0 ? '✓ Todos asignados' : (jugadoresRestantes < 0 ? `⚠ Exceso: ${Math.abs(jugadoresRestantes)}` : `Pendientes: ${jugadoresRestantes}`)}
                    </span>
                  </div>
                </div>
              </div>

              {numPersonas > 0 && totalAsignados === numPersonas && (
                <div style={{ marginTop: '30px', animation: 'slideUp 0.4s ease' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '20px',
                    marginBottom: '25px'
                  }}>
                    {/* TARJETA CUOTAS */}
                    <div style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '20px',
                      backgroundColor: 'white',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                    }}>
                      <h5 style={{ marginBottom: '15px', color: '#0b4ea6', fontSize: '16px', fontWeight: 'bold' }}>
                         Cuotas correspondientes
                      </h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {catalogoSeguros.map(seg => (
                          asignacionSeguros[seg.id] > 0 && (
                            <div key={seg.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                              <span style={{ color: '#64748b' }}>{seg.nombre} (x{asignacionSeguros[seg.id]}):</span>
                              <strong style={{ color: '#0b4ea6' }}>${seg.precio * asignacionSeguros[seg.id]}</strong>
                            </div>
                          )
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', marginTop: '5px' }}>
                          <span style={{ fontWeight: 'bold', color: '#1e293b' }}>Total a pagar:</span>
                          <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#0b4ea6', background: '#dbeafe', padding: '4px 10px', borderRadius: '6px' }}>
                            ${totalPagar}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* TARJETA INFO BANCARIA */}
                    <div style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '20px',
                      backgroundColor: 'white',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                    }}>
                      <h5 style={{ marginBottom: '15px', color: '#0b4ea6', fontSize: '16px', fontWeight: 'bold' }}>
                        Depósito o transferencia
                      </h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                        <div>
                          <small style={{ color: '#64748b', display: 'block' }}>Banco:</small>
                          <strong style={{ color: '#1e293b' }}>{bankInfo.banco}</strong>
                        </div>
                        <div>
                          <small style={{ color: '#64748b', display: 'block' }}>Cuenta:</small>
                          <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#0b4ea6', fontWeight: 'bold' }}>{bankInfo.cuenta}</code>
                        </div>
                        <div>
                          <small style={{ color: '#64748b', display: 'block' }}>CLABE:</small>
                          <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#0b4ea6', fontWeight: 'bold' }}>{bankInfo.clabe}</code>
                        </div>
                        <div>
                          <small style={{ color: '#64748b', display: 'block' }}>Referencia:</small>
                          <span style={{ background: '#fef08a', color: '#92400e', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px' }}>{bankInfo.referencia}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SUBIDA DE COMPROBANTE INTEGRADA */}
                  <div style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '20px',
                    backgroundColor: '#f8fafc'
                  }}>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px', color: '#1e293b' }}>
                      Sube tu comprobante de pago
                    </label>
                    <input 
                      type="file" 
                      accept="image/*,.pdf" 
                      onChange={e => setComprobantePago(e.target.files[0])} 
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        backgroundColor: 'white',
                        cursor: 'pointer'
                      }} 
                    />
                    {comprobantePago && (
                      <div style={{ marginTop: '10px', color: '#059669', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        ✅ {comprobantePago.name}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="nav-buttons" style={{justifyContent: 'flex-end'}}>
                <button className="btn btn-primary" onClick={irSiguientePaso} disabled={totalAsignados !== numPersonas || !comprobantePago}>
                  Siguiente <FaChevronRight />
                </button>
              </div>
            </div>
          )}

          {/* ======================= PASO 2 (ANTES PASO 3) ======================= */}
          {pasoActual === 2 && (
            <div>
              <p style={{color:'#64748b', fontSize:'14px', marginBottom:'20px'}}>Sube los documentos requeridos. Puedes subir archivos en formato <strong>PDF, PNG o JPG</strong>.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
                {requisitos.map((doc, idx) => (
                  <div key={idx} style={{ border: '2px dashed #cbd5e1', borderRadius: '8px', padding: '15px', textAlign: 'center', backgroundColor: documents[doc.documento] ? '#f0fdf4' : 'white' }}>
                    
                    <div style={{fontSize:'24px', marginBottom:'10px', color:'#0b4ea6'}}><FaFileAlt /></div>
                    
                    <h4 style={{fontSize:'13px', margin:'0 0 10px 0', color:'#334155'}}>{doc.nombre}</h4>
                    
                    {doc.documento === "fotografia" && fotoPreview && (
                      <img src={fotoPreview} alt="Preview" style={{width:'100%', maxHeight:'120px', objectFit:'cover', borderRadius:'6px', marginBottom:'10px'}} />
                    )}

                    {documents[doc.documento] ? (
                      <div style={{color:'#10b981', fontSize:'12px', fontWeight:'bold', marginBottom:'10px'}}>
                        <FaCheckCircle /> {documents[doc.documento].name}
                      </div>
                    ) : (
                      <div style={{color:'#fbbf24', fontSize:'12px', fontWeight:'bold', marginBottom:'10px'}}>
                        Pendiente
                      </div>
                    )}

                    <input type="file" id={`file-${doc.documento}`} accept={doc.accept} style={{ display: 'none' }} onChange={(e) => handleFileUpload(doc.documento, e.target.files[0])} />
                    <button onClick={() => document.getElementById(`file-${doc.documento}`).click()} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', width: '100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'5px' }}>
                      <FaUpload /> Subir Archivo
                    </button>
                    {doc.documento === 'formatoAfiliacion' && (
                        <div style={{marginTop: '10px', fontSize: '11px'}}>
                          <a 
                            href="#" 
                            onClick={(e) => { 
                              e.preventDefault(); 
                              if (documents.identificacion && documents.fotografia) {
                                handleDownloadFormato(); 
                              }
                            }}
                            style={{ 
                              color: (!documents.identificacion || !documents.fotografia) ? '#94a3b8' : '#003366', 
                              fontWeight: 'bold', 
                              textDecoration: 'underline',
                              cursor: (!documents.identificacion || !documents.fotografia) ? 'not-allowed' : 'pointer',
                              fontSize: '11px'
                            }}
                          >
                            Descargar formato pre-llenado aquí
                          </a>
                        </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="nav-buttons">
                <button className="btn btn-outline" disabled={loading} onClick={irPasoAnterior}>
                  <FaChevronLeft /> Anterior
                </button>
                <button 
                  className="btn btn-success" 
                  disabled={loading || !documents.identificacion || !documents.fotografia || !documents.formatoAfiliacion} 
                  onClick={handleSolicitarRegistro}
                >
                  {loading ? 'Enviando...' : <><FaCheckCircle /> Finalizar Registro</>}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default PreRegistroPresidente;


