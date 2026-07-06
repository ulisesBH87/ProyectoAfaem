from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from app.db.sesion import get_db
from app.db.sesion import get_pagos_servicio

from app.esquemas.pago_esquema import CrearOrdenPago, SeguroBase, AfiliacionesBase, ListaPagos, OrdenPagoIndividual
from app.esquemas.solicitud_esquema import SolicitudEquipo
from app.core.seguridad import obtener_usuario_actual
from app.servicios.pagos_servicio import PagosServicio
from app.servicios import solicitud_servicio
from app.repositorios import pagos_repositorio
from app.excepciones import pagos_excepciones

from app.enums.tipos_afiliacion_enum import TiposAfiliacionEnum
from app.enums.tipos_solicitud_enum import TiposSolicitudEnum
from app.enums.roles_enum import Rol as RolEnum

router = APIRouter(
    prefix="/ordenes-pago",
    tags=["Ordenes de pago"]
)


# == CREACIÓN DE ORDEN DE PAGO ==
@router.post("/hay-orden/")
def hay_orden_pago(tipo_solicitud: int, equipo_id: int | None = None, service: PagosServicio = Depends(get_pagos_servicio), db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    orden_pago = service.buscar_orden_pago(tipo_solicitud, equipo_id, usuario)

    return orden_pago

@router.get("/admin/equipo/{equipo_id}/orden-ampliacion")
def admin_hay_orden_ampliacion(equipo_id: int, service: PagosServicio = Depends(get_pagos_servicio), db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    # Solo permite verificar ordenes de ampliación (JUGADOR) para el admin
    orden_pago = service.buscar_orden_ampliacion_admin(equipo_id)
    return orden_pago

@router.get("/jugador/estado/{equipo_id}")
def obtener_estado_pago_jugador(equipo_id: int, service: PagosServicio = Depends(get_pagos_servicio), db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    # Verifica el estado de la orden de pago para solicitud de tipo JUGADOR (tipo 3) para el usuario autenticado
    orden_pago = service.buscar_orden_pago(TiposSolicitudEnum.JUGADOR.value, equipo_id, usuario)
    return orden_pago


# NUEVO. Requiere el tipo de Solicitud (presidente/equipo/jugador)
@router.post("/")
def crear_orden_pago(datos: CrearOrdenPago, service: PagosServicio = Depends(get_pagos_servicio), db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    usuario_objetivo = usuario
    if datos.PresidenteId is not None:
        if getattr(usuario, "RolId", None) != RolEnum.ADMINISTRADOR.value:
            raise HTTPException(status_code=403, detail="No tienes permiso para crear ordenes para este presidente")

        usuario_id_objetivo = pagos_repositorio.obtener_usuario_id_por_presidente_repo(db, datos.PresidenteId)
        if not usuario_id_objetivo:
            raise HTTPException(status_code=404, detail="No se encontro el presidente seleccionado")

        class UsuarioObjetivo:
            def __init__(self, usuario_id):
                self.UsuarioId = usuario_id

        usuario_objetivo = UsuarioObjetivo(usuario_id_objetivo)
    elif datos.TipoSolicitud == TiposSolicitudEnum.JUGADOR and datos.EquipoId is not None:
        from app.modelos.equipo_modelo import EquiposJugando
        from app.modelos.presidente_equipo_modelo import PresidenteEquipo
        from app.modelos.usuario_modelo import Usuario
        from app.modelos.persona_modelo import Personas
        
        eq_jugando = db.query(EquiposJugando).filter(EquiposJugando.EquiposJugandoId == datos.EquipoId).first()
        if eq_jugando and eq_jugando.PresidenteEquipoId is not None:
            usuario_id_objetivo = (
                db.query(Usuario.UsuarioId)
                .join(Personas, Personas.PersonaId == Usuario.PersonaId)
                .join(PresidenteEquipo, PresidenteEquipo.PersonaId == Personas.PersonaId)
                .filter(PresidenteEquipo.PresidenteEquipoId == eq_jugando.PresidenteEquipoId)
                .scalar()
            )
            if usuario_id_objetivo:
                class UsuarioObjetivo:
                    def __init__(self, usuario_id):
                        self.UsuarioId = usuario_id
                usuario_objetivo = UsuarioObjetivo(usuario_id_objetivo)

    #Se crea primero la solicitud
    tipo_solicitud = datos.TipoSolicitud #La que viene del frontend. Se relaciona con tabla solicitudes


    tipo_afiliacion = SolicitudEquipo.TipoAfiliacionId = TiposAfiliacionEnum.PRESIDENTE_DE_EQUIPO #Los tipos de afiliación tienen los costos
    tipo_afiliacion = datos.TipoAfiliacionId

    if tipo_solicitud == TiposSolicitudEnum.PRESIDENTE_EQUIPO or tipo_solicitud == TiposSolicitudEnum.EQUIPO:
        solicitud_nueva = solicitud_servicio.crear_solicitud_servicio(db, tipo_afiliacion, tipo_solicitud, usuario_objetivo, afiliacion=datos.Afiliacion)
    
    elif tipo_solicitud == TiposSolicitudEnum.JUGADOR:
        solicitud_nueva = solicitud_servicio.crear_solicitud_servicio(db, tipo_afiliacion, tipo_solicitud, usuario_objetivo, datos.EquipoId, afiliacion=datos.Afiliacion)

    solicitud_id = solicitud_nueva.SolicitudId

    #Se crea la orden de pago y se relaciona con el id de la solicitud (en proceso )
    usuario_id = usuario_objetivo.UsuarioId
    resultado = service.crear_orden_pago(usuario_id, datos, solicitud_id)
    
    return resultado

@router.post("/{orden_id}/comprobante")
async def subir_comprobante(orden_id: int, archivo: UploadFile = File(...), service: PagosServicio = Depends(get_pagos_servicio)):
    resultado = await service.subir_comprobante(orden_id=orden_id, archivo=archivo)

    return resultado


# =================================================
# == CONSULTAS DE SEGUROS Y AFILIACIONES ==
# =================================================
@router.get("/seguros", response_model=list[SeguroBase])
def obtener_seguros(service: PagosServicio = Depends(get_pagos_servicio)):
    seguros = service.obtener_seguros()

    return seguros

@router.get("/afiliaciones", response_model=list[AfiliacionesBase])
def obtener_afiliaciones(service: PagosServicio =Depends(get_pagos_servicio)):
    afiliaciones = service.obtener_afiliaciones()

    return afiliaciones



# =================================================
# == OBTENER LAS ORDENES DE PAGO. TODAS E INDIVIDUALES ==
# =================================================
@router.get("/generales", response_model=list[ListaPagos])
def obtener_pagos(service: PagosServicio = Depends(get_pagos_servicio)):
    pagos = service.obtener_pagos_servicio()

    return pagos






#BORRAR ESTE
@router.get("/mi-estado")
def mi_estado_pago(service: PagosServicio = Depends(get_pagos_servicio), usuario = Depends(obtener_usuario_actual)):
    """Devuelve el estatus de pago más reciente del usuario autenticado."""
    orden = service.mi_estado_pago(usuario.UsuarioId)

    return orden

@router.get("/mi-estado-equipo")
def mi_estado_pago_equipo(
    presidente_id: int | None = Query(None),
    service: PagosServicio = Depends(get_pagos_servicio),
    usuario = Depends(obtener_usuario_actual)
):
    #print("🎈🎈🎈🎈ID DEL PRESIDENTE")
    #print(presidente_id)
    
    presidente_consulta = None
    if presidente_id is not None:
        if getattr(usuario, "RolId", None) != RolEnum.ADMINISTRADOR.value:
            raise HTTPException(status_code=403, detail="No tienes permiso para consultar este presidente")
        presidente_consulta = presidente_id

    orden = service.mi_estado_pago_equipo(usuario.UsuarioId, presidente_consulta)

    return orden



# =================================================
#Cambiar el estatus de pago
#Se usa para que el administrador apruebe o rechace un pago
# =================================================
@router.post("/estatus-pago")
def estatus_pago(orden_pago_id: int, estatus: int, motivo: str | None = Query(None), service: PagosServicio = Depends(get_pagos_servicio)):
    orden = service.estatus_pago(orden_pago_id, estatus, motivo)

    return orden

@router.get("/{orden_pago_id}", response_model=OrdenPagoIndividual)
def orden_pago_individual(orden_pago_id: int, service: PagosServicio=Depends(get_pagos_servicio)):

    return service.orden_pago_individual(orden_pago_id)
