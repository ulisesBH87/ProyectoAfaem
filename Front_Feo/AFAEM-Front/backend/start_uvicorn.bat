@echo off
REM CAMBIAR AL DIRECTORIO DEL SCRIPT (BACKEND) Y ARRANCAR UVICORN CORRECTAMENTE
cd /d "%~dp0"
echo Iniciando FastAPI con Uvicorn...
echo URL: http://127.0.0.1:8000
echo Press Ctrl+C para detener el servidor
REM INTENTA CON python PRIMERO, SI NO FUNCIONA INTENTA CON py
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000 || py -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
