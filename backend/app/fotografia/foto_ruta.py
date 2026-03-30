from fastapi import APIRouter, UploadFile, File #|importar las clases

#Importar las funciones de detección de rostros con FACE DETECTOR
from app.fotografia.foto_validacion import (
    validacion_fotografia, 
    detectar_rostro_pdf
) 

import base64 #Importar la biblioteca para codificar y decodificar datos en formato base64

router = APIRouter() #|crear un enrutador para manejar las rutas de la API

#definir una ruta POST para validar un archivo
@router.post("/validar-fotografia") 

async def validar_archivo(file: UploadFile = File(...)): #|definir una función asincrónica que recibe un archivo como entrada
    
    contenido = await file.read() #leer el contenido del archivo de forma asincrónica

    #Valida el peso maximo que puede tener el archivo 5 MB
    MAX_MB = 3
    MAX_BYTES = MAX_MB * 1024 * 1024

    if len(contenido) > MAX_BYTES:
        return {
            "valido": False,
            "mensaje": f"El archivo supera el peso máximo permitido ({MAX_MB} MB)"
        }

    #Detección de rostros segun el tipo de archivo
    if file.content_type == "application/pdf": #Verificar si el archivo no es un PDF 
        rostros_detectados, imagen_base64, tipo_imagen, razon = detectar_rostro_pdf(contenido)
    else: 
        rostros_detectados, resultado = validacion_fotografia(contenido) #Llamar a la función de detección de rostros y almacenar el resultado en una variable 
        #imagen_base64 = base64.b64encode(contenido).decode('utf-8') #Codificar la imagen a base64 para enviarla al frontend
        tipo_imagen = file.content_type #Definir el tipo de imagen para archivos que no son PDF

        if rostros_detectados == 1:
            imagen_base64 = base64.b64encode(resultado).decode('utf-8')
            razon = None
        else:
            imagen_base64 = None
            razon = resultado

    # ===== REGLA DE VALIDACIÓN =====
    if rostros_detectados == 1:
        return {
            "valido": True,
            "imagen": imagen_base64,
            "tipo_imagen": tipo_imagen,
            "mensaje": "Fotografìa aprobada"
        }

    elif rostros_detectados == 0:
        return {
            "valido": False,
            "mensaje": f"Fotografía no aprobada: {razon}"
        }
        
