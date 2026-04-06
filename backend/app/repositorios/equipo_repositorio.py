from app.modelos.equipo_temporal_modelo import EquipoTemporal
from app.modelos.equipo_temporal_jugador_modelo import EquipoTemporalJugador
from app.modelos.orden_pago_detalle_modelo import OrdenPagoDetalle

def crear_equipo_temporal_repo(db, orden, solicitud_id):
    #obtener cantidad de jugadores pagados
    detalles = db.query(OrdenPagoDetalle).filter(OrdenPagoDetalle.OrdenPagoId == orden.OrdenPagoId).all()
    existe = db.query(EquipoTemporal).filter(
        EquipoTemporal.OrdenPagoId == orden.OrdenPagoId
    ).first()

    if existe:
        return existe
    
    cantidad_jugadores = 0

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


#Registro de jugadores
def obtener_solicitud_id(db, equipo_temporal_id):
    equipo = db.query(EquipoTemporal).filter(
        EquipoTemporal.EquipoTemporalId == equipo_temporal_id
    ).first()

    return equipo.SolicitudId


def obtener_cantidad_slots(db, equipo_temporal_id):
    slots = db.query(EquipoTemporalJugador).filter(
        EquipoTemporalJugador.EquipoTemporalId == equipo_temporal_id
    ).all()
    return slots

def actualizar_slot_repo(db, slot, persona_id):

    slot.PersonaId = persona_id
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
    ).filter(
        Equipos.Estatus == True
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
        MiembrosEquipo.Estatus == True,
        MiembrosEquipo.Eliminado == False
    ).all()

    jugadores_response = []
    for (miembro, persona, equipo_nombre, liga, sexo_nombre) in resultados:
        # El rol del jugador debería de ser algo que identifique que es jugador, pero asumimos todos por ahora
        jugadores_response.append({
            "MiembroEquipoId": miembro.MiembroEquipoId,
            "NombreCompleto": f"{persona.Nombre} {persona.PrimerApellido} {persona.SegundoApellido or ''}".strip(),
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