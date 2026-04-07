import React, { useEffect, useState } from 'react';
import { FaClipboard } from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../styles/dashboard.css';

// Componentes
import { TablaSimple, EntradaFormulario, EntradaSeleccion, Insignia, BotonPrimario } from '../../components/partials';
import SearchBar from '../../components/Common/SearchBar';
import { getMisSolicitudes } from '../../services/solicitud';

export default function PresidenteEquipoSolicitudes() {
  const userEmail = localStorage.getItem('email');
  
  const [solicitudes, setSolicitudes] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    nuevas: 0,
    enRevision: 0,
    completadas: 0
  });

  useEffect(() => {
    const cargarSolicitudes = async () => {
      try {
        setLoading(true);
        const datos = await getMisSolicitudes();
        
        // Mapear datos del backend al formato de la tabla
        const solicitudesMapeadas = (Array.isArray(datos) ? datos : []).map(s => ({
          id: s.SolicitudId,
          tipo: s.TipoSolicitud || 'Registro de Presidente',
          equipo: s.Equipo || 'N/A',
          fechaSolicitud: s.FechaSolicitud,
          estado: s.EstatusValidacion === 1 ? 'completada' : 
                  s.EstatusValidacion === 0 ? 'rechazada' : 
                  s.EstatusValidacion === 4 ? 'en_revision' : 'pendiente',
          prioridad: 'media'
        }));

        setSolicitudes(solicitudesMapeadas);
        calcularEstadisticas(solicitudesMapeadas);
        setError(null);
      } catch (err) {
        console.error('Error al cargar solicitudes:', err);
        setError('No se pudieron cargar las solicitudes');
      } finally {
        setLoading(false);
      }
    };

    if (userEmail) {
      cargarSolicitudes();
    }
  }, [userEmail]);

  const calcularEstadisticas = (data) => {
    setStats({
      total: data.length,
      nuevas: data.filter(s => s.estado === 'pendiente').length,
      enRevision: data.filter(s => s.estado === 'en_revision').length,
      completadas: data.filter(s => s.estado === 'completada').length
    });
  };

  const solicitudesFiltradas = solicitudes.filter(solicitud => {
    const coincideBusqueda = 
      solicitud.tipo.toLowerCase().includes(filtroBusqueda.toLowerCase()) ||
      (solicitud.jugador && solicitud.jugador.toLowerCase().includes(filtroBusqueda.toLowerCase())) ||
      (solicitud.equipo && solicitud.equipo.toLowerCase().includes(filtroBusqueda.toLowerCase()));
    const coincideTipo = !filtroTipo || solicitud.tipo === filtroTipo;
    const coincideEstado = !filtroEstado || solicitud.estado === filtroEstado;
    return coincideBusqueda && coincideTipo && coincideEstado;
  });

  const obtenerColorEstado = (estado) => {
    switch(estado) {
      case 'completada': return 'exito';
      case 'rechazada': return 'error';
      case 'en_revision': return 'advertencia';
      case 'pendiente': return 'gris';
      default: return 'gris';
    }
  };

  const obtenerColorPrioridad = (prioridad) => {
    switch(prioridad) {
      case 'alta': return '#dc3545';
      case 'media': return '#ffc107';
      case 'baja': return '#6c757d';
      default: return '#0b4ea6';
    }
  };

  const obtenerEtiquetaEstado = (estado) => {
    switch(estado) {
      case 'completada': return 'Completada';
      case 'rechazada': return 'Rechazada';
      case 'en_revision': return 'En revisión';
      case 'pendiente': return 'Pendiente';
      default: return 'Desconocida';
    }
  };

  const columnasTabla = [
    {
      clave: 'tipo',
      etiqueta: 'Tipo de solicitud',
      renderizar: (valor) => valor
    },
    {
      clave: 'jugador',
      etiqueta: 'Jugador/Equipo',
      renderizar: (valor, fila) => valor || fila.equipo || '-'
    },
    {
      clave: 'fechaSolicitud',
      etiqueta: 'Fecha',
      renderizar: (valor) => new Date(valor).toLocaleDateString('es-MX')
    },
    {
      clave: 'prioridad',
      etiqueta: 'Prioridad',
      renderizar: (valor) => (
        <span style={{
          display: 'inline-block',
          padding: '4px 8px',
          borderRadius: '4px',
          backgroundColor: obtenerColorPrioridad(valor) + '20',
          color: obtenerColorPrioridad(valor),
          fontSize: '12px',
          fontWeight: '600',
          textTransform: 'capitalize'
        }}>
          {valor}
        </span>
      )
    },
    {
      clave: 'estado',
      etiqueta: 'Estado',
      renderizar: (valor) => (
        <Insignia
          etiqueta={obtenerEtiquetaEstado(valor)}
          tipo={obtenerColorEstado(valor)}
          tamanio="pequeno"
        />
      )
    },
    {
      clave: 'id',
      etiqueta: 'Acciones',
      renderizar: () => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <BotonPrimario
            etiqueta="Ver"
            alHacerClick={() => {}}
            tamanio="pequeno"
          />
        </div>
      )
    }
  ];



  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ color: 'var(--text-muted)' }}>Cargando solicitudes...</div>
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
                <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '700', marginBottom: '8px' }}>TOTAL DE SOLICITUDES</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#0b4ea6' }}>{stats.total}</div>
              </div>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '700', marginBottom: '8px' }}>NUEVAS</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#6c757d' }}>{stats.nuevas}</div>
              </div>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '700', marginBottom: '8px' }}>EN REVISIÓN</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#ffc107' }}>{stats.enRevision}</div>
              </div>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '700', marginBottom: '8px' }}>COMPLETADAS</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#28a745' }}>{stats.completadas}</div>
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
                    Buscar solicitud
                  </label>
                  <SearchBar
                    value={filtroBusqueda}
                    onChange={(e) => setFiltroBusqueda(e.target.value)}
                    placeholder="Busca por tipo, jugador o equipo..."
                    width="280px"
                  />
                </div>
                
                <EntradaSeleccion
                  etiqueta="Filtrar por tipo"
                  valor={filtroTipo}
                  alCambiar={(e) => setFiltroTipo(e.target.value)}
                  opciones={[
                    { valor: '', etiqueta: 'Todos los tipos' },
                    { valor: 'Afiliación de jugador', etiqueta: 'Afiliación de jugador' },
                    { valor: 'Cambio de entrenador', etiqueta: 'Cambio de entrenador' },
                    { valor: 'Afiliación de equipo', etiqueta: 'Afiliación de equipo' },
                    { valor: 'Cambio de datos', etiqueta: 'Cambio de datos' }
                  ]}
                />

                <EntradaSeleccion
                  etiqueta="Filtrar por estado"
                  valor={filtroEstado}
                  alCambiar={(e) => setFiltroEstado(e.target.value)}
                  opciones={[
                    { valor: '', etiqueta: 'Todos los estados' },
                    { valor: 'pendiente', etiqueta: 'Pendientes' },
                    { valor: 'en_revision', etiqueta: 'En revisión' },
                    { valor: 'completada', etiqueta: 'Completadas' },
                    { valor: 'rechazada', etiqueta: 'Rechazadas' }
                  ]}
                />
              </div>
            </div>

            {/* TABLA DE SOLICITUDES */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              border: '1px solid #e2e8f0'
            }}>
              {solicitudesFiltradas.length > 0 ? (
                <TablaSimple
                  columnas={columnasTabla}
                  datos={solicitudesFiltradas}
                  conRayas={true}
                  conEfectoHover={true}
                />
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: '#64748b'
                }}>
                  <FaClipboard style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }} />
                  <p>No hay solicitudes que coincidan con los filtros</p>
                </div>
              )}
            </div>
    </div>
  );
}
