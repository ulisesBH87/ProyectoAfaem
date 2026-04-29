from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, Request, Response
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.db.sesion import get_db
from typing import List, Optional
import traceback
import sys
import json
import os
from datetime import datetime
from app.core.seguridad import obtener_usuario_actual, generar_salt, generar_hash

from app.servicios.equipo_servicio import registrar_jugador_servicio, obtener_equipo_temporal_servicio, obtener_equipos_temporales_por_usuario_servicio, crear_equipo_completo_servicio
from app.esquemas.equipo_esquema import JugadorPersona, EquipoResponse, MiembroResponse, CatalogosRegistroResponse, CatalogoItem, EquipoUpdate, EquipoUpdateCompleto, JugadorUpdate, PresidenteAdminCreate
from app.servicios.equipo_servicio import registrar_jugador_servicio
from app.modelos import (
    Equipos, EquiposJugando, MiembrosEquipo, Personas, RolesDeEquipo, 
    CatalogoCategorias, Ligas, CatalogoModalidad, CatalogoRamas, PresidenteEquipo, Seguro,
    EquipoTemporal, Usuario, AntecedentesInternacionales, OrdenPago
)
from app.servicios import documentos_servicio
from app.esquemas.equipo_esquema import DirectorioEquipoResponse, DirectorioJugadorResponse

UPLOAD_DIR = "uploads"
DOCS_DIR = os.path.join(UPLOAD_DIR, "documentos")

router = APIRouter(prefix="/equipo-temporal", tags=["Equipo Temporal"])

def safe_int(val, default=None):
    if val is None: return default
    try:
        # Manejar casos donde el valor es un float string como "10.0" o "NaN"
        s_val = str(val).strip().lower()
        if s_val in ["", "null", "undefined", "nan"]:
            return default
        return int(float(s_val))
    except (ValueError, TypeError):
        return default

@router.get("/equipos-temporales")
def obtener_equipos_temporales_por_usuario(db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    usuario_id = usuario.UsuarioId
    equipos = obtener_equipos_temporales_por_usuario_servicio(db, usuario_id)
    return equipos

@router.get("/slots")
async def obtener_slots(equipo_temporal_id: int,db: Session = Depends(get_db)):
    slots = obtener_equipo_temporal_servicio(db, equipo_temporal_id)
    return slots



# == REGISTROS ==
@router.get("/catalogos-registro", response_model=CatalogosRegistroResponse)
def get_catalogos_registro(db: Session = Depends(get_db)):
    try:
        ligas = db.query(Ligas).all()
        categorias = db.query(CatalogoCategorias).all()
        modalidades = db.query(CatalogoModalidad).all()
        ramas = db.query(CatalogoRamas).all()
        seguros = db.query(Seguro).all()
        roles_equipo = db.query(RolesDeEquipo).filter(RolesDeEquipo.Eliminado == False).all()

        return {
            "ligas": [{"id": l.LigaId, "nombre": l.Nombreliga} for l in ligas],
            "categorias": [{"id": c.CategoriaId, "nombre": c.NombreCategoria} for c in categorias],
            "modalidades": [{"id": m.ModalidadId, "nombre": m.NombreModalidad} for m in modalidades],
            "ramas": [{"id": r.RamaId, "nombre": r.Nombre} for r in ramas],
            "seguros": [{"id": s.SeguroId, "nombre": s.Nombre, "precio": float(s.Precio)} for s in seguros],
            "roles_equipo": [{"id": r.RolId, "nombre": r.NombreRol} for r in roles_equipo],
            "combinaciones": [] # Mantenemos el campo vacío para no romper el frontend por ahora
        }

    except Exception as e:
        print(f"Error en get_catalogos_registro: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/crear-equipo-completo")
async def crear_equipo_completo(request: Request, db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    try:
        form_data = await request.form()
        print(type(form_data.get("team_logo")))
        result = await crear_equipo_completo_servicio(form_data=form_data, db=db, usuario=usuario)

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/agregar-jugador-equipo-existente")
async def agregar_jugador_equipo_existente(
    request: Request,
    equipo_id: int = Form(...),
    db: Session = Depends(get_db),
    usuario = Depends(obtener_usuario_actual)
):
    """
    Agrega un jugador a un equipo ya existente en la base de datos real.
    Solo para uso de Administradores.
    """
    rol_id = getattr(usuario, 'RolId', None)
    if rol_id not in [1, 3, 4, '1', '3', '4']:
        raise HTTPException(status_code=403, detail="Acceso denegado. Solo administradores pueden agregar jugadores a equipos existentes directamente.")

    try:
        form_data = await request.form()
        equipo_id = form_data.get("equipo_id")
        if not equipo_id:
            raise HTTPException(status_code=400, detail="El ID del equipo es obligatorio")
        
        try:
            equipo_id = int(equipo_id)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"ID de equipo inválido: {equipo_id}")

        # 1. Validar que el equipo exista
        from app.modelos.equipo_modelo import Equipos, EquiposJugando
        
        equipo_jugando = db.query(EquiposJugando).filter(EquiposJugando.EquipoId == equipo_id).first()
        if not equipo_jugando:
            raise HTTPException(status_code=404, detail="El equipo no está registrado en la temporada actual (No se encontró en EquiposJugando)")

        equipo = db.query(Equipos).filter(Equipos.EquipoId == equipo_id).first()
        if not equipo:
            raise HTTPException(status_code=404, detail="El equipo especificado no existe en la tabla Equipos")

        # 2. Parsear los datos del único jugador
        p_data = {}
        for key, value in form_data.items():
            # Soporta tanto formato indexado 'players[0][key]' como campos directos 'key'
            clean_key = key
            if key.startswith("players[0]["):
                clean_key = key.replace("players[0][", "").replace("]", "")
            
            # Convertir "" o "null" o "undefined" a None para consistencia
            val = value
            if isinstance(val, str):
                val_stripped = val.strip()
                if val_stripped == "" or val_stripped.lower() in ["null", "undefined", "nan"]:
                    val = None
                else:
                    # Si es un booleano en string
                    if val_stripped.lower() == "true": val = True
                    elif val_stripped.lower() == "false": val = False
                    elif val_stripped == "1" and clean_key in ["extranjero", "es_foraneo", "ha_vivido_extranjero"]: val = True
                    elif val_stripped == "0" and clean_key in ["extranjero", "es_foraneo", "ha_vivido_extranjero"]: val = False
                    else: val = val_stripped
            elif val is None:
                val = None
            
            p_data[clean_key] = val

        # Mapeos de compatibilidad si vienen con nombres distintos
        if "es_foraneo" in p_data and "extranjero" not in p_data: p_data["extranjero"] = p_data["es_foraneo"]
        if "rol_en_equipo" not in p_data and "posicion" in p_data: p_data["rol_en_equipo"] = p_data["posicion"]
        if "numero_camiseta" not in p_data and "num_camiseta" in p_data: p_data["numero_camiseta"] = p_data["num_camiseta"]
        if "nacionalidad_jugador" in p_data: p_data["nacionalidad"] = p_data["nacionalidad_jugador"]
        if "pais_resid_actual" in p_data: p_data["pais_residencia"] = p_data["pais_resid_actual"]
        if "donde_vivido" in p_data: p_data["donde_vivido_extranjero"] = p_data["donde_vivido"]

        if not p_data or "curp" not in p_data:
             raise HTTPException(status_code=400, detail="No se recibieron datos del jugador válidos.")
        # Comprobar si ya existe la CURP o el Email
        from app.modelos.persona_modelo import Personas
        
        curp_val = str(p_data.get("curp", "")).strip().upper()
        # El usuario solicita remover la validación de CURP duplicada para fines de pruebas
        
        email_val = p_data.get("correo")
        if email_val:
            existe_email = db.query(Personas).filter(Personas.CorreoElectronico == email_val).first()
            if existe_email:
                raise HTTPException(status_code=400, detail=f"El correo electrónico '{email_val}' ya está registrado por otro jugador.")

        # 3. Crear Persona
        try:
            fn = None
            if p_data.get("fecha_nacimiento"):
                fecha_str = str(p_data["fecha_nacimiento"])
                try:
                    if "-" in fecha_str:
                        fn = datetime.strptime(fecha_str, "%Y-%m-%d").date()
                    else:
                        fn = datetime.strptime(fecha_str, "%d/%m/%Y").date()
                except (ValueError, TypeError):
                    pass # Dejar como None si el formato es inválido

            # Validar campos obligatorios antes de insertar
            for field in ["nombre", "primer_apellido", "curp"]:
                if not p_data.get(field):
                    raise HTTPException(status_code=400, detail=f"El campo '{field}' es obligatorio.")

            s_id = safe_int(p_data.get("sexo_id"), 1)

            nueva_persona = Personas(
                Nombre=str(p_data.get("nombre", "")).strip().upper() if p_data.get("nombre") else None,
                PrimerApellido=str(p_data.get("primer_apellido", "")).strip().upper() if p_data.get("primer_apellido") else None,
                SegundoApellido=str(p_data.get("segundo_apellido", "")).strip().upper() if p_data.get("segundo_apellido") else None,
                CURP=str(p_data.get("curp", "")).strip().upper() if p_data.get("curp") else None,
                NUI=p_data.get("nui"),
                SexoId=s_id,
                FechaNacimiento=fn,
                LugarNacimiento=p_data.get("lugar_nacimiento"),
                CorreoElectronico=p_data.get("correo"),
                NumeroTelefono=p_data.get("telefono")
            )
            db.add(nueva_persona)
            db.flush()
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            if "check_curp_persona_longitud" in str(e):
                raise HTTPException(
                    status_code=400,
                    detail=f"La CURP '{p_data['curp']}' debe tener exactamente 18 caracteres."
                )
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Error al registrar persona: {str(e)}"
                )

        # 4. Crear Antecedentes si es extranjero
        antecedentes_id = None
        if p_data.get("extranjero"):
            from app.modelos.antecedentes_internacionales_modelo import AntecedentesInternacionales
            nuevos_antecedentes = AntecedentesInternacionales(
                Extranjero=True,
                Nacionalidades=p_data.get("nacionalidad"),
                PaisResidenciaActual=p_data.get("pais_residencia"),
                NacionalidadPadre=p_data.get("nacionalidad_padre"),
                NacionalidadMadre=p_data.get("nacionalidad_madre"),
                NacionalidadAbueloP=p_data.get("nac_abuelo_paterno"),
                NacionalidadAbuelaP=p_data.get("nac_abuela_paterna"),
                NacionalidadAbueloM=p_data.get("nac_abuelo_materno"),
                NacionalidadAbuelaM=p_data.get("nac_abuela_materna"),
                RegistroAsociacionExtranjera=p_data.get("registro_asociacion_extranjera"),
                ParticipacionExtranjera=p_data.get("juego_club_extranjero")
            )
            db.add(nuevos_antecedentes)
            db.flush()
            antecedentes_id = nuevos_antecedentes.AntecedentesId

        from app.modelos.miembro_equipo_modelo import MiembrosEquipo
        
        rol_id = safe_int(p_data.get("rol_en_equipo"), 3)
        camista_num = safe_int(p_data.get("numero_camiseta"))

        nuevo_miembro = MiembrosEquipo(
            PersonaId=nueva_persona.PersonaId,
            RolEnEquipo=rol_id,
            EquipoID=equipo.EquipoId,
            Estatus=True,
            Eliminado=False,
            NumeroCamiseta=camista_num,
            Extranjero=bool(p_data.get("extranjero", False)),
            AntecedentesId=antecedentes_id
        )
        db.add(nuevo_miembro)
        
        # 6. Sumar +1 a la CantidadJugadores
        equipo_jugando.CantidadJugadores = (equipo_jugando.CantidadJugadores or 0) + 1

        DOC_TYPE_TO_ID = {
            "acta": 22,
            "ine": 26,
            "foto": 25,
            "formato": 28
        }

        archivos = []
        documento_ids = []

        for doc_type, doc_id in DOC_TYPE_TO_ID.items():
            file_key = f"player_0_{doc_type}"
            direct_key = "formato_firmado" if doc_type == "formato" else doc_type
            
            archivo = (
                form_data.get(file_key) or
                form_data.get(direct_key) or
                form_data.get(doc_type)
            )

            if archivo and hasattr(archivo, "filename"):
                archivos.append(archivo)
                documento_ids.append(doc_id)

        if archivos:
            from app.servicios.documentos_servicio import subir_documento_servicio2

            await subir_documento_servicio2(
                db=db,
                persona_id=nueva_persona.PersonaId,
                documento_afiliacion_ids=documento_ids,
                archivos=archivos,
                solicitud_id=None
            )

        db.commit()

        return {"mensaje": "Jugador agregado exitosamente al equipo", "persona_id": nueva_persona.PersonaId}

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        exc_type, exc_obj, exc_tb = sys.exc_info()
        tb = traceback.format_exc()
        error_msg = str(e)
        print("ERROR EN AGREGAR JUGADOR:", tb)
        raise HTTPException(status_code=500, detail=f"Error interno: {error_msg} | Traceback: {tb}")

@router.post("/registrar-jugador")
async def registrar_jugador(
    equipo_temporal_id: int = Form(...),
    nombre: str = Form(...),
    primer_apellido: str = Form(...),
    segundo_apellido: str = Form(...),
    CURP: str = Form(...),
    sexo_id: int = Form(...),
    fecha_nacimiento: str = Form(...),
    documento_afiliacion_ids: List[int] = Form(...),
    archivos: list[UploadFile] = File(...),
    seguro_id: int = Form(...),
    db: Session = Depends(get_db)
):
    persona = JugadorPersona(
        nombre=nombre,
        primer_apellido=primer_apellido,
        segundo_apellido=segundo_apellido,
        curp=CURP,
        sexo_id=sexo_id,
        fecha_nacimiento=fecha_nacimiento
    )
    return await registrar_jugador_servicio(db, equipo_temporal_id, persona, documento_afiliacion_ids, archivos, seguro_id)



# --- NUEVOS ENDPOINTS PARA TABLAS REALES (PRESIDENTE Y ADMIN) ---
@router.get("/user-real-teams", response_model=List[EquipoResponse])
def get_user_real_teams(db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    try:
        # 1. Base query with joins
        query = db.query(
            Equipos.EquipoId,
            Equipos.NombreEquipo,
            Equipos.FechaCreacion,
            Equipos.RutaLogo,
            CatalogoCategorias.NombreCategoria.label("Categoria"),
            Ligas.Nombreliga.label("Liga"),
            CatalogoModalidad.NombreModalidad.label("Modalidad"),
            CatalogoRamas.Nombre.label("Rama"),
            EquiposJugando.CantidadJugadores.label("NumeroJugadores"),
            Equipos.Estatus,
            EquipoTemporal.SolicitudId
        ).join(EquiposJugando, Equipos.EquipoId == EquiposJugando.EquipoId)\
         .join(CatalogoCategorias, EquiposJugando.CategoriaId == CatalogoCategorias.CategoriaId)\
         .join(Ligas, EquiposJugando.LigaId == Ligas.LigaId)\
         .join(CatalogoModalidad, EquiposJugando.ModalidadId == CatalogoModalidad.ModalidadId)\
         .join(CatalogoRamas, EquiposJugando.RamaId == CatalogoRamas.RamaId)\
         .join(PresidenteEquipo, EquiposJugando.PresidenteEquipoId == PresidenteEquipo.PresidenteEquipoId)\
         .join(Usuario, PresidenteEquipo.PersonaId == Usuario.PersonaId)\
         .outerjoin(EquipoTemporal, Usuario.UsuarioId == EquipoTemporal.UsuarioId)

        # 2. Add filter if not ADMINISTRADOR (RolId == 1)
        rol_id = getattr(usuario, 'RolId', None)
        
        if rol_id != 1:
            presidente = db.query(PresidenteEquipo).filter(PresidenteEquipo.PersonaId == usuario.PersonaId).first()
            if not presidente:
                return []
            query = query.filter(EquiposJugando.PresidenteEquipoId == presidente.PresidenteEquipoId)

        resultados = query.all()

        return [
           {
               "EquipoId": r.EquipoId,
               "NombreEquipo": r.NombreEquipo,
               "FechaCreacion": r.FechaCreacion,
               "Categoria": r.Categoria,
               "Liga": r.Liga,
               "Modalidad": r.Modalidad,
               "Rama": r.Rama,
               "NumeroJugadores": r.NumeroJugadores,
               "Estatus": bool(r.Estatus),
               "RutaLogo": r.RutaLogo,
               "SolicitudId": r.SolicitudId
           } for r in resultados
        ]
    except Exception as e:
        print(f"Error en get_user_real_teams: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error interno SQL: {str(e)}")

@router.get("/mis-jugadores-reales", response_model=List[MiembroResponse])
def get_mis_jugadores_reales(db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    try:
        # 1. Base query with joins
        query = db.query(
            MiembrosEquipo.MiembroEquipoId,
            (Personas.Nombre + " " + Personas.PrimerApellido).label("NombreCompleto"),
            RolesDeEquipo.NombreRol.label("Rol"),
            Equipos.NombreEquipo.label("Equipo"),
            MiembrosEquipo.FechaIngreso,
            MiembrosEquipo.Estatus
        ).join(Personas, MiembrosEquipo.PersonaId == Personas.PersonaId)\
         .join(RolesDeEquipo, MiembrosEquipo.RolEnEquipo == RolesDeEquipo.RolId)\
         .join(Equipos, MiembrosEquipo.EquipoID == Equipos.EquipoId)\
         .join(EquiposJugando, Equipos.EquipoId == EquiposJugando.EquipoId)

        # 2. Add filter if not ADMINISTRADOR (RolId == 1)
        rol_id = getattr(usuario, 'RolId', None)
        
        if rol_id != 1:
            presidente = db.query(PresidenteEquipo).filter(PresidenteEquipo.PersonaId == usuario.PersonaId).first()
            if not presidente:
                return []
            query = query.filter(EquiposJugando.PresidenteEquipoId == presidente.PresidenteEquipoId).distinct()

        resultados = query.all()

        return [
            {
                "MiembroEquipoId": r.MiembroEquipoId,
                "NombreCompleto": r.NombreCompleto,
                "Rol": r.Rol,
                "Equipo": r.Equipo,
                "FechaIngreso": r.FechaIngreso,
                "Estatus": bool(r.Estatus)
            } for r in resultados
        ]
    except Exception as e:
        print(f"Error en get_mis_jugadores_reales: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error interno SQL: {str(e)}")


# --- ENDPOINTS PARA DIRECTORIO GLOBAL ADMIN ---
@router.get("/directorio-presidentes-activos")
def get_presidentes_activos(db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    rol_id = getattr(usuario, 'RolId', None)
    if rol_id != 1:
        raise HTTPException(status_code=403, detail="Acceso denegado: No tienes permisos para acceder a este recurso")
    
    try:
        from app.modelos.usuario_modelo import Usuario
        from app.modelos.catalogo_estatus_presidente import EstatusPresidente

        query = db.query(
            PresidenteEquipo.PresidenteEquipoId,
            Personas.Nombre,
            Personas.PrimerApellido,
            Personas.SegundoApellido,
            Personas.CURP,
            PresidenteEquipo.EstatusId,
            EstatusPresidente.Nombre.label('EstatusNombre'),
            Usuario.Correo.label('CorreoLogin')
        ).join(Personas, PresidenteEquipo.PersonaId == Personas.PersonaId)\
         .join(EstatusPresidente, PresidenteEquipo.EstatusId == EstatusPresidente.EstatusPresidenteId)\
         .outerjoin(Usuario, Usuario.PersonaId == Personas.PersonaId)

        resultados = query.all()

        return [
            {
                "id":             r.PresidenteEquipoId,
                "nombre":         f"{r.Nombre} {r.PrimerApellido} {r.SegundoApellido or ''}".strip(),
                "primerNombre":   r.Nombre          or '',
                "primerApellido": r.PrimerApellido   or '',
                "segundoApellido":r.SegundoApellido  or '',
                "curp":           r.CURP,
                "estatus":        r.EstatusId,
                "estatusNombre":  r.EstatusNombre    or '',
                "correo":         r.CorreoLogin      or ''
            } for r in resultados
        ]
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error al obtener directorio de presidentes: {str(e)}")


@router.patch("/update-presidente/{presidente_id}")
def update_presidente(presidente_id: int, data: dict, db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    rol_id = getattr(usuario, 'RolId', None)
    if rol_id != 1:
        raise HTTPException(status_code=403, detail="Acceso denegado: Se requiere rol de Administrador")

    try:
        from app.modelos.usuario_modelo import Usuario
        from app.modelos.catalogo_estatus_presidente import EstatusPresidente

        presidente = db.query(PresidenteEquipo).filter(
            PresidenteEquipo.PresidenteEquipoId == presidente_id
        ).first()
        if not presidente:
            raise HTTPException(status_code=404, detail="Presidente no encontrado")

        persona = db.query(Personas).filter(Personas.PersonaId == presidente.PersonaId).first()
        if not persona:
            raise HTTPException(status_code=404, detail="Persona asociada no encontrada")

        # --- Actualizar Personas ---
        if 'primerNombre' in data and data['primerNombre']:
            persona.Nombre = data['primerNombre'].strip()

        if 'primerApellido' in data and data['primerApellido']:
            persona.PrimerApellido = data['primerApellido'].strip()

        if 'segundoApellido' in data:
            persona.SegundoApellido = data['segundoApellido'].strip() or None

        if 'curp' in data and data['curp'] is not None:
            persona.CURP = data['curp'].strip() or None

        if 'telefono' in data and data['telefono'] is not None:
            persona.NumeroTelefono = data['telefono'].strip() or None


        # --- Actualizar Usuarios (correo de login) ---
        if 'correo' in data and data['correo']:
            usuario_db = db.query(Usuario).filter(Usuario.PersonaId == persona.PersonaId).first()
            if usuario_db:
                correo_nuevo = data['correo'].strip()
                # Verificar que el correo no esté en uso por otro usuario
                duplicado = db.query(Usuario).filter(
                    Usuario.Correo == correo_nuevo,
                    Usuario.UsuarioId != usuario_db.UsuarioId
                ).first()
                if duplicado:
                    raise HTTPException(status_code=400, detail="El correo ya está registrado por otro usuario")
                usuario_db.Correo = correo_nuevo

        # --- Actualizar EstatusId en PresidentesDeEquipo ---
        if 'estatusId' in data and data['estatusId'] is not None:
            estatus_id = int(data['estatusId'])
            estatus_valido = db.query(EstatusPresidente).filter(
                EstatusPresidente.EstatusPresidenteId == estatus_id
            ).first()
            if not estatus_valido:
                raise HTTPException(status_code=400, detail=f"EstatusId {estatus_id} no válido")
            presidente.EstatusId = estatus_id

        db.commit()
        return {"message": "Presidente actualizado correctamente", "id": presidente_id}

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error al actualizar presidente: {str(e)}")




@router.get("/directorio-equipos", response_model=List[DirectorioEquipoResponse])
def get_directorio_equipos(db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    # Protección, idealmente verificar si es admin (RolId == 1)
    rol_id = getattr(usuario, 'RolId', None)
    if rol_id != 1:
        raise HTTPException(status_code=403, detail="Acceso denegado: Se requiere rol de Administrador")
    
    try:
        from app.repositorios.equipo_repositorio import obtener_directorio_equipos_repo
        return obtener_directorio_equipos_repo(db)
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

@router.get("/directorio-jugadores", response_model=List[DirectorioJugadorResponse])
def get_directorio_jugadores(db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    rol_id = getattr(usuario, 'RolId', None)
    if rol_id != 1:
        raise HTTPException(status_code=403, detail="Acceso denegado: Se requiere rol de Administrador")
    
    try:
        from app.repositorios.equipo_repositorio import obtener_directorio_jugadores_repo
        return obtener_directorio_jugadores_repo(db)
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")



# == DOCUMENTOS DE JUGADOR ==
@router.get("/jugador/{miembro_id}/documentos")
def get_documentos_jugador(miembro_id: int, db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    rol_id = getattr(usuario, 'RolId', None)
    if rol_id != 1:
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
    miembro = db.query(MiembrosEquipo).filter(
        MiembrosEquipo.MiembroEquipoId == miembro_id
    ).first()

    if not miembro:
        raise HTTPException(404, "Jugador no encontrado")
    
    persona_id = miembro.PersonaId
    
    try:
        from app.repositorios.equipo_repositorio import obtener_documentos_jugador_repo
        docs = obtener_documentos_jugador_repo(db, persona_id)
        # Formatear la URL completa si RutaArchivo es relativa
        for doc in docs:
            ruta = doc["RutaArchivo"]
            # Fix if the route is a local path
            doc["url"] = f"/{ruta}" if not ruta.startswith("http") else ruta
        return docs
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

@router.get("/jugador/{miembro_equipo_id}/exportar")
def exportar_documentos_jugador(miembro_equipo_id: int, db:Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    zip_bytes, nombre_zip = documentos_servicio.generar_zip_documentos(db, miembro_equipo_id)

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename={nombre_zip}"
        }
    )

@router.get("/equipo/{equipo_id}/exportar")
def exportar_documentos_equipo(equipo_id: int, db:Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    """Exporta todos los documentos de todos los jugadores de un equipo en un ZIP"""
    zip_bytes, nombre_zip = documentos_servicio.generar_zip_documentos_equipo(db, equipo_id)

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename={nombre_zip}"
        }
    )



# == ACTUALIZACIÓN DE EQUIPO Y JUGADOR == 
@router.patch("/update-equipo/{equipo_id}")
def update_equipo(equipo_id: int, equipo_data: EquipoUpdateCompleto, db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    rol_id = getattr(usuario, 'RolId', None)
    if rol_id != 1:
        raise HTTPException(status_code=403, detail="Acceso denegado: Se requiere rol de Administrador")

    # Validar que el nuevo presidente exista si se proporciona
    if equipo_data.PresidenteEquipoId is not None:
        from app.modelos.presidente_equipo_modelo import PresidenteEquipo
        presidente = db.query(PresidenteEquipo).filter(
            PresidenteEquipo.PresidenteEquipoId == equipo_data.PresidenteEquipoId
        ).first()
        if not presidente:
            raise HTTPException(status_code=404, detail="Presidente no encontrado con el ID proporcionado")

    try:
        from app.repositorios.equipo_repositorio import actualizar_equipo_repo
        equipo = actualizar_equipo_repo(
            db,
            equipo_id,
            equipo_data.NombreEquipo,
            equipo_data.Estatus,
            presidente_equipo_id=equipo_data.PresidenteEquipoId,
            liga_id=equipo_data.LigaId,
            modalidad_id=equipo_data.ModalidadId,
            categoria_id=equipo_data.CategoriaId,
            rama_id=equipo_data.RamaId
        )
        if not equipo:
            raise HTTPException(status_code=404, detail="Equipo no encontrado")
        return {"mensaje": "Equipo actualizado correctamente", "equipo_id": equipo.EquipoId}
    except HTTPException:
        raise
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

@router.patch("/update-jugador/{miembro_equipo_id}")
def update_jugador(miembro_equipo_id: int, jugador_data: JugadorUpdate, db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    rol_id = getattr(usuario, 'RolId', None)
    if rol_id != 1:
        raise HTTPException(status_code=403, detail="Acceso denegado: Se requiere rol de Administrador")
    
    try:
        from app.repositorios.equipo_repositorio import actualizar_jugador_repo
        miembro = actualizar_jugador_repo(
            db, 
            miembro_equipo_id, 
            jugador_data.Nombre, 
            jugador_data.PrimerApellido, 
            jugador_data.SegundoApellido, 
            jugador_data.CURP, 
            jugador_data.Estatus
        )
        if not miembro:
            raise HTTPException(status_code=404, detail="Jugador no encontrado")
        return {"mensaje": "Jugador actualizado correctamente", "miembro_equipo_id": miembro.MiembroEquipoId}
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

@router.post("/registrar-presidente-admin")
def registrar_presidente_admin(
    data: PresidenteAdminCreate,
    db: Session = Depends(get_db),
    usuario = Depends(obtener_usuario_actual)
):
    rol_id = getattr(usuario, 'RolId', None)
    if rol_id != 1:
        raise HTTPException(status_code=403, detail="Acceso denegado: Se requiere rol de Administrador")
    
    try:
        # Check if email exists
        usuario_existente = db.query(Usuario).filter(Usuario.Correo == data.correo).first()
        if usuario_existente:
            raise HTTPException(status_code=400, detail="El correo ya está registrado.")
        # Descomentar para permitir validar curp y no permitir dos presidentes con la misma curp
        # persona_existente = db.query(Personas).filter(Personas.CURP == data.curp).first()
        # if persona_existente:
        #      raise HTTPException(status_code=400, detail="El CURP ya está registrado.")

        # Create Persona
        nueva_persona = Personas(
            Nombre=data.nombre,
            PrimerApellido="",
            CURP=data.curp,
            NumeroTelefono=data.telefono
        )
        db.add(nueva_persona)
        db.flush()
        
        # Hash password "Hola1234?"
        salt = generar_salt()
        hash_pass = generar_hash(salt, "Hola1234?")
        
        # Create Usuario
        nuevo_usuario = Usuario(
            PersonaId=nueva_persona.PersonaId,
            Correo=data.correo,
            Contrasena=hash_pass,
            Salt=salt,
            RolId=3, # Presidente
            Estatus=True
        )
        db.add(nuevo_usuario)
        db.flush()
        
        # Create PresidenteEquipo
        nuevo_presidente = PresidenteEquipo(
            PersonaId=nueva_persona.PersonaId,
            EstatusId=7 # Activo
        )
        db.add(nuevo_presidente)
        db.flush()
        
        # Create OrdenPago
        nueva_orden = OrdenPago(
            UsuarioId=nuevo_usuario.UsuarioId,
            EstatusPagoId=3, # Aprobado
            FechaEnvio=datetime.now(),
            FechaDePago=datetime.now(),
            TotalPagar=0 # Opcional: calcular monto
        )
        db.add(nueva_orden)
        db.flush()
        
        # Create EquipoTemporal
        nuevo_equipo_temporal = EquipoTemporal(
            UsuarioId=nuevo_usuario.UsuarioId,
            CantidadJugadoresPagados=data.numPersonas,
            Activo=True,
            OrdenPagoId=nueva_orden.OrdenPagoId,
            TipoProcesoId=1 # asumiendo que 1 es el tipo de proceso general
        )
        db.add(nuevo_equipo_temporal)
        
        db.commit()
        
        return {
            "success": True,
            "mensaje": "Presidente creado correctamente",
            "presidente": {
                "nombre": nueva_persona.Nombre,
                "correo": nuevo_usuario.Correo,
                "jugadores_pagados": nuevo_equipo_temporal.CantidadJugadoresPagados
            }
        }
        
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")
