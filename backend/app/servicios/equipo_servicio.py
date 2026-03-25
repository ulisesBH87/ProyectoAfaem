from fastapi import HTTPException

from app.repositorios import equipo_repositorio
from app.repositorios import personas_repositorio
from app.repositorios import documentos_repositorio
from app.servicios import documentos_servicio

async def registrar_jugador_servicio(db, equipo_temporal_id, persona, documentos_afiliacion_ids, archivos):

    persona_id = personas_repositorio.crear_persona(db, persona)
    
    slots = equipo_repositorio.obtener_cantidad_slots(db, equipo_temporal_id)
    

    for slot in slots:
       
        if not slot.Completo:
            solicitud_id = equipo_repositorio.obtener_solicitud_id(db, equipo_temporal_id)
            await documentos_servicio.subir_documento_servicio2(db, persona_id, documentos_afiliacion_ids, archivos, solicitud_id)
            equipo_repositorio.actualizar_slot_repo(db, slot, persona_id)
    
            db.commit()
            return {"mensaje": "Jugador registrado"}
    

    raise HTTPException(400, "Todos los espacios ocupados")