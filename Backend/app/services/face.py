import cv2
import numpy as np
from math import acos, degrees


# =====================================
# FUNCION PARA ENCUADRAR EL ROSTRO
# =====================================
def bbox_rostro(landmarks, image_shape):

    h, w = image_shape[:2]

    xs = [int(p.x * w) for p in landmarks]
    ys = [int(p.y * h) for p in landmarks]

    #Liminaciones del rostro
    x_min, x_max = min(xs), max(xs)
    y_min, y_max = min(ys), max(ys)

    return x_min, y_min, x_max, y_max

# =====================================
# FUNCION PARA EL TAMAÑO DEL ROSTRO
# =====================================
def tam_rostro(landmarks, image_shape):

    h, w = image_shape[:2]


    #Limites de rostro
    _, y_min, _, y_max = bbox_rostro(landmarks, image_shape)

    altura_rostro = y_max - y_min
    proporcion = altura_rostro / h

    MIN_TAM = 0.3
    MAX_TAM = 0.60

    if  proporcion < MIN_TAM: 
        return False, "El rostro esta muy lejos"
    elif proporcion > MAX_TAM:
        return False, "El rostro esta muy cerca "

    return True, ""


# =====================================
# FUNCION PARA VERIFICACAR EL CENTRADO DEL ROSTRO
# =====================================
def rostro_centrado(landmarks, image_shape, tolerancia=0.15):

    h, w = image_shape[:2]

    x_min, y_min, x_max, y_max = bbox_rostro(landmarks, image_shape)

    # Centro del rostro
    centro_rostro_x = (x_min + x_max) / 2
    centro_rostro_y = (y_min + y_max) / 2

    # Centro de la imagen
    centro_img_x = w / 2
    centro_img_y = h / 2

    # Diferencia normalizada
    diff_x = abs(centro_rostro_x - centro_img_x) / w
    diff_y = abs(centro_rostro_y - centro_img_y) / h

    if diff_x > tolerancia or diff_y > tolerancia:
        return False, "El rostro no está centrado"

    return True, ""


# =====================================
# FUNCION PARA VERIFICAR POSTURA
# =====================================
def postura(landmarks_pose, tolerancia_hombros=0.03):

    if landmarks_pose is None:
        return True  # No bloquear si no hay cuerpo

    hombro_izq = landmarks_pose[11]
    hombro_der = landmarks_pose[12]

    # Diferencia vertical
    diferencia_y = abs(hombro_izq.y - hombro_der.y)

    if diferencia_y > tolerancia_hombros:
        return False, "Los hombros están inclinados"

    return True, ""

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


# =====================================
# FUNCION PARA LA INCLINACION DEL ROSTRO
# =====================================
def inclinacion_vertical(landmarks, tolerancia=112):

    # Punto frente
    frente = np.array([landmarks[10].x, landmarks[10].y])
    # Punto nariz
    nariz = np.array([landmarks[1].x, landmarks[1].y])
    # Punto mentón
    menton = np.array([landmarks[152].x, landmarks[152].y])

    # Vector del rostro (frente -> mentón)
    vector_rostro = menton - frente

    # Vector vertical ideal (hacia abajo)
    vector_vertical = np.array([0, 1])

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

    inclinacion = diferencia <= tolerancia

    # Validar tolerancia
    return inclinacion

# =====================================
# FUNCION PARA ROSTRO FRONTAL
# =====================================
def cabeza_ladeada(landmarks, tolerancia_grados =8):

     # Ojo derecho externo
    p1 = np.array([landmarks[33].x, landmarks[33].y])

    # Ojo izquierdo externo
    p2 = np.array([landmarks[263].x, landmarks[263].y])

    # Calcular ángulo en grados
    angulo = np.degrees(np.arctan2(
        p2[1] - p1[1],
        p2[0] - p1[0]
    ))

    ladeado = abs(angulo) <= tolerancia_grados
    
    return ladeado

# =====================================
# FUNCION PARA ROSTRO FRONTAL
# =====================================
def frontal(landmarks, tolerancia_nariz_ratio=0.15):

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
        return False

    # Diferencia nariz normalizada
    dif_nariz = abs(nariz[0] - centro_ojos_x)
    ratio = dif_nariz / ancho_ojos

    # Si la nariz está cerca del centro → rostro frontal
    return ratio <= tolerancia_nariz_ratio

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
def mirada_frontal(landmarks, ):

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
# FUNCION PARA LA EXPRESION DEL ROSTRO
# =====================================
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


"""
# =====================================
# FUNCIONES PARA LA PARTE DE LOS HOMBROS
# =====================================
def cuerpo_frontal(landmarks, umbral_hombros = 0.05, umbral_centro= 0.08):

    if landmarks is None:
        return False
    
    #Puntos de los hombros
    hombro_izq =  landmarks[11]
    hombro_der = landmarks[12]

    #Diferencia vertical entre hombros
    dif_y = abs(hombro_izq.y - hombro_der.y)

    #Centro de rostro
    centro_x = (hombro_izq.x + hombro_der.x)

    # Punto de Nariz
    nariz = landmarks[0]
    dif_centro = abs(nariz.x - centro_x)

    pose = dif_y < umbral_hombros and dif_centro < umbral_centro

    return pose

    """
