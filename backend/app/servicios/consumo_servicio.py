import json
from datetime import datetime
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy.sql import text
from app.modelos.consumo_modelos import BitacoraConsumo, ConsumoOutbox, ResumenConsumoDiario, CatalogoTarifas

# Configuración por defecto de tarifas para fallback
TARIFAS_DEFAULT = {
    "OCR": {
        "DEFAULT": {"tarifa_id": 1, "costo_unitario": 0.0015, "divisa": "USD"}
    },
    "PHOTO_SCAN": {
        "DEFAULT": {"tarifa_id": 2, "costo_unitario": 1.00, "divisa": "MXN"}
    },
    "VERIFICAMEX": {
        "DEFAULT": {"tarifa_id": 3, "costo_unitario": 3.00, "divisa": "MXN"}
    }
}

class ConsumptionService:

    @classmethod
    def obtener_tarifa(cls, db: Session, tipo_consumo: str, proveedor: str) -> dict:
        """
        Retorna la tarifa activa desde la base de datos (CatalogoTarifas).
        Si no se encuentra, recurre al fallback local de TARIFAS_DEFAULT.
        """
        tarifa_db = db.query(CatalogoTarifas).filter(
            CatalogoTarifas.TipoConsumo == tipo_consumo,
            CatalogoTarifas.Proveedor == proveedor,
            CatalogoTarifas.Estatus == True
        ).first()

        if tarifa_db:
            return {
                "tarifa_id": tarifa_db.TarifaId,
                "costo_unitario": float(tarifa_db.CostoUnitario),
                "divisa": tarifa_db.Divisa
            }

        # Fallback local
        operacion = TARIFAS_DEFAULT.get(tipo_consumo, {})
        tarifa = operacion.get(proveedor, operacion.get("DEFAULT"))
        
        if not tarifa:
            return {"tarifa_id": 99, "costo_unitario": 0.00, "divisa": "MXN"}
            
        return tarifa

    @classmethod
    def registrar_consumo_ledger(cls, db: Session, payload: dict) -> BitacoraConsumo:
        """
        Registra de manera definitiva un consumo en el Ledger (BitacoraConsumo).
        """
        # Calcular cobrabilidad
        es_cobrable = payload.get("EsCobrable", True)
        tipo_consumo = payload.get("TipoConsumo")
        proveedor = payload.get("Proveedor")
        
        tarifa = cls.obtener_tarifa(db, tipo_consumo, proveedor)
        costo_unitario = tarifa["costo_unitario"]
        costo_total = costo_unitario if es_cobrable else 0.00
        
        # Crear la fila del Ledger
        nuevo_consumo = BitacoraConsumo(
            RequestId=payload.get("RequestId"),
            UsuarioId=payload.get("UsuarioId"),
            GuestId=payload.get("GuestId"),
            SessionId=payload.get("SessionId"),
            TenantId=payload.get("TenantId"),
            TarifaId=tarifa["tarifa_id"],
            TipoUsuario=payload.get("TipoUsuario", "INVITADO"),
            TipoConsumo=tipo_consumo,
            Proveedor=proveedor,
            TipoRegistro=payload.get("TipoRegistro"),
            EntityType=payload.get("EntityType"),
            EntityId=payload.get("EntityId"),
            EstadoTecnico=payload.get("EstadoTecnico"),
            ResultadoProveedor=payload.get("ResultadoProveedor"),
            EsCobrable=es_cobrable,
            CostoUnitario=costo_unitario,
            CostoTotal=costo_total,
            Divisa=tarifa["divisa"],
            LlaveIdempotencia=payload.get("LlaveIdempotencia"),
            Metadata=json.dumps(payload.get("Metadata", {}))
        )
        
        db.add(nuevo_consumo)
        db.flush() # Genera el ID y ejecuta validaciones de BDD
        
        # Sincronizar con el resumen diario
        cls.actualizar_resumen(
            db=db,
            fecha=datetime.now().date(),
            usuario_id=nuevo_consumo.UsuarioId,
            guest_id=nuevo_consumo.GuestId,
            tenant_id=nuevo_consumo.TenantId,
            tipo_consumo=nuevo_consumo.TipoConsumo,
            proveedor=nuevo_consumo.Proveedor,
            tipo_registro=nuevo_consumo.TipoRegistro,
            es_cobrable=nuevo_consumo.EsCobrable,
            cantidad=1,
            costo=float(nuevo_consumo.CostoTotal)
        )
        
        return nuevo_consumo

    @staticmethod
    def publicar_outbox(db: Session, payload: dict):
        """
        Publica el evento de consumo en la tabla de Outbox en la transacción activa.
        """
        outbox_row = ConsumoOutbox(
            Payload=json.dumps(payload),
            Estado="PENDIENTE",
            Intentos=0
        )
        db.add(outbox_row)
        db.flush()

    @staticmethod
    def actualizar_resumen(
        db: Session,
        fecha,
        usuario_id: int | None,
        guest_id: str | None,
        tenant_id: int | None,
        tipo_consumo: str,
        proveedor: str,
        tipo_registro: str,
        es_cobrable: bool,
        cantidad: int,
        costo: float
    ):
        """
        Ejecuta un MERGE atómico en MS SQL Server para actualizar el resumen de consumos.
        """
        query = text("""
            MERGE ResumenConsumoDiario AS target
            USING (
                SELECT 
                    :fecha AS Fecha, 
                    :usuario_id AS UsuarioId, 
                    :guest_id AS GuestId, 
                    :tenant_id AS TenantId, 
                    :tipo_consumo AS TipoConsumo, 
                    :proveedor AS Proveedor, 
                    :tipo_registro AS TipoRegistro, 
                    :es_cobrable AS EsCobrable
            ) AS source
            ON (
                target.Fecha = source.Fecha 
                AND (target.UsuarioId = source.UsuarioId OR (target.UsuarioId IS NULL AND source.UsuarioId IS NULL))
                AND (target.GuestId = source.GuestId OR (target.GuestId IS NULL AND source.GuestId IS NULL))
                AND (target.TenantId = source.TenantId OR (target.TenantId IS NULL AND source.TenantId IS NULL))
                AND target.TipoConsumo = source.TipoConsumo 
                AND target.Proveedor = source.Proveedor 
                AND target.TipoRegistro = source.TipoRegistro 
                AND target.EsCobrable = source.EsCobrable
            )
            WHEN MATCHED THEN
                UPDATE SET 
                    target.CantidadOperaciones = target.CantidadOperaciones + :cantidad,
                    target.CostoAcumulado = target.CostoAcumulado + :costo
            WHEN NOT MATCHED THEN
                INSERT (Fecha, UsuarioId, GuestId, TenantId, TipoConsumo, Proveedor, TipoRegistro, EsCobrable, CantidadOperaciones, CostoAcumulado)
                VALUES (source.Fecha, source.UsuarioId, source.GuestId, source.TenantId, source.TipoConsumo, source.Proveedor, source.TipoRegistro, source.EsCobrable, :cantidad, :costo);
        """)
        
        db.execute(query, {
            "fecha": fecha,
            "usuario_id": usuario_id,
            "guest_id": guest_id,
            "tenant_id": tenant_id,
            "tipo_consumo": tipo_consumo,
            "proveedor": proveedor,
            "tipo_registro": tipo_registro,
            "es_cobrable": 1 if es_cobrable else 0,
            "cantidad": cantidad,
            "costo": costo
        })

    @staticmethod
    def listar_ledger(
        db: Session,
        page: int = 1,
        size: int = 10,
        fecha_inicio: str = None,
        fecha_fin: str = None,
        usuario_id: int = None,
        guest_id: str = None,
        tipo_consumo: str = None,
        tipo_registro: str = None,
        estado_tecnico: str = None,
        es_cobrable: bool = None
    ) -> dict:
        query = db.query(BitacoraConsumo)
        
        if fecha_inicio:
            query = query.filter(BitacoraConsumo.CreadoEn >= fecha_inicio)
        if fecha_fin:
            query = query.filter(BitacoraConsumo.CreadoEn <= fecha_fin)
        if usuario_id is not None:
            query = query.filter(BitacoraConsumo.UsuarioId == usuario_id)
        if guest_id:
            query = query.filter(BitacoraConsumo.GuestId == guest_id)
        if tipo_consumo:
            query = query.filter(BitacoraConsumo.TipoConsumo == tipo_consumo)
        if tipo_registro:
            query = query.filter(BitacoraConsumo.TipoRegistro == tipo_registro)
        if estado_tecnico:
            query = query.filter(BitacoraConsumo.EstadoTecnico == estado_tecnico)
        if es_cobrable is not None:
            query = query.filter(BitacoraConsumo.EsCobrable == es_cobrable)
            
        total = query.count()
        offset = (page - 1) * size
        data = query.order_by(BitacoraConsumo.CreadoEn.desc()).offset(offset).limit(size).all()
        
        return {
            "total": total,
            "page": page,
            "size": size,
            "data": data
        }

    @staticmethod
    def obtener_resumen_dashboard(
        db: Session,
        fecha_inicio: str = None,
        fecha_fin: str = None,
        usuario_id: int = None,
        tenant_id: int = None
    ) -> dict:
        query = db.query(ResumenConsumoDiario)
        
        if fecha_inicio:
            query = query.filter(ResumenConsumoDiario.Fecha >= fecha_inicio)
        if fecha_fin:
            query = query.filter(ResumenConsumoDiario.Fecha <= fecha_fin)
        if usuario_id is not None:
            query = query.filter(ResumenConsumoDiario.UsuarioId == usuario_id)
        if tenant_id is not None:
            query = query.filter(ResumenConsumoDiario.TenantId == tenant_id)
            
        resumenes = query.all()
        
        # Obtener tarifas activas de la base de datos
        tarifas_db = db.query(CatalogoTarifas).filter(CatalogoTarifas.Estatus == True).all()
        tarifas_map = {
            f"{t.TipoConsumo}_{t.Proveedor}": {
                "costo_unitario": float(t.CostoUnitario),
                "divisa": t.Divisa
            }
            for t in tarifas_db
        }
        
        total_operaciones = sum(r.CantidadOperaciones for r in resumenes)
        costo_total_usd = 0.0
        costo_total_mxn = 0.0
        
        por_proveedor_usd = {}
        por_proveedor_mxn = {}
        
        por_operacion = {}
        por_registro = {}
        operaciones_por_servicio = {}
        
        for r in resumenes:
            # Determinar divisa
            tarifa = tarifas_map.get(f"{r.TipoConsumo}_{r.Proveedor}")
            divisa = "MXN"
            if tarifa:
                divisa = tarifa["divisa"]
            else:
                # Fallback local
                from app.servicios.consumo_servicio import TARIFAS_DEFAULT
                operacion = TARIFAS_DEFAULT.get(r.TipoConsumo, {})
                t_fallback = operacion.get(r.Proveedor, operacion.get("DEFAULT", {"divisa": "MXN"}))
                divisa = t_fallback["divisa"]
            
            costo_val = float(r.CostoAcumulado)
            if divisa == "USD":
                costo_total_usd += costo_val
                por_proveedor_usd[r.Proveedor] = por_proveedor_usd.get(r.Proveedor, 0.0) + costo_val
            else:
                costo_total_mxn += costo_val
                por_proveedor_mxn[r.Proveedor] = por_proveedor_mxn.get(r.Proveedor, 0.0) + costo_val
                
            por_operacion[r.TipoConsumo] = por_operacion.get(r.TipoConsumo, 0.0) + costo_val
            por_registro[r.TipoRegistro] = por_registro.get(r.TipoRegistro, 0) + r.CantidadOperaciones
            operaciones_por_servicio[r.TipoConsumo] = operaciones_por_servicio.get(r.TipoConsumo, 0) + r.CantidadOperaciones
            
        tarifas_list = [
            {
                "tipo_consumo": t.TipoConsumo,
                "proveedor": t.Proveedor,
                "costo_unitario": float(t.CostoUnitario),
                "divisa": t.Divisa,
                "descripcion": t.Descripcion
            }
            for t in tarifas_db
        ]
            
        return {
            "total_operaciones": total_operaciones,
            "costo_total_usd": costo_total_usd,
            "costo_total_mxn": costo_total_mxn,
            "costo_por_proveedor_usd": por_proveedor_usd,
            "costo_por_proveedor_mxn": por_proveedor_mxn,
            "costo_por_operacion": por_operacion,
            "operaciones_por_registro": por_registro,
            "operaciones_por_servicio": operaciones_por_servicio,
            "tarifas": tarifas_list,
            "data": resumenes
        }
