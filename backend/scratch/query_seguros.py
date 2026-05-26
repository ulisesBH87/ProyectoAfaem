import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load env variables
load_dotenv()
db_url = os.getenv("BASE_DATOS_URL")
if not db_url:
    print("BASE_DATOS_URL not found in env")
    exit(1)

print(f"Connecting to database: {db_url}")
engine = create_engine(db_url)
Session = sessionmaker(bind=engine)
session = Session()

from sqlalchemy import Table, MetaData
metadata = MetaData()
metadata.reflect(bind=engine)

if "Seguros" in metadata.tables:
    seguros_table = metadata.tables["Seguros"]
else:
    seguros_table = metadata.tables.get("seguro") or metadata.tables.get("Seguro")

if seguros_table is None:
    print("Seguros table not found. Available tables:", list(metadata.tables.keys()))
    exit(1)

print("Columns in Seguros table:", [c.name for c in seguros_table.columns])

# Execute query to list all rows
connection = engine.connect()
results = connection.execute(seguros_table.select()).fetchall()
print(f"Found {len(results)} seguros:")
for row in results:
    print(dict(row._mapping))

session.close()
connection.close()
