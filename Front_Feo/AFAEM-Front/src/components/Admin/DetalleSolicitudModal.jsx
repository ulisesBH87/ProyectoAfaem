import React from 'react';
import { Modal, BotonPrimario, BotonSecundario, Insignia } from '../partials';
import { FaUser, FaFileAlt, FaEye, FaCheck, FaTimes } from 'react-icons/fa';

/**
 * MODAL DETALLE DE SOLICITUD PARA ADMINISTRADOR
 * Permite revisar documentos de jugadores y aprobar/rechazar la solicitud.
 */
export default function DetalleSolicitudModal({ 
  estaAbierto, 
  alCerrar, 
  datos, 
  alAprobar, 
  alRechazar,
  cargando = false 
}) {
  if (!datos) return null;

  const { Equipo, SolicitudId, Jugadores } = datos;

  return (
    <Modal
      estaAbierto={estaAbierto}
      titulo={`Revisión de Documentos: ${Equipo || 'Cargando...'}`}
      alCerrar={alCerrar}
      tamanio="grande"
      pie={
        <>
          <BotonSecundario 
            etiqueta="Rechazar Todo" 
            alHacerClick={() => alRechazar(SolicitudId)} 
            tipo="button"
          />
          <BotonPrimario 
            etiqueta="Aprobar Solicitud ✓" 
            alHacerClick={() => alAprobar(SolicitudId)} 
          />
        </>
      }
      hijos={
        <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '10px' }}>
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>
              ID Solicitud: <span style={{ color: '#0b4ea6' }}>#{SolicitudId}</span>
            </h4>
            <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              Revisa que toda la documentación de los {Jugadores?.length || 0} jugadores sea legible y correcta.
            </p>
          </div>

          {Jugadores && Jugadores.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {Jugadores.map((jugador, idx) => (
                <div 
                  key={jugador.Id || idx} 
                  style={{ 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '10px', 
                    padding: '16px',
                    backgroundColor: 'white' 
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#0b4ea615', color: '#0b4ea6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FaUser />
                      </div>
                      <div>
                        <h5 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>{jugador.Nombre}</h5>
                        <small style={{ color: '#64748b' }}>CURP: {jugador.CURP || 'N/A'}</small>
                      </div>
                    </div>
                    <Insignia etiqueta="Pendiente" tipo="advertencia" />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                    {jugador.Documentos && jugador.Documentos.map((doc, dIdx) => (
                      <div 
                        key={dIdx} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          padding: '10px 12px', 
                          backgroundColor: '#f1f5f9', 
                          borderRadius: '6px',
                          border: '1px solid transparent'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FaFileAlt style={{ color: '#64748b', fontSize: '14px' }} />
                          <span style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>{doc.Tipo}</span>
                        </div>
                        <a 
                          href={doc.Url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ 
                            color: '#0b4ea6', 
                            fontSize: '16px', 
                            display: 'flex', 
                            alignItems: 'center',
                            cursor: 'pointer'
                          }}
                          title="Ver archivo"
                        >
                          <FaEye />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              No hay jugadores o documentos vinculados a esta solicitud.
            </div>
          )}
        </div>
      }
    />
  );
}
