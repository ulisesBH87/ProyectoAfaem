import json, os
from fastapi import HTTPException
from datetime import datetime
from fastapi import UploadFile

UPLOAD_DIR = "uploads/equipos"

DOCS_DIR = os.path.join(UPLOAD_DIR, "documentos")

def parse_form_data(form_data):
    team_data = form_data.get("team_data")
    players_data = form_data.get("players_data")

    if not team_data or not players_data:
        raise HTTPException(400, "Faltan datos de equipo o jugadores")

    return json.loads(team_data), json.loads(players_data)


async def guardar_logo(form_data, equipo, db):
    team_logo = form_data.get("team_logo")

    if not team_logo or not isinstance(team_logo, UploadFile):
        return

    LOGOS_DIR = os.path.join(UPLOAD_DIR, "logos")
    os.makedirs(LOGOS_DIR, exist_ok=True)

    ext = team_logo.filename.split(".")[-1]
    nombre = f"Logo_{equipo.EquipoId}_{datetime.now().strftime('%Y%m%d%H%M%S')}.{ext}"
    ruta = os.path.join(LOGOS_DIR, nombre)

    with open(ruta, "wb") as buffer:
        buffer.write(await team_logo.read())

    equipo.RutaLogo = os.path.join("uploads", "logos", nombre).replace("\\", "/")
    db.flush()


async def guardar_documentos_jugador(form_data, equipo, persona, index):
    doc_types = ["acta", "ine", "foto", "formato"]

    os.makedirs(DOCS_DIR, exist_ok=True)

    for doc_type in doc_types:
        file_key = f"player_{index}_{doc_type}"
        archivo = form_data.get(file_key)

        if archivo and isinstance(archivo, UploadFile):
            ext = archivo.filename.split(".")[-1]

            nombre = f"{equipo.NombreEquipo}_{persona.CURP}_{doc_type}.{ext}".replace(" ", "_")
            ruta = os.path.join(DOCS_DIR, nombre)

            with open(ruta, "wb") as buffer:
                buffer.write(await archivo.read())

