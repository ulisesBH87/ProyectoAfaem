import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AfaemLogo from '../../assets/afaem-logo@4x.png';
import FmfLogo from '../../assets/fmf-logo.png';
import AmateurLogo from '../../assets/amateur-logo.png';
import solicitudService from '../../services/solicitud';

export default function PreRegistroPresidente() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    curp: '',
    rfc: '',
    sexoId: '',
    fechaNacimiento: ''
  });

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
          <div className="pre-registro-user-info">
            <div className="pre-registro-info-item">
              <span className="pre-registro-info-label">👤 Nombre:</span>
              <span className="pre-registro-info-value">
                {user?.Nombre || user?.nombre || 'No registrado'}
              </span>
            </div>
            <div className="pre-registro-info-item">
              <span className="pre-registro-info-label">📧 Email:</span>
              <span className="pre-registro-info-value">{user?.email || user?.correo}</span>
            </div>
            <div className="pre-registro-info-item">
              <span className="pre-registro-info-label">📱 Teléfono:</span>
              <span className="pre-registro-info-value">
                {user?.telefono || <span style={{ color: '#ccc' }}>No registrado</span>}
              </span>
            </div>
          </div>
          
          {error && (
            <div className="pre-registro-error">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}
          
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ 
              fontSize: '15px', 
              fontWeight: 700, 
              color: '#0b4ea6', 
              margin: '0 0 16px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Información adicional requerida
            </h3>
            
            <div className="pre-registro-form-group">
              <label className="pre-registro-label" htmlFor="curp">CURP (18 caracteres) <span style={{color:'#d32f2f'}}>*</span></label>
              <input
                id="curp"
                type="text"
                name="curp"
                value={formData.curp}
                onChange={handleInputChange}
                placeholder="ABCD123456HDFRTI09"
                maxLength={18}
                className="pre-registro-input"
                disabled={loading}
              />
            </div>
            
            <div className="pre-registro-form-group">
              <label className="pre-registro-label" htmlFor="rfc">RFC (12-13 caracteres) <span style={{color:'#d32f2f'}}>*</span></label>
              <input
                id="rfc"
                type="text"
                name="rfc"
                value={formData.rfc}
                onChange={handleInputChange}
                placeholder="ABCD123456DF9"
                maxLength={13}
                className="pre-registro-input"
                disabled={loading}
              />
            </div>
            
            <div className="pre-registro-form-group">
              <label className="pre-registro-label" htmlFor="sexoId">Sexo <span style={{color:'#d32f2f'}}>*</span></label>
              <select
                id="sexoId"
                name="sexoId"
                value={formData.sexoId}
                onChange={handleInputChange}
                className="pre-registro-input"
                disabled={loading}
              >
                <option value="">-- Selecciona una opción --</option>
                <option value="1">Masculino</option>
                <option value="2">Femenino</option>
                <option value="3">No binario</option>
              </select>
            </div>
            
            <div className="pre-registro-form-group">
              <label className="pre-registro-label" htmlFor="fechaNacimiento">Fecha de nacimiento <span style={{color:'#d32f2f'}}>*</span></label>
              <input
                id="fechaNacimiento"
                type="date"
                name="fechaNacimiento"
                value={formData.fechaNacimiento}
                onChange={handleInputChange}
                className="pre-registro-input"
                disabled={loading}
              />
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
          
          <button 
            className="pre-registro-button pre-registro-button-secondary"
            onClick={() => {
              // PARA PRUEBAS: guardar un email de prueba y navegar
              localStorage.setItem('email', 'prueba@test.com');
              localStorage.setItem('user', JSON.stringify({ email: 'prueba@test.com' }));
              navigate('/presidente-equipo');
            }}
            style={{ background: '#28a745' }}
          >
            → Ir al panel de presidente
          </button>
          
          <button 
            className="pre-registro-button pre-registro-button-secondary"
            onClick={() => {
              // GUARDAR EMAIL EN LOCALSTORAGE ANTES DE NAVEGAR
              const userEmail = localStorage.getItem('email');
              if (userEmail) {
                navigate('/presidente-equipo/admin-solicitudes');
              } else {
                alert('Por favor inicia sesión primero');
                navigate('/ingresar');
              }
            }}
            disabled={loading}
            style={{ background: '#6366f1' }}
          >
            📋 Ir a solicitudes como administrador
          </button>
          
          <button 
            className="pre-registro-button pre-registro-button-secondary"
            onClick={() => navigate('/ingresar')}
            disabled={loading}
          >
            ← Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
}
