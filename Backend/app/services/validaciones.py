import cv2
import io
import numpy as np
from PIL import Image
from math import acos, degrees


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

# FUNCION RELACION  DE ASPECTO DE LA BOCA (MAR)
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

# =====================================
# ----- POSICION DE LA FOTO -----
# =====================================


# =====================================
# ----- VALIDACIONES PRE-RECORTE -----
# =====================================

# FUNCION PARA DETECTAR LA RESOLUCION DE LA IMAGEN
def resolucion(contenido_bytes):
    try:

        imagen = Image.open(io.BytesIO(contenido_bytes))

        dpi = imagen.info.get("dpi", None)

        # Si no tiene DPI, no rechazar automáticamente
        if dpi is None:
            return True, "La imagen no tiene DPI definidos, se omite validación"
        
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

    if w < 150 or h < 200:
        return False, "La imagen es demasiado pequeña. Mínimo recomendado 150x200 px."

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

# FUNCION PARA RECORTAR LA FOTOGRAFIA
def recortar_foto(imagen_bgr, landmarks, target_size=(400, 500)):

    #Dimensiones demlo alto y lo ancho de la imagen
    h, w = imagen_bgr.shape[:2]

    # Convetirlo a pixeles
    xs = np.array([int(p.x * w) for p in landmarks])
    ys = np.array([int(p.y * h) for p in landmarks])

    # Bounding box cara
    x_min_cara, x_max_cara = min(xs), max(xs)
    y_min_cara, y_max_cara = min(ys), max(ys)
    altura_cara = y_max_cara - y_min_cara

    # Extender arriba de la cabeza (cabello)
    y_min_final = max(int(y_min_cara - 0.75 * altura_cara), 0)  # 40 de altura cara arriba

    # Extender hasta los hombros
    margen_abajo = int(0.75 * altura_cara)
    y_max_final = min(y_max_cara + margen_abajo, h)
    
    """
    # Estimamos los hombros usando ancho de mandíbula/orejas
    ancho_cara = x_max_cara - x_min_cara
    margen_abajo = int(altura_cara * 1.0)  # 100% de altura de cara debajo del mentón
    y_max_final = min(y_max_cara + margen_abajo, h)
    """
    
    # Ajuste horizontal
    # Usamos los extremos de la mandíbula para ancho
    x_min_jaw = int(min(landmarks[i].x * w for i in [234, 454]))  # Mejillas/orejas
    x_max_jaw = int(max(landmarks[i].x * w for i in [234, 454]))
    margen_lateral = int(0.5 * (x_max_cara - x_min_cara))
    #margen_lateral = int(ancho_cara * 0.5)  # margen para hombros

    x_min_final = max(min(x_min_cara, x_min_jaw) - margen_lateral, 0)
    x_max_final = min(max(x_max_cara, x_max_jaw) + margen_lateral, w)

    # Recorte final
    rostro = imagen_bgr[y_min_final:y_max_final, x_min_final:x_max_final]

    if rostro.size == 0:
        return 0, "Recorte inválido"

    # Opcional: redimensionar
    rostro = cv2.resize(rostro, (400,500))

    # =========================
    # Mantener proporción y agregar padding si es necesario
    # =========================
    target_w, target_h = target_size
    h_crop, w_crop = rostro.shape[:2]
    
    scale_w = target_w / w_crop
    scale_h = target_h / h_crop
    scale = min(scale_w, scale_h)  # Para cubrir todo el formatos

    new_w = int(w_crop * scale)
    new_h = int(h_crop * scale)

    rostro_resized = cv2.resize(rostro, (new_w, new_h))

    # Crear fondo blanco del tamaño target
    output = 255 * np.ones((target_h, target_w, 3), dtype=np.uint8)

    # Centrar la imagen recortada
    y_offset = (target_h - new_h) // 2
    x_offset = (target_w - new_w) // 2
    output[y_offset:y_offset+new_h, x_offset:x_offset+new_w] = rostro_resized

    return output

# =====================================
# ----- VALIDACIONES POST-RECORTE -----
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
    if contraste < 20:
        return False, "La foto tiene bajo contraste"
    
    """
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
    if varianza < 50:
        return False, "El rostro es borroso al momento del recorte"
    
    return True, ""

# FUNCION PARA DETECTAR IMAGEN MANCHADA: PENDIENTE -----
def manchas(imagen_recortada):
    
    h, w, _ = imagen_recortada.shape

    gray = cv2.cvtColor(imagen_recortada, cv2.COLOR_BGR2GRAY)

    # Aplicar umbral para detectar la marca (ajustar el 150 según la intensidad)
    _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY_INV)

    #Dilatar marca


    return True, ""

# FUNCION PARA DETECTAR ARRIGAS: PENDIENTE ------
def arrugas(imagen_recortada):
    return True, ""

# =====================================
# ----- VALIDACIONES DE POSICION-----
# =====================================

# FUNCION PARA EL TAMAÑO DEL ROSTRO
def tam_rostro(landmarks, image_shape):

    h, w = image_shape[:2]


    #Limites de rostro
    _, y_min, _, y_max = bbox_rostro(landmarks, image_shape)

    altura_rostro = y_max - y_min
    proporcion = altura_rostro / h

    MIN_TAM = 0.3
    MAX_TAM = 0.55

    if  proporcion < MIN_TAM: 
        return False, "El rostro esta muy lejos"
    elif proporcion > MAX_TAM:
        return False, "El rostro esta muy cerca "

    return True, ""

# FUNCION PARA LA CABEZA: PENDIENTE ----
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
        return False, "No se detectan bien los hombros"

    # Hombros al mismo nivel (horizontal)
    diferencia_altura = abs(hombro_izq.y - hombro_der.y)

    if diferencia_altura > tolerancia_hombros:
        return False, "No se detecto una postura recta"

    # Nariz centrada entre hombros
    centro_hombros_x = (hombro_izq.x + hombro_der.x) / 2
    desviacion_centro = abs(nariz.x - centro_hombros_x)

    if desviacion_centro > tolerancia_centro:
        return False, "La cabeza no esta alineada con los hombros"

    return True, "Postura recta"

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

# FUNCION PARA DETECTAR EL ROSTRO FRONTAL
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
        return False, "Cabeza ladeada"
    
    return True, ""
    
# FUNCION PARA LA INCLINACION DEL ROSTRO
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
        return False, "Cabeza inclinada"
    
    # Validar tolerancia
    return True, ""

# FUNCION PARA DETECTAR SI LA CABEZA ESTA DE ENFRENTE
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

# FUNCION PARA LA EXPRESION DEL ROSTRO
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
# ----- VALIDACIONES DE SEGMENTACION -----
# =====================================

# FUNCION PARA LA SEGMENTACION DE CABELLO
def cabello( category_mask, limite=0.15):


    # Total de pixeles de la imagen
    total_pixeles = category_mask.size

    # Pixeles que pertenecen a la categoria persona (1)
    pixeles_persona = np.sum(category_mask == 1)

    porcentaje = pixeles_persona / total_pixeles

    if porcentaje > limite:
        return False, "El cabello debe ir amarrado y atras del rostro"

    return True, ""

# FUNCION PARA LA SEGMENTAVION DEL FONDO BLANCO
def fondo_blanco(imagen_bgr, category_mask, confidence_mask, limite=200, conf=0.6):

    category_mask = np.squeeze(category_mask)
    confidence_mask = np.squeeze(confidence_mask)

    imagen = imagen_bgr.copy()

    # fondo con suficiente confianza
    fondo_mask = (category_mask == 0) & (confidence_mask > conf)

    fondo_pixeles = imagen[fondo_mask]

    if fondo_pixeles.size == 0:
        return imagen

    promedio = np.mean(fondo_pixeles)

    if promedio < limite:
        imagen[fondo_mask] = [255,255,255]
    return imagen