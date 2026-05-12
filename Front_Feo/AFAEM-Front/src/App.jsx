import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import React, { Suspense, lazy, useEffect, useState } from 'react';
import MainLayout from './layouts/MainLayout';
import Loader from './components/Loader';

const Ingresar = lazy(() => import('./pages/Auth/Ingresar'));
const Registrarse = lazy(() =>  import('./pages/Auth/Registrarse'));
const RegistrarseCuenta = lazy(() => import('./components/RegistrarseCuenta'));
const PresidenteEquipo = lazy(() => import('./pages/PresidenteEquipo/PresidenteEquipo'));
const PresidenteEquipoJugadores = lazy(() => import('./pages/PresidenteEquipo/PresidenteEquipoJugadores'));
const PresidenteEquipoSolicitudes = lazy(() => import('./pages/PresidenteEquipo/PresidenteEquipoSolicitudes'));
const PresidenteEquipoReportes = lazy(() => import('./pages/PresidenteEquipo/PresidenteEquipoReportes'));
const PresidenteEquipoConfiguracion = lazy(() => import('./pages/PresidenteEquipo/PresidenteEquipoConfiguracion'));
const PresidenteEquipoEquipos = lazy(() => import('./pages/Equipos/PresidenteEquipoEquipos'));
const PresidenteEquipoMisJugadores = lazy(() => import('./pages/Jugadores/PresidenteEquipoMisJugadores'));
const AdminEquipo = lazy(() => import('./pages/Equipos/AdminEquipo'));
const InscribirEquipoALiga = lazy(() => import('./pages/Equipos/InscribirEquipoALiga'));
const AdminSolicitudes = lazy(() => import('./pages/Admin/AdminSolicitudes'));
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'));
const AdminPagos = lazy(() => import('./pages/Admin/AdminPagos'));
const AdminEquipos = lazy(() => import('./pages/Admin/AdminEquipos'));
const AdminCrearEquipo = lazy(() => import('./pages/Admin/AdminCrearEquipo'));
const AdminJugadores = lazy(() => import('./pages/Admin/AdminJugadores'));
const AdminCrearJugador = lazy(() => import('./pages/Admin/AdminCrearJugador'));
const AdminCatalogos = lazy(() => import('./pages/Admin/AdminCatalogos'));
const AdminPresidentes = lazy(() => import('./pages/Admin/AdminPresidentes'));
const AdminAuditorias = lazy(() => import('./pages/Admin/AdminAuditorias'));
const AdminLayoutJugadores = lazy(() => import('./pages/Admin/AdminLayoutJugadores'));
const RegistrarAdmin = lazy(() => import('./pages/Admin/RegistrarAdmin'));
const AdminGuard = lazy(() => import('./routes/AdminGuard'));
const PresidenteGuard = lazy(() => import('./routes/PresidenteGuard'));
const RegistroJugadores = lazy(() => import('./pages/Jugadores/RegistroJugadores'));
const ProximoPresidente = lazy(() => import('./pages/Auth/ProximoPresidente'));
const PreRegistroPresidente = lazy(() => import('./pages/Auth/PreRegistroPresidente'));
const OlvideContrasena = lazy(() => import('./pages/Auth/OlvideContrasena'));
const RestablecerContrasena = lazy(() => import('./pages/Auth/RestablecerContrasena'));
const ConfigurarEquipo = lazy(() => import('./pages/Equipos/ConfigurarEquipo'));
const UsuariosRolesAdmin = lazy(() => import('./pages/Admin/UsuariosRolesAdmin'));
const ConfiguracionAdmin = lazy(() => import('./pages/Admin/ConfiguracionAdmin'));
const Suspended = lazy(() => import('./pages/Auth/Suspended'));
const NotFound = lazy(() => import('./pages/NotFound'));
const GeneralGuard = lazy(() => import('./routes/GeneralGuard'));
const Reglamentos = lazy(() => import('./pages/Legales/Reglamentos'));
import SplashScreen from './components/Common/SplashScreen';

function App() {
  const [cargandoApp, setCargandoApp] = useState(true);
  const [estaSaliendo, setEstaSaliendo] = useState(false);
  const userEmail = localStorage.getItem('email') || 'usuario@afaem.com';

  // CONTROL DE SESIÓN (5 HORAS CONTINUO)
  useEffect(() => {
    const verificarSesion = () => {
      const token = localStorage.getItem('token');
      const timestamp = localStorage.getItem('token_timestamp');
      
      if (token && timestamp) {
        const cincoHoras = 5 * 60 * 60 * 1000;
        const ahora = Date.now();
        const tiempoTranscurrido = ahora - parseInt(timestamp);
        
        if (tiempoTranscurrido > cincoHoras) {
          console.warn('⚠️ Sesión expirada después de 5 horas.');
          localStorage.clear();
          window.location.href = '/ingresar?motivo=sesion_expirada';
        }
      }
    };

    // Ejecutar inmediatamente al cargar
    verificarSesion();
    
    // Y verificar cada minuto para que funcione sin necesidad de recargar la página
    const intervalSesion = setInterval(verificarSesion, 60000); 
    
    // Simular carga de la aplicación (Splash Screen) - Reducido para mayor velocidad
    const timerCarga = setTimeout(() => {
      setEstaSaliendo(true);
      setTimeout(() => setCargandoApp(false), 400); // Salida más rápida
    }, 400); // 400ms en lugar de 2000ms

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
          <Route path="/" element={<Ingresar />} />
          <Route path="/ingresar" element={<Ingresar />} />
          <Route path="/registrarse-cuenta" element={<RegistrarseCuenta />} />
          <Route path="/proximo-presidente" element={<ProximoPresidente />} />
          <Route path="/pre-registro-presidente" element={<PreRegistroPresidente />} />
          <Route path="/olvide-contrasena" element={<OlvideContrasena />} />
          <Route path="/restablecer-contrasena" element={<RestablecerContrasena />} />
          <Route path="/suspendido" element={<Suspended />} />

          {/* DASHBOARD ROUTES WRAPPED IN MAINLAYOUT AND GENERALGUARD */}
          <Route element={<GeneralGuard><MainLayout userEmail={userEmail} /></GeneralGuard>}>
            <Route path="/presidente-equipo" element={<PresidenteGuard><PresidenteEquipo /></PresidenteGuard>} />
            <Route path="/presidente-equipo/jugadores" element={<PresidenteGuard><PresidenteEquipoJugadores /></PresidenteGuard>} />
            <Route path="/presidente-equipo/solicitudes" element={<PresidenteGuard><PresidenteEquipoSolicitudes /></PresidenteGuard>} />
            <Route path="/presidente-equipo/reportes" element={<PresidenteGuard><PresidenteEquipoReportes /></PresidenteGuard>} />
            <Route path="/presidente-equipo/configuracion" element={<PresidenteGuard><PresidenteEquipoConfiguracion /></PresidenteGuard>} />
            <Route path="/presidente-equipo/registro-jugadores" element={<PresidenteGuard><RegistroJugadores /></PresidenteGuard>} />
            <Route path="/presidente-equipo/equipos" element={<PresidenteGuard><PresidenteEquipoEquipos /></PresidenteGuard>} />
            <Route path="/presidente-equipo/mis-jugadores" element={<PresidenteGuard><PresidenteEquipoMisJugadores /></PresidenteGuard>} />
            <Route path="/presidente-equipo/admin-equipo/:equipoId" element={<PresidenteGuard><AdminEquipo /></PresidenteGuard>} />
            <Route path="/inscribir-equipo-liga/:equipoId" element={<PresidenteGuard><InscribirEquipoALiga /></PresidenteGuard>} />
            <Route path="/presidente-equipo/configurar-equipo" element={<PresidenteGuard><ConfigurarEquipo /></PresidenteGuard>} />
            <Route path="/presidente-equipo/admin-solicitudes" element={<PresidenteGuard><PresidenteEquipoSolicitudes /></PresidenteGuard>} />

            {/* ADMIN DASHBOARD ROUTES */}
            <Route path="/admin/dashboard" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
            <Route path="/admin/solicitudes" element={<AdminGuard><AdminSolicitudes /></AdminGuard>} />
            <Route path="/admin/pagos" element={<AdminGuard><AdminPagos /></AdminGuard>} />
            <Route path="/admin/equipos" element={<AdminGuard><AdminEquipos /></AdminGuard>} />
            <Route path="/admin/equipos/crear" element={<AdminGuard><ConfigurarEquipo /></AdminGuard>} />
            <Route path="/admin/jugadores" element={<AdminGuard><AdminJugadores /></AdminGuard>} />
            <Route path="/admin/jugadores/crear" element={<AdminGuard><AdminCrearJugador /></AdminGuard>} />
            <Route path="/admin/catalogos" element={<AdminGuard><AdminCatalogos /></AdminGuard>} />
            <Route path="/admin/presidentes" element={<AdminGuard><AdminPresidentes /></AdminGuard>} />
            <Route path="/admin/auditorias" element={<AdminGuard><AdminAuditorias /></AdminGuard>} />
            <Route path="/admin/layout-jugadores" element={<AdminGuard><AdminLayoutJugadores /></AdminGuard>} />
            <Route path="/admin/usuarios-roles" element={<AdminGuard><UsuariosRolesAdmin /></AdminGuard>} />
            <Route path="/admin/configuracion" element={<AdminGuard><ConfiguracionAdmin /></AdminGuard>} />
            
            {/* SECCIÓN LEGAL */}
            <Route path="/reglamentos" element={<Reglamentos />} />
            <Route path="/admin/reglamentos" element={<Reglamentos />} />
            <Route path="/presidente-equipo/reglamentos" element={<Reglamentos />} />
          </Route>

          <Route path="/registrar-admin" element={<RegistrarAdmin />} />

          {/* Catch-all: Página 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;