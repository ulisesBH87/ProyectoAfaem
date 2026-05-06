import json, os
from fastapi import HTTPException
from datetime import datetime
from app.repositorios import documentos_repositorio
from app.enums.documentos_estatus_enum import DocumentoEstatus

UPLOAD_DIR = "uploads/equipos"

DOCS_DIR = os.path.join(UPLOAD_DIR, "documentos")

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
    team_logo = form_data.get("team_logo")

    if not team_logo or not getattr(team_logo, "filename", None):
        return

    LOGOS_DIR = os.path.join(UPLOAD_DIR, "logos")
    os.makedirs(LOGOS_DIR, exist_ok=True)

    ext = team_logo.filename.rsplit(".", 1)[-1] if "." in team_logo.filename else "bin"
    nombre = f"Logo_{equipo.EquipoId}_{datetime.now().strftime('%Y%m%d%H%M%S')}.{ext}"
    ruta = os.path.join(LOGOS_DIR, nombre)

    with open(ruta, "wb") as buffer:
        buffer.write(await team_logo.read())

    equipo.RutaLogo = os.path.join(LOGOS_DIR, nombre).replace("\\", "/")
    db.flush()
