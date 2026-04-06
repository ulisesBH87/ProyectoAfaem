from app.modelos.catalogo_tipo_afiliacion import CatalogoTiposAfiliacion
from app.modelos.catalogo_seguros import Seguro
from app.modelos.ordenes_pago_modelo import OrdenPago
from app.modelos.orden_pago_detalle_modelo import OrdenPagoDetalle
from app.esquemas.pago_esquema import VerComprobantes
from datetime import datetime
from app.esquemas.pago_esquema import SeguroBase
from app.modelos.presidente_equipo_modelo import PresidenteEquipo
from app.enums.estatus_presidente_enum import PresidenteEquipoEstatus
from app.enums.roles_enum import Rol
from app.enums.estados_validacion_enum import EstatusValidacionSolicitud
from app.modelos.usuario_modelo import Usuario
from app.modelos.persona_modelo import Personas
from app.modelos.solicitud_modelo import Solicitud
from app.repositorios.equipo_repositorio import crear_equipo_temporal_repo
from sqlalchemy.orm import selectinload
from app.repositorios.solicitud_repositorio import crear_solicitud_repo
from app.modelos.equipo_temporal_modelo import EquipoTemporal
from app.enums.estatus_pago_enum  import EstatusValidacionPago

#Tipos de afiliación
def obtener_afiliaciones_repo(db):
    return db.query(CatalogoTiposAfiliacion).all()

def obtener_tipo_afiliacion_repo(db, tipo_afiliacion_id):

    return (
        db.query(CatalogoTiposAfiliacion)
        .filter(CatalogoTiposAfiliacion.TipoAfiliacionId == tipo_afiliacion_id)
        .first()
    )
    
#Tipos de seguro
def obtener_seguros_repo(db):
    return db.query(Seguro).all()

def obtener_seguro_repo(db, seguro_id):

    return (
        db.query(Seguro)
        .filter(Seguro.SeguroId == seguro_id)
        .filter(Seguro.Activo == True)
        .first()
    )


#ORDEN DE PAGO
def obtener_orden_repo(db, orden_id):
    return (db.query(OrdenPago).filter(OrdenPago.OrdenPagoId == orden_id).first())

def crear_orden_pago_repo(db, usuario_id, total):

    orden = OrdenPago(
        UsuarioId=usuario_id,
        TotalPagar=total,
        EstatusPagoId=EstatusValidacionPago.NOENVIADO
    )

    db.add(orden)
    db.flush()  # obtiene OrdenPagoId sin commit

    return orden

def crear_detalle_pago_repo(db, orden_pago_id, detalle):

    registro = OrdenPagoDetalle(
        OrdenPagoId=orden_pago_id,
        TipoConceptoId=detalle["tipo_concepto"],
        TipoAfiliacionId=detalle["tipo_afiliacion_id"],
        SeguroId=detalle["seguro_id"],
        Cantidad=detalle["cantidad"],
        PrecioUnitarioCobrado=detalle["precio"],
        Subtotal=detalle["subtotal"]
    )

    db.add(registro)

    return registro

#PAGOS
def obtener_pagos_repo(db):
    return db.query(OrdenPago).filter(OrdenPago.EstatusPagoId != EstatusValidacionPago.NOENVIADO).all()

def orden_pago_individual_repo(db, orden_pago_id):
    orden = (db.query(OrdenPago).options(selectinload(OrdenPago.OrdenPagoDetalleRelacion)).filter(OrdenPago.OrdenPagoId == orden_pago_id).first())

    return orden
"""
def cantidad_seguros_repo(db, orden_pago_id):
    orden = (db.query(EquipoTemporal.CantidadJugadoresPagados).filter(OrdenPago.OrdenPagoId == orden_pago_id).first())

    return orden
"""
def crear_presidente_equipo_repo(db, usuario_id):
    usuario = db.query(Usuario).filter(Usuario.UsuarioId == usuario_id).first()

    if not usuario:
        raise Exception("Usuario no encontrado")

    persona = db.query(Personas).filter(Personas.PersonaId == usuario.PersonaId).first()

    if not persona:
        raise Exception("Persona no encontrada")
    
    nuevo_presidente = PresidenteEquipo(
        PersonaId = persona.PersonaId,
        EstatusId = PresidenteEquipoEstatus.PAGO_PENDIENTE
    )

    db.add(nuevo_presidente)
    
    # Actualizar el rol del usuario para que deje de ser INVITADO
    usuario.RolId = Rol.PRESIDENTE_EQUIPO.value
    
    return nuevo_presidente


#VALIDACIÓN DE PAGOS
#Subida de comprobante
def actualizar_comprobante_repo(db, orden_id, ruta):
    
    orden = (db.query(OrdenPago).filter(OrdenPago.OrdenPagoId == orden_id).first())
    
    orden.RutaVoucher = ruta
    orden.FechaEnvio = datetime.now()
    orden.EstatusPagoId = EstatusValidacionPago.ESPERA #ENVIADO (ESPERA)

    return orden


#Validación de pago
def estatus_pago_repo(db, orden_pago_id, estatus):

    orden = (db.query(OrdenPago).filter(OrdenPago.OrdenPagoId == orden_pago_id).first())
    if not orden:
        return None

    orden.EstatusPagoId = estatus
    
    if estatus != 3: #si el pago no es aceptado
        db.commit()
        return orden 
    
    solicitud = crear_solicitud_repo(db, orden.UsuarioId, EstatusValidacionSolicitud.BORRADOR,  2) #CAMBIAR EN EL FUTURO PARA DISTINTOS TIPOS DE AFILIACION

    crear_equipo_temporal_repo(db, orden, solicitud.SolicitudId)


    usuario = db.query(Usuario).filter(Usuario.UsuarioId == orden.UsuarioId).first()
    persona = db.query(Personas).filter(Personas.PersonaId == usuario.PersonaId).first()

    #FIX FUTURO: Implementar if que según el tipo de afiliacion haga modificaciones correspondientes
    presidente = db.query(PresidenteEquipo).filter(PresidenteEquipo.PersonaId == persona.PersonaId).first()
    
    if presidente:
        presidente.EstatusId = PresidenteEquipoEstatus.DOCUMENTOS_PENDIENTES

    db.commit()

    return orden
