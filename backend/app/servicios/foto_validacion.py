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
        return False, "No se detectó rostro"

    if len(imagen_result.detections) != 1:
        return False, "Se detecto más de un rostro"
     
    return True, imagen_result

# DETECTOR DE LANDMARKS DE ROSTRO
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
        return False, "El rostro no es detectable. Asegúrate de que esté visible y bien iluminada"

    return True, imagen_result

# DETECTOR DE LANDMARKS DE POSES
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
        return False, "No se detectó la pose. Verifica que el cuerpo esté visible"

    return True, imagen_result

# DETECTOR DE SEGMENTACION
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
        return False, "Error al calcular segmentación"
    
    category_mask = segmentacion_result.category_mask.numpy_view()
    confidence_mask = segmentacion_result.confidence_masks[0].numpy_view()
    
    return True, (category_mask, confidence_mask)

# =========================
# --- FUNCION PRINCIPAL ---
# =========================

# FUNCION DE VALIDACION PARA LA FOTOGRAFIA
def validacion_fotografia(imagen_bytes):

    nparr = np.frombuffer(imagen_bytes, np.uint8)

    imagen_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if imagen_bgr is None:
        return False, "No se pudo cargar la imagen"
    
    # RESOLUCION, DIMENSIONES, COLOR
    for funcion in [resolucion, dimensiones, formato_color]:
        valido, mensaje = funcion(imagen_bgr if funcion != resolucion else imagen_bytes)
        if not valido:
            return False, mensaje

    # =============================
    # DETECTAR ANTES DE LA ROTACION 
    # =============================

    # DETECTOR DE ROSTRO
    valido, imagen_result = detector_face(imagen_bgr)

    if not valido:
        return False, imagen_result
    
    # DETECTOR DE POSICION DE FOTO
    valido, imagen_result = detector_pose_landmarks(imagen_bgr)

    if not valido:
        return False, imagen_result

    posicion = imagen_result.pose_landmarks[0]

    # ROTAR FOTO
    imagen_bgr = rotar(imagen_bgr, posicion)

    # ==========================
    # DETECTAR ANTES DEL RECORTE 
    # ==========================
    
    # DETECTOR DE ROSTRO
    valido, imagen_result = detector_face_landmarks(imagen_bgr)

    if not valido:
        return False, imagen_result

    face_landmarks = imagen_result.face_landmarks[0]

    # DETECTOR DE POSE
    valido, imagen_result = detector_pose_landmarks(imagen_bgr)

    if not valido:
        return False, imagen_result

    pose_landmarks = imagen_result.pose_landmarks[0]

    # DETECTOR DE SEGMENTACION
    valido, resultado = detector_segmentacion(imagen_bgr)

    if not valido:
        return False, resultado

    category_mask, confidence_mask = resultado

    # =====================
    # CRITERIOS PRE-RECORTE 
    # =====================
    
    #ILUMINACION DE LA FOTO
    valido, mensaje = iluminacion_foto(imagen_bgr)
    if not valido:
        return False, mensaje
    
    # ROSTRO COPLETO
    valido, mensaje = rostro_completo(imagen_bgr, face_landmarks)
    if not valido:
        return False, mensaje
    
    # POSTURA
    valido, mensaje = postura(imagen_bgr, pose_landmarks)
    if not valido:
        return False, mensaje

    # RECORTAR FOTO
    imagen_recortada= recortar(imagen_bgr, face_landmarks)
    #imagen_recortada= recortar_foto(imagen_bgr, category_mask, pose_landmarks)
    
    
    # ============================
    # DETECTAR DESPUES DEL RECORTE 
    # ============================

    # DETECTOR DE ROSTRO

    # DETECTOR DE POSE
    valido, imagen_result = detector_pose_landmarks(imagen_bgr)

    if not valido:
        return False, imagen_result

    posicion = imagen_result.pose_landmarks[0]

    # DETECTOR DE SEGMENTACION
    valido, resultado = detector_segmentacion(imagen_recortada)

    if not valido:
        return False, resultado

    category_mask, confidence_mask = resultado   

    # =======================
    # CRITERIOS PORST-RECORTE 
    # =======================
     # CABELLO
    valido, mensaje = cabello(category_mask)
    if not valido:
        return False, mensaje
    
    # FONDO BLANCO
    imagen_validada = fondo_blanco(imagen_recortada, category_mask, confidence_mask)
    
    #ILUMINACION DEL ROSTRO
    valido, mensaje = iluminacion_persona(imagen_validada, face_landmarks)
    if not valido:
        return False, mensaje
    
    # NITIDEZ
    valido, mensaje = nitidez(imagen_validada)
    if not valido:
        return False, mensaje
    
     #TAMAÑO DEL ROSTRO
    valido, mensaje = tam_rostro(imagen_validada.shape, face_landmarks)
    if not valido:
        return False, mensaje 
    
    # CRENTRADO DEL ROSTRO
    #valido, mensaje = rostro_centrado(imagen_recortada.shape, face_landmarks)
    #if not valido:
    #    return False, mensaje 
        
    #CRITERIOS DE ACCESORIOS
    valido, mensaje = accesorios(imagen_validada)
    if not valido:
        return False, mensaje 
    
    # OJOS ABIERTOS
    valido, mensaje = ojos_abiertos(imagen_validada.shape, face_landmarks)
    if not valido:
        return False, mensaje 
    
    # MIRADA FRONTAL
    valido, mensaje = mirada_frontal(face_landmarks)
    if not valido:
        return False, mensaje 
    
    # MIRADA FRONTAL
    valido, mensaje = expresion_neutral(imagen_validada.shape, face_landmarks)
    if not valido:
        return False, mensaje 
    
    # CABEZA INCLINADA
    #valido, mensaje = orientacion(face_landmarks)
    #if not valido:
    #    return False, mensaje
    
    # --- RESULTADO FINAL ---
    
    _, buffer = cv2.imencode(".jpg", imagen_validada)

    return True, buffer.tobytes()