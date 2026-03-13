# =====================================
# DETECTOR CON LANDMARKER
# =====================================
import os
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

face_detector_instance = None
pose_detector_instance = None
segmentacion_detector_instance = None
segmentacion_deeplab_detector_instance = None

# =====================================
# ----- CONFIGURACIÓN DE RUTA DE LOS MODELOS -----
# =====================================

# MODELO DE ROSTRO
def modelo_face():
    # Obtener la ruta absoluta del directorio actual
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    # Construir ruta al modelo
    face_model_path = os.path.join(BASE_DIR, "..", "modelos", "face_landmarker.task")
    # Normalizar la ruta
    face_model_path = os.path.abspath(face_model_path)
    return  face_model_path

# MODELO DE POSE
def modelo_pose():
    # Obtener la ruta absoluta del directorio actual
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    # Construir ruta al modelo
    pose_model_path = os.path.join(BASE_DIR, "..", "modelos", "pose_landmarker_full.task")
    # Normalizar la ruta
    pose_model_path = os.path.abspath(pose_model_path)
    return  pose_model_path

# MODELO DE SEGMENTACION
def modelo_segmentacion():
    # Obtener la ruta absoluta del directorio actual
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    # Construir ruta al modelo
    segmentacion_model_path = os.path.join(BASE_DIR, "..", "modelos", "selfie_multiclass_256x256.tflite")
    # Normalizar la ruta
    segmentacion_model_path = os.path.abspath(segmentacion_model_path)
    return segmentacion_model_path 

# MODELO DE SEGMENTACION DE DEEPLAP
def modelo_segmentacion_deeplab():
    # Obtener la ruta absoluta del directorio actual
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    # Construir ruta al modelo
    segmentacion_model_path = os.path.join(BASE_DIR, "..", "modelos", "deeplab_v3.tflite")
    # Normalizar la ruta
    segmentacion_model_path = os.path.abspath(segmentacion_model_path)
    return segmentacion_model_path 

# =====================================
# ----- FUNCOONMES DE DETECTORES ----
# =====================================

# DECTECTOR DE ROSTRO
def face_detector():
    face_model_path = modelo_face()

     # Inicializar detector de rostros
    BaseOptions = mp.tasks.BaseOptions
    FaceLandmarker = mp.tasks.vision.FaceLandmarker
    FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
    VisionRunningMode = mp.tasks.vision.RunningMode

    # Crear una instancia de detector de rostros con el modo de imagen:
    options = FaceLandmarkerOptions (
        base_options = BaseOptions(model_asset_path=face_model_path),
        running_mode = VisionRunningMode.IMAGE,
        num_faces = 2,                           # Cantidad de rostros maximos para evaluar
        min_face_detection_confidence = 0.5,    # Mayor confianza para la deteccion de rostros sea exitosa
        min_face_presence_confidence = 0.5      # Controla detecciones superpuestas
    )
 
    return FaceLandmarker.create_from_options(options)

# DECTECTOR DE POSES
def pose_detector():
    pose_model_path = modelo_pose()

    # Inicializar detector de poses
    BaseOptions = mp.tasks.BaseOptions
    PoseLandmarker = mp.tasks.vision.PoseLandmarker
    PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
    VisionRunningMode = mp.tasks.vision.RunningMode

    # Crear una instancia de detector de poses con el modo de imagen:
    options = PoseLandmarkerOptions (
        base_options = BaseOptions(model_asset_path=pose_model_path),
        running_mode = VisionRunningMode.IMAGE,
        num_poses = 10,                           # Cantidad de poses maximos para evaluar
        min_pose_detection_confidence = 0.5,    # Mayor confianza para la deteccion de poses sea exitosa
        min_pose_presence_confidence = 0.5      # Controla detecciones superpuestas
    )
 
    return PoseLandmarker.create_from_options(options)

# DECTECTOR DE SEGMENTACION
def segmentacion_detector():
    segmentacion_model_path = modelo_segmentacion()

    # Inicializar detector de segmentacion
    BaseOptions = mp.tasks.BaseOptions
    ImageSegmenter = mp.tasks.vision.ImageSegmenter
    ImageSegmenterOptions = mp.tasks.vision.ImageSegmenterOptions
    VisionRunningMode = mp.tasks.vision.RunningMode

    # Crear una instancia de detector de segmentacion con el modo de imagen:
    options = ImageSegmenterOptions (
        base_options = BaseOptions(model_asset_path=segmentacion_model_path),
        running_mode = VisionRunningMode.IMAGE,
        output_category_mask=True,
        output_confidence_masks= True
    )
    return ImageSegmenter.create_from_options(options)

# DECTECTOR DE SEGMENTACION DE SELFIES
def segmentacion_deeplab_detector():
    segmentacion_deeplab_model_path = modelo_segmentacion_deeplab()

    # Inicializar detector de segmentacion
    BaseOptions = mp.tasks.BaseOptions
    ImageSegmenter = mp.tasks.vision.ImageSegmenter
    ImageSegmenterOptions = mp.tasks.vision.ImageSegmenterOptions
    VisionRunningMode = mp.tasks.vision.RunningMode

    # Crear una instancia de detector de segmentacion con el modo de imagen:
    options = ImageSegmenterOptions (
        base_options = BaseOptions(model_asset_path=segmentacion_deeplab_model_path),
        running_mode = VisionRunningMode.IMAGE,
        output_category_mask=True,
        output_confidence_masks= True
    )
    return ImageSegmenter.create_from_options(options)

# =====================================
# ----- GETS PARA LOS DETECTORES -----
# =====================================

# GET DE DECTECTOR DE ROSTROS
def get_face_detector():
    global face_detector_instance
    if face_detector_instance is None:
        face_detector_instance = face_detector()
    return face_detector_instance

# GET DE DECTECTOR DE POSES
def get_pose_detector():
    global pose_detector_instance
    if pose_detector_instance is None:
        pose_detector_instance = pose_detector()
    return pose_detector_instance

# GET DE DECTECTOR DE SEGMENTACION
def get_segmentacion_detector():
    global segmentacion_detector_instance
    if segmentacion_detector_instance is None:
        segmentacion_detector_instance = segmentacion_detector()
    return segmentacion_detector_instance

# GET DE DECTECTOR DE SEGMENTACION DE SELFIES
def get_segmentacion_deeplab_detector():
    global segmentacion_deeplab_detector_instance
    if segmentacion_deeplab_detector_instance is None:
        segmentacion_deeplab_detector_instance = segmentacion_deeplab_detector()
    return segmentacion_deeplab_detector_instance