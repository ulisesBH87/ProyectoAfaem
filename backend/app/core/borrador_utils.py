import os
import uuid
import base64
import json
from app.core.config import obtener_uploads_dir

def guardar_archivo_borrador(base64_data: str, filename: str, slot_id: int, key: str) -> str:
    """
    Decodifica el Base64 y lo guarda en disco.
    Retorna la ruta relativa en disco (ej. 'uploads/borradores/slot_X_key_uuid_filename')
    """
    uploads_dir = obtener_uploads_dir()
    borradores_dir = os.path.join(uploads_dir, "borradores")
    os.makedirs(borradores_dir, exist_ok=True)
    
    # Extraer el base64 limpio
    if "," in base64_data:
        mime_part, base64_str = base64_data.split(",", 1)
    else:
        base64_str = base64_data
        
    try:
        file_bytes = base64.b64decode(base64_str)
    except Exception:
        # Si falla el decode, retornamos el string original (fallback)
        return base64_data
        
    # Crear un nombre de archivo único e inocuo
    safe_filename = "".join(c for c in filename if c.isalnum() or c in (".", "_", "-")).strip()
    if not safe_filename:
        safe_filename = "documento"
    unique_name = f"slot_{slot_id}_{key}_{uuid.uuid4().hex}_{safe_filename}"
    file_path = os.path.join(borradores_dir, unique_name)
    
    with open(file_path, "wb") as f:
        f.write(file_bytes)
        
    # Retornar la ruta relativa que se guardará en el JSON
    return f"uploads/borradores/{unique_name}"


def cargar_archivo_borrador(ruta_relativa: str) -> str:
    """
    Lee el archivo de disco y lo vuelve a convertir en Base64 con su prefijo data URL.
    """
    if not ruta_relativa or not ruta_relativa.startswith("uploads/"):
        return ruta_relativa
        
    # Obtener ruta absoluta
    uploads_dir = obtener_uploads_dir()
    clean_path = ruta_relativa[len("uploads/"):]
    file_path = os.path.normpath(os.path.join(uploads_dir, clean_path))
    
    if not os.path.exists(file_path):
        return ""
        
    # Detectar tipo MIME basándose en la extensión
    ext = os.path.splitext(file_path)[1].lower()
    mime = "application/octet-stream"
    if ext in [".jpg", ".jpeg"]:
        mime = "image/jpeg"
    elif ext == ".png":
        mime = "image/png"
    elif ext == ".pdf":
        mime = "application/pdf"
        
    try:
        with open(file_path, "rb") as f:
            file_bytes = f.read()
        base64_str = base64.b64encode(file_bytes).decode("utf-8")
        return f"data:{mime};base64,{base64_str}"
    except Exception as e:
        print(f"[BORRADOR UTILS] Error leyendo {file_path}: {e}")
        return ""


def procesar_borrador_guardar(datos: dict, slot_id: int) -> dict:
    """
    Busca documentosBorrador en datos, guarda los que tengan Base64 a disco y los reemplaza con su ruta.
    """
    if not datos or not isinstance(datos, dict):
        return datos
        
    documentos = datos.get("documentosBorrador")
    if not documentos or not isinstance(documentos, dict):
        return datos
        
    for key, doc in documentos.items():
        if isinstance(doc, dict) and doc.get("data") and doc.get("name"):
            base64_data = doc["data"]
            # Solo guardamos si realmente es un Base64 (las rutas no empiezan con 'data:')
            if str(base64_data).startswith("data:"):
                ruta = guardar_archivo_borrador(base64_data, doc["name"], slot_id, key)
                doc["data"] = ruta
                
    return datos


def procesar_borrador_cargar(datos: dict) -> dict:
    """
    Busca documentosBorrador en datos, y convierte de vuelta las rutas a Base64.
    """
    if not datos or not isinstance(datos, dict):
        return datos
        
    documentos = datos.get("documentosBorrador")
    if not documentos or not isinstance(documentos, dict):
        return datos
        
    for key, doc in documentos.items():
        if isinstance(doc, dict) and doc.get("data"):
            ruta = doc["data"]
            # Solo cargamos de disco si es una ruta (empieza con 'uploads/')
            if str(ruta).startswith("uploads/"):
                base64_data = cargar_archivo_borrador(ruta)
                doc["data"] = base64_data
                
    return datos


def limpiar_archivos_borrador_obsoletos(datos_antiguos: dict, datos_nuevos: dict):
    """
    Compara los documentos del borrador antiguo con el nuevo y borra del disco
    los archivos que hayan sido eliminados o reemplazados.
    """
    if not datos_antiguos or not isinstance(datos_antiguos, dict):
        return
    
    docs_antiguos = datos_antiguos.get("documentosBorrador")
    if not docs_antiguos or not isinstance(docs_antiguos, dict):
        return
        
    docs_nuevos = (datos_nuevos or {}).get("documentosBorrador") or {}
    
    uploads_dir = obtener_uploads_dir()
    
    for key, doc_antiguo in docs_antiguos.items():
        if isinstance(doc_antiguo, dict) and doc_antiguo.get("data"):
            ruta_antigua = doc_antiguo["data"]
            # Si era un archivo en disco
            if str(ruta_antigua).startswith("uploads/borradores/"):
                # Verificar si en el nuevo borrador ya no existe, tiene otra ruta o se subió un nuevo Base64
                doc_nuevo = docs_nuevos.get(key)
                debe_borrarse = False
                
                if not doc_nuevo or not isinstance(doc_nuevo, dict):
                    debe_borrarse = True
                else:
                    ruta_nueva = doc_nuevo.get("data")
                    if not ruta_nueva:
                        debe_borrarse = True
                    # Si tiene una nueva ruta o es un nuevo Base64 (empieza con 'data:')
                    elif ruta_nueva != ruta_antigua:
                        debe_borrarse = True
                        
                if debe_borrarse:
                    clean_path = ruta_antigua[len("uploads/"):]
                    abs_path = os.path.normpath(os.path.join(uploads_dir, clean_path))
                    if os.path.exists(abs_path):
                        try:
                            os.remove(abs_path)
                        except Exception as e:
                            print(f"[BORRADOR CLEANUP] Error borrando {abs_path}: {e}")


def borrar_archivos_borrador_de_slot(datos_borrador_str: str):
    """
    Borra todos los archivos de borrador asociados a este slot de disco.
    """
    if not datos_borrador_str:
        return
    try:
        datos = json.loads(datos_borrador_str)
        documentos = datos.get("documentosBorrador")
        if documentos and isinstance(documentos, dict):
            uploads_dir = obtener_uploads_dir()
            for doc in documentos.values():
                if isinstance(doc, dict) and doc.get("data"):
                    ruta = doc["data"]
                    if str(ruta).startswith("uploads/borradores/"):
                        clean_path = ruta[len("uploads/"):]
                        abs_path = os.path.normpath(os.path.join(uploads_dir, clean_path))
                        if os.path.exists(abs_path):
                            try:
                                os.remove(abs_path)
                            except Exception as e:
                                print(f"[BORRADOR CLEANUP] Error al borrar archivo de slot: {e}")
    except Exception as e:
        print(f"[BORRADOR CLEANUP] Error al decodificar borrador para limpieza: {e}")
