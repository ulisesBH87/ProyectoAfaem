import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaFootballBall, FaTags, FaCalendar } from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../styles/dashboard.css';
import DashboardSidebar from '../../components/DashboardSidebar';
import DashboardHeader from '../../components/DashboardHeader';
import { createTeam } from '../../services/teams';

export default function CrearEquipo() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    modality: '',
    category: '',
    season: '',
    paymentProof: null,
    agreedToTerms: false
  });

  const [modalData, setModalData] = useState({
    teamName: '',
    teamLogo: null
  });

  const [errors, setErrors] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const modalities = [
    { id: 'futbol7', name: 'Fútbol 7', description: 'Hasta 14 jugadores' },
    { id: 'futbol9', name: 'Fútbol 9', description: 'Hasta 18 jugadores' },
    { id: 'futbol11', name: 'Fútbol 11', description: 'Hasta 25 jugadores' }
  ];

  const categories = [
    { id: 'infantil', name: 'Infantil (2012-2013)' },
    { id: 'juvenil', name: 'Juvenil (2008-2011)' },
    { id: 'mayor', name: 'Mayor Libre' },
    { id: 'femenil', name: 'Femenil' },
    { id: 'veteranos', name: 'Veteranos +35' }
  ];

  const seasons = [
    { id: 'clausura2026', name: 'Clausura 2026' },
    { id: 'apertura2026', name: 'Apertura 2026' },
    { id: 'anual2026', name: 'Temporada Anual 2026' }
  ];

  const costs = {
    registro: 1500,
    administrativa: 300,
    seguro: 450,
    total: 2250
  };

  const bankInfo = {
    banco: 'BBVA México',
    titular: 'Asociación Deportiva Estatal AC',
    cuenta: '01234567' + '89 01',
    clabe: '012 180 0001234567 89',
    referencia: 'RHX-CL26-001'
  };

  const handleOptionChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setErrors(prev => ({
      ...prev,
      [field]: ''
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        paymentProof: file
      }));
      setErrors(prev => ({
        ...prev,
        paymentProof: ''
      }));
    }
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
    if (!formData.agreedToTerms) newErrors.agreedToTerms = 'Debes revisar y aceptar los términos';
    if (!formData.paymentProof) newErrors.paymentProof = 'Adjunta el comprobante de pago';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }
    // Abrir el modal en lugar de enviar
    setShowModal(true);
  };

  const handleModalSubmit = async () => {
    // Validar campos del modal
    if (!modalData.teamName.trim()) {
      alert('Por favor ingresa el nombre del equipo');
      return;
    }
    if (!modalData.teamLogo) {
      alert('Por favor carga el logo del equipo');
      return;
    }

    try {
      // PREPARAR DATOS PARA ENVIAR AL BACKEND
      const userEmail = localStorage.getItem('email');
      
      const teamPayload = {
        teamName: modalData.teamName.trim(),
        modality: formData.modality,
        category: formData.category,
        season: formData.season,
        email: userEmail,
        paymentProof: formData.paymentProof,
        teamLogo: modalData.teamLogo
      };

      console.log('📤 Enviando datos del equipo:', {
        teamName: teamPayload.teamName,
        modality: teamPayload.modality,
        category: teamPayload.category,
        season: teamPayload.season,
        email: teamPayload.email,
        paymentProof: teamPayload.paymentProof?.name,
        teamLogo: teamPayload.teamLogo?.name
      });

      // LLAMAR AL SERVICIO PARA CREAR EL EQUIPO
      const response = await createTeam(teamPayload);
      
      if (response.ok) {
        console.log('✅ Equipo creado:', response.team);
        const message = response.local 
          ? `El equipo se ha creado localmente (sin conexión al backend).`
          : `El equipo se activará una vez validado el comprobante de pago.`;
        
        setSuccessMessage(message);
        setShowSuccessModal(true);
      } else {
        alert('❌ Error al crear el equipo');
      }
    } catch (error) {
      console.error('❌ Error creando equipo:', error);
      alert(`❌ Error: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleSuccessModalContinue = () => {
    setShowSuccessModal(false);
    setShowModal(false);
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

  const userEmail = localStorage.getItem('email') || '';

  return (
    <>
      <style>
        {`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
      <div className="dashboard-wrapper">
        <DashboardSidebar userEmail={userEmail} />
        
        <div className="dashboard-container">
          <DashboardHeader userEmail={userEmail} pageTitle="Crear Equipo Nuevo" />
        
        <div className="dashboard-main">
          <div className="dashboard-content">
            {/* HEADER DEL FORMULARIO */}
            <div style={{
              marginBottom: '30px',
              paddingBottom: '20px',
              borderBottom: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                <div style={{
                  fontSize: '32px',
                  background: 'linear-gradient(135deg, #0b4ea6 0%, #063f82 100%)',
                  width: '60px',
                  height: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '12px',
                  color: 'white'
                }}>
                  🛡️
                </div>
                <div>
                  <h2 style={{ margin: 0, color: '#0b4ea6', fontSize: '24px', fontWeight: 'bold' }}>
                    Crear Equipo Nuevo
                  </h2>
                  <p style={{ margin: '5px 0 0 0', color: '#64748b', fontSize: '14px' }}>
                    La modalidad, categoría y temporada seleccionadas determinarán el registro oficial del equipo.
                  </p>
                </div>
              </div>
            </div>

            {/* SECCIÓN 1: SELECCIÓN (MODALIDAD, CATEGORÍA, TEMPORADA) */}
            <div style={{ marginBottom: '30px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px'
              }}>
                {/* MODALIDAD */}
                <div style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '20px',
                  backgroundColor: 'white'
                }}>
                  <h5 style={{
                    marginBottom: '15px',
                    color: '#0b4ea6',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <FaFootballBall /> Modalidad
                  </h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {modalities.map((mod) => (
                      <label key={mod.id} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '10px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        backgroundColor: formData.modality === mod.id ? '#dbeafe' : 'transparent',
                        border: formData.modality === mod.id ? '1px solid #0b4ea6' : 'transparent'
                      }}>
                        <input
                          type="radio"
                          name="modality"
                          value={mod.id}
                          checked={formData.modality === mod.id}
                          onChange={(e) => handleOptionChange('modality', e.target.value)}
                          style={{ marginTop: '3px', cursor: 'pointer' }}
                        />
                        <div>
                          <div style={{ fontWeight: '600', color: '#1e293b' }}>{mod.name}</div>
                          <small style={{ color: '#64748b', display: 'block', marginTop: '2px' }}>
                            {mod.description}
                          </small>
                        </div>
                      </label>
                    ))}
                  </div>
                  {errors.modality && (
                    <div style={{ color: '#dc2626', fontSize: '13px', marginTop: '10px' }}>
                      ⚠️ {errors.modality}
                    </div>
                  )}
                </div>

                {/* CATEGORÍA */}
                <div style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '20px',
                  backgroundColor: 'white'
                }}>
                  <h5 style={{
                    marginBottom: '15px',
                    color: '#0b4ea6',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <FaTags /> Categoría
                  </h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {categories.map((cat) => (
                      <label key={cat.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        backgroundColor: formData.category === cat.id ? '#dbeafe' : 'transparent',
                        border: formData.category === cat.id ? '1px solid #0b4ea6' : 'transparent'
                      }}>
                        <input
                          type="radio"
                          name="category"
                          value={cat.id}
                          checked={formData.category === cat.id}
                          onChange={(e) => handleOptionChange('category', e.target.value)}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ fontWeight: '500', color: '#1e293b' }}>{cat.name}</span>
                      </label>
                    ))}
                  </div>
                  {errors.category && (
                    <div style={{ color: '#dc2626', fontSize: '13px', marginTop: '10px' }}>
                      ⚠️ {errors.category}
                    </div>
                  )}
                </div>

                {/* TEMPORADA */}
                <div style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '20px',
                  backgroundColor: 'white'
                }}>
                  <h5 style={{
                    marginBottom: '15px',
                    color: '#0b4ea6',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <FaCalendar /> Temporada
                  </h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {seasons.map((season) => (
                      <label key={season.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        backgroundColor: formData.season === season.id ? '#dbeafe' : 'transparent',
                        border: formData.season === season.id ? '1px solid #0b4ea6' : 'transparent'
                      }}>
                        <input
                          type="radio"
                          name="season"
                          value={season.id}
                          checked={formData.season === season.id}
                          onChange={(e) => handleOptionChange('season', e.target.value)}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ fontWeight: '500', color: '#1e293b' }}>{season.name}</span>
                      </label>
                    ))}
                  </div>
                  {errors.season && (
                    <div style={{ color: '#dc2626', fontSize: '13px', marginTop: '10px' }}>
                      ⚠️ {errors.season}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: CUOTAS E INFORMACIÓN BANCARIA */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
              gap: '20px',
              marginBottom: '30px'
            }}>
              {/* CUOTAS */}
              <div style={{
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '25px',
                backgroundColor: 'white'
              }}>
                <h5 style={{
                  marginBottom: '20px',
                  color: '#0b4ea6',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}>
                  Cuotas correspondientes
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingBottom: '10px',
                    borderBottom: '1px solid var(--border-color)'
                  }}>
                    <span style={{ color: '#64748b' }}>Registro de equipo:</span>
                    <strong style={{ color: '#0b4ea6' }}>${costs.registro}</strong>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingBottom: '10px',
                    borderBottom: '1px solid var(--border-color)'
                  }}>
                    <span style={{ color: '#64748b' }}>Cuota administrativa:</span>
                    <strong style={{ color: '#0b4ea6' }}>${costs.administrativa}</strong>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingBottom: '10px',
                    borderBottom: '2px solid var(--border-color)'
                  }}>
                    <span style={{ color: '#64748b' }}>Seguro anual:</span>
                    <strong style={{ color: '#0b4ea6' }}>${costs.seguro}</strong>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: '10px'
                  }}>
                    <span style={{ fontWeight: 'bold', color: '#1e293b' }}>Total a pagar:</span>
                    <span style={{
                      fontWeight: 'bold',
                      fontSize: '18px',
                      color: '#0b4ea6',
                      background: '#dbeafe',
                      padding: '5px 12px',
                      borderRadius: '6px'
                    }}>
                      ${costs.total}
                    </span>
                  </div>
                </div>
              </div>

              {/* INFORMACIÓN BANCARIA */}
              <div style={{
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '25px',
                backgroundColor: 'white'
              }}>
                <h5 style={{
                  marginBottom: '20px',
                  color: '#0b4ea6',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}>
                  Depósito o transferencia bancaria
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <small style={{ color: '#64748b', fontWeight: '500' }}>Banco:</small>
                    <div style={{ fontWeight: '600', color: '#1e293b', marginTop: '4px' }}>
                      {bankInfo.banco}
                    </div>
                  </div>
                  <div>
                    <small style={{ color: '#64748b', fontWeight: '500' }}>Titular:</small>
                    <div style={{ fontWeight: '600', color: '#1e293b', marginTop: '4px' }}>
                      {bankInfo.titular}
                    </div>
                  </div>
                  <div>
                    <small style={{ color: '#64748b', fontWeight: '500' }}>Número de cuenta:</small>
                    <code style={{
                      display: 'block',
                      background: '#f1f5f9',
                      padding: '8px',
                      borderRadius: '6px',
                      marginTop: '4px',
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      color: '#0b4ea6',
                      fontWeight: '600'
                    }}>
                      {bankInfo.cuenta}
                    </code>
                  </div>
                  <div>
                    <small style={{ color: '#64748b', fontWeight: '500' }}>CLABE interbancaria:</small>
                    <code style={{
                      display: 'block',
                      background: '#f1f5f9',
                      padding: '8px',
                      borderRadius: '6px',
                      marginTop: '4px',
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      color: '#0b4ea6',
                      fontWeight: '600'
                    }}>
                      {bankInfo.clabe}
                    </code>
                  </div>
                  <div>
                    <small style={{ color: '#64748b', fontWeight: '500' }}>Referencia obligatoria:</small>
                    <span style={{
                      display: 'inline-block',
                      background: '#fef08a',
                      color: '#92400e',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      marginTop: '4px',
                      fontWeight: '600',
                      fontSize: '13px'
                    }}>
                      {bankInfo.referencia}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: COMPROBANTE Y TÉRMINOS */}
            <div style={{
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '25px',
              backgroundColor: 'white',
              marginBottom: '30px'
            }}>
              <h5 style={{
                marginBottom: '20px',
                color: '#0b4ea6',
                fontSize: '16px',
                fontWeight: 'bold'
              }}>
                Comprobante de Pago
              </h5>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#1e293b'
                }}>
                  Adjuntar comprobante (PDF, JPG, PNG)
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                />
                {errors.paymentProof && (
                  <div style={{ color: '#dc2626', fontSize: '13px', marginTop: '8px' }}>
                    ⚠️ {errors.paymentProof}
                  </div>
                )}
                {formData.paymentProof && (
                  <div style={{
                    marginTop: '10px',
                    padding: '10px',
                    backgroundColor: '#dcfce7',
                    borderRadius: '6px',
                    color: '#166534',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}>
                    ✅ {formData.paymentProof.name}
                  </div>
                )}
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '15px',
                backgroundColor: '#f1f5f9',
                borderRadius: '8px',
                marginBottom: '15px'
              }}>
                <input
                  type="checkbox"
                  id="agreedToTerms"
                  checked={formData.agreedToTerms}
                  onChange={handleCheckboxChange}
                  style={{ marginTop: '2px', cursor: 'pointer' }}
                />
                <label htmlFor="agreedToTerms" style={{
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#1e293b',
                  margin: 0
                }}>
                  He revisado las cuotas y realizaré el pago correspondiente.
                </label>
              </div>
              {errors.agreedToTerms && (
                <div style={{ color: '#dc2626', fontSize: '13px', marginBottom: '15px' }}>
                  ⚠️ {errors.agreedToTerms}
                </div>
              )}

              <div style={{
                padding: '12px',
                backgroundColor: '#dbeafe',
                borderLeft: '4px solid #0b4ea6',
                borderRadius: '6px'
              }}>
                <small style={{ color: '#0c4a6e', fontSize: '13px' }}>
                  ℹ️ El equipo se activará una vez validado el comprobante de pago.
                  La validación puede tardar hasta 48 horas hábiles.
                </small>
              </div>
            </div>

            {/* BOTONES */}
            <div style={{
              display: 'flex',
              gap: '15px',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                onClick={() => navigate('/presidente-equipo')}
                style={{
                  padding: '12px 24px',
                  border: '1px solid var(--border-color)',
                  background: 'white',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  color: '#64748b',
                  transition: 'all 0.2s'
                }}
                onHover={e => {
                  e.target.style.backgroundColor = '#f1f5f9';
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #0b4ea6 0%, #063f82 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
              >
                📤 Subir comprobante de pago
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#0b4ea6',
              marginBottom: '25px',
              textAlign: 'center'
            }}>
              Crear Equipo
            </h2>

            {/* COMPROBANTE DE PAGO */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontWeight: '600',
                marginBottom: '8px',
                color: '#1e293b'
              }}>
                Comprobante de pago:
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              />
              {formData.paymentProof && (
                <small style={{
                  display: 'block',
                  marginTop: '6px',
                  color: '#10b981'
                }}>
                  ✅ {formData.paymentProof.name}
                </small>
              )}
            </div>

            {/* NOMBRE DEL EQUIPO */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontWeight: '600',
                marginBottom: '8px',
                color: '#1e293b'
              }}>
                Nombre del equipo:
              </label>
              <input
                type="text"
                placeholder="Ej: Las Águilas"
                value={modalData.teamName}
                onChange={handleTeamNameChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
              <small style={{
                display: 'block',
                marginTop: '6px',
                color: '#dc2626',
                fontSize: '12px'
              }}>
                Espacio para alertas "El nombre ya se encuentra en uso"/"Nombre inválido".
              </small>
            </div>

            {/* LOGO DEL EQUIPO */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontWeight: '600',
                marginBottom: '8px',
                color: '#1e293b'
              }}>
                Logo del equipo:
              </label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.svg"
                onChange={handleTeamLogoChange}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              />
              {modalData.teamLogo && (
                <small style={{
                  display: 'block',
                  marginTop: '6px',
                  color: '#10b981'
                }}>
                  ✅ {modalData.teamLogo.name}
                </small>
              )}
            </div>

            {/* RESUMEN DE SELECCIONES */}
            <div style={{
              background: '#f1f5f9',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                <strong style={{ color: '#1e293b' }}>Modalidad:</strong>{' '}
                <span style={{ color: '#0b4ea6' }}>
                  {modalities.find(m => m.id === formData.modality)?.name || '-'}
                </span>
              </div>
              <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                <strong style={{ color: '#1e293b' }}>Categoría:</strong>{' '}
                <span style={{ color: '#0b4ea6' }}>
                  {categories.find(c => c.id === formData.category)?.name || '-'}
                </span>
              </div>
              <div style={{ fontSize: '13px' }}>
                <strong style={{ color: '#1e293b' }}>Temporada:</strong>{' '}
                <span style={{ color: '#0b4ea6' }}>
                  {seasons.find(s => s.id === formData.season)?.name || '-'}
                </span>
              </div>
            </div>

            {/* BOTONES */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                type="button"
                onClick={handleCloseModal}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  background: 'white',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  color: '#64748b',
                  transition: 'all 0.2s'
                }}
              >
                Cerrar
              </button>
              <button
                onClick={handleModalSubmit}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'linear-gradient(135deg, #0b4ea6 0%, #063f82 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
              >
                Crear equipo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ÉXITO */}
      {showSuccessModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '40px',
            textAlign: 'center',
            maxWidth: '400px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
            animation: 'slideUp 0.3s ease-out'
          }}>
            {/* ÍCONO DE ÉXITO */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '80px',
              height: '80px',
              backgroundColor: '#dcfce7',
              borderRadius: '50%',
              margin: '0 auto 20px',
              fontSize: '40px'
            }}>
              ✓
            </div>

            {/* TEXTO */}
            <h2 style={{
              margin: '0 0 10px 0',
              color: '#0b4ea6',
              fontSize: '24px',
              fontWeight: 'bold'
            }}>
              Equipo creado con éxito
            </h2>

            <p style={{
              margin: '0 0 30px 0',
              color: '#64748b',
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              {successMessage}
            </p>

            {/* BOTÓN CONTINUAR */}
            <button
              onClick={handleSuccessModalContinue}
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #0b4ea6 0%, #063f82 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '15px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
              }}
            >
              Continuar
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
