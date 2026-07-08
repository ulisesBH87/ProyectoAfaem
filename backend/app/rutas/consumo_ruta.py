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
