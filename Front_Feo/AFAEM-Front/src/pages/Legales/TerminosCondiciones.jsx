import COLORS from '../../styles/colors';
import React, { useState } from 'react';
import {
  FaFileContract,
  FaChevronDown,
  FaChevronUp,
  FaCheckCircle,
  FaTools,
  FaUserCog,
  FaCreditCard,
  FaCopyright,
  FaExclamationTriangle,
  FaBan,
  FaEnvelope,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaShieldAlt,
  FaGavel,
  FaHandshake,
} from 'react-icons/fa';
import './Legales.css';

/* ═══════════════════════════════════════════════════════
   COMPONENTE ACORDEÓN — VARIANTE AZUL (TC)
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
            className={`legal-acordeon-item tc${isOpen ? ' abierto' : ''}`}
          >
            <button
              className="legal-acordeon-header"
              onClick={() => toggle(idx)}
              aria-expanded={isOpen}
            >
              <span className="legal-acordeon-titulo">
                <span className="legal-acordeon-icono legal-acordeon-icono--tc">
                  {item.icono}
                </span>
                {item.titulo}
              </span>
              <span className="legal-acordeon-chevron">
                {isOpen ? <FaChevronUp /> : <FaChevronDown />}
              </span>
            </button>
            {isOpen && (
              <div className="legal-acordeon-cuerpo">
                <p className="legal-acordeon-texto legal-acordeon-texto--tc">
                  {item.contenido}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   DATOS — GRID RESUMEN
═══════════════════════════════════════════════════════ */
const resumenItems = [
  {
    icono: <FaCheckCircle />,
    titulo: 'Uso Lícito',
    desc: 'Solo para actividades deportivas legítimas dentro de AFAEM.',
  },
  {
    icono: <FaShieldAlt />,
    titulo: 'Seguridad',
    desc: 'Datos cifrados y acceso restringido por rol de usuario.',
  },
  {
    icono: <FaCreditCard />,
    titulo: 'Pagos',
    desc: 'Inscripciones y cuotas gestionadas con total transparencia.',
  },
  {
    icono: <FaCopyright />,
    titulo: 'Propiedad',
    desc: 'Todo el contenido y marcas son propiedad exclusiva de AFAEM.',
  },
];

/* ═══════════════════════════════════════════════════════
   SECCIONES — ACORDEÓN TC
═══════════════════════════════════════════════════════ */
const seccionesTC = [
  {
    icono: <FaCheckCircle />,
    titulo: '1. Aceptación de los Términos',
    contenido: `Al registrarte y utilizar la plataforma digital de AFAEM (Asociación de Fútbol Amateur del Estado de Morelos), aceptas de manera expresa e irrevocable los presentes Términos y Condiciones de Uso.

Si no estás de acuerdo con alguna de las condiciones aquí establecidas, deberás abstenerte de usar la plataforma.

Estos términos aplican a:
• Presidentes de equipo registrados.
• Jugadores inscritos a través de sus equipos.
• Administradores de la plataforma.
• Cualquier visitante que acceda al portal.

AFAEM se reserva el derecho de actualizar estos términos en cualquier momento, notificando los cambios con al menos 15 días de anticipación.`,
  },
  {
    icono: <FaTools />,
    titulo: '2. Descripción del Servicio',
    contenido: `La plataforma AFAEM es un sistema de gestión deportiva que permite:

• Registro y administración de equipos de fútbol amateur.
• Inscripción de jugadores y gestión de plantillas.
• Participación en ligas y torneos organizados por la asociación.
• Generación de reportes estadísticos y seguimiento de desempeño.
• Gestión de solicitudes de inscripción y traspasos.
• Comunicación entre presidentes de equipo y la administración.

El servicio se presta de manera digital y puede estar sujeto a interrupciones por mantenimiento, actualizaciones o causas de fuerza mayor. AFAEM hará su mejor esfuerzo por minimizar el tiempo de inactividad.`,
  },
  {
    icono: <FaUserCog />,
    titulo: '3. Obligaciones del Usuario',
    contenido: `Al utilizar la plataforma, el usuario se compromete a:

• Proporcionar información veraz, completa y actualizada al momento del registro.
• Mantener la confidencialidad de sus credenciales de acceso.
• No ceder, vender o transferir su cuenta a terceros.
• Usar la plataforma exclusivamente para los fines deportivos para los que fue diseñada.
• Notificar de inmediato cualquier uso no autorizado de su cuenta.
• Respetar los reglamentos internos de AFAEM y las disposiciones de las ligas.
• Abstenerse de subir contenido ilegal, ofensivo o que viole derechos de terceros.

El incumplimiento de estas obligaciones podrá resultar en la suspensión o cancelación definitiva de la cuenta sin derecho a reembolso.`,
  },
  {
    icono: <FaCreditCard />,
    titulo: '4. Pagos e Inscripciones',
    contenido: `Las cuotas de inscripción y participación en ligas organizadas por AFAEM están sujetas a las siguientes condiciones:

• Los montos serán publicados con anticipación en la plataforma y pueden variar por temporada.
• Los pagos realizados son no reembolsables, salvo cancelación comprobable de la liga por causas imputables a AFAEM.
• El registro en una liga implica la aceptación del reglamento específico de dicha competición.
• AFAEM no almacena información de tarjetas de crédito o débito; los pagos se procesan a través de canales seguros certificados.
• Cualquier disputa sobre pagos deberá presentarse dentro de los 10 días hábiles siguientes a la transacción.`,
  },
  {
    icono: <FaCopyright />,
    titulo: '5. Propiedad Intelectual',
    contenido: `Todos los elementos de la plataforma AFAEM, incluyendo pero no limitado a:

• Logotipos, marcas y nombres comerciales.
• Diseño gráfico e interfaces de usuario.
• Código fuente y arquitectura del sistema.
• Bases de datos y contenidos estadísticos.

Son propiedad exclusiva de AFAEM o sus licenciantes y están protegidos por la Ley Federal del Derecho de Autor y demás disposiciones aplicables.

Queda prohibida la reproducción, distribución o uso comercial de cualquier elemento sin autorización expresa y por escrito de AFAEM.`,
  },
  {
    icono: <FaExclamationTriangle />,
    titulo: '6. Limitación de Responsabilidad',
    contenido: `AFAEM no será responsable por:

• Daños derivados del uso incorrecto de la plataforma por parte del usuario.
• Pérdida de datos ocasionada por causas ajenas a AFAEM (fallos de conexión, dispositivos del usuario, etc.).
• Interrupciones del servicio por mantenimiento programado o causas de fuerza mayor.
• Decisiones tomadas por el usuario basadas en la información mostrada en la plataforma.
• Actos de terceros que puedan afectar la integridad de la información.

La plataforma se provee "tal como está", y AFAEM realizará sus mejores esfuerzos para mantenerla operativa y segura.`,
  },
  {
    icono: <FaBan />,
    titulo: '7. Causas de Suspensión y Terminación',
    contenido: `AFAEM podrá suspender o cancelar el acceso de un usuario cuando:

• Se detecte uso fraudulento o malintencionado de la plataforma.
• El usuario incumpla reiteradamente los presentes términos o el reglamento interno.
• Se reciban denuncias fundamentadas de conducta inapropiada.
• El usuario proporcione información falsa o engañosa.
• Por resolución de autoridad competente.

En caso de suspensión, el usuario será notificado por correo electrónico con las razones de la decisión. AFAEM se reserva el derecho de determinar si la suspensión es temporal o definitiva según la gravedad del caso.

Ante cualquier desacuerdo, el usuario podrá presentar su caso a través de los canales de contacto indicados.`,
  },
];

/* ═══════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════════════ */
const TerminosCondiciones = () => {
  return (
    <div className="legal-page">

      {/* ── HERO ── */}
      <div className="legal-hero legal-hero--terminos">
        <div className="legal-hero-glow--tc" />

        <div className="legal-hero-content">
          <div className="legal-hero-icon-wrap--tc">
            <FaFileContract />
          </div>
          <div>
            <p className="legal-hero-etiqueta">Portal Legal · AFAEM</p>
            <h1 className="legal-hero-titulo">Términos y Condiciones</h1>
            <p className="legal-hero-desc">
              Estas condiciones regulan el acceso y uso de la plataforma digital de AFAEM.
              Al utilizar nuestros servicios confirmas que has leído y aceptas los presentes términos
              en su totalidad.
            </p>
          </div>
        </div>

        <div className="legal-hero-meta">
          <span className="legal-meta-chip--tc">
            <FaGavel style={{ fontSize: '11px' }} /> Legalmente vinculante
          </span>
          <span className="legal-meta-chip--tc">
            <FaHandshake style={{ fontSize: '11px' }} /> Uso responsable
          </span>
          <span className="legal-meta-chip--tc">
            <FaFileContract style={{ fontSize: '11px' }} /> Actualizado: Mayo 2025
          </span>
        </div>
      </div>

      {/* ── GRID RESUMEN ── */}
      <div className="legal-resumen-grid">
        {resumenItems.map((item, idx) => (
          <div className="legal-resumen-card" key={idx}>
            <div className="legal-resumen-icono">{item.icono}</div>
            <span className="legal-resumen-titulo">{item.titulo}</span>
            <p className="legal-resumen-desc">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* ── PANEL ACORDEÓN ── */}
      <div className="legal-panel">
        <div className="legal-panel-header">
          <span className="legal-panel-icono" style={{ color: COLORS.sky }}>
            <FaFileContract />
          </span>
          <div>
            <h2 className="legal-panel-titulo">Condiciones de Uso Detalladas</h2>
            <p className="legal-panel-descripcion">
              Despliega cada sección para conocer en detalle las reglas, derechos y
              obligaciones que aplican al uso de la plataforma AFAEM.
            </p>
          </div>
        </div>
        <Acordeon items={seccionesTC} />
      </div>

      {/* ── BLOQUE DE CONTACTO (variante azul) ── */}

    </div>
  );
};

export default TerminosCondiciones;
