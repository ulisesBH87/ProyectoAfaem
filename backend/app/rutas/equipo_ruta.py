from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, Request
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.db.sesion import get_db
from typing import List, Optional
import traceback
import json
import os
from datetime import datetime
from app.core.seguridad import obtener_usuario_actual

from app.servicios.equipo_servicio import registrar_jugador_servicio, obtener_equipo_temporal_servicio, obtener_equipos_temporales_por_usuario_servicio
from app.esquemas.equipo_esquema import JugadorPersona, EquipoResponse, MiembroResponse, CatalogosRegistroResponse, CatalogoItem, EquipoUpdate, JugadorUpdate
from app.servicios.equipo_servicio import registrar_jugador_servicio
from app.modelos import (
    Equipos, EquiposJugando, MiembrosEquipo, Personas, RolesDeEquipo, 
    CatalogoCategorias, Ligas, CatalogoModalidad, CatalogoRamas, PresidenteEquipo, Seguro,
    EquipoTemporal, Usuario, AntecedentesInternacionales
)

router = APIRouter(prefix="/equipo-temporal", tags=["Equipo Temporal"])

@router.get("/equipos-temporales")
def obtener_equipos_temporales_por_usuario(db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    usuario_id = usuario.UsuarioId
    equipos = obtener_equipos_temporales_por_usuario_servicio(db, usuario_id)
    return equipos

@router.get("/slots")
async def obtener_slots(equipo_temporal_id: int,db: Session = Depends(get_db)):
    slots = obtener_equipo_temporal_servicio(db, equipo_temporal_id)
    return slots

UPLOAD_DIR = "uploads"
DOCS_DIR = os.path.join(UPLOAD_DIR, "documentos")

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
async def crear_equipo_completo(
    request: Request,
    db: Session = Depends(get_db),
    usuario = Depends(obtener_usuario_actual)
):
    try:
        form_data = await request.form()
        team_data_str = form_data.get("team_data")
        players_data_str = form_data.get("players_data")

        if not team_data_str or not players_data_str:
            raise HTTPException(status_code=400, detail="Faltan datos de equipo o jugadores")

        team_info = json.loads(team_data_str)
        players_info = json.loads(players_data_str)

        # 1. Obtener PresidenteEquipoId
        rol_id = getattr(usuario, 'RolId', None)
        presidente_id = None

        if rol_id == 1:  # ADMINISTRADOR
            presidente_id = team_info.get("presidente_id")
            # Si no se envía presidente_id, permitimos que sea None (el modelo lo soporta)
        else:
            presidente = db.query(PresidenteEquipo).filter(PresidenteEquipo.PersonaId == usuario.PersonaId).first()
            if not presidente:
                raise HTTPException(status_code=403, detail="El usuario no es un presidente de equipo registrado")
            presidente_id = presidente.PresidenteEquipoId

        # 2. Obtener o Crear Registro de Equipo (Unicidad por nombre insensible a mayúsculas)
        nombre_equipo = team_info["nombre_equipo"]
        equipo_existente = db.query(Equipos).filter(func.lower(Equipos.NombreEquipo) == func.lower(nombre_equipo)).first()

        if equipo_existente:
            nuevo_equipo = equipo_existente
        else:
            nuevo_equipo = Equipos(
                NombreEquipo=nombre_equipo,
                Estatus=True
            )
            db.add(nuevo_equipo)
            db.flush() # Para obtener el EquipoId

        # 3. Crear Registro en EquiposJugando
        nueva_competencia = EquiposJugando(
            EquipoId=nuevo_equipo.EquipoId,
            RamaId=team_info["rama_id"],
            CategoriaId=team_info["categoria_id"],
            LigaId=team_info["liga_id"],
            ModalidadId=team_info["modalidad_id"],
            PresidenteEquipoId=presidente_id,
            CantidadJugadores=len(players_info)
        )
        db.add(nueva_competencia)
        db.flush()

        os.makedirs(DOCS_DIR, exist_ok=True)
        LOGOS_DIR = os.path.join(UPLOAD_DIR, "logos")
        os.makedirs(LOGOS_DIR, exist_ok=True)

        # 3.5 Procesar Logo del Equipo
        team_logo = form_data.get("team_logo")
        if team_logo and isinstance(team_logo, UploadFile):
            logo_ext = team_logo.filename.split(".")[-1]
            logo_name = f"Logo_{nuevo_equipo.EquipoId}_{datetime.now().strftime('%Y%m%d%H%M%S')}.{logo_ext}"
            logo_path = os.path.join(LOGOS_DIR, logo_name)
            
            with open(logo_path, "wb") as buffer:
                buffer.write(await team_logo.read())
            
            nuevo_equipo.RutaLogo = os.path.join("uploads", "logos", logo_name).replace("\\", "/")
            db.flush()

        # 4. Procesar Jugadores
        for index, p_data in enumerate(players_info):
            # a. Crear Persona
            try:
                nueva_persona = Personas(
                    Nombre=p_data["nombre"],
                    PrimerApellido=p_data["primer_apellido"],
                    SegundoApellido=p_data.get("segundo_apellido"),
                    CURP=p_data["curp"],
                    NUI=p_data.get("nui"),
                    SexoId=p_data["sexo_id"],
                    FechaNacimiento=datetime.strptime(p_data["fecha_nacimiento"], "%d/%m/%Y").date() if p_data.get("fecha_nacimiento") else None,
                    LugarNacimiento=p_data.get("lugar_nacimiento"),
                    CorreoElectronico=p_data.get("correo"),
                    NumeroTelefono=p_data.get("telefono")
                )
                db.add(nueva_persona)
                db.flush()
            except IntegrityError as e:
                db.rollback()
                if "check_curp_persona_longitud" in str(e):
                    raise HTTPException(
                        status_code=400,
                        detail=f"La CURP '{p_data['curp']}' del jugador {p_data['nombre']} {p_data['primer_apellido']} debe tener exactamente 18 caracteres."
                    )
                else:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Error al registrar al jugador {p_data['nombre']} {p_data['primer_apellido']}: {str(e)}"
                    )

            # b. Crear Antecedentes si es extranjero
            antecedentes_id = None
            if p_data.get("extranjero"):
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

            # c. Crear MiembroEquipo (Usar rol proporcionado por el front)
            nuevo_miembro = MiembrosEquipo(
                PersonaId=nueva_persona.PersonaId,
                RolEnEquipo=p_data.get("rol_en_equipo", 3), # Default 3 (Jugador)
                EquipoID=nuevo_equipo.EquipoId,
                Estatus=True,
                Eliminado=False,
                NumeroCamiseta=p_data.get("numero_camiseta"),
                Extranjero=p_data.get("extranjero", False),
                AntecedentesId=antecedentes_id
            )
            db.add(nuevo_miembro)

            # c. Guardar Archivos del Jugador
            doc_types = ["acta", "ine", "foto", "formato"]
            for doc_type in doc_types:
                file_key = f"player_{index}_{doc_type}"
                archivo = form_data.get(file_key)
                if archivo and isinstance(archivo, UploadFile):
                    ext = archivo.filename.split(".")[-1]
                    # Formato solicitado: Equipo_CURP_Tipo.ext (Agrego tipo para no sobreescribir)
                    nombre_archivo = f"{nuevo_equipo.NombreEquipo}_{nueva_persona.CURP}_{doc_type}.{ext}".replace(" ", "_")
                    ruta_archivo = os.path.join(DOCS_DIR, nombre_archivo)
                    
                    with open(ruta_archivo, "wb") as buffer:
                        buffer.write(await archivo.read())
                    
                    # Aquí podrías registrar la ruta en la tabla de documentos si fuera necesario parse.
                    # Por ahora el usuario sólo solicitó guardarlos físicamente.

        # 4. Actualizar Estatus del Presidente y Rol del Usuario (Solo si es el propio presidente)
        if rol_id != 1:
            if presidente:
                presidente.EstatusId = 4  # En Revisión
            
            usuario_db = db.query(Usuario).filter(Usuario.UsuarioId == usuario.UsuarioId).first()
            if usuario_db:
                usuario_db.RolId = 3  # Presidente de Equipo

        db.commit()
        return {"mensaje": "Equipo y jugadores creados exitosamente", "equipo_id": nuevo_equipo.EquipoId}

    except Exception as e:
        db.rollback()
        error_msg = f"Error en crear_equipo_completo: {str(e)}"
        print(error_msg)
        tb = traceback.format_exc()
        print(tb)
        # Retornamos el error real temporalmente para depuración
        raise HTTPException(status_code=500, detail=f"{error_msg} | Traceback: {tb}")

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

@router.get("/directorio-presidentes-activos")
def get_presidentes_activos(db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    rol_id = getattr(usuario, 'RolId', None)
    if rol_id != 1:
        raise HTTPException(status_code=403, detail="Acceso denegado: Se requiere rol de Administrador")
    
    try:
        # Buscamos presidentes que tengan una persona asociada
        query = db.query(
            PresidenteEquipo.PresidenteEquipoId,
            Personas.Nombre,
            Personas.PrimerApellido,
            Personas.SegundoApellido
        ).join(Personas, PresidenteEquipo.PersonaId == Personas.PersonaId)
        
        resultados = query.all()
        
        return [
            {
                "id": r.PresidenteEquipoId,
                "nombre": f"{r.Nombre} {r.PrimerApellido} {r.SegundoApellido or ''}".strip()
            } for r in resultados
        ]
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error al obtener directorio de presidentes: {str(e)}")

# --- ENDPOINTS PARA DIRECTORIO GLOBAL ADMIN ---

from app.esquemas.equipo_esquema import DirectorioEquipoResponse, DirectorioJugadorResponse

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

@router.get("/jugador/{persona_id}/documentos")
def get_documentos_jugador(persona_id: int, db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    rol_id = getattr(usuario, 'RolId', None)
    if rol_id != 1:
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
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

@router.patch("/update-equipo/{equipo_id}")
def update_equipo(equipo_id: int, equipo_data: EquipoUpdate, db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    rol_id = getattr(usuario, 'RolId', None)
    if rol_id != 1:
        raise HTTPException(status_code=403, detail="Acceso denegado: Se requiere rol de Administrador")
    
    try:
        from app.repositorios.equipo_repositorio import actualizar_equipo_repo
        equipo = actualizar_equipo_repo(db, equipo_id, equipo_data.NombreEquipo, equipo_data.Estatus)
        if not equipo:
            raise HTTPException(status_code=404, detail="Equipo no encontrado")
        return {"mensaje": "Equipo actualizado correctamente", "equipo_id": equipo.EquipoId}
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