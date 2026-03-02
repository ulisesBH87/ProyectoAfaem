from sqlalchemy import create_engine #Importa la función create_engine de SQLAlchemy para crear el motor de la base de datos
from sqlalchemy.orm import sessionmaker #Importa la función sessionmaker de SQLAlchemy para crear una clase de sesión local

# Configuración de la base de datos
DATABASE_URL = (
    "mssql+pyodbc://usuario:password@localhost/Prueba"
    "?driver=ODBC+Driver+17+for+SQL+Server"
)

# Crear el motor de la base de datos y la sesión
engine = create_engine(DATABASE_URL)
# Crear una clase de sesión local
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
