import cv2
import numpy as np
from math import acos, degrees


# =====================================
# FUNCION PARA RECORTAR LA FOTOGRAFIA
# =====================================
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
