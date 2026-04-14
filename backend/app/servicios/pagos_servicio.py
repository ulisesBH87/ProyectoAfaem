from sqlalchemy.orm import Session
import os
from datetime import date

from app.esquemas.pago_esquema import SeguroBase, AfiliacionesBase, ListaPagos
from app.repositorios import pagos_repositorio
from app.excepciones import pagos_excepciones

class PagosServicio:

    TIPO_AFILIACION_PRESIDENTE = 2
    TIPO_AFILIACION_JUGADOR = 4
    UPLOAD_DIR = "uploads/vouchers"

    def __init__(self, db:Session):
        self.db = db

    def crear_orden_pago(self, usuario_id, orden):
        if orden.CantidadJugadores < 1:
            raise pagos_excepciones.CantidadJugadoresError()
        
        total_personas = orden.CantidadJugadores + 1
        total_seguros = sum(s.Cantidad for s in orden.Seguros)
        
        if total_seguros != total_personas:
            raise pagos_excepciones.CantidadSegurosPersonasError()
        
        try:
            detalles = []
            total = 0
            
            #PRESIDENTE
            
            afiliacion_presidente = pagos_repositorio.obtener_tipo_afiliacion_repo(self.db, self.TIPO_AFILIACION_PRESIDENTE)

            if not afiliacion_presidente:
                raise pagos_excepciones.PagoInvalidoError()
        
            subtotal = afiliacion_presidente.CostoActual * 1
            
            detalles.append({
                "tipo_concepto": 1,
                "tipo_afiliacion_id": self.TIPO_AFILIACION_PRESIDENTE,
                "seguro_id": None,
                "cantidad": 1,
                "precio": afiliacion_presidente.CostoActual,
                "subtotal": subtotal
            })
            
            total += subtotal
            
            #JUGADORES
            afiliacion_jugador = pagos_repositorio.obtener_tipo_afiliacion_repo(self.db, self.TIPO_AFILIACION_JUGADOR)
            if not afiliacion_jugador:
                raise pagos_excepciones.PagoInvalidoError()

            subtotal = afiliacion_jugador.CostoActual * orden.CantidadJugadores
            
            detalles.append({
                "tipo_concepto": 1,
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
                    raise pagos_excepciones.SeguroNoExiste(f"Seguro {s.SeguroId} no existe")
                
                subtotal = seguro.Precio * s.Cantidad
                
                detalles.append({
                    "tipo_concepto": 2,
                    "tipo_afiliacion_id": None,
                    "seguro_id": seguro.SeguroId,
                    "cantidad": s.Cantidad,
                    "precio": seguro.Precio,
                    "subtotal": subtotal
                })
                
                total += subtotal
                
            orden_pago = pagos_repositorio.crear_orden_pago_repo(self.db, usuario_id, total)
                
            for d in detalles:
                pagos_repositorio.crear_detalle_pago_repo(db=self.db, orden_pago_id=orden_pago.OrdenPagoId, detalle=d)


            try:        
                pagos_repositorio.crear_presidente_equipo_repo(self.db, usuario_id)
                self.db.commit()
            except Exception:
                self.db.rollback()
                raise pagos_excepciones.UsuarioNoEncontradoError()

                
            return {
                "orden_pago_id": orden_pago.OrdenPagoId,
                "total": total
            }
    
        except Exception:
            self.db.rollback()
            raise pagos_excepciones.PagoInvalidoError()
        
        
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
                        if presidente:
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
        response = pagos_repositorio.estatus_pago_repo(self.db, orden_pago_id, estatus)

        return response

    def orden_pago_individual(self, orden_pago_id):

        orden = pagos_repositorio.orden_pago_individual_repo(self.db, orden_pago_id)

        if not orden:
            raise pagos_excepciones.OrdenNoEncontradaError()
        
        return orden
    
    def mi_estado_pago(self, usuario_id):
        orden = pagos_repositorio.mi_estado_pago_repo(self.db, usuario_id)

        if not orden:
            return None

        return {
            "tiene_orden": True,
            "orden_pago_id": orden.OrdenPagoId,
            "estatus": orden.EstatusPagoId,
            "tiene_comprobante": bool(orden.RutaVoucher),
            "total": float(orden.TotalPagar) if orden.TotalPagar else 0
        }