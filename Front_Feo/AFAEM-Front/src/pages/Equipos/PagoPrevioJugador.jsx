import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaArrowLeft, FaCheckCircle, FaClock, FaFileUpload, FaMoneyBillWave, FaTimesCircle, FaUpload } from 'react-icons/fa';
import '../../styles/dashboard.css';
import Swal from 'sweetalert2';
import { API_BASE } from '../../config/config';
import Loader from '../../components/Loader';
import teamsService from '../../services/teams';

const ESTATUS_PAGO = {
  NO_ENVIADO: 1,
  EN_ESPERA: 2,
  APROBADO: 3,
  RECHAZADO: 4
};

const TIPO_SOLICITUD = {
  JUGADOR: 3
};

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
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [catalogs, setCatalogs] = useState({ seguros: [] });
  const [catalogoAfiliacionesPago, setCatalogoAfiliacionesPago] = useState([]);
  const [numJugadoresAgregar, setNumJugadoresAgregar] = useState('1');
  const [asignacionSegurosAgregar, setAsignacionSegurosAgregar] = useState({});
  const [pagoErrorJugador, setPagoErrorJugador] = useState(null);
  const [procesandoPagoJugador, setProcesandoPagoJugador] = useState(false);

  const pathSegments = location.pathname.split('/');
  const accion = pathSegments[pathSegments.length - 1];
  const state = location.state || {};
  const { equipoId, ordenId, total } = state;
  const resolvedOrdenId = pagoData?.orden_id || pagoData?.orden_pago_id || pagoData?.OrdenPagoId || pagoData?.id || ordenId;
  const uploadInputId = accion === 'reenviar-comprobante' ? 'comprobante-jugador-reenvio' : 'comprobante-jugador';

  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        setLoadingCatalogs(true);
        const data = await teamsService.getCatalogs();
        setCatalogs({ seguros: Array.isArray(data?.seguros) ? data.seguros : [] });

        const resAfiliaciones = await fetch(`${API_BASE}/ordenes-pago/afiliaciones`);
        if (resAfiliaciones.ok) {
          const afiliaciones = await resAfiliaciones.json();
          setCatalogoAfiliacionesPago(Array.isArray(afiliaciones) ? afiliaciones : []);
        }
      } catch (error) {
        console.error('Error al cargar catálogos:', error);
        Swal.fire('Error', 'No se pudieron cargar los catálogos del servidor.', 'error');
      } finally {
        setLoadingCatalogs(false);
      }
    };

    loadCatalogs();
  }, []);

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
    if (resolvedOrdenId || !numJugadoresAgregar || catalogs.seguros.length === 0) return;

    const totalNecesario = Number(numJugadoresAgregar) || 0;
    setAsignacionSegurosAgregar(prev => {
      const nuevaAsignacion = { ...prev };

      // Reiniciar todos los seguros
      catalogs.seguros.forEach(s => {
        nuevaAsignacion[String(s.id)] = 0;
      });

      const primerSeguroJugador = catalogs.seguros.find(s => !['TIPO G', 'SIN SEGURO'].includes((s.nombre || '').toUpperCase().trim()));
      if (primerSeguroJugador) {
        nuevaAsignacion[String(primerSeguroJugador.id)] = totalNecesario;
      } else if (catalogs.seguros.length > 0) {
        nuevaAsignacion[String(catalogs.seguros[0].id)] = totalNecesario;
      }

      return nuevaAsignacion;
    });
  }, [catalogs.seguros, numJugadoresAgregar, resolvedOrdenId]);

  useEffect(() => {
    const cargarResumenOrden = async () => {
      if (!resolvedOrdenId || (accion !== 'crear-orden' && accion !== 'subir-comprobante' && accion !== 'reenviar-comprobante')) {
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
          const detalles = Array.isArray(orden.OrdenPagoDetalleRelacion) ? orden.OrdenPagoDetalleRelacion : [];
          setOrderDetails(detalles);

          const seguros = {};
          let cantidadJugadores = null;
          detalles.forEach(detalle => {
            if (Number(detalle.TipoAfiliacionId) === 4) {
              cantidadJugadores = Number(detalle.Cantidad || 0);
            }
            if (detalle.SeguroId) {
              seguros[String(detalle.SeguroId)] = Number(detalle.Cantidad || 0);
            }
          });

          if (cantidadJugadores !== null && !Number.isNaN(cantidadJugadores)) {
            setNumJugadoresAgregar(cantidadJugadores);
          }

          if (Object.keys(seguros).length > 0) {
            setAsignacionSegurosAgregar(seguros);
          }
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
  const costoAfiliacionJugador = Number(catalogoAfiliacionesPago.find(a => a.TipoAfiliacionId === 4)?.CostoActual || 0);
  const segurosRequeridosPagoJugador = Number(numJugadoresAgregar || 0) > 0 ? Number(numJugadoresAgregar || 0) : 0;
  const totalAsignadosPagoJugador = catalogs.seguros.reduce((sum, seguro) => {
    const isPresidente = ['TIPO G', 'SIN SEGURO'].includes((seguro.nombre || '').toUpperCase().trim());
    return sum + (isPresidente ? 0 : Number(asignacionSegurosAgregar[String(seguro.id)] || 0));
  }, 0);
  const segurosPendientesPagoJugador = segurosRequeridosPagoJugador - totalAsignadosPagoJugador;
  const totalPagoEstimadoJugador = (
    catalogs.seguros.reduce((sum, seguro) => {
      const cantidad = Number(asignacionSegurosAgregar[String(seguro.id)] || 0);
      return sum + (Number(seguro.precio || 0) * cantidad);
    }, 0)
  );
  const totalPagoMostradoJugador = Number(pagoData?.total || totalPagoEstimadoJugador || 0);

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

  const handleCrearOrden = async () => {
    setPagoErrorJugador(null);

    if (Number(numJugadoresAgregar) < 1) {
      setPagoErrorJugador('Debes ingresar el numero de jugadores.');
      return;
    }

    if (totalAsignadosPagoJugador !== segurosRequeridosPagoJugador) {
      setPagoErrorJugador(`Debes asignar un seguro por jugador. Faltan ${segurosPendientesPagoJugador}.`);
      return;
    }

    try {
      setProcesandoPagoJugador(true);
      const token = localStorage.getItem('token');
      const segurosPayload = Object.entries(asignacionSegurosAgregar)
        .filter(([, cantidad]) => Number(cantidad) > 0)
        .map(([seguroId, cantidad]) => ({
          SeguroId: Number(seguroId),
          Cantidad: Number(cantidad)
        }));

      const res = await fetch(`${API_BASE}/ordenes-pago/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          CantidadJugadores: Number(numJugadoresAgregar),
          Seguros: segurosPayload,
          TipoSolicitud: TIPO_SOLICITUD.JUGADOR,
          EquipoId: equipoId ? Number(equipoId) : undefined
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'No se pudo crear la orden de pago');
      }

      const data = await res.json();
      setPagoData({
        ...data,
        accion: 'subir-comprobante',
        estado: ESTATUS_PAGO.NO_ENVIADO,
        tieneComprobante: false,
        orden_id: data.orden_pago_id || data.OrdenPagoId || data.id,
        total: Number(data.total || totalPagoEstimadoJugador || 0)
      });
    } catch (error) {
      console.error('Error creando orden de pago de jugador:', error);
      setPagoErrorJugador(error.message || 'No se pudo crear la orden de pago');
    } finally {
      setProcesandoPagoJugador(false);
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
    <div className="pago-card">
      <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#1e293b', marginBottom: '18px' }}>Resumen de pago</h3>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '13px' }}>
        <span>Orden de pago</span>
        <strong style={{ color: '#1e293b' }}>#{resolvedOrdenId || '-'}</strong>
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

  if (loading || (accion === 'crear-orden' && loadingCatalogs)) {
    return <Loader text="Cargando información de pago..." />;
  }

  if (accion === 'crear-orden') {
    const ordenCreada = Boolean(resolvedOrdenId);
    const pagoRechazado = Number(pagoData?.estado || pagoData?.estatus || 0) === ESTATUS_PAGO.RECHAZADO;

    return (
      <div style={{ maxWidth: '980px', margin: '0 auto', animation: 'slideUp 0.4s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '70px', height: '70px', borderRadius: '18px', background: 'linear-gradient(135deg, #0b4ea6 0%, #063f82 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: '30px', boxShadow: '0 12px 24px rgba(11,78,166,0.22)' }}>
            <FaMoneyBillWave />
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#1e293b', marginBottom: '8px' }}>Pago previo para agregar jugadores</h2>
          <p style={{ color: '#64748b', margin: 0 }}>
            Genera tu orden, sube el comprobante y espera la aprobacion administrativa para continuar.
          </p>
          <p style={{ color: '#ff0000', margin: 0 }}>
            *Si ya tienes una orden de pago y subiste el comprobante, contáctate con un administrador*
          </p>
        </div>

        {pagoRechazado && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '14px', padding: '16px 18px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <FaTimesCircle />
            <span style={{ fontWeight: '700' }}>El comprobante fue rechazado. Sube un nuevo archivo para enviarlo otra vez a revision.</span>
          </div>
        )}

        {pagoErrorJugador && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '14px', padding: '14px 18px', marginBottom: '20px', fontWeight: '700' }}>
            {pagoErrorJugador}
          </div>
        )}

        <div className="responsive-pago-grid">
          <div className="pago-card">
            {!ordenCreada ? (
              <>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '900', color: '#334155', marginBottom: '8px', textTransform: 'uppercase' }}>Numero de jugadores</label>
                <input
                  type="number"
                  min="1"
                  value={numJugadoresAgregar}
                  onChange={(e) => setNumJugadoresAgregar(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                  style={{ width: '100%', padding: '14px 16px', border: '2px solid #dbeafe', borderRadius: '12px', fontSize: '18px', fontWeight: '800', color: '#1e293b', marginBottom: '18px' }}
                />

                <div style={{ marginBottom: '12px', fontSize: '13px', fontWeight: '900', color: '#0b4ea6', textTransform: 'uppercase' }}>Distribucion de seguros</div>
                <div className="responsive-seguros-grid">
                  {catalogs.seguros.filter(s => !['TIPO G', 'SIN SEGURO'].includes((s.nombre || '').toUpperCase().trim())).map(seguro => {
                    const id = String(seguro.id);
                    return (
                      <div
                        key={id}
                        style={{
                          display: 'grid', gridTemplateColumns: '1fr 92px', gap: '12px', alignItems: 'center',
                          border: '1px solid #e2e8f0',
                          borderRadius: '14px', padding: '14px',
                          background: 'transparent',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '900', color: '#1e293b', fontSize: '14px' }}>{seguro.nombre}</div>
                          <div style={{ color: '#64748b', fontSize: '12px', marginTop: '3px' }}>${Number(seguro.precio || 0).toFixed(2)} c/u</div>
                        </div>
                        <input
                          type="number"
                          min="0"
                          value={asignacionSegurosAgregar[id] ?? ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0);
                            setAsignacionSegurosAgregar(prev => ({ ...prev, [id]: value }));
                          }}
                          style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '10px', fontWeight: '800', textAlign: 'center' }}
                        />
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: '16px', padding: '12px 14px', borderRadius: '12px', background: totalAsignadosPagoJugador === segurosRequeridosPagoJugador && segurosRequeridosPagoJugador > 0 ? '#ecfdf5' : '#fff7ed', color: totalAsignadosPagoJugador === segurosRequeridosPagoJugador && segurosRequeridosPagoJugador > 0 ? '#047857' : '#c2410c', fontWeight: '800', fontSize: '13px' }}>
                  Seguros asignados: {totalAsignadosPagoJugador}/{segurosRequeridosPagoJugador || 0}
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '999px', background: '#ecfdf5', color: '#047857', fontWeight: '900', fontSize: '12px', marginBottom: '18px' }}>
                  <FaCheckCircle /> Orden activa #{resolvedOrdenId}
                </div>
                <h3 style={{ color: '#1e293b', fontWeight: '900', marginBottom: '8px' }}>Sube tu comprobante de pago</h3>
                <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: '22px' }}>
                  Adjunta un PDF o imagen del comprobante. El registro se habilitara cuando el administrador apruebe esta orden.
                </p>
                <div style={{ border: '2px dashed #bfdbfe', borderRadius: '16px', padding: '26px', textAlign: 'center', background: '#f8fafc' }}>
                  <FaUpload style={{ fontSize: '34px', color: '#0b4ea6', marginBottom: '12px' }} />
                  <input
                    id={uploadInputId}
                    type="file"
                    onChange={handleSeleccionarComprobante}
                    style={{ display: 'none' }}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <div style={{ fontWeight: '800', color: '#1e293b', marginBottom: '12px' }}>
                    {comprobante || 'No se ha seleccionado archivo'}
                  </div>
                  <button
                    onClick={() => document.getElementById(uploadInputId)?.click()}
                    style={{ padding: '11px 22px', borderRadius: '10px', border: '1px solid #0b4ea6', background: 'white', color: '#0b4ea6', fontWeight: '900', cursor: 'pointer' }}
                  >
                    {comprobante ? 'Cambiar archivo' : 'Seleccionar archivo'}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="pago-card">
            <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#1e293b', marginBottom: '18px' }}>Resumen de pago</h3>
            {catalogs.seguros.map(seguro => {
              const cantidad = Number(asignacionSegurosAgregar[String(seguro.id)] || 0);
              if (!cantidad) return null;
              return (
                <div key={seguro.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '13px' }}>
                  <span>{seguro.nombre} x{cantidad}</span>
                  <strong style={{ color: '#1e293b' }}>${(Number(seguro.precio || 0) * cantidad).toFixed(2)}</strong>
                </div>
              );
            })}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', paddingTop: '18px', borderTop: '2px solid #e2e8f0' }}>
              <span style={{ fontWeight: '900', color: '#1e293b' }}>Total</span>
              <span style={{ fontSize: '24px', fontWeight: '900', color: '#0b4ea6' }}>${Number(totalPagoMostradoJugador || 0).toFixed(2)}</span>
            </div>

            <button
              disabled={procesandoPagoJugador || uploadingComprobante || (!ordenCreada && (Number(numJugadoresAgregar) < 1 || totalAsignadosPagoJugador !== segurosRequeridosPagoJugador)) || (ordenCreada && !comprobanteFile)}
              onClick={ordenCreada ? handleSubirComprobante : handleCrearOrden}
              style={{ width: '100%', marginTop: '24px', padding: '14px 18px', borderRadius: '12px', border: 'none', background: procesandoPagoJugador || uploadingComprobante ? '#94a3b8' : '#0b4ea6', color: 'white', fontWeight: '900', cursor: procesandoPagoJugador || uploadingComprobante ? 'wait' : 'pointer', opacity: (!ordenCreada && (Number(numJugadoresAgregar) < 1 || totalAsignadosPagoJugador !== segurosRequeridosPagoJugador)) || (ordenCreada && !comprobanteFile) ? 0.55 : 1 }}
            >
              {procesandoPagoJugador || uploadingComprobante ? 'Procesando...' : ordenCreada ? 'Enviar comprobante' : 'Generar orden de pago'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // VISTA LEGACY: CREAR ORDEN
  if (false && accion === 'crear-orden') {
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
      <div className="fade-in" style={{ maxWidth: '980px', margin: '0 auto' }}>
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

        <div className="responsive-pago-grid">
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
      <div className="fade-in" style={{ maxWidth: '980px', margin: '0 auto' }}>
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
            <p style={{ color: '#831843', lineHeight: '1.6', marginBottom: 0 }}>
              Tu comprobante de pago fue recibido correctamente y está siendo revisado por el equipo de administración de AFAEM.
              Podrás continuar cuando el pago sea aprobado.
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
              <li>Tu orden de pago se aprueba</li>
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
      <div className="fade-in" style={{ maxWidth: '980px', margin: '0 auto' }}>
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


