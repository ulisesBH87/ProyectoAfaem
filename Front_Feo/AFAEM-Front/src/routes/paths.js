export const ROUTES = {
  HOME: "/",
  LOGIN: "/ingresar",
  REGISTRARSE_CUENTA: "/registrarse-cuenta",
  PROXIMO_PRESIDENTE: "/proximo-presidente",
  PRE_REGISTRO_PRESIDENTE: "/pre-registro-presidente",
  OLVIDE_CONTRASENA: "/olvide-contrasena",
  RESTABLECER_CONTRASENA: "/restablecer-contrasena",
  SUSPENDIDO: "/suspendido",
  INVITACION: "/i/:tokenIdentificador/:tokenSecreto",
  REGISTRAR_ADMIN: "/registrar-admin",

  ADMIN: {
    DASHBOARD: "/ad/d",
    SOLICITUDES: "/ad/s",
    PAGOS: "/ad/pg",
    EQUIPOS: "/ad/eq",
    EQUIPOS_CREAR: "/ad/eq/c",
    EQUIPOS_COMPLETAR: "/ad/eq/cj/:equipoId",
    JUGADORES: "/ad/j",
    JUGADORES_CREAR: "/ad/j/c",
    CATALOGOS: "/ad/cat",
    PRESIDENTES: "/ad/p",
    REGISTRAR_PRESIDENTE: "/ad/rp",
    AUDITORIAS: "/ad/aud",
    LAYOUT_JUGADORES: "/ad/lay-jug",
    USUARIOS_ROLES: "/ad/usr-rol",
    CONFIGURACION: "/ad/cfg",
    REGLAMENTOS: "/ad/reg",
    POLITICA_PRIVACIDAD: "/ad/pol-priv",
    TERMINOS_CONDICIONES: "/ad/term-cond",
  },

  PRESIDENTE: {
    DASHBOARD: "/pe",
    JUGADORES: "/pe/j",
    SOLICITUDES: "/pe/s",
    REPORTES: "/pe/rep",
    CONFIGURACION: "/pe/cfg",
    REGISTRO_JUGADORES: "/pe/reg-jug",
    EQUIPOS: "/pe/eq",
    MIS_JUGADORES: "/pe/mis-jug",
    ADMIN_EQUIPO: "/pe/ae/:equipoId",
    INSCRIBIR_EQUIPO: "/pe/ie/:equipoId",
    CONFIGURAR_EQUIPO: "/pe/ce",
    PAGO_CREAR_ORDEN: "/pe/p/co",
    PAGO_SUBIR_COMPROBANTE: "/pe/p/sc",
    PAGO_EN_REVISION: "/pe/p/rev",
    PAGO_REENVIAR_COMPROBANTE: "/pe/p/rc",
    REGLAMENTOS: "/pe/reg",
    POLITICA_PRIVACIDAD: "/pe/pol-priv",
    TERMINOS_CONDICIONES: "/pe/term-cond",
  },

  LEGAL: {
    REGLAMENTOS: "/reglamentos",
    POLITICA_PRIVACIDAD: "/politica-privacidad",
    TERMINOS_CONDICIONES: "/terminos-condiciones",
  }
};

const OLD_TO_NEW_ROUTES = {
  "/": ROUTES.HOME,
  "/ingresar": ROUTES.LOGIN,
  "/registrarse-cuenta": ROUTES.REGISTRARSE_CUENTA,
  "/proximo-presidente": ROUTES.PROXIMO_PRESIDENTE,
  "/pre-registro-presidente": ROUTES.PRE_REGISTRO_PRESIDENTE,
  "/olvide-contrasena": ROUTES.OLVIDE_CONTRASENA,
  "/restablecer-contrasena": ROUTES.RESTABLECER_CONTRASENA,
  "/suspendido": ROUTES.SUSPENDIDO,
  "/registrar-admin": ROUTES.REGISTRAR_ADMIN,

  // Admin
  "/admin/dashboard": ROUTES.ADMIN.DASHBOARD,
  "/admin/solicitudes": ROUTES.ADMIN.SOLICITUDES,
  "/admin/pagos": ROUTES.ADMIN.PAGOS,
  "/admin/equipos": ROUTES.ADMIN.EQUIPOS,
  "/admin/equipos/crear": ROUTES.ADMIN.EQUIPOS_CREAR,
  "/admin/jugadores": ROUTES.ADMIN.JUGADORES,
  "/admin/jugadores/crear": ROUTES.ADMIN.JUGADORES_CREAR,
  "/admin/catalogos": ROUTES.ADMIN.CATALOGOS,
  "/admin/presidentes": ROUTES.ADMIN.PRESIDENTES,
  "/admin/registrar-presidente": ROUTES.ADMIN.REGISTRAR_PRESIDENTE,
  "/admin/auditorias": ROUTES.ADMIN.AUDITORIAS,
  "/admin/layout-jugadores": ROUTES.ADMIN.LAYOUT_JUGADORES,
  "/admin/usuarios-roles": ROUTES.ADMIN.USUARIOS_ROLES,
  "/admin/configuracion": ROUTES.ADMIN.CONFIGURACION,
  "/admin/reglamentos": ROUTES.ADMIN.REGLAMENTOS,
  "/admin/politica-privacidad": ROUTES.ADMIN.POLITICA_PRIVACIDAD,
  "/admin/terminos-condiciones": ROUTES.ADMIN.TERMINOS_CONDICIONES,

  // Presidente
  "/presidente-equipo": ROUTES.PRESIDENTE.DASHBOARD,
  "/presidente-equipo/jugadores": ROUTES.PRESIDENTE.JUGADORES,
  "/presidente-equipo/solicitudes": ROUTES.PRESIDENTE.SOLICITUDES,
  "/presidente-equipo/reportes": ROUTES.PRESIDENTE.REPORTES,
  "/presidente-equipo/configuracion": ROUTES.PRESIDENTE.CONFIGURACION,
  "/presidente-equipo/registro-jugadores": ROUTES.PRESIDENTE.REGISTRO_JUGADORES,
  "/presidente-equipo/equipos": ROUTES.PRESIDENTE.EQUIPOS,
  "/presidente-equipo/mis-jugadores": ROUTES.PRESIDENTE.MIS_JUGADORES,
  "/presidente-equipo/configurar-equipo": ROUTES.PRESIDENTE.CONFIGURAR_EQUIPO,
  "/presidente-equipo/pago-jugador/crear-orden": ROUTES.PRESIDENTE.PAGO_CREAR_ORDEN,
  "/presidente-equipo/pago-jugador/subir-comprobante": ROUTES.PRESIDENTE.PAGO_SUBIR_COMPROBANTE,
  "/presidente-equipo/pago-jugador/en-revision": ROUTES.PRESIDENTE.PAGO_EN_REVISION,
  "/presidente-equipo/pago-jugador/reenviar-comprobante": ROUTES.PRESIDENTE.PAGO_REENVIAR_COMPROBANTE,
  "/presidente-equipo/admin-solicitudes": ROUTES.PRESIDENTE.SOLICITUDES,
  "/presidente-equipo/reglamentos": ROUTES.PRESIDENTE.REGLAMENTOS,
  "/presidente-equipo/politica-privacidad": ROUTES.PRESIDENTE.POLITICA_PRIVACIDAD,
  "/presidente-equipo/terminos-condiciones": ROUTES.PRESIDENTE.TERMINOS_CONDICIONES,

  // Legal
  "/reglamentos": ROUTES.LEGAL.REGLAMENTOS,
  "/politica-privacidad": ROUTES.LEGAL.POLITICA_PRIVACIDAD,
  "/terminos-condiciones": ROUTES.LEGAL.TERMINOS_CONDICIONES,
};

export function mapOldToNewPath(oldPath) {
  if (!oldPath) return oldPath;

  // Manejo de query parameters
  const [pathPart, queryPart] = oldPath.split('?');
  let cleanPath = pathPart;

  // Manejo de dinámicos
  if (cleanPath.startsWith('/presidente-equipo/admin-equipo/')) {
    const id = cleanPath.substring('/presidente-equipo/admin-equipo/'.length);
    cleanPath = ROUTES.PRESIDENTE.ADMIN_EQUIPO.replace(':equipoId', id);
  } else if (cleanPath.startsWith('/inscribir-equipo-liga/')) {
    const id = cleanPath.substring('/inscribir-equipo-liga/'.length);
    cleanPath = ROUTES.PRESIDENTE.INSCRIBIR_EQUIPO.replace(':equipoId', id);
  } else if (cleanPath.startsWith('/admin/equipos/completar-jugadores/')) {
    const id = cleanPath.substring('/admin/equipos/completar-jugadores/'.length);
    cleanPath = ROUTES.ADMIN.EQUIPOS_COMPLETAR.replace(':equipoId', id);
  } else {
    // Exact matching
    cleanPath = OLD_TO_NEW_ROUTES[cleanPath] || cleanPath;
  }

  return queryPart ? `${cleanPath}?${queryPart}` : cleanPath;
}
