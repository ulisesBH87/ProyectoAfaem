import React, { useEffect, useState } from 'react';
import { FaUsers, FaSearch, FaDownload } from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../styles/dashboard.css';

// Componentes
import { TablaSimple, EntradaFormulario, EntradaSeleccion, Insignia, BotonPrimario } from '../../components/partials';
import SearchBar from '../../components/Common/SearchBar';
import { API_BASE } from '../../config/config';


export default function PresidenteEquipoJugadores() {
  const userEmail = localStorage.getItem('email');
  
  const [jugadores, setJugadores] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    aprobados: 0,
    pendientes: 0,
    rechazados: 0
  });

  useEffect(() => {
    const cargarJugadores = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/equipos/mis-jugadores-reales`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error('Error al obtener jugadores');
        
        const data = await response.json();
        const mappedData = data.map(j => ({
          id: j.MiembroEquipoId,
          nombre: j.NombreCompleto,
          equipo: j.Equipo,
          posicion: j.Rol,
          dorsal: j.NumeroCamiseta || '-',
          estatus: j.Estatus ? 'aprobado' : 'pendiente',
          fechaRegistro: j.FechaIngreso
        }));

        setJugadores(mappedData);
        calcularEstadisticas(mappedData);
        setError(null);
      } catch (err) {
        console.error('Error al cargar jugadores:', err);
        setError('No se pudieron cargar los jugadores');
      } finally {
        setLoading(false);
      }
    };

    if (userEmail) {
      cargarJugadores();
    }
  }, [userEmail]);


  const calcularEstadisticas = (data) => {
    setStats({
      total: data.length,
      aprobados: data.filter(j => j.estatus === 'aprobado').length,
      pendientes: data.filter(j => j.estatus === 'pendiente').length,
      rechazados: data.filter(j => j.estatus === 'rechazado').length
    });
  };

  const jugadoresFiltrados = jugadores.filter(jugador => {
    const coincideBusqueda = jugador.nombre.toLowerCase().includes(filtroBusqueda.toLowerCase());
    const coincideEstado = !filtroEstado || jugador.estatus === filtroEstado;
    return coincideBusqueda && coincideEstado;
  });

  const obtenerColorEstado = (estatus) => {
    switch(estatus) {
      case 'aprobado': return 'exito';
      case 'rechazado': return 'error';
      case 'en_proceso': return 'advertencia';
      case 'pendiente': return 'gris';
      default: return 'gris';
    }
  };

  const obtenerEtiquetaEstado = (estatus) => {
    switch(estatus) {
      case 'aprobado': return 'Aprobado';
      case 'rechazado': return 'Rechazado';
      case 'en_proceso': return 'En proceso';
      case 'pendiente': return 'Pendiente';
      default: return 'Desconocido';
    }
  };

  const columnasTabla = [
    {
      clave: 'nombre',
      etiqueta: 'Nombre',
      renderizar: (valor) => valor
    },
    {
      clave: 'equipo',
      etiqueta: 'Equipo',
      renderizar: (valor) => valor
    },
    {
      clave: 'posicion',
      etiqueta: 'Posición',
      renderizar: (valor) => valor
    },
    {
      clave: 'dorsal',
      etiqueta: 'Dorsal',
      renderizar: (valor) => (
        <span style={{ fontWeight: '800', color: '#0b4ea6' }}>#{valor}</span>
      )
    },
    {
      clave: 'estatus',
      etiqueta: 'Estado',
      renderizar: (valor) => (
        <Insignia
          etiqueta={obtenerEtiquetaEstado(valor)}
          tipo={obtenerColorEstado(valor)}
          tamanio="pequeno"
        />
      )
    }

  ];

  const manejarExportar = () => {
    const csv = [
      ['Nombre', 'Equipo', 'Posición', 'Edad', 'Estado'],
      ...jugadoresFiltrados.map(j => [
        j.nombre,
        j.equipo,
        j.posicion,
        j.dorsal,
        obtenerEtiquetaEstado(j.estatus)

      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jugadores.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ color: 'var(--text-muted)' }}>Cargando jugadores...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          padding: '12px 16px',
          borderRadius: '6px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {/* TARJETAS DE ESTADÍSTICAS */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '30px'
            }}>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '700', marginBottom: '8px' }}>TOTAL DE JUGADORES</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#0b4ea6' }}>{stats.total}</div>
              </div>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '700', marginBottom: '8px' }}>APROBADOS</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#28a745' }}>{stats.aprobados}</div>
              </div>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '700', marginBottom: '8px' }}>PENDIENTES</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#ffc107' }}>{stats.pendientes}</div>
              </div>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '700', marginBottom: '8px' }}>RECHAZADOS</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#dc3545' }}>{stats.rechazados}</div>
              </div>
            </div>

            {/* CONTROLES DE FILTRO Y BÚSQUEDA */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px',
              border: '1px solid #e2e8f0'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: '#1e293b' }}>
                Filtros
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#25303b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Buscar por nombre
                  </label>
                  <SearchBar
                    value={filtroBusqueda}
                    onChange={(e) => setFiltroBusqueda(e.target.value)}
                    placeholder="Escribe el nombre del jugador..."
                    width="280px"
                  />
                </div>
                
                <EntradaSeleccion
                  etiqueta="Filtrar por estado"
                  valor={filtroEstado}
                  alCambiar={(e) => setFiltroEstado(e.target.value)}
                  opciones={[
                    { valor: '', etiqueta: 'Todos los estados' },
                    { valor: 'aprobado', etiqueta: 'Aprobados' },
                    { valor: 'pendiente', etiqueta: 'Pendientes' },
                    { valor: 'en_proceso', etiqueta: 'En proceso' },
                    { valor: 'rechazado', etiqueta: 'Rechazados' }
                  ]}
                />

                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <BotonPrimario
                    etiqueta="Exportar"
                    alHacerClick={manejarExportar}
                    icono={<FaDownload style={{ marginRight: '8px' }} />}
                  />
                </div>
              </div>
            </div>

            {/* TABLA DE JUGADORES */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              border: '1px solid #e2e8f0'
            }}>
              {jugadoresFiltrados.length > 0 ? (
                <TablaSimple
                  columnas={columnasTabla}
                  datos={jugadoresFiltrados}
                  conRayas={true}
                  conEfectoHover={true}
                />
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: '#64748b'
                }}>
                  <FaUsers style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }} />
                  <p>No hay jugadores que coincidan con los filtros</p>
                </div>
              )}
            </div>
    </div>
  );
}
