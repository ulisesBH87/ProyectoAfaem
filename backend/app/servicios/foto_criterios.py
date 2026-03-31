import cv2
import io
import numpy as np
from PIL import Image
from math import acos, degrees
from .foto_detector import get_detector_objetos 


# FUNCION PARA ENCUADRAR EL ROSTRO
def bbox_rostro(landmarks, image_shape):

    if not landmarks:
        return None

    h, w = image_shape[:2]

    xs = [int(p.x * w) for p in landmarks]
    ys = [int(p.y * h) for p in landmarks]

    #Liminaciones del rostro
    x_min, x_max = min(xs), max(xs)
    y_min, y_max = min(ys), max(ys)

    return x_min, y_min, x_max, y_max

# FUNCION RELACION DE ASPECTO OCULAR (EAR)
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

# FUNCION RELACION DE ASPECTO DE LA BOCA (MAR)
def MAR(landmarks, image_shape):
    """
    Calcula la relación apertura/cierre de la boca (Mouth Aspect Ratio).
    
    indices: lista de 8 índices de la boca según MediaPipe
    """
    h, w = image_shape[:2]

    # === PUNTOS CLAVE DE LA BOCA ===

    #Horizontal
    comisura_izq = landmarks[61] # P1
    comisura_der = landmarks[291] # P4

    #Vertical principal
    labio_sup_centro = landmarks[13] # P3
    labio_inf_centro = landmarks[14] # P5

    #Vertical secundaria izquierda
    labio_sup_izq = landmarks[82] # P2
    labio_inf_izq = landmarks[87] # P8

    #Vertical secundaria izquierda
    labio_sup_der = landmarks[312] # P4
    labio_inf_der = landmarks[317] # P6


    # === Convertir coordenadas normalizadas a píxeles ===
    comisura_izq = np.array([comisura_izq.x * w, comisura_izq.y * h])
    comisura_der = np.array([comisura_der.x * w, comisura_der.y * h])

    labio_sup_centro = np.array([labio_sup_centro.x * w, labio_sup_centro.y * h])
    labio_inf_centro = np.array([labio_inf_centro.x * w, labio_inf_centro.y * h])

    labio_sup_izq = np.array([labio_sup_izq.x * w, labio_sup_izq.y * h])
    labio_inf_izq = np.array([labio_inf_izq.x * w, labio_inf_izq.y * h])

    labio_sup_der = np.array([labio_sup_der.x * w, labio_sup_der.y * h])
    labio_inf_der = np.array([labio_inf_der.x * w, labio_inf_der.y * h])

     # === Cálculo de distancias ===

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

# =====================================
# ----- POSICION DE LA FOTO -----
# =====================================


# =====================================
# ----- CRITERIOS PRE-RECORTE -----
# =====================================

# FUNCION PARA DETECTAR LA RESOLUCION DE LA IMAGEN
def resolucion(contenido_bytes):
    try:

        imagen = Image.open(io.BytesIO(contenido_bytes))

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
def dimensiones(imagen):

    h, w = imagen.shape[:2]

    if w < 350 or h < 400:
        return False, "La imagen es demasiado pequeña. Mínimo recomendado 350x400 px."

    return True, ""

# FUNCION PARA DETECTAR LOS BITS
def formato_color(imagen):

    # Debe ser 8 bits
    if imagen.dtype != np.uint8:
        return False, "La imagen debe ser de 8 bits."

    # Escala de grises válida
    if len(imagen.shape) == 2:
        return True, ""

    # Imagen a color válida
    if len(imagen.shape) == 3 and imagen.shape[2] == 3:
        return True, ""

    # Rechazar imágenes con canal alfa (RGBA)
    if len(imagen.shape) == 3 and imagen.shape[2] == 4:
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

# =====================================
# ----- RECORTE DE FOTO -----
# =====================================
def recortar_foto(imagen_bgr, landmarks, target_size=(400, 500)):

    #Dimensiones demlo alto y lo ancho de la imagen
    h, w = imagen_bgr.shape[:2]

    # Convetirlo a pixeles
    xs = np.array([int(p.x * w) for p in landmarks])
    ys = np.array([int(p.y * h) for p in landmarks])

    x_min, x_max = min(xs), max(xs)
    y_min, y_max = min(ys), max(ys)

    altura_cara = y_max - y_min
    ancho_cara = x_max - x_min

    # Expandir
    y_min = max(int(y_min - 1 * altura_cara), 0)
    y_max = min(int(y_max + 0.8 * altura_cara), h)

    x_min = max(int(x_min - 0.5 * ancho_cara), 0)
    x_max = min(int(x_max + 0.5 * ancho_cara), w)

    rostro = imagen_bgr[y_min:y_max, x_min:x_max]

    if rostro.size == 0:
        return None

    # 🔹 Ajustar a 4:5
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

    # 🔹 Redimensionar final
    rostro = cv2.resize(rostro, target_size)

    return rostro

# =====================================
# ----- CRITERIOS POST-RECORTE -----
# =====================================

# FUNCION PARA LA ILUMINACION DEL ROSTRO
def iluminacion(landmarks, imagen_recortada):
    
    h, w, _ = imagen_recortada.shape

    # ----------- ILUMINACIÓN GENERAL DE LA FOTO -----------
    gray = cv2.cvtColor(imagen_recortada, cv2.COLOR_BGR2GRAY)

    brillo_img = np.mean(gray)

    if brillo_img < 50:
        return False, "La foto está muy oscura"  #subexpuesta

    if brillo_img > 210:
        return False, "La foto está muy brillante" #sobreexpuesta
    
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
    if varianza < 50:
        return False, "El rostro es borroso al momento del recorte"
    
    return True, ""

# =====================================
# ----- DETECTAR ACCESORIOS -----
# =====================================
def accesorios(imagen_recortada):

    model = get_detector_objetos()

    imagen = cv2.cvtColor(imagen_recortada, cv2.COLOR_BGR2RGB)

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

# =====================================
# ----- CRITERIOS DE POSICION-----
# =====================================

# FUNCION PARA EL TAMAÑO DEL ROSTRO
def tam_rostro(landmarks, image_shape):

    h, w = image_shape[:2]


    #Limites de rostro
    _, y_min, _, y_max = bbox_rostro(landmarks, image_shape)

    altura_rostro = y_max - y_min
    proporcion = altura_rostro / h

    MIN_TAM = 0.3

    if  proporcion < MIN_TAM: 
        return False, "El rostro esta muy lejos"

    return True, ""

# FUNCION PARA LA CABEZA: PENDIENTE
def tam_cabeza():
    return

# =====================================
# ----- VALIDACIONES DE POSTURA -----
# =====================================

# FUNCION PARA LA POSE DE LA PERSONA
def postura_recta(pose_landmarks, tolerancia_hombros=0.04, tolerancia_centro=0.05):

    hombro_izq = pose_landmarks[11]
    hombro_der = pose_landmarks[12]
    nariz = pose_landmarks[0]

    # Validar visibilidad
    if hombro_izq.visibility < 0.3 or hombro_der.visibility < 0.3:
        return False, "Los hombros no son claramente visibles"

    # Hombros al mismo nivel (horizontal)
    diferencia_altura = abs(hombro_izq.y - hombro_der.y)

    if diferencia_altura > tolerancia_hombros:
        return False, "No se detecto una postura recta"

    # Nariz centrada entre hombros
    centro_hombros_x = (hombro_izq.x + hombro_der.x) / 2
    desviacion_centro = abs(nariz.x - centro_hombros_x)

    if desviacion_centro > tolerancia_centro:
        return False, "Los hombros y la cabeza no están alineadoss"

    return True, ""

# =====================================
# ----- VALIDACIONES FACIALES -----
# =====================================

# FUNCION PARA DETECTAR OJOS ABIERTOS
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
def mirada_frontal(landmarks):

    if len(landmarks) < 474:
        return True, "" # Si no hay iris, no bloquear validación

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

# FUNCION PARA LA EXPRESION DEL ROSTRO: PENDIENTE
def expresion_neutral(landmarks, image_shape):

    mar = MAR(landmarks, image_shape)
    
    boca_cerrada = mar
    
    if boca_cerrada > 0.05:
        return False, "La boca debe estar cerrada y sin sonrisa"
    
    return True, ""

# FUNCION PARA DETECTAR EL ROSTRO FRONTAL: PENDIENTE
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
    
# FUNCION PARA LA INCLINACION DEL ROSTRO:PENDIENTE
def inclinacion_vertical(landmarks, tolerancia=0.08):

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

# FUNCION PARA DETECTAR SI LA CABEZA ESTA DE ENFRENTE:PENDIENTE
def frontal(landmarks, tolerancia_nariz_ratio=0.06):

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

# =====================================
# ----- VALIDACIONES DE SEGMENTACION -----
# =====================================

# FUNCION PARA LA SEGMENTACION DE CABELLO
def cabello( category_mask, limite=0.20):


    # Total de pixeles de la imagen
    total_pixeles = category_mask.size

    # Pixeles que pertenecen a la categoria cabello (1)
    pixeles_persona = np.sum(category_mask == 1)

    porcentaje = pixeles_persona / total_pixeles

    if porcentaje > limite:
        return False, F"El cabello debe ir amarrado y atras del rostro {porcentaje}"

    return True, ""

# FUNCION PARA LA SEGMENTAVION DEL FONDO BLANCO
def fondo_blanco(imagen_bgr, category_mask, confidence_mask, conf=0.6):

    category_mask = np.squeeze(category_mask)
    confidence_mask = np.squeeze(confidence_mask)

    imagen = imagen_bgr.copy()
    
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












#-----------------------

# FUNCION PARA DETECTAR IMAGEN MANCHADA: PENDIENTE -----
def manchas(imagen_recortada):

    # convertir a float para cálculos
    img = imagen_recortada.astype(np.float32)

    # calcular color promedio
    promedio = np.mean(img, axis=(0,1))

    # calcular distancia de cada pixel al promedio
    distancia = np.sqrt(np.sum((img - promedio) ** 2, axis=2))

    # detectar píxeles muy diferentes
    mascara_manchas = distancia > 80
    
    pixeles_manchas = np.sum(mascara_manchas)
    total_pixeles = imagen_recortada.shape[0] * imagen_recortada.shape[1]

    porcentaje = pixeles_manchas / total_pixeles

    if porcentaje > 0.01:
        return False, f"La fotografía contiene manchas o ruido ({porcentaje:.3f})"

    return True, ""

def imagen_afectada(imagen_recortada):
    img = cv2.imread 
    return True, ""

# FUNCION PARA DETECTAR ARRIGAS: PENDIENTE ------
def arrugas(imagen_recortada):
    return True, ""