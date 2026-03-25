import React, { useState, useEffect } from 'react';
import DashboardSidebar from '../../components/Admin/AdminSidebar';
import DashboardHeader from '../../components/DashboardHeader';
import { 
  TablaSimple, 
  BotonPrimario, 
  BotonSecundario, 
  Insignia,
  Cargador 
} from '../../components/partials';
import Swal from 'sweetalert2';

export default function UsuariosRolesAdmin() {
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState([]);
  const [rolesDisponibles, setRolesDisponibles] = useState([]);
  
  useEffect(() => {
    // Simulando una llamada a la API para cargar usuarios y roles
    const cargarDatosMock = async () => {
      setLoading(true);
      setTimeout(() => {
        setRolesDisponibles([
          { id: 1, nombre: 'Super Administrador' },
          { id: 2, nombre: 'Administrador' },
          { id: 3, nombre: 'Presidente de Equipo' },
          { id: 4, nombre: 'Presidente de Liga' },
          { id: 5, nombre: 'Usuario Base' }
        ]);

        setUsuarios([
          { id: 1, nombre: 'Juan Pérez', email: 'juan@afaem.mx', rol: 'Presidente de Equipo', fecha: '2026-01-15', estado: 'activo' },
          { id: 2, nombre: 'María García', email: 'maria@afaem.mx', rol: 'Administrador', fecha: '2026-02-10', estado: 'activo' },
          { id: 3, nombre: 'Carlos López', email: 'carlos@afaem.mx', rol: 'Usuario Base', fecha: '2026-03-01', estado: 'inactivo' },
          { id: 4, nombre: 'Ana Torres', email: 'ana@afaem.mx', rol: 'Presidente de Liga', fecha: '2026-03-20', estado: 'activo' }
        ]);
        setLoading(false);
      }, 800);
    };
    
    cargarDatosMock();
  }, []);

  const handleVerDetalles = (usuario) => {
    Swal.fire({
      title: 'Detalles del Usuario',
      html: `
        <div style="text-align: left;">
          <p><strong>Nombre:</strong> ${usuario.nombre}</p>
          <p><strong>Email:</strong> ${usuario.email}</p>
          <p><strong>Rol Actual:</strong> <span style="color:#0b4ea6;font-weight:bold">${usuario.rol}</span></p>
          <p><strong>Estado:</strong> ${usuario.estado}</p>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#0b4ea6'
    });
  };

  const handleCambiarRol = (usuario) => {
    // Crear el HTML para el select de roles
    const optionsHtml = rolesDisponibles.map(r => 
      `<option value="${r.nombre}" ${usuario.rol === r.nombre ? 'selected' : ''}>${r.nombre}</option>`
    ).join('');

    Swal.fire({
      title: 'Modificar Rol',
      html: `
        <p>Selecciona el nuevo rol para <strong>${usuario.nombre}</strong></p>
        <select id="swal-rol-select" class="swal2-input" style="display:flex; margin: 10px auto; width:80%">
          ${optionsHtml}
        </select>
        <p style="font-size: 12px; color: #64748b; margin-top:15px">
          <em>Nota: Esto es una simulación frontend. No se modificarán datos en el backend real.</em>
        </p>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar Cambios',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0b4ea6',
      preConfirm: () => {
        const nuevoRol = document.getElementById('swal-rol-select').value;
        return nuevoRol;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const nuevoRol = result.value;
        
        // Actualizar el estado local para simular que funcionó
        setUsuarios(usuarios.map(u => 
          u.id === usuario.id ? { ...u, rol: nuevoRol } : u
        ));

        Swal.fire(
          '¡Actualizado!',
          `El rol de ${usuario.nombre} ha sido cambiado a ${nuevoRol}.`,
          'success'
        );
      }
    });
  };

  const columnas = [
    { cabecera: 'Nombre', clave: 'nombre' },
    { cabecera: 'Correo', clave: 'email' },
    { 
      cabecera: 'Rol Asignado', 
      render: (u) => (
        <span style={{ fontWeight: '700', color: '#0b4ea6' }}>{u.rol}</span>
      )
    },
    { cabecera: 'Registrado', clave: 'fecha' },
    {
      cabecera: 'Estado',
      render: (u) => (
        <Insignia 
          etiqueta={u.estado === 'activo' ? 'Activo' : 'Inactivo'} 
          tipo={u.estado === 'activo' ? 'exito' : 'gris'}
        />
      )
    },
    {
      cabecera: 'Acciones',
      render: (u) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <BotonSecundario 
            etiqueta="Ver" 
            tamanio="pequeno" 
            alHacerClick={() => handleVerDetalles(u)} 
          />
          <BotonPrimario 
            etiqueta="Cambiar Rol" 
            tamanio="pequeno" 
            alHacerClick={() => handleCambiarRol(u)} 
          />
        </div>
      )
    }
  ];

  return (
    <div className="dashboard-wrapper">
      <DashboardSidebar />
      <div className="dashboard-container">
        <DashboardHeader pageTitle="Usuarios y Roles" />
        
        <div className="dashboard-main">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
              <Cargador tamanio="grande" mensaje="Cargando usuarios..." />
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Gestión de Usuarios</h2>
                  <p style={{ color: '#64748b', fontSize: '14px', margin: '5px 0 0 0' }}>Administra los niveles de acceso de toda la plataforma.</p>
                </div>
                <BotonPrimario etiqueta="+ Invitar Usuario" alHacerClick={() => Swal.fire('Info', 'Funcionalidad en desarrollo', 'info')} />
              </div>

              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <TablaSimple columnas={columnas} datos={usuarios} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
