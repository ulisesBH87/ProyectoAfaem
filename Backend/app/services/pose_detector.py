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
model_path = os.path.join(BASE_DIR, "..", "models", "pose_landmarker_full.task")
# Normalizar la ruta
model_path = os.path.abspath(model_path)


# =====================================
# FUNCION DEL DETECTOR DE ROSTROS
# =====================================
def detector():
     # Inicializar detector de rostros
    BaseOptions = mp.tasks.BaseOptions
    PoseLandmarker = mp.tasks.vision.PoseLandmarker
    PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
    VisionRunningMode = mp.tasks.vision.RunningMode

    # Crear una instancia de detector de rostros con el modo de imagen:
    options = PoseLandmarkerOptions (
        base_options = BaseOptions(model_asset_path=model_path),
        running_mode = VisionRunningMode.IMAGE,
        num_poses = 10,                           # Cantidad de poses maximos para evaluar
        min_pose_detection_confidence = 0.5,    # Mayor confianza para la deteccion de poses sea exitosa
        min_pose_presence_confidence = 0.5      # Controla detecciones superpuestas
    )
 
    return PoseLandmarker.create_from_options(options)

def pose_detector():
    global detector_instance
    if detector_instance is None:
        detector_instance = detector()
    return detector_instance

