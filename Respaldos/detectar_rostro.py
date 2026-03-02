# =====================================
# DETECTOR DE ROSTROS CON FACE DETECTOR
# =====================================

# Importar la biblioteca OpenCV para procesamiento de imágenes
import cv2
# Importar el módulo os para manejar rutas de archivos
import os
# Importar la biblioteca MediaPipe para detección de rostros
import mediapipe as mp
# Importar la biblioteca NumPy para manejo de arreglos
import numpy as np
# Importar la clase BaseOptions
from mediapipe.tasks import python
# Importar la clase FaceDetector
from mediapipe.tasks.python import vision
# Importar la biblioteca PyMuPDF para manejar archivos PDF
import fitz
# Importar para codificar y decodificar datos en formato base64
import base64


# =====================================
# CONFIGURACIÓN DE RUTA DEL MODELO
# =====================================
# Obtener la ruta absoluta del directorio actual
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Construir ruta al modelo
model_path = os.path.join(BASE_DIR, "..", "models", "blaze_face_short_range.tflite")
# Normalizar la ruta
model_path = os.path.abspath(model_path)


# =====================================
# PROCESO DEL DETECTOR DE ROSTROS
# =====================================
def detector():
     # Inicializar detector de rostros
    BaseOptions = mp.tasks.BaseOptions
    FaceDetector = mp.tasks.vision.FaceDetector
    FaceDetectorOptions = mp.tasks.vision.FaceDetectorOptions
    VisionRunningMode = mp.tasks.vision.RunningMode

    # Crear una instancia de detector de rostros con el modo de imagen:
    options = FaceDetectorOptions(
        base_options=BaseOptions(model_asset_path=model_path),
        running_mode=VisionRunningMode.IMAGE,
        min_detection_confidence=0.5,      # Mayor confianza para reducir falsos positivos
        min_suppression_threshold=0.5       # Controla detecciones superpuestas
    )
 
    return FaceDetector.create_from_options(options)


# =====================================
# PROCESO DE DETECCIÓN DE ROSTROS EN IMÁGENES
# =====================================
def detectar_rostro_imagen(imagen_bytes):

    # Convertir bytes a imagen
    nparr = np.frombuffer(imagen_bytes, np.uint8) # Convertir bytes a un arreglo de NumPy
    imagen_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR) # Decodificar la imagen a formato BGR (formato predeterminado de OpenCV)

    # Verificar si la imagen se cargó correctamente
    if imagen_bgr is None:
        print("No se pudo cargar la imagen desde bytes")
        return False  # No se pudo cargar la imagen, retornar False
    
    
    imagen_rgb = cv2.cvtColor(imagen_bgr, cv2.COLOR_BGR2RGB) # Convertir la imagen de BGR a RGB (formato requerido por MediaPipe)
    
    # Crear una imagen de MediaPipe a partir de la imagen RGB
    mp_imagen = mp.Image( 
        image_format=mp.ImageFormat.SRGB, # Especificar el formato de la imagen como RGB
        data=imagen_rgb
    )
    
    detector_instance = detector()  # Crear detector
    result = detector_instance.detect(mp_imagen)  # Detectar rostros


    # Detectar el numero de rostros detectados
    rostros_validos = 0
    if result.detections:
        for detection in result.detections:
            box = detection.bounding_box
            # Filtrar rostros demasiado pequeños
            if box.width < 0.1 or box.height < 0.1:
                continue
            rostros_validos += 1

    return rostros_validos  # Retornar el número de rostros válidos detectados


# =====================================
# PROCESO DE EXTRACCION DE ROSTRO EN PDF
# =====================================
def detectar_rostro_pdf(pdf_bytes):
    
    pdf_documents = fitz.open(stream=pdf_bytes, filetype="pdf")  # Abrir el PDF desde los bytes
    
    # Variable para contar el número total de rostros detectados
    imagen_valida = None
    tipo_imagen = None
    total_rostros = 0

    for pagina in pdf_documents:
        imagenes = pagina.get_images(full=True)  # Obtener todas las imágenes de la página
        
        for img in imagenes:
            xref = img[0]  # Obtener el xref de la imagen
            base_imagen = pdf_documents.extract_image(xref)  # Extraer la imagen usando el xref
           
            imagen_bytes = base_imagen["image"]  # Obtener los bytes de la imagen
            extension = base_imagen["ext"]  # Obtener la extensión de la imagen
            
            # Detectar rostros en la imagen extraída
            rostros = detectar_rostro_imagen(imagen_bytes)

            # Sumar el número de rostros detectados en esta imagen al total
            if rostros > 0:
                total_rostros += rostros # Incrementar el contador de rostros detectados
                imagen_valida = imagen_bytes  # Guardar la imagen válida (con rostros detectados)
                tipo_imagen = f"image/{extension}"  # Definir el tipo de imagen basado en la extensión  
        
            ##if detectar_rostro_imagen(imagen_bytes):
              ##  return True  # Si se detecta un rostro, retornar True

    #Convertir imagen a base64 si es valida
    imagen_base64 = None

    if total_rostros == 1 and imagen_valida:
        imagen_base64 = base64.b64encode(imagen_valida).decode('utf-8')  # Codificar la imagen válida a base64
    
    return total_rostros, imagen_base64, tipo_imagen  # Retornar el número total de rostros detectados en el PDF y la imagen base64 si existe