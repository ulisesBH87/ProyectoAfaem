Instrucciones rápidas (Windows):

1) Crear y activar entorno virtual:
   python -m venv .venv
   .venv\Scripts\activate

2) Instalar dependencias:
   pip install -r requirements.txt

3) Arrancar el servidor de desarrollo (desde esta carpeta 'backend'):
   py -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

   O usar el script incluido (evita errores de tipeo):
   start_uvicorn.bat

Nota sobre el error que viste:
- El mensaje "Invalid value for '--port': '8000)'" ocurre cuando se añade por error un paréntesis final al ejecutar el comando:
  ejemplo erróneo: py -m uvicorn main:app --reload --host 0.0.0.0 --port 8000)
  la solución es quitar el paréntesis final (usar exactamente los comandos anteriores).
- Si accedes desde otra máquina de la red, asegúrate de arrancar uvicorn con --host 0.0.0.0 y habilitar CORS en la app (ya incluido en main.py de ejemplo).
