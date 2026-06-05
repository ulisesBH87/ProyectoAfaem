# SERVICIO DE DETECCIÓN DE FOTOGRAFÍAS PARA DOCUMENTOS DE IDENTIDAD
import os
import torch
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

face_detector_instance = None
face_landmarks_detector_instance = None
pose_landmarks_detector_instance = None
segmentacion_detector_instance = None
objects_detector_instance = None

# ============================================
# --- CONFIGURACIÓN DE RUTA DE LOS MODELOS ---
# ============================================

# MODELO DE ROSTRO
def face_model():
    # Obtener la ruta absoluta del directorio actual
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    # Construir ruta al modelo
    face_model_path = os.path.join(BASE_DIR, "..", "modelos", "blaze_face_short_range.tflite")
    # Normalizar la ruta
    face_model_path = os.path.abspath(face_model_path)
    return  face_model_path

# MODELO DE LANDMARKS DE ROSTRO
def face_landmarks_model():
    # Obtener la ruta absoluta del directorio actual
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    # Construir ruta al modelo
    face_landmarks_model_path = os.path.join(BASE_DIR, "..", "modelos", "face_landmarker.task")
    # Normalizar la ruta
    face_landmarks_model_path = os.path.abspath(face_landmarks_model_path)
    return  face_landmarks_model_path

# MODELO DE POSE
def pose_landmarks_model():
    # Obtener la ruta absoluta del directorio actual
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    # Construir ruta al modelo
    pose_landmarks_model_path = os.path.join(BASE_DIR, "..", "modelos", "pose_landmarker_full.task")
    # Normalizar la ruta
    pose_landmarks_model_path = os.path.abspath(pose_landmarks_model_path)
    return  pose_landmarks_model_path

# MODELO DE SEGMENTACION
def segmentacion_model():
    # Obtener la ruta absoluta del directorio actual
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    # Construir ruta al modelo
    segmentacion_model_path = os.path.join(BASE_DIR, "..", "modelos", "selfie_multiclass_256x256.tflite")
    # Normalizar la ruta
    segmentacion_model_path = os.path.abspath(segmentacion_model_path)
    return segmentacion_model_path 

# MODELO DE OBJETOS
def objetos_model():  
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    ruta = os.path.join(BASE_DIR, "..", "modelos", "yolov7", "best.pt")
    return os.path.abspath(ruta)

# ===============================
# --- FUNCIONES DE DETECTORES ---
# ===============================

# DECTECTOR DE ROSTRO
def face_detector():
    face_model_path = face_model()

     # Inicializar detector de rostros
    BaseOptions = mp.tasks.BaseOptions
    FaceDetector = mp.tasks.vision.FaceDetector
    FaceDetectorOptions = mp.tasks.vision.FaceDetectorOptions
    VisionRunningMode = mp.tasks.vision.RunningMode

    # Crear una instancia de detector de rostros con el modo de imagen:
    options = FaceDetectorOptions(
        base_options = BaseOptions(model_asset_path=face_model_path),
        running_mode = VisionRunningMode.IMAGE,
        min_detection_confidence=0.5,      # Mayor confianza para reducir falsos positivos
        min_suppression_threshold=0.5       # Controla detecciones superpuestas
    )

    return FaceDetector.create_from_options(options)

# DECTECTOR DE LANDMARKS DE ROSTRO
def face_landmarks_detector():
    face_landmarks_model_path = face_landmarks_model()

     # Inicializar detector de rostros
    BaseOptions = mp.tasks.BaseOptions
    FaceLandmarker = mp.tasks.vision.FaceLandmarker
    FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
    VisionRunningMode = mp.tasks.vision.RunningMode

    # Crear una instancia de detector de rostros con el modo de imagen:
    options = FaceLandmarkerOptions(
        base_options = BaseOptions(model_asset_path=face_landmarks_model_path),
        running_mode = VisionRunningMode.IMAGE,
        num_faces = 2,                           # Cantidad de rostros maximos para evaluar
        min_face_detection_confidence = 0.5,    # Mayor confianza para la deteccion de rostros sea exitosa
        min_face_presence_confidence = 0.5      # Controla detecciones superpuestas
    )
 
    return FaceLandmarker.create_from_options(options)

# DECTECTOR DE LANDMARKS DE POSES
def pose_landmarks_detector():
    pose_landmarks_model_path = pose_landmarks_model()

    # Inicializar detector de poses
    BaseOptions = mp.tasks.BaseOptions
    PoseLandmarker = mp.tasks.vision.PoseLandmarker
    PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
    VisionRunningMode = mp.tasks.vision.RunningMode

    # Crear una instancia de detector de poses con el modo de imagen:
    options = PoseLandmarkerOptions(
        base_options = BaseOptions(model_asset_path=pose_landmarks_model_path),
        running_mode = VisionRunningMode.IMAGE,
        num_poses = 1,                           # Cantidad de poses maximos para evaluar
        min_pose_detection_confidence = 0.5,    # Mayor confianza para la deteccion de poses sea exitosa
        min_pose_presence_confidence = 0.5      # Controla detecciones superpuestas
    )
 
    return PoseLandmarker.create_from_options(options)

# DECTECTOR DE SEGMENTACION
def segmentacion_detector():
    segmentacion_model_path = segmentacion_model()

    # Inicializar detector de segmentacion
    BaseOptions = mp.tasks.BaseOptions
    ImageSegmenter = mp.tasks.vision.ImageSegmenter
    ImageSegmenterOptions = mp.tasks.vision.ImageSegmenterOptions
    VisionRunningMode = mp.tasks.vision.RunningMode

    # Crear una instancia de detector de segmentacion con el modo de imagen:
    options = ImageSegmenterOptions(
        base_options = BaseOptions(model_asset_path=segmentacion_model_path),
        running_mode = VisionRunningMode.IMAGE,
        output_category_mask=True,
        output_confidence_masks= True
    )
    return ImageSegmenter.create_from_options(options)

# DECTECTOR DE OBJETOS
def objetos_detector():
    model_path = objetos_model()
    model = torch.hub.load(
        os.path.dirname(model_path),
        'custom', 
        model_path, 
        source='local'
    )
    model.conf = 0.5  # Establecer el umbral de confianza a 0.5
    return model

# =====================================
# ----- GETS PARA LOS DETECTORES -----
# =====================================

# GET DE DECTECTOR DE ROSTROS
def get_face_detector():
    global face_detector_instance
    if face_detector_instance is None:
        face_detector_instance = face_detector()
    return face_detector_instance

# GET DE DECTECTOR DE LANDMARKS DE ROSTROS
def get_face_landmarks_detector():
    global face_landmarks_detector_instance
    if face_landmarks_detector_instance is None:
        face_landmarks_detector_instance = face_landmarks_detector()
    return face_landmarks_detector_instance

# GET DE DECTECTOR DE LANDMARKS DE POSES
def get_pose_landmarks_detector():
    global pose_landmarks_detector_instance
    if pose_landmarks_detector_instance is None:
        pose_landmarks_detector_instance = pose_landmarks_detector()
    return pose_landmarks_detector_instance

# GET DE DECTECTOR DE SEGMENTACION
def get_segmentacion_detector():
    global segmentacion_detector_instance
    if segmentacion_detector_instance is None:
        segmentacion_detector_instance = segmentacion_detector()
    return segmentacion_detector_instance

# GET DE DECTECTOR DE OBJETOS
def get_objetos_detector():
    global objects_detector_instance
    if objects_detector_instance is None:
        objects_detector_instance = objetos_detector()
    return objects_detector_instance