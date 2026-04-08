import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { FaArrowLeft, FaSave } from 'react-icons/fa';

export default function AdminCrearEquipo() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombreEquipo: '',
    liga: '1',
    categoria: '1',
    rama: '1',
    presidenteId: ''
  });
  const [haCambiado, setHaCambiado] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setHaCambiado(true);
  };

  const handleGuardar = (e) => {
    e.preventDefault();

    Swal.fire({
      title: 'Creando Equipo',
      text: 'Simulando bypass de pago...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    setTimeout(() => {
      Swal.fire({
        icon: 'success',
        title: 'Equipo Creado (Frontend)',
        text: '¡Funcionalidad de inserción del backend pendiente por tu compañero!'
      }).then(() => {
        navigate('/admin/equipos');
      });
    }, 1500);
  };

  return (
    <div className="dashboard-content">
      <div className="section-header" style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button 
          onClick={() => {
            if (haCambiado) {
              Swal.fire({
                title: '¿Estás seguro de salir?',
                text: "Tienes cambios sin guardar que se perderán.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Sí, salir sin guardar',
                cancelButtonText: 'Volver a la edición'
              }).then((result) => {
                if (result.isConfirmed) navigate('/admin/equipos');
              });
            } else {
              navigate('/admin/equipos');
            }
          }}
          className="btn btn-outline-secondary"
          style={{ padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <FaArrowLeft />
        </button>
        <div>
          <h2 className="section-title" style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Creación directa de equipo</h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Módulo administrativo (Sin validación de pago comercial)</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '800px', margin: '0 auto', padding: '30px', borderRadius: '16px' }}>
        <form onSubmit={handleGuardar}>

          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px' }}>
              Datos principales del club
            </h4>
            
            <div className="row">
              <div className="col-md-6 mb-3">
                <label style={{ fontWeight: '600', fontSize: '13px', color: '#475569', marginBottom: '8px' }}>Nombre oficial del equipo <span className="required-star">*</span></label>
                <input 
                  type="text" 
                  className="form-control" 
                  name="nombreEquipo"
                  value={formData.nombreEquipo}
                  onChange={handleChange}
                  required 
                  placeholder="Ej. Toros Neza"
                  style={{ borderRadius: '8px', padding: '10px 15px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div className="col-md-6 mb-3">
                <label style={{ fontWeight: '600', fontSize: '13px', color: '#475569', marginBottom: '8px' }}>ID o Correo del Presidente Responsable</label>
                <input 
                  type="text" 
                  className="form-control" 
                  name="presidenteId"
                  value={formData.presidenteId}
                  onChange={handleChange}
                  placeholder="Busca el correo del usuario a asignar"
                  style={{ borderRadius: '8px', padding: '10px 15px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px' }}>
              Clasificación competitiva
            </h4>
            
            <div className="row">
              <div className="col-md-4 mb-3">
                <label style={{ fontWeight: '600', fontSize: '13px', color: '#475569', marginBottom: '8px' }}>Liga destino <span className="required-star">*</span></label>
                <select 
                  className="form-select" 
                  name="liga" 
                  value={formData.liga} 
                  onChange={handleChange}
                  style={{ borderRadius: '8px', padding: '10px 15px', border: '1px solid #cbd5e1' }}
                >
                  <option value="1">Ligue AFAEM Norte</option>
                  <option value="2">Ligue AFAEM Sur</option>
                  <option value="3">Varonil Primera Plus</option>
                </select>
              </div>

              <div className="col-md-4 mb-3">
                <label style={{ fontWeight: '600', fontSize: '13px', color: '#475569', marginBottom: '8px' }}>Categoría <span className="required-star">*</span></label>
                <select 
                  className="form-select" 
                  name="categoria" 
                  value={formData.categoria} 
                  onChange={handleChange}
                  style={{ borderRadius: '8px', padding: '10px 15px', border: '1px solid #cbd5e1' }}
                >
                  <option value="1">U-15</option>
                  <option value="2">U-18</option>
                  <option value="3">Libre</option>
                </select>
              </div>

              <div className="col-md-4 mb-3">
                <label style={{ fontWeight: '600', fontSize: '13px', color: '#475569', marginBottom: '8px' }}>Rama <span className="required-star">*</span></label>
                <select 
                  className="form-select" 
                  name="rama" 
                  value={formData.rama} 
                  onChange={handleChange}
                  style={{ borderRadius: '8px', padding: '10px 15px', border: '1px solid #cbd5e1' }}
                >
                  <option value="1">Varonil</option>
                  <option value="2">Femenil</option>
                  <option value="3">Mixto</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '30px' }}>
            <button 
              type="button"
              className="btn btn-outline-secondary" 
              onClick={() => {
                if (haCambiado) {
                  Swal.fire({
                    title: '¿Estás seguro de salir?',
                    text: "Tienes cambios sin guardar que se perderán.",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#ef4444',
                    cancelButtonColor: '#64748b',
                    confirmButtonText: 'Sí, salir sin guardar',
                    cancelButtonText: 'Volver a la edición'
                  }).then((result) => {
                    if (result.isConfirmed) navigate('/admin/equipos');
                  });
                } else {
                  navigate('/admin/equipos');
                }
              }}
              style={{ padding: '10px 24px', fontWeight: '600', borderRadius: '8px' }}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ padding: '10px 24px', fontWeight: '600', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#0b4ea6', border: 'none' }}
            >
              <FaSave /> Autorizar y crear equipo
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
