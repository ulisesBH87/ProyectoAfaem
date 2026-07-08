import React, { useState, useEffect, useRef } from 'react';
import { Modal, BotonPrimario, BotonSecundario, Insignia } from '../partials';
import { FaUser, FaFileAlt, FaEye, FaCheck, FaTimes, FaInfoCircle, FaChevronRight } from 'react-icons/fa';
import Loader from '../Loader';
import Swal from 'sweetalert2';
import { openSecurePath } from '../../utils/secureFetch';

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
  alGuardarProgreso,
  cargando = false
}) {
  const [documentoActivo, setDocumentoActivo] = useState(null);
  const [validaciones, setValidaciones] = useState({});
  const [rechazandoId, setRechazandoId] = useState(null); // ID del doc que se está rechazando
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [motivoTextoLibre, setMotivoTextoLibre] = useState('');
  const validacionesInicialesRef = useRef({});

  const handleVerDocumento = async (e, path) => {
    e.preventDefault();
    if (!path) return;
    try {
      Swal.fire({
        title: 'Cargando documento...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      await openSecurePath(path);
      Swal.close();
    } catch (error) {
      Swal.fire('Error', 'No se pudo abrir el documento.', 'error');
    }
  };

  // Motivos predefinidos para el dropdown
  const motivosComunes = [
    "Ilegible o borroso",
    "Documento incorrecto",
    "Fecha de vigencia expirada",
    "Falta firma",
    "Información no coincide con registro",
    "Otro"
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
      let guardadas = null;
      if (datos.ObservacionesGuardadas) {
        try {
          guardadas = JSON.parse(datos.ObservacionesGuardadas);
        } catch (e) {
          console.warn("Error parsing ObservacionesGuardadas", e);
        }
      }

      datos.Jugadores.forEach(j => {
        j.Documentos.forEach(d => {
          const key = `${j.Id}-${d.Tipo}`;

          let dbEstado = 'pendiente';
          if (d.EstadoValidacionId === 2) {
            dbEstado = 'aprobado';
          } else if (d.EstadoValidacionId === 3) {
            dbEstado = 'rechazado';
          }

          if (guardadas && guardadas[key]) {
            const finalEstado = (d.EstadoValidacionId === 2 || d.EstadoValidacionId === 3)
              ? dbEstado
              : (guardadas[key].estado || dbEstado);

            inicial[key] = {
              estado: finalEstado,
              motivo: guardadas[key].motivo || '',
              detalle: guardadas[key].detalle || ''
            };
          } else {
            inicial[key] = {
              estado: dbEstado,
              motivo: '',
              detalle: ''
            };
          }
        });
      });
      setValidaciones(inicial);
      validacionesInicialesRef.current = JSON.parse(JSON.stringify(inicial));
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

  const hayCambiosSinGuardar = () => {
    const inicial = validacionesInicialesRef.current;
    return Object.keys(validaciones).some(key => {
      const act = validaciones[key];
      const ini = inicial[key] || { estado: 'pendiente', motivo: '', detalle: '' };
      return act.estado !== ini.estado || act.motivo !== ini.motivo || act.detalle !== ini.detalle;
    });
  };

  const ejecutarAprobacionAutomatica = async () => {
    const resultado = await Swal.fire({
      title: 'Confirmar aprobación',
      text: 'Todos los documentos están marcados como aprobados. Al aceptar, se aprobará la solicitud del presidente y se crearán sus cupos para jugadores.',
      icon: 'question',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Aceptar',
      denyButtonText: 'Cancelar cambios',
      cancelButtonText: 'Seguir revisando',
      confirmButtonColor: '#10b981',
      denyButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8'
    });

    if (resultado.isConfirmed) {
      await alAprobar(SolicitudId, validaciones, true);
    } else if (resultado.isDenied) {
      // Revertir a las validaciones iniciales y cerrar el modal
      setValidaciones(JSON.parse(JSON.stringify(validacionesInicialesRef.current)));
      alCerrar();
    }
  };

  const confirmarCerrar = async () => {
    const esSolicitudAprobada = datos?.EstatusValidacion === 2;
    if (esSolicitudAprobada && !hayCambiosSinGuardar()) {
      alCerrar();
      return;
    }

    const todosAprobados = Object.keys(validaciones).length > 0 && Object.values(validaciones).every(v => v.estado === 'aprobado');
    if (todosAprobados) {
      await ejecutarAprobacionAutomatica();
      return;
    }

    if (hayCambiosSinGuardar()) {
      const resultado = await Swal.fire({
        title: 'Cambios sin guardar',
        text: 'Tienes cambios sin guardar.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Guardar progreso',
        cancelButtonText: 'Salir sin guardar',
        confirmButtonColor: '#0b4ea6',
        cancelButtonColor: '#ef4444'
      });

      if (resultado.isConfirmed) {
        if (alGuardarProgreso) {
          await alGuardarProgreso(SolicitudId, validaciones);
        }
      } else if (resultado.dismiss === Swal.DismissReason.cancel) {
        alCerrar();
      }
    } else {
      alCerrar();
    }
  };

  const totalDocs = Object.keys(validaciones).length;
  const revisados = Object.values(validaciones).filter(v => v.estado !== 'pendiente').length;
  const porcentaje = totalDocs > 0 ? (revisados / totalDocs) * 100 : 0;

  const hayDocumentos = datos?.Jugadores?.some(j => j.Documentos && j.Documentos.length > 0);

  const styles = `
    .doc-card-container {
      max-height: 70vh;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 8px 16px;
    }
    .doc-card-container::-webkit-scrollbar {
      width: 6px;
    }
    .doc-card-container::-webkit-scrollbar-track {
      background: #f8fafc;
      border-radius: 10px;
    }
    .doc-card-container::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 10px;
    }
    .doc-card-container::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }
    .modal-documentos-size {
      max-width: min(860px, 95vw) !important;
      width: 100% !important;
      margin: 0 auto;
    }
    .doc-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 20px;
      width: 100%;
    }
    @media (max-width: 768px) {
      .doc-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
      }
    }
    @media (max-width: 640px) {
      .doc-grid {
        gap: 12px;
      }
      .footer-actions {
        flex-direction: column;
        align-items: stretch !important;
        gap: 15px;
      }
      .footer-progress {
        width: 100% !important;
      }
      .footer-buttons {
        width: 100%;
        flex-direction: column-reverse;
      }
      .footer-buttons > button {
        width: 100%;
      }
      .card-buttons {
        flex-direction: column;
      }
    }
    @media (max-width: 320px) {
      .doc-grid {
        grid-template-columns: 1fr;
      }
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <Modal
        estaAbierto={estaAbierto}
        titulo={`Centro de revisión`}
        alCerrar={confirmarCerrar}
        clasesPersonalizadas="modal-documentos-size"
        pie={
          <div className="footer-actions" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', minWidth: 0 }}>
            <div className="footer-progress" style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1, minWidth: 0 }}>
              <div style={{ width: '100%', maxWidth: '200px', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                <div style={{ width: `${porcentaje}%`, height: '100%', backgroundColor: '#0b4ea6', transition: 'width 0.3s ease' }}></div>
              </div>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{revisados} de {totalDocs} archivos validados</span>
            </div>
            <div className="footer-buttons" style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
              <BotonSecundario
                etiqueta="Cancelar"
                alHacerClick={confirmarCerrar}
              />
              <BotonPrimario
                etiqueta="Finalizar Revisión"
                alHacerClick={() => {
                  const esSolicitudAprobada = datos?.EstatusValidacion === 2;
                  if (esSolicitudAprobada && !hayCambiosSinGuardar()) {
                    alCerrar();
                    return;
                  }

                  const todosAprobados = Object.keys(validaciones).length > 0 && Object.values(validaciones).every(v => v.estado === 'aprobado');
                  if (todosAprobados) {
                    ejecutarAprobacionAutomatica();
                  } else {
                    alAprobar(SolicitudId, validaciones);
                  }
                }}
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
            <div className="doc-card-container">
              {!hayDocumentos ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', padding: '40px', textAlign: 'center', minHeight: '50vh' }}>
                  <FaInfoCircle style={{ fontSize: '48px', marginBottom: '15px', color: '#f59e0b', opacity: 0.8 }} />
                  <h4 style={{ fontWeight: '700', color: '#1e293b', marginBottom: '10px' }}>No hay documentos adjuntos</h4>
                  <p style={{ fontWeight: '500', maxWidth: '400px' }}>Esta solicitud no contiene documentos que requieran revisión. Puedes proceder a aprobarla o rechazarla directamente desde los controles principales.</p>
                </div>
              ) : (
                Jugadores.map((jugador, idx) => (
                  <div key={jugador.Id} style={{ marginBottom: '30px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', padding: '0 6px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                        <FaUser />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>{jugador.Nombre}</h4>
                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>CURP: {jugador.CURP || 'No disponible'}</p>
                        {idx === 0 && datos.TipoSolicitud && (
                          <div style={{ marginTop: '6px' }}>
                            <span style={{
                              fontSize: '11px',
                              backgroundColor: '#f1f5f9',
                              color: '#475569',
                              padding: '3px 10px',
                              borderRadius: '12px',
                              border: '1px solid #cbd5e1',
                              fontWeight: '700',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <FaFileAlt style={{ fontSize: '10px' }} /> Tipo de Solicitud: {
                                (() => {
                                  const clean = datos.TipoSolicitud.toUpperCase().trim();
                                  if (clean.includes('PRESIDENTE')) return 'Crear cuenta de presidente';
                                  if (clean.includes('EQUIPO')) return 'Crear equipo';
                                  if (clean.includes('JUGADOR')) return 'Agregar jugadores';
                                  return datos.TipoSolicitud;
                                })()
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="doc-grid">
                      {jugador.Documentos && jugador.Documentos.length > 0 ? jugador.Documentos.map((doc, dIdx) => {
                        const key = `${jugador.Id}-${doc.Tipo}`;
                        const val = validaciones[key] || { estado: 'pendiente' };

                        let estadoInfo;
                        switch (val.estado) {
                          case 'aprobado': estadoInfo = { texto: 'APROBADO', color: '#10b981', bg: '#d1fae5', border: '#6ee7b7', cardBg: '#f0fdf4' }; break;
                          case 'rechazado': estadoInfo = { texto: 'RECHAZADO', color: '#ef4444', bg: '#fee2e2', border: '#fca5a5', cardBg: '#fef2f2' }; break;
                          default: estadoInfo = { texto: 'PENDIENTE', color: '#f59e0b', bg: '#fef3c7', border: '#fcd34d', cardBg: '#fffbeb' }; break;
                        }

                        return (
                          <div
                            key={dIdx}
                            className="doc-card"
                            style={{
                              minHeight: '240px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '12px',
                              padding: '20px 16px 16px 16px',
                              textAlign: 'center',
                              borderRadius: '16px',
                              border: `1.5px solid ${estadoInfo.border}`,
                              background: estadoInfo.cardBg,
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                              color: '#1e293b',
                              boxSizing: 'border-box',
                              position: 'relative',
                              textDecoration: 'none',
                              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.transform = 'translateY(-4px)';
                              e.currentTarget.style.boxShadow = '0 12px 20px -8px rgba(0, 0, 0, 0.15)';
                              e.currentTarget.querySelector('.doc-icon-wrapper').style.background = '#e0f2fe';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)';
                              e.currentTarget.querySelector('.doc-icon-wrapper').style.background = '#f0f9ff';
                            }}
                          >
                            <div style={{ position: 'absolute', top: '12px', right: '12px', padding: '3px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', color: estadoInfo.color, background: estadoInfo.bg, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                              {estadoInfo.texto}
                            </div>

                            <a
                              href="#"
                              onClick={(e) => handleVerDocumento(e, doc.Url)}
                              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '10px', textDecoration: 'none' }}
                              title="Ver documento en pestaña nueva"
                            >
                              <div className="doc-icon-wrapper" style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#f0f9ff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '10px', transition: 'background 0.2s' }}>
                                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="24" width="24" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                  <polyline points="14 2 14 8 20 8"></polyline>
                                  <line x1="16" y1="13" x2="8" y2="13"></line>
                                  <line x1="16" y1="17" x2="8" y2="17"></line>
                                  <polyline points="10 9 9 9 8 9"></polyline>
                                </svg>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', width: '100%' }}>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.04em', maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>{doc.Tipo}</span>
                                <span style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.4', textAlign: 'center' }}>Ver archivo adjunto</span>
                              </div>
                            </a>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: 'auto', width: '100%' }}>
                              <div className="card-buttons" style={{ display: 'flex', gap: '6px', width: '100%' }}>
                                <button
                                  type="button"
                                  onClick={() => handleValidarDoc(jugador.Id, doc.Tipo, val.estado === 'aprobado' ? 'pendiente' : 'aprobado')}
                                  style={{
                                    flex: 1,
                                    padding: '7px 10px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    textAlign: 'center',
                                    transition: 'all 0.2s',
                                    boxSizing: 'border-box',
                                    background: val.estado === 'aprobado' ? '#059669' : '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    boxShadow: val.estado === 'aprobado' ? 'inset 0 2px 4px rgba(0,0,0,0.1)' : '0 2px 4px rgba(16, 185, 129, 0.1)'
                                  }}
                                  onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(0.95)'}
                                  onMouseOut={(e) => e.currentTarget.style.filter = 'none'}
                                >
                                  {val.estado === 'aprobado' ? 'Desaprobar' : 'Aprobar'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (val.estado === 'rechazado') {
                                      handleValidarDoc(jugador.Id, doc.Tipo, 'pendiente');
                                    } else {
                                      setRechazandoId(key);
                                      setMotivoRechazo(val.motivo || '');
                                      setMotivoTextoLibre(val.detalle || '');
                                    }
                                  }}
                                  style={{
                                    flex: 1,
                                    padding: '7px 10px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    textAlign: 'center',
                                    transition: 'all 0.2s',
                                    boxSizing: 'border-box',
                                    background: val.estado === 'rechazado' ? '#b91c1c' : '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    boxShadow: val.estado === 'rechazado' ? 'inset 0 2px 4px rgba(0,0,0,0.1)' : '0 2px 4px rgba(239, 68, 68, 0.1)'
                                  }}
                                  onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(0.95)'}
                                  onMouseOut={(e) => e.currentTarget.style.filter = 'none'}
                                >
                                  {val.estado === 'rechazado' ? 'Rechazado' : 'Rechazar'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }) : (
                        <div style={{ gridColumn: '1 / -1', padding: '20px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                          <p style={{ margin: 0, color: '#64748b', fontSize: '13px', fontWeight: '600' }}>Este integrante no tiene documentos adjuntos.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
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
    </>
  );
}
