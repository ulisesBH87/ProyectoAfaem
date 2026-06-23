import React from 'react';
import { FaUsers, FaUserShield, FaLock, FaArrowRight } from 'react-icons/fa';
import COLORS from '../../styles/colors';

/**
 * MÓDULO EN PREPARACIÓN
 * La gestión de usuarios y roles requiere endpoints del backend aún no implementados:
 *   - GET  /auth/usuarios      → Listar todos los usuarios con rol y estatus
 *   - PATCH /auth/usuarios/{id}/rol    → Cambiar el rol de un usuario
 *   - PATCH /auth/usuarios/{id}/estatus → Activar o desactivar un usuario
 *
 * Una vez que el backend los implemente, conectar:
 *   - cargarUsuarios() con el GET /auth/usuarios
 *   - handleCambiarRol(usuario) con el PATCH /auth/usuarios/{id}/rol
 *   - handleToggleEstatus(usuario) con el PATCH /auth/usuarios/{id}/estatus
 */
export default function UsuariosRolesAdmin() {
  const funciones = [
    { icon: <FaUsers />, label: 'Listar todos los usuarios con su rol y estatus activo' },
    { icon: <FaUserShield />, label: 'Cambiar el rol asignado a un usuario (Admin, Presidente, etc.)' },
    { icon: <FaLock />, label: 'Activar o desactivar el acceso de un usuario al sistema' },
  ];

  return (
    <div className="fade-in-up" style={{ padding: '4px 0 32px' }}>
      {/* ENCABEZADO */}
      <header style={{ marginBottom: '32px' }}>
        <h2
          className="heading-outfit"
          style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}
        >
          Gestión de Usuarios y Roles
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px' }}>
          Administra los niveles de acceso de toda la plataforma.
        </p>
      </header>

      {/* TARJETA PRINCIPAL */}
      <div
        className="card glass"
        style={{
          padding: '56px 40px',
          borderRadius: '24px',
          textAlign: 'center',
          maxWidth: '600px',
          margin: '0 auto',
        }}
      >
        {/* ÍCONO */}
        <div
          style={{
            width: '88px',
            height: '88px',
            borderRadius: '28px',
            background: COLORS.indigoTranslucent10,
            color: COLORS.indigo,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px',
            margin: '0 auto 24px',
            border: `2px solid ${COLORS.indigoTranslucent20}`,
          }}
        >
          <FaUserShield />
        </div>

        {/* BADGE */}
        <span
          style={{
            display: 'inline-block',
            padding: '6px 16px',
            background: COLORS.indigoTranslucent08,
            color: COLORS.indigo,
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: '800',
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            marginBottom: '16px',
            border: `1px solid ${COLORS.indigoTranslucent20}`,
          }}
        >
          🔧 En preparación — Requiere Backend
        </span>

        <h3
          style={{
            fontSize: '20px',
            fontWeight: '800',
            color: 'var(--text-main)',
            margin: '0 0 12px',
          }}
        >
          Módulo en construcción
        </h3>
        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '14px',
            lineHeight: '1.7',
            marginBottom: '32px',
          }}
        >
          Este módulo estará disponible en cuanto el equipo de backend implemente los
          endpoints necesarios. A continuación puedes ver las funciones que estarán
          disponibles aquí.
        </p>

        {/* LISTA DE FUNCIONES */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            textAlign: 'left',
            marginBottom: '32px',
          }}
        >
          {funciones.map((f, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '14px 18px',
                background: 'var(--bg-main)',
                borderRadius: '14px',
                border: '1px solid var(--border-light)',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: COLORS.indigoTranslucent10,
                  color: COLORS.indigo,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '15px',
                  flexShrink: 0,
                }}
              >
                {f.icon}
              </div>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--text-main)',
                  lineHeight: '1.4',
                }}
              >
                {f.label}
              </span>
            </div>
          ))}
        </div>


      </div>
    </div>
  );
}
