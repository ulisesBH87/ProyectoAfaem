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
from sqlalchemy import desc, join, null, or_
from sqlalchemy.orm import selectinload
from app.repositorios.solicitud_repositorio import crear_solicitud_repo
from app.modelos.equipo_temporal_modelo import EquipoTemporal
from app.enums.estatus_pago_enum  import EstatusValidacionPago
from app.modelos.catalogo_tipos_solicitud import CatalogoTiposSolicitud
from app.enums.tipos_solicitud_enum import TiposSolicitudEnum
from app.enums.procesos_equipo_temporal import ProcesosEquipoTemporalEnum

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


def buscar_orden_pago_repo(db, tipo_solicitud, equipo_id, usuario):
    usuario_id = usuario.UsuarioId

    query = db.query(OrdenPago)\
        .join(Solicitud)\
        .filter(
            OrdenPago.UsuarioId == usuario_id,
            Solicitud.TipoSolicitudId == tipo_solicitud,
            OrdenPago.EstatusPagoId.in_([
                EstatusValidacionPago.NO_ENVIADA,
                EstatusValidacionPago.ESPERA,
                EstatusValidacionPago.RECHAZADA
            ])
        )

    if tipo_solicitud == TiposSolicitudEnum.JUGADOR:
        query = query.filter(
            Solicitud.EquipoId == equipo_id
        )

    orden = query().first()
    
    return orden


def crear_orden_pago_repo(db, usuario_id, total, solicitud_id):

    orden = OrdenPago(
        UsuarioId=usuario_id,
        TotalPagar=total,
        EstatusPagoId=EstatusValidacionPago.NOENVIADO,
        SolicitudId=solicitud_id
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
def _presidente_esta_activo(presidente):
    return str(getattr(presidente, "EstatusId", "")) == str(PresidenteEquipoEstatus.ACTIVO.value)


def crear_presidente_equipo_repo(db, usuario_id):
    usuario = db.query(Usuario).filter(Usuario.UsuarioId == usuario_id).first()

    if not usuario:
        return None

    persona = db.query(Personas).filter(Personas.PersonaId == usuario.PersonaId).first()

    if not persona:
        raise Exception("Persona no encontrada")

    presidente_existente = db.query(PresidenteEquipo).filter(
        PresidenteEquipo.PersonaId == persona.PersonaId
    ).first()

    if presidente_existente:
        raise Exception("Ya existe un presidente registrado para esta persona")
    
    nuevo_presidente = PresidenteEquipo(
        PersonaId = persona.PersonaId,
        EstatusId = PresidenteEquipoEstatus.ACTIVO.value
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

    #Estatus de la orden cambiado
    orden.EstatusPagoId = estatus
    
    #Implementar lógica para el rechazo
    if estatus == EstatusValidacionPago.RECHAZADO.value: #si el pago no es aceptado se cambia el estatus
        db.commit()
        return orden 

    #SI SE APROBÓ (Estatus = 3)
    #Anteriormente se creaba la solicitud después de aprobar la orden. Ahora, se crea la solicitud, se crea la orden y se relacionan mediante el id de la solicitud
    
    #Búsqueda de la solicitud relacionada a la orden de pago
    solicitud_id = orden.SolicitudId
    solicitud = db.query(Solicitud).filter(Solicitud.SolicitudId == solicitud_id).first()

    solicitud_tipo = db.query(CatalogoTiposSolicitud).filter(CatalogoTiposSolicitud.TipoSolicitudId == solicitud.TipoSolicitudId).first()
    tipo_id = solicitud_tipo.TipoSolicitudId


    #Procesos
    if(tipo_id == TiposSolicitudEnum.PRESIDENTE_EQUIPO.value or tipo_id == TiposSolicitudEnum.EQUIPO.value):
        tipo_proceso = ProcesosEquipoTemporalEnum.REGISTRO_INICIAL.value
        crear_equipo_temporal_repo(db, orden, solicitud_id, tipo_proceso)

    elif(tipo_id == TiposSolicitudEnum.JUGADOR.value):
        equipo_id = solicitud.EquipoId
        tipo_proceso = ProcesosEquipoTemporalEnum.AMPLIACION.value
        crear_equipo_temporal_repo(db, orden, solicitud_id, tipo_proceso, equipo_id)
    else:
        raise Exception("Tipo de solicitud no reconocido para proceso de creación de equipo")
    



    #usuario = db.query(Usuario).filter(Usuario.UsuarioId == orden.UsuarioId).first()

    db.commit()

    return orden

def mi_estado_pago_repo(db, usuario_id):
    orden = db.query(OrdenPago).filter(OrdenPago.UsuarioId == usuario_id).order_by(OrdenPago.OrdenPagoId.desc()).first()

    return orden

def mi_estado_pago_equipo_repo(db, usuario_id):

    #VERIFICAR SI EXISTE UN EQUIPO TEMPORAL ACTIVO Y VACÍO (SIN EQUIPO ID))
    equipo_vacio = (
        db.query(EquipoTemporal)
        .options(
            selectinload(EquipoTemporal.OrdenPagoRelacion)
            .selectinload(OrdenPago.OrdenPagoDetalleRelacion)
        )
        .filter(
            EquipoTemporal.UsuarioId == usuario_id,
            EquipoTemporal.Activo == True,
            EquipoTemporal.EquipoId.is_(None)
        )
        .first()
    )

    #Si hay un equipo vacio y activo, usar ese
    if equipo_vacio:
        return {
            "equipo_temporal": equipo_vacio,
            "orden": equipo_vacio.OrdenPagoRelacion
        }

    #Si no hay equipo disponible, pasar a proceso de buscar estado de orden
    orden = (
        db.query(OrdenPago)
        .options(selectinload(OrdenPago.OrdenPagoDetalleRelacion))
        .filter(
            OrdenPago.UsuarioId == usuario_id,
            OrdenPago.EstatusPagoId != 5  # ❌ excluir CADUCADO
        )
        .order_by(desc(OrdenPago.OrdenPagoId))
        .first()
    )

    #NO HAY EQUIPOS VACIOS
    return {
        "equipo_temporal": None,
        "orden": orden
    }

    """
    return (
        db.query(OrdenPago)
        .outerjoin(EquipoTemporal, EquipoTemporal.OrdenPagoId == OrdenPago.OrdenPagoId)
        .options(selectinload(OrdenPago.OrdenPagoDetalleRelacion), selectinload(OrdenPago.EquipoTemporalRelacion))
        .filter(OrdenPago.UsuarioId == usuario_id)
        .filter(or_(EquipoTemporal.EquipoTemporalId == None, EquipoTemporal.Activo == True))
        .order_by(OrdenPago.OrdenPagoId.desc())
        .first()
    )
"""