# =====================================
# DETECTOR DE ROSTROS CON FACE LANDMARKER
# =====================================
import os
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision


detector_instance = None


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
# FUNCION DEL DETECTOR DE ROSTROS
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
        num_faces = 2,                           # Cantidad de rostros maximos para evaluar
        min_face_detection_confidence = 0.5,    # Mayor confianza para la deteccion de rostros sea exitosa
        min_face_presence_confidence = 0.5      # Controla detecciones superpuestas
    )
 
    return FaceLandmarker.create_from_options(options)

def face_detector():
    global detector_instance
    if detector_instance is None:
        detector_instance = detector()
    return detector_instance

