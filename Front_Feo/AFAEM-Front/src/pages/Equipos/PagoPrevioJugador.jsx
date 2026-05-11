import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaArrowLeft, FaCheckCircle, FaClock, FaFileUpload, FaMoneyBillWave } from 'react-icons/fa';
import '../../styles/dashboard.css';
import Swal from 'sweetalert2';
import { API_BASE } from '../../config/config';
import Loader from '../../components/Loader';

/**
 * PagoPrevioJugador - Componente que maneja el flujo de pago previo para agregar jugadores
 * Renderiza diferentes vistas según el estado de pago
 */
export default function PagoPrevioJugador() {
  const navigate = useNavigate();
  const location = useLocation();
  const [actionType, setActionType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pagoData, setPagoData] = useState(null);
  const [estadoPago, setEstadoPago] = useState(null);
  const [comprobante, setComprobante] = useState(null);
  const [uploadingComprobante, setUploadingComprobante] = useState(false);

  const pathSegments = location.pathname.split('/');
  const accion = pathSegments[pathSegments.length - 1];
  const state = location.state || {};
  const { equipoId, ordenId, total } = state;

  // Cargar estado de pago al montar
  useEffect(() => {
    const cargarEstadoPago = async () => {
      if (!equipoId) {
        Swal.fire('Error', 'No se especificó equipo', 'error');
        navigate('/presidente-equipo/equipos');
        return;
      }

      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/ordenes-pago/jugador/estado/${equipoId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setPagoData(data);
          setEstadoPago(data.accion || accion);
        }
      } catch (err) {
        console.error('Error cargando estado de pago:', err);
      } finally {
        setLoading(false);
      }
    };

    cargarEstadoPago();
  }, [equipoId]);

  const handleSubirComprobante = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      Swal.fire('Error', 'Solo se permiten PDF, JPG o PNG', 'error');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire('Error', 'El archivo no debe exceder 5MB', 'error');
      return;
    }

    setUploadingComprobante(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('archivo', file);
      formData.append('orden_id', ordenId || pagoData?.orden_id);
      formData.append('equipo_id', equipoId);

      const res = await fetch(`${API_BASE}/ordenes-pago/subir-comprobante`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: '¡Comprobante cargado!',
          text: 'El comprobante fue enviado correctamente. Será revisado por administración.',
          timer: 2000
        });
        setTimeout(() => navigate('/presidente-equipo/equipos'), 2000);
      } else {
        const error = await res.json();
        Swal.fire('Error', error.detail || 'Error al subir comprobante', 'error');
      }
    } catch (err) {
      console.error('Error subiendo comprobante:', err);
      Swal.fire('Error', 'Error al subir el comprobante', 'error');
    } finally {
      setUploadingComprobante(false);
    }
  };

  if (loading) {
    return <Loader text="Cargando información de pago..." />;
  }

  // VISTA: CREAR ORDEN
  if (accion === 'crear-orden') {
    return (
      <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <button
          onClick={() => navigate('/presidente-equipo/equipos')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--primary)',
            fontSize: '16px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '24px'
          }}
        >
          <FaArrowLeft /> Volver
        </button>

        <div className="card" style={{ padding: '40px', borderRadius: '24px', border: 'none' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: '#dbeafe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              margin: '0 auto 20px'
            }}>
              <FaMoneyBillWave style={{ color: '#0b4ea6' }} />
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '12px' }}>
              Pago Previo para Nuevo Jugador(es)
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '500' }}>
              Para agregar nuevos jugadores, primero debes crear una orden de pago
            </p>
          </div>

          <div style={{
            background: '#f0f9ff',
            border: '1px solid #bfdbfe',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <p style={{ color: '#1e40af', fontWeight: '600', marginBottom: '12px' }}>
              📋 Próximos pasos:
            </p>
            <ol style={{ marginLeft: '20px', color: '#1e40af', lineHeight: '1.8' }}>
              <li>Selecciona la cantidad de jugadores a agregar</li>
              <li>Elige los tipos de seguros para cada jugador</li>
              <li>Revisa el total a pagar</li>
              <li>Genera la orden de pago</li>
            </ol>
          </div>

          <button
            onClick={() => navigate('/presidente-equipo/configurar-equipo', {
              state: { equipoId, agregarJugador: true, requirePago: true }
            })}
            style={{
              width: '100%',
              padding: '14px 24px',
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '800',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            Comenzar Pago
          </button>
        </div>
      </div>
    );
  }

  // VISTA: SUBIR COMPROBANTE
  if (accion === 'subir-comprobante') {
    return (
      <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <button
          onClick={() => navigate('/presidente-equipo/equipos')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--primary)',
            fontSize: '16px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '24px'
          }}
        >
          <FaArrowLeft /> Volver
        </button>

        <div className="card" style={{ padding: '40px', borderRadius: '24px', border: 'none' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              margin: '0 auto 20px'
            }}>
              <FaFileUpload style={{ color: '#b45309' }} />
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '12px' }}>
              Pago Previo para Nuevo Jugador(es)
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '500' }}>
              Sube el comprobante de pago de tu orden
            </p>
          </div>

          <div style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <p style={{ color: '#92400e', fontWeight: '600', marginBottom: '8px' }}>
              ⚠️ Información importante:
            </p>
            <ul style={{ marginLeft: '20px', color: '#92400e', lineHeight: '1.8', marginBottom: 0 }}>
              <li>Acepta PDF, JPG o PNG (máximo 5MB)</li>
              <li>El comprobante será revisado por administración</li>
              <li>Recibirás confirmación una vez sea aprobado</li>
            </ul>
          </div>

          <label style={{
            display: 'block',
            border: '2px dashed var(--primary)',
            borderRadius: '12px',
            padding: '40px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: '#f0f9ff',
            transition: 'all 0.3s',
            marginBottom: '24px'
          }}>
            <input
              type="file"
              onChange={handleSubirComprobante}
              disabled={uploadingComprobante}
              style={{ display: 'none' }}
              accept=".pdf,.jpg,.jpeg,.png"
            />
            {comprobante ? (
              <div>
                <FaCheckCircle style={{ fontSize: '32px', color: '#10b981', marginBottom: '12px' }} />
                <p style={{ fontWeight: '800', color: 'var(--text-main)' }}>{comprobante}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Click para cambiar archivo</p>
              </div>
            ) : (
              <div>
                <FaFileUpload style={{ fontSize: '32px', color: 'var(--primary)', marginBottom: '12px' }} />
                <p style={{ fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px' }}>
                  Haz clic o arrastra tu comprobante aquí
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                  PDF, JPG o PNG - Máximo 5MB
                </p>
              </div>
            )}
          </label>

          <button
            onClick={() => document.querySelector('input[type="file"]').click()}
            disabled={uploadingComprobante}
            style={{
              width: '100%',
              padding: '14px 24px',
              background: uploadingComprobante ? '#ccc' : 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '800',
              cursor: uploadingComprobante ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => !uploadingComprobante && (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => !uploadingComprobante && (e.currentTarget.style.opacity = '1')}
          >
            {uploadingComprobante ? 'Cargando...' : 'Seleccionar Comprobante'}
          </button>
        </div>
      </div>
    );
  }

  // VISTA: EN REVISIÓN
  if (accion === 'en-revision') {
    return (
      <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <button
          onClick={() => navigate('/presidente-equipo/equipos')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--primary)',
            fontSize: '16px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '24px'
          }}
        >
          <FaArrowLeft /> Volver
        </button>

        <div className="card" style={{ padding: '40px', borderRadius: '24px', border: 'none' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: '#fce7f3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              margin: '0 auto 20px'
            }}>
              <FaClock style={{ color: '#ec4899' }} />
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '12px' }}>
              Pago Previo para Nuevo Jugador(es)
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '500' }}>
              Tu comprobante está siendo revisado
            </p>
          </div>

          <div style={{
            background: '#fdf2f8',
            border: '1px solid #fbcfe8',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <p style={{ color: '#831843', fontWeight: '600', marginBottom: '12px' }}>
              ⏳ Estado: En Revisión
            </p>
            <p style={{ color: '#831843', lineHeight: '1.6', marginBottom: 0 }}>
              Tu comprobante de pago fue recibido correctamente y está siendo revisado por el equipo de administración de AFAEM.
              Este proceso generalmente toma 24-48 horas. Recibirás una notificación cuando sea aprobado.
            </p>
          </div>

          <div style={{
            background: 'var(--bg-main)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '12px' }}>
              ¿Qué ocurre ahora?
            </h3>
            <ol style={{ marginLeft: '20px', color: 'var(--text-muted)', lineHeight: '1.8', marginBottom: 0 }}>
              <li>El equipo administrativo verifica tu comprobante</li>
              <li>Se confirma que el pago fue recibido correctamente</li>
              <li>Tu orden de pago se aprueba automáticamente</li>
              <li>Podrás agregar los nuevos jugadores a tu equipo</li>
            </ol>
          </div>

          <button
            onClick={() => navigate('/presidente-equipo/equipos')}
            style={{
              width: '100%',
              padding: '14px 24px',
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '800',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            Volver a Mis Equipos
          </button>
        </div>
      </div>
    );
  }

  // VISTA: REENVIAR COMPROBANTE
  if (accion === 'reenviar-comprobante') {
    return (
      <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <button
          onClick={() => navigate('/presidente-equipo/equipos')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--primary)',
            fontSize: '16px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '24px'
          }}
        >
          <FaArrowLeft /> Volver
        </button>

        <div className="card" style={{ padding: '40px', borderRadius: '24px', border: 'none' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              margin: '0 auto 20px'
            }}>
              <FaFileUpload style={{ color: '#dc2626' }} />
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '12px' }}>
              Pago Previo para Nuevo Jugador(es)
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '500' }}>
              Tu comprobante anterior fue rechazado. Por favor, sube uno nuevo.
            </p>
          </div>

          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <p style={{ color: '#7f1d1d', fontWeight: '600', marginBottom: '12px' }}>
              ❌ Comprobante Rechazado
            </p>
            <p style={{ color: '#7f1d1d', lineHeight: '1.6', marginBottom: 0 }}>
              El comprobante anterior no cumplió con los requisitos. Por favor, verifica que:
              <ul style={{ marginTop: '12px', marginBottom: 0, marginLeft: '20px' }}>
                <li>El comprobante sea legible y completo</li>
                <li>Incluya el monto correcto de la orden</li>
                <li>Tenga información clara de la transacción</li>
              </ul>
            </p>
          </div>

          <label style={{
            display: 'block',
            border: '2px dashed var(--primary)',
            borderRadius: '12px',
            padding: '40px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: '#f0f9ff',
            transition: 'all 0.3s',
            marginBottom: '24px'
          }}>
            <input
              type="file"
              onChange={handleSubirComprobante}
              disabled={uploadingComprobante}
              style={{ display: 'none' }}
              accept=".pdf,.jpg,.jpeg,.png"
            />
            {comprobante ? (
              <div>
                <FaCheckCircle style={{ fontSize: '32px', color: '#10b981', marginBottom: '12px' }} />
                <p style={{ fontWeight: '800', color: 'var(--text-main)' }}>{comprobante}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Click para cambiar archivo</p>
              </div>
            ) : (
              <div>
                <FaFileUpload style={{ fontSize: '32px', color: 'var(--primary)', marginBottom: '12px' }} />
                <p style={{ fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px' }}>
                  Haz clic o arrastra tu nuevo comprobante aquí
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                  PDF, JPG o PNG - Máximo 5MB
                </p>
              </div>
            )}
          </label>

          <button
            onClick={() => document.querySelector('input[type="file"]').click()}
            disabled={uploadingComprobante}
            style={{
              width: '100%',
              padding: '14px 24px',
              background: uploadingComprobante ? '#ccc' : 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '800',
              cursor: uploadingComprobante ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => !uploadingComprobante && (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => !uploadingComprobante && (e.currentTarget.style.opacity = '1')}
          >
            {uploadingComprobante ? 'Cargando...' : 'Seleccionar Nuevo Comprobante'}
          </button>
        </div>
      </div>
    );
  }

  // Default: mostrar loader
  return <Loader text="Cargando..." />;
}
