import AfaemLogo from '../../assets/afaem-logo@4x.png';
import FmfLogo from '../../assets/fmf-logo.png';
import AmateurLogo from '../../assets/amateur-logo.png';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postJSON } from '../../api';

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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      boxSizing: 'border-box',
      background: 'linear-gradient(180deg, #f5f8fb 0%, #eaf3ff 100%)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: 1000,
        background: '#fff',
        borderRadius: 14,
        padding: 40,
        boxShadow: '0 18px 50px rgba(11,78,166,0.08)',
        color: '#0b2546'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>Solicitud de Certificación</h2>
        <p style={{ color: '#5b6b87', marginBottom: 28 }}>
          {userInfo ? (
            <>Hola <strong>{userInfo.email || userInfo.correo || userInfo.nombre}</strong>. Por favor sube tus documentos para la validación.</>
          ) : (
            <>Por favor carga los documentos requeridos para continuar.</>
          )}
        </p>

        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          
          {/* SECCIÓN: DOCUMENTOS REQUERIDOS */}
          <div style={{ borderTop: '1px solid #eef2f7', paddingTop: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#0b2546' }}>
              📄 Documentos Requeridos
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 12,
              marginBottom: 20
            }}>
              {REQUIRED_DOCUMENTS.map(doc => (
                <div key={doc.id} style={{
                  padding: 14,
                  borderRadius: 8,
                  background: '#f8fbff',
                  border: '1px solid #d6e6ff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{doc.name}</span>
                  <span style={{
                    fontSize: 12,
                    padding: '4px 8px',
                    borderRadius: 4,
                    background: files.length > 0 ? '#e8f5e9' : '#ffebee',
                    color: files.length > 0 ? '#2e7d32' : '#c62828'
                  }}>
                    {files.length > 0 ? '✓ Pendiente' : '✗ Requerido'}
                  </span>
                </div>
              ))}
            </div>

            {/* INPUT DE CARGA */}
            <div style={{
              padding: 20,
              borderRadius: 10,
              background: '#f0f6ff',
              border: '2px dashed #2b7be6',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}>
              <label style={{ display: 'block', cursor: 'pointer' }}>
                <input
                  type="file"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.xlsx"
                />
                <div style={{ fontSize: 14, fontWeight: 600, color: '#2b7be6', marginBottom: 8 }}>
                  📁 Haz clic para seleccionar archivos
                </div>
                <div style={{ fontSize: 12, color: '#5b6b87' }}>
                  Formatos permitidos: PDF, PNG, JPG, XLSX
                </div>
              </label>
            </div>

            {/* LISTA DE ARCHIVOS CARGADOS */}
            {files.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#0b2546', textTransform: 'uppercase' }}>
                  Archivos cargados ({files.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {files.map(f => (
                    <div key={f.id} style={{
                      padding: 12,
                      borderRadius: 8,
                      background: '#fafbfc',
                      border: '1px solid #e3eaf5',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#0b2546', marginBottom: 6 }}>
                          {f.name}
                        </div>
                        <div style={{ height: 6, background: '#e6eefc', borderRadius: 6, overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.max(4, f.progress || 0)}%`,
                            height: '100%',
                            background: '#2b7be6',
                            transition: 'width 0.25s linear'
                          }} />
                        </div>
                        <div style={{ fontSize: 11, color: '#5b6b87', marginTop: 4 }}>
                          {f.progress}%
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(f.id)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 6,
                          background: '#ffebee',
                          color: '#c62828',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 500
                        }}
                      >
                        ✕ Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SECCIÓN: DATOS PERSONALES (se llenarán con OCR) */}
          <div style={{ borderTop: '1px solid #eef2f7', paddingTop: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#0b2546' }}>
              👤 Datos Personales
            </h3>
            <p style={{ fontSize: 12, color: '#5b6b87', marginBottom: 16, fontStyle: 'italic' }}>
              Estos campos se completarán automáticamente cuando valides los documentos con OCR
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16
            }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#0b2546', textTransform: 'uppercase' }}>
                  Nombre
                </label>
                <input
                  type="text"
                  name="Nombre"
                  value={documentData.Nombre}
                  onChange={handleDataChange}
                  placeholder="Se llenará con OCR"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #d6e6ff',
                    fontSize: 13,
                    boxSizing: 'border-box',
                    background: '#f8fbff'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#0b2546', textTransform: 'uppercase' }}>
                  Primer Apellido
                </label>
                <input
                  type="text"
                  name="PrimerApellido"
                  value={documentData.PrimerApellido}
                  onChange={handleDataChange}
                  placeholder="Se llenará con OCR"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #d6e6ff',
                    fontSize: 13,
                    boxSizing: 'border-box',
                    background: '#f8fbff'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#0b2546', textTransform: 'uppercase' }}>
                  Segundo Apellido
                </label>
                <input
                  type="text"
                  name="SegundoApellido"
                  value={documentData.SegundoApellido}
                  onChange={handleDataChange}
                  placeholder="Se llenará con OCR"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #d6e6ff',
                    fontSize: 13,
                    boxSizing: 'border-box',
                    background: '#f8fbff'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#0b2546', textTransform: 'uppercase' }}>
                  Correo
                </label>
                <input
                  type="email"
                  name="Correo"
                  value={documentData.Correo}
                  onChange={handleDataChange}
                  placeholder="Se llenará con OCR"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #d6e6ff',
                    fontSize: 13,
                    boxSizing: 'border-box',
                    background: '#f8fbff'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#0b2546', textTransform: 'uppercase' }}>
                  Teléfono
                </label>
                <input
                  type="tel"
                  name="Telefono"
                  value={documentData.Telefono}
                  onChange={handleDataChange}
                  placeholder="Se llenará con OCR"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #d6e6ff',
                    fontSize: 13,
                    boxSizing: 'border-box',
                    background: '#f8fbff'
                  }}
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN: ACCIONES */}
          <div style={{
            borderTop: '1px solid #eef2f7',
            paddingTop: 24,
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap'
          }}>
            <button
              type="submit"
              className="btn-primary"
              style={{
                padding: '12px 24px',
                borderRadius: 10,
                background: '#0b4ea6',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14,
                flex: 1,
                minWidth: 180
              }}
            >
              ✓ Enviar Documentos
            </button>

            {files.length > 0 && (
              <button
                type="button"
                onClick={() => setFiles([])}
                style={{
                  padding: '12px 24px',
                  borderRadius: 10,
                  background: '#fff',
                  color: '#0b2546',
                  border: '1px solid #d6e6ff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14
                }}
              >
                🗑 Limpiar Archivos
              </button>
            )}

            <button
              type="button"
              onClick={forceCertified}
              style={{
                padding: '12px 24px',
                borderRadius: 10,
                background: '#27ae60',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14
              }}
            >
              ✓ Marcar como Certificado
            </button>

            <button
              type="button"
              onClick={() => navigate('/presidente-equipo')}
              style={{
                padding: '12px 24px',
                borderRadius: 10,
                background: '#eef4ff',
                color: '#0b2546',
                border: '1px solid #d6e6ff',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14
              }}
            >
              → Ver Panel
            </button>
          </div>

          {message && (
            <div style={{
              padding: 12,
              borderRadius: 8,
              background: message.includes('error') ? '#ffebee' : '#e8f5e9',
              color: message.includes('error') ? '#c62828' : '#2e7d32',
              fontSize: 13,
              fontWeight: 500,
              textAlign: 'center'
            }}>
              {message}
            </div>
          )}
        </form>

        <div style={{ marginTop: 28, padding: 16, borderRadius: 8, background: '#f8fbff', border: '1px solid #d6e6ff' }}>
          <div style={{ fontSize: 12, color: '#5b6b87', fontStyle: 'italic' }}>
            📝 <strong>Nota:</strong> Los documentos se cargan de forma local. Cuando implementemos OCR, los campos de datos personales se llenarán automáticamente.
          </div>
        </div>
      </div>
    </div>
  );
}
