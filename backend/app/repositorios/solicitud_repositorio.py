from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from app.modelos import Solicitud, Usuario, CatalogoTiposAfiliacion, CatalogoEstadosValidacion, Personas, DocumentoAfiliacion, CatalogoDocumentos, CatalogoRolesPersonas
from app.modelos import CatalogoDocumentosPersonas, DocumentosEntregados
from app.enums.estados_validacion_enum import EstatusValidacionSolicitud
from app.modelos.equipo_temporal_modelo import EquipoTemporal
from app.modelos.equipo_temporal_jugador_modelo import EquipoTemporalJugador
from fastapi import HTTPException

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
    db.add(solicitud)

    usuariosolicitud = db.query(Usuario).filter(Usuario.UsuarioId == solicitud.UsuarioId).first()
    
    persona.CURP = usuariosolicitud.CURP
    persona.RFC = usuariosolicitud.RFC
    persona.SexoId = usuariosolicitud.SexoId
    persona.FechaNacimiento = usuariosolicitud.FechaNacimiento

    db.commit()
    db.refresh(solicitud)
    return solicitud


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
        "solicitud": {
            "id": solicitud.SolicitudId,
            "fecha": solicitud.FechaSolicitud,
            "estatus": solicitud.EstatusValidacion,
            "tipo_afiliacion": solicitud.TipoAfiliacionId
        },
        "usuario": {
            "correo": usuario.Correo,
            "rol_id": usuario.RolId
        },
        "persona": {
            "persona_id": persona.PersonaId,
            "nombre": persona.Nombre,
            "primer_apellido": persona.PrimerApellido,
            "segundo_apellido": persona.SegundoApellido,
            "curp": persona.CURP,
            "sexo_id": persona.SexoId,
            "fecha_nacimiento": persona.FechaNacimiento
        },
        "equipo": {
            "equipo_temporal_id": equipo.EquipoTemporalId,
            "cantidad_jugadores": equipo.CantidadJugadoresPagados,
            "orden_pago_id": equipo.OrdenPagoId,
            "tipo_proceso_id": equipo.TipoProcesoId
        },
        "presidente_documentos": [
            {
                "documento_id": d.DocumentoAfiliacionId,
                "ruta": d.RutaArchivo,
                "fecha": d.FechaEntrega,
                "estatus": d.EstadoValidacionId
            }
            for d in docs_presidente
        ],
        "jugadores": jugadores
    }

def obtener_solicitud_por_id(db: Session, solicitud_id: int):
    solicitud = db.query(Solicitud).filter(Solicitud.SolicitudId == solicitud_id).first()

    if not solicitud:
        return None

    return solicitud

def enviar_solicitud_completa_repo(db: Session, solicitud_id: int):
    solicitud = db.query(Solicitud).filter(Solicitud.SolicitudId == solicitud_id).first()

    if not solicitud:
        return None

    solicitud.EstatusValidacion = EstatusValidacionSolicitud.ESPERA
    solicitud.FechaSolicitud = datetime.now()

    equipo_temporal = db.query(EquipoTemporal).filter(EquipoTemporal.SolicitudId == solicitud_id).first()
    if not equipo_temporal:
        raise HTTPException(400, "No se puede enviar la solicitud, no hay un equipo asociado")


    #verificar que los slots estén completos
    slots = db.query(EquipoTemporalJugador).filter(EquipoTemporalJugador.EquipoTemporalId == equipo_temporal.EquipoTemporalId).all()
    for slot in slots:
        if not slot.Completo:
            raise HTTPException(400, "No se puede enviar la solicitud, hay jugadores sin registrar en el equipo temporal")
    

    #Validación de seguros
    #seguros_pagados = obtener_seguros_pagados(db, equipo_temporal.OrdenPagoId)
    #seguros_usados = contar_seguros_usados(slots)

    #for seguro_id, total in seguros_pagados.items():
     #   usados = seguros_usados.get(seguro_id, 0)

    #if usados != total:
     #   raise HTTPException(400, f"Faltan asignar seguros (Seguro {seguro_id})")


    #documentos del presidente y jugadores
    personas = set([slot.PersonaId for slot in slots])

    for persona_id in personas:
        docs = db.query(DocumentosEntregados).filter(
            DocumentosEntregados.PersonaId == persona_id,
            DocumentosEntregados.SolicitudId == solicitud_id
        ).all()

    if not docs:
        raise HTTPException(400, f"Faltan documentos para persona {persona_id}")

    db.commit()
    db.refresh(solicitud)
    db.refresh(equipo_temporal)

    return solicitud

