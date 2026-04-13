import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaListAlt, FaNetworkWired, FaTrophy, FaTags } from 'react-icons/fa';
import DashboardTable from '../../components/DashboardTable';
import Swal from 'sweetalert2';
import api from '../../services/auth';

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
      // Re-utilizamos el endpoint existente para inicializar la información
      const response = await api.get('/equipo-temporal/catalogos-registro');
      
      const data = response.data;
      setCatalogos({
        ligas: data.ligas || [],
        categorias: data.categorias || [],
        modalidades: data.modalidades || [],
        ramas: data.ramas || []
      });
      
    } catch (error) {
      console.warn("Fallo backend, usando mock data general", error);
      setCatalogos({
        ligas: [{ id: 1, nombre: 'Liga Moflito' }, { id: 2, nombre: 'CONADEIP' }],
        categorias: [{ id: 1, nombre: 'Juvenil' }, { id: 2, nombre: 'Mayor' }],
        modalidades: [{ id: 1, nombre: '11 vs 11' }, { id: 2, nombre: 'Arena 8 vs 8' }],
        ramas: [{ id: 1, nombre: 'Varonil' }, { id: 2, nombre: 'Femenil' }]
      });
    } finally {
      setCargando(false);
    }
  };

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
    { key: "acciones", label: "Acciones", style: { width: '120px', textAlign: 'center' } }
  ];

  const handleEliminar = (id) => {
    Swal.fire({
      title: '¿Eliminar registro?',
      text: "Esta acción no se guardará en la base de datos hasta que el backend se implemente.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        setCatalogos(prev => ({
          ...prev,
          [seccionActiva]: prev[seccionActiva].filter(item => item.id !== id)
        }));
        Swal.fire('Eliminado', 'El registro se eliminó del listado local.', 'success');
      }
    });
  };

  const handleEditar = (item) => {
    Swal.fire({
      title: 'Editar Registro',
      input: 'text',
      inputValue: item.nombre,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      inputValidator: (value) => {
        if (!value) return 'El nombre no puede estar vacío';
      }
    }).then((result) => {
      if (result.isConfirmed) {
        setCatalogos(prev => ({
          ...prev,
          [seccionActiva]: prev[seccionActiva].map(i => i.id === item.id ? { ...i, nombre: result.value } : i)
        }));
      }
    });
  };

  const handleCrear = () => {
    Swal.fire({
      title: `Nuevo Registro en ${seccionActiva.toUpperCase()}`,
      input: 'text',
      inputPlaceholder: `Ingresa el nombre...`,
      showCancelButton: true,
      confirmButtonText: 'Crear',
      inputValidator: (value) => {
        if (!value) return 'Debes ingresar un nombre';
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const nuevoId = Math.floor(Math.random() * 1000) + 100;
        setCatalogos(prev => ({
          ...prev,
          [seccionActiva]: [...prev[seccionActiva], { id: nuevoId, nombre: result.value }]
        }));
        Swal.fire('¡Éxito!', 'Registro simulado con éxito', 'success');
      }
    });
  };

  const dataTransformada = dataActual.map(item => ({
    id: <span style={{ fontWeight: '700', color: '#64748b' }}>#{item.id}</span>,
    nombre: <span style={{ fontWeight: '600' }}>{item.nombre}</span>,
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
