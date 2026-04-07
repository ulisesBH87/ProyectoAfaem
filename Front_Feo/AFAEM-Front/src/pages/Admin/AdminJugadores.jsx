import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getJugadoresDirectorio, getJugadorDocumentos, updateJugador } from '../../services/admin';
import Swal from 'sweetalert2';
import DashboardTable from '../../components/DashboardTable';
import { FaSearch, FaSyncAlt, FaSortAmountDown, FaSortAmountUp, FaFileDownload, FaPlus, FaEdit } from 'react-icons/fa';

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
  }, [filtroEstatus, searchTerm, sortOrder]);

  const filteredJugadores = React.useMemo(() => {
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
    const masculinos = jugadores.filter(j => j.Sexo.toLowerCase().includes('masculino') || j.Sexo.toLowerCase() === 'h').length;
    const femeninos = jugadores.filter(j => j.Sexo.toLowerCase().includes('femenino') || j.Sexo.toLowerCase() === 'm').length;
    
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

      const docs = await getJugadorDocumentos(jugador.MiembroEquipoId); // Idealmente PersonaId
      
      if (!docs || docs.length === 0) {
        Swal.fire('Sin Documentos', 'Este jugador no tiene documentos PDF subidos en el sistema o están dañados.', 'warning');
        return;
      }

      let htmlBotones = '';
      docs.forEach((doc, idx) => {
        htmlBotones += `<a href="${doc.url}" target="_blank" class="btn btn-primary m-1" style="display:block; text-align:center;">📄 Ver Documento ${idx + 1} (${new Date(doc.FechaEntrega).toLocaleDateString()})</a>`;
      });

      Swal.fire({
        title: `Documentos de ${jugador.NombreCompleto}`,
        html: `<div>${htmlBotones}</div>`,
        showConfirmButton: true,
        confirmButtonText: 'Cerrar'
      });

    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudieron obtener los documentos del jugador.', 'error');
    }
  };

  const handleEditarJugador = (jugador) => {
    Swal.fire({
      title: 'Editar Jugador',
      html: `
        <div style="text-align: left; display: flex; flex-direction: column; gap: 10px;">
          <div>
            <label style="font-weight: 600; font-size: 12px;">Nombre(s)</label>
            <input id="swal-jg-nombre" class="swal2-input" value="${jugador.Nombre || ''}" style="margin-top: 2px; width: 90%; height: 35px; font-size: 14px;">
          </div>
          <div style="display: flex; gap: 10px;">
            <div style="flex: 1;">
              <label style="font-weight: 600; font-size: 12px;">Primer Apellido</label>
              <input id="swal-jg-apellido1" class="swal2-input" value="${jugador.PrimerApellido || ''}" style="margin-top: 2px; width: 100%; height: 35px; font-size: 14px;">
            </div>
            <div style="flex: 1;">
              <label style="font-weight: 600; font-size: 12px;">Segundo Apellido</label>
              <input id="swal-jg-apellido2" class="swal2-input" value="${jugador.SegundoApellido || ''}" style="margin-top: 2px; width: 100%; height: 35px; font-size: 14px;">
            </div>
          </div>
          <div>
            <label style="font-weight: 600; font-size: 12px;">CURP</label>
            <input id="swal-jg-curp" class="swal2-input" value="${jugador.CURP || ''}" style="margin-top: 2px; width: 90%; height: 35px; font-size: 14px;">
          </div>
          <div>
            <label style="font-weight: 600; font-size: 12px;">Estatus</label>
            <select id="swal-jg-estatus" class="swal2-select" style="margin-top: 2px; width: 95%; padding: 5px; height: 35px; font-size: 14px;">
              <option value="1" ${jugador.Estatus ? 'selected' : ''}>Activo (Aprobado)</option>
              <option value="0" ${!jugador.Estatus ? 'selected' : ''}>Baja (Inactivo)</option>
            </select>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar Cambios',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0b4ea6',
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        const nombre = document.getElementById('swal-jg-nombre').value;
        const primerApellido = document.getElementById('swal-jg-apellido1').value;
        const segundoApellido = document.getElementById('swal-jg-apellido2').value;
        const curp = document.getElementById('swal-jg-curp').value;
        const estatus = document.getElementById('swal-jg-estatus').value;

        if (!nombre || !primerApellido || !curp) {
          Swal.showValidationMessage('Nombre, Primer Apellido y CURP son obligatorios');
          return false;
        }

        try {
          await updateJugador(jugador.MiembroEquipoId, {
            nombre,
            primerApellido,
            segundoApellido,
            curp,
            estatus
          });
          return { nombre, primerApellido, segundoApellido, curp, estatus };
        } catch (error) {
          Swal.showValidationMessage(`Error: ${error.response?.data?.detail || error.message}`);
        }
      }
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          icon: 'success',
          title: 'Actualizado',
          text: `El jugador ${result.value.nombre} ha sido actualizado correctamente.`
        });
        loadJugadores();
      }
    });
  };

  const columns = [
    { key: "MiembroEquipoId", label: "ID" },
    { key: "NombreCompleto", label: "Jugador" },
    { key: "DatosPersonales", label: "Datos Personales" },
    { key: "EquipoLiga", label: "Equipo Actual" },
    { key: "FechaIngreso", label: "F. Ingreso" },
    { key: "Estatus", label: "Estatus" },
    { key: "Acciones", label: "Documentos" }
  ];

  const dataTransformada = paginatedJugadores.map(j => ({
    MiembroEquipoId: <span style={{ fontWeight: '700', color: '#64748b' }}>#{j.MiembroEquipoId}</span>,
    NombreCompleto: <span style={{ fontWeight: '800', color: '#1e293b' }}>{j.NombreCompleto}</span>,
    DatosPersonales: (
      <div>
        <div style={{ fontWeight: '700', fontSize: '13px' }}>CURP: {j.CURP}</div>
        <div style={{ fontSize: '11px', color: '#64748b' }}>Sexo: {j.Sexo}</div>
      </div>
    ),
    EquipoLiga: (
      <div>
        <div style={{ fontWeight: '600', fontSize: '13px' }}>{j.EquipoNombre}</div>
        <div style={{ fontSize: '11px', color: '#64748b' }}>{j.Liga}</div>
      </div>
    ),
    FechaIngreso: <span style={{ fontSize: '12px' }}>{new Date(j.FechaIngreso).toLocaleDateString()}</span>,
    Estatus: j.Estatus ? 
      <span className="badge" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>ACTIVO</span> :
      <span className="badge" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>BAJA</span>,
    Acciones: (
      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          className="btn btn-sm btn-outline-primary"
          style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}
          onClick={() => handleDescargarDocs(j)}
        >
          <FaFileDownload /> Docs
        </button>
        <button 
          className="btn btn-sm btn-outline-secondary"
          style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#f1f5f9', color: '#334155', border: 'none' }}
          onClick={() => handleEditarJugador(j)}
        >
          <FaEdit /> Editar
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
          <h2 className="section-title" style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Catálogo de Jugadores Aprobados</h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Visualiza y descarga documentos de toda la matrícula activa de la liga.</p>
        </div>
        <div className="section-actions" style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-primary"
            onClick={() => window.location.reload()}
            style={{ padding: '10px 20px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FaSyncAlt />
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/admin/jugadores/crear')}
            style={{ padding: '10px 20px', backgroundColor: '#0b4ea6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FaPlus /> Registrar Jugador
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '5px' }}>👥</div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>TOTAL JUGADORES</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>{stats.total}</div>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '5px' }}>🟢</div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>JUGADORES ACTIVOS</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#10b981' }}>{stats.activos}</div>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '5px' }}>👨</div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>MASCULINO</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#2563eb' }}>{stats.hombres}</div>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '5px' }}>🙎‍♀️</div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>FEMENINO</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#ec4899' }}>{stats.mujeres}</div>
        </div>
      </div>

      <div className="card" style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>Lista de Jugadores</h3>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <FaSearch style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" placeholder="Buscar jugador..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="form-input" style={{ paddingLeft: '40px', width: '240px' }} />
            </div>

            <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} style={{ background: 'white', border: '1.5px solid var(--border-light)', padding: '10px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {sortOrder === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />} {sortOrder === 'asc' ? 'ASC' : 'DESC'}
            </button>

            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-main)', padding: '4px', borderRadius: '12px', border: '1.5px solid var(--border-light)' }}>
              {['todos', 'activos', 'inactivos'].map((val) => (
                <button key={val} onClick={() => setFiltroEstatus(val)} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: filtroEstatus === val ? 'white' : 'transparent', color: filtroEstatus === val ? 'var(--primary)' : 'var(--text-muted)', boxShadow: filtroEstatus === val ? 'var(--shadow-sm)' : 'none', fontSize: '11px', fontWeight: '700' }}>
                  {val.toUpperCase()}
                </button>
              ))}
            </div>

            <button onClick={() => window.location.reload()} className="btn-premium" style={{ padding: '10px 16px', fontSize: '12px' }}>
              <FaSyncAlt />
            </button>
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
          emptyMessage="No hay jugadores que coincidan con la búsqueda."
        />
      </div>
    </div>
  );
}
