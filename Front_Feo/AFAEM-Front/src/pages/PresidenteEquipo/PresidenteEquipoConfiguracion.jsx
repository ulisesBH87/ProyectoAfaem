import React, { useEffect, useState } from 'react';
import {
  FaFutbol, FaUsers, FaEdit, FaSave, FaTimes,
  FaSyncAlt, FaShieldAlt, FaUserPlus, FaArrowRight,
  FaCheckCircle, FaExclamationTriangle
} from 'react-icons/fa';
import Swal from 'sweetalert2';
import teamsService from '../../services/teams';
import Loader from '../../components/Loader';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../routes/paths';
import { API_BASE } from '../../config/config';
import axios from 'axios';

// Cliente autenticado reutilizable
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

export default function PresidenteEquipoConfiguracion() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [equipos, setEquipos] = useState([]);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);
  const [editando, setEditando] = useState(false);
  const [formNombre, setFormNombre] = useState('');
  const [guardando, setGuardando] = useState(false);

  // ── Carga inicial de equipos ─────────────────────────────────────────────
  const cargarEquipos = async (equipoIdActual = null) => {
    setLoading(true);
    try {
      const data = await teamsService.getUserTeamsReal();
      const lista = Array.isArray(data) ? data : [];
      setEquipos(lista);

      if (lista.length > 0) {
        // Si ya había un equipo seleccionado, refrescamos sus datos del listado nuevo
        const idBuscar = equipoIdActual || equipoSeleccionado?.EquipoId;
        const refrescado = idBuscar ? lista.find(e => e.EquipoId === idBuscar) : null;
        const nuevo = refrescado || lista[0];
        setEquipoSeleccionado(nuevo);
        setFormNombre(nuevo.NombreEquipo || '');
      }
    } catch {
      setEquipos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarEquipos();
  }, []);

  // ── Guardar nombre del equipo ─────────────────────────────────────────────
  const handleGuardar = async () => {
    if (!formNombre.trim()) {
      Swal.fire('Atención', 'El nombre del equipo no puede estar vacío.', 'warning');
      return;
    }
    setGuardando(true);
    try {
      await axios.patch(
        `${API_BASE}/equipo-temporal/update-equipo/${equipoSeleccionado.EquipoId}`,
        { NombreEquipo: formNombre.trim(), Estatus: equipoSeleccionado.Estatus },
        { headers: getAuthHeaders() }
      );
      Swal.fire({ icon: 'success', title: '¡Guardado!', text: 'El nombre del equipo fue actualizado.', timer: 2000, showConfirmButton: false });
      setEditando(false);
      // Pasamos el id actual para que al refrescar siga seleccionado el mismo equipo
      cargarEquipos(equipoSeleccionado.EquipoId);
    } catch {
      Swal.fire('Error', 'No se pudo actualizar el equipo. Intenta de nuevo.', 'error');
    } finally {
      setGuardando(false);
    }
  };

  // ── Seleccionar equipo del selector ──────────────────────────────────────
  const handleSeleccionarEquipo = (id) => {
    const eq = equipos.find(e => e.EquipoId === Number(id));
    if (eq) {
      setEquipoSeleccionado(eq);
      setFormNombre(eq.NombreEquipo || '');
      setEditando(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ESTADO: CARGANDO
  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return <Loader text="Cargando configuración de equipo..." />;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ESTADO: SIN EQUIPOS → flujo de creación
  // ─────────────────────────────────────────────────────────────────────────
  if (equipos.length === 0) {
    return (
      <div className="fade-in-up">
        <header style={{ marginBottom: '32px' }}>
          <h2 className="heading-outfit" style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
            Configuración de equipo
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px' }}>
            Aún no tienes ningún equipo registrado.
          </p>
        </header>

        <div className="card glass" style={{ padding: '48px', borderRadius: '24px', textAlign: 'center', maxWidth: '520px', margin: '0 auto' }}>
          <div style={{ fontSize: '56px', marginBottom: '20px' }}>⚽</div>
          <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 12px' }}>
            Crea tu primer equipo
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '28px', lineHeight: '1.6' }}>
            Para comenzar debes completar el pre-registro de tu equipo con todos los documentos y jugadores requeridos.
          </p>
          <button
            className="btn-premium"
            onClick={() => navigate(ROUTES.PRESIDENTE.REGISTRO_JUGADORES)}
            style={{ padding: '14px 32px', fontSize: '15px', display: 'inline-flex', alignItems: 'center', gap: '10px' }}
          >
            <FaUserPlus /> Registrar mi equipo
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ESTADO: CON EQUIPOS
  // ─────────────────────────────────────────────────────────────────────────
  const eq = equipoSeleccionado;

  const estatusBadge = (estatus) => {
    if (estatus) return { label: 'Activo', bg: '#dcfce7', color: '#166534', icon: <FaCheckCircle size={11} /> };
    return { label: 'Inactivo', bg: '#fee2e2', color: '#991b1b', icon: <FaExclamationTriangle size={11} /> };
  };
  const badge = eq ? estatusBadge(eq.Estatus) : null;

  return (
    <div className="fade-in-up" style={{ padding: '4px 0 32px' }}>
      {/* ENCABEZADO */}
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="heading-outfit" style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
            Configuración de equipo
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px' }}>
            Administra los datos de tus equipos registrados.
          </p>
        </div>
        <button
          onClick={cargarEquipos}
          className="glass"
          style={{
            padding: '10px 18px', backgroundColor: 'white', border: '1.5px solid var(--border-light)',
            borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '13px',
            display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)'
          }}
        >
          <FaSyncAlt /> Actualizar
        </button>
      </header>

      {/* SELECTOR SI HAY MÁS DE UN EQUIPO */}
      {equipos.length > 1 && (
        <div className="card" style={{ padding: '20px 24px', borderRadius: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <FaFutbol style={{ color: 'var(--primary)', fontSize: '18px', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
              Selecciona un equipo
            </label>
            <select
              value={eq?.EquipoId || ''}
              onChange={e => handleSeleccionarEquipo(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', border: '1.5px solid var(--border-light)',
                borderRadius: '10px', fontSize: '14px', fontWeight: '700',
                color: 'var(--text-main)', background: 'white', cursor: 'pointer'
              }}
            >
              {equipos.map(e => (
                <option key={e.EquipoId} value={e.EquipoId}>{e.NombreEquipo}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {eq && (
        <>
          {/* TARJETA PRINCIPAL DEL EQUIPO */}
          <div className="card glass" style={{ padding: '28px', borderRadius: '22px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* Logo o placeholder */}
                <div style={{
                  width: '64px', height: '64px', borderRadius: '18px',
                  background: 'rgba(37,99,235,0.08)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  border: '2px solid rgba(37,99,235,0.15)', overflow: 'hidden', flexShrink: 0
                }}>
                  {eq.RutaLogo
                    ? <img src={`/${eq.RutaLogo}`} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <FaFutbol style={{ fontSize: '26px', color: 'var(--primary)' }} />
                  }
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>
                      {eq.NombreEquipo}
                    </h3>
                    {badge && (
                      <span style={{
                        padding: '4px 12px', borderRadius: '20px',
                        background: badge.bg, color: badge.color,
                        fontSize: '11px', fontWeight: '800',
                        display: 'inline-flex', alignItems: 'center', gap: '5px'
                      }}>
                        {badge.icon} {badge.label}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                    {eq.Categoria} · {eq.Modalidad} · {eq.Rama}
                  </p>
                </div>
              </div>

              {/* Botón editar / guardar */}
              {!editando
                ? (
                  <button
                    onClick={() => setEditando(true)}
                    style={{
                      padding: '10px 20px', background: 'rgba(37,99,235,0.07)', color: 'var(--primary)',
                      border: '1.5px solid rgba(37,99,235,0.2)', borderRadius: '12px',
                      fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '8px'
                    }}
                  >
                    <FaEdit /> Editar nombre
                  </button>
                )
                : (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={handleGuardar}
                      disabled={guardando}
                      className="btn-premium"
                      style={{ padding: '10px 20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <FaSave /> {guardando ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button
                      onClick={() => { setEditando(false); setFormNombre(eq.NombreEquipo); }}
                      style={{
                        padding: '10px 16px', background: 'white', color: 'var(--text-muted)',
                        border: '1.5px solid var(--border-light)', borderRadius: '12px',
                        fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '8px'
                      }}
                    >
                      <FaTimes /> Cancelar
                    </button>
                  </div>
                )
              }
            </div>

            {/* Campo de edición del nombre */}
            {editando && (
              <div style={{
                padding: '20px', background: 'rgba(37,99,235,0.04)',
                border: '1.5px dashed rgba(37,99,235,0.25)', borderRadius: '14px',
                marginBottom: '20px'
              }}>
                <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                  Nuevo nombre del equipo
                </label>
                <input
                  value={formNombre}
                  onChange={e => setFormNombre(e.target.value)}
                  placeholder="Ej. Club Deportivo Tigres"
                  style={{
                    width: '100%', padding: '12px 16px',
                    border: '1.5px solid rgba(37,99,235,0.3)', borderRadius: '10px',
                    fontSize: '15px', fontWeight: '700', color: 'var(--text-main)',
                    outline: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>
            )}

            {/* DATOS DEL EQUIPO EN GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
              {[
                { label: 'Liga', value: eq.Liga || '—' },
                { label: 'Categoría', value: eq.Categoria || '—' },
                { label: 'Modalidad', value: eq.Modalidad || '—' },
                { label: 'Rama', value: eq.Rama || '—' },
                { label: 'Jugadores', value: eq.NumeroJugadores ?? '—' },
                { label: 'Fecha creación', value: eq.FechaCreacion ? new Date(eq.FechaCreacion).toLocaleDateString('es-MX') : '—' },
              ].map((d, i) => (
                <div key={i} style={{
                  padding: '14px 16px', background: 'var(--bg-main)',
                  borderRadius: '12px', border: '1px solid var(--border-light)'
                }}>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    {d.label}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)' }}>{d.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ACCIONES RELACIONADAS */}
          <div className="card" style={{ padding: '24px', borderRadius: '20px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 16px' }}>
              Acciones del equipo
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {[
                { icon: <FaUserPlus />, label: 'Registrar nuevo jugador', ruta: ROUTES.PRESIDENTE.REGISTRO_JUGADORES, color: 'var(--primary)' },
                { icon: <FaUsers />, label: 'Ver directorio de jugadores', ruta: ROUTES.PRESIDENTE.MIS_JUGADORES, color: 'var(--secondary)' },
                { icon: <FaShieldAlt />, label: 'Ver mis equipos', ruta: ROUTES.PRESIDENTE.EQUIPOS, color: '#6366f1' },
              ].map((accion, i) => (
                <button
                  key={i}
                  onClick={() => navigate(accion.ruta)}
                  style={{
                    padding: '16px 20px', background: `${accion.color}08`,
                    border: `1.5px solid ${accion.color}20`, borderRadius: '14px',
                    display: 'flex', alignItems: 'center', gap: '12px',
                    cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = `${accion.color}12`;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = `${accion.color}08`;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ color: accion.color, fontSize: '18px' }}>{accion.icon}</div>
                  <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-main)', flex: 1 }}>{accion.label}</span>
                  <FaArrowRight style={{ color: 'var(--text-muted)', fontSize: '12px' }} />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
