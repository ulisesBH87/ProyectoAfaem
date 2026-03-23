from app.modelos.equipo_temporal_modelo import EquipoTemporal
from app.modelos.equipo_temporal_jugador_modelo import EquipoTemporalJugador
from app.modelos.orden_pago_detalle_modelo import OrdenPagoDetalle

def crear_equipo_temporal_repo(db, orden):
    #obtener cantidad de jugadores pagados
    detalles = db.query(OrdenPagoDetalle).filter(OrdenPagoDetalle.OrdenPagoId == orden.OrdenPagoId).all()
    existe = db.query(EquipoTemporal).filter(
        EquipoTemporal.OrdenPagoId == orden.OrdenPagoId
    ).first()

    if existe:
        return existe
    
    cantidad_jugadores = 0

    for d in detalles:
        print("detalle:", d.TipoConceptoId, d.TipoAfiliacionId, d.Cantidad)
        if d.TipoConceptoId == 1:   #INSCRIPCION
            if d.TipoAfiliacionId == 4: #JUGADOR MAYOR
                cantidad_jugadores = d.Cantidad
    
    # crear equipo temporal
    equipo = EquipoTemporal(
        UsuarioId=orden.UsuarioId,
        OrdenPagoId=orden.OrdenPagoId,
        Activo=True,
        CantidadJugadoresPagados=cantidad_jugadores,
        TipoProcesoId=1 #REGISTRO INICIAL
    )

    db.add(equipo)
    db.flush()

    #creación de slots
    for i in range(cantidad_jugadores):
        slot = EquipoTemporalJugador(
            EquipoTemporalId = equipo.EquipoTemporalId,
            Completo=False
        )
        db.add(slot)

    return equipo

"""
def obtener_slot_repo(db, slot_id):
    return db.query(EquipoTemporalJugador).filter(EquipoTemporalJugador.EquipoTemporalJugadorId == slot_id).first()

def actualizar_slot_repo(db, slot, persona_id):

    slot.PersonaId = persona_id
    slot.Completo = True

    return slot
"""