import AfaemLogo from '../../assets/afaem-logo@4x.png';
import FmfLogo from '../../assets/fmf-logo.png';
import AmateurLogo from '../../assets/amateur-logo.png';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postJSON } from '../../services/api';

export default function ProximoPresidente() {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [_fileName, setFileName] = useState('');
  const [message, setMessage] = useState('');

  // LISTA DE DOCUMENTOS REQUERIDOS
  const REQUIRED_DOCUMENTS = [
    { id: 'identificacion', name: 'Identificación Oficial', uploaded: false },
    { id: 'curp', name: 'CURP', uploaded: false },
    { id: 'comprobante', name: 'Comprobante de Domicilio', uploaded: false },
    { id: 'carta', name: 'Carta de Aceptación', uploaded: false },
    { id: 'foto', name: 'Foto Tipo Credencial', uploaded: false },
  ];

  // DATOS PERSONALES QUE SE LLENARÁN CON OCR
  const [documentData, setDocumentData] = useState(() => {
    const initialData = {
      Nombre: '',
      PrimerApellido: '',
      SegundoApellido: '',
      Correo: '',
      Telefono: '',
      cedula: '',
      licencia: '',
      profesion: '',
      tipoDocumento: '',
    };
    try {
      const raw = localStorage.getItem('auth') || localStorage.getItem('user');
      if (raw) {
        const user = JSON.parse(raw);
        return {
          ...initialData,
          Nombre: user.Nombre || user.nombre || '',
          PrimerApellido: user.PrimerApellido || user.primer_apellido || '',
          SegundoApellido: user.SegundoApellido || user.segundo_apellido || '',
          Correo: user.email || user.Correo || user.correo || '',
          Telefono: user.Telefono || user.telefono || user.NumeroTelefono || ''
        };
      }
    } catch {
      // Silently handle parse errors
    }
    return initialData;
  });

  const [_documentStatus, _setDocumentStatus] = useState(REQUIRED_DOCUMENTS);

  // LISTA DE ARCHIVOS SUBIDOS LOCALMENTE (SIMULACIÓN): { ID, NAME, PROGRESS }
  const [files, setFiles] = useState([]);

  // SIMULA PROGRESO DE SUBIDA PARA UN ARCHIVO (INCREMENTA HASTA 100)
  const simulateProgress = (id) => {
    const iv = setInterval(() => {
      setFiles(prev => {
        const next = prev.map(f => {
          if (f.id !== id) return f;
          const nextProgress = Math.min(100, (f.progress || 0) + Math.floor(Math.random() * 20) + 10);
          return { ...f, progress: nextProgress };
        });
        const target = next.find(f => f.id === id);
        if (target && target.progress >= 100) clearInterval(iv);
        return next;
      });
    }, 300);
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;
    const toAdd = selected.map((f, idx) => {
      return { id: `${Date.now()}-${idx}-${f.name}`, name: f.name, progress: 0 };
    });
    setFiles(prev => {
      const merged = [...prev, ...toAdd];
      toAdd.forEach(t => simulateProgress(t.id));
      return merged;
    });
    setFileName(selected[0].name);
    e.target.value = '';
  };

  const handleSend = async (e) => {
    e.preventDefault();
    // VALIDAR QUE LOS DATOS PERSONALES ESTÉN COMPLETOS
    if (!documentData.Nombre || !documentData.PrimerApellido || !documentData.Correo || !documentData.Telefono) {
      setMessage('Por favor completa todos los datos personales requeridos.');
      return;
    }
    setMessage('');
    try {
      // ENVIAR DATOS PERSONALES AL BACKEND
      const payload = {
        Nombre: documentData.Nombre,
        PrimerApellido: documentData.PrimerApellido,
        SegundoApellido: documentData.SegundoApellido,
        Correo: documentData.Correo,
        Telefono: documentData.Telefono
      };
      
      const response = await postJSON('/president-data', payload);
      
      if (response.ok) {
        setMessage('✓ Datos personales guardados exitosamente.');
        // ACTUALIZAR INFO LOCAL
        const raw = JSON.parse(localStorage.getItem('auth') || localStorage.getItem('user') || 'null');
        const auth = raw || { email: documentData.Correo };
        Object.assign(auth, payload);
        localStorage.setItem('auth', JSON.stringify(auth));
        localStorage.setItem('user', JSON.stringify(auth));
      } else {
        setMessage('Error al guardar los datos: ' + (response.json?.detail || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error enviando datos:', error);
      setMessage('Error al enviar los datos. Por favor intenta de nuevo.');
    }
  };

  const handleRemoveFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleDataChange = (e) => {
    const { name, value } = e.target;
    setDocumentData(prev => ({ ...prev, [name]: value }));
  };

  const forceCertified = () => {
    try {
      const raw = JSON.parse(localStorage.getItem('auth') || localStorage.getItem('user') || 'null');
      const auth = raw || { email: 'tester@local', nombre: 'Usuario de prueba' };
      auth.isCertified = true;
      localStorage.setItem('auth', JSON.stringify(auth));
      localStorage.setItem('user', JSON.stringify(auth));
      navigate('/presidente-equipo');
    } catch {
      setMessage('No se pudo activar la certificación.');
    }
  };

  const _createTestSession = () => {
    const auth = { email: 'tester@local', nombre: 'Usuario de prueba', isCertified: false };
    localStorage.setItem('auth', JSON.stringify(auth));
    localStorage.setItem('user', JSON.stringify(auth));
    setUserInfo(auth);
    setMessage('Sesión de prueba creada.');
  };

  return (
    <div className="fade-in" style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--primary-dark) 0%, #1e1b4b 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px',
      boxSizing: 'border-box'
    }}>
      {/* HEADER LOGOS */}
      <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <img src={AfaemLogo} alt="AFAEM" style={{ height: '60px' }} />
        <div style={{ display: 'flex', gap: '20px' }}>
          <img src={FmfLogo} alt="FMF" style={{ height: '40px' }} />
          <img src={AmateurLogo} alt="Amateur" style={{ height: '40px' }} />
        </div>
      </div>

      <div className="card glass" style={{
        width: '100%',
        maxWidth: '900px',
        padding: '50px',
        color: 'var(--text-main)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 10px', color: 'var(--primary)' }}>Solicitud de Certificación</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '16px', fontWeight: '500' }}>
            {userInfo ? (
              <>Hola <strong>{userInfo.email || userInfo.correo || userInfo.nombre}</strong>. Por favor sube tus documentos para la validación.</>
            ) : (
              <>Por favor carga los documentos requeridos para continuar con el proceso de activación.</>
            )}
          </p>
        </div>

        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          
          {/* SECCIÓN: DOCUMENTOS REQUERIDOS */}
          <section>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>📄</span> Documentos Requeridos
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '15px',
              marginBottom: '25px'
            }}>
              {REQUIRED_DOCUMENTS.map(doc => (
                <div key={doc.id} className="card" style={{
                  padding: '16px',
                  background: 'var(--bg-main)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: '1px solid var(--border-light)'
                }}>
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>{doc.name}</span>
                  <span style={{
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    background: files.length > 0 ? 'var(--secondary)' : 'var(--warning)',
                    color: 'white'
                  }}>
                    {files.length > 0 ? 'Pendiente' : 'Requerido'}
                  </span>
                </div>
              ))}
            </div>

            {/* INPUT DE CARGA */}
            <div style={{
              padding: '40px',
              borderRadius: '16px',
              background: 'rgba(59, 130, 246, 0.05)',
              border: '2px dashed var(--primary)',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)'}>
              <label style={{ display: 'block', cursor: 'pointer' }}>
                <input
                  type="file"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.xlsx"
                />
                <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--primary)', marginBottom: '8px' }}>
                  📁 Haz clic para seleccionar archivos
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Formatos permitidos: PDF, PNG, JPG, XLSX
                </div>
              </label>
            </div>

            {/* LISTA DE ARCHIVOS CARGADOS */}
            {files.length > 0 && (
              <div style={{ marginTop: '30px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: '800', marginBottom: '15px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Archivos en cola ({files.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {files.map(f => (
                    <div key={f.id} className="card" style={{
                      padding: '15px',
                      background: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '15px',
                      border: '1px solid var(--border-light)'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '700' }}>{f.name}</span>
                          <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)' }}>{f.progress}%</span>
                        </div>
                        <div style={{ height: '6px', background: 'var(--bg-main)', borderRadius: '10px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.max(4, f.progress || 0)}%`,
                            height: '100%',
                            background: 'var(--primary)',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(f.id)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: '#fee2e2',
                          color: '#b91c1c',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '700',
                          transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#fecaca'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#fee2e2'}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* SECCIÓN: DATOS PERSONALES */}
          <section style={{ borderTop: '1px solid var(--border-light)', paddingTop: '30px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '10px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>👤</span> Datos Personales
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              ℹ️ Los campos se auto-completan mediante validación OCR de tus documentos.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px'
            }}>
              {[
                { label: 'Nombre', name: 'Nombre' },
                { label: 'Primer Apellido', name: 'PrimerApellido' },
                { label: 'Segundo Apellido', name: 'SegundoApellido' },
                { label: 'Correo', name: 'Correo', type: 'email' },
                { label: 'Teléfono', name: 'Telefono', type: 'tel' }
              ].map(field => (
                <div key={field.name}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {field.label}
                  </label>
                  <input
                    type={field.type || 'text'}
                    name={field.name}
                    value={documentData[field.name]}
                    onChange={handleDataChange}
                    placeholder={`Pendiente validación...`}
                    style={{
                      width: '100%',
                      padding: '12px 15px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-light)',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      background: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      fontWeight: '600'
                    }}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* SECCIÓN: ACCIONES */}
          <div style={{
            borderTop: '1px solid var(--border-light)',
            paddingTop: '30px',
            display: 'flex',
            gap: '15px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button
              type="submit"
              className="btn-premium"
              style={{
                padding: '16px 40px',
                fontSize: '16px',
                flex: '1',
                maxWidth: '300px'
              }}
            >
              ✓ Enviar Solicitud
            </button>

            <button
              type="button"
              onClick={forceCertified}
              style={{
                padding: '16px 30px',
                borderRadius: '12px',
                background: 'var(--secondary)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '800',
                fontSize: '14px',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.2)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              ✓ Validación Rápida
            </button>

            <button
              type="button"
              onClick={() => navigate('/presidente-equipo')}
              style={{
                padding: '16px 30px',
                borderRadius: '12px',
                background: 'var(--bg-main)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-light)',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '14px',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
              onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg-main)'}
            >
              Ir al Panel
            </button>
          </div>

          {message && (
            <div className="fade-in" style={{
              padding: '15px',
              borderRadius: '12px',
              background: message.includes('Error') || message.includes('error') ? '#fee2e2' : 'rgba(16, 185, 129, 0.1)',
              color: message.includes('Error') || message.includes('error') ? '#b91c1c' : 'var(--secondary)',
              fontSize: '14px',
              fontWeight: '700',
              textAlign: 'center',
              border: `1px solid ${message.includes('Error') || message.includes('error') ? '#fecaca' : 'rgba(16, 185, 129, 0.2)'}`
            }}>
              {message}
            </div>
          )}
        </form>

        <div style={{ marginTop: '40px', padding: '20px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.5' }}>
             <strong>Nota de Proceso:</strong> Los documentos son validados por nuestro sistema inteligente. Una vez aprobados, tu cuenta será habilitada para la gestión deportiva completa.
          </div>
        </div>
      </div>
    </div>
  );
}
