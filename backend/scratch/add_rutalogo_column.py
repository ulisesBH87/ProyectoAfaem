from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("BASE_DATOS_URL")

engine = create_engine(db_url)

with engine.connect() as conn:
    print("Conectado a la base de datos...")
    try:
        conn.execute(text("ALTER TABLE Equipos ADD RutaLogo NVARCHAR(500) NULL"))
        conn.commit()
        print("Columna RutaLogo agregada exitosamente a la tabla Equipos.")
    except Exception as e:
        if "already" in str(e).lower() or "exist" in str(e).lower():
            print("La columna RutaLogo ya existe o hubo un error manejado.")
        else:
            print(f"Error al agregar la columna: {e}")
