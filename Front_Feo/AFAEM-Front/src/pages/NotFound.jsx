import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaExclamationTriangle } from 'react-icons/fa';
import AfaemLogo from '../assets/afaem-logo@4x.png';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div
      className="fade-in-up"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-main)',
        padding: '20px',
      }}
    >
      <div
        className="card glass"
        style={{
          padding: '56px 48px',
          borderRadius: '28px',
          textAlign: 'center',
          maxWidth: '520px',
          width: '100%',
        }}
      >
        {/* Logo */}
        <img
          src={AfaemLogo}
          alt="AFAEM"
          style={{
            width: '80px',
            height: 'auto',
            margin: '0 auto 24px',
            display: 'block',
            opacity: 0.85,
          }}
        />

        {/* Ícono 404 */}
        <div
          style={{
            width: '88px',
            height: '88px',
            borderRadius: '28px',
            background: 'rgba(245, 158, 11, 0.1)',
            color: 'var(--warning)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px',
            margin: '0 auto 28px',
            border: '2px solid rgba(245, 158, 11, 0.2)',
          }}
        >
          <FaExclamationTriangle />
        </div>

        {/* Badge */}
        <span
          style={{
            display: 'inline-block',
            padding: '6px 18px',
            background: 'rgba(245, 158, 11, 0.08)',
            color: 'var(--warning)',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '800',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            marginBottom: '20px',
            border: '1px solid rgba(245, 158, 11, 0.2)',
          }}
        >
          Error 404
        </span>

        <h1
          className="heading-outfit"
          style={{
            fontSize: '28px',
            fontWeight: '800',
            color: 'var(--text-main)',
            margin: '0 0 12px',
            letterSpacing: '-0.5px',
          }}
        >
          Página no encontrada
        </h1>

        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '15px',
            lineHeight: '1.7',
            marginBottom: '36px',
            maxWidth: '380px',
            margin: '0 auto 36px',
          }}
        >
          La página que buscas no existe o ha sido movida.
          Verifica la URL o regresa al inicio.
        </p>

        <button
          onClick={() => navigate('/ingresar')}
          className="btn-premium"
          style={{
            padding: '14px 36px',
            fontSize: '15px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            borderRadius: '14px',
          }}
        >
          <FaHome /> Volver al inicio
        </button>
      </div>
    </div>
  );
}
