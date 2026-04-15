import sys
import os
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, backend_path)

from app.db.conexion import engine
from sqlalchemy import inspect

inspector = inspect(engine)
tables = ['Equipos', 'EquiposJugando']
for table in tables:
    try:
        print(f"\n{table} columns:")
        for col in inspector.get_columns(table):
            print(f"- {col['name']} ({col['type']})")
    except Exception as e:
        print(f"Error {table}:", e)
