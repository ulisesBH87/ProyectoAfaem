import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registrarAdmin } from '../../services/auth';
import Swal from 'sweetalert2';
import COLORS from '../../styles/colors';

export default function RegistrarAdmin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const adminData = {
    Nombre: "Emiliano",
    PrimerApellido: "Flores",
    SegundoApellido: "Saaib",
    Correo: "emilianoadmin@gmail.com",
    Contrasena: "Hola1234?",
    RolId: 1
  };

  const handleRegister = async () => {
    const result = await Swal.fire({
      title: '¿Crear cuenta de Administrador?',
      text: `Se registrará a ${adminData.Nombre} ${adminData.PrimerApellido} como ADMIN.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, registrar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: COLORS.primary
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        await registrarAdmin(adminData);
        await Swal.fire({
          title: '¡Éxito!',
          text: 'Cuenta de Administrador creada correctamente.',
          icon: 'success',
          confirmButtonColor: COLORS.primary
        });
        navigate('/ingresar');
      } catch (error) {
        console.error('Error registrando admin:', error);
        Swal.fire({
          title: 'Error',
          text: error.response?.data?.detail || 'No se pudo crear la cuenta de administrador.',
          icon: 'error'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: COLORS.slate50,
      fontFamily: 'inherit'
    }}>
      <div style={{
        maxWidth: '500px',
        width: '90%',
        background: 'white',
        padding: '40px',
        borderRadius: '16px',
        boxShadow: `0 10px 25px -5px ${COLORS.shadow10}, 0 8px 10px -6px ${COLORS.shadow10}`,
        textAlign: 'center'
      }}>
        <div style={{ 
          width: '60px', 
          height: '60px', 
          background: COLORS.secondaryBg, 
          borderRadius: '50%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          margin: '0 auto 20px',
          fontSize: '30px'
        }}>
          🛡️
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: '800', color: COLORS.slate800, marginBottom: '10px' }}>
          Registro de Administrador
        </h2>
        <p style={{ color: COLORS.slate500, fontSize: '15px', marginBottom: '30px', lineHeight: '1.5' }}>
          Estás a punto de crear una cuenta con privilegios totales sobre el sistema AFAEM. 
          Asegúrate de que esta acción está autorizada.
        </p>

        <div style={{ 
          background: COLORS.slate100, 
          padding: '20px', 
          borderRadius: '12px', 
          textAlign: 'left', 
          marginBottom: '30px',
          fontSize: '14px'
        }}>
          <div style={{ marginBottom: '8px' }}><strong>Nombre:</strong> {adminData.Nombre} {adminData.PrimerApellido} {adminData.SegundoApellido}</div>
          <div style={{ marginBottom: '8px' }}><strong>Correo:</strong> {adminData.Correo}</div>
          <div><strong>Rol:</strong> Administrador (ID: 1)</div>
        </div>

        <button
          onClick={handleRegister}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryActive} 100%)`,
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: '700',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            opacity: loading ? 0.7 : 1,
            boxShadow: `0 4px 12px ${COLORS.primaryBgTranslucent20}`
          }}
        >
          {loading ? 'Procesando...' : 'Confirmar y Crear Cuenta'}
        </button>

        <button 
          onClick={() => navigate('/ingresar')}
          style={{
            marginTop: '15px',
            background: 'none',
            border: 'none',
            color: COLORS.slate500,
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          Volver al Login
        </button>
      </div>
    </div>
  );
}
