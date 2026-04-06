import sys
import os
from sqlalchemy import create_engine, text

def update_db():
    conn_str = "mssql+pyodbc://sa:Config*feb19@10.20.53.2/baseafaem?driver=ODBC+Driver+17+for+SQL+Server"
    engine = create_engine(conn_str)
    
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            print("--- Actualizando Relaciones de Base de Datos ---")
            
            # 1. Eliminar FK obsoleta
            print("Paso 1: Eliminando FK_Equipos_Presidente...")
            conn.execute(text("ALTER TABLE [dbo].[Equipos] DROP CONSTRAINT [FK_Equipos_Presidente];"))
            
            # 2. Eliminar tabla singular
            print("Paso 2: Eliminando tabla singular PresidenteDeEquipo...")
            conn.execute(text("DROP TABLE [dbo].[PresidenteDeEquipo];"))
            
            # 3. Crear nueva FK hacia plural
            print("Paso 3: Creando nueva FK_Equipos_Presidentes_Plural...")
            conn.execute(text("""
                ALTER TABLE [dbo].[Equipos] 
                ADD CONSTRAINT [FK_Equipos_Presidentes_Plural] 
                FOREIGN KEY ([PresidenteEquipoId]) 
                REFERENCES [dbo].[PresidentesDeEquipo] ([PresidenteEquipoId]);
            """))
            
            trans.commit()
            print("\n--- Actualización completada exitosamente ---")
            
        except Exception as e:
            trans.rollback()
            print(f"Error durante la actualización: {e}")
            raise

if __name__ == "__main__":
    update_db()
