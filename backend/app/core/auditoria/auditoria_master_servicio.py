import json
import time
from datetime import datetime, timezone, date
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_, or_, cast, Date
from app.modelos.auditoria import Auditoria
from app.modelos.usuario_modelo import Usuario
from app.modelos.persona_modelo import Personas
from app.modelos.catalogo_accion import CatalogoAccion
from app.modelos.presidente_equipo_modelo import PresidenteEquipo
from app.modelos.ordenes_pago_modelo import OrdenPago
from app.modelos.solicitud_modelo import Solicitud
from app.modelos.documentos_entregados_modelo import DocumentosEntregados

# Mapeos legibles para el frontend
MAPEO_ENTIDADES = {
    "Personas": "Persona",
    "Usuarios": "Usuario",
    "Equipos": "Equipo",
    "MiembrosEquipo": "Miembro de Equipo",
    "Ligas": "Liga",
    "PresidenteInvitacion": "Invitación de Presidente"
}

MAPEO_ACCIONES = {
    "CREATE": "creado",
    "UPDATE": "actualizado",
    "DELETE": "eliminado",
    "READ": "consultado"
}

def safe_json_load(value):
    try:
        return json.loads(value) if value else {}
    except Exception:
        return {}

def construir_cambios(antes, despues):
    cambios = []
    for campo in despues:
        cambios.append({
            "campo": campo,
            "antes": antes.get(campo),
            "despues": despues.get(campo)
        })
    return cambios

def construir_resumen(entidad, antes, despues, accion):
    fuente = despues if accion == "CREATE" else antes
    if entidad == "Personas":
        nombre_antes = f"{antes.get('Nombre', '')} {antes.get('PrimerApellido', '')}".strip()
        nombre_despues = f"{despues.get('Nombre', '')} {despues.get('PrimerApellido', '')}".strip()
        if accion == "UPDATE":
            return f"{nombre_antes} → {nombre_despues}"
        return nombre_despues
    elif entidad == "Equipos":
        return despues.get("NombreEquipo") or antes.get("NombreEquipo") or ""
    elif entidad == "Usuarios":
        return despues.get("Correo") or antes.get("Correo") or ""
    return ""

def construir_descripcion(auditoria, usuario_nombre, antes, despues):
    accion = auditoria.CatalogoAccion.Accion
    entidad = auditoria.EntidadAfectada
    fuente = despues if accion == "CREATE" else antes
    nombre = ""

    if entidad == "Personas":
        nombre = f"{fuente.get('Nombre', '')} {fuente.get('PrimerApellido', '')}".strip()
        if not nombre:
            nombre = f"{despues.get('Nombre', '')} {despues.get('PrimerApellido', '')}".strip()
    elif entidad == "Equipos":
        nombre = fuente.get("NombreEquipo", "") or despues.get("NombreEquipo", "")
    elif entidad == "Usuarios":
        correo = fuente.get("Correo", "")
        if not correo:
            correo = despues.get("Correo", "")
        nombre = correo

    if accion == "CREATE":
        return f"{usuario_nombre} creó {entidad} {nombre}".strip()
    elif accion == "UPDATE":
        cambios = []
        for campo in despues:
            valor_antes = antes.get(campo)
            valor_despues = despues.get(campo)
            cambios.append(f"{campo}: '{valor_antes}' → '{valor_despues}'")
        detalle = ", ".join(cambios)
        return f"{usuario_nombre} editó {entidad} {nombre} ({detalle})".strip()
    elif accion == "DELETE":
        return f"{usuario_nombre} eliminó {entidad} {nombre}".strip()
    elif accion == "READ":
        return f"{usuario_nombre} consultó {entidad} {nombre or auditoria.ObservacionesAuditoria or ''}".strip()
    
    return "Acción realizada"

def obtener_auditorias_master(
    db: Session,
    page: int,
    size: int,
    fecha_inicio: str = None,
    fecha_fin: str = None,
    usuario: str = None,
    accion: str = None,
    entidad: str = None,
    ip: str = None
):
    t0 = time.perf_counter()
    filtros_aplicados = []
    
    query = db.query(Auditoria).join(CatalogoAccion)
    
    if fecha_inicio:
        try:
            fi = datetime.fromisoformat(fecha_inicio)
            query = query.filter(Auditoria.FechaAccion >= fi)
            filtros_aplicados.append(f"fecha_inicio: {fecha_inicio}")
        except ValueError:
            pass
            
    if fecha_fin:
        try:
            ff = datetime.fromisoformat(fecha_fin)
            query = query.filter(Auditoria.FechaAccion <= ff)
            filtros_aplicados.append(f"fecha_fin: {fecha_fin}")
        except ValueError:
            pass
            
    if usuario:
        query = query.filter(Auditoria.UsuarioNombre.ilike(f"%{usuario}%"))
        filtros_aplicados.append(f"usuario: {usuario}")
        
    if accion:
        query = query.filter(CatalogoAccion.Accion == accion)
        filtros_aplicados.append(f"accion: {accion}")
        
    if entidad:
        query = query.filter(Auditoria.EntidadAfectada == entidad)
        filtros_aplicados.append(f"entidad: {entidad}")
        
    if ip:
        query = query.filter(Auditoria.Ip.ilike(f"%{ip}%"))
        filtros_aplicados.append(f"ip: {ip}")

    # Conteo
    total = query.count()
    offset = (page - 1) * size
    
    # Registros
    auditorias = (
        query.order_by(Auditoria.FechaAccion.desc())
        .offset(offset)
        .limit(size)
        .all()
    )
    
    entidades_detectadas = set()
    resultado = []
    for a in auditorias:
        fecha = a.FechaAccion
        if fecha.tzinfo is None:
            fecha = fecha.astimezone()
            
        entidades_detectadas.add(a.EntidadAfectada)
        nombre_completo = a.UsuarioNombre or "SYSTEM"
        antes = safe_json_load(a.ValoresAntes)
        despues = safe_json_load(a.ValoresDespues)
        
        if despues:
            despues.pop("PersonaId", None)
            
        descripcion = construir_descripcion(a, nombre_completo, antes, despues)
        entidad_legible = MAPEO_ENTIDADES.get(a.EntidadAfectada, a.EntidadAfectada)
        cambios = construir_cambios(antes, despues) if a.CatalogoAccion.Accion == "UPDATE" else []
        resumen = construir_resumen(a.EntidadAfectada, antes, despues, a.CatalogoAccion.Accion)
        
        resultado.append({
            "AuditoriaId": a.AuditoriaId,
            "titulo": f"{entidad_legible} {MAPEO_ACCIONES.get(a.CatalogoAccion.Accion, a.CatalogoAccion.Accion.lower())}",
            "usuario_que_realizo_la_accion": nombre_completo,
            "fecha": fecha.isoformat(),
            "entidad": entidad_legible,
            "accion": a.CatalogoAccion.Accion,
            "resumen": resumen or a.ObservacionesAuditoria or descripcion,
            "cambios": cambios,
            "valores_antes": a.ValoresAntes,
            "valores_despues": a.ValoresDespues,
            "ip": a.Ip,
            "observaciones": a.ObservacionesAuditoria
        })
        
    t1 = time.perf_counter()
    duracion = t1 - t0
    
    # LOGS TEMPORALES (Fase 6)
    print("=" * 60)
    print("[MASTER AUDIT LOG] --- LISTAR AUDITORIAS ---")
    print(f"Filtros Aplicados      : {filtros_aplicados if filtros_aplicados else 'Ninguno'}")
    print(f"Total Encontrados      : {total}")
    print(f"Entidades Detectadas   : {list(entidades_detectadas)}")
    print(f"Tiempo de Ejecución    : {duracion:.4f} segundos")
    print("=" * 60)
    
    return {
        "page": page,
        "size": size,
        "total": total,
        "total_pages": (total + size - 1) // size,
        "data": resultado
    }

def obtener_metricas_master(db: Session, anio: int = None, mes: int = None):
    import calendar
    t0 = time.perf_counter()
    ahora = datetime.now()
    
    if not anio:
        anio = ahora.year
    if not mes:
        mes = ahora.month

    inicio_mes = datetime(anio, mes, 1, 0, 0, 0)
    ultimo_dia = calendar.monthrange(anio, mes)[1]
    fin_mes = datetime(anio, mes, ultimo_dia, 23, 59, 59, 999999)

    # 1. Equipos creados en el rango (desde Auditoria)
    equipos_creados = db.query(Auditoria).filter(
        Auditoria.EntidadAfectada == "Equipos",
        Auditoria.AccionId == 1, # CREATE
        Auditoria.FechaAccion >= inicio_mes,
        Auditoria.FechaAccion <= fin_mes
    ).count()

    # 2. Jugadores registrados en el rango (desde Auditoria)
    jugadores_registrados = db.query(Auditoria).filter(
        Auditoria.EntidadAfectada == "MiembrosEquipo",
        Auditoria.AccionId == 1, # CREATE
        Auditoria.FechaAccion >= inicio_mes,
        Auditoria.FechaAccion <= fin_mes
    ).count()

    # 3. Presidentes y Entrenadores registrados en el rango (desde Auditoria + PresidenteEquipo)
    usuarios_creados = db.query(Auditoria).filter(
        Auditoria.EntidadAfectada == "Usuarios",
        Auditoria.AccionId == 1,
        Auditoria.FechaAccion >= inicio_mes,
        Auditoria.FechaAccion <= fin_mes
    ).all()

    # Optimizacion: Extraer y buscar todos los PersonaId en una sola query batch (solo columnas)
    persona_ids = []
    for u in usuarios_creados:
        data = safe_json_load(u.ValoresDespues)
        rol_id = data.get("RolId")
        persona_id = data.get("PersonaId")
        if rol_id == 3 and persona_id:
            persona_ids.append(persona_id)

    directivos_dict = {}
    if persona_ids:
        directivos = db.query(
            PresidenteEquipo.PersonaId, 
            PresidenteEquipo.TipoDirectivoId
        ).filter(
            PresidenteEquipo.PersonaId.in_(persona_ids)
        ).all()
        directivos_dict = {d.PersonaId: d.TipoDirectivoId for d in directivos}

    presidentes_registrados = 0
    entrenadores_registrados = 0

    for u in usuarios_creados:
        data = safe_json_load(u.ValoresDespues)
        rol_id = data.get("RolId")
        persona_id = data.get("PersonaId")
        
        if rol_id == 3 and persona_id:
            tipo_directivo = directivos_dict.get(persona_id)
            if tipo_directivo == 2:
                entrenadores_registrados += 1
            else:
                presidentes_registrados += 1

    # 4. Pagos aprobados en el rango (desde OrdenDePago - no auditada)
    pagos_aprobados = db.query(OrdenPago).filter(
        OrdenPago.EstatusPagoId == 3, # ACTIVO (Aprobado)
        OrdenPago.FechaDePago >= inicio_mes,
        OrdenPago.FechaDePago <= fin_mes
    ).count()

    # 5. Solicitudes enviadas en el rango (desde Solicitudes - no auditada, excluyendo borradores)
    solicitudes_enviadas = db.query(Solicitud).filter(
        Solicitud.FechaSolicitud >= inicio_mes,
        Solicitud.FechaSolicitud <= fin_mes,
        Solicitud.EstatusValidacion != 4 # Excluir borradores
    ).count()

    # 6. Documentos subidos en el rango (desde DocumentosEntregados - no auditada)
    documentos_subidos = db.query(DocumentosEntregados).filter(
        DocumentosEntregados.FechaEntrega >= inicio_mes,
        DocumentosEntregados.FechaEntrega <= fin_mes
    ).count()

    t1 = time.perf_counter()
    duracion = t1 - t0

    metricas = {
        "presidentes_mes": presidentes_registrados,
        "entrenadores_mes": entrenadores_registrados,
        "equipos_mes": equipos_creados,
        "jugadores_mes": jugadores_registrados,
        "pagos_aprobados_mes": pagos_aprobados,
        "solicitudes_enviadas_mes": solicitudes_enviadas,
        "documentos_subidos_mes": documentos_subidos
    }

    # LOGS TEMPORALES (Fase 6)
    print("=" * 60)
    print(f"[MASTER AUDIT LOG] --- CALCULO DE METRICAS ({anio}-{mes}) ---")
    print(f"Métricas Calculadas   : {metricas}")
    print(f"Tiempo de Ejecución    : {duracion:.4f} segundos")
    print("=" * 60)

    return metricas

def obtener_reporte_mensual(db: Session):
    t0 = time.perf_counter()
    
    # 1. Obtener auditorias mensuales para Equipos y Jugadores
    equipos_mes = db.query(
        extract('year', Auditoria.FechaAccion).label('year'),
        extract('month', Auditoria.FechaAccion).label('month'),
        func.count().label('conteo')
    ).filter(
        Auditoria.EntidadAfectada == "Equipos",
        Auditoria.AccionId == 1
    ).group_by(
        extract('year', Auditoria.FechaAccion),
        extract('month', Auditoria.FechaAccion)
    ).all()

    jugadores_mes = db.query(
        extract('year', Auditoria.FechaAccion).label('year'),
        extract('month', Auditoria.FechaAccion).label('month'),
        func.count().label('conteo')
    ).filter(
        Auditoria.EntidadAfectada == "MiembrosEquipo",
        Auditoria.AccionId == 1
    ).group_by(
        extract('year', Auditoria.FechaAccion),
        extract('month', Auditoria.FechaAccion)
    ).all()

    # 2. Usuarios creados para separar Presidentes y Entrenadores
    usuarios_mes = db.query(
        extract('year', Auditoria.FechaAccion).label('year'),
        extract('month', Auditoria.FechaAccion).label('month'),
        Auditoria.ValoresDespues
    ).filter(
        Auditoria.EntidadAfectada == "Usuarios",
        Auditoria.AccionId == 1
    ).all()

    # Optimizacion: Extraer y buscar todos los PersonaId en una sola query batch (solo columnas)
    persona_ids = []
    for r in usuarios_mes:
        data = safe_json_load(r.ValoresDespues)
        rol_id = data.get("RolId")
        persona_id = data.get("PersonaId")
        if rol_id == 3 and persona_id:
            persona_ids.append(persona_id)

    directivos_dict = {}
    if persona_ids:
        directivos = db.query(
            PresidenteEquipo.PersonaId, 
            PresidenteEquipo.TipoDirectivoId
        ).filter(
            PresidenteEquipo.PersonaId.in_(persona_ids)
        ).all()
        directivos_dict = {d.PersonaId: d.TipoDirectivoId for d in directivos}

    # Estructura final por mes-año
    mapa_mensual = {}

    def obtener_clave(y, m):
        return f"{int(y)}-{int(m):02d}"

    for r in equipos_mes:
        clave = obtener_clave(r.year, r.month)
        mapa_mensual.setdefault(clave, {"presidentes": 0, "entrenadores": 0, "equipos": 0, "jugadores": 0, "mes": int(r.month), "anio": int(r.year)})
        mapa_mensual[clave]["equipos"] = r.conteo

    for r in jugadores_mes:
        clave = obtener_clave(r.year, r.month)
        mapa_mensual.setdefault(clave, {"presidentes": 0, "entrenadores": 0, "equipos": 0, "jugadores": 0, "mes": int(r.month), "anio": int(r.year)})
        mapa_mensual[clave]["jugadores"] = r.conteo

    for r in usuarios_mes:
        clave = obtener_clave(r.year, r.month)
        mapa_mensual.setdefault(clave, {"presidentes": 0, "entrenadores": 0, "equipos": 0, "jugadores": 0, "mes": int(r.month), "anio": int(r.year)})
        
        data = safe_json_load(r.ValoresDespues)
        rol_id = data.get("RolId")
        persona_id = data.get("PersonaId")
        
        if rol_id == 3 and persona_id:
            tipo_directivo = directivos_dict.get(persona_id)
            if tipo_directivo == 2:
                mapa_mensual[clave]["entrenadores"] += 1
            else:
                mapa_mensual[clave]["presidentes"] += 1

    # Ordenar por fecha cronológica descendente y convertir a lista
    lista_resultado = [v for k, v in sorted(mapa_mensual.items(), reverse=True)]

    t1 = time.perf_counter()
    # LOGS TEMPORALES (Fase 6)
    print("=" * 60)
    print("[MASTER AUDIT LOG] --- REPORTE MENSUAL ---")
    print(f"Registros Mensuales    : {len(lista_resultado)} meses analizados")
    print(f"Tiempo de Ejecución    : {(t1-t0):.4f} segundos")
    print("=" * 60)

    return lista_resultado

def obtener_actividad_por_usuario(db: Session, limite: int = 15):
    t0 = time.perf_counter()
    
    actividad = db.query(
        Auditoria.UsuarioNombre.label('usuario'),
        func.count().label('total_acciones')
    ).group_by(
        Auditoria.UsuarioNombre
    ).order_by(
        func.count().desc()
    ).limit(limite).all()

    resultado = [{"usuario": r.usuario or "SYSTEM", "acciones": r.total_acciones} for r in actividad]

    t1 = time.perf_counter()
    print("=" * 60)
    print("[MASTER AUDIT LOG] --- ACTIVIDAD POR USUARIO ---")
    print(f"Usuarios consultados   : {len(resultado)}")
    print(f"Tiempo de Ejecución    : {(t1-t0):.4f} segundos")
    print("=" * 60)

    return resultado

def obtener_actividad_por_entidad(db: Session):
    t0 = time.perf_counter()

    actividad = db.query(
        Auditoria.EntidadAfectada.label('entidad'),
        func.count().label('total_acciones')
    ).group_by(
        Auditoria.EntidadAfectada
    ).order_by(
        func.count().desc()
    ).all()

    resultado = [{"entidad": MAPEO_ENTIDADES.get(r.entidad, r.entidad), "acciones": r.total_acciones} for r in actividad]

    t1 = time.perf_counter()
    print("=" * 60)
    print("[MASTER AUDIT LOG] --- ACTIVIDAD POR ENTIDAD ---")
    print(f"Entidades analizadas   : {len(resultado)}")
    print(f"Tiempo de Ejecución    : {(t1-t0):.4f} segundos")
    print("=" * 60)

    return resultado

def obtener_actividad_diaria(db: Session, limite_dias: int = 30):
    t0 = time.perf_counter()

    # Agrupar por la parte de fecha
    actividad = db.query(
        cast(Auditoria.FechaAccion, Date).label('fecha'),
        func.count().label('total_acciones')
    ).group_by(
        cast(Auditoria.FechaAccion, Date)
    ).order_by(
        cast(Auditoria.FechaAccion, Date).desc()
    ).limit(limite_dias).all()

    resultado = [{"fecha": str(r.fecha), "acciones": r.total_acciones} for r in sorted(actividad, key=lambda x: x.fecha)]

    t1 = time.perf_counter()
    print("=" * 60)
    print("[MASTER AUDIT LOG] --- ACTIVIDAD DIARIA ---")
    print(f"Días analizados        : {len(resultado)}")
    print(f"Tiempo de Ejecución    : {(t1-t0):.4f} segundos")
    print("=" * 60)

    return resultado
