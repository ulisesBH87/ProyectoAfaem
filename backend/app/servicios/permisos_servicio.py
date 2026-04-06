from sqlalchemy.orm import Session
from app.modelos.menus_modelo import Menus
from app.modelos.rel_usuario_roles_modelo import RelUsuarioRoles
from app.modelos.rel_menu_roles_modelo import RelMenuRoles
from app.modelos.rel_rol_permisos_modelo import RelRolPermisos
from app.modelos.usuario_modelo import Usuario
from app.modelos.roles_modelo import Roles
from app.modelos.solicitud_modelo import Solicitud
from app.modelos.documentos_entregados_modelo import DocumentosEntregados

def obtener_acceso_usuario_servicio(db: Session, usuario_id: int):
    # 1. Obtener Roles asignados (Relación RBAC)
    roles_rels = db.query(RelUsuarioRoles).filter(RelUsuarioRoles.UsuarioId == usuario_id, RelUsuarioRoles.Estatus == True).all()
    
    # 2. También obtener el RolId primario del usuario (Legacy support / Basic role)
    usuario_base = db.query(Usuario).filter(Usuario.UsuarioId == usuario_id).first()
    
    roles_ids = [r.RolId for r in roles_rels]
    roles_nombres = [r.RolRelacion.Nombre for r in roles_rels]
    
    if usuario_base and usuario_base.RolId not in roles_ids:
        roles_ids.append(usuario_base.RolId)
        if usuario_base.RolRelacion:
            roles_nombres.append(usuario_base.RolRelacion.Nombre)

    # 3. Obtener EstatusId
    estatus_id = 0
    es_presidente = "PRESIDENTE_EQUIPO" in [r.upper() for r in roles_nombres]
    
    # Prioridad 1: Presidente (usar tabla real de estatus)
    if es_presidente and usuario_base and usuario_base.PersonaId:
        from app.modelos.presidente_equipo_modelo import PresidenteEquipo
        presidente = db.query(PresidenteEquipo).filter(PresidenteEquipo.PersonaId == usuario_base.PersonaId).first()
        if presidente:
            estatus_id = presidente.EstatusId

    # Prioridad 2: Fallback (Legacy)
    if estatus_id == 0:
        solicitud = db.query(Solicitud).filter(Solicitud.UsuarioId == usuario_id).order_by(Solicitud.SolicitudId.desc()).first()
        
        if solicitud:
            estatus_id = solicitud.EstatusValidacion
        else:
            if usuario_base:
                docs_count = db.query(DocumentosEntregados).filter(DocumentosEntregados.PersonaId == usuario_base.PersonaId).count()
            else:
                docs_count = 0
                
            if docs_count > 0:
                estatus_id = usuario_base.RolId if (usuario_base and usuario_base.RolId) else 3
            else:
                estatus_id = 0

    if not roles_ids:
        return {"Roles": [], "Permisos": [], "Menus": [], "estatusId": estatus_id}

    # 4. Obtener Permisos asociados a esos roles
    permisos_rels = db.query(RelRolPermisos).filter(RelRolPermisos.RolId.in_(roles_ids)).all()
    permisos_slugs = list(set([p.PermisoRelacion.Slug for p in permisos_rels]))

    # 5. Obtener Menús asociados a esos roles
    menu_rels = db.query(RelMenuRoles).filter(RelMenuRoles.RolId.in_(roles_ids), RelMenuRoles.Estatus == True).all()
    allowed_menu_ids = list(set([m.MenuId for m in menu_rels]))
    
    if not allowed_menu_ids:
        return {"Roles": roles_nombres, "Permisos": permisos_slugs, "Menus": [], "EstatusId": estatus_id}

    # Obtener todos los menús permitidos de la base de datos
    all_allowed_menus = db.query(Menus).filter(Menus.MenuId.in_(allowed_menu_ids), Menus.Estatus == True).all()
    
    # Organizar jerárquicamente
    # Primero identificamos los padres
    padres = [m for m in all_allowed_menus if m.MenuPadreId is None]
    padres.sort(key=lambda x: x.Orden)
    
    resultado_menus = []
    for p in padres:
        # Buscamos sus hijos que esten en la lista de permitidos
        hijos = [h for h in all_allowed_menus if h.MenuPadreId == p.MenuId]
        hijos.sort(key=lambda x: x.Orden)
        
        menu_dict = {
            "MenuId": p.MenuId,
            "Nombre": p.Nombre,
            "Ruta": p.Ruta,
            "Icono": p.Icono,
            "Orden": p.Orden,
            "MenuPadreId": p.MenuPadreId,
            "SubMenus": [
                {
                    "MenuId": h.MenuId,
                    "Nombre": h.Nombre,
                    "Ruta": h.Ruta,
                    "Icono": h.Icono,
                    "Orden": h.Orden,
                    "MenuPadreId": h.MenuPadreId,
                    "SubMenus": []
                } for h in hijos
            ]
        }
        resultado_menus.append(menu_dict)

    return {
        "Roles": roles_nombres,
        "Permisos": permisos_slugs,
        "Menus": resultado_menus,
        "estatusId": estatus_id
    }
