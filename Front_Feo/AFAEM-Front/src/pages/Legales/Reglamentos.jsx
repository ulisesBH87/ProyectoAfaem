import React, { useState } from 'react';
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
    contenido: `El presente Reglamento rige la organización y desarrollo de todas las competencias de fútbol aficionado organizadas por la Asociación de Fútbol Aficionado del Estado de México (AFAEM), en su carácter de asociación integrante del Sector Amateur de la Federación Mexicana de Fútbol (FMF).

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

Las controversias de naturaleza civil o mercantil entre AFAEM y sus afiliados se someterán a los tribunales competentes del Estado de México, con renuncia expresa a cualquier otro fuero.`,
  },
];

/* ─────────────────────────────────────────
   DATOS – Términos y Condiciones
───────────────────────────────────────── */
const terminosSecciones = [
  {
    id: 'tc1',
    titulo: '1. Aceptación de los Términos',
    contenido: `Al acceder, registrarse o usar la plataforma digital de AFAEM (en adelante "la Plataforma"), el usuario acepta de forma expresa e irrevocable los presentes Términos y Condiciones, así como el Aviso de Privacidad vigente. Si no está de acuerdo con alguno de los términos, deberá abstenerse de usar la Plataforma.

La Plataforma es operada por la Asociación de Fútbol Aficionado del Estado de México (AFAEM). Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios serán comunicados mediante la propia Plataforma y entrarán en vigor a los 5 días naturales de su publicación.`,
  },
  {
    id: 'tc2',
    titulo: '2. Descripción del Servicio',
    contenido: `La Plataforma AFAEM es un sistema de gestión deportiva que permite a sus usuarios:

• Registrar y gestionar equipos de fútbol aficionado en el Estado de México.
• Inscribir jugadores a ligas y torneos oficiales de AFAEM.
• Consultar estadísticas, calendarios y resultados de competencias.
• Gestionar pagos de cuotas de inscripción y afiliación.
• Enviar y dar seguimiento a solicitudes administrativas ante AFAEM.

El acceso a ciertas funcionalidades requiere el pago previo de las cuotas correspondientes. AFAEM se reserva el derecho de modificar, suspender o descontinuar cualquier funcionalidad del servicio sin previo aviso.`,
  },
  {
    id: 'tc3',
    titulo: '3. Cuentas de Usuario y Responsabilidades',
    contenido: `Al crear una cuenta en la Plataforma, el usuario se compromete a:

• Proporcionar información verídica, actualizada y completa en el proceso de registro y en todo momento posterior.
• Mantener la confidencialidad de sus credenciales de acceso (correo electrónico y contraseña). El usuario es el único responsable de todas las actividades realizadas bajo su cuenta.
• Notificar de inmediato a AFAEM ante cualquier uso no autorizado de su cuenta o cualquier brecha de seguridad.
• No ceder, vender o transferir su cuenta a terceros sin autorización previa y por escrito de AFAEM.

AFAEM no será responsable de los daños o pérdidas derivadas del incumplimiento de estas obligaciones por parte del usuario.`,
  },
  {
    id: 'tc4',
    titulo: '4. Pagos y Reembolsos',
    contenido: `Las cuotas de inscripción, afiliación y demás pagos realizados a través de la Plataforma son definitivos y no reembolsables, salvo en los casos siguientes:

• Cancelación comprobada del torneo o competencia por parte de AFAEM antes del inicio de la fase correspondiente.
• Error técnico documentado en el procesamiento del pago que haya generado un cobro duplicado.

Los pagos se procesarán a través de los métodos de pago habilitados en la Plataforma. AFAEM no almacena datos de tarjetas bancarias en sus servidores; dicho proceso está delegado a los proveedores de pago certificados.

En caso de disputa sobre un cobro, el usuario deberá contactar a AFAEM dentro de los 10 días naturales siguientes a la fecha de la transacción.`,
  },
  {
    id: 'tc5',
    titulo: '5. Propiedad Intelectual',
    contenido: `Todo el contenido disponible en la Plataforma —incluyendo pero no limitado a: logotipos, marcas, diseños, textos, imágenes, estadísticas y código fuente— es propiedad de AFAEM o ha sido licenciado a ella, y está protegido por las leyes de propiedad intelectual aplicables en México.

Queda expresamente prohibido:
• Reproducir, distribuir o modificar el contenido de la Plataforma sin autorización previa y por escrito de AFAEM.
• Usar la marca AFAEM o sus logos para fines comerciales no autorizados.
• Realizar ingeniería inversa o intentar acceder al código fuente de la Plataforma.`,
  },
  {
    id: 'tc6',
    titulo: '6. Limitación de Responsabilidad',
    contenido: `AFAEM no garantiza la disponibilidad ininterrumpida de la Plataforma y no será responsable por:

• Interrupciones del servicio por mantenimiento programado o incidentes técnicos imprevistos.
• Daños directos, indirectos, incidentales o consecuentes derivados del uso o imposibilidad de uso de la Plataforma.
• Inexactitudes en la información proporcionada por los propios usuarios o equipos registrados.
• Decisiones deportivas o disciplinarias tomadas por la Comisión Disciplinaria de AFAEM, las cuales se rigen exclusivamente por el Reglamento de Competencia.

La responsabilidad total de AFAEM ante cualquier reclamación no excederá el importe pagado por el usuario en los últimos 12 meses.`,
  },
  {
    id: 'tc7',
    titulo: '7. Conducta del Usuario y Uso Prohibido',
    contenido: `El usuario se compromete a hacer un uso lícito de la Plataforma. Están expresamente prohibidas las siguientes conductas:

• Cargar, publicar o transmitir contenido difamatorio, obsceno, amenazante, fraudulento o que viole derechos de terceros.
• Usar la Plataforma para actividades ilegales o contrarias a la moral pública.
• Intentar acceder sin autorización a sistemas o datos de otros usuarios o de AFAEM.
• Usar bots, scripts u otros medios automatizados para interactuar con la Plataforma de forma masiva o no autorizada.

El incumplimiento de estas prohibiciones podrá resultar en la suspensión inmediata de la cuenta del usuario y, de ser el caso, en la denuncia ante las autoridades competentes.`,
  },
];

/* ─────────────────────────────────────────
   DATOS – Aviso de Privacidad
───────────────────────────────────────── */
const privacidadSecciones = [
  {
    id: 'pv1',
    titulo: 'I. Identidad y Domicilio del Responsable',
    contenido: `La Asociación de Fútbol Aficionado del Estado de México (AFAEM), con domicilio en el Estado de México, México, es la entidad responsable del tratamiento de sus datos personales de conformidad con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y su Reglamento.

Para cualquier consulta relacionada con el tratamiento de sus datos personales, puede contactar a nuestro Departamento de Protección de Datos a través de los medios indicados al final del presente aviso.`,
  },
  {
    id: 'pv2',
    titulo: 'II. Datos Personales que Recabamos',
    contenido: `AFAEM recaba los siguientes datos personales a través de la Plataforma:

Datos de identificación: Nombre completo, fecha de nacimiento, CURP, número de credencial INE/IFE, fotografía.

Datos de contacto: Correo electrónico, número de teléfono, domicilio.

Datos deportivos: Historial de equipos, posición de juego, número de jersey, antecedentes en ligas nacionales e internacionales.

Datos de menores de edad: Para jugadores menores de 18 años, adicionalmente se recaban datos del tutor o padre/madre: nombre, número de teléfono y relación con el menor. El tratamiento de datos de menores requiere el consentimiento expreso del tutor legal.

Datos financieros: Para el procesamiento de pagos, se recopila información de transacción (monto, fecha, referencia). Los datos de tarjetas bancarias son procesados directamente por el proveedor de pago y NO son almacenados por AFAEM.

Datos sensibles: En caso de requerir información de salud (lesiones, restricciones médicas) para fines de seguridad del jugador, AFAEM solicitará su consentimiento expreso y por escrito.`,
  },
  {
    id: 'pv3',
    titulo: 'III. Finalidades del Tratamiento',
    contenido: `Sus datos personales serán utilizados para las siguientes finalidades primarias (necesarias para la relación jurídica con AFAEM):

• Gestión de registro e inscripción de jugadores y equipos en competencias oficiales de AFAEM.
• Verificación de elegibilidad deportiva conforme al Reglamento de Competencia.
• Procesamiento de pagos de cuotas de afiliación e inscripción.
• Comunicación de información oficial sobre calendarios, resultados y decisiones disciplinarias.
• Cumplimiento de obligaciones legales ante autoridades deportivas (FMF, Sector Amateur) y gubernamentales.

Finalidades secundarias (que requieren su consentimiento):
• Envío de comunicaciones promocionales sobre eventos, torneos y actividades de AFAEM.
• Elaboración de estadísticas e informes de desempeño deportivo.
• Difusión de imágenes y resultados deportivos en medios de comunicación y redes sociales de AFAEM.

Si no desea que sus datos sean utilizados para finalidades secundarias, puede manifestarlo en cualquier momento a través de los medios de contacto indicados en este aviso.`,
  },
  {
    id: 'pv4',
    titulo: 'IV. Derechos ARCO',
    contenido: `De conformidad con la LFPDPPP, usted tiene derecho a:

• Acceso: Conocer qué datos personales tenemos de usted, cómo los usamos y las condiciones del tratamiento.
• Rectificación: Solicitar la corrección de sus datos cuando sean inexactos, incompletos o desactualizados.
• Cancelación: Pedir la eliminación de sus datos de nuestras bases cuando considere que no están siendo tratados conforme a la ley o han dejado de ser necesarios para la finalidad que motivó su obtención.
• Oposición: Oponerse al tratamiento de sus datos para finalidades específicas, en particular para las finalidades secundarias indicadas en la sección III.

Para ejercer cualquiera de estos derechos, deberá enviar una solicitud por correo electrónico a la dirección de contacto indicada al final del presente aviso, adjuntando copia de su identificación oficial vigente y describiendo de forma clara el derecho que desea ejercer. AFAEM dará respuesta a su solicitud en un plazo máximo de 20 días hábiles.`,
  },
  {
    id: 'pv5',
    titulo: 'V. Transferencia de Datos',
    contenido: `AFAEM podrá transferir sus datos personales a las siguientes entidades, sin requerir su consentimiento, conforme al artículo 37 de la LFPDPPP:

• Federación Mexicana de Fútbol (FMF) y Sector Amateur: Para el registro oficial de jugadores y equipos en el ámbito nacional.
• Autoridades deportivas y gubernamentales: En cumplimiento de obligaciones legales o requerimientos de autoridad competente.
• Proveedores de servicios tecnológicos y de pago: Que actúan como encargados del tratamiento y están obligados contractualmente a mantener la confidencialidad y seguridad de los datos.

Fuera de los supuestos anteriores, AFAEM no cederá ni transferirá sus datos a terceros sin su consentimiento previo.`,
  },
  {
    id: 'pv6',
    titulo: 'VI. Seguridad y Cambios al Aviso',
    contenido: `AFAEM implementa medidas de seguridad técnicas, administrativas y físicas para proteger sus datos personales contra pérdida, robo, uso no autorizado, alteración o destrucción.

Actualización del aviso: El presente Aviso de Privacidad podrá ser modificado en cualquier momento. Los cambios sustanciales le serán notificados a través de la Plataforma o al correo electrónico registrado en su cuenta, con al menos 10 días naturales de anticipación a su entrada en vigor.

La versión vigente del Aviso de Privacidad estará siempre disponible en la Plataforma en la sección "Reglamentos y Legal".

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
      color: '#2563eb',
      descripcion:
        'Normativas oficiales para el desarrollo de los torneos AFAEM, basadas en el marco del Sector Amateur de la FMF.',
    },
    {
      id: 'terminos',
      label: 'Términos y Condiciones',
      icono: <FaFileContract />,
      color: '#0ea5e9',
      descripcion:
        'Acuerdo legal que regula el uso de la plataforma digital y la participación en las competencias de AFAEM.',
    },
    {
      id: 'privacidad',
      label: 'Aviso de Privacidad',
      icono: <FaShieldAlt />,
      color: '#10b981',
      descripcion:
        'Tratamiento y protección de los datos personales de jugadores, equipos y directivos, conforme a la LFPDPPP.',
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
            Consulta los documentos oficiales, términos de uso y políticas de privacidad de la
            Asociación de Fútbol Aficionado del Estado de México.
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
      </div>

      {/* BLOQUE CONTACTO */}
      <div className="reglamentos-contacto">
        <div className="reglamentos-contacto-inner">
          <div className="reglamentos-contacto-texto">
            <FaLock style={{ fontSize: '28px', color: '#60a5fa' }} />
            <div>
              <h2 className="reglamentos-contacto-titulo">¿Tienes preguntas legales o sobre privacidad?</h2>
              <p className="reglamentos-contacto-desc">
                Nuestro equipo puede orientarte sobre el reglamento vigente, procesos disciplinarios o el ejercicio de tus Derechos ARCO.
              </p>
            </div>
          </div>
          <div className="reglamentos-contacto-datos">
            <a href="mailto:contacto@afaem.mx" className="reglamentos-contacto-item">
              <FaEnvelope />
              <span>contacto@afaem.mx</span>
            </a>
            <a href="tel:+527221234567" className="reglamentos-contacto-item">
              <FaPhoneAlt />
              <span>(722) 123 4567</span>
            </a>
            <span className="reglamentos-contacto-item">
              <FaMapMarkerAlt />
              <span>Estado de México, México</span>
            </span>
            <a
              href="https://www.fmf.mx/reglamentos"
              target="_blank"
              rel="noopener noreferrer"
              className="reglamentos-contacto-item reglamentos-contacto-link"
            >
              <FaExternalLinkAlt />
              <span>Reglamentos FMF</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reglamentos;
