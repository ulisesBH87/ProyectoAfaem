from fastapi import HTTPException

from app.repositorios import equipo_repositorio
from app.repositorios import personas_repositorio
from app.repositorios import documentos_repositorio
from app.servicios import documentos_servicio
from app.modelos.catalogo_seguros import Seguro
from app.utilidades.file_handler import guardar_logo, parse_form_data
from app.enums.estatus_pago_enum import EstatusValidacionPago

def obtener_equipos_temporales_por_usuario_servicio(db, usuario_id):
    return equipo_repositorio.obtener_equipos_temporales_por_usuario_repo(db, usuario_id)

async def registrar_jugador_servicio(db, equipo_temporal_id, persona, documentos_afiliacion_ids, archivos, seguro_id):

    existe_persona = equipo_repositorio.existe_persona_repo(db, persona.curp)
    if existe_persona:
        raise HTTPException(400, "La persona ya existe")
    
    persona_id = personas_repositorio.crear_persona(db, persona)
    
    slots = equipo_repositorio.obtener_cantidad_slots(db, equipo_temporal_id)
    

    for slot in slots:
       
        if not slot.Completo:
            solicitud_id = equipo_repositorio.obtener_solicitud_id(db, equipo_temporal_id)
            await documentos_servicio.subir_documento_servicio2(db, persona_id, documentos_afiliacion_ids, archivos, solicitud_id)
            equipo_repositorio.actualizar_slot_repo(db, slot, persona_id, seguro_id)
    
            db.commit()
            return {"mensaje": "Jugador registrado"}
    

    raise HTTPException(400, "Todos los espacios ocupados")

def obtener_equipo_temporal_servicio(db, equipo_temporal_id):

    equipo = equipo_repositorio.obtener_equipo_temporal(db, equipo_temporal_id)

    slots = equipo_repositorio.obtener_slots_con_persona(db, equipo_temporal_id)

    seguros_pagados = equipo_repositorio.obtener_seguros_pagados(db, equipo.OrdenPagoId)

    seguros_usados = equipo_repositorio.contar_seguros_usados(slots)

    seguros_response = []

    for seguro_id, total in seguros_pagados.items():

        usados = seguros_usados.get(seguro_id, 0)

        seguro = db.query(Seguro).filter(Seguro.SeguroId == seguro_id).first()

        seguros_response.append({
            "seguro_id": seguro_id,
            "nombre": seguro.Nombre,
            "pagados": total,
            "usados": usados,
            "disponibles": total - usados
        })

    return {
        "equipo_temporal_id": equipo.EquipoTemporalId,
        "cantidad_jugadores_pagados": equipo.CantidadJugadoresPagados,
        "jugadores_registrados": sum(1 for s in slots if s.Completo),
        "jugadores_restantes": equipo.CantidadJugadoresPagados - sum(1 for s in slots if s.Completo),
        "seguros": seguros_response,
        "slots": [
            {
                "slot_id": s.EquipoTemporalJugadorId,
                "completo": s.Completo,
                "seguro_id": s.SeguroId,
                "persona": {
                    "persona_id": s.PersonaId
                } if s.PersonaId else None
            }
            for s in slots
        ]
    }


def hay_slots(db, equipo_id):
    disponibilidad = equipo_repositorio.hay_slots(db, equipo_id)

    if not disponibilidad:
        slots = False
    
    else:
        slots = True
        
    return slots


async def crear_equipo_completo_servicio(form_data, db, usuario):
    try:
        team_info, players_info = parse_form_data(form_data)
        equipo_temporal_id = team_info.get("equipo_temporal_id") or team_info.get("equipoTemporalId")

        presidente_id, presidente, rol_id = equipo_repositorio.obtener_presidente(
            db, usuario, team_info
        )

        pago_equipo = None #Si no es afiliación inicial de presidente
        if rol_id != 1: #Se obtiene el equipo temporal activo
            if equipo_temporal_id:
                try:
                    equipo_temporal_id_int = int(equipo_temporal_id)
                except (TypeError, ValueError):
                    raise HTTPException(status_code=400, detail="equipo_temporal_id inválido")
                
            pago_equipo = equipo_repositorio.obtener_equipo_temporal(db, equipo_temporal_id)

            if (not pago_equipo) or (pago_equipo.UsuarioId != usuario.UsuarioId):
                raise HTTPException(status_code=403, detail="EquipoTemporal no válido para este usuario")

            if (not pago_equipo.Activo) or (pago_equipo.EquipoId is not None):
                raise HTTPException(status_code=403,detail="Equipo temporal no está disponible para configuración")

            if (not pago_equipo.OrdenPagoRelacion) or (int(pago_equipo.OrdenPagoRelacion.EstatusPagoId) != int(EstatusValidacionPago.ACTIVO.value)):
                raise HTTPException(status_code=403, detail="El pago no está aprobado para configurar un nuevo equipo")
            else:
                pago_equipo = equipo_repositorio.obtener_equipo_temporal_pagado_activo(
                    db, usuario.UsuarioId
                )
            
            if not pago_equipo:
                raise HTTPException(
                    status_code=403,
                    detail="Debes tener un pago aprobado para configurar un nuevo equipo"
                )

            if len(players_info) > (pago_equipo.CantidadJugadoresPagados or 0):
                raise HTTPException(
                    status_code=400,
                    detail="El número de jugadores excede la cantidad pagada"
                )

        equipo = equipo_repositorio.obtener_o_crear_equipo(
            db, team_info["nombre_equipo"]
        )

        if pago_equipo:
            #vincular el equipo creado al equipo temporal
            pago_equipo.EquipoId = equipo.EquipoId
            db.flush()
            
        equipo_repositorio.crear_equipo_jugando(
            db, equipo, team_info, presidente_id, len(players_info)
        )

        await guardar_logo(form_data, equipo, db)

        # Crear solicitud administrativa si el usuario es admin (rol_id == 1)
        #solicitud_id = None
        #if rol_id == 1:  # ADMINISTRADOR
         #   solicitud_id = equipo_repositorio.crear_solicitud_administrativa(db, usuario.UsuarioId)
        #else:  # PRESIDENTE
         #   solicitud_id = equipo_repositorio.crear_solicitud_presidente(
          #  db, usuario.UsuarioId
        #)

        solicitud_id = pago_equipo.SolicitudId

        for index, player in enumerate(players_info):
            await equipo_repositorio.procesar_jugador(db, equipo, player, form_data, index, solicitud_id)

        equipo_repositorio.actualizar_usuario_y_presidente(
            db, usuario, presidente, rol_id
        )

        if pago_equipo:
            pago_equipo.Activo = False


        equipo_repositorio.actualizar_orden(db, solicitud_id)
        db.commit()

        return {
            "mensaje": "Equipo y jugadores creados exitosamente",
            "equipo_id": equipo.EquipoId
        }

    except:
        db.rollback()
        raise
"""
#REGISTRAR A JUGADOR A EQUIPO EXISTENTE
async def agregar_jugador_equipo_existente(request, db, usuario):


    equipo_id = validar_equipo_id(form_data)

    p_data = parsear_jugador(form_data)

    equipo = equipo_repo.obtener_equipo(db, equipo_id)
    equipo_jugando = equipo_repo.obtener_equipo_jugando(db, equipo_id)

    validar_datos_jugador(p_data)

    validar_email_unico(db, p_data.get("correo"))

    nueva_persona = crear_persona(db, p_data)

    antecedentes_id = crear_antecedentes(db, p_data)

    agregar_miembro_equipo(
        db,
        nueva_persona.PersonaId,
        equipo_id,
        p_data,
        antecedentes_id
    )

    equipo_repositorio.incrementar_jugadores(db, equipo_jugando)

    await procesar_documentos(db, form_data, nueva_persona.PersonaId)

    db.commit()

    return {
        "mensaje": "Jugador agregado exitosamente",
        "persona_id": nueva_persona.PersonaId
    }"""
