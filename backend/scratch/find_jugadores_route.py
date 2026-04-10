import pyodbc
import os

conn_str = "Driver={ODBC Driver 17 for SQL Server};Server=10.20.53.2;Database=baseafaem;UID=sa;PWD=Config*feb19"
try:
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    cursor.execute("SELECT Nombre, Ruta FROM Menus WHERE Nombre LIKE '%Jugadores%'")
    rows = cursor.fetchall()
    for row in rows:
        print(f"Nombre: {row[0]}, Ruta: {row[1]}")
    conn.close()
except Exception as e:
    print(f"Error: {e}")
