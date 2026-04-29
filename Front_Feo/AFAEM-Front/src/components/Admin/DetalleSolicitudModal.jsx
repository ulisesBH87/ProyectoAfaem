import React, { useState, useEffect } from 'react';
import { Modal, BotonPrimario, BotonSecundario, Insignia } from '../partials';
import { FaUser, FaFileAlt, FaEye, FaCheck, FaTimes, FaInfoCircle, FaChevronRight } from 'react-icons/fa';
import Loader from '../Loader';

/**
 * CENTRO DE REVISIÓN DE DOCUMENTOS AFAEM
 * Interfaz premium para validar documentación con visor PDF integrado.
 */
export default function DetalleSolicitudModal({
  estaAbierto,
  alCerrar,
  datos,
  alAprobar,
  alRechazar,
  cargando = false
}) {
  const [documentoActivo, setDocumentoActivo] = useState(null);
  const [validaciones, setValidaciones] = useState({});
  const [rechazandoId, setRechazandoId] = useState(null); // ID del doc que se está rechazando
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [motivoTextoLibre, setMotivoTextoLibre] = useState('');

  // Motivos predefinidos para el dropdown
  const motivosComunes = [
    "Ilegible",
    "Documento incorrecto",
    "Fecha de vigencia expirada",
    "Falta firma",
    "Información no coincide con registro",
    "Otro (especificar abajo)"
  ];

  useEffect(() => {
    if (datos?.Jugadores) {
      // Inicializar el primer documento como activo si existe
      const primerJugador = datos.Jugadores[0];
      if (primerJugador?.Documentos?.length > 0) {
        setDocumentoActivo(primerJugador.Documentos[0]);
      }

      // Inicializar estados de validación si no existen
      const inicial = {};
      datos.Jugadores.forEach(j => {
        j.Documentos.forEach(d => {
          const key = `${j.Id}-${d.Tipo}`;
          inicial[key] = { estado: 'pendiente', motivo: '', detalle: '' };
        });
      });
      setValidaciones(inicial);
    }
  }, [datos]);

  if (!datos) return null;

  const { Equipo, SolicitudId, Jugadores } = datos;

  const handleValidarDoc = (jugadorId, tipoDoc, estado, motivo = '', detalle = '') => {
    const key = `${jugadorId}-${tipoDoc}`;
    setValidaciones(prev => ({
      ...prev,
      [key]: { estado, motivo, detalle }
    }));
    if (estado === 'rechazado') setRechazandoId(null);
  };

  const confirmarCerrar = () => {
    if (revisados > 0) {
      Swal.fire({
        title: '¿Salir sin guardar?',
        text: 'Has realizado cambios en la validación que se perderán si cierras ahora.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, salir',
        cancelButtonText: 'Seguir revisando',
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b'
      }).then((result) => {
        if (result.isConfirmed) {
          alCerrar();
        }
      });
    } else {
      alCerrar();
    }
  };

  const totalDocs = Object.keys(validaciones).length;
  const revisados = Object.values(validaciones).filter(v => v.estado !== 'pendiente').length;
  const porcentaje = totalDocs > 0 ? (revisados / totalDocs) * 100 : 0;

  return (
    <Modal
      estaAbierto={estaAbierto}
      titulo={`Centro de revisión: ${Equipo || 'Solicitud #' + SolicitudId}`}
      alCerrar={confirmarCerrar}
      tamanio="pantallaFull"
      pie={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ width: '200px', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${porcentaje}%`, height: '100%', backgroundColor: '#0b4ea6', transition: 'width 0.3s ease' }}></div>
            </div>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b' }}>{revisados} de {totalDocs} archivos validados</span>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <BotonSecundario
              etiqueta="Cerrar"
              alHacerClick={confirmarCerrar}
            />
            <BotonPrimario
              etiqueta="Finalizar Revisión"
              alHacerClick={() => alAprobar(SolicitudId, validaciones)}
              deshabilitado={false} // Se permite aprobación sin documentos por falta de servidor de archivos
            />
          </div>
        </div>
      }
      hijos={
        cargando ? (
          <div style={{ height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            <Loader inline text="Cargando expedientes y documentos..." />
          </div>
        ) : (
          <div style={{ display: 'flex', height: '70vh', margin: '-24px' }}>
          {/* SIDEBAR IZQUIERDA: LISTA DE JUGADORES Y DOCS */}
          <div style={{
            width: '380px',
            borderRight: '1px solid #e2e8f0',
            overflowY: 'auto',
            backgroundColor: '#f8fafc',
            padding: '20px'
          }}>
            <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '0.05em' }}>
              Personal y documentación
            </h4>

            {Jugadores && Jugadores.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {Jugadores.map((jugador) => (
                  <div key={jugador.Id} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div style={{ padding: '12px 15px', backgroundColor: '#fff', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                        <FaUser />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{jugador.Nombre}</p>
                        <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>{jugador.CURP || 'Sin CURP'}</p>
                      </div>
                    </div>

                    <div style={{ padding: '8px' }}>
                      {jugador.Documentos && jugador.Documentos.map((doc, dIdx) => {
                        const v = validaciones[`${jugador.Id}-${doc.Tipo}`] || { estado: 'pendiente' };
                        const isActive = documentoActivo?.Url === doc.Url;

                        return (
                          <div
                            key={dIdx}
                            onClick={() => setDocumentoActivo(doc)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              marginBottom: '4px',
                              backgroundColor: isActive ? '#eff6ff' : 'transparent',
                              border: isActive ? '1px solid #bfdbfe' : '1px solid transparent',
                              transition: 'all 0.2s'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                color: v.estado === 'aprobado' ? '#10b981' : (v.estado === 'rechazado' ? '#ef4444' : '#94a3b8')
                              }}>
                                {v.estado === 'aprobado' ? <FaCheck /> : (v.estado === 'rechazado' ? <FaTimes /> : <FaFileAlt />)}
                              </div>
                              <span style={{
                                fontSize: '13px',
                                fontWeight: isActive ? '700' : '600',
                                color: isActive ? '#1e40af' : '#334155'
                              }}>
                                {doc.Tipo}
                              </span>
                            </div>
                            <FaChevronRight style={{ fontSize: '10px', color: isActive ? '#1e40af' : '#cbd5e1' }} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', marginTop: '40px' }}>No hay integrantes registrados.</p>
            )}
          </div>

          {/* PANEL PRINCIPAL: VISOR PDF Y CONTROLES */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'white' }}>
            {documentoActivo ? (
              <>
                <div style={{
                  padding: '15px 25px',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: 'white',
                  zIndex: 10
                }}>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>{documentoActivo.Tipo}</h5>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Vista previa del archivo original cargado por el usuario</p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    {/* Botones de acción rápida para el documento actual */}
                    {Jugadores.map(j => {
                      const docMatch = j.Documentos.find(d => d.Url === documentoActivo.Url);
                      if (!docMatch) return null;

                      const key = `${j.Id}-${docMatch.Tipo}`;
                      const val = validaciones[key] || { estado: 'pendiente' };

                      return (
                        <React.Fragment key={key}>
                          <button
                            onClick={() => handleValidarDoc(j.Id, docMatch.Tipo, 'aprobado')}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: val.estado === 'aprobado' ? '#10b981' : 'white',
                              color: val.estado === 'aprobado' ? 'white' : '#10b981',
                              border: '1.5px solid #10b981',
                              borderRadius: '8px',
                              fontSize: '13px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              transition: 'all 0.2s'
                            }}
                          >
                            <FaCheck /> {val.estado === 'aprobado' ? 'Aprobado' : 'Aprobar'}
                          </button>
                          <button
                            onClick={() => {
                              setRechazandoId(key);
                              setMotivoRechazo(val.motivo || '');
                              setMotivoTextoLibre(val.detalle || '');
                            }}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: val.estado === 'rechazado' ? '#ef4444' : 'white',
                              color: val.estado === 'rechazado' ? 'white' : '#ef4444',
                              border: '1.5px solid #ef4444',
                              borderRadius: '8px',
                              fontSize: '13px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              transition: 'all 0.2s'
                            }}
                          >
                            <FaTimes /> {val.estado === 'rechazado' ? 'Rechazado' : 'Rechazar'}
                          </button>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                <div style={{ flex: 1, position: 'relative', backgroundColor: '#525659' }}>
                  <iframe
                    src={`${documentoActivo.Url}#toolbar=0&navpanes=0`}
                    width="100%"
                    height="100%"
                    style={{ border: 'none' }}
                    title="Visor de Documentos"
                  />
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                <FaFileAlt style={{ fontSize: '48px', marginBottom: '15px', opacity: 0.3 }} />
                <p style={{ fontWeight: '600' }}>Selecciona un documento para comenzar la revisión</p>
              </div>
            )}
          </div>
          </div>
        )
      }
    >
      {/* OVERLAY DE MOTIVO DE RECHAZO */}
      {rechazandoId && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '16px', width: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1e293b', marginBottom: '10px' }}>Rechazar documento</h4>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>Indica el motivo por el cual este archivo no es válido.</p>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', color: '#475569' }}>Motivo común</label>
              <select
                className="form-select"
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                style={{ borderRadius: '10px', padding: '10px' }}
              >
                <option value="">-- Selecciona un motivo --</option>
                {motivosComunes.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', color: '#475569' }}>Detalles adicionales (opcional)</label>
              <textarea
                className="form-control"
                rows="3"
                placeholder="Escribe aquí si necesitas ser más específico..."
                value={motivoTextoLibre}
                onChange={(e) => setMotivoTextoLibre(e.target.value)}
                style={{ borderRadius: '10px', padding: '12px', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setRechazandoId(null)}
                style={{ padding: '10px 20px', background: 'none', border: 'none', color: '#64748b', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const [jId, tDoc] = rechazandoId.split('-');
                  handleValidarDoc(jId, tDoc, 'rechazado', motivoRechazo, motivoTextoLibre);
                }}
                disabled={!motivoRechazo && !motivoTextoLibre}
                style={{
                  padding: '10px 25px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  opacity: (!motivoRechazo && !motivoTextoLibre) ? 0.5 : 1
                }}
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
