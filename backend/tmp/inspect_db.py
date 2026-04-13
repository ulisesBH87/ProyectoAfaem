import sqlalchemy
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

BASE_DATOS_URL = os.getenv("BASE_DATOS_URL")
engine = create_engine(BASE_DATOS_URL)

with engine.connect() as conn:
    print("--- USUARIO ---")
    res = conn.execute(text("SELECT UsuarioId, PersonaId, Correo FROM Usuarios WHERE Correo = 'emilianoadmin@gmail.com'"))
    for row in res:
        print(f"UsuarioId: {row[0]}, PersonaId: {row[1]}, Correo: {row[2]}")
    
    print("\n--- PRESIDENTES DE EQUIPO ---")
    res = conn.execute(text("SELECT PresidenteEquipoId, PersonaId FROM PresidentesDeEquipo"))
    for row in res:
        print(f"PresidenteEquipoId: {row[0]}, PersonaId: {row[1]}")

    print("\n--- EQUIPOS ---")
    res = conn.execute(text("SELECT EquipoId, NombreEquipo, PresidenteEquipoId FROM Equipos"))
    for row in res:
        print(f"EquipoId: {row[0]}, NombreEquipo: {row[1]}, PresidenteEquipoId: {row[2]}")

    print("\n--- CATÁLOGOS LIGA ---")
    res = conn.execute(text("SELECT TOP 5 * FROM LigaModalidadCategoriaRama"))
    for row in res:
        print(row)
