from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, Request
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
from app.esquemas.equipo_esquema import JugadorPersona, EquipoResponse, MiembroResponse, CatalogosRegistroResponse, CatalogoItem
from app.servicios.equipo_servicio import registrar_jugador_servicio
from app.modelos import (
    Equipos, MiembrosEquipo, Personas, RolesDeEquipo, LigaModalidadCategoriaRama, 
    CatalogoCategorias, Ligas, CatalogoModalidad, CatalogoRamas, PresidenteEquipo, Seguro,
    EquipoTemporal, Usuario
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
        combinaciones = db.query(LigaModalidadCategoriaRama).all()

        return {
            "ligas": [{"id": l.LigaId, "nombre": l.Nombreliga} for l in ligas],
            "categorias": [{"id": c.CategoriaId, "nombre": c.NombreCategoria} for c in categorias],
            "modalidades": [{"id": m.ModalidadId, "nombre": m.NombreModalidad} for m in modalidades],
            "ramas": [{"id": r.RamaId, "nombre": r.Nombre} for r in ramas],
            "seguros": [{"id": s.SeguroId, "nombre": s.Nombre, "precio": float(s.Precio)} for s in seguros],
            "combinaciones": [
                {
                    "id": comb.LigaModalidadCategoriaRamaId,
                    "liga_id": comb.LigaId,
                    "modalidad_id": comb.ModalidadId,
                    "categoria_id": comb.CategoriaId,
                    "rama_id": comb.RamaId
                } for comb in combinaciones
            ]
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
        presidente = db.query(PresidenteEquipo).filter(PresidenteEquipo.PersonaId == usuario.PersonaId).first()
        if not presidente:
            raise HTTPException(status_code=403, detail="El usuario no es un presidente de equipo registrado")

        # 2. Crear Registro de Equipo
        nuevo_equipo = Equipos(
            NombreEquipo=team_info["nombre_equipo"],
            LigaModalidadCategoriaRamaId=team_info["liga_mod_cat_ram_id"],
            PresidenteEquipoId=presidente.PresidenteEquipoId,
            NumeroJugadores=len(players_info),
            Estatus=True
        )
        db.add(nuevo_equipo)
        db.flush() # Para obtener el EquipoId

        os.makedirs(DOCS_DIR, exist_ok=True)

        # 3. Procesar Jugadores
        for index, p_data in enumerate(players_info):
            # a. Crear Persona
            try:
                nueva_persona = Personas(
                    Nombre=p_data["nombre"],
                    PrimerApellido=p_data["primer_apellido"],
                    SegundoApellido=p_data.get("segundo_apellido"),
                    CURP=p_data["curp"],
                    SexoId=p_data["sexo_id"],
                    FechaNacimiento=datetime.strptime(p_data["fecha_nacimiento"], "%d/%m/%Y").date() if p_data.get("fecha_nacimiento") else None
                )
                db.add(nueva_persona)
                db.flush()
            except IntegrityError as e:
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

            # b. Crear MiembroEquipo (Rol Jugador = 3)
            nuevo_miembro = MiembrosEquipo(
                PersonaId=nueva_persona.PersonaId,
                RolEnEquipo=3, # Asumimos 3 para Jugador según imagen
                EquipoID=nuevo_equipo.EquipoId,
                Estatus=True,
                Eliminado=False
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

        # 4. Actualizar Estatus del Presidente y Rol del Usuario (Automatización Final)
        presidente.EstatusId = 4  # En Revisión
        usuario_db = db.query(Usuario).filter(Usuario.UsuarioId == usuario.UsuarioId).first()
        if usuario_db:
            usuario_db.RolId = 3  # Presidente de Equipo

        db.commit()
        return {"mensaje": "Equipo y jugadores creados exitosamente", "equipo_id": nuevo_equipo.EquipoId}

    except Exception as e:
        db.rollback()
        print(f"Error en crear_equipo_completo: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error al procesar el registro: {str(e)}")

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
            CatalogoCategorias.NombreCategoria.label("Categoria"),
            Ligas.Nombreliga.label("Liga"),
            CatalogoModalidad.NombreModalidad.label("Modalidad"),
            CatalogoRamas.Nombre.label("Rama"),
            Equipos.NumeroJugadores,
            Equipos.Estatus,
            EquipoTemporal.SolicitudId
        ).join(LigaModalidadCategoriaRama, Equipos.LigaModalidadCategoriaRamaId == LigaModalidadCategoriaRama.LigaModalidadCategoriaRamaId)\
         .join(CatalogoCategorias, LigaModalidadCategoriaRama.CategoriaId == CatalogoCategorias.CategoriaId)\
         .join(Ligas, LigaModalidadCategoriaRama.LigaId == Ligas.LigaId)\
         .join(CatalogoModalidad, LigaModalidadCategoriaRama.ModalidadId == CatalogoModalidad.ModalidadId)\
         .join(CatalogoRamas, LigaModalidadCategoriaRama.RamaId == CatalogoRamas.RamaId)\
         .join(PresidenteEquipo, Equipos.PresidenteEquipoId == PresidenteEquipo.PresidenteEquipoId)\
         .join(Usuario, PresidenteEquipo.PersonaId == Usuario.PersonaId)\
         .outerjoin(EquipoTemporal, Usuario.UsuarioId == EquipoTemporal.UsuarioId)

        # 2. Add filter if not ADMINISTRADOR (RolId == 1)
        rol_id = getattr(usuario, 'RolId', None)
        
        if rol_id != 1:
            presidente = db.query(PresidenteEquipo).filter(PresidenteEquipo.PersonaId == usuario.PersonaId).first()
            if not presidente:
                return []
            query = query.filter(Equipos.PresidenteEquipoId == presidente.PresidenteEquipoId)

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
         .join(Equipos, MiembrosEquipo.EquipoID == Equipos.EquipoId)

        # 2. Add filter if not ADMINISTRADOR (RolId == 1)
        rol_id = getattr(usuario, 'RolId', None)
        
        if rol_id != 1:
            presidente = db.query(PresidenteEquipo).filter(PresidenteEquipo.PersonaId == usuario.PersonaId).first()
            if not presidente:
                return []
            query = query.filter(Equipos.PresidenteEquipoId == presidente.PresidenteEquipoId)

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

from app.esquemas.equipo_esquema import DirectorioEquipoResponse, DirectorioJugadorResponse
from app.repositorios.equipo_repositorio import obtener_directorio_equipos_repo, obtener_directorio_jugadores_repo, obtener_documentos_jugador_repo

@router.get("/directorio-equipos", response_model=List[DirectorioEquipoResponse])
def get_directorio_equipos(db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    # Protección, idealmente verificar si es admin (RolId == 1)
    rol_id = getattr(usuario, 'RolId', None)
    if rol_id != 1:
        raise HTTPException(status_code=403, detail="Acceso denegado: Se requiere rol de Administrador")
    
    try:
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