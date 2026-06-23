import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaListAlt, FaNetworkWired, FaTrophy, FaTags, FaShieldAlt } from 'react-icons/fa';
import DashboardTable from '../../components/DashboardTable';
import Swal from 'sweetalert2';
import api from '../../services/auth';
import { getCatalogosRegistro, getEquiposDirectorio } from '../../services/admin';
import Loader from '../../components/Loader';

export default function AdminCatalogos() {
  const [catalogos, setCatalogos] = useState({
    ligas: [],
    categorias: [],
    modalidades: [],
    ramas: []
  });

  const [seccionActiva, setSeccionActiva] = useState('ligas');
  const [cargando, setCargando] = useState(true);
  const [equiposGlobales, setEquiposGlobales] = useState([]);

  // Estado para ver equipos de una liga
  const [modalEquiposShow, setModalEquiposShow] = useState(false);
  const [ligaSeleccionada, setLigaSeleccionada] = useState(null);

  // Estados para Modal Bootstrap
  const [modalShow, setModalShow] = useState(false);
  const [modalConfig, setModalConfig] = useState({ tipo: 'crear', item: null });
  const [enviando, setEnviando] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    categoriaId: '',
    modalidadId: '',
    ramaId: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      // Usamos /equipo-temporal/catalogos-registro que ya funciona en producción
      const [data, equiposData] = await Promise.all([
        getCatalogosRegistro(),
        getEquiposDirectorio()
      ]);
      setCatalogos({
        ligas: data.ligas || [],
        categorias: data.categorias || [],
        modalidades: data.modalidades || [],
        ramas: data.ramas || []
      });
      setEquiposGlobales(equiposData || []);
    } catch (error) {
      console.warn("Fallo al cargar catálogos", error);
      setCatalogos({
        ligas: [],
        categorias: [],
        modalidades: [],
        ramas: []
      });
      setEquiposGlobales([]);
    } finally {
      setCargando(false);
    }
  };

  if (cargando && catalogos.ligas.length === 0) {
    return <Loader text="Cargando catálogos del sistema..." />;
  }

  const iconos = {
    ligas: <FaTrophy />,
    categorias: <FaTags />,
    modalidades: <FaListAlt />,
    ramas: <FaNetworkWired />
  };

  const dataActual = catalogos[seccionActiva] || [];

  const columns = seccionActiva === 'ligas' ? [
    { key: "id", label: "ID" },
    { key: "nombre", label: "Nombre de la Liga" },
    { key: "categoria", label: "Categoría" },
    { key: "modalidad", label: "Modalidad" },
    { key: "rama", label: "Rama" },
    { key: "descripcion", label: "Descripción" },
    { key: "equipos_inscritos", label: "Equipos" },
    { key: "acciones", label: "Acciones", style: { width: '120px', textAlign: 'center' } }
  ] : [
    { key: "id", label: "ID" },
    { key: "nombre", label: "Nombre del Registro" },
    { key: "descripcion", label: "Descripción" },
    { key: "acciones", label: "Acciones", style: { width: '120px', textAlign: 'center' } }
  ];

  const handleEliminar = (id) => {
    Swal.fire({
      title: '¿Eliminar registro?',
      text: "Esta acción eliminará permanentemente el registro de la base de datos.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        try {
          await api.delete(`/catalogos/${seccionActiva}/${id}`);
          return true;
        } catch (error) {
          Swal.showValidationMessage(`Error: ${error.response?.data?.detail || 'No se pudo eliminar'}`);
          return false;
        }
      },
      allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        setCatalogos(prev => ({
          ...prev,
          [seccionActiva]: prev[seccionActiva].filter(item => item.id !== id)
        }));
        Swal.fire('¡Eliminado!', 'El registro se eliminó correctamente.', 'success');
      }
    });
  };

  const handleEditar = (item) => {
    setModalConfig({ tipo: 'editar', item });
    setFormData({
      nombre: (seccionActiva === 'ligas' ? (item.nombreOriginal || item.nombre) : item.nombre) || '',
      descripcion: item.descripcion || '',
      categoriaId: item.categoriaId || '',
      modalidadId: item.modalidadId || '',
      ramaId: item.ramaId || ''
    });
    setModalShow(true);
  };

  const handleCrear = () => {
    setModalConfig({ tipo: 'crear', item: null });
    setFormData({
      nombre: '',
      descripcion: '',
      categoriaId: '',
      modalidadId: '',
      ramaId: ''
    });
    setModalShow(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    const isLiga = seccionActiva === 'ligas';
    const { nombre, descripcion, categoriaId, modalidadId, ramaId } = formData;

    if (!nombre) {
      Swal.fire('Error', 'El nombre no puede estar vacío', 'error');
      return;
    }

    let payload = { nombre, descripcion };
    if (isLiga) {
      if (!categoriaId || !modalidadId || !ramaId) {
        Swal.fire('Error', 'Categoría, Modalidad y Rama son requeridas', 'error');
        return;
      }
      payload.categoriaId = parseInt(categoriaId);
      payload.modalidadId = parseInt(modalidadId);
      payload.ramaId = parseInt(ramaId);
    }

    setEnviando(true);
    try {
      if (modalConfig.tipo === 'crear') {
        const response = await api.post(`/catalogos/${seccionActiva}`, payload);
        setCatalogos(prev => ({
          ...prev,
          [seccionActiva]: [...prev[seccionActiva], response.data]
        }));
        Swal.fire('¡Éxito!', 'El registro se ha creado correctamente.', 'success');
      } else {
        const response = await api.put(`/catalogos/${seccionActiva}/${modalConfig.item.id}`, payload);
        setCatalogos(prev => ({
          ...prev,
          [seccionActiva]: prev[seccionActiva].map(i => i.id === modalConfig.item.id ? response.data : i)
        }));
        Swal.fire('¡Actualizado!', 'El registro se ha guardado correctamente.', 'success');
      }
      setModalShow(false);
    } catch (error) {
      Swal.fire('Error', error.response?.data?.detail || 'No se pudo procesar la solicitud', 'error');
    } finally {
      setEnviando(false);
    }
  };

  const dataTransformada = dataActual.map(item => {
    const row = {
      id: <span style={{ fontWeight: '700', color: '#64748b' }}>#{item.id}</span>,
      nombre: <span style={{ fontWeight: '600' }}>{seccionActiva === 'ligas' ? (item.nombreOriginal || item.nombre) : item.nombre}</span>,
      descripcion: <span style={{ color: '#64748b' }}>{item.descripcion || '-'}</span>,
      acciones: (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <button
            onClick={() => handleEditar(item)}
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#3b82f6', cursor: 'pointer', padding: '6px 10px', borderRadius: '6px' }}
          >
            <FaEdit />
          </button>
          <button
            onClick={() => handleEliminar(item.id)}
            style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', cursor: 'pointer', padding: '6px 10px', borderRadius: '6px' }}
          >
            <FaTrash />
          </button>
        </div>
      )
    };
    if (seccionActiva === 'ligas') {
      row.categoria = <span style={{ fontWeight: '500', color: '#0f172a' }}>{item.nombreCategoria || '-'}</span>;
      row.modalidad = <span style={{ fontWeight: '500', color: '#0f172a' }}>{item.nombreModalidad || '-'}</span>;
      row.rama = <span style={{ fontWeight: '500', color: '#0f172a' }}>{item.nombreRama || '-'}</span>;

      const numEquipos = equiposGlobales.filter(e => String(e.LigaId) === String(item.id)).length;
      row.equipos_inscritos = (
        <button
          onClick={() => {
            setLigaSeleccionada(item);
            setModalEquiposShow(true);
          }}
          style={{
            background: '#e0e7ff', border: 'none', color: '#4338ca', cursor: 'pointer',
            padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '800',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          <FaShieldAlt /> {numEquipos}
        </button>
      );
    }
    return row;
  });


  return (
    <div style={{ padding: '30px' }}>
      <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>Gestor de Catálogos</h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Administra Ligas, Categorías, Modalidades y Ramas.</p>
        </div>
        <button
          onClick={handleCrear}
          style={{
            background: '#0b4ea6', color: 'white', border: 'none', borderRadius: '10px',
            padding: '12px 24px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px',
            cursor: 'pointer'
          }}
        >
          <FaPlus /> Crear Nuevo
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        {Object.keys(catalogos).map(seccion => (
          <div
            key={seccion}
            onClick={() => setSeccionActiva(seccion)}
            style={{
              background: seccionActiva === seccion ? '#eff6ff' : 'white',
              padding: '24px 20px',
              borderRadius: '16px',
              border: seccionActiva === seccion ? '2px solid #3b82f6' : '1px solid #e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'center',
              boxShadow: seccionActiva === seccion ? '0 4px 15px rgba(59, 130, 246, 0.15)' : 'none',
              transform: seccionActiva === seccion ? 'translateY(-3px)' : 'none'
            }}
          >
            <div style={{ fontSize: '28px', color: seccionActiva === seccion ? '#2563eb' : '#94a3b8', marginBottom: '10px' }}>
              {iconos[seccion]}
            </div>
            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: seccionActiva === seccion ? '#1e3a8a' : '#475569', textTransform: 'uppercase' }}>
              {seccion}
            </h4>
            <p style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: seccionActiva === seccion ? '#3b82f6' : '#94a3b8', marginTop: '5px' }}>
              {catalogos[seccion].length}
            </p>
          </div>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: '16px', padding: '25px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
        <h4 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '800', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '15px' }}>
          Directorio de {seccionActiva.charAt(0).toUpperCase() + seccionActiva.slice(1)}
        </h4>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <DashboardTable
            columns={columns}
            data={dataTransformada}
            isLoading={cargando}
            emptyMessage={`No hay registros en ${seccionActiva}`}
          />
        </div>
      </div>

      {/* Modal Nativo de Bootstrap */}
      {modalShow && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content" style={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
              <div className="modal-header" style={{ borderBottom: '1px solid #f1f5f9', padding: '20px 24px' }}>
                <h5 className="modal-title" style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>
                  {modalConfig.tipo === 'crear' ? `Nuevo Registro en ${seccionActiva.toUpperCase()}` : 'Editar Registro'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setModalShow(false)} aria-label="Close" style={{ fontSize: '12px' }}></button>
              </div>

              <form onSubmit={handleModalSubmit}>
                <div className="modal-body" style={{ padding: '24px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>Nombre <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.nombre}
                      onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej. Liga MX"
                      style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '14px', background: '#f8fafc', border: '1.5px solid #cbd5e1', boxShadow: 'none' }}
                      required
                    />
                  </div>

                  {seccionActiva === 'ligas' && (
                    <>
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ fontSize: '13px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>Descripción</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.descripcion}
                          onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                          placeholder="Descripción opcional..."
                          style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '14px', background: '#f8fafc', border: '1.5px solid #cbd5e1', boxShadow: 'none' }}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                        <div>
                          <label style={{ fontSize: '13px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>Categoría <span style={{ color: '#ef4444' }}>*</span></label>
                          <select className="form-select" value={formData.categoriaId} onChange={e => setFormData({ ...formData, categoriaId: e.target.value })} style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '14px', background: '#f8fafc', cursor: 'pointer', border: '1.5px solid #cbd5e1', boxShadow: 'none' }} required>
                            <option value="">Selecciona Categoría...</option>
                            {catalogos.categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '13px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>Modalidad <span style={{ color: '#ef4444' }}>*</span></label>
                          <select className="form-select" value={formData.modalidadId} onChange={e => setFormData({ ...formData, modalidadId: e.target.value })} style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '14px', background: '#f8fafc', cursor: 'pointer', border: '1.5px solid #cbd5e1', boxShadow: 'none' }} required>
                            <option value="">Selecciona Modalidad...</option>
                            {catalogos.modalidades.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '13px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>Rama <span style={{ color: '#ef4444' }}>*</span></label>
                          <select className="form-select" value={formData.ramaId} onChange={e => setFormData({ ...formData, ramaId: e.target.value })} style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '14px', background: '#f8fafc', cursor: 'pointer', border: '1.5px solid #cbd5e1', boxShadow: 'none' }} required>
                            <option value="">Selecciona Rama...</option>
                            {catalogos.ramas.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                          </select>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="modal-footer" style={{ borderTop: '1px solid #f1f5f9', padding: '16px 24px', background: '#f8fafc', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                  <button type="button" className="btn btn-light" onClick={() => setModalShow(false)} style={{ borderRadius: '10px', fontWeight: '700', padding: '10px 20px', background: 'white', border: '1px solid #e2e8f0', color: '#64748b' }} disabled={enviando}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" style={{ borderRadius: '10px', fontWeight: '700', padding: '10px 20px', background: '#0b4ea6', border: 'none' }} disabled={enviando}>
                    {enviando ? 'Guardando...' : (modalConfig.tipo === 'crear' ? 'Crear Registro' : 'Guardar Cambios')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Modal para Ver Equipos de la Liga */}
      {modalEquiposShow && ligaSeleccionada && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content" style={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
              <div className="modal-header" style={{ borderBottom: '1px solid #f1f5f9', padding: '20px 24px', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
                <div>
                  <h5 className="modal-title" style={{ fontSize: '18px', fontWeight: '800', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaTrophy style={{ color: '#3b82f6' }} /> Equipos inscritos en {ligaSeleccionada.nombreOriginal || ligaSeleccionada.nombre}
                  </h5>
                  <p style={{ margin: 0, fontSize: '13px', color: '#3b82f6', marginTop: '4px', fontWeight: '500' }}>
                    {ligaSeleccionada.nombreCategoria} - {ligaSeleccionada.nombreModalidad} - {ligaSeleccionada.nombreRama}
                  </p>
                </div>
                <button type="button" className="btn-close" onClick={() => setModalEquiposShow(false)} aria-label="Close" style={{ fontSize: '12px' }}></button>
              </div>
              <div className="modal-body" style={{ padding: '0', maxHeight: '60vh', overflowY: 'auto' }}>
                {(() => {
                  const equiposFiltrados = equiposGlobales.filter(e => String(e.LigaId) === String(ligaSeleccionada.id));
                  if (equiposFiltrados.length === 0) {
                    return (
                      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                        <FaShieldAlt style={{ fontSize: '40px', marginBottom: '10px', opacity: 0.5 }} />
                        <h4 style={{ margin: '0 0 5px 0', fontSize: '16px', fontWeight: '700', color: '#64748b' }}>No hay equipos</h4>
                        <p style={{ margin: 0, fontSize: '13px' }}>Aún no se han inscrito equipos en esta liga.</p>
                      </div>
                    );
                  }
                  return (
                    <div className="table-responsive">
                      <table className="table" style={{ margin: 0, fontSize: '13px' }}>
                        <thead style={{ background: '#f8fafc', color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                          <tr>
                            <th style={{ padding: '12px 24px', fontWeight: '800', borderBottom: '1px solid #e2e8f0' }}>Equipo</th>
                            <th style={{ padding: '12px 24px', fontWeight: '800', borderBottom: '1px solid #e2e8f0' }}>Presidente</th>
                            <th style={{ padding: '12px 24px', fontWeight: '800', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>Estatus</th>
                          </tr>
                        </thead>
                        <tbody>
                          {equiposFiltrados.map((eq, idx) => (
                            <tr key={eq.EquipoId} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                              <td style={{ padding: '12px 24px', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #f1f5f9' }}>{eq.NombreEquipo}</td>
                              <td style={{ padding: '12px 24px', color: '#475569', borderBottom: '1px solid #f1f5f9' }}>{eq.PresidenteNombreCompleto || 'Sin presidente'}</td>
                              <td style={{ padding: '12px 24px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                                {eq.Estatus ?
                                  <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '800' }}>ACTIVO</span> :
                                  <span style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '800' }}>INACTIVO</span>
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid #f1f5f9', padding: '16px 24px', background: '#f8fafc', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                <button type="button" className="btn btn-primary" onClick={() => setModalEquiposShow(false)} style={{ borderRadius: '10px', fontWeight: '700', padding: '10px 20px', background: '#0b4ea6', border: 'none' }}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
