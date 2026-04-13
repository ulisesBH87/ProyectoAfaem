import cv2
import numpy as np

from .foto_detector import *
from .foto_criterios import *

# ===============================
# --- FUNCION DE DETECTORES ---
# ===============================

# DETECTOR DE ROSTRO
def detector_face(imagen):

    face = get_face_detector()

    # DETECTAR EL ROSTRO
    imagen_rgb = cv2.cvtColor(imagen, cv2.COLOR_BGR2RGB)
    
    mp_imagen = mp.Image(
        image_format = mp.ImageFormat.SRGB,
        data = imagen_rgb
    )

    imagen_result = face.detect(mp_imagen)

    # DETECTAR SI HAY 0 O MAS DE 2 ROSTROS
    if not imagen_result.detections:
        return 0, "No se detectó rostro"

    if len(imagen_result.detections) != 1:
        return 0, "Se detecto más de un rostro"
     
    return imagen_result

# DETECTOR DE LANDMARKS DE ROSTRO ---
def detector_face_landmarks(imagen):

    face_landmarks = get_face_landmarks_detector()

    # DETECTAR LANDMARKS DEL ROSTRO
    imagen_rgb = cv2.cvtColor(imagen, cv2.COLOR_BGR2RGB)
    
    mp_imagen = mp.Image(
        image_format = mp.ImageFormat.SRGB,
        data = imagen_rgb
    )

    imagen_result = face_landmarks.detect(mp_imagen)

    if not imagen_result.face_landmarks:
        return 0, "El rostro no es detectable. Asegúrate de que la cara esté visible y bien iluminada"

    return imagen_result

# DETECTOR DE LANDMARKS DE POSES ---
def detector_pose_landmarks(imagen):
    
    pose = get_pose_landmarks_detector()

     # DETECTAR LANDMARKS DE LA POSTURA
    imagen_rgb = cv2.cvtColor(imagen, cv2.COLOR_BGR2RGB)
    
    mp_imagen = mp.Image(
        image_format = mp.ImageFormat.SRGB,
        data = imagen_rgb
    )

    imagen_result = pose.detect(mp_imagen)
    
    if not imagen_result.pose_landmarks:
        return 0, "No se detectó la pose. Verifica que el cuerpo esté completo y visible"

    return imagen_result

# --- DETECTOR DE SEGMENTACION ---
def detector_segmentacion(imagen):

    segmentacion = get_segmentacion_detector()

    # DETECTAR LA SEGMENTACION 
    segmentacion_imagen_rgb = cv2.cvtColor(imagen, cv2.COLOR_BGR2RGB)
        
    segmentacion_mp_imagen = mp.Image(
        image_format = mp.ImageFormat.SRGB,
        data = segmentacion_imagen_rgb
    )

    segmentacion_result = segmentacion.segment(segmentacion_mp_imagen)

    # VERIFICACION DE MASCARA
    if not segmentacion_result.confidence_masks:
        return 0, "Error al calcular segmentación"
    
    category_mask = segmentacion_result.category_mask.numpy_view()
    confidence_mask = segmentacion_result.confidence_masks[0].numpy_view()
    
    return category_mask, confidence_mask

# =========================
# --- FUNCION PRINCIPAL ---
# =========================

# FUNCION DE VALIDACION PARA LA FOTOGRAFIA
def validacion_fotografia(imagen_bytes):

    nparr = np.frombuffer(imagen_bytes, np.uint8)

    imagen_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if imagen_bgr is None:
        return 0, "No se pudo cargar la imagen"

    # =====================
    # CRITERIOS PRE-RECORTE 
    # =====================

    # RESOLUCION, DIMENSIONES, COLOR
    for funcion in [resolucion, dimensiones, formato_color]:
        valido, mensaje = funcion(imagen_bgr if funcion != resolucion else imagen_bytes)
        if not valido:
            return 0, mensaje
  
    # =============================
    # DETECTAR ANTES DE LA ROTACION 
    # =============================

    # --- DETECTOR DE ROSTRO ---
    imagen_result = detector_face(imagen_bgr)
    
    if isinstance(imagen_result, tuple):
        return imagen_result
    
    # --- DETECTOR DE POSICION DE FOTO ---
    imagen_result = detector_pose_landmarks(imagen_bgr)

    if isinstance(imagen_result, tuple):
        return imagen_result

    posicion = imagen_result.pose_landmarks[0]

    # ROTAR FOTO
    imagen_bgr = rotar(imagen_bgr, posicion)

    # ==========================
    # DETECTAR ANTES DEL RECORTE 
    # ==========================
    
    # --- DETECTOR DE ROSTRO ---
    imagen_result = detector_face_landmarks(imagen_bgr)

    if isinstance(imagen_result, tuple):
        return imagen_result

    face_landmarks = imagen_result.face_landmarks[0]

    # --- DETECTOR DE POSE ---
    imagen_result = detector_pose_landmarks(imagen_bgr)

    if isinstance(imagen_result, tuple):
        return imagen_result

    pose_landmarks = imagen_result.pose_landmarks[0]

    # --- DETECTOR DE SEGMENTACION ---
    category_mask, confidence_mask = detector_segmentacion(imagen_bgr)

    # ROSTRO COPLETO
    valido, mensaje = rostro_completo(imagen_bgr, face_landmarks)
    if not valido:
        return 0, mensaje
    
    # POSTURA (CAMBIAR METODO)
    #valido, mensaje = postura(imagen_bgr, pose_landmarks)
    #if not valido:
    #    return 0, mensaje
    
    # CABELLO
    valido, mensaje = cabello(category_mask)
    if not valido:
        return 0, mensaje

    # RECORTAR FOTO
    imagen_recortada= recortar_foto(imagen_bgr, face_landmarks)
    
    # ============================
    # DETECTAR DESPUES DEL RECORTE 
    # ============================

    # --- DETECTOR DE ROSTRO ---

    imagen_result = detector_pose_landmarks(imagen_recortada)

    if isinstance(imagen_result, tuple):
        return imagen_result

    posicion = imagen_result.pose_landmarks[0]

    # --- DETECTOR DE SEGMENTACION ---
    category_mask, confidence_mask = detector_segmentacion(imagen_recortada)
    
    # =======================
    # CRITERIOS PORST-RECORTE 
    # =======================

    # NITIDEZ (CAMBIAR METODO)
    #valido, mensaje = nitidez(imagen_recortada)
    #if not valido:
    #    return 0, mensaje
 
    # ILUMINACION (CAMBIAR METODO)
    #valido, mensaje = iluminacion_imagen(imagen_recortada)
    #if not valido:
    #    return 0, mensaje
    
     #TAMAÑO DEL ROSTRO
    valido, mensaje = tam_rostro(imagen_recortada.shape, face_landmarks)
    if not valido:
        return 0, mensaje 
    
    # CRENTRADO DEL ROSTRO (DUDA DE SI SE OCUPA)
    #valido, mensaje = rostro_centrado(imagen_recortada.shape, face_landmarks)
    #if not valido:
    #    return 0, mensaje 
        
    # ILUMINACION (CAMBIAR METODO)
    #valido, mensaje = iluminacion_persona(imagen_recortada, confidence_mask)
    #if not valido:
    #    return 0, mensaje

    #CRITERIOS DE ACCESORIOS
    valido, mensaje = accesorios(imagen_recortada)
    if not valido:
        return 0, mensaje 
    
    # FONDO BLANCO
    imagen_validada = fondo_blanco(imagen_recortada, category_mask, confidence_mask)
    
    # --- CRITERIOS PARA LA FOTO ---
    
    # OJOS ABIERTOS
    valido, mensaje = ojos_abiertos(imagen_validada.shape, face_landmarks)
    if not valido:
        return 0, mensaje 
    
    # MIRADA FRONTAL
    valido, mensaje = mirada_frontal(face_landmarks)
    if not valido:
        return 0, mensaje 
    
    # MIRADA FRONTAL
    valido, mensaje = expresion_neutral(imagen_validada.shape, face_landmarks)
    if not valido:
        return 0, mensaje 
    
    # CABEZA (EN PROCESO)

    # --- RESULTADO FINAL ---
    
    _, buffer = cv2.imencode(".jpg", imagen_validada)

    return 1, buffer.tobytes()