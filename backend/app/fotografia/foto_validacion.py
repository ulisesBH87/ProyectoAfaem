import cv2
import numpy as np
import base64
import fitz


from .foto_detector import *
from .foto_criterios import *


# FUNCION PRINCIPAL PARA LA DETECCIÓN DE ROSTROS EN IMÁGENES
def validacion_fotografia(imagen_bytes):

    nparr = np.frombuffer(imagen_bytes, np.uint8)

    imagen_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if imagen_bgr is None:
        return 0, "No se pudo cargar la imagen"

    # CRITERIOS TECNICOS PRE-RECORTE
    for funcion in [resolucion, dimensiones, formato_color]:
        valido, mensaje = funcion(imagen_bgr if funcion != resolucion else imagen_bytes)
        if not valido:
            return 0, mensaje
        
    # --------------------------
    # --- DETECTOR DE POSICION DE FOTO ---
    # --------------------------   
        
    # --------------------------
    # --- DETECTOR DE LANDMARKS ---
    # --------------------------
    face = get_face_detector()

    # DETECTAR LANDMARKS DEL ROSTRO
    imagen_rgb = cv2.cvtColor(imagen_bgr, cv2.COLOR_BGR2RGB)
    
    mp_imagen = mp.Image(
        image_format = mp.ImageFormat.SRGB,
        data = imagen_rgb
    )

    imagen_result = face.detect(mp_imagen)

    # DETECTAR SI HAY 0 O MAS DE 2 ROSTROS
    if not imagen_result.face_landmarks:
        return 0, "No se detectó rostro"

    if len(imagen_result.face_landmarks) != 1:
        return 0, "Debe haber solo un rostro"

    landmarks = imagen_result.face_landmarks[0]
    
    # RECORTE
    imagen_recortada = recortar_foto(imagen_bgr, landmarks)

    if isinstance(imagen_recortada, tuple):
        return imagen_recortada

    # CRITERIOS TECNICOS PORST-RECORTE
    valido, mensaje = iluminacion(landmarks, imagen_recortada)
    if not valido:
        return 0, mensaje
    
    valido, mensaje = nitidez(imagen_recortada)
    if not valido:
        return 0, mensaje
    
    
    #CRITERIOS DE ACCESORIOS

    valido, mensaje = accesorios(imagen_recortada)
    if not valido:
        return 0, mensaje 
    
    #valido, mensaje = manchas(imagen_recortada)
    #if not valido:
    #    return 0, mensaje
    
    # REDETECTAR LANDMARKS DEL ROSTRO
    face_imagen_rgb = cv2.cvtColor(imagen_recortada, cv2.COLOR_BGR2RGB)

    face_mp_imagen = mp.Image(
        image_format = mp.ImageFormat.SRGB,
        data = face_imagen_rgb
    )

    face_result = face.detect(face_mp_imagen)

    if not face_result.face_landmarks:
        return 0, "Error al recalcular rostro"

    face_landmarks = face_result.face_landmarks[0]

    # --------------------------
    # --- DETECTOR DE POSTURA ---
    # --------------------------
    pose = get_pose_detector()

     # DETECTAR LANDMARKS DE LA POSTURA
    pose_imagen_rgb = cv2.cvtColor(imagen_recortada, cv2.COLOR_BGR2RGB)
    
    pose_mp_imagen = mp.Image(
        image_format = mp.ImageFormat.SRGB,
        data = pose_imagen_rgb
    )

    pose_result = pose.detect(pose_mp_imagen)

    if not pose_result.pose_landmarks:
        return 0, "Error al recalcular rostro"
    
    pose_landmarks = pose_result.pose_landmarks[0]
    
    # --------------------------
    # --- DETECTOR DE SEGMENTACION ---
    # --------------------------
    segmentacion = get_segmentacion_detector()

     # DETECTAR LANDMARKS DE LA SEGMENTACION 
    segmentacion_imagen_rgb = cv2.cvtColor(imagen_recortada, cv2.COLOR_BGR2RGB)
    
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

    # ------------------------------------
    # --- CRITERIOS PARA LA FOTO ---
    # ------------------------------------
    
    # TAMAÑO DE LA CABEZA
    valido, mensaje = tam_rostro(face_landmarks, imagen_recortada.shape)
    if not valido:
        return 0, mensaje 
    
    # POSTURA
    valido, mensaje = postura_recta(pose_landmarks)
    if not valido:
        return 0, mensaje 
    
    # OJOS ABIERTOS
    valido, mensaje = ojos_abiertos(face_landmarks, imagen_recortada.shape)
    if not valido:
        return 0, mensaje 
    
    # MIRADA FRONTAL
    valido, mensaje = mirada_frontal(face_landmarks)
    if not valido:
        return 0, mensaje 
    
    # EXPRESION NEUTRA
    valido, mensaje = ojos_abiertos(face_landmarks, imagen_recortada.shape)
    if not valido:
        return 0, mensaje 
    
    for funcion in []:
        valido, mensaje = funcion(face_landmarks)
        if not valido:
            return 0, mensaje
        
    # CABELLO
    valido, mensaje = cabello(category_mask)
    if not valido:
        return 0, mensaje    
     
    """
    for funcion in []:
        valido, mensaje = funcion(face_landmarks, imagen_recortada.shape)
        if not valido:
            return 0, mensaje
    """   

    """
    # VALIDACIONES FACIALES
    valido, mensaje = frontal(landmarks)
    if not valido:
        return 0, mensaje
    
    #El rotro no esta derecho
    if not inclinacion_vertical(landmarks):
        return 0, "El rostro no esta de manera vertical"
    
    # Cabeza ladeada
    if not cabeza_ladeada(landmarks):
        return 0, "El rostro no esta frontal"
    
    # Cara frontal
    if not frontal(landmarks):
        return 0, "El rostro no esta frontal"
    

    # Ojos abiertos
    if not ojos_abiertos(landmarks, imagen_recortada.shape):
        return 0, "Los ojos están cerrados"

    # Expresion neutra    
    if not expresion_neutra(landmarks, imagen_recortada.shape):
        return 0, "Expresión no neutra"
    """
   
    # FONDO BLANCO
    foto_valida = fondo_blanco(imagen_recortada, category_mask, confidence_mask)


    # --------------------------
    # --- RESULTADO FINAL ---
    # --------------------------
    _, buffer = cv2.imencode(".jpg", foto_valida)
    
    return 1, buffer.tobytes()
 
 # FUNCION PARA LA EXTRACCION DE ROSTRO EN PDF
def detectar_rostro_pdf(pdf_bytes):
    
    pdf_documents = fitz.open(stream=pdf_bytes, filetype="pdf")  # Abrir el PDF desde los bytes
    
    # Variable para contar el número total de rostros detectados
    total_rostros = 0
    imagen_valida = None
    tipo_imagen = None
    razon_no_valido = None

    for pagina in pdf_documents:
        imagenes = pagina.get_images(full = True)  # Obtener todas las imágenes de la página
        
        for img in imagenes:
            xref = img[0]  # Obtener el xref de la imagen
            base_imagen = pdf_documents.extract_image(xref)  # Extraer la imagen usando el xref
           
            imagen_bytes = base_imagen["image"]  # Obtener los bytes de la imagen
            extension = base_imagen["ext"]  # Obtener la extensión de la imagen
            
            # Detectar rostros en la imagen extraída
            valido, razon = validacion_fotografia(imagen_bytes)

            
            # Solo aceptar la primera imagen válida
            if valido == 1 and total_rostros == 0:
                total_rostros = 1
                imagen_valida = imagen_bytes
                tipo_imagen = f"image/{extension}"
            elif valido > 1:
                razon_no_valido = "Se detectaron múltiples rostros"
            elif valido == 0:
                razon_no_valido = razon

            ##if detectar_rostro_imagen(imagen_bytes):
              ##  return True  # Si se detecta un rostro, retornar True

    #Convertir imagen a base64 si es valida
    imagen_base64 = None

    if total_rostros == 1 and imagen_valida:
        imagen_base64 = base64.b64encode(imagen_valida).decode('utf-8')  # Codificar la imagen válida a base64
    
    return total_rostros, imagen_base64, tipo_imagen, razon_no_valido # Retornar el número total de rostros detectados en el PDF y la imagen base64 si existe

