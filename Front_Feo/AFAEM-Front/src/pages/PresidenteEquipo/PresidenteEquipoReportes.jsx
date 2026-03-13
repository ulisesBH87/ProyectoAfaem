import React, { useEffect, useState } from 'react';
import { FaChartBar, FaDownload } from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../styles/dashboard.css';

// Componentes
import DashboardSidebar from '../../components/DashboardSidebar';
import DashboardHeader from '../../components/DashboardHeader';
import { TablaSimple, EntradaFormulario, EntradaSeleccion, Insignia, BotonPrimario } from '../../components/partials';

export default function PresidenteEquipoReportes() {
  const userEmail = localStorage.getItem('email');
  
  const [reportes, setReportes] = useState([]);
  const [filtroTipoReporte, setFiltroTipoReporte] = useState('resumen');
  const [fechaInicio, setFechaInicio] = useState('2026-02-01');
  const [fechaFin, setFechaFin] = useState('2026-02-28');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [estadisticas, setEstadisticas] = useState({
    equiposTotales: 0,
    jugadoresTotales: 0,
    tasaAprobacion: 0,
    actividadPromedio: 0
  });

  useEffect(() => {
    const cargarReportes = async () => {
      try {
        setLoading(true);
        // Aquí iría la llamada a API para obtener reportes
        const datosEjemplo = [
          {
            id: 1,
            nombre: 'Desempeño del Equipo A',
            tipo: 'desempenio',
            fechaGeneracion: '2026-02-25',
            periodo: 'Febrero 2026',
            estado: 'disponible',
            jugadoresEvaluados: 15,
            tasaAprobacion: '87%'
          },
          {
            id: 2,
            nombre: 'Resumen de Afiliaciones',
            tipo: 'resumen',
            fechaGeneracion: '2026-02-25',
            periodo: 'Febrero 2026',
            estado: 'disponible',
            totalAfiliaciones: 23,
            nuevasAfiliaciones: 5
          },
          {
            id: 3,
            nombre: 'Análisis de Actividad',
            tipo: 'actividad',
            fechaGeneracion: '2026-02-24',
            periodo: 'Últimos 7 días',
            estado: 'disponible',
            actividadTotal: 156,
            cambiosRegistrados: 24
          },
          {
            id: 4,
            nombre: 'Comparativa de Equipos',
            tipo: 'comparativa',
            fechaGeneracion: '2026-02-23',
            periodo: 'Febrero 2026',
            estado: 'disponible',
            equiposComparados: 5,
            metricasUsadas: 8
          }
        ];
        
        setReportes(datosEjemplo);
        calcularEstadisticas();
        setError(null);
      } catch (err) {
        console.error('Error al cargar reportes:', err);
        setError('No se pudieron cargar los reportes');
      } finally {
        setLoading(false);
      }
    };

    if (userEmail) {
      cargarReportes();
    }
  }, [userEmail]);

  const calcularEstadisticas = () => {
    setEstadisticas({
      equiposTotales: 12,
      jugadoresTotales: 267,
      tasaAprobacion: 82,
      actividadPromedio: 34
    });
  };

  const obtenerEtiquetaTipoReporte = (tipo) => {
    switch(tipo) {
      case 'desempenio': return 'Desempeño';
      case 'resumen': return 'Resumen';
      case 'actividad': return 'Actividad';
      case 'comparativa': return 'Comparativa';
      default: return 'General';
    }
  };

  const columnasTabla = [
    {
      clave: 'nombre',
      etiqueta: 'Nombre del Reporte',
      renderizar: (valor) => valor
    },
    {
      clave: 'tipo',
      etiqueta: 'Tipo',
      renderizar: (valor) => (
        <Insignia
          etiqueta={obtenerEtiquetaTipoReporte(valor)}
          tipo="info"
          tamanio="pequeno"
        />
      )
    },
    {
      clave: 'periodo',
      etiqueta: 'Período',
      renderizar: (valor) => valor
    },
    {
      clave: 'fechaGeneracion',
      etiqueta: 'Fecha de Generación',
      renderizar: (valor) => new Date(valor).toLocaleDateString('es-MX')
    },
    {
      clave: 'estado',
      etiqueta: 'Estado',
      renderizar: () => (
        <Insignia
          etiqueta="Disponible"
          tipo="exito"
          tamanio="pequeno"
        />
      )
    },
    {
      clave: 'id',
      etiqueta: 'Descargar',
      renderizar: (id) => (
        <BotonPrimario
          etiqueta="Descargar PDF"
          alHacerClick={() => manejarDescargar(id)}
          tamanio="pequeno"
          icono={<FaDownload style={{ marginRight: '6px' }} />}
        />
      )
    }
  ];

  const manejarDescargar = (idReporte) => {
    // Simular descarga de PDF
    const reporte = reportes.find(r => r.id === idReporte);
    if (reporte) {
      const elemento = document.createElement('a');
      elemento.href = '#';
      elemento.download = `${reporte.nombre}.pdf`;
      document.body.appendChild(elemento);
      elemento.click();
      document.body.removeChild(elemento);
    }
  };

  const manejarGenerarReporte = () => {
    // Simular generación de nuevo reporte
    const nuevoReporte = {
      id: reportes.length + 1,
      nombre: `Reporte ${obtenerEtiquetaTipoReporte(filtroTipoReporte)} ${new Date().toLocaleDateString()}`,
      tipo: filtroTipoReporte,
      fechaGeneracion: new Date().toISOString().split('T')[0],
      periodo: `${fechaInicio} al ${fechaFin}`,
      estado: 'disponible',
      jugadoresEvaluados: Math.floor(Math.random() * 50) + 10,
      tasaAprobacion: Math.floor(Math.random() * 30) + 70 + '%'
    };
    setReportes([nuevoReporte, ...reportes]);
  };

  if (loading) {
    return (
      <div className="dashboard-wrapper">
        <DashboardSidebar userEmail={userEmail} />
        <div className="dashboard-container">
          <DashboardHeader userEmail={userEmail} pageTitle="Cargando..." />
          <div className="dashboard-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div>Cargando reportes...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <DashboardSidebar userEmail={userEmail} />
      
      <div className="dashboard-container">
        <DashboardHeader userEmail={userEmail} pageTitle="Reportes y Análisis" />
        
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
                <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '700', marginBottom: '8px' }}>EQUIPOS TOTALES</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#0b4ea6' }}>{estadisticas.equiposTotales}</div>
              </div>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '700', marginBottom: '8px' }}>JUGADORES TOTALES</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#28a745' }}>{estadisticas.jugadoresTotales}</div>
              </div>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '700', marginBottom: '8px' }}>TASA DE APROBACIÓN</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#ffc107' }}>{estadisticas.tasaAprobacion}%</div>
              </div>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '700', marginBottom: '8px' }}>ACTIVIDAD PROMEDIO</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#6c757d' }}>{estadisticas.actividadPromedio}</div>
              </div>
            </div>

            {/* GENERADOR DE REPORTES */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px',
              border: '1px solid #e2e8f0'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: '#1e293b' }}>
                Generar Nuevo Reporte
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '16px',
                alignItems: 'flex-end'
              }}>
                <EntradaSeleccion
                  etiqueta="Tipo de Reporte"
                  valor={filtroTipoReporte}
                  alCambiar={(e) => setFiltroTipoReporte(e.target.value)}
                  opciones={[
                    { valor: 'resumen', etiqueta: 'Resumen General' },
                    { valor: 'desempenio', etiqueta: 'Desempeño de Equipos' },
                    { valor: 'actividad', etiqueta: 'Análisis de Actividad' },
                    { valor: 'comparativa', etiqueta: 'Comparativa' }
                  ]}
                />

                <EntradaFormulario
                  etiqueta="Fecha de Inicio"
                  tipo="date"
                  valor={fechaInicio}
                  alCambiar={(e) => setFechaInicio(e.target.value)}
                />

                <EntradaFormulario
                  etiqueta="Fecha de Término"
                  tipo="date"
                  valor={fechaFin}
                  alCambiar={(e) => setFechaFin(e.target.value)}
                />

                <div>
                  <BotonPrimario
                    etiqueta="Generar Reporte"
                    alHacerClick={manejarGenerarReporte}
                    icono={<FaChartBar style={{ marginRight: '6px' }} />}
                  />
                </div>
              </div>
            </div>

            {/* TABLA DE REPORTES */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              border: '1px solid #e2e8f0'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: '#1e293b' }}>
                Reportes Disponibles
              </h3>
              
              {reportes.length > 0 ? (
                <TablaSimple
                  columnas={columnasTabla}
                  datos={reportes}
                  conRayas={true}
                  conEfectoHover={true}
                />
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: '#64748b'
                }}>
                  <FaChartBar style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }} />
                  <p>No hay reportes disponibles</p>
                  <p style={{ fontSize: '14px' }}>Genera un reporte con los parámetros anteriores</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
