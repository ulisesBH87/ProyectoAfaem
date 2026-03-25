from sqlalchemy import create_engine, MetaData, Table

import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
db_url = os.getenv("BASE_DATOS_URL")
if not db_url:
    print("No DATABASE_URL found.")
    exit(1)

engine = create_engine(db_url)
metadata = MetaData()
metadata.reflect(bind=engine)

if 'EquipoTemporal' in metadata.tables:
    table = metadata.tables['EquipoTemporal']
    print("-- Foreign Keys of EquipoTemporal --")
    for fk in table.foreign_keys:
        print(f"Name: {fk.name}, Column: {fk.column}")
        
    print("-- Columns of EquipoTemporal --")
    for c in table.columns:
        print(c.name)
        
    print("-- Constraints of EquipoTemporal --")
    for c in table.constraints:
        print(c.name)
else:
    print("Table EquipoTemporal not found.")
