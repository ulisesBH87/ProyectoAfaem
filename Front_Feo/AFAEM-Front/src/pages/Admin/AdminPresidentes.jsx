import React, { useState, useEffect } from 'react';
import { FaPlus, FaCheck, FaTimes, FaSearch, FaUserTie, FaEdit, FaTrash } from 'react-icons/fa';
import DashboardTable from '../../components/DashboardTable';
import SearchBar from '../../components/Common/SearchBar';
import { Modal, BotonPrimario, BotonSecundario, EntradaFormulario } from '../../components/partials';
import Swal from 'sweetalert2';

export default function AdminPresidentes() {
  const [presidentes, setPresidentes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [modalAbierto, setModalAbierto] = useState(false);
  const [datosFormulario, setDatosFormulario] = useState({
    nombre: '', correo: '', telefono: '', curp: ''
  });

  useEffect(() => {
    // Simulamos la carga de datos ya que el endpoint aún no existe
    setTimeout(() => {
      setPresidentes([
        { id: 1, nombre: 'Carlos Ruiz', correo: 'carlos.ruiz@hotmail.com', telefono: '55 1234 5678', curp: 'RUZC890102HDFLL4', estatus: true },
        { id: 2, nombre: 'Ana Gónzalez', correo: 'ana.g@gmail.com', telefono: '55 9876 5432', curp: 'GOZA920311MDFXX2', estatus: true },
        { id: 3, nombre: 'Miguel Angel', correo: 'm.angel@outlook.com', telefono: '33 1122 3344', curp: 'ANGM850404HJCR11', estatus: false }
      ]);
      setCargando(false);
    }, 1000);
  }, []);

  const stats = {
    total: presidentes.length,
    activos: presidentes.filter(p => p.estatus).length,
    inactivos: presidentes.filter(p => !p.estatus).length
  };

  const procesarGuardado = () => {
    if(!datosFormulario.nombre || !datosFormulario.correo) {
       Swal.fire('Atención', 'Nombre y correo son obligatorios', 'warning');
       return;
    }

    const nuevoId = Math.floor(Math.random() * 1000) + 10;
    setPresidentes(prev => [...prev, {
      ...datosFormulario,
      id: nuevoId,
      estatus: true
    }]);

    setModalAbierto(false);
    setDatosFormulario({ nombre: '', correo: '', telefono: '', curp: '' });
    Swal.fire('¡Éxito!', 'Presidente registrado correctamente.', 'success');
  };

  const handleEliminar = (id) => {
     Swal.fire({
       title: '¿Suspender Presidente?',
       text: "El presidente perderá acceso a su panel.",
       icon: 'warning',
       showCancelButton: true,
       confirmButtonColor: '#ef4444',
       confirmButtonText: 'Sí, suspender'
     }).then(res => {
        if(res.isConfirmed) {
          setPresidentes(prev => prev.map(p => p.id === id ? { ...p, estatus: false } : p));
        }
     });
  };

  const presidentesFiltrados = presidentes.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.correo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { key: "id", label: "Folio" },
    { key: "presidente", label: "Presidente" },
    { key: "contacto", label: "Contacto" },
    { key: "curp", label: "CURP" },
    { key: "estatus", label: "Estatus" },
    { key: "acciones", label: "Acciones", style: { textAlign: 'center' } }
  ];

  const dataTransformada = presidentesFiltrados.map(p => ({
    id: <span style={{ fontWeight: '700', color: '#64748b' }}>#{p.id}</span>,
    presidente: <div style={{ fontWeight: '800', color: '#1e293b' }}>{p.nombre}</div>,
    contacto: (
      <div>
        <div style={{ fontSize: '13px', color: '#0b4ea6', fontWeight: '600' }}>{p.correo}</div>
        <div style={{ fontSize: '12px', color: '#64748b' }}>{p.telefono}</div>
      </div>
    ),
    curp: <span style={{ fontSize: '12px', letterSpacing: '0.5px' }}>{p.curp}</span>,
    estatus: p.estatus ? (
      <span style={{ background: '#dcfce7', color: '#166534', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' }}>ACTIVO</span>
    ) : (
      <span style={{ background: '#fee2e2', color: '#991b1b', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' }}>SUSPENDIDO</span>
    ),
    acciones: (
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
        <button 
          style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#3b82f6', cursor: 'pointer', padding: '6px 10px', borderRadius: '6px' }}
        >
          <FaEdit />
        </button>
        {p.estatus && (
          <button 
            onClick={() => handleEliminar(p.id)}
            style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', cursor: 'pointer', padding: '6px 10px', borderRadius: '6px' }}
          >
            <FaTrash />
          </button>
        )}
      </div>
    )
  }));


  return (
    <div style={{ padding: '30px' }}>
      <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>Directorio de Presidentes</h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Administra los accesos y directivos registrados.</p>
        </div>
        <button
          onClick={() => setModalAbierto(true)}
          style={{
            background: '#0b4ea6', color: 'white', border: 'none', borderRadius: '10px',
            padding: '12px 24px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px',
            cursor: 'pointer'
          }}
        >
          <FaPlus /> Registrar Presidente
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '14px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#3b82f6' }}>
            <FaUserTie />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '700' }}>TOTAL REGISTROS</p>
            <h3 style={{ margin: 0, fontSize: '28px', fontWeight: '800', color: '#1e293b' }}>{stats.total}</h3>
          </div>
        </div>

        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '14px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#10b981' }}>
            <FaCheck />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '700' }}>ACTIVOS</p>
            <h3 style={{ margin: 0, fontSize: '28px', fontWeight: '800', color: '#1e293b' }}>{stats.activos}</h3>
          </div>
        </div>

        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '14px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#ef4444' }}>
            <FaTimes />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '700' }}>INACTIVOS</p>
            <h3 style={{ margin: 0, fontSize: '28px', fontWeight: '800', color: '#1e293b' }}>{stats.inactivos}</h3>
          </div>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '16px', padding: '25px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
         <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
            <SearchBar value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nombre o correo..." />
         </div>
         <DashboardTable 
           columns={columns}
           data={dataTransformada}
           isLoading={cargando}
           emptyMessage="No se encontraron presidentes."
         />
      </div>

      <Modal
        estaAbierto={modalAbierto}
        alCerrar={() => setModalAbierto(false)}
        titulo="Registrar Nuevo Presidente"
        tamanio="grande"
        pie={
          <>
            <BotonSecundario etiqueta="Cancelar" onClick={() => setModalAbierto(false)} />
            <BotonPrimario etiqueta="Registrar Directivo" onClick={procesarGuardado} />
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          <div style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '10px' }}>
            <h4 style={{ margin: 0, color: '#334155', fontSize: '15px', fontWeight: '700' }}>Credenciales de Acceso</h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>El presidente utilizará su correo como usuario de acceso.</p>
          </div>

          <EntradaFormulario
             etiqueta="Nombre Completo"
             valor={datosFormulario.nombre}
             onChange={(e) => setDatosFormulario(prev => ({ ...prev, nombre: e.target.value }))}
             obligatorio
          />
          <EntradaFormulario
             etiqueta="Correo Electrónico"
             valor={datosFormulario.correo}
             onChange={(e) => setDatosFormulario(prev => ({ ...prev, correo: e.target.value }))}
             obligatorio
             tipo="email"
          />
          <EntradaFormulario
             etiqueta="Número de Teléfono"
             valor={datosFormulario.telefono}
             onChange={(e) => setDatosFormulario(prev => ({ ...prev, telefono: e.target.value }))}
          />
          <EntradaFormulario
             etiqueta="CURP"
             valor={datosFormulario.curp}
             onChange={(e) => setDatosFormulario(prev => ({ ...prev, curp: e.target.value }))}
          />
        </div>
      </Modal>
    </div>
  );
}
