import pyodbc

conn_str = "Driver={ODBC Driver 17 for SQL Server};Server=10.20.53.2;Database=baseafaem;UID=sa;PWD=Config*feb19"
try:
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    cursor.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MiembrosEquipo'")
    rows = cursor.fetchall()
    print("Columnas en MiembrosEquipo:")
    for row in rows:
        print(f"- {row[0]}")
    conn.close()
except Exception as e:
    print(f"Error: {e}")
