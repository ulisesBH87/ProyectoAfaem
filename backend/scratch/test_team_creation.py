import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.sesion import SessionLocal
from app.modelos.equipo_modelo import Equipos, EquiposJugando
from app.modelos.catalogos_liga_modelo import Ligas
from app.modelos.presidente_equipo_modelo import PresidenteEquipo
from app.modelos.usuario_modelo import Usuario

def test():
    db = SessionLocal()
    try:
        # 1. Obtener una liga válida
        liga = db.query(Ligas).first()
        if not liga:
            print("No leagues found in DB")
            return
        print(f"Liga ID: {liga.LigaId}, Nombre: {liga.Nombreliga}")
        
        # 2. Obtener un presidente válido
        pres = db.query(PresidenteEquipo).first()
        if not pres:
            print("No presidents found in DB")
            user = db.query(Usuario).first()
            if user:
                print(f"Encontrado usuario candidato a presidente: ID={user.UsuarioId}, PersonaId={user.PersonaId}")
                pres = PresidenteEquipo(PersonaId=user.PersonaId, EstatusId=7)
                db.add(pres)
                db.flush()
            else:
                print("No users found to act as president")
                return

        print(f"Presidente ID: {pres.PresidenteEquipoId}")
        
        # 3. Intentar crear equipo y EquiposJugando
        import random
        rname = f"Test Team {random.randint(1000, 9999)}"
        print(f"Creando equipo {rname}")
        
        equipo_real = Equipos(NombreEquipo=rname, Estatus=True)
        db.add(equipo_real)
        db.flush()
        print(f"Equipo creado con ID: {equipo_real.EquipoId}")
        
        eq_jugando = EquiposJugando(
            EquipoId=equipo_real.EquipoId,
            LigaId=liga.LigaId,
            PresidenteEquipoId=pres.PresidenteEquipoId,
            CantidadJugadores=0
        )
        db.add(eq_jugando)
        db.flush()
        print("EquiposJugando insertado correctamente")
        
        db.rollback()
        print("Test exitoso, transacción revertida correctamente.")
    except Exception as e:
        print(f"ERROR durante la inserción: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    test()
