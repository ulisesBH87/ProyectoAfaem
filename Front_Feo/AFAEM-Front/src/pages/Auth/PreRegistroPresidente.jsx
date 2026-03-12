import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUpload } from 'react-icons/fa';
import AfaemLogo from '../../assets/afaem-logo@4x.png';
import FmfLogo from '../../assets/fmf-logo.png';
import AmateurLogo from '../../assets/amateur-logo.png';
import solicitudService from '../../services/solicitud';

function PreRegistroPresidente() {
      // Estado para resultados OCR
      const [ocrResults, setOcrResults] = useState({});

      // Simulación de envío a OCR
      const handleEnviarOCR = async (docKey) => {
        if (!documents[docKey]) {
          setError('Debes subir el archivo antes de enviar al OCR.');
          return;
        }
        setLoading(true);
        setError(null);
        // Simulación: espera 2 segundos y muestra resultado
        setTimeout(() => {
          setOcrResults(prev => ({
            ...prev,
            [docKey]: `Resultado simulado del OCR para ${docKey}`
          }));
          setLoading(false);
        }, 2000);
      };
    // Documentos fijos para evitar error 404
    const requisitos = [
      { documento: 'actaNacimiento', nombre: 'Acta de nacimiento' },
      { documento: 'identificacion', nombre: 'Identificación oficial' },
      { documento: 'fotografia', nombre: 'Fotografía' },
      { documento: 'formatoAfiliacion', nombre: 'Formato de afiliación' }
    ];
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
     // curp, rfc, sexoId, fechaNacimiento removed
  });
  // Validaciones
  const [valid, setValid] = useState({});
    // ...existing code...
  // Estado para correo en minúsculas
  const correoMin = (user?.email || user?.correo || '').toLowerCase();
  // Estado para registro en mayúsculas
  const nombreMay = (user?.Nombre || user?.nombre || '').toUpperCase();
  // Estado para preguntas de seguro y personas
  const [numPersonas, setNumPersonas] = useState(0);
  const [seguroId, setSeguroId] = useState('');
  const [pagoRealizado, setPagoRealizado] = useState(false);
  const [validandoPago, setValidandoPago] = useState(false);
  // Simulación de catálogo de seguros
  const catalogoSeguros = [
    { id: '1', nombre: 'Seguro contra accidentes', descripcion: 'Protege a los jugadores ante accidentes deportivos.', precio: 150 },
    { id: '2', nombre: 'Seguro de vida', descripcion: 'Cobertura en caso de fallecimiento.', precio: 200 },
    { id: '3', nombre: 'Seguro médico', descripcion: 'Incluye atención médica y hospitalaria.', precio: 180 }
  ];
  // Estado para comprobante de pago
  const [comprobantePago, setComprobantePago] = useState(null);
  // Estado para referencia bancaria
  const referenciaBancaria = 'AFAEM2026';
  const cuentaBancaria = '1234567890';
  // Estado para total a pagar
  const totalPagar = numPersonas && seguroId ? catalogoSeguros.find(s => s.id === seguroId)?.precio * numPersonas : 0;
  // Estado para documentos
  const [documents, setDocuments] = useState({});
  // Requisitos eliminados temporalmente por error 404
  // const [requisitos, setRequisitos] = useState([]);
  // const [tipoAfiliacionId, setTipoAfiliacionId] = useState(2); // PRESIDENTE DE EQUIPO = ID 2
  // const [requisitosLoading, setRequisitosLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // useEffect para cargar requisitos eliminado por error 404

  // MANEJAR SUBIDA DE ARCHIVOS
  const handleFileUpload = (documentKey, file) => {
    if (file) {
      setDocuments(prev => ({
        ...prev,
        [documentKey]: file
      }));
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSolicitarRegistro = async () => {
    try {
      // VALIDAR QUE TODOS LOS CAMPOS ESTÉN COMPLETOS
      if (!formData.curp.trim()) {
        setError('Por favor ingresa tu CURP');
        return;
      }
      if (!formData.rfc.trim()) {
        setError('Por favor ingresa tu RFC');
        return;
      }
      if (!formData.sexoId) {
        setError('Por favor selecciona tu sexo');
        return;
      }
      if (!formData.fechaNacimiento) {
        setError('Por favor selecciona tu fecha de nacimiento');
        return;
      }

      // VALIDAR FORMATO DE FECHA (DEBE SER YYYY-MM-DD)
      const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!fechaRegex.test(formData.fechaNacimiento)) {
        setError('Formato de fecha inválido. Debe ser YYYY-MM-DD');
        return;
      }

      // VALIDAR QUE LA FECHA SEA VÁLIDA
      const fechaParts = formData.fechaNacimiento.split('-');
      const fechaDate = new Date(parseInt(fechaParts[0]), parseInt(fechaParts[1]) - 1, parseInt(fechaParts[2]));
      if (isNaN(fechaDate.getTime())) {
        setError('La fecha de nacimiento no es válida');
        return;
      }

      // VALIDAR EDAD MÍNIMA (MAYOR DE 18 AÑOS)
      const hoy = new Date();
      const edad = hoy.getFullYear() - fechaDate.getFullYear();
      const mesActual = hoy.getMonth();
      const mesNacimiento = fechaDate.getMonth();
      if (edad < 18 || (edad === 18 && mesActual < mesNacimiento)) {
        setError('Debes ser mayor de 18 años');
        return;
      }

      setLoading(true);
      setError(null);

      console.log('📝 Datos del formulario:', {
        curp: formData.curp,
        rfc: formData.rfc,
        sexoId: formData.sexoId,
        fechaNacimiento: formData.fechaNacimiento
      });

      // ENVIAR SOLICITUD AL SERVIDOR CON LOS DATOS
      const response = await solicitudService.sendRegistroSolicitud(
        formData.curp,
        formData.rfc,
        parseInt(formData.sexoId),
        formData.fechaNacimiento
      );
      
      console.log('✅ Solicitud enviada exitosamente:', response);

      // REDIRIGIR A PRESIDENTE
      setTimeout(() => {
        navigate('/presidente-equipo');
      }, 1500);
    } catch (err) {
      console.error('❌ Error al enviar solicitud:', err);
      setError(
        err.response?.data?.message || 
        err.message ||
        'Error al enviar la solicitud. Por favor, intenta nuevamente.'
      );
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
          max-width: 580px;
          width: 100%;
          animation: slideUp 0.4s ease;
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .pre-registro-header {
          background: linear-gradient(135deg, #0b4ea6 0%, #063f82 100%);
          padding: 52px 32px 40px;
          text-align: center;
        }
        
        .pre-registro-logo-group {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 18px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        
        .pre-registro-logo-item {
          width: 52px;
          height: 52px;
          background: rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
        }
        
        .pre-registro-logo-item img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          filter: brightness(1.1);
        }
        
        .pre-registro-title {
          color: white;
          font-size: 22px;
          font-weight: 700;
          margin: 0;
          letter-spacing: 0.5px;
          line-height: 1.3;
        }
        
        .pre-registro-body {
          padding: 40px 32px;
        }
        
        .pre-registro-user-info {
          background: linear-gradient(135deg, #f8fafb 0%, #ffffff 100%);
          padding: 20px;
          border-radius: 10px;
          margin-bottom: 28px;
          border: 1px solid #e0e6ed;
        }
        
        .pre-registro-info-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          color: #2c3e50;
          margin-bottom: 10px;
        }
        
        .pre-registro-info-item:last-child {
          margin-bottom: 0;
        }
        
        .pre-registro-info-label {
          font-weight: 700;
          color: #0b4ea6;
          min-width: 90px;
        }
        
        .pre-registro-info-value {
          word-break: break-word;
        }
        
        .pre-registro-form-group {
          margin-bottom: 20px;
        }
        
        .pre-registro-label {
          display: block;
          font-weight: 700;
          color: #2c3e50;
          margin-bottom: 8px;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .pre-registro-input {
          width: 100%;
          padding: 12px 14px;
          border: 2px solid #e0e6ed;
          border-radius: 8px;
          font-size: 14px;
          background: #f8fafb;
          transition: all 0.3s ease;
          box-sizing: border-box;
          font-family: inherit;
        }
        
        .pre-registro-input:focus {
          outline: none;
          border-color: #0b4ea6;
          background-color: #ffffff;
          box-shadow: 0 0 0 4px rgba(11, 78, 166, 0.12);
        }
        
        .pre-registro-input:disabled {
          background-color: #f0f2f5;
          color: #aaa;
          cursor: not-allowed;
        }
        
        .pre-registro-input::placeholder {
          color: #cbd5e0;
        }
        
        .pre-registro-error {
          background: linear-gradient(135deg, #fee 0%, #fdd 100%);
          color: #d32f2f;
          padding: 12px 14px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 13px;
          border-left: 4px solid #d32f2f;
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        
        .pre-registro-button {
          width: 100%;
          padding: 13px;
          border: none;
          border-radius: 8px;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.3s ease;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        
        .pre-registro-button-primary {
          background: linear-gradient(135deg, #0b4ea6 0%, #063f82 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(11, 78, 166, 0.25);
        }
        
        .pre-registro-button-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(11, 78, 166, 0.35);
        }
        
        .pre-registro-button-secondary {
          background: #667085;
          color: white;
          box-shadow: 0 4px 15px rgba(102, 112, 133, 0.15);
        }
        
        .pre-registro-button-secondary:hover:not(:disabled) {
          background: #5a6373;
          transform: translateY(-2px);
        }
        
        .pre-registro-button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
        
        .pre-registro-button:last-child {
          margin-bottom: 0;
        }
        
        .pre-registro-success-icon {
          font-size: 24px;
          margin-right: 8px;
        }
        
        @media (max-width: 768px) {
          .pre-registro-header {
            padding: 36px 24px 28px;
          }
          
          .pre-registro-body {
            padding: 32px 24px;
          }
          
          .pre-registro-title {
            font-size: 20px;
          }
          
          .pre-registro-logo-item {
            width: 44px;
            height: 44px;
          }
        }
      `}</style>
      
      <div className="pre-registro-card">
        <div className="pre-registro-header">
          <div className="pre-registro-logo-group">
            <div className="pre-registro-logo-item">
              <img src={AfaemLogo} alt="AFAEM" />
            </div>
            <div className="pre-registro-logo-item">
              <img src={FmfLogo} alt="FMF" />
            </div>
            <div className="pre-registro-logo-item">
              <img src={AmateurLogo} alt="Sector Amateur" />
            </div>
          </div>
          <h1 className="pre-registro-title">
            ¡Bienvenido! 🎉
          </h1>
        </div>
        
        <div className="pre-registro-body">
          <>
            <div className="pre-registro-user-info">
              <div className="pre-registro-info-item">
                <span className="pre-registro-info-label">👤 Nombre:</span>
                <span className="pre-registro-info-value">{nombreMay || 'NO REGISTRADO'}</span>
              </div>
              <div className="pre-registro-info-item">
                <span className="pre-registro-info-label">📧 Email:</span>
                <span className="pre-registro-info-value">{correoMin || 'no registrado'}</span>
              </div>
              <div className="pre-registro-info-item">
                <span className="pre-registro-info-label">📱 Teléfono:</span>
                <span className="pre-registro-info-value">{user?.telefono || <span style={{ color: '#ccc' }}>No registrado</span>}</span>
              </div>
            </div>
            {error && (
              <div className="pre-registro-error">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}
            {/* SECCIÓN DE CUOTAS, SEGURO Y DOCUMENTOS */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ 
                fontSize: '15px', 
                fontWeight: 700, 
                color: '#0b4ea6', 
                margin: '0 0 16px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                DOCUMENTOS REQUERIDOS
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '20px',
                marginBottom: '40px'
              }}>
                {requisitos.map((doc, idx) => (
                  <div
                    key={doc.documento || idx}
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
                    onDrop={(e) => handleDrop(e, doc.documento)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'white';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '40px', marginBottom: '12px' }}>📄</div>
                      <h3 style={{
                        margin: '0 0 12px 0',
                        color: '#1e293b',
                        fontSize: '14px',
                        fontWeight: '700',
                        lineHeight: '1.3'
                      }}>
                        {doc.nombre}
                      </h3>
                      {/* Estado de carga */}
                      {documents[doc.documento] ? (
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
                          ✓ {documents[doc.documento].name}
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
                    {/* Input oculto */}
                    <input
                      type="file"
                      id={`file-${doc.documento}`}
                      accept="image/*,.pdf"
                      style={{ display: 'none' }}
                      onChange={(e) => handleFileUpload(doc.documento, e.target.files[0])}
                    />
                    <button
                      onClick={() => document.getElementById(`file-${doc.documento}`).click()}
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
                    {/* Botón OCR solo para acta, identificación y formato */}
                    {['actaNacimiento','identificacion','formatoAfiliacion'].includes(doc.documento) && (
                      <button
                        style={{
                          marginTop: '10px',
                          backgroundColor: '#38bdf8',
                          color: 'white',
                          border: 'none',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '700',
                          transition: 'all 0.2s ease'
                        }}
                        disabled={loading}
                        onClick={() => handleEnviarOCR(doc.documento)}
                      >
                        {loading ? '⏳ Procesando OCR...' : 'Procesar OCR'}
                      </button>
                    )}
                    {/* Mostrar resultado OCR */}
                    {ocrResults[doc.documento] && (
                      <div style={{marginTop:'10px',background:'#e0f2fe',color:'#0b4ea6',padding:'8px',borderRadius:'6px',fontSize:'13px',border:'1px solid #38bdf8'}}>
                        <strong>Resultado OCR:</strong><br />{ocrResults[doc.documento]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <button 
              className="pre-registro-button pre-registro-button-primary"
              onClick={handleSolicitarRegistro}
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? '⏳ Enviando solicitud...' : '✅ Solicitar registro'}
            </button>
          </>
          
          <button 
            className="pre-registro-button pre-registro-button-secondary"
            onClick={() => {
              // PARA PRUEBAS: guardar un email de prueba y navegar
              localStorage.setItem('email', 'prueba@test.com');
              localStorage.setItem('user', JSON.stringify({ email: 'prueba@test.com' }));
              navigate('/presidente-equipo');
            }}
          >
            Prueba rápida
          </button>
        </div>
      </div>
    </div>
  );
}

export default PreRegistroPresidente;
