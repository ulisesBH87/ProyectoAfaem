import React, { useState } from 'react';
import COLORS from '../../styles/colors';
import {
  FaShieldAlt,
  FaChevronDown,
  FaChevronUp,
  FaUserCheck,
  FaCreditCard,
  FaListOl,
  FaFileContract,
  FaCalendarAlt,
  FaInfoCircle,
} from 'react-icons/fa';
import './Legales.css';

const segurosJugadores = [
  {
    id: 'A',
    nombre: 'TIPO "A" (Jugadores)',
    precio: 240,
    poliza: '2922500000281',
    vigencia: 'ENERO 2026 – DICIEMBRE 2026',
    alcance: 'Se ampara un juego por semana (máximo 2), traslados directos e ininterrumpidos de la casa al partido de fútbol (supervisado y autorizado para la realización del evento en ese día de la semana) y viceversa. Ampara exclusivamente traslados dentro del mismo estado.',
    beneficios: [
      'Participación en Torneos Estatales',
      'Participación en Torneos Regionales',
      'Participación en Torneos Nacionales',
      'Participación en Campeonatos Nacionales',
      'Participación en Torneos Federados',
      'Participación en Capacitaciones',
      'Descuentos en Material Deportivo',
      'Expediente deportivo Oficial en la FMF',
      'Activaciones y Experiencias con Patrocinadores',
      'Descuentos en la Compra de Balones Oficiales del Sector Amateur',
      'Seguro de Gastos Médicos por Accidente'
    ],
    coberturas: [
      { cobertura: 'Indemnización por fallecimiento accidental', monto: '$50,000.00' },
      { cobertura: 'Reembolso de Gastos Médicos por Accidente', monto: '$25,000.00' },
      { cobertura: 'Tope de Rodilla', monto: '$25,000.00' },
      { cobertura: 'Deducible', monto: '$1,500.00' }
    ]
  },
  {
    id: 'B',
    nombre: 'TIPO "B" (Jugadores)',
    precio: 350,
    poliza: '2922500000283',
    vigencia: 'ENERO 2026 – DICIEMBRE 2026',
    alcance: 'Se ampara un juego por semana (máximo 2), traslados directos e ininterrumpidos de la casa al partido de fútbol (supervisado y autorizado para la realización del evento en ese día de la semana) y viceversa. Ampara exclusivamente traslados dentro del mismo estado.',
    beneficios: [
      'Participación en Torneos Estatales',
      'Participación en Torneos Regionales',
      'Participación en Torneos Nacionales',
      'Participación en Campeonatos Nacionales',
      'Participación en Torneos Federados',
      'Participación en Capacitaciones',
      'Descuentos en Material Deportivo',
      'Expediente deportivo Oficial en la FMF',
      'Activaciones y Experiencias con Patrocinadores',
      'Descuentos en la Compra de Balones Oficiales del Sector Amateur',
      'Seguro de Gastos Médicos por Accidente'
    ],
    coberturas: [
      { cobertura: 'Indemnización por fallecimiento accidental', monto: '$100,000.00' },
      { cobertura: 'Reembolso de Gastos Médicos por Accidente', monto: '$50,000.00' },
      { cobertura: 'Tope de Rodilla', monto: '$30,000.00' },
      { cobertura: 'Deducible', monto: '$1,500.00' }
    ]
  },
  {
    id: 'F',
    nombre: 'TIPO "F" (Jugadores)',
    precio: 670,
    poliza: '2922500000282',
    vigencia: 'ENERO 2026 – DICIEMBRE 2026',
    alcance: 'Se ampara los entrenamientos, partidos y torneos de futbol organizados y supervisados por la FEMEXFUT, adicionalmente se amparan los traslados desde el domicilio al campo de juego y viceversa. Se amparan los traslados entre estados.',
    beneficios: [
      'Participación en Torneos Estatales',
      'Participación en Torneos Regionales',
      'Participación en Torneos Nacionales',
      'Participación en Campeonatos Nacionales',
      'Participación en Torneos Federados',
      'Participación en Capacitaciones',
      'Descuentos en Material Deportivo',
      'Expediente deportivo Oficial en la FMF',
      'Activaciones y Experiencias con Patrocinadores',
      'Descuentos en la Compra de Balones Oficiales del Sector Amateur',
      'Seguro de Gastos Médicos por Accidente'
    ],
    coberturas: [
      { cobertura: 'Indemnización por fallecimiento accidental', monto: '$200,000.00' },
      { cobertura: 'Reembolso de Gastos Médicos por Accidente', monto: '$100,000.00' },
      { cobertura: 'Tope de Rodilla', monto: '$30,000.00' },
      { cobertura: 'Deducible', monto: '$1,500.00' }
    ]
  },
  {
    id: 'H',
    nombre: 'TIPO "H" (Jugadores)',
    precio: 475,
    poliza: '2922500000286',
    vigencia: 'ENERO 2026 – DICIEMBRE 2026',
    alcance: 'Se ampara los entrenamientos, partidos y torneos de futbol organizados y supervisados por la FEMEXFUT, adicionalmente se amparan los traslados desde el domicilio al campo de juego y viceversa. Se amparan los traslados entre estados.',
    beneficios: [
      'Participación en Torneos Estatales',
      'Participación en Torneos Regionales',
      'Participación en Torneos Nacionales',
      'Participación en Campeonatos Nacionales',
      'Participación en Torneos Federados',
      'Participación en Capacitaciones',
      'Descuentos en Material Deportivo',
      'Expediente deportivo Oficial en la FMF',
      'Activaciones y Experiencias con Patrocinadores',
      'Descuentos en la Compra de Balones Oficiales del Sector Amateur',
      'Seguro de Gastos Médicos por Accidente'
    ],
    coberturas: [
      { cobertura: 'Indemnización por fallecimiento accidental', monto: '$100,000.00' },
      { cobertura: 'Reembolso de Gastos Médicos por Accidente', monto: '$50,000.00' },
      { cobertura: 'Tope de Rodilla', monto: '$30,000.00' },
      { cobertura: 'Deducible', monto: '$1,500.00' }
    ]
  },
  {
    id: 'BASICA',
    nombre: 'TIPO "BÁSICA" (Jugadores)',
    precio: 155,
    poliza: 'N/A',
    vigencia: 'ENERO 2026 – DICIEMBRE 2026',
    alcance: 'Esta afiliación no incluye póliza de seguro de gastos médicos por accidente. Solo cubre derechos de participación básica.',
    beneficios: [
      'Participación en Torneos Estatales (Es necesario Afiliación con cobertura de Seguro)',
      'Participación en Torneos Regionales (Es necesario Afiliación con cobertura de Seguro)',
      'Participación en Torneos Nacionales (Es necesario Afiliación con cobertura de Seguro)',
      'Participación en Campeonatos Nacionales (Es necesario Afiliación con cobertura de Seguro)',
      'Participación en Torneos Federados (Es necesario Afiliación con cobertura de Seguro)',
      'Participación en Capacitaciones',
      'Descuentos en Material Deportivo',
      'Expediente deportivo Oficial en la FMF',
      'Activaciones y Experiencias con Patrocinadores',
      'Descuentos en la Compra de Balones Oficiales del Sector Amateur'
    ],
    coberturas: []
  }
];

const segurosPresidentes = [
  {
    id: 'G',
    nombre: 'TIPO "G" (Presidentes)',
    precio: 350,
    poliza: '2922500000280',
    vigencia: 'ENERO 2026 – DICIEMBRE 2026',
    alcance: 'Se amparan los traslados de su casa a las ligas, asociaciones y viceversa, y traslados a otras ligas, se cubre dentro de las instalaciones de sus ligas y asociaciones. Se amparan traslados de estado a estado.',
    beneficios: [
      'Participación en Torneos Estatales',
      'Participación en Torneos Regionales',
      'Participación en Torneos Nacionales',
      'Participación en Campeonatos Nacionales',
      'Participación en Torneos Federados',
      'Participación en Capacitaciones',
      'Descuentos en Material Deportivo',
      'Expediente deportivo Oficial en la FMF',
      'Activaciones y Experiencias con Patrocinadores',
      'Descuentos en la Compra de Balones Oficiales del Sector Amateur',
      'Seguro de Gastos Médicos por Accidente'
    ],
    coberturas: [
      { cobertura: 'Indemnización por fallecimiento accidental', monto: '$200,000.00' },
      { cobertura: 'Reembolso de Gastos Médicos por Accidente', monto: '$100,000.00' },
      { cobertura: 'Tope de Rodilla', monto: '$25,000.00' },
      { cobertura: 'Deducible', monto: '$1,500.00' }
    ]
  },
  {
    id: 'J',
    nombre: 'TIPO "J" (Presidentes)',
    precio: 0,
    poliza: 'N/A',
    vigencia: 'N/A',
    alcance: 'El presidente no cuenta con cobertura médica federada.',
    beneficios: [
      'Sin costo adicional',
      'Registro básico en la plataforma',
      'No incluye seguro de gastos médicos',
      'No incluye derechos de participación deportiva federada activa'
    ],
    coberturas: []
  }
];

const PreciosSeguros = ({ hideHero = false }) => {
  const [abiertos, setAbiertos] = useState({});

  const toggle = (id) => {
    setAbiertos((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderSeguroItem = (seg, isPres = false) => {
    const isOpen = abiertos[seg.id];
    return (
      <div key={seg.id} className={`legal-acordeon-item tc ${isOpen ? 'abierto' : ''}`} style={{ marginBottom: '12px' }}>
        <button className="legal-acordeon-header" onClick={() => toggle(seg.id)}>
          <span className="legal-acordeon-titulo">
            <span className="legal-acordeon-icono legal-acordeon-icono--tc">
              <FaShieldAlt />
            </span>
            <span>{seg.nombre}</span>
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '14px', fontWeight: '800', color: COLORS.sky }}>
              {seg.precio === 0 ? 'Sin Costo' : `$${seg.precio}.00 MXN`}
            </span>
            <span className="legal-acordeon-chevron">
              {isOpen ? <FaChevronUp /> : <FaChevronDown />}
            </span>
          </div>
        </button>

        {isOpen && (
          <div className="legal-acordeon-cuerpo" style={{ background: 'rgba(0,0,0,0.02)', padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <strong style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>Póliza</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', fontWeight: '600', color: 'var(--text-main, #1e293b)' }}>{seg.poliza}</p>
              </div>
              <div>
                <strong style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>Vigencia</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', fontWeight: '600', color: 'var(--text-main, #1e293b)' }}>{seg.vigencia}</p>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <strong style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>Alcance y Cobertura Terrestre</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', lineHeight: '1.6', color: 'var(--text-main, #334155)' }}>{seg.alcance}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <strong style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Beneficios Incluidos</strong>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', lineHeight: '1.8', color: 'var(--text-main, #475569)' }}>
                  {seg.beneficios.map((b, idx) => (
                    <li key={idx}>{b}</li>
                  ))}
                </ul>
              </div>

              {seg.coberturas.length > 0 && (
                <div>
                  <strong style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Montos Amparados</strong>
                  <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                    <tbody>
                      {seg.coberturas.map((c, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-light, rgba(0, 0, 0, 0.08))' }}>
                          <td style={{ padding: '6px 0', color: 'var(--text-main, #475569)' }}>{c.cobertura}</td>
                          <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: '700', color: COLORS.success }}>{c.monto}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={hideHero ? "" : "legal-page"}>
      {!hideHero && (
        <div className="legal-hero legal-hero--terminos">
          <div className="legal-hero-glow--tc" />
          <div className="legal-hero-content">
            <div className="legal-hero-icon-wrap--tc">
              <FaShieldAlt />
            </div>
            <div>
              <p className="legal-hero-etiqueta">Portal Legal · AFAEM</p>
              <h1 className="legal-hero-titulo">Precios y Tipos de Seguros</h1>
              <p className="legal-hero-desc">
                Conoce los costos, coberturas, sumas amparadas y beneficios incluidos para jugadores y presidentes bajo el esquema nacional del Sector Amateur de la FMF.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="legal-panel">
        <div className="legal-panel-header">
          <span className="legal-panel-icono" style={{ color: COLORS.sky }}>
            <FaCreditCard />
          </span>
          <div>
            <h2 className="legal-panel-titulo">Seguros para Jugadores</h2>
            <p className="legal-panel-descripcion font-sans">
              Consulta las 5 opciones de afiliación y cobertura médica por accidente deportivo disponibles para jugadores activos.
            </p>
          </div>
        </div>
        {segurosJugadores.map(s => renderSeguroItem(s, false))}
      </div>

      <div className="legal-panel">
        <div className="legal-panel-header">
          <span className="legal-panel-icono" style={{ color: COLORS.sky }}>
            <FaUserCheck />
          </span>
          <div>
            <h2 className="legal-panel-titulo">Seguros para Presidentes</h2>
            <p className="legal-panel-descripcion font-sans">
              Consulta las 2 opciones de registro y cobertura médica para presidentes y directores de equipo.
            </p>
          </div>
        </div>
        {segurosPresidentes.map(s => renderSeguroItem(s, true))}
      </div>
    </div>
  );
};

export default PreciosSeguros;
