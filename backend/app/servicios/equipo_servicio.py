from collections import Counter

from fastapi import HTTPException

from app.repositorios import equipo_repositorio
from app.repositorios import personas_repositorio
from app.repositorios import documentos_repositorio
from app.servicios import documentos_servicio
from app.modelos.catalogo_seguros import Seguro
from app.utilidades.file_handler import guardar_logo, parse_form_data
from app.enums.estatus_pago_enum import EstatusValidacionPago
from app.modelos.equipo_temporal_jugador_modelo import EquipoTemporalJugador
from app.modelos.equipo_temporal_modelo import EquipoTemporal
from app.modelos.solicitud_modelo import Solicitud
from app.enums.proceso_equipo_temporal_enum import EquipoTemporalProcesoEnum
from app.enums.tipos_solicitud_enum import TiposSolicitudEnum

def obtener_equipos_temporales_por_usuario_servicio(db, usuario_id):
    return equipo_repositorio.obtener_equipos_temporales_por_usuario_repo(db, usuario_id)

async def registrar_jugador_servicio(db, equipo_temporal_id, persona, documentos_afiliacion_ids, archivos, seguro_id, slot_id=None, extra_data=None):

    # Validar disponibilidad de seguro
    equipo = equipo_repositorio.obtener_equipo_temporal(db, equipo_temporal_id)
    if not equipo:
        raise HTTPException(404, "Equipo temporal no encontrado")
        
    seguros_pagados = equipo_repositorio.obtener_seguros_pagados(db, equipo.OrdenPagoId)
    slots = equipo_repositorio.obtener_slots_con_persona(db, equipo_temporal_id)
    seguros_usados = {}
    for s in slots:
        if s.SeguroId and s.Completo and s.PersonaId and (slot_id is None or s.EquipoTemporalJugadorId != slot_id):
            seguros_usados[s.SeguroId] = seguros_usados.get(s.SeguroId, 0) + 1
            
    pagados = seguros_pagados.get(seguro_id, 0)
    usados = seguros_usados.get(seguro_id, 0)
    
    if usados >= pagados:
        raise HTTPException(
            400, 
            f"No hay suficientes seguros disponibles de este tipo. Adquiridos: {pagados}, ya asignados: {usados}."
        )

    existe_persona = equipo_repositorio.existe_persona_repo(db, persona.curp)
    if existe_persona:
        raise HTTPException(400, f"La persona con la curp {persona.curp} ya se encuentra registrada")
    
    persona_id = personas_repositorio.crear_persona(db, persona)
    
    solicitud_id = equipo_repositorio.obtener_solicitud_id(db, equipo_temporal_id)

    # Buscar el slot correspondiente
    slot = None
    if slot_id is not None:
        slot = db.query(EquipoTemporalJugador).filter(
            EquipoTemporalJugador.EquipoTemporalJugadorId == slot_id,
            EquipoTemporalJugador.EquipoTemporalId == equipo_temporal_id
        ).first()
        if not slot:
            raise HTTPException(404, "Slot de jugador temporal no encontrado")
        if slot.Completo:
            raise HTTPException(400, "El slot seleccionado ya está completo")
    else:
        slots_list = equipo_repositorio.obtener_cantidad_slots(db, equipo_temporal_id)
        for s in slots_list:
            if not s.Completo:
                slot = s
                break
        if not slot:
            raise HTTPException(400, "Todos los espacios ocupados")

    # Subir documentos
    await documentos_servicio.subir_documento_servicio2(db, persona_id, documentos_afiliacion_ids, archivos, solicitud_id)

    # Asignar los datos del slot
    slot.PersonaId = persona_id
    slot.Completo = True
    slot.SeguroId = seguro_id

    # Si el equipo real ya está creado
    if equipo.EquipoId is not None:
        import json
        # 1. Crear Antecedentes si es extranjero
        antecedentes_id = None
        es_extranjero = False
        if extra_data and (extra_data.get("es_foraneo") in ["1", 1, True, "true"]):
            es_extranjero = True
            from app.modelos.antecedentes_internacionales_modelo import AntecedentesInternacionales
            antecedentes = AntecedentesInternacionales(
                Extranjero=True,
                Nacionalidades=extra_data.get("nacionalidad_jugador"),
                PaisResidenciaActual=extra_data.get("pais_resid_actual"),
                NacionalidadPadre=extra_data.get("nacionalidad_padre"),
                NacionalidadMadre=extra_data.get("nacionalidad_madre"),
                NacionalidadAbueloP=extra_data.get("nac_abuelo_paterno"),
                NacionalidadAbuelaP=extra_data.get("nac_abuela_paterna"),
                NacionalidadAbueloM=extra_data.get("nac_abuelo_materno"),
                NacionalidadAbuelaM=extra_data.get("nac_abuela_materna"),
                RegistroAsociacionExtranjera=extra_data.get("registro_asociacion_extranjera"),
                ParticipacionExtranjera=extra_data.get("juego_club_extranjero")
            )
            db.add(antecedentes)
            db.flush()
            antecedentes_id = antecedentes.AntecedentesId
            
        # 2. Crear MiembrosEquipo
        from app.modelos.miembro_equipo_modelo import MiembrosEquipo
        
        try:
            rol_en_equipo = int(extra_data.get("posicion") or 3) if extra_data else 3
        except (ValueError, TypeError):
            rol_en_equipo = 3
            
        try:
            numero_camiseta = int(extra_data.get("num_camiseta") or 0) if extra_data else 0
        except (ValueError, TypeError):
            numero_camiseta = 0
            
        existe_miembro = db.query(MiembrosEquipo).filter(
            MiembrosEquipo.PersonaId == persona_id,
            MiembrosEquipo.EquipoID == equipo.EquipoId
        ).first()
        
        if not existe_miembro:
            nuevo_miembro = MiembrosEquipo(
                PersonaId=persona_id,
                RolEnEquipo=rol_en_equipo,
                EquipoID=equipo.EquipoId,
                Estatus=True,
                Eliminado=False,
                NumeroCamiseta=numero_camiseta,
                Extranjero=es_extranjero,
                AntecedentesId=antecedentes_id
            )
            db.add(nuevo_miembro)
            
        # 3. Sumar +1 a la CantidadJugadores en la tabla EquiposJugando
        from app.modelos.equipo_modelo import EquiposJugando
        equipo_jugando = db.query(EquiposJugando).filter(EquiposJugando.EquipoId == equipo.EquipoId).first()
        if equipo_jugando:
            equipo_jugando.CantidadJugadores = (equipo_jugando.CantidadJugadores or 0) + 1
            
        slot.DatosBorrador = None
    else:
        # Si el equipo real no existe, persistimos los metadatos en DatosBorrador
        if extra_data:
            import json
            slot.DatosBorrador = json.dumps(extra_data, ensure_ascii=False)

    db.commit()
    return {"mensaje": "Jugador registrado"}

def obtener_equipo_temporal_servicio(db, equipo_temporal_id):
    import json

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

    nombre_equipo = equipo.NombreEquipo or "Equipo sin nombre"
    nombre_liga = equipo.LigaRelacion.Nombreliga if equipo.LigaRelacion else "Liga no especificada"
    nombre_categoria = "LIBRE"
    if equipo.LigaRelacion and equipo.LigaRelacion.CategoriaRelacion:
        nombre_categoria = equipo.LigaRelacion.CategoriaRelacion.NombreCategoria

    nombre_presidente = "No disponible"
    if equipo.UsuarioRelacion:
        from app.modelos.persona_modelo import Personas
        persona = db.query(Personas).filter(Personas.PersonaId == equipo.UsuarioRelacion.PersonaId).first()
        if persona:
            nombre_presidente = f"{persona.Nombre} {persona.PrimerApellido} {persona.SegundoApellido or ''}".strip().upper()

    return {
        "equipo_temporal_id": equipo.EquipoTemporalId,
        "cantidad_jugadores_pagados": equipo.CantidadJugadoresPagados,
        "jugadores_registrados": sum(1 for s in slots if s.Completo),
        "jugadores_restantes": equipo.CantidadJugadoresPagados - sum(1 for s in slots if s.Completo),
        "seguros": seguros_response,
        "nombre_equipo": nombre_equipo,
        "nombre_liga": nombre_liga,
        "nombre_categoria": nombre_categoria,
        "nombre_presidente": nombre_presidente,
        "slots": [
            {
                "slot_id": s.EquipoTemporalJugadorId,
                "completo": s.Completo,
                "seguro_id": s.SeguroId,
                "datos_borrador": json.loads(s.DatosBorrador) if s.DatosBorrador else None,
                "persona": {
                    "persona_id": s.PersonaId
                } if s.PersonaId else None
            }
            for s in slots
        ]
    }



def hay_slots(db, equipo_id):

    data = equipo_repositorio.obtener_disponibilidad_equipo(db, equipo_id)

    if not data:
        return {
            "hay_slots": False,
            "equipo_temporal_activo": False,
            "equipo_temporal_id": None,
            "slots_disponibles": 0,
            "seguros_disponibles": []
        }

    return {
        "hay_slots": data["slots_disponibles"] > 0,
        **data
    }

async def crear_equipo_completo_servicio(form_data, db, usuario):
    try:
        team_info, players_info = parse_form_data(form_data)
        equipo_temporal_id = team_info.get("equipo_temporal_id") or team_info.get("equipoTemporalId")
        
        #Se obtiene el equipo temporal activo para verificar que tenga disponibilidad de slots
        equipo_tem = equipo_repositorio.obtener_equipo_temporal(db, equipo_temporal_id)
        #print("EQUIPO TEMPORAL")
        #print(equipo_tem.EquipoTemporalId)
        #Se busca al presidente del equipo, sin importar si el usuario es presidente o admin, para validar su estatus y obtener su id
        #El presidente de equipo ya debe existir
        presidente_id, presidente, rol_id = equipo_repositorio.obtener_presidente(
            db, usuario, team_info
        )

        equipo_existente = False
        solicitud_id = None

        #Si no es afiliación inicial de presidente 
        if rol_id != 1: # Si no es administrador
            
            solicitud_id = equipo_tem.SolicitudId if equipo_tem else None
            
            if (not equipo_tem) or (equipo_tem.UsuarioId != usuario.UsuarioId):
                raise HTTPException(status_code=403, detail="No se pudo encontrar la orden de pago para este usuario")                

            # if (not equipo_tem.Activo) or (equipo_tem.EquipoId is None):
            #   raise HTTPException(status_code=403,detail="Equipo temporal no está disponible para configuración")

            # if (not equipo_tem.OrdenPagoRelacion) or (int(equipo_tem.OrdenPagoRelacion.EstatusPagoId) != int(EstatusValidacionPago.ACTIVO.value)):
            #  raise HTTPException(status_code=403, detail="El pago no está aprobado para configurar un nuevo equipo")
            
             
            #Slots que no se han llenado
            slots_disponibles = db.query(EquipoTemporalJugador).filter(
                EquipoTemporalJugador.EquipoTemporalId == equipo_tem.EquipoTemporalId,
                EquipoTemporalJugador.Completo == False
            ).count()
            
            if len(players_info) > slots_disponibles:
                db.rollback()
                raise HTTPException(
                    status_code=400,
                    detail="El número de jugadores excede los espacios disponibles"
                )
        
            seguros_request = Counter()

            for p in players_info:
                try:
                    seguro_id = int(p.get("seguro_id"))
                except (TypeError, ValueError):
                    db.rollback()
                    raise HTTPException(400, "Seguro inválido")                
                
                if not seguro_id:
                    db.rollback()
                    raise HTTPException(400, "Todos los jugadores deben tener seguro seleccionado")
                seguros_request[seguro_id] += 1

            #Todos los slots que estén vacíos
            slots = db.query(EquipoTemporalJugador).filter(
                EquipoTemporalJugador.EquipoTemporalId == equipo_tem.EquipoTemporalId,
                EquipoTemporalJugador.Completo == False
            ).all()

            disponibles_por_seguro = Counter(s.SeguroId for s in slots)

            for seguro_id, cantidad in seguros_request.items():
                if cantidad > disponibles_por_seguro.get(seguro_id, 0):
                    db.rollback()
                    raise HTTPException(
                        400,
                        f"No hay suficientes slots disponibles para el seguro {seguro_id}"
                    )

        
        # Guardar el tipo de proceso original para saber si es AMPLIACION al final
        tipo_proceso_original = equipo_tem.TipoProcesoId

        # AQÚI LLEGA ADMIN
        # == CREACIÓN DE PRESIDENTE O EQUIPO = INSCRIPCIÓN INICIAL
        # == NO EXISTE EL EQUIPO ==
        if tipo_proceso_original == EquipoTemporalProcesoEnum.INSCRIPCION_INICIAL:
            equipo = equipo_repositorio.obtener_o_crear_equipo(
                db, team_info["nombre_equipo"]
            )
            # vincular el equipo creado al equipo temporal
            equipo_tem.EquipoId = equipo.EquipoId
            db.flush()
        
            # Buscar todos los slots completados (jugadores que se registraron por el link público antes)
            slots_completados = db.query(EquipoTemporalJugador).filter(
                EquipoTemporalJugador.EquipoTemporalId == equipo_tem.EquipoTemporalId,
                EquipoTemporalJugador.Completo == True,
                EquipoTemporalJugador.PersonaId != None
            ).all()

            # Procesar cada slot completado para meterlos a la base real (MiembrosEquipo y Antecedentes)
            from app.modelos.miembro_equipo_modelo import MiembrosEquipo
            from app.modelos.antecedentes_internacionales_modelo import AntecedentesInternacionales
            import json
            
            for s_comp in slots_completados:
                p_data_comp = {}
                if s_comp.DatosBorrador:
                    try:
                        p_data_comp = json.loads(s_comp.DatosBorrador)
                    except Exception:
                        pass
                
                antecedentes_id = None
                es_extranjero_comp = False
                
                for_val = p_data_comp.get("es_foraneo") if p_data_comp.get("es_foraneo") is not None else p_data_comp.get("extranjero")
                if for_val in ["1", 1, True, "true"]:
                    es_extranjero_comp = True
                    antecedentes = AntecedentesInternacionales(
                        Extranjero=True,
                        Nacionalidades=p_data_comp.get("nacionalidad_jugador") or p_data_comp.get("nacionalidad"),
                        PaisResidenciaActual=p_data_comp.get("pais_resid_actual") or p_data_comp.get("pais_residencia"),
                        NacionalidadPadre=p_data_comp.get("nacionalidad_padre"),
                        NacionalidadMadre=p_data_comp.get("nacionalidad_madre"),
                        NacionalidadAbueloP=p_data_comp.get("nac_abuelo_paterno"),
                        NacionalidadAbuelaP=p_data_comp.get("nac_abuela_paterna"),
                        NacionalidadAbueloM=p_data_comp.get("nac_abuelo_materno"),
                        NacionalidadAbuelaM=p_data_comp.get("nac_abuela_materna"),
                        RegistroAsociacionExtranjera=p_data_comp.get("registro_asociacion_extranjera"),
                        ParticipacionExtranjera=p_data_comp.get("juego_club_extranjero")
                    )
                    db.add(antecedentes)
                    db.flush()
                    antecedentes_id = antecedentes.AntecedentesId
                
                try:
                    rol_en_equipo = int(p_data_comp.get("posicion") or p_data_comp.get("rol_en_equipo") or 3)
                except (ValueError, TypeError):
                    rol_en_equipo = 3
                    
                try:
                    numero_camiseta = int(p_data_comp.get("num_camiseta") or p_data_comp.get("numero_camiseta") or 0)
                except (ValueError, TypeError):
                    numero_camiseta = 0
                
                existe_miembro = db.query(MiembrosEquipo).filter(
                    MiembrosEquipo.PersonaId == s_comp.PersonaId,
                    MiembrosEquipo.EquipoID == equipo.EquipoId
                ).first()
                
                if not existe_miembro:
                    nuevo_miembro = MiembrosEquipo(
                        PersonaId=s_comp.PersonaId,
                        RolEnEquipo=rol_en_equipo,
                        EquipoID=equipo.EquipoId,
                        Estatus=True,
                        Eliminado=False,
                        NumeroCamiseta=numero_camiseta,
                        Extranjero=es_extranjero_comp,
                        AntecedentesId=antecedentes_id
                    )
                    db.add(nuevo_miembro)
                
                # Limpiar DatosBorrador ya que se vinculó al equipo real
                s_comp.DatosBorrador = None
            
            # Crear el registro en EquiposJugando con la suma de los del formulario + completados previamente
            cantidad_total = len(players_info) + len(slots_completados)
            equipo_repositorio.crear_equipo_jugando(
                db, equipo, team_info, presidente_id, cantidad_total
            )
            
            equipo_repositorio.actualizar_orden(db, solicitud_id)
            equipo_tem.TipoProcesoId = EquipoTemporalProcesoEnum.AMPLIACION
            await guardar_logo(form_data, equipo, db)
        
        # MODO AGREGAR JUGADORES
        if equipo_tem.TipoProcesoId == EquipoTemporalProcesoEnum.AMPLIACION:
            equipo = equipo_repositorio.obtener_equipo_por_id(db, equipo_tem.EquipoId)
        
        try:
            # if rol_id != 1: # Si no es administrador, se asume que es presidente y se registran los jugadores en el equipo temporal
            solicitud_id = equipo_tem.SolicitudId if equipo_tem else None

            for index, player in enumerate(players_info):
                await equipo_repositorio.procesar_jugador(db, equipo, player, form_data, index, solicitud_id)

            # Si el tipo de proceso original ya era AMPLIACION, sumamos los nuevos registrados en esta petición a EquiposJugando
            if tipo_proceso_original == EquipoTemporalProcesoEnum.AMPLIACION:
                from app.modelos.equipo_modelo import EquiposJugando
                equipo_jugando = db.query(EquiposJugando).filter(EquiposJugando.EquipoId == equipo.EquipoId).first()
                if equipo_jugando:
                    equipo_jugando.CantidadJugadores = (equipo_jugando.CantidadJugadores or 0) + len(players_info)

            slots_restantes = db.query(EquipoTemporalJugador).filter(
                EquipoTemporalJugador.EquipoTemporalId == equipo_tem.EquipoTemporalId,
                EquipoTemporalJugador.Completo == False
            ).count()

            if slots_restantes == 0:
                equipo_tem.Activo = False
            
        except:
            db.rollback()
            raise

        db.commit()

        return {
            "mensaje": "Proceso exitoso",
            "equipo_id": equipo.EquipoId
        }

    except:
        db.rollback()
        raise


async def add_jugador_equipo_existente_servicio(db, equipo, players_info, form_data, solicitud_id, equipo_temporal_id):
    #Slots que no se han llenado
    #MOVER A REPOSITORIO
    equipo_tem = db.query(EquipoTemporal).filter(EquipoTemporal.EquipoTemporalId == equipo_temporal_id).first()

    slots_disponibles = db.query(EquipoTemporalJugador).filter(
        EquipoTemporalJugador.EquipoTemporalId == equipo_temporal_id,
        EquipoTemporalJugador.Completo == False
    ).count()

    if len(players_info) > slots_disponibles:
        raise HTTPException(
            status_code=400,
            detail="El número de jugadores excede los espacios disponibles"
        )

    seguros_request = Counter()

    for p in players_info:
        try:
            seguro_id = int(p.get("seguro_id"))
        except (TypeError, ValueError):
            raise HTTPException(400, "Seguro inválido")                
        
        if not seguro_id:
            raise HTTPException(400, "Todos los jugadores deben tener seguro seleccionado")
        seguros_request[seguro_id] += 1

    #Todos los slots que estén vacíos
    slots = db.query(EquipoTemporalJugador).filter(
        EquipoTemporalJugador.EquipoTemporalId == equipo_temporal_id,
        EquipoTemporalJugador.Completo == False
    ).all()

    disponibles_por_seguro = Counter(s.SeguroId for s in slots)

    for seguro_id, cantidad in seguros_request.items():
        if cantidad > disponibles_por_seguro.get(seguro_id, 0):
            raise HTTPException(
                400,
                f"No hay suficientes slots disponibles para el seguro {seguro_id}"
            )    
    

    solicitud_id = equipo_tem.SolicitudId if equipo_tem else None

    for index, player in enumerate(players_info):
        await equipo_repositorio.procesar_jugador(db, equipo, player, form_data, index, solicitud_id)


    slots_restantes = db.query(EquipoTemporalJugador).filter(
        EquipoTemporalJugador.EquipoTemporalId == equipo_temporal_id,
        EquipoTemporalJugador.Completo == False
    ).count()

    if slots_restantes == 0:
        equipo_tem.Activo = False


    return {"mensaje": "En desarrollo"}





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
