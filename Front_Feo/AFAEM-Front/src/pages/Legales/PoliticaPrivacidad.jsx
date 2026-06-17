import React, { useState } from 'react';
import {
  FaShieldAlt,
  FaChevronDown,
  FaChevronUp,
  FaLock,
  FaEnvelope,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaUserShield,
  FaDatabase,
  FaExchangeAlt,
  FaHandshake,
  FaFileSignature,
  FaKey,
} from 'react-icons/fa';
import './Legales.css';

/* ═══════════════════════════════════════════════════════
   COMPONENTE ACORDEÓN REUTILIZABLE
═══════════════════════════════════════════════════════ */
const Acordeon = ({ items }) => {
  const [abierto, setAbierto] = useState(null);

  const toggle = (idx) => setAbierto(abierto === idx ? null : idx);

  return (
    <div className="legal-acordeon">
      {items.map((item, idx) => {
        const isOpen = abierto === idx;
        return (
          <div
            key={idx}
            className={`legal-acordeon-item${isOpen ? ' abierto' : ''}`}
          >
            <button
              className="legal-acordeon-header"
              onClick={() => toggle(idx)}
              aria-expanded={isOpen}
            >
              <span className="legal-acordeon-titulo">
                <span className="legal-acordeon-icono">{item.icono}</span>
                {item.titulo}
              </span>
              <span className="legal-acordeon-chevron">
                {isOpen ? <FaChevronUp /> : <FaChevronDown />}
              </span>
            </button>
            {isOpen && (
              <div className="legal-acordeon-cuerpo">
                <p className="legal-acordeon-texto">{item.contenido}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   DATOS ARCO
═══════════════════════════════════════════════════════ */
const derechosARCO = [
  {
    letra: 'A',
    label: 'Acceso',
    desc: 'Conoce qué datos personales tenemos de ti y cómo los usamos.',
  },
  {
    letra: 'R',
    label: 'Rectificación',
    desc: 'Corrige tus datos si son inexactos o incompletos.',
  },
  {
    letra: 'C',
    label: 'Cancelación',
    desc: 'Solicita que eliminemos tus datos cuando no sean necesarios.',
  },
  {
    letra: 'O',
    label: 'Oposición',
    desc: 'Oponte al tratamiento de tus datos para finalidades específicas.',
  },
];

/* ═══════════════════════════════════════════════════════
   SECCIONES ACORDEÓN — LFPDPPP
═══════════════════════════════════════════════════════ */
const seccionesPrivacidad = [
  {
    icono: <FaUserShield />,
    titulo: 'I. Identidad y domicilio del Responsable',
    contenido: `La Asociación de Fútbol Amateur del Estado de Morelos (AFAEM) es la entidad responsable del tratamiento de sus datos personales, con domicilio en: Morelos, México.

Para cualquier asunto relacionado con sus datos personales, puede contactarnos directamente a través de los canales indicados en la sección de contacto al final de este aviso.

De conformidad con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y su Reglamento, AFAEM se compromete a tratar sus datos con absoluta confidencialidad.`,
  },
  {
    icono: <FaDatabase />,
    titulo: 'II. Datos personales que recabamos',
    contenido: `AFAEM recaba las siguientes categorías de datos personales:

• Datos de identificación: nombre completo, fecha de nacimiento, CURP, fotografía.
• Datos de contacto: correo electrónico, número de teléfono, domicilio.
• Datos deportivos: posición, historial de equipos, estadísticas de juego.
• Datos del equipo: nombre del equipo, categoría, liga en la que participa.
• Datos de acceso: usuario y contraseña (almacenada de forma cifrada).

No recabamos datos personales sensibles según el artículo 3 fracción VI de la LFPDPPP, salvo que usted nos los proporcione voluntariamente para fines específicos debidamente justificados.`,
  },
  {
    icono: <FaFileSignature />,
    titulo: 'III. Finalidades del tratamiento',
    contenido: `Sus datos personales serán utilizados para las siguientes finalidades primarias, necesarias para la prestación de nuestros servicios:

• Gestión y administración de equipos y jugadores registrados en AFAEM.
• Inscripción y seguimiento de participación en ligas y torneos.
• Generación de reportes y estadísticas deportivas.
• Comunicación relacionada con actividades de la asociación.
• Cumplimiento de obligaciones legales y reglamentarias.

Finalidades secundarias (no necesarias para el servicio):
• Envío de comunicados informativos sobre eventos deportivos.
• Mejora de nuestros servicios digitales mediante análisis de uso.

Usted puede oponerse a las finalidades secundarias enviando su solicitud a través de los medios de contacto indicados en este aviso.`,
  },
  {
    icono: <FaExchangeAlt />,
    titulo: 'IV. Transferencias de datos',
    contenido: `AFAEM podrá transferir sus datos personales a terceros en los siguientes supuestos:

• Organismos deportivos estatales o federales cuando sea necesario para la participación en competencias.
• Autoridades competentes en cumplimiento de obligaciones legales.
• Proveedores de servicios tecnológicos que actúen como encargados del tratamiento, bajo contratos de confidencialidad.

Para estas transferencias no se requiere su consentimiento cuando estén comprendidas en los supuestos del artículo 37 de la LFPDPPP.

En ningún caso comercializaremos ni venderemos sus datos personales a terceros para fines ajenos a los descritos en este aviso.`,
  },
  {
    icono: <FaKey />,
    titulo: 'V. Ejercicio de derechos ARCO y revocación del consentimiento',
    contenido: `Para ejercer sus derechos de Acceso, Rectificación, Cancelación u Oposición (ARCO), o para revocar su consentimiento al tratamiento de sus datos, deberá enviar una solicitud que contenga:

1. Nombre completo y correo electrónico registrado.
2. Descripción clara del derecho que desea ejercer.
3. Copia de identificación oficial vigente.
4. En su caso, documentos que acrediten la solicitud.

Atenderemos su solicitud en un plazo máximo de 20 días hábiles a partir de su recepción, informándole sobre la procedencia de la misma dentro de los siguientes 15 días hábiles.

Las solicitudes pueden enviarse al correo: contacto@afaem.mx`,
  },
  {
    icono: <FaHandshake />,
    titulo: 'VI. Cambios al aviso de privacidad',
    contenido: `AFAEM se reserva el derecho de modificar el presente aviso de privacidad en cualquier momento para adecuarlo a cambios legislativos, jurisprudenciales o de políticas internas.

Cualquier modificación será notificada a través de:
• Publicación en nuestra plataforma digital con al menos 15 días de anticipación.
• Notificación directa al correo electrónico registrado cuando el cambio sea sustancial.

Le recomendamos revisar periódicamente este aviso. El uso continuo de nuestros servicios después de la publicación de cambios implica su aceptación.

Última actualización: Mayo 2025.`,
  },
];

/* ═══════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════════════ */
const PoliticaPrivacidad = () => {
  return (
    <div className="legal-page">

      {/* ── HERO ── */}
      <div className="legal-hero legal-hero--privacidad">
        <div className="legal-hero-glow" />

        <div className="legal-hero-content">
          <div className="legal-hero-icon-wrap">
            <FaShieldAlt />
          </div>
          <div>
            <p className="legal-hero-etiqueta">Portal Legal · AFAEM</p>
            <h1 className="legal-hero-titulo">Política de Privacidad</h1>
            <p className="legal-hero-desc">
              En AFAEM tu privacidad es prioridad. Este aviso detalla cómo recopilamos,
              usamos y protegemos tus datos personales conforme a la{' '}
              <strong>Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)</strong>.
            </p>
          </div>
        </div>

        <div className="legal-hero-meta">
          <span className="legal-meta-chip">
            <FaLock style={{ fontSize: '11px' }} /> Datos 100% seguros
          </span>
          <span className="legal-meta-chip">
            <FaFileSignature style={{ fontSize: '11px' }} /> LFPDPPP vigente
          </span>
          <span className="legal-meta-chip">
            <FaShieldAlt style={{ fontSize: '11px' }} /> Actualizado: Mayo 2025
          </span>
        </div>
      </div>

      {/* ── GRID ARCO ── */}
      <div className="legal-arco-grid">
        {derechosARCO.map((d) => (
          <div className="legal-arco-card" key={d.letra}>
            <div className="legal-arco-letra">{d.letra}</div>
            <span className="legal-arco-label">{d.label}</span>
            <p className="legal-arco-desc">{d.desc}</p>
          </div>
        ))}
      </div>

      {/* ── PANEL ACORDEÓN ── */}
      <div className="legal-panel">
        <div className="legal-panel-header">
          <span className="legal-panel-icono" style={{ color: '#10b981' }}>
            <FaFileSignature />
          </span>
          <div>
            <h2 className="legal-panel-titulo">Aviso de Privacidad Integral</h2>
            <p className="legal-panel-descripcion">
              Consulta cada sección del aviso haciendo clic en el encabezado correspondiente.
              Cumplimos con los estándares de la LFPDPPP y su Reglamento.
            </p>
          </div>
        </div>
        <Acordeon items={seccionesPrivacidad} />
      </div>

      {/* ── BLOQUE DE CONTACTO ── */}
    </div>
  );
};

export default PoliticaPrivacidad;
