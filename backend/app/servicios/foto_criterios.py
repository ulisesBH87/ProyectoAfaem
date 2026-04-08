import cv2
import io
import numpy as np
from PIL import Image
import math

from .foto_detector import *

# FUNCION PARA ENCUADRAR EL ROSTRO
def bbox_rostro(imagen_shape, face_landmarks):
    if not face_landmarks:
        return None

    h, w = imagen_shape[:2]

    xs = [int(p.x * w) for p in face_landmarks]
    ys = [int(p.y * h) for p in face_landmarks]

    #Liminaciones del rostro
    x_min, x_max = min(xs), max(xs)
    y_min, y_max = min(ys), max(ys)

    return x_min, y_min, x_max, y_max

# FUNCION RELACION DE ASPECTO OCULAR (EAR)
def EAR(image_shape, face_landmarks, indices):
    """
    Calcula la relación altura/ancho del ojo (Eye Aspect Ratio) para detectar ojos cerrados.

    indices: lista de 6 índices del ojo según MediaPipe
    image_shape: tuple (height, width)
    """

    h, w = image_shape[:2] # convertir normalizado a píxeles
    
    # Convertir coordenadas normalizadas a píxeles
    ojo = [(int(face_landmarks[i].x * w), int(face_landmarks[i].y * h)) for i in indices]

    # Distancias verticales
    a = np.linalg.norm(np.array(ojo[1]) - np.array(ojo[5]))

    b = np.linalg.norm(np.array(ojo[2]) - np.array(ojo[4]))

    # Distancia horizontal
    c = np.linalg.norm(np.array(ojo[0]) - np.array(ojo[3]))

    # EAR
    ear = (a + b) / (2.0 * c)

    return ear

# FUNCION RELACION DE ASPECTO DE LA BOCA (MAR)
def MAR(image_shape, face_landmarks):
    """
    Calcula la relación apertura/cierre de la boca (Mouth Aspect Ratio).
    
    indices: lista de 8 índices de la boca según MediaPipe
    """
    h, w = image_shape[:2]

    # Puntos clave de la boca

    #Horizontal
    comisura_izq = face_landmarks[61] # P1
    comisura_der = face_landmarks[291] # P4

    #Vertical principal
    labio_sup_centro = face_landmarks[13] # P3
    labio_inf_centro = face_landmarks[14] # P5

    #Vertical secundaria izquierda
    labio_sup_izq = face_landmarks[82] # P2
    labio_inf_izq = face_landmarks[87] # P8

    #Vertical secundaria izquierda
    labio_sup_der = face_landmarks[312] # P4
    labio_inf_der = face_landmarks[317] # P6


    # Convertir coordenadas normalizadas a píxeles
    comisura_izq = np.array([comisura_izq.x * w, comisura_izq.y * h])
    comisura_der = np.array([comisura_der.x * w, comisura_der.y * h])

    labio_sup_centro = np.array([labio_sup_centro.x * w, labio_sup_centro.y * h])
    labio_inf_centro = np.array([labio_inf_centro.x * w, labio_inf_centro.y * h])

    labio_sup_izq = np.array([labio_sup_izq.x * w, labio_sup_izq.y * h])
    labio_inf_izq = np.array([labio_inf_izq.x * w, labio_inf_izq.y * h])

    labio_sup_der = np.array([labio_sup_der.x * w, labio_sup_der.y * h])
    labio_inf_der = np.array([labio_inf_der.x * w, labio_inf_der.y * h])

     # Cálculo de distancias ===

    vertical_izq = np.linalg.norm(labio_sup_izq - labio_inf_izq)

    vertical_centro = np.linalg.norm(labio_sup_centro - labio_inf_centro)

    vertical_der = np.linalg.norm(labio_sup_der - labio_inf_der)
    
    horizontal = np.linalg.norm(comisura_izq - comisura_der)

    
    # Evitar división por cero
    if horizontal < 1e-6:
        return 0.0
    

     # Promedio de distancias
    mar = (vertical_izq + vertical_centro + vertical_der) / (3 * horizontal)
    
    return mar

# =============================
# --- CRITERIOS PRE-RECORTE ---
# =============================

# FUNCION PARA DETECTAR LA RESOLUCION DE LA IMAGEN
def resolucion(imagen_bytes):
    try:

        imagen = Image.open(io.BytesIO(imagen_bytes))

        dpi = imagen.info.get("dpi", None)

        # Si no tiene DPI, no rechazar automáticamente
        if dpi is None:
            return True, "La imagen no tiene DPI definidos, se omite validación."
        
        dpi_x, dpi_y = dpi

        # Validar rango permitido
        if dpi_x < 70 or dpi_y < 70:
            return False, f"DPI demasiado bajo. Minimo de 96 ppp."

        if dpi_x > 301 or dpi_y > 301:
            return False, f"DPI demasiado alto. Maximo de 300 ppp."

        return True, f"DPI válido: {dpi}"

    except Exception:
        return False, "No se pudo leer la resolución de la imagen."
    
# FUNCION PARA DETECTAR TAMAÑO DE LA IMAGEN
def dimensiones(imagen_bgr):

    h, w = imagen_bgr.shape[:2]

    if w < 350 or h < 400:
        return False, "La imagen es demasiado pequeña. Mínimo recomendado 350x400 px."

    return True, ""

# FUNCION PARA DETECTAR LOS BITS
def formato_color(imagen_bgr):

    # Debe ser 8 bits
    if imagen_bgr.dtype != np.uint8:
        return False, "La imagen debe ser de 8 bits."

    # Escala de grises válida
    if len(imagen_bgr.shape) == 2:
        return True, ""

    # Imagen a color válida
    if len(imagen_bgr.shape) == 3 and imagen_bgr.shape[2] == 3:
        return True, ""

    # Rechazar imágenes con canal alfa (RGBA)
    if len(imagen_bgr.shape) == 3 and imagen_bgr.shape[2] == 4:
        return False, "La imagen no debe tener transparencia."

    return False, "Formato de imagen no válido."

    """
    #Se verifica que tenga los coloes (RBG)
    if len(imagen.shape) != 3 or imagen.shape[2] != 3:
        return False, "La imagen no cuenta con la proporcion de colores"
    
    #Verifica que sea por 8 bits por canal
    if imagen.dtype != np.uint8:
        return False, "Sin suficiente profundidad "
    
    return True
    """

# ===========================
# --- POSICION DEL ROSTRO ---
# ===========================

# FUNCION PARA DETECTAR ORIENTACION DE LA FOTO
def rotar(imagen, pose_landmarks):

    h, w = imagen.shape[:2]

    # Obtener puntos clave (índices aproximados para centro de ojos)
    ojo_izq = pose_landmarks[2]
    ojo_der = pose_landmarks[5]
    nariz = pose_landmarks[0]
    
     # Convertir coordenadas normalizadas a píxeles
    ojo_der = (int(ojo_der.x * w), int(ojo_der.y * h))
    ojo_izq = (int(ojo_izq.x * w), int(ojo_izq.y * h))
    nariz = (int(nariz.x * w), int(nariz.y * h))

    # Detectar 180°
    y_ojos = (ojo_izq[1] + ojo_der[1]) / 2   # SOLO eje Y
    y_nariz = nariz[1]

    if y_ojos > y_nariz:
        imagen = cv2.rotate(imagen, cv2.ROTATE_180)

    # Detectar 90°
    dx = abs(ojo_der[0] - ojo_izq[0])
    dy = abs(ojo_der[1] - ojo_izq[1])

    if dy > dx:
        if ojo_der[1] < ojo_izq[1]:
            imagen = cv2.rotate(imagen, cv2.ROTATE_90_COUNTERCLOCKWISE)
        else:
            imagen = cv2.rotate(imagen, cv2.ROTATE_90_CLOCKWISE)
    
    return imagen

# FUNCION PARA LA POSE DE LA PERSONA (PENDIENTE)
def postura(pose_landmarks):

    hombro_izq = pose_landmarks[11]
    hombro_der = pose_landmarks[12]
    nariz = pose_landmarks[0]

    return True, ""

# FUNCION PARA DETECTAR SI EL ROSTRO ESTA EN LA FOTO
def rostro_completo(imagen_bgr, face_landmarks,):

    #Dimensiones demlo alto y lo ancho de la imagen
    h, w = imagen_bgr.shape[:2]

    # Convetirlo a pixeles
    xs = np.array([int(p.x * w) for p in face_landmarks])
    ys = np.array([int(p.y * h) for p in face_landmarks])

    # Bounding box cara
    x_min, x_max = np.min(xs), np.max(xs)
    y_min, y_max = np.min(ys), np.max(ys)

    # Validar el rostro
    margen = int(0.05 * h)

    if y_min <= margen:
        return 0, "La frente está cortada"

    if y_max >= (h - margen):
        return 0, "El mentón está cortado"

    if x_min <= margen:
        return 0, "El lado izquierdo del rostro está cortado"

    if x_max >= (w - margen):
        return 0, "El lado derecho del rostro está cortado"

    # Validacion de landmarks
    puntos_clave = [10, 152, 234, 454] # Frente, menton, mejilla_izq, mejilla_der

    for i in puntos_clave:
        px = int(face_landmarks[i].x * w)
        py = int(face_landmarks[i].y * h)

        if px <= 0 or px >= w or py <= 0 or py >= h:
            return False, "El rostro no está completo"
    """    
    puntos_clave = {
        10: (0,0,255),    # frente
        152: (255,0,0),   # mentón
        234: (0,255,255), # lado izquierdo
        454: (255,0,255)  # lado derecho
    }

    for i, color in puntos_clave.items():
        x = int(face_landmarks[i].x * w)
        y = int(face_landmarks[i].y * h)
        cv2.circle(imagen_bgr, (x, y), 5, color, -1)
    """
   
    return True, ""

# =======================
# --- RECORTE DE FOTO ---
# =======================

# FUNCION PARA RECORTAR LA FOTO AL ROSTRO
def recortar_foto(imagen_bgr, face_landmarks, target_size = (400, 500)):

    #Dimensiones demlo alto y lo ancho de la imagen
    h, w = imagen_bgr.shape[:2]

    # Convetirlo a pixeles
    xs = np.array([int(p.x * w) for p in face_landmarks])
    ys = np.array([int(p.y * h) for p in face_landmarks])

    # Bounding box cara
    x_min_cara, x_max_cara = min(xs), max(xs)
    y_min_cara, y_max_cara = min(ys), max(ys)

    altura_cara = y_max_cara - y_min_cara
    ancho_cara = x_max_cara - x_min_cara
    
    # Expansion
    y_min_final = max(int(y_min_cara - 2.0 * altura_cara), 0)
    y_max_final = min(int(y_max_cara + 1.0 * altura_cara), h)

    x_min_jaw = int(min(face_landmarks[i].x * w for i in [234, 454]))
    x_max_jaw = int(max(face_landmarks[i].x * w for i in [234, 454]))

    margen_lateral = int(0.5 * ancho_cara)

    x_min_final = max(min(x_min_cara, x_min_jaw) - margen_lateral, 0)
    x_max_final = min(max(x_max_cara, x_max_jaw) + margen_lateral, w)
        
    rostro = imagen_bgr[y_min_final:y_max_final, x_min_final:x_max_final]
    
    if rostro.size == 0:
        return 0, "El rostro no esta completo"
    
    # Ajustar a 4:5
    h_crop, w_crop = rostro.shape[:2]
    target_ratio = 4 / 5

    if (w_crop / h_crop) > target_ratio:
        new_w = int(h_crop * target_ratio)
        x1 = (w_crop - new_w) // 2
        rostro = rostro[:, x1:x1 + new_w]
    else:
        new_h = int(w_crop / target_ratio)
        y1 = (h_crop - new_h) // 2
        rostro = rostro[y1:y1 + new_h, :]

    # Redimensionar final
    rostro = cv2.resize(rostro, target_size)
    
    return rostro

# ==============================
# --- CRITERIOS POST-RECORTE ---
# ==============================

# FUNCION PARA LA ILUMINACION DE LA FOTO (PENDIENTE)
def iluminacion_foto(imagen_recortada):
    
    h, w, _ = imagen_recortada.shape

    # ----------- ILUMINACIÓN GENERAL DE LA FOTO -----------
    gray = cv2.cvtColor(imagen_recortada, cv2.COLOR_BGR2GRAY)

    brillo_img = np.mean(gray)

    if brillo_img < 50:
        return False, "La foto está muy oscura"  #subexpuesta

    if brillo_img > 210:
        return False, "La foto está muy brillante" #sobreexpuesta
    
    """
    # ----------- ILUMINACIÓN DEL ROSTRO -----------

    # Obtener bounding box del rostro usando landmarks
    xs = [int(p.x * w) for p in landmarks]
    ys = [int(p.y * h) for p in landmarks]

    x_min, x_max = max(min(xs),0), min(max(xs),w)
    y_min, y_max = max(min(ys),0), min(max(ys),h)

    rostro = imagen_recortada[y_min:y_max, x_min:x_max]

     # Convertir a escala de grises
    gris_rostro = cv2.cvtColor(rostro, cv2.COLOR_BGR2GRAY)

    brillo_rostro = np.mean(gris_rostro)
    contraste = np.std(gris_rostro)

    # Porcentaje de píxeles extremos
    pixeles_oscuros = np.sum(gris_rostro < 15) / gris_rostro.size
    pixeles_claros = np.sum(gris_rostro > 225) / gris_rostro.size
    
     # Muy oscura
    if brillo_rostro <  40 or pixeles_oscuros > 0.65:
        return False, "El rostro tiene poca iluminación" #subexpuesta

    # Muy brillante
    if brillo_rostro > 210 or pixeles_claros > 0.65:
        return False, "El rostro tiene demasiada iluminación" #sobreexpuesta

    # Poco contraste
    if contraste < 10:
        return False, "La foto tiene bajo contraste"

    # ----------- LUZ DESIGUAL EN EL ROSTRO -----------
    mitad_izq = gris_rostro[:, :gris_rostro.shape[1]//2]
    mitad_der = gris_rostro[:, gris_rostro.shape[1]//2:]

    if abs(np.mean(mitad_izq) - np.mean(mitad_der)) > 35:
        return False, "La iluminación del rostro es desigual"
        """
    
    return True, ""

# FUNCION PARA DETECTAR IMAGEN BORROSA
def nitidez(imagen_recortada):

    # Convertir a escala de grises
    gray = cv2.cvtColor(imagen_recortada, cv2.COLOR_BGR2GRAY)

    # Aplicar Laplaciano
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)

    # Varianza
    varianza = laplacian.var()

    # Umbrales recomendados
    if varianza > 10:
        return False, f"El rostro es borroso al momento del recortem{varianza}"
    
    return True, ""

# FUNCION PARA EL TAMAÑO DEL ROSTRO
def tam_rostro(imagen_shape, face_landmarks):
    
    h, w = imagen_shape[:2]

    #Limites de rostro
    _, y_min, _, y_max = bbox_rostro(imagen_shape, face_landmarks)

    # ----- Tamaño del rostro -----
    
    altura_rostro = y_max - y_min
    proporcion = altura_rostro / h

    MIN_TAM = 0.2
    MAX_TAM = 0.55

    if  proporcion < MIN_TAM: 
        return False, "El rostro esta muy lejos"
    elif proporcion > MAX_TAM:
        return False, "El rostro esta muy cerca"

    return True, ""

# FUNCION PARA CENTRAR EL ROSTRO (DUDA)
def rostro_centrado(imagen_shape, face_landmarks, margen = 0.3, tolerancia = 0.5):

    h, w = imagen_shape[:2]

    x_min, y_min, x_max, y_max = bbox_rostro(imagen_shape, face_landmarks)

    # Aplicar margen
    ancho = x_max - x_min
    alto = y_max - y_min

    mx = int(ancho * margen)
    my = int(alto * margen)

    x1 = max(0, x_min - mx)
    y1 = max(0, y_min - my)
    x2 = min(w, x_max + mx)
    y2 = min(h, y_max + my)
    
    # Calcular centros
    cx_rostro = (x1 + x2) / 2
    cy_rostro =  (y1 + y2) / 2
    
    cx_imagen = w / 2
    cy_imagen = h / 2

    # Comparar (Normalizado por el tamaño de la imagen)
    dx = abs(cx_rostro - cx_imagen) / w
    dy = abs(cy_rostro - cy_imagen) / h

    if dx < tolerancia or dy < tolerancia:
        return False, f"El rostro no esta centrado{dx} y {dy}"
    
    return True, ""

# ===============================
# --- SEGMENTACION DE LA FOTO ---
# ===============================

# FUNCION PARA LA SEGMENTACION DE CABELLO
def cabello(category_mask, limite = 0.20):
    
    # Total de pixeles de la imagen
    total_pixeles = category_mask.size

    # Pixeles que pertenecen a la categoria cabello
    pixeles_persona = np.sum(category_mask == 1)

    porcentaje = pixeles_persona / total_pixeles

    if porcentaje > limite:
        return False, "El cabello debe ir amarrado y atras del rostro"

    return True, ""

# FUNCION PARA LA SEGMENTACION DEL FONDO BLANCO
def fondo_blanco(imagen_recortada, category_mask, confidence_mask, conf = 0.6):

    category_mask = np.squeeze(category_mask)
    confidence_mask = np.squeeze(confidence_mask)

    imagen = imagen_recortada.copy()
    
    # fondo con suficiente confianza
    fondo_mask = (category_mask == 0) & (confidence_mask > conf)

    imagen[fondo_mask] = [255,255,255]
    
    #fondo_pixeles = imagen[fondo_mask]

    #if fondo_pixeles.size == 0:
    #    return imagen
    
    #promedio = np.mean(fondo_pixeles)

    #if promedio < limite:
    #    imagen[fondo_mask] = [255,255,255]

    return imagen

# ===========================
# --- DETECTAR ACCESORIOS ---
# ===========================

# FUNCION PARA DETECTAR ACCESORIOS PROHIBIDOS
def accesorios(imagen_segmentada):

    model = get_objetos_detector()

    imagen = cv2.cvtColor(imagen_segmentada, cv2.COLOR_BGR2RGB)

    resultados = model(imagen)

    detecciones = resultados.xyxy[0].cpu().numpy()

    OBJETOS_PROHIBIDOS = ["lentes", "mascarilla", "sombreria", "audifonos"]

    for obj in detecciones:
        class_id = int(obj[5])
        nombre = model.names[class_id]
        confianza = obj[4]

        if confianza > 0.5 and nombre in OBJETOS_PROHIBIDOS:
            return False, f"No se permite el uso de cubrebocas, lentes, sombreros y gorras en la foto"

    return True, ""

# =============================
# --- CRITERIOS FACIALES ---
# =============================

# FUNCION PARA DETECTAR OJOS ABIERTOS
def ojos_abiertos(image_shape, face_landmarks):

    # Indices MediaPipe para cada ojo (ajustar si es necesario)
    indice_izq = [362, 385, 387, 263, 373, 380]
    
    indice_der = [33, 160, 158, 133, 153, 144]

    ear_izq = EAR(image_shape, face_landmarks, indice_izq)

    ear_der = EAR(image_shape, face_landmarks, indice_der)

    ear_prom = (ear_izq + ear_der) / 2

    diferencia = abs(ear_izq - ear_der)
    
    EAR_MIN = 0.15          # Solo si está prácticamente cerrado
    EAR_MAX = 0.45          # Evita ojos exageradamente abiertos
    DIF_MAX = 0.15         # Permite asimetría natural


    # 1No aceptar si ambos están cerrados
    if ear_izq < EAR_MIN and ear_der < EAR_MIN:
        return False, "Los ojos estan cerrados"

    # No aceptar si están exageradamente abiertos
    if ear_prom > EAR_MAX:
        return False, "Ojos demasiados abiertos"

    # No aceptar si la diferencia es extrema (guiño forzado)
    if diferencia > DIF_MAX:
        return False, "No guiñar los ojos"
    
    return True, ""

# FUNCION PARA DETECTAR DIRECCION DE LOS OJOS
def mirada_frontal(face_landmarks):

    if len(face_landmarks) < 474:
        return True, "" # Si no hay iris, no bloquear validación

    def horizontal(ojo_izq, ojo_der, iris):
        ancho = ojo_der[0] - ojo_izq[0]
        if abs(ancho) < 1e-6:
            return 0.5
        return (iris[0] - ojo_izq[0]) / ancho

    # OJO DERECHO
    ojo_der_izq = np.array([face_landmarks[33].x, face_landmarks[33].y])
    ojo_der_der = np.array([face_landmarks[133].x, face_landmarks[133].y])
    iris_der = np.array([face_landmarks[468].x, face_landmarks[468].y])

    # OJO IZQUIERDO
    ojo_izq_izq = np.array([face_landmarks[362].x, face_landmarks[362].y])
    ojo_izq_der = np.array([face_landmarks[263].x, face_landmarks[263].y])
    iris_izq = np.array([face_landmarks[473].x, face_landmarks[473].y])

    derecho = horizontal(ojo_der_izq, ojo_der_der, iris_der)
    izquierdo = horizontal(ojo_izq_izq, ojo_izq_der, iris_izq)

    LIMITE_MIN = 0.30
    LIMITE_MAX = 0.70

    ojo_der_centrado = LIMITE_MIN < derecho < LIMITE_MAX
    ojo_izq_centrado = LIMITE_MIN < izquierdo < LIMITE_MAX

    diferencia = abs(derecho - izquierdo)

    # detectar ojos cruzados
    ojos_cruzados = derecho < LIMITE_MIN and izquierdo > LIMITE_MAX

    if ojos_cruzados:
        return False, "Ojos cruzados"

    # 🔹 Regla inclusiva
    if ojo_der_centrado and ojo_izq_centrado:
        return True, ""

    # 🔹 Si solo uno está centrado pero no hay desviación extrema
    if (ojo_der_centrado or ojo_izq_centrado) and diferencia < 0.4:
        return True, ""

    return False, "La mirada no esta al frente"

# FUNCION PARA LA EXPRESION DEL ROSTRO
def expresion_neutral(image_shape, face_landmarks):

    mar = MAR(image_shape, face_landmarks)
    
    boca_cerrada = mar
    
    if boca_cerrada > 0.05:
        return False, "La boca debe estar cerrada"
    
    # --- PUNTOS CLAVE ---
    labio_sup = face_landmarks[13]
    labio_inf = face_landmarks[14]

    boca_izq = face_landmarks[61]
    boca_der = face_landmarks[291]

    # Para normalizar
    ojo_izq = face_landmarks[33]
    ojo_der = face_landmarks[263]

    ancho_cara = abs(ojo_der.x - ojo_izq.x)

    # Estiramiento 
    boca_ancho = abs(boca_der.x - boca_izq.x) / ancho_cara

     # Comisuras
    altura_prom_labios = (labio_sup.y + labio_inf.y) / 2
    comisuras_altas = (
        boca_izq.y < altura_prom_labios and
        boca_der.y < altura_prom_labios
    )

     # Detectar sonrisa (aunque esté cerrada)
    if boca_ancho > 0.6 or comisuras_altas:
        return False, f"Evita sonreír, mantén expresión seria"

    
    return True, ""



# FUNCION PARA DETECTAR EL ROSTRO FRONTAL (PENDIENTE)
def cabeza_ladeada(landmarks, tolerancia_grados = 2):

     # Ojo derecho externo
    p1 = np.array([landmarks[33].x, landmarks[33].y])

    # Ojo izquierdo externo
    p2 = np.array([landmarks[263].x, landmarks[263].y])

    # Calcular ángulo en grados
    angulo = np.degrees(np.arctan2(
        p2[1] - p1[1],
        p2[0] - p1[0]
    ))

    
    if   abs(angulo) > tolerancia_grados: 
        return False, F"Cabeza ladeada{abs(angulo)}"
    
    return True, ""
    
# FUNCION PARA LA INCLINACION DEL ROSTRO (PENDIENTE)
def inclinacion_vertical(landmarks, tolerancia = 0.08):

    # Punto frente
    frente = np.array([landmarks[10].x, landmarks[10].y])
    # Punto nariz
    nariz = np.array([landmarks[1].x, landmarks[1].y])
    # Punto mentón
    menton = np.array([landmarks[152].x, landmarks[152].y])

    # Distancias verticales
    dist_superior = abs(frente[1] - nariz[1])
    dist_inferior = abs(nariz[1] - menton[1])

    # Altura total rostro
    altura_total = abs(frente[1] - menton[1])

    if altura_total < 1e-6:
        return False

    # Normalizar proporciones
    ratio_superior = dist_superior / altura_total
    ratio_inferior = dist_inferior / altura_total

    diferencia = abs(ratio_superior - ratio_inferior)

    if diferencia > tolerancia:
        return False, f"Cabeza inclinada{diferencia}"
    
    # Validar tolerancia
    return True, ""

# FUNCION PARA DETECTAR SI LA CABEZA ESTA DE ENFRENTE (PENDIENTE)
def frontal(landmarks, tolerancia_nariz_ratio = 0.06):

    # Promedio ojo izquierdo
    ojo_izq = np.mean([[landmarks[i].x, landmarks[i].y] 
                       for i in [362, 385, 387, 263, 373, 380]], axis=0)

    # Promedio ojo derecho
    ojo_der = np.mean([[landmarks[i].x, landmarks[i].y] 
                       for i in [33, 160, 158, 133, 153, 144]], axis=0)

    nariz = np.array([landmarks[1].x, landmarks[1].y])

    # Centro entre ojos
    centro_ojos_x = (ojo_izq[0] + ojo_der[0]) / 2

    # Ancho entre ojos
    ancho_ojos = abs(ojo_der[0] - ojo_izq[0])

    if ancho_ojos < 1e-6:
        return False, ""

    # Diferencia nariz normalizada
    dif_nariz = abs(nariz[0] - centro_ojos_x)
    ratio = dif_nariz / ancho_ojos

    if  ratio > tolerancia_nariz_ratio:
        return False, "El rostro no esta de frente"

    # Si la nariz está cerca del centro → rostro frontal
    return True, ""