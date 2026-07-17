from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.seguridad import get_db, requerir_permiso
from app.servicios.consumo_servicio import ConsumptionService

router = APIRouter(prefix="/consumo", tags=["Consumo y Facturación"])

@router.get("/resumen", dependencies=[Depends(requerir_permiso("auditorias.ver"))])
def obtener_resumen_dashboard(
    fecha_inicio: str = Query(None),
    fecha_fin: str = Query(None),
    usuario_id: int = Query(None),
    tenant_id: int = Query(None),
    db: Session = Depends(get_db)
):
    """
    Retorna métricas consolidadas del consumo (agrupadas por proveedor, tipo de consumo, etc.)
    para la vista del dashboard Master.
    """
    from app.servicios.consumo_worker import procesar_outbox_pending
    try:
        procesar_outbox_pending()
    except Exception:
        pass

    return ConsumptionService.obtener_resumen_dashboard(
        db=db,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        usuario_id=usuario_id,
        tenant_id=tenant_id
    )

@router.get("/ledger", dependencies=[Depends(requerir_permiso("auditorias.ver"))])
def listar_ledger(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    fecha_inicio: str = Query(None),
    fecha_fin: str = Query(None),
    usuario_id: int = Query(None),
    guest_id: str = Query(None),
    tipo_consumo: str = Query(None),
    tipo_registro: str = Query(None),
    estado_tecnico: str = Query(None),
    es_cobrable: bool = Query(None),
    db: Session = Depends(get_db)
):
    """
    Retorna el listado paginado del Ledger transaccional de consumos (BitacoraConsumo)
    para auditoría y conciliación financiera.
    """
    from app.servicios.consumo_worker import procesar_outbox_pending
    try:
        procesar_outbox_pending()
    except Exception:
        pass

    return ConsumptionService.listar_ledger(
        db=db,
        page=page,
        size=size,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        usuario_id=usuario_id,
        guest_id=guest_id,
        tipo_consumo=tipo_consumo,
        tipo_registro=tipo_registro,
        estado_tecnico=estado_tecnico,
        es_cobrable=es_cobrable
    )

@router.get("/auditoria", dependencies=[Depends(requerir_permiso("auditorias.ver"))])
def obtener_auditoria_consumos(
    fecha_inicio: str = Query(None),
    fecha_fin: str = Query(None),
    db: Session = Depends(get_db)
):
    """
    Retorna el desglose de auditoría detallado agrupado por jugador, equipo y liga.
    """
    from app.servicios.consumo_worker import procesar_outbox_pending
    try:
        procesar_outbox_pending()
    except Exception:
        pass

    return ConsumptionService.obtener_auditoria_consumos(
        db=db,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin
    )

@router.get("/tarifas", dependencies=[Depends(requerir_permiso("auditorias.ver"))])
def obtener_tarifas(db: Session = Depends(get_db)):
    """
    Retorna el listado de tarifas configuradas.
    """
    return ConsumptionService.obtener_tarifas(db)

@router.put("/tarifas/{tarifa_id}", dependencies=[Depends(requerir_permiso("auditorias.ver"))])
def actualizar_tarifa(tarifa_id: int, payload: dict, db: Session = Depends(get_db)):
    """
    Actualiza el costo y otros parámetros de una tarifa.
    """
    tarifa = ConsumptionService.actualizar_tarifa(db, tarifa_id, payload)
    if not tarifa:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Tarifa no encontrada")
    return {"mensaje": "Tarifa actualizada correctamente", "tarifa": {
        "TarifaId": tarifa.TarifaId,
        "TipoConsumo": tarifa.TipoConsumo,
        "Proveedor": tarifa.Proveedor,
        "CostoUnitario": float(tarifa.CostoUnitario),
        "Divisa": tarifa.Divisa,
        "Descripcion": tarifa.Descripcion,
        "Estatus": tarifa.Estatus
    }}

@router.get("/reporte-excel", dependencies=[Depends(requerir_permiso("auditorias.ver"))])
def descargar_reporte_excel(
    fecha_inicio: str = Query(None),
    fecha_fin: str = Query(None),
    tipo_reporte: str = Query("todos"),
    liga_id: int = Query(None),
    equipo_id: int = Query(None),
    db: Session = Depends(get_db)
):
    """
    Genera y descarga el reporte consolidado y detallado de consumos en formato Excel (.xlsx).
    """
    from app.servicios.reporte_excel_servicio import ReporteExcelServicio
    from fastapi.responses import StreamingResponse
    import io
    
    # Generar el Excel en bytes aplicando los filtros avanzados directamente en BDD
    excel_bytes = ReporteExcelServicio.generar_reporte_consumos(
        db=db,
        resumen=None,
        auditoria=None,
        fecha_inicio=fecha_inicio or "Inicio",
        fecha_fin=fecha_fin or "Fin",
        tipo_reporte=tipo_reporte,
        liga_id=liga_id,
        equipo_id=equipo_id
    )
    
    # 3. Retornar el archivo como StreamingResponse con un nombre de archivo descriptivo
    filename_parts = ["reporte-consumos"]
    if tipo_reporte != "todos":
        filename_parts.append(tipo_reporte)
    if liga_id:
        filename_parts.append(f"liga-{liga_id}")
    if equipo_id:
        filename_parts.append(f"equipo-{equipo_id}")
    filename_parts.append(f"{fecha_inicio or 'todos'}-a-{fecha_fin or 'todos'}")
    
    filename = "-".join(filename_parts) + ".xlsx"
    headers = {
        'Content-Disposition': f'attachment; filename="{filename}"'
    }
    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers
    )
