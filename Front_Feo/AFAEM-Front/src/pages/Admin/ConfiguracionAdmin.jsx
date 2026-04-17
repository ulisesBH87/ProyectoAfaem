import React, { useState, useEffect } from 'react';
import { 
  TablaSimple, 
  BotonPrimario, 
  BotonSecundario, 
  Insignia,
  Cargador 
} from '../../components/partials';
import Swal from 'sweetalert2';

export default function ConfiguracionAdmin() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('permisos');
  
  // Datos simulados
  const [permisos, setPermisos] = useState([]);
  const [menus, setMenus] = useState([]);

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      setTimeout(() => {
        setPermisos([
          { id: 1, clave: 'LEER_EQUIPOS', descripcion: 'Ver lista de equipos', modificado: 'Ayer' },
          { id: 2, clave: 'CREAR_EQUIPOS', descripcion: 'Crear un nuevo equipo', modificado: 'Hace 2 días' },
          { id: 3, clave: 'ADMINISTRAR_PAGOS', descripcion: 'Aprobar o rechazar pagos', modificado: 'Hace 1 hora' },
          { id: 4, clave: 'CONFIGURAR_SISTEMA', descripcion: 'Acceso total a configuración', modificado: 'Hoy' }
        ]);

        setMenus([
          { id: 1, nombre: 'Dashboard Principal', ruta: '/admin/dashboard', icono: 'FaChartLine', roles: ['Administrador', 'Super Admin'] },
          { id: 2, nombre: 'Solicitudes', ruta: '/admin/solicitudes', icono: 'FaClipboardList', roles: ['Administrador', 'Presidente Liga'] },
          { id: 3, nombre: 'Control de Pagos', ruta: '/admin/pagos', icono: 'FaShieldAlt', roles: ['Administrador'] },
          { id: 4, nombre: 'Mi Equipo', ruta: '/presidente-equipo', icono: 'FaFutbol', roles: ['Presidente de Equipo'] }
        ]);
        setLoading(false);
      }, 700);
    };

    cargarDatos();
  }, []);

  const handleCrear = (tipo) => {
    Swal.fire({
      title: `Crear Nuevo ${tipo === 'permisos' ? 'Permiso' : 'Menú'}`,
      text: 'Simulando creación de registros en el frontend',
      icon: 'info',
      confirmButtonColor: '#0b4ea6'
    });
  };

  const columnasPermisos = [
    { cabecera: 'Clave', render: (p) => <span style={{ fontWeight: '800', color: '#1e293b' }}>{p.clave}</span> },
    { cabecera: 'Descripción', clave: 'descripcion' },
    { cabecera: 'Última Mod.', clave: 'modificado' },
    {
      cabecera: 'Acciones',
      render: () => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <BotonSecundario etiqueta="Editar" tamanio="pequeno" alHacerClick={() => {}} />
          <BotonSecundario etiqueta="Eliminar" tamanio="pequeno" alHacerClick={() => {}} estilo={{ color: '#ef4444', borderColor: '#fca5a5' }} />
        </div>
      )
    }
  ];

  const columnasMenus = [
    { cabecera: 'Nombre del Menú', render: (m) => <span style={{ fontWeight: '800' }}>{m.nombre}</span> },
    { cabecera: 'Ruta', render: (m) => <span style={{ color: '#64748b', fontSize: '13px' }}>{m.ruta}</span> },
    { cabecera: 'Ícono Asignado', clave: 'icono' },
    { 
      cabecera: 'Permitido para', 
      render: (m) => (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {m.roles.map(r => (
            <span key={r} style={{ background: '#f1f5f9', color: '#0b4ea6', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
              {r}
            </span>
          ))}
        </div>
      )
    },
    {
      cabecera: 'Acciones',
      render: () => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <BotonSecundario etiqueta="Editar" tamanio="pequeno" alHacerClick={() => {}} />
        </div>
      )
    }
  ];

  return (
    <div className="dashboard-content">
      {/* TABS */}
          <div style={{
            borderBottom: '2px solid #e2e8f0',
            marginBottom: '30px',
            display: 'flex',
            gap: '30px',
            backgroundColor: 'white',
            borderRadius: '16px 16px 0 0',
            padding: '20px 30px 0'
          }}>
            <button
              onClick={() => setActiveTab('permisos')}
              style={{
                padding: '12px 0', border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px',
                fontWeight: activeTab === 'permisos' ? '800' : '600',
                color: activeTab === 'permisos' ? '#0b4ea6' : '#64748b',
                borderBottom: activeTab === 'permisos' ? '3px solid #0b4ea6' : '3px solid transparent',
                marginBottom: '-2px', transition: 'all 0.3s'
              }}
            >
              🔑 Diccionario de Permisos
            </button>
            <button
              onClick={() => setActiveTab('menus')}
              style={{
                padding: '12px 0', border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px',
                fontWeight: activeTab === 'menus' ? '800' : '600',
                color: activeTab === 'menus' ? '#0b4ea6' : '#64748b',
                borderBottom: activeTab === 'menus' ? '3px solid #0b4ea6' : '3px solid transparent',
                marginBottom: '-2px', transition: 'all 0.3s'
              }}
            >
              🧭 Estructura de Menús
            </button>
          </div>

          <div style={{ padding: '0 10px' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
                <Cargador tamanio="grande" mensaje="Cargando configuración..." />
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>
                      {activeTab === 'permisos' ? 'Identificadores de Acceso' : 'Navegación Dinámica'}
                    </h3>
                    <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '14px' }}>
                      {activeTab === 'permisos' 
                        ? 'Lista maestra de acciones protegidas en el sistema.' 
                        : 'Gestiona qué rutas y opciones aparecen en la barra lateral por rol.'}
                    </p>
                  </div>
                  <BotonPrimario 
                    etiqueta={activeTab === 'permisos' ? '+ Nuevo Permiso' : '+ Nuevo Menú'} 
                    alHacerClick={() => handleCrear(activeTab)} 
                  />
                </div>

                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <TablaSimple 
                    columnas={activeTab === 'permisos' ? columnasPermisos : columnasMenus} 
                    datos={activeTab === 'permisos' ? permisos : menus} 
                  />
                </div>
              </>
            )}
          </div>
    </div>
  );
}
