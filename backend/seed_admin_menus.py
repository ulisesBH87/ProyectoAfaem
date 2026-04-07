from app.db.sesion import SessionLocal
from app.modelos.menus_modelo import Menus
from app.modelos.rel_menu_roles_modelo import RelMenuRoles

def add_admin_menus():
    db = SessionLocal()
    try:
        # Check if already exists
        exists = db.query(Menus).filter(Menus.Icono == "FaClipboardList").first()
        
        menu1 = Menus(
            Nombre="Catálogo Equipos",
            Icono="FaFootballBall",
            Ruta="/admin/equipos",
            Orden=4,
            Estatus=True
        )
        menu2 = Menus(
            Nombre="Catálogo Jugadores",
            Icono="FaUsers",
            Ruta="/admin/jugadores",
            Orden=5,
            Estatus=True
        )
        db.add(menu1)
        db.add(menu2)
        db.flush()

        # Rol Administrador ID = 1
        rel1 = RelMenuRoles(MenuId=menu1.MenuId, RolId=1, Estatus=True)
        rel2 = RelMenuRoles(MenuId=menu2.MenuId, RolId=1, Estatus=True)
        db.add(rel1)
        db.add(rel2)
        
        db.commit()
        print("Menús agregados exitosamente al rol de Administrador!")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    add_admin_menus()
