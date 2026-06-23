import COLORS from '../../styles/colors';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import StadiumBg from '../../assets/stadium.jpg';
import AfaemLogo from '../../assets/afaem-logo@4x.png';
import { FaExclamationTriangle, FaHeadset, FaSignOutAlt } from 'react-icons/fa';
import { ROUTES } from '../../routes/paths';

const Suspended = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate(ROUTES.LOGIN);
  };

  return (
    <div className="suspended-container">
      <style>{`
        .suspended-container {
          min-height: 100vh;
          background-image: url('${StadiumBg}');
          background-position: center;
          background-size: cover;
          background-attachment: fixed;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          position: relative;
          font-family: 'Inter', -apple-system, sans-serif;
        }

        .suspended-container::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, ${COLORS.overlayBlack} 0%, ${COLORS.overlaySlateDeep} 100%);
          backdrop-filter: blur(8px);
          z-index: 1;
        }

        .suspended-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 500px;
          background: ${COLORS.overlayWhite10};
          backdrop-filter: blur(20px);
          border: 1px solid ${COLORS.overlayWhite25};
          border-radius: 24px;
          padding: 48px 32px;
          text-align: center;
          box-shadow: 0 25px 50px -12px ${COLORS.overlayBlack};
          animation: fadeInUp 0.6s ease-out;
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .logo-container {
          margin-bottom: 32px;
        }

        .logo-container img {
          width: 120px;
          filter: drop-shadow(0 4px 12px ${COLORS.shadow28});
        }

        .icon-warning {
          font-size: 64px;
          color: ${COLORS.warning};
          margin-bottom: 24px;
          filter: drop-shadow(0 0 20px ${COLORS.warningBgTranslucent40});
        }

        .suspended-title {
          color: white;
          font-size: 28px;
          font-weight: 800;
          margin-bottom: 16px;
          letter-spacing: -0.5px;
        }

        .suspended-text {
          color: ${COLORS.overlayWhite80};
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 40px;
        }

        .actions-group {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .btn-contact {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: ${COLORS.white};
          color: ${COLORS.slate800};
          padding: 14px 28px;
          border-radius: 12px;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.3s ease;
          border: none;
          cursor: pointer;
        }

        .btn-contact:hover {
          transform: translateY(-2px);
          background: ${COLORS.slate100};
          box-shadow: 0 10px 20px ${COLORS.shadow15};
        }

        .btn-logout {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: ${COLORS.overlayWhite10};
          color: white;
          padding: 14px 28px;
          border-radius: 12px;
          font-weight: 600;
          transition: all 0.3s ease;
          border: 1px solid ${COLORS.overlayWhite25};
          cursor: pointer;
        }

        .btn-logout:hover {
          background: ${COLORS.overlayWhite25};
          border-color: ${COLORS.overlayWhite40};
        }

        .footer-note {
          margin-top: 32px;
          color: ${COLORS.overlayWhite40};
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
      `}</style>

      <div className="suspended-card">
        <div className="logo-container">
          <img src={AfaemLogo} alt="AFAEM" />
        </div>

        <FaExclamationTriangle className="icon-warning" />

        <h1 className="suspended-title">Acceso Restringido</h1>

        <p className="suspended-text">
          Has sido suspendido temporalmente. Por favor, ponte en contacto con un administrador de AFAEM para verificar tu estatus y resolver cualquier inconveniente pendiente.
        </p>

        <div className="actions-group">
          <button className="btn-contact" onClick={() => window.location.href = 'mailto:soporte@afaem.com'}>
            <FaHeadset /> Contactar Soporte
          </button>

          <button className="btn-logout" onClick={handleLogout}>
            <FaSignOutAlt /> Cerrar Sesión
          </button>
        </div>

        <div className="footer-note">
          Asociación de Fútbol Amateur del Estado de Morelos
        </div>
      </div>
    </div>
  );
};

export default Suspended;
