import React from 'react';
import { FaCog, FaKey, FaCompass } from 'react-icons/fa';
import COLORS from '../../styles/colors';

/**
 * MÓDULO EN PREPARACIÓN
 * La configuración avanzada del sistema requiere endpoints del backend aún no implementados:
 *   - GET  /configuracion/permisos        → Listar identificadores de acceso
 *   - POST /configuracion/permisos        → Crear un nuevo permiso
 *   - DELETE /configuracion/permisos/{id} → Eliminar un permiso
 *   - GET  /configuracion/menus           → Listar estructura de menús dinámicos
 *   - POST /configuracion/menus           → Crear un elemento de menú
 *   - PATCH /configuracion/menus/{id}     → Actualizar un elemento de menú
 *
 * Una vez implementados, las tabs de "Permisos" y "Menús" deben conectarse con estos.
 */
export default function ConfiguracionAdmin() {
  const funciones = [
    { icon: <FaKey />, seccion: 'Diccionario de Permisos', desc: 'Ver, crear y eliminar los identificadores de acceso (claves de permisos) del sistema.' },
    { icon: <FaCompass />, seccion: 'Estructura de Menús', desc: 'Gestionar qué rutas y opciones aparecen en la barra lateral según el rol del usuario.' },
  ];

  return (
    <div className="fade-in-up" style={{ padding: '4px 0 32px' }}>
      {/* ENCABEZADO */}
      <header style={{ marginBottom: '32px' }}>
        <h2
          className="heading-outfit"
          style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}
        >
          Configuración del Sistema
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px' }}>
          Gestión avanzada de permisos y estructura de navegación.
        </p>
      </header>

      {/* TARJETA PRINCIPAL */}
      <div
        className="card glass"
        style={{
          padding: '56px 40px',
          borderRadius: '24px',
          textAlign: 'center',
          maxWidth: '620px',
          margin: '0 auto',
        }}
      >
        {/* ÍCONO */}
        <div
          style={{
            width: '88px',
            height: '88px',
            borderRadius: '28px',
            background: COLORS.secondaryBgTranslucent,
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px',
            margin: '0 auto 24px',
            border: `2px solid ${COLORS.secondaryBgTranslucent15}`,
          }}
        >
          <FaCog style={{ animation: 'spin 4s linear infinite' }} />
        </div>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>

        {/* BADGE */}
        <span
          style={{
            display: 'inline-block',
            padding: '6px 16px',
            background: COLORS.secondaryBgTranslucent07,
            color: 'var(--primary)',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: '800',
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            marginBottom: '16px',
            border: `1px solid ${COLORS.secondaryBgTranslucent20}`,
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
          Este módulo de configuración estará disponible en cuanto el equipo de backend
          implemente los endpoints de gestión de permisos y menús dinámicos.
        </p>

        {/* SECCIONES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px', textAlign: 'left' }}>
          {funciones.map((f, i) => (
            <div
              key={i}
              style={{
                padding: '20px',
                background: 'var(--bg-main)',
                borderRadius: '16px',
                border: '1px solid var(--border-light)',
                display: 'flex',
                gap: '16px',
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: COLORS.secondaryBgTranslucent,
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '17px',
                  flexShrink: 0,
                }}
              >
                {f.icon}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px' }}>
                  {f.seccion}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  {f.desc}
                </div>
              </div>
            </div>
          ))}
        </div>


      </div>
    </div>
  );
}
