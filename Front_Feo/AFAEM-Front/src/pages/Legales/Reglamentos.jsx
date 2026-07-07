import COLORS from '../../styles/colors';
import React, { useState } from 'react';
import PreciosSeguros from './PreciosSeguros';
import {
  FaGavel,
  FaFileContract,
  FaShieldAlt,
  FaChevronDown,
  FaChevronUp,
  FaFutbol,
  FaUserCheck,
  FaClipboardList,
  FaBan,
  FaCalendarAlt,
  FaBalanceScale,
  FaLock,
  FaEnvelope,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaExternalLinkAlt,
  FaCheckCircle,
  FaTools,
  FaUserCog,
  FaCreditCard,
  FaCopyright,
  FaExclamationTriangle,
  FaUserShield,
  FaDatabase,
  FaFileSignature,
  FaExchangeAlt,
  FaKey,
  FaHandshake,
} from 'react-icons/fa';
import './Reglamentos.css';

/* ─────────────────────────────────────────
   DATOS – Reglamento de Competencia
───────────────────────────────────────── */
const articulosReglamento = [
  {
    id: 'art1',
    numero: 'Artículo 1',
    titulo: 'Objeto y Ámbito de Aplicación',
    icono: <FaFutbol />,
    contenido: `El presente Reglamento rige la organización y desarrollo de todas las competencias de fútbol aficionado organizadas por la Asociación de Fútbol Aficionado del Estado de Morelos (AFAEM), en su carácter de asociación integrante del Sector Amateur de la Federación Mexicana de Fútbol (FMF).

Toda liga, torneo o competencia que se celebre bajo el auspicio o reconocimiento de AFAEM deberá observar el presente instrumento, así como las disposiciones del Estatuto Social de la FMF, el Reglamento General de Competencia y el Reglamento del Sector Amateur (SAM).`,
  },
  {
    id: 'art2',
    numero: 'Artículo 2',
    titulo: 'Registro e Inscripción de Equipos',
    icono: <FaClipboardList />,
    contenido: `Para participar en cualquier competencia oficial de AFAEM, los equipos deberán:

1. Completar el proceso de inscripción a través de la plataforma digital oficial de AFAEM antes de la fecha límite establecida en la convocatoria correspondiente.
2. Acreditar el pago íntegro de la cuota de inscripción vigente para la temporada.
3. Presentar la documentación oficial de todos los jugadores registrados (credencial INE, acta de nacimiento para menores de edad, carta de no adeudo a AFAEM si aplica).
4. Designar a un Presidente de Equipo debidamente registrado que fungirá como representante legal ante AFAEM.
5. Contar con un mínimo de 11 y un máximo de 25 jugadores activos en su plantilla al momento del cierre de registros.`,
  },
  {
    id: 'art3',
    numero: 'Artículo 3',
    titulo: 'Elegibilidad de Jugadores',
    icono: <FaUserCheck />,
    contenido: `Para ser elegible como jugador activo en competencias de AFAEM se requiere:

1. Estar inscrito en el sistema oficial de la plataforma AFAEM con un registro vigente y aprobado.
2. No tener sanciones disciplinarias activas emitidas por la Comisión Disciplinaria de AFAEM, del Sector Amateur o de la FMF.
3. Presentar documento de identidad oficial vigente: INE/IFE para mayores de edad; Acta de Nacimiento y documento escolar para menores de 18 años.
4. Los jugadores con antecedentes internacionales deberán presentar el Certificado de Transferencia Internacional (CTI) emitido por la FIFA a través de la FMF, y acreditar el Formulario de Liberación correspondiente.
5. Un jugador no podrá estar registrado simultáneamente en dos equipos dentro de una misma competencia. La doble inscripción conlleva la descalificación del jugador y la posible sanción al equipo infractor.`,
  },
  {
    id: 'art4',
    numero: 'Artículo 4',
    titulo: 'Desarrollo de Partidos',
    icono: <FaCalendarAlt />,
    contenido: `Los partidos oficiales de AFAEM se regirán por las siguientes disposiciones:

1. Las Reglas de Juego son las promulgadas por el International Football Association Board (IFAB) y adoptadas por la FIFA, conforme a lo establecido por la FMF para el Sector Amateur.
2. La duración reglamentaria es de dos tiempos de 45 minutos con 15 minutos de descanso, salvo que la convocatoria específica del torneo establezca condiciones distintas para categorías infantiles o formativas.
3. El árbitro central y sus asistentes serán designados exclusivamente por el Comité de Árbitros de AFAEM. Ningún equipo podrá objetar dicha designación.
4. Los equipos deberán presentarse en el campo con un mínimo de 7 jugadores. La falta de quórum en los primeros 15 minutos de tolerancia se considerará como W.O. (abandono), otorgando la victoria al equipo presente con marcador de 3-0.
5. El uso de uniforme completo y debidamente numerado es obligatorio. En caso de coincidencia de colores, el equipo local deberá realizar el cambio de indumentaria.`,
  },
  {
    id: 'art5',
    numero: 'Artículo 5',
    titulo: 'Sanciones Disciplinarias',
    icono: <FaBan />,
    contenido: `La Comisión Disciplinaria de AFAEM tiene facultades para imponer las siguientes sanciones, en concordancia con el Reglamento de Sanciones del Sector Amateur:

Tarjeta Amarilla: Amonestación por conducta antideportiva, protestas o infracciones reglamentarias. La acumulación de tres tarjetas amarillas en una misma fase conlleva automáticamente la suspensión de un partido.

Tarjeta Roja (expulsión directa): Suspensión mínima de un partido. Los motivos incluyen: agresión física, insultos al árbitro, conducta violenta o cualquier acto que atente contra el espíritu deportivo. Las sanciones mayores (2 a 6 partidos) o la inhabilitación temporal/definitiva serán determinadas por la Comisión Disciplinaria según la gravedad de la falta.

Sanciones a equipos: Multas económicas, deducción de puntos o descalificación de la competencia en casos de alineación indebida, agresión a árbitros u actos de violencia colectiva.

Procedimiento: Las sanciones se notificarán oficialmente a través de la plataforma digital de AFAEM. Los afectados dispondrán de un plazo de 72 horas para interponer recurso de apelación ante el Comité de Apelaciones, acompañando la fianza correspondiente.`,
  },
  {
    id: 'art6',
    numero: 'Artículo 6',
    titulo: 'Autoridades y Resolución de Controversias',
    icono: <FaBalanceScale />,
    contenido: `La estructura de autoridad en materia deportiva y disciplinaria de AFAEM es la siguiente:

1. Comité Directivo de AFAEM: Máxima autoridad administrativa. Responsable de la organización general de competencias, designación de árbitros y aprobación de reglamentos.
2. Comisión Disciplinaria: Órgano responsable de instruir y resolver los procesos disciplinarios por infracciones al presente reglamento. Sus resoluciones son definitivas en primera instancia.
3. Comité de Apelaciones: Resuelve los recursos interpuestos contra las decisiones de la Comisión Disciplinaria. Su resolución es definitiva y vinculante dentro del ámbito de AFAEM.
4. Sector Amateur – FMF: Instancia superior a la que se puede acudir una vez agotadas las instancias internas de AFAEM. Sus decisiones prevalecen sobre las de AFAEM en todo momento.

Las controversias de naturaleza civil o mercantil entre AFAEM y sus afiliados se someterán a los tribunales competentes del Estado de Morelos, con renuncia expresa a cualquier otro fuero.`,
  },
];

/* ─────────────────────────────────────────
   DATOS – Términos y Condiciones
───────────────────────────────────────── */
const terminosSecciones = [
  {
    id: 'tc1',
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
    id: 'tc2',
    icono: <FaTools />,
    titulo: '2. Descripción del Servicio',
    contenido: `La plataforma AFAEM es un sistema de gestión deportiva que permite:

• Registro y administración de equipos de fútbol amateur.
• Inscripción de jugadores y gestión de plantillas.
• Participación en ligas y torneos oficiales de AFAEM.
• Generación de reportes estadísticos y desempeño.
• Gestión de solicitudes de inscripción y traspasos.
• Comunicación entre presidentes de equipo y la administración.

El servicio se presta de manera digital y puede estar sujeto a interrupciones por mantenimiento, actualizaciones o causas de fuerza mayor. AFAEM hará su mejor esfuerzo por minimizar el tiempo de inactividad.`,
  },
  {
    id: 'tc3',
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
    id: 'tc4',
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
    id: 'tc5',
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
    id: 'tc6',
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
    id: 'tc7',
    icono: <FaBan />,
    titulo: '7. Causas de Suspensión y Terminación',
    contenido: `AFAEM podrá suspender o cancelar el acceso de un usuario cuando:

• Se detecte uso fraudulento o malintencionado de la plataforma.
• El usuario incumpla de manera grave los presentes términos o el reglamento interno.
• Se reciban denuncias fundamentadas de conducta inapropiada.
• El usuario proporcione información falsa o engañosa.
• Por resolución de autoridad competente.

En caso de suspensión, el usuario será notificado por correo electrónico con las razones de la decisión. AFAEM se reserva el derecho de determinar si la suspensión es temporal o definitiva según la gravedad del caso.

Ante cualquier desacuerdo, el usuario podrá presentar su caso a través de los canales de contacto indicados.`,
  },
];

/* ─────────────────────────────────────────
   DATOS – Aviso de Privacidad
───────────────────────────────────────── */
const privacidadSecciones = [
  {
    id: 'pv1',
    icono: <FaUserShield />,
    titulo: 'I. Identidad y Domicilio del Responsable',
    contenido: `La Asociación de Fútbol Amateur del Estado de Morelos (AFAEM) es la entidad responsable del tratamiento de sus datos personales, con domicilio en: Morelos, México.

Para cualquier asunto relacionado con sus datos personales, puede contactarnos directamente a través de los canales indicados en la sección de contacto al final de este aviso.

De conformidad con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y su Reglamento, AFAEM se compromete a tratar sus datos con absoluta confidencialidad.`,
  },
  {
    id: 'pv2',
    icono: <FaDatabase />,
    titulo: 'II. Datos Personales que Recabamos',
    contenido: `AFAEM recaba las siguientes categorías de datos personales:

• Datos de identificación: nombre completo, fecha de nacimiento, CURP, fotografía.
• Datos de contacto: correo electrónico, número de teléfono, domicilio.
• Datos deportivos: posición, historial de equipos, estadísticas de juego.
• Datos del equipo: nombre del equipo, categoría, liga en la que participa.
• Datos de acceso: usuario y contraseña (almacenada de forma cifrada).

No recabamos datos personales sensibles según el artículo 3 fracción VI de la LFPDPPP, salvo que usted nos los proporcione voluntariamente para fines específicos debidamente justificados.`,
  },
  {
    id: 'pv3',
    icono: <FaFileSignature />,
    titulo: 'III. Finalidades del Tratamiento',
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
    id: 'pv4',
    icono: <FaExchangeAlt />,
    titulo: 'IV. Derechos ARCO',
    contenido: `De conformidad con la LFPDPPP, usted tiene derecho a:

• Acceso: Conocer qué datos personales tenemos de usted, cómo los usamos y las condiciones del tratamiento.
• Rectificación: Solicitar la corrección de sus datos cuando sean inexactos, incompletos o desactualizados.
• Cancelación: Pedir la eliminación de sus datos de nuestras bases cuando considere que no están siendo tratados conforme a la ley o han dejado de ser necesarios para la finalidad que motivó su obtención.
• Oposición: Oponerse al tratamiento de sus datos para finalidades específicas, en particular para las finalidades secundarias indicadas en la sección III.

Para ejercer cualquiera de estos derechos, deberá enviar una solicitud que contenga:
1. Nombre completo y correo electrónico registrado.
2. Descripción clara del derecho que desea ejercer.
3. Copia de identificación oficial vigente.

AFAEM dará respuesta a su solicitud en un plazo máximo de 20 días hábiles. Las solicitudes pueden enviarse al correo: contacto@afaem.mx`,
  },
  {
    id: 'pv5',
    icono: <FaKey />,
    titulo: 'V. Transferencia de Datos',
    contenido: `AFAEM podrá transferir sus datos personales a las siguientes entidades, sin requerir su consentimiento, conforme al artículo 37 de la LFPDPPP:

• Federación Mexicana de Fútbol (FMF) y Sector Amateur: Para el registro oficial de jugadores y equipos en el ámbito nacional.
• Autoridades deportivas y gubernamentales: En cumplimiento de obligaciones legales o requerimientos de autoridad competente.
• Proveedores de servicios tecnológicos y de pago: Que actúan como encargados del tratamiento y están obligados contractualmente a mantener la confidencialidad y seguridad de los datos.

Fuera de los supuestos anteriores, AFAEM no cederá ni transferirá sus datos a terceros sin su consentimiento previo.`,
  },
  {
    id: 'pv6',
    icono: <FaHandshake />,
    titulo: 'VI. Seguridad y Cambios al Aviso',
    contenido: `AFAEM implementa medidas de seguridad técnicas, administrativas y físicas para proteger sus datos personales contra pérdida, robo, uso no autorizado, alteración o destrucción.

El presente Aviso de Privacidad podrá ser modificado en cualquier momento para adecuarlo a cambios legislativos o políticas internas. Cualquier modificación sustancial le será notificada con al menos 15 días de anticipación a su entrada en vigor mediante la plataforma o por correo electrónico.

La versión vigente estará siempre disponible en la sección "Reglamentos y Legal" de la plataforma.

Fecha de última actualización: Mayo 2025.`,
  },
];

/* ─────────────────────────────────────────
   SUBCOMPONENTE: Acordeón
───────────────────────────────────────── */
const Acordeon = ({ items, colorAcento }) => {
  const [abiertos, setAbiertos] = useState({});

  const toggleItem = (id) => {
    setAbiertos((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="reglamentos-acordeon">
      {items.map((item) => (
        <div
          key={item.id}
          className={`reglamentos-acordeon-item ${abiertos[item.id] ? 'abierto' : ''}`}
        >
          <button
            className="reglamentos-acordeon-header"
            onClick={() => toggleItem(item.id)}
            style={{ '--acento': colorAcento }}
          >
            <span className="reglamentos-acordeon-titulo">
              {item.icono && (
                <span className="reglamentos-acordeon-icono" style={{ color: colorAcento }}>
                  {item.icono}
                </span>
              )}
              <span>
                {item.numero && <span className="reglamentos-numero">{item.numero} —&nbsp;</span>}
                {item.titulo}
              </span>
            </span>
            <span className="reglamentos-acordeon-chevron">
              {abiertos[item.id] ? <FaChevronUp /> : <FaChevronDown />}
            </span>
          </button>
          {abiertos[item.id] && (
            <div className="reglamentos-acordeon-cuerpo fade-in">
              <p className="reglamentos-acordeon-texto">{item.contenido}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────
   COMPONENTE PRINCIPAL
───────────────────────────────────────── */
const Reglamentos = () => {
  const [tabActiva, setTabActiva] = useState('reglamento');

  const tabs = [
    {
      id: 'reglamento',
      label: 'Reglamento de Competencia',
      icono: <FaGavel />,
      color: COLORS.secondary,
      descripcion:
        'Normativas oficiales para el desarrollo de los torneos AFAEM, basadas en el marco del Sector Amateur de la FMF.',
    },
    {
      id: 'terminos',
      label: 'Términos y Condiciones',
      icono: <FaFileContract />,
      color: COLORS.sky,
      descripcion:
        'Acuerdo legal que regula el uso de la plataforma digital y la participación en las competencias de AFAEM.',
    },
    {
      id: 'privacidad',
      label: 'Aviso de Privacidad',
      icono: <FaShieldAlt />,
      color: COLORS.success,
      descripcion:
        'Tratamiento y protección de los datos personales de jugadores, equipos y directivos, conforme a la LFPDPPP.',
    },
    {
      id: 'seguros',
      label: 'Precios de Seguros',
      icono: <FaShieldAlt />,
      color: COLORS.sky,
      descripcion:
        'Costos, pólizas, vigencias y coberturas de seguros oficiales para jugadores y presidentes.',
    },
  ];

  const tabInfo = tabs.find((t) => t.id === tabActiva);

  return (
    <div className="reglamentos-page fade-in">
      {/* CABECERA */}
      <div className="reglamentos-cabecera">
        <div className="reglamentos-cabecera-texto">
          <h1 className="reglamentos-titulo">Reglamentos y Legal</h1>
          <p className="reglamentos-subtitulo">
            Consulta los términos de uso y políticas de privacidad de la
            Asociación de Fútbol Amateur del Estado de Morelos.
          </p>
        </div>
        <div className="reglamentos-badge-fmf">
          <FaFutbol />
          <span>Marco normativo FMF · Sector Amateur</span>
        </div>
      </div>

      {/* PESTAÑAS */}
      <div className="reglamentos-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={tabActiva === tab.id}
            className={`reglamentos-tab ${tabActiva === tab.id ? 'activa' : ''}`}
            style={{ '--tab-color': tab.color }}
            onClick={() => setTabActiva(tab.id)}
            id={`tab-${tab.id}`}
          >
            <span className="reglamentos-tab-icono">{tab.icono}</span>
            <span className="reglamentos-tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* PANEL DE CONTENIDO */}
      <div className="reglamentos-panel card fade-in" key={tabActiva}>
        {/* Encabezado del panel */}
        <div className="reglamentos-panel-header" style={{ '--panel-color': tabInfo.color }}>
          <span className="reglamentos-panel-icono" style={{ color: tabInfo.color }}>
            {tabInfo.icono}
          </span>
          <div>
            <h2 className="reglamentos-panel-titulo">{tabInfo.label}</h2>
            <p className="reglamentos-panel-descripcion">{tabInfo.descripcion}</p>
          </div>
        </div>

        {/* Contenido según tab */}
        {tabActiva === 'reglamento' && (
          <Acordeon items={articulosReglamento} colorAcento={tabInfo.color} />
        )}
        {tabActiva === 'terminos' && (
          <Acordeon items={terminosSecciones} colorAcento={tabInfo.color} />
        )}
        {tabActiva === 'privacidad' && (
          <Acordeon items={privacidadSecciones} colorAcento={tabInfo.color} />
        )}
        {tabActiva === 'seguros' && (
          <PreciosSeguros hideHero={true} />
        )}
      </div>

      {/* BLOQUE CONTACTO */}
    </div>
  );
};

export default Reglamentos;
