"""
from fastapi import APIRouter, UploadFile, File #|importar las clases

#Importar las funciones de detección de rostros con FACE DETECTOR
from app.services.detectar_rostro import (
    detectar_rostro_imagen, 
    detectar_rostro_pdf
) 
import base64 #Importar la biblioteca para codificar y decodificar datos en formato base64

router = APIRouter() #|crear un enrutador para manejar las rutas de la API

#definir una ruta POST para validar un archivo
@router.post("/fotografia/validar") 

async def validar_archivo(file: UploadFile = File(...)): #|definir una función asincrónica que recibe un archivo como entrada
    
    contenido = await file.read() #leer el contenido del archivo de forma asincrónica
    
    
    #Detección de rostros utilizando la función importada 
    if file.content_type == "application/pdf": #Verificar si el archivo no es un PDF 
        rostros_detectados, imagen_base64, tipo_imagen = detectar_rostro_pdf(contenido) #Llamar a la función de detección de rostros y almacenar el resultado en una variable 
    else: 
        rostros_detectados = detectar_rostro_imagen(contenido) #Llamar a la función de detección de rostros y almacenar el resultado en una variable 
        imagen_base64 = base64.b64encode(contenido).decode('utf-8') #Codificar la imagen a base64 para enviarla al frontend
        tipo_imagen = file.content_type #Definir el tipo de imagen para archivos que no son PDF

    # ===== REGLA DE VALIDACIÓN =====
    if rostros_detectados == 1:
        return {
            "valido": True,
            "imagen": imagen_base64,
            "tipo_imagen": tipo_imagen,
            "mensaje": "Archivo válido"
        }

    elif rostros_detectados == 0:
        return {
            "valido": False,
            "mensaje": "Archivo no válido: no se detectó ningún rostro"
        }
    
    else:
        return {
            "valido": False,
            "mensaje": "Archivo no válido: se detectaron múltiples rostros"
        }
"""