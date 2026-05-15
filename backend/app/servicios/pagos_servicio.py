from sqlalchemy.orm import Session
import os
from datetime import date

from app.esquemas.pago_esquema import SeguroBase, AfiliacionesBase, ListaPagos
from app.modelos.ordenes_pago_modelo import OrdenPago
from app.repositorios import pagos_repositorio
from app.excepciones import pagos_excepciones
from app.enums.tipos_solicitud_enum import TiposSolicitudEnum
from app.enums.estatus_pago_enum import EstatusValidacionPago
from app.repositorios import usuario_repositorio
class EstadoEquipo:
    SIN_ORDEN = "SIN_ORDEN"
    ORDEN_SIN_COMPROBANTE = "ORDEN_SIN_COMPROBANTE"
    COMPROBANTE_EN_REVISION = "COMPROBANTE_EN_REVISION"
    LISTO_PARA_CREAR_EQUIPO = "LISTO_PARA_CREAR_EQUIPO"
class PagosServicio:

    TIPO_AFILIACION_PRESIDENTE = 2
    TIPO_AFILIACION_JUGADOR = 4
    UPLOAD_DIR = "uploads/vouchers"

    def __init__(self, db:Session):
        self.db = db

    def buscar_orden_pago(self, tipo_solicitud, equipo_id, usuario):
        usuario_id = usuario.UsuarioId
        orden_pago = pagos_repositorio.buscar_orden_pago_repo(self.db, tipo_solicitud, usuario_id, equipo_id)
        
        if not orden_pago:
            #print("NO HAY ORDEN")
            return {
                "tiene_orden": False,
                "accion": "CREAR_ORDEN"
            }
        
        accion = None
        if orden_pago.EstatusPagoId == EstatusValidacionPago.NOENVIADO:
            #print("SUBIDA DE COMPROBATNE")
            accion = "SUBIR_COMPROBANTE"

        elif orden_pago.EstatusPagoId == EstatusValidacionPago.ESPERA:
            #print("EN REVISIÓN")
            accion = "EN_REVISION"

        elif orden_pago.EstatusPagoId == EstatusValidacionPago.RECHAZADO:
            #print("REENVIALO")
            accion = "REENVIAR_COMPROBANTE"
        else:
            #print("no se que pasó ")
            print(orden_pago.EstatusPagoId)
            #print("ORDEN ID: ")
            #print(orden_pago.OrdenPagoId)
        return {
            "tiene_orden": True,
            "accion": accion,
            "orden_id": orden_pago.OrdenPagoId,
            "estatus_pago_id": orden_pago.EstatusPagoId,
            "total": float(orden_pago.TotalPagar)
        }



    def crear_orden_pago(self, usuario_id, orden, solicitud_id):
        if orden.CantidadJugadores < 1:
            raise pagos_excepciones.CantidadJugadoresError()
        
        total_personas = orden.CantidadJugadores

        #Si se va a crear equipo se cobra afiliación de presidente
        if (orden.TipoSolicitud == 1 or orden.TipoSolicitud == 2):
            total_personas += 1

        total_seguros = sum(s.Cantidad for s in orden.Seguros)
        
        if total_seguros != total_personas:
            raise pagos_excepciones.CantidadSegurosPersonasError()
        
        try:
            
            detalles = []
            total = 0

            #Si se crea presidente inicial o equipo nuevo se cobra afiliación de presidente
            if(orden.TipoSolicitud == 1 or orden.TipoSolicitud == 2):
                #Afiliación del presidente de equipo
                afiliacion_presidente = pagos_repositorio.obtener_tipo_afiliacion_repo(self.db, self.TIPO_AFILIACION_PRESIDENTE)

                if not afiliacion_presidente:
                    raise pagos_excepciones.NoAfiliacionError()
            
                subtotal = afiliacion_presidente.CostoActual * 1
            
                #Detalles de la orden para el presidente de equipo
                # (Solo si: 1. Se crea el presidente por primera vez o 2. Se crea un equipo nuevo)
                detalles.append({
                    "tipo_concepto": 2, #AFILIACION
                    "tipo_afiliacion_id": self.TIPO_AFILIACION_PRESIDENTE,
                    "seguro_id": None,
                    "cantidad": 1,
                    "precio": afiliacion_presidente.CostoActual,
                    "subtotal": subtotal
                })
                
                total += subtotal
            
            #Si se va a añadir a un jugador a un equipo ya hecho, no se cobra la afiliación de presidente
            
            #Se obtienen los costos de afiliación de jugador
            afiliacion_jugador = pagos_repositorio.obtener_tipo_afiliacion_repo(self.db, self.TIPO_AFILIACION_JUGADOR)
            if not afiliacion_jugador:
                raise pagos_excepciones.NoAfiliacionError()

            subtotal = afiliacion_jugador.CostoActual * orden.CantidadJugadores
            
            detalles.append({
                "tipo_concepto": 2,
                "tipo_afiliacion_id": self.TIPO_AFILIACION_JUGADOR,
                "seguro_id": None,
                "cantidad": orden.CantidadJugadores,
                "precio": afiliacion_jugador.CostoActual,
                "subtotal": subtotal
            })

            total += subtotal
            
            #seguros
            
            for s in orden.Seguros:
                seguro = pagos_repositorio.obtener_seguro_repo(self.db, s.SeguroId)
                
                if not seguro:
                    raise pagos_excepciones.SeguroNoExisteError(f"Seguro {s.SeguroId} no existe")
                
                subtotal = seguro.Precio * s.Cantidad
                
                detalles.append({
                    "tipo_concepto": 1, #Seguro (Hacer enum en el futuro)
                    "tipo_afiliacion_id": None, #None porque estamos agregando un seguro, no un tipo de afiliación
                    "seguro_id": seguro.SeguroId,
                    "cantidad": s.Cantidad,
                    "precio": seguro.Precio,
                    "subtotal": subtotal
                })
                
                total += subtotal
            
            orden_pago = pagos_repositorio.crear_orden_pago_repo(self.db, usuario_id, total, solicitud_id)
            
            for d in detalles:
                pagos_repositorio.crear_detalle_pago_repo(db=self.db, orden_pago_id=orden_pago.OrdenPagoId, detalle=d)

            #Si se va a crear presidente de equipo
            #if(orden.TipoSolicitud == TiposSolicitudEnum.PRESIDENTE_EQUIPO): #Presidente de equipo (Hacer enum en el futuro)
                #try:        
               #     pagos_repositorio.crear_presidente_equipo_repo(self.db, usuario_id)
              #  except Exception:
             #       self.db.rollback()
            #        raise pagos_excepciones.UsuarioNoEncontradoError()
            
            self.db.commit()

            return {
                "orden_pago_id": orden_pago.OrdenPagoId,
                "total": total
            }
                    
        except Exception:
            self.db.rollback()
            raise pagos_excepciones.PagoInvalidoError()

    # ============================
    # == SUBIDA DE COMPROBANTE ==
    # ========================== 
    async def subir_comprobante(self, orden_id, archivo):
        orden = pagos_repositorio.obtener_orden_repo(self.db, orden_id)
        
        if not orden:
            raise pagos_excepciones.OrdenNoEncontradaError()
        
        try:
            os.makedirs(self.UPLOAD_DIR, exist_ok=True)
            
            extension = archivo.filename.split(".")[-1]
            
            nombre_archivo = f"orden_{orden_id}.{extension}"

            ruta = os.path.join(self.UPLOAD_DIR, nombre_archivo)

            with open(ruta, "wb") as buffer:
                buffer.write(await archivo.read())
                pagos_repositorio.actualizar_comprobante_repo(self.db, orden_id, ruta)

                # Actualizar Estatus Presidente a PAGO_EN_REVISION
                try:
                    from app.modelos.usuario_modelo import Usuario
                    from app.modelos.presidente_equipo_modelo import PresidenteEquipo
                    from app.enums.estatus_presidente_enum import PresidenteEquipoEstatus
                    
                    usuario = self.db.query(Usuario).filter(Usuario.UsuarioId == orden.UsuarioId).first()
                    if usuario:
                        presidente = self.db.query(PresidenteEquipo).filter(PresidenteEquipo.PersonaId == usuario.PersonaId).first()
                        if presidente and str(presidente.EstatusId) != str(PresidenteEquipoEstatus.ACTIVO.value):
                            presidente.EstatusId = PresidenteEquipoEstatus.PAGO_EN_REVISION
                except Exception as e:
                    pass # Si falla actualización del estatus, que no rompa la subida.

                self.db.commit()

                return {
                    "mensaje": "Comprobante subido correctamente",
                    "orden_pago_id": orden_id
                }
        except Exception:
            self.db.rollback()
            raise pagos_excepciones.ComprobanteError()

    def obtener_seguros(self):
        seguros = pagos_repositorio.obtener_seguros_repo(self.db)
        return [SeguroBase.model_validate(seguro) for seguro in seguros]

    def obtener_afiliaciones(self):
        afiliaciones = pagos_repositorio.obtener_afiliaciones_repo(self.db)
        return [AfiliacionesBase.model_validate(afiliacion) for afiliacion in afiliaciones]

    def obtener_pagos_servicio(self):
        pagos = pagos_repositorio.obtener_pagos_repo(self.db)
        result = []
        for pago in pagos:
            data = {
                "OrdenPagoId": pago.OrdenPagoId,
                "UsuarioId": pago.UsuarioId,
                "Correo": pago.UsuarioPagoRelacion.Correo if pago.UsuarioPagoRelacion else None,
                "FechaDePago": pago.FechaDePago,
                "FechaEnvio": pago.FechaEnvio,
                "RutaVoucher": pago.RutaVoucher,
                "EstatusPagoId": pago.EstatusPagoId,
                "TotalPagar": pago.TotalPagar
            }
            result.append(ListaPagos(**data))
        return result

    def estatus_pago(self, orden_pago_id, estatus):
        orden = pagos_repositorio.estatus_pago_repo(self.db, orden_pago_id, estatus)

        return orden

    def orden_pago_individual(self, orden_pago_id):

        orden = pagos_repositorio.orden_pago_individual_repo(self.db, orden_pago_id)

        if not orden:
            raise pagos_excepciones.OrdenNoEncontradaError()
        
        return orden
    
    def mi_estado_pago(self, usuario_id):
        orden = pagos_repositorio.mi_estado_pago_repo(self.db, usuario_id)

        if not orden:
            return {"tiene_orden": False}

        return {
            "tiene_orden": True,
            "orden_pago_id": orden.OrdenPagoId,
            "estatus": orden.EstatusPagoId,
            "tiene_comprobante": bool(orden.RutaVoucher),
            "total": float(orden.TotalPagar) if orden.TotalPagar else 0
        }


    #VERIFICA SI HAY EQUIPOS VACIOS Y DISPONIBLES
    def mi_estado_pago_equipo(self, usuario_id, presidente_id=None):
        data = pagos_repositorio.mi_estado_pago_equipo_repo(self.db, usuario_id, presidente_id)

        if presidente_id:
            usuario_id = usuario_repositorio.obtener_usuario_por_presidente(self.db, presidente_id)
        equipo_temporal = data["equipo_temporal"]

        #CASO 1: HAY EQUIPO TEMPORAL DISPONIBLE
        if equipo_temporal:
            orden = data["orden"]
            cantidad_jugadores = 0
            seguros = []
            for detalle in orden.OrdenPagoDetalleRelacion:
                if detalle.TipoAfiliacionId == self.TIPO_AFILIACION_JUGADOR:
                    cantidad_jugadores = detalle.Cantidad
      
                if detalle.SeguroId:
                    seguros.append({
                        "SeguroId": detalle.SeguroId,
                        "Cantidad": detalle.Cantidad
                    })

            return {
                "estado": EstadoEquipo.LISTO_PARA_CREAR_EQUIPO,
                "equipo_temporal_id": equipo_temporal.EquipoTemporalId,
                "orden_pago_id": orden.OrdenPagoId,
                "total": float(orden.TotalPagar or 0),
                "cantidad_jugadores": cantidad_jugadores,
                "seguros": seguros
            }

        #CASO 2: NO HAY EQUIPO TEMPORAL DISPONIBLE, PASAR A FLUJO DE ORDEN
        if not equipo_temporal:
            #print("NO HAY EQUIPO TEMPORAL")
            tipo_solicitud = 2
            orden_pago = pagos_repositorio.buscar_orden_pago_repo(self.db, tipo_solicitud, usuario_id, None)
            #print("🎈🎈🎈🎈🎈PRESIDENTE ID: ")
            #print(presidente_id)

            if orden_pago:
                #print("SI HAY ORDEN🎈🎈🎈🎈")
                estatus = orden_pago.EstatusPagoId
                #print("ESTADO: ")
                #print(estatus)
                # HAY ORDEN, PERO ESTÁ COMO NO ENVIADO o RECHAZADO
                if estatus in (1, 4):
                    return {
                        "estado": EstadoEquipo.ORDEN_SIN_COMPROBANTE,
                        "orden_pago_id": orden_pago.OrdenPagoId,
                        "total": float(orden_pago.TotalPagar or 0)
                    }
                
                # HAY ORDEN, SE ENVÍO COMPROBANTE, EN ESPERA
                if estatus == 2:
                    return {
                        "estado": EstadoEquipo.COMPROBANTE_EN_REVISION,
                        "orden_pago_id": orden_pago.OrdenPagoId,
                        "total": float(orden_pago.TotalPagar or 0)
                    }
            

                # ACTIVO pero sin equipo temporal → inconsistencia
                if estatus == 3:
                    return {
                        "estado": EstadoEquipo.COMPROBANTE_EN_REVISION,
                        "warning": "Orden activa sin equipo temporal generado"
                    }
            else:
                print("No hubo orden")
        # fallback (por seguridad)
        return {
            "estado": EstadoEquipo.SIN_ORDEN
        }
