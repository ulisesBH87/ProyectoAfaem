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

from app.servicios.equipo_servicio import registrar_jugador_servicio, obtener_equipo_temporal_servicio, obtener_equipos_temporales_por_usuario_servicio, crear_equipo_completo_servicio
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
async def crear_equipo_completo(request: Request, db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    try:
        form_data = await request.form()

        result = await crear_equipo_completo_servicio(form_data=form_data, db=db, usuario=usuario)

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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