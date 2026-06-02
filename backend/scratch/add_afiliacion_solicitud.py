from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("BASE_DATOS_URL")

engine = create_engine(db_url)

with engine.connect() as conn:
    try:
        # Check if Afiliacion exists on Solicitudes
        conn.execute(text("""
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Solicitudes]') AND name = 'Afiliacion')
            BEGIN
                ALTER TABLE [dbo].[Solicitudes] ADD [Afiliacion] VARCHAR(100) NULL;
            END
        """))
        conn.commit()
        print("Columna Afiliacion agregada/verificada en la tabla Solicitudes.")
    except Exception as e:
        print(f"Error al agregar la columna: {e}")
