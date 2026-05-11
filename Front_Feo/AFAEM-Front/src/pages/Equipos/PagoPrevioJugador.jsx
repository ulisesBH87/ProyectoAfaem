import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaArrowLeft, FaCheckCircle, FaClock, FaFileUpload, FaMoneyBillWave, FaUpload } from 'react-icons/fa';
import '../../styles/dashboard.css';
import Swal from 'sweetalert2';
import { API_BASE } from '../../config/config';
import Loader from '../../components/Loader';
import teamsService from '../../services/teams';

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
  const [comprobanteFile, setComprobanteFile] = useState(null);
  const [uploadingComprobante, setUploadingComprobante] = useState(false);
  const [orderDetails, setOrderDetails] = useState([]);
  const [segurosCatalogo, setSegurosCatalogo] = useState([]);

  const pathSegments = location.pathname.split('/');
  const accion = pathSegments[pathSegments.length - 1];
  const state = location.state || {};
  const { equipoId, ordenId, total } = state;
  const resolvedOrdenId = pagoData?.orden_id || pagoData?.orden_pago_id || pagoData?.OrdenPagoId || pagoData?.id || ordenId;
  const uploadInputId = accion === 'reenviar-comprobante' ? 'comprobante-jugador-reenvio' : 'comprobante-jugador';

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

  useEffect(() => {
    const cargarResumenOrden = async () => {
      if (!resolvedOrdenId || (accion !== 'subir-comprobante' && accion !== 'reenviar-comprobante')) {
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const [ordenRes, catalogs] = await Promise.all([
          fetch(`${API_BASE}/ordenes-pago/${resolvedOrdenId}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          teamsService.getCatalogs()
        ]);

        if (ordenRes.ok) {
          const orden = await ordenRes.json();
          setOrderDetails(Array.isArray(orden.OrdenPagoDetalleRelacion) ? orden.OrdenPagoDetalleRelacion : []);
        }

        setSegurosCatalogo(Array.isArray(catalogs?.seguros) ? catalogs.seguros : []);
      } catch (err) {
        console.warn('No se pudo cargar el resumen de la orden:', err);
      }
    };

    cargarResumenOrden();
  }, [accion, resolvedOrdenId]);

  const totalResumen = Number(pagoData?.total || total || 0);
  const detallesAfiliacionJugador = orderDetails.filter(detalle => Number(detalle.TipoAfiliacionId) === 4);
  const cantidadJugadoresOrden = detallesAfiliacionJugador.reduce((sum, detalle) => sum + Number(detalle.Cantidad || 0), 0);
  const subtotalAfiliacionJugadores = detallesAfiliacionJugador.reduce((sum, detalle) => sum + Number(detalle.Subtotal || 0), 0);
  const detallesSeguros = orderDetails.filter(detalle => Number(detalle.SeguroId) > 0);

  const handleSeleccionarComprobante = (e) => {
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

    setComprobanteFile(file);
    setComprobante(file.name);
  };

  const handleSubirComprobante = async () => {
    if (!comprobanteFile) return;

    setUploadingComprobante(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('archivo', comprobanteFile);
      formData.append('orden_id', resolvedOrdenId);
      formData.append('equipo_id', equipoId);

      const res = await fetch(`${API_BASE}/ordenes-pago/${resolvedOrdenId}/comprobante`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: '¡Comprobante cargado!',
          text: 'El comprobante fue enviado correctamente. Será revisado por administración.',
          timer: 5000
        });
        setTimeout(() => navigate('/presidente-equipo/equipos'), 2000);
      } else {
        const error = await res.json();
        setComprobante(null);
        setComprobanteFile(null);
        Swal.fire('Error', error.detail || 'Error al subir comprobante', 'error');
      }
    } catch (err) {
      console.error('Error subiendo comprobante:', err);
      setComprobante(null);
      setComprobanteFile(null);
      Swal.fire('Error', 'Error al subir el comprobante', 'error');
    } finally {
      setUploadingComprobante(false);
    }
  };

  const renderComprobanteBox = ({ helperText, buttonText }) => (
    <>
      {resolvedOrdenId && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '999px', background: '#ecfdf5', color: '#047857', fontWeight: '900', fontSize: '12px', marginBottom: '18px' }}>
          <FaCheckCircle /> Orden activa #{resolvedOrdenId}
        </div>
      )}
      <h3 style={{ color: '#1e293b', fontWeight: '900', marginBottom: '8px' }}>Sube tu comprobante de pago</h3>
      <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: '22px' }}>{helperText}</p>
      <div style={{ border: '2px dashed #bfdbfe', borderRadius: '16px', padding: '26px', textAlign: 'center', background: '#f8fafc' }}>
        <FaUpload style={{ fontSize: '34px', color: '#0b4ea6', marginBottom: '12px' }} />
        <input
          id={uploadInputId}
          type="file"
          onChange={handleSeleccionarComprobante}
          disabled={uploadingComprobante}
          style={{ display: 'none' }}
          accept=".pdf,.jpg,.jpeg,.png"
        />
        <div style={{ fontWeight: '800', color: '#1e293b', marginBottom: '12px' }}>
          {comprobante || 'No se ha seleccionado archivo'}
        </div>
        <button
          onClick={() => document.getElementById(uploadInputId)?.click()}
          disabled={uploadingComprobante}
          style={{ padding: '11px 22px', borderRadius: '10px', border: '1px solid #0b4ea6', background: 'white', color: '#0b4ea6', fontWeight: '900', cursor: uploadingComprobante ? 'not-allowed' : 'pointer', opacity: uploadingComprobante ? 0.7 : 1 }}
        >
          {buttonText}
        </button>
      </div>
      <button
        onClick={handleSubirComprobante}
        disabled={uploadingComprobante || !comprobanteFile}
        style={{ width: '100%', marginTop: '24px', padding: '14px 18px', borderRadius: '12px', border: 'none', background: uploadingComprobante ? '#94a3b8' : '#0b4ea6', color: 'white', fontWeight: '900', cursor: uploadingComprobante ? 'wait' : (!comprobanteFile ? 'not-allowed' : 'pointer'), opacity: comprobanteFile ? 1 : 0.55 }}
      >
        {uploadingComprobante ? 'Procesando...' : 'Enviar comprobante'}
      </button>
    </>
  );

  const renderResumenOrden = () => (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '26px', boxShadow: '0 6px 18px rgba(15,23,42,0.05)' }}>
      <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#1e293b', marginBottom: '18px' }}>Resumen de pago</h3>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '13px' }}>
        <span>Orden de pago</span>
        <strong style={{ color: '#1e293b' }}>#{resolvedOrdenId || '-'}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '13px' }}>
        <span>Afiliacion jugadores x{cantidadJugadoresOrden}</span>
        <strong style={{ color: '#1e293b' }}>${subtotalAfiliacionJugadores.toFixed(2)}</strong>
      </div>
      {detallesSeguros.map((detalle, index) => {
        const seguro = segurosCatalogo.find(item => Number(item.id) === Number(detalle.SeguroId));
        return (
          <div key={`${detalle.SeguroId}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '13px' }}>
            <span>{seguro?.nombre || `Seguro ${detalle.SeguroId}`} x{Number(detalle.Cantidad || 0)}</span>
            <strong style={{ color: '#1e293b' }}>${Number(detalle.Subtotal || 0).toFixed(2)}</strong>
          </div>
        );
      })}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', paddingTop: '18px', borderTop: '2px solid #e2e8f0' }}>
        <span style={{ fontWeight: '900', color: '#1e293b' }}>Total</span>
        <span style={{ fontSize: '24px', fontWeight: '900', color: '#0b4ea6' }}>${totalResumen.toFixed(2)}</span>
      </div>
    </div>
  );

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

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(280px, 0.9fr)', gap: '22px' }}>
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

            {renderComprobanteBox({
              helperText: 'Adjunta un PDF o imagen del comprobante. El registro del jugador se habilitara cuando el administrador apruebe esta orden.',
              buttonText: comprobante ? 'Cambiar archivo' : 'Seleccionar archivo'
            })}
          </div>

          {renderResumenOrden()}
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


          {renderComprobanteBox({
            helperText: 'Adjunta un PDF o imagen del comprobante corregido. El registro del jugador se habilitara cuando el administrador apruebe esta orden.',
            buttonText: comprobante ? 'Cambiar archivo' : 'Seleccionar archivo'
          })}
        </div>
      </div>
    );
  }

  // Default: mostrar loader
  return <Loader text="Cargando..." />;
}


