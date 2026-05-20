import os
from datetime import datetime

from app.modelos.persona_modelo import Personas
from app.modelos.equipo_modelo import Equipos
from app.repositorios import documentos_repositorio, personas_repositorio
from app.core.seguridad import obtener_usuario_actual
from app.repositorios.documentos_repositorio import obtener_solicitud_borrador

from app.excepciones import documentos_excepciones
from app.modelos.documento_afiliacion_modelo import DocumentoAfiliacion
import zipfile
from io import BytesIO
from app.modelos.miembro_equipo_modelo import MiembrosEquipo
from app.repositorios import equipo_repositorio

UPLOAD_DIR = "uploads/documentos"

async def subir_documento_servicio(db, persona_id, documento_afiliacion_id, archivo):
    
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    extension = archivo.filename.split(".")[-1]
    nombre = f"{persona_id}_{documento_afiliacion_id}.{extension}"

    ruta = os.path.join(UPLOAD_DIR, nombre)

    with open(ruta, "wb") as buffer:
        buffer.write(await archivo.read())

    documentos_repositorio.subir_documento_repo(db, persona_id, documento_afiliacion_id, ruta)

    db.commit()
    return {"mensaje": "Documento subido"}

async def subir_documento_servicio2(db, persona_id, documento_afiliacion_ids, archivos, solicitud_id):

    if len(documento_afiliacion_ids) != len(archivos):
        raise ValueError("Cantidad de archivos y tipos no coincide")

    # Obtener persona
    persona = db.query(Personas).filter(Personas.PersonaId == persona_id).first()
    if not persona:
        raise documentos_excepciones.PersonaNoEncontradaError()
    
    # Identificar si es solicitud de presidente
    from app.modelos.solicitud_modelo import Solicitud
    from app.enums.tipos_solicitud_enum import TiposSolicitudEnum
    
    solicitud = db.query(Solicitud).filter(Solicitud.SolicitudId == solicitud_id).first()
    is_presidente = False
    if solicitud and solicitud.TipoSolicitudId == TiposSolicitudEnum.PRESIDENTE_EQUIPO.value:
        is_presidente = True
        
    from app.core.config import obtener_uploads_dir
    base_uploads_dir = obtener_uploads_dir()
    
    if is_presidente:
        nombre_completo = f"{persona.Nombre or ''} {persona.PrimerApellido or ''} {persona.SegundoApellido or ''}".strip()
        nombre_completo = " ".join(nombre_completo.split())
        if not nombre_completo:
            nombre_completo = f"persona_{persona_id}"
        upload_subfolder = os.path.join("presidentes", nombre_completo)
    else:
        upload_subfolder = "documentos"
        
    target_dir = os.path.join(base_uploads_dir, upload_subfolder)
    os.makedirs(target_dir, exist_ok=True)

    #Obtener CURP y año para nombrar archivos
    curp = persona.CURP
    año = datetime.now().year

    #Obtener los documentos
    doc_afiliaciones = db.query(DocumentoAfiliacion).filter(
        DocumentoAfiliacion.DocumentoAfiliacionId.in_(documento_afiliacion_ids)
    ).all()

    doc_map = {d.DocumentoAfiliacionId: d for d in doc_afiliaciones}

    documentos_creados = []

    for archivo, doc_id in zip(archivos, documento_afiliacion_ids):

        d = doc_map.get(doc_id)

        if not d:
            raise Exception(f"No se encontró DocumentoAfiliacionId {doc_id}")
    
        nombre_doc = d.Documento.NombreDocumento.upper()
        
        extension = archivo.filename.split(".")[-1]
        nombre = f"{nombre_doc}_{curp}_{año}.{extension}"
        
        ruta_absoluta = os.path.join(target_dir, nombre)
        ruta_db = os.path.join("uploads", upload_subfolder, nombre).replace("\\", "/")

        with open(ruta_absoluta, "wb") as buffer:
            buffer.write(await archivo.read())

        doc = documentos_repositorio.subir_documento_repo2(
            db,
            persona_id,
            doc_id,
            ruta_db,
            solicitud_id
        )

        documentos_creados.append(doc)
    
    db.commit()

    # Actualizar Estatus Presidente a DOCUMENTOS_EN_REVISION
    try:
        from app.modelos.presidente_equipo_modelo import PresidenteEquipo
        from app.enums.estatus_presidente_enum import PresidenteEquipoEstatus
        
        presidente = db.query(PresidenteEquipo).filter(PresidenteEquipo.PersonaId == persona_id).first()
        if presidente:
            presidente.EstatusId = PresidenteEquipoEstatus.PRE_APROBADO
    except Exception as e:
        pass # Si falla actualización del estatus, que no rompa la subida.

    db.commit()

    return {
        "mensaje": "Documentos subidos",
        "total": len(documentos_creados)
    }

def proceso_presidente(db, usuario):
    usuario_id = usuario.UsuarioId
    persona_id = personas_repositorio.obtener_persona(db, usuario_id)
    
    return persona_id

def presidente_solicitud(db, usuario):
    usuario_id = usuario.UsuarioId
    solicitud_id = obtener_solicitud_borrador(db, usuario_id)
    return solicitud_id

#DESCARGAR DOCUMENTOS COMPRIMIDOS
def generar_zip_documentos(db, miembro_id):
    miembro = db.query(MiembrosEquipo).filter(
        MiembrosEquipo.MiembroEquipoId == miembro_id
    ).first()

    if not miembro:
        raise Exception("Jugador no encontrado")

    persona_id = miembro.PersonaId

    documentos = equipo_repositorio.obtener_documentos_jugador_repo(db, persona_id)

    if not documentos:
        raise Exception("No hay documentos para este jugador")

    zip_buffer = BytesIO()

    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for doc in documentos:
            ruta = doc["RutaArchivo"]

            if not os.path.exists(ruta):
                continue

            nombre_archivo = os.path.basename(ruta)

            zipf.write(ruta, arcname=nombre_archivo)

    zip_buffer.seek(0)

    nombre_zip = f"documentos_jugador_{persona_id}.zip"

    return zip_buffer.read(), nombre_zip


def generar_zip_documentos_equipo(db, equipo_id):
    """
    Genera un ZIP con los documentos de todos los jugadores del equipo.
    Cada jugador tendrá su propia carpeta dentro del ZIP.
    """
    from datetime import datetime as dt
    
    # Obtener el equipo para el nombre
    equipo = db.query(Equipos).filter(
        Equipos.EquipoId == equipo_id
    ).first()

    if not equipo:
        raise Exception("Equipo no encontrado")

    # Obtener todos los miembros del equipo
    miembros = equipo_repositorio.obtener_miembros_equipo_por_id_repo(db, equipo_id)

    if not miembros:
        raise Exception("No hay jugadores en este equipo")

    zip_buffer = BytesIO()

    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for miembro in miembros:
            persona_id = miembro["PersonaId"]
            nombre_carpeta = f"{miembro['NombreCompleto'].replace(' ', '_')}"

            # Obtener documentos del jugador
            documentos = equipo_repositorio.obtener_documentos_jugador_repo(db, persona_id)

            if not documentos:
                continue

            # Agregar cada documento a su carpeta
            for doc in documentos:
                ruta = doc["RutaArchivo"]

                if not os.path.exists(ruta):
                    continue

                nombre_archivo = os.path.basename(ruta)
                
                # Ruta dentro del ZIP: NombreCarpeta/NombreArchivo
                arcname = f"{nombre_carpeta}/{nombre_archivo}"

                zipf.write(ruta, arcname=arcname)

    zip_buffer.seek(0)

    # Nombre del archivo con la fecha actual
    fecha_hoy = dt.now().strftime("%Y-%m-%d")
    nombre_limpio = equipo.NombreEquipo.replace(' ', '_').replace('/', '_').replace('\\', '_')
    nombre_zip = f"{nombre_limpio}_{fecha_hoy}.zip"

    return zip_buffer.read(), nombre_zip