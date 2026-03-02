# =====================================
# DETECTOR DE ROSTROS CON FACE LANDMARKER
# =====================================
import cv2
import os
import fitz
import mediapipe as mp
import numpy as np
import base64
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from math import acos, degrees


detector_instance = None  # Crear detector


# =====================================
# CONFIGURACIÓN DE RUTA DEL MODELO
# =====================================
# Obtener la ruta absoluta del directorio actual
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Construir ruta al modelo
model_path = os.path.join(BASE_DIR, "..", "models", "face_landmarker.task")
# Normalizar la ruta
model_path = os.path.abspath(model_path)

# =====================================
# FUNCION DE DETECTOR
# =====================================
def detector():
     # Inicializar detector de rostros
    BaseOptions = mp.tasks.BaseOptions
    FaceLandmarker = mp.tasks.vision.FaceLandmarker
    FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
    VisionRunningMode = mp.tasks.vision.RunningMode

    # Crear una instancia de detector de rostros con el modo de imagen:
    options = FaceLandmarkerOptions (
        base_options = BaseOptions(model_asset_path=model_path),
        running_mode = VisionRunningMode.IMAGE,
        #num_faces = 1,                           # Cantidad de rostros maximos para evaluar
        min_face_detection_confidence = 0.7,    # Mayor confianza para la deteccion de rostros sea exitosa
        min_face_presence_confidence = 0.7      # Controla detecciones superpuestas
    )
 
    return FaceLandmarker.create_from_options(options)

# =====================================
# FUNCION RELACION DE ASPECTO OCULAR (EAR)
# =====================================
def EAR(landmarks, indices, image_shape):
    """
    Calcula la relación altura/ancho del ojo (Eye Aspect Ratio) para detectar ojos cerrados.

    indices: lista de 6 índices del ojo según MediaPipe
    image_shape: tuple (height, width)
    """

    h, w = image_shape[:2] # convertir normalizado a píxeles

    # Convertir coordenadas normalizadas a píxeles
    ojo = [(int(landmarks[i].x * w), int(landmarks[i].y * h)) for i in indices]

    # Distancias verticales
    a = np.linalg.norm(np.array(ojo[1]) - np.array(ojo[5]))
    b = np.linalg.norm(np.array(ojo[2]) - np.array(ojo[4]))

    # Distancia horizontal
    c = np.linalg.norm(np.array(ojo[0]) - np.array(ojo[3]))

    # EAR
    ear = (a + b) / (2.0 * c)

    return ear

# =====================================
# FUNCION PARA DETECTAR OJOR ABIERTOS
# =====================================

def ojos_abiertos(landmarks, image_shape):

    # Indices MediaPipe para cada ojo (ajustar si es necesario)
    indice_izq = [362, 385, 387, 263, 373, 380]
    indice_der = [33, 160, 158, 133, 153, 144]

    ear_izq = EAR(landmarks, indice_izq, image_shape)
    ear_der = EAR(landmarks, indice_der, image_shape)

    ear_prom = (ear_izq + ear_der) / 2
    diferencia = abs(ear_izq - ear_der)
    #Validacion por ejo
    #if debug_image is not None:
    #    h, w = image_shape[:2]
    #    for idx in indice_izquierdo + indice_derecho:
    #        x, y = int(landmarks[idx].x * w), int(landmarks[idx].y * h)
    #        cv2.circle(debug_image, (x, y), 2, (0, 255, 0), -1)
    
    #Validación en total (mas facil)
    # ear_promedio = (ear_izq + ear_der) / 2
    # ear_val = ear_promedio > 0.2 #Umbral de ojos cerrados
    # return ear_val

    """
    UMBRAL = 0.21
    DIF_MAXIMA = 0.08

    ojo_izq_abierto = ear_izq > UMBRAL
    ojo_der_abierto = ear_der > UMBRAL

    # diferencia entre ojos
    diferencia = abs(ear_izq - ear_der)

    if ojo_izq_abierto and ojo_der_abierto:
        return True

    # Si solo uno está abierto pero la diferencia es pequeña
    if (ojo_izq_abierto or ojo_der_abierto) and diferencia < DIF_MAXIMA:
        return True

    return False
    """
    """
    UMBRAL  = 0.20  # puedes ajustar entre 0.20 y 0.22

    ojo_izq_abierto = ear_izq > UMBRAL
    ojo_der_abierto = ear_der > UMBRAL

    # Aceptar si al menos un ojo está abierto
    if ojo_izq_abierto or ojo_der_abierto:
        return True
    else:
        return False
    """
    EAR_MIN = 0.12      # Solo si está prácticamente cerrado
    EAR_MAX = 0.40          # Evita ojos exageradamente abiertos
    DIF_MAX = 0.22          # Permite asimetría natural


    # 1No aceptar si ambos están cerrados
    if ear_izq < EAR_MIN and ear_der < EAR_MIN:
        return False

    # No aceptar si están exageradamente abiertos
    if ear_prom > EAR_MAX:
        return False

    # No aceptar si la diferencia es extrema (guiño forzado)
    if diferencia > DIF_MAX:
        return False
    
    return True

# =====================================
# FUNCION PARA DETECTAR OJOS FORNTALES
# =====================================
def mirada_frontal(landmarks):

    if len(landmarks) < 474:
        return True  # Si no hay iris, no bloquear validación

    def horizontal(ojo_izq, ojo_der, iris):
        ancho = ojo_der[0] - ojo_izq[0]
        if abs(ancho) < 1e-6:
            return 0.5
        return (iris[0] - ojo_izq[0]) / ancho

    # OJO DERECHO
    ojo_der_izq = np.array([landmarks[33].x, landmarks[33].y])
    ojo_der_der = np.array([landmarks[133].x, landmarks[133].y])
    iris_der = np.array([landmarks[468].x, landmarks[468].y])

    # OJO IZQUIERDO
    ojo_izq_izq = np.array([landmarks[362].x, landmarks[362].y])
    ojo_izq_der = np.array([landmarks[263].x, landmarks[263].y])
    iris_izq = np.array([landmarks[473].x, landmarks[473].y])

    derecho = horizontal(ojo_der_izq, ojo_der_der, iris_der)
    izquierdo = horizontal(ojo_izq_izq, ojo_izq_der, iris_izq)

    LIMITE_MIN = 0.30
    LIMITE_MAX = 0.70

    ojo_der_centrado = LIMITE_MIN < derecho < LIMITE_MAX
    ojo_izq_centrado = LIMITE_MIN < izquierdo < LIMITE_MAX

    diferencia = abs(derecho - izquierdo)

    # 🔹 Regla inclusiva
    if ojo_der_centrado and ojo_izq_centrado:
        return True

    # 🔹 Si solo uno está centrado pero no hay desviación extrema
    if (ojo_der_centrado or ojo_izq_centrado) and diferencia < 0.4:
        return True

    return False

# =====================================
# FUNCION RELACION  DE ASPECTO DE LA BOCA (MAR)
# =====================================
def MAR(landmarks, image_shape):
    """
    Calcula la relación apertura/cierre de la boca (Mouth Aspect Ratio).
    
    indices: lista de 8-10 índices de la boca según MediaPipe
    """
    """
    h, w = image_shape[:2]
    boca = [(int (landmarks[i].x * w), int(landmarks[i].y * h)) for i in indices]

    #Distacia vetical
    a = np.linalg.norm(np.array(boca[2]) - np.array(boca[6]))
    b = np.linalg.norm(np.array(boca[3]) - np.array(boca[5]))

    #Dictancia horizontal
    c = np.linalg.norm(np.array(boca[0]) - np.array(boca[4]))

    if c < 1e-6:
        return 0, 0
    
    mar = (a+b) / (2.0 * c)
    """
    h, w = image_shape[:2]

    # === PUNTOS CLAVE DE LA BOCA ===

    #Horizontal
    comisura_izq = landmarks[61]
    comisura_der = landmarks[291]

    #Vertical principal
    labio_sup = landmarks[13]
    labio_inf = landmarks[14]

    #Vertical secundaria
    labio_sup_sec = landmarks[82]
    labio_inf_sec = landmarks[87]

    # === Convertir coordenadas normalizadas a píxeles ===
    comisura_izq = np.array([comisura_izq.x * w, comisura_izq.y * h])
    comisura_der = np.array([comisura_der.x * w, comisura_der.y * h])
    labio_sup = np.array([labio_sup.x * w, labio_sup.y * h])
    labio_inf = np.array([labio_inf.x * w, labio_inf.y * h])
    labio_sup_sec = np.array([labio_sup_sec.x * w, labio_sup_sec.y * h])
    labio_inf_sec = np.array([labio_inf_sec.x * w, labio_inf_sec.y * h])

     # === Cálculo de distancias ===
    vertical1 = np.linalg.norm(labio_sup - labio_inf)
    vertical2 = np.linalg.norm(labio_sup_sec - labio_inf_sec)
    horizontal = np.linalg.norm(comisura_izq - comisura_der)

    if horizontal < 1e-6:
        return False
    

     # Promedio de distancias
    mar = (vertical1 + vertical2) / (2 * horizontal)
    
    return mar

def expresion_neutra(landmarks, image_shape):

    mar = MAR(landmarks, image_shape)

    # ===== Boca cerrada =====
    boca_cerrada = mar < 0.42

    # ===== Detectar sonrisa =====
    h, w = image_shape[:2]

    # ===== Comisuras =====
    comisura_izq = np.array([landmarks[61].x * w, landmarks[61].y * h])

    comisura_der = np.array([landmarks[291].x * w, landmarks[291].y * h])

    ancho_boca = np.linalg.norm(comisura_izq - comisura_der)

    # ===== Ancho del rostro =====
    mejilla_izq = np.array([landmarks[234].x * w, landmarks[234].y * h])

    mejilla_der = np.array([landmarks[454].x * w, landmarks[454].y * h])

    ancho_rostro = np.linalg.norm(mejilla_izq - mejilla_der)

    if ancho_rostro < 1e-6:
        return False
    
    
    sonrisa = ancho_boca / ancho_rostro
    #no_sonrisa = sonrisa < 0.48  # Ajustable

    #no_sonrisa = sonrisa < 0.48  # Ajustable

     # ========= UMBRALES =========
    MAR_MAX_NEUTRO = 0.38       # Boca cerrada o apenas abierta
    SONRISA_MAX = 0.48          # No ensanchamiento de sonrisa

    boca_cerrada = mar < MAR_MAX_NEUTRO
    no_sonrisa = sonrisa < SONRISA_MAX

    return boca_cerrada and no_sonrisa
    
    # ====== Resultado final ======
    #expresion_neutra = boca_cerrada and no_sonrisa

    #return expresion_neutra
    
    #return False
    
    
# =====================================
# FUNCION PARA ROSTRO FRONTAL
# =====================================
def es_frontal(landmarks, tolerancia_ojos_y = 0.04, tolerancia_nariz_x = 0.05, tolerancia_angulo=7):

    # Altura de ojor (promedio) eje Y
    ojo_izq = np.mean([[landmarks[i].x, landmarks[i].y] for i in [362, 385, 387, 263, 373, 380]], axis=0)
    ojo_der = np.mean([[landmarks[i].x, landmarks[i].y] for i in [33, 160, 158, 133, 153, 144]], axis=0)
    nariz = np.array([landmarks[1].x, landmarks[1].y])

    # Diferencia vertical entre ojos
    #dif_ojos_y = abs(ojo_izq[1] - ojo_der[1]) #Diferencia vertival entre ojos
    
    # Diferencia horizontal de la nariz respecto al centro entre ojos
    #centro_ojos_x = (ojo_izq[0] + ojo_der[0]) / 2
    #dif_nariz = abs(nariz[0] - centro_ojos_x)

    # Ángulo de inclinación de cabeza
    angulo = np.arctan2(ojo_der[1] - ojo_izq[1], ojo_der[0] - ojo_izq[0])
    #angle_deg = np.degrees(angle)

    """
    # p1 : ojo izquerdo - p2: ojo derecho
    p1  = np.array(ojo_der)
    p2 = np.array(ojo_izq)

    # p3 : proyeccion de p1 y p2
    p3 = np.array([p2[0], p1[1]])

    #Distancia
    hipotenusa = np.linalg.norm(p1 - p2)
    cateto_horizontal = np.linalg.norm(p1 - p3)

    if hipotenusa < 1e-6:
        return False
    
    ratio = cateto_horizontal / hipotenusa
    ratio = max(min(ratio, 1.0), -1.0)
    angulo = degrees(acos(ratio))
    """

    # Diferencia vertical entre ojos
    dif_ojos_y = abs(ojo_izq[1] - ojo_der[1])

    # Diferencia horizontal de la nariz respecto al centro entre ojos
    centro_ojos_x = (ojo_izq[0] + ojo_der[0]) / 2
    dif_nariz = abs(nariz[0] - centro_ojos_x)
    

    if dif_ojos_y <= tolerancia_ojos_y and abs(angulo) <= tolerancia_angulo  and dif_nariz <= tolerancia_nariz_x:   
        return True
    else:
        return False

# =====================================
# PROCESO DE DETECCIÓN DE ROSTROS EN IMÁGENES
# =====================================
def detectar_rostro_imagen(imagen_bytes):

    # Convertir bytes a imagen
    nparr = np.frombuffer(imagen_bytes, np.uint8) # Convertir bytes a un arreglo de NumPy
    imagen_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR) # Decodificar la imagen a formato BGR (formato predeterminado de OpenCV)

    # Verificar si la imagen se cargó correctamente
    if imagen_bgr is None:
        return 0, "No se pudo cargar la imagen desde bytes" 
    
    
    imagen_rgb = cv2.cvtColor(imagen_bgr, cv2.COLOR_BGR2RGB) # Convertir la imagen de BGR a RGB (formato requerido por MediaPipe)
      
    # Crear una imagen de MediaPipe a partir de la imagen RGB
    mp_imagen = mp.Image( 
        image_format = mp.ImageFormat.SRGB, # Especificar el formato de la imagen como RGB
        data = imagen_rgb
    )

    global detector_instance
    if detector_instance is None:
        detector_instance = detector()

    result = detector_instance.detect(mp_imagen)  # Detectar rostros
    
    # Limitar a un solo rostro
    if not result.face_landmarks:
        return 0, "No se detectó ningún rostro"
    if len(result.face_landmarks) != 1:
        return 0, "Se detectaron múltiples rostros"

    #======== FUNCIONES ========#

    # Tomar el único rostro
    landmarks = result.face_landmarks[0]
    
    #validar ojos
    ojos_ok = ojos_abiertos(landmarks, imagen_bgr.shape)

    #Validar ojos
    #mirada_ok = mirada_frontal(landmarks)
    mirada_ok = True

    #Validar frontal
    frontal_ok = es_frontal(landmarks)

    #Validar expresion
    expresion_seria = expresion_neutra(landmarks, imagen_bgr.shape)

    if ojos_ok and mirada_ok  and frontal_ok and expresion_seria:
        return 1, None
    else:
        # Guardar la razón por la que no es válido
        if not ojos_ok:
            return 0,  "Los ojos están cerrados"
        elif not mirada_ok:
            return 0, "Se debe mirar al frente"
        elif not frontal_ok:
            return 0,  "La rostro no esta de manera frontal"
        elif not expresion_seria:
            return 0, "La expresion no es neutra"

# =====================================
# PROCESO DE EXTRACCION DE ROSTRO EN PDF
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
            valido, razon = detectar_rostro_imagen(imagen_bytes)

            
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