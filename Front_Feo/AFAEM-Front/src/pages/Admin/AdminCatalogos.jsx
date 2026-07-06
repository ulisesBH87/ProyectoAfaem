import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaListAlt, FaNetworkWired, FaTrophy, FaTags, FaShieldAlt } from 'react-icons/fa';
import DashboardTable from '../../components/DashboardTable';
import Swal from 'sweetalert2';
import api from '../../services/auth';
import { getCatalogosRegistro, getEquiposDirectorio, getSegurosAdmin, createSeguroAdmin, updateSeguroAdmin, deleteSeguroAdmin } from '../../services/admin';
import Loader from '../../components/Loader';
import COLORS from '../../styles/colors';

export default function AdminCatalogos() {
  const [catalogos, setCatalogos] = useState({
    ligas: [],
    categorias: [],
    modalidades: [],
    ramas: [],
    seguros: []
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
    ramaId: '',
    precio: '',
    tipoVigencia: 1,
    vigenciaTemporal: '',
    fechaVigencia: '',
    activo: true,
    tipoPersonaId: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      // Usamos /equipo-temporal/catalogos-registro que ya funciona en producción
      const [data, equiposData, segurosData] = await Promise.all([
        getCatalogosRegistro(),
        getEquiposDirectorio(),
        getSegurosAdmin()
      ]);
      setCatalogos({
        ligas: data.ligas || [],
        categorias: data.categorias || [],
        modalidades: data.modalidades || [],
        ramas: data.ramas || [],
        seguros: (segurosData || []).map(s => ({
          ...s,
          id: s.SeguroId,
          nombre: s.Nombre,
          precio: s.Precio,
          activo: s.Activo
        }))
      });
      setEquiposGlobales(equiposData || []);
    } catch (error) {
      console.warn("Fallo al cargar catálogos", error);
      setCatalogos({
        ligas: [],
        categorias: [],
        modalidades: [],
        ramas: [],
        seguros: []
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
    ramas: <FaNetworkWired />,
    seguros: <FaShieldAlt />
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
  ] : seccionActiva === 'seguros' ? [
    { key: "id", label: "ID" },
    { key: "nombre", label: "Seguro" },
    { key: "precio", label: "Costo ($)" },
    { key: "vigencia", label: "Vigencia" },
    { key: "activo", label: "Estatus", style: { textAlign: 'center' } },
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
          if (seccionActiva === 'seguros') {
            await deleteSeguroAdmin(id);
          } else {
            await api.delete(`/catalogos/${seccionActiva}/${id}`);
          }
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
          [seccionActiva]: prev[seccionActiva].filter(item => (item.id || item.SeguroId) !== id)
        }));
        Swal.fire('¡Eliminado!', 'El registro se eliminó correctamente.', 'success');
      }
    });
  };

  const handleEditar = (item) => {
    setModalConfig({ tipo: 'editar', item });
    if (seccionActiva === 'seguros') {
      setFormData({
        nombre: item.Nombre || item.nombre || '',
        precio: item.Precio ?? item.precio ?? '',
        tipoVigencia: item.TipoVigencia ?? item.tipoVigencia ?? 1,
        vigenciaTemporal: item.VigenciaTemporal ?? item.vigenciaTemporal ?? '',
        fechaVigencia: item.FechaVigencia ?? item.fechaVigencia ?? '',
        activo: item.Activo ?? item.activo ?? true,
        tipoPersonaId: item.TipoPersonaId ?? item.tipoPersonaId ?? ''
      });
    } else {
      setFormData({
        nombre: (seccionActiva === 'ligas' ? (item.nombreOriginal || item.nombre) : item.nombre) || '',
        descripcion: item.descripcion || '',
        categoriaId: item.categoriaId || '',
        modalidadId: item.modalidadId || '',
        ramaId: item.ramaId || ''
      });
    }
    setModalShow(true);
  };

  const handleCrear = () => {
    setModalConfig({ tipo: 'crear', item: null });
    if (seccionActiva === 'seguros') {
      setFormData({
        nombre: '',
        precio: '',
        tipoVigencia: 1,
        vigenciaTemporal: '',
        fechaVigencia: '',
        activo: true,
        tipoPersonaId: ''
      });
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        categoriaId: '',
        modalidadId: '',
        ramaId: ''
      });
    }
    setModalShow(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    const isSeguros = seccionActiva === 'seguros';
    const isLiga = seccionActiva === 'ligas';
    const { nombre, descripcion, categoriaId, modalidadId, ramaId, precio, tipoVigencia, vigenciaTemporal, fechaVigencia, activo, tipoPersonaId } = formData;

    if (!nombre) {
      Swal.fire('Error', 'El nombre no puede estar vacío', 'error');
      return;
    }

    if (isSeguros) {
      if (precio === '' || isNaN(parseFloat(precio))) {
        Swal.fire('Error', 'El precio debe ser un número válido', 'error');
        return;
      }
      if (parseInt(tipoVigencia) === 1 && !vigenciaTemporal) {
        Swal.fire('Error', 'La vigencia en meses es requerida', 'error');
        return;
      }
      if (parseInt(tipoVigencia) === 2 && !fechaVigencia) {
        Swal.fire('Error', 'La fecha de vigencia es requerida', 'error');
        return;
      }
    }

    let payload = {};
    if (isSeguros) {
      payload = {
        Nombre: nombre,
        Precio: parseFloat(precio),
        TipoVigencia: parseInt(tipoVigencia),
        VigenciaTemporal: parseInt(tipoVigencia) === 1 ? parseInt(vigenciaTemporal) : null,
        FechaVigencia: parseInt(tipoVigencia) === 2 ? fechaVigencia : null,
        Activo: activo,
        TipoPersonaId: tipoPersonaId ? parseInt(tipoPersonaId) : null
      };
    } else {
      payload = { nombre, descripcion };
      if (isLiga) {
        if (!categoriaId || !modalidadId || !ramaId) {
          Swal.fire('Error', 'Categoría, Modalidad y Rama son requeridas', 'error');
          return;
        }
        payload.categoriaId = parseInt(categoriaId);
        payload.modalidadId = parseInt(modalidadId);
        payload.ramaId = parseInt(ramaId);
      }
    }

    setEnviando(true);
    try {
      if (modalConfig.tipo === 'crear') {
        let response;
        if (isSeguros) {
          response = await createSeguroAdmin(payload);
        } else {
          response = await api.post(`/catalogos/${seccionActiva}`, payload);
        }
        
        const nuevoItem = isSeguros ? {
          ...response,
          id: response.SeguroId,
          nombre: response.Nombre,
          precio: response.Precio,
          activo: response.Activo
        } : response;

        setCatalogos(prev => ({
          ...prev,
          [seccionActiva]: [...prev[seccionActiva], nuevoItem]
        }));
        Swal.fire('¡Éxito!', 'El registro se ha creado correctamente.', 'success');
      } else {
        const itemId = modalConfig.item.id || modalConfig.item.SeguroId;
        let response;
        if (isSeguros) {
          response = await updateSeguroAdmin(itemId, payload);
        } else {
          response = await api.put(`/catalogos/${seccionActiva}/${itemId}`, payload);
        }

        const itemActualizado = isSeguros ? {
          ...response,
          id: response.SeguroId,
          nombre: response.Nombre,
          precio: response.Precio,
          activo: response.Activo
        } : response;

        setCatalogos(prev => ({
          ...prev,
          [seccionActiva]: prev[seccionActiva].map(i => (i.id || i.SeguroId) === itemId ? itemActualizado : i)
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
    if (seccionActiva === 'seguros') {
      const vigenciaLabel = item.TipoVigencia === 1 
        ? `${item.VigenciaTemporal} meses` 
        : item.FechaVigencia 
          ? new Date(item.FechaVigencia).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
          : '-';

      return {
        id: <span style={{ fontWeight: '700', color: COLORS.slate500 }}>#{item.id || item.SeguroId}</span>,
        nombre: <span style={{ fontWeight: '600' }}>{item.Nombre || item.nombre}</span>,
        precio: <span style={{ fontWeight: '700', color: COLORS.greenDeep }}>${parseFloat(item.Precio || item.precio || 0).toFixed(2)}</span>,
        vigencia: <span style={{ fontWeight: '500' }}>{vigenciaLabel}</span>,
        activo: (
          <div style={{ textAlign: 'center' }}>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '800',
                background: (item.Activo ?? item.activo) ? COLORS.greenBg : COLORS.dangerBg,
                color: (item.Activo ?? item.activo) ? COLORS.greenDeep : COLORS.dangerDeep,
                border: (item.Activo ?? item.activo) ? `1px solid ${COLORS.greenBgDark}` : `1px solid ${COLORS.dangerBgMedium}`,
              }}
            >
              {(item.Activo ?? item.activo) ? 'ACTIVO' : 'INACTIVO'}
            </span>
          </div>
        ),
        acciones: (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button
              onClick={() => handleEditar(item)}
              style={{ background: COLORS.slate50, border: `1px solid ${COLORS.slate200}`, color: COLORS.blue, cursor: 'pointer', padding: '6px 10px', borderRadius: '6px' }}
            >
              <FaEdit />
            </button>
            <button
              onClick={() => handleEliminar(item.id || item.SeguroId)}
              style={{ background: COLORS.dangerBgLight, border: `1px solid ${COLORS.dangerBgMedium}`, color: COLORS.danger, cursor: 'pointer', padding: '6px 10px', borderRadius: '6px' }}
            >
              <FaTrash />
            </button>
          </div>
        )
      };
    }

    const row = {
      id: <span style={{ fontWeight: '700', color: COLORS.slate500 }}>#{item.id}</span>,
      nombre: <span style={{ fontWeight: '600' }}>{seccionActiva === 'ligas' ? (item.nombreOriginal || item.nombre) : item.nombre}</span>,
      descripcion: <span style={{ color: COLORS.slate500 }}>{item.descripcion || '-'}</span>,
      acciones: (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <button
            onClick={() => handleEditar(item)}
            style={{ background: COLORS.slate50, border: `1px solid ${COLORS.slate200}`, color: COLORS.blue, cursor: 'pointer', padding: '6px 10px', borderRadius: '6px' }}
          >
            <FaEdit />
          </button>
          <button
            onClick={() => handleEliminar(item.id)}
            style={{ background: COLORS.dangerBgLight, border: `1px solid ${COLORS.dangerBgMedium}`, color: COLORS.danger, cursor: 'pointer', padding: '6px 10px', borderRadius: '6px' }}
          >
            <FaTrash />
          </button>
        </div>
      )
    };
    if (seccionActiva === 'ligas') {
      row.categoria = <span style={{ fontWeight: '500', color: COLORS.slate900 }}>{item.nombreCategoria || '-'}</span>;
      row.modalidad = <span style={{ fontWeight: '500', color: COLORS.slate900 }}>{item.nombreModalidad || '-'}</span>;
      row.rama = <span style={{ fontWeight: '500', color: COLORS.slate900 }}>{item.nombreRama || '-'}</span>;

      const numEquipos = equiposGlobales.filter(e => String(e.LigaId) === String(item.id)).length;
      row.equipos_inscritos = (
        <button
          onClick={() => {
            setLigaSeleccionada(item);
            setModalEquiposShow(true);
          }}
          style={{
            background: COLORS.indigo100, border: 'none', color: COLORS.indigoDark, cursor: 'pointer',
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
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: COLORS.slate800 }}>Gestor de Catálogos</h2>
          <p style={{ margin: 0, fontSize: '14px', color: COLORS.slate500 }}>Administra Ligas, Categorías, Modalidades y Ramas.</p>
        </div>
        <button
          onClick={handleCrear}
          style={{
            background: COLORS.primary, color: 'white', border: 'none', borderRadius: '10px',
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
              background: seccionActiva === seccion ? COLORS.secondaryBg : 'white',
              padding: '24px 20px',
              borderRadius: '16px',
              border: seccionActiva === seccion ? `2px solid ${COLORS.blue}` : `1px solid ${COLORS.slate200}`,
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'center',
              boxShadow: seccionActiva === seccion ? `0 4px 15px ${COLORS.blueTranslucent15}` : 'none',
              transform: seccionActiva === seccion ? 'translateY(-3px)' : 'none'
            }}
          >
            <div style={{ fontSize: '28px', color: seccionActiva === seccion ? COLORS.secondary : COLORS.slate400, marginBottom: '10px' }}>
              {iconos[seccion]}
            </div>
            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: seccionActiva === seccion ? COLORS.blueDark : COLORS.slate600, textTransform: 'uppercase' }}>
              {seccion}
            </h4>
            <p style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: seccionActiva === seccion ? COLORS.blue : COLORS.slate400, marginTop: '5px' }}>
              {catalogos[seccion].length}
            </p>
          </div>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: '16px', padding: '25px', boxShadow: `0 4px 12px ${COLORS.shadow03}`, border: `1px solid ${COLORS.slate100}` }}>
        <h4 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '800', color: COLORS.slate800, borderBottom: `1px solid ${COLORS.slate100}`, paddingBottom: '15px' }}>
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
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: COLORS.overlaySlateDark, zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content" style={{ borderRadius: '16px', border: 'none', boxShadow: `0 10px 25px ${COLORS.shadow10}` }}>
              <div className="modal-header" style={{ borderBottom: `1px solid ${COLORS.slate100}`, padding: '20px 24px' }}>
                <h5 className="modal-title" style={{ fontSize: '18px', fontWeight: '800', color: COLORS.slate800 }}>
                  {modalConfig.tipo === 'crear' ? `Nuevo Registro en ${seccionActiva.toUpperCase()}` : 'Editar Registro'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setModalShow(false)} aria-label="Close" style={{ fontSize: '12px' }}></button>
              </div>

              <form onSubmit={handleModalSubmit}>
                <div className="modal-body" style={{ padding: '24px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '800', color: COLORS.slate600, display: 'block', marginBottom: '6px' }}>Nombre <span style={{ color: COLORS.danger }}>*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.nombre}
                      onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej. Liga MX"
                      style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '14px', background: COLORS.slate50, border: `1.5px solid ${COLORS.slate300}`, boxShadow: 'none' }}
                      required
                    />
                  </div>

                  {seccionActiva === 'ligas' && (
                    <>
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ fontSize: '13px', fontWeight: '800', color: COLORS.slate600, display: 'block', marginBottom: '6px' }}>Descripción</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.descripcion}
                          onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                          placeholder="Descripción opcional..."
                          style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '14px', background: COLORS.slate50, border: `1.5px solid ${COLORS.slate300}`, boxShadow: 'none' }}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                        <div>
                          <label style={{ fontSize: '13px', fontWeight: '800', color: COLORS.slate600, display: 'block', marginBottom: '6px' }}>Categoría <span style={{ color: COLORS.danger }}>*</span></label>
                          <select className="form-select" value={formData.categoriaId} onChange={e => setFormData({ ...formData, categoriaId: e.target.value })} style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '14px', background: COLORS.slate50, cursor: 'pointer', border: `1.5px solid ${COLORS.slate300}`, boxShadow: 'none' }} required>
                            <option value="">Selecciona Categoría...</option>
                            {catalogos.categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '13px', fontWeight: '800', color: COLORS.slate600, display: 'block', marginBottom: '6px' }}>Modalidad <span style={{ color: COLORS.danger }}>*</span></label>
                          <select className="form-select" value={formData.modalidadId} onChange={e => setFormData({ ...formData, modalidadId: e.target.value })} style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '14px', background: COLORS.slate50, cursor: 'pointer', border: `1.5px solid ${COLORS.slate300}`, boxShadow: 'none' }} required>
                            <option value="">Selecciona Modalidad...</option>
                            {catalogos.modalidades.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '13px', fontWeight: '800', color: COLORS.slate600, display: 'block', marginBottom: '6px' }}>Rama <span style={{ color: COLORS.danger }}>*</span></label>
                          <select className="form-select" value={formData.ramaId} onChange={e => setFormData({ ...formData, ramaId: e.target.value })} style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '14px', background: COLORS.slate50, cursor: 'pointer', border: `1.5px solid ${COLORS.slate300}`, boxShadow: 'none' }} required>
                            <option value="">Selecciona Rama...</option>
                            {catalogos.ramas.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                          </select>
                        </div>
                      </div>
                    </>
                  )}
                  {seccionActiva === 'seguros' && (
                    <>
                      <div style={{ marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={{ fontSize: '13px', fontWeight: '800', color: COLORS.slate600, display: 'block', marginBottom: '6px' }}>Costo ($) <span style={{ color: COLORS.danger }}>*</span></label>
                          <input
                            type="text"
                            className="form-control"
                            value={formData.precio}
                            onKeyDown={e => {
                              if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Escape', 'Enter'].includes(e.key)) {
                                return;
                              }
                              if (/^[0-9.]$/.test(e.key)) {
                                if (e.key === '.' && String(formData.precio).includes('.')) {
                                  e.preventDefault();
                                }
                                return;
                              }
                              e.preventDefault();
                            }}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === '' || /^\d{0,4}(\.\d{0,2})?$/.test(val)) {
                                setFormData({ ...formData, precio: val });
                              }
                            }}
                            placeholder="Ej. 150.00"
                            style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '14px', background: COLORS.slate50, border: `1.5px solid ${COLORS.slate300}`, boxShadow: 'none' }}
                            required
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '13px', fontWeight: '800', color: COLORS.slate600, display: 'block', marginBottom: '6px' }}>Tipo de Persona</label>
                          <select
                            className="form-select"
                            value={formData.tipoPersonaId}
                            onChange={e => setFormData({ ...formData, tipoPersonaId: e.target.value })}
                            style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '14px', background: COLORS.slate50, cursor: 'pointer', border: `1.5px solid ${COLORS.slate300}`, boxShadow: 'none' }}
                          >
                            <option value="">No especificado (Ambos)</option>
                            <option value="2">Presidente de Equipo</option>
                            <option value="3">Jugador</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ fontSize: '13px', fontWeight: '800', color: COLORS.slate600, display: 'block', marginBottom: '6px' }}>Tipo de Vigencia <span style={{ color: COLORS.danger }}>*</span></label>
                        <select
                          className="form-select"
                          value={formData.tipoVigencia}
                          onChange={e => setFormData({ ...formData, tipoVigencia: e.target.value })}
                          style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '14px', background: COLORS.slate50, cursor: 'pointer', border: `1.5px solid ${COLORS.slate300}`, boxShadow: 'none' }}
                          required
                        >
                          <option value="1">Vigencia por meses (Temporal)</option>
                          <option value="2">Vigencia por fecha fija (Calendario)</option>
                        </select>
                      </div>

                      {parseInt(formData.tipoVigencia) === 1 ? (
                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ fontSize: '13px', fontWeight: '800', color: COLORS.slate600, display: 'block', marginBottom: '6px' }}>Vigencia en Meses <span style={{ color: COLORS.danger }}>*</span></label>
                          <input
                            type="number"
                            min="1"
                            className="form-control"
                            value={formData.vigenciaTemporal}
                            onChange={e => setFormData({ ...formData, vigenciaTemporal: e.target.value })}
                            placeholder="Ej. 12 (para 1 año)"
                            style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '14px', background: COLORS.slate50, border: `1.5px solid ${COLORS.slate300}`, boxShadow: 'none' }}
                            required
                          />
                        </div>
                      ) : (
                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ fontSize: '13px', fontWeight: '800', color: COLORS.slate600, display: 'block', marginBottom: '6px' }}>Fecha de Vencimiento <span style={{ color: COLORS.danger }}>*</span></label>
                          <input
                            type="date"
                            className="form-control"
                            value={formData.fechaVigencia ? formData.fechaVigencia.substring(0, 10) : ''}
                            onChange={e => setFormData({ ...formData, fechaVigencia: e.target.value })}
                            style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '14px', background: COLORS.slate50, border: `1.5px solid ${COLORS.slate300}`, boxShadow: 'none' }}
                            required
                          />
                        </div>
                      )}

                      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="checkbox"
                          id="activo-seguro"
                          checked={formData.activo}
                          onChange={e => setFormData({ ...formData, activo: e.target.checked })}
                          style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                        />
                        <label htmlFor="activo-seguro" style={{ fontSize: '14px', fontWeight: '700', color: COLORS.slate700, cursor: 'pointer', margin: 0 }}>Seguro Activo (Disponible para compra)</label>
                      </div>
                    </>
                  )}
                </div>
                <div className="modal-footer" style={{ borderTop: `1px solid ${COLORS.slate100}`, padding: '16px 24px', background: COLORS.slate50, borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                  <button type="button" className="btn btn-light" onClick={() => setModalShow(false)} style={{ borderRadius: '10px', fontWeight: '700', padding: '10px 20px', background: 'white', border: `1px solid ${COLORS.slate200}`, color: COLORS.slate500 }} disabled={enviando}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" style={{ borderRadius: '10px', fontWeight: '700', padding: '10px 20px', background: COLORS.primary, border: 'none' }} disabled={enviando}>
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
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: COLORS.overlaySlateDark, zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content" style={{ borderRadius: '16px', border: 'none', boxShadow: `0 10px 25px ${COLORS.shadow10}` }}>
              <div className="modal-header" style={{ borderBottom: `1px solid ${COLORS.slate100}`, padding: '20px 24px', background: `linear-gradient(135deg, ${COLORS.secondaryBg} 0%, ${COLORS.secondaryBg100} 100%)`, borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
                <div>
                  <h5 className="modal-title" style={{ fontSize: '18px', fontWeight: '800', color: COLORS.blueDark, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaTrophy style={{ color: COLORS.blue }} /> Equipos inscritos en {ligaSeleccionada.nombreOriginal || ligaSeleccionada.nombre}
                  </h5>
                  <p style={{ margin: 0, fontSize: '13px', color: COLORS.blue, marginTop: '4px', fontWeight: '500' }}>
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
                      <div style={{ padding: '40px 20px', textAlign: 'center', color: COLORS.slate400 }}>
                        <FaShieldAlt style={{ fontSize: '40px', marginBottom: '10px', opacity: 0.5 }} />
                        <h4 style={{ margin: '0 0 5px 0', fontSize: '16px', fontWeight: '700', color: COLORS.slate500 }}>No hay equipos</h4>
                        <p style={{ margin: 0, fontSize: '13px' }}>Aún no se han inscrito equipos en esta liga.</p>
                      </div>
                    );
                  }
                  return (
                    <div className="table-responsive">
                      <table className="table" style={{ margin: 0, fontSize: '13px' }}>
                        <thead style={{ background: COLORS.slate50, color: COLORS.slate600, fontSize: '12px', textTransform: 'uppercase' }}>
                          <tr>
                            <th style={{ padding: '12px 24px', fontWeight: '800', borderBottom: `1px solid ${COLORS.slate200}` }}>Equipo</th>
                            <th style={{ padding: '12px 24px', fontWeight: '800', borderBottom: `1px solid ${COLORS.slate200}` }}>Presidente</th>
                            <th style={{ padding: '12px 24px', fontWeight: '800', borderBottom: `1px solid ${COLORS.slate200}`, textAlign: 'center' }}>Estatus</th>
                          </tr>
                        </thead>
                        <tbody>
                          {equiposFiltrados.map((eq, idx) => (
                            <tr key={eq.EquipoId} style={{ background: idx % 2 === 0 ? 'white' : COLORS.slate50 }}>
                              <td style={{ padding: '12px 24px', fontWeight: '700', color: COLORS.slate900, borderBottom: `1px solid ${COLORS.slate100}` }}>{eq.NombreEquipo}</td>
                              <td style={{ padding: '12px 24px', color: COLORS.slate600, borderBottom: `1px solid ${COLORS.slate100}` }}>{eq.PresidenteNombreCompleto || 'Sin presidente'}</td>
                              <td style={{ padding: '12px 24px', textAlign: 'center', borderBottom: `1px solid ${COLORS.slate100}` }}>
                                {eq.Estatus ?
                                  <span style={{ background: COLORS.greenBg, color: COLORS.greenDarker, padding: '4px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '800' }}>ACTIVO</span> :
                                  <span style={{ background: COLORS.dangerBg, color: COLORS.dangerDeep, padding: '4px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '800' }}>INACTIVO</span>
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
              <div className="modal-footer" style={{ borderTop: `1px solid ${COLORS.slate100}`, padding: '16px 24px', background: COLORS.slate50, borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                <button type="button" className="btn btn-primary" onClick={() => setModalEquiposShow(false)} style={{ borderRadius: '10px', fontWeight: '700', padding: '10px 20px', background: COLORS.primary, border: 'none' }}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
