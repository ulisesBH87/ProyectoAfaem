import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaListAlt, FaNetworkWired, FaTrophy, FaTags } from 'react-icons/fa';
import DashboardTable from '../../components/DashboardTable';
import Swal from 'sweetalert2';
import api from '../../services/auth';
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

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      // Cargamos todos los catálogos en paralelo desde los nuevos endpoints
      const [ligas, categorias, modalidades, ramas] = await Promise.all([
        api.get('/catalogos/ligas'),
        api.get('/catalogos/categorias'),
        api.get('/catalogos/modalidades'),
        api.get('/catalogos/ramas')
      ]);
      
      setCatalogos({
        ligas: ligas.data,
        categorias: categorias.data,
        modalidades: modalidades.data,
        ramas: ramas.data
      });
      
    } catch (error) {
      console.warn("Fallo al cargar catálogos desde endpoints específicos", error);
      // Fallback a mock data si algo sale mal
      setCatalogos({
        ligas: [{ id: 1, nombre: 'Liga Moflito', descripcion: 'Descripción mock' }],
        categorias: [{ id: 1, nombre: 'Juvenil' }],
        modalidades: [{ id: 1, nombre: '11 vs 11' }],
        ramas: [{ id: 1, nombre: 'Varonil' }]
      });
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

  const columns = [
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
    const isLiga = seccionActiva === 'ligas';
    
    Swal.fire({
      title: 'Editar Registro',
      html: `
        <div style="text-align: left;">
          <label class="swal2-label">Nombre</label>
          <input id="swal-input1" class="swal2-input" value="${item.nombre}">
          ${isLiga ? `
            <label class="swal2-label">Descripción</label>
            <input id="swal-input2" class="swal2-input" value="${item.descripcion || ''}">
          ` : ''}
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        const nombre = document.getElementById('swal-input1').value;
        const descripcion = isLiga ? document.getElementById('swal-input2').value : null;
        
        if (!nombre) {
          Swal.showValidationMessage('El nombre no puede estar vacío');
          return false;
        }

        try {
          const response = await api.put(`/catalogos/${seccionActiva}/${item.id}`, { 
            nombre, 
            descripcion 
          });
          return response.data;
        } catch (error) {
          Swal.showValidationMessage(`Error: ${error.response?.data?.detail || 'No se pudo actualizar'}`);
          return false;
        }
      },
      allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const itemActualizado = result.value;
        setCatalogos(prev => ({
          ...prev,
          [seccionActiva]: prev[seccionActiva].map(i => i.id === item.id ? itemActualizado : i)
        }));
        Swal.fire('¡Actualizado!', 'El registro se ha guardado correctamente.', 'success');
      }
    });
  };

  const handleCrear = () => {
    const isLiga = seccionActiva === 'ligas';

    Swal.fire({
      title: `Nuevo Registro en ${seccionActiva.toUpperCase()}`,
      html: `
        <div style="text-align: left;">
          <label class="swal2-label">Nombre</label>
          <input id="swal-input1" class="swal2-input" placeholder="Nombre...">
          ${isLiga ? `
            <label class="swal2-label">Descripción</label>
            <input id="swal-input2" class="swal2-input" placeholder="Descripción...">
          ` : ''}
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Crear',
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        const nombre = document.getElementById('swal-input1').value;
        const descripcion = isLiga ? document.getElementById('swal-input2').value : null;

        if (!nombre) {
          Swal.showValidationMessage('Debes ingresar un nombre');
          return false;
        }

        try {
          const response = await api.post(`/catalogos/${seccionActiva}`, { 
            nombre, 
            descripcion 
          });
          return response.data;
        } catch (error) {
          Swal.showValidationMessage(`Error: ${error.response?.data?.detail || 'No se pudo crear'}`);
          return false;
        }
      },
      allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const nuevoRegistro = result.value;
        setCatalogos(prev => ({
          ...prev,
          [seccionActiva]: [...prev[seccionActiva], nuevoRegistro]
        }));
        Swal.fire('¡Éxito!', 'El registro se ha creado correctamente.', 'success');
      }
    });
  };

  const dataTransformada = dataActual.map(item => ({
    id: <span style={{ fontWeight: '700', color: '#64748b' }}>#{item.id}</span>,
    nombre: <span style={{ fontWeight: '600' }}>{item.nombre}</span>,
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
  }));


  return (
    <div style={{ padding: '30px' }}>
      <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
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
         <DashboardTable 
           columns={columns}
           data={dataTransformada}
           isLoading={cargando}
           emptyMessage={`No hay registros en ${seccionActiva}`}
         />
      </div>
    </div>
  );
}
