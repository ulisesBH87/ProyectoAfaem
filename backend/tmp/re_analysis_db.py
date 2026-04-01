import sqlalchemy
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

BASE_DATOS_URL = os.getenv("BASE_DATOS_URL")
engine = create_engine(BASE_DATOS_URL)

with engine.connect() as conn:
    print("=== ANÁLISIS DE RELACIONES PARA EQUIPOS ===")
    
    # 1. Buscar el usuario Emiliano
    print("\n[1] Tabla Usuarios (Filtrado por emilianoadmin@gmail.com):")
    res = conn.execute(text("SELECT UsuarioId, PersonaId, Correo FROM Usuarios WHERE Correo = 'emilianoadmin@gmail.com'"))
    user = res.fetchone()
    if user:
        print(f"    - UsuarioId: {user[0]}")
        print(f"    - PersonaId: {user[1]}")
        print(f"    - Correo: {user[2]}")
        persona_id = user[1]
    else:
        print("    - Usuario no encontrado.")
        persona_id = None

    # 2. Buscar si esa PersonaId es un Presidente
    if persona_id:
        print(f"\n[2] Tabla PresidentesDeEquipo (Buscando PersonaId: {persona_id}):")
        res = conn.execute(text(f"SELECT PresidenteEquipoId, PersonaId, EstatusId FROM PresidentesDeEquipo WHERE PersonaId = {persona_id}"))
        pres = res.fetchone()
        if pres:
            print(f"    - PresidenteEquipoId: {pres[0]}")
            print(f"    - PersonaId: {pres[1]}")
            print(f"    - EstatusId: {pres[2]}")
            pres_id = pres[0]
        else:
            print(f"    - No se encontró un registro de Presidente para la PersonaId {persona_id}")
            pres_id = None
    
    # 3. Listado general de Presidentes (para ver quién tiene el ID 1)
    print("\n[3] Listado General de Presidentes (Muestra de los primeros 10):")
    res = conn.execute(text("SELECT TOP 10 PresidenteEquipoId, PersonaId FROM PresidentesDeEquipo ORDER BY PresidenteEquipoId ASC"))
    for row in res:
        print(f"    - PresidenteEquipoId: {row[0]}, PersonaId: {row[1]}")

    # 4. Tabla Equipos
    print("\n[4] Tabla Equipos (Todos los registros):")
    res = conn.execute(text("SELECT EquipoId, NombreEquipo, PresidenteEquipoId, Estatus FROM Equipos"))
    teams = res.fetchall()
    if teams:
        for t in teams:
            print(f"    - EquipoId: {t[0]}, Nombre: {t[1]}, PresidenteID: {t[2]}, Estatus: {t[3]}")
    else:
        print("    - No hay equipos registrados en la tabla.")

    # 5. Verificación de Integridad de Catálogos (LigaModalidadCategoriaRama)
    print("\n[5] Tabla LigaModalidadCategoriaRama (ID: 1):")
    res = conn.execute(text("SELECT * FROM LigaModalidadCategoriaRama WHERE LigaModalidadCategoriaRamaId = 1"))
    cat = res.fetchone()
    if cat:
        print(f"    - Registro encontrado: {cat}")
    else:
        print("    - Registro ID 1 NO encontrado (esencial para EquipoZzz).")

    print("\n=== FIN DEL ANÁLISIS ===")
