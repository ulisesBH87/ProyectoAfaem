import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import React, { Suspense, lazy } from 'react';

const Ingresar = lazy(() => import('./pages/Auth/Ingresar'));
const Registrarse = lazy(() =>  import('./pages/Auth/Registrarse'));
const PresidenteEquipo = lazy(() => import('./pages/PresidenteEquipo/PresidenteEquipo'));
const PresidenteEquipoJugadores = lazy(() => import('./pages/PresidenteEquipo/PresidenteEquipoJugadores'));
const PresidenteEquipoSolicitudes = lazy(() => import('./pages/PresidenteEquipo/PresidenteEquipoSolicitudes'));
const PresidenteEquipoReportes = lazy(() => import('./pages/PresidenteEquipo/PresidenteEquipoReportes'));
const PresidenteEquipoConfiguracion = lazy(() => import('./pages/PresidenteEquipo/PresidenteEquipoConfiguracion'));
const PresidenteEquipoEquipos = lazy(() => import('./pages/Equipos/PresidenteEquipoEquipos'));
const PresidenteEquipoMisJugadores = lazy(() => import('./pages/Jugadores/PresidenteEquipoMisJugadores'));
const CrearEquipo = lazy(() => import('./pages/Equipos/CrearEquipo'));
const AdminEquipo = lazy(() => import('./pages/Equipos/AdminEquipo'));
const InscribirEquipoALiga = lazy(() => import('./pages/Equipos/InscribirEquipoALiga'));
const AdminSolicitudes = lazy(() => import('./pages/Admin/AdminSolicitudes'));
const RegistroJugadores = lazy(() => import('./pages/Jugadores/RegistroJugadores'));
const ProximoPresidente = lazy(() => import('./pages/Auth/ProximoPresidente'));
const PreRegistroPresidente = lazy(() => import('./pages/Auth/PreRegistroPresidente'));
const OlvideContrasena = lazy(() => import('./pages/Auth/OlvideContrasena'));
const RestablecerContrasena = lazy(() => import('./pages/Auth/RestablecerContrasena'));

function App() {
  return (
    <Router>
      <Suspense fallback={<div style={{textAlign:'center',marginTop:'40px'}}><span className="spinner" />Cargando...</div>}>
        <Routes>
          <Route path="/" element={<Ingresar />} />
          <Route path="/ingresar" element={<Ingresar />} />
          <Route path="/registrarse-cuenta" element={<Registrarse />} />
          <Route path="/proximo-presidente" element={<ProximoPresidente />} />
          <Route path="/pre-registro-presidente" element={<PreRegistroPresidente />} />
          <Route path="/presidente-equipo" element={<PresidenteEquipo />} />
          <Route path="/presidente-equipo/jugadores" element={<PresidenteEquipoJugadores />} />
          <Route path="/presidente-equipo/solicitudes" element={<PresidenteEquipoSolicitudes />} />
          <Route path="/presidente-equipo/reportes" element={<PresidenteEquipoReportes />} />
          <Route path="/presidente-equipo/configuracion" element={<PresidenteEquipoConfiguracion />} />
          <Route path="/presidente-equipo/equipos" element={<PresidenteEquipoEquipos />} />
          <Route path="/presidente-equipo/mis-jugadores" element={<PresidenteEquipoMisJugadores />} />
          <Route path="/presidente-equipo/crear-equipo" element={<CrearEquipo />} />
          <Route path="/presidente-equipo/admin-equipo/:equipoId" element={<AdminEquipo />} />
          <Route path="/presidente-equipo/registro-jugadores" element={<RegistroJugadores />} />
          <Route path="/inscribir-equipo-liga/:equipoId" element={<InscribirEquipoALiga />} />
          <Route path="/presidente-equipo/admin-solicitudes" element={<AdminSolicitudes />} />
          <Route path="/olvide-contrasena" element={<OlvideContrasena />} />
          <Route path="/restablecer-contrasena" element={<RestablecerContrasena />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;