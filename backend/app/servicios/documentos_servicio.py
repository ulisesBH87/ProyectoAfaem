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

    file_bytes = await archivo.read()
    try:
        from app.utilidades.procesador_documentos import procesar_documento_subido
        file_bytes = procesar_documento_subido(file_bytes, archivo.filename)
    except Exception as e:
        import logging
        logging.getLogger("documentos_servicio").error(f"Error procesando documento: {e}")

    with open(ruta, "wb") as buffer:
        buffer.write(file_bytes)

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
    
    # Identificar si la persona es presidente verificando la tabla PresidenteEquipo
    # NOTA: NO usar el TipoSolicitudId de la solicitud porque los jugadores también
    # quedan registrados bajo solicitudes de tipo PRESIDENTE_EQUIPO, lo que produce
    # falsos positivos y guarda los archivos del jugador en la carpeta del presidente.
    from app.modelos.presidente_equipo_modelo import PresidenteEquipo

    is_presidente = (
        db.query(PresidenteEquipo)
        .filter(PresidenteEquipo.PersonaId == persona_id)
        .first()
    ) is not None

    from app.core.config import obtener_uploads_dir
    base_uploads_dir = obtener_uploads_dir()
    
    if is_presidente:
        nombre_completo = f"{persona.Nombre or ''} {persona.PrimerApellido or ''} {persona.SegundoApellido or ''}".strip()
        nombre_completo = " ".join(nombre_completo.split())
        if not nombre_completo:
            nombre_completo = f"persona_{persona_id}"
        upload_subfolder = os.path.join("presidentes", nombre_completo)
    else:
        # Jugador: guardar en equipos/<NombreEquipo>/<NombreJugador>/
        # Buscar en qué equipo está inscrito el jugador
        nombre_jugador = f"{persona.Nombre or ''} {persona.PrimerApellido or ''} {persona.SegundoApellido or ''}".strip()
        nombre_jugador = " ".join(nombre_jugador.split()) or f"persona_{persona_id}"

        miembro = (
            db.query(MiembrosEquipo)
            .filter(MiembrosEquipo.PersonaId == persona_id, MiembrosEquipo.Eliminado == False)
            .order_by(MiembrosEquipo.FechaIngreso.desc())
            .first()
        )

        if miembro and miembro.EquipoRelacion and miembro.EquipoRelacion.EquipoRelacion:
            nombre_equipo = (miembro.EquipoRelacion.EquipoRelacion.NombreEquipo or f"equipo_{miembro.EquipoID}").strip()
        else:
            # Fallback: si no tiene equipo asignado aún, usar carpeta genérica por id
            nombre_equipo = f"equipo_desconocido"

        nombre_equipo_limpio = nombre_equipo.replace("/", "_").replace("\\", "_")
        nombre_jugador_limpio = nombre_jugador.replace("/", "_").replace("\\", "_")

        upload_subfolder = os.path.join("equipos", nombre_equipo_limpio, nombre_jugador_limpio)

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

        file_bytes = await archivo.read()
        try:
            from app.utilidades.procesador_documentos import procesar_documento_subido
            file_bytes = procesar_documento_subido(file_bytes, archivo.filename)
        except Exception as e:
            import logging
            logging.getLogger("documentos_servicio").error(f"Error procesando documento: {e}")

        with open(ruta_absoluta, "wb") as buffer:
            buffer.write(file_bytes)

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
            presidente.EstatusId = PresidenteEquipoEstatus.DOCUMENTOS_EN_REVISION
    except Exception as e:
        pass # Si falla actualización del estatus, que no rompa la subida.

    db.commit()

    return {
        "mensaje": "Documentos subidos",
        "total": len(documentos_creados)
    }


async def subir_documentos_jugador_equipo(
    db,
    persona_id: int,
    documento_afiliacion_ids: list,
    archivos: list,
    solicitud_id: int,
    nombre_equipo: str,
    nombre_jugador: str
):
    """
    Guarda los documentos de un jugador de equipo en la ruta de producción:
        <uploads_base>/equipos/<NombreEquipo>/<NombreJugador>/

    Soporta tanto jugadores mayores como menores de edad; los documentos
    específicos se determinan en el repositorio según la fecha de nacimiento.

    Si no se reciben archivos, la función retorna sin hacer nada.
    """
    if not archivos or len(archivos) == 0:
        return {"mensaje": "Sin documentos para subir", "total": 0}

    if len(documento_afiliacion_ids) != len(archivos):
        raise ValueError("Cantidad de archivos y tipos de documento no coincide")

    # Obtener persona para CURP y nombre en archivos
    persona = db.query(Personas).filter(Personas.PersonaId == persona_id).first()
    if not persona:
        raise documentos_excepciones.PersonaNoEncontradaError()

    from app.core.config import obtener_uploads_dir
    base_uploads_dir = obtener_uploads_dir()

    # Sanitizar nombres para el sistema de archivos
    nombre_equipo_limpio = (nombre_equipo or f"equipo_{persona_id}").strip().replace("/", "_").replace("\\", "_")

    nombre_jugador_limpio = (nombre_jugador or f"persona_{persona_id}").strip().replace("/", "_").replace("\\", "_")
    if not nombre_jugador_limpio:
        nombre_jugador_limpio = f"persona_{persona_id}"

    # Ruta destino: <uploads_base>/equipos/<NombreEquipo>/<NombreJugador>/
    upload_subfolder = os.path.join("equipos", nombre_equipo_limpio, nombre_jugador_limpio)
    target_dir = os.path.join(base_uploads_dir, upload_subfolder)
    os.makedirs(target_dir, exist_ok=True)

    curp = persona.CURP or f"sin_curp_{persona_id}"
    año = datetime.now().year

    # Obtener los metadatos de los documentos
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
        nombre_archivo = f"{nombre_doc}_{curp}_{año}.{extension}"

        ruta_absoluta = os.path.join(target_dir, nombre_archivo)
        ruta_db = os.path.join("uploads", upload_subfolder, nombre_archivo).replace("\\", "/")

        file_bytes = await archivo.read()
        try:
            from app.utilidades.procesador_documentos import procesar_documento_subido
            file_bytes = procesar_documento_subido(file_bytes, archivo.filename)
        except Exception as e:
            import logging
            logging.getLogger("documentos_servicio").error(f"Error procesando documento: {e}")

        with open(ruta_absoluta, "wb") as buffer:
            buffer.write(file_bytes)

        from app.repositorios import documentos_repositorio
        doc = documentos_repositorio.subir_documento_repo2(
            db,
            persona_id,
            doc_id,
            ruta_db,
            solicitud_id
        )
        documentos_creados.append(doc)

    db.commit()

    return {
        "mensaje": "Documentos de jugador subidos",
        "total": len(documentos_creados),
        "ruta": upload_subfolder
    }

def proceso_presidente(db, usuario):
    usuario_id = usuario.UsuarioId
    persona_id = personas_repositorio.obtener_persona(db, usuario_id)
    
    return persona_id

def presidente_solicitud(db, usuario):
    usuario_id = usuario.UsuarioId
    solicitud_id = obtener_solicitud_borrador(db, usuario_id)
    return solicitud_id

def resolver_ruta_absoluta(ruta: str) -> str:
    if not ruta:
        return ""
    if os.path.isabs(ruta):
        return ruta
    
    from app.core.config import obtener_uploads_dir
    base_uploads_dir = obtener_uploads_dir()
    
    # Normalizar separadores
    ruta_norm = ruta.replace("\\", "/")
    if ruta_norm.startswith("uploads/"):
        relative_path = ruta_norm[len("uploads/"):]
    else:
        relative_path = ruta_norm
        
    return os.path.join(base_uploads_dir, relative_path.replace("/", os.sep))


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
            ruta_db = doc["RutaArchivo"]
            ruta_absoluta = resolver_ruta_absoluta(ruta_db)

            if not ruta_absoluta or not os.path.exists(ruta_absoluta):
                continue

            nombre_archivo = os.path.basename(ruta_absoluta)
            nombre_archivo_ascii = eliminar_acentos(nombre_archivo)

            zipf.write(ruta_absoluta, arcname=nombre_archivo_ascii)

    zip_buffer.seek(0)

    nombre_zip = f"documentos_jugador_{persona_id}.zip"

    return zip_buffer.read(), nombre_zip


def eliminar_acentos(texto: str) -> str:
    import unicodedata
    if not texto:
        return ""
    texto_norm = unicodedata.normalize('NFKD', texto)
    return texto_norm.encode('ascii', 'ignore').decode('ascii')


def generar_zip_documentos_equipo(db, equipo_id):
    """
    Genera un ZIP con los documentos de todos los jugadores del equipo, el presidente, y el logo del equipo.
    Estructura en ZIP:
      - NombreEquipo/
        - logo.png (si existe)
        - Jugadores/
          - NombreJugador/
            - documentos...
        - Presidente/
          - NombrePresidente/
            - documentos...
    """
    from datetime import datetime as dt
    
    from app.modelos.equipo_modelo import EquiposJugando
    ej = db.query(EquiposJugando).filter(
        EquiposJugando.EquiposJugandoId == equipo_id
    ).first()
    if not ej:
        raise Exception("Participación de equipo no encontrada")

    # Obtener el equipo para el nombre
    equipo = db.query(Equipos).filter(
        Equipos.EquipoId == ej.EquipoId
    ).first()

    if not equipo:
        raise Exception("Equipo no encontrado")

    # Sanitizar el nombre del equipo para la carpeta principal en el ZIP (a ASCII puro)
    nombre_equipo_zip = eliminar_acentos(equipo.NombreEquipo).strip().replace("/", "_").replace("\\", "_")
    nombre_equipo_zip_sin_espacios = nombre_equipo_zip.replace(' ', '_')

    # Obtener todos los miembros del equipo
    miembros = equipo_repositorio.obtener_miembros_equipo_por_id_repo(db, equipo_id)

    zip_buffer = BytesIO()

    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # 1. Agregar el logotipo del equipo si existe
        if equipo.RutaLogo:
            ruta_logo_abs = resolver_ruta_absoluta(equipo.RutaLogo)
            if ruta_logo_abs and os.path.exists(ruta_logo_abs):
                nombre_logo = os.path.basename(ruta_logo_abs)
                nombre_logo_ascii = eliminar_acentos(nombre_logo)
                zipf.write(ruta_logo_abs, arcname=f"{nombre_equipo_zip_sin_espacios}/{nombre_logo_ascii}")

        # 2. Agregar los documentos de los jugadores (dentro de "Jugadores")
        if miembros:
            for miembro in miembros:
                persona_id = miembro["PersonaId"]
                nombre_jugador_carpeta = eliminar_acentos(miembro['NombreCompleto']).replace(' ', '_')

                # Obtener documentos del jugador
                documentos = equipo_repositorio.obtener_documentos_jugador_repo(db, persona_id)

                if not documentos:
                    continue

                # Agregar cada documento a su carpeta
                for doc in documentos:
                    ruta_db = doc["RutaArchivo"]
                    ruta_absoluta = resolver_ruta_absoluta(ruta_db)

                    if not ruta_absoluta or not os.path.exists(ruta_absoluta):
                        continue

                    nombre_archivo = os.path.basename(ruta_absoluta)
                    nombre_archivo_ascii = eliminar_acentos(nombre_archivo)
                    
                    # Ruta dentro del ZIP: NombreEquipo/Jugadores/NombreJugador/NombreArchivo
                    arcname = f"{nombre_equipo_zip_sin_espacios}/Jugadores/{nombre_jugador_carpeta}/{nombre_archivo_ascii}"

                    zipf.write(ruta_absoluta, arcname=arcname)

        # 3. Agregar los documentos del presidente (dentro de "Presidente")
        from app.modelos.presidente_equipo_modelo import PresidenteEquipo
        from app.modelos.persona_modelo import Personas

        if ej and ej.PresidenteEquipoId:
            presidente = db.query(PresidenteEquipo).filter(PresidenteEquipo.PresidenteEquipoId == ej.PresidenteEquipoId).first()
            if presidente:
                pres_persona = db.query(Personas).filter(Personas.PersonaId == presidente.PersonaId).first()
                if pres_persona:
                    nombre_pres = f"{pres_persona.Nombre} {pres_persona.PrimerApellido} {pres_persona.SegundoApellido or ''}".strip()
                    nombre_pres_carpeta = eliminar_acentos(nombre_pres).replace(' ', '_')
                    
                    # Obtener documentos del presidente
                    docs_pres = equipo_repositorio.obtener_documentos_jugador_repo(db, pres_persona.PersonaId)
                    if docs_pres:
                        for doc in docs_pres:
                            ruta_db = doc["RutaArchivo"]
                            ruta_absoluta = resolver_ruta_absoluta(ruta_db)
                            
                            if not ruta_absoluta or not os.path.exists(ruta_absoluta):
                                continue

                            nombre_archivo = os.path.basename(ruta_absoluta)
                            nombre_archivo_ascii = eliminar_acentos(nombre_archivo)
                            
                            # Ruta dentro del ZIP: NombreEquipo/Presidente/NombrePresidente/NombreArchivo
                            arcname = f"{nombre_equipo_zip_sin_espacios}/Presidente/{nombre_pres_carpeta}/{nombre_archivo_ascii}"
                            zipf.write(ruta_absoluta, arcname=arcname)

    zip_buffer.seek(0)

    # Nombre del archivo con la fecha actual
    fecha_hoy = dt.now().strftime("%Y-%m-%d")
    nombre_zip = f"{nombre_equipo_zip_sin_espacios}_{fecha_hoy}.zip"

    return zip_buffer.read(), nombre_zip