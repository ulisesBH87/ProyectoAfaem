import React, { useEffect, useState } from 'react';
import { FaUsers, FaSearch, FaDownload } from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../styles/dashboard.css';

// Componentes
import DashboardSidebar from '../../components/DashboardSidebar';
import DashboardHeader from '../../components/DashboardHeader';
import { TablaSimple, EntradaFormulario, EntradaSeleccion, Insignia, BotonPrimario } from '../../components/partials';

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
        // Aquí iría la llamada a API para obtener jugadores
        // Por ahora usamos datos de ejemplo
        const datosEjemplo = [
          {
            id: 1,
            nombre: 'Juan Pérez',
            equipo: 'Equipo A',
            posicion: 'Delantero',
            edad: 18,
            estatus: 'aprobado',
            fechaRegistro: '2026-01-15'
          },
          {
            id: 2,
            nombre: 'Carlos García',
            equipo: 'Equipo B',
            posicion: 'Portero',
            edad: 20,
            estatus: 'pendiente',
            fechaRegistro: '2026-02-20'
          },
          {
            id: 3,
            nombre: 'Luis Martínez',
            equipo: 'Equipo A',
            posicion: 'Defensor',
            edad: 19,
            estatus: 'en_proceso',
            fechaRegistro: '2026-02-10'
          }
        ];
        
        setJugadores(datosEjemplo);
        calcularEstadisticas(datosEjemplo);
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
      clave: 'edad',
      etiqueta: 'Edad',
      renderizar: (valor) => `${valor} años`
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
        j.edad,
        obtenerEtiquetaEstado(j.estatus)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jugadores.csv';
    a.click();
  };

  if (loading) {
    return (
      <div className="dashboard-wrapper">
        <DashboardSidebar userEmail={userEmail} />
        <div className="dashboard-container">
          <DashboardHeader userEmail={userEmail} pageTitle="Cargando..." />
          <div className="dashboard-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div>Cargando jugadores...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <DashboardSidebar userEmail={userEmail} />
      
      <div className="dashboard-container">
        <DashboardHeader userEmail={userEmail} pageTitle="Gestión de Jugadores" />
        
        <div className="dashboard-main">
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
                <EntradaFormulario
                  etiqueta="Buscar por nombre"
                  tipo="text"
                  valor={filtroBusqueda}
                  alCambiar={(e) => setFiltroBusqueda(e.target.value)}
                  marcador="Escribe el nombre del jugador..."
                />
                
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
        </div>
      </div>
    </div>
  );
}
