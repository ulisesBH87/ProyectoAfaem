import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import React, { Suspense, lazy, useEffect, useState } from 'react';
import MainLayout from './layouts/MainLayout';
import Loader from './components/Loader';
import { ROUTES } from './routes/paths';

const Ingresar = lazy(() => import('./pages/Auth/Ingresar'));
const RegistrarseCuenta = lazy(() => import('./components/RegistrarseCuenta'));
const PresidenteEquipoEquipos = lazy(() => import('./pages/Equipos/PresidenteEquipoEquipos'));
const PresidenteEquipoMisJugadores = lazy(() => import('./pages/Jugadores/PresidenteEquipoMisJugadores'));
const PresidenteJugadorDocumentos = lazy(() => import('./pages/Jugadores/PresidenteJugadorDocumentos'));
const AdminEquipo = lazy(() => import('./pages/Equipos/AdminEquipo'));
const InscribirEquipoALiga = lazy(() => import('./pages/Equipos/InscribirEquipoALiga'));
const AdminSolicitudes = lazy(() => import('./pages/Admin/AdminSolicitudes'));
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'));
const AdminPagos = lazy(() => import('./pages/Admin/AdminPagos'));
const AdminEquipos = lazy(() => import('./pages/Admin/AdminEquipos'));
const AdminJugadores = lazy(() => import('./pages/Admin/AdminJugadores'));
const AdminCrearJugador = lazy(() => import('./pages/Admin/AdminCrearJugador'));
const AdminCatalogos = lazy(() => import('./pages/Admin/AdminCatalogos'));
const AdminPresidentes = lazy(() => import('./pages/Admin/AdminPresidentes'));
const RegistrarPresidente = lazy(() => import('./pages/Admin/RegistrarPresidente'));
const AdminAuditorias = lazy(() => import('./pages/Admin/AdminAuditorias'));
const AdminLayoutJugadores = lazy(() => import('./pages/Admin/AdminLayoutJugadores'));
const RegistrarAdmin = lazy(() => import('./pages/Admin/RegistrarAdmin'));
const AdminGuard = lazy(() => import('./routes/AdminGuard'));
const PresidenteGuard = lazy(() => import('./routes/PresidenteGuard'));
const RegistroJugadores = lazy(() => import('./pages/Jugadores/RegistroJugadores'));
const PreRegistroPresidente = lazy(() => import('./pages/Auth/PreRegistroPresidente'));
const OlvideContrasena = lazy(() => import('./pages/Auth/OlvideContrasena'));
const RestablecerContrasena = lazy(() => import('./pages/Auth/RestablecerContrasena'));
const ConfigurarEquipo = lazy(() => import('./pages/Equipos/ConfigurarEquipo'));
const CompletarJugadoresEquipo = lazy(() => import('./pages/Equipos/CompletarJugadoresEquipo'));
const PagoPrevioJugador = lazy(() => import('./pages/Equipos/PagoPrevioJugador'));
const UsuariosRolesAdmin = lazy(() => import('./pages/Admin/UsuariosRolesAdmin'));
const ConfiguracionAdmin = lazy(() => import('./pages/Admin/ConfiguracionAdmin'));
const Suspended = lazy(() => import('./pages/Auth/Suspended'));
const NotFound = lazy(() => import('./pages/NotFound'));
const GeneralGuard = lazy(() => import('./routes/GeneralGuard'));
const Reglamentos = lazy(() => import('./pages/Legales/Reglamentos'));
const PoliticaPrivacidad = lazy(() => import('./pages/Legales/PoliticaPrivacidad'));
const TerminosCondiciones = lazy(() => import('./pages/Legales/TerminosCondiciones'));
import SplashScreen from './components/Common/SplashScreen';

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;

function getJwtPayload(token) {
  if (!token) return null;

  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const normalized = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(normalized));
  } catch {
    return null;
  }
}

// Componentes auxiliares para redirecciones con parámetros dinámicos
function RedirectCompletar() {
  const { equipoId } = useParams();
  return <Navigate to={ROUTES.ADMIN.EQUIPOS_COMPLETAR.replace(':equipoId', equipoId)} replace />;
}

function RedirectAdminEquipo() {
  const { equipoId } = useParams();
  return <Navigate to={ROUTES.PRESIDENTE.ADMIN_EQUIPO.replace(':equipoId', equipoId)} replace />;
}

function RedirectInscribirEquipo() {
  const { equipoId } = useParams();
  return <Navigate to={ROUTES.PRESIDENTE.INSCRIBIR_EQUIPO.replace(':equipoId', equipoId)} replace />;
}

function App() {
  const [cargandoApp, setCargandoApp] = useState(true);
  const [estaSaliendo, setEstaSaliendo] = useState(false);
  const userEmail = localStorage.getItem('email') || 'usuario@afaem.com';

  useEffect(() => {
    const verificarSesion = () => {
      const token = localStorage.getItem('token');
      const timestamp = localStorage.getItem('token_timestamp');

      if (!token) return;

      const ahora = Date.now();
      const payload = getJwtPayload(token);
      const jwtExpMs = payload?.exp ? payload.exp * 1000 : null;

      if (jwtExpMs && ahora >= jwtExpMs) {
        localStorage.clear();
        window.location.href = `${ROUTES.LOGIN}?motivo=sesion_expirada`;
        return;
      }

      if (timestamp) {
        const tiempoTranscurrido = ahora - parseInt(timestamp, 10);

        if (tiempoTranscurrido > FIVE_HOURS_MS) {
          localStorage.clear();
          window.location.href = `${ROUTES.LOGIN}?motivo=sesion_expirada`;
        }
      }
    };

    verificarSesion();

    const intervalSesion = setInterval(verificarSesion, 60000);

    const timerCarga = setTimeout(() => {
      setEstaSaliendo(true);
      setTimeout(() => setCargandoApp(false), 400);
    }, 400);

    return () => {
      clearInterval(intervalSesion);
      clearTimeout(timerCarga);
    };
  }, []);

  return (
    <Router>
      {cargandoApp && <SplashScreen isExiting={estaSaliendo} />}
      <Suspense fallback={<Loader text="AFAEM DIGITAL" />}>
        <Routes>
          <Route path={ROUTES.HOME} element={<Ingresar />} />
          <Route path={ROUTES.LOGIN} element={<Ingresar />} />
          <Route path={ROUTES.REGISTRARSE_CUENTA} element={<RegistrarseCuenta />} />
          <Route path={ROUTES.PRE_REGISTRO_PRESIDENTE} element={<PreRegistroPresidente />} />
          <Route path={ROUTES.OLVIDE_CONTRASENA} element={<OlvideContrasena />} />
          <Route path={ROUTES.RESTABLECER_CONTRASENA} element={<RestablecerContrasena />} />
          <Route path={ROUTES.SUSPENDIDO} element={<Suspended />} />
          <Route path={ROUTES.INVITACION} element={<RegistroJugadores />} />

          {/* REDIRECCIONES DE COMPATIBILIDAD PARA PRESIDENTE */}
          <Route path="/presidente-equipo" element={<Navigate to={ROUTES.PRESIDENTE.DASHBOARD} replace />} />
          <Route path="/presidente-equipo/jugadores" element={<Navigate to={ROUTES.PRESIDENTE.JUGADORES} replace />} />
          <Route path="/presidente-equipo/solicitudes" element={<Navigate to={ROUTES.PRESIDENTE.SOLICITUDES} replace />} />
          <Route path="/presidente-equipo/reportes" element={<Navigate to={ROUTES.PRESIDENTE.REPORTES} replace />} />
          <Route path="/presidente-equipo/configuracion" element={<Navigate to={ROUTES.PRESIDENTE.CONFIGURACION} replace />} />
          <Route path="/presidente-equipo/registro-jugadores" element={<Navigate to={ROUTES.PRESIDENTE.REGISTRO_JUGADORES} replace />} />
          <Route path="/presidente-equipo/equipos" element={<Navigate to={ROUTES.PRESIDENTE.EQUIPOS} replace />} />
          <Route path="/presidente-equipo/mis-jugadores" element={<Navigate to={ROUTES.PRESIDENTE.MIS_JUGADORES} replace />} />
          <Route path="/presidente-equipo/admin-equipo/:equipoId" element={<RedirectAdminEquipo />} />
          <Route path="/inscribir-equipo-liga/:equipoId" element={<RedirectInscribirEquipo />} />
          <Route path="/presidente-equipo/configurar-equipo" element={<Navigate to={ROUTES.PRESIDENTE.CONFIGURAR_EQUIPO} replace />} />
          <Route path="/presidente-equipo/pago-jugador/crear-orden" element={<Navigate to={ROUTES.PRESIDENTE.PAGO_CREAR_ORDEN} replace />} />
          <Route path="/presidente-equipo/pago-jugador/subir-comprobante" element={<Navigate to={ROUTES.PRESIDENTE.PAGO_SUBIR_COMPROBANTE} replace />} />
          <Route path="/presidente-equipo/pago-jugador/en-revision" element={<Navigate to={ROUTES.PRESIDENTE.PAGO_EN_REVISION} replace />} />
          <Route path="/presidente-equipo/pago-jugador/reenviar-comprobante" element={<Navigate to={ROUTES.PRESIDENTE.PAGO_REENVIAR_COMPROBANTE} replace />} />
          <Route path="/presidente-equipo/admin-solicitudes" element={<Navigate to={ROUTES.PRESIDENTE.SOLICITUDES} replace />} />

          {/* REDIRECCIONES DE COMPATIBILIDAD PARA ADMIN */}
          <Route path="/admin/dashboard" element={<Navigate to={ROUTES.ADMIN.DASHBOARD} replace />} />
          <Route path="/admin/solicitudes" element={<Navigate to={ROUTES.ADMIN.SOLICITUDES} replace />} />
          <Route path="/admin/pagos" element={<Navigate to={ROUTES.ADMIN.PAGOS} replace />} />
          <Route path="/admin/equipos" element={<Navigate to={ROUTES.ADMIN.EQUIPOS} replace />} />
          <Route path="/admin/equipos/crear" element={<Navigate to={ROUTES.ADMIN.EQUIPOS_CREAR} replace />} />
          <Route path="/admin/equipos/completar-jugadores/:equipoId" element={<RedirectCompletar />} />
          <Route path="/admin/jugadores" element={<Navigate to={ROUTES.ADMIN.JUGADORES} replace />} />
          <Route path="/admin/jugadores/crear" element={<Navigate to={ROUTES.ADMIN.JUGADORES_CREAR} replace />} />
          <Route path="/admin/catalogos" element={<Navigate to={ROUTES.ADMIN.CATALOGOS} replace />} />
          <Route path="/admin/presidentes" element={<Navigate to={ROUTES.ADMIN.PRESIDENTES} replace />} />
          <Route path="/admin/registrar-presidente" element={<Navigate to={ROUTES.ADMIN.REGISTRAR_PRESIDENTE} replace />} />
          <Route path="/admin/auditorias" element={<Navigate to={ROUTES.ADMIN.AUDITORIAS} replace />} />
          <Route path="/admin/layout-jugadores" element={<Navigate to={ROUTES.ADMIN.LAYOUT_JUGADORES} replace />} />
          <Route path="/admin/usuarios-roles" element={<Navigate to={ROUTES.ADMIN.USUARIOS_ROLES} replace />} />
          <Route path="/admin/configuracion" element={<Navigate to={ROUTES.ADMIN.CONFIGURACION} replace />} />

          {/* REDIRECCIONES DE COMPATIBILIDAD PARA LEGAL */}
          <Route path="/admin/reglamentos" element={<Navigate to={ROUTES.ADMIN.REGLAMENTOS} replace />} />
          <Route path="/presidente-equipo/reglamentos" element={<Navigate to={ROUTES.PRESIDENTE.REGLAMENTOS} replace />} />
          <Route path="/admin/politica-privacidad" element={<Navigate to={ROUTES.ADMIN.POLITICA_PRIVACIDAD} replace />} />
          <Route path="/presidente-equipo/politica-privacidad" element={<Navigate to={ROUTES.PRESIDENTE.POLITICA_PRIVACIDAD} replace />} />
          <Route path="/admin/terminos-condiciones" element={<Navigate to={ROUTES.ADMIN.TERMINOS_CONDICIONES} replace />} />
          <Route path="/presidente-equipo/terminos-condiciones" element={<Navigate to={ROUTES.PRESIDENTE.TERMINOS_CONDICIONES} replace />} />

          {/* DASHBOARD ROUTES WRAPPED IN MAINLAYOUT AND GENERALGUARD */}
          <Route element={<GeneralGuard><MainLayout userEmail={userEmail} /></GeneralGuard>}>
            <Route path={ROUTES.PRESIDENTE.DASHBOARD} element={<Navigate to={ROUTES.PRESIDENTE.EQUIPOS} replace />} />
            <Route path={ROUTES.PRESIDENTE.JUGADORES} element={<Navigate to={ROUTES.PRESIDENTE.MIS_JUGADORES} replace />} />
            <Route path={ROUTES.PRESIDENTE.SOLICITUDES} element={<Navigate to={ROUTES.PRESIDENTE.EQUIPOS} replace />} />
            <Route path={ROUTES.PRESIDENTE.REPORTES} element={<Navigate to={ROUTES.PRESIDENTE.EQUIPOS} replace />} />
            <Route path={ROUTES.PRESIDENTE.CONFIGURACION} element={<Navigate to={ROUTES.PRESIDENTE.EQUIPOS} replace />} />
            <Route path={ROUTES.PRESIDENTE.REGISTRO_JUGADORES} element={<PresidenteGuard><RegistroJugadores /></PresidenteGuard>} />
            <Route path={ROUTES.PRESIDENTE.EQUIPOS} element={<PresidenteGuard><PresidenteEquipoEquipos /></PresidenteGuard>} />
            <Route path={ROUTES.PRESIDENTE.MIS_JUGADORES} element={<PresidenteGuard><PresidenteEquipoMisJugadores /></PresidenteGuard>} />
            <Route path={ROUTES.PRESIDENTE.JUGADOR_DOCUMENTOS} element={<PresidenteGuard><PresidenteJugadorDocumentos /></PresidenteGuard>} />
            <Route path={ROUTES.PRESIDENTE.ADMIN_EQUIPO} element={<PresidenteGuard><AdminEquipo /></PresidenteGuard>} />
            <Route path={ROUTES.PRESIDENTE.INSCRIBIR_EQUIPO} element={<PresidenteGuard><InscribirEquipoALiga /></PresidenteGuard>} />
            <Route path={ROUTES.PRESIDENTE.CONFIGURAR_EQUIPO} element={<PresidenteGuard><ConfigurarEquipo /></PresidenteGuard>} />
            <Route path={ROUTES.PRESIDENTE.PAGO_CREAR_ORDEN} element={<PresidenteGuard><PagoPrevioJugador /></PresidenteGuard>} />
            <Route path={ROUTES.PRESIDENTE.PAGO_SUBIR_COMPROBANTE} element={<PresidenteGuard><PagoPrevioJugador /></PresidenteGuard>} />
            <Route path={ROUTES.PRESIDENTE.PAGO_EN_REVISION} element={<PresidenteGuard><PagoPrevioJugador /></PresidenteGuard>} />
            <Route path={ROUTES.PRESIDENTE.PAGO_REENVIAR_COMPROBANTE} element={<PresidenteGuard><PagoPrevioJugador /></PresidenteGuard>} />

            <Route path={ROUTES.ADMIN.DASHBOARD} element={<AdminGuard><AdminDashboard /></AdminGuard>} />
            <Route path={ROUTES.ADMIN.SOLICITUDES} element={<AdminGuard><AdminSolicitudes /></AdminGuard>} />
            <Route path={ROUTES.ADMIN.PAGOS} element={<AdminGuard><AdminPagos /></AdminGuard>} />
            <Route path={ROUTES.ADMIN.EQUIPOS} element={<AdminGuard><AdminEquipos /></AdminGuard>} />
            <Route path={ROUTES.ADMIN.EQUIPOS_CREAR} element={<AdminGuard><ConfigurarEquipo /></AdminGuard>} />
            <Route path={ROUTES.ADMIN.EQUIPOS_COMPLETAR} element={<AdminGuard><CompletarJugadoresEquipo /></AdminGuard>} />
            <Route path={ROUTES.ADMIN.JUGADORES} element={<AdminGuard><AdminJugadores /></AdminGuard>} />
            <Route path={ROUTES.ADMIN.JUGADORES_CREAR} element={<AdminGuard><AdminCrearJugador /></AdminGuard>} />
            <Route path={ROUTES.ADMIN.CATALOGOS} element={<AdminGuard><AdminCatalogos /></AdminGuard>} />
            <Route path={ROUTES.ADMIN.PRESIDENTES} element={<AdminGuard><AdminPresidentes /></AdminGuard>} />
            <Route path={ROUTES.ADMIN.REGISTRAR_PRESIDENTE} element={<AdminGuard><RegistrarPresidente /></AdminGuard>} />
            <Route path={ROUTES.ADMIN.AUDITORIAS} element={<AdminGuard><AdminAuditorias /></AdminGuard>} />
            <Route path={ROUTES.ADMIN.LAYOUT_JUGADORES} element={<AdminGuard><AdminLayoutJugadores /></AdminGuard>} />
            <Route path={ROUTES.ADMIN.USUARIOS_ROLES} element={<AdminGuard><UsuariosRolesAdmin /></AdminGuard>} />
            <Route path={ROUTES.ADMIN.CONFIGURACION} element={<AdminGuard><ConfiguracionAdmin /></AdminGuard>} />

            {/* SECCIÓN LEGAL */}
            <Route path={ROUTES.LEGAL.REGLAMENTOS} element={<Reglamentos />} />
            <Route path={ROUTES.ADMIN.REGLAMENTOS} element={<Reglamentos />} />
            <Route path={ROUTES.PRESIDENTE.REGLAMENTOS} element={<Reglamentos />} />
            {/* Política de Privacidad */}
            <Route path={ROUTES.LEGAL.POLITICA_PRIVACIDAD} element={<PoliticaPrivacidad />} />
            <Route path={ROUTES.ADMIN.POLITICA_PRIVACIDAD} element={<PoliticaPrivacidad />} />
            <Route path={ROUTES.PRESIDENTE.POLITICA_PRIVACIDAD} element={<PoliticaPrivacidad />} />
            {/* Términos y Condiciones */}
            <Route path={ROUTES.LEGAL.TERMINOS_CONDICIONES} element={<TerminosCondiciones />} />
            <Route path={ROUTES.ADMIN.TERMINOS_CONDICIONES} element={<TerminosCondiciones />} />
            <Route path={ROUTES.PRESIDENTE.TERMINOS_CONDICIONES} element={<TerminosCondiciones />} />
          </Route>

          <Route path={ROUTES.REGISTRAR_ADMIN} element={<RegistrarAdmin />} />

          {/* Catch-all: Página 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
