import React from 'react';
import { FaChartBar, FaFileAlt, FaDownload, FaCalendarAlt } from 'react-icons/fa';

/**
 * MÓDULO EN PREPARACIÓN
 * Los reportes requieren endpoints del backend aún no implementados.
 * Cuando el backend los implemente, conectar:
 *   - GET /reportes/resumen       → Reporte general de afiliaciones y equipos
 *   - GET /reportes/jugadores     → Estadísticas por jugador/equipo
 *   - GET /reportes/pdf/{tipo}    → Descarga de un PDF generado
 */
export default function PresidenteEquipoReportes() {
  const tiposReporte = [
    { icon: <FaFileAlt />, nombre: 'Resumen de Afiliaciones', desc: 'Total de jugadores y equipos registrados en el periodo.' },
    { icon: <FaChartBar />, nombre: 'Desempeño del Equipo', desc: 'Métricas de jugadores evaluados y tasa de aprobación.' },
    { icon: <FaCalendarAlt />, nombre: 'Análisis de Actividad', desc: 'Historial de cambios y eventos registrados en el sistema.' },
  ];

  return (
    <div className="fade-in-up" style={{ padding: '4px 0 32px' }}>
      {/* ENCABEZADO */}
      <header style={{ marginBottom: '32px' }}>
        <h2
          className="heading-outfit"
          style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}
        >
          Reportes
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px' }}>
          Consulta y descarga informes de tu equipo.
        </p>
      </header>

      {/* TARJETA PRINCIPAL */}
      <div
        className="card glass"
        style={{
          padding: '56px 40px',
          borderRadius: '24px',
          textAlign: 'center',
          maxWidth: '600px',
          margin: '0 auto',
        }}
      >
        {/* ÍCONO */}
        <div
          style={{
            width: '88px',
            height: '88px',
            borderRadius: '28px',
            background: 'rgba(139, 92, 246, 0.1)',
            color: '#8b5cf6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px',
            margin: '0 auto 24px',
            border: '2px solid rgba(139, 92, 246, 0.2)',
          }}
        >
          <FaChartBar />
        </div>

        {/* BADGE */}
        <span
          style={{
            display: 'inline-block',
            padding: '6px 16px',
            background: 'rgba(139, 92, 246, 0.08)',
            color: '#8b5cf6',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: '800',
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            marginBottom: '16px',
            border: '1px solid rgba(139, 92, 246, 0.2)',
          }}
        >
          📊 Próximamente disponible
        </span>

        <h3
          style={{
            fontSize: '20px',
            fontWeight: '800',
            color: 'var(--text-main)',
            margin: '0 0 12px',
          }}
        >
          Reportes en construcción
        </h3>
        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '14px',
            lineHeight: '1.7',
            marginBottom: '32px',
          }}
        >
          El módulo de reportes estará disponible próximamente. Podrás generar
          y descargar informes de tu equipo en formato PDF.
        </p>

        {/* TIPOS DE REPORTE DISPONIBLES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px', textAlign: 'left' }}>
          {tiposReporte.map((r, i) => (
            <div
              key={i}
              style={{
                padding: '16px 18px',
                background: 'var(--bg-main)',
                borderRadius: '14px',
                border: '1px solid var(--border-light)',
                display: 'flex',
                gap: '14px',
                alignItems: 'center',
                opacity: 0.7,
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(139, 92, 246, 0.08)',
                  color: '#8b5cf6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '15px',
                  flexShrink: 0,
                }}
              >
                {r.icon}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '2px' }}>
                  {r.nombre}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.desc}</div>
              </div>
              <div
                style={{
                  marginLeft: 'auto',
                  padding: '4px 10px',
                  background: 'rgba(0,0,0,0.04)',
                  borderRadius: '8px',
                  fontSize: '10px',
                  fontWeight: '800',
                  color: 'var(--text-muted)',
                  flexShrink: 0,
                }}
              >
                PRONTO
              </div>
            </div>
          ))}
        </div>


      </div>
    </div>
  );
}
