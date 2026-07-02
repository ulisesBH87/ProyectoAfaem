from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, Request, Response
from pydantic import BaseModel
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
from urllib.parse import urlsplit
from app.core.seguridad import obtener_usuario_actual, generar_salt, generar_hash, obtener_usuario_o_sesion_temporal, crear_token_sesion_temporal

from app.servicios.equipo_servicio import registrar_jugador_servicio, obtener_equipo_temporal_servicio, obtener_equipos_temporales_por_usuario_servicio, crear_equipo_completo_servicio
from app.esquemas.equipo_esquema import JugadorPersona, EquipoResponse, MiembroResponse, CatalogosRegistroResponse, CatalogoItem, EquipoUpdate, EquipoUpdateCompleto, JugadorUpdate, PresidenteAdminCreate
from app.modelos import (
    Equipos, EquiposJugando, MiembrosEquipo, Personas, RolesDeEquipo, 
    CatalogoCategorias, Ligas, CatalogoModalidad, CatalogoRamas, PresidenteEquipo, Seguro,
    EquipoTemporal, EquipoTemporalJugador, Usuario, AntecedentesInternacionales, OrdenPago,
    OrdenPagoDetalle
)
from app.modelos.documentos_entregados_modelo import DocumentosEntregados
from app.enums.documentos_estatus_enum import DocumentoEstatus
from app.servicios import equipo_servicio
from app.servicios import documentos_servicio
from app.esquemas.equipo_esquema import DirectorioEquipoResponse, DirectorioJugadorResponse
from app.repositorios.presidente_invitacion_repositorio import (
    crear_invitacion_presidente_repo,
    validar_invitacion_presidente_repo,
)
from app.servicios.whatsapp_servicio import WhatsAppService
from app.core.rate_limiter import rate_limit_invitacion

UPLOAD_DIR = "uploads"
DOCS_DIR = os.path.join(UPLOAD_DIR, "documentos")

router = APIRouter(prefix="/equipo-temporal", tags=["Equipo Temporal"])


class EnvioWhatsAppResponse(BaseModel):
    success: bool
    mensaje: str
    whatsapp_status_code: int
    meta_response: dict

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
async def obtener_slots(
    equipo_temporal_id: int,
    db: Session = Depends(get_db),
    auth_info = Depends(obtener_usuario_o_sesion_temporal)
):
    from app.modelos.equipo_temporal_modelo import EquipoTemporal
    equipo_tem = db.query(EquipoTemporal).filter(EquipoTemporal.EquipoTemporalId == equipo_temporal_id).first()
    if not equipo_tem:
        raise HTTPException(status_code=404, detail="Equipo temporal no encontrado")
        
    if auth_info["type"] == "access":
        usuario = auth_info["usuario"]
        rol_id = getattr(usuario, 'RolId', None)
        if rol_id in [1, '1']:
            pass
        else:
            if equipo_tem.UsuarioId != usuario.UsuarioId:
                raise HTTPException(status_code=403, detail="Acceso denegado: el equipo no pertenece al usuario")
    elif auth_info["type"] == "temp_invitation_session":
        usuario_id = auth_info["usuario_id"]
        if equipo_tem.UsuarioId != usuario_id:
            raise HTTPException(status_code=403, detail="Acceso denegado: el equipo no pertenece a esta invitación")
            
    slots = obtener_equipo_temporal_servicio(db, equipo_temporal_id)
    return slots

@router.get("/hay-slots")
async def hay_slots(equipo_id: int, db: Session = Depends(get_db)):
    #Servicio de busqueda de slots
    slots = equipo_servicio.hay_slots(db, equipo_id)

    return slots

@router.get("/invitacion/{token_identificador}/{token_secreto}", dependencies=[Depends(rate_limit_invitacion)])
async def validar_invitacion_presidente(request: Request, token_identificador: str, token_secreto: str, db: Session = Depends(get_db)):
    ip = request.headers.get("X-Forwarded-For", request.client.host).split(",")[0].strip() if request.client else None
    invitacion = validar_invitacion_presidente_repo(db, token_identificador, token_secreto, ip)

    from app.repositorios import equipo_repositorio

    equipos_pendientes = equipo_repositorio.obtener_equipos_temporales_pendientes_por_usuario_repo(
        db,
        invitacion.UsuarioId
    )

    db.commit()

    token_temporal = crear_token_sesion_temporal(
        usuario_id=invitacion.UsuarioId,
        invitacion_id=invitacion.PresidenteInvitacionId
    )

    return {
        "usuario_id": invitacion.UsuarioId,
        "equipos_temporales": equipos_pendientes,
        "token_temporal": token_temporal
    }

# == REGISTROS ==
@router.get("/catalogos-registro", response_model=CatalogosRegistroResponse)
def get_catalogos_registro(db: Session = Depends(get_db)):
    try:
        from sqlalchemy.orm import joinedload
        ligas = db.query(Ligas).options(
            joinedload(Ligas.CategoriaRelacion),
            joinedload(Ligas.ModalidadRelacion),
            joinedload(Ligas.RamaRelacion)
        ).all()
        categorias = db.query(CatalogoCategorias).all()
        modalidades = db.query(CatalogoModalidad).all()
        ramas = db.query(CatalogoRamas).all()
        seguros = db.query(Seguro).all()
        roles_equipo = db.query(RolesDeEquipo).filter(RolesDeEquipo.Eliminado == False).all()

        ligas_desc = []
        for l in ligas:
            cat = l.CategoriaRelacion.NombreCategoria if l.CategoriaRelacion else ""
            mod = l.ModalidadRelacion.NombreModalidad if l.ModalidadRelacion else ""
            ram = l.RamaRelacion.Nombre if l.RamaRelacion else ""
            desc = f"{l.Nombreliga} ({cat} - {mod} - {ram})" if cat or mod or ram else l.Nombreliga
            ligas_desc.append({
                "id": l.LigaId,
                "nombre": desc,
                "nombreOriginal": l.Nombreliga,
                "nombreCategoria": cat,
                "nombreModalidad": mod,
                "nombreRama": ram,
                "descripcion": l.Descripcionliga,
                "modalidadId": l.ModalidadId,
                "categoriaId": l.CategoriaId,
                "ramaId": l.RamaId
            })

        return {
            "ligas": ligas_desc,
            "categorias": [{"id": c.CategoriaId, "nombre": c.NombreCategoria} for c in categorias],
            "modalidades": [{"id": m.ModalidadId, "nombre": m.NombreModalidad} for m in modalidades],
            "ramas": [{"id": r.RamaId, "nombre": r.Nombre} for r in ramas],
            "seguros": [
                {
                    "id": s.SeguroId,
                    "nombre": s.Nombre,
                    "precio": float(s.Precio),
                    "TipoPersonaId": s.TipoPersonaId
                }
                for s in seguros
            ],
            "roles_equipo": [{"id": r.RolId, "nombre": r.NombreRol} for r in roles_equipo],
            "combinaciones": [] # Mantenemos el campo vacío para no romper el frontend por ahora
        }

    except Exception as e:
        #print(f"Error en get_catalogos_registro: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/validar-nombre")
def validar_nombre_equipo(
    nombre_equipo: str = Query(...),
    liga_id: int = Query(...),
    db: Session = Depends(get_db),
    usuario = Depends(obtener_usuario_actual)
):
    from app.modelos.equipo_modelo import Equipos, EquiposJugando
    from sqlalchemy import func
    
    existe = db.query(EquiposJugando).join(Equipos).filter(
        func.lower(Equipos.NombreEquipo) == func.lower(nombre_equipo.strip()),
        EquiposJugando.LigaId == liga_id
    ).first()
    
    return {"disponible": existe is None}

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
        
        equipo_jugando = db.query(EquiposJugando).filter(EquiposJugando.EquiposJugandoId == equipo_id).first()
        if not equipo_jugando:
            raise HTTPException(status_code=404, detail="El equipo no está registrado en la temporada actual (No se encontró en EquiposJugando)")

        equipo = db.query(Equipos).filter(Equipos.EquipoId == equipo_jugando.EquipoId).first()
        if not equipo:
            raise HTTPException(status_code=404, detail="El equipo especificado no existe in la tabla Equipos")

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

        # Obtener y validar seguro_id
        seguro_id_val = p_data.get("seguro_id")
        if not seguro_id_val:
            raise HTTPException(status_code=400, detail="El seguro_id es obligatorio para registrar un jugador.")
        try:
            seguro_id = int(seguro_id_val)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"ID de seguro inválido: {seguro_id_val}")
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
            # Validar campos obligatorios antes de insertar
            for field in ["nombre", "primer_apellido", "curp", "fecha_nacimiento"]:
                if not p_data.get(field):
                    raise HTTPException(status_code=400, detail=f"El campo '{field}' es obligatorio.")

            from app.utilidades.validaciones import validacion_fecha
            try:
                fn = validacion_fecha(p_data["fecha_nacimiento"])
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))

            s_id = safe_int(p_data.get("sexo_id"), 1)

            from app.core.telefono_utils import validar_y_normalizar_telefono
            telefono_normalizado = validar_y_normalizar_telefono(p_data.get("telefono"))

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
                NumeroTelefono=telefono_normalizado
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

        # Validar número de camiseta duplicado
        if camista_num is not None:
            dup_camiseta = db.query(MiembrosEquipo).filter(
                MiembrosEquipo.EquipoID == equipo_jugando.EquiposJugandoId,
                MiembrosEquipo.NumeroCamiseta == camista_num,
                MiembrosEquipo.Eliminado == False
            ).first()
            if dup_camiseta or any(
                isinstance(obj, MiembrosEquipo) and
                obj.EquipoID == equipo_jugando.EquiposJugandoId and
                obj.NumeroCamiseta == camista_num and
                not obj.Eliminado
                for obj in db.new
            ):
                raise HTTPException(400, f"El número de camiseta {camista_num} ya está asignado a otro jugador en este equipo.")

        # Validar rol/posición duplicada (excepto Cambio / Banca que es RolId = 11)
        if rol_id != 11:
            dup_rol = db.query(MiembrosEquipo).filter(
                MiembrosEquipo.EquipoID == equipo_jugando.EquiposJugandoId,
                MiembrosEquipo.RolEnEquipo == rol_id,
                MiembrosEquipo.Eliminado == False
            ).first()
            if dup_rol or any(
                isinstance(obj, MiembrosEquipo) and
                obj.EquipoID == equipo_jugando.EquiposJugandoId and
                obj.RolEnEquipo == rol_id and
                not obj.Eliminado
                for obj in db.new
            ):
                from app.modelos.rol_equipo_modelo import RolesDeEquipo
                rol_nombre = db.query(RolesDeEquipo.NombreRol).filter(RolesDeEquipo.RolId == rol_id).scalar() or "esta posición"
                raise HTTPException(400, f"La posición de {rol_nombre} ya está ocupada por otro jugador en este equipo.")

        nuevo_miembro = MiembrosEquipo(
            PersonaId=nueva_persona.PersonaId,
            RolEnEquipo=rol_id,
            EquipoID=equipo_jugando.EquiposJugandoId,
            Estatus=True,
            Eliminado=False,
            NumeroCamiseta=camista_num,
            Extranjero=bool(p_data.get("extranjero", False)),
            AntecedentesId=antecedentes_id
        )
        db.add(nuevo_miembro)
        
        # 6. Sumar +1 a la CantidadJugadores
        equipo_jugando.CantidadJugadores = (equipo_jugando.CantidadJugadores or 0) + 1

        # 6b. Consumir y actualizar el slot en la tabla temporal
        from app.repositorios.equipo_repositorio import actualizar_slot_repo
        actualizar_slot_repo(db, equipo.EquipoId, nueva_persona.PersonaId, seguro_id)

        from app.repositorios.equipo_repositorio import doc_type_to_id_jugador, es_menor_de_edad

        DOC_TYPE_TO_ID = doc_type_to_id_jugador(es_menor_de_edad(fn))

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
            from app.servicios.documentos_servicio import subir_documentos_jugador_equipo
            from app.repositorios.equipo_repositorio import obtener_solicitud_id_para_persona

            solicitud_id_jugador = obtener_solicitud_id_para_persona(
                db, nueva_persona.PersonaId, usuario.UsuarioId
            )

            nombre_jugador = f"{nueva_persona.Nombre or ''} {nueva_persona.PrimerApellido or ''} {nueva_persona.SegundoApellido or ''}".strip()
            nombre_jugador = " ".join(nombre_jugador.split())

            await subir_documentos_jugador_equipo(
                db=db,
                persona_id=nueva_persona.PersonaId,
                documento_afiliacion_ids=documento_ids,
                archivos=archivos,
                solicitud_id=solicitud_id_jugador,
                nombre_equipo=equipo.NombreEquipo,
                nombre_jugador=nombre_jugador
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
        print("ERROR EN AGREGAR JUGADOR:", tb, file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Error interno")

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
    slot_id: Optional[int] = Form(None),
    nui: Optional[str] = Form(None),
    lugar_nacimiento: Optional[str] = Form(None),
    correo: Optional[str] = Form(None),
    telefono: Optional[str] = Form(None),
    
    # Campos adicionales de posición, camiseta y extranjería
    posicion: Optional[str] = Form(None),
    num_camiseta: Optional[str] = Form(None),
    es_foraneo: Optional[str] = Form(None),
    nacionalidad_jugador: Optional[str] = Form(None),
    pais_resid_actual: Optional[str] = Form(None),
    nacionalidad_padre: Optional[str] = Form(None),
    nacionalidad_madre: Optional[str] = Form(None),
    nac_abuelo_paterno: Optional[str] = Form(None),
    nac_abuela_paterna: Optional[str] = Form(None),
    nac_abuelo_materno: Optional[str] = Form(None),
    nac_abuela_materna: Optional[str] = Form(None),
    registro_asociacion_extranjera: Optional[str] = Form(None),
    juego_club_extranjero: Optional[str] = Form(None),
    
    db: Session = Depends(get_db),
    auth_info = Depends(obtener_usuario_o_sesion_temporal)
):
    # 1. Validar pertenencia del equipo temporal
    from app.modelos.equipo_temporal_modelo import EquipoTemporal
    equipo_tem = db.query(EquipoTemporal).filter(EquipoTemporal.EquipoTemporalId == equipo_temporal_id).first()
    if not equipo_tem:
        raise HTTPException(status_code=404, detail="Equipo temporal no encontrado")
        
    if auth_info["type"] == "access":
        usuario = auth_info["usuario"]
        rol_id = getattr(usuario, 'RolId', None)
        if rol_id in [1, '1']:
            pass
        else:
            if equipo_tem.UsuarioId != usuario.UsuarioId:
                raise HTTPException(status_code=403, detail="Acceso denegado: el equipo no pertenece al usuario")
    elif auth_info["type"] == "temp_invitation_session":
        usuario_id = auth_info["usuario_id"]
        if equipo_tem.UsuarioId != usuario_id:
            raise HTTPException(status_code=403, detail="Acceso denegado: el equipo no pertenece a esta invitación")

    # 2. Validar pertenencia del slot si se especifica
    if slot_id is not None:
        slot = db.query(EquipoTemporalJugador).filter(EquipoTemporalJugador.EquipoTemporalJugadorId == slot_id).first()
        if not slot:
            raise HTTPException(status_code=404, detail="Slot de jugador temporal no encontrado")
        if slot.EquipoTemporalId != equipo_temporal_id:
            raise HTTPException(status_code=403, detail="Acceso denegado: el slot no pertenece a este equipo")

    from app.utilidades.validaciones import validacion_fecha
    try:
        validated_dob = validacion_fecha(fecha_nacimiento)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    persona = JugadorPersona(
        nombre=nombre,
        primer_apellido=primer_apellido,
        segundo_apellido=segundo_apellido,
        curp=CURP,
        sexo_id=sexo_id,
        fecha_nacimiento=validated_dob,
        nui=nui,
        lugar_nacimiento=lugar_nacimiento,
        correo=correo,
        telefono=telefono
    )
    
    extra_data = {
        "posicion": posicion,
        "num_camiseta": num_camiseta,
        "es_foraneo": es_foraneo,
        "nacionalidad_jugador": nacionalidad_jugador,
        "pais_resid_actual": pais_resid_actual,
        "nacionalidad_padre": nacionalidad_padre,
        "nacionalidad_madre": nacionalidad_madre,
        "nac_abuelo_paterno": nac_abuelo_paterno,
        "nac_abuela_paterna": nac_abuela_paterna,
        "nac_abuelo_materno": nac_abuelo_materno,
        "nac_abuela_materna": nac_abuela_materna,
        "registro_asociacion_extranjera": registro_asociacion_extranjera,
        "juego_club_extranjero": juego_club_extranjero
    }
    
    return await registrar_jugador_servicio(db, equipo_temporal_id, persona, documento_afiliacion_ids, archivos, seguro_id, slot_id, extra_data)

class RegistrarGrupoPayload(BaseModel):
    equipo_temporal_id: int

@router.post("/registrar-grupo")
async def registrar_grupo(
    payload: RegistrarGrupoPayload,
    db: Session = Depends(get_db),
    auth_info = Depends(obtener_usuario_o_sesion_temporal)
):
    equipo_temporal_id = payload.equipo_temporal_id
    
    # 1. Obtener el equipo temporal
    equipo_tem = db.query(EquipoTemporal).filter(EquipoTemporal.EquipoTemporalId == equipo_temporal_id).first()
    if not equipo_tem:
        raise HTTPException(status_code=404, detail="Equipo temporal no encontrado")
        
    if auth_info["type"] == "access":
        usuario = auth_info["usuario"]
        rol_id = getattr(usuario, 'RolId', None)
        if rol_id in [1, '1']:
            pass
        else:
            if equipo_tem.UsuarioId != usuario.UsuarioId:
                raise HTTPException(status_code=403, detail="Acceso denegado: el equipo no pertenece al usuario")
    elif auth_info["type"] == "temp_invitation_session":
        usuario_id = auth_info["usuario_id"]
        if equipo_tem.UsuarioId != usuario_id:
            raise HTTPException(status_code=403, detail="Acceso denegado: el equipo no pertenece a esta invitación")
        
    # 2. Obtener todos los slots
    slots = db.query(EquipoTemporalJugador).filter(
        EquipoTemporalJugador.EquipoTemporalId == equipo_temporal_id
    ).all()
    
    pending_slots = [s for s in slots if not s.Completo]
    if not pending_slots:
        return {"mensaje": "Todos los jugadores ya están registrados", "registrados": 0}
        
    # 3. Validar borradores de todos los slots pendientes
    import json
    import base64
    
    def is_minor(fecha_nacimiento_str: str) -> bool:
        try:
            parts = [int(p) for p in fecha_nacimiento_str.split('-')]
            from datetime import date
            birth = date(parts[0], parts[1], parts[2])
            today = date.today()
            age = today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))
            return age < 18
        except Exception:
            return False
            
    # Validar primero todos los slots antes de hacer cualquier cambio en la BD
    for slot in pending_slots:
        if not slot.DatosBorrador:
            raise HTTPException(
                status_code=400,
                detail=f"El jugador {slot.EquipoTemporalJugadorId} no tiene información capturada."
            )
        try:
            datos = json.loads(slot.DatosBorrador)
        except Exception:
            raise HTTPException(
                status_code=400,
                detail=f"Error al decodificar los datos del jugador {slot.EquipoTemporalJugadorId}."
            )
            
        nombre_completo = f"{datos.get('nombreJugador', '')} {datos.get('apellidoPaterno', '')}".strip() or f"Jugador {slot.EquipoTemporalJugadorId}"
        
        # Validar campos obligatorios
        if not datos.get("nombreJugador", "").strip():
            raise HTTPException(status_code=400, detail=f"El nombre de {nombre_completo} es obligatorio.")
        if not datos.get("apellidoPaterno", "").strip():
            raise HTTPException(status_code=400, detail=f"El apellido paterno de {nombre_completo} es obligatorio.")
        if not datos.get("apellidoMaterno", "").strip():
            raise HTTPException(status_code=400, detail=f"El apellido materno de {nombre_completo} es obligatorio.")
        curp = datos.get("curp", "").strip().upper()
        if not curp:
            raise HTTPException(status_code=400, detail=f"El CURP de {nombre_completo} es obligatorio.")
        if len(curp) != 18:
            raise HTTPException(status_code=400, detail=f"El CURP de {nombre_completo} debe medir exactamente 18 caracteres.")
        if not datos.get("fechaNacimiento"):
            raise HTTPException(status_code=400, detail=f"La fecha de nacimiento de {nombre_completo} es obligatoria.")
        from app.utilidades.validaciones import validacion_fecha
        try:
            validacion_fecha(datos.get("fechaNacimiento"))
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Error en {nombre_completo}: {str(e)}")
        if not datos.get("lugarNacimiento", "").strip():
            raise HTTPException(status_code=400, detail=f"El lugar de nacimiento de {nombre_completo} es obligatorio.")
        if not datos.get("genero"):
            raise HTTPException(status_code=400, detail=f"El sexo de {nombre_completo} es obligatorio.")
        if not datos.get("correo", "").strip():
            raise HTTPException(status_code=400, detail=f"El correo electrónico de {nombre_completo} es obligatorio.")
        if not datos.get("telefono", "").strip():
            raise HTTPException(status_code=400, detail=f"El teléfono de {nombre_completo} es obligatorio.")
        if not datos.get("posicion"):
            raise HTTPException(status_code=400, detail=f"La posición en el campo de {nombre_completo} es obligatoria.")
        if not datos.get("numCamiseta") or str(datos.get("numCamiseta")).strip() == "":
            raise HTTPException(status_code=400, detail=f"El número de camiseta de {nombre_completo} es obligatorio.")
            
        # Validar documentos obligatorios
        docs = datos.get("documentosBorrador", {})
        if not docs.get("acta"):
            raise HTTPException(status_code=400, detail=f"El acta de nacimiento de {nombre_completo} es obligatoria.")
        if not docs.get("foto"):
            raise HTTPException(status_code=400, detail=f"La fotografía de {nombre_completo} es obligatoria.")
            
        es_menor = is_minor(datos.get("fechaNacimiento"))
        if es_menor:
            if not docs.get("ineTutor"):
                raise HTTPException(status_code=400, detail=f"La identificación del tutor de {nombre_completo} es obligatoria por ser menor de edad.")
            if not docs.get("identificacionMenor"):
                raise HTTPException(status_code=400, detail=f"La identificación del menor de {nombre_completo} es obligatoria.")
        else:
            if not docs.get("ine"):
                raise HTTPException(status_code=400, detail=f"La identificación (INE) de {nombre_completo} es obligatoria.")

    # 4. Registrar de forma grupal con control transaccional
    class MockUploadFile:
        def __init__(self, filename: str, content: bytes):
            self.filename = filename
            self.content = content
            
        async def read(self) -> bytes:
            return self.content
            
    # Sobrescribir db.commit temporalmente a db.flush para posponer la confirmación
    original_commit = db.commit
    db.commit = db.flush
    
    try:
        for slot in pending_slots:
            datos = json.loads(slot.DatosBorrador)
            
            from app.utilidades.validaciones import validacion_fecha
            validated_dob = validacion_fecha(datos.get("fechaNacimiento"))

            persona = JugadorPersona(
                nombre=datos.get("nombreJugador", "").strip(),
                primer_apellido=datos.get("apellidoPaterno", "").strip(),
                segundo_apellido=datos.get("apellidoMaterno", "").strip(),
                curp=datos.get("curp", "").strip().upper(),
                sexo_id=int(datos.get("genero")),
                fecha_nacimiento=validated_dob,
                nui=datos.get("nui", "").strip().upper() if datos.get("nui") else None,
                lugar_nacimiento=datos.get("lugarNacimiento", "MÉXICO").strip(),
                correo=datos.get("correo", "").strip().lower(),
                telefono=str(datos.get("codigoPais", "+52")) + str(datos.get("telefono", "")).strip()
            )
            
            extra_data = {
                "posicion": datos.get("posicion"),
                "num_camiseta": datos.get("numCamiseta"),
                "es_foraneo": datos.get("esForaneo"),
                "nacionalidad_jugador": datos.get("nacionalidadJugador"),
                "pais_resid_actual": datos.get("paisResidencia"),
                "nacionalidad_padre": datos.get("nacionalidadPadre"),
                "nacionalidad_madre": datos.get("nacionalidadMadre"),
                "nac_abuelo_paterno": datos.get("nacAbueloPaterno"),
                "nac_abuela_paterna": datos.get("nacAbuelaPaterna"),
                "nac_abuelo_materno": datos.get("nacAbueloMaterno"),
                "nac_abuela_materna": datos.get("nacAbuelaMaterna"),
                "registro_asociacion_extranjera": datos.get("registro_asociacion_extranjera"),
                "juego_club_extranjero": datos.get("juegoClubExtranjero")
            }
            
            documento_afiliacion_ids = []
            archivos = []
            
            docs_borrador = datos.get("documentosBorrador", {})
            es_menor = is_minor(datos.get("fechaNacimiento"))
            
            keys_to_process = [("acta", 22), ("foto", 25)]
            if es_menor:
                keys_to_process.extend([("ineTutor", 33), ("identificacionMenor", 36)])
            else:
                keys_to_process.append(("ine", 26))
                
            for key, doc_id in keys_to_process:
                doc_file = docs_borrador.get(key)
                if doc_file and doc_file.get("data") and doc_file.get("name"):
                    filename = doc_file["name"]
                    base64_data = doc_file["data"]
                    if "," in base64_data:
                        base64_data = base64_data.split(",")[1]
                    file_bytes = base64.b64decode(base64_data)
                    
                    mock_file = MockUploadFile(filename=filename, content=file_bytes)
                    documento_afiliacion_ids.append(doc_id)
                    archivos.append(mock_file)
                    
            if docs_borrador.get("formatoFirmado"):
                ff = docs_borrador["formatoFirmado"]
                if ff.get("data") and ff.get("name"):
                    filename = ff["name"]
                    base64_data = ff["data"]
                    if "," in base64_data:
                        base64_data = base64_data.split(",")[1]
                    file_bytes = base64.b64decode(base64_data)
                    
                    mock_file = MockUploadFile(filename=filename, content=file_bytes)
                    documento_afiliacion_ids.append(28)
                    archivos.append(mock_file)
                    
            seguro_id = slot.SeguroId or int(datos.get("seguroId") or 0)
            if not seguro_id:
                raise HTTPException(status_code=400, detail=f"No hay seguro asignado para el jugador {persona.nombre} {persona.primer_apellido}")
                
            await registrar_jugador_servicio(
                db=db,
                equipo_temporal_id=equipo_temporal_id,
                persona=persona,
                documentos_afiliacion_ids=documento_afiliacion_ids,
                archivos=archivos,
                seguro_id=seguro_id,
                slot_id=slot.EquipoTemporalJugadorId,
                extra_data=extra_data
            )
            
        # Desactivar el equipo temporal ya que todos los slots están completos
        equipo_tem.Activo = False
        
        # Restaurar original_commit y confirmar todo en la base de datos real
        db.commit = original_commit
        db.commit()
        
    except Exception as e:
        db.rollback()
        db.commit = original_commit
        exc_type, exc_obj, exc_tb = sys.exc_info()
        tb = traceback.format_exc()
        raise HTTPException(status_code=500, detail=f"Error en el registro grupal: {str(e)} | {tb}")
        
    return {"mensaje": "Todos los jugadores se registraron correctamente", "registrados": len(pending_slots)}

class BorradorJugadorPayload(BaseModel):
    slot_id: int
    datos: dict

@router.post("/borrador-jugador")
def guardar_borrador_jugador(
    payload: BorradorJugadorPayload,
    db: Session = Depends(get_db),
    auth_info = Depends(obtener_usuario_o_sesion_temporal)
):
    slot = db.query(EquipoTemporalJugador).filter(EquipoTemporalJugador.EquipoTemporalJugadorId == payload.slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot de jugador temporal no encontrado")
        
    from app.modelos.equipo_temporal_modelo import EquipoTemporal
    equipo_tem = db.query(EquipoTemporal).filter(EquipoTemporal.EquipoTemporalId == slot.EquipoTemporalId).first()
    if not equipo_tem:
        raise HTTPException(status_code=404, detail="Equipo temporal asociado al slot no encontrado")
        
    if auth_info["type"] == "access":
        usuario = auth_info["usuario"]
        rol_id = getattr(usuario, 'RolId', None)
        if rol_id in [1, '1']:
            pass
        else:
            if equipo_tem.UsuarioId != usuario.UsuarioId:
                raise HTTPException(status_code=403, detail="Acceso denegado: el slot no pertenece a tu equipo")
    elif auth_info["type"] == "temp_invitation_session":
        usuario_id = auth_info["usuario_id"]
        if equipo_tem.UsuarioId != usuario_id:
            raise HTTPException(status_code=403, detail="Acceso denegado: el slot no pertenece a esta invitación")
    
    slot.DatosBorrador = json.dumps(payload.datos, ensure_ascii=False)
    
    curp_duplicada = False
    curp = str(payload.datos.get("curp") or "").strip().upper()
    if curp and len(curp) == 18:
        from app.repositorios import equipo_repositorio
        if equipo_repositorio.existe_persona_repo(db, curp):
            curp_duplicada = True
            
    db.commit()
    return {
        "mensaje": "Borrador guardado correctamente",
        "curp_duplicada": curp_duplicada
    }


class BorradorPresidentePayload(BaseModel):
    datos: dict

@router.post("/borrador-presidente")
def crear_o_actualizar_borrador_presidente(
    payload: BorradorPresidentePayload,
    borrador_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    usuario = Depends(obtener_usuario_actual),
):
    db.info["es_borrador"] = True
    rol_id = getattr(usuario, 'RolId', None)
    if rol_id != 1:
        raise HTTPException(status_code=403, detail="Acceso denegado: Se requiere rol de Administrador")

    datos = payload.datos
    cuenta = datos.get("cuenta", {})

    correo = (cuenta.get("correo") or "").strip()
    contrasena = (cuenta.get("contrasena") or "").strip()
    nombre = (cuenta.get("nombre") or "").strip()
    primer_apellido = (cuenta.get("primerApellido") or "").strip()
    segundo_apellido = (cuenta.get("segundoApellido") or "").strip()
    telefono = (cuenta.get("telefono") or "").strip()
    telefono_opcional = (cuenta.get("telefonoOpcional") or "").strip()
    curp = (cuenta.get("curp") or "").strip()

    # Check if we are updating an existing draft
    if borrador_id:
        presidente = db.query(PresidenteEquipo).filter(PresidenteEquipo.PresidenteEquipoId == borrador_id).first()
        if not presidente:
            raise HTTPException(status_code=404, detail="Borrador no encontrado")
        persona = db.query(Personas).filter(Personas.PersonaId == presidente.PersonaId).first()
        usuario_db = db.query(Usuario).filter(Usuario.PersonaId == presidente.PersonaId).first()
    else:
        # Check if email is already in use (only for real non-placeholder emails)
        if correo and not correo.endswith("@temporary.afaem.com"):
            existing_user = db.query(Usuario).filter(Usuario.Correo == correo, Usuario.Eliminado == False).first()
            if existing_user:
                # If the existing user is a draft, we can reuse it!
                pres = db.query(PresidenteEquipo).filter(PresidenteEquipo.PersonaId == existing_user.PersonaId).first()
                if pres and pres.EstatusId == 8:
                    presidente = pres
                    persona = db.query(Personas).filter(Personas.PersonaId == presidente.PersonaId).first()
                    usuario_db = existing_user
                else:
                    raise HTTPException(status_code=400, detail="El correo ya está registrado por otro usuario")
            else:
                persona = None
                presidente = None
                usuario_db = None
        else:
            persona = None
            presidente = None
            usuario_db = None

    # Create if not exists
    if not presidente:
        from app.core.telefono_utils import validar_y_normalizar_telefono
        telefono_normalizado = validar_y_normalizar_telefono(telefono) if telefono else None
        telefono_opcional_normalizado = validar_y_normalizar_telefono(telefono_opcional) if telefono_opcional else None

        persona = Personas(
            Nombre=nombre,
            PrimerApellido=primer_apellido,
            SegundoApellido=segundo_apellido or None,
            CURP=curp or None,
            NumeroTelefono=telefono_normalizado,
            NumeroTelefonoOpcional=telefono_opcional_normalizado
        )
        db.add(persona)
        db.flush()

        import uuid
        email_to_use = correo if correo else f"draft_{uuid.uuid4().hex}@temporary.afaem.com"
        pass_to_use = contrasena if contrasena else uuid.uuid4().hex

        from app.core.seguridad import generar_salt, generar_hash
        salt = generar_salt()
        hash_pass = generar_hash(salt, pass_to_use)

        usuario_db = Usuario(
            PersonaId=persona.PersonaId,
            Correo=email_to_use,
            Contrasena=hash_pass,
            Salt=salt,
            RolId=3,
            Estatus=False
        )
        db.add(usuario_db)
        db.flush()

        presidente = PresidenteEquipo(
            PersonaId=persona.PersonaId,
            EstatusId=8, # BORRADOR
            TipoDirectivoId=2 if datos.get("esEntrenador") else 1
        )
        db.add(presidente)
        db.flush()

    # Update records with latest draft info
    persona.Nombre = nombre
    persona.PrimerApellido = primer_apellido
    persona.SegundoApellido = segundo_apellido or None
    if curp:
        persona.CURP = curp
    if telefono:
        from app.core.telefono_utils import validar_y_normalizar_telefono
        persona.NumeroTelefono = validar_y_normalizar_telefono(telefono)
    if telefono_opcional is not None:
        from app.core.telefono_utils import validar_y_normalizar_telefono
        persona.NumeroTelefonoOpcional = validar_y_normalizar_telefono(telefono_opcional) if telefono_opcional else None
    
    if contrasena:
        from app.core.seguridad import generar_salt, generar_hash
        salt = generar_salt()
        hash_pass = generar_hash(salt, contrasena)
        usuario_db.Contrasena = hash_pass
        usuario_db.Salt = salt
    
    if correo:
        duplicado = db.query(Usuario).filter(Usuario.Correo == correo, Usuario.PersonaId != persona.PersonaId, Usuario.Eliminado == False).first()
        if not duplicado:
            usuario_db.Correo = correo

    curp_duplicada = False
    curp_cleaned = curp.strip().upper()
    if curp_cleaned and len(curp_cleaned) == 18:
        query_curp = db.query(Personas).filter(Personas.CURP == curp_cleaned)
        if persona and persona.PersonaId:
            query_curp = query_curp.filter(Personas.PersonaId != persona.PersonaId)
        if query_curp.first():
            curp_duplicada = True

    # Update JSON data draft column
    presidente.TipoDirectivoId = 2 if datos.get("esEntrenador") else 1
    presidente.DatosBorrador = json.dumps(datos, ensure_ascii=False)
    db.commit()

    return {
        "presidente_id": presidente.PresidenteEquipoId,
        "usuario_id": usuario_db.UsuarioId,
        "mensaje": "Borrador guardado correctamente",
        "curp_duplicada": curp_duplicada
    }

@router.get("/borrador-presidente/{borrador_id}")
def obtener_borrador_presidente(
    borrador_id: int,
    db: Session = Depends(get_db),
    usuario = Depends(obtener_usuario_actual),
):
    rol_id = getattr(usuario, 'RolId', None)
    if rol_id != 1:
        raise HTTPException(status_code=403, detail="Acceso denegado: Se requiere rol de Administrador")

    presidente = db.query(PresidenteEquipo).filter(PresidenteEquipo.PresidenteEquipoId == borrador_id).first()
    if not presidente:
        raise HTTPException(status_code=404, detail="Borrador no encontrado")

    datos = json.loads(presidente.DatosBorrador) if presidente.DatosBorrador else {}
    return {"datos": datos}


# --- NUEVOS ENDPOINTS PARA TABLAS REALES (PRESIDENTE Y ADMIN) ---
@router.get("/user-real-teams", response_model=List[EquipoResponse])
def get_user_real_teams(db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    try:
        # 1. Subquery para contar slots comprados por equipo
        slots_subquery = db.query(
            EquipoTemporal.EquipoId.label("EquipoId"),
            EquipoTemporal.LigaId.label("LigaId"),
            func.count(EquipoTemporalJugador.EquipoTemporalJugadorId).label("SlotsComprados")
        ).join(EquipoTemporalJugador, EquipoTemporal.EquipoTemporalId == EquipoTemporalJugador.EquipoTemporalId).group_by(EquipoTemporal.EquipoId, EquipoTemporal.LigaId).subquery()

        # 1.5. Subquery to get one SolicitudId for the team-league participation
        solicitud_id_subquery = db.query(EquipoTemporal.SolicitudId)\
            .filter(EquipoTemporal.EquipoId == EquiposJugando.EquipoId)\
            .filter(EquipoTemporal.LigaId == EquiposJugando.LigaId)\
            .limit(1)\
            .scalar_subquery()

        # 2. Base query with joins
        query = db.query(
            EquiposJugando.EquiposJugandoId.label("EquipoId"),
            Equipos.NombreEquipo,
            Equipos.FechaCreacion,
            Equipos.RutaLogo,
            CatalogoCategorias.NombreCategoria.label("Categoria"),
            Ligas.Nombreliga.label("Liga"),
            CatalogoModalidad.NombreModalidad.label("Modalidad"),
            CatalogoRamas.Nombre.label("Rama"),
            EquiposJugando.CantidadJugadores.label("NumeroJugadores"),
            Equipos.Estatus,
            solicitud_id_subquery.label("SolicitudId"),
            func.coalesce(slots_subquery.c.SlotsComprados, 0).label("SlotsComprados"),
            func.trim(
                func.concat(
                    Personas.Nombre, ' ',
                    Personas.PrimerApellido, ' ',
                    func.coalesce(Personas.SegundoApellido, '')
                )
            ).label("PresidenteNombreCompleto")
        ).join(EquiposJugando, Equipos.EquipoId == EquiposJugando.EquipoId)\
         .join(Ligas, EquiposJugando.LigaId == Ligas.LigaId)\
         .join(CatalogoCategorias, Ligas.CategoriaId == CatalogoCategorias.CategoriaId)\
         .join(CatalogoModalidad, Ligas.ModalidadId == CatalogoModalidad.ModalidadId)\
         .join(CatalogoRamas, Ligas.RamaId == CatalogoRamas.RamaId)\
         .join(PresidenteEquipo, EquiposJugando.PresidenteEquipoId == PresidenteEquipo.PresidenteEquipoId)\
         .join(Personas, PresidenteEquipo.PersonaId == Personas.PersonaId)\
         .join(Usuario, PresidenteEquipo.PersonaId == Usuario.PersonaId)\
         .outerjoin(slots_subquery, (EquiposJugando.EquipoId == slots_subquery.c.EquipoId) & (EquiposJugando.LigaId == slots_subquery.c.LigaId))

        # 3. Add filter if not ADMINISTRADOR (RolId == 1)
        rol_id = getattr(usuario, 'RolId', None)
        
        if rol_id != 1:
            presidente = db.query(PresidenteEquipo).filter(PresidenteEquipo.PersonaId == usuario.PersonaId).first()
            if not presidente:
                return []
            if presidente.TipoDirectivoId == 2: # ENTRENADOR
                query = query.filter(EquiposJugando.EntrenadorEquipoId == presidente.PresidenteEquipoId)
            else: # PRESIDENTE
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
               "SolicitudId": r.SolicitudId,
               "SlotsComprados": int(r.SlotsComprados or 0),
               "PresidenteNombreCompleto": r.PresidenteNombreCompleto or ''
           } for r in resultados
        ]
    except Exception as e:
        #print(f"Error en get_user_real_teams: {str(e)}")
        #print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error interno SQL")

@router.get("/mis-jugadores-reales", response_model=List[MiembroResponse])
def get_mis_jugadores_reales(db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    try:
        # 1. Subconsulta escalar para obtener la fotografía más reciente del jugador (DocumentoId 4 en el catálogo)
        from app.modelos.documento_afiliacion_modelo import DocumentoAfiliacion
        foto_subquery = db.query(DocumentosEntregados.DocumentosSolicitudId)\
            .join(DocumentoAfiliacion, DocumentosEntregados.DocumentoAfiliacionId == DocumentoAfiliacion.DocumentoAfiliacionId)\
            .filter(DocumentosEntregados.PersonaId == Personas.PersonaId)\
            .filter(DocumentoAfiliacion.DocumentoId == 4)\
            .order_by(DocumentosEntregados.FechaEntrega.desc())\
            .limit(1)\
            .scalar_subquery()

        # Subconsulta escalar para obtener el nombre del seguro del jugador
        from app.modelos.catalogo_seguros import Seguro
        seguro_subquery = db.query(
            Seguro.Nombre
        ).join(
            EquipoTemporalJugador, Seguro.SeguroId == EquipoTemporalJugador.SeguroId
        ).filter(
            EquipoTemporalJugador.PersonaId == Personas.PersonaId
        ).limit(1).scalar_subquery()

        # 2. Base query with joins
        query = db.query(
            MiembrosEquipo.MiembroEquipoId,
            Personas.PersonaId,
            Personas.FechaNacimiento,
            Personas.Nombre,
            Personas.PrimerApellido,
            Personas.SegundoApellido,
            RolesDeEquipo.NombreRol.label("Rol"),
            Equipos.NombreEquipo.label("Equipo"),
            MiembrosEquipo.FechaIngreso,
            MiembrosEquipo.Estatus,
            foto_subquery.label("RutaFoto"),
            MiembrosEquipo.NumeroCamiseta,
            seguro_subquery.label("SeguroNombre"),
            MiembrosEquipo.EquipoID.label("EquipoId")
        ).join(Personas, MiembrosEquipo.PersonaId == Personas.PersonaId)\
         .join(RolesDeEquipo, MiembrosEquipo.RolEnEquipo == RolesDeEquipo.RolId)\
         .join(EquiposJugando, MiembrosEquipo.EquipoID == EquiposJugando.EquiposJugandoId)\
         .join(Equipos, EquiposJugando.EquipoId == Equipos.EquipoId)

        # 3. Add filter if not ADMINISTRADOR (RolId == 1)
        rol_id = getattr(usuario, 'RolId', None)
        
        if rol_id != 1:
            presidente = db.query(PresidenteEquipo).filter(PresidenteEquipo.PersonaId == usuario.PersonaId).first()
            if not presidente:
                return []
            if presidente.TipoDirectivoId == 2: # ENTRENADOR
                query = query.filter(EquiposJugando.EntrenadorEquipoId == presidente.PresidenteEquipoId).distinct()
            else: # PRESIDENTE
                query = query.filter(EquiposJugando.PresidenteEquipoId == presidente.PresidenteEquipoId).distinct()

        resultados = query.all()
        from datetime import date

        formatted_results = []
        for r in resultados:
            es_menor = False
            if r.FechaNacimiento:
                try:
                    hoy = date.today()
                    nacimiento = r.FechaNacimiento
                    edad = hoy.year - nacimiento.year - ((hoy.month, hoy.day) < (nacimiento.month, nacimiento.day))
                    es_menor = edad < 18
                except Exception:
                    pass
            docs_requeridos = 5 if es_menor else 4
            required_docs_ids = [22, 33, 36, 25, 28] if es_menor else [22, 26, 25, 28]

            approved_count = db.query(DocumentosEntregados.DocumentoAfiliacionId).filter(
                DocumentosEntregados.PersonaId == r.PersonaId,
                DocumentosEntregados.DocumentoAfiliacionId.in_(required_docs_ids),
                DocumentosEntregados.EstadoValidacionId == 2
            ).distinct().count()

            rejected_count = db.query(DocumentosEntregados.DocumentosSolicitudId).filter(
                DocumentosEntregados.PersonaId == r.PersonaId,
                DocumentosEntregados.EstadoValidacionId == 3
            ).count()

            pending_count = db.query(DocumentosEntregados.DocumentosSolicitudId).filter(
                DocumentosEntregados.PersonaId == r.PersonaId,
                DocumentosEntregados.EstadoValidacionId == 1
            ).count()

            if rejected_count > 0:
                estatus_docs = "Rechazado"
            elif approved_count >= docs_requeridos:
                estatus_docs = "Aprobado"
            elif pending_count > 0:
                estatus_docs = "En espera"
            else:
                estatus_docs = "Pendiente"

            nombre_completo = f"{r.Nombre} {r.PrimerApellido} {r.SegundoApellido or ''}".strip().upper()

            formatted_results.append({
                "MiembroEquipoId": r.MiembroEquipoId,
                "NombreCompleto": nombre_completo,
                "Rol": r.Rol,
                "Equipo": r.Equipo,
                "FechaIngreso": r.FechaIngreso,
                "Estatus": bool(r.Estatus),
                "RutaFoto": f"/documentos/{r.RutaFoto}" if r.RutaFoto else None,
                "NumeroCamiseta": r.NumeroCamiseta,
                "EstatusDocumentos": estatus_docs,
                "SeguroNombre": r.SeguroNombre or "Sin seguro asignado",
                "EquipoId": r.EquipoId
            })

        return formatted_results
    except Exception as e:
        print(f"Error en get_mis_jugadores_reales: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error interno SQL")


# --- ENDPOINTS PARA DIRECTORIO GLOBAL ADMIN ---
@router.get("/directorio-presidentes-activos")
def get_presidentes_activos(db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    rol_id = getattr(usuario, 'RolId', None)
    if rol_id != 1:
        raise HTTPException(status_code=403, detail="Acceso denegado: No tienes permisos para acceder a este recurso")
    
    try:
        from app.modelos.usuario_modelo import Usuario
        from app.modelos.catalogo_estatus_presidente import EstatusPresidente
        from app.modelos.documento_afiliacion_modelo import DocumentoAfiliacion
        from app.modelos.presidente_invitacion_modelo import PresidenteInvitacion

        foto_subquery = db.query(DocumentosEntregados.RutaArchivo)\
            .join(DocumentoAfiliacion, DocumentosEntregados.DocumentoAfiliacionId == DocumentoAfiliacion.DocumentoAfiliacionId)\
            .filter(DocumentosEntregados.PersonaId == Personas.PersonaId)\
            .filter(DocumentoAfiliacion.DocumentoId == 4)\
            .order_by(DocumentosEntregados.FechaEntrega.desc())\
            .limit(1)\
            .scalar_subquery()

        whatsapp_status_subquery = db.query(PresidenteInvitacion.WhatsAppStatus)\
            .filter(PresidenteInvitacion.UsuarioId == Usuario.UsuarioId)\
            .filter(PresidenteInvitacion.Activo == True)\
            .order_by(PresidenteInvitacion.FechaCreacion.desc())\
            .limit(1)\
            .scalar_subquery()

        # Subconsultas para obtener el equipo del presidente o del entrenador
        from sqlalchemy import or_
        equipo_name_subquery = db.query(Equipos.NombreEquipo)\
            .join(EquiposJugando, Equipos.EquipoId == EquiposJugando.EquipoId)\
            .filter(
                or_(
                    EquiposJugando.PresidenteEquipoId == PresidenteEquipo.PresidenteEquipoId,
                    EquiposJugando.EntrenadorEquipoId == PresidenteEquipo.PresidenteEquipoId
                )
            )\
            .limit(1)\
            .scalar_subquery()

        equipo_id_subquery = db.query(Equipos.EquipoId)\
            .join(EquiposJugando, Equipos.EquipoId == EquiposJugando.EquipoId)\
            .filter(
                or_(
                    EquiposJugando.PresidenteEquipoId == PresidenteEquipo.PresidenteEquipoId,
                    EquiposJugando.EntrenadorEquipoId == PresidenteEquipo.PresidenteEquipoId
                )
            )\
            .limit(1)\
            .scalar_subquery()

        query = db.query(
            PresidenteEquipo.PresidenteEquipoId,
            Personas.Nombre,
            Personas.PrimerApellido,
            Personas.SegundoApellido,
            Personas.CURP,
            Personas.NumeroTelefono,
            Personas.NumeroTelefonoOpcional,
            PresidenteEquipo.EstatusId,
            EstatusPresidente.Nombre.label('EstatusNombre'),
            Usuario.Correo.label('CorreoLogin'),
            Usuario.UsuarioId.label('UsuarioId'),
            foto_subquery.label("RutaFoto"),
            equipo_name_subquery.label("NombreEquipo"),
            equipo_id_subquery.label("EquipoId"),
            whatsapp_status_subquery.label("WhatsAppStatus"),
            PresidenteEquipo.Afiliacion,
            PresidenteEquipo.TipoDirectivoId
        ).join(Personas, PresidenteEquipo.PersonaId == Personas.PersonaId)\
         .join(EstatusPresidente, PresidenteEquipo.EstatusId == EstatusPresidente.EstatusPresidenteId)\
         .outerjoin(Usuario, Usuario.PersonaId == Personas.PersonaId)

        resultados = query.all()

        # Obtener todos los equipos jugando con sus directivos (tanto presidentes como entrenadores)
        equipos_jugando = db.query(
            EquiposJugando.PresidenteEquipoId,
            EquiposJugando.EntrenadorEquipoId,
            Equipos.EquipoId,
            Equipos.NombreEquipo
        ).join(Equipos, Equipos.EquipoId == EquiposJugando.EquipoId).all()
        
        # Mapear de directivo ID (PresidenteEquipoId) a lista de equipos
        equipos_por_directivo = {}
        for ej in equipos_jugando:
            if ej.PresidenteEquipoId is not None:
                if ej.PresidenteEquipoId not in equipos_por_directivo:
                    equipos_por_directivo[ej.PresidenteEquipoId] = []
                equipos_por_directivo[ej.PresidenteEquipoId].append({
                    "id": ej.EquipoId,
                    "nombre": ej.NombreEquipo
                })
            if ej.EntrenadorEquipoId is not None:
                if ej.EntrenadorEquipoId not in equipos_por_directivo:
                    equipos_por_directivo[ej.EntrenadorEquipoId] = []
                equipos_por_directivo[ej.EntrenadorEquipoId].append({
                    "id": ej.EquipoId,
                    "nombre": ej.NombreEquipo
                })

        return [
            {
                "id":             r.PresidenteEquipoId,
                "nombre":         f"{r.Nombre} {r.PrimerApellido} {r.SegundoApellido or ''}".strip(),
                "primerNombre":   r.Nombre          or '',
                "primerApellido": r.PrimerApellido   or '',
                "segundoApellido":r.SegundoApellido  or '',
                "curp":           r.CURP,
                "telefono":       r.NumeroTelefono   or '',
                "telefonoOpcional": r.NumeroTelefonoOpcional or '',
                "estatus":        r.EstatusId,
                "estatusNombre":  r.EstatusNombre    or '',
                "correo":         r.CorreoLogin      or '',
                "usuarioId":      r.UsuarioId,
                "RutaFoto":       r.RutaFoto,
                "equipo":         r.NombreEquipo,
                "equipoId":       r.EquipoId,
                "equipos":        equipos_por_directivo.get(r.PresidenteEquipoId, []),
                "whatsappStatus": r.WhatsAppStatus,
                "seguroNombre":   r.Afiliacion or "Sin seguro asignado",
                "esEntrenador":   r.TipoDirectivoId == 2
            } for r in resultados
        ]
    except Exception as e:
        #print(traceback.format_exc())
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
            from app.core.telefono_utils import validar_y_normalizar_telefono
            persona.NumeroTelefono = validar_y_normalizar_telefono(data['telefono'])

        if 'telefonoOpcional' in data:
            if data['telefonoOpcional'] is not None and data['telefonoOpcional'].strip():
                from app.core.telefono_utils import validar_y_normalizar_telefono
                persona.NumeroTelefonoOpcional = validar_y_normalizar_telefono(data['telefonoOpcional'])
            else:
                persona.NumeroTelefonoOpcional = None


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
        #print(traceback.format_exc())
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
        #print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error interno")

@router.get("/directorio-jugadores", response_model=List[DirectorioJugadorResponse])
def get_directorio_jugadores(db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    rol_id = getattr(usuario, 'RolId', None)
    if rol_id != 1:
        raise HTTPException(status_code=403, detail="Acceso denegado: Se requiere rol de Administrador")
    
    try:
        from app.repositorios.equipo_repositorio import obtener_directorio_jugadores_repo
        return obtener_directorio_jugadores_repo(db)
    except Exception as e:
        #print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error interno")


@router.get("/equipo/{equipo_id}/jugadores")
def get_jugadores_equipo(equipo_id: int, db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    rol_id = getattr(usuario, 'RolId', None)
    if rol_id != 1:
        raise HTTPException(status_code=403, detail="Acceso denegado: Se requiere rol de Administrador")
    
    try:
        from app.repositorios.equipo_repositorio import obtener_miembros_equipo_por_id_repo
        return obtener_miembros_equipo_por_id_repo(db, equipo_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener jugadores del equipo: {str(e)}")


# == DOCUMENTOS DE JUGADOR ==
class ActualizarDocumentoEstadoPayload(BaseModel):
    EstadoValidacionId: int
    ObservacionesDocumento: Optional[str] = None

@router.get("/jugador/{miembro_id}/documentos")
def get_documentos_jugador(miembro_id: int, db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    rol_id = getattr(usuario, 'RolId', None)
    
    miembro = db.query(MiembrosEquipo).filter(
        MiembrosEquipo.MiembroEquipoId == miembro_id
    ).first()

    if not miembro:
        raise HTTPException(404, "Jugador no encontrado")

    if rol_id != 1:
        from app.modelos.presidente_equipo_modelo import PresidenteEquipo
        presidente = db.query(PresidenteEquipo).filter(
            PresidenteEquipo.PersonaId == usuario.PersonaId
        ).first()

        if not presidente:
            raise HTTPException(status_code=403, detail="Acceso denegado")

        from app.modelos.equipo_modelo import EquiposJugando
        
        # Filtrar por Entrenador o Presidente según corresponda
        filter_cond = EquiposJugando.EntrenadorEquipoId == presidente.PresidenteEquipoId if presidente.TipoDirectivoId == 2 else EquiposJugando.PresidenteEquipoId == presidente.PresidenteEquipoId
        
        is_member = db.query(MiembrosEquipo).join(
            EquiposJugando, MiembrosEquipo.EquipoID == EquiposJugando.EquiposJugandoId
        ).filter(
            MiembrosEquipo.PersonaId == miembro.PersonaId,
            MiembrosEquipo.Eliminado == False,
            filter_cond
        ).first() is not None

        from app.modelos.equipo_temporal_jugador_modelo import EquipoTemporalJugador
        from app.modelos.equipo_temporal_modelo import EquipoTemporal
        is_temp_member = db.query(EquipoTemporalJugador).join(
            EquipoTemporal, EquipoTemporalJugador.EquipoTemporalId == EquipoTemporal.EquipoTemporalId
        ).filter(
            EquipoTemporal.UsuarioId == usuario.UsuarioId,
            EquipoTemporalJugador.PersonaId == miembro.PersonaId
        ).first() is not None

        if not (is_member or is_temp_member):
            raise HTTPException(status_code=403, detail="No tienes autorización para ver los documentos de este jugador")
    
    persona_id = miembro.PersonaId
    
    try:
        from app.modelos.persona_modelo import Personas
        from datetime import date
        persona = db.query(Personas).filter(Personas.PersonaId == persona_id).first()
        es_menor = False
        nombre_completo = ""
        fecha_nacimiento = None
        if persona:
            nombre_completo = f"{persona.Nombre} {persona.PrimerApellido} {persona.SegundoApellido or ''}".strip().upper()
            if persona.FechaNacimiento:
                fecha_nacimiento = persona.FechaNacimiento.isoformat() if hasattr(persona.FechaNacimiento, "isoformat") else str(persona.FechaNacimiento)
                try:
                    hoy = date.today()
                    nacimiento = persona.FechaNacimiento
                    edad = hoy.year - nacimiento.year - ((hoy.month, hoy.day) < (nacimiento.month, nacimiento.day))
                    es_menor = edad < 18
                except Exception:
                    pass

        from app.repositorios.equipo_repositorio import obtener_documentos_jugador_repo
        docs = obtener_documentos_jugador_repo(db, persona_id)
        # Formatear la URL completa apuntando al endpoint seguro de documentos
        for doc in docs:
            doc_id = doc.get("DocumentosSolicitudId")
            doc["url"] = f"/documentos/{doc_id}" if doc_id else None
            doc["RutaArchivo"] = None
        return {
            "es_menor": es_menor,
            "nombre_completo": nombre_completo,
            "fecha_nacimiento": fecha_nacimiento,
            "persona_id": persona_id,
            "documentos": docs
        }
    except Exception as e:
        #print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error interno")

@router.patch("/documento/{documento_id}/estado")
def actualizar_estado_documento(documento_id: int, payload: ActualizarDocumentoEstadoPayload, db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    rol_id = getattr(usuario, 'RolId', None)
    if rol_id != 1:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    documento = db.query(DocumentosEntregados).filter(
        DocumentosEntregados.DocumentosSolicitudId == documento_id
    ).first()

    if not documento:
        raise HTTPException(404, "Documento no encontrado")

    if payload.EstadoValidacionId not in (1, 2, 3, 4):
        raise HTTPException(400, "Estado de validación inválido")

    if payload.EstadoValidacionId == 3:
        motivo = (payload.ObservacionesDocumento or '').strip()
        if not motivo:
            raise HTTPException(status_code=400, detail="El motivo de rechazo es obligatorio")
        documento.ObservacionesDocumento = motivo
    else:
        documento.ObservacionesDocumento = None

    documento.EstadoValidacionId = payload.EstadoValidacionId
    documento.FechaValidacion = datetime.now() if payload.EstadoValidacionId in (2, 3) else None
    db.commit()

    return {
        "DocumentosSolicitudId": documento.DocumentosSolicitudId,
        "EstadoValidacionId": documento.EstadoValidacionId,
        "ObservacionesDocumento": documento.ObservacionesDocumento,
    }

@router.get("/jugador/{miembro_id}/solicitud-documento")
def get_solicitud_documento_jugador(
    miembro_id: int,
    db: Session = Depends(get_db),
    usuario=Depends(obtener_usuario_actual),
):
    rol_id = getattr(usuario, 'RolId', None)
    
    miembro = db.query(MiembrosEquipo).filter(
        MiembrosEquipo.MiembroEquipoId == miembro_id
    ).first()
    if not miembro:
        raise HTTPException(404, "Jugador no encontrado")

    if rol_id != 1:
        from app.modelos.presidente_equipo_modelo import PresidenteEquipo
        presidente = db.query(PresidenteEquipo).filter(
            PresidenteEquipo.PersonaId == usuario.PersonaId
        ).first()

        if not presidente:
            raise HTTPException(status_code=403, detail="Acceso denegado")

        from app.modelos.equipo_modelo import EquiposJugando
        
        # Filtrar por Entrenador o Presidente según corresponda
        filter_cond = EquiposJugando.EntrenadorEquipoId == presidente.PresidenteEquipoId if presidente.TipoDirectivoId == 2 else EquiposJugando.PresidenteEquipoId == presidente.PresidenteEquipoId

        is_member = db.query(MiembrosEquipo).join(
            EquiposJugando, MiembrosEquipo.EquipoID == EquiposJugando.EquiposJugandoId
        ).filter(
            MiembrosEquipo.PersonaId == miembro.PersonaId,
            MiembrosEquipo.Eliminado == False,
            filter_cond
        ).first() is not None

        from app.modelos.equipo_temporal_jugador_modelo import EquipoTemporalJugador
        from app.modelos.equipo_temporal_modelo import EquipoTemporal
        is_temp_member = db.query(EquipoTemporalJugador).join(
            EquipoTemporal, EquipoTemporalJugador.EquipoTemporalId == EquipoTemporal.EquipoTemporalId
        ).filter(
            EquipoTemporal.UsuarioId == usuario.UsuarioId,
            EquipoTemporalJugador.PersonaId == miembro.PersonaId
        ).first() is not None

        if not (is_member or is_temp_member):
            raise HTTPException(status_code=403, detail="No tienes autorización para consultar la solicitud de este jugador")

    from app.repositorios.equipo_repositorio import obtener_solicitud_id_para_persona
    solicitud_id = obtener_solicitud_id_para_persona(db, miembro.PersonaId, usuario.UsuarioId)
    return {"solicitud_id": solicitud_id}

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

    # Validar que el nuevo entrenador exista si se proporciona
    if equipo_data.EntrenadorEquipoId is not None:
        from app.modelos.presidente_equipo_modelo import PresidenteEquipo
        entrenador = db.query(PresidenteEquipo).filter(
            PresidenteEquipo.PresidenteEquipoId == equipo_data.EntrenadorEquipoId
        ).first()
        if not entrenador:
            raise HTTPException(status_code=404, detail="Entrenador no encontrado con el ID proporcionado")

    try:
        from app.repositorios.equipo_repositorio import actualizar_equipo_repo
        equipo = actualizar_equipo_repo(
            db,
            equipo_id,
            equipo_data.NombreEquipo,
            equipo_data.Estatus,
            presidente_equipo_id=equipo_data.PresidenteEquipoId,
            entrenador_equipo_id=equipo_data.EntrenadorEquipoId,
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
        #print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error interno")

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
            jugador_data.Estatus,
            email=jugador_data.Email,
            sexo_id=jugador_data.SexoId,
            fecha_nacimiento=jugador_data.FechaNacimiento,
            nui=jugador_data.NUI,
            numero_camiseta=jugador_data.NumeroCamiseta,
            rol_en_equipo=jugador_data.RolEnEquipo
        )
        if not miembro:
            raise HTTPException(status_code=404, detail="Jugador no encontrado")
        return {"mensaje": "Jugador actualizado correctamente", "miembro_equipo_id": miembro.MiembroEquipoId}
    except HTTPException:
        raise
    except Exception as e:
        #print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error interno")

@router.post("/registrar-presidente-admin")
async def registrar_presidente_admin(
    nombre: str = Form(...),
    primerApellido: Optional[str] = Form(None),
    segundoApellido: Optional[str] = Form(None),
    correo: str = Form(...),
    telefono: Optional[str] = Form(None),
    telefonoOpcional: Optional[str] = Form(None),
    curp: str = Form(...),
    rfc: Optional[str] = Form(None),
    sexoId: Optional[int] = Form(None),
    fechaNacimiento: Optional[str] = Form(None),
    contrasena: Optional[str] = Form(None),
    numPersonas: int = Form(...),
    segurosAsignados: Optional[str] = Form(None),
    voucher: Optional[UploadFile] = File(None),
    actaNacimiento: Optional[UploadFile] = File(None),
    identificacion: Optional[UploadFile] = File(None),
    fotografia: Optional[UploadFile] = File(None),
    formatoAfiliacion: Optional[UploadFile] = File(None),
    ligaId: Optional[int] = Form(None),
    ligaNombre: Optional[str] = Form(None),
    nombreEquipo: Optional[str] = Form(None),
    afiliacion: Optional[str] = Form(None),
    borradorId: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    usuario = Depends(obtener_usuario_actual)
):
    rol_id = getattr(usuario, 'RolId', None)
    if rol_id != 1:
        raise HTTPException(status_code=403, detail="Acceso denegado: Se requiere rol de Administrador")
    
    try:
        # Check CURP uniqueness
        if curp:
            curp_cleaned = curp.strip().upper()
            query_curp = db.query(Personas).filter(Personas.CURP == curp_cleaned)
            if borradorId:
                nuevo_presidente = db.query(PresidenteEquipo).filter(PresidenteEquipo.PresidenteEquipoId == borradorId).first()
                if nuevo_presidente:
                    query_curp = query_curp.filter(Personas.PersonaId != nuevo_presidente.PersonaId)
            existing_curp = query_curp.first()
            if existing_curp:
                raise HTTPException(status_code=400, detail="La CURP ingresada ya se encuentra registrada.")

        from app.core.telefono_utils import validar_y_normalizar_telefono
        telefono_normalizado = validar_y_normalizar_telefono(telefono) if telefono else None
        telefono_opcional_normalizado = validar_y_normalizar_telefono(telefonoOpcional) if telefonoOpcional else None

        if borradorId:
            # Load the existing draft records
            nuevo_presidente = db.query(PresidenteEquipo).filter(PresidenteEquipo.PresidenteEquipoId == borradorId).first()
            if not nuevo_presidente:
                raise HTTPException(status_code=404, detail="Borrador de presidente no encontrado")
            
            nueva_persona = db.query(Personas).filter(Personas.PersonaId == nuevo_presidente.PersonaId).first()
            nuevo_usuario = db.query(Usuario).filter(Usuario.PersonaId == nuevo_presidente.PersonaId).first()

            # Check email uniqueness excluding current user
            usuario_existente = db.query(Usuario).filter(Usuario.Correo == correo, Usuario.PersonaId != nueva_persona.PersonaId, Usuario.Eliminado == False).first()
            if usuario_existente:
                raise HTTPException(status_code=400, detail="El correo ya está registrado.")

            # Update Persona
            nueva_persona.Nombre = nombre
            nueva_persona.PrimerApellido = primerApellido or ""
            nueva_persona.SegundoApellido = segundoApellido or None
            nueva_persona.CURP = curp
            nueva_persona.RFC = rfc.strip().upper() if rfc and rfc.strip() else None
            nueva_persona.NumeroTelefono = telefono_normalizado
            nueva_persona.NumeroTelefonoOpcional = telefono_opcional_normalizado
            nueva_persona.SexoId = sexoId if sexoId else None
            nueva_persona.FechaNacimiento = fechaNacimiento if fechaNacimiento else None

            # Update User password if provided
            if contrasena:
                password_to_use = contrasena
                salt = generar_salt()
                hash_pass = generar_hash(salt, password_to_use)
                nuevo_usuario.Contrasena = hash_pass
                nuevo_usuario.Salt = salt
            
            nuevo_usuario.Correo = correo
            nuevo_usuario.Estatus = True

            # Complete President status
            nuevo_presidente.EstatusId = 7 # ACTIVO
            nuevo_presidente.Afiliacion = afiliacion
            nuevo_presidente.DatosBorrador = None # Clear draft data

        else:
            # Check if email exists
            usuario_existente = db.query(Usuario).filter(Usuario.Correo == correo, Usuario.Eliminado == False).first()
            if usuario_existente:
                raise HTTPException(status_code=400, detail="El correo ya está registrado.")

            # Create Persona con datos completos
            nueva_persona = Personas(
                Nombre=nombre,
                PrimerApellido=primerApellido or "",
                SegundoApellido=segundoApellido or "",
                CURP=curp,
                RFC=rfc.strip().upper() if rfc and rfc.strip() else None,
                NumeroTelefono=telefono_normalizado,
                NumeroTelefonoOpcional=telefono_opcional_normalizado,
                SexoId=sexoId if sexoId else None,
                FechaNacimiento=fechaNacimiento if fechaNacimiento else None,
            )
            db.add(nueva_persona)
            db.flush()
            
            # Hash la contraseña asignada por el admin (o usar default si no se proporcionó)
            password_to_use = contrasena if contrasena else "Hola1234?"
            salt = generar_salt()
            hash_pass = generar_hash(salt, password_to_use)
            
            # Create Usuario
            nuevo_usuario = Usuario(
                PersonaId=nueva_persona.PersonaId,
                Correo=correo,
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
                EstatusId=7, # Activo
                Afiliacion=afiliacion
            )
            db.add(nuevo_presidente)
            db.flush()
        
        # Create Solicitud
        from app.modelos.solicitud_modelo import Solicitud
        nueva_solicitud = Solicitud(
            UsuarioId=nuevo_usuario.UsuarioId,
            TipoSolicitudId=1, # PRESIDENTE_EQUIPO
            EstatusValidacion=2, # ACEPTADO
            FechaSolicitud=datetime.now(),
            ObservacionesSolicitud="Registro directo por administrador",
            Afiliacion=afiliacion
        )
        db.add(nueva_solicitud)
        db.flush()
        
        # Calculate Order Detalle and Total
        total = 0
        detalles = []

        # Fetch costs for inscriptions
        from app.modelos.catalogo_tipo_afiliacion import CatalogoTiposAfiliacion
        pres_af = db.query(CatalogoTiposAfiliacion).filter(CatalogoTiposAfiliacion.TipoAfiliacionId == 2).first()
        precio_pres = pres_af.CostoActual if pres_af else 0

        # Add President Inscription
        detalles.append({
            "tipo_concepto": 2, # INSCRIPCION
            "tipo_afiliacion_id": 2, # PRESIDENTE
            "seguro_id": None,
            "cantidad": 1,
            "precio": precio_pres,
            "subtotal": precio_pres
        })
        total += precio_pres
            
        if segurosAsignados:
            try:
                seguros_dict = json.loads(segurosAsignados)
                for seg_id_str, cant in seguros_dict.items():
                    cant = int(cant)
                    if cant > 0:
                        seg_id = int(seg_id_str)
                        seguro = db.query(Seguro).filter(Seguro.SeguroId == seg_id, Seguro.Activo == True).first()
                        if seguro:
                            subtotal_seg = seguro.Precio * cant
                            detalles.append({
                                "tipo_concepto": 1, # SEGURO
                                "tipo_afiliacion_id": None,
                                "seguro_id": seguro.SeguroId,
                                "cantidad": cant,
                                "precio": seguro.Precio,
                                "subtotal": subtotal_seg
                            })
                            total += subtotal_seg
            except Exception:
                pass
                
        # Agregar los detalles de inscripción con costo 0 para cumplir con la validación de slots
        detalles.append({
            "tipo_concepto": 2,          # INSCRIPCION
            "tipo_afiliacion_id": 2,     # TIPO_AFILIACION_PRESIDENTE
            "seguro_id": None,
            "cantidad": 1,
            "precio": 0.0,
            "subtotal": 0.0
        })
                
        # Create OrdenPago
        nueva_orden = OrdenPago(
            UsuarioId=nuevo_usuario.UsuarioId,
            EstatusPagoId=3, # Aprobado
            FechaEnvio=datetime.now(),
            FechaDePago=datetime.now(),
            TotalPagar=total,
            SolicitudId=nueva_solicitud.SolicitudId
        )
        db.add(nueva_orden)
        db.flush()
        
        # Create details
        for d in detalles:
            registro_detalle = OrdenPagoDetalle(
                OrdenPagoId=nueva_orden.OrdenPagoId,
                TipoConceptoId=d["tipo_concepto"],
                TipoAfiliacionId=d["tipo_afiliacion_id"],
                SeguroId=d["seguro_id"],
                Cantidad=d["cantidad"],
                PrecioUnitarioCobrado=d["precio"],
                Subtotal=d["subtotal"]
            )
            db.add(registro_detalle)
        db.flush()
        
        # Create slots / EquipoTemporal
        from app.repositorios.equipo_repositorio import crear_equipo_temporal_repo
        nuevo_equipo_temporal = crear_equipo_temporal_repo(
            db=db,
            orden=nueva_orden,
            solicitud_id=nueva_solicitud.SolicitudId,
            tipo_proceso=1 # REGISTRO_INICIAL
        )
        
        # Resolver LigaId y Nombre de Equipo
        resolved_liga_id = ligaId
        if not resolved_liga_id and ligaNombre:
            liga_db = db.query(Ligas).filter(Ligas.Nombreliga == ligaNombre.strip()).first()
            if liga_db:
                resolved_liga_id = liga_db.LigaId

        if nombreEquipo:
            nuevo_equipo_temporal.NombreEquipo = nombreEquipo.strip().upper()
        if resolved_liga_id:
            nuevo_equipo_temporal.LigaId = resolved_liga_id

        # Crear automáticamente el equipo real
        if nuevo_equipo_temporal.NombreEquipo and nuevo_equipo_temporal.LigaId:
            equipo_existente = db.query(EquiposJugando).join(Equipos).filter(
                func.lower(Equipos.NombreEquipo) == func.lower(nuevo_equipo_temporal.NombreEquipo),
                EquiposJugando.LigaId == nuevo_equipo_temporal.LigaId
            ).first()
            if equipo_existente:
                raise HTTPException(status_code=400, detail="Ya existe un equipo con este nombre registrado en la misma liga")

            equipo_real = db.query(Equipos).filter(
                func.lower(Equipos.NombreEquipo) == func.lower(nuevo_equipo_temporal.NombreEquipo)
            ).first()
            if not equipo_real:
                equipo_real = Equipos(NombreEquipo=nuevo_equipo_temporal.NombreEquipo, Estatus=True)
                db.add(equipo_real)
                db.flush()
            
            eq_jugando = db.query(EquiposJugando).filter(
                EquiposJugando.EquipoId == equipo_real.EquipoId,
                EquiposJugando.LigaId == nuevo_equipo_temporal.LigaId
            ).first()
            if not eq_jugando:
                eq_jugando = EquiposJugando(
                    EquipoId=equipo_real.EquipoId,
                    LigaId=nuevo_equipo_temporal.LigaId,
                    PresidenteEquipoId=nuevo_presidente.PresidenteEquipoId,
                    CantidadJugadores=0
                )
                db.add(eq_jugando)
                db.flush()
            
            # Vincular el equipo temporal al real y cambiar el proceso a AMPLIACION (para el registro de jugadores)
            nuevo_equipo_temporal.EquipoId = equipo_real.EquipoId
            nuevo_equipo_temporal.TipoProcesoId = 2 # AMPLIACION
        
        # Upload voucher if present
        if voucher:
            from app.servicios.pagos_servicio import PagosServicio
            pagos_service = PagosServicio(db)
            await pagos_service.subir_comprobante(nueva_orden.OrdenPagoId, voucher)
            
        # Upload documents if present
        from app.servicios.documentos_servicio import subir_documento_servicio2
        doc_ids = []
        doc_files = []
        if actaNacimiento:
            doc_ids.append(8)
            doc_files.append(actaNacimiento)
        if identificacion:
            doc_ids.append(38)
            doc_files.append(identificacion)
        if fotografia:
            doc_ids.append(37)
            doc_files.append(fotografia)
        if formatoAfiliacion:
            doc_ids.append(10)
            doc_files.append(formatoAfiliacion)
            
        if doc_files:
            await subir_documento_servicio2(
                db=db,
                persona_id=nueva_persona.PersonaId,
                documento_afiliacion_ids=doc_ids,
                archivos=doc_files,
                solicitud_id=nueva_solicitud.SolicitudId
            )
            
        # Force validation status of documents to APROBADO (1)
        from app.modelos.documentos_entregados_modelo import DocumentosEntregados
        from app.enums.documentos_estatus_enum import DocumentoEstatus
        if doc_files:
            docs_entregados = db.query(DocumentosEntregados).filter(DocumentosEntregados.PersonaId == nueva_persona.PersonaId).all()
            for doc in docs_entregados:
                doc.EstadoValidacionId = int(DocumentoEstatus.ACEPTADO)
                doc.FechaValidacion = datetime.now()
                
        # Force EstatusId of PresidenteEquipo to 7 (Activo)
        presidente = db.query(PresidenteEquipo).filter(PresidenteEquipo.PersonaId == nueva_persona.PersonaId).first()
        if presidente:
            presidente.EstatusId = 7

        db.commit()
        
        return {
            "success": True,
            "mensaje": "Presidente creado correctamente",
            "presidente": {
                "usuario_id": nuevo_usuario.UsuarioId,
                "persona_id": nueva_persona.PersonaId,
                "presidente_equipo_id": nuevo_presidente.PresidenteEquipoId,
                "nombre": nueva_persona.Nombre,
                "correo": nuevo_usuario.Correo,
                "telefono": nueva_persona.NumeroTelefono,
                "jugadores_pagados": nuevo_equipo_temporal.CantidadJugadoresPagados
            }
        }
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error interno")


@router.get("/equipos-sin-entrenador")
def get_equipos_sin_entrenador(
    db: Session = Depends(get_db),
    usuario = Depends(obtener_usuario_actual)
):
    rol_id = getattr(usuario, 'RolId', None)
    if rol_id != 1:
        raise HTTPException(status_code=403, detail="Acceso denegado: Se requiere rol de Administrador")
    
    results = (
        db.query(EquiposJugando.EquiposJugandoId.label("EquipoId"), Equipos.NombreEquipo, Ligas.LigaId, Ligas.Nombreliga)
        .join(Equipos, Equipos.EquipoId == EquiposJugando.EquipoId)
        .join(Ligas, EquiposJugando.LigaId == Ligas.LigaId)
        .filter(Equipos.Estatus == True)
        .filter(EquiposJugando.EntrenadorEquipoId == None)
        .all()
    )
    
    return [
        {
            "EquipoId": r.EquipoId,
            "NombreEquipo": r.NombreEquipo,
            "LigaId": r.LigaId,
            "NombreLiga": r.Nombreliga
        }
        for r in results
    ]


@router.post("/registrar-entrenador-admin")
async def registrar_entrenador_admin(
    nombre: str = Form(...),
    primerApellido: Optional[str] = Form(None),
    segundoApellido: Optional[str] = Form(None),
    correo: str = Form(...),
    telefono: Optional[str] = Form(None),
    telefonoOpcional: Optional[str] = Form(None),
    curp: str = Form(...),
    rfc: Optional[str] = Form(None),
    sexoId: Optional[int] = Form(None),
    fechaNacimiento: Optional[str] = Form(None),
    contrasena: Optional[str] = Form(None),
    equipoId: int = Form(...),
    ligaId: int = Form(...),
    afiliacion: Optional[str] = Form(None),
    voucher: Optional[UploadFile] = File(None),
    actaNacimiento: Optional[UploadFile] = File(None),
    identificacion: Optional[UploadFile] = File(None),
    fotografia: Optional[UploadFile] = File(None),
    formatoAfiliacion: Optional[UploadFile] = File(None),
    borradorId: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    usuario = Depends(obtener_usuario_actual)
):
    rol_id = getattr(usuario, 'RolId', None)
    if rol_id != 1:
        raise HTTPException(status_code=403, detail="Acceso denegado: Se requiere rol de Administrador")
    
    try:
        # 1. Validar equipo
        eq_jugando = db.query(EquiposJugando).filter(EquiposJugando.EquiposJugandoId == equipoId).first()
        if not eq_jugando:
            raise HTTPException(status_code=404, detail="El equipo seleccionado no existe en el registro real de la liga.")
        if eq_jugando.EntrenadorEquipoId is not None:
            raise HTTPException(status_code=400, detail="El equipo seleccionado ya tiene un entrenador asignado.")
            
        # 2. Check CURP uniqueness
        if curp:
            curp_cleaned = curp.strip().upper()
            query_curp = db.query(Personas).filter(Personas.CURP == curp_cleaned)
            if borradorId:
                nuevo_directivo = db.query(PresidenteEquipo).filter(PresidenteEquipo.PresidenteEquipoId == borradorId).first()
                if nuevo_directivo:
                    query_curp = query_curp.filter(Personas.PersonaId != nuevo_directivo.PersonaId)
            existing_curp = query_curp.first()
            if existing_curp:
                raise HTTPException(status_code=400, detail="La CURP ingresada ya se encuentra registrada.")

        from app.core.telefono_utils import validar_y_normalizar_telefono
        telefono_normalizado = validar_y_normalizar_telefono(telefono) if telefono else None
        telefono_opcional_normalizado = validar_y_normalizar_telefono(telefonoOpcional) if telefonoOpcional else None

        from app.core.seguridad import generar_salt, generar_hash

        if borradorId:
            nuevo_directivo = db.query(PresidenteEquipo).filter(PresidenteEquipo.PresidenteEquipoId == borradorId).first()
            if not nuevo_directivo:
                raise HTTPException(status_code=404, detail="Borrador de entrenador no encontrado")
            
            nueva_persona = db.query(Personas).filter(Personas.PersonaId == nuevo_directivo.PersonaId).first()
            nuevo_usuario = db.query(Usuario).filter(Usuario.PersonaId == nuevo_directivo.PersonaId).first()

            usuario_existente = db.query(Usuario).filter(Usuario.Correo == correo, Usuario.PersonaId != nueva_persona.PersonaId, Usuario.Eliminado == False).first()
            if usuario_existente:
                raise HTTPException(status_code=400, detail="El correo ya está registrado.")

            # Update Persona
            nueva_persona.Nombre = nombre
            nueva_persona.PrimerApellido = primerApellido or ""
            nueva_persona.SegundoApellido = segundoApellido or None
            nueva_persona.CURP = curp
            nueva_persona.RFC = rfc.strip().upper() if rfc and rfc.strip() else None
            nueva_persona.NumeroTelefono = telefono_normalizado
            nueva_persona.NumeroTelefonoOpcional = telefono_opcional_normalizado
            nueva_persona.SexoId = sexoId if sexoId else None
            nueva_persona.FechaNacimiento = fechaNacimiento if fechaNacimiento else None

            if contrasena:
                password_to_use = contrasena
                salt = generar_salt()
                hash_pass = generar_hash(salt, password_to_use)
                nuevo_usuario.Contrasena = hash_pass
                nuevo_usuario.Salt = salt
            
            nuevo_usuario.Correo = correo
            nuevo_usuario.Estatus = True

            nuevo_directivo.EstatusId = 7 # ACTIVO
            nuevo_directivo.TipoDirectivoId = 2 # ENTRENADOR
            nuevo_directivo.Afiliacion = afiliacion
            nuevo_directivo.DatosBorrador = None # Clear draft data
        else:
            usuario_existente = db.query(Usuario).filter(Usuario.Correo == correo, Usuario.Eliminado == False).first()
            if usuario_existente:
                raise HTTPException(status_code=400, detail="El correo ya está registrado.")

            nueva_persona = Personas(
                Nombre=nombre,
                PrimerApellido=primerApellido or "",
                SegundoApellido=segundoApellido or "",
                CURP=curp,
                RFC=rfc.strip().upper() if rfc and rfc.strip() else None,
                NumeroTelefono=telefono_normalizado,
                NumeroTelefonoOpcional=telefono_opcional_normalizado,
                SexoId=sexoId if sexoId else None,
                FechaNacimiento=fechaNacimiento if fechaNacimiento else None,
            )
            db.add(nueva_persona)
            db.flush()

            password_to_use = contrasena if contrasena else "Hola1234?"
            salt = generar_salt()
            hash_pass = generar_hash(salt, password_to_use)

            nuevo_usuario = Usuario(
                PersonaId=nueva_persona.PersonaId,
                Correo=correo,
                Contrasena=hash_pass,
                Salt=salt,
                RolId=3, # Directivo
                Estatus=True
            )
            db.add(nuevo_usuario)
            db.flush()

            nuevo_directivo = PresidenteEquipo(
                PersonaId=nueva_persona.PersonaId,
                EstatusId=7, # Activo
                TipoDirectivoId=2, # ENTRENADOR
                Afiliacion=afiliacion
            )
            db.add(nuevo_directivo)
            db.flush()

        # Vincular al equipo en EquiposJugando
        eq_jugando.EntrenadorEquipoId = nuevo_directivo.PresidenteEquipoId

        # Crear Solicitud
        from app.modelos.solicitud_modelo import Solicitud
        nueva_solicitud = Solicitud(
            UsuarioId=nuevo_usuario.UsuarioId,
            TipoSolicitudId=1, # PRESIDENTE_EQUIPO
            EstatusValidacion=2, # ACEPTADO
            FechaSolicitud=datetime.now(),
            ObservacionesSolicitud="Registro directo por administrador (Entrenador)",
            Afiliacion=afiliacion,
            EquipoId=equipoId
        )
        db.add(nueva_solicitud)
        db.flush()

        # Calcular OrdenPago
        total = 0.0
        detalles = []

        if afiliacion:
            name_clean = afiliacion.strip().upper()
            seguro = db.query(Seguro).filter(func.upper(Seguro.Nombre) == name_clean).first()
            if seguro and seguro.Precio > 0:
                detalles.append({
                    "tipo_concepto": 1, # SEGURO
                    "tipo_afiliacion_id": None,
                    "seguro_id": seguro.SeguroId,
                    "cantidad": 1,
                    "precio": float(seguro.Precio),
                    "subtotal": float(seguro.Precio)
                })
                total = float(seguro.Precio)

        nueva_orden = OrdenPago(
            UsuarioId=nuevo_usuario.UsuarioId,
            EstatusPagoId=3, # Aprobado
            FechaEnvio=datetime.now(),
            FechaDePago=datetime.now(),
            TotalPagar=total,
            SolicitudId=nueva_solicitud.SolicitudId
        )
        db.add(nueva_orden)
        db.flush()

        for d in detalles:
            registro_detalle = OrdenPagoDetalle(
                OrdenPagoId=nueva_orden.OrdenPagoId,
                TipoConceptoId=d["tipo_concepto"],
                TipoAfiliacionId=d["tipo_afiliacion_id"],
                SeguroId=d["seguro_id"],
                Cantidad=d["cantidad"],
                PrecioUnitarioCobrado=d["precio"],
                Subtotal=d["subtotal"]
            )
            db.add(registro_detalle)
        db.flush()

        # Subir voucher si existe
        if voucher:
            from app.servicios.pagos_servicio import PagosServicio
            pagos_service = PagosServicio(db)
            await pagos_service.subir_comprobante(nueva_orden.OrdenPagoId, voucher)

        # Subir documentos
        from app.servicios.documentos_servicio import subir_documento_servicio2
        doc_ids = []
        doc_files = []
        if actaNacimiento:
            doc_ids.append(8)
            doc_files.append(actaNacimiento)
        if identificacion:
            doc_ids.append(38)
            doc_files.append(identificacion)
        if fotografia:
            doc_ids.append(37)
            doc_files.append(fotografia)
        if formatoAfiliacion:
            doc_ids.append(10)
            doc_files.append(formatoAfiliacion)

        if doc_files:
            await subir_documento_servicio2(
                db=db,
                persona_id=nueva_persona.PersonaId,
                documento_afiliacion_ids=doc_ids,
                archivos=doc_files,
                solicitud_id=nueva_solicitud.SolicitudId
            )

            # Forzar estatus de documentos a ACEPTADO (1)
            docs_entregados = db.query(DocumentosEntregados).filter(DocumentosEntregados.PersonaId == nueva_persona.PersonaId).all()
            for doc in docs_entregados:
                from app.enums.documentos_estatus_enum import DocumentoEstatus
                doc.EstadoValidacionId = int(DocumentoEstatus.ACEPTADO)
                doc.FechaValidacion = datetime.now()

        # Forzar estatus de PresidenteEquipo a activo (7)
        nuevo_directivo.EstatusId = 7

        db.commit()

        print(f"[COACH_REGISTRATION] Successfully registered coach user_id={nuevo_usuario.UsuarioId}, team_id={equipoId}, total_paid={total}")

        return {
            "success": True,
            "mensaje": "Entrenador creado y vinculado correctamente",
            "entrenador": {
                "usuario_id": nuevo_usuario.UsuarioId,
                "persona_id": nueva_persona.PersonaId,
                "presidente_equipo_id": nuevo_directivo.PresidenteEquipoId,
                "nombre": nueva_persona.Nombre,
                "correo": nuevo_usuario.Correo,
                "telefono": nueva_persona.NumeroTelefono
            }
        }
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        print(f"[COACH_REGISTRATION_ERROR] Error: {str(e)}")
        # print(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Error interno")


@router.post("/presidentes/{usuario_id}/enviar-link-registro-whatsapp", response_model=EnvioWhatsAppResponse)
async def enviar_link_registro_whatsapp(
    usuario_id: int,
    request: Request,
    telefono_destino: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    usuario = Depends(obtener_usuario_actual),
):
    rol_id = getattr(usuario, "RolId", None)
    if rol_id != 1:
        raise HTTPException(status_code=403, detail="Acceso denegado: Se requiere rol de Administrador")

    usuario_db = db.query(Usuario).filter(Usuario.UsuarioId == usuario_id).first()
    if not usuario_db:
        raise HTTPException(status_code=404, detail="No se encontró el usuario del presidente.")

    persona = db.query(Personas).filter(Personas.PersonaId == usuario_db.PersonaId).first()
    if not persona:
        raise HTTPException(status_code=404, detail="No se encontró la persona del presidente.")

    from app.core.telefono_utils import validar_y_normalizar_telefono

    if telefono_destino:
        telefono = validar_y_normalizar_telefono(telefono_destino)
    else:
        telefono = validar_y_normalizar_telefono(persona.NumeroTelefono)
    nombre_presidente = " ".join(
        part.strip()
        for part in [
            persona.Nombre or "",
            persona.PrimerApellido or "",
            persona.SegundoApellido or "",
        ]
        if part and part.strip()
    )

    origin = request.headers.get("origin")
    referer = request.headers.get("referer")

    frontend_base_url = None
    if origin:
        frontend_base_url = origin.rstrip("/")
    elif referer:
        referer_parts = urlsplit(referer)
        if referer_parts.scheme and referer_parts.netloc:
            frontend_base_url = f"{referer_parts.scheme}://{referer_parts.netloc}"

    if not frontend_base_url:
        raise HTTPException(
            status_code=500,
            detail="Ocurrió un error al generar el enlace", #detail="No se pudo determinar la URL base del frontend para construir la invitación.",
        )

    from app.modelos.presidente_invitacion_modelo import PresidenteInvitacion
    ahora = datetime.now()
    invitacion_activa = db.query(PresidenteInvitacion).filter(
        PresidenteInvitacion.UsuarioId == usuario_db.UsuarioId,
        PresidenteInvitacion.Activo == True,
        PresidenteInvitacion.FechaExpiracion > ahora,
        PresidenteInvitacion.TokenSecreto != None
    ).first()

    if invitacion_activa:
        token_identificador = invitacion_activa.TokenIdentificador
        token_secreto = invitacion_activa.TokenSecreto
        inv_id = str(invitacion_activa.PresidenteInvitacionId)
        accion_id = 4 # READ
    else:
        invitacion_data = crear_invitacion_presidente_repo(db, usuario_db.UsuarioId)
        token_identificador = invitacion_data['token_identificador']
        token_secreto = invitacion_data['token_secreto']
        inv_id = str(invitacion_data['invitacion'].PresidenteInvitacionId)
        accion_id = 1 # CREATE

    link_invitacion = f"{frontend_base_url}/i/{token_identificador}/{token_secreto}"

    whatsapp_service = WhatsAppService()
    resultado = whatsapp_service.enviar_link_registro(
        telefono=telefono,
        nombre_presidente=nombre_presidente,
        link_invitacion=link_invitacion,
        usuario_id=usuario_db.UsuarioId,
    )

    # Registrar el ID del mensaje enviado y su estado inicial
    if resultado.get("ok"):
        meta_resp = resultado.get("meta_response", {})
        messages = meta_resp.get("messages", [])
        if messages:
            wamid = messages[0].get("id")
            invitacion_db = db.query(PresidenteInvitacion).filter(
                PresidenteInvitacion.PresidenteInvitacionId == int(inv_id)
            ).first()
            if invitacion_db:
                invitacion_db.WhatsAppMessageId = wamid
                invitacion_db.WhatsAppStatus = "sent"
                db.flush()

    # Registrar auditoría
    from app.modelos.auditoria import Auditoria
    from app.core.auditoria.auditoria_servicio import obtener_nombre_usuario
    admin_id = getattr(usuario, "UsuarioId", 0)
    admin_nombre = obtener_nombre_usuario(db, admin_id)
    ip = request.client.host if request.client else None

    auditoria = Auditoria(
        EntidadAfectada="PresidenteInvitacion",
        RegistroId=inv_id,
        AccionId=accion_id,
        UsuarioId=admin_id,
        FechaAccion=datetime.now(),
        Ip=ip,
        ObservacionesAuditoria=f"Invitación reenviada por WhatsApp para usuario {usuario_db.UsuarioId}",
        UsuarioNombre=admin_nombre
    )
    db.add(auditoria)
    db.commit()

    return {
        "success": True,
        "mensaje": "Mensaje de WhatsApp enviado correctamente.",
        "whatsapp_status_code": resultado["status_code"],
        "meta_response": resultado["meta_response"],
    }


@router.post("/presidentes/{usuario_id}/invitacion/link")
async def obtener_link_invitacion(
    usuario_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario = Depends(obtener_usuario_actual),
):
    rol_id = getattr(usuario, "RolId", None)
    if rol_id != 1:
        raise HTTPException(status_code=403, detail="Acceso denegado: Se requiere rol de Administrador")

    usuario_db = db.query(Usuario).filter(Usuario.UsuarioId == usuario_id).first()
    if not usuario_db:
        raise HTTPException(status_code=404, detail="No se encontró el usuario del presidente.")

    origin = request.headers.get("origin")
    referer = request.headers.get("referer")

    frontend_base_url = None
    if origin:
        frontend_base_url = origin.rstrip("/")
    elif referer:
        referer_parts = urlsplit(referer)
        if referer_parts.scheme and referer_parts.netloc:
            frontend_base_url = f"{referer_parts.scheme}://{referer_parts.netloc}"

    if not frontend_base_url:
        raise HTTPException(
            status_code=500,
            detail="Ocurrió un error al generar el enlace",
        )

    from app.modelos.presidente_invitacion_modelo import PresidenteInvitacion
    ahora = datetime.now()
    invitacion_activa = db.query(PresidenteInvitacion).filter(
        PresidenteInvitacion.UsuarioId == usuario_db.UsuarioId,
        PresidenteInvitacion.Activo == True,
        PresidenteInvitacion.FechaExpiracion > ahora,
        PresidenteInvitacion.TokenSecreto != None
    ).first()

    if invitacion_activa:
        token_identificador = invitacion_activa.TokenIdentificador
        token_secreto = invitacion_activa.TokenSecreto
    else:
        invitacion_data = crear_invitacion_presidente_repo(db, usuario_db.UsuarioId)
        token_identificador = invitacion_data['token_identificador']
        token_secreto = invitacion_data['token_secreto']
        db.commit()

    link_invitacion = f"{frontend_base_url}/i/{token_identificador}/{token_secreto}"

    return {
        "success": True,
        "link_invitacion": link_invitacion
    }


@router.post("/presidentes/{usuario_id}/invitacion/regenerar")
async def regenerar_invitacion(
    usuario_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario = Depends(obtener_usuario_actual),
):
    rol_id = getattr(usuario, "RolId", None)
    if rol_id != 1:
        raise HTTPException(status_code=403, detail="Acceso denegado: Se requiere rol de Administrador")

    usuario_db = db.query(Usuario).filter(Usuario.UsuarioId == usuario_id).first()
    if not usuario_db:
        raise HTTPException(status_code=404, detail="No se encontró el usuario del presidente.")

    origin = request.headers.get("origin")
    referer = request.headers.get("referer")

    frontend_base_url = None
    if origin:
        frontend_base_url = origin.rstrip("/")
    elif referer:
        referer_parts = urlsplit(referer)
        if referer_parts.scheme and referer_parts.netloc:
            frontend_base_url = f"{referer_parts.scheme}://{referer_parts.netloc}"

    if not frontend_base_url:
        raise HTTPException(
            status_code=500,
            detail="Ocurrió un error al generar el enlace",
        )

    # Desactivar invitaciones anteriores y crear una nueva
    invitacion_data = crear_invitacion_presidente_repo(db, usuario_db.UsuarioId)
    token_identificador = invitacion_data['token_identificador']
    token_secreto = invitacion_data['token_secreto']
    inv_id = str(invitacion_data['invitacion'].PresidenteInvitacionId)

    link_invitacion = f"{frontend_base_url}/i/{token_identificador}/{token_secreto}"

    # Registrar auditoría
    from app.modelos.auditoria import Auditoria
    from app.core.auditoria.auditoria_servicio import obtener_nombre_usuario
    admin_id = getattr(usuario, "UsuarioId", 0)
    admin_nombre = obtener_nombre_usuario(db, admin_id)
    ip = request.client.host if request.client else None

    auditoria = Auditoria(
        EntidadAfectada="PresidenteInvitacion",
        RegistroId=inv_id,
        AccionId=1, # CREATE
        UsuarioId=admin_id,
        FechaAccion=datetime.now(),
        Ip=ip,
        ObservacionesAuditoria=f"Invitación regenerada para usuario {usuario_db.UsuarioId}",
        UsuarioNombre=admin_nombre
    )
    db.add(auditoria)
    db.commit()

    return {
        "success": True,
        "link_invitacion": link_invitacion
    }
