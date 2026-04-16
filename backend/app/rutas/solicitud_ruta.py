from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.core.seguridad import crear_token, verificar_token, obtener_usuario_actual
from app.db.sesion import get_db

from app.esquemas.solicitud_esquema import (
    SolicitudesTodas, SolicitudCrear, SolicitudIndividualRespuesta, 
    RequisitosParaAfiliacion, CrearSolicitud, PDFData,
    ValidarSolicitudPayload, SolicitudDocumentosResponse
)

from app.servicios.solicitud_servicio import (
    crear_solicitud, obtener_solicitudes_servicio, obtener_solicitud_individual_servicio, 
    agregar_requisitos_servicio, obtener_documentos_para_revision_servicio, validar_solicitud_servicio
)
from app.modelos.usuario_modelo import Usuario
from app.modelos.solicitud_modelo import Solicitud
from app.servicios import solicitud_servicio

import fitz
import io
import os

from typing import List


router = APIRouter(
    prefix="/solicitud",
    tags=["Solicitudes"]
)

# ... (omitting previous middle code for brevity in replace, but I will include the new endpoints at the end context)

@router.get("/{solicitud_id}/documentos", response_model=SolicitudDocumentosResponse)
def obtener_documentos_revision(solicitud_id: int, db: Session = Depends(get_db)):
    """
    Obtiene los documentos de una solicitud específica para que el administrador los revise.
    """
    return obtener_documentos_para_revision_servicio(db, solicitud_id)

@router.post("/{solicitud_id}/validar")
def validar_solicitud(solicitud_id: int, payload: ValidarSolicitudPayload, db: Session = Depends(get_db)):
    """
    Aprueba o rechaza una solicitud y activa la cuenta del presidente si es necesario.
    """
    return validar_solicitud_servicio(db, solicitud_id, payload)


@router.get("/solicitudes-usuarios", response_model=List[SolicitudesTodas])
def obtener_solicitudes(db:Session = Depends(get_db)):
    return solicitud_servicio.obtener_solicitudes_usuarios_servicio(db)


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
def crear_solicitud_endpoint(solicitud: CrearSolicitud, db:Session=Depends(get_db), usuario=Depends(obtener_usuario_actual)):
    resultado = solicitud_servicio.crear_solicitud_servicio(db, solicitud, usuario.id)
    return resultado

@router.get("/descargar-formato-afiliacion")
async def descargar_formato(
    nombre: str = Query(...),
    curp: str = Query(...),
    fecha_nac: str = Query(...),
    edad: str = Query(...),
    nacionalidad: str = Query("MEXICANA"),
    equipo: str = Query("")
):
    try:
        # Ruta del template original (Ajustada para ser multiplataforma)
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        template_path = os.path.join(base_dir, "..", "Front_Feo", "Formato de afiliación - Presidente - v2026.pdf")

        if not os.path.exists(template_path):
            raise HTTPException(status_code=404, detail=f"No se encontró el archivo de plantilla en {template_path}")

        doc = fitz.open(template_path)
        page = doc[0]

        # Insertar textos en posiciones aproximadas (ajustables)
        # Formato: page.insert_text((x, y), text, fontsize=10, ...)
        # Estos valores son estimados para una hoja A4/Letter estándar
        page.insert_text((150, 215), nombre.upper(), fontsize=11)
        page.insert_text((450, 215), nacionalidad.upper(), fontsize=11)
        page.insert_text((150, 245), curp.upper(), fontsize=11)
        page.insert_text((450, 245), fecha_nac, fontsize=11)
        page.insert_text((150, 275), edad, fontsize=11)
        page.insert_text((450, 275), equipo.upper(), fontsize=11)

        # Guardar en memoria
        pdf_bytes = doc.write()
        doc.close()

        output = io.BytesIO(pdf_bytes)
        output.seek(0)

        headers = {
            'Content-Disposition': 'attachment; filename="Formato_Afiliacion_FIRMADO.pdf"'
        }

        return StreamingResponse(output, media_type="application/pdf", headers=headers)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar el PDF: {str(e)}")

#Hacer el envío de la solicitud al administrador
@router.post("/solicitud-completa")
def enviar_solicitud_completa(solicitud_id: int, db:Session=Depends(get_db), usuario=Depends(obtener_usuario_actual)):
    resultado = solicitud_servicio.enviar_solicitud_completa_servicio(db, solicitud_id, usuario.UsuarioId)
    return resultado

#Administrador
#Ver todas las solicitudes
@router.get("/")
def ver_solicitudes(db:Session=Depends(get_db)):
    return solicitud_servicio.obtener_solicitudes_servicio(db)

@router.get("/detalles/{solicitud_id}")
def obtener_solicitud_detalle(solicitud_id: int,db: Session = Depends(get_db)):
    return solicitud_servicio.obtener_solicitud_detalle_servicio(db, solicitud_id)