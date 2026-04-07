from app.modelos.equipo_temporal_modelo import EquipoTemporal
from app.modelos.equipo_temporal_jugador_modelo import EquipoTemporalJugador
from app.modelos.orden_pago_detalle_modelo import OrdenPagoDetalle
from app.modelos.persona_modelo import Personas
from sqlalchemy.orm import joinedload

def obtener_equipos_temporales_por_usuario_repo(db, usuario_id):
    return db.query(EquipoTemporal).filter(
        EquipoTemporal.UsuarioId == usuario_id
    ).all()

def crear_equipo_temporal_repo(db, orden, solicitud_id):
    #obtener cantidad de jugadores pagados
    detalles = db.query(OrdenPagoDetalle).filter(OrdenPagoDetalle.OrdenPagoId == orden.OrdenPagoId).all()
    existe = db.query(EquipoTemporal).filter(
        EquipoTemporal.OrdenPagoId == orden.OrdenPagoId
    ).first()

    if existe:
        return existe
    
    cantidad_jugadores = 0
    cantidad_seguros = 0


    for d in detalles:
        print("detalle:", d.TipoConceptoId, d.TipoAfiliacionId, d.Cantidad)
        if d.TipoConceptoId == 1:   #INSCRIPCION
            if d.TipoAfiliacionId == 4: #JUGADOR MAYOR
                cantidad_jugadores = d.Cantidad


    # crear equipo temporal        
    equipo = EquipoTemporal(
        UsuarioId=orden.UsuarioId,
        SolicitudId=solicitud_id,
        OrdenPagoId=orden.OrdenPagoId,
        Activo=True,
        CantidadJugadoresPagados=cantidad_jugadores,
        TipoProcesoId=1 #REGISTRO INICIAL
    )

    db.add(equipo)
    db.flush()

    #creación de slots
    for i in range(cantidad_jugadores):
        slot = EquipoTemporalJugador(
            EquipoTemporalId = equipo.EquipoTemporalId,
            Completo=False
        )
        db.add(slot)

    return equipo

def obtener_equipo_temporal(db, equipo_temporal_id):
    return db.query(EquipoTemporal).filter(
        EquipoTemporal.EquipoTemporalId == equipo_temporal_id
    ).first()

def obtener_seguros_pagados(db, orden_pago_id):
    detalles = db.query(OrdenPagoDetalle).filter(OrdenPagoDetalle.OrdenPagoId == orden_pago_id, OrdenPagoDetalle.SeguroId != None).all()
    
    seguros = {}

    for d in detalles:
        if d.SeguroId not in seguros:
            seguros[d.SeguroId] = 0
        seguros[d.SeguroId] += d.Cantidad

    return seguros

#número de seguros ocupados en los slots
def contar_seguros_usados(slots):
    usados = {}

    for slot in slots:
        if slot.SeguroId:
            usados[slot.SeguroId] = usados.get(slot.SeguroId, 0) + 1

    return usados



#Registro de jugadores
def obtener_solicitud_id(db, equipo_temporal_id):
    equipo = db.query(EquipoTemporal).filter(
        EquipoTemporal.EquipoTemporalId == equipo_temporal_id
    ).first()

    return equipo.SolicitudId


#total de slots
def obtener_cantidad_slots(db, equipo_temporal_id):
    slots = db.query(EquipoTemporalJugador).filter(
        EquipoTemporalJugador.EquipoTemporalId == equipo_temporal_id
    ).all()
    return slots

def obtener_slots_con_persona(db, equipo_temporal_id):

    slots = db.query(EquipoTemporalJugador).options(joinedload(EquipoTemporalJugador.PersonaRelacion)).filter(
        EquipoTemporalJugador.EquipoTemporalId == equipo_temporal_id).all()

    return slots


def existe_persona_repo(db, curp):
    persona = db.query(Personas).filter(Personas.CURP == curp).first()
    if persona:
        return True
    
    return False


#Agregar jugador a un slot
def actualizar_slot_repo(db, slot, persona_id, seguro_id):

    slot.PersonaId = persona_id
    slot.SeguroId = seguro_id
    slot.Completo = True

    return slot

# --- ENDPOINTS DE DIRECTORIO PARA ADMIN ---

def obtener_directorio_equipos_repo(db):
    from app.modelos.equipo_modelo import Equipos
    from app.modelos.liga_modelo import LigaModalidadCategoriaRama
    from app.modelos.catalogos_liga_modelo import Ligas, CatalogoCategorias, CatalogoModalidad, CatalogoRamas
    from app.modelos.presidente_equipo_modelo import PresidenteEquipo
    from app.modelos.persona_modelo import Personas
    from app.modelos.usuario_modelo import Usuario

    resultados = db.query(
        Equipos, Ligas.Nombreliga, CatalogoCategorias.NombreCategoria,
        CatalogoModalidad.NombreModalidad, CatalogoRamas.Nombre,
        Personas.Nombre, Personas.PrimerApellido, Usuario.Correo
    ).join(
        LigaModalidadCategoriaRama, Equipos.LigaModalidadCategoriaRamaId == LigaModalidadCategoriaRama.LigaModalidadCategoriaRamaId
    ).join(
        Ligas, LigaModalidadCategoriaRama.LigaId == Ligas.LigaId
    ).join(
        CatalogoCategorias, LigaModalidadCategoriaRama.CategoriaId == CatalogoCategorias.CategoriaId
    ).join(
        CatalogoModalidad, LigaModalidadCategoriaRama.ModalidadId == CatalogoModalidad.ModalidadId
    ).join(
        CatalogoRamas, LigaModalidadCategoriaRama.RamaId == CatalogoRamas.RamaId
    ).join(
        PresidenteEquipo, Equipos.PresidenteEquipoId == PresidenteEquipo.PresidenteEquipoId
    ).join(
        Personas, PresidenteEquipo.PersonaId == Personas.PersonaId
    ).join(
        Usuario, Personas.PersonaId == Usuario.PersonaId
    ).all()

    equipos_response = []
    for (equipo, liga, categoria, modalidad, rama, p_nombre, p_apellido, email) in resultados:
        equipos_response.append({
            "EquipoId": equipo.EquipoId,
            "NombreEquipo": equipo.NombreEquipo,
            "Liga": liga,
            "Categoria": categoria,
            "Modalidad": modalidad,
            "Rama": rama,
            "PresidenteNombreCompleto": f"{p_nombre} {p_apellido}",
            "PresidenteEmail": email,
            "NumeroJugadoresRegistrados": equipo.NumeroJugadores,
            "FechaCreacion": equipo.FechaCreacion,
            "Estatus": equipo.Estatus
        })

    return equipos_response

def obtener_directorio_jugadores_repo(db):
    from app.modelos.miembro_equipo_modelo import MiembrosEquipo
    from app.modelos.persona_modelo import Personas
    from app.modelos.equipo_modelo import Equipos
    from app.modelos.liga_modelo import LigaModalidadCategoriaRama
    from app.modelos.catalogos_liga_modelo import Ligas
    from app.modelos.sexo_c_modelo import CatalogoSexo

    resultados = db.query(
        MiembrosEquipo, Personas, Equipos.NombreEquipo, Ligas.Nombreliga, CatalogoSexo.Nombre
    ).join(
        Personas, MiembrosEquipo.PersonaId == Personas.PersonaId
    ).join(
        Equipos, MiembrosEquipo.EquipoID == Equipos.EquipoId
    ).join(
        LigaModalidadCategoriaRama, Equipos.LigaModalidadCategoriaRamaId == LigaModalidadCategoriaRama.LigaModalidadCategoriaRamaId
    ).join(
        Ligas, LigaModalidadCategoriaRama.LigaId == Ligas.LigaId
    ).outerjoin(
        CatalogoSexo, Personas.SexoId == CatalogoSexo.SexoId
    ).filter(
        MiembrosEquipo.Eliminado == False
    ).all()

    jugadores_response = []
    for (miembro, persona, equipo_nombre, liga, sexo_nombre) in resultados:
        # El rol del jugador debería de ser algo que identifique que es jugador, pero asumimos todos por ahora
        jugadores_response.append({
            "MiembroEquipoId": miembro.MiembroEquipoId,
            "NombreCompleto": f"{persona.Nombre} {persona.PrimerApellido} {persona.SegundoApellido or ''}".strip(),
            "Nombre": persona.Nombre,
            "PrimerApellido": persona.PrimerApellido,
            "SegundoApellido": persona.SegundoApellido,
            "CURP": persona.CURP or "N/A",
            "Sexo": sexo_nombre or "N/A",
            "EquipoNombre": equipo_nombre,
            "Liga": liga,
            "FechaIngreso": miembro.FechaIngreso,
            "Estatus": miembro.Estatus
        })

    return jugadores_response

def obtener_documentos_jugador_repo(db, persona_id: int):
    from app.modelos.documentos_entregados_modelo import DocumentosEntregados
    docs = db.query(DocumentosEntregados).filter(
        DocumentosEntregados.PersonaId == persona_id
    ).all()
    
    return [
        {
            "DocumentosSolicitudId": d.DocumentosSolicitudId,
            "RutaArchivo": d.RutaArchivo,
            "FechaEntrega": d.FechaEntrega,
            "EstadoValidacionId": d.EstadoValidacionId
        } for d in docs
    ]

def actualizar_equipo_repo(db, equipo_id: int, nombre: str, estatus: bool):
    from app.modelos.equipo_modelo import Equipos
    equipo = db.query(Equipos).filter(Equipos.EquipoId == equipo_id).first()
    if not equipo:
        return None
    
    if nombre is not None:
        equipo.NombreEquipo = nombre
    if estatus is not None:
        equipo.Estatus = estatus
        
    db.commit()
    db.refresh(equipo)
    return equipo

def actualizar_jugador_repo(db, miembro_equipo_id: int, nombre: str, primer_apellido: str, segundo_apellido: str, curp: str, estatus: bool):
    from app.modelos.miembro_equipo_modelo import MiembrosEquipo
    from app.modelos.persona_modelo import Personas
    
    miembro = db.query(MiembrosEquipo).filter(MiembrosEquipo.MiembroEquipoId == miembro_equipo_id).first()
    if not miembro:
        return None
    
    persona = db.query(Personas).filter(Personas.PersonaId == miembro.PersonaId).first()
    if not persona:
        return None
    
    if nombre is not None:
        persona.Nombre = nombre
    if primer_apellido is not None:
        persona.PrimerApellido = primer_apellido
    if segundo_apellido is not None:
        persona.SegundoApellido = segundo_apellido
    if curp is not None:
        persona.CURP = curp
        
    if estatus is not None:
        miembro.Estatus = estatus
        
    db.commit()
    db.refresh(persona)
    db.refresh(miembro)
    return miembro