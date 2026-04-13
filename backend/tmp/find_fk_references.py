import sys
import os
from sqlalchemy import create_engine, text

def find_foreign_keys():
    conn_str = "mssql+pyodbc://sa:Config*feb19@10.20.53.2/baseafaem?driver=ODBC+Driver+17+for+SQL+Server"
    engine = create_engine(conn_str)
    
    query = """
    SELECT 
        tp.name AS TableName, 
        fk.name AS FKName,
        cp.name AS ColumnName,
        tr.name AS ReferencedTable,
        cr.name AS ReferencedColumn
    FROM sys.foreign_keys AS fk
    INNER JOIN sys.foreign_key_columns AS fkc ON fk.object_id = fkc.constraint_object_id
    INNER JOIN sys.tables AS tp ON fkc.parent_object_id = tp.object_id
    INNER JOIN sys.columns AS cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
    INNER JOIN sys.tables AS tr ON fkc.referenced_object_id = tr.object_id
    INNER JOIN sys.columns AS cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
    WHERE tr.name = 'PresidenteDeEquipo'
    """
    
    try:
        with engine.connect() as conn:
            results = conn.execute(text(query)).fetchall()
            print("--- Tablas que referencian a PresidenteDeEquipo (Singular) ---")
            if not results:
                print("No se encontraron referencias.")
            for row in results:
                print(f"Tabla: {row.TableName}, FK: {row.FKName}, Columna: {row.ColumnName} -> {row.ReferencedTable}.{row.ReferencedColumn}")
            
            print("\n--- Catálogos de Estatus ---")
            # También quiero ver si CatalogoEstatusPresidente o CatalogoEstatusPresidenteEquipo se están usando
            cat_check = """
            SELECT name FROM sys.tables WHERE name LIKE 'CatalogoEstatusPresidente%'
            """
            cats = conn.execute(text(cat_check)).fetchall()
            for cat in cats:
                print(f"Tabla encontrada: {cat.name}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    find_foreign_keys()
