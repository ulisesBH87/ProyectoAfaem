import json
from datetime import datetime, time, timedelta
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
        "DEFAULT": {"tarifa_id": 2, "costo_unitario": 1.00, "divisa": "MXN"},
        "PHOTO SCAN": {"tarifa_id": 2, "costo_unitario": 1.00, "divisa": "MXN"}
    },
    "VERIFICAMEX": {
        "DEFAULT": {"tarifa_id": 3, "costo_unitario": 3.00, "divisa": "MXN"}
    }
}

class ConsumptionService:

    @staticmethod
    def _resolve_provider_candidates(tipo_consumo: str, proveedor: str | None) -> list[str]:
        provider = (proveedor or "DEFAULT").strip()
        candidates = [provider]

        if tipo_consumo == "PHOTO_SCAN":
            if provider.upper() == "DEFAULT":
                candidates.append("PHOTO SCAN")
            elif provider.upper() == "PHOTO SCAN":
                candidates.append("DEFAULT")

        # Preserva orden y elimina duplicados
        return list(dict.fromkeys(candidates))

    @staticmethod
    def _parse_fecha_inicio(fecha_inicio: str | None):
        if not fecha_inicio:
            return None
        try:
            return datetime.fromisoformat(fecha_inicio)
        except ValueError:
            return fecha_inicio

    @staticmethod
    def _parse_fecha_fin_inclusiva(fecha_fin: str | None):
        if not fecha_fin:
            return None
        try:
            fecha = datetime.fromisoformat(fecha_fin)
            if len(str(fecha_fin)) <= 10:
                return datetime.combine(fecha.date(), time.max)
            return fecha
        except ValueError:
            return fecha_fin

    @classmethod
    def obtener_tarifa(cls, db: Session, tipo_consumo: str, proveedor: str) -> dict:
        """
        Retorna la tarifa activa desde la base de datos (CatalogoTarifas).
        Si no se encuentra, recurre al fallback local de TARIFAS_DEFAULT.
        """
        provider_candidates = cls._resolve_provider_candidates(tipo_consumo, proveedor)
        for candidate in provider_candidates:
            tarifa_db = db.query(CatalogoTarifas).filter(
                CatalogoTarifas.TipoConsumo == tipo_consumo,
                CatalogoTarifas.Proveedor == candidate,
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
        tarifa = None
        for candidate in provider_candidates:
            tarifa = operacion.get(candidate)
            if tarifa:
                break
        if not tarifa:
            tarifa = operacion.get("DEFAULT")
        
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
            Metadata=json.dumps(payload.get("Metadata", {})),
            JugadorPersonaId=payload.get("JugadorPersonaId"),
            JugadorNombre=payload.get("JugadorNombre"),
            JugadorCURP=payload.get("JugadorCURP"),
            EquipoId=payload.get("EquipoId"),
            LigaId=payload.get("LigaId")
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
        fecha_inicio_dt = ConsumptionService._parse_fecha_inicio(fecha_inicio)
        fecha_fin_dt = ConsumptionService._parse_fecha_fin_inclusiva(fecha_fin)
        
        if fecha_inicio_dt:
            query = query.filter(BitacoraConsumo.CreadoEn >= fecha_inicio_dt)
        if fecha_fin_dt:
            query = query.filter(BitacoraConsumo.CreadoEn <= fecha_fin_dt)
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
                provider_candidates = ConsumptionService._resolve_provider_candidates(r.TipoConsumo, r.Proveedor)
                t_fallback = None
                for candidate in provider_candidates:
                    t_fallback = operacion.get(candidate)
                    if t_fallback:
                        break
                if not t_fallback:
                    t_fallback = operacion.get("DEFAULT", {"divisa": "MXN"})
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

    @classmethod
    def asociar_consumos_pendientes(cls, db: Session, target_persona_id: int, target_nombre: str, target_curp: str, usuario_id: int = None, guest_id: str = None, session_id: str = None, equipo_id: int = None, liga_id: int = None, slot_id: str = None, borrador_id: str = None):
        """
        Asocia los consumos de la sesión/usuario o borrador/slot que aún no tienen asignado un jugador/directivo
        con la persona recién registrada.
        """
        from app.modelos.consumo_modelos import BitacoraConsumo, ConsumoOutbox
        from sqlalchemy import or_
        import json
        
        # 1. Intentar procesar outbox pendiente primero
        try:
            from app.servicios.consumo_worker import procesar_outbox_pending
            procesar_outbox_pending()
        except Exception as o_exc:
            print(f"[CONSUMO ERROR] No se pudo procesar outbox antes de asociar: {o_exc}")

        # 2. Actualizar payloads en la cola de Outbox por si algún evento quedó pendiente
        try:
            eventos_pendientes = db.query(ConsumoOutbox).filter(ConsumoOutbox.Estado == "PENDIENTE").all()
            for ev in eventos_pendientes:
                try:
                    payload = json.loads(ev.Payload)
                    match = False
                    if slot_id and payload.get("EntityType") == "SLOT_JUGADOR" and str(payload.get("EntityId")) == str(slot_id):
                        match = True
                    elif borrador_id and payload.get("EntityType") == "BORRADOR_PRESIDENTE" and str(payload.get("EntityId")) == str(borrador_id):
                        match = True
                    elif usuario_id and payload.get("UsuarioId") == usuario_id:
                        match = True
                    elif guest_id and payload.get("GuestId") == guest_id:
                        match = True
                    elif session_id and payload.get("SessionId") == session_id:
                        match = True
                        
                    if match:
                        payload["JugadorPersonaId"] = target_persona_id
                        payload["JugadorNombre"] = target_nombre.upper() if target_nombre else None
                        payload["JugadorCURP"] = target_curp.upper() if target_curp else None
                        if equipo_id:
                            payload["EquipoId"] = equipo_id
                        if liga_id:
                            payload["LigaId"] = liga_id
                        ev.Payload = json.dumps(payload, ensure_ascii=False)
                except Exception as parse_exc:
                    print(f"[CONSUMO ERROR] Error parseando payload de outbox id={ev.Id}: {parse_exc}")
        except Exception as outbox_update_exc:
            print(f"[CONSUMO ERROR] Error al actualizar payloads de outbox: {outbox_update_exc}")

        # 3. Actualizar registros existentes en BitacoraConsumo
        limite = datetime.utcnow() - timedelta(days=7)
        
        query = db.query(BitacoraConsumo).filter(
            BitacoraConsumo.JugadorPersonaId.is_(None),
            BitacoraConsumo.CreadoEn >= limite
        )
        
        condiciones = []
        if slot_id:
            condiciones.append(
                (BitacoraConsumo.EntityType == "SLOT_JUGADOR") & 
                (BitacoraConsumo.EntityId == str(slot_id))
            )
        if borrador_id:
            condiciones.append(
                (BitacoraConsumo.EntityType == "BORRADOR_PRESIDENTE") & 
                (BitacoraConsumo.EntityId == str(borrador_id))
            )
            
        if usuario_id:
            condiciones.append(BitacoraConsumo.UsuarioId == usuario_id)
        if guest_id:
            condiciones.append(BitacoraConsumo.GuestId == guest_id)
        if session_id:
            condiciones.append(BitacoraConsumo.SessionId == session_id)
            
        if not condiciones:
            return
            
        query = query.filter(or_(*condiciones))
        consumos_pendientes = query.all()
        
        for c in consumos_pendientes:
            c.JugadorPersonaId = target_persona_id
            c.JugadorNombre = target_nombre.upper() if target_nombre else None
            c.JugadorCURP = target_curp.upper() if target_curp else None
            if equipo_id:
                c.EquipoId = equipo_id
            if liga_id:
                c.LigaId = liga_id
        db.flush()

    @classmethod
    def obtener_auditoria_consumos(cls, db: Session, fecha_inicio: str = None, fecha_fin: str = None) -> dict:
        """
        Retorna el desglose de auditoría detallado agrupado por Jugador/Ejecutor, Equipo y Liga.
        """
        from app.modelos.usuario_modelo import Usuario
        from app.modelos.roles_modelo import Roles
        from app.modelos.equipo_modelo import Equipos
        from app.modelos.catalogos_liga_modelo import Ligas
        
        # Mapeo de UsuarioId -> {"nombre": str, "rol": str}
        usuarios_db = db.query(Usuario).all()
        usuarios_map = {}
        for u in usuarios_db:
            nombre_usr = "SISTEMA / INVITADO"
            rol_usr = "INVITADO"
            if u.PersonaRelacion:
                p = u.PersonaRelacion
                nombre_usr = f"{p.Nombre} {p.PrimerApellido} {p.SegundoApellido or ''}".strip().upper()
            if u.RolRelacion:
                rol_usr = u.RolRelacion.Nombre.upper()
            usuarios_map[u.UsuarioId] = {"nombre": nombre_usr, "rol": rol_usr}
            
        # Mapeo de EquipoId -> Nombre
        equipos_db = db.query(Equipos).all()
        equipos_map = {e.EquipoId: e.NombreEquipo.upper() for e in equipos_db}
        
        # Mapeo de LigaId -> Nombre
        ligas_db = db.query(Ligas).all()
        ligas_map = {l.LigaId: l.Nombreliga.upper() for l in ligas_db}
        
        # Consultar registros del Ledger
        query = db.query(BitacoraConsumo)
        fecha_inicio_dt = cls._parse_fecha_inicio(fecha_inicio)
        fecha_fin_dt = cls._parse_fecha_fin_inclusiva(fecha_fin)
        if fecha_inicio_dt:
            query = query.filter(BitacoraConsumo.CreadoEn >= fecha_inicio_dt)
        if fecha_fin_dt:
            query = query.filter(BitacoraConsumo.CreadoEn <= fecha_fin_dt)
            
        registros = query.all()
        
        desglose_jugadores = {}
        desglose_directivos = {}
        desglose_equipos = {}
        desglose_ligas = {}
        
        for r in registros:
            usr_info = usuarios_map.get(r.UsuarioId, {"nombre": "INVITADO", "rol": "INVITADO"})
            ejecutor_nombre = usr_info["nombre"]
            ejecutor_rol = usr_info["rol"]
            
            jug_nombre = r.JugadorNombre or "SIN NOMBRE (EN OCR)"
            jug_curp = r.JugadorCURP or "SIN CURP"
            
            eq_id = r.EquipoId
            eq_nombre = equipos_map.get(eq_id, "PRE-REGISTRO / SIN EQUIPO") if eq_id else "PRE-REGISTRO / SIN EQUIPO"
            
            lg_id = r.LigaId
            lg_nombre = ligas_map.get(lg_id, "SIN LIGA") if lg_id else "SIN LIGA"
            
            costo = float(r.CostoTotal)
            costo_usd = costo if r.Divisa == "USD" else 0.0
            costo_mxn = costo if r.Divisa == "MXN" else 0.0
            
            # Clasificar y agrupar por Jugador o Directivo
            if r.TipoRegistro in ("PRESIDENTE", "ENTRENADOR"):
                # A.2) Agrupación por Directivo (Presidente/Entrenador)
                dir_key = (r.UsuarioId, jug_nombre, jug_curp, eq_id, lg_id, r.TipoRegistro)
                if dir_key not in desglose_directivos:
                    desglose_directivos[dir_key] = {
                        "ejecutor_nombre": ejecutor_nombre,
                        "ejecutor_rol": ejecutor_rol,
                        "directivo_nombre": jug_nombre,
                        "directivo_curp": jug_curp,
                        "directivo_rol": r.TipoRegistro,
                        "equipo_nombre": eq_nombre,
                        "liga_nombre": lg_nombre,
                        "ocr_count": 0,
                        "foto_count": 0,
                        "verificamex_count": 0,
                        "costo_total_usd": 0.0,
                        "costo_total_mxn": 0.0
                    }
                
                item_dir = desglose_directivos[dir_key]
                if r.TipoConsumo == "OCR":
                    item_dir["ocr_count"] += 1
                elif r.TipoConsumo == "PHOTO_SCAN":
                    item_dir["foto_count"] += 1
                elif r.TipoConsumo == "VERIFICAMEX":
                    item_dir["verificamex_count"] += 1
                    
                item_dir["costo_total_usd"] += costo_usd
                item_dir["costo_total_mxn"] += costo_mxn
            else:
                # A.1) Agrupación por Jugador
                jug_key = (r.UsuarioId, jug_nombre, jug_curp, eq_id, lg_id)
                if jug_key not in desglose_jugadores:
                    desglose_jugadores[jug_key] = {
                        "ejecutor_nombre": ejecutor_nombre,
                        "ejecutor_rol": ejecutor_rol,
                        "jugador_nombre": jug_nombre,
                        "jugador_curp": jug_curp,
                        "equipo_nombre": eq_nombre,
                        "liga_nombre": lg_nombre,
                        "ocr_count": 0,
                        "foto_count": 0,
                        "verificamex_count": 0,
                        "costo_total_usd": 0.0,
                        "costo_total_mxn": 0.0
                    }
                
                item_jug = desglose_jugadores[jug_key]
                if r.TipoConsumo == "OCR":
                    item_jug["ocr_count"] += 1
                elif r.TipoConsumo == "PHOTO_SCAN":
                    item_jug["foto_count"] += 1
                elif r.TipoConsumo == "VERIFICAMEX":
                    item_jug["verificamex_count"] += 1
                    
                item_jug["costo_total_usd"] += costo_usd
                item_jug["costo_total_mxn"] += costo_mxn
            
            # B) Agrupación por Equipo
            if eq_id:
                if eq_id not in desglose_equipos:
                    desglose_equipos[eq_id] = {
                        "equipo_id": eq_id,
                        "equipo_nombre": eq_nombre,
                        "liga_nombre": lg_nombre,
                        "ocr_count": 0,
                        "foto_count": 0,
                        "verificamex_count": 0,
                        "costo_total_usd": 0.0,
                        "costo_total_mxn": 0.0
                    }
                item_eq = desglose_equipos[eq_id]
                if r.TipoConsumo == "OCR":
                    item_eq["ocr_count"] += 1
                elif r.TipoConsumo == "PHOTO_SCAN":
                    item_eq["foto_count"] += 1
                elif r.TipoConsumo == "VERIFICAMEX":
                    item_eq["verificamex_count"] += 1
                item_eq["costo_total_usd"] += costo_usd
                item_eq["costo_total_mxn"] += costo_mxn
                
            # C) Agrupación por Liga
            if lg_id:
                if lg_id not in desglose_ligas:
                    desglose_ligas[lg_id] = {
                        "liga_id": lg_id,
                        "liga_nombre": lg_nombre,
                        "ocr_count": 0,
                        "foto_count": 0,
                        "verificamex_count": 0,
                        "costo_total_usd": 0.0,
                        "costo_total_mxn": 0.0
                    }
                item_lg = desglose_ligas[lg_id]
                if r.TipoConsumo == "OCR":
                    item_lg["ocr_count"] += 1
                elif r.TipoConsumo == "PHOTO_SCAN":
                    item_lg["foto_count"] += 1
                elif r.TipoConsumo == "VERIFICAMEX":
                    item_lg["verificamex_count"] += 1
                item_lg["costo_total_usd"] += costo_usd
                item_lg["costo_total_mxn"] += costo_mxn
                
        return {
            "desglose_jugadores": list(desglose_jugadores.values()),
            "desglose_directivos": list(desglose_directivos.values()),
            "desglose_equipos": list(desglose_equipos.values()),
            "desglose_ligas": list(desglose_ligas.values())
        }

    @classmethod
    def obtener_tarifas(cls, db: Session) -> list:
        """
        Retorna la lista de todas las tarifas registradas en la base de datos.
        Si la tabla está vacía, se realiza un sembrado (seeding) inicial con las tarifas de fallback.
        """
        tarifas = db.query(CatalogoTarifas).all()
        if not tarifas:
            # Sembrado inicial
            tarifas_sembrado = [
                CatalogoTarifas(TipoConsumo="OCR", Proveedor="DEFAULT", CostoUnitario=0.0015, Divisa="USD", Descripcion="Servicio de reconocimiento óptico de caracteres para documentos de identidad (INE, Pasaporte).", Estatus=True),
                CatalogoTarifas(TipoConsumo="PHOTO_SCAN", Proveedor="PHOTO SCAN", CostoUnitario=1.00, Divisa="MXN", Descripcion="Servicio de validación y escaneo de fotografía de perfil / rostro.", Estatus=True),
                CatalogoTarifas(TipoConsumo="VERIFICAMEX", Proveedor="DEFAULT", CostoUnitario=3.00, Divisa="MXN", Descripcion="Servicio de verificación de CURP y datos oficiales.", Estatus=True)
            ]
            db.add_all(tarifas_sembrado)
            db.commit()
            tarifas = db.query(CatalogoTarifas).all()
        return tarifas

    @classmethod
    def actualizar_tarifa(cls, db: Session, tarifa_id: int, payload: dict) -> CatalogoTarifas:
        """
        Actualiza una tarifa existente en la base de datos.
        """
        tarifa = db.query(CatalogoTarifas).filter(CatalogoTarifas.TarifaId == tarifa_id).first()
        if not tarifa:
            return None
        
        if "CostoUnitario" in payload:
            tarifa.CostoUnitario = payload["CostoUnitario"]
        if "Divisa" in payload:
            tarifa.Divisa = payload["Divisa"]
        if "Descripcion" in payload:
            tarifa.Descripcion = payload["Descripcion"]
        if "Estatus" in payload:
            tarifa.Estatus = payload["Estatus"]
            
        db.commit()
        db.refresh(tarifa)
        return tarifa

