import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { FaArrowLeft, FaSave } from 'react-icons/fa';
import { getEquiposDirectorio } from '../../services/admin';

export default function AdminCrearJugador() {
  const navigate = useNavigate();
  const [equiposDb, setEquiposDb] = useState([]);
  
  const [formData, setFormData] = useState({
    equipoSeleccionado: '',
    nombre: '',
    curp: '',
    sexo: '1',
    fechaNacimiento: '',
    estatura: '',
    peso: ''
  });

  useEffect(() => {
    // Carga todos los equipos validados para el Dropdown
    const fetchTeamCatalog = async () => {
      try {
        const fetchEquipos = await getEquiposDirectorio();
        setEquiposDb(fetchEquipos);
      } catch (e) {
        console.error("No se pudieron cargar los equipos:", e);
      }
    };
    fetchTeamCatalog();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGuardar = (e) => {
    e.preventDefault();

    if (!formData.equipoSeleccionado) {
      Swal.fire('Atención', 'Por favor, selecciona a qué equipo quieres agregar a este jugador.', 'warning');
      return;
    }

    Swal.fire({
      title: 'Inscribiendo Jugador',
      text: 'Comunicando con la base de datos...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    setTimeout(() => {
      Swal.fire({
        icon: 'success',
        title: 'Jugador Añadido (Frontend)',
        text: 'El compañero de backend inyectará la lógica aquí.'
      }).then(() => {
        navigate('/admin/jugadores');
      });
    }, 1500);
  };

  return (
    <div className="dashboard-content">
      <div className="section-header" style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button 
          onClick={() => navigate('/admin/jugadores')}
          className="btn btn-outline-secondary"
          style={{ padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <FaArrowLeft />
        </button>
        <div>
          <h2 className="section-title" style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Alta Rápida de Jugador</h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Inscripción administrativa con omisión de filtros de cuenta de usuario.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '800px', margin: '0 auto', padding: '30px', borderRadius: '16px' }}>
        <form onSubmit={handleGuardar}>

          <div style={{ marginBottom: '30px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#0b4ea6', marginBottom: '15px' }}>
              Destino del Jugador
            </h4>
            
            <div className="form-group">
              <label style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b', marginBottom: '8px' }}>
                ¿A qué equipo quieres agregar este jugador? *
              </label>
              <select 
                className="form-select" 
                name="equipoSeleccionado" 
                value={formData.equipoSeleccionado} 
                onChange={handleChange}
                style={{ borderRadius: '8px', padding: '12px 15px', border: '2px solid #cbd5e1', fontSize: '15px' }}
                required
              >
                <option value="" disabled>-- Selecciona un Equipo de la Liga --</option>
                {equiposDb.length > 0 ? (
                  equiposDb.map(eq => (
                    <option key={eq.EquipoId} value={eq.EquipoId}>
                      {eq.NombreEquipo} - {eq.Liga} ({eq.PresidenteNombreCompleto})
                    </option>
                  ))
                ) : (
                  <option disabled>Descargando base de datos...</option>
                )}
              </select>
              <small style={{ color: '#64748b', marginTop: '8px', display: 'block' }}>El jugador quedará asociado irremediablemente a esta entidad deportiva durante el torneo actual.</small>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px' }}>
              Datos Personales Requeridos
            </h4>
            
            <div className="row">
              <div className="col-md-6 mb-3">
                <label style={{ fontWeight: '600', fontSize: '13px', color: '#475569', marginBottom: '8px' }}>Nombre Completo *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  required 
                  placeholder="Apellidos y Nombre"
                  style={{ borderRadius: '8px', padding: '10px 15px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div className="col-md-6 mb-3">
                <label style={{ fontWeight: '600', fontSize: '13px', color: '#475569', marginBottom: '8px' }}>CURP Oficial *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  name="curp"
                  value={formData.curp}
                  onChange={handleChange}
                  required
                  placeholder="18 caracteres alfanuméricos"
                  style={{ borderRadius: '8px', padding: '10px 15px', border: '1px solid #cbd5e1', textTransform: 'uppercase' }}
                  maxLength="18"
                />
              </div>
            </div>

            <div className="row">
              <div className="col-md-4 mb-3">
                <label style={{ fontWeight: '600', fontSize: '13px', color: '#475569', marginBottom: '8px' }}>Sexo *</label>
                <select 
                  className="form-select" 
                  name="sexo" 
                  value={formData.sexo} 
                  onChange={handleChange}
                  style={{ borderRadius: '8px', padding: '10px 15px', border: '1px solid #cbd5e1' }}
                >
                  <option value="1">Masculino</option>
                  <option value="2">Femenino</option>
                </select>
              </div>

              <div className="col-md-4 mb-3">
                <label style={{ fontWeight: '600', fontSize: '13px', color: '#475569', marginBottom: '8px' }}>Estatura (cm)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  name="estatura"
                  value={formData.estatura}
                  onChange={handleChange}
                  placeholder="Ej. 175"
                  style={{ borderRadius: '8px', padding: '10px 15px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div className="col-md-4 mb-3">
                <label style={{ fontWeight: '600', fontSize: '13px', color: '#475569', marginBottom: '8px' }}>Peso (kg)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  name="peso"
                  value={formData.peso}
                  onChange={handleChange}
                  placeholder="Ej. 70"
                  style={{ borderRadius: '8px', padding: '10px 15px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '30px' }}>
            <button 
              type="button"
              className="btn btn-outline-secondary" 
              onClick={() => navigate('/admin/jugadores')}
              style={{ padding: '10px 24px', fontWeight: '600', borderRadius: '8px' }}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ padding: '10px 24px', fontWeight: '600', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#0b4ea6', border: 'none' }}
            >
              <FaSave /> Autorizar y Añadir Jugador
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
