from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from app.modelos import Solicitud, Usuario, CatalogoTiposAfiliacion, CatalogoEstadosValidacion, Personas, DocumentoAfiliacion, CatalogoDocumentos, CatalogoRolesPersonas
from app.modelos import CatalogoDocumentosPersonas, DocumentosEntregados
from app.enums.estados_validacion_enum import EstatusValidacionSolicitud
from app.modelos.equipo_temporal_modelo import EquipoTemporal
from app.modelos.equipo_temporal_jugador_modelo import EquipoTemporalJugador
from fastapi import HTTPException
from app.modelos import (
    CatalogoDocumentosPersonas, DocumentosEntregados, EquipoTemporal, 
    OrdenPago, Equipos, PresidenteEquipo
)

#REQUISITOS
def crear_requisito_repo(db: Session, tipo_afiliacion_id: int, documento_persona_id: int):
    nuevo = DocumentoAfiliacion(TipoAfiliacionId=tipo_afiliacion_id, DocumentoPersonaId=documento_persona_id)

    db.add(nuevo)
    return nuevo

def obtener_por_tipo_afiliacion(db: Session, tipo_afiliacion_id: int):
    return db.query(DocumentoAfiliacion).filter(DocumentoAfiliacion.TipoAfiliacionId == tipo_afiliacion_id).all()

def ver_requisitos_afiliacion_repo(db: Session, tipo_afiliacion_id: int):

    requisitos = (
        db.query(
            DocumentoAfiliacion.DocumentoAfiliacionId,
            CatalogoDocumentos.NombreDocumento,
            CatalogoRolesPersonas.Nombre
        )
        .join(
            CatalogoDocumentosPersonas,
            CatalogoDocumentosPersonas.DocumentosPersonasId
            == DocumentoAfiliacion.DocumentoPersonaId
        )
        .join(
            CatalogoDocumentos,
            CatalogoDocumentos.DocumentoId
            == CatalogoDocumentosPersonas.DocumentoId
        )
        .join(
            CatalogoRolesPersonas,
            CatalogoRolesPersonas.RolPersonaId
            == CatalogoDocumentosPersonas.RolPersonaId
        )
        .filter(DocumentoAfiliacion.TipoAfiliacionId == tipo_afiliacion_id)
        .all()
    )

    resultado = []

    for r in requisitos:
        resultado.append({
            "documento_afiliacion_id": r.DocumentoAfiliacionId,
            "documento": r.NombreDocumento,
            "rol": r.Nombre
        })

    return resultado

#SOLICITUDES
#CREAR SOLICITUD (NO ENVIAR)
def crear_solicitud_repo(db, usuario_id, estatus_validacion_id, tipo_afiliacion_id):

    nueva = Solicitud(
        UsuarioId = usuario_id,
        EstatusValidacion = estatus_validacion_id,
        TipoAfiliacionId = tipo_afiliacion_id
    )
    
    db.add(nueva)
    db.flush()

    return nueva

def crear_solicitud_repos(db: Session, solicitud: Solicitud, usuario: Usuario, persona: Personas):
    try:
        db.add(solicitud)

        usuariosolicitud = db.query(Usuario).filter(Usuario.UsuarioId == solicitud.UsuarioId).first()
        
        persona.CURP = usuariosolicitud.CURP
        persona.RFC = usuariosolicitud.RFC
        persona.SexoId = usuariosolicitud.SexoId
        persona.FechaNacimiento = usuariosolicitud.FechaNacimiento

        db.commit()
        db.refresh(solicitud)
        return solicitud
    except IntegrityError as e:
        db.rollback()
        if "check_curp_persona_longitud" in str(e):
            raise HTTPException(
                status_code=400,
                detail="La CURP proporcionado no tiene el formato correcto. Debe tener exactamente 18 caracteres alfanuméricos."
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Error al procesar la solicitud: {str(e)}"
            )
    except Exception as e:
        db.rollback()
        raise e


#DOCUMENTOS
def crear_documento_solicitud_repo(db, solicitud_id, persona_id, documento_afiliacion_id, ruta_archivo):
    
    documento = DocumentosEntregados(
        SolicitudId = solicitud_id,
        PersonaId = persona_id,
        DocumentoAfiliacionId = documento_afiliacion_id,
        RutaArchivo = ruta_archivo
    )
    
    db.add(documento)
    
    return documento


#OBTENER SOLICITUDES
#Todas

def obtener_solicitudes_usuarios_repo(db: Session):
    return (
        db.query(
            Solicitud.SolicitudId,
            Solicitud.FechaSolicitud,
            Solicitud.EstatusValidacion,
            Personas.Nombre,
            Personas.PrimerApellido,
            Usuario.Correo,
            Equipos.NombreEquipo.label("Equipo"),
            OrdenPago.TotalPagar.label("Monto")
        )
        .join(Usuario, Solicitud.UsuarioId == Usuario.UsuarioId)
        .join(Personas, Usuario.PersonaId == Personas.PersonaId)
        .outerjoin(EquipoTemporal, Solicitud.SolicitudId == EquipoTemporal.SolicitudId)
        .outerjoin(OrdenPago, EquipoTemporal.OrdenPagoId == OrdenPago.OrdenPagoId)
        .outerjoin(PresidenteEquipo, Personas.PersonaId == PresidenteEquipo.PersonaId)
        .outerjoin(Equipos, PresidenteEquipo.PresidenteEquipoId == Equipos.PresidenteEquipoId)
        .all()
    )

def obtener_solicitudes_repo(db: Session):

    solicitudes = db.query(Solicitud).options(
        joinedload(Solicitud.UsuarioRelacion),
        joinedload(Solicitud.TipoAfiliacionRelacion)
    ).filter(
        Solicitud.EstatusValidacionId != EstatusValidacionSolicitud.BORRADOR
    ).all()

    return solicitudes

def obtener_solicitud_detalle_repo(db:Session, solicitud_id: int):
    solicitud = db.query(Solicitud).filter(
        Solicitud.SolicitudId == solicitud_id
    ).first()

    if not solicitud:
        return None
    
    #Usuario que hizo la solicitud
    usuario = db.query(Usuario).filter(
        Usuario.UsuarioId == solicitud.UsuarioId
    ).first()

    persona = db.query(Personas).filter(
        Personas.PersonaId == usuario.PersonaId
    ).first()

    equipo = db.query(EquipoTemporal).filter(
        EquipoTemporal.SolicitudId == solicitud_id
    ).first()

    slots = db.query(EquipoTemporalJugador).filter(
        EquipoTemporalJugador.EquipoTemporalId == equipo.EquipoTemporalId
    ).all()

    jugadores = []

    for slot in slots:

        if not slot.PersonaId:
            continue

        jugador = db.query(Personas).filter(
            Personas.PersonaId == slot.PersonaId
        ).first()

        documentos = db.query(DocumentosEntregados).filter(
            DocumentosEntregados.PersonaId == jugador.PersonaId,
            DocumentosEntregados.SolicitudId == solicitud_id
        ).all()

        jugadores.append({
            "persona_id": jugador.PersonaId,
            "nombre": jugador.Nombre,
            "primer_apellido": jugador.PrimerApellido,
            "segundo_apellido": jugador.SegundoApellido,
            "curp": jugador.CURP,
            "sexo_id": jugador.SexoId,
            "fecha_nacimiento": jugador.FechaNacimiento,
            "seguro_id": slot.SeguroId,  # importante
            "documentos": [
                {
                    "documento_id": d.DocumentoAfiliacionId,
                    "ruta": d.RutaArchivo,
                    "fecha": d.FechaEntrega,
                    "estatus": d.EstadoValidacionId
                }
                for d in documentos
            ]
        })

    #Documentos del presidente
    docs_presidente = db.query(DocumentosEntregados).filter(
        DocumentosEntregados.PersonaId == persona.PersonaId,
        DocumentosEntregados.SolicitudId == solicitud_id
    ).all()


    return {
        "Nombre": persona.Nombre if persona else "",
        "PrimerApellido": persona.PrimerApellido if persona else "",
        "SegundoApellido": persona.SegundoApellido if persona else "",
        "CURP": persona.CURP if persona else "",
        "RFC": persona.RFC if persona else "",
        "Sexo": sexo.Nombre if sexo else "",
        "FechaNacimiento": persona.FechaNacimiento if persona else None,
        "Email": usuario.Correo,
        "FechaSolicitud": SolicitudUsuario.FechaSolicitud,
        "EstatusSolicitud": estatus.Nombre if estatus else "",
        "TipoSolicitud": tipoSolicitud.NombreAfiliacion if tipoSolicitud else "",
        "SolicitudId": SolicitudUsuario.SolicitudId
    }

    db.commit()
    db.refresh(solicitud)
    db.refresh(equipo_temporal)

    return solicitud

# --- NUEVOS MÉTODOS PARA VALIDACIÓN (ADMIN) ---

def obtener_personas_con_documentos_repo(db: Session, solicitud_id: int):
    """
    Obtiene todas las personas asociadas a una solicitud 
    (solicitante/presidente y jugadores temporales) junto con sus documentos.
    """
    solicitud = db.query(Solicitud).filter(Solicitud.SolicitudId == solicitud_id).first()
    if not solicitud:
        return None
    
    # Base URL para archivos estáticos (Ajustar si el puerto cambia)
    BASE_URL = "http://localhost:8000"
    
    # 1. Obtener el solicitante (Presidente)
    usuario_solicitante = db.query(Usuario).filter(Usuario.UsuarioId == solicitud.UsuarioId).first()
    persona_solicitante = usuario_solicitante.PersonaRelacion if usuario_solicitante else None
    
    # 2. Obtener jugadores temporales
    equipo_temp = db.query(EquipoTemporal).filter(EquipoTemporal.SolicitudId == solicitud_id).first()
    jugadores_ids = []
    if equipo_temp:
        jugadores_ids = [j.PersonaId for j in equipo_temp.EquipoTemporalJugadorRelacion if j.PersonaId]

    # Lista consolidada de personas a revisar documentos
    personas_a_revisar = []
    if persona_solicitante:
        personas_a_revisar.append(persona_solicitante)
    
    if jugadores_ids:
        jugadores = db.query(Personas).filter(Personas.PersonaId.in_(jugadores_ids)).all()
        personas_a_revisar.extend(jugadores)

    resultado = []
    for p in personas_a_revisar:
        documentos = db.query(
            DocumentosEntregados, DocumentoAfiliacion, CatalogoDocumentosPersonas, CatalogoDocumentos
        ).join(
            DocumentoAfiliacion, DocumentosEntregados.DocumentoAfiliacionId == DocumentoAfiliacion.DocumentoAfiliacionId
        ).join(
            CatalogoDocumentosPersonas, DocumentoAfiliacion.DocumentoPersonaId == CatalogoDocumentosPersonas.DocumentosPersonasId
        ).join(
            CatalogoDocumentos, CatalogoDocumentosPersonas.DocumentoId == CatalogoDocumentos.DocumentoId
        ).filter(
            DocumentosEntregados.SolicitudId == solicitud_id,
            DocumentosEntregados.PersonaId == p.PersonaId
        ).all()

        docs_list = []
        for d, da, cdp, cd in documentos:
            # Construir URL absoluta
            nombre_archivo = d.RutaArchivo.replace("\\", "/").split("/")[-1]
            docs_list.append({
                "Tipo": cd.NombreDocumento,
                "Url": f"{BASE_URL}/uploads/documentos/{nombre_archivo}",
                "Estado": "entregado"
            })
            
        resultado.append({
            "Id": p.PersonaId,
            "Nombre": f"{p.Nombre} {p.PrimerApellido} {p.SegundoApellido or ''}".strip(),
            "CURP": p.CURP,
            "Documentos": docs_list
        })
        
    return {
        "Equipo": f"{persona_solicitante.Nombre} {persona_solicitante.PrimerApellido}" if persona_solicitante else "SOLICITANTE DESCONOCIDO",
        "SolicitudId": solicitud_id,
        "Jugadores": resultado
    }

def actualizar_validacion_solicitud_repo(db: Session, solicitud_id: int, estatus_db: int, observaciones: str = None):
    solicitud = db.query(Solicitud).filter(Solicitud.SolicitudId == solicitud_id).first()
    if solicitud:
        solicitud.EstatusValidacion = estatus_db
        if observaciones:
            solicitud.ObservacionesSolicitud = observaciones
        return solicitud
    return None

def activar_presidente_solicitud_repo(db: Session, solicitud_id: int):
    """
    Busca al presidente vinculado a la solicitud y activa su cuenta.
    EstatusId 7 = ACTIVO.
    """
    solicitud = db.query(Solicitud).filter(Solicitud.SolicitudId == solicitud_id).first()
    if not solicitud:
        return False
        
    usuario = db.query(Usuario).filter(Usuario.UsuarioId == solicitud.UsuarioId).first()
    if not usuario or not usuario.PersonaId:
        return False
        
    presidente = db.query(PresidenteEquipo).filter(PresidenteEquipo.PersonaId == usuario.PersonaId).first()
    if presidente:
        presidente.EstatusId = 7 # ACTIVO
        return True
    return False

