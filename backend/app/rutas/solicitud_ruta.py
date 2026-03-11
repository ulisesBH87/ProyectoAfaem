from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.seguridad import crear_token, verificar_token, obtener_usuario_actual
from app.db.sesion import get_db

from app.esquemas.solicitud_esquema import SolicitudesTodas, SolicitudCrear, SolicitudIndividualRespuesta, RequisitosParaAfiliacion, CrearSolicitud

from app.servicios.solicitud_servicio import crear_solicitud, obtener_solicitudes_servicio, obtener_solicitud_individual_servicio, agregar_requisitos_servicio
from app.modelos.usuario_modelo import Usuario
from app.modelos.solicitud_modelo import Solicitud
from app.servicios import solicitud_servicio

from typing import List


router = APIRouter(
    prefix="/solicitud",
    tags=["Solicitudes"]
)

@router.post("/enviar-solicitud")
def solicitud(data: SolicitudCrear, db:Session = Depends(get_db),usuario: Usuario = Depends(obtener_usuario_actual)):

    crear_solicitud(db, data, usuario)

    if not data:
        raise HTTPException(status_code=400, detail="Datos de solicitud inválidos")

    return {"message": "Solicitud enviada correctamente"}


@router.get("/solicitudes-usuarios", response_model=List[SolicitudesTodas])
def obtener_solicitudes(db:Session = Depends(get_db)):
    return obtener_solicitudes_servicio(db)


@router.get("/solicitud-usuario/{solicitud_id}", response_model=SolicitudIndividualRespuesta)
def obtener_solicitud_usuario(solicitud_id: int, db:Session = Depends(get_db)):
    return obtener_solicitud_individual_servicio(db, solicitud_id)

############## NUEVAS  #############################################################

@router.post("/{tipo_afiliacion_id}/requisitos")
def agregar_requisitos_afiliacion(tipo_afiliacion_id: int, requisitos: RequisitosParaAfiliacion, db:Session=Depends(get_db)):

    registros = agregar_requisitos_servicio(db,tipo_afiliacion_id,requisitos.DocumentosPersonaIds)

    return {
        "tipo_afiliacion_id": tipo_afiliacion_id,
        "requisitos_creados": len(registros)
    }

@router.get("/{tipo_afiliacion_id}/requisitos")
def ver_requisitos_afiliacion(tipo_afiliacion_id: int, db:Session=Depends(get_db)):

    requisitos = solicitud_servicio.ver_requisitos_afiliacion_servicio(db, tipo_afiliacion_id)
    return requisitos

@router.post("/")
def crear_solicitud(solicitud: CrearSolicitud, db:Session=Depends(get_db), usuario=Depends(obtener_usuario_actual)):
    resultado = solicitud_servicio.crear_solicitud_servicio(db, solicitud, usuario.id)
    return resultado