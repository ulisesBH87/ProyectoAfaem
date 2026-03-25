import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from app.db.sesion import SessionLocal
from app.servicios.autenticacion_servicio import iniciar_sesion

db = SessionLocal()
try:
    print("Testing iniciar_sesion...")
    res = iniciar_sesion(db, "saaibtest2@example.com", "123456")
    print(res)
    if res:
        print("RolRelacion:", getattr(res, "RolRelacion", "No attribute RolRelacion"))
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
