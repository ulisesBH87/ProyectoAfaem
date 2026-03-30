"""
Script de seed para insertar datos en las tablas:
  - Menus
  - RelMenuRoles
  - RelUsuarioRoles

Ejecutar desde la carpeta /backend:
  ./venv/bin/python seed_data.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("BASE_DATOS_URL")
if not DATABASE_URL:
    raise RuntimeError("No se encontró BASE_DATOS_URL en el archivo .env")

engine = create_engine(DATABASE_URL, echo=False)

def run():
    print("=" * 55)
    print("  SEED: Insertando datos en la base de datos")
    print("=" * 55)

    with engine.begin() as conn:

        # ─────────────────────────────────────────────
        # 1. MENUS  (con IDENTITY_INSERT)
        # ─────────────────────────────────────────────
        print("\n[1/3] Tabla Menus...")

        menus = [
            # (MenuId, Nombre,               Ruta,                               Icono,            Orden, Estatus, MenuPadreId)
            (1, "Administración",       None,                               "FaShieldAlt",    1, 1, None),
            (2, "Tablero Principal",    "/admin/dashboard",                 "FaHome",         1, 1, 1),
            (3, "Validar Solicitudes",  "/admin/solicitudes",               "FaClipboardList",2, 1, 1),
            (4, "Validación de Pagos",  "/admin/pagos",                     "FaShieldAlt",    3, 1, 1),
            (5, "Mi Equipo",            None,                               "FaFootballBall", 2, 1, None),
            (6, "Inicio",               "/presidente-equipo",               "FaHome",         1, 1, 5),
            (7, "Equipos",              "/presidente-equipo/equipos",       "FaFootballBall", 2, 1, 5),
            (8, "Jugadores",            "/presidente-equipo/mis-jugadores", "FaUsers",        3, 1, 5),
            (9, "Solicitudes",          "/presidente-equipo/solicitudes",   "FaClipboard",    4, 1, 5),
        ]

        conn.execute(text("SET IDENTITY_INSERT Menus ON"))
        for m in menus:
            menu_id, nombre, ruta, icono, orden, estatus, padre_id = m
            existing = conn.execute(
                text("SELECT COUNT(*) FROM Menus WHERE MenuId = :id"), {"id": menu_id}
            ).scalar()
            if existing == 0:
                conn.execute(
                    text("""
                        INSERT INTO Menus (MenuId, Nombre, Ruta, Icono, Orden, Estatus, MenuPadreId)
                        VALUES (:id, :nombre, :ruta, :icono, :orden, :estatus, :padre)
                    """),
                    {"id": menu_id, "nombre": nombre, "ruta": ruta,
                     "icono": icono, "orden": orden, "estatus": estatus, "padre": padre_id}
                )
                print(f"  ✅  Menu {menu_id} '{nombre}' insertado.")
            else:
                print(f"  ⏭   Menu {menu_id} '{nombre}' ya existe, se omite.")
        conn.execute(text("SET IDENTITY_INSERT Menus OFF"))

        # ─────────────────────────────────────────────
        # 2. REL MENU ROLES  (con IDENTITY_INSERT)
        # ─────────────────────────────────────────────
        print("\n[2/3] Tabla RelMenuRoles...")

        rel_menu_roles = [
            # (MenuRolId, MenuId, RolId, Estatus)
            (1,  1, 1, 1),
            (2,  2, 1, 1),
            (3,  3, 1, 1),
            (4,  4, 1, 1),
            (5,  5, 1, 1),
            (6,  6, 1, 1),
            (7,  7, 1, 1),
            (8,  8, 1, 1),
            (9,  9, 1, 1),
            (10, 5, 3, 1),
            (11, 6, 3, 1),
            (12, 7, 3, 1),
            (13, 8, 3, 1),
            (14, 9, 3, 1),
        ]

        conn.execute(text("SET IDENTITY_INSERT RelMenuRoles ON"))
        for r in rel_menu_roles:
            menu_rol_id, menu_id, rol_id, estatus = r
            existing = conn.execute(
                text("SELECT COUNT(*) FROM RelMenuRoles WHERE MenuRolId = :id"), {"id": menu_rol_id}
            ).scalar()
            if existing == 0:
                conn.execute(
                    text("""
                        INSERT INTO RelMenuRoles (MenuRolId, MenuId, RolId, Estatus)
                        VALUES (:mrid, :mid, :rid, :est)
                    """),
                    {"mrid": menu_rol_id, "mid": menu_id, "rid": rol_id, "est": estatus}
                )
                print(f"  ✅  RelMenuRol {menu_rol_id} (Menu {menu_id} → Rol {rol_id}) insertado.")
            else:
                print(f"  ⏭   RelMenuRol {menu_rol_id} ya existe, se omite.")
        conn.execute(text("SET IDENTITY_INSERT RelMenuRoles OFF"))

        # ─────────────────────────────────────────────
        # 3. REL USUARIO ROLES  (con IDENTITY_INSERT)
        # ─────────────────────────────────────────────
        print("\n[3/3] Tabla RelUsuarioRoles...")

        rel_usuario_roles = [
            # (UsuarioRolId, UsuarioId, RolId, Estatus)
            (1, 1, 3, 1),
            (2, 4, 7, 1),
            (3, 5, 7, 1),
            (4, 6, 1, 1),
            (5, 7, 7, 1),
        ]

        # Obtener usuarios y roles válidos para validar FK antes de insertar
        valid_usuario_ids = {r[0] for r in conn.execute(text("SELECT UsuarioId FROM Usuarios")).fetchall()}
        valid_rol_ids = {r[0] for r in conn.execute(text("SELECT RolId FROM Roles")).fetchall()}

        conn.execute(text("SET IDENTITY_INSERT RelUsuarioRoles ON"))
        for u in rel_usuario_roles:
            uur_id, usuario_id, rol_id, estatus = u

            # Validar FKs antes de insertar
            if usuario_id not in valid_usuario_ids:
                print(f"  ⚠️   RelUsuarioRol {uur_id}: UsuarioId={usuario_id} NO existe en Usuarios. Se omite.")
                continue
            if rol_id not in valid_rol_ids:
                print(f"  ⚠️   RelUsuarioRol {uur_id}: RolId={rol_id} NO existe en Roles. Se omite.")
                continue

            existing = conn.execute(
                text("SELECT COUNT(*) FROM RelUsuarioRoles WHERE UsuarioRolId = :id"), {"id": uur_id}
            ).scalar()
            if existing == 0:
                conn.execute(
                    text("""
                        INSERT INTO RelUsuarioRoles (UsuarioRolId, UsuarioId, RolId, Estatus)
                        VALUES (:uid, :usid, :rid, :est)
                    """),
                    {"uid": uur_id, "usid": usuario_id, "rid": rol_id, "est": estatus}
                )
                print(f"  ✅  RelUsuarioRol {uur_id} (Usuario {usuario_id} → Rol {rol_id}) insertado.")
            else:
                print(f"  ⏭   RelUsuarioRol {uur_id} ya existe, se omite.")
        conn.execute(text("SET IDENTITY_INSERT RelUsuarioRoles OFF"))

    print("\n" + "=" * 55)
    print("  ✅  Seed completado exitosamente.")
    print("=" * 55)

if __name__ == "__main__":
    try:
        run()
    except Exception as e:
        print(f"\n❌ Error durante el seed: {e}")
        raise
