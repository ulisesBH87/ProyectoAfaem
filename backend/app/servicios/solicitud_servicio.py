from sqlalchemy.orm import Session
from app.modelos.solicitud_modelo import Solicitud
from app.modelos.usuario_modelo import Usuario
from app.modelos.persona_modelo import Personas
from app.repositorios import solicitud_repositorio
from app.core.seguridad import obtener_usuario_actual
from app.enums.estados_validacion_enum import EstatusValidacionSolicitud
from fastapi import HTTPException
from app.modelos.equipo_temporal_modelo import EquipoTemporal
from app.enums.tipos_solicitud_enum import TiposSolicitudEnum

#Se crea la solicitud parcialmente, aún no se envía a administrador
def crear_solicitud(db: Session, data, usuario):
    # 1. Obtener la persona vinculada al usuario
    persona = usuario.PersonaRelacion
    if not persona:
        raise Exception("El usuario no tiene una persona vinculada")

    # 2. Actualizar los datos de la persona con lo recibido
    persona.CURP = data.CURP.upper()
    persona.RFC = data.RFC.upper()
    persona.SexoId = data.SexoId
    persona.FechaNacimiento = data.FechaNacimiento

    # 3. Crear el objeto Solicitud
    estatusDefecto = 2
    solicitud = Solicitud(
        UsuarioId=usuario.UsuarioId,
        FechaSolicitud=data.FechaSolicitud,
        EstatusValidacion=estatusDefecto,
        TipoAfiliacionId=data.TipoAfiliacion
    )

    # 4. Guardar todo
    db.add(solicitud)
    db.commit()
    db.refresh(solicitud)
    
    return solicitud

#Todas las solicitudes
def obtener_solicitudes_usuarios_servicio(db: Session):
    return solicitud_repositorio.obtener_solicitudes_usuarios_repo(db)

def obtener_solicitudes_servicio(db: Session):

    solicitudes = solicitud_repositorio.obtener_solicitudes_repo(db)

    resultado = []

    for s in solicitudes:

        equipo = db.query(EquipoTemporal).filter(
            EquipoTemporal.SolicitudId == s.SolicitudId
        ).first()

        jugadores = 0
        if equipo:
            jugadores = equipo.CantidadJugadoresPagados

        resultado.append({
            "solicitud_id": s.SolicitudId,
            "usuario": s.UsuarioRelacion.Correo,
            "tipo_afiliacion": s.TipoAfiliacionRelacion.NombreAfiliacion,
            "estatus": s.EstatusValidacionId,
            "fecha": s.FechaSolicitud,
            "jugadores": jugadores
        })

    return resultado

#Solicitud individual
def obtener_solicitud_detalle_servicio(db, solicitud_id):

    data = solicitud_repositorio.obtener_solicitud_detalle_repo(db, solicitud_id)

    if not data:
        raise HTTPException(404, "Solicitud no encontrada")

    return data

def obtener_solicitud_individual_servicio(db: Session, solicitud_id: int):
    return solicitud_repositorio.obtener_solicitud_individual_repo(db, solicitud_id)

# == REQUISITOS DE AFILIACIÓN ==
def agregar_requisitos_servicio(db: Session, tipo_afiliacion_id: int, documentos_persona_ids: list[int]):
    existentes = solicitud_repositorio.obtener_por_tipo_afiliacion(db, tipo_afiliacion_id)

    existentes_ids = {doc.DocumentoPersonaId for doc in existentes}

    nuevos_registros = []

    for doc_persona_id in documentos_persona_ids:
        if doc_persona_id in existentes_ids:
            continue

        registro = solicitud_repositorio.crear_requisito_repo(db, tipo_afiliacion_id, doc_persona_id)

        nuevos_registros.append(registro)

    db.commit()

    return nuevos_registros

def ver_requisitos_afiliacion_servicio(db, tipo_afiliacion_id: int):

    requisitos = solicitud_repositorio.ver_requisitos_afiliacion_repo(db, tipo_afiliacion_id)

    return requisitos

def crear_solicitud_servicio(db, tipo_afiliacion, tipo_solicitud, usuario, equipo_id=None, afiliacion=None):
    usuario_id = usuario.UsuarioId
    
    if tipo_solicitud == TiposSolicitudEnum.PRESIDENTE_EQUIPO or tipo_solicitud == TiposSolicitudEnum.EQUIPO:
        solicitud_nueva = solicitud_repositorio.crear_solicitud_repo(db, tipo_afiliacion, tipo_solicitud, usuario_id, afiliacion=afiliacion)

    elif tipo_solicitud == TiposSolicitudEnum.JUGADOR:
        solicitud_nueva = solicitud_repositorio.crear_solicitud_repo(db, tipo_afiliacion, tipo_solicitud, usuario_id, equipo_id, afiliacion=afiliacion)


    #NO SE CREAN DOCUMENTOS POR QUE LA SOLICITUD NO HA SIDO APROBADA.
    #CREAR OTRO SERVICIO PARA AÑADIR DOCUMENTOS DE LAS PERSONAS
    """
    for persona in solicitud.Persona:

        for doc in persona.Documentos:

            solicitud_repositorio.crear_documento_solicitud_repo(
                db=db,
                SolicitudId = nueva_solicitud.SolicitudId,
                PersonaId = persona.persona_id,
                DocumentoAfiliacionId = doc.documento_afiliacion_id,
                RutaArchivo = doc.ruta_archivo
            )
    db.commit()
    """
    
    return solicitud_nueva

def enviar_solicitud_completa_servicio(db, solicitud_id, usuario_id, curp=None, sexo_id=None, fecha_nacimiento=None, liga_id=None, nombre_equipo=None, afiliacion=None, telefono=None, lugar_nacimiento=None):

    solicitud = solicitud_repositorio.obtener_solicitud_por_id(db, solicitud_id)

    if not solicitud:
        raise HTTPException(404, "No se encontró la solicitud")

    if solicitud.UsuarioId != usuario_id:
        raise HTTPException(403, "No tienes permiso para enviar esta solicitud")

    if solicitud.EstatusValidacion == EstatusValidacionSolicitud.ESPERA:
        raise HTTPException(400, "La solicitud ya ha sido enviada")

    # Guardar los datos personales en la persona vinculada al usuario
    usuario = solicitud.UsuarioRelacion
    if usuario and usuario.PersonaRelacion:
        persona = usuario.PersonaRelacion
        if curp:
            persona.CURP = curp.strip().upper()
        if telefono:
            persona.NumeroTelefono = telefono.strip()
        if sexo_id:
            persona.SexoId = sexo_id
        if lugar_nacimiento:
            persona.LugarNacimiento = lugar_nacimiento.strip().upper()
        if fecha_nacimiento:
            from datetime import datetime
            try:
                if "-" in fecha_nacimiento:
                    persona.FechaNacimiento = datetime.strptime(fecha_nacimiento.strip(), "%Y-%m-%d").date()
                elif "/" in fecha_nacimiento:
                    parts = fecha_nacimiento.strip().split('/')
                    if len(parts[-1]) == 2:
                        persona.FechaNacimiento = datetime.strptime(fecha_nacimiento.strip(), "%d/%m/%y").date()
                    else:
                        persona.FechaNacimiento = datetime.strptime(fecha_nacimiento.strip(), "%d/%m/%Y").date()
            except Exception as e:
                print(f"Error parseando fecha_nacimiento {fecha_nacimiento}: {e}")

    # Guardar NombreEquipo y LigaId en EquipoTemporal si es pre-registro de presidente
    if nombre_equipo or liga_id:
        equipo_temp = db.query(EquipoTemporal).filter(EquipoTemporal.SolicitudId == solicitud_id).first()
        if equipo_temp:
            nombre_final = nombre_equipo.strip().upper() if nombre_equipo else equipo_temp.NombreEquipo
            liga_final = liga_id if liga_id else equipo_temp.LigaId
            if nombre_final and liga_final:
                from app.modelos.equipo_modelo import Equipos, EquiposJugando
                from app.modelos.presidente_equipo_modelo import PresidenteEquipo
                from sqlalchemy import func
                
                presidente = None
                if usuario and usuario.PersonaId:
                    presidente = db.query(PresidenteEquipo).filter(PresidenteEquipo.PersonaId == usuario.PersonaId).first()
                
                query_eq = db.query(EquiposJugando).join(Equipos).filter(
                    func.lower(Equipos.NombreEquipo) == func.lower(nombre_final),
                    EquiposJugando.LigaId == liga_final
                )
                
                if presidente:
                    query_eq = query_eq.filter(EquiposJugando.PresidenteEquipoId != presidente.PresidenteEquipoId)
                    
                equipo_existente = query_eq.first()
                if equipo_existente:
                    raise HTTPException(status_code=400, detail="Ya existe un equipo con este nombre registrado en la misma liga")

            if nombre_equipo:
                equipo_temp.NombreEquipo = nombre_equipo.strip().upper()
            if liga_id:
                equipo_temp.LigaId = liga_id

    # Guardar afiliación si se proporciona
    if afiliacion:
        solicitud.Afiliacion = afiliacion
        from app.modelos.presidente_equipo_modelo import PresidenteEquipo
        if usuario and usuario.PersonaId:
            presidente = db.query(PresidenteEquipo).filter(PresidenteEquipo.PersonaId == usuario.PersonaId).first()
            if presidente:
                presidente.Afiliacion = afiliacion

    #enviio
    solicitud_completa = solicitud_repositorio.enviar_solicitud_completa_repo(db, solicitud_id)
    if not solicitud_completa:
        raise HTTPException(400, "Error al enviar la solicitud")

    # Actualizar EstatusId del presidente a 4 (DOCUMENTOS_EN_REVISION)
    from app.modelos.presidente_equipo_modelo import PresidenteEquipo
    from app.enums.estatus_presidente_enum import PresidenteEquipoEstatus
    if usuario and usuario.PersonaId:
        presidente = db.query(PresidenteEquipo).filter(PresidenteEquipo.PersonaId == usuario.PersonaId).first()
        if presidente:
            presidente.EstatusId = int(PresidenteEquipoEstatus.DOCUMENTOS_EN_REVISION)
            # Asociar consumos del OCR/Foto realizados durante el pre-registro de este presidente
            try:
                from app.servicios.consumo_servicio import ConsumptionService
                target_name = f"{usuario.PersonaRelacion.Nombre} {usuario.PersonaRelacion.PrimerApellido or ''} {usuario.PersonaRelacion.SegundoApellido or ''}".strip().upper()
                
                # Fetch related EquipoTemporal info to resolve team and league
                equipo_temp = db.query(EquipoTemporal).filter(EquipoTemporal.SolicitudId == solicitud_id).first()
                
                ConsumptionService.asociar_consumos_pendientes(
                    db=db,
                    target_persona_id=usuario.PersonaId,
                    target_nombre=target_name,
                    target_curp=usuario.PersonaRelacion.CURP,
                    usuario_id=usuario.UsuarioId,
                    equipo_id=equipo_temp.EquipoId if equipo_temp else None,
                    liga_id=equipo_temp.LigaId if equipo_temp else None,
                    borrador_id=presidente.PresidenteEquipoId
                )
            except Exception as assoc_exc:
                print(f"Error al asociar consumos de auto-registro de presidente: {assoc_exc}")

    db.commit()
    return {"mensaje": "Solicitud enviada correctamente"}

# --- SECCIÓN ADMINISTRADORA: VALIDACIÓN DE SOLICITUDES ---

def obtener_documentos_para_revision_servicio(db: Session, solicitud_id: int):
    resultado = solicitud_repositorio.obtener_personas_con_documentos_repo(db, solicitud_id)
    if not resultado:
         raise HTTPException(status_code=404, detail="No se encontró la solicitud o no tiene documentos asociados")
    return resultado

def validar_solicitud_servicio(db: Session, solicitud_id: int, payload):
    #Lógica para aprobar o rechazar una solicitud.
    
    try:
        # Iniciamos transaccion explícita
        with db.begin_nested(): # Usamos nested para asegurar que si falla algo, todo regrese
            
            # Mapeo de Estatus desde el Payload (Sincronizado: 2: Aprobado, 3: Rechazado)
            estatus_db = payload.Estatus
            
            # 1. Actualizar estatus de la solicitud
            solicitud = solicitud_repositorio.actualizar_validacion_solicitud_repo(
                db, solicitud_id, estatus_db, payload.Observaciones
            )
            
            if not solicitud:
                raise HTTPException(status_code=404, detail="Solicitud no encontrada")
            
            # 2. Si es aprobado (ID 2), activar al presidente
            if payload.Estatus == 2:
                activado = solicitud_repositorio.activar_presidente_solicitud_repo(db, solicitud_id)
                if not activado:
                    # Si no pudimos activar al presidente, lanzamos error para hacer rollback
                    raise Exception("No se pudo activar el registro de Presidente de Equipo. Verifique que el usuario esté vinculado correctamente.")
                
                # 3. Crear automáticamente el equipo real si hay pre-registro
                equipo_temp = db.query(EquipoTemporal).filter(EquipoTemporal.SolicitudId == solicitud_id).first()
                if equipo_temp and equipo_temp.NombreEquipo and equipo_temp.LigaId:
                    from app.modelos.presidente_equipo_modelo import PresidenteEquipo
                    from app.modelos.equipo_modelo import Equipos, EquiposJugando
                    from app.enums.proceso_equipo_temporal_enum import EquipoTemporalProcesoEnum
                    from sqlalchemy import func
                    
                    solicitud_db = db.query(Solicitud).filter(Solicitud.SolicitudId == solicitud_id).first()
                    usuario_db = db.query(Usuario).filter(Usuario.UsuarioId == solicitud_db.UsuarioId).first()
                    presidente = db.query(PresidenteEquipo).filter(PresidenteEquipo.PersonaId == usuario_db.PersonaId).first()
                    
                    if presidente:
                        # Buscar si ya existe el equipo real
                        equipo_real = db.query(Equipos).filter(
                            func.lower(Equipos.NombreEquipo) == func.lower(equipo_temp.NombreEquipo)
                        ).first()
                        if not equipo_real:
                            equipo_real = Equipos(NombreEquipo=equipo_temp.NombreEquipo, Estatus=True)
                            db.add(equipo_real)
                            db.flush()
                        
                        # Crear el registro en EquiposJugando si no existe
                        eq_jugando = db.query(EquiposJugando).filter(
                            EquiposJugando.EquipoId == equipo_real.EquipoId,
                            EquiposJugando.LigaId == equipo_temp.LigaId
                        ).first()
                        if not eq_jugando:
                            eq_jugando = EquiposJugando(
                                EquipoId=equipo_real.EquipoId,
                                LigaId=equipo_temp.LigaId,
                                PresidenteEquipoId=presidente.PresidenteEquipoId,
                                CantidadJugadores=0
                            )
                            db.add(eq_jugando)
                            db.flush()
                        
                        # Vincular el equipo temporal
                        equipo_temp.EquipoId = equipo_real.EquipoId
                        equipo_temp.TipoProcesoId = EquipoTemporalProcesoEnum.AMPLIACION
            elif payload.Estatus == 3:
                solicitud_repositorio.rechazar_presidente_solicitud_repo(db, solicitud_id)
            
        db.commit()
        mensaje = "Solicitud aprobada y presidente activado" if payload.Estatus == 2 else "Solicitud rechazada correctamente"
        return {"mensaje": mensaje, "solicitud_id": solicitud_id}

    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error en la validación: {str(e)}")

