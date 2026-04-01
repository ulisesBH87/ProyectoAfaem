import sys
import os
from sqlalchemy import create_engine, text

def update_db_with_migration():
    conn_str = "mssql+pyodbc://sa:Config*feb19@10.20.53.2/baseafaem?driver=ODBC+Driver+17+for+SQL+Server"
    engine = create_engine(conn_str)
    
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            print("--- Iniciando Proceso de Migración a Presidente PLURAL ---")
            
            # 1. Eliminar FK obsoleta
            print("Paso 1: Eliminando FK_Equipos_Presidente (Singular)...")
            conn.execute(text("ALTER TABLE [dbo].[Equipos] DROP CONSTRAINT [FK_Equipos_Presidente];"))
            
            # 2. Migrar IDs de Equipos (Mapeo Singular -> Plural)
            # PersonaId 4: Singular 1 -> Plural 5
            # PersonaId 8: Singular 2 -> Plural 19
            print("Paso 2: Migrando IDs de Equipos de Singular a Plural...")
            conn.execute(text("UPDATE [dbo].[Equipos] SET PresidenteEquipoId = 5 WHERE PresidenteEquipoId = 1"))
            conn.execute(text("UPDATE [dbo].[Equipos] SET PresidenteEquipoId = 19 WHERE PresidenteEquipoId = 2"))
            
            # 3. Eliminar tabla singular
            print("Paso 3: Eliminando tabla singular PresidenteDeEquipo...")
            conn.execute(text("DROP TABLE [dbo].[PresidenteDeEquipo];"))
            
            # 4. Crear nueva FK hacia plural
            print("Paso 4: Creando nueva FK_Equipos_Presidentes_Plural...")
            conn.execute(text("""
                ALTER TABLE [dbo].[Equipos] 
                ADD CONSTRAINT [FK_Equipos_Presidentes_Plural] 
                FOREIGN KEY ([PresidenteEquipoId]) 
                REFERENCES [dbo].[PresidentesDeEquipo] ([PresidenteEquipoId]);
            """))
            
            trans.commit()
            print("\n--- Migración de Base de Datos COMPLETADA ---")
            
        except Exception as e:
            trans.rollback()
            print(f"ERROR durante la migración: {e}")
            raise

if __name__ == "__main__":
    update_db_with_migration()
