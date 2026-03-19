import React, { useEffect, useState } from 'react';
import { FaUserCog, FaLock, FaBell, FaSave, FaFootballBall, FaTags, FaCalendar, FaPlus, FaUsers, FaShieldAlt } from 'react-icons/fa';
import Swal from 'sweetalert2';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../styles/dashboard.css';

// Componentes
import DashboardSidebar from '../../components/DashboardSidebar';
import DashboardHeader from '../../components/DashboardHeader';
import { EntradaFormulario, BotonPrimario, BotonSecundario, Alerta } from '../../components/partials';
import { createTeam } from '../../services/teams';

export default function PresidenteEquipoConfiguracion() {
  const userEmail = localStorage.getItem('email');
  const [loading, setLoading] = useState(true);
  
  // Estado para saber si ya tiene un equipo registrado
  const [hasTeam, setHasTeam] = useState(false);

  // ESTADOS PARA CREACIÓN DE EQUIPO (Paso 1)
  const [teamForm, setTeamForm] = useState({
    teamName: '',
    modality: '',
    category: '',
    season: '',
    paymentProof: null,
    teamLogo: null,
  });

  // ESTADOS PARA JUGADORES (Paso 2)
  const [jugadores, setJugadores] = useState([]); // Lista de jugadores añadidos
  const [mostrarFormularioJugador, setMostrarFormularioJugador] = useState(false);
  const [nuevoJugador, setNuevoJugador] = useState({
    nombre: '',
    curp: '',
    asignarSeguro: false
  });

  const modalities = [
    { id: 'futbol7', name: 'Fútbol 7', maxJugadores: 14 },
    { id: 'futbol9', name: 'Fútbol 9', maxJugadores: 18 },
    { id: 'futbol11', name: 'Fútbol 11', maxJugadores: 25 }
  ];

  const categories = [
    { id: 'infantil', name: 'Infantil (2012-2013)' },
    { id: 'juvenil', name: 'Juvenil (2008-2011)' },
    { id: 'mayor', name: 'Mayor Libre' },
  ];

  const seasons = [
    { id: 'clausura2026', name: 'Clausura 2026' }
  ];

  // Simulación de los seguros comprados en PreRegistro
  const [segurosComprados] = useState(5);
  const segurosUtilizados = jugadores.filter(j => j.asignarSeguro).length;
  const segurosRestantes = segurosComprados - segurosUtilizados;

  useEffect(() => {
    // Al cargar comprobamos si hay equipo
    setTimeout(() => {
      // Mock: Asumimos que no tiene equipo todavía para poder mostrar el flujo
      setHasTeam(false);
      setLoading(false);
    }, 500);
  }, []);

  const handleTeamFormChange = (campo, valor) => {
    setTeamForm(prev => ({ ...prev, [campo]: valor }));
  };

  const handleFileChange = (campo, file) => {
    if (file) {
      setTeamForm(prev => ({ ...prev, [campo]: file }));
    }
  };

  const handleSubmitEquipo = async () => {
    if (!teamForm.teamName || !teamForm.modality || !teamForm.category || !teamForm.season || !teamForm.paymentProof || !teamForm.teamLogo) {
      Swal.fire('Atención', 'Por favor llena todos los campos, incluyendo logo y comprobante', 'warning');
      return;
    }

    try {
      const payload = { ...teamForm, email: userEmail };
      await createTeam(payload);
      
      Swal.fire({
        title: 'Equipo Guardado',
        text: 'Tu equipo ha sido registrado. Ahora puedes registrar a tus jugadores. (La activación del equipo será validada en 48hs)',
        icon: 'success',
        confirmButtonColor: '#0b4ea6'
      });
      
      setHasTeam(true); // Cambiamos de vista
    } catch {
      Swal.fire('Error', 'No se pudo crear el equipo', 'error');
    }
  };

  const currentModalityData = modalities.find(m => m.id === teamForm.modality) || modalities[0];
  const maxJugadores = currentModalityData.maxJugadores;

  const handleRegistrarJugador = () => {
    if (!nuevoJugador.nombre || !nuevoJugador.curp) {
      Swal.fire('Error', 'Nombre y CURP son requeridos', 'warning');
      return;
    }

    if (jugadores.length >= maxJugadores) {
      Swal.fire('Límite', `Tu modalidad solo permite ${maxJugadores} jugadores`, 'warning');
      return;
    }

    if (nuevoJugador.asignarSeguro && segurosRestantes <= 0) {
      Swal.fire('Sin seguros', 'No te quedan seguros disponibles para asignar.', 'warning');
      return;
    }

    const nuevosJugadores = [...jugadores, { ...nuevoJugador, id: Date.now() }];
    setJugadores(nuevosJugadores);
    setNuevoJugador({ nombre: '', curp: '', asignarSeguro: false });
    setMostrarFormularioJugador(false);

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Jugador añadido localmente',
      showConfirmButton: false,
      timer: 2000
    });

    if (nuevosJugadores.length === 3) {
      Swal.fire({
        title: '¡Mínimo de jugadores alcanzado!',
        text: 'Al tener 3 jugadores ya puedes descargar el formato de afiliación para su firma.',
        icon: 'info',
        confirmButtonColor: '#0b4ea6'
      });
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="dashboard-wrapper">
      <style>{`
        .config-card {
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        .config-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #e2e8f0;
        }
        .config-title {
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }
        .radio-card {
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .radio-card.active {
          border-color: #0b4ea6;
          background: #f0fdf4;
        }
        .stats-badge {
          background: #f1f5f9;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
          border-bottom: 3px solid #0b4ea6;
        }
      `}</style>

      <DashboardSidebar userEmail={userEmail} />
      
      <div className="dashboard-container">
        <DashboardHeader userEmail={userEmail} pageTitle="Configurar Equipo" />
        
        <div className="dashboard-main">
          <div className="dashboard-content">

            {/* VISTA 1: CREAR EQUIPO SI NO HAY UNO */}
            {!hasTeam && (
              <div className="config-card">
                <div className="config-header">
                  <div style={{ padding: '10px', background: '#e0e7ff', borderRadius: '8px', color: '#4f46e5' }}><FaFootballBall size={20} /></div>
                  <div>
                    <h2 className="config-title">1. Datos Iniciales del Equipo</h2>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>Define los detalles de tu plantilla y realiza el pago de inscripción.</p>
                  </div>
                </div>

                <div className="row g-4">
                  <div className="col-md-6">
                    <label className="form-label fw-bold">Nombre del Equipo</label>
                    <input type="text" className="form-control" value={teamForm.teamName} onChange={e => handleTeamFormChange('teamName', e.target.value)} placeholder="Ej: Club Tigres" />
                  </div>
                  
                  <div className="col-md-6">
                    <label className="form-label fw-bold">Modalidad de Juego</label>
                    <select className="form-select" value={teamForm.modality} onChange={e => handleTeamFormChange('modality', e.target.value)}>
                      <option value="">-- Selecciona Modalidad --</option>
                      {modalities.map(m => <option key={m.id} value={m.id}>{m.name} (Max: {m.maxJugadores})</option>)}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold">Categoría</label>
                    <select className="form-select" value={teamForm.category} onChange={e => handleTeamFormChange('category', e.target.value)}>
                      <option value="">-- Selecciona Categoría --</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold">Temporada</label>
                    <select className="form-select" value={teamForm.season} onChange={e => handleTeamFormChange('season', e.target.value)}>
                      <option value="">-- Selecciona Temporada --</option>
                      {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold">Escudo o Logo del Equipo</label>
                    <input type="file" className="form-control" accept="image/*" onChange={e => handleFileChange('teamLogo', e.target.files[0])} />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold">Comprobante de Inscripción (PDF/JPG)</label>
                    <input type="file" className="form-control" onChange={e => handleFileChange('paymentProof', e.target.files[0])} />
                    <small className="text-muted">Abona la cuota correspondiente y sube aquí tu comprobante.</small>
                  </div>
                </div>

                <div className="text-end mt-4">
                  <button className="btn btn-primary px-4 py-2" style={{ background: '#0b4ea6' }} onClick={handleSubmitEquipo}>
                    Guardar Equipo y Continuar <FaShieldAlt className="ms-2" />
                  </button>
                </div>
              </div>
            )}

            {/* VISTA 2: GESTIONAR EQUIPO Y JUGADORES */}
            {hasTeam && (
              <>
                <div className="config-card">
                  <div className="config-header">
                    <div style={{ padding: '10px', background: '#dcfce7', borderRadius: '8px', color: '#16a34a' }}><FaUsers size={20} /></div>
                    <div>
                      <h2 className="config-title">2. Jugadores y Seguros de ({teamForm.teamName})</h2>
                      <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>Administra tu plantilla actual.</p>
                    </div>
                  </div>

                  <div className="row mb-4">
                    <div className="col-md-4">
                      <div className="stats-badge" style={{ borderBottomColor: '#3b82f6' }}>
                        <h4 style={{ margin: 0, fontWeight: 'bold' }}>{jugadores.length} / {maxJugadores}</h4>
                        <small className="text-muted">Jugadores Registrados</small>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="stats-badge" style={{ borderBottomColor: '#22c55e' }}>
                        <h4 style={{ margin: 0, fontWeight: 'bold' }}>{segurosComprados}</h4>
                        <small className="text-muted">Seguros Comprados</small>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="stats-badge" style={{ borderBottomColor: '#eab308' }}>
                        <h4 style={{ margin: 0, fontWeight: 'bold' }}>{segurosRestantes}</h4>
                        <small className="text-muted">Seguros Disponibles</small>
                      </div>
                    </div>
                  </div>

                  {jugadores.length >= 3 && (
                    <div className="alert alert-info d-flex align-items-center justify-content-between mb-4">
                      <div>
                        <strong>¡Formato Desbloqueado!</strong> Ya tienes 3 o más jugadores, puedes descargar el formato de afiliación general.
                      </div>
                      <button className="btn btn-info text-white">Descargar PDF</button>
                    </div>
                  )}

                  {!mostrarFormularioJugador ? (
                    <button className="btn btn-outline-primary mb-4 w-100 py-3 border-dashed" onClick={() => setMostrarFormularioJugador(true)}>
                      <FaPlus className="me-2" /> Añadir Nuevo Jugador
                    </button>
                  ) : (
                    <div className="p-4 bg-light border rounded mb-4">
                      <h5 className="mb-3">Registrar Jugador</h5>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label">Nombre Completo</label>
                          <input type="text" className="form-control" value={nuevoJugador.nombre} onChange={e => setNuevoJugador({...nuevoJugador, nombre: e.target.value})} />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">CURP</label>
                          <input type="text" className="form-control" value={nuevoJugador.curp} onChange={e => setNuevoJugador({...nuevoJugador, curp: e.target.value})} />
                        </div>
                        <div className="col-12 mt-3">
                           <div className="form-check form-switch">
                            <input className="form-check-input" type="checkbox" id="seguroSwitch" checked={nuevoJugador.asignarSeguro} onChange={e => setNuevoJugador({...nuevoJugador, asignarSeguro: e.target.checked})} disabled={segurosRestantes <= 0}/>
                            <label className="form-check-label" htmlFor="seguroSwitch">Asignar 1 Seguro de Gastos Médicos a este jugador (Disponibles: {segurosRestantes})</label>
                          </div>
                        </div>
                        <div className="col-12 text-end mt-3">
                          <button className="btn btn-secondary me-2" onClick={() => setMostrarFormularioJugador(false)}>Cancelar</button>
                          <button className="btn btn-success" onClick={handleRegistrarJugador}>Registrar Jugador</button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="table-responsive">
                    <table className="table table-hover align-middle">
                      <thead className="table-light">
                        <tr>
                          <th>Nombre del Jugador</th>
                          <th>CURP</th>
                          <th>Estado Seguro</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jugadores.length === 0 ? (
                          <tr><td colSpan="4" className="text-center text-muted py-4">No hay jugadores registrados.</td></tr>
                        ) : (
                          jugadores.map((j) => (
                            <tr key={j.id}>
                              <td className="fw-bold">{j.nombre}</td>
                              <td>{j.curp}</td>
                              <td>
                                {j.asignarSeguro ? <span className="badge bg-success">Asegurado</span> : <span className="badge bg-secondary">Sin Seguro</span>}
                              </td>
                              <td>
                                <button className="btn btn-sm btn-outline-primary ms-1">Editar</button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
