import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from app.db.conexion import engine
from sqlalchemy import inspect

inspector = inspect(engine)
try:
    print("Roles columns:")
    for col in inspector.get_columns('Roles'):
        print(col['name'], col['type'])
except Exception as e:
    print("Error Roles:", e)

try:
    print("\nUsuarios columns:")
    for col in inspector.get_columns('Usuarios'):
        print(col['name'], col['type'])
except Exception as e:
    print("Error Usuarios:", e)
