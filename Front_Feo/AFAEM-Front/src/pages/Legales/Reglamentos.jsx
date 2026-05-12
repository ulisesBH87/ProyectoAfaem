import React from 'react';
import { FaFileContract, FaGavel, FaInfoCircle, FaChevronRight } from 'react-icons/fa';

const Reglamentos = () => {
  const secciones = [
    {
      titulo: 'Reglamento de Competencia',
      descripcion: 'Normativas oficiales para el desarrollo de los torneos AFAEM.',
      icono: <FaGavel />,
      color: '#0b4ea6'
    },
    {
      titulo: 'Términos y Condiciones',
      descripcion: 'Acuerdo legal para el uso de la plataforma y participación en la liga.',
      icono: <FaFileContract />,
      color: '#0ea5e9'
    },
    {
      titulo: 'Aviso de Privacidad',
      descripcion: 'Tratamiento y protección de datos personales de jugadores y directivos.',
      icono: <FaInfoCircle />,
      color: '#10b981'
    }
  ];

  return (
    <div className="fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#1e293b', marginBottom: '10px' }}>Reglamentos y Legal</h1>
        <p style={{ color: '#64748b', fontSize: '16px', fontWeight: '500' }}>
          Consulta los documentos oficiales, términos de uso y políticas de privacidad de la Asociación de Fútbol Aficionado del Estado de México.
        </p>
      </div>

      <div style={{ display: 'grid', gap: '20px' }}>
        {secciones.map((sec, index) => (
          <div 
            key={index}
            className="premium-card"
            style={{
              background: 'white',
              borderRadius: '24px',
              padding: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              border: '1px solid #f1f5f9',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '18px',
                background: `${sec.color}15`,
                color: sec.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px'
              }}>
                {sec.icono}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>{sec.titulo}</h3>
                <p style={{ margin: '5px 0 0 0', color: '#64748b', fontSize: '14px', fontWeight: '500' }}>{sec.descripcion}</p>
              </div>
            </div>
            <div style={{ color: '#cbd5e1', fontSize: '20px' }}>
              <FaChevronRight />
            </div>
          </div>
        ))}
      </div>

      <div style={{ 
        marginTop: '50px', 
        padding: '40px', 
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
        borderRadius: '30px',
        color: 'white',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '15px' }}>¿Necesitas ayuda legal?</h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)', maxWidth: '600px', margin: '0 auto 25px' }}>
            Si tienes dudas sobre el proceso de afiliación o el reglamento vigente, puedes contactar con nuestro departamento jurídico.
          </p>
          <button style={{
            background: 'white',
            color: '#1e293b',
            border: 'none',
            padding: '12px 30px',
            borderRadius: '12px',
            fontWeight: '800',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}>
            Contactar Soporte
          </button>
        </div>
        {/* Decoración fondo */}
        <div style={{
          position: 'absolute',
          top: '-20%',
          right: '-10%',
          width: '300px',
          height: '300px',
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '50%',
          zIndex: 0
        }} />
      </div>
    </div>
  );
};

export default Reglamentos;
