
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("BASE_DATOS_URL")
engine = create_engine(DATABASE_URL)

def inspect_table(table_name):
    print(f"\n--- Inspecting {table_name} ---")
    with engine.connect() as conn:
        try:
            # Query to get column names in SQL Server
            res = conn.execute(text(f"SELECT COLUMN_NAME, IS_NULLABLE, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '{table_name}'"))
            for row in res:
                print(row)
        except Exception as e:
            print(f"Error: {e}")

inspect_table("Ligas")
inspect_table("CatalogoCategorias")
inspect_table("CatalogoModalidad")
inspect_table("CatalogoRamas")
inspect_table("LigaModalidadCategoriaRama")
