import cv2
import io
import numpy as np
from PIL import Image
from math import acos, degrees


# =====================================
# FUNCION PARA DETECTAR TAMAÑO DE LA IMAGEN
# =====================================
def dimensiones(imagen):

    h, w = imagen.shape[:2]

    if w < 150 or h < 200:
        return False, "La imagen es demasiado pequeña. Mínimo recomendado 150x200 px."

    return True, ""


# =====================================
# FUNCION PARA DETECTAR LOS BITS
# =====================================
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
# FUNCION PARA DETECTAR LA RESOLUCION DE LA IMAGEN
# =====================================
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


# =====================================
# FUNCION PARA LA ILUMINACION DEL ROSTRO
# =====================================
def iluminacion(landmarks, imagen_recortada):
    
    h, w, _ = imagen_recortada.shape

    # ----------- ILUMINACIÓN GENERAL DE LA FOTO -----------
    gris_img = cv2.cvtColor(imagen_recortada, cv2.COLOR_BGR2GRAY)

    brillo_img = np.mean(gris_img)

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


# =====================================
# FUNCION PARA DETECTAR IMAGEN BORROSA
# =====================================
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

