import cv2
import numpy as np
import os
import io
import logging
from PIL import Image
from app.core.config import obtener_configuracion

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("procesador_documentos")

# Dynamic HEIC Support
HEIC_SUPPORTED = False
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
    HEIC_SUPPORTED = True
    logger.info("Soporte HEIC registrado con éxito a través de pillow-heif.")
except ImportError:
    logger.info("pillow-heif no está instalado. Soporte HEIC deshabilitado por defecto.")

# Operational Limits
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB
MAX_PDF_PAGES = 10
MAX_RESOLUTION_LIMIT = 3000       # Maximum height/width for final combined image
DETECTION_HEIGHT = 1000.0         # Height used for contour detection scaling

def order_points(pts):
    """
    Orders 4 points of a quadrilateral: [top-left, top-right, bottom-right, bottom-left]
    """
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    
    diff = np.diff(pts, axis=1).flatten()
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect

def expand_quadrilateral(pts, width, height, padding=0.015):
    """
    Expands the quadrilateral points slightly outward from its centroid to prevent cropping text.
    """
    centroid = np.mean(pts, axis=0)
    expanded_pts = np.zeros_like(pts)
    for i, pt in enumerate(pts):
        vec = pt - centroid
        expanded_pt = centroid + vec * (1.0 + padding)
        expanded_pt[0] = np.clip(expanded_pt[0], 0, width - 1)
        expanded_pt[1] = np.clip(expanded_pt[1], 0, height - 1)
        expanded_pts[i] = expanded_pt
    return expanded_pts

def corregir_perspectiva(image, pts, padding=0.015):
    """
    Straightens a quadrilateral section of an image using perspective transform.
    """
    h_img, w_img = image.shape[:2]
    if padding > 0:
        pts = expand_quadrilateral(pts, w_img, h_img, padding)
        
    rect = order_points(pts)
    (tl, tr, br, bl) = rect
    
    widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    maxWidth = max(int(widthA), int(widthB))
    
    heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    maxHeight = max(int(heightA), int(heightB))
    
    if maxWidth < 50 or maxHeight < 50:
        return image
        
    dst = np.array([
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]
    ], dtype="float32")
    
    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (maxWidth, maxHeight))
    return warped

def intersects_iou(boxA, boxB):
    """
    Computes Intersection-over-Union (IoU) of two boxes represented as (x, y, w, h).
    """
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[0] + boxA[2], boxB[0] + boxB[2])
    yB = min(boxA[1] + boxA[3], boxB[1] + boxB[3])
    
    interArea = max(0, xB - xA) * max(0, yB - yA)
    if interArea == 0:
        return 0.0
        
    boxAArea = boxA[2] * boxA[3]
    boxBArea = boxB[2] * boxB[3]
    overlap = interArea / float(min(boxAArea, boxBArea))
    return overlap

def detectar_documentos_en_imagen(image):
    """
    Detects all candidate document boundaries in an image.
    Returns a list of dicts: {"pts": points, "confidence": "alta"|"media_fallback", "box": (x, y, w, h)}
    """
    height, width = image.shape[:2]
    
    # Standardize image size for processing
    ratio = height / DETECTION_HEIGHT
    resized = cv2.resize(image, (int(width / ratio), int(DETECTION_HEIGHT)))
    r_height, r_width = resized.shape[:2]
    total_area = r_height * r_width
    
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    raw_candidates = []
    
    # ------------------ STRATEGY 1: Canny Edges ------------------
    edged = cv2.Canny(blurred, 75, 200)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    closed = cv2.morphologyEx(edged, cv2.MORPH_CLOSE, kernel)
    
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    raw_candidates.extend([(c, "canny") for c in contours])
    
    # ------------------ STRATEGY 2: Otsu Threshold ------------------
    _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    kernel_otsu = cv2.getStructuringElement(cv2.MORPH_RECT, (11, 11))
    closed_otsu = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel_otsu)
    
    contours_otsu, _ = cv2.findContours(closed_otsu, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    raw_candidates.extend([(c, "otsu_normal") for c in contours_otsu])
    
    # ------------------ STRATEGY 3: Otsu Inverted ------------------
    _, thresh_inv = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    closed_otsu_inv = cv2.morphologyEx(thresh_inv, cv2.MORPH_CLOSE, kernel_otsu)
    
    contours_otsu_inv, _ = cv2.findContours(closed_otsu_inv, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    raw_candidates.extend([(c, "otsu_inv") for c in contours_otsu_inv])
    
    # Process candidates
    candidates = []
    for c, method in raw_candidates:
        area = cv2.contourArea(c)
        if area < total_area * 0.05:  # At least 5% of the page
            continue
            
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        
        # High confidence: convex quadrilateral
        if len(approx) == 4 and cv2.isContourConvex(approx):
            x, y, w, h = cv2.boundingRect(c)
            if w >= r_width - 5 and h >= r_height - 5:
                continue
            pts = approx.reshape(4, 2) * ratio
            orig_box = (int(x * ratio), int(y * ratio), int(w * ratio), int(h * ratio))
            candidates.append({
                "pts": pts,
                "confidence": "alta",
                "box": orig_box,
                "area": area
            })
        else:
            # Fallback: minAreaRect for rounded corners/low contrast
            x, y, w, h = cv2.boundingRect(c)
            if w >= r_width - 5 and h >= r_height - 5:
                continue
            rect = cv2.minAreaRect(c)
            box = cv2.boxPoints(rect)
            box_area = rect[1][0] * rect[1][1]
            
            if box_area >= total_area * 0.05:
                aspect = min(rect[1]) / (max(rect[1]) or 1)
                if aspect >= 0.35 and area >= box_area * 0.65:
                    pts = box * ratio
                    orig_box = (int(x * ratio), int(y * ratio), int(w * ratio), int(h * ratio))
                    candidates.append({
                        "pts": pts,
                        "confidence": "media_fallback",
                        "box": orig_box,
                        "area": area
                    })
                    
    # Deduplicate overlapping bounding boxes (IoU > 0.6)
    # Sort candidates by area descending so we keep the larger/cleaner detection
    candidates = sorted(candidates, key=lambda item: item["area"], reverse=True)
    deduplicated = []
    
    for cand in candidates:
        overlap_found = False
        for kept in deduplicated:
            iou = intersects_iou(cand["box"], kept["box"])
            if iou > 0.6:
                overlap_found = True
                # If the new one is "alta" and current is fallback, swap them
                if cand["confidence"] == "alta" and kept["confidence"] != "alta":
                    kept["pts"] = cand["pts"]
                    kept["confidence"] = cand["confidence"]
                    kept["box"] = cand["box"]
                    kept["area"] = cand["area"]
                break
        if not overlap_found:
            deduplicated.append(cand)
            
    # Visual Sorting: Top-to-Bottom, Left-to-Right
    if len(deduplicated) > 1:
        # Sort primarily by Y
        deduplicated = sorted(deduplicated, key=lambda d: d["box"][1])
        rows = []
        for d in deduplicated:
            placed = False
            y = d["box"][1]
            for row in rows:
                avg_y = sum(item["box"][1] for item in row) / len(row)
                if abs(y - avg_y) < (height * 0.12):  # Row threshold: 12% of height
                    row.append(d)
                    placed = True
                    break
            if not placed:
                rows.append([d])
                
        sorted_detections = []
        for row in rows:
            row_sorted = sorted(row, key=lambda d: d["box"][0])
            sorted_detections.extend(row_sorted)
    # Guard: prevent partial cropping if there is significant content outside the detected area
    if len(deduplicated) > 0:
        mask = np.zeros((r_height, r_width), dtype=np.uint8)
        for cand in deduplicated:
            pts_resized = (cand["pts"] / ratio).astype(np.int32)
            cv2.fillPoly(mask, [pts_resized], 255)
            
        outside_edges = cv2.bitwise_and(edged, cv2.bitwise_not(mask))
        outside_contours, _ = cv2.findContours(outside_edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        significant_outside_objects = 0
        for oc in outside_contours:
            ox, oy, ow, oh = cv2.boundingRect(oc)
            oarea = cv2.contourArea(oc)
            if (ow > 20 and oh > 20) or oarea > 100:
                significant_outside_objects += 1
                if significant_outside_objects >= 4:
                    logger.warning(f"Se detectaron {significant_outside_objects} objetos significativos fuera del área recortada. Conservando imagen original por seguridad para evitar recortes parciales.")
                    return []
                    
    return deduplicated

def reconstruir_pagina(cropped_patches):
    """
    Combines multiple document patches vertically onto a single white canvas.
    Ensures final resolution does not exceed MAX_RESOLUTION_LIMIT.
    """
    margin = 30
    
    # Calculate widths and heights
    widths = [patch.shape[1] for patch in cropped_patches]
    heights = [patch.shape[0] for patch in cropped_patches]
    
    # Combined canvas size
    combined_width = max(widths) + 2 * margin
    combined_height = sum(heights) + (len(cropped_patches) + 1) * margin
    
    # Build white canvas
    canvas = np.ones((combined_height, combined_width, 3), dtype=np.uint8) * 255
    
    current_y = margin
    for patch in cropped_patches:
        h_p, w_p = patch.shape[:2]
        start_x = (combined_width - w_p) // 2
        canvas[current_y : current_y + h_p, start_x : start_x + w_p] = patch
        current_y += h_p + margin
        
    # Resize down if canvas dimensions exceed resolution limits (to limit file size)
    h_canvas, w_canvas = canvas.shape[:2]
    if h_canvas > MAX_RESOLUTION_LIMIT or w_canvas > MAX_RESOLUTION_LIMIT:
        scale = MAX_RESOLUTION_LIMIT / max(h_canvas, w_canvas)
        new_w = int(w_canvas * scale)
        new_h = int(h_canvas * scale)
        canvas = cv2.resize(canvas, (new_w, new_h), interpolation=cv2.INTER_AREA)
        logger.info(f"Página combinada excedió límites. Redimensionando de {w_canvas}x{h_canvas} a {new_w}x{new_h}")
        
    return canvas

def es_pdf_escaneado(pdf_bytes):
    """
    Checks if a PDF is scanned. A PDF is classified as scanned if:
    - It contains less than 15 characters of searchable text.
    - OR it contains an image covering more than 80% of any page's area.
    """
    try:
        import fitz
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        if len(doc) == 0:
            return True
            
        has_digital_text = False
        has_large_scanned_image = False
        
        for page in doc:
            text = page.get_text().strip()
            # If any page has substantial searchable text, it could be digital
            if len(text) > 15:
                has_digital_text = True
                
            # Check for images covering most of the page
            page_area = page.rect.width * page.rect.height
            images_info = page.get_image_info(xrefs=True)
            for img in images_info:
                bbox = img.get("bbox")
                if bbox:
                    img_area = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1])
                    if img_area >= page_area * 0.80:
                        has_large_scanned_image = True
                        break
                        
        # It's scanned if it has no text, or if it has a massive image covering the page
        return (not has_digital_text) or has_large_scanned_image
        
    except Exception as e:
        logger.error(f"Error clasificando PDF: {e}")
        return False

def procesar_pdf_escaneado(pdf_bytes):
    """
    Processes a scanned PDF page-by-page. Straightens and crops documents on each page,
    then compiles back into a compressed PDF.
    """
    try:
        import fitz
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        total_pages = len(doc)
        
        # Enforce page limits for auto-crop
        if total_pages > MAX_PDF_PAGES:
            logger.warning(f"PDF contiene {total_pages} páginas, excediendo el límite de {MAX_PDF_PAGES}. Manteniendo original.")
            return pdf_bytes
            
        pil_images = []
        any_processed = False
        
        for i in range(total_pages):
            page = doc.load_page(i)
            # Render at 200 DPI
            zoom = 200 / 72
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat)
            
            img_data = np.frombuffer(pix.samples, dtype=np.uint8).reshape((pix.height, pix.width, 3))
            img_bgr = cv2.cvtColor(img_data, cv2.COLOR_RGB2BGR)
            
            # Detect contours on the page
            detections = detectar_documentos_en_imagen(img_bgr)
            
            if len(detections) > 0:
                logger.info(f"Página {i+1}: Detectado(s) {len(detections)} documento(s).")
                cropped_patches = []
                for det in detections:
                    cropped = corregir_perspectiva(img_bgr, det["pts"])
                    cropped_patches.append(cropped)
                    
                if len(cropped_patches) == 1:
                    processed_page = cropped_patches[0]
                else:
                    processed_page = reconstruir_pagina(cropped_patches)
                any_processed = True
            else:
                logger.info(f"Página {i+1}: No se detectó contorno confiable. Conservando original.")
                processed_page = img_bgr
                
            img_rgb = cv2.cvtColor(processed_page, cv2.COLOR_BGR2RGB)
            pil_images.append(Image.fromarray(img_rgb))
            
        if not any_processed:
            logger.info("Ninguna página del PDF pudo ser recortada con alta confianza. Conservando archivo original.")
            return pdf_bytes
            
        # Re-compile to PDF in memory
        output_buffer = io.BytesIO()
        if pil_images:
            pil_images[0].save(
                output_buffer,
                format="PDF",
                save_all=True,
                append_images=pil_images[1:],
                resolution=200.0,
                quality=85
            )
            return output_buffer.getvalue()
            
    except Exception as e:
        logger.error(f"Error procesando PDF escaneado: {e}")
        
    return pdf_bytes

def procesar_imagen_bytes(image_bytes, extension):
    """
    Processes raw image bytes, crops documents, deskews them, reconstructs the layout if needed,
    and returns compressed image bytes.
    """
    try:
        ext_lower = extension.lower()
        
        # Check HEIC loading fallback
        if ext_lower in ("heic", "heif"):
            if HEIC_SUPPORTED:
                pil_img = Image.open(io.BytesIO(image_bytes))
                img_rgb = np.array(pil_img)
                img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
            else:
                logger.warning("Recibido archivo HEIC pero pillow-heif no está disponible. Manteniendo original.")
                return image_bytes
        else:
            # OpenCV native load
            nparr = np.frombuffer(image_bytes, np.uint8)
            img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
        if img_bgr is None:
            logger.warning("No se pudo decodificar la imagen mediante OpenCV. Manteniendo original.")
            return image_bytes
            
        # Run detection
        detections = detectar_documentos_en_imagen(img_bgr)
        
        if len(detections) == 0:
            logger.info("No se detectó ningún contorno confiable en la imagen. Conservando archivo original.")
            return image_bytes
            
        logger.info(f"Detección de imagen exitosa. Documentos detectados: {len(detections)}")
        for idx, det in enumerate(detections):
            logger.info(f"  Doc {idx+1}: Confianza={det['confidence']}, Caja={det['box']}")
            
        # Crop and Warp
        cropped_patches = []
        for det in detections:
            cropped = corregir_perspectiva(img_bgr, det["pts"])
            cropped_patches.append(cropped)
            
        # Reconstruct page/layout
        if len(cropped_patches) == 1:
            processed_img = cropped_patches[0]
        else:
            processed_img = reconstruir_pagina(cropped_patches)
            
        # Convert BGR back to PIL and compress
        img_rgb = cv2.cvtColor(processed_img, cv2.COLOR_BGR2RGB)
        pil_out = Image.fromarray(img_rgb)
        
        # Determine format
        save_format = "JPEG"
        if "png" in ext_lower:
            save_format = "PNG"
        elif "heic" in ext_lower or "heif" in ext_lower:
            # Save HEIC uploads as JPEG for broad web compatibility
            save_format = "JPEG"
            
        output_buffer = io.BytesIO()
        pil_out.save(output_buffer, format=save_format, quality=88)
        return output_buffer.getvalue()
        
    except Exception as e:
        logger.error(f"Error procesando imagen: {e}")
        return image_bytes

def procesar_documento_subido(file_bytes: bytes, filename: str) -> bytes:
    """
    Main entry point for document processing. Verifies system state, file size,
    and forwards files to their specific handlers.
    """
    if not file_bytes:
        return file_bytes
        
    # Check size limit
    if len(file_bytes) > MAX_FILE_SIZE:
        logger.warning(f"El archivo {filename} supera el tamaño de seguridad de {MAX_FILE_SIZE} bytes. Omitiendo recorte.")
        return file_bytes
        
    # Check configuration
    try:
        config = obtener_configuracion()
        auto_crop_enabled = getattr(config, "AUTO_CROP_DOCUMENTS", True)
    except Exception as e:
        logger.warning(f"Error al leer configuración. Se asume AUTO_CROP_DOCUMENTS=True. Error: {e}")
        auto_crop_enabled = True
        
    if not auto_crop_enabled:
        logger.info(f"Recorte automático deshabilitado por configuración. Guardando archivo intacto.")
        return file_bytes
        
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    
    if ext == "pdf":
        if es_pdf_escaneado(file_bytes):
            logger.info(f"Iniciando procesamiento de PDF escaneado: {filename}")
            return procesar_pdf_escaneado(file_bytes)
        else:
            logger.info(f"PDF digital/nativo detectado: {filename}. Manteniendo original.")
            return file_bytes
            
    elif ext in ("jpg", "jpeg", "png", "heic", "heif", "webp", "bmp", "tiff"):
        logger.info(f"Iniciando procesamiento de imagen: {filename}")
        return procesar_imagen_bytes(file_bytes, ext)
        
    logger.info(f"Tipo de archivo .{ext} no soportado para recorte automático. Manteniendo original.")
    return file_bytes
