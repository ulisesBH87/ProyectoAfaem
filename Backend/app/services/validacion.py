import cv2
import numpy as np
import base64

from .face_detector import *

from .recorte import *

from .tecnico import *

from .face import *


# =====================================
# FUNCION PRINCIPAL PARA LA DETECCIÓN DE ROSTROS EN IMÁGENES
# =====================================
def validacion_fotografia(imagen_bytes):

    nparr = np.frombuffer(imagen_bytes, np.uint8)
    imagen_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if imagen_bgr is None:
        return 0, "No se pudo cargar la imagen"

    # Validaciones técnicas
    for funcion in [resolucion, dimensiones, formato_color]:
        valido, mensaje = funcion(imagen_bgr if funcion != resolucion else imagen_bytes)
        if not valido:
            return 0, mensaje

    # Detector
    detector = face_detector()

    imagen_rgb = cv2.cvtColor(imagen_bgr, cv2.COLOR_BGR2RGB)
    mp_imagen = mp.Image(
        image_format=mp.ImageFormat.SRGB,
        data=imagen_rgb
    )

    result = detector.detect(mp_imagen)

    #Detecta si hay 0 o mas de 2 rostros
    if not result.face_landmarks:
        return 0, "No se detectó rostro"

    if len(result.face_landmarks) != 1:
        return 0, "Debe haber solo un rostro"

    landmarks = result.face_landmarks[0]
    
    # Recorte
    imagen_recortada = recortar_foto(imagen_bgr, landmarks)

    if isinstance(imagen_recortada, tuple):
        return imagen_recortada


    # Validaciones técnicas post-recorte
    valido, mensaje = iluminacion(landmarks, imagen_recortada)
    if not valido:
        return 0, mensaje
    
    valido, mensaje = nitidez(imagen_recortada)
    if not valido:
        return 0, mensaje

    # Redetectar landmarks
    rgb_imagen = cv2.cvtColor(imagen_recortada, cv2.COLOR_BGR2RGB)
    imagen_mp = mp.Image(
        image_format=mp.ImageFormat.SRGB,
        data=rgb_imagen
    )

    result = detector.detect(imagen_mp)

    if not result.face_landmarks:
        return 0, "Error al recalcular rostro"

    landmarks = result.face_landmarks[0]

    # Validaciones faciales

    # Validaciones técnicas post-recorte
    for funcion in [tam_rostro]:
        valido, mensaje = funcion(landmarks, imagen_recortada.shape)
        if not valido:
            return 0, mensaje
    
    
    """
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

    _, buffer = cv2.imencode(".jpg", imagen_recortada)
    return 1, buffer.tobytes()



# =====================================
# FUNCION PARA LA EXTRACCION DE ROSTRO EN PDF
# =====================================
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

