import cv2
import os
import fitz
import mediapipe as mp
import numpy as np
import base64

# =========================
# CONFIG MODELO
# =========================
detector_instance = None

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.abspath(os.path.join(BASE_DIR, "..", "models", "face_landmarker.task"))

# =========================
# DETECTOR
# =========================
def detector():
    BaseOptions = mp.tasks.BaseOptions
    FaceLandmarker = mp.tasks.vision.FaceLandmarker
    FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
    VisionRunningMode = mp.tasks.vision.RunningMode

    options = FaceLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=model_path),
        running_mode=VisionRunningMode.IMAGE,
        min_face_detection_confidence=0.7,
        min_face_presence_confidence=0.7
    )

    return FaceLandmarker.create_from_options(options)

# =========================
# RECORTE ROSTRO
# =========================
def recortar_rostro(img, landmarks):

    h, w = img.shape[:2]

    xs = [int(p.x * w) for p in landmarks]
    ys = [int(p.y * h) for p in landmarks]

    x_min = max(min(xs) - 40, 0)
    x_max = min(max(xs) + 40, w)
    y_min = max(min(ys) - 80, 0)
    y_max = min(max(ys) + 100, h)

    if x_max <= x_min or y_max <= y_min:
        return None, "Error en coordenadas"

    area = (x_max - x_min) * (y_max - y_min)

    if area < 0.08 * (h*w):
        return None, "Rostro demasiado pequeño"

    return img[y_min:y_max, x_min:x_max], None

# =========================
# EAR
# =========================
def EAR(landmarks, indices, shape):

    h, w = shape[:2]
    pts = [(int(landmarks[i].x*w), int(landmarks[i].y*h)) for i in indices]

    a = np.linalg.norm(np.array(pts[1]) - np.array(pts[5]))
    b = np.linalg.norm(np.array(pts[2]) - np.array(pts[4]))
    c = np.linalg.norm(np.array(pts[0]) - np.array(pts[3]))

    if c < 1e-6:
        return 0

    return (a+b)/(2*c)

# =========================
# OJOS ABIERTOS
# =========================
def ojos_abiertos(landmarks, shape):

    izq = [362,385,387,263,373,380]
    der = [33,160,158,133,153,144]

    ear_i = EAR(landmarks, izq, shape)
    ear_d = EAR(landmarks, der, shape)

    EAR_MIN = 0.18
    DIF_MAX = 0.25

    if ear_i < EAR_MIN and ear_d < EAR_MIN:
        return False

    if abs(ear_i-ear_d) > DIF_MAX:
        return False

    return True

# =========================
# EXPRESIÓN NEUTRA
# =========================
def expresion_neutra(landmarks, shape):

    h,w = shape[:2]

    c1 = np.array([landmarks[61].x*w, landmarks[61].y*h])
    c2 = np.array([landmarks[291].x*w, landmarks[291].y*h])

    lsup = np.array([landmarks[13].x*w, landmarks[13].y*h])
    linf = np.array([landmarks[14].x*w, landmarks[14].y*h])

    ancho = np.linalg.norm(c1-c2)
    alto = np.linalg.norm(lsup-linf)

    if ancho < 1e-6:
        return False

    mar = alto/ancho

    mej_i = np.array([landmarks[234].x*w, landmarks[234].y*h])
    mej_d = np.array([landmarks[454].x*w, landmarks[454].y*h])
    ancho_rostro = np.linalg.norm(mej_i-mej_d)

    sonrisa = ancho/ancho_rostro

    return mar < 0.38 and sonrisa < 0.48

# =========================
# FRONTALIDAD
# =========================
def es_frontal(landmarks):

    ojo_i = np.mean([[landmarks[i].x, landmarks[i].y] for i in [362,385,387,263,373,380]], axis=0)
    ojo_d = np.mean([[landmarks[i].x, landmarks[i].y] for i in [33,160,158,133,153,144]], axis=0)
    nariz = np.array([landmarks[1].x, landmarks[1].y])

    dif_y = abs(ojo_i[1]-ojo_d[1])
    centro = (ojo_i[0]+ojo_d[0])/2
    dif_x = abs(nariz[0]-centro)

    angulo = np.arctan2(ojo_d[1]-ojo_i[1], ojo_d[0]-ojo_i[0])

    return dif_y<=0.04 and dif_x<=0.05 and abs(angulo)<=0.12

# =========================
# VALIDACIÓN PRINCIPAL
# =========================
def validacion_fotografia(img_bytes):

    nparr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        return 0,"Imagen inválida"

    global detector_instance
    if detector_instance is None:
        detector_instance = detector()

    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

    result = detector_instance.detect(mp_img)

    if not result.face_landmarks:
        return 0,"No se detectó rostro"

    if len(result.face_landmarks)!=1:
        return 0,"Múltiples rostros detectados"

    landmarks = result.face_landmarks[0]

    # ===== RECORTE =====
    img, err = recortar_rostro(img, landmarks)
    if img is None:
        return 0, err

    # ===== REDETECTAR =====
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    result = detector_instance.detect(mp_img)

    if not result.face_landmarks:
        return 0,"No se detectó rostro tras recorte"

    landmarks = result.face_landmarks[0]

    # ===== VALIDACIONES =====
    if not es_frontal(landmarks):
        return 0,"Rostro no frontal"

    if not ojos_abiertos(landmarks, img.shape):
        return 0,"Ojos cerrados"

    if not expresion_neutra(landmarks, img.shape):
        return 0,"Expresión no neutra"

    return 1,None

# =========================
# PDF
# =========================
def detectar_rostro_pdf(pdf_bytes):

    pdf = fitz.open(stream=pdf_bytes,filetype="pdf")

    for page in pdf:
        for img in page.get_images(full=True):

            xref = img[0]
            base = pdf.extract_image(xref)

            valido, razon = validacion_fotografia(base["image"])

            if valido:
                b64 = base64.b64encode(base["image"]).decode()
                return 1,b64,f"image/{base['ext']}",None

    return 0,None,None,"No se encontró rostro válido"