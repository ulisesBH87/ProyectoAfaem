import cv2
import numpy as np

from .foto_detector import *
from .foto_criterios import *

# ===============================
# --- FUNCIONES DE DETECTORES ---
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

# DETECTOR DE landmarks DE ROSTRO ---
def detector_face_landmarks(imagen):

    face_landmarks = get_face_landmarks_detector()

    # DETECTAR landmarks DEL ROSTRO
    imagen_rgb = cv2.cvtColor(imagen, cv2.COLOR_BGR2RGB)
    
    mp_imagen = mp.Image(
        image_format = mp.ImageFormat.SRGB,
        data = imagen_rgb
    )

    imagen_result = face_landmarks.detect(mp_imagen)

    if not imagen_result.face_landmarks:
        return 0, "El rostro no es detectable. Asegúrate de que la cara esté visible y bien iluminada"

    return imagen_result

# DETECTOR DE landmarks DE POSES ---
def detector_pose_landmarks(imagen):
    
    pose = get_pose_landmarks_detector()

     # DETECTAR landmarks DE LA POSTURA
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

    # DETECTAR landmarks DE LA SEGMENTACION 
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

    # --- CRITERIOS TECNICOS PRE-RECORTE ---
    # RESOLUCION, DIMENSIONES, COLOR
    for funcion in [resolucion, dimensiones, formato_color]:
        valido, mensaje = funcion(imagen_bgr if funcion != resolucion else imagen_bytes)
        if not valido:
            return 0, mensaje
  
    # --- DETECTOR DE ROSTRO ---
    imagen_result = detector_face(imagen_bgr)
    
    if isinstance(imagen_result, tuple):
        return imagen_result
    
    # --- DETECTOR DE POSICION ---
    imagen_result = detector_pose_landmarks(imagen_bgr)

    if isinstance(imagen_result, tuple):
        return imagen_result

    pose_landmarks = imagen_result.pose_landmarks[0]

    # ROTAR FOTO
    imagen_bgr = rotar(imagen_bgr, pose_landmarks)
        
    # --- DETECTOR DE ROSTRO ---
    imagen_result = detector_face_landmarks(imagen_bgr)

    if isinstance(imagen_result, tuple):
        return imagen_result

    face_landmarks = imagen_result.face_landmarks[0]

    # ROSTRO COPLETO
    valido, mensaje = rostro_completo(imagen_bgr, face_landmarks)
    if not valido:
        return 0, mensaje

    # RECORTAR FOTO
    imagen_recortada= recortar_foto(imagen_bgr, face_landmarks)
    
    # --- CRITERIOS TECNICOS PORST-RECORTE ---
    # ILUMINACION - PENDIENTE
    valido, mensaje = iluminacion_foto(imagen_recortada)
    if not valido:
        return 0, mensaje
    
    # NITIDEZ
    valido, mensaje = nitidez(imagen_recortada)
    if not valido:
        return 0, mensaje
    
     #TAMAÑO DEL ROSTRO
    valido, mensaje = tam_rostro(imagen_recortada.shape, face_landmarks)
    if not valido:
        return 0, mensaje 
    
    # CRENTRADO DEL ROSTRO
    #valido, mensaje = rostro_centrado(imagen_recortada.shape, face_landmarks)
    #if not valido:
    #    return 0, mensaje 
    
    # --- DETECTOR DE SEGMENTACION ---
    category_mask, confidence_mask = detector_segmentacion(imagen_recortada)

    # CABELLO
    #valido, mensaje = cabello(category_mask)
    #if not valido:
    #    return 0, mensaje 

    # FONDO BLANCO
    imagen_procesada = fondo_blanco(imagen_recortada, category_mask, confidence_mask)

    #CRITERIOS DE ACCESORIOS
    #valido, mensaje = accesorios(imagen_procesada)
    #if not valido:
    #    return 0, mensaje 
    
    
    # --- DETECTOR DE LANDMARKS DE POSTURA ---
    
    #imagen_result = detector_pose_landmarks(imagen_procesada)

    #if isinstance(imagen_result, tuple):
        #return imagen_result

    #pose_landmarks = imagen_result.pose_landmarks[0]
    
    # POSTURA
    #valido, mensaje = postura(pose_landmarks)
    #if not valido:
        #return 0, mensaje

    # --- CRITERIOS PARA LA FOTO ---
    
    # OJOS ABIERTOS
    valido, mensaje = ojos_abiertos(imagen_procesada.shape, face_landmarks)
    if not valido:
        return 0, mensaje 
    
    # MIRADA FRONTAL
    valido, mensaje = mirada_frontal(face_landmarks)
    if not valido:
        return 0, mensaje 
    
    # MIRADA FRONTAL
    valido, mensaje = expresion_neutral(imagen_procesada.shape, face_landmarks)
    if not valido:
        return 0, mensaje 
    
     # --- RESULTADO FINAL ---
    _, buffer = cv2.imencode(".jpg", imagen_procesada)

    return 1, buffer.tobytes()




def validacion(imagen_bytes):

    nparr = np.frombuffer(imagen_bytes, np.uint8)

    imagen_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if imagen_bgr is None:
        return 0, "No se pudo cargar la imagen"

    # --- CRITERIOS TECNICOS PRE-RECORTE ---

    # RESOLUCION, DIMENSIONES, FORMATO DE COLOR
    for funcion in [resolucion, dimensiones, formato_color]:
        valido, mensaje = funcion(imagen_bgr if funcion != resolucion else imagen_bytes)
        if not valido:
            return 0, mensaje
        
    # --- DETECTOR DE ROSTRO ---
    imagen_result = detector_face(imagen_bgr)
    
    if isinstance(imagen_result, tuple):
        return imagen_result

    face_landmarks = imagen_result.face_landmarks[0]

    imagen_bgr = rotar(imagen_bgr, face_landmarks)

    imagen_result = detector_face_landmarks(imagen_bgr)
    
    if isinstance(imagen_result, tuple):
        return imagen_result

    face_landmarks = imagen_result.face_landmarks[0]

    # --- RECORTE ---
    imagen_recortada = recortar_foto(imagen_bgr, face_landmarks)

    if imagen_recortada is None:
        return 0, "Error al procesar la imagen, procura que la foto esté bien orientada"
    
    # --- CRITERIOS TECNICOS PORST-RECORTE ---
    # ILUMINACION
    valido, mensaje = iluminacion_foto(imagen_recortada)
    if not valido:
        return 0, mensaje
    
    # NITIDEZ
    valido, mensaje = nitidez(imagen_recortada)
    if not valido:
        return 0, mensaje
    
    # --- DETECTOR DE SEGMENTACION ---
    category_mask, confidence_mask = detector_segmentacion(imagen_recortada)

    # FONDO BLANCO
    imagen_segmentada = fondo_blanco(imagen_recortada, category_mask, confidence_mask)
    
    #CRITERIOS DE ACCESORIOS
    valido, mensaje = accesorios(imagen_segmentada)
    if not valido:
        return 0, mensaje 
    
    # REDETECTAR landmarks CON LA IMAGEN SEGMENTADA

    face_landmarks = detector_face_landmarks(imagen_bgr)
    
    # ------------------------------------
    # --- CRITERIOS PARA LA FOTO ---
    # ------------------------------------
    
    # TAMAÑO DE LA CABEZA
    valido, mensaje = tam_rostro(face_landmarks, imagen_segmentada.shape)
    if not valido:
        return 0, mensaje 
    
    # POSTURA
    #valido, mensaje = postura_recta(pose_landmarks)
    #if not valido:
    #    return 0, mensaje 
    
    # OJOS ABIERTOS
    #valido, mensaje = ojos_abiertos(face_landmarks, imagen_segmentada.shape)
    #if not valido:
    #    return 0, mensaje 
    
    # MIRADA FRONTAL
    #valido, mensaje = mirada_frontal(face_landmarks)
    #if not valido:
    #    return 0, mensaje 
    
    # MIRADA FRONTAL
    valido, mensaje = expresion_neutral(face_landmarkss, imagen_segmentada.shape)
    if not valido:
        return 0, mensaje 
    
    # CABELLO
    #valido, mensaje = cabello(category_mask)
    #if not valido:
    #    return 0, mensaje    
     
    
    #for funcion in []:
    #    valido, mensaje = funcion(face_landmarks, imagen_recortada.shape)
    #    if not valido:
   
    # --------------------------
    # --- RESULTADO FINAL ---
    # --------------------------
    _, buffer = cv2.imencode(".jpg", imagen_segmentada)
    
    return 1, buffer.tobytes()