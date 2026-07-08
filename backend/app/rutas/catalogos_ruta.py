from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.sesion import get_db
from app.core.seguridad import obtener_usuario_actual
from app.modelos.catalogos_liga_modelo import Ligas, CatalogoCategorias, CatalogoModalidad, CatalogoRamas
from app.esquemas.catalogos_esquema import CatalogoCreate, CatalogoUpdate, CatalogoResponse
from typing import List

router = APIRouter(prefix="/catalogos", tags=["Catálogos"])

# Mapeo de tipos a modelos y sus campos
CATALOGO_MAP = {
    "ligas": {
        "model": Ligas,
        "id_field": "LigaId",
        "name_field": "Nombreliga",
        "description_field": "Descripcionliga"
    },
    "categorias": {
        "model": CatalogoCategorias,
        "id_field": "CategoriaId",
        "name_field": "NombreCategoria",
        "description_field": None
    },
    "modalidades": {
        "model": CatalogoModalidad,
        "id_field": "ModalidadId",
        "name_field": "NombreModalidad",
        "description_field": None
    },
    "ramas": {
        "model": CatalogoRamas,
        "id_field": "RamaId",
        "name_field": "Nombre",
        "description_field": None
    }
}

@router.get("/{tipo}", response_model=List[CatalogoResponse])
def listar_catalogos(tipo: str, solo_activos: bool = False, db: Session = Depends(get_db)):
    if tipo not in CATALOGO_MAP:
        raise HTTPException(status_code=404, detail="Tipo de catálogo no válido")
    
    config = CATALOGO_MAP[tipo]
    model = config["model"]
    
    query = db.query(model)
    if solo_activos:
        query = query.filter(model.Estatus == True)
        
    if tipo == "ligas":
        from sqlalchemy.orm import joinedload
        items = query.options(
            joinedload(model.ModalidadRelacion),
            joinedload(model.CategoriaRelacion),
            joinedload(model.RamaRelacion)
        ).all()
    else:
        items = query.all()
    
    # Transformamos para que coincida con el esquema CatalogoResponse (id, nombre, descripcion)
    resultado = []
    for item in items:
        res = {
            "id": getattr(item, config["id_field"]),
            "nombre": getattr(item, config["name_field"]),
            "descripcion": getattr(item, config["description_field"]) if config["description_field"] else None,
            "estatus": getattr(item, "Estatus", True)
        }
        if tipo == "ligas":
            cat = item.CategoriaRelacion.NombreCategoria if item.CategoriaRelacion else ""
            mod = item.ModalidadRelacion.NombreModalidad if item.ModalidadRelacion else ""
            ram = item.RamaRelacion.Nombre if item.RamaRelacion else ""
            desc = f"{item.Nombreliga} ({cat} - {mod} - {ram})" if cat or mod or ram else item.Nombreliga
            res["nombre"] = desc
            res["nombreOriginal"] = item.Nombreliga
            res["modalidadId"] = item.ModalidadId
            res["categoriaId"] = item.CategoriaId
            res["ramaId"] = item.RamaId
            res["nombreModalidad"] = mod if mod else None
            res["nombreCategoria"] = cat if cat else None
            res["nombreRama"] = ram if ram else None
        resultado.append(res)
    return resultado

@router.post("/{tipo}", response_model=CatalogoResponse)
def crear_catalogo(tipo: str, data: CatalogoCreate, db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    # Protección: solo administradores (RolId 1)
    if getattr(usuario, "RolId", None) != 1:
        raise HTTPException(status_code=403, detail="No tienes permisos para realizar esta acción")
        
    if tipo not in CATALOGO_MAP:
        raise HTTPException(status_code=404, detail="Tipo de catálogo no válido")
    
    config = CATALOGO_MAP[tipo]
    model = config["model"]
    
    try:
        nuevo_item = model()
        setattr(nuevo_item, config["name_field"], data.nombre)
        
        # Si tiene campo de descripción, lo asignamos
        if config["description_field"]:
            setattr(nuevo_item, config["description_field"], data.descripcion or data.nombre)
            
        if hasattr(nuevo_item, "Estatus"):
            nuevo_item.Estatus = True
        
        if tipo == "ligas":
            nuevo_item.ModalidadId = data.modalidadId
            nuevo_item.CategoriaId = data.categoriaId
            nuevo_item.RamaId = data.ramaId
        
        db.add(nuevo_item)
        db.commit()
        db.refresh(nuevo_item)
        
        res = {
            "id": getattr(nuevo_item, config["id_field"]), 
            "nombre": getattr(nuevo_item, config["name_field"]),
            "descripcion": getattr(nuevo_item, config["description_field"]) if config["description_field"] else None,
            "estatus": getattr(nuevo_item, "Estatus", True)
        }
        if tipo == "ligas":
            db.refresh(nuevo_item)
            cat = nuevo_item.CategoriaRelacion.NombreCategoria if nuevo_item.CategoriaRelacion else ""
            mod = nuevo_item.ModalidadRelacion.NombreModalidad if nuevo_item.ModalidadRelacion else ""
            ram = nuevo_item.RamaRelacion.Nombre if nuevo_item.RamaRelacion else ""
            desc = f"{nuevo_item.Nombreliga} ({cat} - {mod} - {ram})" if cat or mod or ram else nuevo_item.Nombreliga
            res["nombre"] = desc
            res["nombreOriginal"] = nuevo_item.Nombreliga
            res["modalidadId"] = nuevo_item.ModalidadId
            res["categoriaId"] = nuevo_item.CategoriaId
            res["ramaId"] = nuevo_item.RamaId
            res["nombreModalidad"] = mod if mod else None
            res["nombreCategoria"] = cat if cat else None
            res["nombreRama"] = ram if ram else None
        return res
    except Exception as e:
        db.rollback()
        #print(f"Error al crear catálogo {tipo}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno")

@router.put("/{tipo}/{item_id}", response_model=CatalogoResponse)
def actualizar_catalogo(tipo: str, item_id: int, data: CatalogoUpdate, db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    if getattr(usuario, "RolId", None) != 1:
        raise HTTPException(status_code=403, detail="No tienes permisos para realizar esta acción")
        
    if tipo not in CATALOGO_MAP:
        raise HTTPException(status_code=404, detail="Tipo de catálogo no válido")
    
    config = CATALOGO_MAP[tipo]
    model = config["model"]
    id_field = config["id_field"]
    
    try:
        item = db.query(model).filter(getattr(model, id_field) == item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Registro no encontrado")
        
        setattr(item, config["name_field"], data.nombre)
        if config["description_field"]:
            setattr(item, config["description_field"], data.descripcion or data.nombre)
            
        if hasattr(item, "Estatus") and data.estatus is not None:
            item.Estatus = data.estatus
            
        if tipo == "ligas":
            item.ModalidadId = data.modalidadId
            item.CategoriaId = data.categoriaId
            item.RamaId = data.ramaId
            
        db.commit()
        db.refresh(item)
        
        res = {
            "id": getattr(item, config["id_field"]), 
            "nombre": getattr(item, config["name_field"]),
            "descripcion": getattr(item, config["description_field"]) if config["description_field"] else None,
            "estatus": getattr(item, "Estatus", True)
        }
        if tipo == "ligas":
            db.refresh(item)
            cat = item.CategoriaRelacion.NombreCategoria if item.CategoriaRelacion else ""
            mod = item.ModalidadRelacion.NombreModalidad if item.ModalidadRelacion else ""
            ram = item.RamaRelacion.Nombre if item.RamaRelacion else ""
            desc = f"{item.Nombreliga} ({cat} - {mod} - {ram})" if cat or mod or ram else item.Nombreliga
            res["nombre"] = desc
            res["nombreOriginal"] = item.Nombreliga
            res["modalidadId"] = item.ModalidadId
            res["categoriaId"] = item.CategoriaId
            res["ramaId"] = item.RamaId
            res["nombreModalidad"] = mod if mod else None
            res["nombreCategoria"] = cat if cat else None
            res["nombreRama"] = ram if ram else None
        return res
    except Exception as e:
        db.rollback()
        #print(f"Error al actualizar catálogo {tipo}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno")

@router.delete("/{tipo}/{item_id}")
def eliminar_catalogo(tipo: str, item_id: int, db: Session = Depends(get_db), usuario = Depends(obtener_usuario_actual)):
    if getattr(usuario, "RolId", None) != 1:
        raise HTTPException(status_code=403, detail="No tienes permisos para realizar esta acción")
        
    if tipo not in CATALOGO_MAP:
        raise HTTPException(status_code=404, detail="Tipo de catálogo no válido")
    
    config = CATALOGO_MAP[tipo]
    model = config["model"]
    id_field = config["id_field"]
    
    try:
        item = db.query(model).filter(getattr(model, id_field) == item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Registro no encontrado")
        
        # En lugar de eliminar físicamente, desactivamos (Estatus = False)
        if hasattr(item, "Estatus"):
            item.Estatus = False
            db.commit()
            return {"message": "Registro desactivado correctamente"}
        else:
            db.delete(item)
            db.commit()
            return {"message": "Registro eliminado correctamente"}
    except Exception as e:
        db.rollback()
        error_str = str(e)
        #print(f"Error al eliminar catálogo {tipo}: {error_str}")
        if "FK_" in error_str or "REFERENCE constraint" in error_str:
             raise HTTPException(status_code=400, detail="No se puede eliminar el registro porque está siendo utilizado en otras tablas (equipos, jugadores, etc).")
        raise HTTPException(status_code=500, detail=f"Error interno al eliminar")

