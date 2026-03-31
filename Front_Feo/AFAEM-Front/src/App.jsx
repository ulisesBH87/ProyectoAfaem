import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import React, { Suspense, lazy } from 'react';

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
const RegistrarAdmin = lazy(() => import('./pages/Admin/RegistrarAdmin'));
const AdminGuard = lazy(() => import('./routes/AdminGuard'));
const RegistroJugadores = lazy(() => import('./pages/Jugadores/RegistroJugadores'));
const ProximoPresidente = lazy(() => import('./pages/Auth/ProximoPresidente'));
const PreRegistroPresidente = lazy(() => import('./pages/Auth/PreRegistroPresidente'));
const OlvideContrasena = lazy(() => import('./pages/Auth/OlvideContrasena'));
const RestablecerContrasena = lazy(() => import('./pages/Auth/RestablecerContrasena'));
const ConfigurarEquipo = lazy(() => import('./pages/Equipos/ConfigurarEquipo'));
const UsuariosRolesAdmin = lazy(() => import('./pages/Admin/UsuariosRolesAdmin'));
const ConfiguracionAdmin = lazy(() => import('./pages/Admin/ConfiguracionAdmin'));
import MainLayout from './layouts/MainLayout';

function App() {
  const userEmail = localStorage.getItem('email') || 'usuario@afaem.com';

  return (
    <Router>
      <Suspense fallback={
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div className="skeleton" style={{ width: '100%', height: '80px', marginBottom: '20px' }} />
          <div className="skeleton" style={{ width: '280px', height: '100vh', position: 'fixed', left: 0, top: 0 }} />
          <div className="skeleton" style={{ width: 'calc(100% - 280px)', height: '100vh', marginLeft: '280px' }} />
        </div>
      }>
        <Routes>
          <Route path="/" element={<Ingresar />} />
          <Route path="/ingresar" element={<Ingresar />} />
          <Route path="/registrarse-cuenta" element={<RegistrarseCuenta />} />
          <Route path="/proximo-presidente" element={<ProximoPresidente />} />
          <Route path="/pre-registro-presidente" element={<PreRegistroPresidente />} />
          <Route path="/olvide-contrasena" element={<OlvideContrasena />} />
          <Route path="/restablecer-contrasena" element={<RestablecerContrasena />} />

          {/* DASHBOARD ROUTES WRAPPED IN MAINLAYOUT */}
          <Route element={<MainLayout userEmail={userEmail} />}>
            <Route path="/presidente-equipo" element={<PresidenteEquipo />} />
            <Route path="/presidente-equipo/jugadores" element={<PresidenteEquipoJugadores />} />
            <Route path="/presidente-equipo/solicitudes" element={<PresidenteEquipoSolicitudes />} />
            <Route path="/presidente-equipo/reportes" element={<PresidenteEquipoReportes />} />
            <Route path="/presidente-equipo/configuracion" element={<PresidenteEquipoConfiguracion />} />
            <Route path="/presidente-equipo/registro-jugadores" element={<RegistroJugadores />} />
            <Route path="/presidente-equipo/equipos" element={<PresidenteEquipoEquipos />} />
            <Route path="/presidente-equipo/mis-jugadores" element={<PresidenteEquipoMisJugadores />} />
            <Route path="/presidente-equipo/admin-equipo/:equipoId" element={<AdminEquipo />} />
            <Route path="/inscribir-equipo-liga/:equipoId" element={<InscribirEquipoALiga />} />
            <Route path="/presidente-equipo/configurar-equipo" element={<ConfigurarEquipo />} />
            <Route path="/presidente-equipo/admin-solicitudes" element={<PresidenteEquipoSolicitudes />} />

            {/* ADMIN DASHBOARD ROUTES */}
            <Route path="/admin/dashboard" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
            <Route path="/admin/solicitudes" element={<AdminGuard><AdminSolicitudes /></AdminGuard>} />
            <Route path="/admin/pagos" element={<AdminGuard><AdminPagos /></AdminGuard>} />
            <Route path="/admin/usuarios-roles" element={<AdminGuard><UsuariosRolesAdmin /></AdminGuard>} />
            <Route path="/admin/configuracion" element={<AdminGuard><ConfiguracionAdmin /></AdminGuard>} />
          </Route>

          <Route path="/registrar-admin" element={<RegistrarAdmin />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;