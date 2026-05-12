import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getJugadoresDirectorio, getJugadorDocumentos, exportarJugadorDocumentos, updateJugador } from '../../services/admin';
import Swal from 'sweetalert2';
import DashboardTable from '../../components/DashboardTable';
import SearchBar from '../../components/Common/SearchBar';
import { FaSearch, FaSyncAlt, FaSortAmountDown, FaSortAmountUp, FaFileDownload, FaFileArchive, FaPlus, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import { Modal, BotonPrimario, BotonSecundario, EntradaFormulario, EntradaSeleccion } from '../../components/partials';
import Loader from '../../components/Loader';

export default function AdminJugadores() {
  const navigate = useNavigate();
  const location = useLocation();

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
  // OCR dentro del modal
  const [ocrCargando, setOcrCargando] = useState(false);

  const loadJugadores = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const data = await getJugadoresDirectorio(forceRefresh);
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

  // EFECTO PARA ABRIR EDICIÓN AUTOMÁTICA DESDE BÚSQUEDA
  useEffect(() => {
    if (!loading && jugadores.length > 0 && location.state?.editPlayerId) {
      const playerToEdit = jugadores.find(j => j.MiembroEquipoId === location.state.editPlayerId);
      if (playerToEdit) {
        handleEditarJugador(playerToEdit);
        // Limpiar el estado para que no se abra de nuevo al recargar
        window.history.replaceState({}, document.title);
      }
    }
  }, [loading, jugadores, location.state]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filtroEstatus, searchTerm, sortOrder]);

  const filteredJugadores = React.useMemo(() => {
    let result = [...jugadores];

    if (filtroEstatus !== 'todos') {
      if (filtroEstatus === 'activos') {
        result = result.filter(s => !!s.Estatus);
      } else if (filtroEstatus === 'inactivos') {
        result = result.filter(s => !s.Estatus);
      } else if (filtroEstatus === 'hombres') {
        result = result.filter(s => {
          const sexo = s.Sexo?.toLowerCase() || '';
          return sexo.includes('masculino') || sexo.includes('hombre') || sexo === 'h';
        });
      } else if (filtroEstatus === 'mujeres') {
        result = result.filter(s => {
          const sexo = s.Sexo?.toLowerCase() || '';
          return sexo.includes('femenino') || sexo.includes('mujer') || sexo === 'm';
        });
      }
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
    const masculinos = jugadores.filter(j => {
      const sexo = j.Sexo?.toLowerCase() || '';
      return sexo.includes('masculino') || sexo.includes('hombre') || sexo === 'h';
    }).length;

    const femeninos = jugadores.filter(j => {
      const sexo = j.Sexo?.toLowerCase() || '';
      return sexo.includes('femenino') || sexo.includes('mujer') || sexo === 'm';
    }).length;

    return {
      total: jugadores.length,
      hombres: masculinos,
      mujeres: femeninos,
      activos: jugadores.filter(j => j.Estatus === true).length,
      inactivos: jugadores.filter(j => j.Estatus === false).length,
      conNUI: jugadores.filter(j => !!(j.NUI)).length,
      sinNUI: jugadores.filter(j => !(j.NUI)).length,
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
        Swal.fire('Sin documentos', 'Ocurrió un error al cargar los datos del jugador.', 'warning');
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

  const handleExportar = async (jugador) => {
    try {
      Swal.fire({
        title: 'Generando expediente...',
        text: 'Preparando archivos del jugador',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const response = await exportarJugadorDocumentos(jugador.MiembroEquipoId);

      const blob = new Blob([response.data], { type: 'application/zip' });

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;

      // Nombre del archivo
      const nombreJugador = (jugador.NombreCompleto || 'jugador')
        .trim()
        .replace(/[\\/:*?"<>|]+/g, '')
        .replace(/\s+/g, '_');
      const nombre = `expediente_${nombreJugador}.zip`;
      a.download = nombre;

      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);

      Swal.close();

    } catch (error) {
      console.error("Error exportando:", error);
      Swal.fire('Error', 'No se pudo generar el expediente', 'error');
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
    setOcrCargando(false);
    setModalEdicion(true);
  };

  // PROCESAR OCR PARA EL MODAL DE EDICIÓN
  const handleOcrModalUpload = async (file) => {
    if (!file) return;
    setOcrCargando(true);
    Swal.fire({
      title: 'Analizando documento...',
      html: 'Extrayendo información vía OCR. Por favor espere.',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading()
    });
    try {
      const formDataOcr = new FormData();
      formDataOcr.append('file_id', file);
      const response = await fetch('/ocr-api', { method: 'POST', body: formDataOcr });
      if (!response.ok) throw new Error('Error al conectar con el servidor OCR');

      const htmlText = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');

      let nombreEncontrado = '';
      let curpEncontrada = '';
      let fechaNacEncontrada = '';

      const rows = doc.querySelectorAll('.dato-fila');
      rows.forEach(row => {
        const label = row.querySelector('.etiqueta')?.textContent?.toLowerCase() || '';
        const value = row.querySelector('.valor')?.textContent?.trim() || '';
        if (label.includes('nombre')) nombreEncontrado = value;
        if (label.includes('curp')) curpEncontrada = value;
        if (label.includes('nacimiento') || label.includes('fecha nac')) {
          let finalDate = value;
          if (value.includes('/')) {
            const p = value.split('/');
            if (p.length === 3) {
              finalDate = p[2].length === 4 ? `${p[2]}-${p[1]}-${p[0]}` : `${p[0]}-${p[1]}-${p[2]}`;
            }
          }
          fechaNacEncontrada = finalDate;
        }
      });

      // Fallback: buscar en texto plano si los selectores no devuelven nada
      if (!nombreEncontrado && !curpEncontrada) {
        const textoCompleto = doc.body?.innerText || '';
        const curpMatch = textoCompleto.match(/[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d/i);
        if (curpMatch) curpEncontrada = curpMatch[0].toUpperCase();
      }

      if (nombreEncontrado || curpEncontrada || fechaNacEncontrada) {
        const parts = nombreEncontrado ? nombreEncontrado.split(' ') : [];
        let firstName = '', lastNameP = '', lastNameM = '';
        if (parts.length >= 3) { lastNameP = parts[0]; lastNameM = parts[1]; firstName = parts.slice(2).join(' '); }
        else if (parts.length === 2) { lastNameP = parts[0]; firstName = parts[1]; }
        else { firstName = nombreEncontrado; }

        setDatosEditables(prev => ({
          ...prev,
          ...(firstName && { nombre: firstName }),
          ...(lastNameP && { primerApellido: lastNameP }),
          ...(lastNameM && { segundoApellido: lastNameM }),
          ...(curpEncontrada && { curp: curpEncontrada }),
          ...(fechaNacEncontrada && { fechaNacimiento: fechaNacEncontrada })
        }));
        setHaCambiado(true);
        Swal.fire({ title: '¡Lectura exitosa!', text: `Se detectó: ${nombreEncontrado || curpEncontrada}`, icon: 'success', timer: 2000, showConfirmButton: false });
      } else {
        throw new Error('No se detectaron datos legibles en este documento.');
      }
    } catch (err) {
      console.error('Error OCR modal:', err);
      Swal.fire('Aviso', 'No se pudo extraer la información automáticamente. Ingresa los datos manualmente una vez que el OCR los actualice.', 'info');
    } finally {
      setOcrCargando(false);
    }
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

    if (datosEditables.curp && datosEditables.curp.length !== 18) {
      Swal.fire('CURP inválida', 'La CURP debe tener exactamente 18 caracteres.', 'warning');
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
      loadJugadores(true);
    } catch (error) {
      console.error(error);
      const msg = error?.response?.data?.detail || 'No se pudieron guardar los cambios.';
      Swal.fire('Error', msg, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const columns = [
    { key: "MiembroEquipoId", label: "ID" },
    { key: "NombreCompleto", label: "Jugador" },
    { key: "NUI", label: "NUI" },
    { key: "Sexo", label: "Sexo" },
    { key: "EquipoLiga", label: "Equipo actual", style: { width: '340px' } },
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
    NUI: j.NUI ? (
      <span style={{ fontFamily: 'monospace', fontSize: '12px', background: '#eff6ff', color: '#2563eb', padding: '3px 8px', borderRadius: '6px', fontWeight: '700' }}>{j.NUI}</span>
    ) : (
      <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>Sin NUI</span>
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
          className="btn btn-sm"
          style={{ padding: '8px 14px', fontSize: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', background: '#eff6ff', color: '#2563eb', border: 'none', fontWeight: '700' }}
          onClick={() => handleExportar(j)}
          title="Exportar como ZIP"
        >
          <FaFileArchive /> Exportar
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
    return <Loader text="Cargando catálogo de jugadores..." />;
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
            onClick={() => loadJugadores(true)}
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        {/* TARJETA TOTAL */}
        <div
          onClick={() => setFiltroEstatus('todos')}
          style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            border: filtroEstatus === 'todos' ? '2px solid #0b4ea6' : '1px solid #e2e8f0',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: filtroEstatus === 'todos' ? '0 4px 12px rgba(11, 78, 166, 0.15)' : 'none',
            transform: filtroEstatus === 'todos' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '5px' }}>📋</div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>TOTAL JUGADORES</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>{stats.total}</div>
        </div>

        {/* TARJETA ACTIVOS */}
        <div
          onClick={() => setFiltroEstatus('activos')}
          style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            border: filtroEstatus === 'activos' ? '2px solid #10b981' : '1px solid #e2e8f0',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: filtroEstatus === 'activos' ? '0 4px 12px rgba(16, 185, 129, 0.15)' : 'none',
            transform: filtroEstatus === 'activos' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '5px' }}>✅</div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>JUGADORES ACTIVOS</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#10b981' }}>{stats.activos}</div>
        </div>

        {/* TARJETA INACTIVOS */}
        <div
          onClick={() => setFiltroEstatus('inactivos')}
          style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            border: filtroEstatus === 'inactivos' ? '2px solid #ef4444' : '1px solid #e2e8f0',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: filtroEstatus === 'inactivos' ? '0 4px 12px rgba(239, 68, 68, 0.15)' : 'none',
            transform: filtroEstatus === 'inactivos' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '5px' }}>🔴</div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>JUGADORES INACTIVOS</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#ef4444' }}>{stats.inactivos}</div>
        </div>

        {/* TARJETA HOMBRES */}
        <div
          onClick={() => setFiltroEstatus('hombres')}
          style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            border: filtroEstatus === 'hombres' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: filtroEstatus === 'hombres' ? '0 4px 12px rgba(59, 130, 246, 0.15)' : 'none',
            transform: filtroEstatus === 'hombres' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '5px' }}>🧑</div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>MASCULINO</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#3b82f6' }}>{stats.hombres}</div>
        </div>

        {/* TARJETA MUJERES */}
        <div
          onClick={() => setFiltroEstatus('mujeres')}
          style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            border: filtroEstatus === 'mujeres' ? '2px solid #f43f5e' : '1px solid #e2e8f0',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: filtroEstatus === 'mujeres' ? '0 4px 12px rgba(244, 63, 94, 0.15)' : 'none',
            transform: filtroEstatus === 'mujeres' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '5px' }}>👩</div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>FEMENINO</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#f43f5e' }}>{stats.mujeres}</div>
        </div>
        {/* TARJETA CON NUI */}
        <div
          onClick={() => setFiltroEstatus('conNUI')}
          style={{
            background: 'white', padding: '20px', borderRadius: '12px',
            border: filtroEstatus === 'conNUI' ? '2px solid #8b5cf6' : '1px solid #e2e8f0',
            textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease',
            boxShadow: filtroEstatus === 'conNUI' ? '0 4px 12px rgba(139,92,246,0.15)' : 'none',
            transform: filtroEstatus === 'conNUI' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '5px' }}>🆔</div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>CON NUI</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#8b5cf6' }}>{stats.conNUI}</div>
        </div>

        {/* TARJETA SIN NUI */}
        <div
          onClick={() => setFiltroEstatus('sinNUI')}
          style={{
            background: 'white', padding: '20px', borderRadius: '12px',
            border: filtroEstatus === 'sinNUI' ? '2px solid #f59e0b' : '1px solid #e2e8f0',
            textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease',
            boxShadow: filtroEstatus === 'sinNUI' ? '0 4px 12px rgba(245,158,11,0.15)' : 'none',
            transform: filtroEstatus === 'sinNUI' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '5px' }}>⚠️</div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>SIN NUI</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#f59e0b' }}>{stats.sinNUI}</div>
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
              {['todos', 'activos', 'inactivos', 'hombres', 'mujeres', 'conNUI', 'sinNUI'].map((val) => (
                <button key={val} onClick={() => setFiltroEstatus(val)} style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: filtroEstatus === val ? 'white' : 'transparent', color: filtroEstatus === val ? 'var(--primary)' : 'var(--text-muted)', boxShadow: filtroEstatus === val ? 'var(--shadow-sm)' : 'none', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>
                  {val === 'todos' ? 'Todos' : (val === 'activos' ? 'Activos' : (val === 'inactivos' ? 'Inactivos' : (val === 'hombres' ? 'Hombres' : (val === 'mujeres' ? 'Mujeres' : (val === 'conNUI' ? 'Con NUI' : 'Sin NUI')))))}
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
        tamanio="grande"
        pie={
          <>
            <BotonSecundario etiqueta="Cancelar" onClick={handleCerrarModal} />
            <BotonPrimario
              etiqueta={guardando ? 'Guardando...' : 'Guardar cambios'}
              onClick={manejarGuardarJugador}
              deshabilitado={guardando || ocrCargando}
              icono={<FaSave />}
            />
          </>
        }
      >
        {/* BANNER INFORMATIVO */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px 20px', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <span style={{ fontSize: '18px', flexShrink: 0 }}>ℹ️</span>
          <p style={{ margin: 0, fontSize: '13px', color: '#1e40af', fontWeight: '600' }}>
            Los campos marcados con <strong>*</strong> (Nombre, Apellidos, CURP) solo se actualizan cargando el Acta de Nacimiento o la INE. El OCR los leerá automáticamente.
            Los demás campos son editables de forma manual.
          </p>
        </div>

        {/* SECCIÓN OCR */}
        <div style={{ background: '#f8fafc', border: '1.5px dashed #94a3b8', borderRadius: '14px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '22px' }}>📄</span>
            <div>
              <p style={{ margin: 0, fontWeight: '800', fontSize: '14px', color: '#1e293b' }}>Actualizar datos con documento oficial</p>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Sube el Acta de Nacimiento o la INE para rellenar automáticamente los campos protegidos.</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* ACTA */}
            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1.5px dashed #cbd5e1', borderRadius: '12px', padding: '20px', cursor: ocrCargando ? 'not-allowed' : 'pointer', background: 'white', transition: 'all 0.2s', opacity: ocrCargando ? 0.6 : 1 }}>
              <span style={{ fontSize: '28px' }}>📋</span>
              <span style={{ fontWeight: '700', fontSize: '13px', color: '#475569' }}>Acta de Nacimiento</span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>PDF o imagen</span>
              <input
                type="file"
                accept=".pdf,image/*"
                style={{ display: 'none' }}
                disabled={ocrCargando}
                onChange={(e) => { if (e.target.files[0]) handleOcrModalUpload(e.target.files[0]); e.target.value = ''; }}
              />
            </label>
            {/* INE */}
            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1.5px dashed #cbd5e1', borderRadius: '12px', padding: '20px', cursor: ocrCargando ? 'not-allowed' : 'pointer', background: 'white', transition: 'all 0.2s', opacity: ocrCargando ? 0.6 : 1 }}>
              <span style={{ fontSize: '28px' }}>🪪</span>
              <span style={{ fontWeight: '700', fontSize: '13px', color: '#475569' }}>INE / Identificación</span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>PDF o imagen</span>
              <input
                type="file"
                accept=".pdf,image/*"
                style={{ display: 'none' }}
                disabled={ocrCargando}
                onChange={(e) => { if (e.target.files[0]) handleOcrModalUpload(e.target.files[0]); e.target.value = ''; }}
              />
            </label>
          </div>
          {ocrCargando && (
            <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '13px', color: '#0b4ea6', fontWeight: '600' }}>⏳ Procesando documento con OCR...</p>
          )}
        </div>

        {/* CAMPOS DEL FORMULARIO */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          {/* BLOQUEADOS — se rellenan con OCR */}
          <EntradaFormulario
            etiqueta="Nombre(s) *"
            valor={datosEditables.nombre}
            onChange={manejarCambioInput}
            nombre="nombre"
            obligatorio
            placeholder="Se actualiza con OCR"
            disabled
            style={{ opacity: 0.7, cursor: 'not-allowed', background: '#f1f5f9' }}
          />
          <EntradaFormulario
            etiqueta="Primer apellido *"
            valor={datosEditables.primerApellido}
            onChange={manejarCambioInput}
            nombre="primerApellido"
            obligatorio
            placeholder="Se actualiza con OCR"
            disabled
            style={{ opacity: 0.7, cursor: 'not-allowed', background: '#f1f5f9' }}
          />
          <EntradaFormulario
            etiqueta="Segundo apellido *"
            valor={datosEditables.segundoApellido}
            onChange={manejarCambioInput}
            nombre="segundoApellido"
            placeholder="Se actualiza con OCR"
            disabled
            style={{ opacity: 0.7, cursor: 'not-allowed', background: '#f1f5f9' }}
          />
          <EntradaFormulario
            etiqueta="CURP *"
            valor={datosEditables.curp}
            onChange={manejarCambioInput}
            nombre="curp"
            obligatorio
            placeholder="Se actualiza con OCR"
            disabled
            style={{ opacity: 0.7, cursor: 'not-allowed', background: '#f1f5f9' }}
          />

          {/* EDITABLES MANUALMENTE */}
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
              { valor: 'Femenino', etiqueta: 'Femenino' },
              { valor: 'No Binario', etiqueta: 'No Binario' }
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
              { valor: '1', etiqueta: 'Activo' },
              { valor: '0', etiqueta: 'Baja' }
            ]}
          />
        </div>
      </Modal>
    </div>
  );
}
