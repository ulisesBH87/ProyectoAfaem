import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getJugadoresDirectorio, getJugadorDocumentos, updateJugador } from '../../services/admin';
import Swal from 'sweetalert2';
import DashboardTable from '../../components/DashboardTable';
import SearchBar from '../../components/Common/SearchBar';
import { FaSearch, FaSyncAlt, FaSortAmountDown, FaSortAmountUp, FaFileDownload, FaPlus, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import { Modal, BotonPrimario, BotonSecundario, EntradaFormulario, EntradaSeleccion } from '../../components/partials';

export default function AdminJugadores() {
  const navigate = useNavigate();

  const [jugadores, setJugadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para filtros, búsqueda y paginación
  const [filtroEstatus, setFiltroEstatus] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ESTADO PARA EDICIÓN (MODAL PROFESIONAL)
  const [modalEdicion, setModalEdicion] = useState(false);
  const [jugadorEdicion, setJugadorEdicion] = useState(null);
  const [datosEditables, setDatosEditables] = useState({});
  const [haCambiado, setHaCambiado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const loadJugadores = async () => {
    try {
      setLoading(true);
      const data = await getJugadoresDirectorio();
      setJugadores(data);
      setError(null);
    } catch (err) {
      console.error("Error al cargar jugadores:", err);
      setError("Error al cargar el directorio de jugadores.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJugadores();
  }, [navigate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filtroEstatus, searchTerm, sortOrder]);  const filteredJugadores = React.useMemo(() => {
    let result = [...jugadores];
    
    if (filtroEstatus !== 'todos') {
      const isActivo = filtroEstatus === 'activos';
      result = result.filter(s => !!s.Estatus === isActivo);
    }
    
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      result = result.filter(s => 
        (s.NombreCompleto && s.NombreCompleto.toLowerCase().includes(query)) ||
        (s.CURP && s.CURP.toLowerCase().includes(query)) ||
        (s.Email && s.Email.toLowerCase().includes(query)) || // Búsqueda por email añadida
        (s.EquipoNombre && s.EquipoNombre.toLowerCase().includes(query)) ||
        (s.Liga && s.Liga.toLowerCase().includes(query))
      );
    }
    
    result.sort((a, b) => {
      if (sortOrder === 'asc') return a.MiembroEquipoId - b.MiembroEquipoId;
      return b.MiembroEquipoId - a.MiembroEquipoId;
    });
    
    return result;
  }, [jugadores, filtroEstatus, searchTerm, sortOrder]);

  const paginatedJugadores = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredJugadores.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredJugadores, currentPage]);

  const stats = React.useMemo(() => {
    const masculinos = jugadores.filter(j => j.Sexo?.toLowerCase().includes('masculino') || j.Sexo?.toLowerCase() === 'h').length;
    const femeninos = jugadores.filter(j => j.Sexo?.toLowerCase().includes('femenino') || j.Sexo?.toLowerCase() === 'm').length;
    
    return {
      total: jugadores.length,
      hombres: masculinos,
      mujeres: femeninos,
      activos: jugadores.filter(j => j.Estatus === true).length
    };
  }, [jugadores]);

  const handleDescargarDocs = async (jugador) => {
    try {
      Swal.fire({
        title: 'Cargando documentos...',
        text: 'Buscando archivos en el sistema',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const docs = await getJugadorDocumentos(jugador.MiembroEquipoId);
      
      if (!docs || docs.length === 0) {
        Swal.fire('Sin documentos', 'Este jugador no tiene documentos PDF subidos en el sistema o están dañados.', 'warning');
        return;
      }

      let htmlBotones = '';
      docs.forEach((doc, idx) => {
        htmlBotones += `<a href="${doc.url}" target="_blank" class="btn btn-primary m-1" style="display:block; text-align:center; padding: 12px; border-radius: 8px; font-weight: 600;">📄 Ver documento ${idx + 1} (${new Date(doc.FechaEntrega).toLocaleDateString()})</a>`;
      });

      Swal.fire({
        title: `Documentos de ${jugador.NombreCompleto}`,
        html: `<div style="max-height: 400px; overflow-y: auto;">${htmlBotones}</div>`,
        showConfirmButton: true,
        confirmButtonText: 'Cerrar',
        confirmButtonColor: '#94a3b8'
      });

    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudieron obtener los documentos del jugador.', 'error');
    }
  };

  const handleEditarJugador = (jugador) => {
    setJugadorEdicion(jugador);
    setDatosEditables({
      nombre: jugador.Nombre || '',
      primerApellido: jugador.PrimerApellido || '',
      segundoApellido: jugador.SegundoApellido || '',
      curp: jugador.CURP || '',
      email: jugador.Email || '',
      sexo: jugador.Sexo || '',
      fechaNacimiento: jugador.FechaNacimiento ? jugador.FechaNacimiento.split('T')[0] : '',
      estatus: jugador.Estatus ? '1' : '0'
    });
    setHaCambiado(false);
    setModalEdicion(true);
  };

  const handleCerrarModal = () => {
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
        if (result.isConfirmed) {
          setModalEdicion(false);
        }
      });
    } else {
      setModalEdicion(false);
    }
  };

  const manejarCambioInput = (e) => {
    const { name, value } = e.target;
    setDatosEditables(prev => ({ ...prev, [name]: value }));
    setHaCambiado(true);
  };

  const manejarGuardarJugador = async () => {
    if (!datosEditables.nombre || !datosEditables.primerApellido || !datosEditables.curp) {
      Swal.fire('Campos obligatorios', 'Nombre, primer apellido y CURP son requeridos.', 'warning');
      return;
    }

    try {
      setGuardando(true);
      await updateJugador(jugadorEdicion.MiembroEquipoId, {
        nombre: datosEditables.nombre,
        primerApellido: datosEditables.primerApellido,
        segundoApellido: datosEditables.segundoApellido,
        curp: datosEditables.curp,
        email: datosEditables.email,
        sexo: datosEditables.sexo,
        fechaNacimiento: datosEditables.fechaNacimiento,
        estatus: datosEditables.estatus
      });
      
      Swal.fire('¡Éxito!', 'Información del jugador actualizada correctamente.', 'success');
      setModalEdicion(false);
      loadJugadores();
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudieron guardar los cambios.', 'error');
    } finally {
      setGuardando(false);
    }
  };

  const columns = [
    { key: "MiembroEquipoId", label: "ID" },
    { key: "NombreCompleto", label: "Jugador" },
    { key: "Sexo", label: "Sexo" },
    { key: "EquipoLiga", label: "Equipo actual", style: { width: '400px' } }, // Aumentado espacio para equipo
    { key: "FechaIngreso", label: "Fecha ingreso" },
    { key: "Estatus", label: "Estatus" },
    { key: "Acciones", label: "Acciones" }
  ];

  const dataTransformada = paginatedJugadores.map(j => ({
    MiembroEquipoId: <span style={{ fontWeight: '700', color: '#64748b' }}>#{j.MiembroEquipoId}</span>,
    NombreCompleto: (
      <div>
        <div style={{ fontWeight: '800', color: '#1e293b' }}>{j.NombreCompleto}</div>
        <div style={{ fontSize: '11px', color: '#64748b' }}>{j.Email || 'Sin correo registrado'}</div>
      </div>
    ),
    Sexo: <span style={{ fontSize: '13px', color: '#475569', fontWeight: '600' }}>{j.Sexo || 'N/A'}</span>,
    EquipoLiga: (
      <div style={{ maxWidth: '340px' }}>
        <div style={{ fontWeight: '700', fontSize: '14px', color: '#0b4ea6' }}>{j.EquipoNombre}</div>
        <div style={{ fontSize: '12px', color: '#64748b' }}>{j.Liga}</div>
      </div>
    ),
    FechaIngreso: <span style={{ fontSize: '12px' }}>{new Date(j.FechaIngreso).toLocaleDateString()}</span>,
    Estatus: j.Estatus ? 
      <span className="badge" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>ACTIVO</span> :
      <span className="badge" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>BAJA</span>,
    Acciones: (
      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          className="btn btn-sm"
          style={{ padding: '8px 14px', fontSize: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', background: '#e2e8f0', color: '#475569', border: 'none', fontWeight: '700' }}
          onClick={() => handleDescargarDocs(j)}
          title="Ver documentos"
        >
          <FaFileDownload /> Docs
        </button>
        <button 
          className="btn btn-sm btn-primary"
          style={{ padding: '8px 14px', fontSize: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}
          onClick={() => handleEditarJugador(j)}
        >
          <FaEdit /> Ver / Editar
        </button>
      </div>
    )
  }));


  if (loading) {
    return (
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p style={{ marginTop: '10px', color: '#64748b' }}>Cargando catálogo de jugadores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
          <span className="alert-icon">⚠️</span>
          <div className="alert-content">
            <p className="alert-message">{error}</p>
          </div>
        </div>
      )}

      <div className="section-header" style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="section-title" style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Catálogo de jugadores aprobados</h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b', marginTop: '4px' }}>Visualiza y gestiona la matrícula activa de la liga.</p>
        </div>
        <div className="section-actions" style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn btn-primary"
            onClick={() => window.location.reload()}
            style={{ padding: '10px 20px', backgroundColor: 'white', color: '#334155', border: '1.5px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FaSyncAlt />
          </button>
          <button 
            className="btn btn-premium"
            onClick={() => navigate('/admin/jugadores/crear')}
            style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <FaPlus /> Registrar jugador
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>Total jugadores</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            {stats.total} <span style={{ fontSize: '14px', fontWeight: '600', color: '#94a3b8' }}>registros</span>
          </div>
        </div>
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>Jugadores activos</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#10b981' }}>{stats.activos}</div>
        </div>
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>Masculino</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#3b82f6' }}>{stats.hombres}</div>
        </div>
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>Femenino</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#f43f5e' }}>{stats.mujeres}</div>
        </div>
      </div>

      <div className="card" style={{ padding: '35px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
        <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>Lista de jugadores</h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Usa los filtros para búsqueda por nombre, CURP o correo electrónico.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
            <SearchBar 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nombre, CURP o correo..."
              width="280px"
            />

            <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} style={{ background: 'white', border: '1.5px solid var(--border-light)', padding: '10px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
              {sortOrder === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />} {sortOrder === 'asc' ? 'REC' : 'ANT'}
            </button>

            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-main)', padding: '5px', borderRadius: '14px', border: '1.5px solid var(--border-light)' }}>
              {['todos', 'activos', 'inactivos'].map((val) => (
                <button key={val} onClick={() => setFiltroEstatus(val)} style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: filtroEstatus === val ? 'white' : 'transparent', color: filtroEstatus === val ? 'var(--primary)' : 'var(--text-muted)', boxShadow: filtroEstatus === val ? 'var(--shadow-sm)' : 'none', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>
                  {val === 'todos' ? 'Todos' : (val === 'activos' ? 'Activos' : 'Inactivos')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DashboardTable
          columns={columns}
          data={dataTransformada}
          isLoading={loading}
          totalItems={filteredJugadores.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          emptyMessage="No se encontraron jugadores con los criterios de búsqueda."
        />
      </div>

      {/* MODAL DE EDICIÓN PROFESIONAL */}
      <Modal
        estaAbierto={modalEdicion}
        alCerrar={handleCerrarModal}
        titulo="Detalle y edición del jugador"
        tamanio="pantallaFull"
        pie={
          <>
            <BotonSecundario texto="Cancelar" onClick={handleCerrarModal} />
            <BotonPrimario 
              texto={guardando ? 'Guardando...' : 'Guardar cambios'} 
              onClick={manejarGuardarJugador} 
              deshabilitado={guardando}
              icono={<FaSave />}
            />
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px' }}>
          <div style={{ gridColumn: 'span 3', background: 'var(--primary-light)', padding: '15px 25px', borderRadius: '12px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '15px' }}>
             <div style={{ fontSize: '24px' }}>🛡️</div>
             <div>
                <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--primary)', fontWeight: '800' }}>Expediente del Jugador</h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>La información modificada actualizará automáticamente el acta digital del afiliado.</p>
             </div>
          </div>

          <EntradaFormulario
            etiqueta="Nombre(s)"
            valor={datosEditables.nombre}
            onChange={manejarCambioInput}
            nombre="nombre"
            obligatorio
            placeholder="Ej: Juan Antonio"
          />
          <EntradaFormulario
            etiqueta="Primer apellido"
            valor={datosEditables.primerApellido}
            onChange={manejarCambioInput}
            nombre="primerApellido"
            obligatorio
            placeholder="Apellido paterno"
          />
          <EntradaFormulario
            etiqueta="Segundo apellido"
            valor={datosEditables.segundoApellido}
            onChange={manejarCambioInput}
            nombre="segundoApellido"
            placeholder="Apellido materno"
          />
          
          <EntradaFormulario
            etiqueta="CURP"
            valor={datosEditables.curp}
            onChange={manejarCambioInput}
            nombre="curp"
            obligatorio
            placeholder="Clave única de registro"
          />
          <EntradaFormulario
            etiqueta="Correo electrónico"
            valor={datosEditables.email}
            onChange={manejarCambioInput}
            nombre="email"
            tipo="email"
            placeholder="correo@ejemplo.com"
          />
          <EntradaSeleccion
            etiqueta="Sexo"
            valor={datosEditables.sexo}
            onChange={manejarCambioInput}
            nombre="sexo"
            opciones={[
              { valor: 'Masculino', etiqueta: 'Masculino' },
              { valor: 'Femenino', etiqueta: 'Femenino' }
            ]}
          />

          <EntradaFormulario
            etiqueta="Fecha de nacimiento"
            valor={datosEditables.fechaNacimiento}
            onChange={manejarCambioInput}
            nombre="fechaNacimiento"
            tipo="date"
          />
          <EntradaSeleccion
            etiqueta="Estatus del jugador"
            valor={datosEditables.estatus}
            onChange={manejarCambioInput}
            nombre="estatus"
            opciones={[
              { valor: '1', etiqueta: 'Aprobado (Matrícula Activa)' },
              { valor: '0', etiqueta: 'Baja (Inactivo)' }
            ]}
          />
          
          <div style={{ gridColumn: 'span 3', marginTop: '10px', paddingTop: '20px', borderTop: '1px solid var(--border-light)' }}>
             <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
                * Los campos marcados con asterisco son esenciales para la validez de los reportes de juego.
             </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
