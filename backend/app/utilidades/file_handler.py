import json, os
from fastapi import HTTPException
from datetime import datetime
from app.repositorios import documentos_repositorio
from app.enums.documentos_estatus_enum import DocumentoEstatus

# Las rutas de producción se obtienen dinámicamente con obtener_uploads_dir() (config.py)
# No se definen constantes de ruta aquí para evitar rutas relativas en producción.

def parse_form_data(form_data):
    try:
        team_data = form_data.get("team_data")
        players_data = form_data.get("players_data")

        if not team_data or not players_data:
            raise HTTPException(400, "Faltan datos de equipo o jugadores")

        return json.loads(team_data), json.loads(players_data)

    except json.JSONDecodeError:
        raise HTTPException(400, "Error al parsear JSON de team_data o players_data")


async def guardar_logo(form_data, equipo, db):
    """
    Guarda el logo del equipo en la ruta de producción:
        <uploads_base>/equipos/<NombreEquipo>/logo.<ext>

    Si no se recibe logo, la función retorna sin hacer nada (logo es opcional).
    """
    team_logo = form_data.get("team_logo")

    if not team_logo or not getattr(team_logo, "filename", None):
        return

    from app.core.config import obtener_uploads_dir
    base_uploads_dir = obtener_uploads_dir()

    # Sanitizar el nombre del equipo para usarlo como carpeta del sistema de archivos
    nombre_equipo = equipo.NombreEquipo or f"equipo_{equipo.EquipoId}"
    nombre_carpeta = nombre_equipo.strip().replace("/", "_").replace("\\", "_")

    # Crear la carpeta: <uploads_base>/equipos/<NombreEquipo>/
    equipo_dir = os.path.join(base_uploads_dir, "equipos", nombre_carpeta)
    os.makedirs(equipo_dir, exist_ok=True)

    ext = team_logo.filename.rsplit(".", 1)[-1] if "." in team_logo.filename else "bin"
    nombre_archivo = f"logo.{ext}"
    ruta_absoluta = os.path.join(equipo_dir, nombre_archivo)

    with open(ruta_absoluta, "wb") as buffer:
        buffer.write(await team_logo.read())

    # Guardar ruta relativa en la BD (relativa al directorio base de uploads)
    equipo.RutaLogo = os.path.join("equipos", nombre_carpeta, nombre_archivo).replace("\\", "/")
    db.flush()
