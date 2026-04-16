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
            return False, "DPI demasiado bajo. Minimo de 96 ppp."

        if dpi_x > 301 or dpi_y > 301:
            return False, "DPI demasiado alto. Maximo de 300 ppp."

        return True, " "

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
    if len(imagen_bgr.shape) != 3 or imagen_bgr.shape[2] != 3:
        return False, "La imagen no cuenta con la proporcion de colores"
    
    #Verifica que sea por 8 bits por canal
    if imagen_bgr.dtype != np.uint8:
        return False, "Sin suficiente profundidad "
    
    return True, ""
    """

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

# FUNCION PARA DETECTAR SI EL ROSTRO ESTA EN LA FOTO
def rostro_completo(imagen_bgr, face_landmarks,):

    #Dimensiones demlo alto y lo ancho de la imagen
    h, w = imagen_bgr.shape[:2]

    # Validacion de landmarks
    puntos_clave = [10, 152, 234, 454] # Frente, menton, mejilla_izq, mejilla_der

    
    for i in puntos_clave:
        px = int(face_landmarks[i].x * w)
        py = int(face_landmarks[i].y * h)

        if px <= 0 or px >= w or py <= 0 or py >= h:
            return False, "El rostro no está completo"
    
    """
    # Convetirlo a pixeles
    xs = np.array([int(p.x * w) for p in face_landmarks])
    ys = np.array([int(p.y * h) for p in face_landmarks])
    
    # Bounding box cara
    x_min, x_max = np.min(xs), np.max(xs)
    y_min, y_max = np.min(ys), np.max(ys)
    
    # Validar el rostro
    margen = int(0.05 * h)

    if y_min <= margen:
        return False, "La frente está cortada"

    if y_max >= (h - margen):
        return False, "El mentón está cortado"

    if x_min <= margen:
        return False, "El lado izquierdo del rostro está cortado"

    if x_max >= (w - margen):
        return False, "El lado derecho del rostro está cortado"

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
    return True, " "

# FUNCION PARA LA POSE DE LA PERSONA
def postura(imagen_bgr, pose_landmarks):
    
    tol_horizontal=0.04
    tol_centro=0.09

    h, w = imagen_bgr.shape[:2]

    hombro_izq = pose_landmarks[11]
    hombro_der = pose_landmarks[12]
    nariz = pose_landmarks[0]
    ojo_izq = pose_landmarks[2]
    ojo_der = pose_landmarks[5]

    """
    puntos_clave = {
        11: (0,0,255),    # hombro izquierdo
        12: (255,0,0),   # hombro derecho
        0: (0,255,255), # nariz
        2: (255,0,255),  # ojo izquierdo
        5: (0,255,0)    # ojo derecho
    }

    for i, color in puntos_clave.items():
        x = int(pose_landmarks[i].x * w)
        y = int(pose_landmarks[i].y * h)
        cv2.circle(imagen_bgr, (x, y), 5, color, -1)
    """
    # Validar visibilidad de puntos clave
    
    if (hombro_izq.visibility < 0.5 or 
        hombro_der.visibility < 0.5):
        return False, "Los hombros no son visibles correctamente"
    
    if (nariz.visibility < 0.5 or 
        ojo_izq.visibility < 0.5 or 
        ojo_der.visibility < 0.5):
        return False, "No se detecta bien el rostro"

    # Detectar dentro del encuadre 
    
    #puntos = [hombro_izq, hombro_der, nariz, ojo_izq, ojo_der]

    #for p in puntos:
    #    if p.x < 0 or p.x > 1 or p.y < 0 or p.y > 1:
    #        return False, "Asegúrate de que tu rostro y hombros estén completamente visibles dentro de la imagen"
        
    # Hombros rectos
    diff_hombros = abs(hombro_izq.y - hombro_der.y)

    if diff_hombros > tol_horizontal:
        return False, "No se detecta una postura recta"
    
    # Nariz centrada entre hombros
    centro_hombros_x = (hombro_izq.x + hombro_der.x) / 2
    desviacion_centro = abs(nariz.x - centro_hombros_x)

    if desviacion_centro > tol_centro:
        return False, "La cabeza no esta alineada con los hombros"
    
    """
    # Cabeza hacia arriba/abajo
    ojos_y = (ojo_izq.y + ojo_der.y) / 2
    hombros_y = (hombro_izq.y + hombro_der.y) / 2

    # Proporción rostro vs cuerpo
    cara = abs(nariz.y - ojos_y)
    cuerpo = abs(hombros_y - nariz.y)
     
    ratio = cara / cuerpo
    
    if ratio > 0.3:
        return False, f"La foto está tomada desde arriba {ratio}"
    
    if ratio < 0.2:
        return False, f"La foto está tomada desde abajo {ratio}"
    
    # Inclonacion lateral de la cabeza
    
    diff_lateral = abs(ojo_izq.y - ojo_der.y)

    if diff_lateral > tol_lateral:
        return False, "La cabeza está inclinada"
    
    # Giro de la cabeza izquierda/derecha
    centro_hombros = (hombro_izq.x + hombro_der.x) / 2
    diff_horizontal = nariz.x - centro_hombros

    if diff_horizontal > tol_horizontal:
        return False, "La cabeza está girada a la derecha"
    
    if diff_horizontal < -tol_horizontal:
        return False, "La cabeza está girada a la izquierda"
    """

    return True, ""

# FUNCION PARA LA SEGMENTACION DE CABELLO
def cabello(category_mask, limite = 0.20):
    
    # Total de pixeles de la imagen
    total_pixeles = category_mask.size

    # Pixeles que pertenecen a la categoria cabello
    pixeles_cabello = np.sum(category_mask == 1)

    porcentaje = pixeles_cabello / total_pixeles

    if porcentaje > limite:
        return False, "El cabello debe ir amarrado y atras del rostro"

    return True, ""

# FUNCION PARA RECORTAR LA FOTO AL ROSTRO (PENDIENTE)
def recortar(imagen_bgr, face_landmarks, target_size = (400, 500)):

    #Dimensiones de lo alto y lo ancho de la imagen
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

def recortar_foto(imagen_bgr, category_mask, pose_landmarks, target_size = (400, 500)):
    
    h, w = imagen_bgr.shape[:2]

    
    # Redimensionar máscara
    category_mask = cv2.resize(
        category_mask.astype(np.uint8),
        (w, h),
        interpolation=cv2.INTER_NEAREST
    )

    mask_persona = np.isin(category_mask, [1,2,3,4])

    ys, xs = np.where(mask_persona)

    if len(xs) == 0 or len(ys) == 0:
        return 0, "No se detectó la persona"

    # =========================
    # LIMITE SUPERIOR (cabello)
    # =========================
    y_min_persona = np.min(ys)
    y_max_persona = np.max(ys)

    altura_persona = y_max_persona - y_min_persona

    # margen proporcional (ej: 10%)
    margen_superior = int(0.1 * altura_persona)

    y_min = max(y_min_persona - margen_superior, 0)

    # =========================
    # HOMBROS (pose)
    # =========================
    
    try:
        y_hombro_izq = int(pose_landmarks[11].y * h)
        y_hombro_der = int(pose_landmarks[12].y * h)
    except:
        return 0, "No se detectaron los hombros"

    y_max = min(max(y_hombro_izq, y_hombro_der) + int(0.05 * altura_persona), h)
    # =========================
    # LIMITES LATERALES (MEJORADOS)
    # =========================
    mask_vertical = (ys >= y_min) & (ys <= y_max)
    xs_filtrados = xs[mask_vertical]

    if len(xs_filtrados) == 0:
        return 0, "Error en segmentación lateral"

    x_min_persona = np.min(xs_filtrados)
    x_max_persona = np.max(xs_filtrados)

    ancho_persona = x_max_persona - x_min_persona
    margen_lateral = int(0.15 * ancho_persona)

    x_min = max(x_min_persona - margen_lateral, 0)
    x_max = min(x_max_persona + margen_lateral, w)


    # =========================
    # RECORTE
    # =========================
    persona = imagen_bgr[y_min:y_max, x_min:x_max]

    if persona.size == 0:
        return 0, "Recorte inválido"
    
    # =========================
    # AJUSTAR A 4:5
    # =========================
    h_crop, w_crop = persona.shape[:2]
    target_ratio = 4 / 5

    if (w_crop / h_crop) > target_ratio:
        new_w = int(h_crop * target_ratio)
        x1 = (w_crop - new_w) // 2
        persona = persona[:, x1:x1 + new_w]
    else:
        new_h = int(w_crop / target_ratio)
        y1 = (h_crop - new_h) // 2
        persona = persona[y1:y1 + new_h, :]

    persona = cv2.resize(persona, target_size)

    return persona

# FUNCION PARA LA ILUMINACION DE LA FOTO (PENDIENTE)
def iluminacion_foto(imagen_recortada):

    # --- Iluminacion general ---

    # Iluminacion general de la foto
    gray = cv2.cvtColor(imagen_recortada, cv2.COLOR_BGR2GRAY)

    brillo_img = np.mean(gray)

    if brillo_img < 50:
        return False, "La foto está muy oscura"  #subexpuesta

    if brillo_img > 210:
        return False, "La foto está muy brillante" #sobreexpuesta
    
    return True, ""

#FUNCION PARA LA ILUMINACION DE LA PERSONA
def iluminacion_persona(imagen_recortada, face_landmarks):
    
    h, w, _ = imagen_recortada.shape

    # =========================
    # 1. OBTENER PUNTOS DEL ROSTRO
    # =========================
    puntos = []
    for lm in face_landmarks:
        x = int(lm.x * w)
        y = int(lm.y * h)
        puntos.append((x, y))

    puntos_np = np.array(puntos, dtype=np.int32)

    # =========================
    # 2. CREAR MÁSCARA DEL ROSTRO
    # =========================
    mask = np.zeros((h, w), dtype=np.uint8)

    # Usar convexHull para mejor forma
    hull = cv2.convexHull(puntos_np)
    cv2.fillConvexPoly(mask, hull, 255)

    # =========================
    # 3. EXTRAER SOLO EL ROSTRO
    # =========================
    rostro = imagen_recortada[mask == 255]

    # Validación básica por si falla algo
    if rostro.size == 0:
        return False, "No se pudo detectar el rostro correctamente"

    # =========================
    # 4. SEPARAR CANALES
    # =========================
    b = rostro[:, 0]
    g = rostro[:, 1]
    r = rostro[:, 2]

    # =========================
    # 5. PROMEDIOS
    # =========================
    prom_b = np.mean(b)
    prom_g = np.mean(g)
    prom_r = np.mean(r)

    # =========================
    # 6. VALIDACIONES DE COLOR
    # =========================
    if (
        prom_r > prom_g * 1.2 and 
        prom_r > prom_b * 1.2 and 
        (prom_r - prom_g) > 140
        ):
        return False, "Imagen tiene tonos rojizos excesivos, usa mejor luz natural"

    if (prom_b > prom_r * 1.4 and prom_b > prom_g * 1.4):
        return False, "Imagen muy azulada, usa mejor luz natural"

    if (prom_g > prom_r * 1.4 and prom_g > prom_b * 1.4):
        return False, "Imagen muy verdosa, usa mejor luz natural"

    # =========================
    # 7. VALIDACIÓN DE BRILLO (opcional pero recomendada)
    # =========================
    brillo = np.mean(rostro)

    if brillo < 60:
        return False, "Imagen muy oscura"

    if brillo > 200:
        return False, "Imagen muy brillante"
    
    return True, ""

# FUNCION PARA DETECTAR IMAGEN BORROSA (PENDIENTE)
def nitidez(imagen_recortada):

    # Convertir a escala de grises
    gray = cv2.cvtColor(imagen_recortada, cv2.COLOR_BGR2GRAY)

    # Aplicar Laplaciano
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)

    # Varianza
    varianza = laplacian.var()

    # Umbrales recomendados
    if varianza < 50:
        return False, "La imagen esta borrosa"
    
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

# FUNCION PARA CENTRAR EL ROSTRO (DUDA DEL USO DEL METODO)
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

# FUNCION PARA DETECTAR ACCESORIOS PROHIBIDOS (PENDIENTE)
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
            return False, "No se permite el uso de objetos que bloqueen la visualización de la cara"

    return True, ""

# FUNCION PARA DETECTAR OJOS ABIERTOS
def ojos_abiertos(image_shape, face_landmarks):

    # Indices MediaPipe para cada ojo (ajustar si es necesario)
    indice_izq = [362, 385, 387, 263, 373, 380]
    
    indice_der = [33, 160, 158, 133, 153, 144]

    ear_izq = EAR(image_shape, face_landmarks, indice_izq)

    ear_der = EAR(image_shape, face_landmarks, indice_der)

    ear_prom = (ear_izq + ear_der) / 2

    diferencia = abs(ear_izq - ear_der)
    
    EAR_MIN = 0.15         # Solo si está prácticamente cerrado
    EAR_MAX = 0.60          # Evita ojos exageradamente abiertos
    DIF_MAX = 0.15         # Permite asimetría natural


    # 1No aceptar si ambos están cerrados
    if ear_izq < EAR_MIN and ear_der < EAR_MIN:
        return False, "Los ojos estan cerrados"
    
    # No aceptar si están exageradamente abiertos
    #if ear_prom > EAR_MAX:
    #    return False, "Ojos demasiados abiertos"

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

# FUNCION PARA LA EXPRESION DEL ROSTRO (PENDIENTE)
def expresion_neutral(image_shape, face_landmarks):

    mar = MAR(image_shape, face_landmarks)
    
    boca_cerrada = mar
    
    if boca_cerrada > 0.05:
        return False, "La boca debe estar cerrada"
    
    # --- PUNTOS CLAVE ---
    boca_izq = face_landmarks[61] # P1
    boca_der = face_landmarks[291] # P4

    labio_sup = face_landmarks[13] # P3
    labio_inf = face_landmarks[14] # P5

    # Para normalizar
    ojo_izq = face_landmarks[33] # P2
    ojo_der = face_landmarks[263] # P8

    ancho_cara = abs(ojo_der.x - ojo_izq.x)

    # Estiramiento
    boca_ancho = abs(boca_der.x - boca_izq.x) / ancho_cara
    boca_ancho = round(boca_ancho, 2)

    """
     # Comisuras
    altura_prom_labios = (labio_sup.y + labio_inf.y) / 2
    
    comisuras_altas = (
        boca_izq.y < altura_prom_labios and
        boca_der.y < altura_prom_labios
    )
    """

     # Detectar sonrisa (aunque esté cerrada)
    if not (0.5 <= boca_ancho <= 0.6):
        return False, "Evita sonreír, mantén expresión seria y neutral"


    return True, ""

# FUNCION PARA DETECTAR LA ORIENTACION DE LA CABEZA
def orientacion(landmarks, tol_roll=5, tol_pitch=0.08, tol_yaw=0.06):
    
    errores = []

    # =========================
    # 1. ROLL (cabeza ladeada)
    # =========================
    p1 = np.array([landmarks[33].x, landmarks[33].y])   # ojo derecho
    p2 = np.array([landmarks[263].x, landmarks[263].y]) # ojo izquierdo

    angulo = np.degrees(np.arctan2(
        p2[1] - p1[1],
        p2[0] - p1[0]
    ))

    if abs(angulo) > tol_roll:
        errores.append("Cabeza ladeada")

    # =========================
    # 2. PITCH (arriba/abajo)
    # =========================
    frente = np.array([landmarks[10].x, landmarks[10].y])
    nariz = np.array([landmarks[1].x, landmarks[1].y])
    menton = np.array([landmarks[152].x, landmarks[152].y])

    altura_total = abs(frente[1] - menton[1])

    if altura_total > 1e-6:
        dist_sup = abs(frente[1] - nariz[1])
        dist_inf = abs(nariz[1] - menton[1])

        ratio_sup = dist_sup / altura_total
        ratio_inf = dist_inf / altura_total

        if abs(ratio_sup - ratio_inf) > tol_pitch:
            errores.append("Cabeza inclinada")

    # =========================
    # 3. YAW (no frontal)
    # =========================
    ojo_izq = np.mean([[landmarks[i].x, landmarks[i].y] 
                       for i in [362, 385, 387, 263, 373, 380]], axis=0)

    ojo_der = np.mean([[landmarks[i].x, landmarks[i].y] 
                       for i in [33, 160, 158, 133, 153, 144]], axis=0)

    centro_ojos_x = (ojo_izq[0] + ojo_der[0]) / 2
    ancho_ojos = abs(ojo_der[0] - ojo_izq[0])

    if ancho_ojos > 1e-6:
        dif_nariz = abs(nariz[0] - centro_ojos_x)
        ratio = dif_nariz / ancho_ojos

        if ratio > tol_yaw:
            errores.append("El rostro no está de frente")

    # =========================
    # RESULTADO FINAL
    # =========================
    if errores:
        return False, errores  # lista de errores
    else:
        return True, ""


# FUNCION PARA LA ILUMINACION DE LA FOTO (PENDIENTE)
def iluminacion(imagen):
 # =========================
    # 1. VALIDACIÓN BÁSICA
    # =========================
    if imagen is None or imagen.size == 0:
        return False, "Imagen inválida"

    # =========================
    # 2. SEPARAR CANALES
    # =========================
    b = imagen[:, :, 0].flatten()
    g = imagen[:, :, 1].flatten()
    r = imagen[:, :, 2].flatten()

    # =========================
    # 3. PROMEDIOS
    # =========================
    prom_b = np.mean(b)
    prom_g = np.mean(g)
    prom_r = np.mean(r)

    # =========================
    # 4. VALIDACIÓN DE COLOR
    # =========================
    if (prom_r > prom_g * 1.4 and prom_r > prom_b * 1.4):
        return False, f"Imagen muy rojiza/amarilla ({prom_r:.2f})"

    if (prom_b > prom_r * 1.4 and prom_b > prom_g * 1.4):
        return False, f"Imagen muy azulada ({prom_b:.2f})"

    if (prom_g > prom_r * 1.4 and prom_g > prom_b * 1.4):
        return False, f"Imagen muy verdosa ({prom_g:.2f})"

    # =========================
    # 5. BRILLO (MEJORADO)
    # =========================
    imagen_gray = cv2.cvtColor(imagen, cv2.COLOR_BGR2GRAY)
    brillo = np.mean(imagen_gray)

    if brillo < 60:
        return False, "Imagen muy oscura"

    if brillo > 200:
        return False, "Imagen muy brillante"

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
        return False, "Cabeza ladeada"
    
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
        return False, "Cabeza inclinada"
    
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